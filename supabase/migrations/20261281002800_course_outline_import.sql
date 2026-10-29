-- A teacher's thirty-lesson outline, out of a spreadsheet and into a draft.
--
-- WHY THIS EXISTS
-- ---------------
-- `platform.data_export` was registered with a second half it never had: *"Data
-- export in more than one format, and an import path."* Export was built and
-- import was refused, with the reason written down — *"a file from somewhere else
-- has to be mapped into courses, learners and enrolments that nobody wrote, which
-- is inventing records rather than importing them."* That reason is still right
-- about a stranger's file. It is not right about a teacher's own outline.
--
-- A teacher arrives with their curriculum already written: a term plan, a
-- madrasah syllabus, thirty lesson titles in a spreadsheet and a WhatsApp group
-- full of handouts. Today they type those thirty titles into the editor one at a
-- time through a form that creates one row per submit. That is not a missing
-- feature; it is the difference between a teacher publishing this month and not.
--
-- WHAT AN IMPORT IS HERE
-- ----------------------
-- **The outline, and only the outline.** Section titles, lesson titles, an
-- optional description of each lesson, and whether a lesson is a free preview.
-- Not the lesson's media, not its attachments, not its assessments: those have
-- files, rights and review attached to them, and a spreadsheet column is not a
-- place to carry a video. The screen says so before the button is pressed, so
-- nobody imports expecting a finished course.
--
-- **Nothing is guessed.** The source is a CSV whose header row names its own
-- columns; a column nobody recognises is refused rather than silently dropped,
-- and a row that is missing a title is an error naming its line number. The
-- parser lives in `web/src/lib/csv-import.ts` and the *result* of parsing is what
-- arrives here — this function never sees text, only structure, so there is one
-- place that decides what a CSV means.
--
-- **All or nothing.** Every section and every lesson is validated before the
-- first row is written. A file with an error on line 41 creates nothing at all,
-- rather than half an outline that the teacher has to reconcile by hand. This is
-- one function call in one transaction, which is the only way to promise that.
--
-- **It lands at the end of a draft.** Positions continue after whatever is
-- already there, so importing into a half-written outline appends instead of
-- colliding. A published version is frozen (D5) and is refused by name; the
-- teacher makes a new version and imports into that.
--
-- WHY THERE IS NO NEW FLAG
-- ------------------------
-- Import is authoring, not a separate capability. `can_author_version()` is the
-- same predicate the editor's `addSection`/`addLesson` rely on, so a teacher who
-- may not edit a draft cannot import into it either, and an owner who has not
-- appointed a teacher has nobody to import. A flag here would be a second switch
-- over one permission, and the second one is the one that gets left on.
--
-- THE LIMITS, AND WHY THESE NUMBERS
-- ---------------------------------
-- 50 sections, 100 lessons per section, 300 lessons in one file. They are not a
-- judgement about a curriculum — they are what stops a mis-pasted spreadsheet
-- from creating ten thousand rows in one request. A course larger than this is
-- imported in two files into the same draft.

create or replace function public.import_course_outline(
  p_version_id uuid,
  p_sections   jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor        uuid := public.current_user_id();
  v_status       text;
  v_section      jsonb;
  v_lesson       jsonb;
  v_lesson_list  jsonb;
  v_title        text;
  v_description  text;
  v_preview      boolean;
  v_section_id   uuid;
  v_section_pos  integer;
  v_lesson_pos   integer;
  v_sections     integer;
  v_lessons      integer := 0;
  v_made_lessons integer;
begin
  if v_actor is null or not public.can_author_version(p_version_id) then
    raise exception 'teaching:not_allowed'
      using errcode = 'insufficient_privilege';
  end if;

  select cv.version_status into v_status
    from public.course_versions cv
   where cv.id = p_version_id;

  if v_status is null then
    raise exception 'teaching:not_found'
      using errcode = 'no_data_found';
  end if;

  -- Draft, or rejected-then-reopened draft: both are editable. Everything else
  -- is either frozen or waiting on a reviewer, and an import into a version under
  -- review would change what the reviewer is reading.
  if v_status <> 'draft' then
    raise exception 'teaching:version_frozen'
      using errcode = 'check_violation';
  end if;

  if p_sections is null or jsonb_typeof(p_sections) <> 'array' then
    raise exception 'teaching:import_malformed'
      using errcode = 'invalid_parameter_value';
  end if;

  v_sections := jsonb_array_length(p_sections);

  if v_sections = 0 then
    raise exception 'teaching:import_empty'
      using errcode = 'invalid_parameter_value';
  end if;

  if v_sections > 50 then
    raise exception 'teaching:import_too_large'
      using errcode = 'invalid_parameter_value';
  end if;

  -- -------------------------------------------------------------------------
  -- Everything is checked before anything is written.
  -- -------------------------------------------------------------------------
  for v_section in select value from jsonb_array_elements(p_sections) loop
    if jsonb_typeof(v_section) <> 'object' then
      raise exception 'teaching:import_malformed'
        using errcode = 'invalid_parameter_value';
    end if;

    v_title := btrim(coalesce(v_section ->> 'title', ''));
    if v_title = '' then
      raise exception 'teaching:import_title_required'
        using errcode = 'check_violation';
    end if;
    if length(v_title) > 200 then
      raise exception 'teaching:import_title_too_long'
        using errcode = 'invalid_parameter_value';
    end if;

    v_lesson_list := v_section -> 'lessons';
    if v_lesson_list is null or jsonb_typeof(v_lesson_list) <> 'array' then
      raise exception 'teaching:import_section_empty'
        using errcode = 'check_violation';
    end if;
    if jsonb_array_length(v_lesson_list) = 0 then
      raise exception 'teaching:import_section_empty'
        using errcode = 'check_violation';
    end if;
    if jsonb_array_length(v_lesson_list) > 100 then
      raise exception 'teaching:import_too_large'
        using errcode = 'invalid_parameter_value';
    end if;

    v_lessons := v_lessons + jsonb_array_length(v_lesson_list);

    for v_lesson in select value from jsonb_array_elements(v_lesson_list) loop
      if jsonb_typeof(v_lesson) <> 'object' then
        raise exception 'teaching:import_malformed'
          using errcode = 'invalid_parameter_value';
      end if;

      v_title := btrim(coalesce(v_lesson ->> 'title', ''));
      if v_title = '' then
        raise exception 'teaching:import_title_required'
          using errcode = 'check_violation';
      end if;
      if length(v_title) > 200 then
        raise exception 'teaching:import_title_too_long'
          using errcode = 'invalid_parameter_value';
      end if;
      if length(coalesce(v_lesson ->> 'description', '')) > 2000 then
        raise exception 'teaching:import_description_too_long'
          using errcode = 'invalid_parameter_value';
      end if;
      -- `preview` is cast to boolean below. A caller that sends "yes" instead of
      -- true would get a cast error naming a type rather than the field, so the
      -- shape is checked here where the message can say what is wrong.
      if v_lesson ? 'preview'
         and jsonb_typeof(v_lesson -> 'preview') not in ('boolean', 'null') then
        raise exception 'teaching:import_malformed'
          using errcode = 'invalid_parameter_value';
      end if;
    end loop;
  end loop;

  if v_lessons > 300 then
    raise exception 'teaching:import_too_large'
      using errcode = 'invalid_parameter_value';
  end if;

  -- -------------------------------------------------------------------------
  -- The write. Every visible rule was applied above and the policies still
  -- apply below: this runs as the caller's author for nothing, it runs as the
  -- definer only so the audit row can be written.
  -- -------------------------------------------------------------------------
  select coalesce(max(cs.position), 0) into v_section_pos
    from public.course_sections cs
   where cs.course_version_id = p_version_id;

  v_made_lessons := 0;

  for v_section in select value from jsonb_array_elements(p_sections) loop
    v_section_pos := v_section_pos + 1;

    insert into public.course_sections (course_version_id, title, position)
    values (p_version_id, btrim(v_section ->> 'title'), v_section_pos)
    returning id into v_section_id;

    v_lesson_pos := 0;

    for v_lesson in select value from jsonb_array_elements(v_section -> 'lessons') loop
      v_lesson_pos := v_lesson_pos + 1;

      v_description := nullif(btrim(coalesce(v_lesson ->> 'description', '')), '');
      v_preview := coalesce((v_lesson ->> 'preview')::boolean, false);

      insert into public.lessons (section_id, title, description, position, is_preview)
      values (v_section_id, btrim(v_lesson ->> 'title'), v_description,
              v_lesson_pos, v_preview);

      v_made_lessons := v_made_lessons + 1;
    end loop;
  end loop;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'teaching.outline_imported', 'course_version', p_version_id,
          jsonb_build_object('sections', v_sections, 'lessons', v_made_lessons));

  return jsonb_build_object('sections', v_sections, 'lessons', v_made_lessons);
end;
$$;

revoke all on function public.import_course_outline(uuid, jsonb) from public, anon;
grant execute on function public.import_course_outline(uuid, jsonb) to authenticated;

comment on function public.import_course_outline(uuid, jsonb) is
  'Appends a validated outline to a draft course version: sections, lesson '
  'titles, optional descriptions, optional preview flags. All or nothing. '
  'Refuses a version that is not a draft, refuses a non-author, and writes one '
  'audit row (teaching.outline_imported). It imports structure, never media: a '
  'spreadsheet column is not a place to carry a video.';
