-- A retry after detachment must not falsely report an active child link.
create or replace function public.complete_child_login_attempt(p_attempt uuid, p_guardian uuid, p_user uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_attempt public.child_login_attempts; v_login uuid; v_result jsonb;
begin
  -- Read the routing fields before acquiring locks, then use the same order as
  -- prepare: profile, learner, relationship, attempt. Re-read under the lock.
  select * into v_attempt from public.child_login_attempts where id=p_attempt;
  if not found or v_attempt.guardian_user_id is distinct from p_guardian then
    raise exception 'child_login:no_attempt' using errcode='insufficient_privilege';
  end if;
  -- Serialize with account and consent status changes during the write.
  perform 1 from public.user_profiles where user_id=p_guardian for share;
  perform 1 from public.learner_profiles where id=v_attempt.learner_profile_id for update;
  perform 1 from public.guardian_relationships where guardian_user_id=p_guardian and learner_profile_id=v_attempt.learner_profile_id for share;
  select * into v_attempt from public.child_login_attempts where id=p_attempt for update;
  if not found or v_attempt.guardian_user_id is distinct from p_guardian then
    raise exception 'child_login:no_attempt' using errcode='insufficient_privilege';
  end if;
  if v_attempt.status='completed' then
    if v_attempt.user_id is distinct from p_user then raise exception 'child_login:account_mismatch' using errcode='insufficient_privilege'; end if;
    -- A delayed completion response must not say a detached login is still
    -- linked. The learner lock above serializes this check with detachment.
    if not exists (select 1 from public.child_logins l
      join public.learner_profiles p on p.id=l.learner_profile_id
      where l.learner_profile_id=v_attempt.learner_profile_id and l.user_id=p_user
        and l.disabled_at is null and p.linked_user_id=p_user and p.deleted_at is null) then
      raise exception 'child_login:login_no_longer_active' using errcode='check_violation';
    end if;
    return jsonb_build_object('username',v_attempt.username,'learnerProfileId',v_attempt.learner_profile_id,'alreadyCompleted',true);
  end if;
  if not public.setting_bool('family.child_login', false)
     or not public.child_login_verified_guardian(p_guardian,v_attempt.learner_profile_id) then
    raise exception 'child_login:verified_guardian_required' using errcode='insufficient_privilege';
  end if;
  if not exists (select 1 from auth.users u where u.id=p_user
    and lower(u.email)=v_attempt.username || '@learners.ayahspring.com'
    and u.raw_app_meta_data->>'ayahspring_child_attempt'=p_attempt::text) then
    raise exception 'child_login:untrusted_identity' using errcode='insufficient_privilege';
  end if;
  if exists (select 1 from public.child_logins where learner_profile_id=v_attempt.learner_profile_id or username=v_attempt.username)
     or exists (select 1 from public.learner_profiles where id=v_attempt.learner_profile_id and linked_user_id is not null) then
    raise exception 'child_login:existing_login_requires_review' using errcode='unique_violation';
  end if;
  insert into public.child_logins(learner_profile_id,username,created_by)
    values(v_attempt.learner_profile_id,v_attempt.username,p_guardian) returning id into v_login;
  -- The old function's guardian check and audit run under the explicit verified
  -- actor. The claims are local to this transaction, never a client secret.
  perform set_config('request.jwt.claims',jsonb_build_object('sub',p_guardian,'role','authenticated')::text,true);
  v_result := public.attach_child_login(v_login,p_user);
  update public.child_login_attempts set status='completed', user_id=p_user, completed_at=now() where id=p_attempt;
  return v_result || jsonb_build_object('alreadyCompleted',false);
end;
$$;
