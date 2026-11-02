-- -----------------------------------------------------------------------------
-- A waiver that is a real waiver, and a clock that is the right clock
-- -----------------------------------------------------------------------------
-- In the European Union, Iceland, Liechtenstein, Norway and the United Kingdom a
-- consumer buying digital content has 14 days to withdraw. Where the content is
-- supplied immediately, that right can be lost — but only by an explicit
-- agreement at the point of purchase, and only about words the buyer could read.
--
-- Until now the platform did two things that were each half of an answer. It had a
-- 72-hour refund window, measured from the payment, offered to everybody. And its
-- refunds policy said, in the owner's own words on 2026-10-27, that no waiver was
-- offered: "a waiver is only worth asking for once content is delivered the instant
-- somebody pays". On 2026-11-01 the owner decided the other half, and the answer is
-- the shape of the law rather than a shortcut through it:
--
--   * **The box is separate, and unticked.** It sits under a paragraph of its own on
--     the checkout page, it is never pre-selected, and it is not folded into the
--     terms link. A pre-ticked box is not consent, and a waiver hidden in a
--     sentence somebody scrolled past is not agreement to anything.
--
--   * **Leaving it unticked is a purchase, not a refusal.** The buyer still buys,
--     the course still opens, and they keep their 14 days. Nothing about the
--     checkout depends on them giving up a right.
--
--   * **A waiver names the words it waives.** It is recorded against a published
--     (`in_force`) version of the refunds policy. With no version in force the box
--     is not offered at all: a waiver of a document nobody has published is not
--     evidence of anything, and recording one would be worse than recording none.
--     Until the owner puts a refunds version in force, this feature is inert and
--     everybody keeps the 14 days.
--
--   * **The record is on the order, not in the browser.** `withdrawal_decision`,
--     `withdrawal_decided_at`, `withdrawal_country` and
--     `withdrawal_policy_version_id`, written by one function, once, before payment.
--     A choice held only in a form is a choice that disappears with the tab.
--
--   * **Everywhere else the 72-hour window stands.** It is the platform's own
--     promise, not a statutory one, and it is unchanged. Inside a 14-day market the
--     policy window still runs on top of the statutory one; the statutory period is
--     never traded away for it.
--
-- **The wording is drafted, not reviewed.** It is one constant,
-- `withdrawal_wording()`, printed on the checkout page and embedded in the refunds
-- policy draft from the same source, so the two cannot drift. It carries an
-- UNREVIEWED marker in the policy body until a lawyer reads it. Marked here rather
-- than discovered later: this paragraph is what a dispute would be decided on.
--
-- The 14 days are a fact about consumer law, not a setting. They apply whether or
-- not `platform.withdrawal_right` is on, because the right is the buyer's and not
-- the platform's to switch off. That flag decides only whether the waiver is
-- **offered** — which is why turning it on makes the refund window shorter for
-- exactly the people who choose that, and for nobody else.

-- ---------------------------------------------------------------------------
-- What is recorded on the order
-- ---------------------------------------------------------------------------

alter table public.orders
  add column if not exists withdrawal_decision text
    check (withdrawal_decision in ('waived', 'retained')),
  add column if not exists withdrawal_decided_at timestamptz,
  add column if not exists withdrawal_country char(2)
    check (withdrawal_country is null or withdrawal_country ~ '^[A-Z]{2}$'),
  add column if not exists withdrawal_policy_version_id uuid
    references public.policy_versions (id) on delete restrict;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'orders_withdrawal_decision_complete'
  ) then
    alter table public.orders
      add constraint orders_withdrawal_decision_complete check (
        (withdrawal_decision is null) = (withdrawal_decided_at is null)
      );
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'orders_waiver_names_policy'
  ) then
    -- A waiver without the version it waived is not evidence of consent; it is a
    -- boolean somebody set. The function below refuses to record one, and this
    -- refuses to let any other writer do it either.
    alter table public.orders
      add constraint orders_waiver_names_policy check (
        withdrawal_decision is distinct from 'waived'
        or withdrawal_policy_version_id is not null
      );
  end if;
end $$;

comment on column public.orders.withdrawal_decision is
  'The choice the buyer made at checkout about their statutory withdrawal right: waived (they asked for immediate access) or retained (they kept the 14 days). NULL means no choice was recorded — and a buyer with a statutory right keeps it.';
comment on column public.orders.withdrawal_country is
  'The country the choice was made from, as the request reported it. Recorded beside the decision because a right depends on where the buyer is, and a country read at refund time is a country that may since have changed.';
comment on column public.orders.withdrawal_policy_version_id is
  'The published refunds policy version whose withdrawal paragraph the buyer agreed to, when they waived. Recorded so the exact words can be produced later; a waiver with no version is refused by orders_waiver_names_policy.';

-- ---------------------------------------------------------------------------
-- Where the right exists
-- ---------------------------------------------------------------------------
-- The EU (27), the rest of the EEA (Iceland, Liechtenstein, Norway) and the United
-- Kingdom. Kept in the database because the clock is computed there; the browser
-- keeps a copy to decide whether to render the box, and a test holds the two lists
-- equal, because a list like this drifts silently and the cost of drift is somebody
-- being told they have no right when they do.
create or replace function public.course_withdrawal_countries()
returns text[]
language sql
immutable
as $$
  select array[
    'AT','BE','BG','CY','CZ','DE','DK','EE','ES','FI','FR','GB','GR','HR','HU',
    'IE','IS','IT','LI','LT','LU','LV','MT','NL','NO','PL','PT','RO','SE','SI','SK'
  ]::text[];
$$;

comment on function public.course_withdrawal_countries() is
  'The countries where a consumer has 14 days to withdraw from a digital purchase: the EU, the rest of the EEA, and the UK. ISO 3166-1 alpha-2, sorted.';

create or replace function public.has_course_withdrawal_right(p_country text)
returns boolean
language sql
immutable
as $$
  select coalesce(
    public.normalise_country(p_country) = any (public.course_withdrawal_countries()),
    false);
$$;

comment on function public.has_course_withdrawal_right(text) is
  'True when a buyer in this country has a 14-day statutory right to withdraw. A country nobody can name (NULL) does not deny the right — callers that must choose read the offer, which treats an unknown country as one where the right may exist.';

-- ---------------------------------------------------------------------------
-- The words
-- ---------------------------------------------------------------------------
-- One constant, printed at checkout and embedded in the policy draft, so the
-- paragraph a buyer agrees to and the paragraph the policy states cannot differ.
-- UNREVIEWED: drafted from the law, not read by a lawyer. Do not remove this note
-- or the marker in the policy body until somebody qualified has read it.
create or replace function public.withdrawal_wording()
returns text
language sql
immutable
as $$
  select 'In the European Union, Iceland, Liechtenstein, Norway and the United Kingdom you have 14 days from the day you pay to withdraw from this purchase, without giving a reason, and we return what you paid. A course opens as soon as payment is confirmed. If you want it to open immediately, tick the box: you are asking us to start straight away and agreeing that, once the course is open, the 14-day right no longer applies to it. The box is never ticked for you, and you can buy with it left unticked. Outside those countries the 14 days do not apply. The platform''s own 72-hour refund window applies to every purchase, wherever you are, and asking for a refund inside it is a request a person reads and answers with a written reason.';
$$;

comment on function public.withdrawal_wording() is
  'The withdrawal paragraph shown at checkout and reproduced in the refunds policy. UNREVIEWED by a lawyer — see 20261281013000_withdrawal_waiver.sql. One source so the screen and the policy cannot drift.';

-- ---------------------------------------------------------------------------
-- What a checkout is offered
-- ---------------------------------------------------------------------------
create or replace function public.withdrawal_offer(p_country text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_country   text := public.normalise_country(p_country);
  v_statutory boolean;
  v_flag      boolean := public.setting_bool('platform.withdrawal_right', false);
  v_version   record;
begin
  -- An unknown country is treated as one where a right may exist. The cost of
  -- being wrong that way is a box nobody needs; the cost of the other way is a
  -- buyer told they have no right when they have one.
  if v_country is null then
    v_statutory := true;
  else
    v_statutory := public.has_course_withdrawal_right(v_country);
  end if;

  select v.id, v.version_number, v.effective_at
    into v_version
    from public.policy_versions v
    join public.policy_documents d on d.id = v.document_id
   where d.slug = 'refunds'
     and v.status = 'in_force'
   limit 1;

  return jsonb_build_object(
    'country',             v_country,
    'countryKnown',        v_country is not null,
    'statutory',           v_statutory,
    -- Two separate questions. `statutory` decides the clock; `canWaive` decides
    -- whether a box exists at all. They are not the same question, and the
    -- platform may well be honouring 14 days with no waiver on offer.
    'canWaive',            v_statutory and v_flag and v_version.id is not null,
    'flagOn',              v_flag,
    'policyVersionId',     v_version.id,
    'policyVersionNumber', v_version.version_number,
    'policyInForceFrom',   v_version.effective_at,
    'wording',             public.withdrawal_wording(),
    'reason', case
      when not v_statutory then 'no_statutory_right'
      when not v_flag then 'switched_off'
      when v_version.id is null then 'no_policy_in_force'
      else 'offered'
    end,
    'message', case
      when not v_statutory then
        'Outside the European Union, the EEA and the United Kingdom there is no 14-day right to withdraw. The platform''s 72-hour refund window applies.'
      when not v_flag then
        'The 14-day right applies, and no waiver is being offered yet: the platform does not ask anybody to give it up.'
      when v_version.id is null then
        'The 14-day right applies, and it cannot be waived here yet: no published refunds policy is in force, so there are no words to agree to. Nothing is missing from your purchase — you keep the 14 days.'
      else
        'You have 14 days to withdraw. Tick the box below only if you want the course to open immediately.'
    end);
end;
$$;

revoke all on function public.withdrawal_offer(text) from public;
grant execute on function public.withdrawal_offer(text) to anon, authenticated;

comment on function public.withdrawal_offer(text) is
  'What the checkout may show this buyer about the statutory withdrawal right: whether it applies, whether a waiver can be offered (a published refunds policy is needed for that), and the paragraph in force. Says plainly when the right applies but cannot be waived.';

-- ---------------------------------------------------------------------------
-- The choice, recorded once, before payment
-- ---------------------------------------------------------------------------
create or replace function public.record_withdrawal_choice(
  p_order_id  uuid,
  p_accepted  boolean,
  p_country   text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor    uuid := public.current_user_id();
  v_order    public.orders;
  v_country  text;
  v_version  uuid;
  v_account  text;
  v_decision text;
begin
  if v_actor is null then
    raise exception 'withdrawal:not_signed_in'
      using errcode = 'insufficient_privilege';
  end if;

  if p_accepted is null then
    raise exception 'withdrawal:no_choice'
      using errcode = 'invalid_parameter_value';
  end if;

  select * into v_order from public.orders where id = p_order_id;
  if v_order.id is null then
    raise exception 'withdrawal:order_not_found'
      using errcode = 'P0002';
  end if;

  -- The buyer, not staff. A member of staff recording a waiver on somebody else's
  -- order would be forging the one act the waiver depends on being voluntary, so
  -- the privileged override every other money function has is deliberately absent.
  -- Spelled out rather than `is_billing_member()`, because that helper returns true
  -- for any privileged user and this is the one place where that is wrong.
  if not exists (
    select 1 from public.billing_account_memberships bam
     where bam.billing_account_id = v_order.billing_account_id
       and bam.user_id = v_actor
       and bam.status = 'active'
  ) then
    raise exception 'withdrawal:not_your_order'
      using errcode = 'insufficient_privilege';
  end if;

  if v_order.status not in ('draft', 'pending_payment', 'awaiting_confirmation') then
    raise exception 'withdrawal:already_paid'
      using errcode = 'check_violation';
  end if;

  -- One decision, and it is the buyer's first. A second call is not an update:
  -- somebody asking twice is a double submit, and a changed mind after payment is
  -- a refund, not a time machine.
  if v_order.withdrawal_decision is not null then
    raise exception 'withdrawal:already_decided'
      using errcode = 'check_violation';
  end if;

  select nullif(btrim(a.billing_country), '')
    into v_account
    from public.billing_accounts a
   where a.id = v_order.billing_account_id;

  v_country := coalesce(
    public.normalise_country(p_country),
    public.normalise_country(v_account));

  -- There is nothing to waive where there is no right. Recording a waiver from
  -- Kampala would put a document in the record that means nothing, and a column
  -- full of meaningless waivers is how the meaningful ones stop being believed.
  if p_accepted
     and v_country is not null
     and not public.has_course_withdrawal_right(v_country) then
    raise exception 'withdrawal:not_applicable'
      using errcode = 'check_violation';
  end if;

  if p_accepted then
    select v.id
      into v_version
      from public.policy_versions v
      join public.policy_documents d on d.id = v.document_id
     where d.slug = 'refunds'
       and v.status = 'in_force'
     limit 1;

    if v_version is null then
      -- Refused rather than stored with a null: the constraint would refuse it
      -- too, and the sentence is more use than the constraint.
      raise exception 'withdrawal:no_policy'
        using errcode = 'check_violation';
    end if;
    v_decision := 'waived';
  else
    -- Recording the policy version even when the right is kept is the point of
    -- the pair: the order shows what was on the screen, not only what was chosen.
    select v.id
      into v_version
      from public.policy_versions v
      join public.policy_documents d on d.id = v.document_id
     where d.slug = 'refunds'
       and v.status = 'in_force'
     limit 1;
    v_decision := 'retained';
  end if;

  update public.orders
     set withdrawal_decision = v_decision,
         withdrawal_decided_at = now(),
         withdrawal_country = v_country::char(2),
         withdrawal_policy_version_id = v_version
   where id = p_order_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (
    v_actor,
    'order.withdrawal_choice',
    'order',
    p_order_id,
    jsonb_build_object(
      'decision', v_decision,
      'country', v_country,
      'policy_version_id', v_version,
      'order_number', v_order.order_number));

  return jsonb_build_object(
    'orderId',           p_order_id,
    'decision',          v_decision,
    'country',           v_country,
    'policyVersionId',   v_version,
    'statutory',         coalesce(public.has_course_withdrawal_right(v_country), true),
    'message', case
      when v_decision = 'waived' then
        'The course opens as soon as payment is confirmed, and the 14-day right no longer applies. The 72-hour refund window does.'
      else
        'You keep the 14 days. The course still opens as soon as payment is confirmed.'
    end);
end;
$$;

revoke all on function public.record_withdrawal_choice(uuid, boolean, text) from public;
grant execute on function public.record_withdrawal_choice(uuid, boolean, text) to authenticated;

comment on function public.record_withdrawal_choice(uuid, boolean, text) is
  'Records the buyer''s choice about the statutory withdrawal right, once, on an unpaid order: the decision, the moment, the country it was made from, and the published refunds policy version it was made against. Refuses a waiver when no policy is in force, because a waiver of unpublished words is not evidence.';

-- ---------------------------------------------------------------------------
-- The clock, in one place
-- ---------------------------------------------------------------------------
-- Everything that asks "is it too late to ask for a refund" now asks this. Two
-- clocks used to be possible — a 72-hour fast path in one function and something
-- else in the screen — and a family told two different dates is a family that
-- stops believing either.
create or replace function public.order_withdrawal_window(p_order_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor      uuid := public.current_user_id();
  v_order      public.orders;
  v_country    text;
  v_policy     integer := public.refund_window_hours();
  v_statutory  boolean;
  v_waived     boolean;
  v_hours      integer;
  v_closes     timestamptz;
  v_remaining  integer;
  v_rule       text;
begin
  if v_actor is null then
    raise exception 'sign in to check a refund'
      using errcode = 'insufficient_privilege';
  end if;

  select * into v_order from public.orders where id = p_order_id;
  if v_order.id is null then
    raise exception 'order not found' using errcode = 'P0002';
  end if;

  if not public.is_billing_member(v_order.billing_account_id)
     and not public.is_privileged(v_actor) then
    raise exception 'you are not on the billing account for this order'
      using errcode = 'insufficient_privilege';
  end if;

  -- Where the right is judged from: the country recorded with the choice, or the
  -- account's country where no choice was ever offered. Never `now()` — a buyer
  -- who moves to Uganda does not lose a right they had when they bought.
  v_country := coalesce(
    nullif(btrim(v_order.withdrawal_country::text), ''),
    (select nullif(btrim(a.billing_country), '')
       from public.billing_accounts a
      where a.id = v_order.billing_account_id));

  if v_country is null then
    v_statutory := true;
  else
    v_statutory := public.has_course_withdrawal_right(v_country);
  end if;

  -- `coalesce` because NULL = 'waived' is NULL, and `true and not NULL` is NULL,
  -- which PL/pgSQL treats as false: an order with no decision recorded would have
  -- silently lost the statutory window. Three-valued logic, one word.
  v_waived := coalesce(v_order.withdrawal_decision = 'waived', false);

  if v_statutory and not v_waived then
    -- 14 days, counted from the payment, and the platform's 72 hours run inside
    -- them rather than instead of them.
    v_hours := greatest(v_policy, 14 * 24);
    v_rule  := 'statutory_14_days';
  elsif v_waived then
    v_hours := v_policy;
    v_rule  := 'waived_policy_window';
  else
    v_hours := v_policy;
    v_rule  := 'policy_window';
  end if;

  v_closes := case when v_order.paid_at is null
                   then null
                   else v_order.paid_at + make_interval(hours => v_hours) end;
  v_remaining := case when v_closes is null then null
                      else greatest(0, ceil(extract(epoch from (v_closes - now())) / 3600))::integer end;

  return jsonb_build_object(
    'orderId',         p_order_id,
    'hours',           v_hours,
    'rule',            v_rule,
    'statutory',       v_statutory,
    'waived',          v_waived,
    'decision',        v_order.withdrawal_decision,
    'country',         v_country,
    'policyVersionId', v_order.withdrawal_policy_version_id,
    'decidedAt',       v_order.withdrawal_decided_at,
    'paidAt',          v_order.paid_at,
    'closesAt',        v_closes,
    'remainingHours',  v_remaining,
    'message', case
      when v_order.paid_at is null then
        'The clock starts when payment is confirmed.'
      when v_rule = 'statutory_14_days' then
        format('You have 14 days from payment to withdraw from this purchase, until %s.',
               to_char(v_closes at time zone 'UTC', 'DD Mon YYYY "at" HH24:MI "UTC"'))
      when v_rule = 'waived_policy_window' then
        format('You asked us to open the course immediately, so the 14-day right does not apply. The platform''s %s-hour refund window runs until %s.',
               v_policy,
               to_char(v_closes at time zone 'UTC', 'DD Mon YYYY "at" HH24:MI "UTC"'))
      else
        format('A refund can be asked for within %s hours of payment, until %s.',
               v_policy,
               to_char(v_closes at time zone 'UTC', 'DD Mon YYYY "at" HH24:MI "UTC"'))
    end);
end;
$$;

revoke all on function public.order_withdrawal_window(uuid) from public;
grant execute on function public.order_withdrawal_window(uuid) to authenticated;

comment on function public.order_withdrawal_window(uuid) is
  'When the right to ask for a refund closes on one order, and which rule set that date: the 14-day statutory withdrawal period, the platform''s own 72-hour window, or the 72-hour window after a waiver took the 14 days away. The single clock every refund path reads.';

-- ---------------------------------------------------------------------------
-- The two readers, now on one clock
-- ---------------------------------------------------------------------------
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
  v_window     jsonb;
  v_hours      integer;
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

  v_window     := public.order_withdrawal_window(p_order_id);
  v_hours      := (v_window ->> 'hours')::integer;
  v_closes     := (v_window ->> 'closesAt')::timestamptz;
  v_staff      := public.is_privileged(v_actor);
  v_refundable := public.refundable_amount(p_order_id);
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
    v_message := case
      when v_window ->> 'rule' = 'statutory_14_days' then
        format('The 14 days you have by law to withdraw closed on %s.',
               to_char(v_closes at time zone 'UTC', 'DD Mon YYYY "at" HH24:MI "UTC"'))
      when v_window ->> 'rule' = 'waived_policy_window' then
        format('You asked us to open the course immediately, so the 14-day right does not apply. A refund could be asked for within %s hours of payment, and that window closed on %s.',
               v_hours,
               to_char(v_closes at time zone 'UTC', 'DD Mon YYYY "at" HH24:MI "UTC"'))
      else
        format('A refund can be asked for within %s hours of payment, and that window closed on %s.',
               v_hours,
               to_char(v_closes at time zone 'UTC', 'DD Mon YYYY "at" HH24:MI "UTC"'))
    end;
  else
    v_reason  := 'allowed';
    v_message := case
      when v_staff then
        'You are staff, so you may open a request on this order at any time.'
      when v_window ->> 'rule' = 'statutory_14_days' then
        format('You have 14 days from payment to withdraw from this purchase, until %s.',
               to_char(v_closes at time zone 'UTC', 'DD Mon YYYY "at" HH24:MI "UTC"'))
      when v_window ->> 'rule' = 'waived_policy_window' then
        format('You asked us to open the course immediately, so the 14-day right does not apply; a refund can be asked for until %s.',
               to_char(v_closes at time zone 'UTC', 'DD Mon YYYY "at" HH24:MI "UTC"'))
      else
        format('A refund can be asked for until %s.',
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
    'asStaff',         v_staff,
    -- The whole withdrawal record, not only the date it produced. A screen can
    -- then show a buyer which rule they are on without asking a second question.
    'withdrawal',      v_window);
end;
$$;

revoke all on function public.refund_standing(uuid) from public, anon;
grant execute on function public.refund_standing(uuid) to authenticated;

comment on function public.refund_standing(uuid) is
  'Why a refund can or cannot be asked for on one order: not signed in, not on the account, not paid, nothing left, or the window closed — with the moment it closed and which rule set it (statutory 14 days, the 72-hour policy window, or the policy window after a waiver). Explains request_refund() and decides nothing.';

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
  v_window jsonb;
  v_hours  integer;
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
  -- how a platform loses a family over a course that was sold wrong. Rule 4, new
  -- here: in a 14-day market the clock is 14 days unless the buyer waived it.
  v_window := public.order_withdrawal_window(p_order_id);
  v_hours  := (v_window ->> 'hours')::integer;
  v_closes := (v_window ->> 'closesAt')::timestamptz;

  if not public.is_privileged(v_actor) then
    if now() >= v_closes then
      raise exception
        'the refund window closed on % — %',
        to_char(v_closes at time zone 'UTC', 'DD Mon YYYY "at" HH24:MI "UTC"'),
        case
          when v_window ->> 'rule' = 'statutory_14_days'
            then 'the 14 days you have by law to withdraw have passed'
          else format('a refund can be asked for within %s hours of payment', v_hours)
        end
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
      'window_rule', case when public.is_privileged(v_actor) then null else v_window ->> 'rule' end,
      'paid_at', v_order.paid_at)
  );

  return v_id;
end;
$$;

revoke execute on function public.request_refund(uuid, bigint, text) from public;
grant execute on function public.request_refund(uuid, bigint, text) to authenticated;

comment on function public.request_refund(uuid, bigint, text) is
  'Ask for money back. Refused outside the window that order_withdrawal_window() sets — 14 days in a statutory market unless waived, 72 hours otherwise — unless the caller is staff. Creates a request only: no money moves until staff approve and the provider settles.';

-- ---------------------------------------------------------------------------
-- The policy, brought into line with the decision
-- ---------------------------------------------------------------------------
-- The refunds policy was published on 2026-10-28 and is in force, which matters
-- here: a waiver names a version, so a waiver taken against a version that says
-- "no waiver is offered and none will be" would be a buyer agreeing to a document
-- that denies the thing they are agreeing to. So the paragraph is corrected and a
-- **new version** is published — version 2, in force from 2026-11-01, with version
-- 1 retired and kept, because somebody agreed to it and the record has to survive.
--
-- The new paragraph is `withdrawal_wording()` verbatim, so what the checkout prints
-- and what the policy states are the same string. That is the whole reason the
-- wording is a function rather than a sentence in two places.
--
-- **The wording is unreviewed by a lawyer, and the approval reason says so.** It is
-- recorded in the version's own history rather than hidden: the next person to read
-- this document should be able to see that it was drafted from the law by somebody
-- who is not a lawyer, and that a review is still owed.
do $$
declare
  v_doc      uuid;
  v_live     record;
  v_next     integer;
  v_body     text;
  v_open     int;
  v_reason   constant text :=
    'Owner instruction, 2026-11-01: record that the 14-day withdrawal right is '
    || 'waived by an explicit, unticked box at checkout where this document is in '
    || 'force, and state the right and the choice. The wording is drafted from the '
    || 'law and has not been reviewed by a lawyer; that review is still owed.';
begin
  select d.id into v_doc from public.policy_documents d where d.slug = 'refunds';
  if v_doc is null then
    raise exception 'withdrawal waiver: there is no refunds document';
  end if;

  select * into v_live
    from public.policy_versions v
   where v.document_id = v_doc and v.status = 'in_force'
   order by v.version_number desc
   limit 1;

  if v_live.id is not null
     and position('you have 14 days from the day you pay' in v_live.body) > 0 then
    -- Somebody has already published the correction — on a database where the
    -- owner got there first, or where this migration has run before. Nothing to do
    -- is a legitimate outcome, and saying so is better than silence.
    raise notice 'withdrawal waiver: the refunds policy already states the withdrawal right';
    return;
  end if;

  if v_live.id is null then
    raise exception 'withdrawal waiver: no refunds policy version is in force to correct';
  end if;

  if position('No waiver is offered and none will be' in v_live.body) = 0 then
    raise exception 'withdrawal waiver: the in-force refunds policy does not carry the answer this replaces';
  end if;

  -- The old answer is one paragraph of body text from the first word to the end of
  -- the line. Replacing exactly that keeps the heading above it and the sections
  -- below it where they were, so a diff of the two versions shows one paragraph.
  v_body := regexp_replace(
    v_live.body,
    'The 72-hour window applies on top of any right the law gives you\.[^\n]*',
    public.withdrawal_wording());

  v_open := public.policy_open_decisions(v_body);
  if v_open > 0 then
    raise exception 'withdrawal waiver: the corrected policy still holds % open decision(s)', v_open;
  end if;

  v_next := v_live.version_number + 1;

  -- Retire first: `policy_versions_one_live` allows one version in force per
  -- document, which is what makes "the terms" a single answer.
  update public.policy_versions
     set status = 'retired'
   where id = v_live.id;

  insert into public.policy_versions
    (document_id, version_number, body, change_note, status, effective_at,
     approved_at, approved_by, approval_reason)
  values
    (v_doc, v_next, v_body,
     'The withdrawal paragraph now states the 14-day right and the choice offered at checkout. Decided by the owner on 2026-11-01.',
     'in_force', date '2026-11-01', now(), null, v_reason);

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (null, 'policy.published', 'policy_version', v_live.id,
          jsonb_build_object(
            'slug', 'refunds',
            'versionNumber', v_next,
            'effectiveAt', '2026-11-01',
            'reason', v_reason,
            'replacesVersion', v_live.version_number,
            'source', 'owner instruction of 2026-11-01, recorded by migration',
            'approvedBy', null,
            'whyNoAccount', 'the correction is published with the change that depends on it'));
end $$;

-- ---------------------------------------------------------------------------
-- The flag, and the register row
-- ---------------------------------------------------------------------------
-- The flag was a placeholder for "this is not built". It is built, and the owner
-- decided what it does, so it is on — and turning a CODE-gated flag on is a
-- deploy, not a click, which is exactly what this is. The `app.bypassing_code_flag`
-- setting is the door the register itself provides for that; without it the
-- trigger refuses, which is the guard working.
-- 
-- It still degrades safely: with no refunds policy in force the box is not
-- offered and everybody keeps the 14 days, so switching this on can never take a
-- right away from somebody who was not asked.
select set_config('app.bypassing_code_flag', 'on', true);

update public.platform_settings
   set value_text = 'true',
       preconditions = 'Built 2026-11-01 and switched on: the checkout asks a separate, unticked question about the 14-day withdrawal right, records the answer on the order with the buyer''s country and the published refunds policy version, and computes the refund clock from it (14 days in the EU/EEA/UK unless waived, 72 hours otherwise). Nothing is offered unless a refunds policy version is in force: a waiver of unpublished words is not evidence, so the box disappears and everybody keeps the 14 days. The wording is drafted and has not been reviewed by a lawyer.'
 where key = 'platform.withdrawal_right';
