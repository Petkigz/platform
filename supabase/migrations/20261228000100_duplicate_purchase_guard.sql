-- ---------------------------------------------------------------------------
-- A purchase that would grant nothing new is refused (decided 2026-10-22).
--
-- `create_course_order()` derived everything else about an order from the
-- catalogue but never asked whether the buyer already had the thing:
-- entitlements are not consulted anywhere on the purchase path, so an account
-- with live access could pay again for it. Nobody is defrauded — the fulfilment
-- loop skips an entitlement it already exists — but a family is charged for air,
-- and the fix is a refund.
--
-- The refusal is narrow on purpose. It fires only when the order would grant
-- nothing at all: an existing live `purchase` entitlement for this exact course
-- version, on a learner profile belonging to an active member of the account
-- that would pay. `source_type = 'purchase'` because that is what
-- `record_payment_success()` skips — a subscription grant expires with the
-- subscription, so buying the course outright adds permanence and is allowed.
--
-- This is a full redefinition of the function, not a wrapper: it is the same
-- body as 20261224000100_course_order_writer.sql with one block inserted after
-- the payer's account is resolved (the check needs the account, which is created
-- on the fly when the payer has none). Diffing the two files should show only
-- that block.
--
-- Refusal key: `checkout:already_owned`, mapped in web/src/lib/checkout.ts.
-- ---------------------------------------------------------------------------

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
  -- Would paying grant anything at all?
  --
  -- A course purchase grants every learner profile linked to an active
  -- member of the account that paid: that is what record_payment_success()
  -- loops over. So if every profile it would grant already holds a live
  -- `purchase` entitlement for this version, the order can only take money
  -- for access that already exists — the same version bought twice, which in
  -- practice is a double tap or a guardian who does not know the family
  -- already has it. Refused, with a key the buy page turns into a sentence
  -- (decided 2026-10-22).
  --
  -- Two things this deliberately does not do. It is scoped to
  -- `source_type = 'purchase'`, because the fulfilment skips exactly that: a
  -- grant that came from a subscription ends when the subscription does, so
  -- buying the course outright adds permanence and must still be allowed. And
  -- it asks about the *account*, not the person, because that is the grain
  -- the grant uses — which is also why twins are never the ones refused: they
  -- are two profiles on one account, the first purchase enrols both, and no
  -- second purchase is needed. A lapsed entitlement, a different version, a
  -- different course and a different account all pass.
  -- -------------------------------------------------------------------
  if exists (
    select 1
      from public.billing_account_memberships bam
      join public.learner_profiles lp
        on lp.linked_user_id = bam.user_id
       and lp.deleted_at is null
      join public.entitlement_grants eg
        on eg.learner_profile_id = lp.id
     where bam.billing_account_id = v_account
       and bam.status = 'active'
       and eg.scope_type = 'course_version'
       and eg.course_version_id = v_version
       and eg.source_type = 'purchase'
       and eg.status = 'active'
       and (eg.effective_from is null or eg.effective_from <= now())
       and (eg.effective_until is null or eg.effective_until > now())
  ) then
    raise exception 'checkout:already_owned'
      using errcode = 'invalid_parameter_value';
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
