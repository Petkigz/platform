-- ---------------------------------------------------------------------------
-- A payment confirmed by a provider webhook is not confirmed by a person.
--
-- orders_paid_has_evidence required both a named confirmer and written evidence
-- for any paid order:
--
--     check (
--       status not in ('paid','partially_refunded','refunded')
--       or (payment_confirmed_by is not null and payment_evidence is not null)
--     )
--
-- That is right for a manual confirmation: a human in support saw a bank
-- statement and typed something down, and both facts should be recoverable. It
-- is wrong for the webhook path, which is the path that matters in production.
-- A provider callback has no human behind it, and measured rather than assumed:
--
--     NULL actor, verified event -> REFUSED: new row for relation "orders"
--                                   violates check constraint
--                                   "orders_paid_has_evidence"
--     real actor, verified event -> status=paid, evidence=mtn_momo:ref-2
--
-- And there is no system actor to pass instead. user_profiles.user_id is a
-- foreign key into auth.users, so a "platform" confirmer would have to be a
-- real, sign-in-able account — a hack that puts a synthetic identity in the
-- table every other identity check reads.
--
-- Attributing it to the payer is worse than the hack. "Who confirmed this
-- payment?" would answer "the person who paid it", which is precisely the
-- self-approval this schema forbids elsewhere: a refund requester cannot
-- approve their own refund. Writing that into a governance field to satisfy a
-- constraint would corrupt the one column whose whole job is to answer the
-- question honestly.
--
-- The codebase already has a convention for this. governance_audit_events.actor
-- is nullable, so a system-initiated action is recorded with no actor and no
-- apology. This change brings orders in line with it.
--
-- What the refined constraint still guarantees, and why it is not a weakening:
--
--   * Every paid order has evidence. Unconditional, and it is the part that
--     actually protects against a payment appearing from nowhere. For a webhook
--     the evidence is '<provider>:<reference>', and the event id is linked from
--     transaction_provider_references on the capture transaction.
--
--   * A manual confirmation still requires a privileged human with written
--     evidence. That lives in record_payment_success(), which refuses the
--     evidence-only path unless is_privileged(p_actor_id) — and is_privileged
--     returns false for a null actor, so the manual route cannot be taken
--     anonymously by dropping the actor.
--
--   * A webhook confirmation requires a provider event that passed signature
--     verification and has not already been applied. Also in the function, and
--     unchanged.
--
-- So the actor requirement was never load-bearing for the manual path — the
-- function enforces it — and for the webhook path it demanded something that
-- does not exist. Note this touches D4's neighbourhood but not D4 itself: D4
-- freezes the amount and currency as authoritative, integer minor units,
-- idempotent callbacks, and refund-request-not-equal-refund. All four are
-- untouched here.
-- ---------------------------------------------------------------------------

alter table public.orders
  drop constraint if exists orders_paid_has_evidence;

alter table public.orders
  add constraint orders_paid_has_evidence
  check (
    status not in ('paid', 'partially_refunded', 'refunded')
    or payment_evidence is not null
  );

-- Restate the actor rule where it is actually enforced, so it survives a future
-- edit to the function. Manual confirmation without a privileged human is
-- refused; this is the assertion that makes that visible in the schema's own
-- terms rather than buried in plpgsql.
comment on constraint orders_paid_has_evidence on public.orders is
  'A paid order must have payment evidence. A manual confirmation additionally '
  'requires a privileged actor, enforced in record_payment_success(); a webhook '
  'confirmation has no human actor and is recorded with payment_confirmed_by '
  'null, matching governance_audit_events.actor.';
