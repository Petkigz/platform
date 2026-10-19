-- Complete the learner/teacher assessment loop without exposing answer keys.
-- Learner submission now auto-grades machine-marked responses. Teacher-facing
-- read/mark RPCs expose only pending manual answers for the course author.

create or replace function public.submit_assessment_attempt(p_attempt_id uuid)
returns public.assessment_attempts
language plpgsql
security definer
set search_path=public
as $$
declare
  v_actor uuid:=public.current_user_id();
  v_attempt public.assessment_attempts;
  v_response_id uuid;
  v_ungraded integer;
begin
  if v_actor is null then
    raise exception 'sign in to submit this assessment' using errcode='insufficient_privilege';
  end if;
  select * into v_attempt from public.assessment_attempts
   where id=p_attempt_id for update;
  if not found then
    raise exception 'attempt % not found',p_attempt_id using errcode='no_data_found';
  end if;
  if not public.can_access_learner(v_attempt.learner_profile_id) then
    raise exception 'you cannot submit this learner’s assessment' using errcode='insufficient_privilege';
  end if;

  v_attempt:=public.submit_attempt(p_attempt_id);

  for v_response_id in
    select ar.id
      from public.assessment_responses ar
      join public.assessment_questions aq on aq.id=ar.question_id
     where ar.assessment_attempt_id=p_attempt_id
       and aq.grading_method='automatic'
       and ar.graded_at is null
     order by aq.position
  loop
    -- The learner session is recorded as the actor that triggered the
    -- server-side automatic grade; no learner-supplied score or key is used.
    perform public.grade_response(v_response_id,v_actor,null,null);
  end loop;

  select count(*) into v_ungraded
    from public.assessment_responses ar
   where ar.assessment_attempt_id=p_attempt_id and ar.graded_at is null;
  if v_ungraded=0 then
    v_attempt:=public.finalize_attempt_grading(p_attempt_id);
  else
    -- A quiz consisting entirely of manual answers has no automatic response
    -- to move it into awaiting_manual_grading, so make that state explicit.
    perform set_config('app.grading_attempt','on',true);
    update public.assessment_attempts set status='awaiting_manual_grading'
     where id=p_attempt_id and status='submitted';
    perform set_config('app.grading_attempt','off',true);
    select * into v_attempt from public.assessment_attempts where id=p_attempt_id;
  end if;
  return v_attempt;
end;
$$;

revoke all on function public.submit_assessment_attempt(uuid) from public;
grant execute on function public.submit_assessment_attempt(uuid) to authenticated;
comment on function public.submit_assessment_attempt(uuid) is
  'Submits only an accessible learner attempt, automatically grades machine-marked questions, then finalizes or queues manual answers.';

-- Only the course author (or platform staff) can see student answers needing
-- manual review. No learner name/profile or answer key is returned.
create or replace function public.list_pending_manual_assessment_responses(p_course_id uuid)
returns table(
  response_id uuid,
  assessment_id uuid,
  assessment_title text,
  course_version_number integer,
  question_id uuid,
  question_prompt text,
  response_content jsonb,
  max_points numeric,
  attempt_number integer,
  submitted_at timestamptz
)
language plpgsql
security definer
set search_path=public
as $$
declare
  v_actor uuid:=public.current_user_id();
begin
  if v_actor is null then
    raise exception 'sign in to view manual assessment responses' using errcode='insufficient_privilege';
  end if;
  if not exists (
    select 1 from public.courses c
     where c.id=p_course_id and c.deleted_at is null
       and (c.created_by=v_actor or public.is_privileged(v_actor))
  ) then
    raise exception 'only the course author may review these assessment responses'
      using errcode='insufficient_privilege';
  end if;

  return query
  select ar.id,a.id,a.title,cv.version_number,aq.id,
         coalesce(aq.content->>'prompt',aq.content->>'text',''),
         ar.response_content,aq.points,aa.attempt_number,aa.submitted_at
    from public.course_versions cv
    join public.assessments a on a.course_version_id=cv.id
    join public.assessment_questions aq on aq.assessment_id=a.id
    join public.assessment_attempts aa on aa.assessment_id=a.id
    join public.assessment_responses ar on ar.assessment_attempt_id=aa.id and ar.question_id=aq.id
   where cv.course_id=p_course_id
     and aq.grading_method='manual'
     and ar.graded_at is null
     and aa.status in ('submitted','awaiting_manual_grading')
   order by aa.submitted_at,aa.attempt_number,aq.position;
end;
$$;

revoke all on function public.list_pending_manual_assessment_responses(uuid) from public;
grant execute on function public.list_pending_manual_assessment_responses(uuid) to authenticated;
comment on function public.list_pending_manual_assessment_responses(uuid) is
  'Course-author-only queue of pending manual answers; omits learner identity and all answer keys.';

-- Grade one response for the current course author, record an audit event, and
-- finalize the attempt as soon as its last manual answer is marked.
create or replace function public.mark_manual_assessment_response(
  p_response_id uuid,
  p_score numeric,
  p_is_correct boolean
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
begin
  if v_actor is null then
    raise exception 'sign in to grade this response' using errcode='insufficient_privilege';
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

  perform public.grade_response(p_response_id,v_actor,p_score,p_is_correct);
  insert into public.governance_audit_events(actor,action,target_type,target_id,detail)
  values(v_actor,'assessment.manual_response_graded','assessment_response',p_response_id,
    jsonb_build_object('score',p_score,'max_points',v_max,'is_correct',p_is_correct,
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

revoke all on function public.mark_manual_assessment_response(uuid,numeric,boolean) from public;
grant execute on function public.mark_manual_assessment_response(uuid,numeric,boolean) to authenticated;
comment on function public.mark_manual_assessment_response(uuid,numeric,boolean) is
  'Grades one pending manual response as the authenticated course author and finalizes its attempt when complete.';

-- These low-level SECURITY DEFINER functions accept an actor argument for
-- internal callers. Client roles must use the session-identity wrappers above.
revoke execute on function public.submit_attempt(uuid) from public,anon,authenticated;
revoke execute on function public.grade_response(uuid,uuid,numeric,boolean) from public,anon,authenticated;
revoke execute on function public.finalize_attempt_grading(uuid) from public,anon,authenticated;

create or replace function public.grade_response(
  p_response_id uuid,
  p_actor_id uuid,
  p_score numeric default null,
  p_is_correct boolean default null
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
  end if;

  perform set_config('app.grading_attempt','on',true);
  update public.assessment_responses
     set score=v_score,is_correct=v_result,graded_by=p_actor_id,graded_at=now()
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

comment on function public.grade_response(uuid,uuid,numeric,boolean) is
  'Internal grader: reads answer_key only inside SECURITY DEFINER; client-facing actions use identity-checked wrappers.';
