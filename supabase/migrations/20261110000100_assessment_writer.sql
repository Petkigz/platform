-- Assessments, so a course can be assessed.
--
-- WHAT THIS FIXES
-- ---------------
-- assessments and assessment_questions both had zero rows and no writer, so no
-- teacher could create a quiz. That cascades further than a missing feature:
--
--   * completion rules of type 'assessment_submitted' and 'assessment_passed'
--     carry a target_assessment_id, and there was no assessment to point at, so
--     those rules could never be satisfied
--   * submit_attempt() was unreachable, so no learner could ever sit a quiz
--   * certificates gated on completion could not be earned by any rule that
--     needed an assessment
--
-- fetchAssessmentsForVersion() in the app filters on status = 'active', so even
-- a draft assessment is invisible to a learner.
--
-- A TRAP CLOSED HERE, NOT JUST A MISSING WRITER
-- ---------------------------------------------
-- D5 freezes assessments at publication (assessments_lock), and the reader only
-- shows 'active'. So a teacher who wrote an assessment, forgot to activate it,
-- and published would leave it invisible forever — with no way to fix it short
-- of cutting a new course version. A publication precondition refuses that
-- instead of allowing it.
--
-- The write policies on both tables already use can_author_version(), which is
-- the correct predicate — not the read-predicate mistake found in
-- course_version_subjects and lesson_resources. Nothing is corrected there.

-- ---------------------------------------------------------------------------
-- Creating an assessment
-- ---------------------------------------------------------------------------

create or replace function public.create_assessment(
  p_course_version_id uuid,
  p_title             text,
  p_type              text default 'practice',
  p_lesson_id         uuid default null,
  p_pass_threshold    numeric default null,
  p_attempt_limit     integer default null,
  p_instructions      text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid;
  v_id    uuid;
begin
  v_actor := public.current_user_id();

  if v_actor is null then
    raise exception 'sign in to create an assessment'
      using errcode = 'insufficient_privilege';
  end if;

  if coalesce(btrim(p_title), '') = '' then
    raise exception 'an assessment needs a title'
      using errcode = 'invalid_parameter_value';
  end if;

  if p_type not in ('practice','graded','final') then
    raise exception 'unsupported assessment type: %', p_type
      using errcode = 'invalid_parameter_value';
  end if;

  -- The two CHECKs say this already; naming it here means the teacher reads a
  -- sentence rather than a constraint name.
  if p_type = 'practice' and p_pass_threshold is not null then
    raise exception
      'a practice assessment is not graded, so it cannot have a pass mark'
      using errcode = 'invalid_parameter_value';
  end if;

  if p_type in ('graded','final') and p_pass_threshold is null then
    raise exception
      'a % assessment needs a pass mark', p_type
      using errcode = 'invalid_parameter_value';
  end if;

  if p_pass_threshold is not null
     and (p_pass_threshold < 0 or p_pass_threshold > 100) then
    raise exception 'a pass mark must be between 0 and 100, got %', p_pass_threshold
      using errcode = 'invalid_parameter_value';
  end if;

  if p_attempt_limit is not null and p_attempt_limit <= 0 then
    raise exception 'an attempt limit must be at least 1'
      using errcode = 'invalid_parameter_value';
  end if;

  if not public.can_author_version(p_course_version_id) then
    raise exception 'only the author may add an assessment to this course version'
      using errcode = 'insufficient_privilege';
  end if;

  -- Starts as a draft. The learner-facing reader only shows 'active', and
  -- activate_assessment() is what makes that true.
  insert into public.assessments
    (course_version_id, lesson_id, title, instructions, type,
     pass_threshold, attempt_limit, status)
  values
    (p_course_version_id, p_lesson_id, btrim(p_title),
     nullif(btrim(coalesce(p_instructions, '')), ''), p_type,
     p_pass_threshold, p_attempt_limit, 'draft')
  returning id into v_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'assessment.created', 'assessment', v_id,
          jsonb_build_object('type', p_type, 'course_version_id', p_course_version_id));

  return v_id;
end;
$$;

revoke all on function public.create_assessment(uuid, text, text, uuid, numeric, integer, text) from public;
grant execute on function public.create_assessment(uuid, text, text, uuid, numeric, integer, text) to authenticated;

comment on function public.create_assessment(uuid, text, text, uuid, numeric, integer, text) is
  'Creates a draft assessment. Author or privileged; draft version only, enforced by assessments_lock.';

-- ---------------------------------------------------------------------------
-- Adding questions
-- ---------------------------------------------------------------------------

create or replace function public.add_assessment_question(
  p_assessment_id  uuid,
  p_type           text,
  p_content        jsonb,
  p_points         numeric default 1,
  p_grading_method text default 'automatic',
  p_answer_key     jsonb default null,
  p_explanation    text default null
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
    raise exception 'sign in to add a question'
      using errcode = 'insufficient_privilege';
  end if;

  if p_type not in ('single_choice','multiple_choice','true_false','short_answer') then
    raise exception 'unsupported question type: %', p_type
      using errcode = 'invalid_parameter_value';
  end if;

  if p_content is null or jsonb_typeof(p_content) <> 'object' then
    raise exception 'a question needs its content as a JSON object'
      using errcode = 'invalid_parameter_value';
  end if;

  if p_grading_method not in ('automatic','manual') then
    raise exception 'unsupported grading method: %', p_grading_method
      using errcode = 'invalid_parameter_value';
  end if;

  -- aq_automatic_needs_key. An automatically graded question with no key cannot
  -- be marked, so the attempt would never resolve.
  if p_grading_method = 'automatic' and p_answer_key is null then
    raise exception
      'an automatically graded question needs an answer key, or it can never be marked'
      using errcode = 'invalid_parameter_value';
  end if;

  if p_points is null or p_points <= 0 then
    raise exception 'a question is worth at least one point'
      using errcode = 'invalid_parameter_value';
  end if;

  select a.course_version_id into v_version
    from public.assessments a
   where a.id = p_assessment_id;

  if not found then
    raise exception 'assessment % not found', p_assessment_id
      using errcode = 'no_data_found';
  end if;

  if not public.can_author_version(v_version) then
    raise exception 'only the author may add questions to this assessment'
      using errcode = 'insufficient_privilege';
  end if;

  -- Appended, as with lesson resources: (assessment_id, position) is unique, so
  -- a hand-picked position would collide.
  select coalesce(max(position), 0) + 1 into v_position
    from public.assessment_questions
   where assessment_id = p_assessment_id;

  insert into public.assessment_questions
    (assessment_id, type, content, answer_key, points, position,
     explanation, grading_method)
  values
    (p_assessment_id, p_type, p_content, p_answer_key, p_points, v_position,
     nullif(btrim(coalesce(p_explanation, '')), ''), p_grading_method)
  returning id into v_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'assessment.question_added', 'assessment', p_assessment_id,
          jsonb_build_object('question_type', p_type,
                             'grading_method', p_grading_method,
                             'position', v_position));

  return v_id;
end;
$$;

revoke all on function public.add_assessment_question(uuid, text, jsonb, numeric, text, jsonb, text) from public;
grant execute on function public.add_assessment_question(uuid, text, jsonb, numeric, text, jsonb, text) to authenticated;

comment on function public.add_assessment_question(uuid, text, jsonb, numeric, text, jsonb, text) is
  'Appends a question to an assessment. Position is assigned, because (assessment_id, position) is unique.';

-- ---------------------------------------------------------------------------
-- Activation
-- ---------------------------------------------------------------------------

create or replace function public.activate_assessment(p_assessment_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor   uuid;
  v_version uuid;
  v_status  text;
  v_qs      integer;
begin
  v_actor := public.current_user_id();

  if v_actor is null then
    raise exception 'sign in to activate an assessment'
      using errcode = 'insufficient_privilege';
  end if;

  select course_version_id, status into v_version, v_status
    from public.assessments
   where id = p_assessment_id
   for update;

  if not found then
    raise exception 'assessment % not found', p_assessment_id
      using errcode = 'no_data_found';
  end if;

  if not public.can_author_version(v_version) then
    raise exception 'only the author may activate this assessment'
      using errcode = 'insufficient_privilege';
  end if;

  if v_status = 'active' then
    return false;
  end if;

  if v_status = 'retired' then
    raise exception 'that assessment has been retired'
      using errcode = 'invalid_parameter_value';
  end if;

  -- An assessment with no questions is not a quiz, and activating one would
  -- produce a zero-mark attempt that nobody could pass.
  select count(*) into v_qs
    from public.assessment_questions
   where assessment_id = p_assessment_id;

  if v_qs = 0 then
    raise exception 'an assessment needs at least one question before it can be used'
      using errcode = 'invalid_parameter_value';
  end if;

  update public.assessments set status = 'active' where id = p_assessment_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'assessment.activated', 'assessment', p_assessment_id,
          jsonb_build_object('questions', v_qs));

  return true;
end;
$$;

revoke all on function public.activate_assessment(uuid) from public;
grant execute on function public.activate_assessment(uuid) to authenticated;

comment on function public.activate_assessment(uuid) is
  'Makes an assessment visible to learners. Requires at least one question, because an empty assessment could never be passed.';

-- ---------------------------------------------------------------------------
-- The trap: publishing with a draft assessment left behind
-- ---------------------------------------------------------------------------

create or replace function public.guard_draft_assessments_at_publication()
returns trigger
language plpgsql
as $$
declare
  v_drafts integer;
  v_names  text;
begin
  -- Only on the way into published.
  if new.version_status <> 'published'
     or old.version_status = 'published' then
    return new;
  end if;

  select count(*), string_agg(btrim(a.title), ', ' order by a.title)
    into v_drafts, v_names
    from public.assessments a
   where a.course_version_id = new.id
     and a.status = 'draft';

  if coalesce(v_drafts, 0) > 0 then
    -- D5 freezes assessments at publication and the learner-facing reader only
    -- shows 'active', so a draft left here would be invisible forever with no
    -- way to fix it short of a new course version. Refusing is cheaper than
    -- discovering it after people have paid.
    raise exception
      '% draft assessment(s) must be activated or removed before publishing: %',
      v_drafts, v_names
      using errcode = 'invalid_parameter_value';
  end if;

  return new;
end;
$$;

comment on function public.guard_draft_assessments_at_publication() is
  'Refuses to publish a version with a draft assessment, which D5 would freeze invisible. The learner reader only shows status=''active''.';

drop trigger if exists course_versions_guard_draft_assessments on public.course_versions;
create trigger course_versions_guard_draft_assessments
  before update on public.course_versions
  for each row
  when (new.version_status = 'published' and old.version_status is distinct from 'published')
  execute function public.guard_draft_assessments_at_publication();
