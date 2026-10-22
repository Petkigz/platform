-- The price a buyer is charged follows from the country they are in.
-- Decided 2026-10-22, and the last thing standing between localised pricing and
-- pricing that is real rather than decorative.
--
-- `prices.market` was enforced nowhere. `create_course_order()` took a price id
-- from the caller and accepted any live one, and `resolveOffering()` listed
-- every market's price on the buy page. A payer in Kampala could buy at the
-- price set for Nairobi, and the cheapest market was available to everybody who
-- could read a network response.
--
-- WHO KNOWS THE COUNTRY, AND WHY THAT IS THE HARD PART
-- ----------------------------------------------------
-- The country is not something a buyer types at checkout — a selector is a
-- choice between prices, and the cheapest one wins. It is not something the
-- browser can assert either: a posted country is a posted price by another
-- name, and any signed-in person can call this RPC directly.
--
-- So the country has two sources, neither of them the buyer's keyboard:
--
--   1. The request's address, resolved by the hosting layer (`x-vercel-ip-country`,
--      `cf-ipcountry`, …) and passed in by the checkout route as `p_buyer_country`.
--      That is the same signal every other shop uses. It is approximate — a VPN,
--      a carrier's egress, a business's private link all lie — which is why it is
--      only consulted when the account has no country yet.
--   2. The billing account, once a country is recorded on it. That is
--      authoritative, because it outlives any one request. It can only be
--      corrected by staff (`set_billing_country`, audited, reason required), the
--      same way a shop corrects a billing address after the first invoice.
--
-- The consequence is honest and worth stating: a brand-new account gets the
-- country of the connection that made its first purchase, and keeps it. The
-- alternative — resolving on every request — means the price of a course moves
-- when a family travels, and an order already paid could not be explained
-- against a different price shown a day later.
--
-- THE RULE, IN ORDER
-- ------------------
--   1. A price whose `market` is the buyer's country.
--   2. A price that declares no market (`market is null`) — the default the
--      price declares for its currency.
--   3. A refusal, with a reason, rather than a guess.
--
-- Within the band, the account's own currency wins; a new account has no
-- currency worth preferring, so the band must name exactly one. If a band names
-- two currencies and neither is the account's, the buyer is refused and both are
-- named. Charging one of them would be a coin toss on somebody's money.
--
-- Consequence for `create_course_order()`: it no longer takes a price id. It
-- cannot — the price is now a function of the buyer, not of the request.

-- ---------------------------------------------------------------------------
-- A country code, normalised, or a refusal
-- ---------------------------------------------------------------------------
-- Two letters, upper case, because `prices.market` and `billing_accounts.
-- billing_country` both hold that shape. Blank means "unknown", which is a
-- legitimate state (a request from a network the hosting layer cannot place),
-- and NULL rather than a code that pretends otherwise.

create or replace function public.normalise_country(p_country text)
returns text
language plpgsql
immutable
as $$
declare
  v_code text := upper(btrim(coalesce(p_country, '')));
begin
  if v_code = '' then
    return null;
  end if;

  if v_code !~ '^[A-Z]{2}$' then
    raise exception
      'a country is a two-letter ISO 3166-1 code; % is not one', p_country
      using errcode = 'invalid_parameter_value';
  end if;

  return v_code;
end;
$$;

comment on function public.normalise_country(text) is
  'Upper-cases and validates a two-letter country code; blank becomes NULL. Used by the pricing path so a lowercase or padded code from a proxy header is not a silent miss.';

revoke all on function public.normalise_country(text) from public;

-- ---------------------------------------------------------------------------
-- The live prices for the version a course is currently selling
-- ---------------------------------------------------------------------------
-- One definition of "on sale", used by the resolver and by the reader that
-- decides whether a course has a price anywhere. `products.status = 'active'`
-- matches what the buy page is allowed to show; a draft product is not an
-- offer, whatever prices hang off it.

create or replace function public.live_course_prices(p_version_id uuid)
returns table (
  price_id         uuid,
  product_id       uuid,
  amount_minor     bigint,
  currency_code    text,
  billing_interval text,
  market           text
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.product_id, p.amount_minor, p.currency_code::text,
         p.billing_interval, p.market
    from public.product_course_versions pcv
    join public.products pr
      on pr.id = pcv.product_id
     and pr.status = 'active'
    join public.prices p
      on p.product_id = pcv.product_id
   where pcv.course_version_id = p_version_id
     and p.status = 'active'
     and p.effective_from <= now()
     and (p.effective_until is null or p.effective_until > now());
$$;

comment on function public.live_course_prices(uuid) is
  'Every active, in-window price on an active product carrying this course version, whatever its market or interval. The single definition of "on sale" for the pricing path.';

revoke all on function public.live_course_prices(uuid) from public;
grant execute on function public.live_course_prices(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Resolving a price for a country
-- ---------------------------------------------------------------------------
-- Returns a JSON object rather than a row, because "there is no price" needs a
-- reason the caller can turn into a sentence, and a row-returning function
-- would express that as no row — which is indistinguishable from a bug.
--
-- `amountMinor` is text. Money is a bigint from the table to the wire in this
-- codebase, and narrowing it here would be the one place that could lose a digit.

create or replace function public.resolve_course_price(
  p_course_id uuid,
  p_country   text default null,
  p_currency  text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_version  uuid;
  v_country  text := upper(btrim(coalesce(p_country, '')));
  v_currency text := upper(btrim(coalesce(p_currency, '')));
begin
  select cv.id
    into v_version
    from public.courses c
    join public.course_versions cv on cv.course_id = c.id
   where c.id = p_course_id
     and c.status = 'active'
     and c.deleted_at is null
     and cv.version_status = 'published'
   order by cv.version_number desc
   limit 1;

  if v_version is null then
    return jsonb_build_object(
      'resolved', false, 'reason', 'course_not_available',
      'hasLivePrice', false, 'country', nullif(v_country, ''));
  end if;

  return (
    with live as (
      select * from public.live_course_prices(v_version)
    ),
    scoped as (
      select l.*,
             case when v_country <> '' and l.market = v_country then 1 else 2 end as band
        from live l
       where (v_country <> '' and l.market = v_country)
          or l.market is null
    ),
    banded as (
      select s.* from scoped s
       where s.band = (select min(band) from scoped)
    ),
    one_time as (
      select b.* from banded b where b.billing_interval = 'one_time'
    ),
    counts as (
      select (select count(*) from live)     as live_count,
             (select count(*) from scoped)   as scoped_count,
             (select count(*) from one_time) as one_time_count,
             (select count(distinct currency_code) from one_time) as currency_count
    ),
    preferred as (
      select o.* from one_time o
       where v_currency <> '' and o.currency_code = v_currency
       limit 1
    ),
    sole as (
      select o.* from one_time o
       where (select currency_count from counts) = 1
       limit 1
    ),
    chosen as (
      select * from preferred
      union all
      select * from sole
       where not exists (select 1 from preferred)
       limit 1
    )
    select case
      when (select live_count from counts) = 0 then
        jsonb_build_object(
          'resolved', false, 'reason', 'no_price',
          'hasLivePrice', false, 'country', nullif(v_country, ''))
      when (select scoped_count from counts) = 0 then
        jsonb_build_object(
          'resolved', false, 'reason', 'no_price_for_country',
          'hasLivePrice', true, 'country', nullif(v_country, ''))
      when (select one_time_count from counts) = 0 then
        jsonb_build_object(
          'resolved', false, 'reason', 'not_one_time',
          'hasLivePrice', true, 'country', nullif(v_country, ''))
      when exists (select 1 from chosen) then
        (select jsonb_build_object(
                  'resolved', true,
                  'priceId', c.price_id,
                  'productId', c.product_id,
                  'amountMinor', c.amount_minor::text,
                  'currencyCode', c.currency_code,
                  'billingInterval', c.billing_interval,
                  'market', c.market,
                  'matched', case when c.market is null then 'default' else 'country' end,
                  'hasLivePrice', true,
                  'country', nullif(v_country, ''),
                  'reason', null)
           from chosen c)
      else
        jsonb_build_object(
          'resolved', false, 'reason', 'price_ambiguous',
          'hasLivePrice', true, 'country', nullif(v_country, ''),
          'currencies', (select jsonb_agg(distinct o.currency_code order by o.currency_code)
                           from one_time o))
    end
  );
end;
$$;

comment on function public.resolve_course_price(uuid, text, text) is
  'The price that applies to a buyer in a country: an exact market match, then the price that declares no market, then a refusal naming why. Within that band the given currency wins; a band with several currencies and no preferred one is ambiguous and refused rather than guessed.';

revoke all on function public.resolve_course_price(uuid, text, text) from public;
grant execute on function public.resolve_course_price(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- What a signed-in person will actually be charged
-- ---------------------------------------------------------------------------
-- The read path, and the same resolver the writer uses, so the price on the
-- button cannot disagree with the price in the order. The account's country and
-- currency win when they exist; otherwise the route's country is used, which is
-- a display hint only — nothing here writes.
--
-- Granted to anon as well: a catalogue price is public. Without a session there
-- is no account, so an anonymous visitor sees the default market, and the
-- sign-in flow is what puts them on their own country's price.

create or replace function public.course_price_for_me(
  p_course_id uuid,
  p_country   text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor         uuid := public.current_user_id();
  v_country       text;
  v_currency      text;
  v_source        text := 'none';
  v_result        jsonb;
begin
  if v_actor is not null then
    select ba.billing_country, ba.billing_currency::text
      into v_country, v_currency
      from public.billing_account_memberships bam
      join public.billing_accounts ba on ba.id = bam.billing_account_id
     where bam.user_id = v_actor
       and bam.status = 'active'
       and ba.status = 'active'
       and ba.deleted_at is null
     order by bam.granted_at
     limit 1;

    if v_country is not null then
      v_source := 'account';
    end if;
  end if;

  if v_source = 'none' then
    v_country := public.normalise_country(p_country);
    v_source := case when v_country is null then 'none' else 'request' end;
  end if;

  v_result := public.resolve_course_price(p_course_id, v_country, v_currency);

  return v_result || jsonb_build_object('countrySource', v_source);
end;
$$;

comment on function public.course_price_for_me(uuid, text) is
  'The price this caller would be charged, using the same resolver create_course_order() uses. The account''s recorded country wins over the request''s; the request country is a display hint and is never written here.';

revoke all on function public.course_price_for_me(uuid, text) from public;
grant execute on function public.course_price_for_me(uuid, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Correcting an account's country
-- ---------------------------------------------------------------------------
-- The escape hatch. A family that moves, a buyer whose carrier egresses through
-- another country, a wrong first purchase — all real, none of them a reason to
-- let the buyer edit the field themselves. Staff do it, in writing, and the
-- audit trail keeps what it was.

create or replace function public.set_billing_country(
  p_billing_account_id uuid,
  p_country            text,
  p_reason             text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor    uuid := public.current_user_id();
  v_country  text := public.normalise_country(p_country);
  v_reason   text := nullif(btrim(coalesce(p_reason, '')), '');
  v_previous text;
begin
  if v_actor is null or not (
       public.has_role(v_actor, 'finance_admin')
    or public.has_role(v_actor, 'platform_admin')) then
    raise exception 'only a finance admin may change the country an account is billed in'
      using errcode = 'insufficient_privilege';
  end if;

  if v_reason is null then
    raise exception 'say why this account''s billing country is being changed'
      using errcode = 'invalid_parameter_value';
  end if;

  if length(v_reason) > 500 then
    raise exception 'a reason must be 500 characters or fewer'
      using errcode = 'invalid_parameter_value';
  end if;

  select ba.billing_country
    into v_previous
    from public.billing_accounts ba
   where ba.id = p_billing_account_id
     and ba.deleted_at is null;

  if not found then
    raise exception 'no billing account %', p_billing_account_id
      using errcode = 'no_data_found';
  end if;

  if v_previous is not distinct from v_country then
    return jsonb_build_object(
      'billingAccountId', p_billing_account_id,
      'country', v_country,
      'changed', false,
      'note', 'this account is already billed there');
  end if;

  update public.billing_accounts
     set billing_country = v_country
   where id = p_billing_account_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'commerce.billing_country_changed', 'billing_account',
          p_billing_account_id,
          jsonb_build_object('from', v_previous, 'to', v_country, 'reason', v_reason));

  return jsonb_build_object(
    'billingAccountId', p_billing_account_id,
    'country', v_country,
    'previous', v_previous,
    'changed', true);
end;
$$;

comment on function public.set_billing_country(uuid, text, text) is
  'Finance or platform staff only, with a written reason, audited. The only supported way to change a country once a purchase has fixed it.';

revoke all on function public.set_billing_country(uuid, text, text) from public;
grant execute on function public.set_billing_country(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- The writer
-- ---------------------------------------------------------------------------
-- Full redefinition of 20261228000100_duplicate_purchase_guard.sql, whose body
-- it keeps intact apart from the pricing block. Diffing the two should show the
-- signature change, the account resolution, and the price resolution; nothing
-- else.
--
-- `p_buyer_country` is not the buyer's choice. It is the country the request
-- arrived from, resolved by the hosting layer and passed by the checkout route.
-- It is consulted only when the account has no country yet. A browser calling
-- this RPC directly can lie about it exactly once, on an account with no
-- purchase history — the trade every IP-priced shop makes, and the reason the
-- record is frozen afterwards.

drop function if exists public.create_course_order(uuid, uuid);

create or replace function public.create_course_order(
  p_course_id     uuid,
  p_buyer_country text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor        uuid := public.current_user_id();
  v_country      text := public.normalise_country(p_buyer_country);
  v_version      uuid;
  v_course_title text;
  v_price        jsonb;
  v_price_id     uuid;
  v_amount       bigint;
  v_currency     text;
  v_matched      text;
  v_product      uuid;
  v_product_name text;
  v_account      uuid;
  v_account_name text;
  v_account_country text;
  v_account_currency text;
  v_order        uuid;
  v_item         uuid;
begin
  if v_actor is null then
    raise exception 'checkout:not_signed_in'
      using errcode = 'insufficient_privilege';
  end if;

  -- Ships off. Turning it on is an admin action, not a deploy.
  if not public.setting_bool('commerce.checkout', false) then
    raise exception 'checkout:disabled'
      using errcode = 'insufficient_privilege';
  end if;

  -- -------------------------------------------------------------------
  -- What is being sold. Re-derived here on every call, never accepted.
  -- -------------------------------------------------------------------
  select cv.id, c.title
    into v_version, v_course_title
    from public.courses c
    join public.course_versions cv on cv.course_id = c.id
   where c.id = p_course_id
     and c.status = 'active'
     and c.deleted_at is null
     and cv.version_status = 'published'
   order by cv.version_number desc
   limit 1;

  if v_version is null then
    raise exception 'checkout:course_not_available'
      using errcode = 'no_data_found';
  end if;

  -- -------------------------------------------------------------------
  -- Who is paying. Resolved from the caller's own memberships; never a
  -- parameter, so there is no way to hang an order on somebody else's
  -- account and have their refund or their invoice find it.
  -- -------------------------------------------------------------------
  select bam.billing_account_id
    into v_account
    from public.billing_account_memberships bam
    join public.billing_accounts ba on ba.id = bam.billing_account_id
   where bam.user_id = v_actor
     and bam.status = 'active'
     and bam.can_manage_payment_methods
     and ba.status = 'active'
     and ba.deleted_at is null
   order by bam.granted_at
   limit 1;

  if v_account is not null then
    select ba.billing_country, ba.billing_currency::text
      into v_account_country, v_account_currency
      from public.billing_accounts ba
     where ba.id = v_account;

    -- The account's country outlives the request. A later purchase from a
    -- different network does not move it, which is what makes the price a
    -- family saw last week the price their invoice explains.
    v_country := coalesce(v_account_country, v_country);
  end if;

  -- -------------------------------------------------------------------
  -- Which price. The buyer's country picks the market; the account's
  -- currency breaks a tie inside it. No price id is accepted anywhere.
  -- -------------------------------------------------------------------
  v_price := public.resolve_course_price(p_course_id, v_country, v_account_currency);

  if not coalesce((v_price ->> 'resolved')::boolean, false) then
    -- `no_price` means nothing is on sale at all, which is the refusal the
    -- writer already had a key for. The two new keys are about the buyer — the
    -- course is on sale, just not to them where they are.
    raise exception 'checkout:%',
      case coalesce(v_price ->> 'reason', '')
        when 'no_price' then 'price_not_available'
        when 'course_not_available' then 'course_not_available'
        else coalesce(v_price ->> 'reason', 'price_not_available')
      end
      using errcode = case
        when v_price ->> 'reason' in ('no_price', 'course_not_available')
          then 'no_data_found'
        else 'invalid_parameter_value'
      end;
  end if;

  v_price_id := (v_price ->> 'priceId')::uuid;
  v_product  := (v_price ->> 'productId')::uuid;
  v_amount   := (v_price ->> 'amountMinor')::bigint;
  v_currency := v_price ->> 'currencyCode';
  v_matched  := v_price ->> 'matched';

  select pr.name into v_product_name
    from public.products pr
   where pr.id = v_product;

  -- -------------------------------------------------------------------
  -- Would paying grant anything at all? Asked before anything about the
  -- account is written, so a refused double-tap does not move that account's
  -- country or currency on its way out.
  --
  -- A course purchase grants every learner profile linked to an active
  -- member of the account that paid: that is what record_payment_success()
  -- loops over. So if every profile it would grant already holds a live
  -- `purchase` entitlement for this version, the order can only take money
  -- for access that already exists — the same version bought twice, which in
  -- practice is a double tap or a guardian who does not know the family
  -- already has it. Refused, with a key the buy page turns into a sentence
  -- (decided 2026-10-22).
  --
  -- Two things this deliberately does not do. It is scoped to
  -- `source_type = 'purchase'`, because the fulfilment skips exactly that: a
  -- grant that came from a subscription ends when the subscription does, so
  -- buying the course outright adds permanence and must still be allowed. And
  -- it asks about the *account*, not the person, because that is the grain
  -- the grant uses — which is also why twins are never the ones refused: they
  -- are two profiles on one account, the first purchase enrols both, and no
  -- second purchase is needed. A lapsed entitlement, a different version, a
  -- different course and a different account all pass.
  -- -------------------------------------------------------------------
  if v_account is not null and exists (
    select 1
      from public.billing_account_memberships bam
      join public.learner_profiles lp
        on lp.linked_user_id = bam.user_id
       and lp.deleted_at is null
      join public.entitlement_grants eg
        on eg.learner_profile_id = lp.id
     where bam.billing_account_id = v_account
       and bam.status = 'active'
       and eg.scope_type = 'course_version'
       and eg.course_version_id = v_version
       and eg.source_type = 'purchase'
       and eg.status = 'active'
       and (eg.effective_from is null or eg.effective_from <= now())
       and (eg.effective_until is null or eg.effective_until > now())
  ) then
    raise exception 'checkout:already_owned'
      using errcode = 'invalid_parameter_value';
  end if;

  -- -------------------------------------------------------------------
  -- The account. Opened only when the person genuinely has none, and in
  -- the currency and country of the price that will be charged.
  -- -------------------------------------------------------------------
  if v_account is null then
    select nullif(trim(up.display_name), '')
      into v_account_name
      from public.user_profiles up
     where up.user_id = v_actor;

    insert into public.billing_accounts
      (display_name, billing_currency, billing_country, status, created_by)
    values
      (coalesce(v_account_name, v_course_title, 'My account'),
       v_currency, v_country, 'active', v_actor)
    returning id into v_account;

    -- A country established from a request is a fact a support conversation may
    -- have to explain later, so it is recorded like every other one.
    if v_country is not null then
      insert into public.governance_audit_events
        (actor, action, target_type, target_id, detail)
      values
        (v_actor, 'commerce.billing_country_set', 'billing_account', v_account,
         jsonb_build_object('country', v_country, 'source', 'first_purchase'));
    end if;

    -- No membership insert here on purpose: the AFTER INSERT trigger
    -- billing_accounts_grant_creator makes the creator a member with the full
    -- payer capability set, and bam_one_per_user is unique.
  else
    -- A country recorded once is not rewritten by a later request. The only
    -- supported correction is set_billing_country(), by staff, in writing.
    if v_account_country is null and v_country is not null then
      update public.billing_accounts
         set billing_country = v_country
       where id = v_account;

      insert into public.governance_audit_events
        (actor, action, target_type, target_id, detail)
      values
        (v_actor, 'commerce.billing_country_set', 'billing_account', v_account,
         jsonb_build_object('country', v_country, 'source', 'first_purchase'));
    end if;

    -- The account follows the price it just bought in. Past orders carry their
    -- own currency and are untouched; this only decides what the next screen
    -- shows and which price a tie inside a market resolves to.
    if v_account_currency is distinct from v_currency then
      update public.billing_accounts
         set billing_currency = v_currency
       where id = v_account;

      insert into public.governance_audit_events
        (actor, action, target_type, target_id, detail)
      values
        (v_actor, 'commerce.billing_currency_changed', 'billing_account', v_account,
         jsonb_build_object('from', v_account_currency, 'to', v_currency,
                            'reason', 'followed the price of a purchase'));
    end if;
  end if;

  -- -------------------------------------------------------------------
  -- The order. subtotal - discount + tax must equal total (CHECK), and
  -- there is no discount or tax path yet, so both are zero and the
  -- identity is exact.
  -- -------------------------------------------------------------------
  insert into public.orders
    (billing_account_id, currency_code, subtotal_minor, discount_minor,
     tax_minor, total_minor, status, placed_at, placed_by)
  values
    (v_account, v_currency, v_amount, 0, 0,
     v_amount, 'pending_payment', now(), v_actor)
  returning id into v_order;

  insert into public.order_items
    (order_id, product_id, price_id, quantity, unit_price_minor,
     currency_code, discount_minor, line_total_minor, item_snapshot)
  values
    (v_order, v_product, v_price_id, 1, v_amount,
     v_currency, 0, v_amount,
     jsonb_build_object(
       'title', coalesce(v_product_name, v_course_title),
       'course_id', p_course_id,
       'course_version_id', v_version,
       'billing_interval', 'one_time',
       'priced_at', to_jsonb(now()),
       'market', v_price ->> 'market',
       'matched', v_matched
     ))
  returning id into v_item;

  insert into public.governance_audit_events
    (actor, action, target_type, target_id, detail)
  values
    (v_actor, 'commerce.course_order_created', 'order', v_order,
     jsonb_build_object(
       'courseId', p_course_id,
       'courseVersionId', v_version,
       'productId', v_product,
       'priceId', v_price_id,
       'billingAccountId', v_account,
       'amountMinor', v_amount::text,
       'currencyCode', v_currency,
       'country', v_country,
       'matched', v_matched
     ));

  -- amountMinor is text, not a JSON number. Money carries a bigint all the way
  -- to the wire in this codebase and narrowing it in a return value would be
  -- the one place in the path that could lose precision.
  return jsonb_build_object(
    'orderId', v_order,
    'orderItemId', v_item,
    'billingAccountId', v_account,
    'productId', v_product,
    'priceId', v_price_id,
    'courseVersionId', v_version,
    'amountMinor', v_amount::text,
    'currencyCode', v_currency,
    'title', coalesce(v_product_name, v_course_title),
    'country', v_country,
    'matched', v_matched
  );
end;
$$;

comment on function public.create_course_order(uuid, text) is
  'The only writer of a course order. The price is resolved from the buyer''s account country (falling back to the request country on a first purchase) and never taken from the caller; the currency follows the price. Refuses a purchase that would grant nothing new, per billing account and course version.';

revoke all on function public.create_course_order(uuid, text) from public;
grant execute on function public.create_course_order(uuid, text) to authenticated;
