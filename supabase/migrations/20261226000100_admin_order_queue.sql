-- ---------------------------------------------------------------------------
-- Unit 22 — finance can see the orders it is allowed to adjust.
--
-- 20261225000100 gave order adjustments an audited writer and 20261224000100
-- made the platform the only thing that can create an order, but neither is
-- reachable from a screen, and the reason is not the UI: `orders_read` is
-- `is_billing_member(billing_account_id)`. There is no staff policy on orders,
-- so a finance admin cannot read a single order through PostgREST — which is
-- correct for a payer's invoice and leaves finance with no way to find the
-- order it is supposed to adjust.
--
-- So this adds the reader rather than widening the policy. Widening
-- `orders_read` to `staff_only()` would hand every order on the platform to
-- every privileged role including `support_agent`, whose job is to answer a
-- question about one order that a payer has already opened a case about — and
-- it would do it through a predicate on a table rather than a function that can
-- be reasoned about, tested and changed. A definer reader with an explicit
-- role pair keeps the answer to "who may read every order" in one place, next
-- to the writers it feeds.
--
-- It lists only the orders that can still be adjusted. A paid order's total is
-- history (20261225000100), and a screen full of rows that refuse the button
-- under them teaches people to click and read errors instead of looking at the
-- rows that mean something. Paid orders belong on `/admin/reconciliation` and
-- `/admin/financial-adjustments`, which is where their instruments are.
-- ---------------------------------------------------------------------------

create or replace function public.admin_orders_overview(p_limit integer default 50)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
  v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 200);
  v_orders jsonb;
begin
  if v_actor is null then
    raise exception 'sign in to review orders'
      using errcode = 'insufficient_privilege';
  end if;
  -- The same pair the two writers require, and deliberately not
  -- is_privileged(): a screen that shows orders to somebody who may not adjust
  -- them is a screen full of refusals.
  if not (public.has_role(v_actor, 'platform_admin')
          or public.has_role(v_actor, 'finance_admin')) then
    raise exception 'only a finance admin or platform admin may review orders'
      using errcode = 'insufficient_privilege';
  end if;

  select coalesce(jsonb_agg(t.payload), '[]'::jsonb)
    into v_orders
    from (
      select jsonb_build_object(
               'orderId', o.id,
               'status', o.status,
               'createdAt', to_jsonb(o.created_at),
               'placedAt', to_jsonb(o.placed_at),
               'billingAccountName', ba.display_name,
               'currencyCode', o.currency_code,
               -- Money as decimal integer strings. A JSON number is where a
               -- bigint stops being exact, and this is a total.
               'subtotalMinor', o.subtotal_minor::text,
               'discountMinor', o.discount_minor::text,
               'taxMinor', o.tax_minor::text,
               'feeMinor', o.fee_minor::text,
               'totalMinor', o.total_minor::text,
               'items', (
                 select coalesce(jsonb_agg(
                          jsonb_build_object(
                            'itemId', oi.id,
                            'title', oi.item_snapshot ->> 'title',
                            'lineTotalMinor', oi.line_total_minor::text
                          ) order by oi.created_at), '[]'::jsonb)
                   from public.order_items oi
                  where oi.order_id = o.id),
               -- Voided adjustments are included on purpose: an order whose
               -- discount was withdrawn has to show the withdrawn row, or its
               -- total cannot be reconstructed from what is on the screen.
               'adjustments', (
                 select coalesce(jsonb_agg(
                          jsonb_build_object(
                            'adjustmentId', oa.id,
                            'adjustmentType', oa.adjustment_type,
                            'direction', oa.direction,
                            'amountMinor', oa.amount_minor::text,
                            'currencyCode', oa.currency_code,
                            'description', oa.description,
                            'voidedAt', to_jsonb(oa.voided_at),
                            'voidedBy', oa.voided_by,
                            'voidedReason', oa.voided_reason,
                            'createdAt', to_jsonb(oa.created_at)
                          ) order by oa.created_at), '[]'::jsonb)
                   from public.order_adjustments oa
                  where oa.order_id = o.id)
             ) as payload
        from public.orders o
        join public.billing_accounts ba on ba.id = o.billing_account_id
       where o.deleted_at is null
         and o.status in ('draft', 'pending_payment', 'awaiting_confirmation')
       order by o.created_at desc
       limit v_limit
    ) t;

  return jsonb_build_object(
    'orders', v_orders,
    'count', jsonb_array_length(v_orders),
    'limit', v_limit
  );
end;
$$;

revoke all on function public.admin_orders_overview(integer) from public;
grant execute on function public.admin_orders_overview(integer) to authenticated;
