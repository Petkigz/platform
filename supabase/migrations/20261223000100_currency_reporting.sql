-- Money is reported in one currency, and every conversion says where its rate
-- came from.
--
-- The gap this closes. The platform charges in whatever currency a family has
-- — UGX in Kampala, NGN in Lagos, GBP in Birmingham — and the owner reads one
-- number, in USD (recorded in the project record before any code existed).
-- Three pieces of that were built and none of them were reachable:
--
--   * `currency_exchange_rates` existed, with an index built for exactly this
--     lookup (`base, quote, observed_at desc`), and **nothing could write to
--     it** except a raw insert by staff. So there was no rate to convert with.
--   * `financial_transactions.fx_rate`, `fx_source` and `fx_observed_at` were
--     required by `ft_settlement_needs_fx` whenever a settlement lands in
--     another currency — and no function in the repository ever set one. D4's
--     "FX recorded with source and timestamp" was a constraint with no writer.
--   * `settlement_amount_minor` / `settlement_currency` had the same problem:
--     reconciliation could match a provider statement line to a transaction,
--     but nothing could say what actually landed.
--
-- So every money screen summed mixed currencies, which is not a number: 5 000
-- UGX plus 3 USD is meaningless, and the two are 100x apart in minor units
-- because UGX has no minor unit at all.
--
-- What this adds, in the order it is used:
--
--   1. `record_exchange_rate()` — the writer. Staff-only, and it refuses a
--      rate that has no named source, because a rate nobody can attribute is
--      not auditable. It also refuses a rate that has moved implausibly far
--      from the previous one for the same pair unless the person entering it
--      writes down why: a slipped decimal in a rate is a 100x error in the only
--      number the owner reads, and it looks perfectly reasonable on screen.
--   2. `resolve_exchange_rate()` — the reader. Newest observation at or before
--      a moment, or the inverse of one when only that was recorded (flagged
--      `derived`, never presented as if it had been published), or **nothing**.
--      A missing pair returns NULL rather than 1. Guessing that an unknown
--      currency is worth a dollar is the one mistake here that would be
--      invisible in the total.
--   3. `to_reporting_currency()` — the conversion, in integer minor units per
--      D4, using each currency's own minor-unit divisor so a zero-decimal
--      currency is not silently multiplied by 100.
--   4. `record_transaction_settlement()` — what actually landed, stamped with
--      the rate row it used. It refuses to settle across currencies when no
--      rate is recorded, which is the point: FX provenance comes from the rate
--      table, so there is one place a rate is ever written down.
--   5. `report_money_in_reporting_currency()` — the number the owner reads.
--      Gross, grouped by type and direction, and it lists separately what it
--      could not convert. It deliberately produces **no single net figure**:
--      what nets against what is a decision, not an arithmetic convention, and
--      it is recorded as open in NEXT.md rather than assumed here.
--
-- Minor-unit divisors live in `currency_minor_divisor()` and, independently, in
-- `web/src/lib/money.ts` — the browser needs one to display an amount and it
-- cannot call the database for it. That is a deliberate duplication of a fact
-- that has two consumers and no shared runtime, and both copies are pinned by
-- tests on their own side (`currency_reporting.test.mjs` and
-- `web/src/lib/currency.test.ts` assert the same three lists). Change one and
-- a test fails; change the meaning and both should.

-- ---------------------------------------------------------------------------
-- Typed accessor for text settings, and a fix to the integer one
-- ---------------------------------------------------------------------------
-- setting_int() documented itself as "falling back to p_default when unset or
-- blank" and did not: a SQL function whose query returns no rows returns NULL,
-- so a missing key ignored the default entirely. It never showed up because
-- every key it is called with is seeded. Recreated here with the fallback it
-- claimed, and pinned by a test that deletes the row rather than blanking it.

create or replace function public.setting_int(
  p_key     text,
  p_default integer default 0
)
returns integer
language sql
stable
security definer
set search_path=public
as $$
  select coalesce(
    (select nullif(btrim(value_text), '')::integer
       from public.platform_settings
      where key = p_key),
    p_default
  );
$$;

create or replace function public.setting_text(
  p_key     text,
  p_default text default null
)
returns text
language sql
stable
security definer
set search_path=public
as $$
  select coalesce(
    (select nullif(btrim(value_text), '')
       from public.platform_settings
      where key = p_key),
    p_default
  );
$$;

revoke all on function public.setting_text(text, text) from public;
grant execute on function public.setting_text(text, text) to authenticated;

comment on function public.setting_text(text, text) is
  'Reads a text platform setting, falling back to p_default when the key is absent, blank or NULL.';
comment on function public.setting_int(text, integer) is
  'Reads an integer platform setting, falling back to p_default when the key is absent, blank or NULL.';

-- ---------------------------------------------------------------------------
-- The two controls
-- ---------------------------------------------------------------------------
-- Both are business numbers, not engineering constants, so both live in the
-- register where an admin can change them and FLAGS.md says what they decide.
-- Neither is a feature flag: there is nothing here to switch off, because a
-- report nobody can reach is not a half-built feature, it is a missing one.

insert into public.platform_settings
  (key, value_type, value_text, description, gate_type, preconditions, flag_group)
values
  ('finance.reporting_currency', 'text', 'USD',
   'The single currency money is reported in. Original amounts stay authoritative (D4); this only decides what a total is converted to before a person reads it.',
   'admin', null, 'Money'),
  ('finance.rate_sanity_factor', 'integer', '10',
   'How many times the previous recorded rate for a pair a new rate may be before recording it needs a written reason. 0 disables the check.',
   'admin', null, 'Money')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- Minor units
-- ---------------------------------------------------------------------------
-- ISO 4217 has three exponents in live use: 0 (the Ugandan shilling, among
-- others), 2 (most currencies) and 3 (the Gulf dinars). Treating a
-- three-decimal currency as two-decimal is a 10x error, so it gets its own
-- case rather than falling through to the common one.
--
-- This list is mirrored in web/src/lib/money.ts. See the note at the top.

create or replace function public.currency_minor_divisor(p_currency char(3))
returns integer
language plpgsql
immutable
security definer
set search_path=public
as $$
declare
  v_code text := upper(btrim(coalesce(p_currency::text, '')));
begin
  if v_code !~ '^[A-Z]{3}$' then
    raise exception 'currency must be a three-letter uppercase ISO code, got %',
      coalesce(p_currency::text, 'nothing')
      using errcode = 'invalid_parameter_value';
  end if;

  if v_code in ('BIF','CLP','DJF','GNF','ISK','JPY','KMF','KRW','PYG','RWF',
                'UGX','UYI','VND','VUV','XAF','XOF','XPF') then
    return 1;
  end if;

  if v_code in ('BHD','IQD','JOD','KWD','LYD','OMR','TND') then
    return 1000;
  end if;

  return 100;
end;
$$;

revoke all on function public.currency_minor_divisor(char) from public;
grant execute on function public.currency_minor_divisor(char) to anon, authenticated;

comment on function public.currency_minor_divisor(char) is
  'How many minor units make one major unit. Mirrored in web/src/lib/money.ts; both copies are pinned by tests.';

-- ---------------------------------------------------------------------------
-- 1. Recording a rate
-- ---------------------------------------------------------------------------

create or replace function public.record_exchange_rate(
  p_base_currency    char(3),
  p_quote_currency   char(3),
  p_rate             numeric,
  p_source           text,
  p_observed_at      timestamptz default null,
  p_override_reason  text        default null
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  v_actor uuid := public.current_user_id();
  v_source text := nullif(btrim(coalesce(p_source, '')), '');
  v_reason text := nullif(btrim(coalesce(p_override_reason, '')), '');
  v_observed timestamptz := coalesce(p_observed_at, now());
  v_factor integer;
  v_prev_id uuid;
  v_prev_rate numeric;
  v_id uuid;
begin
  if v_actor is null then
    raise exception 'sign in to record an exchange rate'
      using errcode = 'insufficient_privilege';
  end if;
  if not (public.has_role(v_actor, 'platform_admin')
          or public.has_role(v_actor, 'finance_admin')) then
    raise exception 'only a finance admin or platform admin may record an exchange rate'
      using errcode = 'insufficient_privilege';
  end if;

  if p_base_currency is null or upper(btrim(p_base_currency::text)) !~ '^[A-Z]{3}$' then
    raise exception 'the base currency must be a three-letter uppercase ISO code'
      using errcode = 'invalid_parameter_value';
  end if;
  if p_quote_currency is null or upper(btrim(p_quote_currency::text)) !~ '^[A-Z]{3}$' then
    raise exception 'the quote currency must be a three-letter uppercase ISO code'
      using errcode = 'invalid_parameter_value';
  end if;
  if upper(btrim(p_base_currency::text)) = upper(btrim(p_quote_currency::text)) then
    raise exception 'a rate cannot quote a currency against itself; that conversion is exactly 1'
      using errcode = 'invalid_parameter_value';
  end if;

  if p_rate is null or p_rate <= 0 then
    raise exception 'an exchange rate must be a positive number'
      using errcode = 'invalid_parameter_value';
  end if;
  if p_rate > 1000000000 then
    raise exception 'a rate above one billion is not a currency pair this platform quotes'
      using errcode = 'invalid_parameter_value';
  end if;

  if v_source is null then
    raise exception 'the source of a rate is required: who published it, and where'
      using errcode = 'invalid_parameter_value';
  end if;
  if length(v_source) > 200 then
    raise exception 'keep the rate source under 200 characters'
      using errcode = 'invalid_parameter_value';
  end if;

  if v_observed > now() + interval '5 minutes' then
    raise exception 'a rate cannot be observed in the future'
      using errcode = 'invalid_parameter_value';
  end if;

  if v_reason is not null and length(v_reason) > 500 then
    raise exception 'keep the override reason under 500 characters'
      using errcode = 'invalid_parameter_value';
  end if;

  -- The most recent observation of this pair strictly before this one. Equal
  -- timestamps are not "previous": they are the same moment, and comparing a
  -- rate to itself would never trip the guard.
  select r.id, r.rate into v_prev_id, v_prev_rate
    from public.currency_exchange_rates r
   where upper(btrim(r.base_currency::text))  = upper(btrim(p_base_currency::text))
     and upper(btrim(r.quote_currency::text)) = upper(btrim(p_quote_currency::text))
     and r.observed_at < v_observed
   order by r.observed_at desc, r.created_at desc, r.id desc
   limit 1;

  v_factor := public.setting_int('finance.rate_sanity_factor', 10);

  if v_factor > 0 and v_prev_rate is not null then
    if p_rate > v_prev_rate * v_factor or p_rate * v_factor < v_prev_rate then
      if v_reason is null then
        raise exception
          'the rate % is more than % times away from the last recorded rate % for % to %. If that is right, say why in writing',
          p_rate, v_factor, v_prev_rate,
          upper(btrim(p_base_currency::text)), upper(btrim(p_quote_currency::text))
          using errcode = 'check_violation';
      end if;
    end if;
  end if;

  insert into public.currency_exchange_rates
    (base_currency, quote_currency, rate, source, observed_at)
  values
    (upper(btrim(p_base_currency::text))::char(3),
     upper(btrim(p_quote_currency::text))::char(3),
     p_rate, v_source, v_observed)
  returning id into v_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'finance.exchange_rate_recorded', 'currency_exchange_rate', v_id,
    jsonb_build_object(
      'base_currency',     upper(btrim(p_base_currency::text)),
      'quote_currency',    upper(btrim(p_quote_currency::text)),
      'rate',              p_rate::text,
      'source',            v_source,
      'observed_at',       v_observed,
      'previous_rate',     v_prev_rate::text,
      'previous_rate_id',  v_prev_id,
      'override_reason',   v_reason
    ));

  return v_id;
end;
$$;

revoke all on function public.record_exchange_rate(char, char, numeric, text, timestamptz, text) from public;
grant execute on function public.record_exchange_rate(char, char, numeric, text, timestamptz, text) to authenticated;

comment on function public.record_exchange_rate(char, char, numeric, text, timestamptz, text) is
  'Records one observed exchange rate with its source. A rate that moved more than finance.rate_sanity_factor times the previous one needs a written reason.';

-- ---------------------------------------------------------------------------
-- 2. Resolving a rate
-- ---------------------------------------------------------------------------

create or replace function public.resolve_exchange_rate(
  p_base_currency  char(3),
  p_quote_currency char(3),
  p_as_of          timestamptz default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  v_base text;
  v_quote text;
  v_as_of timestamptz := coalesce(p_as_of, now());
  v_id uuid;
  v_rate numeric;
  v_source text;
  v_observed timestamptz;
  v_derived boolean := false;
begin
  if p_base_currency is null or p_quote_currency is null then
    return null;
  end if;

  v_base  := upper(btrim(p_base_currency::text));
  v_quote := upper(btrim(p_quote_currency::text));
  if v_base !~ '^[A-Z]{3}$' or v_quote !~ '^[A-Z]{3}$' then
    raise exception 'a currency code must be three uppercase letters'
      using errcode = 'invalid_parameter_value';
  end if;

  -- Same currency is not a lookup. Returning 1 with no provenance is exact,
  -- and marking it derived would imply somebody published it.
  if v_base = v_quote then
    return jsonb_build_object(
      'rateId',     null::uuid,
      'base',       v_base,
      'quote',      v_quote,
      'rate',       '1',
      'source',     'identity',
      'observedAt', null::timestamptz,
      'derived',    false
    );
  end if;

  select r.id, r.rate, r.source, r.observed_at
    into v_id, v_rate, v_source, v_observed
    from public.currency_exchange_rates r
   where upper(btrim(r.base_currency::text)) = v_base
     and upper(btrim(r.quote_currency::text)) = v_quote
     and r.observed_at <= v_as_of
   order by r.observed_at desc, r.created_at desc, r.id desc
   limit 1;

  if v_id is null then
    -- Only the other direction was ever recorded. Inverting it is arithmetic,
    -- not a guess, but the answer must say so: a derived rate carries the
    -- published rate's rounding and nobody quoted it.
    select r.id, r.rate, r.source, r.observed_at
      into v_id, v_rate, v_source, v_observed
      from public.currency_exchange_rates r
     where upper(btrim(r.base_currency::text)) = v_quote
       and upper(btrim(r.quote_currency::text)) = v_base
       and r.observed_at <= v_as_of
     order by r.observed_at desc, r.created_at desc, r.id desc
     limit 1;

    if v_id is not null then
      v_rate := 1::numeric / v_rate;
      v_source := 'derived by inverting the recorded ' || v_quote || ' to ' || v_base
                  || ' rate (' || v_source || ')';
      v_derived := true;
    end if;
  end if;

  -- No rate in either direction. NULL, not 1, not the last rate we do have for
  -- some other pair: the caller reports this amount as unconverted instead of
  -- folding a made-up figure into a total.
  if v_id is null then
    return null;
  end if;

  return jsonb_build_object(
    'rateId',     v_id,
    'base',       v_base,
    'quote',      v_quote,
    'rate',       v_rate::text,
    'source',     v_source,
    'observedAt', v_observed,
    'derived',    v_derived
  );
end;
$$;

revoke all on function public.resolve_exchange_rate(char, char, timestamptz) from public;
grant execute on function public.resolve_exchange_rate(char, char, timestamptz) to authenticated;

comment on function public.resolve_exchange_rate(char, char, timestamptz) is
  'The newest recorded rate at or before p_as_of, or the inverse of one flagged derived, or NULL when neither exists. Never guesses.';

-- ---------------------------------------------------------------------------
-- 3. Converting to the reporting currency
-- ---------------------------------------------------------------------------

create or replace function public.to_reporting_currency(
  p_amount_minor bigint,
  p_currency     char(3),
  p_as_of        timestamptz default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  v_reporting text;
  v_rate jsonb;
  v_numeric numeric;
  v_amount bigint;
begin
  if p_amount_minor is null or p_currency is null then
    return null;
  end if;

  v_reporting := upper(btrim(coalesce(
    public.setting_text('finance.reporting_currency', 'USD'), 'USD')));
  if v_reporting !~ '^[A-Z]{3}$' then
    raise exception
      'finance.reporting_currency is not a three-letter currency code: %', v_reporting
      using errcode = 'invalid_parameter_value';
  end if;

  if upper(btrim(p_currency::text)) = v_reporting then
    return jsonb_build_object(
      'amountMinor', p_amount_minor::text,
      'currency',    v_reporting,
      'base',        v_reporting,
      'quote',       v_reporting,
      'rate',        '1',
      'source',      'identity',
      'observedAt',  null::timestamptz,
      'derived',     false,
      'rateId',      null::uuid
    );
  end if;

  v_rate := public.resolve_exchange_rate(p_currency, v_reporting::char(3), p_as_of);
  if v_rate is null then
    return null;
  end if;

  v_numeric := (v_rate ->> 'rate')::numeric;

  -- Both divisors matter. 5 000 minor units of UGX is 5 000 shillings, because
  -- UGX has no minor unit; 5 000 minor units of USD is 50 dollars. Applying a
  -- major-unit rate to minor units without this is a 100x error in either
  -- direction, and it is the easiest mistake in this file to make and the
  -- hardest to notice in a total that still looks like a number.
  v_amount := round(
      p_amount_minor::numeric
      / public.currency_minor_divisor(p_currency)
      * v_numeric
      * public.currency_minor_divisor(v_reporting::char(3)),
    0)::bigint;

  return v_rate || jsonb_build_object(
    'amountMinor', v_amount::text,
    'currency',    v_reporting
  );
end;
$$;

revoke all on function public.to_reporting_currency(bigint, char, timestamptz) from public;
grant execute on function public.to_reporting_currency(bigint, char, timestamptz) to authenticated;

comment on function public.to_reporting_currency(bigint, char, timestamptz) is
  'Converts integer minor units into finance.reporting_currency using a recorded rate, or returns NULL when no rate exists. Never invents one.';

-- ---------------------------------------------------------------------------
-- 4. What actually landed
-- ---------------------------------------------------------------------------

create or replace function public.record_transaction_settlement(
  p_financial_transaction_id  uuid,
  p_settlement_amount_minor   bigint,
  p_settlement_currency       char(3),
  p_rate_id                   uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_actor uuid := public.current_user_id();
  v_tx public.financial_transactions;
  v_settlement_currency text;
  v_tx_currency text;
  v_named record;
  v_named_base text;
  v_named_quote text;
  v_res jsonb;
  v_rate_id uuid;
  v_derived boolean := false;
  v_fx_rate numeric;
  v_fx_source text;
  v_fx_observed timestamptz;
  v_prev_status text;
  v_prev_amount bigint;
  v_prev_currency text;
begin
  if v_actor is null then
    raise exception 'sign in to record a settlement'
      using errcode = 'insufficient_privilege';
  end if;
  if not (public.has_role(v_actor, 'platform_admin')
          or public.has_role(v_actor, 'finance_admin')) then
    raise exception 'only a finance admin or platform admin may record a settlement'
      using errcode = 'insufficient_privilege';
  end if;

  select * into v_tx from public.financial_transactions
   where id = p_financial_transaction_id
   for update;
  if not found then
    raise exception 'financial transaction % not found', p_financial_transaction_id
      using errcode = 'no_data_found';
  end if;

  if v_tx.status = 'reversed' then
    raise exception 'a reversed transaction cannot be settled'
      using errcode = 'check_violation';
  end if;
  if v_tx.status = 'failed' then
    raise exception 'a failed transaction never settled; record a financial adjustment instead'
      using errcode = 'check_violation';
  end if;

  if p_settlement_amount_minor is null or p_settlement_amount_minor < 0 then
    raise exception 'the settled amount must be a whole number of minor units, zero or more'
      using errcode = 'invalid_parameter_value';
  end if;
  if p_settlement_currency is null
     or upper(btrim(p_settlement_currency::text)) !~ '^[A-Z]{3}$' then
    raise exception 'the settlement currency must be a three-letter uppercase ISO code'
      using errcode = 'invalid_parameter_value';
  end if;
  v_settlement_currency := upper(btrim(p_settlement_currency::text));
  v_tx_currency := upper(btrim(v_tx.currency_code::text));

  if v_settlement_currency = v_tx_currency then
    -- No conversion happened, so there is nothing to cite. Setting an fx rate
    -- here would claim a provenance for a figure that needed none.
    if p_rate_id is not null then
      raise exception 'this settlement needs no exchange rate; it is in the transaction currency'
        using errcode = 'invalid_parameter_value';
    end if;
    v_fx_rate := null;
    v_fx_source := null;
    v_fx_observed := null;
    v_rate_id := null;
    v_derived := false;
  else
    if p_rate_id is not null then
      -- A named rate row is used exactly as recorded. It may be the pair in
      -- either direction: inverting it is arithmetic, and the result says it
      -- was derived rather than presenting itself as a published quote.
      select r.base_currency, r.quote_currency, r.rate, r.source, r.observed_at
        into v_named
        from public.currency_exchange_rates r
       where r.id = p_rate_id;
      if not found then
        raise exception 'exchange rate % not found', p_rate_id
          using errcode = 'no_data_found';
      end if;

      v_named_base := upper(btrim(v_named.base_currency::text));
      v_named_quote := upper(btrim(v_named.quote_currency::text));

      if v_named_base = v_tx_currency and v_named_quote = v_settlement_currency then
        v_fx_rate := v_named.rate;
        v_fx_source := v_named.source;
        v_derived := false;
      elsif v_named_base = v_settlement_currency and v_named_quote = v_tx_currency then
        v_fx_rate := 1::numeric / v_named.rate;
        v_fx_source := 'derived by inverting the recorded ' || v_named_quote
                       || ' to ' || v_named_base || ' rate (' || v_named.source || ')';
        v_derived := true;
      else
        raise exception 'rate % is recorded for % to %, not for % to %',
          p_rate_id, v_named_base, v_named_quote, v_tx_currency, v_settlement_currency
          using errcode = 'invalid_parameter_value';
      end if;

      v_fx_observed := v_named.observed_at;
      v_rate_id := p_rate_id;
    else
      v_res := public.resolve_exchange_rate(v_tx.currency_code,
                                            v_settlement_currency::char(3),
                                            now());
      if v_res is null then
        raise exception
          'no exchange rate is recorded from % to %. Record one first, so the settlement cites a rate with a source',
          v_tx_currency, v_settlement_currency
          using errcode = 'invalid_parameter_value';
      end if;

      v_fx_rate := (v_res ->> 'rate')::numeric;
      v_fx_source := v_res ->> 'source';
      v_fx_observed := (v_res ->> 'observedAt')::timestamptz;
      v_rate_id := (v_res ->> 'rateId')::uuid;
      v_derived := (v_res ->> 'derived')::boolean;
    end if;
  end if;

  v_prev_status := v_tx.status;
  v_prev_amount := v_tx.settlement_amount_minor;
  v_prev_currency := v_tx.settlement_currency::text;

  update public.financial_transactions
     set settlement_amount_minor = p_settlement_amount_minor,
         settlement_currency     = v_settlement_currency::char(3),
         fx_rate                 = v_fx_rate,
         fx_source               = v_fx_source,
         fx_observed_at          = v_fx_observed,
         status                  = 'settled'
   where id = v_tx.id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'finance.transaction_settled', 'financial_transaction', v_tx.id,
    jsonb_build_object(
      'settlement_amount_minor', p_settlement_amount_minor::text,
      'settlement_currency',     v_settlement_currency,
      'transaction_currency',    v_tx_currency,
      'fx_rate',                 v_fx_rate::text,
      'fx_source',               v_fx_source,
      'fx_observed_at',          v_fx_observed,
      'rate_id',                 v_rate_id,
      'derived_rate',            v_derived,
      'previous_status',         v_prev_status,
      'previous_settlement_amount_minor', v_prev_amount::text,
      'previous_settlement_currency',     v_prev_currency,
      -- A provider restates. Re-recording is allowed, so the earlier figure is
      -- kept in the audit trail rather than being overwritten silently.
      'restated',                v_prev_amount is not null
    ));

  return jsonb_build_object(
    'id',                    v_tx.id,
    'status',                'settled',
    'settlementAmountMinor', p_settlement_amount_minor::text,
    'settlementCurrency',    v_settlement_currency,
    'transactionAmountMinor', v_tx.amount_minor::text,
    'transactionCurrency',   v_tx_currency,
    'fxRate',                v_fx_rate::text,
    'fxSource',              v_fx_source,
    'fxObservedAt',          v_fx_observed,
    'rateId',                v_rate_id,
    'derived',               v_derived,
    'restated',              v_prev_amount is not null
  );
end;
$$;

revoke all on function public.record_transaction_settlement(uuid, bigint, char, uuid) from public;
grant execute on function public.record_transaction_settlement(uuid, bigint, char, uuid) to authenticated;

comment on function public.record_transaction_settlement(uuid, bigint, char, uuid) is
  'Records what actually landed for a transaction, stamping the recorded rate it used. Refuses a cross-currency settlement when no rate exists.';

-- ---------------------------------------------------------------------------
-- 5. The report
-- ---------------------------------------------------------------------------

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
    'note', 'Gross figures grouped by type and direction. Nothing here nets a refund against a capture or deducts a provider fee: what nets against what is recorded as an open decision rather than assumed by this query.'
  );
end;
$$;

revoke all on function public.report_money_in_reporting_currency(timestamptz, timestamptz) from public;
grant execute on function public.report_money_in_reporting_currency(timestamptz, timestamptz) to authenticated;

comment on function public.report_money_in_reporting_currency(timestamptz, timestamptz) is
  'Money that moved in a window, converted to finance.reporting_currency, with the rate used beside every figure and a separate list of what could not be converted.';
