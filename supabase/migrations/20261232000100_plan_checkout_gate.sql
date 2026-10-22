-- Plan checkout is gated on commerce.subscriptions.
--
-- Decided 2026-10-22. `create_plan_order()` was reachable while the flag that
-- advertises subscriptions was off: the storefront hid the plans, and nothing
-- in the writer refused one, so the "off" was a property of the UI rather than
-- of the platform. The course writer already refuses while `commerce.checkout`
-- is off, with the same `checkout:disabled` key, so a caller sees one
-- behaviour and the web layer already knows how to say it.
--
-- Only the guard is new. The body below is the function as it stood in
-- 20261113000100_subscription_checkout_and_access.sql, re-created rather than
-- patched because a plpgsql body cannot be altered in place.

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

  -- commerce.subscriptions ships off. The catalogue screens hid plans but the
  -- writer did not, so a caller could still open a subscription order for a
  -- feature the platform says is not on sale. A flag that hides a surface and
  -- not the writer is decoration; this is the same guard, and the same refusal
  -- key, as create_course_order() uses for commerce.checkout.
  if not public.setting_bool('commerce.subscriptions', false) then
    raise exception 'checkout:disabled'
      using errcode = 'insufficient_privilege';
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
