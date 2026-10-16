-- ---------------------------------------------------------------------------
-- Creating a billing account made you unable to use it.
--
-- The write policy says who may create one:
--
--     billing_accounts_insert: created_by = current_user_id()
--
-- But every other policy on the table, and every policy on the tables beneath
-- it, is gated on membership:
--
--     billing_accounts_read:  is_billing_member(id)
--     billing_accounts_update: is_billing_member(id)
--     orders_insert:          is_billing_member(billing_account_id)
--     orders_read:            is_billing_member(billing_account_id)
--     order_items_insert:     EXISTS (orders o WHERE ... is_billing_member(o.billing_account_id))
--
-- and is_billing_member() consults billing_account_memberships and nothing
-- else. Nothing ever inserted that row: there was no trigger on
-- billing_accounts (only set_updated_at) and none on
-- billing_account_memberships.
--
-- So a user could create an account and then do nothing with it. Measured as a
-- real authenticated user, not reasoned about:
--
--     created account: 34fe18de-...
--       can the owner READ their own new account? -> NO
--       can the owner ADD THEMSELVES as a member? -> NO
--         (new row violates row-level security policy for
--          table "billing_account_memberships")
--       can the owner CREATE AN ORDER on it?      -> NO
--
-- The second line is what closes the trap: the policy that would let someone
-- add a member is itself gated on already being a member. There is no
-- bootstrap, and no privileged-only escape hatch in the UI either, so an
-- ordinary payer was permanently locked out of paying.
--
-- That made the whole paid path unreachable. record_payment_success() could
-- fulfil a purchase correctly and the entitlement trigger granted access on
-- enrolment, but no order could ever exist to confirm, because no order could
-- be created. This is the same shape as the entitlement gap fixed in
-- 20261028000100: the machinery was right and nothing connected to it.
--
-- The fix is to make the creator a member at the moment of creation.
--
-- Two properties that had to be true, not just convenient:
--
--   * Scoped on the relationship, not on the actor. The creator is the person
--     named in created_by — which for a self-service insert is necessarily the
--     actor, because that is what the insert policy enforces. A privileged
--     actor creating an account for someone else grants it to that someone,
--     which is the only sensible reading.
--
--     This deliberately does NOT test whether the current session is
--     privileged. That phrasing has already broken this suite once: a
--     superuser fixture has no JWT claims, so current_user_id() is null and
--     is_privileged(null) is false, which exempts nothing and inverts the
--     intended behaviour.
--
--   * Idempotent. bam_one_per_user is unique on (billing_account_id, user_id),
--     so a re-run collides. On conflict do nothing, because a row that already
--     exists is the desired end state.
--
-- The creator gets the full member capability set, not just invoice viewing.
-- They are the payer: they have to be able to attach a payment method and to
-- cancel a subscription they started, and revoking either would strand them.
--
-- SECURITY DEFINER because the membership insert has to bypass the very policy
-- that is deadlocked. It does not widen anything: the row it writes is fully
-- determined by the account row that already passed its own insert policy.
-- ---------------------------------------------------------------------------

create or replace function public.grant_creator_billing_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.created_by is null then
    return new;
  end if;

  insert into public.billing_account_memberships
    (billing_account_id, user_id, can_view_invoices,
     can_manage_payment_methods, can_cancel_subscriptions,
     status, granted_by)
  values
    (new.id, new.created_by, true, true, true, 'active', new.created_by)
  on conflict (billing_account_id, user_id) do nothing;

  return new;
end;
$$;

revoke all on function public.grant_creator_billing_membership() from public;

drop trigger if exists billing_accounts_grant_creator
  on public.billing_accounts;

create trigger billing_accounts_grant_creator
  after insert on public.billing_accounts
  for each row
  execute function public.grant_creator_billing_membership();
