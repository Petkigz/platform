-- What would this cost? Answered without creating anything.
--
-- Decided 2026-10-22, recorded open in `NEXT.md` and `DECISIONS.md` when the code was
-- redeemed at checkout: the buy page could show the price, but not the price *after* a
-- code, because the only way to find out was to make the order. A family typed a code
-- and learned the total at the handoff. This is the quote that fixes it.
--
-- Three things had to be true, and each shaped the code:
--
--   * **It creates nothing.** Not an order, not a billing account, not a redemption.
--     A preview is a question, and a question that moves the limit counter is a
--     redemption in disguise.
--   * **It cannot disagree with the charge.** The rules are not re-told here. The
--     eligibility checks and the discount arithmetic were moved out of
--     `apply_promotion_to_order()` into `promotion_quote()`, and both the preview and
--     the redemption call it. One place decides what a code is worth.
--   * **It is not a second way to price.** The learner, the course, the market and the
--     currency come from `resolve_course_checkout()`, which is the same resolver
--     `create_course_order()` now uses. The quotation and the order cannot resolve
--     different prices, because there is only one resolution.
--
-- The one thing the quote does *not* do is reserve anything. Between the quote and the
-- order a campaign can be switched off, a limit can be taken by somebody else, or the
-- learner's access can arrive. The order is still refused then, with the same sentence
-- the preview would have given — which is the honest order of events: the preview is a
-- prediction, and the order is the decision.

-- ---------------------------------------------------------------------------
-- What a code is worth, asked by both the preview and the redemption
-- ---------------------------------------------------------------------------
create or replace function public.promotion_quote(
  p_code            text,
  p_course_ids      uuid[],
  p_buyer           uuid,
  p_billing_account uuid,
  p_country         text,
  p_currency        text,
  p_subtotal        bigint,
  p_credits         bigint,
  p_exclude_order   uuid default null,
  p_lock_campaign   boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code        text := upper(btrim(coalesce(p_code, '')));
  v_campaign    public.promotion_campaigns;
  v_benefit     public.promotion_benefits;
  v_discount    bigint;
  v_total       bigint;
  v_used        integer;
  v_has_courses boolean;
  v_matches     boolean;
  v_outsiders   boolean;
begin
  if p_buyer is null then
    raise exception 'promotion:not_signed_in'
      using errcode = 'insufficient_privilege';
  end if;

  if v_code = '' then
    raise exception 'promotion:code_required'
      using errcode = 'invalid_parameter_value';
  end if;

  -- Locked while redeeming so two checkouts racing for the last use cannot both pass
  -- the limits check. A preview takes no lock: it writes nothing, and holding a row
  -- lock for a question would let anybody freeze a campaign by typing its code.
  if p_lock_campaign then
    select * into v_campaign
      from public.promotion_campaigns pc
     where pc.code = v_code
     for update;
  else
    select * into v_campaign
      from public.promotion_campaigns pc
     where pc.code = v_code;
  end if;

  if not found then
    raise exception 'promotion:unknown_code'
      using errcode = 'no_data_found';
  end if;

  if v_campaign.status <> 'active' then
    raise exception 'promotion:not_active'
      using errcode = 'object_not_in_prerequisite_state';
  end if;

  if (v_campaign.starts_at is not null and v_campaign.starts_at > now())
     or (v_campaign.ends_at is not null and v_campaign.ends_at <= now()) then
    raise exception 'promotion:not_running'
      using errcode = 'object_not_in_prerequisite_state';
  end if;

  select * into v_benefit
    from public.promotion_benefits pb
   where pb.campaign_id = v_campaign.id
   order by pb.position
   limit 1;
  if not found then
    raise exception 'promotion:no_benefit'
      using errcode = 'no_data_found';
  end if;

  -- The market. The account's country is what a campaign is aimed at, for the same
  -- reason it is what a price is resolved from: a recorded fact, not this request's
  -- idea of where the buyer is.
  if exists (
    select 1 from public.promotion_campaign_markets pcm
     where pcm.campaign_id = v_campaign.id
  ) and not exists (
    select 1 from public.promotion_campaign_markets pcm
     where pcm.campaign_id = v_campaign.id
       and pcm.market = p_country
  ) then
    raise exception 'promotion:not_in_market'
      using errcode = 'invalid_parameter_value';
  end if;

  -- The courses. An order may hold one course today; the check is written for any
  -- number so a bundled order cannot quietly discount a course the campaign never
  -- named. *Every* course in the order must be named, and at least one must be.
  select exists (
    select 1 from public.promotion_campaign_courses pcc
     where pcc.campaign_id = v_campaign.id
  ) into v_has_courses;

  if v_has_courses then
    select
      exists (
        select 1 from unnest(coalesce(p_course_ids, '{}'::uuid[])) as c(course_id)
          join public.promotion_campaign_courses pcc
            on pcc.course_id = c.course_id and pcc.campaign_id = v_campaign.id
      ),
      exists (
        select 1 from unnest(coalesce(p_course_ids, '{}'::uuid[])) as c(course_id)
         where not exists (
           select 1 from public.promotion_campaign_courses pcc
            where pcc.campaign_id = v_campaign.id
              and pcc.course_id = c.course_id
         )
      )
      into v_matches, v_outsiders;

    if not v_matches or v_outsiders then
      raise exception 'promotion:not_for_this_course'
        using errcode = 'invalid_parameter_value';
    end if;
  end if;

  -- New customers only: the account has never paid for anything. `p_exclude_order` is
  -- the order being redeemed against — it is pending, so it cannot make the account
  -- look like a customer, but excluding it keeps the check and the history aligned.
  if v_campaign.new_customers_only and p_billing_account is not null and exists (
    select 1 from public.orders o
     where o.billing_account_id = p_billing_account
       and o.id is distinct from p_exclude_order
       and o.status in ('paid', 'partially_refunded', 'refunded')
  ) then
    raise exception 'promotion:new_customers_only'
      using errcode = 'insufficient_privilege';
  end if;

  -- The three limits. Total, the person who typed the code, and the family — the
  -- billing account — because one guardian buys for several children. A preview with
  -- no account yet (a first purchase) cannot have a family history, so that check is
  -- skipped rather than guessed.
  select count(*) into v_used
    from public.promotion_redemptions pr
   where pr.campaign_id = v_campaign.id;

  if v_campaign.total_usage_limit is not null and v_used >= v_campaign.total_usage_limit then
    raise exception 'promotion:limit_reached_total'
      using errcode = 'check_violation';
  end if;

  if v_campaign.per_user_limit is not null and (
    select count(*) from public.promotion_redemptions pr
     where pr.campaign_id = v_campaign.id and pr.redeemed_by = p_buyer
  ) >= v_campaign.per_user_limit then
    raise exception 'promotion:limit_reached_person'
      using errcode = 'check_violation';
  end if;

  if v_campaign.per_family_limit is not null and p_billing_account is not null and (
    select count(*) from public.promotion_redemptions pr
     where pr.campaign_id = v_campaign.id
       and pr.billing_account_id = p_billing_account
  ) >= v_campaign.per_family_limit then
    raise exception 'promotion:limit_reached_family'
      using errcode = 'check_violation';
  end if;

  -- What the discount is, in the order's own money.
  if v_benefit.benefit_type = 'percent_off' then
    -- Rounded once, in the currency being charged. A percentage follows the local
    -- price, so there is nothing to convert and no second rounding.
    v_discount := round(p_subtotal::numeric * v_benefit.percent_off / 100)::bigint;
  else
    if btrim(v_benefit.amount_off_currency) <> btrim(coalesce(p_currency, '')) then
      raise exception 'promotion:currency_mismatch'
        using errcode = 'invalid_parameter_value';
    end if;
    v_discount := least(v_benefit.amount_off_minor, p_subtotal);
  end if;

  if v_discount < 1 then
    raise exception 'promotion:nothing_off'
      using errcode = 'check_violation';
  end if;

  v_total := p_subtotal - coalesce(p_credits, 0) - v_discount;
  if v_total <= 0 then
    -- A zero total cannot settle: the ledger refuses a zero capture. Saying so is
    -- better than creating an order nobody can pay.
    raise exception 'promotion:would_be_free'
      using errcode = 'check_violation';
  end if;

  return jsonb_build_object(
    'campaignId', v_campaign.id,
    'code', v_campaign.code,
    'name', v_campaign.name,
    'benefitType', v_benefit.benefit_type,
    'percent', v_benefit.percent_off,
    'amountMinor', v_benefit.amount_off_minor::text,
    'amountCurrency', v_benefit.amount_off_currency,
    'discountMinor', v_discount::text,
    'totalMinor', v_total::text,
    'currencyCode', p_currency,
    'country', p_country,
    -- Snapshotted onto the redemption so the terms of a discount never move with the
    -- campaign. Built here, once, so the preview and the record cannot differ.
    'benefitSnapshot', jsonb_build_object(
      'code', v_campaign.code,
      'name', v_campaign.name,
      'type', v_benefit.benefit_type,
      'percent', v_benefit.percent_off,
      'amountMinor', v_benefit.amount_off_minor,
      'currency', v_benefit.amount_off_currency,
      'discountMinor', v_discount,
      'orderCurrency', p_currency,
      'country', p_country)
  );
end;
$$;

comment on function public.promotion_quote(text,uuid[],uuid,uuid,text,text,bigint,bigint,uuid,boolean) is
  'What a code is worth against a given basket: every eligibility rule and the discount arithmetic, in one place, writing nothing. Called by both quote_course_order() and apply_promotion_to_order() so a preview cannot disagree with the charge.';

revoke all on function public.promotion_quote(text,uuid[],uuid,uuid,text,text,bigint,bigint,uuid,boolean) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Redeeming: the same answer, written down
-- ---------------------------------------------------------------------------
create or replace function public.apply_promotion_to_order(
  p_order_id uuid,
  p_code     text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor      uuid := public.current_user_id();
  v_order      public.orders;
  v_course_ids uuid[];
  v_country    text;
  v_subtotal   bigint;
  v_credits    bigint;
  v_quote      jsonb;
  v_discount   bigint;
  v_redemption uuid;
begin
  if v_actor is null then
    raise exception 'promotion:not_signed_in'
      using errcode = 'insufficient_privilege';
  end if;

  if btrim(coalesce(p_code, '')) = '' then
    raise exception 'promotion:code_required'
      using errcode = 'invalid_parameter_value';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'promotion:order_not_found'
      using errcode = 'no_data_found';
  end if;

  if v_order.status <> 'pending_payment' then
    raise exception 'promotion:order_not_pending'
      using errcode = 'object_not_in_prerequisite_state';
  end if;

  if not exists (
    select 1 from public.billing_account_memberships bam
     where bam.billing_account_id = v_order.billing_account_id
       and bam.user_id = v_actor
       and bam.status = 'active'
       and bam.can_manage_payment_methods
  ) then
    raise exception 'promotion:not_your_order'
      using errcode = 'insufficient_privilege';
  end if;

  -- One code per order. Two credits would make "what did the code take off"
  -- unanswerable, and the stacking question is recorded as out of scope.
  if exists (
    select 1 from public.order_adjustments oa
     where oa.order_id = p_order_id
       and oa.adjustment_type = 'promotion'
       and oa.voided_at is null
  ) then
    raise exception 'promotion:already_applied'
      using errcode = 'check_violation';
  end if;

  select coalesce(array_agg(distinct pcv.course_id), '{}'::uuid[])
    into v_course_ids
    from public.order_items oi
    join public.product_course_versions pcv on pcv.product_id = oi.product_id
   where oi.order_id = p_order_id;

  select ba.billing_country into v_country
    from public.billing_accounts ba
   where ba.id = v_order.billing_account_id;

  select coalesce(sum(oi.line_total_minor), 0)::bigint
    into v_subtotal
    from public.order_items oi
   where oi.order_id = p_order_id;

  select coalesce(sum(oa.amount_minor), 0)::bigint
    into v_credits
    from public.order_adjustments oa
   where oa.order_id = p_order_id
     and oa.voided_at is null
     and oa.direction = 'credit';

  v_quote := public.promotion_quote(
    p_code, v_course_ids, v_actor, v_order.billing_account_id,
    v_country, v_order.currency_code, v_subtotal, v_credits,
    p_order_id, true);

  v_discount := (v_quote ->> 'discountMinor')::bigint;

  insert into public.promotion_redemptions
    (campaign_id, redeemed_by, order_id, billing_account_id, benefit_snapshot)
  values
    ((v_quote ->> 'campaignId')::uuid, v_actor, p_order_id, v_order.billing_account_id,
     v_quote -> 'benefitSnapshot')
  returning id into v_redemption;

  insert into public.order_adjustments
    (order_id, adjustment_type, amount_minor, currency_code, direction,
     promotion_redemption_id, description)
  values
    (p_order_id, 'promotion', v_discount, v_order.currency_code, 'credit',
     v_redemption, 'Code ' || (v_quote ->> 'code') || ' — ' || (v_quote ->> 'name'));

  perform public.recompute_order_totals(p_order_id);

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'promotion.redeemed', 'order', p_order_id,
          jsonb_build_object(
            'code', v_quote ->> 'code',
            'campaignId', v_quote ->> 'campaignId',
            'discountMinor', v_discount::text,
            'currencyCode', v_order.currency_code));

  return jsonb_build_object(
    'code', v_quote ->> 'code',
    'campaignName', v_quote ->> 'name',
    'redemptionId', v_redemption,
    'discountMinor', v_discount::text,
    'totalMinor', v_quote ->> 'totalMinor',
    'currencyCode', v_order.currency_code
  );
end;
$$;

comment on function public.apply_promotion_to_order(uuid,text) is
  'Redeems a code against a pending order the caller may pay for, in the same transaction. The rules come from promotion_quote(); this function adds the order checks and writes the redemption, the adjustment, the totals and the audit row.';

-- ---------------------------------------------------------------------------
-- One resolution of "what is being bought, by whom, at what price"
-- ---------------------------------------------------------------------------
create or replace function public.resolve_course_checkout(
  p_course_id          uuid,
  p_learner_profile_id uuid,
  p_buyer_country      text
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
  v_account_country  text;
  v_account_currency text;
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

  -- Money travels as text for the same reason every writer in this schema does it:
  -- a jsonb number is a numeric, and narrowing money on the way out is the one place
  -- a path could lose a shilling.
  return jsonb_build_object(
    'courseVersionId', v_version,
    'courseTitle', v_course_title,
    'productId', v_product,
    'productName', v_product_name,
    'priceId', v_price_id,
    'amountMinor', v_amount::text,
    'currencyCode', v_currency,
    'matched', v_matched,
    'market', v_price ->> 'market',
    'billingAccountId', v_account,
    'accountCountry', v_account_country,
    'accountCurrency', v_account_currency,
    'country', v_country
  );
end;
$$;

comment on function public.resolve_course_checkout(uuid,uuid,text) is
  'The only resolution of learner, course version, market and price for a course checkout. Reads and refuses; writes nothing. Used by both create_course_order() and quote_course_order() so a preview cannot price something differently from the order.';

revoke all on function public.resolve_course_checkout(uuid,uuid,text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- The order
-- ---------------------------------------------------------------------------
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
    'currencyCode', v_currency,
    'title', coalesce(v_product_name, v_course_title),
    'country', v_country,
    'matched', v_matched
  );
end;
$$;

comment on function public.create_course_order(uuid,uuid,text,text) is
  'The only writer of a course order. Names the learner the purchase covers and, optionally, a promotion code applied in the same transaction. The price is resolved through resolve_course_checkout() and never taken from the caller; the currency follows the price. Refuses a learner who already holds this version.';

-- ---------------------------------------------------------------------------
-- The quote
-- ---------------------------------------------------------------------------
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

  return jsonb_build_object(
    'courseId', p_course_id,
    'courseVersionId', (v_checkout ->> 'courseVersionId')::uuid,
    'learnerProfileId', p_learner_profile_id,
    'title', coalesce(v_checkout ->> 'productName', v_checkout ->> 'courseTitle'),
    'listMinor', v_amount::text,
    'discountMinor', coalesce(v_promo ->> 'discountMinor', '0'),
    'totalMinor', coalesce(v_promo ->> 'totalMinor', v_amount::text),
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
  'What this course would cost this learner, after an optional code, without creating an order, a billing account or a redemption. The rules come from resolve_course_checkout() and promotion_quote(), which are the ones the charge uses.';

revoke all on function public.quote_course_order(uuid,uuid,text,text) from public, anon;
grant  execute on function public.quote_course_order(uuid,uuid,text,text) to authenticated;
