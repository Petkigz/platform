-- Group 4 · billing accounts, subscriptions and family allocations
--
-- Recorded rules: "Payer separate from learner identity" and "Family slots are
-- explicit and capacity enforced transactionally."
--
-- The billing_manager role from Group 1 exists precisely so that the person
-- who pays is not automatically the person who can see learning data. That
-- separation is enforced here by never joining billing to progress.

-- ---------------------------------------------------------------------------
-- billing_accounts
-- ---------------------------------------------------------------------------
create table public.billing_accounts (
  id uuid primary key default gen_random_uuid(),

  institution_id uuid references public.institutions (id) on delete restrict,

  -- D1
  display_name text not null check (length(trim(display_name)) > 0),

  billing_country text check (billing_country is null or billing_country ~ '^[A-Z]{2}$'),

  -- The currency this account is billed in. D4: authoritative for display and
  -- for the original amount; settlement currency is recorded separately.
  billing_currency char(3) not null default 'USD'
    check (billing_currency ~ '^[A-Z]{3}$'),

  status text not null default 'active'
    check (status in ('active', 'suspended', 'closed')),

  created_by uuid not null
    references public.user_profiles (user_id) on delete restrict,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create trigger billing_accounts_set_updated_at
  before update on public.billing_accounts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- billing_account_memberships — explicit permissions
-- ---------------------------------------------------------------------------
create table public.billing_account_memberships (
  id uuid primary key default gen_random_uuid(),

  billing_account_id uuid not null
    references public.billing_accounts (id) on delete cascade,

  user_id uuid not null
    references public.user_profiles (user_id) on delete cascade,

  can_view_invoices boolean not null default true,
  can_manage_payment_methods boolean not null default false,
  can_cancel_subscriptions boolean not null default false,

  status text not null default 'active'
    check (status in ('active', 'revoked')),

  granted_by uuid not null
    references public.user_profiles (user_id) on delete restrict,
  granted_at timestamptz not null default now()
);

create unique index bam_one_per_user
  on public.billing_account_memberships (billing_account_id, user_id);

-- ---------------------------------------------------------------------------
-- subscriptions
-- ---------------------------------------------------------------------------
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),

  billing_account_id uuid not null
    references public.billing_accounts (id) on delete restrict,

  plan_id uuid not null
    references public.plans (id) on delete restrict,

  -- The terms are pinned to a plan version, exactly as an enrolment pins a
  -- course version. A plan's terms must not move under a paying subscriber.
  plan_version_id uuid not null
    references public.plan_versions (id) on delete restrict,

  status text not null default 'pending'
    check (status in
      ('pending', 'trialing', 'active', 'past_due', 'paused', 'cancelled', 'expired')),

  started_at timestamptz,
  current_period_start timestamptz,
  current_period_end   timestamptz,
  cancelled_at timestamptz,
  cancel_reason text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint sub_timestamps_agree check (
    (cancelled_at is null) = (status not in ('cancelled', 'expired'))
  ),
  constraint sub_period_agrees check (
    current_period_end is null or current_period_start is null
    or current_period_start <= current_period_end
  )
);

create index subscriptions_billing_idx on public.subscriptions (billing_account_id);
create index subscriptions_status_idx  on public.subscriptions (status);

create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- subscription_items
-- ---------------------------------------------------------------------------
create table public.subscription_items (
  id uuid primary key default gen_random_uuid(),

  subscription_id uuid not null
    references public.subscriptions (id) on delete cascade,

  product_id uuid references public.products (id) on delete restrict,
  price_id uuid references public.prices (id) on delete restrict,

  quantity integer not null default 1 check (quantity > 0),

  status text not null default 'active'
    check (status in ('active', 'removed')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index subscription_items_sub_idx on public.subscription_items (subscription_id);

create trigger subscription_items_set_updated_at
  before update on public.subscription_items
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- subscription_history — append-only state changes
-- ---------------------------------------------------------------------------
create table public.subscription_history (
  id uuid primary key default gen_random_uuid(),

  subscription_id uuid not null
    references public.subscriptions (id) on delete restrict,

  from_status text,
  to_status text not null,

  reason text,
  changed_by uuid references public.user_profiles (user_id) on delete set null,
  occurred_at timestamptz not null default now()
);

create index subscription_history_sub_idx on public.subscription_history (subscription_id);

create or replace function public.reject_subscription_history_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception
    'subscription history is append-only'
    using errcode = 'insufficient_privilege';
end;
$$;

create trigger subscription_history_append_only
  before update or delete on public.subscription_history
  for each row execute function public.reject_subscription_history_mutation();

create or replace function public.record_subscription_status_change()
returns trigger
language plpgsql
as $$
begin
  insert into public.subscription_history
    (subscription_id, from_status, to_status, reason, changed_by)
  values (new.id, old.status, new.status, new.cancel_reason, null);
  return new;
end;
$$;

create trigger subscriptions_record_history
  after update of status on public.subscriptions
  for each row
  when (new.status is distinct from old.status)
  execute function public.record_subscription_status_change();

-- ---------------------------------------------------------------------------
-- family_plan_allocations
--
-- "Family slots are explicit and capacity enforced transactionally." A slot is
-- a row, not a counter, so an audit can always answer who occupies it.
-- ---------------------------------------------------------------------------
create table public.family_plan_allocations (
  id uuid primary key default gen_random_uuid(),

  subscription_id uuid not null
    references public.subscriptions (id) on delete cascade,

  learner_profile_id uuid not null
    references public.learner_profiles (id) on delete restrict,

  -- Which allowance this occupies. A plan may allow 1 adult and 3 children;
  -- they are separate pools.
  slot_type text not null default 'child'
    check (slot_type in ('child', 'adult')),

  effective_from timestamptz not null default now(),
  effective_until timestamptz,

  status text not null default 'active'
    check (status in ('active', 'released', 'expired')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint fpa_window check (
    effective_until is null or effective_from <= effective_until
  ),
  constraint fpa_active_is_live check (
    status <> 'active' or effective_until is null or effective_until > now()
  )
);

create index fpa_subscription_idx on public.family_plan_allocations (subscription_id);
create index fpa_learner_idx      on public.family_plan_allocations (learner_profile_id);

create trigger fpa_set_updated_at
  before update on public.family_plan_allocations
  for each row execute function public.set_updated_at();

-- One live slot per learner per subscription.
create unique index fpa_one_live_per_learner
  on public.family_plan_allocations (subscription_id, learner_profile_id)
  where status = 'active';

create or replace function public.enforce_family_slot_capacity()
returns trigger
language plpgsql
as $$
declare
  v_plan_version public.plan_versions;
  v_used integer;
  v_limit integer;
begin
  if new.status <> 'active' then
    return new;
  end if;

  select pv.* into v_plan_version
    from public.subscriptions s
    join public.plan_versions pv on pv.id = s.plan_version_id
   where s.id = new.subscription_id
   for update of s;

  v_limit := case when new.slot_type = 'child'
                  then v_plan_version.child_allowance
                  else v_plan_version.adult_allowance end;

  select count(*) into v_used
    from public.family_plan_allocations
   where subscription_id = new.subscription_id
     and slot_type = new.slot_type
     and status = 'active'
     and id is distinct from new.id;

  if v_used >= v_limit then
    raise exception
      'plan version % allows % % slot(s); % already allocated',
      v_plan_version.id, v_limit, new.slot_type, v_used
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger fpa_capacity
  before insert or update of status, slot_type on public.family_plan_allocations
  for each row execute function public.enforce_family_slot_capacity();

comment on table public.billing_accounts is 'Payer identity, deliberately separate from learner identity.';
comment on table public.subscriptions is 'Pins a plan version, so terms cannot move under a paying subscriber.';
comment on table public.family_plan_allocations is
  'Explicit slots, not a counter. Capacity checked in the same transaction as the allocation.';
