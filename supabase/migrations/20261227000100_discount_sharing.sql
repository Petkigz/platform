-- ---------------------------------------------------------------------------
-- A discount is shared at the revenue-share rate (decided 2026-10-22).
--
-- `accrue_instructor_earnings()` computed a teacher's gross as the sum of the
-- order's lines for their courses — the subtotal. `add_order_adjustment()` can
-- credit an order down before it is paid, so a 10 000 UGX discount came entirely
-- out of the platform's margin while the teacher still earned a share of the
-- pre-discount price. At the extreme — a discount that takes the order to
-- nothing — it accrued more than the order collected.
--
-- The decision: the discount is split at the revenue-share rate. At 50%, a
-- 10 000 discount costs the teacher 5 000 and the platform 5 000.
--
--   gross  = line total - the teacher's share of the order's live credits
--   net    = round(gross * share / 100)          (unchanged in form)
--
-- which is exactly "the teacher's share of the discounted line total", so a 50%
-- share means each side loses half the discount:
--
--   subtotal 50 000, discount 10 000, fee 1 250, share 50%
--   capture            41 250
--   gross              40 000        (was 50 000)
--   net                20 000        (was 25 000; the platform keeps 21 250)
--
-- Only credits are shared. A fee is the platform's cost and stays the platform's;
-- tax is remitted and is nobody's revenue; a rounding credit is shared like any
-- other credit, because it reduces what was collected.
--
-- NOT changed here: a fee is still not in the teacher's gross at all. That is
-- the same decision seen from the other side and needs no arithmetic.
--
-- WHY A COLUMN RATHER THAN A FORMULA IN A COMMENT. `shared_discount_minor`
-- records what the split cost this teacher, so a row still explains itself a year
-- later: gross + shared = the teacher's lines, and a teacher asking why their
-- gross is 40 000 on a course that sells for 50 000 can be shown the answer
-- instead of told one. Existing rows default to 0, which is accurate for every
-- one of them: nothing could credit an order before 20261225000100.
-- ---------------------------------------------------------------------------

alter table public.instructor_earnings_entries
  add column if not exists shared_discount_minor bigint not null default 0
    check (shared_discount_minor >= 0);

comment on column public.instructor_earnings_entries.shared_discount_minor is
  'How much of an order-level discount this teacher bore. gross_amount_minor is the line total less this. Shared at the revenue-share rate: at 50%, a 10 000 discount costs the teacher 5 000 and the platform 5 000.';

comment on column public.instructor_earnings_entries.gross_amount_minor is
  'What the platform recorded as revenue for this sale after the teacher''s share of any order-level discount. Not the sticker price unless the order had no credits.';

create or replace function public.accrue_instructor_earnings(
  p_order_id       uuid,
  p_transaction_id uuid,
  p_actor_id       uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_share       integer;
  v_currency    char(3);
  v_billing_account_id uuid;
  v_order_status  text;
  v_credits     bigint := 0;
  v_accrued     integer := 0;
  v_row         record;
begin
  select currency_code, billing_account_id, status
    into v_currency, v_billing_account_id, v_order_status
    from public.orders where id = p_order_id;

  if not found then
    raise exception 'order % not found', p_order_id
      using errcode = 'no_data_found';
  end if;

  -- Guard: earnings only exist for money actually received. Without this a
  -- caller could accrue against an unpaid or already-refunded order.
  if v_order_status <> 'paid' then
    raise exception
      'earnings can only accrue against a paid order; this one is %', v_order_status
      using errcode = 'invalid_parameter_value';
  end if;

  v_share := public.setting_int('teaching.revenue_share_percent', 0);

  if v_share < 0 or v_share > 100 then
    raise exception
      'teaching.revenue_share_percent must be between 0 and 100, got %', v_share
      using errcode = 'check_violation';
  end if;

  -- What the order was credited down by, read from the adjustment rows rather
  -- than from `orders.discount_minor`: the rows are what the column is derived
  -- from, and a voided credit is not a discount anybody bore.
  select coalesce(sum(oa.amount_minor), 0)::bigint
    into v_credits
    from public.order_adjustments oa
   where oa.order_id = p_order_id
     and oa.direction = 'credit'
     and oa.voided_at is null;

  -- One entry per teacher per order. An order can span several teachers, so the
  -- grain is the instructor, and the amount is the sum of the lines whose
  -- product maps to one of their course versions.
  --
  -- The credits are apportioned across the teachers who will actually earn from
  -- this order, in proportion to their lines: an integer base share, and the few
  -- units that integer division leaves over go to the largest remainders. That
  -- makes sum(shared) = credits exactly, so no minor unit evaporates and no
  -- teacher is charged for a line they are not paid for.
  for v_row in
    with earnable as (
      select c.created_by as instructor_user_id,
             sum(oi.line_total_minor)::bigint as line_total
        from public.order_items oi
        join public.product_course_versions pcv on pcv.product_id = oi.product_id
        join public.courses c                    on c.id = pcv.course_id
       where oi.order_id = p_order_id
         and oi.product_id is not null
         and c.created_by is not null
         -- A teacher buying their own course earns nothing from themselves.
         -- The buyer is a member of the billing account that paid, NOT
         -- orders.payment_confirmed_by: that column holds whoever confirmed the
         -- payment, which is a privileged admin or a webhook actor.
         and not exists (
               select 1
                 from public.billing_account_memberships bam
                where bam.billing_account_id = v_billing_account_id
                  and bam.user_id = c.created_by
                  and bam.status = 'active'
             )
       group by c.created_by
    ),
    apportioned as (
      select instructor_user_id,
             line_total,
             floor((v_credits::numeric * line_total)
                     / nullif(sum(line_total) over (), 0)) as base_exact
        from earnable
    ),
    ranked as (
      select instructor_user_id,
             line_total,
             coalesce(base_exact, 0)::bigint as base_credit,
             (v_credits::numeric * line_total
               - coalesce(base_exact, 0) * sum(line_total) over ()) as remainder,
             coalesce(sum(coalesce(base_exact, 0)) over (), 0) as base_total
        from apportioned
    ),
    allocated as (
      select instructor_user_id,
             line_total,
             base_credit + case
               when row_number() over (
                      order by remainder desc, line_total desc, instructor_user_id)::bigint
                    <= v_credits - base_total
                 then 1 else 0 end AS credit
        from ranked
    )
    select instructor_user_id,
           -- Never negative: a credit can only take a line to zero, and the
           -- writer already refuses an order whose total would go below it. The
           -- clamp is here because a hand-repaired order could still arrive with
           -- more credits than earnable lines, and gross is checked >= 0.
           greatest(line_total - credit, 0)::bigint as gross_minor,
           -- What the row records as borne: what was actually taken off this
           -- teacher's lines, not the notional apportionment.
           greatest(least(credit, line_total), 0)::bigint as shared_minor
      from allocated
  loop
    insert into public.instructor_earnings_entries
      (instructor_user_id, order_id, financial_transaction_id,
       gross_amount_minor, shared_discount_minor, currency_code,
       revenue_share_percent, net_amount_minor, status, accrued_at)
    values
      (v_row.instructor_user_id, p_order_id, p_transaction_id,
       v_row.gross_minor, v_row.shared_minor, v_currency, v_share,
       -- Computed with the same expression the iee_split_agrees CHECK uses, so
       -- the row cannot disagree with its own constraint.
       round((v_row.gross_minor::numeric * v_share) / 100.0)::bigint,
       'accrued', now())
    on conflict do nothing;

    if found then
      v_accrued := v_accrued + 1;
    end if;
  end loop;

  if v_share = 0 then
    -- Visible rather than silent. A 0% share means the platform keeps
    -- everything, which is a legitimate configuration but one a reader of the
    -- ledger should be able to see was deliberate and not a missing setting.
    insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
    values (p_actor_id, 'earnings.accrued_at_zero_share', 'order', p_order_id,
            jsonb_build_object('entries', v_accrued,
                               'note', 'teaching.revenue_share_percent is 0; nothing accrues to teachers'));
  end if;

  return v_accrued;
end;
$$;

revoke all on function public.accrue_instructor_earnings(uuid, uuid, uuid) from public;
-- Deliberately still NOT granted to authenticated, for the reason recorded in
-- 20261102000100: the body trusts its arguments, so a signed-in caller could
-- credit themselves. Both callers are SECURITY DEFINER and owned by postgres.
