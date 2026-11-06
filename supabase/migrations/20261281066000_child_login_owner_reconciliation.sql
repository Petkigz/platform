-- A named safeguarding owner can finish a pending creation only when the
-- trusted marker and expected address identify exactly one existing Auth user.
-- This never creates, deletes, replaces a password or releases a reservation.
-- Completion rechecks the feature switch, guardian verification and row locks.
create function public.reconcile_child_login_attempt(p_attempt uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_owner uuid := public.current_user_id();
  v_guardian uuid;
  v_username text;
  v_user uuid;
  v_count integer;
  v_result jsonb;
begin
  perform public.require_coursework_retention_owner();
  select a.guardian_user_id, a.username into v_guardian, v_username
    from public.child_login_attempts a where a.id=p_attempt;
  if not found then
    raise exception 'child_login:attempt_unavailable' using errcode='no_data_found';
  end if;
  select count(*)::integer, (array_agg(u.id order by u.id))[1]
    into v_count, v_user from auth.users u
   where lower(u.email)=v_username || '@learners.ayahspring.com'
     and u.raw_app_meta_data->>'ayahspring_child_attempt'=p_attempt::text;
  if v_count <> 1 then
    raise exception 'child_login:marked_identity_unavailable' using errcode='check_violation';
  end if;
  -- Uses the same authorization and transaction lock order as normal creation;
  -- the call remains idempotent if the guardian completed it concurrently.
  v_result := public.complete_child_login_attempt(p_attempt, v_guardian, v_user);
  insert into public.governance_audit_events(actor, action, target_type, target_id, detail)
    values (v_owner, 'child_login.owner_reconciled', 'child_login_attempt', p_attempt,
      jsonb_build_object('alreadyCompleted', coalesce((v_result->>'alreadyCompleted')::boolean, false)));
  return jsonb_build_object('reconciled',true,'alreadyCompleted',coalesce((v_result->>'alreadyCompleted')::boolean,false));
end;
$$;
revoke all on function public.reconcile_child_login_attempt(uuid) from public, anon;
grant execute on function public.reconcile_child_login_attempt(uuid) to authenticated;
comment on function public.reconcile_child_login_attempt(uuid) is
  'Named safeguarding owner completes an existing, uniquely marked identity; creates or deletes no Auth identity and changes no password.';

update public.platform_settings
   set preconditions = 'Guardian creation uses a verified active guardian, a durable reservation and a service-only marked identity completion. The deployed server needs its Supabase service role key. Test creation, retry and recovery in a non-production Supabase project before deploying. The named safeguarding owner can complete an existing uniquely marked identity from the guardian-consent dashboard; unmarked or uncertain attempts need individual review. Detaching a learner does not delete the auth identity or revoke existing sessions. Password reset and provider identity removal are not yet implemented. The flag value is preserved; an already-enabled installation resumes creation on deployment.'
 where key = 'family.child_login';
