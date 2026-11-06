-- A detachment must leave a durable identity-removal task in the same database
-- transaction. It does not delete Auth users, revoke sessions or erase work.
create table public.child_login_removal_tasks (
  id uuid primary key default gen_random_uuid(),
  child_login_id uuid not null unique,
  learner_profile_id uuid not null references public.learner_profiles(id),
  child_user_id uuid not null references public.user_profiles(user_id),
  username text not null,
  attempt_id uuid references public.child_login_attempts(id),
  created_at timestamptz not null default now(),
  recorded_at timestamptz,
  recorded_by uuid references public.user_profiles(user_id)
);
alter table public.child_login_removal_tasks enable row level security;
revoke all on public.child_login_removal_tasks from public, anon, authenticated;

-- Recover historical detachments too; legacy logins may have no trusted marker
-- and must never be automatically deleted merely because a username matches.
insert into public.child_login_removal_tasks(child_login_id, learner_profile_id, child_user_id, username, attempt_id, created_at)
select l.id, l.learner_profile_id, l.user_id, l.username,
  (select a.id from public.child_login_attempts a
    where a.learner_profile_id=l.learner_profile_id and a.user_id=l.user_id and a.status='completed'
    order by a.created_at desc, a.id desc limit 1), l.disabled_at
from public.child_logins l where l.disabled_at is not null and l.user_id is not null
on conflict (child_login_id) do nothing;

alter function public.remove_child_login(uuid,text) rename to remove_child_login_verified;
revoke all on function public.remove_child_login_verified(uuid,text) from public, anon, authenticated;
create function public.remove_child_login(p_learner_id uuid, p_reason text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_login public.child_logins; v_result jsonb;
begin
  -- The verified inner writer takes and holds the learner lock until commit.
  -- It also refuses absent logins and authorizes the actor before any task exists.
  v_result := public.remove_child_login_verified(p_learner_id,p_reason);
  select * into v_login from public.child_logins
    where learner_profile_id=p_learner_id and disabled_at is not null;
  if not found or v_login.user_id is null then
    raise exception 'child_login:removal_record_missing' using errcode='check_violation';
  end if;
  insert into public.child_login_removal_tasks(child_login_id, learner_profile_id, child_user_id, username, attempt_id)
  values (v_login.id, v_login.learner_profile_id, v_login.user_id, v_login.username,
    (select a.id from public.child_login_attempts a
      where a.learner_profile_id=v_login.learner_profile_id and a.user_id=v_login.user_id and a.status='completed'
      order by a.created_at desc, a.id desc limit 1))
  on conflict (child_login_id) do nothing;
  return v_result || jsonb_build_object('identityRemovalPending',true);
end;
$$;
revoke all on function public.remove_child_login(uuid,text) from public, anon;
grant execute on function public.remove_child_login(uuid,text) to authenticated;

create function public.child_login_removal_queue(p_limit integer default 50)
returns table(task_id uuid, learner_name text, username text, child_user_id uuid,
              created_at timestamptz, identity_present boolean, marker_matches boolean)
language plpgsql stable security definer set search_path=public as $$
begin
  perform public.require_coursework_retention_owner();
  return query select t.id, lp.display_name, t.username, t.child_user_id, t.created_at,
    exists(select 1 from auth.users u where u.id=t.child_user_id
      or (t.attempt_id is not null and lower(u.email)=t.username || '@learners.ayahspring.com'
          and u.raw_app_meta_data->>'ayahspring_child_attempt'=t.attempt_id::text)),
    exists(select 1 from auth.users u where u.id=t.child_user_id
      and lower(u.email)=t.username || '@learners.ayahspring.com'
      and t.attempt_id is not null and u.raw_app_meta_data->>'ayahspring_child_attempt'=t.attempt_id::text)
  from public.child_login_removal_tasks t
  join public.learner_profiles lp on lp.id=t.learner_profile_id
  where t.recorded_at is null or exists (select 1 from auth.users u where u.id=t.child_user_id
      or (t.attempt_id is not null and lower(u.email)=t.username || '@learners.ayahspring.com'
          and u.raw_app_meta_data->>'ayahspring_child_attempt'=t.attempt_id::text))
  order by t.created_at, t.id
  limit greatest(1, least(coalesce(p_limit,50),200));
end;
$$;
revoke all on function public.child_login_removal_queue(integer) from public, anon;
grant execute on function public.child_login_removal_queue(integer) to authenticated;

-- Recording is not provider deletion. Refuse while the exact identity still
-- exists; do not infer that signed tokens or external copies are gone.
create function public.record_child_login_identity_removed(p_task uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_actor uuid := public.current_user_id(); v_task public.child_login_removal_tasks;
begin
  perform public.require_coursework_retention_owner();
  select * into v_task from public.child_login_removal_tasks where id=p_task for update;
  if not found then raise exception 'child_login:removal_task_missing' using errcode='no_data_found'; end if;
  if exists(select 1 from auth.users u where u.id=v_task.child_user_id
      or (v_task.attempt_id is not null and lower(u.email)=v_task.username || '@learners.ayahspring.com'
          and u.raw_app_meta_data->>'ayahspring_child_attempt'=v_task.attempt_id::text)) then
    raise exception 'child_login:identity_still_exists' using errcode='check_violation';
  end if;
  if v_task.recorded_at is null then
    update public.child_login_removal_tasks set recorded_at=now(), recorded_by=v_actor where id=p_task;
    insert into public.governance_audit_events(actor, action, target_type, target_id, detail)
      values(v_actor,'child_login.identity_removal_recorded','child_login_removal_task',p_task,'{}'::jsonb);
    return jsonb_build_object('recorded',true,'alreadyRecorded',false);
  end if;
  return jsonb_build_object('recorded',true,'alreadyRecorded',true);
end;
$$;
revoke all on function public.record_child_login_identity_removed(uuid) from public, anon;
grant execute on function public.record_child_login_identity_removed(uuid) to authenticated;
