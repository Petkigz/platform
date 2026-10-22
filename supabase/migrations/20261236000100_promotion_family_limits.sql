-- A promotion's per-family limit is the campaign's to choose.
--
-- The owner's rule (2026-10-22): a promotion on family accounts may be limited
-- to two per family, or three, "dependingly". The grain matters — a family is
-- the billing account, not the user who typed the code, because one guardian
-- buys for several children and one purchase covers one learner. A per-person
-- limit would let a household use the same offer once per child; a per-family
-- limit is what the owner is describing.
--
-- So `per_family_limit` sits beside `per_user_limit` and `total_usage_limit`,
-- nullable (no limit), and is editable after the campaign exists — an offer
-- that turns out to be too generous is a business decision, not a new
-- migration. Editing below what has already been redeemed is refused rather
-- than silently ignored.
--
-- `promotion_redemptions.billing_account_id` is added now, before any redemption
-- writer exists, because the limit cannot be counted without it. Counting
-- `redeemed_by` would answer a different question and would over-count a
-- guardian who paid for two children from one account.

alter table public.promotion_campaigns
  add column if not exists per_family_limit integer
    check (per_family_limit is null or per_family_limit > 0);

comment on column public.promotion_campaigns.per_family_limit is
  'How many times one billing account may redeem this campaign. Null is no limit. Chosen per campaign: two, three, whatever the offer covers.';

alter table public.promotion_redemptions
  add column if not exists billing_account_id uuid
    references public.billing_accounts (id) on delete set null;

create index if not exists promotion_redemptions_account_idx
  on public.promotion_redemptions (campaign_id, billing_account_id);

comment on column public.promotion_redemptions.billing_account_id is
  'The family that redeemed, so a per-family limit can be counted. Nullable only because the column predates the first redemption writer.';

create or replace function public.create_promotion_campaign(
  p_code              text,
  p_name              text,
  p_benefit_type      text,
  p_percent           numeric default null,
  p_amount_minor      bigint default null,
  p_currency          text default null,
  p_markets           text[] default '{}',
  p_course_ids        uuid[] default '{}',
  p_starts_at         timestamptz default null,
  p_ends_at           timestamptz default null,
  p_total_limit       integer default null,
  p_per_user_limit    integer default null,
  p_new_customers_only boolean default false,
  p_per_family_limit  integer default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor     uuid := public.current_user_id();
  v_code      text := upper(btrim(coalesce(p_code, '')));
  v_name      text := btrim(coalesce(p_name, ''));
  v_owner     text;
  v_instructor uuid;
  v_campaign  uuid;
  v_course    uuid;
  v_market    text;
  v_currency  text;
  v_price_currencies text[];
  v_markets   text[] := coalesce(p_markets, '{}');
begin
  if v_actor is null then
    raise exception 'sign in to create a promotion'
      using errcode = 'insufficient_privilege';
  end if;

  -- The owner runs platform-wide campaigns; a teacher runs campaigns for their
  -- own courses. Nobody else creates one, and "sometimes the teachers" is not
  -- "any member of staff on a teacher's behalf".
  if public.has_role(v_actor, 'platform_admin') then
    v_owner := 'platform';
    v_instructor := null;
  elsif public.has_role(v_actor, 'instructor') then
    v_owner := 'teacher';
    v_instructor := v_actor;
  else
    raise exception 'only the platform owner or a teacher may create a promotion'
      using errcode = 'insufficient_privilege';
  end if;

  if v_code = '' or v_code !~ '^[A-Z0-9][A-Z0-9_-]*$' then
    raise exception 'a promotion code is letters, digits, dash or underscore'
      using errcode = 'invalid_parameter_value';
  end if;
  if v_name = '' then
    raise exception 'give the promotion a name people will recognise'
      using errcode = 'invalid_parameter_value';
  end if;

  if p_benefit_type not in ('percent_off', 'fixed_amount_off') then
    raise exception
      'a course promotion is a percentage or a fixed amount off; % is not built',
      coalesce(p_benefit_type, '(none)')
      using errcode = 'feature_not_supported';
  end if;

  if p_benefit_type = 'percent_off' then
    if p_percent is null or p_percent <= 0 or p_percent > 100 then
      raise exception 'a percentage has to be above 0 and at most 100'
        using errcode = 'invalid_parameter_value';
    end if;
  else
    if p_amount_minor is null or p_amount_minor <= 0 then
      raise exception 'a fixed discount needs a positive amount in minor units'
        using errcode = 'invalid_parameter_value';
    end if;
    if p_currency is null or upper(p_currency) !~ '^[A-Z]{3}$' then
      raise exception 'a fixed discount needs the currency it is written in'
        using errcode = 'invalid_parameter_value';
    end if;
  end if;

  if p_starts_at is not null and p_ends_at is not null and p_starts_at > p_ends_at then
    raise exception 'a promotion cannot end before it starts'
      using errcode = 'invalid_parameter_value';
  end if;

  if p_total_limit is not null and p_total_limit <= 0 then
    raise exception 'a usage limit has to be at least one redemption'
      using errcode = 'invalid_parameter_value';
  end if;
  if p_per_user_limit is not null and p_per_user_limit <= 0 then
    raise exception 'a per-person limit has to be at least one redemption'
      using errcode = 'invalid_parameter_value';
  end if;

  -- A family is the billing account, not the person who typed the code: a
  -- guardian buys for several children, so "two per family" is what stops one
  -- household using a course promotion for every child it has. Null is no
  -- limit; the number is the campaign's to choose (two, three, whatever the
  -- offer is meant to cover).
  if p_per_family_limit is not null and p_per_family_limit <= 0 then
    raise exception 'a per-family limit has to be at least one redemption'
      using errcode = 'invalid_parameter_value';
  end if;

  -- A teacher campaign has to name the courses it may be used on; the platform
  -- may name none, which means every course.
  if v_owner = 'teacher' and coalesce(array_length(p_course_ids, 1), 0) = 0 then
    raise exception 'a teacher promotion has to name the courses it applies to'
      using errcode = 'invalid_parameter_value';
  end if;

  if exists (select 1 from public.promotion_campaigns pc where pc.code = v_code) then
    raise exception 'the code % is already used by another promotion', v_code
      using errcode = 'unique_violation';
  end if;

  -- Every named course must be the teacher's own, and must be one that is
  -- actually on sale somewhere.
  foreach v_course in array coalesce(p_course_ids, '{}')
  loop
    if v_owner = 'teacher' and not exists (
      select 1 from public.courses c
       where c.id = v_course and c.created_by = v_actor and c.deleted_at is null
    ) then
      raise exception 'course % is not yours to discount', v_course
        using errcode = 'insufficient_privilege';
    end if;

    if not exists (
      select 1 from public.courses c
       where c.id = v_course and c.status = 'active' and c.deleted_at is null
    ) then
      raise exception 'course % is not an active course', v_course
        using errcode = 'no_data_found';
    end if;
  end loop;

  -- A named market must be one the course is actually priced in. A campaign
  -- aimed at a country where nothing is sold can only ever disappoint somebody.
  foreach v_market in array v_markets
  loop
    if v_market !~ '^[A-Z]{2}$' then
      raise exception 'a market is a two-letter ISO 3166-1 code, not %', v_market
        using errcode = 'invalid_parameter_value';
    end if;

    foreach v_course in array coalesce(p_course_ids, '{}')
    loop
      select array_agg(distinct p.currency_code::text)
        into v_price_currencies
        from public.courses c
        join lateral (
          select cv.id
            from public.course_versions cv
           where cv.course_id = c.id
             and cv.version_status = 'published'
           order by cv.version_number desc
           limit 1
        ) cv on true
        join public.product_course_versions pcv on pcv.course_version_id = cv.id
        join public.products pr on pr.id = pcv.product_id and pr.status = 'active'
        join public.prices p
          on p.product_id = pcv.product_id
         and p.status = 'active'
         and p.billing_interval = 'one_time'
         and p.effective_from <= now()
         and (p.effective_until is null or p.effective_until > now())
       where c.id = v_course
         and p.market = v_market;

      if v_price_currencies is null then
        raise exception 'course % has no live price in market %', v_course, v_market
          using errcode = 'no_data_found';
      end if;

      if p_benefit_type = 'fixed_amount_off' then
        if array_length(v_price_currencies, 1) > 1 then
          raise exception
            'course % is priced in more than one currency in market % (%), so a fixed discount cannot say what it is worth',
            v_course, v_market, array_to_string(v_price_currencies, ', ')
            using errcode = 'invalid_parameter_value';
        end if;
        if v_price_currencies[1] <> upper(p_currency) then
          raise exception
            'course % is priced in % in market %, so a % discount would be a different gift there',
            v_course, v_price_currencies[1], v_market, upper(p_currency)
            using errcode = 'invalid_parameter_value';
        end if;
      end if;
    end loop;
  end loop;

  insert into public.promotion_campaigns
    (code, name, description, starts_at, ends_at, total_usage_limit,
     per_user_limit, per_family_limit, new_customers_only, status, owner_type,
     instructor_id, created_by)
  values
    (v_code, v_name, null, p_starts_at, p_ends_at, p_total_limit,
     p_per_user_limit, p_per_family_limit, coalesce(p_new_customers_only, false),
     'draft', v_owner, v_instructor, v_actor)
  returning id into v_campaign;

  insert into public.promotion_benefits
    (campaign_id, benefit_type, percent_off, amount_off_minor, amount_off_currency,
     renewal_scope, position)
  values
    (v_campaign, p_benefit_type,
     case when p_benefit_type = 'percent_off' then p_percent end,
     case when p_benefit_type = 'fixed_amount_off' then p_amount_minor end,
     case when p_benefit_type = 'fixed_amount_off' then upper(p_currency) end,
     'first_period', 1);

  insert into public.promotion_campaign_markets (campaign_id, market)
  select v_campaign, m from unnest(v_markets) m
  on conflict do nothing;

  insert into public.promotion_campaign_courses (campaign_id, course_id)
  select v_campaign, c from unnest(coalesce(p_course_ids, '{}')) c
  on conflict do nothing;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'promotion.created', 'promotion_campaign', v_campaign,
          jsonb_build_object('code', v_code, 'owner_type', v_owner,
                             'benefit_type', p_benefit_type,
                             'markets', to_jsonb(v_markets),
                             'courses', to_jsonb(coalesce(p_course_ids, '{}'))));

  return v_campaign;
end;
$$;

-- The old signature must go explicitly. With a defaulted fourteenth parameter it
-- would otherwise be a second overload, and a thirteen-argument call would match
-- both.
drop function if exists public.create_promotion_campaign(
  text, text, text, numeric, bigint, text, text[], uuid[],
  timestamptz, timestamptz, integer, integer, boolean);

comment on function public.create_promotion_campaign(text,text,text,numeric,bigint,text,text[],uuid[],timestamptz,timestamptz,integer,integer,boolean,integer) is
  'The only supported way to create a campaign. Derives the owner from the actor, checks that a teacher only discounts their own courses, refuses a fixed amount in a market priced in another currency, and records the per-family limit the campaign chooses.';

revoke execute on function public.create_promotion_campaign(text,text,text,numeric,bigint,text,text[],uuid[],timestamptz,timestamptz,integer,integer,boolean,integer) from public, anon;
grant  execute on function public.create_promotion_campaign(text,text,text,numeric,bigint,text,text[],uuid[],timestamptz,timestamptz,integer,integer,boolean,integer) to authenticated;

-- ---------------------------------------------------------------------------
-- Editing the limits
-- ---------------------------------------------------------------------------
create or replace function public.set_promotion_limits(
  p_campaign_id       uuid,
  p_total_limit       integer,
  p_per_user_limit    integer,
  p_per_family_limit  integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor    uuid := public.current_user_id();
  v_campaign public.promotion_campaigns;
  v_used     integer;
begin
  if v_actor is null then
    raise exception 'sign in to change a promotion'
      using errcode = 'insufficient_privilege';
  end if;

  select * into v_campaign
    from public.promotion_campaigns
   where id = p_campaign_id
   for update;
  if not found then
    raise exception 'no promotion campaign %', p_campaign_id
      using errcode = 'no_data_found';
  end if;

  if not (public.has_role(v_actor, 'platform_admin')
          or (v_campaign.owner_type = 'teacher' and v_campaign.instructor_id = v_actor)) then
    raise exception 'only the owner of this campaign may change its limits'
      using errcode = 'insufficient_privilege';
  end if;

  if p_total_limit is not null and p_total_limit <= 0 then
    raise exception 'a usage limit has to be at least one redemption'
      using errcode = 'invalid_parameter_value';
  end if;
  if p_per_user_limit is not null and p_per_user_limit <= 0 then
    raise exception 'a per-person limit has to be at least one redemption'
      using errcode = 'invalid_parameter_value';
  end if;
  if p_per_family_limit is not null and p_per_family_limit <= 0 then
    raise exception 'a per-family limit has to be at least one redemption'
      using errcode = 'invalid_parameter_value';
  end if;

  -- A limit below what has already happened is not a limit, it is a broken
  -- record. Refused with the number, so the person lowering it can see why.
  select count(*) into v_used
    from public.promotion_redemptions pr
   where pr.campaign_id = p_campaign_id;

  if p_total_limit is not null and v_used > p_total_limit then
    raise exception 'this campaign has already been redeemed % times, so the total limit cannot be %',
      v_used, p_total_limit
      using errcode = 'invalid_parameter_value';
  end if;

  update public.promotion_campaigns
     set total_usage_limit = p_total_limit,
         per_user_limit    = p_per_user_limit,
         per_family_limit  = p_per_family_limit,
         updated_at        = now()
   where id = p_campaign_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'promotion.limits_changed', 'promotion_campaign', p_campaign_id,
          jsonb_build_object(
            'from', jsonb_build_object(
              'total', v_campaign.total_usage_limit,
              'per_user', v_campaign.per_user_limit,
              'per_family', v_campaign.per_family_limit),
            'to', jsonb_build_object(
              'total', p_total_limit,
              'per_user', p_per_user_limit,
              'per_family', p_per_family_limit)));

  return jsonb_build_object(
    'totalLimit', p_total_limit,
    'perUserLimit', p_per_user_limit,
    'perFamilyLimit', p_per_family_limit);
end;
$$;

comment on function public.set_promotion_limits(uuid,integer,integer,integer) is
  'Edits the three redemption limits, owner only, refusing a total below what has already been redeemed and recording the change.';

revoke execute on function public.set_promotion_limits(uuid,integer,integer,integer) from public, anon;
grant  execute on function public.set_promotion_limits(uuid,integer,integer,integer) to authenticated;
