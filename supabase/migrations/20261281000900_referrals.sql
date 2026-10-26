-- A referral is a discount code with a person's name on it.
--
-- WHAT WAS MISSING
-- ----------------
-- `commerce.referrals` sat in the register as CODE-gated with three
-- preconditions — fraud rules, reward accounting, payout of rewards — and no
-- table, no writer and no screen. The third precondition is the one that had
-- quietly blocked it: paying a referrer means paying somebody, and there is no
-- payout provider.
--
-- So this does not pay anybody. It does the thing the platform can already do
-- exactly: a discount code. The person who invites a friend gets a code of their
-- own; the friend who uses it buys their first course for less; when that order
-- is paid and stays paid past the refund window, the referrer is minted a code
-- of their own for their next purchase. No money leaves, nothing needs a
-- provider, and both sides get a benefit that already has a redemption trail,
-- a limit, an expiry and a market rule because promotions already had them.
--
-- WHY A CAMPAIGN PER PERSON
-- -------------------------
-- `apply_promotion_to_order()` is the only path that takes money off an order,
-- and it takes a campaign code. Minting one campaign per referrer means the
-- referrer's code *is* a promotion code, so checkout needed no change at all and
-- nothing can be discounted through a path that skips the promotion limits.
--
-- WHAT IS NOT BUILT, AND SAID SO
-- ------------------------------
-- A reward that has already been spent cannot be clawed back if the qualifying
-- order is refunded afterwards. The refund window is the guard: the reward code
-- does not start until the window closes, so an ordinary refund — the 72-hour
-- kind, decided by the customer — kills the reward before it is usable. A refund
-- approved by staff after that is recorded against the conversion, and the
-- campaign is archived so it cannot be used again, but a code already redeemed
-- stays redeemed. That is a limit of discount codes rather than of this build,
-- and it is written here rather than discovered later.

-- ---------------------------------------------------------------------------
-- The terms
-- ---------------------------------------------------------------------------
-- Every number is the owner's, on a screen, with a written reason, because none
-- of them is a constant: a referral worth 10% of a $12 course is a different
-- business from one worth 10% of a $400 plan.
insert into public.platform_settings
  (key, value_type, value_text, description, gate_type, setting_kind)
values
  ('commerce.referral_referee_percent', 'integer', '10',
   'What a friend gets off their first purchase when they use somebody''s referral code, in whole percent.',
   'admin', 'control'),
  ('commerce.referral_reward_percent', 'integer', '10',
   'What the person who invited them gets off their own next purchase, in whole percent.',
   'admin', 'control'),
  ('commerce.referral_max_per_year', 'integer', '10',
   'How many rewards one account may earn in twelve months. A cap is what makes a referral programme uninteresting to somebody farming their own invitations.',
   'admin', 'control'),
  ('commerce.referral_reward_expiry_days', 'integer', '90',
   'How long a reward code stays usable once it starts. A reward with no expiry is a liability nobody is tracking.',
   'admin', 'control')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- A code per person
-- ---------------------------------------------------------------------------
create table public.referral_codes (
  id          uuid primary key default gen_random_uuid(),

  user_id     uuid not null unique
                references public.user_profiles (user_id) on delete cascade,

  -- Upper case, because a code is read aloud and typed by hand.
  code        text not null unique
                check (code ~ '^[A-Z0-9-]{6,24}$'),

  -- The campaign a friend redeems. Minted with the code so the discount goes
  -- through `apply_promotion_to_order()` like every other discount.
  campaign_id uuid not null unique
                references public.promotion_campaigns (id) on delete restrict,

  created_at  timestamptz not null default now()
);

comment on table public.referral_codes is
  'One per person, minted the first time they open their referral page. The '
  'campaign is the discount a friend gets; the code on it is the one they share.';

alter table public.referral_codes enable row level security;

create policy referral_codes_read_own on public.referral_codes
  for select to authenticated
  using (user_id = public.current_user_id() or public.is_privileged(public.current_user_id()));

-- ---------------------------------------------------------------------------
-- What came of it
-- ---------------------------------------------------------------------------
create table public.referral_conversions (
  id                uuid primary key default gen_random_uuid(),

  referral_code_id  uuid not null
                      references public.referral_codes (id) on delete cascade,
  referrer_user_id  uuid not null
                      references public.user_profiles (user_id) on delete cascade,
  referee_user_id   uuid not null
                      references public.user_profiles (user_id) on delete cascade,

  order_id          uuid references public.orders (id) on delete set null,

  status            text not null default 'pending'
                      check (status in ('pending', 'rewarded', 'capped', 'reversed')),

  -- The code the referrer was minted, kept even though it lives on a campaign,
  -- so the answer to "what did I get for this" survives any later campaign work.
  reward_campaign_id uuid references public.promotion_campaigns (id) on delete set null,
  reward_code        text,
  reward_starts_at   timestamptz,

  created_at        timestamptz not null default now(),
  rewarded_at       timestamptz,
  reversed_at       timestamptz,

  constraint rc_no_self_referral check (referrer_user_id <> referee_user_id),
  constraint rc_rewarded_agrees check (
    (status <> 'rewarded') or (reward_campaign_id is not null and rewarded_at is not null)
  )
);

-- One referral per person, for ever: a second friend's code is still a discount
-- if it is a promotion, but it does not earn anybody a second reward.
create unique index referral_conversions_one_per_referee
  on public.referral_conversions (referee_user_id);

create index referral_conversions_referrer_idx
  on public.referral_conversions (referrer_user_id, created_at desc);

alter table public.referral_conversions enable row level security;

create policy referral_conversions_read_own on public.referral_conversions
  for select to authenticated
  using (
    referrer_user_id = public.current_user_id()
    or referee_user_id = public.current_user_id()
    or public.is_privileged(public.current_user_id())
  );

-- ---------------------------------------------------------------------------
-- Minting
-- ---------------------------------------------------------------------------
create or replace function public.new_referral_code(p_prefix text)
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_code text;
  v_try  integer := 0;
begin
  loop
    v_try := v_try + 1;
    -- Upper-case hex: every character can be read over a phone without the
    -- "was that a zero or an O" conversation.
    v_code := p_prefix || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    exit when not exists (select 1 from public.promotion_campaigns where code = v_code)
              and not exists (select 1 from public.referral_codes where code = v_code);
    if v_try > 50 then
      raise exception 'could not mint a code that is not already taken'
        using errcode = 'unique_violation';
    end if;
  end loop;
  return v_code;
end;
$$;

/**
 * This account's code, minting it (and the discount behind it) the first time.
 *
 * Idempotent: the second visit returns the same code. The campaign that makes it
 * work is created with the code, at the referee percentage as it stands today —
 * changing the percentage later does not re-price codes already shared, because
 * the friend was told what it was worth.
 */
create or replace function public.my_referral_code()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor    uuid := public.current_user_id();
  v_existing public.referral_codes;
  v_percent  integer;
  v_code     text;
  v_campaign uuid;
  v_name     text;
begin
  if v_actor is null then
    raise exception 'sign in to invite somebody'
      using errcode = 'insufficient_privilege';
  end if;
  if not public.setting_bool('commerce.referrals', false) then
    raise exception 'inviting friends is not switched on for this platform yet'
      using errcode = 'feature_not_supported';
  end if;

  select * into v_existing from public.referral_codes where user_id = v_actor;
  if found then
    return jsonb_build_object('code', v_existing.code, 'created', false);
  end if;

  v_percent := public.setting_int('commerce.referral_referee_percent', 10);
  if v_percent < 1 or v_percent > 100 then
    raise exception 'the referee discount is set to %, which is not a discount', v_percent
      using errcode = 'check_violation';
  end if;

  v_code := public.new_referral_code('AYA');
  select display_name into v_name from public.user_profiles where user_id = v_actor;

  insert into public.promotion_campaigns
    (code, name, description, per_user_limit, new_customers_only, status, created_by)
  values
    (v_code,
     'Invitation from ' || coalesce(v_name, 'a friend'),
     'An invitation. One use per account, on a first purchase.',
     1, true, 'active', v_actor)
  returning id into v_campaign;

  insert into public.promotion_benefits
    (campaign_id, benefit_type, percent_off, renewal_scope)
  values (v_campaign, 'percent_off', v_percent, 'first_period');

  insert into public.referral_codes (user_id, code, campaign_id)
  values (v_actor, v_code, v_campaign);

  insert into public.governance_audit_events (actor, action, target_type, detail)
  values (v_actor, 'referral.code_minted', 'user_profile',
          jsonb_build_object('code', v_code, 'refereePercent', v_percent));

  return jsonb_build_object('code', v_code, 'created', true);
end;
$$;

/**
 * A code as a visitor arriving from a shared link sees it.
 *
 * Name and percentage only. The person holding the link is not signed in, and
 * the only thing they need is what it is worth — not who else has used it, not
 * how many, and not the referrer's account.
 */
create or replace function public.resolve_referral_code(p_code text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_code   text := upper(btrim(coalesce(p_code, '')));
  v_row    public.referral_codes;
  v_name   text;
  v_percent numeric;
begin
  if v_code = '' then
    return jsonb_build_object('found', false);
  end if;
  if not public.setting_bool('commerce.referrals', false) then
    return jsonb_build_object('found', false, 'disabled', true);
  end if;

  select * into v_row from public.referral_codes where code = v_code;
  if not found then
    return jsonb_build_object('found', false);
  end if;

  select up.display_name into v_name
    from public.user_profiles up where up.user_id = v_row.user_id;

  select pb.percent_off into v_percent
    from public.promotion_benefits pb
   where pb.campaign_id = v_row.campaign_id
   order by pb.position limit 1;

  return jsonb_build_object(
    'found', true,
    'code', v_row.code,
    'inviterName', v_name,
    'percentOff', v_percent
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- A code being used
-- ---------------------------------------------------------------------------
-- Fires on the redemption itself rather than on the order, because a redemption
-- is the only record that a particular code was used on a particular order, and
-- there is exactly one path that writes it.
create or replace function public.track_referral_redemption()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ref public.referral_codes;
begin
  select * into v_ref from public.referral_codes where campaign_id = new.campaign_id;
  if not found then
    return new;
  end if;

  -- Using your own code is not a discount, it is a hole.
  if new.redeemed_by = v_ref.user_id then
    raise exception 'promotion:self_referral'
      using errcode = 'check_violation';
  end if;

  -- One referral per person for ever. A second code still discounts the order —
  -- it is a promotion like any other — but it does not earn a second reward, and
  -- the first inviter keeps the credit for the introduction.
  insert into public.referral_conversions
    (referral_code_id, referrer_user_id, referee_user_id, order_id)
  values (v_ref.id, v_ref.user_id, new.redeemed_by, new.order_id)
  on conflict (referee_user_id) do nothing;

  return new;
end;
$$;

create trigger promotion_redemptions_referral
  after insert on public.promotion_redemptions
  for each row execute function public.track_referral_redemption();

-- ---------------------------------------------------------------------------
-- The reward
-- ---------------------------------------------------------------------------
-- When the qualifying order is paid, the referrer is minted a code of their own.
-- It does not start until the refund window closes, so an ordinary refund kills
-- it before it can be used.
create or replace function public.reward_referral()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row      public.referral_conversions;
  v_percent  integer;
  v_cap      integer;
  v_earned   integer;
  v_window   integer;
  v_expiry   integer;
  v_code     text;
  v_campaign uuid;
  v_starts   timestamptz;
begin
  if new.status = 'paid' and old.status is distinct from 'paid' then
    for v_row in
      select * from public.referral_conversions
       where order_id = new.id and status = 'pending'
    loop
      v_percent := public.setting_int('commerce.referral_reward_percent', 10);
      v_cap     := public.setting_int('commerce.referral_max_per_year', 10);
      v_window  := public.setting_int('commerce.refund_window_hours', 72);
      v_expiry  := public.setting_int('commerce.referral_reward_expiry_days', 90);

      select count(*) into v_earned
        from public.referral_conversions
       where referrer_user_id = v_row.referrer_user_id
         and status = 'rewarded'
         and rewarded_at > now() - interval '365 days';

      if v_percent < 1 then
        continue;  -- a reward worth nothing is not a reward
      end if;

      if v_earned >= v_cap then
        update public.referral_conversions
           set status = 'capped'
         where id = v_row.id;
        continue;
      end if;

      v_code   := public.new_referral_code('THANKS');
      v_starts := now() + make_interval(hours => greatest(v_window, 0));

      insert into public.promotion_campaigns
        (code, name, description, starts_at, ends_at, per_user_limit,
         new_customers_only, status, created_by)
      values
        (v_code,
         'Thank you for an invitation',
         'Earned by inviting somebody who bought a course. One use.',
         v_starts,
         v_starts + make_interval(days => greatest(v_expiry, 1)),
         1, false, 'active', v_row.referrer_user_id)
      returning id into v_campaign;

      insert into public.promotion_benefits
        (campaign_id, benefit_type, percent_off, renewal_scope)
      values (v_campaign, 'percent_off', v_percent, 'first_period');

      update public.referral_conversions
         set status = 'rewarded',
             reward_campaign_id = v_campaign,
             reward_code = v_code,
             reward_starts_at = v_starts,
             rewarded_at = now()
       where id = v_row.id;

      insert into public.governance_audit_events (actor, action, target_type, detail)
      values (null, 'referral.reward_minted', 'user_profile',
              jsonb_build_object(
                'referrerUserId', v_row.referrer_user_id,
                'refereeUserId', v_row.referee_user_id,
                'orderId', new.id,
                'code', v_code,
                'percent', v_percent));
    end loop;

  elsif new.status in ('refunded', 'partially_refunded') then
    -- The order that earned the reward has been given back. If the reward has
    -- not started yet it can be cancelled outright; if it has, the campaign is
    -- archived so it cannot be used again, and the conversion says what
    -- happened. A code already redeemed stays redeemed — that is a limit of
    -- discount codes, and it is recorded rather than hidden.
    for v_row in
      select * from public.referral_conversions
       where order_id = new.id and status = 'rewarded'
    loop
      update public.promotion_campaigns
         set status = 'archived'
       where id = v_row.reward_campaign_id
         and status = 'active';

      update public.referral_conversions
         set status = 'reversed',
             reversed_at = now()
       where id = v_row.id;
    end loop;
  end if;

  return new;
end;
$$;

create trigger orders_referral_reward
  after update of status on public.orders
  for each row execute function public.reward_referral();

-- ---------------------------------------------------------------------------
-- What the person sees
-- ---------------------------------------------------------------------------
create or replace function public.my_referrals()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor     uuid := public.current_user_id();
  v_ref       public.referral_codes;
  v_referee   integer;
  v_rewards   jsonb;
  v_invited   jsonb;
begin
  if v_actor is null then
    raise exception 'sign in to see your invitations'
      using errcode = 'insufficient_privilege';
  end if;

  select * into v_ref from public.referral_codes where user_id = v_actor;

  if not public.setting_bool('commerce.referrals', false) then
    return jsonb_build_object(
      'enabled', false,
      'refereePercent', public.setting_int('commerce.referral_referee_percent', 10),
      'rewardPercent', public.setting_int('commerce.referral_reward_percent', 10),
      'maxPerYear', public.setting_int('commerce.referral_max_per_year', 10),
      'expiryDays', public.setting_int('commerce.referral_reward_expiry_days', 90),
      'code', v_ref.code,
      'joined', 0,
      'rewards', '[]'::jsonb,
      'invited', '[]'::jsonb
    );
  end if;

  select count(*) into v_referee
    from public.referral_conversions where referrer_user_id = v_actor;

  select coalesce(jsonb_agg(jsonb_build_object(
           'code', c.reward_code,
           'status', c.status,
           'percent', (select pb.percent_off from public.promotion_benefits pb
                        where pb.campaign_id = c.reward_campaign_id
                        order by pb.position limit 1),
           'startsAt', c.reward_starts_at,
           'startsWhenKnown', c.reward_starts_at is null,
           'earnedAt', c.rewarded_at,
           'endsAt', (select pc.ends_at from public.promotion_campaigns pc
                       where pc.id = c.reward_campaign_id),
           'campaignStatus', (select pc.status from public.promotion_campaigns pc
                               where pc.id = c.reward_campaign_id)
         ) order by c.created_at desc), '[]'::jsonb)
    into v_rewards
    from public.referral_conversions c
   where c.referrer_user_id = v_actor and c.reward_code is not null;

  -- Who joined, without their email address: the referrer gets to know that
  -- somebody came, and no more than that. The platform's own rule about a
  -- learner's privacy is not suspended because a friend invited them.
  select coalesce(jsonb_agg(jsonb_build_object(
           'name', split_part(coalesce(up.display_name, 'A friend'), ' ', 1),
           'status', c.status,
           'joinedAt', c.created_at
         ) order by c.created_at desc), '[]'::jsonb)
    into v_invited
    from public.referral_conversions c
    left join public.user_profiles up on up.user_id = c.referee_user_id
   where c.referrer_user_id = v_actor;

  return jsonb_build_object(
    'enabled', true,
    'refereePercent', public.setting_int('commerce.referral_referee_percent', 10),
    'rewardPercent', public.setting_int('commerce.referral_reward_percent', 10),
    'maxPerYear', public.setting_int('commerce.referral_max_per_year', 10),
    'expiryDays', public.setting_int('commerce.referral_reward_expiry_days', 90),
    'code', v_ref.code,
    'joined', v_referee,
    'rewards', v_rewards,
    'invited', v_invited
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- The numbers, on a screen
-- ---------------------------------------------------------------------------
-- These are controls, not a screen of their own: `/admin/settings` already lists
-- every dial the platform runs on, bounds it, asks for a reason and audits the
-- change. Adding four rows to the rules is all a new number needs, and it puts
-- the referral terms in the same place as every other policy value.
create or replace function public.platform_control_rules()
returns table (
  control_key         text,
  value_type          text,
  min_value           integer,
  max_value           integer,
  allowed_prefix      text,
  requires_finance    boolean,
  requires_governance boolean,
  requires_platform   boolean,
  label               text,
  unit                text,
  note                text
)
language sql
immutable
as $$
  select *
    from (values
      ('finance.reporting_currency', 'text', null::integer, null::integer, null::text,
       true, false, false,
       'Reporting currency', 'ISO 4217',
       'The one currency money is reported in. Changing it re-reports the past at whatever rates are recorded; it never restates a ledger row.'),

      ('finance.rate_sanity_factor', 'integer', 0, 1000, null::text,
       true, false, false,
       'Rate sanity factor', 'times',
       'How many times the previous rate a new one may be before recording it needs a written reason. 0 turns the check off.'),

      ('media.upload_quota_gb_per_teacher', 'integer', 1, 10000, null::text,
       false, false, true,
       'Teacher upload allowance', 'GiB',
       'Cumulative master bytes one uploader may store. Below 1 would block every upload rather than limit it, so 1 is the floor. Enforced only while platform.cost_controls is on.'),

      ('learning.offline_max_devices', 'integer', 1, 10, null::text,
       false, false, true,
       'Devices per learner', 'devices',
       'How many devices one learner may keep saved lessons on at once, counted on devices that actually hold a live save.'),

      ('learning.offline_expiry_days', 'integer', 1, 365, null::text,
       false, false, true,
       'Saved lesson lifetime', 'days',
       'How long a saved lesson plays before it asks to be refreshed. A saved lesson is a subscription artefact, not a purchase.'),

      ('delivery.live_room_base', 'text', null::integer, null::integer, 'https://',
       false, false, true,
       'Live room host', 'URL',
       'Base URL of the live-room host; a room is this plus /room/<slug>. Empty means live rooms are not connected, and joining refuses rather than handing out a URL that carries no class.'),

      ('delivery.max_attempts', 'integer', 1, 10, null::text,
       false, false, true,
       'Delivery attempts before giving up', 'attempts',
       'How many times the dispatcher tries one message before it becomes a dead letter somebody has to look at. Each retry waits longer: 5 minutes, 15, an hour, four hours, twelve.'),

      ('governance.min_approvals', 'integer', 1, 5, null::text,
       false, true, false,
       'Approvals needed to publish', 'approvals',
       'How many independent approvals a course version needs before it may be published.'),

      ('governance.panel_required', 'boolean', null::integer, null::integer, null::text,
       false, true, false,
       'Scholarly panel required', null,
       'Whether a scholarly panel must decide before publication. Off means peer review by an authorised reviewer is enough.'),

      ('governance.scholar_board_active', 'boolean', null::integer, null::integer, null::text,
       false, false, true,
       'Scholar board convened', null,
       'Whether a convened board may check reviewer credentials. Turning it on grants nothing by itself: only the owner may appoint a member, and only a member gains the power.'),

      -- Referrals. Both benefits are discounts, so the only thing to tune is how
      -- big they are and how often one account may earn one.
      ('commerce.referral_referee_percent', 'integer', 0, 100, null::text,
       false, false, true,
       'Friend''s discount', 'percent',
       'What a friend gets off their first purchase when they use an invitation code. 0 makes inviting pointless without switching the feature off; a code already shared keeps the percentage it was created with.'),

      ('commerce.referral_reward_percent', 'integer', 0, 100, null::text,
       false, false, true,
       'Inviter''s reward', 'percent',
       'What the person who invited them gets off their own next purchase, once the qualifying order has stayed paid for the refund window.'),

      ('commerce.referral_max_per_year', 'integer', 0, 1000, null::text,
       false, false, true,
       'Rewards per account a year', 'rewards',
       'How many rewards one account may earn in twelve months. 0 stops all rewards while still recording who invited whom.'),

      ('commerce.referral_reward_expiry_days', 'integer', 1, 3650, null::text,
       false, false, true,
       'Reward lifetime', 'days',
       'How long a reward code stays usable once it starts. A reward with no expiry is a liability nobody is tracking.')
    ) v(control_key, value_type, min_value, max_value, allowed_prefix,
        requires_finance, requires_governance, requires_platform, label, unit, note);
$$;

revoke all on function public.platform_control_rules() from public, anon;
grant execute on function public.platform_control_rules() to authenticated;

-- A staff view of what the programme has done, for the screen that runs it.
create or replace function public.referral_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
begin
  if v_actor is null or not public.is_privileged(v_actor) then
    raise exception 'only platform staff can see the referral programme'
      using errcode = 'insufficient_privilege';
  end if;

  return jsonb_build_object(
    'enabled', public.setting_bool('commerce.referrals', false),
    'terms', jsonb_build_object(
      'refereePercent', public.setting_int('commerce.referral_referee_percent', 10),
      'rewardPercent', public.setting_int('commerce.referral_reward_percent', 10),
      'maxPerYear', public.setting_int('commerce.referral_max_per_year', 10),
      'expiryDays', public.setting_int('commerce.referral_reward_expiry_days', 90)),
    'codes', (select count(*)::int from public.referral_codes),
    'conversions', (select count(*)::int from public.referral_conversions),
    'rewardsMinted', (select count(*)::int from public.referral_conversions where status = 'rewarded'),
    'rewardsCapped', (select count(*)::int from public.referral_conversions where status = 'capped'),
    'rewardsReversed', (select count(*)::int from public.referral_conversions where status = 'reversed'),
    'recent', coalesce((
      select jsonb_agg(jsonb_build_object(
               'referrer', referrer.display_name,
               'referee', referee.display_name,
               'status', c.status,
               'code', c.reward_code,
               'at', c.created_at) order by c.created_at desc)
        from (select * from public.referral_conversions order by created_at desc limit 25) c
        left join public.user_profiles referrer on referrer.user_id = c.referrer_user_id
        left join public.user_profiles referee on referee.user_id = c.referee_user_id
    ), '[]'::jsonb)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- The switch
-- ---------------------------------------------------------------------------
update public.platform_settings
   set gate_type = 'admin',
       description = 'Invite a friend: they get a discount on their first purchase, you get a code for your next one.',
       preconditions = 'None. The code, the discount behind it, the reward, the yearly cap and the expiry all ship with the flag, and every number is a control on /admin/settings with bounds and a written reason. No money leaves the platform: both benefits are discount codes, so there is no payout provider to wait for. The reward does not start until the refund window closes, so an ordinary refund cancels it; a staff-approved refund after that archives the code but cannot claw back one already used.'
 where key = 'commerce.referrals';

revoke all on function public.new_referral_code(text) from public, anon, authenticated;
revoke all on function public.my_referral_code() from public, anon;
grant execute on function public.my_referral_code() to authenticated;

-- A visitor holding a shared link is not signed in, and the whole point of the
-- landing page is that it answers before they make an account.
revoke all on function public.resolve_referral_code(text) from public;
grant execute on function public.resolve_referral_code(text) to anon, authenticated;

revoke all on function public.my_referrals() from public, anon;
grant execute on function public.my_referrals() to authenticated;

revoke all on function public.referral_overview() from public, anon;
grant execute on function public.referral_overview() to authenticated;
