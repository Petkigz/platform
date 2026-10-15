-- Group 2 · row level security
--
-- Same rule as Group 1: deny by default. RLS is enabled on every table and a
-- table with no matching policy is invisible, which is the correct failure
-- mode.
--
-- The catalogue is public. Drafts are not. A learner, a prospective learner
-- and an anonymous visitor must never see an unreviewed version, and an
-- instructor must never see another instructor's unpublished work.

alter table public.media_assets            enable row level security;
alter table public.subject_areas           enable row level security;
alter table public.courses                 enable row level security;
alter table public.course_versions         enable row level security;
alter table public.course_sections         enable row level security;
alter table public.lessons                 enable row level security;
alter table public.lesson_resources        enable row level security;
alter table public.course_version_subjects enable row level security;

-- ---------------------------------------------------------------------------
-- helpers
-- ---------------------------------------------------------------------------
create or replace function public.can_read_version(p_version_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.course_versions cv
     where cv.id = p_version_id
       and (
         cv.version_status in ('published', 'retired')
         or cv.created_by = public.current_user_id()
         or public.is_privileged(public.current_user_id())
       )
  );
$$;

create or replace function public.can_write_course(p_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.courses c
     where c.id = p_course_id
       and (c.created_by = public.current_user_id()
            or public.is_privileged(public.current_user_id()))
  );
$$;

-- ---------------------------------------------------------------------------
-- media_assets
--
-- Record note: "Protect media access." Only the uploader and privileged roles
-- can see asset rows. Serving bytes is a signed-URL concern, not an RLS one.
-- ---------------------------------------------------------------------------
create policy media_assets_read on public.media_assets
  for select to authenticated
  using (uploaded_by = public.current_user_id()
         or public.is_privileged(public.current_user_id()));

create policy media_assets_insert on public.media_assets
  for insert to authenticated
  with check (uploaded_by = public.current_user_id());

create policy media_assets_update on public.media_assets
  for update to authenticated
  using (uploaded_by = public.current_user_id()
         or public.is_privileged(public.current_user_id()));

-- No delete policy. D7: media are tombstoned via status/deleted_at, never
-- hard-deleted, because a takedown or rights request may need to reference
-- the row afterwards.

-- ---------------------------------------------------------------------------
-- subject_areas — public catalogue vocabulary, staff-maintained
-- ---------------------------------------------------------------------------
create policy subject_areas_read on public.subject_areas
  for select to anon, authenticated
  using (status = 'active' and deleted_at is null);

create policy subject_areas_write on public.subject_areas
  for insert to authenticated
  with check (public.is_privileged(public.current_user_id()));

create policy subject_areas_update on public.subject_areas
  for update to authenticated
  using (public.is_privileged(public.current_user_id()));

-- ---------------------------------------------------------------------------
-- courses — the catalogue is browsable; drafts are not
-- ---------------------------------------------------------------------------
create policy courses_read on public.courses
  for select to anon, authenticated
  using (
    deleted_at is null
    and (status = 'active'
         or created_by = public.current_user_id()
         or public.is_privileged(public.current_user_id()))
  );

create policy courses_insert on public.courses
  for insert to authenticated
  with check (created_by = public.current_user_id());

create policy courses_update on public.courses
  for update to authenticated
  using (public.can_write_course(id));

-- ---------------------------------------------------------------------------
-- course_versions
-- ---------------------------------------------------------------------------
create policy course_versions_read on public.course_versions
  for select to anon, authenticated
  using (public.can_read_version(id));

create policy course_versions_insert on public.course_versions
  for insert to authenticated
  with check (
    created_by = public.current_user_id()
    and version_status = 'draft'
    and public.can_write_course(course_id)
  );

-- RLS allows the row; the D5 trigger decides whether the content may change.
create policy course_versions_update on public.course_versions
  for update to authenticated
  using (public.can_write_course(course_id));

-- ---------------------------------------------------------------------------
-- structure — visible when its version is visible
-- ---------------------------------------------------------------------------
create policy course_sections_read on public.course_sections
  for select to anon, authenticated
  using (public.can_read_version(course_version_id));

create policy course_sections_write on public.course_sections
  for insert to authenticated
  with check (public.can_read_version(course_version_id));

create policy course_sections_update on public.course_sections
  for update to authenticated
  using (public.can_read_version(course_version_id));

create policy lessons_read on public.lessons
  for select to anon, authenticated
  using (
    exists (
      select 1
        from public.course_sections cs
       where cs.id = lessons.section_id
         and public.can_read_version(cs.course_version_id)
    )
    -- Anonymous visitors see preview lessons only.
    and (public.current_user_id() is not null or is_preview)
  );

create policy lessons_write on public.lessons
  for insert to authenticated
  with check (
    exists (
      select 1
        from public.course_sections cs
       where cs.id = lessons.section_id
         and public.can_read_version(cs.course_version_id)
    )
  );

create policy lessons_update on public.lessons
  for update to authenticated
  using (
    exists (
      select 1
        from public.course_sections cs
       where cs.id = lessons.section_id
         and public.can_read_version(cs.course_version_id)
    )
  );

create policy lesson_resources_read on public.lesson_resources
  for select to anon, authenticated
  using (
    exists (
      select 1
        from public.lessons l
        join public.course_sections cs on cs.id = l.section_id
       where l.id = lesson_resources.lesson_id
         and public.can_read_version(cs.course_version_id)
    )
    and (public.current_user_id() is not null
         or access_classification = 'public_preview')
  );

create policy lesson_resources_write on public.lesson_resources
  for insert to authenticated
  with check (
    exists (
      select 1
        from public.lessons l
        join public.course_sections cs on cs.id = l.section_id
       where l.id = lesson_resources.lesson_id
         and public.can_read_version(cs.course_version_id)
    )
  );

create policy lesson_resources_update on public.lesson_resources
  for update to authenticated
  using (
    exists (
      select 1
        from public.lessons l
        join public.course_sections cs on cs.id = l.section_id
       where l.id = lesson_resources.lesson_id
         and public.can_read_version(cs.course_version_id)
    )
  );

create policy course_version_subjects_read on public.course_version_subjects
  for select to anon, authenticated
  using (public.can_read_version(course_version_id));

create policy course_version_subjects_write on public.course_version_subjects
  for insert to authenticated
  with check (public.can_read_version(course_version_id));

create policy course_version_subjects_update on public.course_version_subjects
  for update to authenticated
  using (public.can_read_version(course_version_id));

-- ---------------------------------------------------------------------------
-- grants
-- ---------------------------------------------------------------------------
grant select on public.subject_areas, public.courses, public.course_versions,
                public.course_sections, public.lessons, public.lesson_resources,
                public.course_version_subjects
  to anon;

grant select, insert, update, delete on public.media_assets,
                public.subject_areas, public.courses, public.course_versions,
                public.course_sections, public.lessons, public.lesson_resources,
                public.course_version_subjects
  to authenticated;

comment on function public.can_read_version(uuid) is
  'Published/retired to everyone; drafts to their author and privileged roles only.';
comment on function public.can_write_course(uuid) is
  'The author or a privileged role. The D5 triggers decide what may actually change.';
