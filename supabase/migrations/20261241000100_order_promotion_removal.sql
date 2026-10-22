-- Taking a code off an order, without rewriting what happened.
--
-- The redemption was written at the moment the order was made, so a family who typed
-- the wrong code had no way back: the order carried the wrong total until it expired,
-- and the code itself stayed spent on the campaign's per-family limit, so the family
-- could not use it on the order they went on to place.
--
-- Three rules shape this:
--
--   * **A redemption is append-only, and stays that way.** `promotion_redemptions` has
--     refused every update and delete since the table existed, because the row is the
--     record of what was applied at checkout. Nothing here relaxes that: a void is a new
--     fact about the row, not an edit of it. The trigger is re-stated to allow exactly
--     one transition — `voided_at` set once, with a reason and a person — and refuses
--     every other change with the same sentence as before.
--   * **A voided redemption does not count against a limit.** The three limits count
--     live rows only, so taking a code off returns the slot: the same code can be used
--     on the next order, and a campaign is not quietly exhausted by people correcting a
--     typo.
--   * **Only while unpaid.** Once money has moved, the discount is part of what was
--     charged and what the teacher's share came from. The way out then is a refund,
--     which is a money decision with its own record, not a silent re-price.

alter table public.promotion_redemptions
  add column if not exists voided_at timestamptz,
  add column if not exists voided_by uuid
    references public.user_profiles (user_id) on delete set null,
  add column if not exists voided_reason text;

-- One fact, three columns: a void has a time, a person and a reason, or it is not one.
alter table public.promotion_redemptions
  drop constraint if exists pr_void_agrees;
alter table public.promotion_redemptions
  add constraint pr_void_agrees check (
    (voided_at is null and voided_by is null and voided_reason is null)
    or (voided_at is not null and voided_by is not null
        and length(btrim(coalesce(voided_reason, ''))) between 3 and 500)
  );

create index if not exists promotion_redemptions_live_idx
  on public.promotion_redemptions (campaign_id)
  where voided_at is null;

comment on column public.promotion_redemptions.voided_at is
  'When a code was taken off its order, before any money moved. A voided redemption is history and does not count against a limit.';

-- ---------------------------------------------------------------------------
-- Append-only, except for the one way it can end
-- ---------------------------------------------------------------------------
create or replace function public.reject_redemption_mutation()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    raise exception
      'promotion redemptions are append-only; they snapshot the terms applied at checkout'
      using errcode = 'insufficient_privilege';
  end if;

  -- The only permitted update: a void, from a live row, touching nothing else.
  if old.voided_at is not null
     or new.voided_at is null
     or (new.id, new.campaign_id, new.redeemed_by, new.order_id,
         new.subscription_id, new.benefit_snapshot, new.redeemed_at)
        is distinct from
        (old.id, old.campaign_id, old.redeemed_by, old.order_id,
         old.subscription_id, old.benefit_snapshot, old.redeemed_at) then
    raise exception
      'promotion redemptions are append-only; they snapshot the terms applied at checkout'
      using errcode = 'insufficient_privilege';
  end if;

  return new;
end;
$$;

comment on function public.reject_redemption_mutation() is
  'Refuses every change to a redemption except voiding it once, with a reason: the row is the record of what was applied at checkout.';

-- ---------------------------------------------------------------------------
-- The limits count what is still live
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
   where pr.campaign_id = v_campaign.id
     and pr.voided_at is null;

  if v_campaign.total_usage_limit is not null and v_used >= v_campaign.total_usage_limit then
    raise exception 'promotion:limit_reached_total'
      using errcode = 'check_violation';
  end if;

  if v_campaign.per_user_limit is not null and (
    select count(*) from public.promotion_redemptions pr
     where pr.campaign_id = v_campaign.id and pr.redeemed_by = p_buyer
       and pr.voided_at is null
  ) >= v_campaign.per_user_limit then
    raise exception 'promotion:limit_reached_person'
      using errcode = 'check_violation';
  end if;

  if v_campaign.per_family_limit is not null and p_billing_account is not null and (
    select count(*) from public.promotion_redemptions pr
     where pr.campaign_id = v_campaign.id
       and pr.billing_account_id = p_billing_account
       and pr.voided_at is null
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
  'What a code is worth against a given basket: every eligibility rule and the discount arithmetic, in one place, writing nothing. Counts only redemptions that have not been voided.';

-- `set_promotion_limits()` refuses a limit below what has already happened. What has
-- happened is what has not been undone, so the same filter applies there.
create or replace function public.set_promotion_limits(
  p_campaign_id       uuid,
  p_total_limit       integer,
  p_per_user_limit    integer,
  p_per_family_limit  integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor    uuid := public.current_user_id();
  v_campaign public.promotion_campaigns;
  v_used     integer;
begin
  if v_actor is null then
    raise exception 'sign in to change a promotion'
      using errcode = 'insufficient_privilege';
  end if;

  select * into v_campaign
    from public.promotion_campaigns
   where id = p_campaign_id
   for update;
  if not found then
    raise exception 'no promotion campaign %', p_campaign_id
      using errcode = 'no_data_found';
  end if;

  if not (public.has_role(v_actor, 'platform_admin')
          or (v_campaign.owner_type = 'teacher' and v_campaign.instructor_id = v_actor)) then
    raise exception 'only the owner of this campaign may change its limits'
      using errcode = 'insufficient_privilege';
  end if;

  if p_total_limit is not null and p_total_limit <= 0 then
    raise exception 'a usage limit has to be at least one redemption'
      using errcode = 'invalid_parameter_value';
  end if;
  if p_per_user_limit is not null and p_per_user_limit <= 0 then
    raise exception 'a per-person limit has to be at least one redemption'
      using errcode = 'invalid_parameter_value';
  end if;
  if p_per_family_limit is not null and p_per_family_limit <= 0 then
    raise exception 'a per-family limit has to be at least one redemption'
      using errcode = 'invalid_parameter_value';
  end if;

  -- A limit below what has already happened is not a limit, it is a broken
  -- record. Refused with the number, so the person lowering it can see why.
  -- Live redemptions only: a code taken off an order before payment is not something
  -- that has happened to the campaign, so it does not stop a limit being lowered.
  select count(*) into v_used
    from public.promotion_redemptions pr
   where pr.campaign_id = p_campaign_id
     and pr.voided_at is null;

  if p_total_limit is not null and v_used > p_total_limit then
    raise exception 'this campaign has already been redeemed % times, so the total limit cannot be %',
      v_used, p_total_limit
      using errcode = 'invalid_parameter_value';
  end if;

  update public.promotion_campaigns
     set total_usage_limit = p_total_limit,
         per_user_limit    = p_per_user_limit,
         per_family_limit  = p_per_family_limit,
         updated_at        = now()
   where id = p_campaign_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'promotion.limits_changed', 'promotion_campaign', p_campaign_id,
          jsonb_build_object(
            'from', jsonb_build_object(
              'total', v_campaign.total_usage_limit,
              'per_user', v_campaign.per_user_limit,
              'per_family', v_campaign.per_family_limit),
            'to', jsonb_build_object(
              'total', p_total_limit,
              'per_user', p_per_user_limit,
              'per_family', p_per_family_limit)));

  return jsonb_build_object(
    'totalLimit', p_total_limit,
    'perUserLimit', p_per_user_limit,
    'perFamilyLimit', p_per_family_limit);
end;
$$;

-- ---------------------------------------------------------------------------
-- Taking the code off
-- ---------------------------------------------------------------------------
create or replace function public.remove_promotion_from_order(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_actor      uuid := public.current_user_id();
  v_order      public.orders;
  v_adjustment public.order_adjustments;
  v_redemption public.promotion_redemptions;
  v_campaign   public.promotion_campaigns;
  v_totals     jsonb;
begin
  if v_actor is null then
    raise exception 'promotion:not_signed_in'
      using errcode = 'insufficient_privilege';
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

  select * into v_adjustment
    from public.order_adjustments oa
   where oa.order_id = p_order_id
     and oa.adjustment_type = 'promotion'
     and oa.voided_at is null
   for update;

  if not found then
    raise exception 'promotion:none_applied'
      using errcode = 'no_data_found';
  end if;

  if v_adjustment.promotion_redemption_id is not null then
    select * into v_redemption
      from public.promotion_redemptions pr
     where pr.id = v_adjustment.promotion_redemption_id;

    -- Locked in the same order the redemption takes its locks (order, then campaign),
    -- so removing one code and redeeming another cannot deadlock each other.
    select * into v_campaign
      from public.promotion_campaigns pc
     where pc.id = v_redemption.campaign_id
     for update;

    update public.promotion_redemptions
       set voided_at = now(),
           voided_by = v_actor,
           voided_reason = 'taken off the order before payment'
     where id = v_redemption.id;
  end if;

  -- The adjustment goes: `oa_promotion_agrees` ties a promotion row to a redemption, and
  -- a withdrawn discount that still summed into the total would be a second total.
  delete from public.order_adjustments where id = v_adjustment.id;

  v_totals := public.recompute_order_totals(p_order_id);

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'promotion.removed', 'order', p_order_id,
          jsonb_build_object(
            'code', v_campaign.code,
            'campaignId', v_campaign.id,
            'redemptionId', v_redemption.id,
            'discountMinor', v_adjustment.amount_minor::text,
            'currencyCode', v_order.currency_code,
            'totalMinor', v_totals ->> 'totalMinor'));

  return jsonb_build_object(
    'orderId', p_order_id,
    'code', v_campaign.code,
    'removedMinor', v_adjustment.amount_minor::text,
    'totalMinor', v_totals ->> 'totalMinor',
    'currencyCode', v_order.currency_code
  );
end;
$function$;

comment on function public.remove_promotion_from_order(uuid) is
  'Takes a code off a pending order the caller may pay for: voids the redemption so its slot is not spent, withdraws the adjustment, recomputes the totals and audits the removal. Refused once the order is paid — that is a refund, not a re-price.';

revoke all on function public.remove_promotion_from_order(uuid) from public, anon;
grant  execute on function public.remove_promotion_from_order(uuid) to authenticated;
