-- The promotions policy is decided; the sentence still said it was not.
--
-- On 2026-10-22 the owner decided promotions in full — codes, eligibility,
-- markets, three limits, one code per order, never stacked, never free. Between
-- then and now it was built: `create_promotion_campaign()` (ownership, markets,
-- a fixed amount that has to match the market's currency, a per-family limit),
-- `apply_promotion_to_order()` inside `create_course_order()`, `promotion_quote()`
-- behind `quote_course_order()` so a preview cannot disagree with the bill, and
-- `remove_promotion_from_order()` that voids a redemption without deleting it.
--
-- Two places were written before that and never revisited:
--
--   1. `add_order_adjustment()` refused a hand-typed `promotion` adjustment with
--      **"the promotions policy is undecided"**. That sentence was true in October.
--      It stopped being true the day redemption shipped, and it now sends an admin
--      to ask the owner a question the owner answered. The refusal itself is
--      still right — and for a different reason, which the sentence now states: a
--      promotion enters an order through the code the buyer typed, because
--      `oa_promotion_agrees` requires the redemption behind it, and a click in a
--      console cannot invent one.
--   2. The `commerce.promotions` register row still listed *"Eligibility rules;
--      stacking rules; abuse limits"* as the preconditions for turning it on. All
--      three exist. What is left is not a rule but an occasion: the first real
--      campaign the owner wants to run.
--
-- Nothing here turns the flag on. It stays `false`, and what changes is that the
-- dashboard now describes the feature that exists.

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
    -- Promotions are decided, built and recorded — `apply_promotion_to_order()`
    -- writes this very adjustment type when a buyer's code is applied, and
    -- `remove_promotion_from_order()` withdraws it. What this writer refuses is a
    -- promotion typed onto an order **by hand**, because `oa_promotion_agrees`
    -- requires a live redemption and a hand-typed id would manufacture the row the
    -- constraint exists to guarantee.
    --
    -- The sentence used to say the policy was undecided, which was true in
    -- October and false from the moment `20261238000100` landed: an admin reading
    -- it was being sent to ask the owner a question the owner had already
    -- answered.
    raise exception
      'a promotion cannot be typed onto an order: use the code the buyer typed at checkout, or take one off with remove_promotion_from_order()'
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

comment on function public.add_order_adjustment(uuid, text, bigint, text, text, uuid) is
  'Adds a manual discount, tax, fee, shipping or rounding line to a pending order, with a written reason and an audit entry. A promotion is not typed here: it enters through the code the buyer used, so the adjustment always carries the redemption behind it.';

-- ---------------------------------------------------------------------------
-- The switch now describes the feature that exists
-- ---------------------------------------------------------------------------
update public.platform_settings
   set preconditions = '**Decided 2026-10-22 and built.** Codes, eligibility (market, course, '
        || 'person, family, total), the three limits, one code per order and never stacked are '
        || 'enforced by `quote_course_order()` and `create_course_order()`, which read the same '
        || '`promotion_quote()` — so a preview cannot disagree with the charge. A code can be taken '
        || 'off a pending order without spending it, and a discount that would make an order free is '
        || 'refused because the ledger cannot capture zero. Off changes one thing: no code is '
        || 'offered at checkout. Turn it on when the first real campaign is ready to run.',
       description = 'Discount campaigns: codes, markets, limits — applied at checkout, one per order'
 where key = 'commerce.promotions';
