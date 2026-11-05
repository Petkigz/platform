-- An unrevoked staff role is not authority while its account is suspended or
-- closed. The authentication identity may survive account closure until a
-- separate provider operation, so the database must check the profile itself.
-- Non-privileged role membership remains a membership fact: for example, staff
-- may need to screen a suspended instructor. This is not a blanket session
-- revocation for learner, author or guardian paths, which need separate review.
create or replace function public.has_role(p_user_id uuid, p_role_code text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_role_assignments ura
    join public.roles r on r.id = ura.role_id
    join public.user_profiles p on p.user_id = ura.user_id
    where ura.user_id = p_user_id and r.code = p_role_code and ura.revoked_at is null
      and (not r.is_privileged or (p.account_status = 'active' and p.deleted_at is null))
  );
$$;

create or replace function public.is_privileged(p_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_role_assignments ura
    join public.roles r on r.id = ura.role_id
    join public.user_profiles p on p.user_id = ura.user_id
    where ura.user_id = p_user_id and r.is_privileged and ura.revoked_at is null
      and p.account_status = 'active' and p.deleted_at is null
  );
$$;

comment on function public.has_role(uuid,text) is
  'Unrevoked role membership; privileged roles also require an active, undeleted profile. Non-privileged membership is not a session authorization check.';
comment on function public.is_privileged(uuid) is
  'An active, undeleted profile with an unrevoked privileged role. This is not a blanket check on all authenticated access.';
