-- Group 1 · identity
-- user_profiles, roles, user_role_assignments
--
-- Credentials live in the auth provider (Supabase Auth — decision D3); this
-- table holds only the application profile. That separation is a recorded
-- rule and it is what makes swapping auth providers survivable.

-- ---------------------------------------------------------------------------
-- user_profiles
-- ---------------------------------------------------------------------------
create table public.user_profiles (
  user_id           uuid primary key
                      references auth.users (id) on delete cascade,
  display_name      text not null,
  avatar_path       text,
  preferred_language text not null default 'en',
  timezone          text,
  country_code      text,
  account_status    text not null default 'active'
                      check (account_status in ('active','suspended','closed')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz,
  constraint user_profiles_display_name_not_blank
    check (length(btrim(display_name)) > 0),
  constraint user_profiles_country_code_format
    check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  constraint user_profiles_language_format
    check (preferred_language ~ '^[a-z]{2}(-[A-Z]{2})?$')
);

comment on column public.user_profiles.user_id is
  'Matches the auth provider ID. Never a surrogate — see decision D3.';
comment on column public.user_profiles.timezone is
  'IANA name (e.g. Africa/Kampala), not an offset.';
comment on column public.user_profiles.deleted_at is
  'D7: soft delete. Financial, governance and certificate history is never '
  'deleted — personal fields are anonymised instead.';

create index user_profiles_account_status_key
  on public.user_profiles (account_status)
  where deleted_at is null;

create trigger user_profiles_set_updated_at
  before update on public.user_profiles
  for each row execute function public.set_updated_at();

-- account_status is an administrative action. A user editing their own profile
-- must not be able to unsuspend or reopen their own account.
create or replace function public.protect_account_status()
returns trigger
language plpgsql
as $$
begin
  if new.account_status is distinct from old.account_status
     and coalesce(public.current_user_id(), old.user_id) = old.user_id then
    raise exception 'account_status may only be changed by an administrator'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger user_profiles_protect_account_status
  before update on public.user_profiles
  for each row execute function public.protect_account_status();

-- ---------------------------------------------------------------------------
-- roles
-- ---------------------------------------------------------------------------
create table public.roles (
  id            uuid primary key default gen_random_uuid(),
  code          text not null,
  name          text not null,
  description   text,
  is_privileged boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint roles_code_unique unique (code),
  constraint roles_code_stable check (code = lower(code) and code ~ '^[a-z_]+$')
);

comment on column public.roles.code is
  'Stable machine identifier. Renaming a role code is a breaking change.';
comment on column public.roles.is_privileged is
  'Privileged roles are guarded on assignment — see '
  'protect_privileged_role_assignment().';

create trigger roles_set_updated_at
  before update on public.roles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- user_role_assignments
-- ---------------------------------------------------------------------------
create table public.user_role_assignments (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null
                      references public.user_profiles (user_id) on delete cascade,
  role_id           uuid not null
                      references public.roles (id) on delete restrict,
  assigned_by       uuid
                      references public.user_profiles (user_id) on delete set null,
  assigned_at       timestamptz not null default now(),
  revoked_at        timestamptz,
  revocation_reason text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint ura_revoked_after_assigned
    check (revoked_at is null or revoked_at >= assigned_at),
  -- Record why. An unexplained revocation is unauditable.
  constraint ura_revocation_reason_required
    check (revoked_at is null or length(btrim(coalesce(revocation_reason,''))) > 0)
);

comment on table public.user_role_assignments is
  'Recorded rule: roles do not automatically grant unrestricted access. '
  'Authorization is role + resource scope + workflow state + approvals.';

-- "Prevent duplicate active assignments." Partial so a revoked role can be
-- granted again later.
create unique index ura_one_active_per_role_key
  on public.user_role_assignments (user_id, role_id)
  where revoked_at is null;

create index ura_user_active_key
  on public.user_role_assignments (user_id)
  where revoked_at is null;

create trigger ura_set_updated_at
  before update on public.user_role_assignments
  for each row execute function public.set_updated_at();

-- "Safeguard privileged role assignments."
--
-- A privileged role may only be granted by a different user who already holds
-- one. That blocks self-escalation, which is the single most common privilege
-- bug in role systems.
--
-- Bootstrapping the first administrator is an explicit, auditable act:
--   begin;
--   set local app.bootstrap_privileged_roles = 'on';
--   insert into public.user_role_assignments (...) values (...);
--   commit;
create or replace function public.protect_privileged_role_assignment()
returns trigger
language plpgsql
as $$
declare
  v_role_privileged boolean;
  v_bootstrap       text;
begin
  select r.is_privileged into v_role_privileged
    from public.roles r
   where r.id = new.role_id;

  if not coalesce(v_role_privileged, false) then
    return new;
  end if;

  v_bootstrap := current_setting('app.bootstrap_privileged_roles', true);
  if v_bootstrap = 'on' then
    return new;
  end if;

  if new.assigned_by is null then
    raise exception 'a privileged role requires an explicit assigner'
      using errcode = '42501';
  end if;

  if new.assigned_by = new.user_id then
    raise exception 'a user may not assign a privileged role to themselves'
      using errcode = '42501';
  end if;

  if not exists (
        select 1
          from public.user_role_assignments ura
          join public.roles r on r.id = ura.role_id
         where ura.user_id = new.assigned_by
           and r.is_privileged
           and ura.revoked_at is null
       ) then
    raise exception 'assigner does not currently hold a privileged role'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger ura_protect_privileged_assignment_insert
  before insert on public.user_role_assignments
  for each row execute function public.protect_privileged_role_assignment();

-- Re-granting by clearing revoked_at is an INSERT-equivalent escalation and
-- needs the same guard.
create trigger ura_protect_privileged_assignment_update
  before update of revoked_at on public.user_role_assignments
  for each row
  when (old.revoked_at is not null and new.revoked_at is null)
  execute function public.protect_privileged_role_assignment();
