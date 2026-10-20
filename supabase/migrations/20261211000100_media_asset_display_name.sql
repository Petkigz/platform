-- An upload needs a name, or a media library is twelve rows of "video/mp4".
--
-- WHY THIS IS A SCHEMA CHANGE AND NOT A UI DETAIL
-- -----------------------------------------------
-- `media_assets` recorded a type, a size, a digest and a duration, and nothing a
-- teacher could recognise. `technical_metadata` was designed to hold the
-- original filename but `register_media_upload()` never wrote it, so the column
-- stayed `'{}'` on every row. The first screen that lists a teacher's own
-- uploads (`/teach/media`) would have shown the same three words twelve times.
--
-- A dedicated column rather than a jsonb key, because the library lists, sorts
-- and searches by it, and because a name that the interface depends on should
-- not be a key somebody has to remember the spelling of.
--
-- The name is required at registration and deliberately NOT defaulted. An
-- optional name is how a library fills up with unnamed files: the caller that
-- forgets it is the one that cannot be fixed later, because nobody remembers
-- what the file was.

alter table public.media_assets
  add column if not exists display_name text
    check (display_name is null or length(btrim(display_name)) between 1 and 200);

comment on column public.media_assets.display_name is
  'What the teacher calls this file. Nullable only because rows written before this migration have no name; a new upload must supply one. Sanitised again before it becomes a download filename, since it is free text.';

-- ---------------------------------------------------------------------------
-- register_media_upload, with the name as a required parameter
-- ---------------------------------------------------------------------------
-- The old five-parameter signature is dropped rather than left beside the new
-- one. An added DEFAULT parameter would create an overload, and the overload
-- would keep the name-less path open for anything that had not been updated —
-- the same reason `delete_media_asset(uuid)` was dropped when it grew a reason.

drop function if exists public.register_media_upload(text, bigint, text, integer, text);

-- The name goes before the two parameters that have defaults, because Postgres
-- will not accept a required parameter after an optional one. Nothing about the
-- call changes for a caller using named arguments, which is how the application
-- calls it.
create function public.register_media_upload(
  p_mime_type        text,
  p_byte_size        bigint,
  p_checksum         text,
  p_display_name     text,
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
  v_name   text;
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

  if p_checksum is null or p_checksum !~ '^[a-f0-9]{64}$' then
    raise exception
      'the checksum must be a 64-character lowercase hex SHA-256 digest'
      using errcode = 'invalid_parameter_value';
  end if;

  if p_duration_seconds is not null and p_duration_seconds < 0 then
    raise exception 'a duration cannot be negative'
      using errcode = 'invalid_parameter_value';
  end if;

  -- coalesce because btrim(null) is null, and null = '' is not true: without it
  -- a caller passing no name at all would walk straight past this check and
  -- insert a row with no name.
  v_name := btrim(coalesce(p_display_name, ''));

  if v_name = '' then
    raise exception 'a file needs a name the teacher can recognise later'
      using errcode = 'invalid_parameter_value';
  end if;

  if length(v_name) > 200 then
    raise exception 'a file name cannot be longer than 200 characters'
      using errcode = 'invalid_parameter_value';
  end if;

  v_bucket := case p_storage_backend
                when 'supabase' then 'masters'
                else 'ayahspring-masters'
              end;

  insert into public.media_assets
    (storage_backend, master_bucket, master_key, checksum, mime_type,
     byte_size, duration_seconds, uploaded_by, status, display_name)
  values
    (p_storage_backend, v_bucket, 'placeholder', lower(p_checksum), trim(p_mime_type),
     p_byte_size, p_duration_seconds, v_actor, 'pending', v_name)
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
                             'byte_size', p_byte_size,
                             'display_name', v_name));

  v_out.asset_id      := v_id;
  v_out.master_bucket := v_bucket;
  v_out.master_key    := v_key;
  return v_out;
end;
$$;

revoke all on function public.register_media_upload(text, bigint, text, text, integer, text) from public;
grant execute on function public.register_media_upload(text, bigint, text, text, integer, text) to authenticated;

comment on function public.register_media_upload(text, bigint, text, text, integer, text) is
  'Creates a pending upload and returns the bucket and derived key to upload to. The key is generated here, never supplied by the caller. The display name is required, because an unnamed file in a library cannot be identified later.';
