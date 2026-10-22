-- ---------------------------------------------------------------------------
-- What the platform owes teachers, at this moment.
--
-- The earnings statement is one teacher's view and the money report is a
-- window of movement. Neither answers the question the owner actually carries:
-- *how much of the cash in the bank is not mine?*
--
-- That is a balance, not a flow, and it has three parts:
--
--   owed      accrued or payable, inside or outside the refund hold
--   asked    an open payout request against part of it
--   paid     already sent (kept, because "we have sent this much" is the other
--            half of the same story)
--
-- Currencies are not added together here either. A converted figure is offered
-- only when a rate is recorded for the pair, with the rate named, and the
-- currencies that could not be converted are listed rather than guessed at.
--
-- Finance/platform admin only: this is a position across every teacher.
-- ---------------------------------------------------------------------------

create or replace function public.platform_teacher_liability()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor     uuid := public.current_user_id();
  v_hold      integer;
  v_rows      jsonb := '[]'::jsonb;
  v_row       record;
  v_open      record;
  v_conv      jsonb;
  v_reporting text;
  v_total     bigint := 0;
  v_converted boolean := true;
  v_missing   jsonb := '[]'::jsonb;
  v_rates     jsonb := '[]'::jsonb;
  v_seen      text[] := '{}';
  v_currency  text;
begin
  if v_actor is null then
    raise exception 'sign in to read what the platform owes teachers'
      using errcode = 'insufficient_privilege';
  end if;
  if not (public.has_role(v_actor, 'finance_admin')
          or public.has_role(v_actor, 'platform_admin')) then
    raise exception 'only a finance admin or platform admin may read what the platform owes teachers'
      using errcode = 'insufficient_privilege';
  end if;

  v_hold := public.setting_int('teaching.payout_hold_days', 14);
  v_reporting := upper(btrim(coalesce(
    public.setting_text('finance.reporting_currency', 'USD'), 'USD')));

  for v_row in
    select e.currency_code::text as currency,
           coalesce(sum(e.net_amount_minor) filter (where e.status in ('accrued', 'payable')), 0)::bigint as owed,
           coalesce(sum(e.net_amount_minor)
             filter (where e.status in ('accrued', 'payable')
                       and e.accrued_at > now() - make_interval(days => v_hold)), 0)::bigint as in_hold,
           coalesce(sum(e.net_amount_minor) filter (where e.status = 'paid'), 0)::bigint as paid,
           coalesce(sum(e.net_amount_minor) filter (where e.status = 'reversed'), 0)::bigint as reversed,
           count(distinct e.instructor_user_id)
             filter (where e.status in ('accrued', 'payable')) as teachers
      from public.instructor_earnings_entries e
     group by e.currency_code
     order by e.currency_code
  loop
    -- Open requests are money already promised to somebody: the same earnings,
    -- seen from the other side, so they are reported beside the balance rather
    -- than added to it.
    select count(*)::int as n, coalesce(sum(p.amount_minor), 0)::bigint as amount
      into v_open
      from public.instructor_payouts p
     where upper(btrim(p.currency_code::text)) = v_row.currency
       and p.status in ('scheduled', 'processing');

    v_conv := public.to_reporting_currency(v_row.owed, v_row.currency::char(3), now());
    if v_conv is null then
      v_converted := false;
      if not (v_row.currency = any (v_seen)) then
        v_seen := v_seen || v_row.currency;
        v_missing := v_missing || to_jsonb(v_row.currency);
      end if;
    else
      v_total := v_total + (v_conv ->> 'amountMinor')::bigint;
      if not (v_row.currency = any (v_seen)) then
        v_seen := v_seen || v_row.currency;
        v_rates := v_rates || v_conv;
      end if;
    end if;

    v_rows := v_rows || jsonb_build_object(
      'currency',        v_row.currency,
      'owedMinor',       v_row.owed::text,
      'inHoldMinor',     v_row.in_hold::text,
      'payableNowMinor', (v_row.owed - v_row.in_hold)::text,
      'requestedMinor',  v_open.amount::text,
      'openRequests',    v_open.n,
      'paidMinor',       v_row.paid::text,
      'reversedMinor',   v_row.reversed::text,
      'teachers',        v_row.teachers,
      'reportingAmountMinor', case when v_conv is null then null
                                   else v_conv ->> 'amountMinor' end
    );
  end loop;

  return jsonb_build_object(
    'asOf',             now(),
    'holdDays',         v_hold,
    'payoutsEnabled',   public.setting_bool('teaching.payouts', false),
    'reportingCurrency', v_reporting,
    'byCurrency',       v_rows,
    'convertedTotalMinor', case when not v_converted then null else v_total::text end,
    'unconverted',      v_missing,
    'rates',            v_rates
  );
end;
$$;

revoke all on function public.platform_teacher_liability() from public;
grant execute on function public.platform_teacher_liability() to authenticated;

comment on function public.platform_teacher_liability() is
  'Finance/platform admin only. What is owed to teachers per currency today, split by refund hold and open requests, with a converted total only where a rate exists.';
