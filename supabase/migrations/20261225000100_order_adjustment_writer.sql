-- ---------------------------------------------------------------------------
-- Unit 21 — an order's total is held against the parts that make it up.
--
-- `orders_totals_agree` says total = subtotal − discount + tax, and it is a real
-- constraint: no order can be written whose total contradicts its own columns.
-- What nothing checked is whether those columns describe the order. Three gaps,
-- all of them the same shape — a number on the order that no row accounts for:
--
--   * `order_items.discount_minor` reduces a line, and the order's
--     `subtotal_minor` is meant to be the sum of the lines. Nothing held the
--     order to that sum, so an order could be paid for less than the things on
--     it added up to.
--
--   * `order_adjustments` existed with an insert policy — the same
--     `is_billing_member()` question that let a payer write an order
--     (20261224000100) — and nothing read it. A customer could write a discount
--     row onto their own order. That was harmless only because no total was
--     derived from the table, which is also why the table was useless: a
--     discount finance recorded changed nothing, and a discount a customer
--     recorded changed nothing.
--
--   * There was nowhere to put a provider or handling fee at all. `fee_minor`
--     did not exist, so a fee was either folded into the tax column (a lie on
--     an invoice) or into the total (which `orders_totals_agree` refuses).
--
-- So this adds the missing column, gives the adjustments table one audited
-- writer, and holds an order to its parts at the moment it matters: when it is
-- about to be paid.
--
-- Two rules worth stating, because they are decisions rather than mechanics:
--
--   * **Adjustments are for before payment.** Once an order is paid its total is
--     history: `record_payment_success()` has already written a
--     `financial_transactions` row for exactly that amount, and the teacher's
--     earnings were accrued from it. Changing the total afterwards would leave
--     the ledger and the order disagreeing, silently. After payment the correct
--     instrument is `record_financial_adjustment()` (a clawback, a write-off, a
--     goodwill credit) or a refund, both of which are separate rows that leave
--     the original amount intact — which is D4.
--
--   * **Voiding, not deleting.** A wrong adjustment is voided with a reason and
--     stays readable, so the total can be reconstructed from the rows that
--     produced it. An order whose discount simply vanished is an order nobody
--     can explain later.
--
-- What an adjustment is worth, and where it lands:
--
--     credit → discount_minor   (manual_discount, rounding down)
--     debit  → tax_minor        (tax)
--     debit  → fee_minor        (fee, shipping, rounding up)
--
-- The direction is derived from the type rather than accepted freely, because a
-- `manual_discount` that adds money is not a discount and a `tax` that removes
-- it is not a tax. `rounding` is the one type that can genuinely go either way
-- — 12 347 UGX rounded to 12 300 is a credit, to 12 400 a debit — so it is the
-- one type that asks for a direction and refuses to guess.
--
-- `promotion` is refused. `oa_promotion_agrees` requires a
-- `promotion_redemption_id` for it, and nothing can write a redemption: the
-- promotions table has no writer because eligibility and stacking are undecided
-- (NEXT.md). Accepting a promotion adjustment with a hand-typed redemption id
-- would manufacture a row that the constraint is there to guarantee.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- orders.fee_minor, and a totals identity that includes it
-- ---------------------------------------------------------------------------

alter table public.orders
  add column if not exists fee_minor bigint not null default 0
    check (fee_minor >= 0);

comment on column public.orders.fee_minor is
  'Provider, handling and shipping charges added to the order. Never folded into '
  'the tax column or into the total: an invoice that cannot show its fees cannot '
  'be checked. Set by recompute_order_totals() from live order_adjustments.';

-- Every existing row has fee_minor = 0, so widening the identity cannot
-- invalidate one; it only closes the loophole where a fee was hidden in a
-- column that meant something else.
alter table public.orders drop constraint if exists orders_totals_agree;
alter table public.orders
  add constraint orders_totals_agree check (
    total_minor = subtotal_minor - discount_minor + tax_minor + fee_minor
  );

-- ---------------------------------------------------------------------------
-- order_adjustments: voiding, and an amount that cannot be negative
-- ---------------------------------------------------------------------------

alter table public.order_adjustments
  add column if not exists voided_at timestamptz,
  add column if not exists voided_by uuid
    references public.user_profiles (user_id) on delete set null,
  add column if not exists voided_reason text;

comment on column public.order_adjustments.voided_at is
  'Set when the adjustment is withdrawn. A voided row still counts for nothing '
  'in the totals but stays readable, so the total can be reconstructed from the '
  'rows that produced it.';

-- A voided adjustment names who voided it and why; a live one names neither.
-- Both halves matter: voided_at without voided_by is an unattributed change to
-- money, and voided_reason without voided_at is a row that reads as withdrawn
-- while still being counted.
alter table public.order_adjustments
  add constraint oa_void_agrees check (
    (voided_at is null) = (voided_by is null)
    and (voided_at is null or nullif(btrim(voided_reason), '') is not null)
  );

-- The sign lives in `direction`. A negative amount with a direction is a double
-- negative, and which way it moves the total becomes a matter of opinion.
alter table public.order_adjustments
  add constraint oa_amount_non_negative check (amount_minor >= 0);

-- The last client-writable money row. `is_billing_member()` was the whole
-- question it asked, so a customer could put a discount on their own order.
-- Dropped rather than narrowed to staff for the same reason as orders_insert:
-- a staff-only insert would still write a row that nothing recomputes from,
-- and would leave two ways to change a total.
drop policy if exists order_adjustments_insert on public.order_adjustments;

create index if not exists order_adjustments_live_idx
  on public.order_adjustments (order_id)
  where voided_at is null;

-- ---------------------------------------------------------------------------
-- recompute_order_totals — the one place the columns are derived
-- ---------------------------------------------------------------------------

create or replace function public.recompute_order_totals(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
  v_subtotal bigint;
  v_discount bigint;
  v_tax bigint;
  v_fee bigint;
  v_total bigint;
begin
  select * into v_order from public.orders o where o.id = p_order_id;
  if not found then
    raise exception 'that order does not exist' using errcode = 'no_data_found';
  end if;

  select coalesce(sum(oi.line_total_minor), 0)::bigint
    into v_subtotal
    from public.order_items oi
   where oi.order_id = p_order_id;

  -- Live adjustments only. A voided row is history, not arithmetic.
  select
    coalesce(sum(oa.amount_minor) filter (where oa.direction = 'credit'), 0)::bigint,
    coalesce(sum(oa.amount_minor) filter (
      where oa.direction = 'debit' and oa.adjustment_type = 'tax'), 0)::bigint,
    coalesce(sum(oa.amount_minor) filter (
      where oa.direction = 'debit' and oa.adjustment_type <> 'tax'), 0)::bigint
    into v_discount, v_tax, v_fee
    from public.order_adjustments oa
   where oa.order_id = p_order_id
     and oa.voided_at is null;

  v_total := v_subtotal - v_discount + v_tax + v_fee;
  if v_total < 0 then
    -- A discount larger than the order. `total_minor >= 0` would refuse it
    -- anyway; saying why is the difference between a support ticket and a
    -- database error nobody can act on.
    raise exception
      'the adjustments on this order reduce it below zero (% off an order of %)',
      v_discount, v_subtotal
      using errcode = 'check_violation';
  end if;

  update public.orders
     set subtotal_minor = v_subtotal,
         discount_minor = v_discount,
         tax_minor      = v_tax,
         fee_minor      = v_fee,
         total_minor    = v_total
   where id = p_order_id;

  return jsonb_build_object(
    'orderId', p_order_id,
    'currencyCode', v_order.currency_code,
    'subtotalMinor', v_subtotal::text,
    'discountMinor', v_discount::text,
    'taxMinor', v_tax::text,
    'feeMinor', v_fee::text,
    'totalMinor', v_total::text
  );
end;
$$;

revoke all on function public.recompute_order_totals(uuid) from public;

comment on function public.recompute_order_totals(uuid) is
  'Derives an order''s money columns from its items and its live adjustments. '
  'Not callable by a client: it is the arithmetic behind add_order_adjustment() '
  'and void_order_adjustment(), and a recompute nobody asked for is a total that '
  'changed with no row to explain it.';

-- ---------------------------------------------------------------------------
-- add_order_adjustment
-- ---------------------------------------------------------------------------

create or replace function public.add_order_adjustment(
  p_order_id uuid,
  p_adjustment_type text,
  p_amount_minor bigint,
  p_direction text default null,
  p_reason text default null,
  p_order_item_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
  v_order public.orders;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_direction text;
  v_item uuid;
  v_id uuid;
  v_totals jsonb;
begin
  if v_actor is null then
    raise exception 'sign in to adjust an order'
      using errcode = 'insufficient_privilege';
  end if;
  -- An explicit role pair, not is_privileged(): that includes support_agent,
  -- who may read an order to answer a question and may not change what it
  -- costs.
  if not (public.has_role(v_actor, 'platform_admin')
          or public.has_role(v_actor, 'finance_admin')) then
    raise exception 'only a finance admin or platform admin may adjust an order'
      using errcode = 'insufficient_privilege';
  end if;

  select * into v_order from public.orders o where o.id = p_order_id;
  if not found then
    raise exception 'that order does not exist' using errcode = 'no_data_found';
  end if;

  -- Before payment only. After it, the total is history: a ledger row was
  -- written for exactly that amount and earnings were accrued from it.
  if v_order.status not in ('draft', 'pending_payment', 'awaiting_confirmation') then
    raise exception
      'this order is already %, so its total is history — record a financial adjustment or a refund instead',
      v_order.status
      using errcode = 'invalid_parameter_value';
  end if;

  if p_adjustment_type is null
     or p_adjustment_type not in
        ('manual_discount', 'tax', 'fee', 'shipping', 'rounding', 'promotion') then
    raise exception 'unknown adjustment type %', coalesce(p_adjustment_type, '(none)')
      using errcode = 'invalid_parameter_value';
  end if;

  if p_adjustment_type = 'promotion' then
    -- oa_promotion_agrees requires a promotion_redemption_id, and nothing can
    -- write one: promotions eligibility and stacking are undecided. A
    -- hand-typed redemption id would manufacture the very row the constraint
    -- exists to guarantee.
    raise exception
      'promotion adjustments are not recorded yet: the promotions policy is undecided'
      using errcode = 'feature_not_supported';
  end if;

  if p_amount_minor is null or p_amount_minor <= 0 then
    raise exception 'an adjustment needs a positive whole amount in minor units'
      using errcode = 'invalid_parameter_value';
  end if;

  if v_reason is null then
    raise exception 'give a written reason for the adjustment'
      using errcode = 'invalid_parameter_value';
  end if;
  if length(v_reason) > 500 then
    raise exception 'the reason must be 500 characters or fewer'
      using errcode = 'invalid_parameter_value';
  end if;

  -- Direction from type. `rounding` is the only type that can genuinely go
  -- either way, so it is the only one that asks.
  v_direction := case p_adjustment_type
    when 'manual_discount' then 'credit'
    when 'promotion'       then 'credit'
    when 'tax'             then 'debit'
    when 'fee'             then 'debit'
    when 'shipping'        then 'debit'
    else null
  end;

  if v_direction is null then
    if p_direction is null or p_direction not in ('debit', 'credit') then
      raise exception 'a rounding adjustment needs a direction: debit or credit'
        using errcode = 'invalid_parameter_value';
    end if;
    v_direction := p_direction;
  elsif p_direction is not null and p_direction <> v_direction then
    raise exception 'a % adjustment is always a %, not a %',
      p_adjustment_type, v_direction, p_direction
      using errcode = 'invalid_parameter_value';
  end if;

  -- An item reference is a note about what the adjustment is for, not a second
  -- way to price a line: per-line repricing is order_items.discount_minor, set
  -- before the order is placed. It still has to belong to this order, or the
  -- note is a way to attach this order's discount to another order's line.
  if p_order_item_id is not null then
    select oi.id into v_item
      from public.order_items oi
     where oi.id = p_order_item_id and oi.order_id = p_order_id;
    if v_item is null then
      raise exception 'that line item is not on this order'
        using errcode = 'invalid_parameter_value';
    end if;
  end if;

  -- The currency is the order's. An adjustment in another currency could not
  -- be added to a total, and there is no rate on this row to convert it with.
  insert into public.order_adjustments
    (order_id, order_item_id, adjustment_type, amount_minor, currency_code,
     direction, description)
  values
    (p_order_id, v_item, p_adjustment_type, p_amount_minor, v_order.currency_code,
     v_direction, v_reason)
  returning id into v_id;

  v_totals := public.recompute_order_totals(p_order_id);

  insert into public.governance_audit_events
    (actor, action, target_type, target_id, detail)
  values
    (v_actor, 'commerce.order_adjustment_added', 'order_adjustment', v_id,
     jsonb_build_object(
       'orderId', p_order_id,
       'adjustmentType', p_adjustment_type,
       'direction', v_direction,
       'amountMinor', p_amount_minor::text,
       'currencyCode', v_order.currency_code,
       'reason', v_reason,
       'totals', v_totals
     ));

  return v_totals || jsonb_build_object(
    'adjustmentId', v_id,
    'adjustmentType', p_adjustment_type,
    'direction', v_direction,
    'amountMinor', p_amount_minor::text
  );
end;
$$;

revoke all on function public.add_order_adjustment(uuid, text, bigint, text, text, uuid) from public;
grant execute on function public.add_order_adjustment(uuid, text, bigint, text, text, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- void_order_adjustment
-- ---------------------------------------------------------------------------

create or replace function public.void_order_adjustment(
  p_adjustment_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
  v_adjustment public.order_adjustments;
  v_order public.orders;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_totals jsonb;
begin
  if v_actor is null then
    raise exception 'sign in to void an order adjustment'
      using errcode = 'insufficient_privilege';
  end if;
  if not (public.has_role(v_actor, 'platform_admin')
          or public.has_role(v_actor, 'finance_admin')) then
    raise exception 'only a finance admin or platform admin may void an order adjustment'
      using errcode = 'insufficient_privilege';
  end if;

  select * into v_adjustment from public.order_adjustments oa
   where oa.id = p_adjustment_id;
  if not found then
    raise exception 'that adjustment does not exist' using errcode = 'no_data_found';
  end if;

  if v_adjustment.voided_at is not null then
    raise exception 'that adjustment was already voided on %',
      v_adjustment.voided_at
      using errcode = 'invalid_parameter_value';
  end if;

  if v_reason is null then
    raise exception 'give a written reason for voiding the adjustment'
      using errcode = 'invalid_parameter_value';
  end if;
  if length(v_reason) > 500 then
    raise exception 'the reason must be 500 characters or fewer'
      using errcode = 'invalid_parameter_value';
  end if;

  select * into v_order from public.orders o where o.id = v_adjustment.order_id;
  if not found then
    raise exception 'the order this adjustment belongs to does not exist'
      using errcode = 'no_data_found';
  end if;

  if v_order.status not in ('draft', 'pending_payment', 'awaiting_confirmation') then
    raise exception
      'this order is already %, so its total is history — record a financial adjustment or a refund instead',
      v_order.status
      using errcode = 'invalid_parameter_value';
  end if;

  update public.order_adjustments
     set voided_at = now(),
         voided_by = v_actor,
         voided_reason = v_reason
   where id = p_adjustment_id;

  v_totals := public.recompute_order_totals(v_adjustment.order_id);

  insert into public.governance_audit_events
    (actor, action, target_type, target_id, detail)
  values
    (v_actor, 'commerce.order_adjustment_voided', 'order_adjustment', p_adjustment_id,
     jsonb_build_object(
       'orderId', v_adjustment.order_id,
       'adjustmentType', v_adjustment.adjustment_type,
       'direction', v_adjustment.direction,
       'amountMinor', v_adjustment.amount_minor::text,
       'reason', v_reason,
       'totals', v_totals
     ));

  return v_totals || jsonb_build_object(
    'adjustmentId', p_adjustment_id,
    'voidedReason', v_reason
  );
end;
$$;

revoke all on function public.void_order_adjustment(uuid, text) from public;
grant execute on function public.void_order_adjustment(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- The invariant, enforced where it matters
-- ---------------------------------------------------------------------------
--
-- A BEFORE UPDATE trigger on status, not a CHECK: whether an order's columns
-- describe its rows is a question about other tables, and a CHECK cannot ask
-- it. It fires when an order is about to become paid, which is the moment the
-- numbers stop being editable and start being history — a capture is written
-- for total_minor and earnings are accrued from it in the same call.
--
-- It deliberately does not fire on INSERT. An order is always born
-- `pending_payment` by one of the two definer writers, and on INSERT its line
-- item does not exist yet (it is the next statement), so the sum would be zero
-- and every order would be refused. Nothing can insert one any other way: both
-- insert policies were dropped in 20261224000100.

create or replace function public.orders_parts_agree_before_payment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_subtotal bigint;
  v_discount bigint;
  v_tax bigint;
  v_fee bigint;
begin
  if new.status not in ('paid', 'partially_refunded', 'refunded') then
    return new;
  end if;

  select coalesce(sum(oi.line_total_minor), 0)::bigint
    into v_subtotal
    from public.order_items oi
   where oi.order_id = new.id;

  select
    coalesce(sum(oa.amount_minor) filter (where oa.direction = 'credit'), 0)::bigint,
    coalesce(sum(oa.amount_minor) filter (
      where oa.direction = 'debit' and oa.adjustment_type = 'tax'), 0)::bigint,
    coalesce(sum(oa.amount_minor) filter (
      where oa.direction = 'debit' and oa.adjustment_type <> 'tax'), 0)::bigint
    into v_discount, v_tax, v_fee
    from public.order_adjustments oa
   where oa.order_id = new.id
     and oa.voided_at is null;

  if new.subtotal_minor <> v_subtotal then
    raise exception
      'order % cannot be %: its subtotal is % but its line items add up to %',
      new.id, new.status, new.subtotal_minor, v_subtotal
      using errcode = 'check_violation';
  end if;
  if new.discount_minor <> v_discount then
    raise exception
      'order % cannot be %: its discount is % but its live adjustments credit %',
      new.id, new.status, new.discount_minor, v_discount
      using errcode = 'check_violation';
  end if;
  if new.tax_minor <> v_tax then
    raise exception
      'order % cannot be %: its tax is % but its live adjustments debit % in tax',
      new.id, new.status, new.tax_minor, v_tax
      using errcode = 'check_violation';
  end if;
  if new.fee_minor <> v_fee then
    raise exception
      'order % cannot be %: its fees are % but its live adjustments debit % in fees',
      new.id, new.status, new.fee_minor, v_fee
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

revoke all on function public.orders_parts_agree_before_payment() from public;

drop trigger if exists orders_parts_agree on public.orders;

create trigger orders_parts_agree
  before update of status on public.orders
  for each row execute function public.orders_parts_agree_before_payment();
