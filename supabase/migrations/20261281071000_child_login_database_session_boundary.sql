-- Detachment of a trusted child identity also denies that identity on database
-- paths which ask current_user_id(). This is not provider sign-out, global JWT
-- revocation, or a promise about paths that do not use that identity helper.
-- IDs remain private and are retained: removing the deny record before all
-- issued tokens expire would permit them again.
create table public.child_login_database_denials (
  identity_id uuid primary key,
  denied_at timestamptz not null default now()
);
alter table public.child_login_database_denials enable row level security;
revoke all on public.child_login_database_denials from public, anon, authenticated;

-- Security definer only so ordinary sessions cannot inspect the deny list.
-- Preserve the original JWT/legacy-claim parsing, but never turn a denied
-- authenticated subject into NULL: some callers interpret NULL specially.
create or replace function public.current_user_id()
returns uuid language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare v_claims jsonb; v_actor uuid;
begin
  begin
    v_claims := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
    v_actor := nullif(v_claims ->> 'sub', '')::uuid;
  exception when others then
    v_actor := nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
  end;
  if v_actor is not null and exists (select 1 from public.child_login_database_denials d where d.identity_id=v_actor) then
    raise exception 'child_login:database_session_blocked' using errcode='insufficient_privilege';
  end if;
  return v_actor;
end;
$$;

-- These checks avoid automatically blocking an identity that has acquired a
-- different learner, family, guardian or non-learner role. Such cases remain
-- visible as removal tasks for individual review. Caller locks the profile row.
create function public.child_login_identity_exclusive(p_user uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select not exists (select 1 from public.learner_profiles where linked_user_id=p_user)
     and not exists (select 1 from public.family_memberships where user_id=p_user and status='active')
     and not exists (select 1 from public.guardian_relationships where guardian_user_id=p_user and status='active' and deleted_at is null)
     and not exists (select 1 from public.user_role_assignments ur
       join public.roles r on r.id=ur.role_id where ur.user_id=p_user and ur.revoked_at is null and r.code <> 'learner');
$$;
revoke all on function public.child_login_identity_exclusive(uuid) from public, anon, authenticated;

-- The same conservative check is used for new detachments and owner review of
-- existing tasks. Only a completed, correctly marked identity can be denied.
create function public.try_block_detached_child_login(p_task uuid)
returns boolean language plpgsql security definer set search_path=public as $$
declare v_user uuid; v_attempt uuid; v_username text;
begin
  select t.child_user_id, t.attempt_id, t.username into v_user,v_attempt,v_username
    from public.child_login_removal_tasks t
    join public.child_logins l on l.id=t.child_login_id and l.disabled_at is not null
   where t.id=p_task;
  if not found or v_attempt is null then return false; end if;
  -- A concurrent purge can remove the task; serialize on its learner, then
  -- check the task and login again before writing the denial.
  perform 1 from public.learner_profiles lp join public.child_login_removal_tasks t on t.learner_profile_id=lp.id
    where t.id=p_task for update of lp;
  select t.child_user_id,t.attempt_id,t.username into v_user,v_attempt,v_username
    from public.child_login_removal_tasks t
    join public.child_logins l on l.id=t.child_login_id and l.disabled_at is not null
    where t.id=p_task for update of t,l;
  if not found or v_attempt is null then return false; end if;
  perform 1 from public.user_profiles where user_id=v_user for update;
  perform id from public.family_memberships where user_id=v_user order by id for update;
  perform id from public.guardian_relationships where guardian_user_id=v_user order by id for update;
  perform id from public.user_role_assignments where user_id=v_user order by id for update;
  perform r.id from public.roles r join public.user_role_assignments ur on ur.role_id=r.id
    where ur.user_id=v_user order by r.id for share of r;
  if v_user is distinct from public.current_user_id()
     and public.child_login_identity_exclusive(v_user)
     and exists (select 1 from public.child_login_attempts a
       join auth.users u on u.id=a.user_id
       where a.id=v_attempt and a.status='completed' and a.user_id=v_user
         and lower(u.email)=v_username || '@learners.ayahspring.com'
         and u.raw_app_meta_data->>'ayahspring_child_attempt'=a.id::text) then
    insert into public.child_login_database_denials(identity_id) values(v_user) on conflict do nothing;
    return true;
  end if;
  return false;
end;
$$;
revoke all on function public.try_block_detached_child_login(uuid) from public, anon, authenticated;

alter function public.remove_child_login(uuid,text) rename to remove_child_login_with_task;
revoke all on function public.remove_child_login_with_task(uuid,text) from public, anon, authenticated;
create function public.remove_child_login(p_learner_id uuid, p_reason text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_result jsonb; v_task uuid; v_blocked boolean := false;
begin
  v_result := public.remove_child_login_with_task(p_learner_id,p_reason);
  select t.id into v_task from public.child_login_removal_tasks t
    join public.child_logins l on l.id=t.child_login_id and l.disabled_at is not null
    where t.learner_profile_id=p_learner_id;
  if found then v_blocked := public.try_block_detached_child_login(v_task); end if;
  return v_result || jsonb_build_object('databaseAccessBlocked',v_blocked);
end;
$$;
revoke all on function public.remove_child_login(uuid,text) from public, anon;
grant execute on function public.remove_child_login(uuid,text) to authenticated;

-- A named owner may apply the same check to an older detached marked identity.
-- This does not create a task, delete an identity or revoke provider sessions.
create function public.block_child_login_task_database_access(p_task uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_actor uuid := public.current_user_id(); v_blocked boolean;
begin
  perform public.require_coursework_retention_owner();
  v_blocked := public.try_block_detached_child_login(p_task);
  if v_blocked then
    insert into public.governance_audit_events(actor,action,target_type,target_id,detail)
      values(v_actor,'child_login.database_access_blocked','child_login_removal_task',p_task,'{}'::jsonb);
  end if;
  return jsonb_build_object('blocked',v_blocked);
end;
$$;
revoke all on function public.block_child_login_task_database_access(uuid) from public, anon;
grant execute on function public.block_child_login_task_database_access(uuid) to authenticated;

create function public.child_login_database_block_status(p_tasks uuid[])
returns table(task_id uuid, blocked boolean)
language plpgsql stable security definer set search_path=public as $$
begin
  perform public.require_coursework_retention_owner();
  if cardinality(p_tasks)>200 then raise exception 'child_login:too_many_tasks' using errcode='invalid_parameter_value'; end if;
  return query select t.id, exists(select 1 from public.child_login_database_denials d where d.identity_id=t.child_user_id)
    from public.child_login_removal_tasks t where t.id=any(coalesce(p_tasks,'{}'::uuid[]));
end;
$$;
revoke all on function public.child_login_database_block_status(uuid[]) from public, anon;
grant execute on function public.child_login_database_block_status(uuid[]) to authenticated;
