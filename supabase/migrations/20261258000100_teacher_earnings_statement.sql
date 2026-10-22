-- What a teacher has earned, in the only place they could not see it.
--
-- The platform has accrued a revenue share per sale since 2026-11-02:
-- `accrue_instructor_earnings()` writes a row per order with the split
-- snapshotted, `reverse_earnings_for_refund()` reverses one when the sale is
-- refunded, and `record_earnings_clawback()` carries a correction. Nothing in
-- the web layer ever read the table — `grep instructor_earnings_entries
-- web/src` returned nothing before this migration — so a teacher could not see
-- a single figure about their own work. That is the gap, and it is a statement,
-- not a payout.
--
-- WHAT THIS MUST NOT CLAIM
-- ------------------------
-- `teaching.payouts` is CODE-gated and ships off. No money has ever left this
-- platform: there are three payout tables with no writer, no provider and no
-- destination. A statement that said "your balance: 250,000 UGX" without that
-- sentence would be the most damaging lie the product could tell — so the
-- function returns `payoutsEnabled` and the screen says it in words, above the
-- numbers rather than below them.
--
-- `owedMinor` is therefore named for what it is: what the platform has recorded
-- as earned and has not reversed, per currency, **not** a balance anybody can
-- withdraw. Multi-currency is deliberate: the same teacher can be owed shillings
-- from one market and dollars from another, and adding those into one number
-- would be inventing an exchange rate. Netting them is the money-report's job,
-- with a recorded rate, not this screen's.

create or replace function public.my_earnings(p_limit integer default 50)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor   uuid := public.current_user_id();
  v_limit   integer := coalesce(p_limit, 50);
  v_entries jsonb;
  v_totals  jsonb;
  v_paid    bigint := 0;
begin
  if v_actor is null then
    raise exception 'sign in to read your earnings'
      using errcode = 'insufficient_privilege';
  end if;
  if v_limit < 1 or v_limit > 500 then
    raise exception 'ask for between 1 and 500 entries'
      using errcode = 'invalid_parameter_value';
  end if;

  -- Per currency, because a balance is a number *in something*.
  select coalesce(jsonb_agg(jsonb_build_object(
           'currency', t.currency_code,
           'entries', t.entries,
           'owedMinor', t.owed::text,
           'grossMinor', t.gross::text,
           'paidMinor', t.paid::text,
           'reversedMinor', t.reversed::text)
           order by t.currency_code), '[]'::jsonb),
         coalesce(sum(t.paid), 0)
    into v_totals, v_paid
    from (
      select e.currency_code,
             count(*) filter (where e.status <> 'reversed') as entries,
             coalesce(sum(e.net_amount_minor) filter (where e.status in ('accrued','payable')), 0) as owed,
             coalesce(sum(e.gross_amount_minor) filter (where e.status <> 'reversed'), 0) as gross,
             coalesce(sum(e.net_amount_minor) filter (where e.status = 'paid'), 0) as paid,
             coalesce(sum(e.net_amount_minor) filter (where e.status = 'reversed'), 0) as reversed
        from public.instructor_earnings_entries e
       where e.instructor_user_id = v_actor
       group by e.currency_code
    ) t;

  -- The latest entries, with the course the sale was for where one can be
  -- named. The title comes from the product on the order item, filtered to a
  -- course this teacher wrote — a sale that somehow names no course of theirs
  -- shows no title rather than somebody else's.
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', e.id,
           'accruedAt', e.accrued_at,
           'currency', e.currency_code,
           'grossMinor', e.gross_amount_minor::text,
           'sharePercent', e.revenue_share_percent,
           'netMinor', e.net_amount_minor::text,
           'status', e.status,
           'orderId', e.order_id,
           'courseTitle', (
             select c.title
               from public.order_items oi
               join public.product_course_versions pcv on pcv.product_id = oi.product_id
               join public.courses c on c.id = pcv.course_id
              where oi.order_id = e.order_id
                and c.created_by = v_actor
              limit 1))
           order by e.accrued_at desc, e.id), '[]'::jsonb)
    into v_entries
    from (
      select * from public.instructor_earnings_entries
       where instructor_user_id = v_actor
       order by accrued_at desc, id
       limit v_limit
    ) e;

  return jsonb_build_object(
    'payoutsEnabled', public.setting_bool('teaching.payouts', false),
    'sharePercent', public.setting_int('teaching.revenue_share_percent', 50),
    'byCurrency', v_totals,
    'entries', v_entries,
    -- Said as a fact by the function that knows it, rather than inferred by a
    -- screen from an empty list.
    'nothingPaidYet', v_paid = 0);
end;
$$;

revoke all on function public.my_earnings(integer) from public, anon;
grant execute on function public.my_earnings(integer) to authenticated;

comment on function public.my_earnings(integer) is
  'The caller''s own earnings, per currency, with the entries behind them and '
  'whether payouts are switched on at all. `owedMinor` is recorded earnings that '
  'have not been reversed — not a withdrawable balance. Currencies are never '
  'summed together: netting across currencies needs a recorded rate and belongs '
  'to the money report.';
