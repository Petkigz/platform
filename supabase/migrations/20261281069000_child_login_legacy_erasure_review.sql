-- Child records erased before migration 680 can still have identifying login
-- rows. Show them to the named owner; do not perform an unreviewed bulk change.
create function public.child_login_legacy_erasure_queue(p_limit integer default 50)
returns table(learner_id uuid, attempt_count integer, removal_task_count integer, coursework_held boolean)
language plpgsql stable security definer set search_path=public as $$
begin
  perform public.require_coursework_retention_owner();
  return query select lp.id,
    (select count(*)::integer from public.child_login_attempts a where a.learner_profile_id=lp.id),
    (select count(*)::integer from public.child_login_removal_tasks t where t.learner_profile_id=lp.id),
    public.learner_has_held_coursework(lp.id)
  from public.learner_profiles lp
  where lp.learner_type='child' and lp.status='erased'
    and (exists (select 1 from public.child_login_attempts a where a.learner_profile_id=lp.id)
      or exists (select 1 from public.child_login_removal_tasks t where t.learner_profile_id=lp.id))
  order by lp.erased_at nulls first, lp.id
  limit greatest(1,least(coalesce(p_limit,50),200));
end;
$$;
revoke all on function public.child_login_legacy_erasure_queue(integer) from public, anon;
grant execute on function public.child_login_legacy_erasure_queue(integer) to authenticated;

-- Repeat the existing hold-aware cleanup only for an already-erased child.
-- It retains pseudonymous provider-recovery evidence before removing the rows.
create function public.reconcile_legacy_child_login_erasure(p_learner uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_actor uuid := public.current_user_id(); v_result jsonb; v_status text; v_kind text;
begin
  perform public.require_coursework_retention_owner();
  -- Lock the row before inspecting status, so a concurrent restoration cannot
  -- turn this historical cleanup into an early purge of an active record.
  -- A competing hold cleanup may deadlock; PostgreSQL aborts one transaction
  -- without making either destructive operation partial, and the owner retries.
  select status, learner_type into v_status, v_kind from public.learner_profiles
   where id=p_learner for update;
  if not found or v_status <> 'erased' or v_kind <> 'child' then
    raise exception 'child_login:record_not_erased' using errcode='check_violation';
  end if;
  v_result := public.purge_learner_record(p_learner);
  if coalesce((v_result->>'blockedByCourseworkHold')::boolean,false) then
    return jsonb_build_object('reconciled',false,'blockedByCourseworkHold',true);
  end if;
  if coalesce((v_result->>'erased')::boolean,false) is not true then
    raise exception 'child_login:purge_unconfirmed' using errcode='check_violation';
  end if;
  insert into public.governance_audit_events(actor,action,target_type,target_id,detail)
    values(v_actor,'child_login.erasure_reconciled','learner_profile',p_learner,
      jsonb_build_object('identityRecoveryMarkersAdded',coalesce((v_result->>'identityRecoveryMarkersAdded')::int,0)));
  return jsonb_build_object('reconciled',true,'identityRecoveryMarkersAdded',
    coalesce((v_result->>'identityRecoveryMarkersAdded')::int,0));
end;
$$;
revoke all on function public.reconcile_legacy_child_login_erasure(uuid) from public, anon;
grant execute on function public.reconcile_legacy_child_login_erasure(uuid) to authenticated;
