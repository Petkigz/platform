-- Group 5 · refunds, disputes, reconciliation and payouts
--
-- Recorded rules:
--   · a refund request is not a completed refund
--   · a refund cannot exceed the eligible captured amount net of prior refunds
--   · a refund does not delete learning history
--   · reconcile provider reports with internal movements
--   · manual payment confirmation records actor, evidence and audit

-- ---------------------------------------------------------------------------
-- The only path to a paid order
--
-- "Provider redirect alone is not proof of payment." This function is the
-- single writer of the paid state, and it requires a verified provider event
-- or an explicit manual confirmation with named evidence.
-- ---------------------------------------------------------------------------
create or replace function public.record_payment_success(
  p_order_id     uuid,
  p_actor_id     uuid,
  p_provider     text,
  p_reference    text,
  p_event_id     uuid default null,
  p_evidence     text default null
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
  v_event public.payment_provider_events;
  v_txn   public.financial_transactions;
  v_result public.orders;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'order % not found', p_order_id using errcode = 'no_data_found';
  end if;

  if v_order.status in ('paid', 'refunded', 'partially_refunded') then
    -- Idempotent: confirming twice is not an error, it is a retry.
    return v_order;
  end if;

  if p_event_id is not null then
    select * into v_event from public.payment_provider_events where id = p_event_id;
    if not found then
      raise exception 'provider event % not found', p_event_id using errcode = 'no_data_found';
    end if;
    if not v_event.signature_verified then
      raise exception
        'provider event % has not passed signature verification and cannot confirm a payment',
        p_event_id
        using errcode = 'check_violation';
    end if;
    if v_event.processing_status = 'processed' then
      raise exception
        'provider event % has already been processed; refusing to double-apply it',
        p_event_id
        using errcode = 'unique_violation';
    end if;
  elsif p_evidence is not null then
    if not public.is_privileged(p_actor_id) then
      raise exception
        'manual payment confirmation requires a privileged actor and written evidence'
        using errcode = 'insufficient_privilege';
    end if;
  else
    raise exception
      'a payment must be confirmed against a verified provider event or by a privileged actor with written evidence; a redirect is not proof'
      using errcode = 'check_violation';
  end if;

  insert into public.financial_transactions
    (order_id, billing_account_id, transaction_type, direction,
     amount_minor, currency_code, provider, provider_reference, status)
  values
    (p_order_id, v_order.billing_account_id, 'capture', 'credit',
     v_order.total_minor, v_order.currency_code, p_provider, p_reference, 'settled')
  returning * into v_txn;

  if p_event_id is not null then
    insert into public.transaction_provider_references
      (financial_transaction_id, provider, reference_type, reference_value)
    values (v_txn.id, p_provider, 'webhook', v_event.provider_event_id)
    on conflict do nothing;

    update public.payment_provider_events
       set processing_status = 'processed', processed_at = now()
     where id = p_event_id;
  end if;

  update public.orders
     set status = 'paid',
         paid_at = now(),
         payment_confirmed_by = p_actor_id,
         payment_evidence = coalesce(p_evidence,
                                     p_provider || ':' || coalesce(p_reference, 'provider_event'))
   where id = p_order_id
  returning * into v_result;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (p_actor_id, 'payment.confirmed', 'order', p_order_id,
          jsonb_build_object('provider', p_provider, 'reference', p_reference,
                             'amount_minor', v_order.total_minor,
                             'currency', v_order.currency_code));

  return v_result;
end;
$$;

revoke execute on function public.record_payment_success(uuid, uuid, text, text, uuid, text) from public, anon;
grant  execute on function public.record_payment_success(uuid, uuid, text, text, uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- refund_requests — the workflow, not the money
-- ---------------------------------------------------------------------------
create table public.refund_requests (
  id uuid primary key default gen_random_uuid(),

  order_id uuid not null
    references public.orders (id) on delete restrict,

  financial_transaction_id uuid
    references public.financial_transactions (id) on delete restrict,

  requested_amount_minor bigint not null check (requested_amount_minor > 0),
  currency_code char(3) not null check (currency_code ~ '^[A-Z]{3}$'),

  reason text not null check (length(trim(reason)) > 0),

  status text not null default 'requested'
    check (status in ('requested', 'approved', 'rejected', 'completed', 'withdrawn')),

  requested_by uuid not null
    references public.user_profiles (user_id) on delete restrict,
  decided_by uuid references public.user_profiles (user_id) on delete set null,
  decided_at timestamptz,
  decision_notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint rr_decision_agrees check (
    (decided_at is null) = (decided_by is null)
  ),
  -- The requester may not also approve their own refund.
  constraint rr_not_self_approved check (
    decided_by is null or decided_by <> requested_by
  )
);

create index refund_requests_order_idx on public.refund_requests (order_id);

create trigger refund_requests_set_updated_at
  before update on public.refund_requests
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- refund_transactions — the completed movement
-- ---------------------------------------------------------------------------
create table public.refund_transactions (
  id uuid primary key default gen_random_uuid(),

  refund_request_id uuid
    references public.refund_requests (id) on delete restrict,

  order_id uuid not null
    references public.orders (id) on delete restrict,

  capture_transaction_id uuid
    references public.financial_transactions (id) on delete restrict,

  amount_minor bigint not null check (amount_minor > 0),
  currency_code char(3) not null check (currency_code ~ '^[A-Z]{3}$'),

  provider text,
  provider_reference text,

  status text not null default 'pending'
    check (status in ('pending', 'completed', 'failed')),

  refunded_at timestamptz,
  processed_by uuid references public.user_profiles (user_id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint rt_completed_agrees check (
    (refunded_at is null) = (status <> 'completed')
  )
);

create trigger refund_transactions_set_updated_at
  before update on public.refund_transactions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- The refund ceiling
--
-- "A refund cannot exceed the eligible captured amount net of prior refunds
-- and reversals." Computed from financial_transactions, which is the ledger,
-- not from a cached balance that could drift.
-- ---------------------------------------------------------------------------
create or replace function public.refundable_amount(p_order_id uuid)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select greatest(
    coalesce(sum(ft.amount_minor) filter (
             where ft.transaction_type = 'capture' and ft.status <> 'failed'), 0)
    - coalesce(sum(ft.amount_minor) filter (
             where ft.transaction_type in ('refund', 'reversal', 'chargeback')
               and ft.status <> 'failed'), 0),
    0)
  from public.financial_transactions ft
  where ft.order_id = p_order_id;
$$;

create or replace function public.enforce_refund_ceiling()
returns trigger
language plpgsql
as $$
declare
  v_refundable bigint;
  v_pending    bigint;
begin
  select public.refundable_amount(new.order_id) into v_refundable;

  -- Other in-flight refunds count against the ceiling, or two concurrent
  -- requests could each pass and together over-refund.
  select coalesce(sum(rt.amount_minor), 0) into v_pending
    from public.refund_transactions rt
   where rt.order_id = new.order_id
     and rt.status = 'pending'
     and rt.id is distinct from new.id;

  if new.amount_minor + v_pending > v_refundable then
    raise exception
      'refund of % exceeds the refundable balance of % (pending refunds: %)',
      new.amount_minor, v_refundable, v_pending
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger refund_transactions_ceiling
  before insert or update of amount_minor on public.refund_transactions
  for each row execute function public.enforce_refund_ceiling();

-- A request may not ask for more than could possibly be refunded.
create or replace function public.enforce_refund_request_ceiling()
returns trigger
language plpgsql
as $$
declare
  v_refundable bigint;
begin
  if new.status <> 'requested' then
    return new;
  end if;
  select public.refundable_amount(new.order_id) into v_refundable;
  if new.requested_amount_minor > v_refundable then
    raise exception
      'refund request of % exceeds the refundable balance of %',
      new.requested_amount_minor, v_refundable
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger refund_requests_ceiling
  before insert on public.refund_requests
  for each row execute function public.enforce_refund_request_ceiling();

-- ---------------------------------------------------------------------------
-- A completed refund must reach the ledger
--
-- refundable_amount() is computed from financial_transactions, so a refund that
-- only lived in refund_transactions would not reduce the ceiling and the order
-- could be refunded twice. The ledger is the single source of truth for money
-- movement; refund_transactions is the workflow record.
-- ---------------------------------------------------------------------------
create or replace function public.record_refund_in_ledger()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'completed' and old.status is distinct from 'completed' then
    insert into public.financial_transactions
      (order_id, billing_account_id, transaction_type, direction,
       amount_minor, currency_code, provider, provider_reference, status, occurred_at)
    select new.order_id, o.billing_account_id, 'refund', 'debit',
           new.amount_minor, new.currency_code, new.provider, new.provider_reference,
           'settled', coalesce(new.refunded_at, now())
      from public.orders o where o.id = new.order_id;
  end if;

  if new.status <> 'completed' and old.status = 'completed' then
    raise exception
      'a completed refund cannot be un-completed; record a reversal instead'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger refund_transactions_ledger
  after insert or update of status on public.refund_transactions
  for each row execute function public.record_refund_in_ledger();

-- ---------------------------------------------------------------------------
-- disputes, adjustments, reconciliation
-- ---------------------------------------------------------------------------
create table public.payment_disputes (
  id uuid primary key default gen_random_uuid(),

  financial_transaction_id uuid not null
    references public.financial_transactions (id) on delete restrict,

  order_id uuid references public.orders (id) on delete restrict,

  dispute_type text not null
    check (dispute_type in ('chargeback', 'fraud', 'unauthorised', 'not_received', 'other')),

  provider text not null,
  provider_reference text,

  disputed_amount_minor bigint not null check (disputed_amount_minor > 0),
  currency_code char(3) not null check (currency_code ~ '^[A-Z]{3}$'),

  status text not null default 'open'
    check (status in ('open', 'under_review', 'evidence_submitted', 'won', 'lost', 'withdrawn')),

  opened_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolution_notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint pd_resolved_agrees check (
    (resolved_at is null) = (status not in ('won', 'lost', 'withdrawn'))
  )
);

create trigger payment_disputes_set_updated_at
  before update on public.payment_disputes
  for each row execute function public.set_updated_at();

create table public.financial_adjustments (
  id uuid primary key default gen_random_uuid(),

  order_id uuid references public.orders (id) on delete restrict,
  financial_transaction_id uuid references public.financial_transactions (id) on delete restrict,

  adjustment_type text not null
    check (adjustment_type in ('correction', 'write_off', 'goodwill_credit', 'fee_reversal', 'other')),

  amount_minor bigint not null check (amount_minor <> 0),
  currency_code char(3) not null check (currency_code ~ '^[A-Z]{3}$'),

  reason text not null check (length(trim(reason)) > 0),

  created_by uuid not null
    references public.user_profiles (user_id) on delete restrict,
  created_at timestamptz not null default now()
);

-- "Audited corrections without deleting history": an adjustment is a new row,
-- never an edit to the transaction it corrects.
create or replace function public.reject_adjustment_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception
    'financial adjustments are append-only; record another adjustment rather than editing this one'
    using errcode = 'insufficient_privilege';
end;
$$;

create trigger financial_adjustments_append_only
  before update or delete on public.financial_adjustments
  for each row execute function public.reject_adjustment_mutation();

create table public.payment_reconciliations (
  id uuid primary key default gen_random_uuid(),

  provider text not null,
  period_start date not null,
  period_end date not null,

  status text not null default 'open'
    check (status in ('open', 'in_progress', 'balanced', 'discrepancies_found', 'closed')),

  started_by uuid references public.user_profiles (user_id) on delete set null,
  started_at timestamptz not null default now(),
  closed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint pr_window check (period_start <= period_end)
);

create trigger payment_reconciliations_set_updated_at
  before update on public.payment_reconciliations
  for each row execute function public.set_updated_at();

create table public.payment_reconciliation_items (
  id uuid primary key default gen_random_uuid(),

  reconciliation_id uuid not null
    references public.payment_reconciliations (id) on delete cascade,

  financial_transaction_id uuid
    references public.financial_transactions (id) on delete set null,

  provider_reference text,

  internal_amount_minor bigint,
  provider_amount_minor bigint,
  currency_code char(3) check (currency_code ~ '^[A-Z]{3}$'),

  match_status text not null default 'unmatched'
    check (match_status in ('matched', 'unmatched', 'discrepant')),

  discrepancy_reason text,

  created_at timestamptz not null default now()
);

create index pri_reconciliation_idx
  on public.payment_reconciliation_items (reconciliation_id);

-- ---------------------------------------------------------------------------
-- instructor earnings and payouts
--
-- The marketplace needs a revenue split, and the record has no such column
-- anywhere. Earnings entries are the ledger; payouts are the movement.
-- ---------------------------------------------------------------------------
create table public.instructor_earnings_entries (
  id uuid primary key default gen_random_uuid(),

  instructor_user_id uuid not null
    references public.user_profiles (user_id) on delete restrict,

  order_id uuid references public.orders (id) on delete restrict,
  financial_transaction_id uuid references public.financial_transactions (id) on delete restrict,

  -- What the platform recorded as revenue for this sale.
  gross_amount_minor bigint not null check (gross_amount_minor >= 0),
  currency_code char(3) not null check (currency_code ~ '^[A-Z]{3}$'),

  -- The split, recorded explicitly so a later policy change cannot silently
  -- re-price a past sale.
  revenue_share_percent numeric(5,2) not null check (revenue_share_percent >= 0 and revenue_share_percent <= 100),
  net_amount_minor bigint not null check (net_amount_minor >= 0),

  status text not null default 'accrued'
    check (status in ('accrued', 'payable', 'paid', 'reversed')),

  accrued_at timestamptz not null default now(),

  constraint iee_split_agrees check (
    net_amount_minor = round(gross_amount_minor * revenue_share_percent / 100.0)
  )
);

create index iee_instructor_idx on public.instructor_earnings_entries (instructor_user_id);
create index iee_status_idx     on public.instructor_earnings_entries (status);

create table public.instructor_payouts (
  id uuid primary key default gen_random_uuid(),

  instructor_user_id uuid not null
    references public.user_profiles (user_id) on delete restrict,

  amount_minor bigint not null check (amount_minor > 0),
  currency_code char(3) not null check (currency_code ~ '^[A-Z]{3}$'),

  destination_hint text,

  status text not null default 'scheduled'
    check (status in ('scheduled', 'processing', 'completed', 'failed', 'cancelled')),

  scheduled_at timestamptz not null default now(),
  completed_at timestamptz,

  provider text,
  provider_reference text,

  created_by uuid not null
    references public.user_profiles (user_id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint ip_completed_agrees check (
    (completed_at is null) = (status <> 'completed')
  )
);

create trigger instructor_payouts_set_updated_at
  before update on public.instructor_payouts
  for each row execute function public.set_updated_at();

create table public.instructor_payout_items (
  id uuid primary key default gen_random_uuid(),

  payout_id uuid not null
    references public.instructor_payouts (id) on delete cascade,

  earnings_entry_id uuid not null
    references public.instructor_earnings_entries (id) on delete restrict,

  amount_minor bigint not null check (amount_minor > 0)
);

create unique index ipi_one_per_earning
  on public.instructor_payout_items (earnings_entry_id);

-- An earning may only be paid out once, and the item amount must match.
create or replace function public.validate_payout_item()
returns trigger
language plpgsql
as $$
declare
  v_earning public.instructor_earnings_entries;
  v_payout  public.instructor_payouts;
begin
  select * into v_earning from public.instructor_earnings_entries
   where id = new.earnings_entry_id for update;

  select * into v_payout from public.instructor_payouts where id = new.payout_id;

  if v_earning.status = 'paid' then
    raise exception 'earnings entry % has already been paid out', new.earnings_entry_id
      using errcode = 'check_violation';
  end if;

  if v_earning.instructor_user_id <> v_payout.instructor_user_id then
    raise exception
      'earnings entry % belongs to %, not to the payout recipient',
      new.earnings_entry_id, v_earning.instructor_user_id
      using errcode = 'check_violation';
  end if;

  if new.amount_minor <> v_earning.net_amount_minor then
    raise exception
      'payout item % does not match the net earning of %',
      new.amount_minor, v_earning.net_amount_minor
      using errcode = 'check_violation';
  end if;

  update public.instructor_earnings_entries
     set status = 'paid'
   where id = new.earnings_entry_id;

  return new;
end;
$$;

create trigger instructor_payout_items_validate
  before insert on public.instructor_payout_items
  for each row execute function public.validate_payout_item();

comment on table public.refund_requests is 'The workflow. Approving a request does not move money.';
comment on table public.refund_transactions is 'The movement. Capped at captured minus prior refunds and reversals.';
comment on table public.financial_adjustments is 'Append-only corrections. The original transaction is never edited.';
comment on table public.instructor_earnings_entries is 'The revenue split, recorded per sale so a policy change cannot reprice history.';
comment on function public.record_payment_success(uuid, uuid, text, text, uuid, text) is
  'The only path to a paid order. Requires a verified provider event, or a privileged actor with written evidence.';
comment on function public.refundable_amount(uuid) is
  'Captured minus refunded, reversed and charged back, computed from the ledger.';
