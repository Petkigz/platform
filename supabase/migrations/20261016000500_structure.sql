-- Group 2 · course structure
--
-- course_versions -> course_sections -> lessons -> lesson_resources
--
-- Every one of these inherits the D5 lock: once a version leaves 'draft', its
-- structure is frozen, because an enrolment pins the version and a learner may
-- be mid-way through it.

-- ---------------------------------------------------------------------------
-- sections
-- ---------------------------------------------------------------------------
create table public.course_sections (
  id uuid primary key default gen_random_uuid(),

  course_version_id uuid not null
    references public.course_versions (id) on delete cascade,

  title text not null check (length(trim(title)) > 0),
  description text,

  position integer not null default 1 check (position > 0),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Deferrable so a reorder can be expressed as a single transaction that
-- swaps positions without tripping the constraint mid-statement.
alter table public.course_sections
  add constraint course_sections_position_key
  unique (course_version_id, position) deferrable initially deferred;

create trigger course_sections_set_updated_at
  before update on public.course_sections
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- lessons
-- ---------------------------------------------------------------------------
create table public.lessons (
  id uuid primary key default gen_random_uuid(),

  section_id uuid not null
    references public.course_sections (id) on delete cascade,

  title text not null check (length(trim(title)) > 0),
  description text,

  -- 'live' is a reference to a scheduled session, not content stored here.
  type text not null default 'video'
    check (type in ('video', 'text', 'audio', 'interactive', 'live')),

  position integer not null default 1 check (position > 0),

  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),

  -- How progress marks this lesson complete. Kept as a fixed vocabulary so
  -- analytics and certificates can rely on it.
  completion_rule text not null default 'viewed'
    check (completion_rule in
      ('viewed', 'finished', 'duration_threshold', 'quiz_passed', 'manual')),

  -- Free preview lesson. Public even when the version is paid; this is the
  -- catalogue-preview pattern, distinct from enrolment entitlement.
  is_preview boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.lessons
  add constraint lessons_position_key
  unique (section_id, position) deferrable initially deferred;

create trigger lessons_set_updated_at
  before update on public.lessons
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- lesson_resources
--
-- A resource points at a media asset we own (preferred) or an approved
-- external URL — one or the other, never both and never neither.
-- ---------------------------------------------------------------------------
create table public.lesson_resources (
  id uuid primary key default gen_random_uuid(),

  lesson_id uuid not null
    references public.lessons (id) on delete cascade,

  resource_type text not null default 'video'
    check (resource_type in
      ('video', 'audio', 'document', 'worksheet', 'link', 'quiz', 'other')),

  media_asset_id uuid references public.media_assets (id) on delete restrict,

  -- External URL, allowed for approved third-party sources. Must be https.
  external_url text
    check (external_url is null or external_url ~ '^https://'),

  constraint lesson_resources_single_source check (
    (media_asset_id is not null) <> (external_url is not null)
  ),

  display_name text not null check (length(trim(display_name)) > 0),

  position integer not null default 1 check (position > 0),

  -- Who may fetch it. 'enrolled' is the default; 'public_preview' backs
  -- is_preview lessons; 'guardian' gates materials shown to parents.
  access_classification text not null default 'enrolled'
    check (access_classification in ('public_preview', 'enrolled', 'guardian', 'restricted')),

  -- File size, page count, transcript reference, renderer hints.
  technical_metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.lesson_resources
  add constraint lesson_resources_position_key
  unique (lesson_id, position) deferrable initially deferred;

create index lesson_resources_lesson_idx on public.lesson_resources (lesson_id);
create index lesson_resources_asset_idx  on public.lesson_resources (media_asset_id);

create trigger lesson_resources_set_updated_at
  before update on public.lesson_resources
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- course_version_subjects
--
-- Maps an exact version, not a course, to the catalogue taxonomy. The record
-- specifies this deliberately: a revision can change what a course is about,
-- so the taxonomy follows the version.
-- ---------------------------------------------------------------------------
create table public.course_version_subjects (
  id uuid primary key default gen_random_uuid(),

  course_version_id uuid not null
    references public.course_versions (id) on delete cascade,
  subject_area_id uuid not null
    references public.subject_areas (id) on delete restrict,

  created_at timestamptz not null default now()
);

create unique index course_version_subjects_key
  on public.course_version_subjects (course_version_id, subject_area_id);

create index course_version_subjects_subject_idx
  on public.course_version_subjects (subject_area_id);

comment on table public.course_sections is 'Ordering layer between a version and its lessons.';
comment on table public.lessons is 'Teaching unit. is_preview marks catalogue-preview lessons.';
comment on table public.lesson_resources is 'References only, never bytes. One media asset OR one approved https URL.';
comment on table public.course_version_subjects is 'Subject taxonomy mapping, attached to a version.';

-- ---------------------------------------------------------------------------
-- D5 subtree locks
--
-- Three functions rather than one generic one: a generic trigger would have to
-- reach for a differently-named column per table, and on INSERT the new row is
-- not yet queryable, so resolving through the parent chain by id fails.
-- Resolving through the parent key instead is both correct and cheaper.
-- ---------------------------------------------------------------------------
-- plpgsql cannot dot-dereference a function result, so the parent key is read
-- from OLD on a delete and NEW otherwise. coalesce(new, old) is still fine as
-- a return value, just not as a record to take fields from.
create or replace function public.lock_section_of_locked_version()
returns trigger
language plpgsql
as $$
declare
  v_version uuid;
  v_status  text;
begin
  if public.version_lock_active() then
    return coalesce(new, old);
  end if;

  v_version := case when tg_op = 'DELETE' then old.course_version_id
                    else new.course_version_id end;

  select cv.version_status into v_status
    from public.course_versions cv
   where cv.id = v_version;

  if v_status is null or v_status = 'draft' then
    return coalesce(new, old);
  end if;

  raise exception
    'cannot modify sections of course version %, which is % and therefore locked (D5)',
    v_version, v_status
    using errcode = 'insufficient_privilege';
end;
$$;

create or replace function public.lock_lesson_of_locked_version()
returns trigger
language plpgsql
as $$
declare
  v_section uuid;
  v_version uuid;
  v_status  text;
begin
  if public.version_lock_active() then
    return coalesce(new, old);
  end if;

  v_section := case when tg_op = 'DELETE' then old.section_id
                    else new.section_id end;

  select cs.course_version_id, cv.version_status
    into v_version, v_status
    from public.course_sections cs
    join public.course_versions cv on cv.id = cs.course_version_id
   where cs.id = v_section;

  if v_status is null or v_status = 'draft' then
    return coalesce(new, old);
  end if;

  raise exception
    'cannot modify lessons of course version %, which is % and therefore locked (D5)',
    v_version, v_status
    using errcode = 'insufficient_privilege';
end;
$$;

create or replace function public.lock_resource_of_locked_version()
returns trigger
language plpgsql
as $$
declare
  v_lesson  uuid;
  v_version uuid;
  v_status  text;
begin
  if public.version_lock_active() then
    return coalesce(new, old);
  end if;

  v_lesson := case when tg_op = 'DELETE' then old.lesson_id
                   else new.lesson_id end;

  select cs.course_version_id, cv.version_status
    into v_version, v_status
    from public.lessons l
    join public.course_sections cs on cs.id = l.section_id
    join public.course_versions cv on cv.id = cs.course_version_id
   where l.id = v_lesson;

  if v_status is null or v_status = 'draft' then
    return coalesce(new, old);
  end if;

  raise exception
    'cannot modify lesson resources of course version %, which is % and therefore locked (D5)',
    v_version, v_status
    using errcode = 'insufficient_privilege';
end;
$$;

create or replace function public.lock_subject_mapping_of_locked_version()
returns trigger
language plpgsql
as $$
declare
  v_version uuid;
  v_status  text;
begin
  if public.version_lock_active() then
    return coalesce(new, old);
  end if;

  v_version := case when tg_op = 'DELETE' then old.course_version_id
                    else new.course_version_id end;

  select cv.version_status into v_status
    from public.course_versions cv
   where cv.id = v_version;

  if v_status is null or v_status = 'draft' then
    return coalesce(new, old);
  end if;

  raise exception
    'cannot modify subject mapping of course version %, which is % and therefore locked (D5)',
    v_version, v_status
    using errcode = 'insufficient_privilege';
end;
$$;

create trigger course_sections_lock
  before insert or update or delete on public.course_sections
  for each row execute function public.lock_section_of_locked_version();

create trigger lessons_lock
  before insert or update or delete on public.lessons
  for each row execute function public.lock_lesson_of_locked_version();

create trigger lesson_resources_lock
  before insert or update or delete on public.lesson_resources
  for each row execute function public.lock_resource_of_locked_version();

create trigger course_version_subjects_lock
  before insert or update or delete on public.course_version_subjects
  for each row execute function public.lock_subject_mapping_of_locked_version();
