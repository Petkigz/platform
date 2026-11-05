-- Only an active, verified guardian with profile permission, or active staff,
-- can inspect or detach a child's login. Family ownership is not verification.
-- This remains available while creation is paused. Detachment does not itself
-- disable an auth identity or invalidate an already-issued token.
create function public.can_manage_child_login_safely(p_learner uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select public.child_login_verified_guardian(public.current_user_id(),p_learner)
    or (public.coursework_active_actor() and public.is_privileged(public.current_user_id())
        and exists (select 1 from public.learner_profiles lp
                     where lp.id=p_learner and lp.learner_type='child' and lp.deleted_at is null));
$$;
revoke all on function public.can_manage_child_login_safely(uuid) from public, anon, authenticated;

create or replace function public.child_login_state(p_learner_id uuid)
returns jsonb language sql stable security definer set search_path=public as $$
  select jsonb_build_object(
    'learnerProfileId', p_learner_id,
    'hasLogin', coalesce(l.user_id is not null and l.disabled_at is null, false),
    'username', case when l.user_id is not null and l.disabled_at is null then l.username end,
    'createdAt', case when l.user_id is not null and l.disabled_at is null then l.attached_at end,
    'canManage', public.can_manage_child_login_safely(p_learner_id),
    'canCreate', false,
    'isSelf', exists (select 1 from public.learner_profiles lp
                       where lp.id=p_learner_id and lp.linked_user_id=public.current_user_id())
  )
  from (select 1) one
  left join public.child_logins l on l.learner_profile_id=p_learner_id
  where public.can_manage_child_login_safely(p_learner_id)
     or (public.coursework_active_actor() and exists (
       select 1 from public.learner_profiles lp
        where lp.id=p_learner_id and lp.linked_user_id=public.current_user_id()));
$$;

alter function public.remove_child_login(uuid,text) rename to remove_child_login_internal;
revoke all on function public.remove_child_login_internal(uuid,text) from public, anon, authenticated;
create function public.remove_child_login(p_learner_id uuid, p_reason text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_actor uuid := public.current_user_id();
begin
  if v_actor is null then raise exception 'child_login:not_your_child' using errcode='insufficient_privilege'; end if;
  -- Share the same lock order as creation: account, learner, relationship.
  perform 1 from public.user_profiles where user_id=v_actor for share;
  perform 1 from public.learner_profiles where id=p_learner_id for update;
  perform 1 from public.guardian_relationships where guardian_user_id=v_actor and learner_profile_id=p_learner_id for share;
  if not public.can_manage_child_login_safely(p_learner_id) then
    raise exception 'child_login:verified_guardian_required' using errcode='insufficient_privilege';
  end if;
  return public.remove_child_login_internal(p_learner_id,p_reason);
end;
$$;
revoke all on function public.remove_child_login(uuid,text) from public, anon;
grant execute on function public.remove_child_login(uuid,text) to authenticated;
comment on function public.remove_child_login(uuid,text) is
  'Detaches a child learner profile after a current verified-guardian or active-staff check. Does not delete the auth identity or revoke existing sessions.';
