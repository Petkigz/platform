-- Restore the guardian creation feature behind its existing dashboard switch.
-- Explicitly turn the flag off for deployment; linked accounts are unaffected.
-- The owner may enable it after setting up and testing the new path. It requires a current verified guardian and a service-marked auth identity;
-- the old direct reservation and attachment grants remain revoked.
set app.bypassing_code_flag = 'on';
update public.platform_settings
   set value_text = 'false', gate_type = 'admin_setup',
       preconditions = 'Guardian creation uses a verified active guardian, a durable reservation and a service-only marked identity completion. The deployed server needs its Supabase service role key. Test creation, retry and recovery in a non-production Supabase project before enabling. A pending attempt may need owner review; the guardian-consent dashboard lists pending attempts but does not resolve them. Detaching a learner does not delete the auth identity or revoke existing sessions. Password reset and provider identity removal are not yet implemented. The migration explicitly switches the flag off; existing linked accounts are unaffected.'
 where key = 'family.child_login';
reset app.bypassing_code_flag;

create or replace function public.child_login_state(p_learner_id uuid)
returns jsonb language sql stable security definer set search_path=public as $$
  select jsonb_build_object(
    'learnerProfileId', p_learner_id,
    'hasLogin', coalesce(l.user_id is not null and l.disabled_at is null, false),
    'username', case when l.user_id is not null and l.disabled_at is null then l.username end,
    'createdAt', case when l.user_id is not null and l.disabled_at is null then l.attached_at end,
    'canManage', public.can_manage_child_login_safely(p_learner_id),
    'canCreate', public.setting_bool('family.child_login', false)
      and public.child_login_verified_guardian(public.current_user_id(),p_learner_id)
      and l.id is null
      and not exists (select 1 from public.learner_profiles p where p.id=p_learner_id and p.linked_user_id is not null),
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
