-- Promotions: who may run one, where it applies, and what it is worth there.
--
-- The owner's rule (2026-10-22): promotions are managed by the platform owner
-- and sometimes by teachers; different promotions can run in different regions
-- and countries; and prices already differ by market because currencies do not
-- carry the same weight and living costs differ. That last part is not a new
-- idea here — `prices.market` has been a country code since 2026-10-22 — but it
-- decides two things about a promotion:
--
--   ONE. A percentage applies to the local price. Ten percent off is ten
--   percent in Kampala and in Nairobi, and the discount is whatever that is in
--   each currency. Nothing is converted.
--
--   TWO. A fixed amount carries a currency. "5 000 off" is a different gift in
--   UGX and in KES, so a fixed-amount campaign may only name markets whose
--   live price for that course is in its own currency. A campaign that names a
--   shilling amount and a dollar market is refused at creation, not at
--   checkout, because the checkout refusal would look like a broken code to a
--   family who was told about it.
--
-- The table that already existed (`promotion_campaigns`) had one
-- `eligible_market` column and no owner. Two tables are added rather than
-- columns repeated: a campaign names any number of markets, and a teacher
-- campaign names the courses it may be used on. An empty market set means
-- "everywhere the course is sold"; an empty course set means "every course"
-- and is a platform-only privilege.

-- ---------------------------------------------------------------------------
-- Ownership
-- ---------------------------------------------------------------------------
alter table public.promotion_campaigns
  add column if not exists owner_type text not null default 'platform'
    check (owner_type in ('platform', 'teacher')),
  add column if not exists instructor_id uuid
    references public.user_profiles (user_id) on delete restrict;

alter table public.promotion_campaigns
  drop constraint if exists pc_owner_agrees;
alter table public.promotion_campaigns
  add constraint pc_owner_agrees check (
    (owner_type = 'teacher') = (instructor_id is not null)
  );

comment on column public.promotion_campaigns.owner_type is
  'Who answers for the campaign: the platform, or the teacher whose course it discounts.';
comment on column public.promotion_campaigns.eligible_market is
  'Superseded by promotion_campaign_markets. Kept because the column exists; new writers do not read it.';

-- ---------------------------------------------------------------------------
-- Where it applies
-- ---------------------------------------------------------------------------
create table if not exists public.promotion_campaign_markets (
  campaign_id uuid not null
    references public.promotion_campaigns (id) on delete cascade,

  -- ISO 3166-1 alpha-2, the same grain as prices.market. A "region" is several
  -- rows; no separate concept is needed for one.
  market text not null check (market ~ '^[A-Z]{2}$'),

  primary key (campaign_id, market)
);

comment on table public.promotion_campaign_markets is
  'Countries a campaign applies in. No rows means every market the course is sold in.';

create table if not exists public.promotion_campaign_courses (
  campaign_id uuid not null
    references public.promotion_campaigns (id) on delete cascade,

  course_id uuid not null
    references public.courses (id) on delete cascade,

  primary key (campaign_id, course_id)
);

comment on table public.promotion_campaign_courses is
  'Courses a campaign may be used on. No rows means every course, which only the platform may do.';

-- ---------------------------------------------------------------------------
-- Who may create one, and what it may say
-- ---------------------------------------------------------------------------
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
  p_new_customers_only boolean default false
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
     per_user_limit, new_customers_only, status, owner_type, instructor_id,
     created_by)
  values
    (v_code, v_name, null, p_starts_at, p_ends_at, p_total_limit,
     p_per_user_limit, coalesce(p_new_customers_only, false), 'draft', v_owner,
     v_instructor, v_actor)
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

comment on function public.create_promotion_campaign(text,text,text,numeric,bigint,text,text[],uuid[],timestamptz,timestamptz,integer,integer,boolean) is
  'The only supported way to create a campaign. Derives the owner from the actor, checks that a teacher only discounts their own courses, and refuses a fixed amount in a market priced in another currency.';

-- ---------------------------------------------------------------------------
-- Switching it on
-- ---------------------------------------------------------------------------
create or replace function public.set_promotion_campaign_status(
  p_campaign_id uuid,
  p_status      text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor    uuid := public.current_user_id();
  v_campaign public.promotion_campaigns;
  v_status   text := lower(btrim(coalesce(p_status, '')));
begin
  if v_actor is null then
    raise exception 'sign in to change a promotion'
      using errcode = 'insufficient_privilege';
  end if;

  select * into v_campaign from public.promotion_campaigns where id = p_campaign_id for update;
  if not found then
    raise exception 'no promotion campaign %', p_campaign_id
      using errcode = 'no_data_found';
  end if;

  if not (public.has_role(v_actor, 'platform_admin')
          or (v_campaign.owner_type = 'teacher' and v_campaign.instructor_id = v_actor)) then
    raise exception 'only the owner of this campaign may change its status'
      using errcode = 'insufficient_privilege';
  end if;

  if v_status not in ('draft', 'active', 'paused', 'archived') then
    -- `expired` is a fact about the clock, not a status a person sets.
    raise exception 'a campaign is draft, active, paused or archived; % is not one of them', v_status
      using errcode = 'invalid_parameter_value';
  end if;

  if v_status = v_campaign.status then
    return v_status;
  end if;

  update public.promotion_campaigns
     set status = v_status,
         updated_at = now()
   where id = p_campaign_id
  returning status into v_status;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'promotion.status_changed', 'promotion_campaign', p_campaign_id,
          jsonb_build_object('from', v_campaign.status, 'to', v_status));

  return v_status;
end;
$$;

comment on function public.set_promotion_campaign_status(uuid,text) is
  'Draft, active, paused or archived, changed only by the platform owner or the teacher who owns the campaign.';

-- ---------------------------------------------------------------------------
-- Access
-- ---------------------------------------------------------------------------
-- The writer is the only way in. The direct write policies that the first
-- promotions migration added are dropped: a staff member could otherwise insert
-- a campaign that skips every check above, and a validation that only one path
-- honours is not a rule.
drop policy if exists promotion_campaigns_write on public.promotion_campaigns;
drop policy if exists promotion_campaigns_update on public.promotion_campaigns;

-- Reading stays open to staff (the existing policy) and now includes a teacher's
-- own campaigns, which they need in order to manage them.
drop policy if exists promotion_campaigns_owner_read on public.promotion_campaigns;
create policy promotion_campaigns_owner_read on public.promotion_campaigns
  for select to authenticated
  using (instructor_id = public.current_user_id());

alter table public.promotion_campaign_markets enable row level security;
alter table public.promotion_campaign_courses enable row level security;

drop policy if exists promotion_campaign_markets_read on public.promotion_campaign_markets;
create policy promotion_campaign_markets_read on public.promotion_campaign_markets
  for select to authenticated
  using (
    public.is_privileged(public.current_user_id())
    or exists (
      select 1 from public.promotion_campaigns pc
       where pc.id = campaign_id and pc.instructor_id = public.current_user_id()
    )
  );

drop policy if exists promotion_campaign_courses_read on public.promotion_campaign_courses;
create policy promotion_campaign_courses_read on public.promotion_campaign_courses
  for select to authenticated
  using (
    public.is_privileged(public.current_user_id())
    or exists (
      select 1 from public.promotion_campaigns pc
       where pc.id = campaign_id and pc.instructor_id = public.current_user_id()
    )
  );

revoke execute on function public.create_promotion_campaign(text,text,text,numeric,bigint,text,text[],uuid[],timestamptz,timestamptz,integer,integer,boolean) from public, anon;
grant  execute on function public.create_promotion_campaign(text,text,text,numeric,bigint,text,text[],uuid[],timestamptz,timestamptz,integer,integer,boolean) to authenticated;

revoke execute on function public.set_promotion_campaign_status(uuid,text) from public, anon;
grant  execute on function public.set_promotion_campaign_status(uuid,text) to authenticated;
