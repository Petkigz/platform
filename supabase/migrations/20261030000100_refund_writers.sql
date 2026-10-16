-- =============================================================================
-- AyāhSpring — refunds: the writers, and who may ask for one
--
-- The refund tables have been in the schema since 20261020000300. They had:
--
--   refundable_amount(p_order_id)      -- what is left to give back
--   enforce_refund_request_ceiling()   -- a request cannot exceed it
--   enforce_refund_ceiling()           -- in-flight refunds count against it too
--   record_refund_in_ledger()          -- a completed refund reaches the ledger
--   rr_not_self_approved               -- the requester cannot approve their own
--
-- and nothing that created a row for any of it to act on. Zero INSERT sites in
-- the application, zero in any SQL function. So no customer who ever paid could
-- ask for their money back, and the elaborate machinery that exists to make
-- refunding safe was unreachable. A green test suite hid it, because every
-- fixture hand-inserts the rows it asserts on.
--
-- This adds the three missing steps, matching D4 (frozen), which is explicit
-- that a refund request is not a completed refund:
--
--   request_refund()          the customer asks. Creates refund_requests.
--   decide_refund_request()   staff approve or decline. Approving creates a
--                             refund_transactions row in 'pending' — the money
--                             has NOT moved. That distinction is the whole point
--                             of D4: approving is a decision, settling is a fact.
--   complete_refund()         the provider confirms. Moves it to 'completed',
--                             which fires the ledger trigger.
--
-- THE DEFECT THIS ALSO CLOSES: refund_requests_insert allowed any signed-in
-- account to file a request against any order, because its check was only
-- `requested_by = current_user_id()`. Nothing tied the order to the caller.
-- Knowing or guessing an order id was enough. That is the same shape as the
-- guardian-request hole fixed in 20261029000300 — a table that is append-only
-- and self-attributing is still not self-scoping. The policy now requires a
-- billing-account relationship with the order.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Who may ask
-- -----------------------------------------------------------------------------

drop policy if exists refund_requests_insert on public.refund_requests;

create policy refund_requests_insert on public.refund_requests
  for insert to authenticated
  with check (
    -- Staff may file on someone's behalf (a support call, say). Everyone else
    -- has to be on the billing account that the order belongs to, and the
    -- request has to be attributed to themselves.
    public.is_privileged(public.current_user_id())
    or (
      requested_by = public.current_user_id()
      and exists (
        select 1
          from public.orders o
         where o.id = order_id
           and public.is_billing_member(o.billing_account_id)
      )
    )
  );

comment on policy refund_requests_insert on public.refund_requests is
  'Self-attribution is not enough: the order must belong to a billing account the caller is on.';

-- -----------------------------------------------------------------------------
-- 2. The customer asks
-- -----------------------------------------------------------------------------

create or replace function public.request_refund(
  p_order_id uuid,
  p_amount_minor bigint,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
  v_order public.orders;
  v_id    uuid;
begin
  if v_actor is null then
    raise exception 'sign in to request a refund' using errcode = 'insufficient_privilege';
  end if;

  select * into v_order from public.orders where id = p_order_id;
  if v_order.id is null then
    raise exception 'order not found' using errcode = 'P0002';
  end if;

  -- Same test the read policy applies, so a caller cannot file against an order
  -- they have no relationship with.
  if not public.is_billing_member(v_order.billing_account_id) then
    raise exception
      'you are not on the billing account for this order'
      using errcode = 'insufficient_privilege';
  end if;

  if v_order.status not in ('paid', 'partially_refunded', 'refunded') then
    raise exception
      'order is %, so there is nothing to refund', v_order.status
      using errcode = 'check_violation';
  end if;

  if coalesce(trim(p_reason), '') = '' then
    raise exception
      'say what the refund is for'
      using errcode = 'check_violation';
  end if;

  -- Currency comes from the order, never from the caller. A refund in a
  -- different currency to the capture would make the ledger incoherent.
  insert into public.refund_requests
    (order_id, requested_amount_minor, currency_code, reason, requested_by)
  values
    (p_order_id, p_amount_minor, v_order.currency_code, p_reason, v_actor)
  returning id into v_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (
    v_actor,
    'refund.requested',
    'refund_request',
    v_id,
    jsonb_build_object('order_id', p_order_id, 'amount_minor', p_amount_minor)
  );

  return v_id;
end;
$$;

revoke execute on function public.request_refund(uuid, bigint, text) from public;
grant execute on function public.request_refund(uuid, bigint, text) to authenticated;

comment on function public.request_refund(uuid, bigint, text) is
  'Ask for money back. Creates a request only — no money moves until staff approve and the provider settles.';

-- -----------------------------------------------------------------------------
-- 3. Staff decide
-- -----------------------------------------------------------------------------

create or replace function public.decide_refund_request(
  p_request_id uuid,
  p_approve boolean,
  p_notes text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
  v_req   public.refund_requests;
  v_order public.orders;
  v_txn   uuid;
begin
  if v_actor is null or not public.is_privileged(v_actor) then
    raise exception 'only staff may decide a refund' using errcode = 'insufficient_privilege';
  end if;

  select * into v_req from public.refund_requests where id = p_request_id;
  if v_req.id is null then
    raise exception 'refund request not found' using errcode = 'P0002';
  end if;

  if v_req.status <> 'requested' then
    raise exception
      'that refund is already %', v_req.status
      using errcode = 'check_violation';
  end if;

  -- rr_not_self_approved already forbids this. Saying it plainly is the
  -- difference between a decision that is understood and one that looks broken.
  if v_req.requested_by = v_actor then
    raise exception
      'you cannot decide a refund you requested yourself'
      using errcode = 'insufficient_privilege';
  end if;

  if not p_approve and coalesce(trim(p_notes), '') = '' then
    raise exception
      'declining a refund needs a written reason'
      using errcode = 'check_violation';
  end if;

  update public.refund_requests
     set status         = case when p_approve then 'approved' else 'rejected' end,
         decided_by     = v_actor,
         decided_at     = now(),
         decision_notes = nullif(trim(coalesce(p_notes, '')), '')
   where id = p_request_id;

  -- Approving is a decision, not a payment. The transaction sits in 'pending'
  -- until the provider confirms, and only then does the ledger move. That gap
  -- is what D4 means by "a refund request is not a completed refund".
  if p_approve then
    select * into v_order from public.orders where id = v_req.order_id;

    insert into public.refund_transactions
      (refund_request_id, order_id, amount_minor, currency_code, status)
    values
      (p_request_id, v_req.order_id, v_req.requested_amount_minor,
       v_order.currency_code, 'pending')
    returning id into v_txn;
  end if;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (
    v_actor,
    case when p_approve then 'refund.approved' else 'refund.rejected' end,
    'refund_request',
    p_request_id,
    jsonb_build_object(
      'order_id',      v_req.order_id,
      'amount_minor',  v_req.requested_amount_minor,
      'transaction_id', v_txn
    )
  );
end;
$$;

revoke execute on function public.decide_refund_request(uuid, boolean, text) from public;
grant execute on function public.decide_refund_request(uuid, boolean, text) to authenticated;

comment on function public.decide_refund_request(uuid, boolean, text) is
  'Approve or decline. Approving creates a pending refund transaction; no money moves until it completes.';

-- -----------------------------------------------------------------------------
-- 4. The provider confirms
-- -----------------------------------------------------------------------------

-- The actor is passed in rather than read from the session, exactly as
-- record_payment_success() does it. A webhook arrives on the service role, where
-- there are no JWT claims and so current_user_id() is null — reading the session
-- would either reject every provider confirmation or, worse, need an exemption
-- for "no JWT subject", which is the shape of trigger that has already caused
-- two incidents in this codebase.
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
  v_actor uuid := coalesce(p_actor_id, public.current_user_id());
  v_txn   public.refund_transactions;
  v_event public.payment_provider_events;
  v_req   public.refund_requests;
begin
  -- Two ways to settle, mirroring payment confirmation: a privileged human, or
  -- a provider event that has already passed signature verification and has not
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
  elsif not public.is_privileged(v_actor) then
    raise exception
      'a refund must be settled by a privileged actor or against a verified provider event'
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

revoke execute on function public.complete_refund(uuid, text, uuid, uuid) from public;
grant execute on function public.complete_refund(uuid, text, uuid, uuid) to authenticated;

comment on function public.complete_refund(uuid, text, uuid, uuid) is
  'Settle an approved refund once the provider confirms. Idempotent; writes the ledger entry and updates the order.';

-- -----------------------------------------------------------------------------
-- 5. A settled refund is reflected on the order and linked back
--
-- The ledger trigger already existed. It could not link the ledger row back to
-- the request, because it is an AFTER trigger and so cannot modify the row that
-- fired it — and nothing else did it, leaving refund_requests
-- .financial_transaction_id a column that would never be written. Both are done
-- here, in the same transaction as the ledger entry, so the three can never
-- disagree.
-- -----------------------------------------------------------------------------

create or replace function public.record_refund_in_ledger()
returns trigger
language plpgsql
as $$
declare
  v_ledger uuid;
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

    -- Link the request to the ledger row it produced.
    if new.refund_request_id is not null and v_ledger is not null then
      update public.refund_requests
         set financial_transaction_id = v_ledger
       where id = new.refund_request_id
         and financial_transaction_id is null;
    end if;

    -- And reflect it on the order. Fully refunded only when nothing is left.
    update public.orders o
       set status = case
             when public.refundable_amount(o.id) <= 0 then 'refunded'
             else 'partially_refunded'
           end
     where o.id = new.order_id
       and o.status in ('paid', 'partially_refunded');
  end if;

  if new.status <> 'completed' and old.status = 'completed' then
    raise exception
      'a completed refund cannot be un-completed; record a reversal instead'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

comment on function public.record_refund_in_ledger() is
  'A completed refund reaches the ledger, is linked back to its request, and updates the order status.';

-- -----------------------------------------------------------------------------
-- 6. What staff can see and do, without RLS on the transaction table
-- -----------------------------------------------------------------------------

-- refund_transactions has no policies of its own in the original migration, so
-- reads fall through to RLS denying everything. Staff need the queue.
alter table public.refund_transactions enable row level security;

drop policy if exists refund_transactions_read on public.refund_transactions;
create policy refund_transactions_read on public.refund_transactions
  for select to authenticated
  using (
    public.is_privileged(public.current_user_id())
    or exists (
      select 1 from public.orders o
       where o.id = refund_transactions.order_id
         and public.is_billing_member(o.billing_account_id)
    )
  );

comment on policy refund_transactions_read on public.refund_transactions is
  'Staff, or a member of the order''s billing account. There is no insert or update policy: the functions are the only writers.';
