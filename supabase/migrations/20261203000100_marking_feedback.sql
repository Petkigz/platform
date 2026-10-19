-- Teacher feedback on manually marked answers.
--
-- Marking could award a score and a verdict and nothing else:
-- `mark_manual_assessment_response(response_id, score, is_correct)`. For a
-- multiple-choice question that is the whole answer, but the questions that need
-- a human are `short_answer` ones — a child's writing, a translation, a
-- worked-out ruling — and for those the comment is the point of the exercise. A
-- number with no words tells a learner what they got, not what to do next.
--
-- Feedback is written in the same statement as the mark, inside the
-- `app.grading_attempt` window that `lock_submitted_response()` opens. That
-- matters: a submitted attempt is immutable, so a separate update afterwards
-- would be refused by the very trigger that protects the learner's answers. It
-- also means feedback cannot be added, edited or removed once given, which is
-- the right property — a mark and its comment are one act by one teacher, and a
-- comment that can be quietly rewritten afterwards is not something a learner
-- can rely on.

alter table public.assessment_responses
  add column grading_feedback text;

-- 5000, matching `assignment_submissions.feedback`. A teacher marking work meets
-- one ceiling, not one per surface, and the two limits would otherwise differ
-- for no reason a teacher could see.
alter table public.assessment_responses
  add constraint ar_feedback_length check (
    grading_feedback is null or length(trim(grading_feedback)) <= 5000
  ),
  add constraint ar_feedback_needs_a_mark check (
    grading_feedback is null or graded_by is not null
  );

comment on column public.assessment_responses.grading_feedback is
  'What the marker said. Written with the mark and immutable afterwards; only ever set on a manually graded response.';

-- ---------------------------------------------------------------------------
-- Internal grader
-- ---------------------------------------------------------------------------
--
-- The four-argument signature is dropped rather than left beside the new one.
-- Two functions differing only by a defaulted argument would both match a
-- four-argument call, and whichever Postgres picked would decide whether
-- feedback was silently discarded — the kind of ambiguity that survives review
-- and shows up as lost comments.

drop function if exists public.grade_response(uuid, uuid, numeric, boolean);

create or replace function public.grade_response(
  p_response_id uuid,
  p_actor_id uuid,
  p_score numeric default null,
  p_is_correct boolean default null,
  p_feedback text default null
)
returns public.assessment_responses
language plpgsql
security definer
set search_path=public
as $$
declare
  v_resp public.assessment_responses;
  v_attempt public.assessment_attempts;
  v_key jsonb;
  v_max numeric;
  v_method text;
  v_result boolean;
  v_score numeric;
  v_version_id uuid;
  v_feedback text;
begin
  select * into v_resp from public.assessment_responses where id=p_response_id for update;
  if not found then
    raise exception 'response % not found',p_response_id using errcode='no_data_found';
  end if;
  select * into v_attempt from public.assessment_attempts
   where id=v_resp.assessment_attempt_id for update;
  if v_attempt.status='in_progress' then
    raise exception 'attempt % has not been submitted yet',v_attempt.id using errcode='check_violation';
  end if;
  if v_attempt.status='graded' then
    raise exception 'attempt % is already graded',v_attempt.id using errcode='check_violation';
  end if;

  select aq.answer_key,aq.points,aq.grading_method,a.course_version_id
    into v_key,v_max,v_method,v_version_id
    from public.assessment_questions aq
    join public.assessments a on a.id=aq.assessment_id
   where aq.id=v_resp.question_id;
  if v_method='automatic' then
    v_result:=(v_resp.response_content is not null and v_resp.response_content=v_key);
    v_score:=case when v_result then v_max else 0 end;
    -- Feedback on an automatically graded answer would be machine text wearing
    -- a teacher's name. The client-facing wrapper refuses a non-manual response
    -- before reaching here, so this only has to be safe, not chatty.
    v_feedback:=null;
  else
    if p_score is null or p_is_correct is null then
      raise exception 'manual question % requires a score and a verdict',v_resp.question_id
        using errcode='check_violation';
    end if;
    if not public.is_privileged(p_actor_id)
       and not public.has_role(p_actor_id,'reviewer')
       and not public.can_author_version(v_version_id) then
      raise exception 'actor % may not grade manually',p_actor_id using errcode='insufficient_privilege';
    end if;
    if p_score<0 or p_score>v_max then
      raise exception 'score % exceeds the % points available',p_score,v_max using errcode='check_violation';
    end if;
    v_result:=p_is_correct;
    v_score:=p_score;
    v_feedback:=nullif(trim(coalesce(p_feedback,'')),'');
  end if;

  perform set_config('app.grading_attempt','on',true);
  update public.assessment_responses
     set score=v_score,is_correct=v_result,graded_by=p_actor_id,graded_at=now(),
         grading_feedback=v_feedback
   where id=p_response_id returning * into v_resp;
  if exists (
    select 1 from public.assessment_responses ar
    join public.assessment_questions aq on aq.id=ar.question_id
     where ar.assessment_attempt_id=v_attempt.id
       and aq.grading_method='manual' and ar.graded_at is null
  ) then
    update public.assessment_attempts set status='awaiting_manual_grading'
     where id=v_attempt.id and status='submitted';
  end if;
  perform set_config('app.grading_attempt','off',true);
  return v_resp;
end;
$$;

revoke execute on function public.grade_response(uuid,uuid,numeric,boolean,text)
  from public, anon, authenticated;
comment on function public.grade_response(uuid,uuid,numeric,boolean,text) is
  'Internal grader: reads answer_key only inside SECURITY DEFINER; client-facing actions use identity-checked wrappers.';

-- ---------------------------------------------------------------------------
-- The marking action a teacher actually calls
-- ---------------------------------------------------------------------------

drop function if exists public.mark_manual_assessment_response(uuid, numeric, boolean);

create or replace function public.mark_manual_assessment_response(
  p_response_id uuid,
  p_score numeric,
  p_is_correct boolean,
  p_feedback text default null
)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  v_actor uuid:=public.current_user_id();
  v_version_id uuid;
  v_attempt_id uuid;
  v_method text;
  v_max numeric;
  v_status text;
  v_graded_at timestamptz;
  v_ungraded integer;
  v_feedback text;
begin
  if v_actor is null then
    raise exception 'sign in to grade this response' using errcode='insufficient_privilege';
  end if;

  v_feedback := nullif(trim(coalesce(p_feedback, '')), '');
  if v_feedback is not null and length(v_feedback) > 5000 then
    raise exception 'feedback must be 5000 characters or fewer'
      using errcode='invalid_parameter_value';
  end if;

  select a.course_version_id,ar.assessment_attempt_id,aq.grading_method,aq.points,
         aa.status,ar.graded_at
    into v_version_id,v_attempt_id,v_method,v_max,v_status,v_graded_at
    from public.assessment_responses ar
    join public.assessment_attempts aa on aa.id=ar.assessment_attempt_id
    join public.assessments a on a.id=aa.assessment_id
    join public.assessment_questions aq on aq.id=ar.question_id
   where ar.id=p_response_id
   for update of ar,aa;
  if not found then
    raise exception 'assessment response % not found',p_response_id using errcode='no_data_found';
  end if;
  if v_graded_at is not null then
    raise exception 'this response has already been marked' using errcode='check_violation';
  end if;
  if not public.can_author_version(v_version_id) then
    raise exception 'only the course author may grade this response' using errcode='insufficient_privilege';
  end if;
  if v_method<>'manual' then
    raise exception 'only a manually graded response can be marked here' using errcode='check_violation';
  end if;
  if v_status not in ('submitted','awaiting_manual_grading') then
    raise exception 'this attempt is not waiting for manual grading' using errcode='check_violation';
  end if;
  if p_score is null or p_score<0 or p_score>v_max then
    raise exception 'score must be between zero and % points',v_max using errcode='invalid_parameter_value';
  end if;
  if p_is_correct is null then
    raise exception 'choose whether the answer is correct' using errcode='invalid_parameter_value';
  end if;

  perform public.grade_response(p_response_id,v_actor,p_score,p_is_correct,v_feedback);
  -- The audit records that a comment was given, not what it says. The feedback
  -- is a message to one learner about their own work; copying it into an
  -- append-only log would put it somewhere nobody edits and nobody reads, and
  -- would outlive the row it belongs to.
  insert into public.governance_audit_events(actor,action,target_type,target_id,detail)
  values(v_actor,'assessment.manual_response_graded','assessment_response',p_response_id,
    jsonb_build_object('score',p_score,'max_points',v_max,'is_correct',p_is_correct,
                       'has_feedback',v_feedback is not null,
                       'course_version_id',v_version_id));

  select count(*) into v_ungraded from public.assessment_responses ar
   where ar.assessment_attempt_id=v_attempt_id and ar.graded_at is null;
  if v_ungraded=0 then
    perform public.finalize_attempt_grading(v_attempt_id);
  end if;
  -- Do not return the attempt row: it contains the learner's profile and
  -- enrolment identifiers, which are deliberately absent from the queue.
  return;
end;
$$;

revoke all on function public.mark_manual_assessment_response(uuid,numeric,boolean,text) from public;
grant execute on function public.mark_manual_assessment_response(uuid,numeric,boolean,text) to authenticated;
comment on function public.mark_manual_assessment_response(uuid,numeric,boolean,text) is
  'Grades one pending manual response as the authenticated course author, records optional feedback with the mark, and finalizes the attempt when complete.';
