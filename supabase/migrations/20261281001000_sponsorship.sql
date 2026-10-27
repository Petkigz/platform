-- Sponsoring a seat: zakat and sadaqah, without a payment provider.
--
-- WHAT WAS MISSING
-- ----------------
-- `commerce.sponsorship` sat in the register with three preconditions: eligibility
-- rules, donor receipts, and whether a sponsored seat counts as zakat. None of
-- the three is a coding problem in the usual sense, which is why the flag had
-- been untouched since the register was written.
--
-- The owner's answer (2026-10-26) settles the first: **a learner asks, staff
-- decide, and a donor covers a seat they never see the name of.** That is a
-- mechanism, and it is this file. The third is not the platform's to answer —
-- whether a gift counts as zakat is a scholar's ruling, and the screens say so
-- rather than guessing. The second is what the record already does everywhere
-- else: a payment is recorded by staff with a reference, because there is no
-- card or mobile-money provider to take it automatically.
--
-- WHAT THIS IS NOT
-- ----------------
-- This is not a checkout. A sponsor does not buy a product; they pay for
-- somebody else's seat. So no order is created, no tax or transfer fee applies,
-- and no teacher earning accrues from it — an earning is a share of a sale, and
-- nobody sold anything. Saying that here is cheaper than discovering it in a
-- revenue report.
--
-- WHAT A SPONSOR SEES
-- -------------------
-- A seat code, the course, who the course is for, and the price *in the
-- sponsor's own market* — the same rule every other price in this platform
-- follows. Never the learner's name, age, family, progress or note. The note is
-- read by staff deciding the application, and by nobody else.

-- ---------------------------------------------------------------------------
-- Asking
-- ---------------------------------------------------------------------------
create table public.sponsorship_applications (
  id uuid primary key default gen_random_uuid(),

  learner_profile_id uuid not null
    references public.learner_profiles (id) on delete cascade,

  course_id uuid not null
    references public.courses (id) on delete restrict,

  -- Who asked. Usually a guardian asking for a child, sometimes an adult asking
  -- for themselves; either is allowed, and it is checked against the learner.
  applied_by uuid not null
    references public.user_profiles (user_id) on delete cascade,

  -- The situation, in the applicant's own words. Private: staff deciding the
  -- application and the applicant. A sponsor never sees a word of it, which is
  -- why it lives in its own column rather than in a description a pool query
  -- could pick up by accident.
  reason text not null check (length(btrim(reason)) > 0),

  status text not null default 'submitted'
    check (status in ('submitted', 'approved', 'declined', 'withdrawn', 'funded')),

  -- The handle a sponsor uses. Set when an application is approved, so a donor
  -- and staff can talk about "seat SPN-3F2C91" without anybody naming a child.
  seat_code text unique
    check (seat_code is null or seat_code ~ '^SPN-[A-Z0-9]{6}$'),

  decision_reason text,
  decided_by uuid references public.user_profiles (user_id) on delete set null,
  decided_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint sa_decision_agrees check (
    (status in ('approved', 'declined', 'funded'))
      = (decided_at is not null and decided_by is not null)
  ),
  -- A seat code is minted only on approval, so it is present exactly when the
  -- request stands: approved, or funded after a donor covered it.
  constraint sa_seat_code_only_when_approved check (
    (status in ('approved', 'funded')) = (seat_code is not null)
  )
);

-- One live ask per learner per course. A declined one may be asked again — the
-- circumstances change — but two open asks for the same thing is one person
-- twice in a queue that somebody has to read.
create unique index sponsorship_applications_one_open
  on public.sponsorship_applications (learner_profile_id, course_id)
  where status in ('submitted', 'approved', 'funded');

create index sponsorship_applications_status_idx
  on public.sponsorship_applications (status, created_at);
create index sponsorship_applications_learner_idx
  on public.sponsorship_applications (learner_profile_id);

create trigger sponsorship_applications_set_updated_at
  before update on public.sponsorship_applications
  for each row execute function public.set_updated_at();

comment on table public.sponsorship_applications is
  'A learner asking for a sponsored seat, staff deciding it, with the situation kept private to those two.';

-- ---------------------------------------------------------------------------
-- Covering it
-- ---------------------------------------------------------------------------
create table public.sponsorships (
  id uuid primary key default gen_random_uuid(),

  -- One application, one sponsorship. A seat cannot be paid for twice, and a
  -- second donor arriving at a seat that has just been covered is refused
  -- rather than charged.
  application_id uuid not null unique
    references public.sponsorship_applications (id) on delete restrict,

  donor_user_id uuid not null
    references public.user_profiles (user_id) on delete restrict,

  -- What the sponsor was told to pay, at the price their own market carried when
  -- they pledged. Snapshotted, so a price change later does not move a promise.
  amount_minor bigint not null check (amount_minor > 0),
  currency_code text not null check (currency_code ~ '^[A-Z]{3}$'),

  status text not null default 'pledged'
    check (status in ('pledged', 'paid', 'withdrawn')),

  -- Anything the sponsor wants staff to know. Never shown to the applicant.
  note text,

  -- The receipt: what staff recorded receiving, when, and against what.
  reference text,
  evidence text,
  recorded_by uuid references public.user_profiles (user_id) on delete set null,
  recorded_at timestamptz,

  -- The grant this paid for, so "what did this money buy" has an answer years
  -- later even if the learner's record is archived.
  entitlement_grant_id uuid references public.entitlement_grants (id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint sp_paid_agrees check (
    (status = 'paid')
      = (recorded_at is not null and recorded_by is not null and reference is not null)
  )
);

create index sponsorships_donor_idx on public.sponsorships (donor_user_id, created_at desc);
create index sponsorships_status_idx on public.sponsorships (status, created_at);

create trigger sponsorships_set_updated_at
  before update on public.sponsorships
  for each row execute function public.set_updated_at();

comment on table public.sponsorships is
  'A donor covering one approved seat. Pledged first, paid when staff record the money, never created by an automatic provider callback because there is no provider.';

-- ---------------------------------------------------------------------------
-- Who may decide
-- ---------------------------------------------------------------------------
-- The owner's answer (2026-10-26) is "the owner or finance", so this is a money
-- pair rather than `is_privileged()`. A support agent reading a queue is being
-- informed; a support agent deciding who receives a free course is a different
-- act, and not one their job contains.
create or replace function public.can_decide_sponsorship(p_actor uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_actor is not null
     and (public.has_role(p_actor, 'platform_admin')
          or public.has_role(p_actor, 'finance_admin'));
$$;

revoke all on function public.can_decide_sponsorship(uuid) from public, anon;
grant execute on function public.can_decide_sponsorship(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Asking
-- ---------------------------------------------------------------------------
create or replace function public.apply_for_sponsorship(
  p_learner_profile_id uuid,
  p_course_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor   uuid := public.current_user_id();
  v_reason  text := btrim(coalesce(p_reason, ''));
  v_version uuid;
  v_id      uuid;
begin
  if v_actor is null then
    raise exception 'sponsorship:not_signed_in'
      using errcode = 'insufficient_privilege';
  end if;
  if not public.setting_bool('commerce.sponsorship', false) then
    raise exception 'sponsorship:disabled'
      using errcode = 'feature_not_supported';
  end if;
  if p_learner_profile_id is null then
    raise exception 'sponsorship:learner_required'
      using errcode = 'invalid_parameter_value';
  end if;
  if v_reason = '' then
    raise exception 'sponsorship:reason_required'
      using errcode = 'check_violation';
  end if;
  if length(v_reason) > 2000 then
    raise exception 'sponsorship:reason_too_long'
      using errcode = 'invalid_parameter_value';
  end if;

  -- The same rule checkout uses: the learner is yours, or a child in a family
  -- you belong to. Applying on behalf of a stranger would be a way to put
  -- somebody else's name in a queue they never agreed to.
  if not exists (
    select 1 from public.learner_profiles lp
     where lp.id = p_learner_profile_id
       and lp.status = 'active'
       and lp.deleted_at is null
       and (lp.linked_user_id = v_actor or public.is_learner_family_member(lp.id))
  ) then
    raise exception 'sponsorship:learner_not_yours'
      using errcode = 'insufficient_privilege';
  end if;

  select cv.id into v_version
    from public.courses c
    join public.course_versions cv on cv.course_id = c.id
   where c.id = p_course_id
     and c.status = 'active'
     and c.deleted_at is null
     and cv.version_status = 'published'
   order by cv.version_number desc
   limit 1;

  if v_version is null then
    raise exception 'sponsorship:course_not_available'
      using errcode = 'no_data_found';
  end if;

  -- Asking for something you already have is not a request anybody can grant.
  if public.can_access_course_version(p_learner_profile_id, v_version) then
    raise exception 'sponsorship:already_has_access'
      using errcode = 'check_violation';
  end if;

  if exists (
    select 1 from public.sponsorship_applications sa
     where sa.learner_profile_id = p_learner_profile_id
       and sa.course_id = p_course_id
       and sa.status in ('submitted', 'approved', 'funded')
  ) then
    raise exception 'sponsorship:already_asked'
      using errcode = 'unique_violation';
  end if;

  insert into public.sponsorship_applications
    (learner_profile_id, course_id, applied_by, reason)
  values (p_learner_profile_id, p_course_id, v_actor, v_reason)
  returning id into v_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'sponsorship.application_submitted', 'sponsorship_application', v_id,
          jsonb_build_object('courseId', p_course_id, 'learnerProfileId', p_learner_profile_id));

  return jsonb_build_object('applicationId', v_id, 'status', 'submitted');
end;
$$;

comment on function public.apply_for_sponsorship(uuid, uuid, text) is
  'A learner asks for a sponsored seat. Refuses a learner who is not the caller''s, a course that is not on sale, and a course the learner already holds.';

-- ---------------------------------------------------------------------------
-- Deciding
-- ---------------------------------------------------------------------------
create or replace function public.decide_sponsorship_application(
  p_application uuid,
  p_approve     boolean,
  p_reason      text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor  uuid := public.current_user_id();
  v_reason text := btrim(coalesce(p_reason, ''));
  v_row    public.sponsorship_applications;
  v_code   text;
  v_try    integer := 0;
begin
  if not public.can_decide_sponsorship(v_actor) then
    raise exception 'sponsorship:not_allowed'
      using errcode = 'insufficient_privilege';
  end if;
  if v_reason = '' then
    raise exception 'sponsorship:reason_required'
      using errcode = 'check_violation';
  end if;

  select * into v_row from public.sponsorship_applications where id = p_application;
  if not found then
    raise exception 'sponsorship:not_found'
      using errcode = 'no_data_found';
  end if;
  if v_row.status <> 'submitted' then
    raise exception 'sponsorship:already_decided'
      using errcode = 'check_violation';
  end if;

  if p_approve then
    loop
      v_try := v_try + 1;
      v_code := 'SPN-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
      exit when not exists (
        select 1 from public.sponsorship_applications where seat_code = v_code);
      if v_try > 50 then
        raise exception 'sponsorship:code_unavailable'
          using errcode = 'unique_violation';
      end if;
    end loop;

    update public.sponsorship_applications
       set status = 'approved',
           seat_code = v_code,
           decision_reason = v_reason,
           decided_by = v_actor,
           decided_at = now()
     where id = p_application;
  else
    update public.sponsorship_applications
       set status = 'declined',
           decision_reason = v_reason,
           decided_by = v_actor,
           decided_at = now()
     where id = p_application;
  end if;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor,
          case when p_approve then 'sponsorship.application_approved'
               else 'sponsorship.application_declined' end,
          'sponsorship_application', p_application,
          jsonb_build_object('reason', v_reason,
                             'seatCode', case when p_approve then v_code else null end));

  return jsonb_build_object(
    'status', case when p_approve then 'approved' else 'declined' end,
    'seatCode', case when p_approve then v_code else null end);
end;
$$;

comment on function public.decide_sponsorship_application(uuid, boolean, text) is
  'Owner or finance decides a request, with a written reason either way. Approving mints the seat code a donor sees; the learner is still never named.';

-- ---------------------------------------------------------------------------
-- The pool a donor reads
-- ---------------------------------------------------------------------------
-- One row per approved, uncovered seat, priced **for the reader**. The pool is
-- deliberately narrow: a seat code, the course, who it is for, and a price. No
-- name, no age, no household, no note. A pool query that could be sorted by
-- vulnerability would be a way to rank children.
create or replace function public.sponsorship_pool(p_country text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
  v_rows  jsonb;
begin
  if v_actor is null then
    return jsonb_build_object('enabled', false, 'reason', 'not_signed_in', 'seats', '[]'::jsonb);
  end if;
  if not public.setting_bool('commerce.sponsorship', false) then
    return jsonb_build_object('enabled', false, 'reason', 'disabled', 'seats', '[]'::jsonb);
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'seatCode',    sa.seat_code,
           'courseTitle', c.title,
           'courseSlug',  c.slug,
           'audience',    c.audience,
           'difficulty',  c.difficulty,
           'approvedAt',  sa.decided_at,
           'price', (select jsonb_build_object(
                       'resolved',    (p ->> 'resolved')::boolean,
                       'amountMinor', p ->> 'amountMinor',
                       'currencyCode', p ->> 'currencyCode',
                       'reason',      p ->> 'reason')
                       from public.resolve_course_price(c.id, p_country, null) p)
         ) order by sa.decided_at), '[]'::jsonb)
    into v_rows
    from public.sponsorship_applications sa
    join public.courses c on c.id = sa.course_id
   where sa.status = 'approved'
     and sa.seat_code is not null
     and not exists (
       select 1 from public.sponsorships sp
        where sp.application_id = sa.id and sp.status in ('pledged', 'paid'))
     and not exists (
       select 1 from public.course_enrolments ce
        where ce.learner_profile_id = sa.learner_profile_id
          and ce.course_id = sa.course_id
          and ce.deleted_at is null
          and ce.status = 'active');

  return jsonb_build_object('enabled', true, 'seats', v_rows);
end;
$$;

comment on function public.sponsorship_pool(text) is
  'Approved seats with no donor, priced for the reader''s own market, carrying no name, age, household or note. Signed in only.';

-- ---------------------------------------------------------------------------
-- Pledging
-- ---------------------------------------------------------------------------
create or replace function public.pledge_sponsorship(
  p_seat_code text,
  p_country   text default null,
  p_note      text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor   uuid := public.current_user_id();
  v_code    text := upper(btrim(coalesce(p_seat_code, '')));
  v_app     public.sponsorship_applications;
  v_price   jsonb;
  v_note    text := nullif(btrim(coalesce(p_note, '')), '');
  v_id      uuid;
begin
  if v_actor is null then
    raise exception 'sponsorship:not_signed_in'
      using errcode = 'insufficient_privilege';
  end if;
  if not public.setting_bool('commerce.sponsorship', false) then
    raise exception 'sponsorship:disabled'
      using errcode = 'feature_not_supported';
  end if;

  select * into v_app from public.sponsorship_applications where seat_code = v_code;
  if not found then
    raise exception 'sponsorship:seat_not_found'
      using errcode = 'no_data_found';
  end if;
  if v_app.status <> 'approved' then
    raise exception 'sponsorship:seat_not_open'
      using errcode = 'check_violation';
  end if;

  -- Sponsoring your own request would be a purchase wearing a donation's
  -- clothes. The buy page is the honest way to pay for your own course.
  if v_app.applied_by = v_actor
     or exists (select 1 from public.learner_profiles lp
                 where lp.id = v_app.learner_profile_id and lp.linked_user_id = v_actor)
  then
    raise exception 'sponsorship:own_seat'
      using errcode = 'check_violation';
  end if;

  if exists (
    select 1 from public.sponsorships sp
     where sp.application_id = v_app.id and sp.status in ('pledged', 'paid')
  ) then
    raise exception 'sponsorship:seat_taken'
      using errcode = 'unique_violation';
  end if;

  if v_note is not null and length(v_note) > 500 then
    raise exception 'sponsorship:note_too_long'
      using errcode = 'invalid_parameter_value';
  end if;

  -- The price is the course's live price in the sponsor's market, resolved the
  -- same way checkout resolves one. The sponsor never types an amount.
  v_price := public.resolve_course_price(v_app.course_id, public.normalise_country(p_country), null);

  if not coalesce((v_price ->> 'resolved')::boolean, false) then
    raise exception 'sponsorship:no_price_for_you'
      using errcode = 'invalid_parameter_value';
  end if;

  insert into public.sponsorships
    (application_id, donor_user_id, amount_minor, currency_code, note)
  values
    (v_app.id, v_actor, (v_price ->> 'amountMinor')::bigint, v_price ->> 'currencyCode', v_note)
  returning id into v_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'sponsorship.pledged', 'sponsorship', v_id,
          jsonb_build_object('seatCode', v_code,
                             'amountMinor', v_price ->> 'amountMinor',
                             'currency', v_price ->> 'currencyCode'));

  return jsonb_build_object(
    'sponsorshipId', v_id,
    'seatCode', v_code,
    'amountMinor', (v_price ->> 'amountMinor')::bigint,
    'currencyCode', v_price ->> 'currencyCode',
    'status', 'pledged');
end;
$$;

comment on function public.pledge_sponsorship(text, text, text) is
  'A sponsor takes one approved seat, at the course price in their own market. Pledged, not paid: no provider can take the money, so staff record it.';

-- ---------------------------------------------------------------------------
-- Calling it off
-- ---------------------------------------------------------------------------
create or replace function public.withdraw_sponsorship(
  p_sponsorship uuid,
  p_reason      text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
  v_row   public.sponsorships;
begin
  select * into v_row from public.sponsorships where id = p_sponsorship;
  if not found then
    raise exception 'sponsorship:not_found'
      using errcode = 'no_data_found';
  end if;
  if v_row.donor_user_id <> v_actor and not public.can_decide_sponsorship(v_actor) then
    raise exception 'sponsorship:not_allowed'
      using errcode = 'insufficient_privilege';
  end if;
  if v_row.status = 'paid' then
    -- Money already recorded against a seat cannot be un-recorded here. A
    -- refund is a finance act with its own trail.
    raise exception 'sponsorship:already_paid'
      using errcode = 'check_violation';
  end if;
  if v_row.status = 'withdrawn' then
    return jsonb_build_object('status', 'withdrawn', 'changed', false);
  end if;

  update public.sponsorships
     set status = 'withdrawn',
         note = coalesce(nullif(btrim(coalesce(p_reason, '')), ''), note)
   where id = p_sponsorship;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'sponsorship.withdrawn', 'sponsorship', p_sponsorship,
          jsonb_build_object('reason', nullif(btrim(coalesce(p_reason, '')), '')));

  return jsonb_build_object('status', 'withdrawn', 'changed', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- Recording the money, and granting the seat
-- ---------------------------------------------------------------------------
create or replace function public.record_sponsorship_payment(
  p_sponsorship uuid,
  p_reference   text,
  p_evidence    text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor    uuid := public.current_user_id();
  v_ref      text := btrim(coalesce(p_reference, ''));
  v_row      public.sponsorships;
  v_app      public.sponsorship_applications;
  v_version  uuid;
  v_course   uuid;
  v_grant    uuid;
begin
  if not public.can_decide_sponsorship(v_actor) then
    raise exception 'sponsorship:not_allowed'
      using errcode = 'insufficient_privilege';
  end if;
  if v_ref = '' then
    raise exception 'sponsorship:reference_required'
      using errcode = 'check_violation';
  end if;

  select * into v_row from public.sponsorships where id = p_sponsorship;
  if not found then
    raise exception 'sponsorship:not_found'
      using errcode = 'no_data_found';
  end if;
  if v_row.status = 'paid' then
    return jsonb_build_object('status', 'paid', 'changed', false,
                              'entitlementGrantId', v_row.entitlement_grant_id);
  end if;
  if v_row.status = 'withdrawn' then
    raise exception 'sponsorship:withdrawn'
      using errcode = 'check_violation';
  end if;

  select * into v_app from public.sponsorship_applications where id = v_row.application_id;

  select cv.id, cv.course_id into v_version, v_course
    from public.courses c
    join public.course_versions cv on cv.course_id = c.id
   where c.id = v_app.course_id
     and c.status = 'active'
     and c.deleted_at is null
     and cv.version_status = 'published'
   order by cv.version_number desc
   limit 1;

  if v_version is null then
    raise exception 'sponsorship:course_not_available'
      using errcode = 'no_data_found';
  end if;

  -- Grant first: `can_enrol_in_version()` demands an existing entitlement
  -- before a sold version may be enrolled in, so the reverse order leaves an
  -- enrolment that cannot justify itself.
  if not exists (
    select 1 from public.entitlement_grants eg
     where eg.learner_profile_id = v_app.learner_profile_id
       and eg.scope_type = 'course_version'
       and eg.course_version_id = v_version
       and eg.status = 'active'
  ) then
    insert into public.entitlement_grants
      (learner_profile_id, scope_type, course_version_id, source_type, source_id, status,
       effective_from)
    values
      (v_app.learner_profile_id, 'course_version', v_version, 'scholarship', v_row.id,
       'active', now())
    returning id into v_grant;
  else
    select eg.id into v_grant
      from public.entitlement_grants eg
     where eg.learner_profile_id = v_app.learner_profile_id
       and eg.scope_type = 'course_version'
       and eg.course_version_id = v_version
       and eg.status = 'active'
     limit 1;
  end if;

  if not exists (
    select 1 from public.course_enrolments ce
     where ce.learner_profile_id = v_app.learner_profile_id
       and ce.course_version_id = v_version
       and ce.deleted_at is null
  ) then
    insert into public.course_enrolments
      (learner_profile_id, course_id, course_version_id, source, status)
    values
      (v_app.learner_profile_id, v_course, v_version, 'scholarship', 'active');
  end if;

  update public.sponsorships
     set status = 'paid',
         reference = v_ref,
         evidence = nullif(btrim(coalesce(p_evidence, '')), ''),
         recorded_by = v_actor,
         recorded_at = now(),
         entitlement_grant_id = v_grant
   where id = p_sponsorship;

  update public.sponsorship_applications
     set status = 'funded'
   where id = v_row.application_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'sponsorship.paid', 'sponsorship', p_sponsorship,
          jsonb_build_object('reference', v_ref,
                             'amountMinor', v_row.amount_minor,
                             'currency', v_row.currency_code,
                             'seatCode', v_app.seat_code,
                             'entitlementGrantId', v_grant));

  return jsonb_build_object('status', 'paid', 'changed', true,
                            'entitlementGrantId', v_grant);
end;
$$;

comment on function public.record_sponsorship_payment(uuid, text, text) is
  'Staff record the money a sponsor sent, which grants the seat: an entitlement and an enrolment, both `scholarship`. Idempotent. There is no provider to call this automatically, and the screen says so.';

-- ---------------------------------------------------------------------------
-- What each side reads
-- ---------------------------------------------------------------------------
create or replace function public.my_sponsorship_applications()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
  v_rows  jsonb;
begin
  if v_actor is null then
    raise exception 'sponsorship:not_signed_in'
      using errcode = 'insufficient_privilege';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', a.id,
           'learnerName', lp.display_name,
           'courseTitle', c.title,
           'courseSlug', c.slug,
           'status', a.status,
           'seatCode', a.seat_code,
           'reason', a.reason,
           'decisionReason', a.decision_reason,
           'askedAt', a.created_at,
           'decidedAt', a.decided_at,
           -- Whether somebody covered it, never who. A donor's name is not the
           -- learner's business, for the same reason the learner's name is not
           -- the donor's.
           'covered', a.status = 'funded'
         ) order by a.created_at desc), '[]'::jsonb)
    into v_rows
    from public.sponsorship_applications a
    join public.learner_profiles lp on lp.id = a.learner_profile_id
    join public.courses c on c.id = a.course_id
   where a.applied_by = v_actor
      or lp.linked_user_id = v_actor
      or (lp.family_id is not null and public.is_learner_family_member(lp.id));

  return jsonb_build_object(
    'enabled', public.setting_bool('commerce.sponsorship', false),
    'applications', v_rows);
end;
$$;

create or replace function public.my_sponsorships()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
  v_rows  jsonb;
begin
  if v_actor is null then
    raise exception 'sponsorship:not_signed_in'
      using errcode = 'insufficient_privilege';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', sp.id,
           'seatCode', a.seat_code,
           'courseTitle', c.title,
           'courseSlug', c.slug,
           'status', sp.status,
           'amountMinor', sp.amount_minor,
           'currencyCode', sp.currency_code,
           'reference', sp.reference,
           'recordedAt', sp.recorded_at,
           'pledgedAt', sp.created_at
         ) order by sp.created_at desc), '[]'::jsonb)
    into v_rows
    from public.sponsorships sp
    join public.sponsorship_applications a on a.id = sp.application_id
    join public.courses c on c.id = a.course_id
   where sp.donor_user_id = v_actor;

  return jsonb_build_object(
    'enabled', public.setting_bool('commerce.sponsorship', false),
    'sponsorships', v_rows);
end;
$$;

create or replace function public.sponsorship_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
begin
  if not public.can_decide_sponsorship(v_actor) then
    raise exception 'sponsorship:not_allowed'
      using errcode = 'insufficient_privilege';
  end if;

  return jsonb_build_object(
    'enabled', public.setting_bool('commerce.sponsorship', false),
    'waiting', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', a.id,
               'learnerName', lp.display_name,
               'courseTitle', c.title,
               'reason', a.reason,
               'askedAt', a.created_at,
               'applicantName', ap.display_name) order by a.created_at)
        from public.sponsorship_applications a
        join public.learner_profiles lp on lp.id = a.learner_profile_id
        join public.courses c on c.id = a.course_id
        left join public.user_profiles ap on ap.user_id = a.applied_by
       where a.status = 'submitted'), '[]'::jsonb),
    'seats', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', sp.id,
               'seatCode', a.seat_code,
               'courseTitle', c.title,
               'donor', d.display_name,
               'status', sp.status,
               'amountMinor', sp.amount_minor,
               'currencyCode', sp.currency_code,
               'reference', sp.reference,
               'pledgedAt', sp.created_at) order by sp.created_at desc)
        from public.sponsorships sp
        join public.sponsorship_applications a on a.id = sp.application_id
        join public.courses c on c.id = a.course_id
        left join public.user_profiles d on d.user_id = sp.donor_user_id
       where sp.status in ('pledged', 'paid')), '[]'::jsonb),
    'counts', jsonb_build_object(
      'waiting',   (select count(*)::int from public.sponsorship_applications where status = 'submitted'),
      'approved',  (select count(*)::int from public.sponsorship_applications where status = 'approved'),
      'funded',    (select count(*)::int from public.sponsorship_applications where status = 'funded'),
      'declined',  (select count(*)::int from public.sponsorship_applications where status = 'declined'),
      'pledged',   (select count(*)::int from public.sponsorships where status = 'pledged'),
      'paid',      (select count(*)::int from public.sponsorships where status = 'paid')));
end;
$$;

-- ---------------------------------------------------------------------------
-- Who may read the rows behind those functions
-- ---------------------------------------------------------------------------
alter table public.sponsorship_applications enable row level security;
alter table public.sponsorships enable row level security;

-- Nobody writes these tables directly: every writer is a definer function with
-- its own gate. Reads are for the applicant, their family, the donor and the
-- two roles that decide.
create policy sponsorship_applications_read_own on public.sponsorship_applications
  for select to authenticated
  using (
    applied_by = public.current_user_id()
    or public.has_role(public.current_user_id(), 'platform_admin')
    or public.has_role(public.current_user_id(), 'finance_admin')
    or exists (
      select 1 from public.learner_profiles lp
       where lp.id = sponsorship_applications.learner_profile_id
         and lp.linked_user_id = public.current_user_id())
  );

create policy sponsorships_read_own on public.sponsorships
  for select to authenticated
  using (
    donor_user_id = public.current_user_id()
    or public.has_role(public.current_user_id(), 'platform_admin')
    or public.has_role(public.current_user_id(), 'finance_admin')
  );

revoke all on function public.apply_for_sponsorship(uuid, uuid, text) from public, anon;
grant execute on function public.apply_for_sponsorship(uuid, uuid, text) to authenticated;

revoke all on function public.decide_sponsorship_application(uuid, boolean, text) from public, anon;
grant execute on function public.decide_sponsorship_application(uuid, boolean, text) to authenticated;

revoke all on function public.sponsorship_pool(text) from public, anon;
grant execute on function public.sponsorship_pool(text) to authenticated;

revoke all on function public.pledge_sponsorship(text, text, text) from public, anon;
grant execute on function public.pledge_sponsorship(text, text, text) to authenticated;

revoke all on function public.withdraw_sponsorship(uuid, text) from public, anon;
grant execute on function public.withdraw_sponsorship(uuid, text) to authenticated;

revoke all on function public.record_sponsorship_payment(uuid, text, text) from public, anon;
grant execute on function public.record_sponsorship_payment(uuid, text, text) to authenticated;

revoke all on function public.my_sponsorship_applications() from public, anon;
grant execute on function public.my_sponsorship_applications() to authenticated;

revoke all on function public.my_sponsorships() from public, anon;
grant execute on function public.my_sponsorships() to authenticated;

revoke all on function public.sponsorship_overview() from public, anon;
grant execute on function public.sponsorship_overview() to authenticated;

-- ---------------------------------------------------------------------------
-- The switch
-- ---------------------------------------------------------------------------
update public.platform_settings
   set gate_type = 'admin',
       description = 'Sponsor a seat: a learner asks, staff decide, a donor covers the course and never learns who they helped.',
       preconditions = 'None blocking. Eligibility is the decision itself (owner or finance, with a written reason either way); the record of a payment is staff recording a reference, because there is no card or mobile-money provider to take it; and whether a sponsored seat counts as zakat is a scholar''s ruling the platform does not make — the page says so instead of opining. A sponsored seat creates no order, no tax line and no teacher earning.'
 where key = 'commerce.sponsorship';

update public.platform_settings
   set preconditions = 'Allocation now exists: an approved application is the allocation, and the seat is granted by `record_sponsorship_payment()` with source `scholarship` (built 2026-10-26, behind `commerce.sponsorship`). What this flag adds is the fund without an individual donor — a pool of money staff allocate from. Still missing: donor receipts for a fund, and the renewal rule for a seat that covers more than one term.'
 where key = 'commerce.scholarships';
