-- One course purchase covers one learner.
--
-- Decided 2026-10-22, superseding the same day's earlier answer that a purchase
-- covered up to a set number of children. Once the three shapes were put with
-- what each costs, the choice was per learner, and the model had not been built
-- yet — so this is the order shape, the refusal and the fulfilment moving
-- together rather than a correction to something in use.
--
-- `orders.learner_profile_id` is the new fact. It is nullable because plan
-- orders and orders written before this migration have no learner to name; every
-- new course order is refused without one, and the fulfilment below grants that
-- profile alone. The old account-wide walk stays for the orders that predate the
-- column, so a legacy order still settles rather than silently granting nobody.
--
-- The duplicate refusal moves with the grain: it is now per learner and per
-- version. A sibling buying the same course is an ordinary purchase, and a
-- family is no longer a discount unit.

alter table public.orders
  add column if not exists learner_profile_id uuid
    references public.learner_profiles (id) on delete restrict;

create index if not exists orders_learner_idx
  on public.orders (learner_profile_id);

comment on column public.orders.learner_profile_id is
  'The learner a course order is for. One purchase covers one learner; null on plan orders and on orders written before 2026-10-22.';

create or replace function public.create_course_order(
  p_course_id          uuid,
  p_learner_profile_id uuid,
  p_buyer_country      text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor        uuid := public.current_user_id();
  v_country      text := public.normalise_country(p_buyer_country);
  v_version      uuid;
  v_course_title text;
  v_price        jsonb;
  v_price_id     uuid;
  v_amount       bigint;
  v_currency     text;
  v_matched      text;
  v_product      uuid;
  v_product_name text;
  v_account      uuid;
  v_account_name text;
  v_account_country text;
  v_account_currency text;
  v_order        uuid;
  v_item         uuid;
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
  -- Who the course is for. One purchase covers one learner (decided
  -- 2026-10-22), so the order names them rather than inferring them from the
  -- payer: the payer is usually a guardian and the learner is usually a child,
  -- and an inference is how the wrong profile ends up with access.
  --
  -- The learner must be the caller or somebody in a family the caller belongs
  -- to. That is a different question from "is the payer's billing account
  -- theirs", which is why it is asked here and not against the account below:
  -- a child profile has no billing membership of its own.
  -- -------------------------------------------------------------------
  if p_learner_profile_id is null then
    raise exception 'checkout:learner_required'
      using errcode = 'invalid_parameter_value';
  end if;

  if not exists (
    select 1
      from public.learner_profiles lp
     where lp.id = p_learner_profile_id
       and lp.status = 'active'
       and lp.deleted_at is null
       and (lp.linked_user_id = v_actor
            or public.is_learner_family_member(lp.id))
  ) then
    raise exception 'checkout:learner_not_yours'
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

  -- -------------------------------------------------------------------
  -- Who is paying. Resolved from the caller's own memberships; never a
  -- parameter, so there is no way to hang an order on somebody else's
  -- account and have their refund or their invoice find it.
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
   order by bam.granted_at
   limit 1;

  if v_account is not null then
    select ba.billing_country, ba.billing_currency::text
      into v_account_country, v_account_currency
      from public.billing_accounts ba
     where ba.id = v_account;

    -- The account's country outlives the request. A later purchase from a
    -- different network does not move it, which is what makes the price a
    -- family saw last week the price their invoice explains.
    v_country := coalesce(v_account_country, v_country);
  end if;

  -- -------------------------------------------------------------------
  -- Which price. The buyer's country picks the market; the account's
  -- currency breaks a tie inside it. No price id is accepted anywhere.
  -- -------------------------------------------------------------------
  v_price := public.resolve_course_price(p_course_id, v_country, v_account_currency);

  if not coalesce((v_price ->> 'resolved')::boolean, false) then
    -- `no_price` means nothing is on sale at all, which is the refusal the
    -- writer already had a key for. The two new keys are about the buyer — the
    -- course is on sale, just not to them where they are.
    raise exception 'checkout:%',
      case coalesce(v_price ->> 'reason', '')
        when 'no_price' then 'price_not_available'
        when 'course_not_available' then 'course_not_available'
        else coalesce(v_price ->> 'reason', 'price_not_available')
      end
      using errcode = case
        when v_price ->> 'reason' in ('no_price', 'course_not_available')
          then 'no_data_found'
        else 'invalid_parameter_value'
      end;
  end if;

  v_price_id := (v_price ->> 'priceId')::uuid;
  v_product  := (v_price ->> 'productId')::uuid;
  v_amount   := (v_price ->> 'amountMinor')::bigint;
  v_currency := v_price ->> 'currencyCode';
  v_matched  := v_price ->> 'matched';

  select pr.name into v_product_name
    from public.products pr
   where pr.id = v_product;

  -- -------------------------------------------------------------------
  -- Would paying grant anything at all? Asked before anything about the
  -- account is written, so a refused double-tap does not move that account's
  -- country or currency on its way out.
  --
  -- One purchase covers one learner, so the question is about that learner and
  -- this version: if they already hold a live `purchase` grant, the order can
  -- only take money for access that exists — a double tap, or a guardian who
  -- does not know the child already has it. Refused with a key the buy page
  -- turns into a sentence (decided 2026-10-22).
  --
  -- Deliberately not asked: whether somebody *else* on the account owns it. A
  -- sibling buying the same course is an ordinary purchase now, and it is the
  -- learner that is refused, never the family. Scoped to `source_type =
  -- 'purchase'` because the fulfilment skips exactly that: a subscription grant
  -- ends with the subscription, so buying the course outright adds permanence
  -- and must still be allowed. A lapsed entitlement, a different version and a
  -- different course all pass.
  -- -------------------------------------------------------------------
  if exists (
    select 1
      from public.entitlement_grants eg
     where eg.learner_profile_id = p_learner_profile_id
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
       'market', v_price ->> 'market',
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

  -- amountMinor is text, not a JSON number. Money carries a bigint all the way
  -- to the wire in this codebase and narrowing it in a return value would be
  -- the one place in the path that could lose precision.
  return jsonb_build_object(
    'orderId', v_order,
    'orderItemId', v_item,
    'billingAccountId', v_account,
    'productId', v_product,
    'priceId', v_price_id,
    'courseVersionId', v_version,
    'learnerProfileId', p_learner_profile_id,
    'amountMinor', v_amount::text,
    'currencyCode', v_currency,
    'title', coalesce(v_product_name, v_course_title),
    'country', v_country,
    'matched', v_matched
  );
end;
$$;

create or replace function public.record_payment_success(p_order_id uuid, p_actor_id uuid, p_provider text, p_reference text, p_event_id uuid DEFAULT NULL::uuid, p_evidence text DEFAULT NULL::text)
 RETURNS orders
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_order   public.orders;
  v_event   public.payment_provider_events;
  v_txn     public.financial_transactions;
  v_result  public.orders;
  v_item    record;
  v_learner record;
  v_granted integer := 0;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'order % not found', p_order_id using errcode = 'no_data_found';
  end if;

  if v_order.status in ('paid', 'refunded', 'partially_refunded') then
    -- Idempotent: confirming twice is not an error, it is a retry. Fulfilment
    -- is skipped as well, so a replayed webhook cannot grant twice.
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

  -- -----------------------------------------------------------------------
  -- Fulfilment
  -- -----------------------------------------------------------------------
  --
  -- Who gets it: the active members of the billing account that paid, each
  -- through their own linked learner profile. For the common single-member
  -- account that is exactly one person. A member with no learner profile is
  -- skipped rather than failing the payment — money has already been taken,
  -- and refusing to settle it over a missing profile would be worse.
  for v_item in
    select distinct pcv.course_id, pcv.course_version_id
      from public.order_items oi
      join public.product_course_versions pcv on pcv.product_id = oi.product_id
     where oi.order_id = p_order_id
       and oi.product_id is not null
  loop
    -- One purchase covers one learner (decided 2026-10-22), so the order names
    -- who it is for and only that profile is granted. The account-wide walk
    -- below is the fallback for orders written before `orders.learner_profile_id`
    -- existed — plan orders never reach this loop, and every new course order
    -- names a learner, so it is only ever a legacy path.
    for v_learner in
      select lp.id as learner_profile_id
        from public.learner_profiles lp
       where lp.deleted_at is null
         and (
           (v_order.learner_profile_id is not null
             and lp.id = v_order.learner_profile_id)
           or (v_order.learner_profile_id is null
             and exists (
               select 1
                 from public.billing_account_memberships bam
                where bam.billing_account_id = v_order.billing_account_id
                  and bam.status = 'active'
                  and bam.user_id = lp.linked_user_id
             ))
         )
    loop
      -- Grant first. can_enrol_in_version() requires an existing entitlement
      -- before a sold version may be enrolled in, so reversing these two
      -- would leave the enrolment unable to justify itself.
      if not exists (
        select 1 from public.entitlement_grants eg
         where eg.learner_profile_id = v_learner.learner_profile_id
           and eg.scope_type = 'course_version'
           and eg.course_version_id = v_item.course_version_id
           and eg.source_type = 'purchase'
           and eg.status = 'active'
      ) then
        insert into public.entitlement_grants
          (learner_profile_id, scope_type, course_version_id,
           source_type, source_id, status, effective_from)
        values
          (v_learner.learner_profile_id, 'course_version', v_item.course_version_id,
           'purchase', p_order_id, 'active', now());
        v_granted := v_granted + 1;
      end if;

      if not exists (
        select 1 from public.course_enrolments ce
         where ce.learner_profile_id = v_learner.learner_profile_id
           and ce.course_version_id = v_item.course_version_id
           and ce.deleted_at is null
      ) then
        insert into public.course_enrolments
          (learner_profile_id, course_id, course_version_id, source, status)
        values
          (v_learner.learner_profile_id, v_item.course_id, v_item.course_version_id,
           'purchase', 'active');
      end if;
    end loop;
  end loop;

  -- ---------------------------------------------------------------------
  -- Earnings
  -- ---------------------------------------------------------------------
  --
  -- The teacher's share of what was just paid. Idempotent per (instructor,
  -- order) so a replayed webhook cannot credit twice. Runs here rather than in
  -- a separate job so the ledger, the order status and the entitlement all move
  -- together or not at all.
  perform public.accrue_instructor_earnings(p_order_id, v_txn.id, p_actor_id);

  if v_granted > 0 then
    insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
    values (p_actor_id, 'entitlement.granted', 'order', p_order_id,
            jsonb_build_object('grants_created', v_granted, 'source_type', 'purchase'));
  end if;

  return v_result;
end;
$function$;


-- The old signature must go explicitly: `create or replace` with a new parameter
-- list creates an overload, and an overload is a second writer nobody reviewed.
drop function if exists public.create_course_order(uuid, text);

comment on function public.create_course_order(uuid, uuid, text) is
  'The only writer of a course order. Names the learner the purchase covers and the course; resolves the price from the buyer''s account country (falling back to the request country on a first purchase) and never takes it from the caller. Refuses a learner who already holds this version.';

revoke all on function public.create_course_order(uuid, uuid, text) from public;
grant execute on function public.create_course_order(uuid, uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Fulfilment follows the order
-- ---------------------------------------------------------------------------
-- Only the grant loop changes: the ledger, the order status, the earnings and
-- the audit entry are untouched.
