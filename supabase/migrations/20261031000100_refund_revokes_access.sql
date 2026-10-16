-- =============================================================================
-- AyāhSpring — a settled refund takes the course back
--
-- The revocation machinery has been in the schema since Group 4 and nothing ever
-- used it: entitlement_grants has status 'revoked', revoked_at, revoked_by and
-- revocation_reason; entitlement_events has a 'revoked' event type; and
-- eg_revocation_agrees requires both a timestamp and a written reason. Grepping
-- the whole schema for a write of 'revoked' to entitlement_grants returned
-- nothing. So a customer could be refunded in full and keep the course forever.
--
-- That is the same defect as the other eight: machinery correct, nothing
-- connected. This connects it.
--
-- WHAT THE RULE IS
--
--   A FULL refund revokes access. A PARTIAL one does not.
--
-- The partial case is a deliberate decision rather than an oversight, and it is
-- worth stating because the terse version of the rule ("a refund revokes
-- access") does not cover it. Someone who paid 40,000 and had 15,000 returned
-- because a lesson was missing has still paid 25,000 for a course. Taking the
-- whole course back would be taking money and goods both. So revocation is tied
-- to the order reaching 'refunded' — nothing left to give back — not to a refund
-- having happened.
--
-- WHAT IS *NOT* TOUCHED
--
-- Certificates and lesson progress are left alone. D7 is explicit that
-- certificate and grading history is never deleted, and a refund is a money
-- event, not an assertion that the learning did not happen. Revoking
-- entitlement stops access; it does not rewrite what the learner did while they
-- had it.
--
-- WHY REVOCATION IS PER-GRANT AND NOT PER-COURSE
--
-- A learner may be entitled to the same course version through another route at
-- the same time — a family entitlement, a scholarship, an admin grant. Only the
-- grant this order paid for is revoked. If another active grant covers the same
-- version, access continues and the enrolment is left alone, because
-- can_access_lesson() consults entitlement_grants generally and would rightly
-- still say yes.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Revoke what an order paid for
-- -----------------------------------------------------------------------------

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
  v_count integer := 0;
begin
  if coalesce(trim(p_reason), '') = '' then
    raise exception
      'revoking an entitlement needs a written reason'
      using errcode = 'check_violation';
  end if;

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
    -- change, taking the reason and actor from the columns set above. Inserting
    -- a second row would put two revocations in the history for one refund,
    -- which reads as a double-revocation in an audit and is exactly the kind of
    -- thing that makes a history untrustworthy.

    v_count := v_count + 1;

    -- Withdraw the enrolment only when nothing else still entitles this learner
    -- to the same version. Otherwise the course would vanish from their
    -- learning list even though they are entitled to it another way, and the
    -- learner would be locked out of something they have a right to open.
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

  return v_count;
end;
$$;

revoke execute on function public.revoke_entitlements_for_refund(uuid, uuid, text) from public;
grant execute on function public.revoke_entitlements_for_refund(uuid, uuid, text) to authenticated;

comment on function public.revoke_entitlements_for_refund(uuid, uuid, text) is
  'Revoke the entitlements an order paid for, and withdraw the enrolments they carried. Leaves any entitlement held through another route intact.';

-- -----------------------------------------------------------------------------
-- 2. A full refund triggers it
--
-- Done here rather than in complete_refund() so that the revocation cannot be
-- forgotten by a second caller. Anything that settles a refund goes through
-- record_refund_in_ledger(), which is the same trigger that writes the ledger
-- entry and updates the order status. All three move together or none do: a
-- refund that reaches the ledger without taking access back is money and goods
-- both gone from the platform's side.
-- -----------------------------------------------------------------------------

create or replace function public.record_refund_in_ledger()
returns trigger
language plpgsql
as $$
declare
  v_ledger  uuid;
  v_before  text;
  v_after   text;
  v_revoked integer;
begin
  if new.status = 'completed' and old.status is distinct from 'completed' then
    insert into public.financial_transactions
      (order_id, billing_account_id, transaction_type, direction,
       amount_minor, currency_code, provider, provider_reference, status, occurred_at)
    select new.order_id, o.billing_account_id, 'refund', 'debit',
           new.amount_minor, new.currency_code, new.provider, new.provider_reference,
           'settled', coalesce(new.refunded_at, now())
      from public.orders o where o.id = new.order_id
    returning id into v_ledger;

    if new.refund_request_id is not null and v_ledger is not null then
      update public.refund_requests
         set financial_transaction_id = v_ledger
       where id = new.refund_request_id
         and financial_transaction_id is null;
    end if;

    -- Fully refunded only when nothing is left to give back.
    select status into v_before from public.orders where id = new.order_id;

    update public.orders o
       set status = case
             when public.refundable_amount(o.id) <= 0 then 'refunded'
             else 'partially_refunded'
           end
     where o.id = new.order_id
       and o.status in ('paid', 'partially_refunded');

    select status into v_after from public.orders where id = new.order_id;

    -- The access decision follows the money. A full refund takes the course
    -- back; a partial one does not, because the learner has still paid for
    -- what remains.
    if v_after = 'refunded' and v_before is distinct from 'refunded' then
      v_revoked := public.revoke_entitlements_for_refund(
        new.order_id,
        new.processed_by,
        'Refunded in full; access withdrawn.'
      );

      insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
      values (
        new.processed_by,
        'entitlement.revoked_on_refund',
        'order',
        new.order_id,
        jsonb_build_object('grants_revoked', v_revoked)
      );
    end if;
  end if;

  if new.status <> 'completed' and old.status = 'completed' then
    raise exception
      'a completed refund cannot be un-completed; record a reversal instead'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

comment on function public.record_refund_in_ledger() is
  'A completed refund reaches the ledger, is linked to its request, updates the order, and — on a full refund — revokes the access the order paid for.';
