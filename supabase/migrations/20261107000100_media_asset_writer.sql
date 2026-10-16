-- Where the videos actually live.
--
-- WHAT THIS FIXES
-- ---------------
-- lesson_resources has two permitted sources: external_url and media_asset_id.
-- Until now only the URL was usable, because media_assets had no writer at all.
-- That means every video on the platform had to be hotlinked from somewhere
-- else — which is the opposite of D8, where the masters belong in our own
-- storage and Cloudflare Stream is delivery only.
--
-- A HOLE, FOUND BY TESTING RATHER THAN BY READING
-- -----------------------------------------------
-- The INSERT policy is correct (uploaded_by = current_user_id()). The UPDATE
-- policy is `uploaded_by = current_user_id() OR is_privileged(current_user_id())`
-- with no column restriction.
--
-- Verified directly: an uploader inserts a row with status='pending', then runs
-- `update media_assets set status='available'` on it and the update lands — one
-- row, status available. No bytes were ever uploaded. The whole
-- pending/available/quarantined state machine, which exists to distinguish "we
-- have the file" from "we do not", could be bypassed by the person with the most
-- reason to bypass it.
--
-- The UPDATE policy is now split so a non-privileged uploader may change the
-- descriptive columns but not status. Status moves only through the functions
-- below, and 'available' only through a privileged confirmation.
--
-- WHY KEYS ARE DERIVED, NOT SUPPLIED
-- ----------------------------------
-- master_key identifies an object in the bucket. Letting the caller name it
-- means one teacher can register an asset pointing at another teacher's object.
-- The key is generated here from the new row's own id.

-- ---------------------------------------------------------------------------
-- Status is not the uploader's to change
-- ---------------------------------------------------------------------------

drop policy if exists media_assets_update on public.media_assets;

create policy media_assets_update
  on public.media_assets
  for update
  to authenticated
  using (uploaded_by = public.current_user_id() or public.is_privileged(public.current_user_id()))
  with check (
    -- Privileged callers may set anything. Everyone else may edit the
    -- descriptive columns of their own asset but never the status column, so
    -- "pending" cannot become "available" without a confirmation.
    public.is_privileged(public.current_user_id())
    or media_assets.uploaded_by = public.current_user_id()
  );

-- The WITH CHECK above cannot compare old and new, so the actual restriction on
-- the status column is enforced here. A BEFORE ROW trigger runs after RLS.
create or replace function public.media_asset_status_guard()
returns trigger
language plpgsql
as $$
begin
  -- The platform's own transitions are allowed through. A SECURITY DEFINER
  -- function bypasses RLS but not triggers, so without this the confirmation
  -- function would be stopped by the guard that exists to protect it.
  -- Transaction-local, so it cannot leak into a later statement.
  if coalesce(current_setting('app.media_status_transition', true), '') = 'on' then
    return new;
  end if;

  if new.status is distinct from old.status
     and not public.is_privileged(public.current_user_id()) then
    raise exception
      'only staff may change the status of an upload; a file is available when it has been confirmed'
      using errcode = 'insufficient_privilege';
  end if;

  return new;
end;
$$;

comment on function public.media_asset_status_guard() is
  'A non-privileged uploader may describe their asset but not promote it. Status moves only through confirm_media_upload()/quarantine_media_upload(), both of which require staff.';

drop trigger if exists media_assets_status_guard on public.media_assets;
create trigger media_assets_status_guard
  before update on public.media_assets
  for each row
  when (new.status is distinct from old.status)
  execute function public.media_asset_status_guard();

-- ---------------------------------------------------------------------------
-- Registering an upload
-- ---------------------------------------------------------------------------

-- A named type rather than `record`, so a caller does not have to spell out a
-- column definition list at every call site — and so PostgREST can describe the
-- result of an RPC to the web client.
create type public.media_upload_target as (
  asset_id      uuid,
  master_bucket text,
  master_key    text
);

create or replace function public.register_media_upload(
  p_mime_type        text,
  p_byte_size        bigint,
  p_checksum         text,
  p_duration_seconds integer default null,
  p_storage_backend  text default 'r2'
)
returns public.media_upload_target
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor  uuid;
  v_id     uuid;
  v_bucket text;
  v_key    text;
  v_out    public.media_upload_target;
begin
  v_actor := public.current_user_id();

  if v_actor is null then
    raise exception 'sign in to upload'
      using errcode = 'insufficient_privilege';
  end if;

  if p_storage_backend not in ('r2','supabase','s3','local') then
    raise exception 'unsupported storage backend: %', p_storage_backend
      using errcode = 'invalid_parameter_value';
  end if;

  if coalesce(trim(p_mime_type), '') = '' then
    raise exception 'a file needs a type'
      using errcode = 'invalid_parameter_value';
  end if;

  if p_byte_size is null or p_byte_size <= 0 then
    raise exception 'a file needs a size in bytes'
      using errcode = 'invalid_parameter_value';
  end if;

  -- The column CHECK is ^[a-f0-9]{64}$ — a SHA-256 hex digest. Reporting it
  -- here means the caller learns what format is wanted rather than seeing a
  -- constraint name.
  if p_checksum is null or p_checksum !~ '^[a-f0-9]{64}$' then
    raise exception
      'the checksum must be a 64-character lowercase hex SHA-256 digest'
      using errcode = 'invalid_parameter_value';
  end if;

  if p_duration_seconds is not null and p_duration_seconds < 0 then
    raise exception 'a duration cannot be negative'
      using errcode = 'invalid_parameter_value';
  end if;

  -- The bucket depends on the backend. Fixed rather than caller-supplied, for
  -- the same reason as the key.
  v_bucket := case p_storage_backend
                when 'supabase' then 'masters'
                else 'ayahspring-masters'
              end;

  insert into public.media_assets
    (storage_backend, master_bucket, master_key, checksum, mime_type,
     byte_size, duration_seconds, uploaded_by, status)
  values
    (p_storage_backend, v_bucket, 'placeholder', lower(p_checksum), trim(p_mime_type),
     p_byte_size, p_duration_seconds, v_actor, 'pending')
  returning id into v_id;

  -- Derived from the row's own id, so it cannot collide with or point at
  -- anyone else's object. Updated in the same transaction, so no row is ever
  -- visible with the placeholder.
  v_key := v_id::text || '/' || regexp_replace(trim(p_mime_type), '[^a-z0-9]+', '-', 'g');

  update public.media_assets
     set master_key = v_key
   where id = v_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'media.upload_registered', 'media_asset', v_id,
          jsonb_build_object('backend', p_storage_backend,
                             'mime_type', trim(p_mime_type),
                             'byte_size', p_byte_size));

  v_out.asset_id      := v_id;
  v_out.master_bucket := v_bucket;
  v_out.master_key    := v_key;
  return v_out;
end;
$$;

revoke all on function public.register_media_upload(text, bigint, text, integer, text) from public;
grant execute on function public.register_media_upload(text, bigint, text, integer, text) to authenticated;

comment on function public.register_media_upload(text, bigint, text, integer, text) is
  'Creates a pending upload and returns the bucket and derived key to upload to. The key is generated here, never supplied by the caller.';

-- ---------------------------------------------------------------------------
-- Confirmation — staff only
-- ---------------------------------------------------------------------------

create or replace function public.confirm_media_upload(p_asset_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor   uuid;
  v_status  text;
  v_deleted timestamptz;
begin
  v_actor := public.current_user_id();

  if v_actor is null then
    raise exception 'sign in to confirm an upload'
      using errcode = 'insufficient_privilege';
  end if;

  -- Privileged, not the uploader. In production the caller is the storage
  -- completion webhook or the worker that verifies the object exists and its
  -- digest matches; letting the uploader confirm their own file is exactly the
  -- hole this migration closes.
  if not public.is_privileged(v_actor) then
    raise exception 'only staff may confirm an upload'
      using errcode = 'insufficient_privilege';
  end if;

  select status, deleted_at into v_status, v_deleted
    from public.media_assets
   where id = p_asset_id
   for update;

  if not found then
    raise exception 'media asset % not found', p_asset_id
      using errcode = 'no_data_found';
  end if;

  if v_deleted is not null then
    raise exception 'media asset % has been deleted', p_asset_id
      using errcode = 'invalid_parameter_value';
  end if;

  if v_status = 'available' then
    return false;   -- already confirmed; idempotent, not an error
  end if;

  if v_status not in ('pending','quarantined') then
    raise exception 'media asset % is %, which cannot be confirmed', p_asset_id, v_status
      using errcode = 'invalid_parameter_value';
  end if;

  perform set_config('app.media_status_transition', 'on', true);

  update public.media_assets
     set status = 'available'
   where id = p_asset_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'media.upload_confirmed', 'media_asset', p_asset_id, '{}'::jsonb);

  return true;
end;
$$;

revoke all on function public.confirm_media_upload(uuid) from public;
grant execute on function public.confirm_media_upload(uuid) to authenticated;

comment on function public.confirm_media_upload(uuid) is
  'Moves an upload from pending or quarantined to available. Privileged only — the intended caller is the storage webhook or worker that has verified the object.';

-- ---------------------------------------------------------------------------
-- Quarantine and deletion
-- ---------------------------------------------------------------------------

create or replace function public.quarantine_media_upload(
  p_asset_id uuid,
  p_reason   text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor  uuid;
  v_status text;
begin
  v_actor := public.current_user_id();

  if v_actor is null then
    raise exception 'sign in to quarantine an upload'
      using errcode = 'insufficient_privilege';
  end if;

  if not public.is_privileged(v_actor) then
    raise exception 'only staff may quarantine an upload'
      using errcode = 'insufficient_privilege';
  end if;

  if coalesce(trim(p_reason), '') = '' then
    raise exception 'a reason is required to quarantine an upload'
      using errcode = 'invalid_parameter_value';
  end if;

  select status into v_status
    from public.media_assets
   where id = p_asset_id
   for update;

  if not found then
    raise exception 'media asset % not found', p_asset_id
      using errcode = 'no_data_found';
  end if;

  if v_status = 'deleted' then
    return false;
  end if;

  perform set_config('app.media_status_transition', 'on', true);

  update public.media_assets
     set status = 'quarantined'
   where id = p_asset_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'media.upload_quarantined', 'media_asset', p_asset_id,
          jsonb_build_object('reason', trim(p_reason)));

  return true;
end;
$$;

revoke all on function public.quarantine_media_upload(uuid, text) from public;
grant execute on function public.quarantine_media_upload(uuid, text) to authenticated;

comment on function public.quarantine_media_upload(uuid, text) is
  'Withdraws an upload from use. Staff only, written reason required, audited.';

-- Soft delete per D7. The master object is not destroyed here: retention is a
-- scheduled decision, not a side effect of one click.
create or replace function public.delete_media_asset(p_asset_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid;
begin
  v_actor := public.current_user_id();

  if v_actor is null then
    raise exception 'sign in to delete an upload'
      using errcode = 'insufficient_privilege';
  end if;

  -- The uploader may withdraw their own file. Staff may withdraw anyone's.
  if not (public.is_privileged(v_actor)
          or exists (select 1 from public.media_assets
                      where id = p_asset_id and uploaded_by = v_actor)) then
    raise exception 'you may only delete your own uploads'
      using errcode = 'insufficient_privilege';
  end if;

  perform set_config('app.media_status_transition', 'on', true);

  update public.media_assets
     set deleted_at = now(),
         status = 'deleted'
   where id = p_asset_id
     and deleted_at is null;

  if not found then
    return false;
  end if;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'media.upload_deleted', 'media_asset', p_asset_id, '{}'::jsonb);

  return true;
end;
$$;

revoke all on function public.delete_media_asset(uuid) from public;
grant execute on function public.delete_media_asset(uuid) to authenticated;

comment on function public.delete_media_asset(uuid) is
  'Soft delete per D7. The master object survives; retention is a scheduled decision.';
