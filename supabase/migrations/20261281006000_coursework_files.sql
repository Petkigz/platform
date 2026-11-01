-- -----------------------------------------------------------------------------
-- Handing in a file
-- -----------------------------------------------------------------------------
--
-- THE HOLE
-- --------
-- `assignment_submissions.body_text` is the only way a learner can hand anything
-- in. The schema has had `assignment_submission_assets` since assignments were
-- built, `attach_assignment_asset()` enforces a 25 MiB cap and an eleven-type
-- allow-list, and the teacher's queue prints "3 private file references are
-- attached to this submission. Secure viewing is not connected yet." — a
-- sentence that is honest about a feature with no uploader, no viewer and no way
-- in from either side. A learner who has to photograph their handwriting and send
-- it has nothing to photograph it into.
--
-- WHY IT COULD NOT SIMPLY BE WIRED UP
-- -----------------------------------
-- `confirm_media_upload()` is staff-only on purpose: letting an uploader mark
-- their own file ready is how a lesson ends up pointing at an object that was
-- never uploaded, and the upload path deliberately stops at `pending` until
-- something trustworthy has looked at the object.
--
-- That rule is right for a lesson and wrong for coursework. A lesson is published
-- to strangers; coursework is a private conversation between one learner and one
-- teacher, and the only person who can vouch for a child's homework arriving is
-- the household that sent it. Waiting for staff to click "confirm" on every
-- assignment file would mean no learner ever handed anything in.
--
-- So this migration adds a **second, narrower door**, and keeps both of them
-- load-bearing:
--
--   * `media_assets.purpose` splits the table structurally. A `library` file is
--     the existing kind — it can be attached to a lesson once staff confirm it.
--     A `coursework` file can never be attached to a lesson: a trigger refuses
--     it, so the self-confirm door cannot be used to publish anything.
--   * `confirm_coursework_upload()` may only promote a file that was *declared*
--     as coursework for a named draft submission before a single byte moved, and
--     it attaches the file to that submission in the same transaction. There is
--     nothing to gain by confirming a coursework file, because the only place it
--     can ever appear is the one submission it was declared for.
--   * The object is still looked at. The route that calls this has already sent a
--     HEAD request and compared storage's size with the declared size, exactly as
--     the staff path does. What changes is who is allowed to act on that check,
--     not whether the check happens.
--
-- THE LIMITS FIRE BEFORE THE BYTES DO
-- -----------------------------------
-- `register_coursework_upload()` enforces 25 MiB, the allow-list and the ten-file
-- cap at registration rather than at attach time. The old behaviour was the worst
-- possible ordering: a learner on a metered connection uploading a 300 MB video
-- of a recitation would spend the data, wait for the transfer, and then be told
-- that an assignment file cannot exceed 25 MiB.
--
-- THE TEACHER HAS TO BE ABLE TO READ IT
-- -------------------------------------
-- A file nobody can open is the same defect as a button nobody can press. So
-- `may_watch_master()` gains one branch — whoever can read the submission may
-- watch a coursework file attached to it — and `assignment_submission_files()`
-- returns the names and sizes a queue needs, without handing out object
-- coordinates. The route that already signs master URLs then serves the teacher
-- with no new signing code.

-- -----------------------------------------------------------------------------
-- 1. Two kinds of file, kept apart
-- -----------------------------------------------------------------------------
-- Existing rows are `library`: every file uploaded before today was uploaded to
-- be taught from, and defaulting the other way would quietly make the whole
-- media library un-attachable to lessons.
alter table public.media_assets
  add column if not exists purpose text not null default 'library'
    check (purpose in ('library', 'coursework'));

create index if not exists media_assets_purpose_idx
  on public.media_assets (purpose, uploaded_by)
  where deleted_at is null;

comment on column public.media_assets.purpose is
  'library = taught from, and staff confirm it before a lesson may use it. coursework = handed in on one assignment submission, confirmed by the uploader and attachable to nothing else.';

-- -----------------------------------------------------------------------------
-- 2. A lesson may only point at a library file
-- -----------------------------------------------------------------------------
-- `lesson_resources` is written by a plain insert under the authorship policy, so
-- a policy is the wrong place to say this: the rule is about the *other* table's
-- row. A trigger can see it.
create or replace function public.lesson_resource_library_only()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_purpose text;
begin
  if new.media_asset_id is null then
    return new;
  end if;

  select ma.purpose into v_purpose
    from public.media_assets ma
   where ma.id = new.media_asset_id;

  if v_purpose = 'coursework' then
    raise exception
      'a file handed in as coursework cannot be taught from; upload it to the media library instead'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists lesson_resources_library_only on public.lesson_resources;
create trigger lesson_resources_library_only
  before insert or update of media_asset_id on public.lesson_resources
  for each row execute function public.lesson_resource_library_only();

comment on function public.lesson_resource_library_only() is
  'Refuses a lesson resource pointing at a coursework file, so the self-confirm path can never be used to publish content.';

-- -----------------------------------------------------------------------------
-- 3. The limits, in one place
-- -----------------------------------------------------------------------------
-- `attach_assignment_asset()` has its own copy of these two numbers and is left
-- alone, because re-declaring a hundred lines of working logic to change how a
-- constant is spelled is how a migration acquires a bug. What keeps the copies
-- honest is a test that drives both paths to the same boundary and asserts they
-- refuse the same file.
create or replace function public.coursework_max_bytes()
returns bigint
language sql
immutable
as $$ select 26214400::bigint $$;   -- 25 MiB

create or replace function public.coursework_mime_allowed(p_mime text)
returns boolean
language sql
immutable
as $$
  select lower(coalesce(p_mime, '')) in (
    'application/pdf', 'image/jpeg', 'image/png', 'image/webp',
    'audio/aac', 'audio/mpeg', 'audio/mp4', 'audio/ogg', 'audio/opus',
    'audio/wav', 'audio/x-m4a', 'audio/x-wav'
  );
$$;

create or replace function public.coursework_max_files()
returns integer
language sql
immutable
as $$ select 10 $$;

revoke all on function public.coursework_max_bytes() from public;
revoke all on function public.coursework_mime_allowed(text) from public;
revoke all on function public.coursework_max_files() from public;
grant execute on function public.coursework_max_bytes() to authenticated;
grant execute on function public.coursework_mime_allowed(text) to authenticated;
grant execute on function public.coursework_max_files() to authenticated;

comment on function public.coursework_max_bytes() is
  '25 MiB. The same number attach_assignment_asset() enforces; a database test drives both paths to the boundary to keep them equal.';
comment on function public.coursework_mime_allowed(text) is
  'Whether a coursework file of this type may be handed in. Documents, images and audio — never video, which is what 25 MiB is too small for anyway.';

-- -----------------------------------------------------------------------------
-- 4. What a file was declared for
-- -----------------------------------------------------------------------------
-- Written at registration, before the bytes move, and never updated. It is the
-- fact that makes self-confirmation safe: a coursework file is not "any file an
-- uploader may confirm", it is "this file, for this draft, declared before the
-- transfer started".
create table if not exists public.coursework_upload_declarations (
  asset_id uuid primary key
    references public.media_assets (id) on delete cascade,

  submission_id uuid not null
    references public.assignment_submissions (id) on delete cascade,

  declared_by uuid not null
    references public.user_profiles (user_id) on delete restrict,

  declared_at timestamptz not null default now()
);

create index if not exists coursework_upload_declarations_submission_idx
  on public.coursework_upload_declarations (submission_id);

-- Nobody reads this directly. Every access is through a SECURITY DEFINER
-- function that has already decided who may see what, and the table names a
-- submission — which is somebody's private work.
alter table public.coursework_upload_declarations enable row level security;
revoke all on public.coursework_upload_declarations from anon, authenticated;

comment on table public.coursework_upload_declarations is
  'Which draft submission a coursework upload was declared for, written before the transfer starts. Internal: the lock that lets an uploader confirm their own file without opening the staff-only door.';

-- -----------------------------------------------------------------------------
-- 5. Declaring an upload, with every limit checked first
-- -----------------------------------------------------------------------------
create or replace function public.register_coursework_upload(
  p_submission_id uuid,
  p_display_name  text,
  p_mime_type     text,
  p_byte_size     bigint,
  p_checksum      text
)
returns public.media_upload_target
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor    uuid := public.current_user_id();
  v_learner  uuid;
  v_status   text;
  v_open     text;
  v_name     text;
  v_mime     text;
  v_id       uuid;
  v_bucket   constant text := 'ayahspring-masters';
  v_key      text;
  v_have     integer;
  v_out      public.media_upload_target;
begin
  if v_actor is null then
    raise exception 'sign in to hand in a file'
      using errcode = 'insufficient_privilege';
  end if;

  select s.learner_profile_id, s.status, a.status
    into v_learner, v_status, v_open
    from public.assignment_submissions s
    join public.course_assignments a on a.id = s.assignment_id
   where s.id = p_submission_id
     and a.deleted_at is null;

  if not found then
    raise exception 'assignment submission not found'
      using errcode = 'no_data_found';
  end if;

  if not public.can_access_learner(v_learner) then
    raise exception 'you can only hand in a file for a learner you are responsible for'
      using errcode = 'insufficient_privilege';
  end if;

  -- The same window `attach_assignment_asset()` enforces. Checked here as well
  -- because this is the moment a file is worth refusing, not the end of a
  -- transfer.
  if v_status <> 'draft' or v_open <> 'open' then
    raise exception 'files can only be attached to an open draft'
      using errcode = 'check_violation';
  end if;

  v_mime := lower(btrim(coalesce(p_mime_type, '')));
  if v_mime = '' then
    raise exception 'a file needs a type'
      using errcode = 'invalid_parameter_value';
  end if;

  if not public.coursework_mime_allowed(v_mime) then
    raise exception 'this file type is not supported for an assignment'
      using errcode = 'check_violation';
  end if;

  if p_byte_size is null or p_byte_size <= 0 then
    raise exception 'a file needs a size in bytes'
      using errcode = 'invalid_parameter_value';
  end if;

  if p_byte_size > public.coursework_max_bytes() then
    raise exception 'an assignment file cannot exceed 25 MiB'
      using errcode = 'program_limit_exceeded';
  end if;

  if p_checksum is null or p_checksum !~ '^[a-f0-9]{64}$' then
    raise exception 'the checksum must be a 64-character lowercase hex SHA-256 digest'
      using errcode = 'invalid_parameter_value';
  end if;

  v_name := btrim(coalesce(p_display_name, ''));
  if v_name = '' then
    raise exception 'a file needs a name, so it can be recognised later'
      using errcode = 'invalid_parameter_value';
  end if;
  if length(v_name) > 200 then
    raise exception 'a file name cannot be longer than 200 characters'
      using errcode = 'invalid_parameter_value';
  end if;

  -- Counted including the files already handed in, so the tenth is the last one
  -- and the eleventh is refused before it is uploaded rather than after.
  select count(*)::int into v_have
    from public.assignment_submission_assets asa
   where asa.submission_id = p_submission_id;

  if v_have >= public.coursework_max_files() then
    raise exception 'an assignment can have at most % files', public.coursework_max_files()
      using errcode = 'program_limit_exceeded';
  end if;

  insert into public.media_assets
    (storage_backend, master_bucket, master_key, checksum, mime_type,
     byte_size, uploaded_by, status, display_name, purpose)
  values
    ('r2', v_bucket, 'placeholder', lower(p_checksum), v_mime,
     p_byte_size, v_actor, 'pending', v_name, 'coursework')
  returning id into v_id;

  -- Derived from the row's own id, exactly as the library path does it, so a
  -- caller cannot aim an upload at anybody else's object.
  v_key := v_id::text || '/' || regexp_replace(v_mime, '[^a-z0-9]+', '-', 'g');

  update public.media_assets set master_key = v_key where id = v_id;

  insert into public.coursework_upload_declarations (asset_id, submission_id, declared_by)
  values (v_id, p_submission_id, v_actor);

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'coursework.upload_declared', 'media_asset', v_id,
          jsonb_build_object('submission_id', p_submission_id,
                             'mime_type', v_mime,
                             'byte_size', p_byte_size,
                             'display_name', v_name));

  v_out.asset_id      := v_id;
  v_out.master_bucket := v_bucket;
  v_out.master_key    := v_key;
  return v_out;
end;
$$;

revoke all on function public.register_coursework_upload(uuid, text, text, bigint, text)
  from public, anon;
grant execute on function public.register_coursework_upload(uuid, text, text, bigint, text)
  to authenticated;

comment on function public.register_coursework_upload(uuid, text, text, bigint, text) is
  'Opens a pending coursework upload for one draft submission and returns the bucket and derived key. Enforces the 25 MiB, type and ten-file limits before any byte is sent, and records what the file was declared for.';

-- -----------------------------------------------------------------------------
-- 6. The narrower door
-- -----------------------------------------------------------------------------
create or replace function public.confirm_coursework_upload(p_asset_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor    uuid := public.current_user_id();
  v_asset    public.media_assets;
  v_sub      uuid;
  v_declared uuid;
  v_learner  uuid;
  v_status   text;
  v_open     text;
  v_have     integer;
  v_position integer;
  v_attach   uuid;
begin
  if v_actor is null then
    raise exception 'sign in to hand in a file'
      using errcode = 'insufficient_privilege';
  end if;

  select * into v_asset
    from public.media_assets ma
   where ma.id = p_asset_id
     for update;

  if not found then
    raise exception 'media asset not found' using errcode = 'no_data_found';
  end if;

  -- A coursework file belongs to the person who declared it. Staff may confirm
  -- it too — an incident may need a file made readable — but the uploader is the
  -- ordinary caller.
  if v_asset.purpose <> 'coursework' then
    raise exception 'that file was not handed in as coursework'
      using errcode = 'check_violation';
  end if;

  if v_asset.uploaded_by <> v_actor and not public.is_privileged(v_actor) then
    raise exception 'only the uploader can confirm this file'
      using errcode = 'insufficient_privilege';
  end if;

  if v_asset.deleted_at is not null or v_asset.status = 'deleted' then
    raise exception 'that file has been deleted'
      using errcode = 'invalid_parameter_value';
  end if;

  select d.submission_id, d.declared_by into v_sub, v_declared
    from public.coursework_upload_declarations d
   where d.asset_id = p_asset_id;

  if not found then
    raise exception 'that file was not declared for an assignment'
      using errcode = 'no_data_found';
  end if;

  -- Idempotent for a retried confirmation that already succeeded: the attachment
  -- is the answer either way, and an upload that arrives twice must not become
  -- two rows.
  select asa.id into v_attach
    from public.assignment_submission_assets asa
   where asa.media_asset_id = p_asset_id;
  if found then
    return v_attach;
  end if;

  if v_asset.status <> 'pending' then
    raise exception 'that file is %, so it cannot be handed in', v_asset.status
      using errcode = 'invalid_parameter_value';
  end if;

  select s.learner_profile_id, s.status, a.status
    into v_learner, v_status, v_open
    from public.assignment_submissions s
    join public.course_assignments a on a.id = s.assignment_id
   where s.id = v_sub
     and a.deleted_at is null
     for update of s;

  if not found then
    raise exception 'assignment submission not found' using errcode = 'no_data_found';
  end if;

  -- Checked again, not because the registration was wrong but because the window
  -- can close during a transfer: a learner whose deadline passes mid-upload must
  -- be told, not quietly given a file the teacher's queue will refuse.
  if v_status <> 'draft' or v_open <> 'open' then
    raise exception 'files can only be attached to an open draft'
      using errcode = 'check_violation';
  end if;

  if not public.can_access_learner(v_learner) then
    raise exception 'you can only hand in a file for a learner you are responsible for'
      using errcode = 'insufficient_privilege';
  end if;

  select count(*)::int into v_have
    from public.assignment_submission_assets asa
   where asa.submission_id = v_sub;

  if v_have >= public.coursework_max_files() then
    raise exception 'an assignment can have at most % files', public.coursework_max_files()
      using errcode = 'program_limit_exceeded';
  end if;

  -- The status guard trigger protects the column from ordinary callers; this is
  -- the platform's own transition, so it says so for the length of the
  -- transaction.
  perform set_config('app.media_status_transition', 'on', true);

  update public.media_assets set status = 'available' where id = p_asset_id;

  select coalesce(max(asa.position), 0) + 1 into v_position
    from public.assignment_submission_assets asa
   where asa.submission_id = v_sub;

  insert into public.assignment_submission_assets
    (submission_id, media_asset_id, attached_by, position)
  values (v_sub, p_asset_id, v_actor, v_position)
  returning id into v_attach;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'coursework.file_handed_in', 'assignment_submission', v_sub,
          jsonb_build_object('media_asset_id', p_asset_id,
                             'mime_type', v_asset.mime_type,
                             'byte_size', v_asset.byte_size,
                             'display_name', v_asset.display_name));

  return v_attach;
end;
$$;

revoke all on function public.confirm_coursework_upload(uuid) from public, anon;
grant execute on function public.confirm_coursework_upload(uuid) to authenticated;

comment on function public.confirm_coursework_upload(uuid) is
  'Makes a declared coursework file available and attaches it to the submission it was declared for, in one transaction. The caller must have declared it, and the route that calls this has already compared storage''s object with the declared size. Returns the attachment id.';

-- -----------------------------------------------------------------------------
-- 7. Who may read a handed-in file
-- -----------------------------------------------------------------------------
-- Reproduced in full: PostgreSQL cannot wrap the function it replaces. The only
-- change is the coursework branch at the end.
create or replace function public.may_watch_master(p_asset_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_asset_id is not null
     and public.current_user_id() is not null
     and exists (
    select 1
      from public.media_assets ma
     where ma.id = p_asset_id
       and ma.deleted_at is null
       and (
         ma.uploaded_by = public.current_user_id()
         or public.is_privileged(public.current_user_id())
         or (
           -- The author of a version whose lesson uses it, while it is available.
           ma.status = 'available'
           and exists (
             select 1
               from public.lesson_resources lr
               join public.lessons l on l.id = lr.lesson_id
               join public.course_sections cs on cs.id = l.section_id
              where lr.media_asset_id = ma.id
                and public.can_author_version(cs.course_version_id)
           )
         )
         or (
           -- A file handed in as coursework is readable by whoever may read the
           -- submission it was handed in on: the household that sent it, the
           -- course author marking it, and staff. A file a teacher cannot open is
           -- not a hand-in, it is a notification that something was handed in.
           ma.purpose = 'coursework'
           and exists (
             select 1
               from public.assignment_submission_assets asa
              where asa.media_asset_id = ma.id
                and public.can_read_assignment_submission(asa.submission_id)
           )
         )
       )
  );
$$;

revoke all on function public.may_watch_master(uuid) from public;
revoke all on function public.may_watch_master(uuid) from anon;
grant execute on function public.may_watch_master(uuid) to authenticated;

comment on function public.may_watch_master(uuid) is
  'May the current session watch this master? Its uploader in any state, platform staff in any state, the author of a version whose lesson uses it while it is available, or — for a coursework file — anybody who may read the submission it was handed in on. Not a reviewer: what is under review is the delivery copy, not the archive.';

-- -----------------------------------------------------------------------------
-- 8. The list a screen can render
-- -----------------------------------------------------------------------------
-- `assignment_submission_assets` says a file is attached; the name, the type and
-- the size live in `media_assets`, whose read policy is uploader-or-staff. So the
-- teacher's queue could count files and could not name one. This returns exactly
-- what a queue and a learner's own page need, and nothing that could be used to
-- fetch the object except through the route that checks `may_watch_master()`.
create or replace function public.assignment_submission_files(p_submission_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_out  jsonb := '[]'::jsonb;
  v_row  record;
begin
  if public.current_user_id() is null then
    raise exception 'sign in to read a submission'
      using errcode = 'insufficient_privilege';
  end if;

  if not public.can_read_assignment_submission(p_submission_id) then
    raise exception 'that submission is not yours to read'
      using errcode = 'insufficient_privilege';
  end if;

  for v_row in
    -- Handed in, in the order they were attached.
    select asa.id, asa.media_asset_id, asa.position, ma.display_name,
           ma.mime_type, ma.byte_size, ma.status, ma.created_at
      from public.assignment_submission_assets asa
      join public.media_assets ma on ma.id = asa.media_asset_id
     where asa.submission_id = p_submission_id
       and ma.deleted_at is null

    union all

    -- Declared and still arriving. Shown because a learner who reloads
    -- mid-transfer should see the file they started, not an empty list that
    -- invites a second upload.
    select null::uuid, ma.id, 0, ma.display_name,
           ma.mime_type, ma.byte_size, ma.status, ma.created_at
      from public.coursework_upload_declarations d
      join public.media_assets ma on ma.id = d.asset_id
     where d.submission_id = p_submission_id
       and ma.deleted_at is null
       and ma.status = 'pending'
  loop
    v_out := v_out || jsonb_build_object(
      'attachmentId', case when v_row.id is null then null else v_row.id end,
      'assetId',      v_row.media_asset_id,
      'name',         v_row.display_name,
      'mimeType',     v_row.mime_type,
      'byteSize',     v_row.byte_size::text,
      'status',       v_row.status,
      'uploadedAt',   v_row.created_at
    );
  end loop;

  return v_out;
end;
$$;

revoke all on function public.assignment_submission_files(uuid) from public, anon;
grant execute on function public.assignment_submission_files(uuid) to authenticated;

comment on function public.assignment_submission_files(uuid) is
  'The files handed in on one submission — name, type, size, status — for anybody who may read that submission. Includes files still arriving, so a reload mid-upload does not look like nothing was sent. No object coordinates.';
