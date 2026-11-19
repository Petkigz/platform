-- A sponsor pays a pledge through checkout.
--
-- Until now a pledge became a seat only when staff typed in a reference for
-- money that had arrived some other way, and no page told a sponsor what
-- that other way was. The owner's decision (2026-11-19): a pledge is paid
-- through the same checkout as a course, by the same payment providers, and
-- no sentence of instruction is written in the meantime.
--
-- What this adds:
--
--   1. `create_sponsorship_order()`: the sponsor asks to pay a pledge of
--      their own. An order is written for exactly the amount pledged, in the
--      pledge's currency, with no learner on it and one item that names no
--      product. Asking twice gives the same order back while it is still
--      waiting.
--   2. A trigger on `orders`: when such an order becomes paid, the seat is
--      granted exactly as `record_sponsorship_payment()` grants it (an
--      entitlement and an enrolment, both `scholarship`), the pledge becomes
--      `paid` and the request `funded`.
--
-- **Why the order names no learner, and its item no product.** A sponsor
-- must never learn who they helped, and an order is readable by whoever pays
-- it. And an item that named the course's product would be fulfilled by
-- `record_payment_success()` for the members of the account that paid, which
-- is the sponsor. But an order cannot be paid with no item at all: its
-- subtotal has to be the sum of its lines. So an order item may now name
-- neither a product nor a plan when, and only when, it says it is a pledge.
-- Such an item grants nothing by itself; the trigger does the one grant that
-- is meant.
--
-- **Why a trigger and not a change to `record_payment_success()`.** That
-- function is the one writer of a paid order and has been re-created by five
-- migrations. Adding to it means copying all of it. The trigger sees the
-- same moment (the status becoming `paid`, whoever made it so: a provider's
-- confirmed callback, or finance with written evidence) and runs in the same
-- transaction.
--
-- **Money that arrives for a pledge that can no longer be honoured** (called
-- off since, the request no longer approved, the course withdrawn, or
-- already recorded by hand) does not fail the payment: the money has moved,
-- and refusing to record that would hide it. The order is paid, the pledge
-- is left as it was, and `sponsorship.payment_unapplied` is written to the
-- audit trail with the reason, for finance to refund or to apply by hand.
--
-- **What the amount is.** The amount pledged, exactly. No tax or transfer
-- fee is added: the sponsor was told one number when they pledged.
--
-- Not changed: who may pledge, withdraw or decide; what either side is told
-- about the other; `record_sponsorship_payment()`, which stays as the way
-- staff record money that arrived outside checkout. Both switches,
-- `commerce.sponsorship` and `commerce.checkout`, must be on, and both ship
-- off.

-- The order a pledge is being paid through. One order, one pledge.
alter table public.sponsorships
  add column order_id uuid unique references public.orders (id) on delete restrict;

comment on column public.sponsorships.order_id is
  'The order this pledge is being, or was, paid through at checkout. Null for a pledge nobody has tried to pay there. Never shown to the applicant.';

-- A pledge paid at checkout was recorded by nobody: a provider confirmed it.
-- It still has a time and a reference, and the order says the rest.
alter table public.sponsorships drop constraint sp_paid_agrees;
alter table public.sponsorships add constraint sp_paid_agrees check (
  (status = 'paid')
    = (recorded_at is not null
       and reference is not null
       and (recorded_by is not null or order_id is not null))
);

-- An order line for a pledge names no product and no plan. Every other line
-- still names exactly one of them.
alter table public.order_items drop constraint oi_single_target;
alter table public.order_items add constraint oi_single_target check (
  ((product_id is not null) <> (plan_version_id is not null))
  or (product_id is null
      and plan_version_id is null
      -- `coalesce`, because a snapshot with no `kind` would make this NULL,
      -- and a CHECK that is NULL passes.
      and coalesce(item_snapshot ->> 'kind', '') = 'sponsorship_pledge')
);

-- ---------------------------------------------------------------------------
-- Asking to pay
-- ---------------------------------------------------------------------------
create or replace function public.create_sponsorship_order(p_sponsorship uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor   uuid := public.current_user_id();
  v_row     public.sponsorships;
  v_order   public.orders;
  v_account uuid;
  v_name    text;
  v_title   text;
  v_id      uuid;
begin
  if v_actor is null then
    raise exception 'sponsorship:not_signed_in'
      using errcode = 'insufficient_privilege';
  end if;
  if not public.setting_bool('commerce.sponsorship', false) then
    raise exception 'sponsorship:disabled'
      using errcode = 'feature_not_supported';
  end if;
  if not public.setting_bool('commerce.checkout', false) then
    raise exception 'checkout:disabled'
      using errcode = 'insufficient_privilege';
  end if;

  -- Somebody else's pledge and no pledge at all are the same answer.
  select * into v_row
    from public.sponsorships
   where id = p_sponsorship and donor_user_id = v_actor
     for update;
  if not found then
    raise exception 'sponsorship:not_found'
      using errcode = 'no_data_found';
  end if;
  if v_row.status <> 'pledged' then
    raise exception 'sponsorship:not_pledged'
      using errcode = 'check_violation';
  end if;

  if v_row.order_id is not null then
    select * into v_order from public.orders where id = v_row.order_id;
    if v_order.status = 'pending_payment' then
      -- Asked again while the first order waits: the same order, not a second.
      return jsonb_build_object(
        'orderId', v_order.id,
        'amountMinor', v_order.total_minor::text,
        'currencyCode', v_order.currency_code::text,
        'changed', false);
    end if;
    if v_order.status in ('paid', 'partially_refunded', 'refunded', 'awaiting_confirmation') then
      -- Money has moved, or may have, and the pledge was not settled by it.
      -- That is for finance to look at, not for a second charge.
      raise exception 'sponsorship:not_pledged'
        using errcode = 'check_violation';
    end if;
    -- Cancelled, failed or expired: that order is over, and a new one is made.
  end if;

  -- The sponsor's own account. Opened only when they have none, in the
  -- currency of the pledge; an account they already have is not changed.
  select bam.billing_account_id into v_account
    from public.billing_account_memberships bam
   where bam.user_id = v_actor and bam.status = 'active'
   limit 1;

  if v_account is null then
    select nullif(trim(up.display_name), '') into v_name
      from public.user_profiles up
     where up.user_id = v_actor;

    insert into public.billing_accounts
      (display_name, billing_currency, status, created_by)
    values
      (coalesce(v_name, 'My account'), v_row.currency_code, 'active', v_actor)
    returning id into v_account;
    -- No membership insert: billing_accounts_grant_creator makes the creator
    -- a member, as it does for a first purchase.
  end if;

  insert into public.orders
    (billing_account_id, currency_code, subtotal_minor, discount_minor, tax_minor,
     total_minor, status, placed_at, placed_by)
  values
    (v_account, v_row.currency_code, v_row.amount_minor, 0, 0,
     v_row.amount_minor, 'pending_payment', now(), v_actor)
  returning id into v_id;

  -- One line, for the amount pledged. It names the course, which the sponsor
  -- chose and already reads on their own page, and nothing about who asked.
  select c.title into v_title
    from public.sponsorship_applications a
    join public.courses c on c.id = a.course_id
   where a.id = v_row.application_id;

  insert into public.order_items
    (order_id, quantity, unit_price_minor, currency_code, discount_minor,
     line_total_minor, item_snapshot)
  values
    (v_id, 1, v_row.amount_minor, v_row.currency_code, 0, v_row.amount_minor,
     jsonb_build_object(
       'kind', 'sponsorship_pledge',
       'title', 'Sponsored seat: ' || coalesce(v_title, 'a course'),
       'sponsorship_id', v_row.id,
       'billing_interval', 'one_time'));

  update public.sponsorships set order_id = v_id where id = v_row.id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'sponsorship.order_created', 'sponsorship', v_row.id,
          jsonb_build_object('orderId', v_id,
                             'amountMinor', v_row.amount_minor::text,
                             'currency', v_row.currency_code,
                             'replaced', v_row.order_id));

  return jsonb_build_object(
    'orderId', v_id,
    'amountMinor', v_row.amount_minor::text,
    'currencyCode', v_row.currency_code,
    'changed', true);
end;
$$;

comment on function public.create_sponsorship_order(uuid) is
  'A sponsor asks to pay a pledge of their own at checkout: an order for exactly the amount pledged, with no learner and one line that names no product. The same order is returned while it waits. Grants nothing; the seat opens when the order is paid.';

revoke all on function public.create_sponsorship_order(uuid) from public, anon, authenticated;
grant execute on function public.create_sponsorship_order(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- The order is paid: the seat opens
-- ---------------------------------------------------------------------------
create or replace function public.sponsorship_settle_paid_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row     public.sponsorships;
  v_app     public.sponsorship_applications;
  v_version uuid;
  v_course  uuid;
  v_grant   uuid;
  v_why     text := null;
begin
  select * into v_row from public.sponsorships where order_id = new.id for update;
  if not found then
    return new;
  end if;

  select * into v_app from public.sponsorship_applications where id = v_row.application_id;

  if v_row.status <> 'pledged' then
    -- Called off since, or already recorded by hand.
    v_why := 'pledge_' || v_row.status;
  elsif v_app.status <> 'approved' then
    v_why := 'request_' || v_app.status;
  else
    select cv.id, cv.course_id into v_version, v_course
      from public.courses c
      join public.course_versions cv on cv.course_id = c.id
     where c.id = v_app.course_id
       and c.status = 'active'
       and c.deleted_at is null
       and cv.version_status = 'published'
     order by cv.version_number desc
     limit 1;
    if v_version is null then
      v_why := 'course_not_available';
    end if;
  end if;

  if v_why is not null then
    -- The money has moved. Refusing to record that would hide it; what is
    -- recorded instead is that it bought nothing, and why.
    insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
    values (null, 'sponsorship.payment_unapplied', 'sponsorship', v_row.id,
            jsonb_build_object('orderId', new.id,
                               'reason', v_why,
                               'amountMinor', new.total_minor::text,
                               'currency', new.currency_code::text));
    return new;
  end if;

  -- From here on, the same grant `record_sponsorship_payment()` makes.
  -- Grant first: `can_enrol_in_version()` demands an existing entitlement.
  select eg.id into v_grant
    from public.entitlement_grants eg
   where eg.learner_profile_id = v_app.learner_profile_id
     and eg.scope_type = 'course_version'
     and eg.course_version_id = v_version
     and eg.status = 'active'
   limit 1;

  if v_grant is null then
    insert into public.entitlement_grants
      (learner_profile_id, scope_type, course_version_id, source_type, source_id, status,
       effective_from)
    values
      (v_app.learner_profile_id, 'course_version', v_version, 'scholarship', v_row.id,
       'active', now())
    returning id into v_grant;
  end if;

  if not exists (
    select 1 from public.course_enrolments ce
     where ce.learner_profile_id = v_app.learner_profile_id
       and ce.course_version_id = v_version
       and ce.deleted_at is null
  ) then
    insert into public.course_enrolments
      (learner_profile_id, course_id, course_version_id, source, status)
    values
      (v_app.learner_profile_id, v_course, v_version, 'scholarship', 'active');
  end if;

  update public.sponsorships
     set status = 'paid',
         -- What the order was paid against, as the order records it.
         reference = left(coalesce(nullif(btrim(new.payment_evidence), ''), 'order ' || new.id::text), 200),
         evidence = 'Paid at checkout, order ' || new.id::text,
         recorded_by = null,
         recorded_at = now(),
         entitlement_grant_id = v_grant
   where id = v_row.id;

  update public.sponsorship_applications
     set status = 'funded'
   where id = v_row.application_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (null, 'sponsorship.paid', 'sponsorship', v_row.id,
          jsonb_build_object('via', 'checkout',
                             'orderId', new.id,
                             'amountMinor', v_row.amount_minor,
                             'currency', v_row.currency_code,
                             'seatCode', v_app.seat_code,
                             'entitlementGrantId', v_grant));

  return new;
end;
$$;

comment on function public.sponsorship_settle_paid_order() is
  'When an order a pledge is being paid through becomes paid: grant the seat as record_sponsorship_payment() does. When the pledge can no longer be honoured, the order stays paid and the audit trail says why nothing was granted.';

revoke all on function public.sponsorship_settle_paid_order() from public, anon, authenticated;

create trigger orders_settle_sponsorship
  after update of status on public.orders
  for each row
  when (new.status = 'paid' and old.status is distinct from 'paid')
  execute function public.sponsorship_settle_paid_order();

comment on table public.sponsorships is
  'A donor covering one approved seat. Pledged first; paid when the order it is paid through at checkout is confirmed, or when staff record money that arrived another way.';
