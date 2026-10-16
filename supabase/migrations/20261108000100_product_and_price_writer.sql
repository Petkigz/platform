-- The purchase path.
--
-- WHAT THIS FIXES
-- ---------------
-- products, prices and product_course_versions all had zero rows and no writer
-- anywhere — not in SQL, not in the application. Every table on the revenue path
-- was dead:
--
--   no product  ->  no price  ->  nothing to buy  ->  no order  ->  no revenue
--
-- checkout.ts resolves a price id to a product and its course versions;
-- enrolment.ts resolves product_course_versions to the course being bought;
-- accrue_instructor_earnings() walks order_items.product_id ->
-- product_course_versions -> courses.created_by to decide who earned what.
--
-- All three were reading tables that nothing could ever fill. The earnings unit
-- was unreachable, and so was every purchase.
--
-- WHO SETS THE PRICE
-- ------------------
-- The existing policies already answer this and it is not reversed here:
--
--   products_insert  = created_by = current_user_id()   -- a teacher owns it
--   pcv_write        = the product's owner              -- they link their course
--   prices_write     = is_privileged(current_user_id()) -- staff set the price
--
-- So a teacher creates the product and attaches their own course to it, but a
-- price is a platform decision. That is consistent with the marketplace being
-- behind a gate rather than open. Recorded as a decision, because it is the kind
-- of thing that should not change silently.
--
-- SELLING A DRAFT
-- ---------------
-- Linking a course version requires it to be published. A draft has never been
-- reviewed, and selling one would put paid-for content on the platform that the
-- scholarly gate has not seen.

-- ---------------------------------------------------------------------------
-- Creating a product
-- ---------------------------------------------------------------------------

create or replace function public.create_product(
  p_name         text,
  p_product_type text default 'course',
  p_description  text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid;
  v_id    uuid;
begin
  v_actor := public.current_user_id();

  if v_actor is null then
    raise exception 'sign in to create a product'
      using errcode = 'insufficient_privilege';
  end if;

  if coalesce(trim(p_name), '') = '' then
    raise exception 'a product needs a name'
      using errcode = 'invalid_parameter_value';
  end if;

  if p_product_type not in
     ('course','learning_path','bundle','private_tutoring','certificate_exam') then
    raise exception 'unsupported product type: %', p_product_type
      using errcode = 'invalid_parameter_value';
  end if;

  if length(trim(p_name)) > 200 then
    raise exception 'keep the product name under 200 characters'
      using errcode = 'invalid_parameter_value';
  end if;

  -- Starts as a draft. It becomes active only through activate_product(),
  -- which checks the things that make it actually sellable.
  insert into public.products (product_type, name, description, created_by, status)
  values (p_product_type, trim(p_name), trim(coalesce(p_description, ''))::text,
          v_actor, 'draft')
  returning id into v_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'product.created', 'product', v_id,
          jsonb_build_object('product_type', p_product_type));

  return v_id;
end;
$$;

revoke all on function public.create_product(text, text, text) from public;
grant execute on function public.create_product(text, text, text) to authenticated;

comment on function public.create_product(text, text, text) is
  'Creates a draft product owned by the caller. Activation requires a published course version and an active price.';

-- ---------------------------------------------------------------------------
-- Attaching a course
-- ---------------------------------------------------------------------------

create or replace function public.link_product_course_version(
  p_product_id  uuid,
  p_course_id   uuid,
  p_version_id  uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor  uuid;
  v_owner  uuid;
  v_status text;
begin
  v_actor := public.current_user_id();

  if v_actor is null then
    raise exception 'sign in to attach a course to a product'
      using errcode = 'insufficient_privilege';
  end if;

  select created_by into v_owner
    from public.products
   where id = p_product_id
     and deleted_at is null;

  if not found then
    raise exception 'product % not found', p_product_id
      using errcode = 'no_data_found';
  end if;

  if v_owner <> v_actor and not public.is_privileged(v_actor) then
    raise exception 'you may only attach courses to your own product'
      using errcode = 'insufficient_privilege';
  end if;

  -- The composite foreign key already ties the version to the course, but
  -- failing here names the real problem instead of surfacing a constraint.
  select version_status into v_status
    from public.course_versions
   where id = p_version_id
     and course_id = p_course_id;

  if not found then
    raise exception 'course version % is not part of course %', p_version_id, p_course_id
      using errcode = 'no_data_found';
  end if;

  -- A draft has never been reviewed. Selling one would put paid-for content on
  -- the platform that the scholarly gate has not seen.
  if v_status <> 'published' then
    raise exception
      'only a published version can be sold; version % is %', p_version_id, v_status
      using errcode = 'invalid_parameter_value';
  end if;

  insert into public.product_course_versions (product_id, course_id, course_version_id)
  values (p_product_id, p_course_id, p_version_id)
  on conflict do nothing;

  if found then
    insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
    values (v_actor, 'product.version_linked', 'product', p_product_id,
            jsonb_build_object('course_id', p_course_id, 'course_version_id', p_version_id));
  end if;

  return found;
end;
$$;

revoke all on function public.link_product_course_version(uuid, uuid, uuid) from public;
grant execute on function public.link_product_course_version(uuid, uuid, uuid) to authenticated;

comment on function public.link_product_course_version(uuid, uuid, uuid) is
  'Attaches a published course version to a product. Owner or privileged. Idempotent.';

-- ---------------------------------------------------------------------------
-- Pricing — staff only, per the existing policy
-- ---------------------------------------------------------------------------

create or replace function public.set_product_price(
  p_product_id       uuid,
  p_amount_minor     bigint,
  p_currency_code    text,
  p_billing_interval text default 'one_time',
  p_market           text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid;
  v_id    uuid;
begin
  v_actor := public.current_user_id();

  if v_actor is null then
    raise exception 'sign in to set a price'
      using errcode = 'insufficient_privilege';
  end if;

  -- The prices_insert policy is is_privileged(current_user_id()). A price is a
  -- platform decision, not the seller's.
  if not public.is_privileged(v_actor) then
    raise exception 'only staff may set a price'
      using errcode = 'insufficient_privilege';
  end if;

  if not exists (select 1 from public.products
                  where id = p_product_id and deleted_at is null) then
    raise exception 'product % not found', p_product_id
      using errcode = 'no_data_found';
  end if;

  if p_amount_minor is null or p_amount_minor < 0 then
    raise exception 'a price cannot be negative'
      using errcode = 'invalid_parameter_value';
  end if;

  -- The column CHECK is ^[A-Z]{3}$. Reported here so the caller is told the
  -- format rather than being handed a constraint name.
  if p_currency_code is null or p_currency_code !~ '^[A-Z]{3}$' then
    raise exception
      'the currency must be a three-letter uppercase ISO code, got %',
      coalesce(p_currency_code, '<null>')
      using errcode = 'invalid_parameter_value';
  end if;

  if p_billing_interval not in ('week','month','quarter','year','one_time') then
    raise exception 'unsupported billing interval: %', p_billing_interval
      using errcode = 'invalid_parameter_value';
  end if;

  if p_market is not null and p_market !~ '^[A-Z]{2}$' then
    raise exception
      'the market must be a two-letter uppercase country code, got %', p_market
      using errcode = 'invalid_parameter_value';
  end if;

  -- Supersede rather than mutate. A price someone already bought at must stay
  -- readable as it was, so the old row is closed off and kept.
  update public.prices
     set status = 'retired',
         effective_until = now()
   where product_id = p_product_id
     and status = 'active'
     and coalesce(market, '') = coalesce(p_market, '')
     and effective_until is null;

  insert into public.prices
    (product_id, amount_minor, currency_code, billing_interval, market, status)
  values
    (p_product_id, p_amount_minor, p_currency_code, p_billing_interval, p_market, 'active')
  returning id into v_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'product.price_set', 'product', p_product_id,
          jsonb_build_object('amount_minor', p_amount_minor,
                             'currency_code', p_currency_code,
                             'billing_interval', p_billing_interval,
                             'market', p_market));

  return v_id;
end;
$$;

revoke all on function public.set_product_price(uuid, bigint, text, text, text) from public;
grant execute on function public.set_product_price(uuid, bigint, text, text, text) to authenticated;

comment on function public.set_product_price(uuid, bigint, text, text, text) is
  'Staff-only. Supersedes the previous active price for the same market rather than mutating it, so what people already bought at stays readable.';

-- ---------------------------------------------------------------------------
-- Activation and retirement
-- ---------------------------------------------------------------------------

create or replace function public.activate_product(p_product_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor   uuid;
  v_status  text;
  v_links   integer;
  v_prices  integer;
begin
  v_actor := public.current_user_id();

  if v_actor is null then
    raise exception 'sign in to activate a product'
      using errcode = 'insufficient_privilege';
  end if;

  -- Activating means it can be bought, and only staff can price. Requiring
  -- staff here keeps "is for sale" and "has a price" in the same hands.
  if not public.is_privileged(v_actor) then
    raise exception 'only staff may put a product on sale'
      using errcode = 'insufficient_privilege';
  end if;

  select status into v_status
    from public.products
   where id = p_product_id
     and deleted_at is null
   for update;

  if not found then
    raise exception 'product % not found', p_product_id
      using errcode = 'no_data_found';
  end if;

  if v_status = 'active' then
    return false;
  end if;

  select count(*) into v_links
    from public.product_course_versions
   where product_id = p_product_id;

  if v_links = 0 then
    raise exception
      'a product needs a course attached before it can be sold'
      using errcode = 'invalid_parameter_value';
  end if;

  select count(*) into v_prices
    from public.prices
   where product_id = p_product_id
     and status = 'active'
     and effective_until is null;

  if v_prices = 0 then
    raise exception
      'a product needs an active price before it can be sold'
      using errcode = 'invalid_parameter_value';
  end if;

  update public.products set status = 'active' where id = p_product_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'product.activated', 'product', p_product_id,
          jsonb_build_object('linked_versions', v_links));

  return true;
end;
$$;

revoke all on function public.activate_product(uuid) from public;
grant execute on function public.activate_product(uuid) to authenticated;

comment on function public.activate_product(uuid) is
  'Puts a product on sale. Requires at least one linked course version and one active price, so nothing can be listed that has no content or no price.';

create or replace function public.retire_product(p_product_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid;
begin
  v_actor := public.current_user_id();

  if v_actor is null then
    raise exception 'sign in to retire a product'
      using errcode = 'insufficient_privilege';
  end if;

  if not (public.is_privileged(v_actor)
          or exists (select 1 from public.products
                      where id = p_product_id and created_by = v_actor)) then
    raise exception 'you may only retire your own product'
      using errcode = 'insufficient_privilege';
  end if;

  -- Soft delete per D7. Prices are closed off rather than removed: orders that
  -- reference them must still resolve.
  update public.products
     set deleted_at = now(),
         status = 'retired'
   where id = p_product_id
     and deleted_at is null;

  if not found then
    return false;
  end if;

  update public.prices
     set status = 'retired',
         effective_until = now()
   where product_id = p_product_id
     and status = 'active'
     and effective_until is null;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'product.retired', 'product', p_product_id, '{}'::jsonb);

  return true;
end;
$$;

revoke all on function public.retire_product(uuid) from public;
grant execute on function public.retire_product(uuid) to authenticated;

comment on function public.retire_product(uuid) is
  'Soft delete per D7. Closes active prices rather than deleting them, so existing orders still resolve.';
