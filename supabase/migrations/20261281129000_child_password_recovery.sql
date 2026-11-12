-- Recovery is opt-in independently of creation until the hosted Auth flow is
-- verified. The operator can change it in the existing feature dashboard.
insert into public.platform_settings(key,description,value_type,value_text,gate_type,preconditions,flag_group)
values('family.child_password_recovery','Guardian changes a child login password','boolean','false','admin_setup',
  'Test the hosted Supabase Auth update and deferred guard before enabling. Only current verified guardians and exclusive marked child identities are eligible; sessions may remain active.', 'Children and families')
on conflict (key) do nothing;

-- A password is never stored here. Provider updates carry this one-use marker
-- in trusted app metadata and are authorized again inside the Auth transaction.
create table public.child_password_recovery_attempts (
  id uuid primary key default gen_random_uuid(),
  guardian_id uuid not null references public.user_profiles(user_id) on delete cascade,
  learner_id uuid not null references public.learner_profiles(id) on delete cascade,
  identity_id uuid not null references public.user_profiles(user_id) on delete cascade,
  creation_attempt_id uuid not null references public.child_login_attempts(id) on delete cascade,
  username text not null,
  expires_at timestamptz not null default (clock_timestamp() + interval '5 minutes'),
  completed_at timestamptz,
  created_at timestamptz not null default clock_timestamp()
);
alter table public.child_password_recovery_attempts enable row level security;
revoke all on public.child_password_recovery_attempts from public, anon, authenticated;

-- An identity must be exclusively the selected learner's. This function is
-- called only while the profile, current references and relevant roles are
-- locked by the caller. FK key-share locks serialize new references.
create function public.child_password_identity_exclusive(p_identity uuid, p_learner uuid)
returns boolean language sql volatile security definer set search_path=public as $$
  select not exists(select 1 from public.learner_profiles where linked_user_id=p_identity and id<>p_learner)
    and not exists(select 1 from public.family_memberships where user_id=p_identity and status='active')
    and not exists(select 1 from public.guardian_relationships where guardian_user_id=p_identity and status='active' and deleted_at is null)
    and not exists(select 1 from public.user_role_assignments ur join public.roles r on r.id=ur.role_id where ur.user_id=p_identity and ur.revoked_at is null and r.code<>'learner')
    and not exists(select 1 from public.account_merge_requests where duplicate_user_id=p_identity or target_user_id=p_identity)
    and not exists(select 1 from public.user_contact_details where user_id=p_identity);
$$;
revoke all on function public.child_password_identity_exclusive(uuid,uuid) from public,anon,authenticated;

create function public.prepare_child_password_recovery(p_learner uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare g uuid:=public.current_user_id(); l public.child_logins; a public.child_login_attempts; rid uuid; enabled text;
begin
  select value_text into enabled from public.platform_settings where key='family.child_password_recovery' for share;
  if enabled is distinct from 'true' then raise exception 'child_login:reset_disabled' using errcode='insufficient_privilege'; end if;
  if g is null then raise exception 'child_login:verified_guardian_required' using errcode='insufficient_privilege'; end if;
  perform 1 from public.user_profiles where user_id=g for share;
  perform 1 from public.learner_profiles where id=p_learner for update;
  perform 1 from public.guardian_relationships where guardian_user_id=g and learner_profile_id=p_learner for share;
  if not public.child_login_verified_guardian(g,p_learner) then raise exception 'child_login:verified_guardian_required' using errcode='insufficient_privilege'; end if;
  select * into l from public.child_logins where learner_profile_id=p_learner and disabled_at is null and user_id is not null for update;
  if not found or l.user_id=g or not exists(select 1 from public.learner_profiles where id=p_learner and linked_user_id=l.user_id) then
    raise exception 'child_login:reset_unavailable' using errcode='check_violation'; end if;
  select * into a from public.child_login_attempts where learner_profile_id=p_learner and user_id=l.user_id and username=l.username and status='completed';
  if not found or not exists(select 1 from auth.users u where u.id=l.user_id and lower(u.email)=l.username||'@learners.ayahspring.com' and u.raw_app_meta_data->>'ayahspring_child_attempt'=a.id::text) then
    raise exception 'child_login:identity_needs_review' using errcode='check_violation'; end if;
  if exists(select 1 from public.child_password_recovery_attempts where learner_id=p_learner and completed_at is null and expires_at>clock_timestamp()) then
    raise exception 'child_login:reset_pending' using errcode='check_violation'; end if;
  insert into public.child_password_recovery_attempts(guardian_id,learner_id,identity_id,creation_attempt_id,username) values(g,p_learner,l.user_id,a.id,l.username) returning id into rid;
  return jsonb_build_object('resetId',rid,'userId',l.user_id);
end;
$$;
revoke all on function public.prepare_child_password_recovery(uuid) from public,anon;
grant execute on function public.prepare_child_password_recovery(uuid) to authenticated;

create function public.guard_child_password_recovery() returns trigger language plpgsql security definer set search_path=public as $$
declare u auth.users; a public.child_password_recovery_attempts; marker text; enabled text;
begin
  select * into u from auth.users where id=new.id;
  marker:=u.raw_app_meta_data->>'ayahspring_child_password_recovery';
  if marker is null then
    if exists(select 1 from public.child_password_recovery_attempts where identity_id=new.id and completed_at is null and expires_at>clock_timestamp()) then
      raise exception 'child_login:reset_marker_required' using errcode='insufficient_privilege'; end if;
    return new;
  end if;
  if marker !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then raise exception 'child_login:reset_not_authorized' using errcode='insufficient_privilege'; end if;
  select * into a from public.child_password_recovery_attempts where id=marker::uuid;
  if not found then raise exception 'child_login:reset_not_authorized' using errcode='insufficient_privilege'; end if;
  select value_text into enabled from public.platform_settings where key='family.child_password_recovery' for share;
  if enabled is distinct from 'true' then raise exception 'child_login:reset_not_authorized' using errcode='insufficient_privilege'; end if;
  -- Upgrade the Auth row lock: account merges and contact details reference
  -- auth.users directly and a no-key password update does not block new FKs.
  perform 1 from auth.users where id=new.id for update;
  perform 1 from public.user_profiles where user_id=a.guardian_id for share;
  perform 1 from public.learner_profiles where id=a.learner_id for update;
  perform 1 from public.guardian_relationships where guardian_user_id=a.guardian_id and learner_profile_id=a.learner_id for share;
  perform 1 from public.user_profiles where user_id=a.identity_id for update;
  perform id from public.learner_profiles where linked_user_id=a.identity_id order by id for update;
  perform id from public.family_memberships where user_id=a.identity_id order by id for update;
  perform id from public.guardian_relationships where guardian_user_id=a.identity_id order by id for update;
  perform id from public.user_role_assignments where user_id=a.identity_id order by id for update;
  perform r.id from public.roles r join public.user_role_assignments ur on ur.role_id=r.id where ur.user_id=a.identity_id order by r.id for share of r;
  perform id from public.account_merge_requests where duplicate_user_id=a.identity_id or target_user_id=a.identity_id order by id for update;
  perform user_id from public.user_contact_details where user_id=a.identity_id for update;
  select * into a from public.child_password_recovery_attempts where id=marker::uuid for update;
  if not found or a.completed_at is not null or a.expires_at<=clock_timestamp() or a.identity_id<>new.id
    or not public.child_login_verified_guardian(a.guardian_id,a.learner_id)
    or not public.child_password_identity_exclusive(a.identity_id,a.learner_id)
    or not exists(select 1 from public.user_profiles where user_id=a.identity_id and account_status='active' and deleted_at is null)
    or not exists(select 1 from public.child_logins l join public.learner_profiles lp on lp.id=l.learner_profile_id where l.learner_profile_id=a.learner_id and l.disabled_at is null and l.user_id=a.identity_id and l.username=a.username and lp.linked_user_id=a.identity_id)
    or lower(u.email) is distinct from a.username||'@learners.ayahspring.com'
    or u.raw_app_meta_data->>'ayahspring_child_attempt' is distinct from a.creation_attempt_id::text
    or not exists(select 1 from public.child_login_attempts c where c.id=a.creation_attempt_id and c.status='completed' and c.user_id=a.identity_id and c.learner_profile_id=a.learner_id and c.username=a.username) then
    raise exception 'child_login:reset_not_authorized' using errcode='insufficient_privilege'; end if;
  update public.child_password_recovery_attempts set completed_at=clock_timestamp() where id=a.id;
  update auth.users set raw_app_meta_data=raw_app_meta_data-'ayahspring_child_password_recovery' where id=new.id;
  insert into public.governance_audit_events(actor,action,target_type,target_id,detail) values(a.guardian_id,'child_login.password_recovered','learner_profile',a.learner_id,'{}'::jsonb);
  return new;
end;
$$;
revoke all on function public.guard_child_password_recovery() from public,anon,authenticated;
create constraint trigger guard_child_password_recovery after update of encrypted_password on auth.users deferrable initially deferred for each row execute function public.guard_child_password_recovery();

create function public.child_password_recovery_status(p_reset uuid)
returns jsonb language plpgsql volatile security definer set search_path=public as $$
declare a public.child_password_recovery_attempts;
begin
  select * into a from public.child_password_recovery_attempts where id=p_reset and guardian_id=public.current_user_id();
  if not found or not public.child_login_verified_guardian(public.current_user_id(),a.learner_id) then raise exception 'child_login:reset_unavailable' using errcode='insufficient_privilege'; end if;
  return jsonb_build_object('resetId',a.id,'learnerId',a.learner_id,'completed',a.completed_at is not null);
end;
$$;
revoke all on function public.child_password_recovery_status(uuid) from public,anon;
grant execute on function public.child_password_recovery_status(uuid) to authenticated;

create or replace function public.child_login_state(p_learner_id uuid)
returns jsonb language sql stable security definer set search_path=public as $$
  select jsonb_build_object(
    'learnerProfileId',p_learner_id,
    'hasLogin',coalesce(l.user_id is not null and l.disabled_at is null,false),
    'username',case when l.user_id is not null and l.disabled_at is null then l.username end,
    'createdAt',case when l.user_id is not null and l.disabled_at is null then l.attached_at end,
    'canManage',public.can_manage_child_login_safely(p_learner_id),
    'canCreate',public.setting_bool('family.child_login',false) and public.child_login_verified_guardian(public.current_user_id(),p_learner_id) and l.id is null
      and not exists(select 1 from public.learner_profiles p where p.id=p_learner_id and p.linked_user_id is not null),
    'canReset',public.setting_bool('family.child_password_recovery',false) and public.child_login_verified_guardian(public.current_user_id(),p_learner_id) and l.user_id is not null and l.disabled_at is null,
    'isSelf',exists(select 1 from public.learner_profiles lp where lp.id=p_learner_id and lp.linked_user_id=public.current_user_id())
  ) from (select 1) one left join public.child_logins l on l.learner_profile_id=p_learner_id
  where public.can_manage_child_login_safely(p_learner_id)
    or (public.coursework_active_actor() and exists(select 1 from public.learner_profiles lp where lp.id=p_learner_id and lp.linked_user_id=public.current_user_id()));
$$;

update public.platform_settings
   set preconditions = replace(preconditions,
     'Password reset and recovery-evidence cleanup are not implemented.',
     'Guardian password recovery requires a current verified guardian, an exclusively used marked child identity and a guarded Auth update. Test the actual hosted Auth integration before enabling use; existing sessions may remain active. Recovery-evidence cleanup is not implemented.')
 where key='family.child_login';
