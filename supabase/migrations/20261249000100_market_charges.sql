-- Tax and transfer fees, charged where the buyer is and paid by the buyer.
-- Decided 2026-10-22.
--
-- `orders` has carried `tax_minor` and `fee_minor` since it was written, and
-- `order_adjustments` has had `tax` and `fee` types the whole time. Nothing ever
-- wrote either, so every order this platform has priced has been taxed at zero
-- and has had its payment-provider cost absorbed. Both are now real, and both
-- follow one rule: **the buyer pays, and the amount depends on where they are.**
--
-- WHERE THE AMOUNT COMES FROM
-- ---------------------------
-- `market_charges` is a register, not a formula in code. A row says: for this
-- country (or everywhere), in this currency (or any), this kind of charge is
-- this percentage plus this fixed amount, clamped between these bounds, from
-- this date. The owner maintains it from `/admin/tax`; nothing here hard-codes a
-- rate, because a rate is a fact about a jurisdiction and jurisdictions change
-- without telling the software.
--
-- **No rule means no charge.** That is deliberate and it is the safe default: a
-- platform that has registered for VAT nowhere must not invent a tax line, and a
-- missing row cannot overcharge anybody. When registration happens, a row is
-- added and the next order carries it.
--
-- The country is the buyer's, resolved exactly as the price is — the billing
-- account's country once recorded, otherwise the connection's. A charge is
-- therefore never a value the browser can assert.
--
-- WHAT IS TAXED
-- -------------
-- Tax is computed on the amount actually payable for the goods: the items, less
-- live discounts and promotions. Charging tax on a price the buyer did not pay
-- is the classic way a discount becomes a lie.
--
-- The transfer fee is computed on the amount being moved — goods plus tax — which
-- is what a payment processor charges a percentage of. It is a `fee` adjustment,
-- so `recompute_order_totals()` already adds it into the total, and
-- `describeOrderBreakdown()` already prints it.
--
-- WHY THE ADJUSTMENT CARRIES `rule_id`
-- ------------------------------------
-- A tax line is not a discretionary discount. If it were an ordinary adjustment,
-- somebody could void it, or a later promotion could be applied without the tax
-- being recalculated, and the order would quietly stop being correct.
--
-- So a computed charge records which rule produced it. A row with a `rule_id` is
-- **derived**: the system recalculates it whenever the payable amount changes,
-- and refuses to let it be voided by hand. A row without one is a human
-- decision and the system never touches it. That distinction is what makes
-- "recalculate the tax" safe to do automatically.

-- ---------------------------------------------------------------------------
-- the register
-- ---------------------------------------------------------------------------
create table if not exists public.market_charges (
  id uuid primary key default gen_random_uuid(),

  -- 'tax' is a levy owed to a jurisdiction. 'transfer_fee' is what it costs to
  -- move the money, which the buyer bears rather than the platform absorbing it.
  kind text not null check (kind in ('tax', 'transfer_fee')),

  -- NULL means everywhere. A rule with a country beats one without, and a rule
  -- with a currency beats one without, independently — the same precedence
  -- `prices.market` uses, so there is one mental model for "which row wins".
  country_code text check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  currency_code text check (currency_code is null or currency_code ~ '^[A-Z]{3}$'),

  -- What the payer reads on the breakdown: 'VAT', 'GST', 'Mobile money fee'.
  label text not null check (length(btrim(label)) > 0),

  -- Basis points, so 1800 is 18%. Integer, not numeric, because a rate is a
  -- published number and a float invites a rounding conversation nobody wants.
  rate_bps integer not null default 0 check (rate_bps between 0 and 10000),
  fixed_minor bigint not null default 0 check (fixed_minor >= 0),

  -- Optional clamp. A processor that charges 1% with a 500 floor and a 5,000
  -- ceiling is three numbers, and all three belong on the rule rather than in
  -- the caller's head.
  min_minor bigint check (min_minor is null or min_minor >= 0),
  max_minor bigint check (max_minor is null or max_minor >= 0),

  effective_from timestamptz not null default now(),
  effective_to   timestamptz,

  status text not null default 'active' check (status in ('active', 'retired')),

  -- The sentence a support agent reads. "KRA VAT registration, certificate
  -- number in the shared drive" is a better note than any column.
  note text,

  created_by uuid references public.user_profiles (user_id) on delete set null,
  updated_by uuid references public.user_profiles (user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint mc_needs_a_charge check (rate_bps > 0 or fixed_minor > 0),
  constraint mc_window_ordered
    check (effective_to is null or effective_to > effective_from),
  constraint mc_bounds_ordered
    check (min_minor is null or max_minor is null or max_minor >= min_minor),
  constraint mc_retired_has_end
    check (status <> 'retired' or effective_to is not null)
);

comment on table public.market_charges is
  'Tax and transfer-fee rules by country and currency. No rule means no charge: '
  'a jurisdiction this platform has not registered in is not taxed.';

comment on column public.market_charges.rate_bps is
  'Basis points. 1800 is 18%. Integer so a published rate cannot drift by a float.';

-- One live rule per (kind, country, currency). The coalesce is what makes NULL
-- behave as the named default rather than as "not equal to anything" — without
-- it, two global rules for the same kind could both be active and which one won
-- would be decided by the planner.
create unique index if not exists market_charges_one_live
  on public.market_charges
     (kind, coalesce(country_code, '*'), coalesce(currency_code, '*'))
  where status = 'active';

create index if not exists market_charges_lookup
  on public.market_charges (kind, country_code, currency_code)
  where status = 'active';

drop trigger if exists market_charges_set_updated_at on public.market_charges;
create trigger market_charges_set_updated_at
  before update on public.market_charges
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
-- A published tax rate is not a secret — it is on the receipt. Reading is open
-- to any signed-in person so the admin screen and the checkout can both read
-- the register directly. Writing has no policy at all: the only writers are the
-- two definer functions below, so every change is role-checked and audited in
-- one place.
alter table public.market_charges enable row level security;

drop policy if exists market_charges_read on public.market_charges;
create policy market_charges_read on public.market_charges
  for select to authenticated
  using (true);

revoke all on public.market_charges from anon, authenticated;
grant select on public.market_charges to authenticated;

-- ---------------------------------------------------------------------------
-- which rule applies
-- ---------------------------------------------------------------------------
create or replace function public.market_charge_for(
  p_kind     text,
  p_country  text,
  p_currency text,
  p_at       timestamptz default now()
)
returns public.market_charges
language sql
stable
set search_path = public
as $$
  select mc.*
    from public.market_charges mc
   where mc.kind = p_kind
     and mc.status = 'active'
     and mc.effective_from <= p_at
     and (mc.effective_to is null or mc.effective_to > p_at)
     -- NULL on the rule means "anywhere"/"any currency"; a code must match.
     and (mc.country_code is null or mc.country_code = upper(btrim(coalesce(p_country, ''))))
     and (mc.currency_code is null or mc.currency_code = upper(btrim(coalesce(p_currency, ''))))
   order by (mc.country_code is not null) desc,
            (mc.currency_code is not null) desc,
            mc.effective_from desc
   limit 1;
$$;

-- ---------------------------------------------------------------------------
-- one charge, worked out
-- ---------------------------------------------------------------------------
-- Kept as its own function so the rounding rule exists once. `round()` in
-- Postgres is half-away-from-zero on numeric, which is the convention every tax
-- authority this platform might meet uses; doing it in floating point would
-- make a one-cent difference on some inputs and not others.
create or replace function public.market_charge_amount(
  p_kind     text,
  p_country  text,
  p_currency text,
  p_base     bigint,
  p_at       timestamptz default now()
)
returns jsonb
language plpgsql
stable
set search_path = public
as $$
declare
  v_rule   public.market_charges;
  v_amount bigint;
begin
  if p_base is null or p_base <= 0 then
    return null;
  end if;

  v_rule := public.market_charge_for(p_kind, p_country, p_currency, p_at);
  if v_rule.id is null then
    return null;
  end if;

  v_amount := round(p_base::numeric * v_rule.rate_bps / 10000.0)::bigint
              + v_rule.fixed_minor;

  if v_rule.min_minor is not null then
    v_amount := greatest(v_amount, v_rule.min_minor);
  end if;
  if v_rule.max_minor is not null then
    v_amount := least(v_amount, v_rule.max_minor);
  end if;

  -- A clamp can legitimately arrive at zero; a row of nothing is not worth
  -- printing on a receipt.
  if v_amount <= 0 then
    return null;
  end if;

  return jsonb_build_object(
    'ruleId',      v_rule.id::text,
    'kind',        v_rule.kind,
    'label',       v_rule.label,
    'rateBps',     v_rule.rate_bps,
    'fixedMinor',  v_rule.fixed_minor::text,
    'amountMinor', v_amount::text,
    'countryCode', v_rule.country_code,
    'currencyCode', v_rule.currency_code
  );
end;
$$;

revoke all on function public.market_charge_amount(text, text, text, bigint, timestamptz) from public;

-- ---------------------------------------------------------------------------
-- what this buyer would be charged
-- ---------------------------------------------------------------------------
-- The read side. `quote_course_order()` and the checkout screen call this, and
-- so does `refresh_order_charges()` — one calculation, so the price shown and
-- the price charged cannot come from different arithmetic.
--
-- `p_base_minor` is what the goods cost **after** discounts. Tax is a percentage
-- of that; the transfer fee is a percentage of goods plus tax, because that is
-- the amount a processor actually moves.
create or replace function public.quote_market_charges(
  p_country  text,
  p_currency text,
  p_base_minor bigint
)
returns jsonb
language plpgsql
stable
set search_path = public
as $$
declare
  v_tax jsonb;
  v_fee jsonb;
  v_tax_minor bigint := 0;
  v_fee_minor bigint := 0;
begin
  if p_base_minor is null or p_base_minor < 0 then
    raise exception 'a charge needs an amount to apply to'
      using errcode = 'invalid_parameter_value';
  end if;

  v_tax := public.market_charge_amount('tax', p_country, p_currency, p_base_minor);
  if v_tax is not null then
    v_tax_minor := (v_tax ->> 'amountMinor')::bigint;
  end if;

  v_fee := public.market_charge_amount(
    'transfer_fee', p_country, p_currency, p_base_minor + v_tax_minor);
  if v_fee is not null then
    v_fee_minor := (v_fee ->> 'amountMinor')::bigint;
  end if;

  return jsonb_build_object(
    'country',      nullif(upper(btrim(coalesce(p_country, ''))), ''),
    'currencyCode', upper(btrim(coalesce(p_currency, ''))),
    'baseMinor',    p_base_minor::text,
    'taxMinor',     v_tax_minor::text,
    'feeMinor',     v_fee_minor::text,
    'chargedMinor', (v_tax_minor + v_fee_minor)::text,
    'totalMinor',   (p_base_minor + v_tax_minor + v_fee_minor)::text,
    'tax',          v_tax,
    'fee',          v_fee
  );
end;
$$;

revoke all on function public.quote_market_charges(text, text, bigint) from public, anon;
grant execute on function public.quote_market_charges(text, text, bigint) to authenticated;

comment on function public.quote_market_charges(text, text, bigint) is
  'The tax and transfer fee this buyer would be charged on a given taxable '
  'amount, from the market_charges register. No rule means no charge.';

-- ---------------------------------------------------------------------------
-- a computed charge cannot be voided by hand
-- ---------------------------------------------------------------------------
alter table public.order_adjustments
  add column if not exists rule_id uuid
    references public.market_charges (id) on delete restrict;

comment on column public.order_adjustments.rule_id is
  'Set when the row was computed from a market_charges rule. Such a row is '
  'derived: it is recalculated when the payable amount changes, may not be '
  'voided by hand, and disappears when its rule stops applying. NULL means a '
  'person put it there.';

create or replace function public.protect_computed_charge()
returns trigger
language plpgsql
as $$
begin
  if old.rule_id is not null and (
       new.voided_at is distinct from old.voided_at
       or new.amount_minor is distinct from old.amount_minor
       or new.adjustment_type is distinct from old.adjustment_type
     ) then
    raise exception
      'this is a calculated % line; change the rule for the market instead of editing the order',
      old.adjustment_type
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

drop trigger if exists order_adjustments_protect_computed on public.order_adjustments;
create trigger order_adjustments_protect_computed
  before update on public.order_adjustments
  for each row execute function public.protect_computed_charge();

-- ---------------------------------------------------------------------------
-- apply the register to one order
-- ---------------------------------------------------------------------------
-- Recalculates rather than appends, so calling it twice is harmless and the
-- order's tax can never double. Refuses once the order has been paid, because
-- at that point a ledger row exists for the old total and a silent recalculation
-- would make the order and the money disagree.
create or replace function public.refresh_order_charges(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order    public.orders;
  v_country  text;
  v_subtotal bigint;
  v_discount bigint;
  v_quoted   jsonb;
begin
  select * into v_order from public.orders o where o.id = p_order_id;
  if not found then
    raise exception 'that order does not exist' using errcode = 'no_data_found';
  end if;

  -- History is history. A paid order keeps the tax it was charged; a correction
  -- after payment is a financial adjustment or a refund, in writing.
  if v_order.status not in ('draft', 'pending_payment', 'awaiting_confirmation') then
    return jsonb_build_object(
      'orderId', p_order_id,
      'skipped', true,
      'reason',  'the order is ' || v_order.status || '; its charges are history'
    );
  end if;

  -- The country that priced the order. `billing_accounts.billing_country` is
  -- authoritative once recorded, and the order belongs to exactly one account.
  select ba.billing_country
    into v_country
    from public.billing_accounts ba
   where ba.id = v_order.billing_account_id;

  select coalesce(sum(oi.line_total_minor), 0)::bigint
    into v_subtotal
    from public.order_items oi
   where oi.order_id = p_order_id;

  select coalesce(sum(oa.amount_minor), 0)::bigint
    into v_discount
    from public.order_adjustments oa
   where oa.order_id = p_order_id
     and oa.voided_at is null
     and oa.direction = 'credit';

  v_quoted := public.quote_market_charges(
    v_country, v_order.currency_code, greatest(v_subtotal - v_discount, 0));

  -- Remove what this function wrote last time; leave every human row alone.
  delete from public.order_adjustments
   where order_id = p_order_id
     and rule_id is not null;

  if (v_quoted ->> 'tax') is not null then
    insert into public.order_adjustments
      (order_id, adjustment_type, amount_minor, currency_code, direction,
       description, rule_id)
    values
      (p_order_id, 'tax', (v_quoted ->> 'taxMinor')::bigint, v_order.currency_code,
       'debit',
       coalesce(v_quoted -> 'tax' ->> 'label', 'Tax'),
       (v_quoted -> 'tax' ->> 'ruleId')::uuid);
  end if;

  if (v_quoted ->> 'fee') is not null then
    insert into public.order_adjustments
      (order_id, adjustment_type, amount_minor, currency_code, direction,
       description, rule_id)
    values
      (p_order_id, 'fee', (v_quoted ->> 'feeMinor')::bigint, v_order.currency_code,
       'debit',
       coalesce(v_quoted -> 'fee' ->> 'label', 'Payment fee'),
       (v_quoted -> 'fee' ->> 'ruleId')::uuid);
  end if;

  return public.recompute_order_totals(p_order_id);
end;
$$;

revoke all on function public.refresh_order_charges(uuid) from public, anon, authenticated;

comment on function public.refresh_order_charges(uuid) is
  'Recalculates an unpaid order''s tax and transfer fee from the market_charges '
  'register and rewrites the totals. Only the rows it wrote itself (rule_id is '
  'not null) are removed, so a manual discount is never lost. Not callable by a '
  'client: it is arithmetic, not an instruction.';

-- Any change to a discount re-derives the charges. This is the seam that keeps
-- tax correct when a code is applied to an existing order — the alternative was
-- to teach each of the four writers to remember, and one of them would not.
-- `new.rule_id is not null` is what stops the insert below from recursing.
create or replace function public.refresh_charges_after_adjustment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.refresh_order_charges(new.order_id);
  return null;
end;
$$;

drop trigger if exists order_adjustments_refresh_charges on public.order_adjustments;
create trigger order_adjustments_refresh_charges
  after insert or update on public.order_adjustments
  for each row
  when (new.rule_id is null)
  execute function public.refresh_charges_after_adjustment();

-- ---------------------------------------------------------------------------
-- the owner's controls
-- ---------------------------------------------------------------------------
-- Every routine change has to be doable on a screen by the person allowed to
-- make it. These two functions are what `/admin/tax` calls; the role pair is the
-- same one that may adjust an order, because a tax rate moves money.
create or replace function public.set_market_charge(
  p_kind          text,
  p_country       text default null,
  p_currency      text default null,
  p_label         text default null,
  p_rate_bps      integer default 0,
  p_fixed_minor   bigint default 0,
  p_min_minor     bigint default null,
  p_max_minor     bigint default null,
  p_effective_from timestamptz default null,
  p_note          text default null,
  p_id            uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
  v_row   public.market_charges;
begin
  if v_actor is null then
    raise exception 'sign in to change a charge'
      using errcode = 'insufficient_privilege';
  end if;
  if not (public.has_role(v_actor, 'platform_admin')
          or public.has_role(v_actor, 'finance_admin')) then
    raise exception 'only a finance admin or platform admin may change a tax or fee rule'
      using errcode = 'insufficient_privilege';
  end if;

  if p_kind is null or p_kind not in ('tax', 'transfer_fee') then
    raise exception 'a charge is either a tax or a transfer fee'
      using errcode = 'invalid_parameter_value';
  end if;
  if nullif(btrim(coalesce(p_label, '')), '') is null then
    raise exception 'give the charge the name the payer will read'
      using errcode = 'invalid_parameter_value';
  end if;

  if p_id is null then
    insert into public.market_charges
      (kind, country_code, currency_code, label, rate_bps, fixed_minor,
       min_minor, max_minor, effective_from, note, created_by, updated_by)
    values
      (p_kind,
       nullif(upper(btrim(coalesce(p_country, ''))), ''),
       nullif(upper(btrim(coalesce(p_currency, ''))), ''),
       btrim(p_label), p_rate_bps, p_fixed_minor, p_min_minor, p_max_minor,
       coalesce(p_effective_from, now()), nullif(btrim(coalesce(p_note, '')), ''),
       v_actor, v_actor)
    returning * into v_row;
  else
    update public.market_charges
       set kind           = p_kind,
           country_code   = nullif(upper(btrim(coalesce(p_country, ''))), ''),
           currency_code  = nullif(upper(btrim(coalesce(p_currency, ''))), ''),
           label          = btrim(p_label),
           rate_bps       = p_rate_bps,
           fixed_minor    = p_fixed_minor,
           min_minor      = p_min_minor,
           max_minor      = p_max_minor,
           effective_from = coalesce(p_effective_from, effective_from),
           note           = nullif(btrim(coalesce(p_note, '')), ''),
           updated_by     = v_actor
     where id = p_id
       and status = 'active'
    returning * into v_row;

    if v_row.id is null then
      raise exception 'that rule is retired; add a new one instead of editing history'
        using errcode = 'invalid_parameter_value';
    end if;
  end if;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (
    v_actor,
    case when p_id is null then 'commerce.charge_rule_added'
         else 'commerce.charge_rule_changed' end,
    'market_charge', v_row.id,
    jsonb_build_object(
      'kind', v_row.kind,
      'countryCode', v_row.country_code,
      'currencyCode', v_row.currency_code,
      'label', v_row.label,
      'rateBps', v_row.rate_bps,
      'fixedMinor', v_row.fixed_minor::text
    ));

  return to_jsonb(v_row);
end;
$$;

revoke all on function public.set_market_charge(text, text, text, text, integer, bigint, bigint, bigint, timestamptz, text, uuid) from public, anon;
grant execute on function public.set_market_charge(text, text, text, text, integer, bigint, bigint, bigint, timestamptz, text, uuid) to authenticated;

create or replace function public.retire_market_charge(
  p_id     uuid,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
  v_row   public.market_charges;
  v_why   text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if v_actor is null then
    raise exception 'sign in to retire a charge'
      using errcode = 'insufficient_privilege';
  end if;
  if not (public.has_role(v_actor, 'platform_admin')
          or public.has_role(v_actor, 'finance_admin')) then
    raise exception 'only a finance admin or platform admin may retire a tax or fee rule'
      using errcode = 'insufficient_privilege';
  end if;
  if v_why is null then
    raise exception 'say why this rule is being retired'
      using errcode = 'invalid_parameter_value';
  end if;

  update public.market_charges
     set status = 'retired',
         effective_to = greatest(now(), effective_from),
         note = coalesce(note || E'\n', '') || 'Retired: ' || v_why,
         updated_by = v_actor
   where id = p_id
     and status = 'active'
  returning * into v_row;

  if v_row.id is null then
    raise exception 'that rule is already retired or does not exist'
      using errcode = 'invalid_parameter_value';
  end if;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'commerce.charge_rule_retired', 'market_charge', v_row.id,
          jsonb_build_object('reason', v_why));

  return to_jsonb(v_row);
end;
$$;

revoke all on function public.retire_market_charge(uuid, text) from public, anon;
grant execute on function public.retire_market_charge(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- the two order-side functions, so the quote and the charge use the register
-- ---------------------------------------------------------------------------
-- Re-created only to add the charges. Every rule inside them is unchanged.

create or replace function public.create_course_order(
  p_course_id          uuid,
  p_learner_profile_id uuid,
  p_buyer_country      text default null,
  p_promotion_code     text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor        uuid := public.current_user_id();
  v_checkout     jsonb;
  v_country      text;
  v_version      uuid;
  v_course_title text;
  v_price_id     uuid;
  v_amount       bigint;
  v_currency     text;
  v_matched      text;
  v_product      uuid;
  v_product_name text;
  v_account      uuid;
  v_account_country  text;
  v_account_currency text;
  v_account_name text;
  v_order        uuid;
  v_item         uuid;
  v_promo        jsonb := null;
  v_charges      jsonb := null;
begin
  v_checkout := public.resolve_course_checkout(
    p_course_id, p_learner_profile_id, p_buyer_country);

  v_country          := v_checkout ->> 'country';
  v_version          := (v_checkout ->> 'courseVersionId')::uuid;
  v_course_title     := v_checkout ->> 'courseTitle';
  v_price_id         := (v_checkout ->> 'priceId')::uuid;
  v_amount           := (v_checkout ->> 'amountMinor')::bigint;
  v_currency         := v_checkout ->> 'currencyCode';
  v_matched          := v_checkout ->> 'matched';
  v_product          := (v_checkout ->> 'productId')::uuid;
  v_product_name     := v_checkout ->> 'productName';
  v_account          := (v_checkout ->> 'billingAccountId')::uuid;
  v_account_country  := v_checkout ->> 'accountCountry';
  v_account_currency := v_checkout ->> 'accountCurrency';

  -- -------------------------------------------------------------------
  -- The account. Opened only when the person genuinely has none, and in
  -- the currency and country of the price that will be charged.
  -- -------------------------------------------------------------------
  if v_account is null then
    select nullif(trim(up.display_name), '')
      into v_account_name
      from public.user_profiles up
     where up.user_id = v_actor;

    insert into public.billing_accounts
      (display_name, billing_currency, billing_country, status, created_by)
    values
      (coalesce(v_account_name, v_course_title, 'My account'),
       v_currency, v_country, 'active', v_actor)
    returning id into v_account;

    -- A country established from a request is a fact a support conversation may
    -- have to explain later, so it is recorded like every other one.
    if v_country is not null then
      insert into public.governance_audit_events
        (actor, action, target_type, target_id, detail)
      values
        (v_actor, 'commerce.billing_country_set', 'billing_account', v_account,
         jsonb_build_object('country', v_country, 'source', 'first_purchase'));
    end if;

    -- No membership insert here on purpose: the AFTER INSERT trigger
    -- billing_accounts_grant_creator makes the creator a member with the full
    -- payer capability set, and bam_one_per_user is unique.
  else
    -- A country recorded once is not rewritten by a later request. The only
    -- supported correction is set_billing_country(), by staff, in writing.
    if v_account_country is null and v_country is not null then
      update public.billing_accounts
         set billing_country = v_country
       where id = v_account;

      insert into public.governance_audit_events
        (actor, action, target_type, target_id, detail)
      values
        (v_actor, 'commerce.billing_country_set', 'billing_account', v_account,
         jsonb_build_object('country', v_country, 'source', 'first_purchase'));
    end if;

    -- The account follows the price it just bought in. Past orders carry their
    -- own currency and are untouched; this only decides what the next screen
    -- shows and which price a tie inside a market resolves to.
    if v_account_currency is distinct from v_currency then
      update public.billing_accounts
         set billing_currency = v_currency
       where id = v_account;

      insert into public.governance_audit_events
        (actor, action, target_type, target_id, detail)
      values
        (v_actor, 'commerce.billing_currency_changed', 'billing_account', v_account,
         jsonb_build_object('from', v_account_currency, 'to', v_currency,
                            'reason', 'followed the price of a purchase'));
    end if;
  end if;

  -- -------------------------------------------------------------------
  -- The order. subtotal - discount + tax must equal total (CHECK), and
  -- there is no discount or tax path yet, so both are zero and the
  -- identity is exact.
  -- -------------------------------------------------------------------
  insert into public.orders
    (billing_account_id, learner_profile_id, currency_code, subtotal_minor,
     discount_minor, tax_minor, total_minor, status, placed_at, placed_by)
  values
    (v_account, p_learner_profile_id, v_currency, v_amount, 0, 0,
     v_amount, 'pending_payment', now(), v_actor)
  returning id into v_order;

  insert into public.order_items
    (order_id, product_id, price_id, quantity, unit_price_minor,
     currency_code, discount_minor, line_total_minor, item_snapshot)
  values
    (v_order, v_product, v_price_id, 1, v_amount,
     v_currency, 0, v_amount,
     jsonb_build_object(
       'title', coalesce(v_product_name, v_course_title),
       'course_id', p_course_id,
       'course_version_id', v_version,
       'learner_profile_id', p_learner_profile_id,
       'billing_interval', 'one_time',
       'priced_at', to_jsonb(now()),
       'market', v_checkout ->> 'market',
       'matched', v_matched
     ))
  returning id into v_item;

  insert into public.governance_audit_events
    (actor, action, target_type, target_id, detail)
  values
    (v_actor, 'commerce.course_order_created', 'order', v_order,
     jsonb_build_object(
       'courseId', p_course_id,
       'courseVersionId', v_version,
       'learnerProfileId', p_learner_profile_id,
       'productId', v_product,
       'priceId', v_price_id,
       'billingAccountId', v_account,
       'amountMinor', v_amount::text,
       'currencyCode', v_currency,
       'country', v_country,
       'matched', v_matched
     ));

  -- A promotion code, if the buyer typed one, is applied inside this same
  -- transaction: an order that cannot take the code is not created at all, so a
  -- mistyped code never leaves a stray pending order behind. The discount is
  -- written as a `promotion` adjustment with its redemption attached, which is
  -- what makes the total and the audit trail agree.
  if nullif(btrim(coalesce(p_promotion_code, '')), '') is not null then
    v_promo := public.apply_promotion_to_order(v_order, p_promotion_code);
  end if;

  -- Tax and the transfer fee, on the amount the buyer actually owes after any
  -- code. Applied last and inside this transaction, so an order is never
  -- created at a total that excludes them.
  v_charges := public.refresh_order_charges(v_order);

  -- amountMinor is text, not a JSON number. Money carries a bigint all the way
  -- to the wire in this codebase and narrowing it in a return value would be
  -- the one place in the path that could lose precision.
  return jsonb_build_object(
    'orderId', v_order,
    'orderItemId', v_item,
    'discountMinor', coalesce(v_promo ->> 'discountMinor', '0'),
    'promotionCode', v_promo ->> 'code',
    'billingAccountId', v_account,
    'productId', v_product,
    'priceId', v_price_id,
    'courseVersionId', v_version,
    'learnerProfileId', p_learner_profile_id,
    'amountMinor', v_amount::text,
    'taxMinor',   coalesce(v_charges ->> 'taxMinor', '0'),
    'feeMinor',   coalesce(v_charges ->> 'feeMinor', '0'),
    'totalMinor', coalesce(v_charges ->> 'totalMinor', v_amount::text),
    'currencyCode', v_currency,
    'title', coalesce(v_product_name, v_course_title),
    'country', v_country,
    'matched', v_matched
  );
end;
$$;

create or replace function public.quote_course_order(
  p_course_id          uuid,
  p_learner_profile_id uuid,
  p_buyer_country      text default null,
  p_promotion_code     text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor    uuid := public.current_user_id();
  v_checkout jsonb;
  v_amount   bigint;
  v_currency text;
  v_promo    jsonb := null;
  v_base     bigint;
  v_charges  jsonb;
begin
  v_checkout := public.resolve_course_checkout(
    p_course_id, p_learner_profile_id, p_buyer_country);

  v_amount   := (v_checkout ->> 'amountMinor')::bigint;
  v_currency := v_checkout ->> 'currencyCode';

  if nullif(btrim(coalesce(p_promotion_code, '')), '') is not null then
    v_promo := public.promotion_quote(
      p_promotion_code,
      array[p_course_id],
      v_actor,
      (v_checkout ->> 'billingAccountId')::uuid,
      v_checkout ->> 'country',
      v_currency,
      v_amount,
      0,
      null,
      false);
  end if;

  -- Tax and the transfer fee, on exactly what the buyer owes after the code.
  -- Same function the charge uses, so the preview cannot be a different sum.
  v_base := greatest(
    v_amount - coalesce((v_promo ->> 'discountMinor')::bigint, 0), 0);

  v_charges := public.quote_market_charges(
    v_checkout ->> 'country', v_currency, v_base);

  return jsonb_build_object(
    'courseId', p_course_id,
    'courseVersionId', (v_checkout ->> 'courseVersionId')::uuid,
    'learnerProfileId', p_learner_profile_id,
    'title', coalesce(v_checkout ->> 'productName', v_checkout ->> 'courseTitle'),
    'listMinor', v_amount::text,
    'discountMinor', coalesce(v_promo ->> 'discountMinor', '0'),
    'taxMinor',   v_charges ->> 'taxMinor',
    'feeMinor',   v_charges ->> 'feeMinor',
    'chargeLabels', jsonb_build_object(
      'tax', v_charges -> 'tax' ->> 'label',
      'fee', v_charges -> 'fee' ->> 'label'
    ),
    'totalMinor', v_charges ->> 'totalMinor',
    'currencyCode', v_currency,
    'promotionCode', v_promo ->> 'code',
    'promotionName', v_promo ->> 'name',
    'billingAccountId', (v_checkout ->> 'billingAccountId')::uuid,
    'country', v_checkout ->> 'country',
    'matched', v_checkout ->> 'matched',
    -- Says on its face that nothing was reserved. A preview that is read as a
    -- promise is how a family ends up quoting a price nobody will honour.
    'reserved', false
  );
end;
$$;

comment on function public.quote_course_order(uuid,uuid,text,text) is
  'What this course would cost this learner, after an optional code and the tax '
  'and transfer fee for their country, without creating an order, a billing '
  'account or a redemption. The rules come from resolve_course_checkout(), '
  'promotion_quote() and quote_market_charges(), which are the ones the charge '
  'uses.';

revoke all on function public.quote_course_order(uuid,uuid,text,text) from public, anon;
grant  execute on function public.quote_course_order(uuid,uuid,text,text) to authenticated;

comment on function public.create_course_order(uuid,uuid,text,text) is
  'The only writer of a course order. Names the learner the purchase covers, '
  'applies an optional promotion code, then computes tax and the transfer fee '
  'for the buyer''s country in the same transaction. The price is resolved '
  'through resolve_course_checkout() and never taken from the caller.';

revoke all on function public.create_course_order(uuid,uuid,text,text) from public, anon;
grant  execute on function public.create_course_order(uuid,uuid,text,text) to authenticated;
