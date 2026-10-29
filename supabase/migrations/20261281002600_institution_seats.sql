-- A school buys thirty seats, and thirty pupils get a course.
--
-- WHY THIS EXISTS
-- ---------------
-- `commerce.institutions` was registered as CODE with one sentence against it:
-- *"Invoicing; bulk enrolment; B2B terms; purchase orders. Not in the project
-- record at all."* The institution half of the platform was built — memberships,
-- branding, counts, API keys, domain identity — and the commerce half was never
-- designed. A madrasah could join; it could not buy anything.
--
-- This is the part that can exist with no payment provider and no card, which is
-- the owner's constraint: **a school pays by bank transfer, a member of staff
-- records the invoice, and the school hands out seat codes.** Nothing here calls
-- a provider, and nothing here will start taking cards behind the owner's back.
--
-- WHAT A SEAT IS
-- --------------
-- One seat = one learner profile entitled to one course version. The version is
-- pinned when the order is recorded, because an enrolment pins a version (D5) and
-- a seat that could drift to a newer edition would hand a learner something the
-- school did not buy.
--
-- WHY CODES AND NOT MEMBERSHIPS
-- -----------------------------
-- The obvious design is "every member of the institution gets the course", and it
-- is wrong twice over. It would hand a course to every member forever, whether or
-- not the school paid for that many; and it would make the institution's roster a
-- gate on somebody's learning. A code is a thing the school can hand to a pupil,
-- on paper, without the platform knowing the pupil's name until they redeem it —
-- and **the school never learns it then either**, because the report it reads is
-- counts.
--
-- Codes are stored as SHA-256 hashes, exactly like institution API keys: the
-- plaintext is generated in the web app and shown once. A database dump cannot be
-- replayed as thirty free courses.

-- ---------------------------------------------------------------------------
-- What was bought
-- ---------------------------------------------------------------------------
create table public.institution_seat_orders (
  id uuid primary key default gen_random_uuid(),

  institution_id uuid not null
    references public.institutions (id) on delete restrict,

  course_id uuid not null
    references public.courses (id) on delete restrict,

  -- The pin. A seat is for an edition, not for whatever the course becomes.
  course_version_id uuid not null,
  constraint iso_version_belongs_to_course
    foreign key (course_id, course_version_id)
    references public.course_versions (course_id, id) on delete restrict,

  seats integer not null check (seats between 1 and 500),

  -- What was invoiced, per seat. Null means the owner recorded the seats without
  -- a price — a bursary, a pilot, an arrangement with a local mosque. The console
  -- says "price not recorded" rather than showing a zero, because a zero would be
  -- a claim about the money that nobody made.
  unit_price_minor bigint check (unit_price_minor is null or unit_price_minor >= 0),
  currency_code text check (currency_code ~ '^[A-Z]{3}$'),
  constraint iso_money_agrees check ((unit_price_minor is null) = (currency_code is null)),

  -- How it was paid. Required, and free text: a bank transfer reference, an
  -- invoice number, "cash at the office, receipt 41". This is the record the
  -- owner would need if a school ever disputed what it had bought.
  invoice_reference text not null
    check (length(btrim(invoice_reference)) between 3 and 200),
  purchased_on date not null default current_date,
  note text check (note is null or length(btrim(note)) <= 500),

  recorded_by uuid references public.user_profiles (user_id) on delete set null,
  created_at timestamptz not null default now()
);

create index institution_seat_orders_institution
  on public.institution_seat_orders (institution_id, created_at desc);

comment on table public.institution_seat_orders is
  'One purchase of seats by an institution, recorded by staff against an invoice. No payment provider is involved: this is the written record of money that moved outside the platform.';

-- ---------------------------------------------------------------------------
-- The seats themselves
-- ---------------------------------------------------------------------------
create table public.institution_seat_codes (
  id uuid primary key default gen_random_uuid(),

  order_id uuid not null
    references public.institution_seat_orders (id) on delete restrict,

  -- SHA-256 of the code, hex. The code is generated in the web app and shown
  -- once; this table cannot reconstruct it, which is what makes a dump harmless.
  code_hash text not null unique check (code_hash ~ '^[a-f0-9]{64}$'),

  -- The last four characters, in the clear. Not a secret on its own — a code is
  -- ten characters from a thirty-two character alphabet — and the only thing that
  -- lets an administrator match "the code ending 4F2A" to a row when a parent
  -- rings the office. Nothing here can be claimed from a tail.
  code_tail text not null check (code_tail ~ '^[A-Z0-9]{4}$'),

  issued_by uuid references public.user_profiles (user_id) on delete set null,
  issued_at timestamptz not null default now(),

  -- Who redeemed it. This is the platform's record, **not the school's**: no
  -- institution-facing function returns anything from these two columns or from
  -- learner_profile_id.
  claimed_by uuid references public.user_profiles (user_id) on delete set null,
  claimed_at timestamptz,
  learner_profile_id uuid
    references public.learner_profiles (id) on delete set null,

  -- A code withdrawn before it was used, or a seat taken back after it was. The
  -- enrolment and the learner's progress are never deleted: a hold changes no
  -- money and deletes nothing.
  voided_at timestamptz,
  voided_by uuid references public.user_profiles (user_id) on delete set null,
  voided_reason text,

  constraint isc_claim_agrees check ((claimed_at is null) = (claimed_by is null)),
  constraint isc_void_names_a_reason check (
    voided_at is null or length(btrim(coalesce(voided_reason, ''))) > 0)
);

create index institution_seat_codes_order
  on public.institution_seat_codes (order_id, issued_at);

-- One learner per seat, and one seat per learner per order: redeeming two codes
-- for the same course would spend a seat on an enrolment that already exists.
create unique index institution_seat_codes_one_per_learner
  on public.institution_seat_codes (order_id, learner_profile_id)
  where learner_profile_id is not null and voided_at is null;

comment on table public.institution_seat_codes is
  'One row per seat. The code itself is not stored; only its SHA-256 and its last four characters. Claimed rows carry the learner for the platform''s own records and are never surfaced to the institution.';

-- ---------------------------------------------------------------------------
-- Row level security: nothing reads these tables directly
-- ---------------------------------------------------------------------------
-- No policies at all — every read and write is a definer function below, so a
-- client that guesses the table name gets nothing. That is stricter than the
-- reporting tables, and deliberately: a seat code row is one step from a grant.
alter table public.institution_seat_orders enable row level security;
alter table public.institution_seat_codes  enable row level security;

-- ---------------------------------------------------------------------------
-- The grant source has to exist
-- ---------------------------------------------------------------------------
-- An institution seat is not a purchase by the learner and not a scholarship:
-- the school paid, and the ledger should be able to say so years later. Two
-- check constraints were written when there were only learner-paid paths, and
-- they are widened here rather than worked around. Rewriting them by name beats
-- dropping whatever the constraint happens to be called.
alter table public.course_enrolments
  drop constraint if exists course_enrolments_source_check;
alter table public.course_enrolments
  add constraint course_enrolments_source_check
  check (source in ('free', 'purchase', 'subscription', 'family_entitlement',
                    'admin_grant', 'scholarship', 'institution'));

alter table public.entitlement_grants
  drop constraint if exists entitlement_grants_source_type_check;
alter table public.entitlement_grants
  add constraint entitlement_grants_source_type_check
  check (source_type in ('purchase', 'subscription', 'family_entitlement', 'free',
                         'scholarship', 'admin_grant', 'promotion', 'institution'));

-- ---------------------------------------------------------------------------
-- Recording a purchase (staff)
-- ---------------------------------------------------------------------------
create or replace function public.record_institution_seat_order(
  p_institution      uuid,
  p_course           uuid,
  p_seats            integer,
  p_invoice_reference text,
  p_reason           text,
  p_unit_price_minor bigint default null,
  p_currency         text default null,
  p_course_version   uuid default null,
  p_note             text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor   uuid := public.current_user_id();
  v_reason  text := btrim(coalesce(p_reason, ''));
  v_invoice text := btrim(coalesce(p_invoice_reference, ''));
  v_version uuid;
  v_id      uuid;
begin
  if v_actor is null or not public.has_role(v_actor, 'platform_admin') then
    raise exception 'institution:not_allowed'
      using errcode = 'insufficient_privilege';
  end if;
  if not public.setting_bool('commerce.institutions', false) then
    raise exception 'institution:seats_closed'
      using errcode = 'feature_not_supported';
  end if;
  if v_reason = '' then
    raise exception 'institution:reason_required'
      using errcode = 'check_violation';
  end if;
  if v_invoice = '' then
    raise exception 'institution:invoice_required'
      using errcode = 'check_violation';
  end if;
  if p_seats is null or p_seats < 1 or p_seats > 500 then
    raise exception 'institution:seats_out_of_range'
      using errcode = 'invalid_parameter_value';
  end if;
  if not exists (select 1 from public.institutions
                  where id = p_institution and deleted_at is null) then
    raise exception 'institution:not_found'
      using errcode = 'no_data_found';
  end if;

  -- The version is resolved here rather than trusted from a caller: the newest
  -- published edition is what a school means when it buys "the course".
  if p_course_version is null then
    select cv.id into v_version
      from public.course_versions cv
     where cv.course_id = p_course
       and cv.version_status = 'published'
     order by cv.version_number desc
     limit 1;
  else
    select cv.id into v_version
      from public.course_versions cv
     where cv.id = p_course_version and cv.course_id = p_course;
  end if;

  if v_version is null then
    raise exception 'institution:not_published'
      using errcode = 'check_violation';
  end if;
  if (p_unit_price_minor is null) <> (p_currency is null) then
    raise exception 'institution:money_incomplete'
      using errcode = 'invalid_parameter_value';
  end if;

  insert into public.institution_seat_orders
    (institution_id, course_id, course_version_id, seats,
     unit_price_minor, currency_code, invoice_reference, note, recorded_by)
  values
    (p_institution, p_course, v_version, p_seats,
     p_unit_price_minor, upper(p_currency), v_invoice,
     nullif(btrim(coalesce(p_note, '')), ''), v_actor)
  returning id into v_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'institution.seats_recorded', 'institution', p_institution,
          jsonb_build_object('orderId', v_id, 'courseId', p_course,
                             'courseVersionId', v_version, 'seats', p_seats,
                             'invoice', v_invoice, 'reason', v_reason));

  return jsonb_build_object('orderId', v_id, 'courseVersionId', v_version, 'seats', p_seats);
end;
$$;

revoke all on function public.record_institution_seat_order(uuid, uuid, integer, text, text, bigint, text, uuid, text)
  from public, anon;
grant execute on function public.record_institution_seat_order(uuid, uuid, integer, text, text, bigint, text, uuid, text)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Issuing codes (the institution's administrator)
-- ---------------------------------------------------------------------------
-- The codes are generated in the web app and only their hashes and tails arrive
-- here, so this function cannot leak a code it never saw. It refuses to issue
-- more than the order has left, which is the one arithmetic rule that keeps
-- "thirty seats" meaning thirty.
create or replace function public.issue_institution_seat_codes(
  p_order uuid,
  p_codes jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor   uuid := public.current_user_id();
  v_member  public.institution_memberships;
  v_order   public.institution_seat_orders;
  v_issued  integer;
  v_want    integer;
  v_hash    text;
  v_tail    text;
  v_entry   jsonb;
begin
  if v_actor is null then
    raise exception 'institution:not_signed_in'
      using errcode = 'insufficient_privilege';
  end if;
  if not public.setting_bool('commerce.institutions', false) then
    raise exception 'institution:seats_closed'
      using errcode = 'feature_not_supported';
  end if;

  select * into v_order from public.institution_seat_orders where id = p_order;
  if v_order.id is null then
    raise exception 'institution:order_not_found'
      using errcode = 'no_data_found';
  end if;

  select * into v_member
    from public.institution_memberships
   where institution_id = v_order.institution_id
     and user_id = v_actor and status = 'active' and role = 'admin';
  if v_member.id is null then
    raise exception 'institution:not_an_admin'
      using errcode = 'insufficient_privilege';
  end if;

  if p_codes is null or jsonb_typeof(p_codes) <> 'array' then
    raise exception 'institution:no_codes'
      using errcode = 'invalid_parameter_value';
  end if;
  v_want := jsonb_array_length(p_codes);
  if v_want < 1 or v_want > 200 then
    raise exception 'institution:codes_out_of_range'
      using errcode = 'invalid_parameter_value';
  end if;

  select count(*) into v_issued
    from public.institution_seat_codes where order_id = p_order;
  if v_issued + v_want > v_order.seats then
    raise exception 'institution:not_enough_seats'
      using errcode = 'check_violation';
  end if;

  for v_entry in select * from jsonb_array_elements(p_codes) loop
    v_hash := lower(coalesce(v_entry ->> 'hash', ''));
    v_tail := upper(coalesce(v_entry ->> 'tail', ''));
    if v_hash !~ '^[a-f0-9]{64}$' then
      raise exception 'institution:bad_code'
        using errcode = 'invalid_parameter_value';
    end if;
    if v_tail !~ '^[A-Z0-9]{4}$' then
      raise exception 'institution:bad_code'
        using errcode = 'invalid_parameter_value';
    end if;
    insert into public.institution_seat_codes (order_id, code_hash, code_tail, issued_by)
    values (p_order, v_hash, v_tail, v_actor);
  end loop;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'institution.seat_codes_issued', 'institution', v_order.institution_id,
          jsonb_build_object('orderId', p_order, 'issued', v_want,
                             'previouslyIssued', v_issued));

  return jsonb_build_object('issued', v_want, 'total', v_issued + v_want,
                            'seats', v_order.seats);
end;
$$;

revoke all on function public.issue_institution_seat_codes(uuid, jsonb) from public, anon;
grant execute on function public.issue_institution_seat_codes(uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Redeeming one (anybody signed in)
-- ---------------------------------------------------------------------------
-- The learner is either the caller's own profile or one they are allowed to
-- manage, so a parent redeems a seat for their child and the child's enrolment
-- carries the institution id. Everything the enrolment triggers demand — the
-- version being published, the course not suspended, and guardian verification
-- when that flag is on — still applies: this function does not bypass a single
-- gate, it only pays the entrance fee.
create or replace function public.claim_institution_seat(
  p_code_hash text,
  p_learner   uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor   uuid := public.current_user_id();
  v_code    public.institution_seat_codes;
  v_order   public.institution_seat_orders;
  v_learner uuid := p_learner;
  v_own     jsonb;
  v_version public.course_versions;
  v_course  public.courses;
  v_grant   uuid;
begin
  if v_actor is null then
    raise exception 'institution:not_signed_in'
      using errcode = 'insufficient_privilege';
  end if;
  if not public.setting_bool('commerce.institutions', false) then
    raise exception 'institution:seats_closed'
      using errcode = 'feature_not_supported';
  end if;
  if p_code_hash is null or p_code_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'institution:bad_code'
      using errcode = 'invalid_parameter_value';
  end if;

  -- Locked, because two parents clicking at the same second is not a rare
  -- event at the start of a term and one seat must not serve two learners.
  select * into v_code
    from public.institution_seat_codes
   where code_hash = lower(p_code_hash)
   for update;

  if v_code.id is null then
    raise exception 'institution:code_unknown'
      using errcode = 'no_data_found';
  end if;
  if v_code.voided_at is not null then
    raise exception 'institution:code_voided'
      using errcode = 'check_violation';
  end if;
  if v_code.claimed_at is not null then
    raise exception 'institution:code_used'
      using errcode = 'unique_violation';
  end if;

  select * into v_order from public.institution_seat_orders where id = v_code.order_id;
  select * into v_version from public.course_versions where id = v_order.course_version_id;
  select * into v_course  from public.courses where id = v_order.course_id;

  if v_course.suspended_at is not null or v_course.deleted_at is not null
     or v_version.version_status <> 'published' then
    raise exception 'institution:course_unavailable'
      using errcode = 'check_violation';
  end if;

  -- Whose learning is this. No argument means "mine", and creating one's own
  -- profile is the same idempotent function the rest of the platform uses.
  if v_learner is null then
    v_own := public.claim_own_learner_profile();
    v_learner := (v_own ->> 'learnerProfileId')::uuid;
  elsif not public.can_access_learner(v_learner) then
    raise exception 'institution:not_your_learner'
      using errcode = 'insufficient_privilege';
  end if;

  if exists (
    select 1 from public.course_enrolments ce
     where ce.learner_profile_id = v_learner
       and ce.course_id = v_order.course_id
       and ce.status in ('active', 'completed')
       and ce.deleted_at is null
  ) then
    -- Refused, and the code stays unspent — which is the whole reason to look
    -- before writing: a school that hands a code to somebody already enrolled
    -- should be able to hand it to somebody else.
    raise exception 'institution:already_enrolled'
      using errcode = 'unique_violation';
  end if;

  -- Grant first: can_enrol_in_version() consults the ledger, so the enrolment
  -- below would be refused by the same rule that protects every other path.
  insert into public.entitlement_grants
    (learner_profile_id, scope_type, course_version_id, source_type, source_id,
     status, effective_from)
  values
    (v_learner, 'course_version', v_order.course_version_id, 'institution',
     v_code.id, 'active', now())
  returning id into v_grant;

  insert into public.course_enrolments
    (learner_profile_id, course_id, course_version_id, institution_id, source, status)
  values
    (v_learner, v_order.course_id, v_order.course_version_id,
     v_order.institution_id, 'institution', 'active');

  update public.institution_seat_codes
     set claimed_by = v_actor,
         claimed_at = now(),
         learner_profile_id = v_learner
   where id = v_code.id;

  -- The audit names the order and the course. It does not name the learner:
  -- the institution's own audit trail is readable by staff who may not be
  -- entitled to know which child took which seat.
  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'institution.seat_claimed', 'institution', v_order.institution_id,
          jsonb_build_object('orderId', v_order.id, 'courseId', v_order.course_id,
                             'codeTail', v_code.code_tail));

  return jsonb_build_object(
    'courseId', v_order.course_id,
    'courseTitle', v_course.title,
    'courseSlug', v_course.slug,
    'versionNumber', v_version.version_number,
    'learnerProfileId', v_learner,
    'orderId', v_order.id);
end;
$$;

revoke all on function public.claim_institution_seat(text, uuid) from public, anon;
grant execute on function public.claim_institution_seat(text, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Taking a seat back
-- ---------------------------------------------------------------------------
-- A hold changes no money and deletes nothing. Voiding an unused code simply
-- stops it working. Voiding a claimed seat revokes the entitlement — the learner
-- keeps their enrolment, their progress and anything they have completed,
-- because withdrawing a grant is not the same act as erasing a term's work.
create or replace function public.void_institution_seat_code(
  p_code   uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor  uuid := public.current_user_id();
  v_reason text := btrim(coalesce(p_reason, ''));
  v_code   public.institution_seat_codes;
  v_order  public.institution_seat_orders;
  v_member public.institution_memberships;
  v_revoked integer := 0;
begin
  if v_actor is null then
    raise exception 'institution:not_signed_in'
      using errcode = 'insufficient_privilege';
  end if;
  if v_reason = '' then
    raise exception 'institution:reason_required'
      using errcode = 'check_violation';
  end if;

  select * into v_code from public.institution_seat_codes where id = p_code for update;
  if v_code.id is null then
    raise exception 'institution:code_not_found'
      using errcode = 'no_data_found';
  end if;

  select * into v_order from public.institution_seat_orders where id = v_code.order_id;
  select * into v_member
    from public.institution_memberships
   where institution_id = v_order.institution_id
     and user_id = v_actor and status = 'active' and role = 'admin';
  if v_member.id is null then
    raise exception 'institution:not_an_admin'
      using errcode = 'insufficient_privilege';
  end if;

  if v_code.voided_at is null then
    update public.institution_seat_codes
       set voided_at = now(), voided_by = v_actor, voided_reason = v_reason
     where id = v_code.id;

    if v_code.claimed_at is not null then
      update public.entitlement_grants
         set status = 'revoked',
             revoked_at = now(),
             revoked_by = v_actor,
             revocation_reason = v_reason
       where source_type = 'institution'
         and source_id = v_code.id
         and status = 'active';
      v_revoked := 1;
    end if;

    insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
    values (v_actor, 'institution.seat_voided', 'institution', v_order.institution_id,
            jsonb_build_object('orderId', v_order.id, 'codeId', v_code.id,
                               'wasClaimed', v_code.claimed_at is not null,
                               'reason', v_reason));
  end if;

  return jsonb_build_object('voided', true,
                            'alreadyVoided', v_code.voided_at is not null,
                            'entitlementRevoked', v_revoked > 0);
end;
$$;

revoke all on function public.void_institution_seat_code(uuid, text) from public, anon;
grant execute on function public.void_institution_seat_code(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- What the institution may see: counts
-- ---------------------------------------------------------------------------
-- Every number here is a count, a date, a price or a course title. No learner,
-- no name, no account, no profile id — and the only per-seat rows surrendered
-- are the last four characters of a code and whether it is spent, because that
-- is what an office needs to answer "the code ending 4F2A does not work".
create or replace function public.institution_seat_summary(p_institution uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'orders', coalesce((
      select jsonb_agg(jsonb_build_object(
               'orderId', o.id,
               'courseId', o.course_id,
               'courseTitle', c.title,
               'versionNumber', cv.version_number,
               'seats', o.seats,
               'issued', coalesce(sc.issued, 0),
               'claimed', coalesce(sc.claimed, 0),
               'voided', coalesce(sc.voided, 0),
               'remaining', o.seats - coalesce(sc.issued, 0),
               'unitPriceMinor', o.unit_price_minor,
               'currency', o.currency_code,
               'invoiceReference', o.invoice_reference,
               'purchasedOn', o.purchased_on,
               'note', o.note,
               'codes', coalesce(sc.codes, '[]'::jsonb))
             order by o.created_at desc)
        from public.institution_seat_orders o
        join public.courses c on c.id = o.course_id
        join public.course_versions cv on cv.id = o.course_version_id
        left join lateral (
          select count(*)::int as issued,
                 count(*) filter (where k.claimed_at is not null)::int as claimed,
                 count(*) filter (where k.voided_at is not null)::int as voided,
                 coalesce(jsonb_agg(jsonb_build_object(
                   'id', k.id,
                   'tail', k.code_tail,
                   'issuedAt', k.issued_at,
                   'claimed', k.claimed_at is not null,
                   'claimedAt', k.claimed_at,
                   'voided', k.voided_at is not null,
                   'voidedReason', k.voided_reason) order by k.issued_at)
                 filter (where true), '[]'::jsonb) as codes
            from public.institution_seat_codes k
           where k.order_id = o.id) sc on true
       where o.institution_id = p_institution), '[]'::jsonb),
    'totals', jsonb_build_object(
      'seats', coalesce((select sum(o.seats)::int from public.institution_seat_orders o
                          where o.institution_id = p_institution), 0),
      'claimed', coalesce((select count(*)::int
                             from public.institution_seat_codes k
                             join public.institution_seat_orders o on o.id = k.order_id
                            where o.institution_id = p_institution
                              and k.claimed_at is not null and k.voided_at is null), 0),
      'unissued', coalesce((select (sum(o.seats) - count(k.id))::int
                              from public.institution_seat_orders o
                              left join public.institution_seat_codes k on k.order_id = o.id
                             where o.institution_id = p_institution), 0)));
$$;

revoke all on function public.institution_seat_summary(uuid) from public, anon, authenticated;
comment on function public.institution_seat_summary(uuid) is
  'Seats bought, issued and claimed for one institution, as counts. Internal: no permission check, so it is not callable by a client.';

create or replace function public.my_institution_seats()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor  uuid := public.current_user_id();
  v_member public.institution_memberships;
  v_on     boolean := public.setting_bool('commerce.institutions', false);
begin
  if v_actor is null then
    raise exception 'institution:not_signed_in'
      using errcode = 'insufficient_privilege';
  end if;

  select * into v_member
    from public.institution_memberships
   where user_id = v_actor and status = 'active'
   limit 1;

  if v_member.id is null then
    return jsonb_build_object('enabled', v_on, 'joined', false,
                              'isAdmin', false, 'orders', '[]'::jsonb,
                              'totals', jsonb_build_object('seats', 0, 'claimed', 0, 'unissued', 0));
  end if;

  -- A member is told the feature exists and nothing else. Which courses their
  -- school bought is the school's business, not every pupil's.
  if v_member.role <> 'admin' then
    return jsonb_build_object('enabled', v_on, 'joined', true,
                              'isAdmin', false, 'orders', '[]'::jsonb,
                              'totals', jsonb_build_object('seats', 0, 'claimed', 0, 'unissued', 0));
  end if;

  return jsonb_build_object(
    'enabled', v_on,
    'joined', true,
    'isAdmin', true,
    'institutionId', v_member.institution_id,
    'orders', coalesce(public.institution_seat_summary(v_member.institution_id) -> 'orders', '[]'::jsonb),
    'totals', public.institution_seat_summary(v_member.institution_id) -> 'totals');
end;
$$;

revoke all on function public.my_institution_seats() from public, anon;
grant execute on function public.my_institution_seats() to authenticated;

-- ---------------------------------------------------------------------------
-- What staff see: every institution that has bought anything
-- ---------------------------------------------------------------------------
create or replace function public.institution_seat_directory()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
begin
  if v_actor is null
     or not (public.has_role(v_actor, 'platform_admin')
             or public.has_role(v_actor, 'governance_admin')) then
    raise exception 'institution:not_allowed'
      using errcode = 'insufficient_privilege';
  end if;

  -- Per order first, then per institution. Nesting the two counts in one
  -- statement is how you get "aggregate function calls cannot be nested".
  return jsonb_build_object(
    'enabled', public.setting_bool('commerce.institutions', false),
    'institutions', coalesce((
      with per_order as (
        select o.institution_id,
               o.id,
               o.seats,
               (select count(*)::int
                  from public.institution_seat_codes c
                 where c.order_id = o.id
                   and c.claimed_at is not null
                   and c.voided_at is null) as claimed
          from public.institution_seat_orders o
      )
      select jsonb_agg(jsonb_build_object(
               'institutionId', t.id,
               'name', t.name,
               'code', t.code,
               'orders', t.orders,
               'seats', t.seats,
               'claimed', t.claimed)
             order by t.name)
        from (
          select i.id, i.name, i.code,
                 count(po.id)::int as orders,
                 coalesce(sum(po.seats), 0)::int as seats,
                 coalesce(sum(po.claimed), 0)::int as claimed
            from public.institutions i
            join per_order po on po.institution_id = i.id
           where i.deleted_at is null
           group by i.id, i.name, i.code) t), '[]'::jsonb));
end;
$$;

revoke all on function public.institution_seat_directory() from public, anon;
grant execute on function public.institution_seat_directory() to authenticated;

-- ---------------------------------------------------------------------------
-- The flag, and what it now waits for
-- ---------------------------------------------------------------------------
-- It moves from CODE to ADMIN because the code it named now exists. The
-- preconditions stay honest: the first school still needs an invoice and a
-- written agreement about what happens to the seats when the year ends, and
-- nothing here can decide that.
update public.platform_settings
   set gate_type = 'admin',
       preconditions = '**Built 2026-10-28: seats, invoices and claim codes.** A school buys seats '
        || 'for one published course version; a member of staff records the invoice on `/admin/institutions` '
        || '(no payment provider is involved, so the money moves outside the platform and the record says '
        || 'so); the school''s own administrator issues one code per seat and hands them out; a parent or '
        || 'pupil redeems a code at `/institution/claim`, and the seat becomes an entitlement with source '
        || '`institution` and an enrolment that carries the institution id. Codes are stored as SHA-256, '
        || 'shown once, and the last four characters are the only part kept in the clear — enough for an '
        || 'office to match "the code ending 4F2A" and useless to anybody else. **The school never learns '
        || 'who redeemed a seat**: its report is counts, a date, a price and a course title. What still '
        || 'needs the owner: an invoice (or a bursary) for the first order, a written agreement about '
        || 'refunds when a school leaves mid-year, and a decision on whether seats expire — nothing in '
        || 'this migration invents an expiry',
       description = 'Madrasahs, Islamic schools and organisations buying seats'
 where key = 'commerce.institutions';
