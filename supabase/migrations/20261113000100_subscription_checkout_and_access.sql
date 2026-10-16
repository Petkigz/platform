-- Subscription checkout, payment-confirmed start, learner allocation, cancellation.
--
-- Payment state, subscription state and entitlements remain separate. A pending
-- order creates a pending subscription but grants no access. Only the existing
-- verified payment-confirmation writer moves it to active; that status change
-- then allocates the selected learner and creates time-bounded grants.

alter table public.orders
  add column if not exists placed_by uuid references public.user_profiles(user_id) on delete set null;

alter table public.subscriptions
  add column if not exists origin_order_item_id uuid references public.order_items(id) on delete restrict;
create unique index if not exists subscriptions_origin_order_item_key
  on public.subscriptions(origin_order_item_id)
  where origin_order_item_id is not null;

-- A client cannot directly create a subscription or change the state/terms that
-- determine access. Trusted writers set this transaction-local marker; it is
-- the same pattern already used by the media and refund state machines.
create or replace function public.guard_subscription_state_writer()
returns trigger
language plpgsql
as $$
declare
  v_trusted boolean := current_setting('app.subscription_writer', true) = 'on';
begin
  if not v_trusted then
    if tg_op = 'INSERT' then
      raise exception 'subscriptions are created by the checkout/payment workflow'
        using errcode='insufficient_privilege';
    end if;
    if row(new.billing_account_id,new.plan_id,new.plan_version_id,new.status,
           new.started_at,new.current_period_start,new.current_period_end,
           new.cancelled_at,new.cancel_reason,new.origin_order_item_id)
       is distinct from
       row(old.billing_account_id,old.plan_id,old.plan_version_id,old.status,
           old.started_at,old.current_period_start,old.current_period_end,
           old.cancelled_at,old.cancel_reason,old.origin_order_item_id) then
      raise exception 'subscription state changes must use the subscription workflow'
        using errcode='insufficient_privilege';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists subscriptions_state_writer_guard on public.subscriptions;
create trigger subscriptions_state_writer_guard
  before insert or update on public.subscriptions
  for each row execute function public.guard_subscription_state_writer();

-- Give status history the session actor where a user initiated the change;
-- provider callbacks have no human actor and remain NULL by design.
create or replace function public.record_subscription_status_change()
returns trigger
language plpgsql
as $$
begin
  insert into public.subscription_history
    (subscription_id, from_status, to_status, reason, changed_by)
  values (new.id, old.status, new.status, new.cancel_reason, public.current_user_id());
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Start checkout for one active plan version and one learner.
-- ---------------------------------------------------------------------------
create or replace function public.create_plan_order(
  p_billing_account_id uuid,
  p_plan_version_id uuid,
  p_price_id uuid,
  p_learner_profile_id uuid
)
returns table(order_id uuid, subscription_id uuid, amount_minor bigint, currency_code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
  v_plan uuid;
  v_interval text;
  v_child_allowance integer;
  v_adult_allowance integer;
  v_price public.prices;
  v_learner_type text;
  v_learner_user uuid;
  v_order uuid;
  v_item uuid;
  v_subscription uuid;
begin
  if v_actor is null then
    raise exception 'sign in to start a subscription'
      using errcode='insufficient_privilege';
  end if;
  if not exists(
    select 1 from public.billing_accounts ba
    join public.billing_account_memberships bam on bam.billing_account_id=ba.id
    where ba.id=p_billing_account_id and ba.status='active' and ba.deleted_at is null
      and bam.user_id=v_actor and bam.status='active'
      and bam.can_manage_payment_methods
  ) then
    raise exception 'you cannot pay from that billing account'
      using errcode='insufficient_privilege';
  end if;

  select pv.plan_id,pv.billing_interval,pv.child_allowance,pv.adult_allowance
    into v_plan,v_interval,v_child_allowance,v_adult_allowance
    from public.plan_versions pv join public.plans p on p.id=pv.plan_id
   where pv.id=p_plan_version_id and pv.status='active'
     and p.status='active' and p.deleted_at is null;
  if not found then
    raise exception 'that plan version is not currently available'
      using errcode='no_data_found';
  end if;

  select * into v_price from public.prices p
   where p.id=p_price_id and p.plan_version_id=p_plan_version_id
     and p.status='active' and p.effective_until is null
     and p.billing_interval=v_interval
     and (p.effective_from is null or p.effective_from<=now());
  if not found then
    raise exception 'that price is not currently available for this plan version'
      using errcode='invalid_parameter_value';
  end if;
  if v_price.market is not null and not exists(
    select 1 from public.billing_accounts ba
     where ba.id=p_billing_account_id and ba.billing_country=v_price.market
  ) then
    raise exception 'that price is not available in the billing account country'
      using errcode='invalid_parameter_value';
  end if;

  select learner_type,linked_user_id into v_learner_type,v_learner_user
    from public.learner_profiles
   where id=p_learner_profile_id and status='active' and deleted_at is null;
  if not found then
    raise exception 'that learner profile is not available'
      using errcode='no_data_found';
  end if;
  if v_learner_type='adult' then
    if v_adult_allowance<1 then
      raise exception 'this plan has no adult learner slots'
        using errcode='check_violation';
    end if;
    if v_learner_user is distinct from v_actor then
      raise exception 'an adult subscription slot may only be assigned to your own learner profile'
        using errcode='insufficient_privilege';
    end if;
  else
    if v_child_allowance<1 then
      raise exception 'this plan has no child learner slots'
        using errcode='check_violation';
    end if;
    if not public.is_learner_family_member(p_learner_profile_id) then
      raise exception 'only an active family member may select this child'
        using errcode='insufficient_privilege';
    end if;
  end if;

  -- Prevent two overlapping subscriptions for one plan in one billing account.
  -- Cancelled access remains live until the paid period ends, so it also blocks
  -- a duplicate during that remaining period.
  if exists(
    select 1 from public.subscriptions s
    where s.billing_account_id=p_billing_account_id and s.plan_id=v_plan
      and (s.status='pending' or s.current_period_end>now())
  ) then
    raise exception 'this billing account already has a pending or unexpired subscription to that plan'
      using errcode='unique_violation';
  end if;

  perform set_config('app.subscription_writer','on',true);
  insert into public.orders
    (billing_account_id,currency_code,subtotal_minor,discount_minor,tax_minor,total_minor,
     status,placed_at,placed_by)
  values
    (p_billing_account_id,v_price.currency_code,v_price.amount_minor,0,0,v_price.amount_minor,
     'pending_payment',now(),v_actor)
  returning id into v_order;

  insert into public.order_items
    (order_id,plan_version_id,price_id,quantity,unit_price_minor,currency_code,
     discount_minor,line_total_minor,item_snapshot)
  values
    (v_order,p_plan_version_id,p_price_id,1,v_price.amount_minor,v_price.currency_code,
     0,v_price.amount_minor,
     jsonb_build_object('kind','subscription','plan_id',v_plan,
       'plan_version_id',p_plan_version_id,'billing_interval',v_interval,
       'learner_profile_id',p_learner_profile_id,'price_id',p_price_id))
  returning id into v_item;

  insert into public.subscriptions
    (billing_account_id,plan_id,plan_version_id,status,origin_order_item_id)
  values (p_billing_account_id,v_plan,p_plan_version_id,'pending',v_item)
  returning id into v_subscription;

  insert into public.subscription_items(subscription_id,price_id,quantity,status)
  values(v_subscription,p_price_id,1,'active');

  insert into public.subscription_history
    (subscription_id,from_status,to_status,reason,changed_by)
  values(v_subscription,null,'pending','Checkout started',v_actor);

  update public.order_items
     set item_snapshot=item_snapshot||jsonb_build_object('subscription_id',v_subscription)
   where id=v_item;

  insert into public.governance_audit_events(actor,action,target_type,target_id,detail)
  values(v_actor,'subscription.checkout_started','subscription',v_subscription,
    jsonb_build_object('order_id',v_order,'plan_version_id',p_plan_version_id,
                       'learner_profile_id',p_learner_profile_id));

  return query select v_order,v_subscription,v_price.amount_minor,v_price.currency_code::text;
end;
$$;

revoke all on function public.create_plan_order(uuid,uuid,uuid,uuid) from public;
grant execute on function public.create_plan_order(uuid,uuid,uuid,uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Create time-bounded access grants for one allocated learner.
-- ---------------------------------------------------------------------------
create or replace function public.grant_subscription_plan_entitlements(
  p_subscription_id uuid,
  p_learner_profile_id uuid
)
returns integer
language plpgsql
security definer
set search_path=public
as $$
declare
  v_sub public.subscriptions;
  v_count integer:=0;
  v_n integer;
begin
  select * into v_sub from public.subscriptions where id=p_subscription_id and status='active';
  if not found then
    raise exception 'only an active subscription can grant plan access'
      using errcode='check_violation';
  end if;

  insert into public.entitlement_grants
    (learner_profile_id,scope_type,subject_area_id,source_type,source_id,status,effective_from,effective_until)
  select p_learner_profile_id,'subject',pe.subject_area_id,'subscription',p_subscription_id,
         'active',v_sub.current_period_start,v_sub.current_period_end
    from public.plan_entitlements pe
   where pe.plan_version_id=v_sub.plan_version_id and pe.scope_type='catalogue'
     and not exists(select 1 from public.entitlement_grants eg where eg.learner_profile_id=p_learner_profile_id
       and eg.scope_type='subject' and eg.subject_area_id=pe.subject_area_id
       and eg.source_type='subscription' and eg.source_id=p_subscription_id and eg.status='active');
  get diagnostics v_n=row_count; v_count:=v_count+v_n;

  insert into public.entitlement_grants
    (learner_profile_id,scope_type,feature_code,source_type,source_id,status,effective_from,effective_until)
  select p_learner_profile_id,'feature',pe.feature_code,'subscription',p_subscription_id,
         'active',v_sub.current_period_start,v_sub.current_period_end
    from public.plan_entitlements pe
   where pe.plan_version_id=v_sub.plan_version_id and pe.scope_type='feature'
     and not exists(select 1 from public.entitlement_grants eg where eg.learner_profile_id=p_learner_profile_id
       and eg.scope_type='feature' and eg.feature_code=pe.feature_code
       and eg.source_type='subscription' and eg.source_id=p_subscription_id and eg.status='active');
  get diagnostics v_n=row_count; v_count:=v_count+v_n;

  insert into public.entitlement_grants
    (learner_profile_id,scope_type,course_id,course_version_id,source_type,source_id,status,effective_from,effective_until)
  select p_learner_profile_id,'course_version',pcv.course_id,pcv.course_version_id,
         'subscription',p_subscription_id,'active',v_sub.current_period_start,v_sub.current_period_end
    from public.plan_entitlements pe
    join public.product_course_versions pcv on pcv.product_id=pe.product_id
   where pe.plan_version_id=v_sub.plan_version_id and pe.scope_type='product'
     and not exists(select 1 from public.entitlement_grants eg where eg.learner_profile_id=p_learner_profile_id
       and eg.scope_type='course_version' and eg.course_version_id=pcv.course_version_id
       and eg.source_type='subscription' and eg.source_id=p_subscription_id and eg.status='active');
  get diagnostics v_n=row_count; v_count:=v_count+v_n;

  if v_count>0 then
    insert into public.governance_audit_events(actor,action,target_type,target_id,detail)
    values(public.current_user_id(),'entitlement.granted','subscription',p_subscription_id,
      jsonb_build_object('learner_profile_id',p_learner_profile_id,'grants_created',v_count,
                         'effective_until',v_sub.current_period_end));
  end if;
  return v_count;
end;
$$;
revoke all on function public.grant_subscription_plan_entitlements(uuid,uuid) from public;

-- ---------------------------------------------------------------------------
-- Allocate another learner to an already-paid active household plan.
-- ---------------------------------------------------------------------------
create or replace function public.allocate_subscription_learner(
  p_subscription_id uuid,
  p_learner_profile_id uuid
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  v_actor uuid:=public.current_user_id();
  v_sub public.subscriptions;
  v_kind text;
  v_linked uuid;
  v_family uuid;
  v_allocation uuid;
begin
  if v_actor is null then
    raise exception 'sign in to allocate a learner'
      using errcode='insufficient_privilege';
  end if;
  select * into v_sub from public.subscriptions where id=p_subscription_id for update;
  if not found or v_sub.status<>'active' or v_sub.current_period_end<=now() then
    raise exception 'that subscription is not active'
      using errcode='check_violation';
  end if;
  if not public.is_billing_member(v_sub.billing_account_id) then
    raise exception 'you are not a member of this billing account'
      using errcode='insufficient_privilege';
  end if;
  select learner_type,linked_user_id,family_id into v_kind,v_linked,v_family
    from public.learner_profiles where id=p_learner_profile_id and status='active' and deleted_at is null;
  if not found then
    raise exception 'that learner profile is not available' using errcode='no_data_found';
  end if;
  if v_kind='adult' and v_linked is distinct from v_actor then
    raise exception 'an adult slot may only be assigned to your own learner profile'
      using errcode='insufficient_privilege';
  elsif v_kind='child' and not public.is_learner_family_member(p_learner_profile_id) then
    raise exception 'only an active family member may select this child'
      using errcode='insufficient_privilege';
  end if;

  if exists(select 1 from public.family_plan_allocations
    where subscription_id=p_subscription_id and learner_profile_id=p_learner_profile_id and status='active') then
    return (select id from public.family_plan_allocations where subscription_id=p_subscription_id
      and learner_profile_id=p_learner_profile_id and status='active' limit 1);
  end if;

  insert into public.family_plan_allocations
    (subscription_id,learner_profile_id,slot_type,effective_from,effective_until,status)
  values(p_subscription_id,p_learner_profile_id,
    case when v_kind='child' then 'child' else 'adult' end,
    now(),v_sub.current_period_end,'active')
  returning id into v_allocation;

  perform public.grant_subscription_plan_entitlements(p_subscription_id,p_learner_profile_id);
  insert into public.governance_audit_events(actor,action,target_type,target_id,detail)
  values(v_actor,'subscription.learner_allocated','subscription',p_subscription_id,
    jsonb_build_object('learner_profile_id',p_learner_profile_id,'allocation_id',v_allocation,'family_id',v_family));
  return v_allocation;
end;
$$;
revoke all on function public.allocate_subscription_learner(uuid,uuid) from public;
grant execute on function public.allocate_subscription_learner(uuid,uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- A payment-confirmed pending subscription becomes active and grants its first
-- selected learner access only for the paid period.
-- ---------------------------------------------------------------------------
create or replace function public.activate_paid_plan_order()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  v_sub public.subscriptions;
  v_item record;
  v_start timestamptz;
  v_end timestamptz;
  v_learner uuid;
  v_kind text;
  v_alloc uuid;
begin
  if new.status<>'paid' or old.status='paid' then return new; end if;

  for v_item in
    select oi.id,oi.plan_version_id,oi.item_snapshot,oi.order_id
      from public.order_items oi
     where oi.order_id=new.id and oi.plan_version_id is not null
  loop
    select * into v_sub from public.subscriptions where origin_order_item_id=v_item.id for update;
    if not found then
      raise exception 'plan order item % has no pending subscription',v_item.id
        using errcode='check_violation';
    end if;
    if v_sub.status<>'pending' then
      raise exception 'plan subscription % is %, not pending',v_sub.id,v_sub.status
        using errcode='check_violation';
    end if;

    v_start:=coalesce(new.paid_at,now());
    select case pv.billing_interval
      when 'week' then v_start+interval '1 week'
      when 'month' then v_start+interval '1 month'
      when 'quarter' then v_start+interval '3 months'
      when 'year' then v_start+interval '1 year'
      else null end
      into v_end
      from public.plan_versions pv where pv.id=v_sub.plan_version_id;
    if v_end is null then
      raise exception 'plan version % has no supported recurring interval',v_sub.plan_version_id
        using errcode='check_violation';
    end if;

    perform set_config('app.subscription_writer','on',true);
    update public.subscriptions
       set status='active',started_at=v_start,current_period_start=v_start,current_period_end=v_end
     where id=v_sub.id;

    v_learner:=nullif(v_item.item_snapshot->>'learner_profile_id','')::uuid;
    if v_learner is null then
      raise exception 'the paid plan order does not identify its first learner'
        using errcode='check_violation';
    end if;
    select learner_type into v_kind from public.learner_profiles where id=v_learner;
    insert into public.family_plan_allocations
      (subscription_id,learner_profile_id,slot_type,effective_from,effective_until,status)
    values(v_sub.id,v_learner,case when v_kind='child' then 'child' else 'adult' end,
           v_start,v_end,'active')
    returning id into v_alloc;
    perform public.grant_subscription_plan_entitlements(v_sub.id,v_learner);

    insert into public.governance_audit_events(actor,action,target_type,target_id,detail)
    values(new.payment_confirmed_by,'subscription.activated','subscription',v_sub.id,
      jsonb_build_object('order_id',new.id,'learner_profile_id',v_learner,
                         'period_start',v_start,'period_end',v_end,'allocation_id',v_alloc));
  end loop;
  return new;
end;
$$;

 drop trigger if exists orders_activate_paid_subscriptions on public.orders;
create trigger orders_activate_paid_subscriptions
  after update of status on public.orders
  for each row when (new.status='paid' and old.status is distinct from 'paid')
  execute function public.activate_paid_plan_order();

-- A cancelled checkout cannot be converted to paid later by a late callback.
create or replace function public.reject_payment_for_cancelled_order()
returns trigger
language plpgsql
as $$
begin
  if old.status='cancelled' and new.status in ('paid','partially_refunded','refunded') then
    raise exception 'a cancelled order cannot be confirmed as paid'
      using errcode='check_violation';
  end if;
  return new;
end;
$$;
create trigger orders_reject_cancelled_payment
  before update of status on public.orders
  for each row execute function public.reject_payment_for_cancelled_order();

-- ---------------------------------------------------------------------------
-- Cancellation. Existing grants are deliberately NOT revoked: they expire at
-- current_period_end, so a cancellation does not claw back paid access.
-- ---------------------------------------------------------------------------
create or replace function public.cancel_subscription(
  p_subscription_id uuid,
  p_reason text
)
returns boolean
language plpgsql
security definer
set search_path=public
as $$
declare
  v_actor uuid:=public.current_user_id();
  v_sub public.subscriptions;
  v_allowed boolean;
  v_order uuid;
  v_reason text:=nullif(btrim(coalesce(p_reason,'')),'');
begin
  if v_actor is null then
    raise exception 'sign in to cancel a subscription' using errcode='insufficient_privilege';
  end if;
  if v_reason is null then
    raise exception 'a written cancellation reason is required' using errcode='check_violation';
  end if;
  select * into v_sub from public.subscriptions where id=p_subscription_id for update;
  if not found then raise exception 'subscription % not found',p_subscription_id using errcode='no_data_found'; end if;
  select (bam.can_cancel_subscriptions or public.is_privileged(v_actor)) into v_allowed
    from public.billing_account_memberships bam
   where bam.billing_account_id=v_sub.billing_account_id and bam.user_id=v_actor and bam.status='active';
  if coalesce(v_allowed,false) is not true then
    raise exception 'you do not have permission to cancel this subscription'
      using errcode='insufficient_privilege';
  end if;
  if v_sub.status in ('cancelled','expired') then return false; end if;

  perform set_config('app.subscription_writer','on',true);
  if v_sub.status='pending' then
    select oi.order_id into v_order from public.order_items oi where oi.id=v_sub.origin_order_item_id;
    if v_order is not null then
      update public.orders set status='cancelled',cancelled_at=now()
       where id=v_order and status in ('draft','pending_payment','awaiting_confirmation');
    end if;
  end if;
  update public.subscriptions
     set status='cancelled',cancelled_at=now(),cancel_reason=v_reason
   where id=p_subscription_id;

  insert into public.governance_audit_events(actor,action,target_type,target_id,detail)
  values(v_actor,'subscription.cancelled','subscription',p_subscription_id,
    jsonb_build_object('reason',v_reason,'paid_until',v_sub.current_period_end));
  return true;
end;
$$;
revoke all on function public.cancel_subscription(uuid,text) from public;
grant execute on function public.cancel_subscription(uuid,text) to authenticated;

comment on function public.create_plan_order(uuid,uuid,uuid,uuid) is
  'Creates a pending plan order and pending subscription from an active plan version and server-resolved price. The learner must be the payer or a child in their family. It does not grant access.';
comment on function public.allocate_subscription_learner(uuid,uuid) is
  'Allocates a payer-owned adult or family-owned child to an active subscription and grants its plan entitlements through the paid period end.';
comment on function public.cancel_subscription(uuid,text) is
  'Cancels a pending or active subscription with a written reason. Existing grants remain valid until the paid period ends.';
