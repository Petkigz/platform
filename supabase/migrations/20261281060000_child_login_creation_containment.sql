-- An authenticated caller can currently attach an arbitrary existing user to a
-- child, bypassing the route that creates the account. Until the linking workflow
-- has a trusted, race-safe authorization boundary, do not permit attachment.
-- Preserve existing accounts and the flag value; an operator must turn an
-- already-enabled flag off. This is containment, not an identity cleanup job.
-- Revoke reservation too: an older deployed web route must stop before it
-- creates an auth identity, even if it is paired with this newer migration.
revoke execute on function public.reserve_child_login(uuid, text) from public, anon, authenticated;
revoke execute on function public.attach_child_login(uuid, uuid) from public, anon, authenticated;

set app.bypassing_code_flag = 'on';
update public.platform_settings
   set gate_type = 'code',
       preconditions = 'New child login creation is paused: the old authenticated linking function can attach an existing account without proving it was created by the trusted route, and interrupted creation or removal can leave authentication identities or sessions behind. The reservation and attachment grants and creation route are disabled pending a race-safe, trusted workflow and tested recovery. An existing enabled value is preserved: operators must switch it off. Existing linked learners can still be detached, but detachment does not revoke authentication sessions or delete the identity.'
 where key = 'family.child_login';
reset app.bypassing_code_flag;

-- Detachment must remain visible when creation is off. Do not imply detachment
-- revokes authentication or deletes the account.
create or replace function public.child_login_state(p_learner_id uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'learnerProfileId', p_learner_id,
    'hasLogin', coalesce(l.user_id is not null and l.disabled_at is null, false),
    'username', case when l.user_id is not null and l.disabled_at is null then l.username end,
    'createdAt', case when l.user_id is not null and l.disabled_at is null then l.attached_at end,
    'canManage', public.may_manage_child_profile(p_learner_id),
    'canCreate', false,
    'isSelf', exists (select 1 from public.learner_profiles lp
                       where lp.id = p_learner_id and lp.linked_user_id = public.current_user_id())
  )
  from (select 1) one
  left join public.child_logins l on l.learner_profile_id = p_learner_id
  where public.may_manage_child_profile(p_learner_id)
     or exists (select 1 from public.learner_profiles lp
                 where lp.id = p_learner_id and lp.linked_user_id = public.current_user_id());
$$;
comment on function public.remove_child_login(uuid, text) is
  'Detaches the child learner profile. Does not delete or disable the authentication identity or revoke existing sessions; identity removal needs a separate workflow.';
