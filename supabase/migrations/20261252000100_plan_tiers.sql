-- Basic and Plus, as a fact the catalogue can state.
-- Decided 2026-10-22: "a plan on top of the basic plan with more features, more
-- like the vip package."
--
-- `plans.tier` was added when offline downloads were built, because a rule that
-- says "a Plus plan" had to be able to name one. What was missing is any way to
-- *say* it: `create_plan()` wrote a plan with no tier, so every plan shipped as
-- basic and the VIP shelf could not be created from the screen that creates
-- plans. That is the whole defect — a column nobody can set is a column that
-- does not exist.
--
-- Three writers, and one rule that ties them together:
--
--   * `create_plan()` takes a tier, so a new plan is born on the right shelf;
--   * `set_plan_tier()` moves an existing plan, because a plan that was drafted
--     as Basic and turns out to be the VIP one should not need a new code;
--   * `add_plan_entitlement()` **refuses a Plus-only feature on a Basic plan**,
--     which is what makes the tier mean something rather than merely label it.
--
-- The last of those is the important one. Without it there would be two
-- independent ways to hand out offline downloads — the tier and the feature
-- grant — and a mismatch between them would be silent. With it, the tier is the
-- gate and the grant is the content, and the only way to give a Basic plan the
-- download feature is to make it a Plus plan on purpose, on an audited screen.
--
-- A downgrade is refused while the plan's versions still carry a Plus-only
-- feature. Otherwise a Plus plan could become Basic while its live terms still
-- grant the feature, and a learner on it would keep a benefit the catalogue says
-- they do not have.

-- ---------------------------------------------------------------------------
-- which features belong to which shelf
-- ---------------------------------------------------------------------------
-- Closed on purpose, and read by `add_plan_entitlement()`. Adding a Plus-only
-- feature means adding it here first, which is the same discipline the feature
-- vocabulary already follows: a code nothing reads is a plan that promises
-- nothing.
create or replace function public.plan_feature_requires_tier(p_feature_code text)
returns text
language sql
immutable
as $$
  select case
    when upper(btrim(coalesce(p_feature_code, ''))) = '' then 'basic'
    when p_feature_code = 'offline_downloads' then 'plus'
    else 'basic'
  end;
$$;

comment on function public.plan_feature_requires_tier(text) is
  'The lowest plan tier that may carry a feature code. A feature that is not '
  'listed here is available on any tier, which is the safe default: an unknown '
  'code cannot accidentally be restricted to a shelf nobody is on.';

revoke all on function public.plan_feature_requires_tier(text) from public, anon;
grant execute on function public.plan_feature_requires_tier(text) to authenticated;

-- ---------------------------------------------------------------------------
-- create_plan, with a shelf
-- ---------------------------------------------------------------------------
-- The three-argument version has to go, not merely be superseded: a function
-- with a defaulted fourth parameter *and* a three-parameter one makes every
-- three-argument call ambiguous, and PostgreSQL refuses to choose. Dropping it
-- also means the grant below is the only door in.
drop function if exists public.create_plan(text, text, text);

create or replace function public.create_plan(
  p_code text,
  p_name text,
  p_description text default null,
  p_tier text default 'basic'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
  v_tier  text := lower(btrim(coalesce(p_tier, 'basic')));
  v_id    uuid;
begin
  if v_actor is null or not public.is_privileged(v_actor) then
    raise exception 'only platform staff may create a plan'
      using errcode = 'insufficient_privilege';
  end if;
  if coalesce(btrim(p_code), '') !~ '^[a-z0-9][a-z0-9_-]*$' then
    raise exception 'use a lowercase plan code with letters, numbers, hyphens or underscores'
      using errcode = 'invalid_parameter_value';
  end if;
  if coalesce(btrim(p_name), '') = '' then
    raise exception 'a plan needs a name'
      using errcode = 'invalid_parameter_value';
  end if;
  if length(btrim(p_name)) > 160 then
    raise exception 'keep the plan name under 160 characters'
      using errcode = 'invalid_parameter_value';
  end if;
  if v_tier not in ('basic', 'plus') then
    raise exception 'a plan is either basic or plus; % is neither', p_tier
      using errcode = 'invalid_parameter_value';
  end if;

  insert into public.plans (code, name, description, status, tier)
  values (btrim(p_code), btrim(p_name),
          nullif(btrim(coalesce(p_description, '')), ''), 'draft', v_tier)
  returning id into v_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'plan.created', 'plan', v_id,
          jsonb_build_object('code', btrim(p_code), 'tier', v_tier));
  return v_id;
end;
$$;

revoke all on function public.create_plan(text, text, text, text) from public, anon;
grant execute on function public.create_plan(text, text, text, text) to authenticated;

comment on function public.create_plan(text, text, text, text) is
  'Creates a draft plan on a shelf. Basic is the default — so a plan created '
  'without thinking about tiers is never accidentally the VIP one, and every '
  'existing three-argument caller keeps working through the default.';

-- ---------------------------------------------------------------------------
-- move a plan between shelves
-- ---------------------------------------------------------------------------
create or replace function public.set_plan_tier(
  p_plan_id uuid,
  p_tier    text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor  uuid := public.current_user_id();
  v_tier   text := lower(btrim(coalesce(p_tier, '')));
  v_plan   public.plans;
  v_before text;
  v_feature text;
begin
  if v_actor is null or not public.is_privileged(v_actor) then
    raise exception 'only platform staff may change a plan tier'
      using errcode = 'insufficient_privilege';
  end if;
  if v_tier not in ('basic', 'plus') then
    raise exception 'a plan is either basic or plus; % is neither', p_tier
      using errcode = 'invalid_parameter_value';
  end if;

  select * into v_plan from public.plans where id = p_plan_id and deleted_at is null;
  if not found then
    raise exception 'that plan does not exist' using errcode = 'no_data_found';
  end if;

  v_before := v_plan.tier;

  if v_tier = v_before then
    return jsonb_build_object(
      'planId', p_plan_id, 'tier', v_tier, 'changed', false,
      'message', 'that plan is already on the ' || v_tier || ' shelf');
  end if;

  -- A downgrade that would strand a benefit. The feature is granted by the
  -- version, so a Basic plan whose live terms still carry it would keep handing
  -- it out while the catalogue said otherwise.
  if v_before = 'plus' and v_tier = 'basic' then
    select pe.feature_code into v_feature
      from public.plan_entitlements pe
      join public.plan_versions pv on pv.id = pe.plan_version_id
      join public.plans p on p.id = pv.plan_id
     where p.id = p_plan_id
       and pe.scope_type = 'feature'
       and public.plan_feature_requires_tier(pe.feature_code) = 'plus'
     limit 1;

    if v_feature is not null then
      raise exception
        'this plan still carries %, which only a plus plan may grant; remove it from its terms first',
        v_feature
        using errcode = 'check_violation';
    end if;
  end if;

  update public.plans set tier = v_tier where id = p_plan_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'plan.tier_changed', 'plan', p_plan_id,
          jsonb_build_object('from', v_before, 'to', v_tier));

  return jsonb_build_object('planId', p_plan_id, 'tier', v_tier, 'changed', true);
end;
$$;

revoke all on function public.set_plan_tier(uuid, text) from public, anon;
grant execute on function public.set_plan_tier(uuid, text) to authenticated;

comment on function public.set_plan_tier(uuid, text) is
  'Moves a plan between basic and plus, audited. A downgrade is refused while '
  'the plan''s terms still carry a Plus-only feature, because a Basic plan that '
  'grants a Plus benefit is a contradiction the catalogue would be lying about.';

-- ---------------------------------------------------------------------------
-- a Basic plan cannot carry a Plus feature
-- ---------------------------------------------------------------------------
create or replace function public.add_plan_entitlement(
  p_plan_version_id uuid,
  p_scope_type text,
  p_subject_area_id uuid default null,
  p_product_id uuid default null,
  p_feature_code text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor   uuid := public.current_user_id();
  v_status  text;
  v_plan    uuid;
  v_tier    text;
  v_code    text := nullif(btrim(coalesce(p_feature_code, '')), '');
  v_required text;
  v_id      uuid;
begin
  if v_actor is null or not public.is_privileged(v_actor) then
    raise exception 'only platform staff may add plan entitlements'
      using errcode = 'insufficient_privilege';
  end if;

  select pv.status, pv.plan_id, p.tier
    into v_status, v_plan, v_tier
    from public.plan_versions pv
    join public.plans p on p.id = pv.plan_id
   where pv.id = p_plan_version_id
   for update of pv;

  if v_status is null then
    raise exception 'plan version % not found', p_plan_version_id
      using errcode = 'no_data_found';
  end if;
  if v_status <> 'draft' then
    raise exception 'entitlements can only be changed on a draft plan version'
      using errcode = 'check_violation';
  end if;

  if coalesce(p_scope_type,'') not in ('catalogue','product','feature') then
    raise exception 'unsupported plan entitlement scope: %', p_scope_type
      using errcode = 'invalid_parameter_value';
  end if;

  if p_scope_type='catalogue' and (p_subject_area_id is null or p_product_id is not null or v_code is not null) then
    raise exception 'a catalogue entitlement needs exactly one subject area'
      using errcode = 'invalid_parameter_value';
  elsif p_scope_type='product' and (p_product_id is null or p_subject_area_id is not null or v_code is not null) then
    raise exception 'a product entitlement needs exactly one product'
      using errcode = 'invalid_parameter_value';
  elsif p_scope_type='feature' and (v_code is null or p_subject_area_id is not null or p_product_id is not null) then
    raise exception 'a feature entitlement needs exactly one feature code'
      using errcode = 'invalid_parameter_value';
  end if;

  -- The rule the tier exists for.
  if v_code is not null then
    v_required := public.plan_feature_requires_tier(v_code);
    if v_required = 'plus' and v_tier <> 'plus' then
      raise exception
        '% is a plus feature; move this plan to the plus shelf first',
        v_code
        using errcode = 'check_violation';
    end if;
  end if;

  insert into public.plan_entitlements
    (plan_version_id,scope_type,subject_area_id,product_id,feature_code)
  values
    (p_plan_version_id,p_scope_type,p_subject_area_id,p_product_id,v_code)
  returning id into v_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'plan.entitlement_added', 'plan_version', p_plan_version_id,
          jsonb_build_object('scope_type',p_scope_type,'subject_area_id',p_subject_area_id,
                             'product_id',p_product_id,'feature_code',v_code,
                             'plan_tier',v_tier));
  return v_id;
end;
$$;

revoke all on function public.add_plan_entitlement(uuid, text, uuid, uuid, text) from public, anon;
grant execute on function public.add_plan_entitlement(uuid, text, uuid, uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- and a grant must be revocable, or the shelf rule has no way out
-- ---------------------------------------------------------------------------
-- A downgrade is refused while the feature is on the plan, which is only a
-- sensible rule if the feature can be taken off again. Until now nothing could
-- remove an entitlement, so a plan that was given the wrong one on a draft had
-- no route back: the draft was simply abandoned and a new code invented. That
-- is the same defect as a tier nobody can set, one layer down.
create or replace function public.remove_plan_entitlement(p_entitlement_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor  uuid := public.current_user_id();
  v_plan_version uuid;
  v_status text;
  v_code   text;
begin
  if v_actor is null or not public.is_privileged(v_actor) then
    raise exception 'only platform staff may remove plan entitlements'
      using errcode = 'insufficient_privilege';
  end if;

  select pe.plan_version_id, pe.feature_code, pv.status
    into v_plan_version, v_code, v_status
    from public.plan_entitlements pe
    join public.plan_versions pv on pv.id = pe.plan_version_id
   where pe.id = p_entitlement_id
   for update of pv;

  if v_plan_version is null then
    raise exception 'that entitlement does not exist'
      using errcode = 'no_data_found';
  end if;
  if v_status <> 'draft' then
    raise exception 'entitlements can only be changed on a draft plan version'
      using errcode = 'check_violation';
  end if;

  delete from public.plan_entitlements where id = p_entitlement_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'plan.entitlement_removed', 'plan_version', v_plan_version,
          jsonb_build_object('feature_code', v_code));
  return p_entitlement_id;
end;
$$;

revoke all on function public.remove_plan_entitlement(uuid) from public, anon;
grant execute on function public.remove_plan_entitlement(uuid) to authenticated;

comment on function public.remove_plan_entitlement(uuid) is
  'Takes an entitlement off a draft plan version. Needed so that a plan which '
  'was given a Plus-only feature can be moved back to the Basic shelf.'
