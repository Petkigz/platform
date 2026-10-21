-- ---------------------------------------------------------------------------
-- Unit 20 — an order is created by the platform, not by the browser.
--
-- The hole, stated exactly as it can be walked through. Two insert policies in
-- 20261020000400_rls.sql let any billing member write the money rows directly:
--
--     orders_insert:      with check (is_billing_member(billing_account_id))
--     order_items_insert: with check (exists (select 1 from orders o
--                            where o.id = order_items.order_id
--                              and is_billing_member(o.billing_account_id)))
--
-- `is_billing_member()` answers "may this person pay from this account", which
-- is the right question for reading an invoice and the wrong question for
-- writing one. It says nothing about *what* is being written, so a payer can
-- skip web/src/lib/checkout.ts entirely and POST straight to PostgREST:
--
--     insert into orders (billing_account_id, currency_code, subtotal_minor,
--                         discount_minor, tax_minor, total_minor, status)
--     values (<their own account>, 'UGX', 50000, 0, 0, 50000, 'pending_payment');
--
--     insert into order_items (order_id, product_id, quantity,
--                              unit_price_minor, currency_code, discount_minor,
--                              line_total_minor, item_snapshot)
--     values (<that order>, <any product in the catalogue>, 1,
--             0, 'UGX', 0, 0, '{}');
--
-- Both rows satisfy every CHECK on their table — `orders_totals_agree`
-- (50000 = 50000 - 0 + 0) and `oi_line_total_agrees` (0 = 0 * 1 - 0) — and
-- `order_items.price_id` is nullable, so no price has to exist at all. Then pay
-- the 50000 through the real provider, and `record_payment_success()` fulfils
-- from exactly those rows:
--
--     select distinct pcv.course_id
--       from order_items oi
--       join product_course_versions pcv on pcv.product_id = oi.product_id
--      where oi.order_id = p_order_id
--
-- The entitlement is decided by `order_items.product_id`, which the payer wrote.
-- So: any course sold by any product, for whatever the order total happened to
-- say. `order_adjustments_insert` has the same shape and lets a customer write a
-- discount row onto their own order; that one is only harmless because nothing
-- recomputes a total from `order_adjustments` yet (Unit 21 will, and drops it).
--
-- The validation existed. It lived in TypeScript, in `createOrder()`: published
-- version, active in-window one-time price, product linked to that version,
-- amount read from `prices`, one line item. A rule that lives in one of two
-- paths is not a rule — it is a suggestion to whoever uses that path.
-- `create_plan_order()` already gets this right for subscriptions. This makes
-- course checkout match it.
--
-- The fix is two parts, and both are needed:
--
--   1. `create_course_order(p_course_id, p_price_id)` re-derives the offer from
--      the catalogue and writes the order and its single line itself. The caller
--      supplies no amount, no product, no billing account, no snapshot and no
--      status. There is nothing left to forge, so the RLS question stops being
--      the only thing standing between a payer and a free course.
--
--   2. The two insert policies are dropped rather than narrowed to staff. A
--      staff-only insert would still let a privileged actor write a line that
--      `record_payment_success()` trusts with no price behind it, and it would
--      leave two ways to make an order that can drift. With no insert policy at
--      all, the definer writers are the only way an order or an order line
--      comes into existence. Reads are untouched: `orders_read` and
--      `order_items_read` still give a payer their own invoice.
--
-- Dropping an insert policy does not lock the writers out. No table in this
-- schema has `force row level security`, so a SECURITY DEFINER function owned
-- by the migration owner bypasses RLS — verified before relying on it, because
-- the whole design rests on it.
--
-- `commerce.checkout` becomes load-bearing here. It was registered in
-- 20261024000100_flag_register.sql and read by nothing in the runtime, so the
-- platform's "everything ships off, enabled from the dashboard" promise was
-- untrue for checkout specifically: with Supabase configured and no provider,
-- an order could still be created with the flag off. It is checked in the writer
-- rather than in the route because the writer is the only place every order
-- must pass. (`create_plan_order()` is still not gated on
-- `commerce.subscriptions`; that asymmetry is recorded in NEXT.md rather than
-- left implicit.)
-- ---------------------------------------------------------------------------

drop policy if exists orders_insert on public.orders;
drop policy if exists order_items_insert on public.order_items;

create or replace function public.create_course_order(
  p_course_id uuid,
  p_price_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
  v_version uuid;
  v_course_title text;
  v_price public.prices;
  v_product uuid;
  v_product_name text;
  v_account uuid;
  v_account_name text;
  v_order uuid;
  v_item uuid;
begin
  if v_actor is null then
    raise exception 'checkout:not_signed_in'
      using errcode = 'insufficient_privilege';
  end if;

  -- Ships off. Turning it on is an admin action, not a deploy.
  if not public.setting_bool('commerce.checkout', false) then
    raise exception 'checkout:disabled'
      using errcode = 'insufficient_privilege';
  end if;

  -- -------------------------------------------------------------------
  -- What is being sold. Re-derived here on every call, never accepted.
  -- -------------------------------------------------------------------
  select cv.id, c.title
    into v_version, v_course_title
    from public.courses c
    join public.course_versions cv on cv.course_id = c.id
   where c.id = p_course_id
     and c.status = 'active'
     and c.deleted_at is null
     and cv.version_status = 'published'
   order by cv.version_number desc
   limit 1;

  if v_version is null then
    raise exception 'checkout:course_not_available'
      using errcode = 'no_data_found';
  end if;

  select * into v_price from public.prices p where p.id = p_price_id;
  if not found then
    raise exception 'checkout:price_not_available'
      using errcode = 'no_data_found';
  end if;

  -- A recurring price is a subscription and has its own writer, its own
  -- lifecycle and its own expiry. `record_payment_success()` does not create
  -- subscriptions, so taking one here would take the money and grant nothing.
  if v_price.billing_interval <> 'one_time' then
    raise exception 'checkout:not_one_time'
      using errcode = 'invalid_parameter_value';
  end if;

  if v_price.status <> 'active' then
    raise exception 'checkout:price_not_available'
      using errcode = 'no_data_found';
  end if;

  if v_price.effective_from is not null and v_price.effective_from > now() then
    raise exception 'checkout:price_window'
      using errcode = 'no_data_found';
  end if;

  if v_price.effective_until is not null and v_price.effective_until < now() then
    raise exception 'checkout:price_window'
      using errcode = 'no_data_found';
  end if;

  -- The load-bearing check, and the reason `p_course_id` is a parameter rather
  -- than a field on the price: the product behind this price has to be the one
  -- that sells *this* published version. Filtering on the price row and then
  -- trusting a caller-supplied product id is how a price for course A gets
  -- applied to course B. `products.status = 'active'` matches what
  -- resolveOffering() will have shown the payer.
  select pcv.product_id, pr.name
    into v_product, v_product_name
    from public.product_course_versions pcv
    join public.products pr on pr.id = pcv.product_id
   where pcv.product_id = v_price.product_id
     and pcv.course_version_id = v_version
     and pr.status = 'active'
   limit 1;

  if v_product is null then
    raise exception 'checkout:price_not_for_this_course'
      using errcode = 'invalid_parameter_value';
  end if;

  -- -------------------------------------------------------------------
  -- Who is paying. Resolved from the caller's own memberships; never a
  -- parameter, so there is no way to hang an order on somebody else's
  -- account and have their refund or their invoice find it.
  --
  -- The account's currency is matched to the price. `billing_accounts.
  -- billing_currency` is documented as authoritative for the original
  -- amount (D4), and the client-side version of this hardcoded 'UGX' on a
  -- new account whatever the price was in. Preferring an account in the
  -- price's currency keeps every order coherent with the account it hangs
  -- off, and opens one only when the person genuinely has none.
  -- -------------------------------------------------------------------
  select bam.billing_account_id
    into v_account
    from public.billing_account_memberships bam
    join public.billing_accounts ba on ba.id = bam.billing_account_id
   where bam.user_id = v_actor
     and bam.status = 'active'
     and bam.can_manage_payment_methods
     and ba.status = 'active'
     and ba.deleted_at is null
     and ba.billing_currency = v_price.currency_code
   order by bam.granted_at
   limit 1;

  if v_account is null then
    select nullif(trim(up.display_name), '')
      into v_account_name
      from public.user_profiles up
     where up.user_id = v_actor;

    insert into public.billing_accounts
      (display_name, billing_currency, status, created_by)
    values
      (coalesce(v_account_name, v_course_title, 'My account'),
       v_price.currency_code, 'active', v_actor)
    returning id into v_account;

    -- No membership insert here on purpose: the AFTER INSERT trigger
    -- billing_accounts_grant_creator makes the creator a member with the full
    -- payer capability set, and bam_one_per_user is unique. Inserting as well
    -- would be a second source of truth for the same row.
  end if;

  -- -------------------------------------------------------------------
  -- The order. subtotal - discount + tax must equal total (CHECK), and
  -- there is no discount or tax path yet, so both are zero and the
  -- identity is exact. `order_adjustments` will change that, and
  -- `orders_totals_agree` is what will catch a wrong answer (Unit 21).
  -- -------------------------------------------------------------------
  insert into public.orders
    (billing_account_id, currency_code, subtotal_minor, discount_minor,
     tax_minor, total_minor, status, placed_at, placed_by)
  values
    (v_account, v_price.currency_code, v_price.amount_minor, 0, 0,
     v_price.amount_minor, 'pending_payment', now(), v_actor)
  returning id into v_order;

  -- Exactly one line: a course purchase is one enrolment. line_total must
  -- equal unit_price * quantity - discount (CHECK). The snapshot carries the
  -- same keys the client-side version wrote, so anything already reading
  -- `item_snapshot` — /orders does — keeps working.
  insert into public.order_items
    (order_id, product_id, price_id, quantity, unit_price_minor,
     currency_code, discount_minor, line_total_minor, item_snapshot)
  values
    (v_order, v_product, v_price.id, 1, v_price.amount_minor,
     v_price.currency_code, 0, v_price.amount_minor,
     jsonb_build_object(
       'title', coalesce(v_product_name, v_course_title),
       'course_id', p_course_id,
       'course_version_id', v_version,
       'billing_interval', v_price.billing_interval,
       'priced_at', to_jsonb(now())
     ))
  returning id into v_item;

  insert into public.governance_audit_events
    (actor, action, target_type, target_id, detail)
  values
    (v_actor, 'commerce.course_order_created', 'order', v_order,
     jsonb_build_object(
       'courseId', p_course_id,
       'courseVersionId', v_version,
       'productId', v_product,
       'priceId', v_price.id,
       'billingAccountId', v_account,
       'amountMinor', v_price.amount_minor::text,
       'currencyCode', v_price.currency_code
     ));

  -- amountMinor is text, not a JSON number. Money carries a bigint all the way
  -- to the wire in this codebase and narrowing it in a return value would be
  -- the one place in the path that could lose precision.
  return jsonb_build_object(
    'orderId', v_order,
    'orderItemId', v_item,
    'billingAccountId', v_account,
    'productId', v_product,
    'priceId', v_price.id,
    'courseVersionId', v_version,
    'amountMinor', v_price.amount_minor::text,
    'currencyCode', v_price.currency_code,
    'title', coalesce(v_product_name, v_course_title)
  );
end;
$$;

revoke all on function public.create_course_order(uuid, uuid) from public;
grant execute on function public.create_course_order(uuid, uuid) to authenticated;
