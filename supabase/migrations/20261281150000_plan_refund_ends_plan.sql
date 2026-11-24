-- A plan refunded in full ends when the money is returned.
--
-- The owner decided on 2026-11-24 that a buyer in the European Union, the
-- rest of the European Economic Area or the United Kingdom who pays for a
-- plan is given the money back if they ask within fourteen days.
--
-- The asking was already possible. A plan is paid for through an order like
-- any other, and order_withdrawal_window() gives an order from one of those
-- countries fourteen days unless its buyer waived them. A plan's buyer is
-- never asked to (the owner's answer of 2026-11-23), so nothing is waived and
-- the fourteen days stand; a buyer whose country nobody recorded keeps them
-- too. Everywhere else the platform's own window applies, as it does to a
-- course.
--
-- The ending was not. A refund paid back in full calls
-- revoke_entitlements_for_refund(), which takes back what the order's
-- *purchase* opened: grants whose source is the order. A plan's grants have a
-- different source, the subscription the order started, so a plan refunded
-- in full kept running to the end of its period. Money and plan were both
-- gone from the platform's side, and the page that says "access stays open
-- until a refund is actually paid back" was telling half the truth.
--
-- This migration replaces that one function. What it did for a course it
-- still does, word for word. For each plan the order started it now also:
--
--   * takes back every grant the plan gave, to every learner on it, with the
--     same written reason and the same actor (the existing trigger on
--     entitlement_grants writes the history row);
--   * releases every place on it;
--   * ends the plan now: `cancelled`, with the paid period closed at this
--     moment, so that no page says it runs on and the account may buy the
--     plan again.
--
-- What does not change:
--   * A partial refund ends nothing. record_refund_in_ledger() calls this
--     function only when nothing is left to give back, and that function is
--     not touched.
--   * An enrolment made under a plan is left as it is, as it is when a plan's
--     period ends on its own day. A refunded plan ends as a plan ends: the
--     learner can no longer open what it opened, and nothing they did is
--     rewritten. (A refunded *course* still withdraws its enrolment, as
--     before.)
--   * Who may call it: nobody. It runs inside the trigger that settles a
--     refund. The grant taken from `authenticated` on 2026-11-02 stays taken.
--   * The number it returns is still the number of grants taken back, which
--     the caller writes to the audit trail.
--
-- A plan somebody had already cancelled keeps the reason they wrote; only its
-- period is closed. PostgreSQL cannot wrap the function it replaces, so the
-- whole body is reproduced from 20261031000100_refund_revokes_access.sql.

create or replace function public.revoke_entitlements_for_refund(
  p_order_id uuid,
  p_actor_id uuid,
  p_reason   text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_grant record;
  v_sub   record;
  v_count integer := 0;
  v_n     integer;
begin
  if coalesce(trim(p_reason), '') = '' then
    raise exception
      'revoking an entitlement needs a written reason'
      using errcode = 'check_violation';
  end if;

  -- What the order bought outright: a course. Unchanged.
  for v_grant in
    select id, learner_profile_id, course_version_id, status
      from public.entitlement_grants
     where source_type = 'purchase'
       and source_id   = p_order_id
       and status in ('active', 'suspended')
  loop
    update public.entitlement_grants
       set status            = 'revoked',
           revoked_at        = now(),
           revoked_by        = p_actor_id,
           revocation_reason = p_reason
     where id = v_grant.id;

    -- No explicit entitlement_events row here. The
    -- entitlement_grants_record_event trigger already writes one on any status
    -- change, taking the reason and actor from the columns set above.

    v_count := v_count + 1;

    -- Withdraw the enrolment only when nothing else still entitles this learner
    -- to the same version.
    if v_grant.course_version_id is not null
       and not exists (
             select 1
               from public.entitlement_grants other
              where other.learner_profile_id  = v_grant.learner_profile_id
                and other.course_version_id   = v_grant.course_version_id
                and other.status              = 'active'
                and other.id                 <> v_grant.id
           )
    then
      update public.course_enrolments
         set status = 'withdrawn'
       where learner_profile_id = v_grant.learner_profile_id
         and course_version_id  = v_grant.course_version_id
         and status in ('active', 'completed');
    end if;
  end loop;

  -- What the order started: a plan. One order starts one plan today; the loop
  -- is here so that an order with two would end both.
  for v_sub in
    select s.id, s.status, s.current_period_start, s.current_period_end
      from public.subscriptions s
      join public.order_items oi on oi.id = s.origin_order_item_id
     where oi.order_id = p_order_id
       and oi.plan_version_id is not null
     order by s.id
       for update of s
  loop
    update public.entitlement_grants
       set status            = 'revoked',
           revoked_at        = now(),
           revoked_by        = p_actor_id,
           revocation_reason = p_reason
     where source_type = 'subscription'
       and source_id   = v_sub.id
       and status in ('active', 'suspended');
    get diagnostics v_n = row_count;
    v_count := v_count + v_n;

    update public.family_plan_allocations
       set status          = 'released',
           effective_until = now()
     where subscription_id = v_sub.id
       and status = 'active';

    -- The paid period is closed at this moment, never before it began: a
    -- period that ends before it starts is refused by the table.
    perform set_config('app.subscription_writer', 'on', true);
    update public.subscriptions
       set status             = 'cancelled',
           cancelled_at       = coalesce(cancelled_at, now()),
           cancel_reason      = case when status = 'cancelled' then cancel_reason else p_reason end,
           current_period_end = case
             when current_period_end is null then null
             else least(current_period_end,
                        greatest(now(), coalesce(current_period_start, now())))
           end
     where id = v_sub.id;

    insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
    values (
      p_actor_id,
      'subscription.ended_on_refund',
      'subscription',
      v_sub.id,
      jsonb_build_object(
        'order_id',       p_order_id,
        'grants_revoked', v_n,
        'was',            v_sub.status,
        'paid_until_was', v_sub.current_period_end)
    );
  end loop;

  return v_count;
end;
$$;

revoke execute on function public.revoke_entitlements_for_refund(uuid, uuid, text)
  from public, anon, authenticated;

comment on function public.revoke_entitlements_for_refund(uuid, uuid, text) is
  'Take back what an order paid for once it has been refunded in full: the course grants the purchase gave (withdrawing the enrolment unless another grant still covers it), and every plan the order started, which ends now with its grants taken back and its places released. Leaves anything held through another route intact. Called only by the trigger that settles a refund.';
