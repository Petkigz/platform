-- Wire instructor earnings into the money path.
--
-- WHAT THIS FIXES
-- ---------------
-- instructor_earnings_entries, instructor_payout_items and instructor_payouts
-- all existed with RLS and policies. Nothing wrote to any of them. A teacher
-- could sell a course, the platform could take the money, and there was no
-- record anywhere that the teacher had earned anything — let alone a way to
-- pay them. This is the eleventh instance of the same defect: correct
-- machinery, nothing connected.
--
-- WHAT THIS DOES
-- --------------
--   * accrue_instructor_earnings() — one entry per instructor per paid order,
--     called from record_payment_success()
--   * reverse_earnings_for_refund() — called from record_refund_in_ledger()
--     when an order reaches 'refunded'
--   * a unique index stopping double accrual
--   * a platform setting holding the revenue share, admin-tunable
--
-- WHAT IS DELIBERATELY NOT DECIDED HERE
-- -------------------------------------
-- The revenue share percentage is a business and tax decision, not an
-- engineering one, and it is recorded as undecided. It is therefore a setting
-- seeded at 0 rather than a number invented in a migration. Accrual still runs
-- at 0% so the gross record of what sold is preserved; the share is snapshotted
-- onto each entry, so changing it later does not retroactively rewrite what a
-- teacher already earned.
--
-- Payouts (instructor_payouts / instructor_payout_items) are still unwired.
-- teaching.payouts is gated on the payout provider, tax treatment, minimum
-- thresholds and the dispute process — all external facts not yet known.
-- Accruing is safe and reversible; paying out is not, and should not be
-- invented ahead of those answers.

-- ---------------------------------------------------------------------------
-- Reading an integer setting
-- ---------------------------------------------------------------------------
-- Only setting_bool() existed. governance.min_approvals is already an integer
-- setting with no reader, so this was needed regardless.

create or replace function public.setting_int(
  p_key     text,
  p_default integer default 0
)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(nullif(trim(value_text), '')::integer, p_default)
    from public.platform_settings
   where key = p_key;
$$;

revoke all on function public.setting_int(text, integer) from public;
grant execute on function public.setting_int(text, integer) to authenticated;

comment on function public.setting_int(text, integer) is
  'Reads an integer platform setting, falling back to p_default when unset or blank.';

-- ---------------------------------------------------------------------------
-- The revenue share, as a setting rather than a constant
-- ---------------------------------------------------------------------------

insert into public.platform_settings
  (key, value_type, value_text, description, gate_type, preconditions, flag_group)
values
  ('teaching.revenue_share_percent', 'integer', '0',
   'Percentage of a course sale that accrues to the teacher. 0 means the platform keeps everything.',
   'admin',
   'Tax treatment per country; who bears payment processing fees; whether the share is uniform or per teacher',
   'Teaching')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- One accrual per instructor per order
-- ---------------------------------------------------------------------------
-- Without this, a replayed or retried payment confirmation would credit the
-- teacher twice. record_payment_success() is idempotent about the order, but
-- the accrual sits inside it and needs its own guard.

create unique index if not exists iee_one_accrual_per_instructor_per_order
  on public.instructor_earnings_entries (instructor_user_id, order_id)
  where order_id is not null;

-- ---------------------------------------------------------------------------
-- Accrual
-- ---------------------------------------------------------------------------

create or replace function public.accrue_instructor_earnings(
  p_order_id       uuid,
  p_transaction_id uuid,
  p_actor_id       uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_share       integer;
  v_currency    char(3);
  v_billing_account_id uuid;
  v_order_status  text;
  v_accrued     integer := 0;
  v_row         record;
begin
  select currency_code, billing_account_id, status
    into v_currency, v_billing_account_id, v_order_status
    from public.orders where id = p_order_id;

  if not found then
    raise exception 'order % not found', p_order_id
      using errcode = 'no_data_found';
  end if;

  -- Guard: earnings only exist for money actually received. Without this a
  -- caller could accrue against an unpaid or already-refunded order.
  if v_order_status <> 'paid' then
    raise exception
      'earnings can only accrue against a paid order; this one is %', v_order_status
      using errcode = 'invalid_parameter_value';
  end if;

  v_share := public.setting_int('teaching.revenue_share_percent', 0);

  if v_share < 0 or v_share > 100 then
    raise exception
      'teaching.revenue_share_percent must be between 0 and 100, got %', v_share
      using errcode = 'check_violation';
  end if;

  -- One entry per teacher per order. An order can span several teachers, so
  -- the grain is the instructor, and the amount is the sum of the lines whose
  -- product maps to one of their course versions.
  for v_row in
    select c.created_by            as instructor_user_id,
           sum(oi.line_total_minor) as gross_minor
      from public.order_items oi
      join public.product_course_versions pcv on pcv.product_id = oi.product_id
      join public.courses c                    on c.id = pcv.course_id
     where oi.order_id = p_order_id
       and oi.product_id is not null
       and c.created_by is not null
       -- A teacher buying their own course earns nothing from themselves.
       -- The buyer is a member of the billing account that paid, NOT
       -- orders.payment_confirmed_by: that column holds whoever confirmed the
       -- payment, which is a privileged admin or a webhook actor.
       and not exists (
             select 1
               from public.billing_account_memberships bam
              where bam.billing_account_id = v_billing_account_id
                and bam.user_id = c.created_by
                and bam.status = 'active'
           )
     group by c.created_by
  loop
    insert into public.instructor_earnings_entries
      (instructor_user_id, order_id, financial_transaction_id,
       gross_amount_minor, currency_code, revenue_share_percent,
       net_amount_minor, status, accrued_at)
    values
      (v_row.instructor_user_id, p_order_id, p_transaction_id,
       v_row.gross_minor, v_currency, v_share,
       -- Computed with the same expression the iee_split_agrees CHECK uses, so
       -- the row cannot disagree with its own constraint.
       round((v_row.gross_minor::numeric * v_share) / 100.0)::bigint,
       'accrued', now())
    on conflict do nothing;

    if found then
      v_accrued := v_accrued + 1;
    end if;
  end loop;

  if v_share = 0 then
    -- Visible rather than silent. A 0% share means the platform keeps
    -- everything, which is a legitimate configuration but one a reader of the
    -- ledger should be able to see was deliberate and not a missing setting.
    insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
    values (p_actor_id, 'earnings.accrued_at_zero_share', 'order', p_order_id,
            jsonb_build_object('entries', v_accrued,
                               'note', 'teaching.revenue_share_percent is 0; nothing accrues to teachers'));
  end if;

  return v_accrued;
end;
$$;

revoke all on function public.accrue_instructor_earnings(uuid, uuid, uuid) from public;
-- Deliberately NOT granted to authenticated. Both callers are SECURITY DEFINER
-- and owned by postgres, so the internal path needs no grant. Granting it here
-- would let any signed-in learner call a SECURITY DEFINER function and credit
-- themselves earnings, because the function body trusts its arguments.
--
-- The order-status guard below is defence in depth: even a caller who somehow
-- reaches it cannot accrue against an order that has not been paid.

comment on function public.accrue_instructor_earnings(uuid, uuid, uuid) is
  'Credits each teacher their share of a paid order. Idempotent per (instructor, order). Called by record_payment_success().';

-- ---------------------------------------------------------------------------
-- Reversal on a full refund
-- ---------------------------------------------------------------------------

create or replace function public.reverse_earnings_for_refund(
  p_order_id uuid,
  p_actor_id uuid,
  p_reason   text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reversed integer;
  v_paid     integer;
begin
  if p_reason is null or trim(p_reason) = '' then
    raise exception 'reversing earnings requires a written reason'
      using errcode = 'invalid_parameter_value';
  end if;

  -- Only entries not yet paid out can be reversed in place. An entry already
  -- 'paid' means money has left the platform; taking it back is a clawback,
  -- which is a different mechanism and must not be faked by rewriting the
  -- original record.
  -- Guard: only a refund actually completed may take earnings back.
  if not exists (
    select 1 from public.orders
     where id = p_order_id and status in ('refunded', 'partially_refunded')
  ) then
    raise exception
      'earnings can only be reversed against an order that has been refunded'
      using errcode = 'invalid_parameter_value';
  end if;

  update public.instructor_earnings_entries
     set status = 'reversed'
   where order_id = p_order_id
     and status in ('accrued', 'payable');

  -- GET DIAGNOSTICS, not `returning 1 into`: that form would bind a single row
  -- and read 1 however many entries were reversed.
  get diagnostics v_reversed = row_count;

  select count(*) into v_paid
    from public.instructor_earnings_entries
   where order_id = p_order_id and status = 'paid';

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (p_actor_id, 'earnings.reversed_on_refund', 'order', p_order_id,
          jsonb_build_object('entries_reversed', v_reversed,
                             'entries_already_paid', coalesce(v_paid, 0),
                             'reason', p_reason));

  if coalesce(v_paid, 0) > 0 then
    -- Surfaces rather than hides a real problem: the teacher has already been
    -- paid for a sale that was later refunded. financial_adjustments is the
    -- place for the clawback, and it is not wired yet.
    insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
    values (p_actor_id, 'earnings.clawback_needed', 'order', p_order_id,
            jsonb_build_object('entries_paid', v_paid,
                               'note', 'refunded after payout; manual clawback required'));
  end if;

  return v_reversed;
end;
$$;

revoke all on function public.reverse_earnings_for_refund(uuid, uuid, text) from public;
-- As above: internal only. Without this, a learner could wipe a teacher's
-- earnings by calling the function directly.

comment on function public.reverse_earnings_for_refund(uuid, uuid, text) is
  'Reverses accrued earnings when an order is refunded in full. Flags, but does not fake, a clawback on entries already paid out.';

-- ---------------------------------------------------------------------------
-- Hook both ends into the money path
-- ---------------------------------------------------------------------------
-- Defining the functions above would have left them as unwritten machinery --
-- the exact defect this migration exists to fix. The bodies below are the live
-- definitions with only the marked hook added.

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


create or replace function public.record_refund_in_ledger()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
declare
  v_ledger  uuid;
  v_before  text;
  v_after   text;
  v_revoked integer;
begin
  if new.status = 'completed' and old.status is distinct from 'completed' then
    insert into public.financial_transactions
      (order_id, billing_account_id, transaction_type, direction,
       amount_minor, currency_code, provider, provider_reference, status, occurred_at)
    select new.order_id, o.billing_account_id, 'refund', 'debit',
           new.amount_minor, new.currency_code, new.provider, new.provider_reference,
           'settled', coalesce(new.refunded_at, now())
      from public.orders o where o.id = new.order_id
    returning id into v_ledger;

    if new.refund_request_id is not null and v_ledger is not null then
      update public.refund_requests
         set financial_transaction_id = v_ledger
       where id = new.refund_request_id
         and financial_transaction_id is null;
    end if;

    -- Fully refunded only when nothing is left to give back.
    select status into v_before from public.orders where id = new.order_id;

    update public.orders o
       set status = case
             when public.refundable_amount(o.id) <= 0 then 'refunded'
             else 'partially_refunded'
           end
     where o.id = new.order_id
       and o.status in ('paid', 'partially_refunded');

    select status into v_after from public.orders where id = new.order_id;

    -- The access decision follows the money. A full refund takes the course
    -- back; a partial one does not, because the learner has still paid for
    -- what remains.
    if v_after = 'refunded' and v_before is distinct from 'refunded' then
      v_revoked := public.revoke_entitlements_for_refund(
        new.order_id,
        new.processed_by,
        'Refunded in full; access withdrawn.'
      );

      insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
      values (
        new.processed_by,
        'entitlement.revoked_on_refund',
        'order',
        new.order_id,
        jsonb_build_object('grants_revoked', v_revoked)
      );

      -- The teacher's share goes back with the customer's money. Only on a
      -- FULL refund, matching the access decision above: a partial refund
      -- leaves the learner still paid up for what remains, and the teacher
      -- still entitled to their share of it.
      --
      -- Inside this block, not after it. Appending it after the `end if`
      -- ran it on every completed refund and took the teacher's earnings
      -- back on a partial refund too -- which the partial-refund test caught.
      perform public.reverse_earnings_for_refund(
        new.order_id,
        new.processed_by,
        'Order refunded in full; earnings reversed.'
      );
    end if;
  end if;

  if new.status <> 'completed' and old.status = 'completed' then
    raise exception
      'a completed refund cannot be un-completed; record a reversal instead'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$function$;


-- ---------------------------------------------------------------------------
-- Closing the same hole in last unit's revocation writer
-- ---------------------------------------------------------------------------
-- revoke_entitlements_for_refund() was granted to authenticated. It is SECURITY
-- DEFINER owned by postgres and its body trusts its arguments, so any signed-in
-- user could call it and revoke the course access of any learner on any order,
-- writing themselves in as the revoking actor.
--
-- Its only caller is record_refund_in_ledger(), which fires from within
-- complete_refund() -- already SECURITY DEFINER as postgres -- so the grant was
-- never needed. Written reason is still required by the function itself.

revoke execute on function public.revoke_entitlements_for_refund(uuid, uuid, text)
  from authenticated, anon, public;
