-- Let staff configure the subscription catalogue without editing rows by hand.
--
-- This is only the offer-definition side. Creating a subscription or renewing
-- one still requires the payment/callback path; this migration does not claim
-- that provider credentials exist or that a subscription is paid.

create or replace function public.create_plan(
  p_code text,
  p_name text,
  p_description text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
  v_id uuid;
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

  insert into public.plans (code, name, description, status)
  values (btrim(p_code), btrim(p_name), nullif(btrim(coalesce(p_description, '')), ''), 'draft')
  returning id into v_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'plan.created', 'plan', v_id,
          jsonb_build_object('code', btrim(p_code)));
  return v_id;
end;
$$;

revoke all on function public.create_plan(text, text, text) from public;
grant execute on function public.create_plan(text, text, text) to authenticated;

create or replace function public.create_plan_version(
  p_plan_id uuid,
  p_child_allowance integer default 0,
  p_adult_allowance integer default 1,
  p_billing_interval text default 'month',
  p_change_summary text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
  v_number integer;
  v_id uuid;
begin
  if v_actor is null or not public.is_privileged(v_actor) then
    raise exception 'only platform staff may create a plan version'
      using errcode = 'insufficient_privilege';
  end if;
  if not exists (select 1 from public.plans where id=p_plan_id and deleted_at is null and status <> 'retired') then
    raise exception 'plan % not found or retired', p_plan_id using errcode = 'no_data_found';
  end if;
  if p_child_allowance is null or p_child_allowance < 0
     or p_adult_allowance is null or p_adult_allowance < 0 then
    raise exception 'learner allowances cannot be negative'
      using errcode = 'invalid_parameter_value';
  end if;
  if coalesce(p_billing_interval,'') not in ('week','month','quarter','year') then
    raise exception 'subscription plans require a recurring interval: week, month, quarter or year'
      using errcode = 'invalid_parameter_value';
  end if;

  -- Serialize version-number assignment for this plan.
  perform 1 from public.plans where id=p_plan_id for update;
  select coalesce(max(version_number),0)+1 into v_number
    from public.plan_versions where plan_id=p_plan_id;

  insert into public.plan_versions
    (plan_id, version_number, child_allowance, adult_allowance,
     billing_interval, status, change_summary)
  values
    (p_plan_id, v_number, p_child_allowance, p_adult_allowance,
     p_billing_interval, 'draft', nullif(btrim(coalesce(p_change_summary,'')),''))
  returning id into v_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'plan.version_created', 'plan_version', v_id,
          jsonb_build_object('plan_id',p_plan_id,'version_number',v_number,
                             'billing_interval',p_billing_interval));
  return v_id;
end;
$$;

revoke all on function public.create_plan_version(uuid, integer, integer, text, text) from public;
grant execute on function public.create_plan_version(uuid, integer, integer, text, text) to authenticated;

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
  v_actor uuid := public.current_user_id();
  v_status text;
  v_id uuid;
begin
  if v_actor is null or not public.is_privileged(v_actor) then
    raise exception 'only platform staff may add plan entitlements'
      using errcode = 'insufficient_privilege';
  end if;
  select status into v_status from public.plan_versions where id=p_plan_version_id for update;
  if not found then
    raise exception 'plan version % not found', p_plan_version_id using errcode = 'no_data_found';
  end if;
  if v_status <> 'draft' then
    raise exception 'entitlements can only be changed on a draft plan version'
      using errcode = 'check_violation';
  end if;
  if coalesce(p_scope_type,'') not in ('catalogue','product','feature') then
    raise exception 'unsupported plan entitlement scope: %', p_scope_type
      using errcode = 'invalid_parameter_value';
  end if;

  if p_scope_type='catalogue' and (p_subject_area_id is null or p_product_id is not null or p_feature_code is not null) then
    raise exception 'a catalogue entitlement needs exactly one subject area'
      using errcode = 'invalid_parameter_value';
  elsif p_scope_type='product' and (p_product_id is null or p_subject_area_id is not null or p_feature_code is not null) then
    raise exception 'a product entitlement needs exactly one product'
      using errcode = 'invalid_parameter_value';
  elsif p_scope_type='feature' and (coalesce(btrim(p_feature_code),'')='' or p_subject_area_id is not null or p_product_id is not null) then
    raise exception 'a feature entitlement needs exactly one feature code'
      using errcode = 'invalid_parameter_value';
  end if;

  insert into public.plan_entitlements
    (plan_version_id,scope_type,subject_area_id,product_id,feature_code)
  values
    (p_plan_version_id,p_scope_type,p_subject_area_id,p_product_id,nullif(btrim(coalesce(p_feature_code,'')),''))
  returning id into v_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'plan.entitlement_added', 'plan_version', p_plan_version_id,
          jsonb_build_object('scope_type',p_scope_type,'subject_area_id',p_subject_area_id,
                             'product_id',p_product_id,'feature_code',p_feature_code));
  return v_id;
end;
$$;

revoke all on function public.add_plan_entitlement(uuid, text, uuid, uuid, text) from public;
grant execute on function public.add_plan_entitlement(uuid, text, uuid, uuid, text) to authenticated;

create or replace function public.set_plan_price(
  p_plan_version_id uuid,
  p_amount_minor bigint,
  p_currency_code text,
  p_market text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
  v_interval text;
  v_price uuid;
begin
  if v_actor is null or not public.is_privileged(v_actor) then
    raise exception 'only platform staff may set a plan price'
      using errcode = 'insufficient_privilege';
  end if;
  select billing_interval into v_interval
    from public.plan_versions where id=p_plan_version_id and status='draft' for update;
  if not found then
    raise exception 'a price can only be set on a draft plan version'
      using errcode = 'check_violation';
  end if;
  if p_amount_minor is null or p_amount_minor < 0 then
    raise exception 'a price cannot be negative' using errcode = 'invalid_parameter_value';
  end if;
  if p_currency_code is null or p_currency_code !~ '^[A-Z]{3}$' then
    raise exception 'the currency must be a three-letter uppercase ISO code'
      using errcode = 'invalid_parameter_value';
  end if;
  if p_market is not null and p_market !~ '^[A-Z]{2}$' then
    raise exception 'the market must be a two-letter uppercase country code'
      using errcode = 'invalid_parameter_value';
  end if;
  if v_interval='one_time' then
    raise exception 'subscription plan versions require a recurring interval'
      using errcode = 'invalid_parameter_value';
  end if;

  update public.prices
     set status='retired', effective_until=now()
   where plan_version_id=p_plan_version_id and status='active'
     and coalesce(market,'')=coalesce(p_market,'') and effective_until is null;

  insert into public.prices
    (plan_version_id,amount_minor,currency_code,billing_interval,market,status)
  values
    (p_plan_version_id,p_amount_minor,p_currency_code,v_interval,p_market,'active')
  returning id into v_price;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'plan.price_set', 'plan_version', p_plan_version_id,
          jsonb_build_object('amount_minor',p_amount_minor,'currency_code',p_currency_code,
                             'billing_interval',v_interval,'market',p_market));
  return v_price;
end;
$$;

revoke all on function public.set_plan_price(uuid, bigint, text, text) from public;
grant execute on function public.set_plan_price(uuid, bigint, text, text) to authenticated;

create or replace function public.activate_plan_version(p_plan_version_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
  v_plan uuid;
  v_status text;
  v_entitlements integer;
  v_prices integer;
begin
  if v_actor is null or not public.is_privileged(v_actor) then
    raise exception 'only platform staff may activate a plan version'
      using errcode = 'insufficient_privilege';
  end if;
  select plan_id,status into v_plan,v_status
    from public.plan_versions where id=p_plan_version_id for update;
  if not found then
    raise exception 'plan version % not found',p_plan_version_id using errcode='no_data_found';
  end if;
  if v_status='active' then return false; end if;
  if v_status='retired' then
    raise exception 'a retired plan version cannot be activated' using errcode='check_violation';
  end if;

  select count(*) into v_entitlements from public.plan_entitlements
   where plan_version_id=p_plan_version_id;
  if v_entitlements=0 then
    raise exception 'a plan version needs at least one entitlement before activation'
      using errcode='check_violation';
  end if;
  select count(*) into v_prices from public.prices
   where plan_version_id=p_plan_version_id and status='active' and effective_until is null;
  if v_prices=0 then
    raise exception 'a plan version needs an active price before activation'
      using errcode='check_violation';
  end if;
  if not exists(select 1 from public.plans where id=v_plan and status<>'retired' and deleted_at is null) then
    raise exception 'the parent plan is retired' using errcode='check_violation';
  end if;

  update public.plan_versions set status='active', effective_from=coalesce(effective_from,now())
   where id=p_plan_version_id;
  update public.plans set status='active' where id=v_plan;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'plan.version_activated', 'plan_version', p_plan_version_id,
          jsonb_build_object('entitlements',v_entitlements,'active_prices',v_prices));
  return true;
end;
$$;

revoke all on function public.activate_plan_version(uuid) from public;
grant execute on function public.activate_plan_version(uuid) to authenticated;

comment on function public.create_plan(text,text,text) is
  'Creates a draft subscription plan. Staff only.';
comment on function public.create_plan_version(uuid,integer,integer,text,text) is
  'Creates the next draft terms version; version numbering is serialized per plan.';
comment on function public.add_plan_entitlement(uuid,text,uuid,uuid,text) is
  'Adds a type-checked entitlement to a draft plan version.';
comment on function public.set_plan_price(uuid,bigint,text,text) is
  'Sets a recurring integer-minor-unit plan price; supersedes the prior active price for the same market.';
comment on function public.activate_plan_version(uuid) is
  'Activates a plan version only when it has at least one entitlement and an active recurring price.';
