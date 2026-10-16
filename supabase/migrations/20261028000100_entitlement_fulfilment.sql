-- Nothing ever created an entitlement grant.
--
-- `can_access_course_version()` consults `entitlement_grants` and nothing
-- else. That is the recorded design — enrolment is not entitlement is not
-- availability — and it was implemented correctly. What was missing is the
-- writer. Measured rather than reasoned:
--
--   INSERT INTO entitlement_grants in supabase/migrations  -> 0 sites
--   references in web/src                                  -> 0
--   functions mentioning the table                         -> 1 (the reader)
--   triggers on course_enrolments                          -> set_updated_at,
--                                                             protect_pin
--   record_payment_success() writes                        -> ledger, orders,
--                                                             audit only
--   rows in a fresh database                               -> 0
--
-- So no learner was ever entitled to anything, and the platform only appeared
-- to work because lesson_resources_read ignored entitlement entirely and let
-- any signed-in user read the resources of any published course. Fixing that
-- leak on its own would have locked every learner out of their own courses,
-- which is why both halves ship together.
--
-- The test suite passed throughout because it inserts grants by hand
-- (enrolment.test.mjs 5x, group4.test.mjs 14x). The fixtures encoded an
-- assumption the application never fulfilled, which is exactly the shape of
-- gap a green suite cannot see.
--
-- Two writers are added, one per path:
--
--   * a free enrolment on a genuinely unsold version grants access to it
--   * a confirmed payment grants what was bought, then enrols the buyer
--
-- Order matters and is not incidental: can_enrol_in_version() requires an
-- existing entitlement before a sold version can be enrolled in, so the grant
-- is created first and the enrolment second.

-- ---------------------------------------------------------------------------
-- The free path
-- ---------------------------------------------------------------------------

create or replace function public.grant_free_enrolment_entitlement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only a genuinely free enrolment. A sold version reaches a learner through
  -- a purchase, a subscription, a family allocation or a staff grant, each of
  -- which has its own source_type and its own writer; inventing a 'free'
  -- grant here would let the ledger claim access nobody paid for.
  if new.source <> 'free' or public.is_sold_version(new.course_version_id) then
    return new;
  end if;

  -- Idempotent, so a restored or replayed enrolment does not mint a second
  -- grant for the same thing.
  if exists (
    select 1 from public.entitlement_grants eg
     where eg.learner_profile_id = new.learner_profile_id
       and eg.scope_type = 'course_version'
       and eg.course_version_id = new.course_version_id
       and eg.source_type = 'free'
       and eg.status = 'active'
  ) then
    return new;
  end if;

  insert into public.entitlement_grants
    (learner_profile_id, scope_type, course_version_id,
     source_type, source_id, status, effective_from)
  values
    (new.learner_profile_id, 'course_version', new.course_version_id,
     'free', new.id, 'active', now());

  return new;
end;
$$;

comment on function public.grant_free_enrolment_entitlement() is
  'A free enrolment on an unsold version grants access to it. Without this the enrolment exists and the learner can open nothing, because entitlement_grants is the only thing consulted at access time.';

drop trigger if exists grant_free_enrolment_entitlement on public.course_enrolments;
create trigger grant_free_enrolment_entitlement
  after insert on public.course_enrolments
  for each row
  execute function public.grant_free_enrolment_entitlement();

-- ---------------------------------------------------------------------------
-- The paid path
-- ---------------------------------------------------------------------------
--
-- record_payment_success() is rewritten to add fulfilment. Everything D4
-- freezes is preserved verbatim: the original amount and currency come from
-- the order, amounts stay in integer minor units, a confirmed order returns
-- idempotently, an unsigned provider event is refused, an already-processed
-- event is refused, and a redirect is still not proof.
--
-- Fulfilment is appended after the order is marked paid, so a payment that
-- fails its own checks grants nothing.
--
-- Scope note: subscription line items (plan_version_id) are deliberately not
-- fulfilled here. They have their own lifecycle and their own expiry, and
-- inventing one inside a payment callback is how a subscription ends up
-- granting forever. Only product line items are handled.

create or replace function public.record_payment_success(
  p_order_id     uuid,
  p_actor_id     uuid,
  p_provider     text,
  p_reference    text,
  p_event_id     uuid default null,
  p_evidence     text default null
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
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
    for v_learner in
      select lp.id as learner_profile_id
        from public.billing_account_memberships bam
        join public.learner_profiles lp
          on lp.linked_user_id = bam.user_id
         and lp.deleted_at is null
       where bam.billing_account_id = v_order.billing_account_id
         and bam.status = 'active'
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

  if v_granted > 0 then
    insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
    values (p_actor_id, 'entitlement.granted', 'order', p_order_id,
            jsonb_build_object('grants_created', v_granted, 'source_type', 'purchase'));
  end if;

  return v_result;
end;
$$;

comment on function public.record_payment_success(uuid, uuid, text, text, uuid, text) is
  'The only writer of the paid state, and now also the fulfilment step: a confirmed payment grants what was bought and enrols the buyer. D4 is unchanged — order amounts are authoritative, minor units throughout, idempotent on replay, an unsigned or already-processed provider event is refused, and a redirect is not proof.';
