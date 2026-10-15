-- Group 4 · row level security
--
-- Two rules drive this file. The catalogue is public, because that is what a
-- storefront is. Billing is not, and membership of a billing account grants
-- no access whatsoever to learning data — that separation is the whole point
-- of the billing_manager role.

alter table public.products                     enable row level security;
alter table public.product_course_versions      enable row level security;
alter table public.plans                        enable row level security;
alter table public.plan_versions                enable row level security;
alter table public.plan_entitlements            enable row level security;
alter table public.prices                       enable row level security;
alter table public.promotion_campaigns          enable row level security;
alter table public.promotion_benefits           enable row level security;
alter table public.promotion_redemptions        enable row level security;
alter table public.billing_accounts             enable row level security;
alter table public.billing_account_memberships  enable row level security;
alter table public.subscriptions                enable row level security;
alter table public.subscription_items           enable row level security;
alter table public.subscription_history         enable row level security;
alter table public.family_plan_allocations      enable row level security;
alter table public.entitlement_grants           enable row level security;
alter table public.entitlement_events           enable row level security;
alter table public.access_checks                enable row level security;

-- ---------------------------------------------------------------------------
-- helpers
-- ---------------------------------------------------------------------------
create or replace function public.is_billing_member(p_account_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_privileged(public.current_user_id())
      or exists (
        select 1 from public.billing_account_memberships bam
         where bam.billing_account_id = p_account_id
           and bam.user_id = public.current_user_id()
           and bam.status = 'active'
      );
$$;

-- ---------------------------------------------------------------------------
-- catalogue — public when active, author and staff otherwise
-- ---------------------------------------------------------------------------
create policy products_read on public.products
  for select to anon, authenticated
  using (deleted_at is null
         and (status = 'active'
              or created_by = public.current_user_id()
              or public.is_privileged(public.current_user_id())));

create policy products_insert on public.products
  for insert to authenticated
  with check (created_by = public.current_user_id());

create policy products_update on public.products
  for update to authenticated
  using (created_by = public.current_user_id()
         or public.is_privileged(public.current_user_id()));

create policy pcv_read on public.product_course_versions
  for select to anon, authenticated
  using (exists (
    select 1 from public.products p
     where p.id = product_course_versions.product_id
       and p.deleted_at is null
       and (p.status = 'active' or public.is_privileged(public.current_user_id()))
  ));

create policy pcv_write on public.product_course_versions
  for insert to authenticated
  with check (exists (
    select 1 from public.products p
     where p.id = product_course_versions.product_id
       and (p.created_by = public.current_user_id()
            or public.is_privileged(public.current_user_id()))
  ));

create policy plans_read on public.plans
  for select to anon, authenticated
  using (deleted_at is null and (status = 'active'
         or public.is_privileged(public.current_user_id())));

create policy plans_write on public.plans
  for insert to authenticated
  with check (public.is_privileged(public.current_user_id()));

create policy plans_update on public.plans
  for update to authenticated
  using (public.is_privileged(public.current_user_id()));

create policy plan_versions_read on public.plan_versions
  for select to anon, authenticated
  using (status = 'active' or public.is_privileged(public.current_user_id()));

create policy plan_versions_write on public.plan_versions
  for insert to authenticated
  with check (public.is_privileged(public.current_user_id()));

create policy plan_entitlements_read on public.plan_entitlements
  for select to anon, authenticated
  using (true);

create policy plan_entitlements_write on public.plan_entitlements
  for insert to authenticated
  with check (public.is_privileged(public.current_user_id()));

-- Prices are visible so a storefront can render them. Drafts are not.
create policy prices_read on public.prices
  for select to anon, authenticated
  using (status = 'active' or public.is_privileged(public.current_user_id()));

create policy prices_write on public.prices
  for insert to authenticated
  with check (public.is_privileged(public.current_user_id()));

create policy prices_update on public.prices
  for update to authenticated
  using (public.is_privileged(public.current_user_id()));

-- ---------------------------------------------------------------------------
-- promotions
-- ---------------------------------------------------------------------------
create policy promotion_campaigns_read on public.promotion_campaigns
  for select to anon, authenticated
  using (status = 'active' or public.is_privileged(public.current_user_id()));

create policy promotion_campaigns_write on public.promotion_campaigns
  for insert to authenticated
  with check (created_by = public.current_user_id()
              or public.is_privileged(public.current_user_id()));

create policy promotion_campaigns_update on public.promotion_campaigns
  for update to authenticated
  using (public.is_privileged(public.current_user_id()));

create policy promotion_benefits_read on public.promotion_benefits
  for select to anon, authenticated
  using (exists (
    select 1 from public.promotion_campaigns pc
     where pc.id = promotion_benefits.campaign_id
       and (pc.status = 'active' or public.is_privileged(public.current_user_id()))
  ));

create policy promotion_benefits_write on public.promotion_benefits
  for insert to authenticated
  with check (public.is_privileged(public.current_user_id()));

create policy promotion_redemptions_read on public.promotion_redemptions
  for select to authenticated
  using (redeemed_by = public.current_user_id()
         or public.is_privileged(public.current_user_id()));

create policy promotion_redemptions_insert on public.promotion_redemptions
  for insert to authenticated
  with check (redeemed_by = public.current_user_id()
              or public.is_privileged(public.current_user_id()));

-- ---------------------------------------------------------------------------
-- billing — members only
-- ---------------------------------------------------------------------------
create policy billing_accounts_read on public.billing_accounts
  for select to authenticated
  using (public.is_billing_member(id));

create policy billing_accounts_insert on public.billing_accounts
  for insert to authenticated
  with check (created_by = public.current_user_id());

create policy billing_accounts_update on public.billing_accounts
  for update to authenticated
  using (public.is_billing_member(id));

create policy bam_read on public.billing_account_memberships
  for select to authenticated
  using (public.is_billing_member(billing_account_id));

create policy bam_write on public.billing_account_memberships
  for insert to authenticated
  with check (public.is_billing_member(billing_account_id));

create policy bam_update on public.billing_account_memberships
  for update to authenticated
  using (public.is_billing_member(billing_account_id));

create policy subscriptions_read on public.subscriptions
  for select to authenticated
  using (public.is_billing_member(billing_account_id));

create policy subscriptions_insert on public.subscriptions
  for insert to authenticated
  with check (public.is_billing_member(billing_account_id));

create policy subscriptions_update on public.subscriptions
  for update to authenticated
  using (public.is_billing_member(billing_account_id));

create policy subscription_items_read on public.subscription_items
  for select to authenticated
  using (exists (
    select 1 from public.subscriptions s
     where s.id = subscription_items.subscription_id
       and public.is_billing_member(s.billing_account_id)
  ));

create policy subscription_items_write on public.subscription_items
  for insert to authenticated
  with check (exists (
    select 1 from public.subscriptions s
     where s.id = subscription_items.subscription_id
       and public.is_billing_member(s.billing_account_id)
  ));

create policy subscription_history_read on public.subscription_history
  for select to authenticated
  using (exists (
    select 1 from public.subscriptions s
     where s.id = subscription_history.subscription_id
       and public.is_billing_member(s.billing_account_id)
  ));

-- ---------------------------------------------------------------------------
-- allocations and entitlements — learner/guardian, billing member, staff
--
-- A billing member may see that a slot is allocated, but never the learning
-- data attached to it.
-- ---------------------------------------------------------------------------
create policy fpa_read on public.family_plan_allocations
  for select to authenticated
  using (public.can_access_learner(learner_profile_id)
         or exists (
           select 1 from public.subscriptions s
            where s.id = family_plan_allocations.subscription_id
              and public.is_billing_member(s.billing_account_id))
         or public.is_privileged(public.current_user_id()));

create policy fpa_write on public.family_plan_allocations
  for insert to authenticated
  with check (public.is_privileged(public.current_user_id())
              or exists (
                select 1 from public.subscriptions s
                 where s.id = family_plan_allocations.subscription_id
                   and public.is_billing_member(s.billing_account_id)));

create policy fpa_update on public.family_plan_allocations
  for update to authenticated
  using (public.is_privileged(public.current_user_id())
         or exists (
           select 1 from public.subscriptions s
            where s.id = family_plan_allocations.subscription_id
              and public.is_billing_member(s.billing_account_id)));

create policy entitlement_grants_read on public.entitlement_grants
  for select to authenticated
  using (public.can_access_learner(learner_profile_id)
         or public.is_privileged(public.current_user_id()));

create policy entitlement_grants_insert on public.entitlement_grants
  for insert to authenticated
  with check (public.is_privileged(public.current_user_id()));

create policy entitlement_grants_update on public.entitlement_grants
  for update to authenticated
  using (public.is_privileged(public.current_user_id()));

create policy entitlement_events_read on public.entitlement_events
  for select to authenticated
  using (public.is_privileged(public.current_user_id()));

create policy entitlement_events_write on public.entitlement_events
  for insert to authenticated
  with check (public.is_privileged(public.current_user_id()));

create policy access_checks_read on public.access_checks
  for select to authenticated
  using (public.is_privileged(public.current_user_id()));

create policy access_checks_write on public.access_checks
  for insert to authenticated
  with check (public.is_privileged(public.current_user_id()));

-- ---------------------------------------------------------------------------
-- grants
-- ---------------------------------------------------------------------------
grant select on public.products, public.product_course_versions,
                public.plans, public.plan_versions, public.plan_entitlements,
                public.prices, public.promotion_campaigns, public.promotion_benefits
  to anon;

grant select, insert, update, delete on
  public.products, public.product_course_versions,
  public.plans, public.plan_versions, public.plan_entitlements, public.prices,
  public.promotion_campaigns, public.promotion_benefits, public.promotion_redemptions,
  public.billing_accounts, public.billing_account_memberships,
  public.subscriptions, public.subscription_items, public.subscription_history,
  public.family_plan_allocations, public.entitlement_grants,
  public.entitlement_events, public.access_checks
  to authenticated;

comment on function public.is_billing_member(uuid) is
  'A member of the billing account, or staff. Grants billing visibility only, never learning data.';
