-- Renditions: the only media a learner is ever served.
--
-- WHY A SEPARATE TABLE
-- --------------------
-- D8 splits the archive from the delivery copies. `media_assets` is the master:
-- written once, never served to a learner, and the only thing that can re-derive
-- everything else. A rendition is a delivery copy — a profile of that master,
-- encoded for a device. Keeping them in one table would mean a row that is
-- sometimes the archive and sometimes the thing handed to a browser, and the
-- rule "a learner never touches a master" would live in a query filter a second
-- caller could forget.
--
-- Segments are deliberately not rows. An HLS rendition is thousands of small
-- objects; this register holds one row per profile per asset, and the manifest
-- is a profile like any other.
--
-- WHO WRITES
-- ----------
-- A transcode worker, which does not exist yet. Following the repository's idiom
-- for machine writers there is no service_role anywhere in the schema, so the
-- writers below require a privileged identity and the worker will run under one.
-- No learner, teacher or author can register, confirm or fail a rendition: a
-- rendition is what other people are served, so it is staff-written or it is
-- nothing.

create table public.media_renditions (
  id uuid primary key default gen_random_uuid(),

  asset_id uuid not null
    references public.media_assets (id) on delete restrict,

  -- A closed vocabulary, for the same reason plan feature codes are one: the
  -- profile names the object key, so an invented profile writes an object
  -- nothing can find again.
  profile text not null
    check (profile in
      ('1080p', '720p', '480p', '360p', 'audio', 'poster', 'manifest')),

  bucket text not null check (length(trim(bucket)) > 0),
  object_key text not null check (length(trim(object_key)) > 0),

  mime_type text not null check (length(trim(mime_type)) > 0),
  byte_size bigint not null check (byte_size >= 0),

  -- Null for audio, posters and manifests, which have no picture size.
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  bitrate_kbps integer check (bitrate_kbps is null or bitrate_kbps > 0),
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),

  -- Nullable, unlike a master's checksum. A master's checksum is what proves we
  -- still hold the original somebody uploaded; a rendition is derived, so it can
  -- always be rebuilt, and requiring a digest would only slow the worker down.
  checksum text check (checksum is null or checksum ~ '^[a-f0-9]{64}$'),

  -- 'pending'   encoded, not yet verified
  -- 'available' verified, safe to serve
  -- 'failed'    the encode failed; never served
  status text not null default 'pending'
    check (status in ('pending', 'available', 'failed')),

  failure_reason text,

  created_by uuid not null
    references public.user_profiles (user_id) on delete restrict,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint mr_failure_agrees check (
    (status = 'failed') = (failure_reason is not null)
  ),
  constraint mr_dimensions_agree check (
    (width is null) = (height is null)
  )
);

-- One rendition per profile per asset. Re-encoding replaces rather than
-- accumulates, so a learner is never served two objects for one profile.
create unique index media_renditions_asset_profile_key
  on public.media_renditions (asset_id, profile);

create index media_renditions_asset_idx  on public.media_renditions (asset_id);
create index media_renditions_status_idx on public.media_renditions (status);

create trigger media_renditions_set_updated_at
  before update on public.media_renditions
  for each row execute function public.set_updated_at();

comment on table public.media_renditions is
  'Delivery copies of a media master, one row per profile. A learner is served from here and never from media_assets. Staff-written; the transcode worker does not exist yet.';
comment on column public.media_renditions.checksum is
  'Nullable by design: a rendition is derived and can be rebuilt, unlike the master it came from.';

-- ---------------------------------------------------------------------------
-- The playback predicate
-- ---------------------------------------------------------------------------

create or replace function public.may_play_rendition(p_rendition_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_rendition_id is not null
     and public.current_user_id() is not null
     and exists (
    select 1
      from public.media_renditions mr
      join public.media_assets ma on ma.id = mr.asset_id
     where mr.id = p_rendition_id
       -- The copy itself must have been verified by the worker.
       and mr.status = 'available'
       -- And so must the master it came from. Quarantining a master has to
       -- withdraw everything derived from it, which is the point of
       -- quarantining it.
       and ma.status = 'available'
       and ma.deleted_at is null
       -- Access is whatever the lesson already decided, so this widens no
       -- boundary: a rendition is playable exactly where its lesson is open.
       -- Note this deliberately differs from may_download_lesson(), which uses
       -- entitlement and excludes the free-preview bypass. Watching a preview
       -- is free; keeping one is not.
       and exists (
             select 1
               from public.lesson_resources lr
               join public.lessons l on l.id = lr.lesson_id
              where lr.media_asset_id = ma.id
                and public.can_access_lesson_now(l.id)
           )
  );
$$;

comment on function public.may_play_rendition(uuid) is
  'May the current session be served this rendition? Requires the rendition and its master to be available, and a lesson referencing that master to be open to this session. Playback follows lesson access including free previews; saving does not (see may_download_lesson).';

revoke all on function public.may_play_rendition(uuid) from public;
revoke all on function public.may_play_rendition(uuid) from anon;
grant execute on function public.may_play_rendition(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.media_renditions enable row level security;

-- Reading a rendition row is not the same as being served its bytes, but a row
-- still names an object key, so it is not public either.
drop policy if exists media_renditions_read on public.media_renditions;
create policy media_renditions_read on public.media_renditions
  for select to anon, authenticated
  using (
    public.may_play_rendition(id)
    or public.is_privileged(public.current_user_id())
  );

-- No insert, update or delete policy for anybody. Every write goes through the
-- functions below, which are security definer and check for themselves.

-- ---------------------------------------------------------------------------
-- Registering a rendition
-- ---------------------------------------------------------------------------

create type public.media_rendition_target as (
  rendition_id uuid,
  bucket       text,
  object_key   text
);

create or replace function public.register_media_rendition(
  p_asset_id         uuid,
  p_profile          text,
  p_mime_type        text,
  p_byte_size        bigint,
  p_width            integer default null,
  p_height           integer default null,
  p_bitrate_kbps     integer default null,
  p_duration_seconds integer default null,
  p_checksum         text default null
)
returns public.media_rendition_target
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor  uuid := public.current_user_id();
  v_status text;
  v_mime   text;
  v_id     uuid;
  v_bucket text := 'ayahspring-renditions';
  v_key    text;
  v_out    public.media_rendition_target;
begin
  if v_actor is null then
    raise exception 'sign in to register a rendition'
      using errcode = 'insufficient_privilege';
  end if;

  if not public.is_privileged(v_actor) then
    raise exception 'only platform staff may register a rendition'
      using errcode = 'insufficient_privilege';
  end if;

  if p_asset_id is null then
    raise exception 'a rendition needs the asset it was encoded from'
      using errcode = 'invalid_parameter_value';
  end if;

  if coalesce(trim(p_profile), '') not in
     ('1080p','720p','480p','360p','audio','poster','manifest') then
    raise exception 'unsupported rendition profile: %', p_profile
      using errcode = 'invalid_parameter_value';
  end if;

  if coalesce(trim(p_mime_type), '') = '' then
    raise exception 'a rendition needs a type'
      using errcode = 'invalid_parameter_value';
  end if;

  if p_byte_size is null or p_byte_size < 0 then
    raise exception 'a rendition needs a size in bytes'
      using errcode = 'invalid_parameter_value';
  end if;

  if (p_width is null) <> (p_height is null) then
    raise exception 'a rendition has both dimensions or neither'
      using errcode = 'invalid_parameter_value';
  end if;

  if p_checksum is not null and p_checksum !~ '^[a-f0-9]{64}$' then
    raise exception 'the checksum must be a 64-character lowercase hex SHA-256 digest'
      using errcode = 'invalid_parameter_value';
  end if;

  select ma.status, lower(trim(ma.mime_type))
    into v_status, v_mime
    from public.media_assets ma
   where ma.id = p_asset_id
     for update;

  if not found then
    raise exception 'no media asset %', p_asset_id
      using errcode = 'no_data_found';
  end if;

  -- Encoding a master we have not verified would produce a delivery copy of a
  -- file that may not exist, may not be what was declared, or may be held for
  -- review. All three are reasons to stop here rather than transcode.
  if v_status <> 'available' then
    raise exception 'a rendition can only be encoded from an available master, and this one is %', v_status
      using errcode = 'check_violation';
  end if;

  -- Derived, never supplied: the key follows the asset id and the master's own
  -- mime slug, so it cannot collide with another asset's object or point at one.
  v_key := p_asset_id::text || '/'
        || regexp_replace(v_mime, '[^a-z0-9]+', '-', 'g') || '/'
        || p_profile;

  insert into public.media_renditions
    (asset_id, profile, bucket, object_key, mime_type, byte_size, width, height,
     bitrate_kbps, duration_seconds, checksum, status, created_by)
  values
    (p_asset_id, trim(p_profile), v_bucket, v_key, trim(p_mime_type), p_byte_size,
     p_width, p_height, p_bitrate_kbps, p_duration_seconds, lower(p_checksum),
     'pending', v_actor)
  returning id into v_id;

  v_out.rendition_id := v_id;
  v_out.bucket       := v_bucket;
  v_out.object_key   := v_key;
  return v_out;
end;
$$;

comment on function public.register_media_rendition(uuid,text,text,bigint,integer,integer,integer,integer,text) is
  'Staff-only. Opens a pending rendition of an available master and derives its bucket and object key. The transcode worker does not exist yet, so nothing calls this in production.';

-- ---------------------------------------------------------------------------
-- Confirming and failing
-- ---------------------------------------------------------------------------

create or replace function public.confirm_media_rendition(p_rendition_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor  uuid := public.current_user_id();
  v_status text;
begin
  if v_actor is null or not public.is_privileged(v_actor) then
    raise exception 'only platform staff may confirm a rendition'
      using errcode = 'insufficient_privilege';
  end if;

  select status into v_status
    from public.media_renditions
   where id = p_rendition_id
     for update;

  if not found then
    raise exception 'no rendition %', p_rendition_id
      using errcode = 'no_data_found';
  end if;

  if v_status <> 'pending' then
    raise exception 'a rendition that is % cannot be confirmed', v_status
      using errcode = 'check_violation';
  end if;

  update public.media_renditions
     set status = 'available'
   where id = p_rendition_id;

  return true;
end;
$$;

create or replace function public.fail_media_rendition(
  p_rendition_id uuid,
  p_reason       text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor  uuid := public.current_user_id();
  v_status text;
begin
  if v_actor is null or not public.is_privileged(v_actor) then
    raise exception 'only platform staff may fail a rendition'
      using errcode = 'insufficient_privilege';
  end if;

  if coalesce(trim(p_reason), '') = '' then
    raise exception 'a failed rendition needs a written reason'
      using errcode = 'invalid_parameter_value';
  end if;

  select status into v_status
    from public.media_renditions
   where id = p_rendition_id
     for update;

  if not found then
    raise exception 'no rendition %', p_rendition_id
      using errcode = 'no_data_found';
  end if;

  if v_status <> 'pending' then
    raise exception 'a rendition that is % cannot be failed', v_status
      using errcode = 'check_violation';
  end if;

  update public.media_renditions
     set status = 'failed',
         failure_reason = trim(p_reason)
   where id = p_rendition_id;

  return true;
end;
$$;

comment on function public.confirm_media_rendition(uuid) is
  'Staff-only. The only path from pending to available, so a rendition cannot be served before somebody has verified the encode.';
comment on function public.fail_media_rendition(uuid,text) is
  'Staff-only. Records why an encode failed. A reason is required, because a failed rendition with no reason is indistinguishable from a bug.';

revoke all on function public.register_media_rendition(uuid,text,text,bigint,integer,integer,integer,integer,text) from public;
revoke all on function public.register_media_rendition(uuid,text,text,bigint,integer,integer,integer,integer,text) from anon;
grant execute on function public.register_media_rendition(uuid,text,text,bigint,integer,integer,integer,integer,text) to authenticated;

revoke all on function public.confirm_media_rendition(uuid) from public;
revoke all on function public.confirm_media_rendition(uuid) from anon;
grant execute on function public.confirm_media_rendition(uuid) to authenticated;

revoke all on function public.fail_media_rendition(uuid,text) from public;
revoke all on function public.fail_media_rendition(uuid,text) from anon;
grant execute on function public.fail_media_rendition(uuid,text) to authenticated;
