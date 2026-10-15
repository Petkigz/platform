-- Group 4 · products, plans and prices
--
-- D4 (FROZEN): money is integer minor units plus an explicit currency. The
-- original amount and currency are authoritative; fees, FX and settlement are
-- recorded separately, never folded into this figure. There is no numeric
-- column in this group that holds a currency amount as a float.
--
-- Recorded rule: "Payment state, subscription state and entitlement are
-- separate." Three tables, three lifecycles, and the entitlement table is the
-- only one the access check reads.

-- ---------------------------------------------------------------------------
-- products
-- ---------------------------------------------------------------------------
create table public.products (
  id uuid primary key default gen_random_uuid(),

  institution_id uuid references public.institutions (id) on delete restrict,

  product_type text not null default 'course'
    check (product_type in
      ('course', 'learning_path', 'bundle', 'private_tutoring', 'certificate_exam')),

  name text not null check (length(trim(name)) > 0),
  description text,

  status text not null default 'draft'
    check (status in ('draft', 'active', 'retired')),

  -- A product with no live price cannot be purchased, but it can still exist
  -- as a draft. The access check enforces this rather than a constraint, so
  -- that a draft can be prepared before pricing is decided.
  created_by uuid not null
    references public.user_profiles (user_id) on delete restrict,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index products_type_idx   on public.products (product_type);
create index products_status_idx on public.products (status);

create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- product_course_versions
--
-- "Map product to exact course version." A product sells a specific version,
-- which is what makes D5 payable: buying a course pins what you bought.
-- ---------------------------------------------------------------------------
create table public.product_course_versions (
  id uuid primary key default gen_random_uuid(),

  product_id uuid not null
    references public.products (id) on delete cascade,

  course_id uuid not null
    references public.courses (id) on delete restrict,

  course_version_id uuid not null,
  constraint pcv_version_belongs_to_course
    foreign key (course_id, course_version_id)
    references public.course_versions (course_id, id) on delete restrict,

  created_at timestamptz not null default now()
);

create unique index pcv_one_per_product_version
  on public.product_course_versions (product_id, course_version_id);

-- ---------------------------------------------------------------------------
-- plans and plan_versions
--
-- plans is the stable identity a customer recognises; plan_versions holds the
-- terms, which change. This is the same split as course/course_versions, for
-- the same reason: a subscriber's terms must not move underneath them.
-- ---------------------------------------------------------------------------
create table public.plans (
  id uuid primary key default gen_random_uuid(),

  code text not null check (code ~ '^[a-z0-9][a-z0-9_-]*$'),
  name text not null check (length(trim(name)) > 0),
  description text,

  status text not null default 'draft'
    check (status in ('draft', 'active', 'retired')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create unique index plans_code_key on public.plans (code) where deleted_at is null;

create trigger plans_set_updated_at
  before update on public.plans
  for each row execute function public.set_updated_at();

create table public.plan_versions (
  id uuid primary key default gen_random_uuid(),

  plan_id uuid not null
    references public.plans (id) on delete cascade,

  version_number integer not null check (version_number > 0),

  -- How many child learner slots the plan carries. Explicit, per the recorded
  -- rule "family slots are explicit and capacity enforced transactionally".
  child_allowance integer not null default 0 check (child_allowance >= 0),
  adult_allowance integer not null default 1 check (adult_allowance >= 0),

  billing_interval text not null default 'month'
    check (billing_interval in ('week', 'month', 'quarter', 'year', 'one_time')),

  status text not null default 'draft'
    check (status in ('draft', 'active', 'retired')),

  change_summary text,

  effective_from timestamptz,
  effective_until timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint pv_window check (
    effective_until is null or effective_from is null or effective_from <= effective_until
  )
);

create unique index plan_versions_number_key on public.plan_versions (plan_id, version_number);

create trigger plan_versions_set_updated_at
  before update on public.plan_versions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- plan_entitlements — what a plan version actually gives you
-- ---------------------------------------------------------------------------
create table public.plan_entitlements (
  id uuid primary key default gen_random_uuid(),

  plan_version_id uuid not null
    references public.plan_versions (id) on delete cascade,

  -- 'catalogue' means everything in a subject area; 'product' names one.
  scope_type text not null default 'catalogue'
    check (scope_type in ('catalogue', 'product', 'feature')),

  subject_area_id uuid references public.subject_areas (id) on delete restrict,
  product_id uuid references public.products (id) on delete restrict,
  feature_code text,

  constraint pe_scope_matches check (
    case scope_type
      when 'catalogue' then subject_area_id is not null
                           and product_id is null and feature_code is null
      when 'product'   then product_id is not null
                           and subject_area_id is null and feature_code is null
      when 'feature'   then feature_code is not null
                           and subject_area_id is null and product_id is null
    end
  )
);

create index plan_entitlements_version_idx on public.plan_entitlements (plan_version_id);

-- ---------------------------------------------------------------------------
-- prices
--
-- D4: integer minor units. 1250 with currency 'UGX' is 1,250 Ugandan
-- shillings; 1250 with 'USD' is $12.50. The column never means both.
-- ---------------------------------------------------------------------------
create table public.prices (
  id uuid primary key default gen_random_uuid(),

  -- Exactly one of these. A price belongs to a product or to a plan version.
  product_id uuid references public.products (id) on delete cascade,
  plan_version_id uuid references public.plan_versions (id) on delete cascade,

  constraint prices_single_owner check (
    (product_id is not null) <> (plan_version_id is not null)
  ),

  amount_minor bigint not null check (amount_minor >= 0),

  -- ISO 4217. Reporting currency is USD, but the amount charged is stored in
  -- whatever currency it was actually charged in.
  currency_code char(3) not null check (currency_code ~ '^[A-Z]{3}$'),

  billing_interval text not null default 'one_time'
    check (billing_interval in ('week', 'month', 'quarter', 'year', 'one_time')),

  -- Localised pricing. NULL means the default market.
  market text check (market is null or market ~ '^[A-Z]{2}$'),

  effective_from timestamptz not null default now(),
  effective_until timestamptz,

  status text not null default 'draft'
    check (status in ('draft', 'active', 'retired')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint prices_window check (
    effective_until is null or effective_from <= effective_until
  ),
  -- A recurring price with a one_time interval, or vice versa, is a bug.
  constraint prices_interval_matches_owner check (
    (plan_version_id is null) or (billing_interval <> 'one_time')
  )
);

create index prices_product_idx on public.prices (product_id);
create index prices_plan_idx    on public.prices (plan_version_id);

create trigger prices_set_updated_at
  before update on public.prices
  for each row execute function public.set_updated_at();

-- Two live prices for the same thing in the same market would make checkout
-- non-deterministic.
create unique index prices_one_live_per_target
  on public.prices (
    coalesce(product_id, '00000000-0000-0000-0000-000000000000'),
    coalesce(plan_version_id, '00000000-0000-0000-0000-000000000000'),
    currency_code,
    coalesce(market, '--'),
    billing_interval
  )
  -- No now() here: an index predicate must be IMMUTABLE. Overlap in time is
  -- caught by the trigger below instead.
  where status = 'active';

-- Two active prices whose windows overlap would make checkout
-- non-deterministic, and an index cannot express "overlapping".
create or replace function public.reject_overlapping_price()
returns trigger
language plpgsql
as $$
declare
  v_clash integer;
begin
  if new.status <> 'active' then
    return new;
  end if;

  select count(*) into v_clash
    from public.prices p
   where p.id is distinct from new.id
     and p.status = 'active'
     and p.currency_code = new.currency_code
     and p.billing_interval = new.billing_interval
     and p.product_id is not distinct from new.product_id
     and p.plan_version_id is not distinct from new.plan_version_id
     and p.market is not distinct from new.market
     and (p.effective_until is null or p.effective_until > new.effective_from)
     and (new.effective_until is null or new.effective_until > p.effective_from);

  if v_clash > 0 then
    raise exception
      'another active price for this target, currency, market and interval overlaps this window'
      using errcode = 'unique_violation';
  end if;

  return new;
end;
$$;

create trigger prices_no_overlap
  before insert or update on public.prices
  for each row execute function public.reject_overlapping_price();

comment on table public.products is 'Sellable thing. Maps to exact course versions.';
comment on table public.plans is 'Stable subscription identity.';
comment on table public.plan_versions is 'Versioned terms, including explicit child allowance.';
comment on table public.prices is
  'D4: integer minor units plus an explicit ISO 4217 currency. Never a float.';
