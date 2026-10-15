-- Group 1 · authorization helpers
--
-- These are SECURITY DEFINER because RLS policies need to read role
-- assignments while evaluating a policy on another table. They are read-only,
-- STABLE, pinned to a fixed search_path, and expose no write path — so they
-- cannot be used to escalate, only to ask a question.

create or replace function public.has_role(p_user_id uuid, p_role_code text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.user_role_assignments ura
      join public.roles r on r.id = ura.role_id
     where ura.user_id = p_user_id
       and r.code = p_role_code
       and ura.revoked_at is null
  );
$$;

create or replace function public.is_privileged(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.user_role_assignments ura
      join public.roles r on r.id = ura.role_id
     where ura.user_id = p_user_id
       and r.is_privileged
       and ura.revoked_at is null
  );
$$;

comment on function public.has_role(uuid, text) is
  'Holds an unrevoked assignment of the given role code.';
comment on function public.is_privileged(uuid) is
  'Holds any unrevoked privileged role. Used for administrative read access.';
