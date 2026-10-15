-- Group 5 · orders
--
-- D4 (FROZEN): the original amount and currency are authoritative. Everything
-- else — fees, FX, settlement — is recorded alongside, never folded in.
--
-- Recorded rule: "Provider redirect alone is not proof of payment." An order
-- therefore never moves to paid because a browser came back. It moves because
-- a verified provider event produced a capture, and that path is a function.

create table public.orders (
  id uuid primary key default gen_random_uuid(),

  billing_account_id uuid not null
    references public.billing_accounts (id) on delete restrict,

  institution_id uuid references public.institutions (id) on delete restrict,

  -- D1. D4: the currency the customer was quoted and charged in.
  currency_code char(3) not null check (currency_code ~ '^[A-Z]{3}$'),

  subtotal_minor bigint not null default 0 check (subtotal_minor >= 0),
  discount_minor bigint not null default 0 check (discount_minor >= 0),
  tax_minor      bigint not null default 0 check (tax_minor >= 0),
  total_minor    bigint not null check (total_minor >= 0),

  status text not null default 'draft'
    check (status in
      ('draft', 'pending_payment', 'awaiting_confirmation', 'paid', 'partially_refunded',
       'refunded', 'cancelled', 'failed', 'expired')),

  placed_at timestamptz,
  paid_at timestamptz,
  cancelled_at timestamptz,

  -- Set by record_payment_success(), never by a client.
  payment_confirmed_by uuid references public.user_profiles (user_id) on delete set null,
  payment_evidence text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  constraint orders_totals_agree check (
    total_minor = subtotal_minor - discount_minor + tax_minor
  ),
  constraint orders_paid_agrees check (
    (paid_at is null) = (status not in ('paid', 'partially_refunded', 'refunded'))
  ),
  -- "Provider redirect alone is not proof of payment": a paid order must name
  -- who confirmed it and what they confirmed it against.
  constraint orders_paid_has_evidence check (
    status not in ('paid', 'partially_refunded', 'refunded')
    or (payment_confirmed_by is not null and payment_evidence is not null)
  ),
  constraint orders_cancelled_agrees check (
    (cancelled_at is null) = (status <> 'cancelled')
  )
);

create index orders_billing_idx on public.orders (billing_account_id);
create index orders_status_idx  on public.orders (status);

create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- order_items
--
-- "Accepted price" plus a snapshot, because the product and price rows move on
-- and the order must remain a record of what was actually sold.
-- ---------------------------------------------------------------------------
create table public.order_items (
  id uuid primary key default gen_random_uuid(),

  order_id uuid not null
    references public.orders (id) on delete cascade,

  product_id uuid references public.products (id) on delete restrict,
  plan_version_id uuid references public.plan_versions (id) on delete restrict,
  price_id uuid references public.prices (id) on delete restrict,

  constraint oi_single_target check (
    (product_id is not null) <> (plan_version_id is not null)
  ),

  quantity integer not null default 1 check (quantity > 0),

  unit_price_minor bigint not null check (unit_price_minor >= 0),
  currency_code char(3) not null check (currency_code ~ '^[A-Z]{3}$'),
  discount_minor bigint not null default 0 check (discount_minor >= 0),
  line_total_minor bigint not null check (line_total_minor >= 0),

  -- What was sold, frozen at checkout.
  item_snapshot jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  constraint oi_line_total_agrees check (
    line_total_minor = (unit_price_minor * quantity) - discount_minor
  )
);

create index order_items_order_idx on public.order_items (order_id);

-- The order currency is one currency. Mixed-currency lines would make the
-- total meaningless.
create or replace function public.enforce_order_currency()
returns trigger
language plpgsql
as $$
declare
  v_currency char(3);
begin
  select currency_code into v_currency from public.orders where id = new.order_id;
  if v_currency is distinct from new.currency_code then
    raise exception
      'order item currency % does not match order currency %',
      new.currency_code, v_currency
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger order_items_currency_match
  before insert or update of currency_code on public.order_items
  for each row execute function public.enforce_order_currency();

-- ---------------------------------------------------------------------------
-- order_adjustments — discounts, promotions, taxes, fees
-- ---------------------------------------------------------------------------
create table public.order_adjustments (
  id uuid primary key default gen_random_uuid(),

  order_id uuid not null
    references public.orders (id) on delete cascade,

  order_item_id uuid references public.order_items (id) on delete cascade,

  adjustment_type text not null
    check (adjustment_type in
      ('promotion', 'manual_discount', 'tax', 'fee', 'shipping', 'rounding')),

  amount_minor bigint not null,
  currency_code char(3) not null check (currency_code ~ '^[A-Z]{3}$'),

  -- Which way it moves the total.
  direction text not null default 'debit'
    check (direction in ('debit', 'credit')),

  promotion_redemption_id uuid
    references public.promotion_redemptions (id) on delete restrict,

  description text,

  created_at timestamptz not null default now(),

  constraint oa_promotion_agrees check (
    (adjustment_type = 'promotion') = (promotion_redemption_id is not null)
  )
);

create index order_adjustments_order_idx on public.order_adjustments (order_id);

-- ---------------------------------------------------------------------------
-- order_status_history — append-only
-- ---------------------------------------------------------------------------
create table public.order_status_history (
  id uuid primary key default gen_random_uuid(),

  order_id uuid not null
    references public.orders (id) on delete restrict,

  from_status text,
  to_status text not null,

  reason text,
  changed_by uuid references public.user_profiles (user_id) on delete set null,
  occurred_at timestamptz not null default now()
);

create index order_status_history_order_idx on public.order_status_history (order_id);

create or replace function public.reject_order_history_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception
    'order status history is append-only'
    using errcode = 'insufficient_privilege';
end;
$$;

create trigger order_status_history_append_only
  before update or delete on public.order_status_history
  for each row execute function public.reject_order_history_mutation();

create or replace function public.record_order_status_change()
returns trigger
language plpgsql
as $$
begin
  insert into public.order_status_history
    (order_id, from_status, to_status, reason, changed_by)
  values (new.id, old.status, new.status, new.payment_evidence, new.payment_confirmed_by);
  return new;
end;
$$;

create trigger orders_record_history
  after update of status on public.orders
  for each row
  when (new.status is distinct from old.status)
  execute function public.record_order_status_change();

comment on table public.orders is
  'D4: original currency and amount authoritative. Totals are checked, not trusted.';
comment on table public.order_items is
  'Accepted price plus a snapshot of what was sold, frozen at checkout.';
comment on table public.order_status_history is 'Append-only.';
