-- Page owner-only queues without making unresolved older entries hide later ones.
-- Original one-argument RPCs remain available for existing clients.

create function public.child_login_pending_attempts_page(p_limit integer default 50, p_offset integer default 0)
returns table(attempt_id uuid, learner_name text, guardian_name text, username text,
              created_at timestamptz, marked_identity_present boolean)
language plpgsql stable security definer set search_path=public as $$
begin
  perform public.require_coursework_retention_owner();
  return query
    select a.id, lp.display_name, up.display_name, a.username, a.created_at,
      exists (select 1 from auth.users u
        where lower(u.email)=a.username || '@learners.ayahspring.com'
          and u.raw_app_meta_data->>'ayahspring_child_attempt'=a.id::text)
    from public.child_login_attempts a
    join public.learner_profiles lp on lp.id=a.learner_profile_id
    join public.user_profiles up on up.user_id=a.guardian_user_id
    where a.status='pending'
    order by a.created_at, a.id
    limit greatest(1, least(coalesce(p_limit,50),200))
    offset greatest(0, coalesce(p_offset,0));
end;
$$;
revoke all on function public.child_login_pending_attempts_page(integer,integer) from public, anon;
grant execute on function public.child_login_pending_attempts_page(integer,integer) to authenticated;

create function public.child_login_removal_queue_page(p_limit integer default 50, p_offset integer default 0)
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
  limit greatest(1, least(coalesce(p_limit,50),200))
    offset greatest(0, coalesce(p_offset,0));
end;
$$;
revoke all on function public.child_login_removal_queue_page(integer,integer) from public, anon;
grant execute on function public.child_login_removal_queue_page(integer,integer) to authenticated;

create function public.child_login_erasure_recovery_queue_page(p_limit integer default 50, p_offset integer default 0)
returns table(source_kind text, source_id uuid, identity_id uuid, created_at timestamptz,
              identity_present boolean, trusted_marker_matches boolean, matched_identity_ids uuid[])
language plpgsql stable security definer set search_path=public as $$
begin
  perform public.require_coursework_retention_owner();
  return query select r.source_kind, r.source_id, r.identity_id, r.created_at,
    exists(select 1 from auth.users u where u.id=r.identity_id
      or (r.attempt_marker is not null and u.raw_app_meta_data->>'ayahspring_child_attempt'=r.attempt_marker::text
          and public.identity_hash(u.email)=r.address_hash)),
    exists(select 1 from auth.users u where r.attempt_marker is not null
      and u.raw_app_meta_data->>'ayahspring_child_attempt'=r.attempt_marker::text
      and public.identity_hash(u.email)=r.address_hash),
    array(select u.id from auth.users u where u.id=r.identity_id
      or (r.attempt_marker is not null and u.raw_app_meta_data->>'ayahspring_child_attempt'=r.attempt_marker::text
          and public.identity_hash(u.email)=r.address_hash) order by u.id)
  from public.child_login_erasure_recovery r
  order by r.created_at, r.source_kind, r.source_id
  limit greatest(1,least(coalesce(p_limit,50),200))
    offset greatest(0, coalesce(p_offset,0));
end;
$$;
revoke all on function public.child_login_erasure_recovery_queue_page(integer,integer) from public, anon;
grant execute on function public.child_login_erasure_recovery_queue_page(integer,integer) to authenticated;

create function public.child_login_legacy_erasure_queue_page(p_limit integer default 50, p_offset integer default 0)
returns table(learner_id uuid, attempt_count integer, removal_task_count integer, coursework_held boolean)
language plpgsql stable security definer set search_path=public as $$
begin
  perform public.require_coursework_retention_owner();
  return query select lp.id,
    (select count(*)::integer from public.child_login_attempts a where a.learner_profile_id=lp.id),
    (select count(*)::integer from public.child_login_removal_tasks t where t.learner_profile_id=lp.id),
    public.learner_has_held_coursework(lp.id)
  from public.learner_profiles lp
  where lp.learner_type='child' and lp.status='erased'
    and (exists (select 1 from public.child_login_attempts a where a.learner_profile_id=lp.id)
      or exists (select 1 from public.child_login_removal_tasks t where t.learner_profile_id=lp.id))
  order by lp.erased_at nulls first, lp.id
  limit greatest(1,least(coalesce(p_limit,50),200))
    offset greatest(0, coalesce(p_offset,0));
end;
$$;
revoke all on function public.child_login_legacy_erasure_queue_page(integer,integer) from public, anon;
grant execute on function public.child_login_legacy_erasure_queue_page(integer,integer) to authenticated;

-- Older clients retain the original RPC names, delegated to the same page reader.

create or replace function public.child_login_pending_attempts(p_limit integer default 50)
returns table(attempt_id uuid, learner_name text, guardian_name text, username text,
              created_at timestamptz, marked_identity_present boolean)
language sql stable security definer set search_path=public as $$
  select * from public.child_login_pending_attempts_page(p_limit, 0);
$$;

create or replace function public.child_login_removal_queue(p_limit integer default 50)
returns table(task_id uuid, learner_name text, username text, child_user_id uuid,
              created_at timestamptz, identity_present boolean, marker_matches boolean)
language sql stable security definer set search_path=public as $$
  select * from public.child_login_removal_queue_page(p_limit, 0);
$$;

create or replace function public.child_login_erasure_recovery_queue(p_limit integer default 50)
returns table(source_kind text, source_id uuid, identity_id uuid, created_at timestamptz,
              identity_present boolean, trusted_marker_matches boolean, matched_identity_ids uuid[])
language sql stable security definer set search_path=public as $$
  select * from public.child_login_erasure_recovery_queue_page(p_limit, 0);
$$;

create or replace function public.child_login_legacy_erasure_queue(p_limit integer default 50)
returns table(learner_id uuid, attempt_count integer, removal_task_count integer, coursework_held boolean)
language sql stable security definer set search_path=public as $$
  select * from public.child_login_legacy_erasure_queue_page(p_limit, 0);
$$;
