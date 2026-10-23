-- ---------------------------------------------------------------------------
-- A refund can be asked for for 72 hours after the payment.
--
-- The owner's rule, 2026-10-23: *a customer can only get a refund between the
-- 72 hours that happen after the payment.* Until now there was no clock at all:
-- a family could ask for their money back a year later, and the only limits
-- were the refundable balance and a person's judgement.
--
-- Three things this has to get right, and they are all about *what* is bounded.
--
--   1. THE CLOCK RUNS FROM THE PAYMENT, NOT FROM THE REQUEST. `orders.paid_at`
--      is the only moment that matters, and it is set by `record_payment_success()`
--      from a verified confirmation — not by a browser coming back. Reading the
--      clock here, in the database, means a client cannot ask early or late by
--      moving its own.
--
--   2. IT BOUNDS ASKING, NOT DECIDING. A request made in the last minute of the
--      seventy-second hour is valid, and it can be approved tomorrow, next week,
--      or after a provider has been down for a fortnight. A rule that expired
--      requests in flight would punish the customer for the platform's speed,
--      and the refund would silently become a decline.
--
--   3. IT IS A CUSTOMER POLICY, NOT A LOCK ON THE PLATFORM. Support still has to
--      be able to make something right after three days — a course that was sold
--      wrong, a duplicate charge, a family that could not get to a phone. So
--      `is_privileged` callers are exempt: staff may open a request on a
--      customer's behalf at any time, it is attributed to them, and
--      `rr_not_self_approved` still stops them approving their own. A rule with
--      no escape hatch is a rule that gets worked around by editing the database,
--      and then nothing is audited at all.
--
-- The window is a setting rather than a constant (`commerce.refund_window_hours`,
-- default 72) because a number in a policy is a business decision, and this
-- platform's decisions live where the owner can change them. `0` means no
-- self-serve refunds at all; a negative value is clamped to 0 rather than
-- turning into a window that opens before the payment.
--
-- `refund_standing()` exists because a closed window must be *said*, not hidden.
-- A refund button that disappears three days after a purchase is a support
-- ticket waiting to happen — the customer cannot tell whether they missed a
-- deadline, whether the button is broken, or whether they were never eligible.
-- The function decomposes the same predicate the writer enforces, so the screen
-- can print the sentence and the date.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- The setting
-- ---------------------------------------------------------------------------
insert into public.platform_settings
  (key, value_type, value_text, gate_type, description, preconditions)
values
  ('commerce.refund_window_hours', 'integer', '72', 'admin',
   'How long after a payment a customer may ask for a refund. The clock runs from the payment, not from the request. It bounds asking, not deciding: a request made in time can be approved later. Staff may open a request on a customer''s behalf after it closes. 0 means no self-serve refunds.',
   null)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- The clock, in one place
-- ---------------------------------------------------------------------------
create or replace function public.refund_window_hours()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select greatest(
    0,
    coalesce(
      (select s.value_text::integer
         from public.platform_settings s
        where s.key = 'commerce.refund_window_hours'),
      72));
$$;

revoke all on function public.refund_window_hours() from public, anon;
grant execute on function public.refund_window_hours() to authenticated;

comment on function public.refund_window_hours() is
  'The self-serve refund window in hours. Clamped at 0 so a negative setting closes the window rather than opening it before the payment.';

-- ---------------------------------------------------------------------------
-- Why a refund can, or cannot, be asked for
-- ---------------------------------------------------------------------------
-- A decomposition of the writer's own checks, not a second opinion: `allowed`
-- is false exactly when `request_refund()` would refuse, and a test holds the
-- two together. Nothing here decides anything — it explains.
create or replace function public.refund_standing(p_order_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor      uuid := public.current_user_id();
  v_order      public.orders;
  v_hours      integer := public.refund_window_hours();
  v_closes     timestamptz;
  v_refundable bigint;
  v_staff      boolean;
  v_reason     text;
  v_message    text;
  v_remaining  integer;
begin
  if v_actor is null then
    raise exception 'sign in to check a refund'
      using errcode = 'insufficient_privilege';
  end if;

  select * into v_order from public.orders where id = p_order_id;
  if v_order.id is null then
    raise exception 'order not found' using errcode = 'P0002';
  end if;
  if not public.is_billing_member(v_order.billing_account_id) then
    raise exception 'you are not on the billing account for this order'
      using errcode = 'insufficient_privilege';
  end if;

  v_staff      := public.is_privileged(v_actor);
  v_refundable := public.refundable_amount(p_order_id);
  v_closes     := case when v_order.paid_at is null
                       then null
                       else v_order.paid_at + make_interval(hours => v_hours) end;
  v_remaining  := case when v_closes is null then null
                       else greatest(0, ceil(extract(epoch from (v_closes - now())) / 3600))::integer end;

  if v_order.paid_at is null
     or v_order.status not in ('paid', 'partially_refunded', 'refunded') then
    v_reason  := 'not_paid';
    v_message := 'This order has not been paid, so there is nothing to refund.';
  elsif v_refundable <= 0 then
    v_reason  := 'nothing_left';
    v_message := 'Everything that was paid on this order has already been returned.';
  elsif not v_staff and now() >= v_closes then
    v_reason  := 'window_closed';
    v_message := format(
      'A refund can be asked for within %s hours of payment, and that window closed on %s.',
      v_hours,
      to_char(v_closes at time zone 'UTC', 'DD Mon YYYY "at" HH24:MI "UTC"'));
  else
    v_reason  := 'allowed';
    v_message := case
      when v_staff then
        'You are staff, so you may open a request on this order at any time.'
      else format(
        'A refund can be asked for until %s.',
        to_char(v_closes at time zone 'UTC', 'DD Mon YYYY "at" HH24:MI "UTC"'))
    end;
  end if;

  return jsonb_build_object(
    'orderId',         p_order_id,
    'orderNumber',     v_order.order_number,
    'status',          v_order.status,
    'allowed',         v_reason = 'allowed',
    'reason',          v_reason,
    'message',         v_message,
    'windowHours',     v_hours,
    'paidAt',          v_order.paid_at,
    'closesAt',        v_closes,
    'remainingHours',  v_remaining,
    'refundableMinor', v_refundable::text,
    'currencyCode',    v_order.currency_code,
    'asStaff',         v_staff);
end;
$$;

revoke all on function public.refund_standing(uuid) from public, anon;
grant execute on function public.refund_standing(uuid) to authenticated;

comment on function public.refund_standing(uuid) is
  'Why a refund can or cannot be asked for on one order: not signed in, not on the account, not paid, nothing left, or the window closed — with the moment it closed. Explains request_refund() and decides nothing.';

-- ---------------------------------------------------------------------------
-- The writer, with the clock
-- ---------------------------------------------------------------------------
-- Everything below is the function from 20261030000100 with one block added.
-- The rest is reproduced rather than delegated so that the check order stays
-- readable: the caller, the order, the account, the status, the clock, the
-- reason, then the row.
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
  v_actor  uuid := public.current_user_id();
  v_order  public.orders;
  v_hours  integer := public.refund_window_hours();
  v_closes timestamptz;
  v_id     uuid;
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

  -- Rule 1: the clock runs from the payment. Rule 3: staff are not customers,
  -- and a support call that ends in "the window closed, nothing I can do" is
  -- how a platform loses a family over a course that was sold wrong.
  if not public.is_privileged(v_actor) then
    v_closes := v_order.paid_at + make_interval(hours => v_hours);
    if now() >= v_closes then
      raise exception
        'the refund window closed on % — a refund can be asked for within % hours of payment',
        to_char(v_closes at time zone 'UTC', 'DD Mon YYYY "at" HH24:MI "UTC"'),
        v_hours
        using errcode = 'check_violation';
    end if;
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
    case when public.is_privileged(v_actor)
         then 'refund.requested_by_staff'
         else 'refund.requested' end,
    'refund_request',
    v_id,
    jsonb_build_object(
      'order_id', p_order_id,
      'amount_minor', p_amount_minor,
      -- Recorded so the audit answers "was this inside the policy" without
      -- having to reconstruct the clock later.
      'window_hours', case when public.is_privileged(v_actor) then null else v_hours end,
      'paid_at', v_order.paid_at)
  );

  return v_id;
end;
$$;

revoke execute on function public.request_refund(uuid, bigint, text) from public;
grant execute on function public.request_refund(uuid, bigint, text) to authenticated;

comment on function public.request_refund(uuid, bigint, text) is
  'Ask for money back. Refused outside commerce.refund_window_hours from the payment unless the caller is staff. Creates a request only — no money moves until staff approve and the provider settles.';
