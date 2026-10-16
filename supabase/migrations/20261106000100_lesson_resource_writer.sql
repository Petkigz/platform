-- Let a teacher put content into a lesson.
--
-- WHAT THIS FIXES
-- ---------------
-- A teacher could create a course, a section, and a lesson. There was no way to
-- attach anything to the lesson. lesson_resources is read by the learner page,
-- which is what turns a lesson into a video, a reading, a worksheet — and
-- nothing in the application ever wrote to it.
--
-- So every lesson was an empty page. A course could be authored end to end,
-- published, bought, and studied, and contain nothing. This is the fifteenth
-- instance of the same defect and, after the missing signup profile, the second
-- one that makes the product unusable rather than merely incomplete.
--
-- SCOPE
-- -----
-- Only external_url is supported here. The other source is media_asset_id, and
-- media_assets has no writer either, so there is nothing to point at. Under D8
-- the masters belong in our own storage with Cloudflare Stream for delivery;
-- wiring media_assets is the next step and is deliberately not guessed at here.
--
-- DRAFT ONLY
-- ----------
-- lesson_resources_lock already freezes this table at publication, exactly as
-- it does sections, lessons and subject mapping. Resources are added while
-- authoring, not afterwards.
--
-- A SECOND PROBLEM IN THE POLICIES
-- --------------------------------
-- The write policies used can_read_version() — a read predicate standing in for
-- a write gate, the same mistake as course_version_subjects. Corrected to
-- can_author_version(). Whether the old one was exploitable is tested rather
-- than asserted, because that claim was wrong last time.

-- ---------------------------------------------------------------------------
-- Attaching content is authoring, not reading
-- ---------------------------------------------------------------------------

drop policy if exists lesson_resources_write  on public.lesson_resources;
drop policy if exists lesson_resources_update on public.lesson_resources;

create policy lesson_resources_insert
  on public.lesson_resources
  for insert
  to authenticated
  with check (exists (
    select 1
      from public.lessons l
      join public.course_sections cs on cs.id = l.section_id
     where l.id = lesson_resources.lesson_id
       and public.can_author_version(cs.course_version_id)
  ));

create policy lesson_resources_update
  on public.lesson_resources
  for update
  to authenticated
  using (exists (
    select 1
      from public.lessons l
      join public.course_sections cs on cs.id = l.section_id
     where l.id = lesson_resources.lesson_id
       and public.can_author_version(cs.course_version_id)
  ))
  with check (exists (
    select 1
      from public.lessons l
      join public.course_sections cs on cs.id = l.section_id
     where l.id = lesson_resources.lesson_id
       and public.can_author_version(cs.course_version_id)
  ));

create policy lesson_resources_delete
  on public.lesson_resources
  for delete
  to authenticated
  using (exists (
    select 1
      from public.lessons l
      join public.course_sections cs on cs.id = l.section_id
     where l.id = lesson_resources.lesson_id
       and public.can_author_version(cs.course_version_id)
  ));

-- ---------------------------------------------------------------------------
-- The writer
-- ---------------------------------------------------------------------------

create or replace function public.add_lesson_resource(
  p_lesson_id      uuid,
  p_resource_type  text,
  p_external_url   text,
  p_display_name   text,
  p_access         text default 'enrolled'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor    uuid;
  v_version  uuid;
  v_position integer;
  v_id       uuid;
begin
  v_actor := public.current_user_id();

  if v_actor is null then
    raise exception 'sign in to add lesson content'
      using errcode = 'insufficient_privilege';
  end if;

  if coalesce(trim(p_display_name), '') = '' then
    raise exception 'lesson content needs a name learners will see'
      using errcode = 'invalid_parameter_value';
  end if;

  select cs.course_version_id into v_version
    from public.lessons l
    join public.course_sections cs on cs.id = l.section_id
   where l.id = p_lesson_id;

  if v_version is null then
    raise exception 'lesson % not found', p_lesson_id
      using errcode = 'no_data_found';
  end if;

  -- Authorship, not readability.
  if not public.can_author_version(v_version) then
    raise exception 'only the author may add content to this lesson'
      using errcode = 'insufficient_privilege';
  end if;

  if p_resource_type not in ('video','audio','document','worksheet','link','quiz','other') then
    raise exception 'unsupported resource type: %', p_resource_type
      using errcode = 'invalid_parameter_value';
  end if;

  if p_access not in ('public_preview','enrolled','guardian','restricted') then
    raise exception 'unsupported access classification: %', p_access
      using errcode = 'invalid_parameter_value';
  end if;

  -- The CHECK is `^https://`, so an http link is refused by the database.
  -- Reporting it here instead means the teacher is told what to fix rather
  -- than being handed a constraint name.
  if coalesce(trim(p_external_url), '') = '' then
    raise exception
      'lesson content needs a URL; uploading into our own storage is not wired yet'
      using errcode = 'invalid_parameter_value';
  end if;

  if p_external_url not like 'https://%' then
    raise exception
      'lesson content must be served over https, got %', left(p_external_url, 40)
      using errcode = 'invalid_parameter_value';
  end if;

  -- Append at the end. lesson_resources_position_key is unique per lesson, so
  -- picking a position by hand would collide; the teacher reorders later
  -- rather than guessing a free slot now.
  select coalesce(max(position), 0) + 1 into v_position
    from public.lesson_resources
   where lesson_id = p_lesson_id;

  insert into public.lesson_resources
    (lesson_id, resource_type, external_url, display_name, position, access_classification)
  values
    (p_lesson_id, p_resource_type, trim(p_external_url), trim(p_display_name),
     v_position, p_access)
  returning id into v_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'lesson.resource_added', 'lesson', p_lesson_id,
          jsonb_build_object('resource_type', p_resource_type,
                             'access', p_access,
                             'position', v_position));

  return v_id;
end;
$$;

revoke all on function public.add_lesson_resource(uuid, text, text, text, text) from public;
grant execute on function public.add_lesson_resource(uuid, text, text, text, text) to authenticated;

comment on function public.add_lesson_resource(uuid, text, text, text, text) is
  'Attaches a resource to a lesson by external URL. Author or privileged only; draft only, enforced by lesson_resources_lock.';
