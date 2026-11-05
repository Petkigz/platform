-- Private owner-only visibility into pending child-login attempts. A marked auth
-- row is not a completed link, proof of session revocation, or proof that no
-- other provider identity exists. This read does not delete or release anything.
create function public.child_login_pending_attempts(p_limit integer default 50)
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
    limit greatest(1, least(coalesce(p_limit,50),200));
end;
$$;
revoke all on function public.child_login_pending_attempts(integer) from public, anon;
grant execute on function public.child_login_pending_attempts(integer) to authenticated;
