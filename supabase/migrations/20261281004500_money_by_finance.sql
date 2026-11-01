-- -----------------------------------------------------------------------------
-- Money by hand is finance's, and a signature is not something a console types
-- -----------------------------------------------------------------------------
--
-- `20261281004400` closed two seams found by walking a staff day. It left one
-- edge on the record rather than fixed: `record_payment_success()` (manual
-- evidence) and `complete_refund()` (manual settlement) each admitted any
-- privileged caller, which includes a support agent. This is that edge.
--
-- Narrowing the manual branch alone would have been decorative, because three
-- other doors opened onto the same room:
--
--   1. Both writers also accept a *provider event*, and a support agent can read
--      `payment_provider_events` (policy `ppe_read` is `staff_only()`). Citing
--      any verified event id would settle a refund as though the provider had
--      confirmed it. The event door now asks the same question of the session.
--
--   2. Both take the actor as an argument, because a webhook has no session.
--      An argument can name somebody else, so a caller check is added beside the
--      actor check rather than instead of it.
--
--   3. `ppe_write` let any privileged user INSERT an event with
--      `signature_verified = true`. That is a signature the console typed. The
--      webhook writes events with the service role, which does not consult RLS,
--      so nothing that verifies signatures needs that policy — but a staff
--      member could squat a provider event id and have the genuine delivery
--      deduplicated away. A person may record an event they cannot vouch for;
--      only the code holding the secret may mark one verified.
--
-- The honest statement after this: **money moves by hand only through a finance
-- admin or the owner.** A provider callback still settles itself, because that
-- is what a confirmed payment is.
--
-- Still open, and named rather than papered over: neither writer checks that a
-- provider event belongs to the order or refund it is applied to. That needs the
-- callback's payload contract, and there is no provider yet (P12). It is a
-- finance-or-service-role mistake now, not a support agent's escalation route.

-- -----------------------------------------------------------------------------
-- 1. The only path to a paid order
-- -----------------------------------------------------------------------------

create or replace function public.record_payment_success(p_order_id uuid, p_actor_id uuid, p_provider text, p_reference text, p_event_id uuid DEFAULT NULL::uuid, p_evidence text DEFAULT NULL::text)
 RETURNS orders
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_caller  uuid := public.current_user_id();
  v_order   public.orders;
  v_event   public.payment_provider_events;
  v_txn     public.financial_transactions;
  v_result  public.orders;
  v_item    record;
  v_learner record;
  v_granted integer := 0;
begin
  -- Who is asking, before anything is read. A provider callback arrives on the
  -- service role, which carries no JWT subject, so `v_caller` is null there and
  -- there is nobody to check. Every signed-in human must be finance.
  --
  -- Checking only the passed-in actor would not be enough, and this is the whole
  -- reason for a second check: `p_actor_id` is an argument, and an argument can
  -- name somebody else. A support agent could pass the owner's id.
  if v_caller is not null
     and not (public.has_role(v_caller, 'finance_admin')
              or public.has_role(v_caller, 'platform_admin')) then
    raise exception 'only a finance admin or platform admin may confirm a payment'
      using errcode = 'insufficient_privilege';
  end if;

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
    -- A typed sentence about a bank slip is evidence only from a person who may
    -- move money. Support cannot, which is the point: the least-trusted staff
    -- account must not be able to mark an order paid that nobody paid. The actor
    -- is checked as well as the caller, because the confirmation is recorded
    -- against the actor and an attribution nobody verified is not an attribution.
    if not (public.has_role(p_actor_id, 'finance_admin')
            or public.has_role(p_actor_id, 'platform_admin')) then
      raise exception
        'manual payment confirmation requires a finance admin or platform admin, and written evidence'
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
revoke all on function public.record_payment_success(uuid, uuid, text, text, uuid, text) from public;
grant execute on function public.record_payment_success(uuid, uuid, text, text, uuid, text) to authenticated;

revoke execute on function public.complete_refund(uuid, text, uuid, uuid) from public;
grant execute on function public.complete_refund(uuid, text, uuid, uuid) to authenticated;


-- -----------------------------------------------------------------------------
-- 2. Settling an approved refund
-- -----------------------------------------------------------------------------

create or replace function public.complete_refund(
  p_transaction_id     uuid,
  p_provider_reference text,
  p_actor_id           uuid default null,
  p_event_id           uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := public.current_user_id();
  v_actor  uuid := coalesce(p_actor_id, v_caller);
  v_txn    public.refund_transactions;
  v_event  public.payment_provider_events;
  v_req    public.refund_requests;
begin
  -- Whoever is signed in must be finance, whichever door they came through.
  --
  -- Without this the provider-event door is a way around the manual one: a
  -- support agent can read payment_provider_events, so they could cite any
  -- verified event id and settle a refund as though the provider had confirmed
  -- it. A real callback has no session at all, so there is nobody to check —
  -- and `v_caller`, not the passed-in actor, is what a person cannot choose.
  if v_caller is not null
     and not (public.has_role(v_caller, 'finance_admin')
              or public.has_role(v_caller, 'platform_admin')) then
    raise exception 'only a finance admin or platform admin may settle a refund'
      using errcode = 'insufficient_privilege';
  end if;

  -- Two ways to settle, mirroring payment confirmation: a finance admin, or a
  -- provider event that has already passed signature verification and has not
  -- been applied. Anything else is refused.
  if p_event_id is not null then
    select * into v_event from public.payment_provider_events where id = p_event_id;
    if not found then
      raise exception 'provider event % not found', p_event_id using errcode = 'no_data_found';
    end if;
    if not v_event.signature_verified then
      raise exception
        'provider event % has not passed signature verification and cannot settle a refund',
        p_event_id
        using errcode = 'check_violation';
    end if;
  elsif not (public.has_role(v_actor, 'finance_admin')
             or public.has_role(v_actor, 'platform_admin')) then
    raise exception
      'a refund must be settled by a finance admin or platform admin, or against a verified provider event'
      using errcode = 'insufficient_privilege';
  end if;

  select * into v_txn from public.refund_transactions where id = p_transaction_id;
  if v_txn.id is null then
    raise exception 'refund transaction not found' using errcode = 'P0002';
  end if;

  if v_txn.status = 'completed' then
    return; -- idempotent: a retried webhook is not an error
  end if;

  if v_txn.status <> 'pending' then
    raise exception
      'that refund is %, so it cannot be settled', v_txn.status
      using errcode = 'check_violation';
  end if;

  if exists (
    select 1 from public.refund_requests rr
     where rr.id = v_txn.refund_request_id
       and rr.requested_by = v_actor
  ) then
    raise exception
      'you cannot settle a refund you requested yourself'
      using errcode = 'insufficient_privilege';
  end if;

  -- Fires record_refund_in_ledger(), which writes the debit to the ledger.
  update public.refund_transactions
     set status             = 'completed',
         refunded_at        = now(),
         processed_by       = case when public.is_privileged(v_actor) then v_actor end,
         provider_reference = coalesce(p_provider_reference, provider_reference)
   where id = p_transaction_id;

  update public.refund_requests
     set status = 'completed'
   where id = v_txn.refund_request_id
     and status = 'approved';

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (
    v_actor,
    'refund.completed',
    'refund_transaction',
    p_transaction_id,
    jsonb_build_object(
      'order_id',     v_txn.order_id,
      'amount_minor', v_txn.amount_minor,
      'reference',    p_provider_reference
    )
  );
end;
$$;


-- -----------------------------------------------------------------------------
-- 3. A signature is written by the thing that verifies it
-- -----------------------------------------------------------------------------

drop policy if exists ppe_write on public.payment_provider_events;
create policy ppe_write on public.payment_provider_events
  for insert to authenticated
  with check (public.staff_only() and signature_verified = false);

comment on policy ppe_write on public.payment_provider_events is
  'A person may record a provider event they cannot vouch for. Only the service role, which does not consult RLS, may write signature_verified = true.';

comment on function public.record_payment_success(uuid, uuid, text, text, uuid, text) is
  'The only writer of the paid state and the fulfilment step. A verified provider event with no session, or a finance admin or platform admin with written evidence. D4 is unchanged: order amounts are authoritative, minor units throughout, idempotent on replay, an unsigned or already-processed provider event is refused, and a redirect is not proof.';

comment on function public.complete_refund(uuid, text, uuid, uuid) is
  'Settle an approved refund once the provider confirms, or by hand as a finance admin or platform admin. Idempotent; writes the ledger entry, links it to the request and updates the order.';
