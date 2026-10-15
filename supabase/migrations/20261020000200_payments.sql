-- Group 5 · payments
--
-- Recorded rules, each of which is enforced rather than documented:
--   · verify and idempotently process provider callbacks
--   · provider redirect alone is not proof of payment
--   · original currency/amount authoritative; settlement separate
--   · record fees and FX source/rate/timestamp
--   · reconcile uncertain provider outcomes before unsafe retry

-- ---------------------------------------------------------------------------
-- payment_provider_accounts
--
-- "Secrets stored outside DB." Only references live here.
-- ---------------------------------------------------------------------------
create table public.payment_provider_accounts (
  id uuid primary key default gen_random_uuid(),

  provider text not null
    check (provider in ('mtn_momo', 'airtel_money', 'stripe', 'paypal', 'flutterwave',
                        'pesapal', 'manual', 'other')),

  label text not null check (length(trim(label)) > 0),

  market text check (market is null or market ~ '^[A-Z]{2}$'),
  currency_code char(3) check (currency_code is null or currency_code ~ '^[A-Z]{3}$'),

  -- Where the credential lives: a vault path or an env var name. Never the
  -- credential itself.
  secret_reference text not null check (length(trim(secret_reference)) > 0),

  status text not null default 'active'
    check (status in ('active', 'disabled')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger payment_provider_accounts_set_updated_at
  before update on public.payment_provider_accounts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- payment_attempts
-- ---------------------------------------------------------------------------
create table public.payment_attempts (
  id uuid primary key default gen_random_uuid(),

  order_id uuid not null
    references public.orders (id) on delete restrict,

  provider_account_id uuid
    references public.payment_provider_accounts (id) on delete restrict,

  amount_minor bigint not null check (amount_minor > 0),
  currency_code char(3) not null check (currency_code ~ '^[A-Z]{3}$'),

  provider text not null,
  method text check (method in ('mobile_money', 'card', 'bank_transfer', 'ussd', 'wallet', 'cash', 'other')),

  provider_reference text,

  status text not null default 'pending'
    check (status in
      ('pending', 'requires_action', 'processing', 'succeeded', 'failed', 'cancelled', 'expired')),

  -- The client supplies this so a retried request cannot create a second
  -- charge. Unique per order, not globally.
  idempotency_key text not null check (length(trim(idempotency_key)) > 0),

  -- A code safe to show a user. The raw provider error goes to the audit log,
  -- not to a learner in Kampala on a bad connection.
  safe_error_code text,

  initiated_at timestamptz not null default now(),
  resolved_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint pa_resolved_agrees check (
    (resolved_at is null) = (status in ('pending', 'requires_action', 'processing'))
  )
);

create unique index payment_attempts_idempotency_key
  on public.payment_attempts (order_id, idempotency_key);

create index payment_attempts_order_idx on public.payment_attempts (order_id);

create trigger payment_attempts_set_updated_at
  before update on public.payment_attempts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- payment_provider_events
--
-- "Durable deduplicated callback inbox." A provider will deliver the same
-- event more than once; the unique index is what makes processing idempotent
-- rather than a comment in the webhook handler saying it is.
-- ---------------------------------------------------------------------------
create table public.payment_provider_events (
  id uuid primary key default gen_random_uuid(),

  provider text not null,
  provider_event_id text not null check (length(trim(provider_event_id)) > 0),

  event_type text not null,

  payload jsonb not null default '{}'::jsonb,

  -- A provider signature is verified before the row is written. Recording the
  -- result keeps an audit trail of what was accepted.
  signature_verified boolean not null default false,

  processing_status text not null default 'received'
    check (processing_status in ('received', 'processing', 'processed', 'failed', 'ignored')),

  processed_at timestamptz,
  processing_error text,

  received_at timestamptz not null default now()
);

create unique index payment_provider_events_dedupe
  on public.payment_provider_events (provider, provider_event_id);

create index payment_provider_events_status_idx
  on public.payment_provider_events (processing_status);

-- ---------------------------------------------------------------------------
-- payment_method_references — non-sensitive tokens only
-- ---------------------------------------------------------------------------
create table public.payment_method_references (
  id uuid primary key default gen_random_uuid(),

  billing_account_id uuid not null
    references public.billing_accounts (id) on delete cascade,

  provider text not null,

  -- A provider token, not a card number or PIN.
  provider_token text not null check (length(trim(provider_token)) > 0),

  -- Display-only hint: last four digits, or a masked phone number.
  display_hint text,

  status text not null default 'active'
    check (status in ('active', 'revoked')),

  consented_at timestamptz not null default now(),
  revoked_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint pmr_consent_agrees check (
    (status = 'revoked') = (revoked_at is not null)
  )
);

create unique index pmr_one_per_token
  on public.payment_method_references (provider, provider_token);

create trigger pmr_set_updated_at
  before update on public.payment_method_references
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- financial_transactions
--
-- Captures, refunds, reversals, chargebacks, provider fees and settlement
-- movements. The original amount and the settlement amount are separate
-- columns with separate currencies, and the FX that connects them is recorded
-- with its source and timestamp.
-- ---------------------------------------------------------------------------
create table public.financial_transactions (
  id uuid primary key default gen_random_uuid(),

  order_id uuid references public.orders (id) on delete restrict,
  payment_attempt_id uuid references public.payment_attempts (id) on delete restrict,
  billing_account_id uuid references public.billing_accounts (id) on delete restrict,

  transaction_type text not null
    check (transaction_type in
      ('capture', 'refund', 'reversal', 'chargeback', 'provider_fee',
       'settlement', 'adjustment', 'payout')),

  direction text not null check (direction in ('debit', 'credit')),

  -- Authoritative: what the customer was charged.
  amount_minor bigint not null check (amount_minor > 0),
  currency_code char(3) not null check (currency_code ~ '^[A-Z]{3}$'),

  -- Separate: what actually landed.
  settlement_amount_minor bigint check (settlement_amount_minor is null or settlement_amount_minor >= 0),
  settlement_currency char(3) check (settlement_currency is null or settlement_currency ~ '^[A-Z]{3}$'),

  fee_minor bigint check (fee_minor is null or fee_minor >= 0),
  fee_currency char(3) check (fee_currency is null or fee_currency ~ '^[A-Z]{3}$'),

  -- FX, with its provenance. A rate without a source and a timestamp is not
  -- auditable.
  fx_rate numeric(18,8) check (fx_rate is null or fx_rate > 0),
  fx_source text,
  fx_observed_at timestamptz,

  provider text,
  provider_reference text,

  status text not null default 'pending'
    check (status in ('pending', 'settled', 'failed', 'reversed')),

  occurred_at timestamptz not null default now(),

  constraint ft_settlement_agrees check (
    (settlement_amount_minor is null) = (settlement_currency is null)
  ),
  constraint ft_fx_agrees check (
    (fx_rate is null) = (fx_source is null)
  ),
  -- A settlement figure without FX provenance cannot be audited.
  constraint ft_settlement_needs_fx check (
    settlement_amount_minor is null or currency_code = settlement_currency
    or fx_rate is not null
  )
);

create index ft_order_idx on public.financial_transactions (order_id);
create index ft_type_idx  on public.financial_transactions (transaction_type);

-- ---------------------------------------------------------------------------
-- transaction_provider_references
-- ---------------------------------------------------------------------------
create table public.transaction_provider_references (
  id uuid primary key default gen_random_uuid(),

  financial_transaction_id uuid not null
    references public.financial_transactions (id) on delete cascade,

  provider text not null,
  reference_type text not null
    check (reference_type in ('transaction', 'settlement', 'dispute', 'payout', 'webhook')),
  reference_value text not null check (length(trim(reference_value)) > 0),

  created_at timestamptz not null default now()
);

create unique index tpr_one_per_reference
  on public.transaction_provider_references (provider, reference_type, reference_value);

-- ---------------------------------------------------------------------------
-- currency_exchange_rates
-- ---------------------------------------------------------------------------
create table public.currency_exchange_rates (
  id uuid primary key default gen_random_uuid(),

  base_currency char(3) not null check (base_currency ~ '^[A-Z]{3}$'),
  quote_currency char(3) not null check (quote_currency ~ '^[A-Z]{3}$'),

  rate numeric(18,8) not null check (rate > 0),

  source text not null check (length(trim(source)) > 0),
  observed_at timestamptz not null default now(),

  created_at timestamptz not null default now(),

  constraint cer_not_self check (base_currency <> quote_currency)
);

create index cer_pair_idx
  on public.currency_exchange_rates (base_currency, quote_currency, observed_at desc);

comment on table public.payment_provider_events is
  'Deduplicated callback inbox. The unique index, not a comment, is what makes processing idempotent.';
comment on table public.financial_transactions is
  'D4: original amount authoritative, settlement separate, FX recorded with source and timestamp.';
