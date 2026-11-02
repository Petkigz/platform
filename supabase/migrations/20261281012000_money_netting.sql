-- -----------------------------------------------------------------------------
-- What nets against what: three answers, and one figure made of them
-- -----------------------------------------------------------------------------
-- `/admin/money-report` has refused to produce a single net figure since it was
-- built, and said why on its face: whether a chargeback offsets the capture it came
-- from, whether a provider fee is deducted here or from the teacher's payout, and
-- whether a reversed transaction belongs in the period it happened in or the one it
-- was reversed in, are decisions about the business rather than about arithmetic.
-- Guessing would have buried the answer inside a sum that looks authoritative.
--
-- The owner answered all three on 2026-11-01, and this migration makes the answer a
-- figure. Each rule is one line of arithmetic, and each is recorded **on the
-- report** beside the figure it produced, because a net total whose rules live only
-- in a commit message is a total nobody can check.
--
--   1. **A chargeback offsets nothing.** It is a debit in the period it happened in.
--      The capture it answers did take place, it is in the ledger, and the ledger is
--      append-only — a capture that changed because a bank reversed it would be a
--      transaction rewritten to say it never happened.
--
--   2. **A provider fee is the platform's cost, never the teacher's.** So it comes
--      off what the platform keeps and is not subtracted from an instructor's
--      earnings — which is already true in `instructor_earnings_entries`
--      (`net = round(gross × share / 100)`), and is stated here so a reader does not
--      have to infer it from a constraint.
--
--   3. **A reversal belongs to the period it was reversed in.** Every figure in this
--      report is grouped on `occurred_at`, never on the order's payment date. A row
--      back-dated into a closed period makes last month's report change after
--      somebody has read it, and then it reconciles against nothing.
--
-- Two lines are derived, not one, because a single number would have been a lie by
-- omission. The teacher's share of every course sale is **not** in
-- `financial_transactions` — it lives in `instructor_earnings_entries` — so a figure
-- that stopped at the ledger would call money the platform owes a teacher "what the
-- platform made". Both lines are reported:
--
--   * `platformNetMinor` — captures, less refunds, chargebacks, reversals and
--     provider fees, converted at the same single rate as everything else;
--   * `platformRetainedMinor` — that, less the teacher share that accrued in the
--     same window and has not been reversed.
--
-- **A net figure that cannot include part of the money says so.** One currency
-- without a rate makes both lines incomplete, and `complete` is false with the
-- currencies named. A total that silently dropped a market is worse than no total,
-- which is the same reason the gross sections already list what they could not
-- convert.

create or replace function public.report_money_in_reporting_currency(
  p_from timestamptz,
  p_to   timestamptz
)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  v_actor uuid := public.current_user_id();
  v_reporting text;
  v_factor integer;
  v_group record;
  v_conv jsonb;
  v_gross jsonb;
  v_rows jsonb := '[]'::jsonb;
  v_earnings_rows jsonb := '[]'::jsonb;
  v_rates jsonb := '[]'::jsonb;
  v_missing jsonb := '[]'::jsonb;
  v_unconverted jsonb := '[]'::jsonb;
  v_by_direction jsonb := '[]'::jsonb;
  v_outliers jsonb := '[]'::jsonb;
  v_direction record;
  v_seen text[] := '{}';
  v_prev_rate numeric;
  v_prev_observed timestamptz;
  -- The net figure: every term of it summed converted, and withheld as a whole if
  -- any one of them could not be converted.
  v_group_net record;
  v_conv_net jsonb;
  v_conv_share jsonb;
  v_captures numeric := 0;
  v_refunds numeric := 0;
  v_chargebacks numeric := 0;
  v_reversals numeric := 0;
  v_fees numeric := 0;
  v_share numeric := 0;
  v_net_ok boolean := true;
  v_net_missing text[] := '{}';
  v_net jsonb;
begin
  if v_actor is null then
    raise exception 'sign in to read the money report'
      using errcode = 'insufficient_privilege';
  end if;
  if not (public.has_role(v_actor, 'platform_admin')
          or public.has_role(v_actor, 'finance_admin')) then
    raise exception 'only a finance admin or platform admin may read the money report'
      using errcode = 'insufficient_privilege';
  end if;

  if p_from is null or p_to is null then
    raise exception 'a reporting window needs both a start and an end'
      using errcode = 'invalid_parameter_value';
  end if;
  if p_from >= p_to then
    raise exception 'the reporting window must start before it ends'
      using errcode = 'invalid_parameter_value';
  end if;
  if p_to > now() + interval '5 minutes' then
    raise exception 'the reporting window cannot end in the future'
      using errcode = 'invalid_parameter_value';
  end if;
  if p_to - p_from > interval '366 days' then
    raise exception 'a reporting window is at most 366 days; ask for a narrower one'
      using errcode = 'invalid_parameter_value';
  end if;

  v_reporting := upper(btrim(coalesce(
    public.setting_text('finance.reporting_currency', 'USD'), 'USD')));
  v_factor := public.setting_int('finance.rate_sanity_factor', 10);

  -- Every group is converted at one moment, p_to, so a window that spans a
  -- rate change still adds up: two rows in the same currency cannot have used
  -- two different rates and be summed. The rate each row used is reported
  -- beside it, so the figure is reproducible rather than merely plausible.
  for v_group in
    select t.transaction_type, t.direction, upper(btrim(t.currency_code::text)) as currency,
           count(*)::int as n, sum(t.amount_minor)::bigint as amount_minor
      from public.financial_transactions t
     where t.occurred_at >= p_from and t.occurred_at < p_to
     group by 1, 2, 3
     order by 1, 2, 3
  loop
    v_conv := public.to_reporting_currency(v_group.amount_minor,
                                           v_group.currency::char(3), p_to);
    if v_conv is null then
      v_unconverted := v_unconverted || jsonb_build_object(
        'section',      'transactions',
        'currency',     v_group.currency,
        'count',        v_group.n,
        'amountMinor',  v_group.amount_minor::text);
      if not (v_group.currency = any (v_seen)) then
        v_seen := v_seen || v_group.currency;
        v_missing := v_missing || to_jsonb(v_group.currency);
      end if;
    else
      if not (v_group.currency = any (v_seen)) then
        v_seen := v_seen || v_group.currency;
        v_rates := v_rates || v_conv;
      end if;
    end if;

    v_rows := v_rows || jsonb_build_object(
      'section',            'transactions',
      'transactionType',    v_group.transaction_type,
      'direction',          v_group.direction,
      'currency',           v_group.currency,
      'count',              v_group.n,
      'amountMinor',        v_group.amount_minor::text,
      'reportingAmountMinor', case when v_conv is null then null::text
                                   else v_conv ->> 'amountMinor' end);
  end loop;

  for v_group in
    select e.status, upper(btrim(e.currency_code::text)) as currency,
           count(*)::int as n,
           sum(e.gross_amount_minor)::bigint as gross_minor,
           sum(e.net_amount_minor)::bigint as net_minor
      from public.instructor_earnings_entries e
     where e.accrued_at >= p_from and e.accrued_at < p_to
     group by 1, 2
     order by 1, 2
  loop
    v_conv := public.to_reporting_currency(v_group.net_minor,
                                           v_group.currency::char(3), p_to);
    v_gross := public.to_reporting_currency(v_group.gross_minor,
                                            v_group.currency::char(3), p_to);
    if v_conv is null then
      v_unconverted := v_unconverted || jsonb_build_object(
        'section',      'earnings',
        'currency',     v_group.currency,
        'count',        v_group.n,
        'amountMinor',  v_group.net_minor::text);
      if not (v_group.currency = any (v_seen)) then
        v_seen := v_seen || v_group.currency;
        v_missing := v_missing || to_jsonb(v_group.currency);
      end if;
    else
      if not (v_group.currency = any (v_seen)) then
        v_seen := v_seen || v_group.currency;
        v_rates := v_rates || v_conv;
      end if;
    end if;

    v_earnings_rows := v_earnings_rows || jsonb_build_object(
      'section',              'earnings',
      'status',               v_group.status,
      'currency',             v_group.currency,
      'count',                v_group.n,
      'grossAmountMinor',     v_group.gross_minor::text,
      'netAmountMinor',       v_group.net_minor::text,
      'reportingGrossMinor',  case when v_gross is null then null::text
                                   else v_gross ->> 'amountMinor' end,
      'reportingNetMinor',    case when v_conv is null then null::text
                                   else v_conv ->> 'amountMinor' end);
  end loop;

  -- Gross by direction. Not netted: a refund is money going back and a capture
  -- is money coming in, but whether a chargeback offsets a capture, and
  -- whether a provider fee is deducted here or in the payout, are decisions
  -- about the business rather than about arithmetic. The report refuses to
  -- make them quietly.
  for v_direction in
    select r ->> 'direction' as direction,
           count(*)::int as groups,
           sum((r ->> 'count')::int) as n,
           sum(nullif(r ->> 'reportingAmountMinor', '')::bigint) as reporting_minor
      from jsonb_array_elements(v_rows) r
     group by 1 order by 1
  loop
    v_by_direction := v_by_direction || jsonb_build_object(
      'direction',           v_direction.direction,
      'groups',              v_direction.groups,
      'count',               v_direction.n,
      'reportingAmountMinor', coalesce(v_direction.reporting_minor, 0)::text);
  end loop;

  -- A rate that moved implausibly far is shown even when it was recorded with
  -- an override reason: the reason satisfied the writer, and the reader of the
  -- total still deserves to see which rate is doing the most work.
  if v_factor > 0 then
    for v_group in
      select (r ->> 'rateId')::uuid as rate_id, r ->> 'base' as base,
             r ->> 'quote' as quote, (r ->> 'rate')::numeric as rate,
             (r ->> 'observedAt')::timestamptz as observed_at, r ->> 'source' as source
        from jsonb_array_elements(v_rates) r
       where nullif(r ->> 'rateId', '') is not null
    loop
      select prev.rate, prev.observed_at into v_prev_rate, v_prev_observed
        from public.currency_exchange_rates prev
       where upper(btrim(prev.base_currency::text)) = v_group.base
         and upper(btrim(prev.quote_currency::text)) = v_group.quote
         and prev.observed_at < v_group.observed_at
       order by prev.observed_at desc, prev.created_at desc, prev.id desc
       limit 1;
      if v_prev_rate is not null
         and (v_group.rate > v_prev_rate * v_factor
              or v_group.rate * v_factor < v_prev_rate) then
        v_outliers := v_outliers || jsonb_build_object(
          'base',        v_group.base,
          'quote',       v_group.quote,
          'rate',        v_group.rate::text,
          'previousRate', v_prev_rate::text,
          'factor',      v_factor,
          'observedAt',  v_group.observed_at,
          'source',      v_group.source);
      end if;
    end loop;
  end if;


  -- ---------------------------------------------------------------------------
  -- The net figure, and the three rules it is made of
  -- ---------------------------------------------------------------------------
  -- Every term is summed in its own currency and converted at p_to, the same moment
  -- the gross sections use. Summing first and converting once is what makes the
  -- figure reproducible: two captures in the same currency cannot be converted at
  -- two rates and then added.
  for v_group_net in
    select t.transaction_type,
           upper(btrim(t.currency_code::text)) as currency,
           sum(t.amount_minor)::bigint as amount_minor
      from public.financial_transactions t
     where t.occurred_at >= p_from and t.occurred_at < p_to
       and t.transaction_type in ('capture', 'refund', 'chargeback', 'reversal', 'provider_fee')
     group by 1, 2
  loop
    v_conv_net := public.to_reporting_currency(v_group_net.amount_minor,
                                               v_group_net.currency::char(3), p_to);
    if v_conv_net is null then
      -- A net figure missing a currency is not a smaller net figure, it is a wrong
      -- one. The currencies are named and `complete` is false.
      v_net_ok := false;
      if not (v_group_net.currency = any (v_net_missing)) then
        v_net_missing := v_net_missing || v_group_net.currency;
      end if;
    else
      case v_group_net.transaction_type
        when 'capture'      then v_captures    := v_captures    + (v_conv_net ->> 'amountMinor')::numeric;
        when 'refund'       then v_refunds     := v_refunds     + (v_conv_net ->> 'amountMinor')::numeric;
        when 'chargeback'   then v_chargebacks := v_chargebacks + (v_conv_net ->> 'amountMinor')::numeric;
        when 'reversal'     then v_reversals   := v_reversals   + (v_conv_net ->> 'amountMinor')::numeric;
        when 'provider_fee' then v_fees        := v_fees        + (v_conv_net ->> 'amountMinor')::numeric;
        else null;
      end case;
    end if;
  end loop;

  -- The teacher share that accrued in the same window and has not been reversed.
  -- It is not a `financial_transactions` row, which is exactly why one line would
  -- have been a lie: this money has left the platform's own hands already.
  for v_group_net in
    select upper(btrim(e.currency_code::text)) as currency,
           sum(e.net_amount_minor)::bigint as amount_minor
      from public.instructor_earnings_entries e
     where e.accrued_at >= p_from and e.accrued_at < p_to
       and e.status <> 'reversed'
     group by 1
  loop
    v_conv_share := public.to_reporting_currency(v_group_net.amount_minor,
                                                 v_group_net.currency::char(3), p_to);
    if v_conv_share is null then
      v_net_ok := false;
      if not (v_group_net.currency = any (v_net_missing)) then
        v_net_missing := v_net_missing || v_group_net.currency;
      end if;
    else
      v_share := v_share + (v_conv_share ->> 'amountMinor')::numeric;
    end if;
  end loop;

  v_net := jsonb_build_object(
    'currency', v_reporting,
    'complete', v_net_ok,
    'missingRates', to_jsonb(v_net_missing),
    'lines', jsonb_build_array(
      jsonb_build_object('code', 'captures',    'label', 'Captures',              'sign', 'add',
                         'amountMinor', v_captures::bigint::text,
                         'rule', 'A capture is money in, in the period it happened.'),
      jsonb_build_object('code', 'refunds',     'label', 'Refunds',               'sign', 'subtract',
                         'amountMinor', v_refunds::bigint::text,
                         'rule', 'A refund is money back out, in the period it was paid.'),
      jsonb_build_object('code', 'chargebacks', 'label', 'Chargebacks',           'sign', 'subtract',
                         'amountMinor', v_chargebacks::bigint::text,
                         'rule', 'Rule 1: a chargeback offsets nothing. It is its own debit in its own period; the capture it answers still happened, and the ledger is append-only.'),
      jsonb_build_object('code', 'reversals',   'label', 'Reversals',             'sign', 'subtract',
                         'amountMinor', v_reversals::bigint::text,
                         'rule', 'Rule 3: a reversal belongs to the period it was reversed in. Nothing here is back-dated into a closed period, so a report read last month does not change today.'),
      jsonb_build_object('code', 'providerFees','label', 'Provider fees',         'sign', 'subtract',
                         'amountMinor', v_fees::bigint::text,
                         'rule', 'Rule 2: a provider fee is the platform''s cost. It comes off what the platform keeps and never off a teacher''s share — their earnings are gross × share, untouched.'),
      jsonb_build_object('code', 'teacherShare','label', 'Teacher share accrued', 'sign', 'subtract',
                         'amountMinor', v_share::bigint::text,
                         'rule', 'The teacher''s half of every sale in this window, which is not a ledger row at all — it lives in instructor_earnings_entries. It is subtracted once, here, so the last line is what the platform keeps rather than what it handled.')),
    'platformNetMinor',
      case when not v_net_ok then null
           else (v_captures - v_refunds - v_chargebacks - v_reversals - v_fees)::bigint::text end,
    'platformRetainedMinor',
      case when not v_net_ok then null
           else (v_captures - v_refunds - v_chargebacks - v_reversals - v_fees - v_share)::bigint::text end,
    'note',
      case when not v_net_ok then
        'The net figures are withheld, not zero: at least one currency in this period has no rate into the reporting currency, and a net figure missing a market is a wrong figure rather than a smaller one.'
      else
        'Two lines, because one would have been a lie by omission: the teacher''s share is not a ledger row, and money owed to a teacher is not money the platform made. Both are converted at the same single rate as every other figure here.'
      end);

  return jsonb_build_object(
    'reportingCurrency', v_reporting,
    'window', jsonb_build_object('from', p_from, 'to', p_to),
    'rows', v_rows,
    'earnings', v_earnings_rows,
    'byDirection', v_by_direction,
    'totals', jsonb_build_object(
      'groups',               jsonb_array_length(v_rows),
      'transactions',         (select count(*)::int from public.financial_transactions t
                                where t.occurred_at >= p_from and t.occurred_at < p_to),
      'unconvertedGroups',    jsonb_array_length(v_unconverted),
      'missingRates',         v_missing),
    'unconverted', v_unconverted,
    'ratesUsed', v_rates,
    'outliers', v_outliers,
    'netting', v_net,
    'note', 'The gross sections below are grouped by type and direction'
      || ' and never netted against each other; what nets against what is decided once,'
      || ' in `netting`, and each rule is printed beside the line it made.'
  );
end;
$$;


revoke all on function public.report_money_in_reporting_currency(timestamptz, timestamptz) from public;
grant execute on function public.report_money_in_reporting_currency(timestamptz, timestamptz) to authenticated;

comment on function public.report_money_in_reporting_currency(timestamptz, timestamptz) is
  'Money that moved in a window, converted to finance.reporting_currency, with the rate used beside every figure, a separate list of what could not be converted, and a netting block — two derived lines (what the platform handled, what it kept) whose three rules are reported beside them rather than assumed by the query, and which are withheld outright when a currency in the window has no rate.';
