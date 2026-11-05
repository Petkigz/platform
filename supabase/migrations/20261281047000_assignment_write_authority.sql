-- Submission writers used the general learner predicate, which includes staff
-- and may include unverified household members. Align draft, submit, revise and
-- removal with the coursework hand-in authority, including consent expiry. The
-- old state machines remain internal and continue to enforce deadlines, limits,
-- locks and audit records. This applies to adult work too.
create function public.require_assignment_learner_writer(p_submission_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_learner uuid;
begin
  if public.current_user_id() is null then
    raise exception 'sign in to change this assignment' using errcode = 'insufficient_privilege';
  end if;
  select s.learner_profile_id into v_learner from public.assignment_submissions s
   where s.id = p_submission_id for update;
  if not found then raise exception 'assignment submission not found' using errcode = 'no_data_found'; end if;
  if not public.coursework_hand_in_authorized(v_learner) then
    raise exception 'you can only change work for a learner you are responsible for as the learner or a currently verified guardian with progress permission'
      using errcode = 'insufficient_privilege';
  end if;
end;
$$;
revoke all on function public.require_assignment_learner_writer(uuid) from public, anon, authenticated;

alter function public.save_assignment_draft(uuid, uuid, text) rename to save_assignment_draft_internal;
revoke all on function public.save_assignment_draft_internal(uuid, uuid, text) from public, anon, authenticated;
create function public.save_assignment_draft(p_assignment_id uuid, p_learner_profile_id uuid, p_body_text text)
returns uuid language plpgsql security definer set search_path = public as $$
begin
  if public.current_user_id() is null then raise exception 'sign in to save an assignment draft' using errcode = 'insufficient_privilege'; end if;
  if not public.coursework_hand_in_authorized(p_learner_profile_id) then
    raise exception 'you can only submit for a learner you are responsible for as the learner or a currently verified guardian with progress permission'
      using errcode = 'insufficient_privilege';
  end if;
  return public.save_assignment_draft_internal(p_assignment_id, p_learner_profile_id, p_body_text);
end;
$$;
revoke all on function public.save_assignment_draft(uuid, uuid, text) from public, anon;
grant execute on function public.save_assignment_draft(uuid, uuid, text) to authenticated;

alter function public.submit_assignment(uuid) rename to submit_assignment_internal;
revoke all on function public.submit_assignment_internal(uuid) from public, anon, authenticated;
create function public.submit_assignment(p_submission_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.require_assignment_learner_writer(p_submission_id);
  perform public.submit_assignment_internal(p_submission_id);
end;
$$;
revoke all on function public.submit_assignment(uuid) from public, anon;
grant execute on function public.submit_assignment(uuid) to authenticated;

alter function public.reopen_assignment_submission(uuid) rename to reopen_assignment_submission_internal;
revoke all on function public.reopen_assignment_submission_internal(uuid) from public, anon, authenticated;
create function public.reopen_assignment_submission(p_submission_id uuid)
returns integer language plpgsql security definer set search_path = public as $$
begin
  if public.current_user_id() is null then raise exception 'sign in to revise this submission' using errcode = 'insufficient_privilege'; end if;
  perform public.require_assignment_learner_writer(p_submission_id);
  return public.reopen_assignment_submission_internal(p_submission_id);
end;
$$;
revoke all on function public.reopen_assignment_submission(uuid) from public, anon;
grant execute on function public.reopen_assignment_submission(uuid) to authenticated;

alter function public.remove_assignment_asset(uuid, uuid) rename to remove_assignment_asset_internal;
revoke all on function public.remove_assignment_asset_internal(uuid, uuid) from public, anon, authenticated;
create function public.remove_assignment_asset(p_submission_id uuid, p_media_asset_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.require_assignment_learner_writer(p_submission_id);
  perform public.remove_assignment_asset_internal(p_submission_id, p_media_asset_id);
end;
$$;
revoke all on function public.remove_assignment_asset(uuid, uuid) from public, anon;
grant execute on function public.remove_assignment_asset(uuid, uuid) to authenticated;

-- The assigned author is the current model's marker. A privileged role or a
-- safeguarding-owner designation by itself is not a grading assignment.
alter function public.mark_assignment_submission(uuid, numeric, text) rename to mark_assignment_submission_internal;
revoke all on function public.mark_assignment_submission_internal(uuid, numeric, text) from public, anon, authenticated;
create function public.mark_assignment_submission(p_submission_id uuid, p_score numeric, p_feedback text)
returns void language plpgsql security definer set search_path = public as $$
declare v_author uuid;
begin
  if public.current_user_id() is null then
    raise exception 'sign in to mark this assignment' using errcode = 'insufficient_privilege';
  end if;
  select a.created_by into v_author
    from public.assignment_submissions s join public.course_assignments a on a.id = s.assignment_id
   where s.id = p_submission_id and a.deleted_at is null for update of s for share of a;
  if not found then raise exception 'assignment submission not found' using errcode = 'no_data_found'; end if;
  if v_author is distinct from public.current_user_id() then
    raise exception 'only the course author assigned to this work can mark it' using errcode = 'insufficient_privilege';
  end if;
  perform public.mark_assignment_submission_internal(p_submission_id, p_score, p_feedback);
end;
$$;
revoke all on function public.mark_assignment_submission(uuid, numeric, text) from public, anon;
grant execute on function public.mark_assignment_submission(uuid, numeric, text) to authenticated;
