-- ---------------------------------------------------------------------------
-- What renews, when, and for how much — and why that is not a forecast.
--
-- A subscription pins the plan version it bought, and the price hangs off that
-- version. So the next charge for an existing subscriber is a fact that can be
-- read from the row rather than guessed from today's shelf price. This function
-- expands each live subscription forward by its own interval until the end of
-- the window and buckets the charges by month.
--
-- It is a PROJECTION OF COMMITTED TERMS, not of income. There is no renewal
-- engine: nothing here charges anybody, and with `commerce.checkout` off and no
-- merchant account nothing can. The screen says that above the numbers. The
-- figure answers "if every subscription renewed exactly as written, what would
-- be due and when", which is what a cash-flow plan needs and what a bank
-- question actually is.
--
-- Where a plan version carries several market prices, the default one (no
-- market) is used, because a subscription does not record which market it was
-- sold in. That limitation is named in the output rather than hidden in a
-- number that looks exact.
-- ---------------------------------------------------------------------------

create or replace function public.platform_renewal_projection(p_months integer default 6)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor     uuid := public.current_user_id();
  v_months    integer;
  v_from      timestamptz := date_trunc('month', now());
  v_to        timestamptz;
  v_reporting text;
  v_rows      jsonb := '[]'::jsonb;
  v_totals    jsonb := '[]'::jsonb;
  v_missing   jsonb := '[]'::jsonb;
  v_seen      text[] := '{}';
  v_month     record;
  v_cur       record;
  v_conv      jsonb;
  v_month_total bigint;
  v_month_ok  boolean;
  v_currencies jsonb;
  v_cur_total record;
begin
  if v_actor is null then
    raise exception 'sign in to read the renewal projection'
      using errcode = 'insufficient_privilege';
  end if;
  if not (public.has_role(v_actor, 'finance_admin')
          or public.has_role(v_actor, 'platform_admin')) then
    raise exception 'only a finance admin or platform admin may read the renewal projection'
      using errcode = 'insufficient_privilege';
  end if;
  if p_months is null or p_months < 1 or p_months > 24 then
    raise exception 'a renewal projection covers between 1 and 24 months'
      using errcode = 'invalid_parameter_value';
  end if;

  v_months := p_months;
  v_to := v_from + make_interval(months => v_months);
  v_reporting := upper(btrim(coalesce(
    public.setting_text('finance.reporting_currency', 'USD'), 'USD')));

  for v_month in
    with live as (
      select s.id,
             s.status,
             pv.billing_interval,
             s.current_period_end,
             (select pr.amount_minor from public.prices pr
               where pr.plan_version_id = s.plan_version_id
                 and pr.status = 'active'
               order by (pr.market is null) desc, pr.effective_from desc
               limit 1) as amount_minor,
             (select upper(btrim(pr.currency_code::text)) from public.prices pr
               where pr.plan_version_id = s.plan_version_id
                 and pr.status = 'active'
               order by (pr.market is null) desc, pr.effective_from desc
               limit 1) as currency
        from public.subscriptions s
        join public.plan_versions pv on pv.id = s.plan_version_id
       where s.status in ('active', 'trialing', 'past_due')
         and s.current_period_end is not null
         and s.current_period_end < v_to
         and pv.billing_interval <> 'one_time'
    ),
    charges as (
      select l.id, l.status, l.amount_minor, l.currency,
             g.charge_at
        from live l
        cross join lateral generate_series(
          l.current_period_end,
          v_to - interval '1 second',
          case l.billing_interval
            when 'week'    then interval '1 week'
            when 'month'   then interval '1 month'
            when 'quarter' then interval '3 months'
            when 'year'    then interval '1 year'
          end
        ) as g(charge_at)
       where l.amount_minor is not null
         and l.currency is not null
    )
    select date_trunc('month', c.charge_at) as month,
           count(*)::int as charge_count,
           count(*) filter (where c.status = 'past_due')::int as at_risk
      from charges c
     group by 1
     order by 1
  loop
    v_month_total := 0;
    v_month_ok := true;
    v_currencies := '[]'::jsonb;

    for v_cur in
      with live as (
        select s.id, s.status, pv.billing_interval, s.current_period_end,
               (select pr.amount_minor from public.prices pr
                 where pr.plan_version_id = s.plan_version_id and pr.status = 'active'
                 order by (pr.market is null) desc, pr.effective_from desc limit 1) as amount_minor,
               (select upper(btrim(pr.currency_code::text)) from public.prices pr
                 where pr.plan_version_id = s.plan_version_id and pr.status = 'active'
                 order by (pr.market is null) desc, pr.effective_from desc limit 1) as currency
          from public.subscriptions s
          join public.plan_versions pv on pv.id = s.plan_version_id
         where s.status in ('active', 'trialing', 'past_due')
           and s.current_period_end is not null
           and s.current_period_end < v_to
           and pv.billing_interval <> 'one_time'
      )
      select l.currency,
             sum(l.amount_minor)::bigint as amount_minor,
             count(*)::int as n
        from live l
        cross join lateral generate_series(
          l.current_period_end,
          v_to - interval '1 second',
          case l.billing_interval
            when 'week'    then interval '1 week'
            when 'month'   then interval '1 month'
            when 'quarter' then interval '3 months'
            when 'year'    then interval '1 year'
          end
        ) as g(charge_at)
       where l.amount_minor is not null
         and l.currency is not null
         and date_trunc('month', g.charge_at) = v_month.month
       group by l.currency
       order by l.currency
    loop
      v_conv := public.to_reporting_currency(v_cur.amount_minor, v_cur.currency::char(3), now());
      if v_conv is null then
        v_month_ok := false;
        if not (v_cur.currency = any (v_seen)) then
          v_seen := v_seen || v_cur.currency;
          v_missing := v_missing || to_jsonb(v_cur.currency);
        end if;
      else
        v_month_total := v_month_total + (v_conv ->> 'amountMinor')::bigint;
      end if;

      v_currencies := v_currencies || jsonb_build_object(
        'currency', v_cur.currency,
        'amountMinor', v_cur.amount_minor::text,
        'count', v_cur.n);
    end loop;

    v_rows := v_rows || jsonb_build_object(
      'month',       to_char(v_month.month, 'YYYY-MM'),
      'chargeCount', v_month.charge_count,
      'atRisk',      v_month.at_risk,
      'byCurrency',  v_currencies,
      'convertedMinor', case when v_month_ok then v_month_total::text else null end
    );
  end loop;

  -- The same window as one figure per currency, so a month is not the only way
  -- to read it.
  for v_cur_total in
    with live as (
      select s.id, pv.billing_interval, s.current_period_end,
             (select pr.amount_minor from public.prices pr
               where pr.plan_version_id = s.plan_version_id and pr.status = 'active'
               order by (pr.market is null) desc, pr.effective_from desc limit 1) as amount_minor,
             (select upper(btrim(pr.currency_code::text)) from public.prices pr
               where pr.plan_version_id = s.plan_version_id and pr.status = 'active'
               order by (pr.market is null) desc, pr.effective_from desc limit 1) as currency
        from public.subscriptions s
        join public.plan_versions pv on pv.id = s.plan_version_id
       where s.status in ('active', 'trialing', 'past_due')
         and s.current_period_end is not null
         and s.current_period_end < v_to
         and pv.billing_interval <> 'one_time'
    )
    select l.currency, sum(l.amount_minor)::bigint as amount_minor, count(*)::int as n
      from live l
      cross join lateral generate_series(
        l.current_period_end,
        v_to - interval '1 second',
        case l.billing_interval
          when 'week'    then interval '1 week'
          when 'month'   then interval '1 month'
          when 'quarter' then interval '3 months'
          when 'year'    then interval '1 year'
        end
      ) as g(charge_at)
     where l.amount_minor is not null and l.currency is not null
     group by l.currency
     order by l.currency
  loop
    v_totals := v_totals || jsonb_build_object(
      'currency', v_cur_total.currency,
      'amountMinor', v_cur_total.amount_minor::text,
      'count', v_cur_total.n);
  end loop;

  return jsonb_build_object(
    'months',        v_months,
    'from',          v_from,
    'to',            v_to,
    'reportingCurrency', v_reporting,
    'automaticRenewal',  false,
    'monthly',       v_rows,
    'totalByCurrency', v_totals,
    'unconverted',   v_missing
  );
end;
$$;

revoke all on function public.platform_renewal_projection(integer) from public;
grant execute on function public.platform_renewal_projection(integer) to authenticated;

comment on function public.platform_renewal_projection(integer) is
  'Finance/platform admin only. Expands each live subscription forward at its own interval and the price pinned to the version it bought, bucketed by month. A projection of committed terms, not of income: nothing here charges anybody.';
