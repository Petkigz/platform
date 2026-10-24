-- ---------------------------------------------------------------------------
-- A lesson can check you without grading you
-- ---------------------------------------------------------------------------
-- Screen 15 in the inventory is "interactive lesson", and the platform has had
-- almost all of it for a long time: sections, lessons, video, audio, sources,
-- notes, discussion. The missing half is the one that makes a lesson
-- interactive rather than a page with a video on it — a question you can answer
-- *as you read*, and find out immediately whether you followed.
--
-- The pieces exist and were never joined: an assessment can already hang off a
-- single lesson (`assessments.lesson_id`), and it can already be a `practice`
-- assessment. What cannot be done today is check an answer. The only route is
-- `start_attempt()` → `submit()` → `grade_response()`, which is the graded
-- sitting: it creates an attempt, consumes one of the attempt limit, records a
-- score, and can move a completion rule. Doing that to somebody who is reading
-- a paragraph and wondering if they understood it is absurd.
--
-- Four decisions.
--
--   1. IT IS A CHECK, NOT AN ATTEMPT. Nothing is written. No attempt row, no
--      response row, no score, no progress. `check_lesson_answer()` is a
--      read-only function, and it is `stable` because it must be.
--
--   2. IT READS THE KEY, AND RETURNS ONLY THE VERDICT. `answer_key` is protected
--      by column grants and this is the second function ever allowed to read it
--      (the first is `grade_response()`). It never appears in the reply.
--
--   3. IT COMPARES THE WAY THE GRADER COMPARES. A practice check that is more
--      forgiving than the marked quiz would teach a learner that their answer
--      was right when the exam will say otherwise. The one normalisation is the
--      one the grader already receives: multiple-choice answers arrive sorted
--      from the client, and a short answer with a trailing space is not a
--      different answer.
--
--   4. IT ANSWERS FOR A LESSON YOU CAN OPEN. Entitlement is the same predicate
--      the materials use: a live enrolment pinned to the version the question
--      belongs to, whose learner the caller may act for — so a parent checking
--      their child's practice, and an adult checking their own, both pass for
--      the same reason.
--
-- The explanation is a reward for being wrong as much as for being right, but
-- only on a practice assessment. On a graded one it would leak the answer
-- before the sitting, so it comes back only after a correct answer — which the
-- learner already knew.
-- ---------------------------------------------------------------------------

create or replace function public.check_lesson_answer(
  p_question_id uuid,
  p_answer      jsonb
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor        uuid := public.current_user_id();
  v_question     record;
  v_answer       jsonb := p_answer;
  v_key          jsonb;
  v_correct      boolean;
  v_explanation  text;
begin
  if v_actor is null then
    raise exception 'sign in to check an answer'
      using errcode = 'insufficient_privilege';
  end if;

  select q.id,
         q.type,
         q.answer_key,
         q.explanation,
         q.grading_method,
         a.type   as assessment_type,
         a.status as assessment_status,
         a.course_version_id
    into v_question
    from public.assessment_questions q
    join public.assessments a on a.id = q.assessment_id
   where q.id = p_question_id;

  if v_question.id is null then
    raise exception 'no such question'
      using errcode = 'no_data_found';
  end if;

  if v_question.assessment_status <> 'active' then
    raise exception 'this question belongs to an assessment that is not open'
      using errcode = 'check_violation';
  end if;

  if v_question.grading_method <> 'automatic' then
    raise exception 'a teacher marks this question, so it cannot be checked here'
      using errcode = 'check_violation';
  end if;

  if not exists (
    select 1
      from public.course_enrolments e
     where e.course_version_id = v_question.course_version_id
       and e.status in ('active', 'completed')
       and e.deleted_at is null
       and public.can_access_learner(e.learner_profile_id)
  ) then
    raise exception 'you are not enrolled in the course this question belongs to'
      using errcode = 'insufficient_privilege';
  end if;

  v_key := v_question.answer_key;

  if v_question.type = 'multiple_choice' then
    -- The quiz client sorts before sending, so the grader already compares
    -- sorted arrays. Sort both sides anyway: this is the only place a check is
    -- told to be forgiving, and it must not be more forgiving than the grader.
    if jsonb_typeof(v_answer) = 'array' then
      v_answer := (
        select coalesce(jsonb_agg(x order by x), '[]'::jsonb)
          from jsonb_array_elements_text(v_answer) as t(x));
    end if;
    if jsonb_typeof(v_key) = 'array' then
      v_key := (
        select coalesce(jsonb_agg(x order by x), '[]'::jsonb)
          from jsonb_array_elements_text(v_key) as t(x));
    end if;
  elsif v_question.type = 'short_answer' then
    -- A trailing space is not a second answer.
    if jsonb_typeof(v_answer) = 'string' then
      v_answer := to_jsonb(btrim(v_answer #>> '{}'));
    end if;
    if jsonb_typeof(v_key) = 'string' then
      v_key := to_jsonb(btrim(v_key #>> '{}'));
    end if;
  end if;

  v_correct := v_answer is not null and v_key is not null and v_answer = v_key;

  v_explanation := case
    when v_question.explanation is null then null
    -- Practice: the explanation is the point of the check.
    when v_question.assessment_type = 'practice' then v_question.explanation
    -- Graded: only once the learner is right, which they already knew.
    when v_correct then v_question.explanation
    else null
  end;

  return jsonb_build_object(
    'questionId',  v_question.id,
    'correct',     v_correct,
    'explanation', v_explanation);
end;
$$;

revoke all on function public.check_lesson_answer(uuid, jsonb) from public, anon;
grant execute on function public.check_lesson_answer(uuid, jsonb) to authenticated;

comment on function public.check_lesson_answer(uuid, jsonb) is
  'Check one answer to one lesson question. Read-only: no attempt, no response, no score. Reads answer_key and returns only the verdict, comparing the way grade_response() compares.';
