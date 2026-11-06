-- The exclusivity recheck must see rows committed while waiting for locks in
-- READ COMMITTED transactions. STABLE would reuse the outer DELETE snapshot.
alter function public.child_login_identity_exclusive(uuid) volatile;

-- Durable evidence for a provider deletion request. This is private and still
-- personal data. Do not remove it while a provider request may be in flight.
create table public.child_login_auth_delete_authorizations (
  identity_id uuid primary key,
  attempt_marker uuid not null,
  address_hash text not null check (address_hash ~ '^[a-f0-9]{64}$'),
  requested_at timestamptz not null default now(),
  requested_by uuid not null references public.user_profiles(user_id)
);
alter table public.child_login_auth_delete_authorizations enable row level security;
revoke all on public.child_login_auth_delete_authorizations from public, anon, authenticated;

-- Only the named safeguarding owner can authorize a provider deletion. The
-- helper locks and verifies a completed marked attempt, detachment, and that the
-- identity has no conflicting learner/family/guardian/non-learner-role use.
create function public.authorize_child_login_auth_deletion(p_task uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_actor uuid := public.current_user_id(); v_user uuid; v_attempt uuid; v_username text; v_hash text;
begin
  perform public.require_coursework_retention_owner();
  if not public.try_block_detached_child_login(p_task) then
    raise exception 'child_login:identity_needs_review' using errcode='check_violation';
  end if;
  select t.child_user_id,t.attempt_id,t.username into v_user,v_attempt,v_username
    from public.child_login_removal_tasks t where t.id=p_task;
  if not found or v_attempt is null then raise exception 'child_login:identity_needs_review' using errcode='check_violation'; end if;
  v_hash := public.identity_hash(v_username || '@learners.ayahspring.com');
  insert into public.child_login_auth_delete_authorizations(identity_id,attempt_marker,address_hash,requested_by)
    values(v_user,v_attempt,v_hash,v_actor) on conflict (identity_id) do nothing;
  if not exists (select 1 from public.child_login_auth_delete_authorizations a
    where a.identity_id=v_user and a.attempt_marker=v_attempt and a.address_hash=v_hash) then
    raise exception 'child_login:identity_needs_review' using errcode='check_violation';
  end if;
  insert into public.governance_audit_events(actor,action,target_type,target_id,detail)
    values(v_actor,'child_login.auth_deletion_authorized','child_login_removal_task',p_task,'{}'::jsonb);
  return jsonb_build_object('identityId',v_user,'attemptId',v_attempt,'email',v_username || '@learners.ayahspring.com');
end;
$$;
revoke all on function public.authorize_child_login_auth_deletion(uuid) from public, anon;
grant execute on function public.authorize_child_login_auth_deletion(uuid) to authenticated;

-- The provider deletes auth.users in a separate transaction. Recheck the
-- protected identity *at deletion time*, not just before the HTTP request.
-- Authorization rows persist even if a learning-record purge removes the task;
-- otherwise a late provider call could delete an identity with no guard.
-- Other Auth-user deletions are unchanged. This guard does not promise that
-- Supabase deployment permissions, provider copies or JWT revocation work.
create function public.guard_authorized_child_auth_deletion()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_auth public.child_login_auth_delete_authorizations;
begin
  select * into v_auth from public.child_login_auth_delete_authorizations where identity_id=old.id;
  if not found then return old; end if;
  if old.raw_app_meta_data->>'ayahspring_child_attempt' is distinct from v_auth.attempt_marker::text
     or public.identity_hash(old.email) is distinct from v_auth.address_hash then
    raise exception 'child_login:identity_changed' using errcode='check_violation';
  end if;
  -- New references to the profile and Auth row wait on these locks; existing
  -- mutable memberships and role assignments are locked before rechecking.
  perform 1 from public.user_profiles where user_id=old.id for update;
  if not found then raise exception 'child_login:identity_needs_review' using errcode='check_violation'; end if;
  perform id from public.family_memberships where user_id=old.id order by id for update;
  perform id from public.guardian_relationships where guardian_user_id=old.id order by id for update;
  perform id from public.user_role_assignments where user_id=old.id order by id for update;
  perform r.id from public.roles r join public.user_role_assignments ur on ur.role_id=r.id
    where ur.user_id=old.id order by r.id for share of r;
  perform id from public.account_merge_requests where duplicate_user_id=old.id or target_user_id=old.id order by id for update;
  perform user_id from public.user_contact_details where user_id=old.id for update;
  if not public.child_login_identity_exclusive(old.id)
     or exists(select 1 from public.account_merge_requests where duplicate_user_id=old.id or target_user_id=old.id)
     or exists(select 1 from public.user_contact_details where user_id=old.id) then
    raise exception 'child_login:identity_needs_review' using errcode='check_violation';
  end if;
  return old;
end;
$$;
revoke all on function public.guard_authorized_child_auth_deletion() from public, anon, authenticated;
create trigger guard_authorized_child_auth_deletion
  before delete on auth.users for each row execute function public.guard_authorized_child_auth_deletion();

update public.platform_settings
   set preconditions = 'Guardian creation uses a verified active guardian, a durable reservation and service-only marked identity completion. The deployed server needs its Supabase service role key. Test creation, retry and recovery in a non-production Supabase project before deploying. The named safeguarding owner can complete an existing uniquely marked identity, and can request guarded provider deletion of an exclusive marked detached identity; legacy or changed identities need review. Test the Auth deletion trigger, provider integration and deployed concurrency before use. Database-helper blocking is not provider session revocation. Password reset and recovery-evidence cleanup are not implemented. The existing flag value is preserved.'
 where key = 'family.child_login';
