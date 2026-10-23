-- ---------------------------------------------------------------------------
-- What a payer has paid, and what has not moved yet.
--
-- The platform can answer "what is this order" — `/orders`, and a receipt with
-- a number a person can read down a phone. It can answer "what did the platform
-- take in", on `/admin/money-report`, for staff. It could not answer the one
-- question a parent actually asks after a refund: *what has gone out of my
-- account, and what has come back?*
--
-- The ledger that would answer it, `financial_transactions`, is staff-only and
-- should stay that way: it carries provider references, provider fees and the
-- settlement figures, which are the platform's business rather than a payer's.
-- So this is a projection, built from the three things a payer may already
-- read — their orders, their refund requests, their refund transactions — and
-- it is a definer because it has to read a fourth, `payment_disputes`, that is
-- staff-only for the same reason. The membership check below is therefore the
-- permission, not a formality.
--
-- FOUR RULES, AND THE FIRST TWO ARE THE WHOLE POINT.
--
--   1. ONLY MONEY THAT MOVED IS IN THE BALANCE. A refund that was asked for is
--      not a refund; an approved one is not a refund; one sent to the provider
--      is not a refund until the provider confirms it. Each of those is listed
--      under `notYetMoney` with a sentence saying where it has got to, and none
--      of them moves `netMinor`. This is the same distinction the money path
--      keeps everywhere else — a request is not a refund, an approval is not a
--      transfer, a redirect is not a payment — and the statement is where a
--      customer would notice if it were fudged.
--
--   2. CURRENCIES ARE NOT ADDED TOGETHER. A family that paid in shillings and
--      was refunded in shillings gets one figure in UGX. Nothing here converts
--      or sums across currencies, because that would be an exchange rate
--      nobody recorded. `/admin/money-report` does that, for staff, with a
--      rate beside every number.
--
--   3. THE BALANCE IS A RUNNING TOTAL, PER CURRENCY. Each movement carries the
--      net figure after it, so the last row equals `netMinor` and a reader can
--      check the arithmetic on the page instead of trusting it.
--
--   4. IT IS THE CALLER'S OWN MONEY AND NOBODY ELSE'S. Membership is checked
--      explicitly in the function. A SECURITY DEFINER function does not run
--      under the caller's RLS policies — that is the mistake that once made
--      `my_plan_summary()` return every subscription on the platform — so
--      relying on `orders_read` here would hand one family another's statement.
--      Staff get no shortcut: this answers "what did I pay", and it is the same
--      answer for the owner as for anybody else. Staff who need the whole
--      platform's money have `/admin/money-report` and the ledger.
--
-- WHAT IS DELIBERATELY NOT HERE
-- -----------------------------
-- `can_view_invoices` sits on every billing membership and **no policy or
-- function reads it**, so it is not a control; this projection does not
-- pretend otherwise by honouring it in one place and not the other. Either a
-- writer that sets it and a policy that enforces it arrive together, or the
-- column is dropped. Recorded in `DECISIONS.md` rather than half-implemented.
--
-- A decided dispute does not move the balance, because nothing posts the
-- outcome of a dispute to the ledger yet — `record_refund_in_ledger()` is the
-- only writer of a refund entry and it runs from a refund transaction. A case
-- is therefore listed with its state and a sentence saying that this record has
-- no entry for it, which is true today and will stop being true the day a
-- writer exists. A statement that silently omitted a chargeback would be worse
-- than one that admits the gap.
-- ---------------------------------------------------------------------------

create index if not exists refund_transactions_order_idx
  on public.refund_transactions (order_id);

create or replace function public.my_statement(p_billing_account_id uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor      uuid := public.current_user_id();
  v_account    record;
  v_accounts   jsonb := '[]'::jsonb;
  v_currencies jsonb;
begin
  if v_actor is null then
    raise exception 'sign in to read what you have paid'
      using errcode = 'insufficient_privilege';
  end if;

  -- Rule 4. Asked for an account by name, and not on it, is an error rather
  -- than an empty answer — an empty statement and a refused one must not look
  -- the same.
  if p_billing_account_id is not null and not exists (
    select 1
      from public.billing_account_memberships m
     where m.billing_account_id = p_billing_account_id
       and m.user_id = v_actor
       and m.status = 'active'
  ) then
    raise exception 'you are not a member of that billing account'
      using errcode = 'insufficient_privilege';
  end if;

  for v_account in
    select a.id, a.display_name, a.billing_country, a.billing_currency
      from public.billing_accounts a
      join public.billing_account_memberships m
        on m.billing_account_id = a.id
       and m.user_id = v_actor
       and m.status = 'active'
     where a.deleted_at is null
       and (p_billing_account_id is null or a.id = p_billing_account_id)
     order by a.created_at
  loop
    with moved as (
      -- What the payer was charged: the order as it settled. The ledger's
      -- capture row says the same thing, but the order is the figure the payer
      -- can check against their own bank statement, and it is theirs to read.
      select 'charge'::text  as kind,
             o.paid_at       as occurred_at,
             o.id            as order_id,
             o.order_number::text as order_number,
             o.total_minor   as amount_minor,
             o.currency_code::text as currency_code,
             'out'::text     as direction,
             coalesce(
               (select oi.item_snapshot->>'title'
                  from public.order_items oi
                 where oi.order_id = o.id
                 order by oi.id
                 limit 1),
               'Order ' || coalesce(o.order_number::text, '')) as description,
             o.id::text      as tiebreak
        from public.orders o
       where o.billing_account_id = v_account.id
         and o.paid_at is not null
         and o.deleted_at is null
      union all
      -- What came back. Only a completed refund transaction is money, and the
      -- same row is what writes the ledger entry, so the two cannot disagree.
      select 'refund', rt.refunded_at, rt.order_id, o.order_number::text,
             rt.amount_minor, rt.currency_code::text, 'in',
             coalesce(
               (select oi.item_snapshot->>'title'
                  from public.order_items oi
                 where oi.order_id = o.id
                 order by oi.id
                 limit 1),
               'Order ' || coalesce(o.order_number::text, '')),
             rt.id::text
        from public.refund_transactions rt
        join public.orders o on o.id = rt.order_id
       where o.billing_account_id = v_account.id
         and rt.status = 'completed'
    ),
    ranked as (
      select mv.*,
             sum(case when mv.direction = 'out' then mv.amount_minor
                      else -mv.amount_minor end)
               over (partition by mv.currency_code
                     order by mv.occurred_at, mv.tiebreak) as running
        from moved mv
    ),
    waiting_rows as (
      -- A request that already produced a refund transaction is represented by
      -- that transaction below, so it is not listed twice.
      --
      -- `decision_notes` is deliberately not carried. The admin form invites the
      -- decider to write down "what you checked", which is a note to colleagues
      -- rather than a letter to the customer; the same line separates internal
      -- support notes from the thread the requester reads. What the customer
      -- gets is the outcome and a pointer to Help, not somebody's working notes.
      select 'refund_request'::text as kind,
             r.created_at            as occurred_at,
             r.order_id              as order_id,
             o.order_number::text    as order_number,
             r.requested_amount_minor as amount_minor,
             r.currency_code::text   as currency_code,
             r.status                as status,
             r.reason                as reason,
             case r.status
               when 'requested' then 'Asked for. Nobody has decided yet.'
               when 'approved'  then 'Approved, but not sent. A refund is a transfer, not a click.'
               when 'rejected'  then 'Declined. Nothing was returned — Help can tell you why.'
               when 'withdrawn' then 'Withdrawn by whoever asked.'
             end as says
        from public.refund_requests r
        join public.orders o on o.id = r.order_id
       where o.billing_account_id = v_account.id
         and r.status in ('requested', 'approved', 'rejected', 'withdrawn')
         and not exists (
           select 1 from public.refund_transactions rt
            where rt.refund_request_id = r.id)
      union all
      select 'refund', rt.created_at, rt.order_id, o.order_number::text,
             rt.amount_minor, rt.currency_code::text, rt.status, null,
             case rt.status
               when 'pending' then 'Sent to the payment provider. Waiting for it to confirm.'
               when 'failed'  then 'The provider refused it. Nothing was returned.'
             end
        from public.refund_transactions rt
        join public.orders o on o.id = rt.order_id
       where o.billing_account_id = v_account.id
         and rt.status in ('pending', 'failed')
      union all
      select 'dispute', d.opened_at, d.order_id, o.order_number::text,
             d.disputed_amount_minor, d.currency_code::text, d.status, null,
             case d.status
               when 'open'              then 'Your bank opened a case. Nothing has moved in this record.'
               when 'under_review'      then 'Your bank is reviewing it. Nothing has moved in this record.'
               when 'evidence_submitted' then 'Evidence has gone to your bank. Nothing has moved in this record.'
               when 'won'               then 'Decided in the platform''s favour, so nothing was returned.'
               when 'lost'              then 'Decided in your favour. This record has no entry for it: a decided dispute still has no writer on the ledger.'
               when 'withdrawn'         then 'The case was withdrawn.'
             end
        from public.payment_disputes d
        join public.orders o on o.id = d.order_id
       where o.billing_account_id = v_account.id
    )
    select coalesce(
             jsonb_agg(
               jsonb_build_object(
                 'currencyCode',  k.currency_code,
                 'chargedMinor',  coalesce(r.charged, 0)::text,
                 'refundedMinor', coalesce(r.refunded, 0)::text,
                 -- Rule 3. The balance is what moved, not what was asked for.
                 'netMinor',      (coalesce(r.charged, 0) - coalesce(r.refunded, 0))::text,
                 'moved',         coalesce(r.moved, '[]'::jsonb),
                 'notYetMoney',   coalesce(w.waiting, '[]'::jsonb)
               )
               order by k.currency_code
             ),
             '[]'::jsonb
           )
      into v_currencies
      from (
        select currency_code from ranked
        union
        select currency_code from waiting_rows
      ) k
      left join (
        select currency_code,
               coalesce(sum(amount_minor) filter (where kind = 'charge'), 0) as charged,
               coalesce(sum(amount_minor) filter (where kind = 'refund'), 0) as refunded,
               jsonb_agg(
                 jsonb_build_object(
                   'kind',         kind,
                   'occurredAt',   occurred_at,
                   'orderId',      order_id,
                   'orderNumber',  order_number,
                   'amountMinor',  amount_minor::text,
                   'direction',    direction,
                   'description',  description,
                   'runningMinor', running::text
                 )
                 order by occurred_at, tiebreak
               ) as moved
          from ranked
         group by currency_code
      ) r on r.currency_code = k.currency_code
      left join (
        select currency_code,
               jsonb_agg(
                 jsonb_build_object(
                   'kind',        kind,
                   'occurredAt',  occurred_at,
                   'orderId',     order_id,
                   'orderNumber', order_number,
                   'amountMinor', amount_minor::text,
                   'status',      status,
                   'reason',      reason,
                   'says',        says
                 )
                 order by occurred_at
               ) as waiting
          from waiting_rows
         group by currency_code
      ) w on w.currency_code = k.currency_code;

    v_accounts := v_accounts || jsonb_build_object(
      'billingAccountId', v_account.id,
      'displayName',      v_account.display_name,
      'billingCountry',   v_account.billing_country,
      'billingCurrency',  v_account.billing_currency,
      'currencies',       v_currencies);
  end loop;

  return jsonb_build_object(
    'generatedAt', now(),
    'accounts',    v_accounts);
end;
$$;

revoke all on function public.my_statement(uuid) from public, anon;
grant execute on function public.my_statement(uuid) to authenticated;

comment on function public.my_statement(uuid) is
  'What the signed-in payer has been charged and refunded, per billing account and '
  'per currency, with a running balance that counts only money that moved. Refund '
  'requests, pending refunds and disputes are listed apart, because none of them is '
  'money yet. The caller''s own membership is checked here: a definer function does '
  'not run under RLS, and there is no staff shortcut — this is a personal statement.';
