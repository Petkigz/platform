-- Foundation for recoverable child-login creation. This does not reopen the
-- creation route or make the CODE gate an admin switch. No passwords are stored.
create table public.child_login_attempts (
  id uuid primary key default gen_random_uuid(),
  learner_profile_id uuid not null references public.learner_profiles(id),
  guardian_user_id uuid not null references public.user_profiles(user_id),
  username text not null check (username = lower(username) and username ~ '^[a-z0-9][a-z0-9._-]{2,29}$'),
  status text not null default 'pending' check (status in ('pending','completed')),
  user_id uuid references public.user_profiles(user_id),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  check ((status = 'completed') = (user_id is not null and completed_at is not null))
);
create unique index child_login_attempt_one_pending_learner
  on public.child_login_attempts (learner_profile_id) where status = 'pending';
create unique index child_login_attempt_one_pending_username
  on public.child_login_attempts (username) where status = 'pending';
alter table public.child_login_attempts enable row level security;
revoke all on public.child_login_attempts from public, anon, authenticated;

-- Verified consent and an active account are required irrespective of the
-- general guardian switch. A family-owner row alone is not verification.
create function public.child_login_verified_guardian(p_guardian uuid, p_learner uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists (
    select 1 from public.user_profiles up
    join public.guardian_relationships gr on gr.guardian_user_id = up.user_id
    join public.learner_profiles lp on lp.id = gr.learner_profile_id
    where up.user_id = p_guardian and up.account_status = 'active' and up.deleted_at is null
      and lp.id = p_learner and lp.learner_type = 'child' and lp.deleted_at is null
      and gr.status = 'active' and gr.deleted_at is null and gr.can_manage_profile
      and gr.verified_at is not null and gr.verified_at <= now()
      and gr.consent_expires_at is not null and gr.consent_expires_at > now()
  );
$$;
revoke all on function public.child_login_verified_guardian(uuid,uuid) from public, anon, authenticated;

-- A retry from the same guardian for the same username receives the same
-- reservation. Another request cannot silently replace a pending reservation.
create function public.prepare_child_login(p_learner uuid, p_username text)
returns uuid language plpgsql security definer set search_path=public as $$
declare
  v_actor uuid := public.current_user_id();
  v_username text := lower(btrim(coalesce(p_username, '')));
  v_attempt public.child_login_attempts;
begin
  if not public.setting_bool('family.child_login', false) then
    raise exception 'child_login:disabled' using errcode='insufficient_privilege';
  end if;
  if v_actor is null or not public.child_login_verified_guardian(v_actor,p_learner) then
    raise exception 'child_login:verified_guardian_required' using errcode='insufficient_privilege';
  end if;
  if public.setting_bool('platform.age_assurance', false) and not public.has_declared_adult(v_actor) then
    raise exception 'age:declare_before_creating_a_child_login' using errcode='insufficient_privilege';
  end if;
  if v_username !~ '^[a-z0-9][a-z0-9._-]{2,29}$' then
    raise exception 'child_login:username_shape' using errcode='check_violation';
  end if;
  perform 1 from public.user_profiles where user_id=v_actor for share;
  perform 1 from public.learner_profiles where id=p_learner for update;
  perform 1 from public.guardian_relationships where guardian_user_id=v_actor and learner_profile_id=p_learner for share;
  if not public.child_login_verified_guardian(v_actor,p_learner) then
    raise exception 'child_login:verified_guardian_required' using errcode='insufficient_privilege';
  end if;
  if exists (select 1 from public.learner_profiles where id=p_learner and linked_user_id is not null)
     or exists (select 1 from public.child_logins where learner_profile_id=p_learner) then
    raise exception 'child_login:existing_login_requires_review' using errcode='unique_violation';
  end if;
  select * into v_attempt from public.child_login_attempts
    where learner_profile_id=p_learner and status='pending' for update;
  if found then
    if v_attempt.guardian_user_id=v_actor and v_attempt.username=v_username then return v_attempt.id; end if;
    raise exception 'child_login:attempt_pending' using errcode='unique_violation';
  end if;
  if exists (select 1 from public.child_logins where username=v_username) then
    raise exception 'child_login:username_taken' using errcode='unique_violation';
  end if;
  begin
    insert into public.child_login_attempts(learner_profile_id,guardian_user_id,username)
      values(p_learner,v_actor,v_username) returning * into v_attempt;
  exception when unique_violation then
    raise exception 'child_login:username_taken' using errcode='unique_violation';
  end;
  return v_attempt.id;
end;
$$;
revoke all on function public.prepare_child_login(uuid,text) from public, anon;
grant execute on function public.prepare_child_login(uuid,text) to authenticated;

-- Only the service can complete an attempt. It must pass the original guardian
-- and an auth identity carrying the immutable-to-users app-metadata marker set
-- by the trusted creation route. A repeated completion is idempotent.
create function public.complete_child_login_attempt(p_attempt uuid, p_guardian uuid, p_user uuid)
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
revoke all on function public.complete_child_login_attempt(uuid,uuid,uuid) from public, anon, authenticated;
grant execute on function public.complete_child_login_attempt(uuid,uuid,uuid) to service_role;
