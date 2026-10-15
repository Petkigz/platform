-- Group 2 · assessment rules
--
-- The recorded invariants, enforced where they cannot be forgotten:
--   · assessment and enrolment versions must match
--   · submitted attempts are immutable
--   · grade changes go through one audited path
--   · mixed grading waits for the manual questions

-- ---------------------------------------------------------------------------
-- version and learner compatibility
-- ---------------------------------------------------------------------------
create or replace function public.enforce_attempt_compatibility()
returns trigger
language plpgsql
as $$
declare
  v_assessment_version uuid;
  v_enrolment_version  uuid;
  v_enrolment_learner  uuid;
begin
  select a.course_version_id into v_assessment_version
    from public.assessments a where a.id = new.assessment_id;

  select ce.course_version_id, ce.learner_profile_id
    into v_enrolment_version, v_enrolment_learner
    from public.course_enrolments ce where ce.id = new.course_enrolment_id;

  if v_assessment_version is null or v_enrolment_version is null then
    raise exception 'attempt references a missing assessment or enrolment'
      using errcode = 'foreign_key_violation';
  end if;

  if v_assessment_version <> v_enrolment_version then
    raise exception
      'assessment % belongs to version % but enrolment % is pinned to version %',
      new.assessment_id, v_assessment_version,
      new.course_enrolment_id, v_enrolment_version
      using errcode = 'check_violation';
  end if;

  if v_enrolment_learner <> new.learner_profile_id then
    raise exception
      'attempt learner % does not match enrolment learner %',
      new.learner_profile_id, v_enrolment_learner
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger assessment_attempts_compatibility
  before insert or update of assessment_id, course_enrolment_id, learner_profile_id
  on public.assessment_attempts
  for each row execute function public.enforce_attempt_compatibility();

-- ---------------------------------------------------------------------------
-- attempt limit
--
-- Abandoned attempts deliberately do not consume a slot: a learner who closes
-- the tab should not lose the chance to sit the assessment.
-- ---------------------------------------------------------------------------
create or replace function public.enforce_attempt_limit()
returns trigger
language plpgsql
as $$
declare
  v_limit integer;
  v_used  integer;
begin
  select a.attempt_limit into v_limit
    from public.assessments a where a.id = new.assessment_id;

  if v_limit is null then
    return new;
  end if;

  select count(*) into v_used
    from public.assessment_attempts aa
   where aa.assessment_id = new.assessment_id
     and aa.learner_profile_id = new.learner_profile_id
     and aa.status <> 'abandoned';

  if v_used >= v_limit then
    raise exception
      'learner % has used all % permitted attempts on assessment %',
      new.learner_profile_id, v_limit, new.assessment_id
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger assessment_attempts_limit
  before insert on public.assessment_attempts
  for each row execute function public.enforce_attempt_limit();

-- ---------------------------------------------------------------------------
-- immutability after submission
-- ---------------------------------------------------------------------------
create or replace function public.lock_submitted_attempt()
returns trigger
language plpgsql
as $$
begin
  if coalesce(current_setting('app.grading_attempt', true), '') = 'on' then
    return new;
  end if;

  if old.status in ('submitted', 'awaiting_manual_grading', 'graded') then
    raise exception
      'assessment attempt % is % and is immutable; use submit_attempt() and grade_response()',
      old.id, old.status
      using errcode = 'insufficient_privilege';
  end if;

  return new;
end;
$$;

create trigger assessment_attempts_lock
  before update or delete on public.assessment_attempts
  for each row execute function public.lock_submitted_attempt();

create or replace function public.lock_submitted_response()
returns trigger
language plpgsql
as $$
declare
  v_attempt uuid;
  v_status  text;
begin
  if coalesce(current_setting('app.grading_attempt', true), '') = 'on' then
    return coalesce(new, old);
  end if;

  v_attempt := case when tg_op = 'DELETE' then old.assessment_attempt_id
                    else new.assessment_attempt_id end;

  select aa.status into v_status
    from public.assessment_attempts aa
   where aa.id = v_attempt;

  if v_status in ('submitted', 'awaiting_manual_grading', 'graded') then
    raise exception
      'responses of assessment attempt % are immutable once it is %',
      v_attempt, v_status
      using errcode = 'insufficient_privilege';
  end if;

  return coalesce(new, old);
end;
$$;

create trigger assessment_responses_lock
  before insert or update or delete on public.assessment_responses
  for each row execute function public.lock_submitted_response();

-- The question answered must belong to the assessment being attempted.
create or replace function public.enforce_response_question_match()
returns trigger
language plpgsql
as $$
declare
  v_attempt_id uuid;
  v_question_id uuid;
  v_attempt_assessment uuid;
  v_question_assessment uuid;
begin
  v_attempt_id  := case when tg_op = 'DELETE' then old.assessment_attempt_id
                        else new.assessment_attempt_id end;
  v_question_id := case when tg_op = 'DELETE' then old.question_id
                        else new.question_id end;

  select aa.assessment_id into v_attempt_assessment
    from public.assessment_attempts aa
   where aa.id = v_attempt_id;

  select aq.assessment_id into v_question_assessment
    from public.assessment_questions aq
   where aq.id = v_question_id;

  if v_attempt_assessment is distinct from v_question_assessment then
    raise exception
      'question % does not belong to the assessment of attempt %',
      v_question_id, v_attempt_id
      using errcode = 'check_violation';
  end if;

  return coalesce(new, old);
end;
$$;

create trigger assessment_responses_question_match
  before insert or update of question_id, assessment_attempt_id on public.assessment_responses
  for each row execute function public.enforce_response_question_match();

-- ---------------------------------------------------------------------------
-- D5: a locked version freezes its assessments too
-- ---------------------------------------------------------------------------
create or replace function public.lock_assessment_of_locked_version()
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
    from public.course_versions cv where cv.id = v_version;

  if v_status is null or v_status = 'draft' then
    return coalesce(new, old);
  end if;

  raise exception
    'cannot modify assessments of course version %, which is % and therefore locked (D5)',
    v_version, v_status
    using errcode = 'insufficient_privilege';
end;
$$;

create or replace function public.lock_question_of_locked_version()
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

  select a.course_version_id, cv.version_status
    into v_version, v_status
    from public.assessments a
    join public.course_versions cv on cv.id = a.course_version_id
   where a.id = case when tg_op = 'DELETE' then old.assessment_id
                     else new.assessment_id end;

  if v_status is null or v_status = 'draft' then
    return coalesce(new, old);
  end if;

  raise exception
    'cannot modify questions of course version %, which is % and therefore locked (D5)',
    v_version, v_status
    using errcode = 'insufficient_privilege';
end;
$$;

create trigger assessments_lock
  before insert or update or delete on public.assessments
  for each row execute function public.lock_assessment_of_locked_version();

create trigger assessment_questions_lock
  before insert or update or delete on public.assessment_questions
  for each row execute function public.lock_question_of_locked_version();

-- ---------------------------------------------------------------------------
-- submission
-- ---------------------------------------------------------------------------
create or replace function public.submit_attempt(p_attempt_id uuid)
returns public.assessment_attempts
language plpgsql
security definer
set search_path = public
as $$
declare
  v public.assessment_attempts;
begin
  select * into v from public.assessment_attempts where id = p_attempt_id for update;
  if not found then
    raise exception 'attempt % not found', p_attempt_id using errcode = 'no_data_found';
  end if;

  if v.status <> 'in_progress' then
    raise exception 'attempt % is % and cannot be submitted', p_attempt_id, v.status
      using errcode = 'check_violation';
  end if;

  -- Every question must be answered, or a submission could be padded later.
  if exists (
    select 1 from public.assessment_questions aq
     where aq.assessment_id = v.assessment_id
       and not exists (
         select 1 from public.assessment_responses ar
          where ar.assessment_attempt_id = p_attempt_id
            and ar.question_id = aq.id
            and ar.response_content is not null)
  ) then
    raise exception 'attempt % has unanswered questions', p_attempt_id
      using errcode = 'check_violation';
  end if;

  perform set_config('app.grading_attempt', 'on', true);

  update public.assessment_attempts
     set status = 'submitted', submitted_at = now()
   where id = p_attempt_id
  returning * into v;

  perform set_config('app.grading_attempt', 'off', true);
  return v;
end;
$$;

-- ---------------------------------------------------------------------------
-- grading
--
-- One entry point, and the only code allowed to read answer_key.
-- ---------------------------------------------------------------------------
create or replace function public.grade_response(
  p_response_id uuid,
  p_actor_id    uuid,
  p_score       numeric default null,
  p_is_correct  boolean default null
)
returns public.assessment_responses
language plpgsql
security definer
set search_path = public
as $$
declare
  v_resp    public.assessment_responses;
  v_attempt public.assessment_attempts;
  v_key     jsonb;
  v_max     numeric;
  v_method  text;
  v_result  boolean;
  v_score   numeric;
begin
  select * into v_resp from public.assessment_responses where id = p_response_id for update;
  if not found then
    raise exception 'response % not found', p_response_id using errcode = 'no_data_found';
  end if;

  select * into v_attempt from public.assessment_attempts
   where id = v_resp.assessment_attempt_id for update;

  if v_attempt.status = 'in_progress' then
    raise exception 'attempt % has not been submitted yet', v_attempt.id
      using errcode = 'check_violation';
  end if;
  if v_attempt.status = 'graded' then
    raise exception 'attempt % is already graded', v_attempt.id
      using errcode = 'check_violation';
  end if;

  select aq.answer_key, aq.points, aq.grading_method
    into v_key, v_max, v_method
    from public.assessment_questions aq where aq.id = v_resp.question_id;

  if v_method = 'automatic' then
    -- Compare the submitted answer to the key. Shape depends on question type;
    -- a JSON equality test is correct for choice and true/false questions.
    v_result := (v_resp.response_content is not null and v_resp.response_content = v_key);
    v_score  := case when v_result then v_max else 0 end;
  else
    -- Manual: a human verdict is required, and only a human may give one.
    if p_score is null or p_is_correct is null then
      raise exception 'manual question % requires a score and a verdict', v_resp.question_id
        using errcode = 'check_violation';
    end if;
    if not public.is_privileged(p_actor_id)
       and not public.has_role(p_actor_id, 'reviewer') then
      raise exception 'actor % may not grade manually', p_actor_id
        using errcode = 'insufficient_privilege';
    end if;
    if p_score > v_max then
      raise exception 'score % exceeds the % points available', p_score, v_max
        using errcode = 'check_violation';
    end if;
    v_result := p_is_correct;
    v_score  := p_score;
  end if;

  perform set_config('app.grading_attempt', 'on', true);

  update public.assessment_responses
     set score = v_score, is_correct = v_result,
         graded_by = p_actor_id, graded_at = now()
   where id = p_response_id
  returning * into v_resp;

  -- Move the attempt to awaiting_manual_grading if anything is still ungraded.
  if exists (
    select 1 from public.assessment_responses ar
      join public.assessment_questions aq on aq.id = ar.question_id
     where ar.assessment_attempt_id = v_attempt.id
       and aq.grading_method = 'manual'
       and ar.graded_at is null
  ) then
    update public.assessment_attempts
       set status = 'awaiting_manual_grading'
     where id = v_attempt.id and status = 'submitted';
  end if;

  perform set_config('app.grading_attempt', 'off', true);
  return v_resp;
end;
$$;

-- ---------------------------------------------------------------------------
-- finalising
--
-- "Mixed grading waits for required manual grading": the totals are only
-- written once every response carries a verdict.
-- ---------------------------------------------------------------------------
create or replace function public.finalize_attempt_grading(p_attempt_id uuid)
returns public.assessment_attempts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt   public.assessment_attempts;
  v_ungraded  integer;
  v_earned    numeric;
  v_possible  numeric;
  v_threshold numeric;
begin
  select * into v_attempt from public.assessment_attempts
   where id = p_attempt_id for update;
  if not found then
    raise exception 'attempt % not found', p_attempt_id using errcode = 'no_data_found';
  end if;

  if v_attempt.status not in ('submitted', 'awaiting_manual_grading') then
    raise exception 'attempt % is % and cannot be finalised', p_attempt_id, v_attempt.status
      using errcode = 'check_violation';
  end if;

  select count(*) into v_ungraded
    from public.assessment_responses ar
   where ar.assessment_attempt_id = p_attempt_id
     and ar.graded_at is null;

  if v_ungraded > 0 then
    raise exception
      'attempt % still has % ungraded responses; mixed grading must wait',
      p_attempt_id, v_ungraded
      using errcode = 'check_violation';
  end if;

  select coalesce(sum(ar.score), 0) into v_earned
    from public.assessment_responses ar
   where ar.assessment_attempt_id = p_attempt_id;

  select coalesce(sum(aq.points), 0) into v_possible
    from public.assessment_questions aq
   where aq.assessment_id = v_attempt.assessment_id;

  select a.pass_threshold into v_threshold
    from public.assessments a where a.id = v_attempt.assessment_id;

  perform set_config('app.grading_attempt', 'on', true);

  update public.assessment_attempts
     set status = 'graded',
         graded_at = now(),
         score_earned = v_earned,
         score_possible = v_possible,
         passed = case
                    when v_threshold is null then null
                    else (v_possible > 0
                          and (100.0 * v_earned / v_possible) >= v_threshold)
                  end
   where id = p_attempt_id
  returning * into v_attempt;

  perform set_config('app.grading_attempt', 'off', true);
  return v_attempt;
end;
$$;

revoke execute on function public.submit_attempt(uuid) from public, anon;
grant  execute on function public.submit_attempt(uuid) to authenticated;

revoke execute on function public.grade_response(uuid, uuid, numeric, boolean) from public, anon;
grant  execute on function public.grade_response(uuid, uuid, numeric, boolean) to authenticated;

revoke execute on function public.finalize_attempt_grading(uuid) from public, anon;
grant  execute on function public.finalize_attempt_grading(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- answer key protection
--
-- Column privileges, because RLS cannot hide a column. Anything reading with
-- SELECT * — which is what an ORM or the Supabase client will do by default —
-- gets every column the role is granted, and answer_key is not among them.
-- ---------------------------------------------------------------------------
revoke all on public.assessment_questions from anon, authenticated;

grant select (id, assessment_id, type, content, points, position, grading_method)
  on public.assessment_questions to anon;

grant select (id, assessment_id, type, content, points, position, explanation, grading_method),
      insert (assessment_id, type, content, points, position, explanation, grading_method),
      update (type, content, points, position, explanation, grading_method),
      delete
  on public.assessment_questions to authenticated;

comment on function public.submit_attempt(uuid) is
  'The only path in_progress -> submitted. Refuses an attempt with unanswered questions.';
comment on function public.grade_response(uuid, uuid, numeric, boolean) is
  'The only code that reads answer_key. Automatic questions are graded from the key; manual ones require a human verdict.';
comment on function public.finalize_attempt_grading(uuid) is
  'Writes totals and the pass verdict. Refuses while any response is ungraded.';
