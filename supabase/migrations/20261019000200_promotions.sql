-- Group 4 · promotions
--
-- Recorded rule: "Promotion terms are snapshotted at checkout." A redemption
-- copies the benefit it applied, because the campaign may be edited or expire
-- while the subscription it produced is still running.

create table public.promotion_campaigns (
  id uuid primary key default gen_random_uuid(),

  code text not null check (code ~ '^[A-Za-z0-9][A-Za-z0-9_-]*$'),
  name text not null check (length(trim(name)) > 0),
  description text,

  starts_at timestamptz,
  ends_at timestamptz,

  -- NULL means unlimited.
  total_usage_limit integer check (total_usage_limit is null or total_usage_limit > 0),
  per_user_limit integer check (per_user_limit is null or per_user_limit > 0),

  -- Eligibility. NULL means anyone.
  new_customers_only boolean not null default false,
  eligible_market text check (eligible_market is null or eligible_market ~ '^[A-Z]{2}$'),

  status text not null default 'draft'
    check (status in ('draft', 'active', 'paused', 'expired', 'archived')),

  created_by uuid not null
    references public.user_profiles (user_id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint pc_window check (ends_at is null or starts_at is null or starts_at <= ends_at)
);

create unique index promotion_campaigns_code_key on public.promotion_campaigns (code);

create trigger promotion_campaigns_set_updated_at
  before update on public.promotion_campaigns
  for each row execute function public.set_updated_at();

create table public.promotion_benefits (
  id uuid primary key default gen_random_uuid(),

  campaign_id uuid not null
    references public.promotion_campaigns (id) on delete cascade,

  benefit_type text not null default 'percent_off'
    check (benefit_type in
      ('percent_off', 'fixed_amount_off', 'free_trial_days', 'free_months', 'bonus_feature')),

  -- Exactly the fields the type needs.
  percent_off numeric(5,2) check (percent_off is null or (percent_off > 0 and percent_off <= 100)),
  amount_off_minor bigint check (amount_off_minor is null or amount_off_minor > 0),
  amount_off_currency char(3) check (amount_off_currency is null or amount_off_currency ~ '^[A-Z]{3}$'),
  duration_days integer check (duration_days is null or duration_days > 0),
  feature_code text,

  -- Does the benefit apply once, or to every renewal inside a window?
  renewal_scope text not null default 'first_period'
    check (renewal_scope in ('first_period', 'all_renewals', 'n_periods')),
  renewal_periods integer check (renewal_periods is null or renewal_periods > 0),

  position integer not null default 1 check (position > 0),

  constraint pb_type_matches check (
    case benefit_type
      when 'percent_off'     then percent_off is not null
      when 'fixed_amount_off' then amount_off_minor is not null
                                and amount_off_currency is not null
      when 'free_trial_days' then duration_days is not null
      when 'free_months'     then duration_days is not null
      when 'bonus_feature'   then feature_code is not null
    end
  ),
  constraint pb_renewal_matches check (
    renewal_scope <> 'n_periods' or renewal_periods is not null
  )
);

create index promotion_benefits_campaign_idx on public.promotion_benefits (campaign_id);

create table public.promotion_redemptions (
  id uuid primary key default gen_random_uuid(),

  campaign_id uuid not null
    references public.promotion_campaigns (id) on delete restrict,

  -- The payer, not the learner: a guardian may pay for a child's course.
  redeemed_by uuid not null
    references public.user_profiles (user_id) on delete restrict,

  order_id uuid,   -- populated by Group 5 once orders exist
  subscription_id uuid,

  -- Snapshot of the benefit as it stood at checkout. Deliberately denormalised:
  -- the campaign can change afterwards and this row must not.
  benefit_snapshot jsonb not null default '{}'::jsonb,

  redeemed_at timestamptz not null default now()
);

create index promotion_redemptions_campaign_idx on public.promotion_redemptions (campaign_id);
create index promotion_redemptions_user_idx     on public.promotion_redemptions (redeemed_by);

-- ---------------------------------------------------------------------------
-- Usage limits, enforced in the same transaction as the redemption
-- ---------------------------------------------------------------------------
create or replace function public.enforce_promotion_limits()
returns trigger
language plpgsql
as $$
declare
  v_campaign public.promotion_campaigns;
  v_total    integer;
  v_per_user integer;
begin
  select * into v_campaign from public.promotion_campaigns
   where id = new.campaign_id for update;

  if v_campaign.status <> 'active' then
    raise exception 'promotion % is %, not active', v_campaign.code, v_campaign.status
      using errcode = 'check_violation';
  end if;

  if v_campaign.starts_at is not null and now() < v_campaign.starts_at then
    raise exception 'promotion % has not started', v_campaign.code
      using errcode = 'check_violation';
  end if;
  if v_campaign.ends_at is not null and now() > v_campaign.ends_at then
    raise exception 'promotion % has ended', v_campaign.code
      using errcode = 'check_violation';
  end if;

  if v_campaign.total_usage_limit is not null then
    select count(*) into v_total from public.promotion_redemptions
     where campaign_id = new.campaign_id;
    -- Locking the campaign row above serialises concurrent redemptions.
    if v_total >= v_campaign.total_usage_limit then
      raise exception 'promotion % has reached its total usage limit', v_campaign.code
        using errcode = 'check_violation';
    end if;
  end if;

  if v_campaign.per_user_limit is not null then
    select count(*) into v_per_user from public.promotion_redemptions
     where campaign_id = new.campaign_id and redeemed_by = new.redeemed_by;
    if v_per_user >= v_campaign.per_user_limit then
      raise exception 'promotion % has reached its per-user limit for this account', v_campaign.code
        using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$$;

create trigger promotion_redemptions_limits
  before insert on public.promotion_redemptions
  for each row execute function public.enforce_promotion_limits();

-- A redemption is a fact about what happened; it is not edited afterwards.
create or replace function public.reject_redemption_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception
    'promotion redemptions are append-only; they snapshot the terms applied at checkout'
    using errcode = 'insufficient_privilege';
end;
$$;

create trigger promotion_redemptions_append_only
  before update or delete on public.promotion_redemptions
  for each row execute function public.reject_redemption_mutation();

comment on table public.promotion_campaigns is 'Eligibility, dates and usage limits.';
comment on table public.promotion_benefits is 'Explicit benefit definition and renewal scope.';
comment on table public.promotion_redemptions is
  'Append-only. Snapshots the benefit at checkout so a later campaign edit cannot rewrite history.';
