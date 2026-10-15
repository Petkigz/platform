-- Group 5 · row level security
--
-- Financial data is the most sensitive thing in the schema. A billing account
-- member may see their own orders and refunds. Everything else — the ledger,
-- provider events, reconciliation, disputes, and what other instructors earn —
-- is privileged only.

alter table public.orders                        enable row level security;
alter table public.order_items                   enable row level security;
alter table public.order_adjustments             enable row level security;
alter table public.order_status_history          enable row level security;
alter table public.payment_provider_accounts     enable row level security;
alter table public.payment_attempts              enable row level security;
alter table public.payment_provider_events       enable row level security;
alter table public.payment_method_references     enable row level security;
alter table public.financial_transactions        enable row level security;
alter table public.transaction_provider_references enable row level security;
alter table public.currency_exchange_rates       enable row level security;
alter table public.refund_requests               enable row level security;
alter table public.refund_transactions           enable row level security;
alter table public.payment_disputes              enable row level security;
alter table public.financial_adjustments         enable row level security;
alter table public.payment_reconciliations       enable row level security;
alter table public.payment_reconciliation_items  enable row level security;
alter table public.instructor_earnings_entries   enable row level security;
alter table public.instructor_payouts            enable row level security;
alter table public.instructor_payout_items       enable row level security;

-- ---------------------------------------------------------------------------
-- orders and their children — billing members
-- ---------------------------------------------------------------------------
create policy orders_read on public.orders
  for select to authenticated
  using (public.is_billing_member(billing_account_id));

create policy orders_insert on public.orders
  for insert to authenticated
  with check (public.is_billing_member(billing_account_id));

-- No update policy: record_payment_success() and privileged staff only.

create policy order_items_read on public.order_items
  for select to authenticated
  using (exists (
    select 1 from public.orders o
     where o.id = order_items.order_id
       and public.is_billing_member(o.billing_account_id)));

create policy order_items_insert on public.order_items
  for insert to authenticated
  with check (exists (
    select 1 from public.orders o
     where o.id = order_items.order_id
       and public.is_billing_member(o.billing_account_id)));

create policy order_adjustments_read on public.order_adjustments
  for select to authenticated
  using (exists (
    select 1 from public.orders o
     where o.id = order_adjustments.order_id
       and public.is_billing_member(o.billing_account_id)));

create policy order_adjustments_insert on public.order_adjustments
  for insert to authenticated
  with check (exists (
    select 1 from public.orders o
     where o.id = order_adjustments.order_id
       and public.is_billing_member(o.billing_account_id)));

create policy order_status_history_read on public.order_status_history
  for select to authenticated
  using (exists (
    select 1 from public.orders o
     where o.id = order_status_history.order_id
       and public.is_billing_member(o.billing_account_id)));

-- ---------------------------------------------------------------------------
-- payments — billing members see their own attempts and saved methods
-- ---------------------------------------------------------------------------
create policy payment_attempts_read on public.payment_attempts
  for select to authenticated
  using (exists (
    select 1 from public.orders o
     where o.id = payment_attempts.order_id
       and public.is_billing_member(o.billing_account_id)));

create policy payment_attempts_insert on public.payment_attempts
  for insert to authenticated
  with check (exists (
    select 1 from public.orders o
     where o.id = payment_attempts.order_id
       and public.is_billing_member(o.billing_account_id)));

create policy payment_method_references_read on public.payment_method_references
  for select to authenticated
  using (public.is_billing_member(billing_account_id));

create policy payment_method_references_insert on public.payment_method_references
  for insert to authenticated
  with check (public.is_billing_member(billing_account_id));

create policy payment_method_references_update on public.payment_method_references
  for update to authenticated
  using (public.is_billing_member(billing_account_id));

-- ---------------------------------------------------------------------------
-- refunds — billing members see their own
-- ---------------------------------------------------------------------------
create policy refund_requests_read on public.refund_requests
  for select to authenticated
  using (exists (
    select 1 from public.orders o
     where o.id = refund_requests.order_id
       and public.is_billing_member(o.billing_account_id))
    or public.is_privileged(public.current_user_id()));

create policy refund_requests_insert on public.refund_requests
  for insert to authenticated
  with check (requested_by = public.current_user_id()
              or public.is_privileged(public.current_user_id()));

create policy refund_requests_update on public.refund_requests
  for update to authenticated
  using (public.is_privileged(public.current_user_id()));

create policy refund_transactions_read on public.refund_transactions
  for select to authenticated
  using (exists (
    select 1 from public.orders o
     where o.id = refund_transactions.order_id
       and public.is_billing_member(o.billing_account_id))
    or public.is_privileged(public.current_user_id()));

-- ---------------------------------------------------------------------------
-- everything else — privileged only
--
-- The ledger, provider configuration, the callback inbox, FX, reconciliation,
-- disputes, adjustments and instructor earnings. None of these are a
-- customer's own record, and several contain another person's income.
-- ---------------------------------------------------------------------------
create or replace function public.staff_only()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_privileged(public.current_user_id());
$$;

create policy ppa_read on public.payment_provider_accounts
  for select to authenticated using (public.staff_only());
create policy ppa_write on public.payment_provider_accounts
  for insert to authenticated with check (public.staff_only());

create policy ppe_read on public.payment_provider_events
  for select to authenticated using (public.staff_only());
create policy ppe_write on public.payment_provider_events
  for insert to authenticated with check (public.staff_only());

create policy ft_read on public.financial_transactions
  for select to authenticated using (public.staff_only());
create policy ft_write on public.financial_transactions
  for insert to authenticated with check (public.staff_only());

create policy tpr_read on public.transaction_provider_references
  for select to authenticated using (public.staff_only());
create policy tpr_write on public.transaction_provider_references
  for insert to authenticated with check (public.staff_only());

create policy pd_read on public.payment_disputes
  for select to authenticated using (public.staff_only());
create policy pd_write on public.payment_disputes
  for insert to authenticated with check (public.staff_only());

create policy fa_read on public.financial_adjustments
  for select to authenticated using (public.staff_only());
create policy fa_write on public.financial_adjustments
  for insert to authenticated with check (public.staff_only());

create policy pr_read on public.payment_reconciliations
  for select to authenticated using (public.staff_only());
create policy pr_write on public.payment_reconciliations
  for insert to authenticated with check (public.staff_only());

create policy pri_read on public.payment_reconciliation_items
  for select to authenticated using (public.staff_only());
create policy pri_write on public.payment_reconciliation_items
  for insert to authenticated with check (public.staff_only());

create policy iee_read on public.instructor_earnings_entries
  for select to authenticated
  using (instructor_user_id = public.current_user_id() or public.staff_only());
create policy iee_write on public.instructor_earnings_entries
  for insert to authenticated with check (public.staff_only());

create policy ip_read on public.instructor_payouts
  for select to authenticated
  using (instructor_user_id = public.current_user_id() or public.staff_only());
create policy ip_write on public.instructor_payouts
  for insert to authenticated with check (public.staff_only());

create policy ipi_read on public.instructor_payout_items
  for select to authenticated
  using (exists (
    select 1 from public.instructor_payouts p
     where p.id = instructor_payout_items.payout_id
       and (p.instructor_user_id = public.current_user_id()
            or public.is_privileged(public.current_user_id()))));
create policy ipi_write on public.instructor_payout_items
  for insert to authenticated with check (public.staff_only());

-- Exchange rates are the one genuinely public table here: a storefront may
-- need to display a converted price.
create policy cer_read on public.currency_exchange_rates
  for select to anon, authenticated using (true);
create policy cer_write on public.currency_exchange_rates
  for insert to authenticated with check (public.staff_only());

-- ---------------------------------------------------------------------------
-- grants
-- ---------------------------------------------------------------------------
grant select on public.currency_exchange_rates to anon;

grant select, insert, update, delete on
  public.orders, public.order_items, public.order_adjustments,
  public.order_status_history, public.payment_provider_accounts,
  public.payment_attempts, public.payment_provider_events,
  public.payment_method_references, public.financial_transactions,
  public.transaction_provider_references, public.currency_exchange_rates,
  public.refund_requests, public.refund_transactions, public.payment_disputes,
  public.financial_adjustments, public.payment_reconciliations,
  public.payment_reconciliation_items, public.instructor_earnings_entries,
  public.instructor_payouts, public.instructor_payout_items
  to authenticated;

comment on function public.staff_only() is
  'Privileged roles. Used for the financial tables that belong to nobody in particular.';
