-- Group 1 · families and learners
--
-- The child identity model (decision D2, confirmed): a child is a
-- learner_profile under a family, NOT a user with a login. The nullable
-- linked_user_id is the escape hatch — when child login ships later the
-- profile gains a linked user and the profile's identity never changes, so no
-- children's data has to migrate.
--
-- There is deliberately NO date-of-birth column. The recorded rule is "prefer
-- age band over exact DOB by default", which is a materially easier privacy
-- position for a children's product.

-- ---------------------------------------------------------------------------
-- families
-- ---------------------------------------------------------------------------
create table public.families (
  id             uuid primary key default gen_random_uuid(),
  name           text,
  created_by     uuid references public.user_profiles (user_id) on delete set null,
  institution_id uuid references public.institutions (id),  -- D1
  status         text not null default 'active'
                   check (status in ('active','archived')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz
);

comment on column public.families.institution_id is
  'D1: nullable. NULL means the default (non-institutional) tenant.';

create index families_institution_key on public.families (institution_id);

create trigger families_set_updated_at
  before update on public.families
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- family_memberships
-- ---------------------------------------------------------------------------
create table public.family_memberships (
  id              uuid primary key default gen_random_uuid(),
  family_id       uuid not null
                    references public.families (id) on delete cascade,
  user_id         uuid not null
                    references public.user_profiles (user_id) on delete cascade,
  membership_type text not null
                    check (membership_type in ('owner','guardian','billing_manager')),
  status          text not null default 'invited'
                    check (status in ('invited','active','revoked')),
  joined_at       timestamptz,
  revoked_at      timestamptz,
  created_by      uuid references public.user_profiles (user_id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  -- A person joins a family once at a time; re-invitation after revocation is
  -- a new row.
  constraint fm_one_active_per_family
    exclude using btree (family_id with =, user_id with =)
    where (status = 'active'),
  constraint fm_joined_when_active
    check (status in ('invited') or joined_at is not null),
  constraint fm_revoked_has_timestamp
    check (status <> 'revoked' or revoked_at is not null)
);

comment on column public.family_memberships.membership_type is
  'Recorded rule: billing authority belongs to the billing account and family '
  'membership, never implicitly to a guardian relationship.';

create index fm_user_active_key
  on public.family_memberships (user_id)
  where status = 'active';

create trigger fm_set_updated_at
  before update on public.family_memberships
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- learner_profiles
-- ---------------------------------------------------------------------------
create table public.learner_profiles (
  id             uuid primary key default gen_random_uuid(),
  family_id      uuid references public.families (id) on delete cascade,
  linked_user_id uuid references public.user_profiles (user_id) on delete set null,
  institution_id uuid references public.institutions (id),  -- D1
  display_name   text not null,
  learner_type   text not null check (learner_type in ('child','adult')),
  age_band       text check (age_band in ('5-7','8-10','11-13','14-17','18+')),
  status         text not null default 'active'
                   check (status in ('active','archived')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz,
  -- D2 + COPPA insurance. A child profile may not hold a login until the
  -- trusted linking workflow ships and verifiable parental consent exists.
  -- Drop this constraint in the migration that enables child login.
  constraint lp_no_child_login_yet
    check (learner_type = 'adult' or linked_user_id is null),
  constraint lp_children_need_age_band
    check (learner_type = 'adult' or age_band is not null),
  constraint lp_display_name_not_blank
    check (length(btrim(display_name)) > 0),
  -- A learner is either linked to a real account or attached to a family.
  -- An orphan profile with neither is a data bug.
  constraint lp_needs_family_or_login
    check (family_id is not null or linked_user_id is not null)
);

-- A person may only be linked to one learner profile.
create unique index learner_profiles_linked_user_key
  on public.learner_profiles (linked_user_id)
  where linked_user_id is not null;

create index learner_profiles_family_key
  on public.learner_profiles (family_id)
  where deleted_at is null;
create index learner_profiles_institution_key
  on public.learner_profiles (institution_id);

comment on table public.learner_profiles is
  'D2: a child is a profile under a family, not a user. No date of birth is '
  'stored — age band only.';

create trigger learner_profiles_set_updated_at
  before update on public.learner_profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- family authorization helpers (declared here because they read the tables
-- created above)
-- ---------------------------------------------------------------------------

create or replace function public.is_active_family_member(p_family_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.family_memberships fm
     where fm.family_id = p_family_id
       and fm.user_id = p_user_id
       and fm.status = 'active'
  );
$$;

create or replace function public.is_family_owner(p_family_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.family_memberships fm
     where fm.family_id = p_family_id
       and fm.user_id = p_user_id
       and fm.membership_type = 'owner'
       and fm.status = 'active'
  );
$$;

comment on function public.is_active_family_member(uuid, uuid) is
  'Active owner/adult/member of the given family. Used by RLS.';
comment on function public.is_family_owner(uuid, uuid) is
  'Active owner of the given family. Used for family membership writes.';
