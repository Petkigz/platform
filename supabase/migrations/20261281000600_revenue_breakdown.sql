-- What sold, not just what came in.
--
-- WHAT WAS MISSING
-- ----------------
-- Screen 40 was recorded as BLOCKED on `delivery.analytics`, and that was the
-- wrong flag. `delivery.analytics` governs *learner behaviour* — events,
-- retention, privacy review of what a person did. Revenue is a different fact and
-- it is already recorded: every paid order, every line, every discount, every
-- refund, and a revenue-share accrual per teacher per sale.
--
-- What did not exist was a way to ask **which course sells, and which teacher
-- earns**, over a period. `/admin/money-report` answers "what came in", converted
-- and by direction — a different question, and deliberately not decomposed, because
-- it is about the total. `/teach/earnings` answers "what have I earned", for one
-- teacher. Nobody could answer "which of the ninety courses actually sells".
--
-- WHAT THIS DECIDES
-- -----------------
--   * **Paid money only.** `orders.paid_at` is not null. An unpaid order is not
--     revenue and a cancelled one never was.
--   * **Refunds are shown, not netted silently.** Gross, refunded and net are
--     three columns. A single net figure would hide a course that sold well and
--     refunded badly — which is the most useful thing this report can tell
--     somebody.
--   * **A plan is not a course.** An order line is either a product (a course or
--     bundle) or a plan version. They are reported in separate sections, because
--     adding a subscription to a course sale and dividing by nothing produces a
--     number about neither.
--   * **Currencies are never added together.** Every group is per currency. The
--     same course can sell in shillings and dollars, and a total across them would
--     be an exchange rate nobody recorded. Converting is the money report's job, at
--     a rate the owner entered.
--   * **The audit trail.** Course revenue can only be reported when the course it
--     came from can be named; a sale whose product maps to several courses is
--     listed under the product rather than guessed at one of them.
--
-- Gated on `finance_admin` or `platform_admin`, the same pair every money screen
-- uses. This is not a teacher's view of their own work — that is `/teach/earnings`
-- — and a teacher must not be able to read the platform's whole book.

create or replace function public.revenue_breakdown(
  p_from timestamptz,
  p_to   timestamptz
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor   uuid := public.current_user_id();
  v_gross   jsonb := '[]'::jsonb;
  v_lines   jsonb := '[]'::jsonb;
  v_course  jsonb := '[]'::jsonb;
  v_plan    jsonb := '[]'::jsonb;
  v_teacher jsonb := '[]'::jsonb;
  v_refunded jsonb := '[]'::jsonb;
  v_orders  integer := 0;
  v_people  integer := 0;
begin
  if v_actor is null then
    raise exception 'sign in to read revenue'
      using errcode = 'insufficient_privilege';
  end if;
  if not (public.has_role(v_actor, 'platform_admin')
          or public.has_role(v_actor, 'finance_admin')) then
    raise exception 'only a finance admin or platform admin may read revenue analytics'
      using errcode = 'insufficient_privilege';
  end if;

  if p_from is null or p_to is null then
    raise exception 'a revenue window needs both a start and an end'
      using errcode = 'invalid_parameter_value';
  end if;
  if p_from > p_to then
    raise exception 'the window starts after it ends'
      using errcode = 'invalid_parameter_value';
  end if;

  -- -------------------------------------------------------------------------
  -- The orders that count
  -- -------------------------------------------------------------------------
  -- `paid_at` in the window, and a status that still represents money held or
  -- money returned. A `cancelled` order never took anything; `refunded` did and
  -- gave it back, which is why it stays in and its reversal is counted.
  select count(*)::int,
         count(distinct o.billing_account_id)::int
    into v_orders, v_people
    from public.orders o
   where o.paid_at is not null
     and o.paid_at >= p_from
     and o.paid_at <= p_to
     and o.status in ('paid', 'partially_refunded', 'refunded');

  -- Per currency: what was charged, what was discounted, what came back.
  select coalesce(jsonb_agg(row order by gross desc), '[]'::jsonb)
    into v_gross
    from (
      select jsonb_build_object(
               'currency',     o.currency_code,
               'orders',       count(*)::int,
               'grossMinor',   sum(o.total_minor)::text,
               'discountMinor', sum(o.discount_minor)::text,
               'refundedMinor', coalesce(sum(r.refunded), 0)::text,
               'netMinor',     (sum(o.total_minor) - coalesce(sum(r.refunded), 0))::text
             ) as row,
             sum(o.total_minor) as gross
        from public.orders o
        left join lateral (
          select sum(rt.amount_minor) as refunded
            from public.refund_transactions rt
           where rt.order_id = o.id
             and rt.status = 'completed'
        ) r on true
       where o.paid_at is not null
         and o.paid_at >= p_from
         and o.paid_at <= p_to
         and o.status in ('paid', 'partially_refunded', 'refunded')
       group by o.currency_code
    ) t;

  -- -------------------------------------------------------------------------
  -- By course
  -- -------------------------------------------------------------------------
  -- A line's product maps to a course through `product_course_versions`. A
  -- product that maps to more than one course is grouped under the product,
  -- because picking one of them would be inventing an attribution.
  select coalesce(jsonb_agg(row order by net_minor desc), '[]'::jsonb)
    into v_course
    from (
      select jsonb_build_object(
               'courseId',   c.id,
               'courseSlug', c.slug,
               'courseTitle', c.title,
               'currency',   oi.currency_code,
               'sales',      count(*)::int,
               'grossMinor', sum(oi.line_total_minor)::text,
               'discountMinor', sum(oi.discount_minor)::text,
               'refundedMinor', coalesce(sum(refunded.amount), 0)::text,
               'netMinor',   (sum(oi.line_total_minor) - coalesce(sum(refunded.amount), 0))::text
             ) as row,
             (sum(oi.line_total_minor) - coalesce(sum(refunded.amount), 0)) as net_minor
        from public.order_items oi
        join public.orders o on o.id = oi.order_id
        join public.products p on p.id = oi.product_id
        join lateral (
          -- min() has no uuid overload, so the id is taken by ordering rather
          -- than by an aggregate. `n = 1` is what makes using it safe: the
          -- course is only named when there is exactly one to name.
          select (select pcv.course_id from public.product_course_versions pcv
                   where pcv.product_id = p.id
                   order by pcv.course_id limit 1)         as course_id,
                 (select count(distinct pcv.course_id)::int
                    from public.product_course_versions pcv
                   where pcv.product_id = p.id)            as n
        ) link on true
        left join public.courses c on c.id = link.course_id and link.n = 1
        left join lateral (
          -- A refund is against the order, not the line. It is attributed to the
          -- line in proportion to what the line was worth, which is the only
          -- split the data can justify. A refunded order worth nothing is not a
          -- division anyone has to do.
          --
          -- The order's refunds are summed BEFORE this split, never joined raw:
          -- joining the transactions one row each would repeat every line for
          -- every refund and inflate the gross it is being compared against. The
          -- rounding is per line, so a three-line order can drift by a minor
          -- unit or two across the split; the order-level figure in `byCurrency`
          -- is the one that ties out exactly.
          select case when o.total_minor > 0
                      then round(coalesce((
                             select sum(rt.amount_minor)
                               from public.refund_transactions rt
                              where rt.order_id = o.id
                                and rt.status = 'completed'
                           ), 0) * oi.line_total_minor::numeric / o.total_minor)
                      else 0 end as amount
        ) refunded on true
       where o.paid_at is not null
         and o.paid_at >= p_from
         and o.paid_at <= p_to
         and o.status in ('paid', 'partially_refunded', 'refunded')
         and oi.product_id is not null
       group by c.id, c.slug, c.title, p.id, p.name, oi.currency_code
    ) t;

  -- -------------------------------------------------------------------------
  -- By plan
  -- -------------------------------------------------------------------------
  select coalesce(jsonb_agg(row order by net_minor desc), '[]'::jsonb)
    into v_plan
    from (
      select jsonb_build_object(
               'planCode',  pl.code,
               'planName',  pl.name,
               'currency',  oi.currency_code,
               'sales',     count(*)::int,
               'grossMinor', sum(oi.line_total_minor)::text,
               'discountMinor', sum(oi.discount_minor)::text
             ) as row,
             sum(oi.line_total_minor) as net_minor
        from public.order_items oi
        join public.orders o on o.id = oi.order_id
        join public.plan_versions pv on pv.id = oi.plan_version_id
        join public.plans pl on pl.id = pv.plan_id
       where o.paid_at is not null
         and o.paid_at >= p_from
         and o.paid_at <= p_to
         and o.status in ('paid', 'partially_refunded', 'refunded')
       group by pl.code, pl.name, oi.currency_code
    ) t;

  -- -------------------------------------------------------------------------
  -- By teacher
  -- -------------------------------------------------------------------------
  -- Read from the accrual, not recomputed. `instructor_earnings_entries` is the
  -- platform's own record of what a sale was worth to a teacher, with the rate
  -- snapshotted on the day — recomputing it here at today's rate would be a
  -- second answer to a question that already has one, and the wrong one.
  --
  -- WHICH DATE PUTS AN ENTRY IN THE WINDOW. The sale's, not the row's. An entry
  -- carries `accrued_at`, which is when the platform wrote it down — and those
  -- two are the same only when nothing was ever backfilled or corrected. A June
  -- sale recorded in October belongs in June: the question this report answers is
  -- "what sold in this period", and a report that moved money between months
  -- because of when a job ran would be worse than no report. An entry with no
  -- order behind it (a clawback, a correction) has no sale date, so it falls back
  -- to `accrued_at` — the only date it has, and the honest one for it.
  select coalesce(jsonb_agg(row order by net_minor desc), '[]'::jsonb)
    into v_teacher
    from (
      select jsonb_build_object(
               'userId',      iee.instructor_user_id,
               'displayName', up.display_name,
               'currency',    iee.currency_code,
               'entries',     count(*)::int,
               'grossMinor',  sum(iee.gross_amount_minor)::text,
               'netMinor',    sum(case when iee.status = 'reversed' then 0
                                       else iee.net_amount_minor end)::text,
               'reversedMinor', sum(case when iee.status = 'reversed'
                                         then iee.net_amount_minor else 0 end)::text
             ) as row,
             sum(case when iee.status = 'reversed' then 0 else iee.net_amount_minor end) as net_minor
        from public.instructor_earnings_entries iee
        left join public.user_profiles up on up.user_id = iee.instructor_user_id
        left join public.orders o on o.id = iee.order_id
       where coalesce(o.paid_at, iee.accrued_at) >= p_from
         and coalesce(o.paid_at, iee.accrued_at) <= p_to
       group by iee.instructor_user_id, up.display_name, iee.currency_code
    ) t;

  -- -------------------------------------------------------------------------
  -- What was refunded, and to whom
  -- -------------------------------------------------------------------------
  -- Separate from the totals because a refund is a conversation somebody had,
  -- and the number of them is a fact about the platform that a net figure hides.
  select coalesce(jsonb_agg(row order by refunded_at desc), '[]'::jsonb)
    into v_refunded
    from (
      select jsonb_build_object(
               'orderId',    rt.order_id,
               'currency',   rt.currency_code,
               'amountMinor', rt.amount_minor::text,
               'refundedAt', to_char(rt.refunded_at, 'YYYY-MM-DD')
             ) as row,
             rt.refunded_at
        from public.refund_transactions rt
       where rt.status = 'completed'
         and rt.refunded_at >= p_from
         and rt.refunded_at <= p_to
       order by rt.refunded_at desc
       limit 50
    ) t;

  return jsonb_build_object(
    'from',      to_char(p_from, 'YYYY-MM-DD'),
    'to',        to_char(p_to, 'YYYY-MM-DD'),
    'orders',    v_orders,
    'households', v_people,
    'byCurrency', v_gross,
    'byCourse',   v_course,
    'byPlan',     v_plan,
    'byTeacher',  v_teacher,
    'refunds',    v_refunded
  );
end;
$$;

revoke all on function public.revenue_breakdown(timestamptz, timestamptz) from public, anon;
grant execute on function public.revenue_breakdown(timestamptz, timestamptz) to authenticated;

comment on function public.revenue_breakdown(timestamptz, timestamptz) is
  'Revenue over a window, split by currency, course, plan and teacher, with refunds shown rather than netted silently. Paid orders only. Currencies are never added together; converting is report_money_in_reporting_currency()''s job, at a recorded rate. finance_admin or platform_admin only.';
