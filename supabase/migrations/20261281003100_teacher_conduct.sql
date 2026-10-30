-- What an adult who teaches children has agreed to, and who a concern goes to.
--
-- WHY THIS EXISTS
-- ---------------
-- Two owner decisions on 2026-10-30 turn two honest gaps into rules:
--
--   1. **A teacher acknowledges the conduct policy inside the product.** The
--      register recorded a check on an adult who teaches, but nothing recorded
--      that the adult had read what the platform expects of them. A screening
--      says somebody was vetted; an acknowledgement says the person knows the
--      rules they are being vetted for. They are different facts and neither
--      implies the other.
--
--   2. **The named safeguarding lead is the owner, at privacy@ayahspring.com.**
--      The register has said since October that a lead must be named before
--      `platform.safeguarding` can be switched on. The name is a role and an
--      address rather than a person's legal name: the policy names the office,
--      and an office survives somebody leaving.
--
-- WHAT THE GATE IS, AND WHAT IT IS NOT
-- ------------------------------------
-- While `platform.safeguarding` is on, a course version whose course is written
-- for children (`audience` is `child` or `both`) may not be **published** unless
-- its author holds, at that moment:
--
--   * a recorded check that **passed** and has not expired, and
--   * an acknowledgement of the **live** safeguarding policy version.
--
-- It is checked at publication, not at appointment and not at submission. Those
-- would be three more places to get it wrong, and the moment that matters is the
-- one where a course becomes visible to a child's guardian. The flag off means
-- the gate is absent — the register's own rule, and the reason the flag exists.
--
-- No threshold is invented here: "current" means the latest recorded check
-- passed and its `valid_until`, if the person recording it set one, has not
-- passed. There is no required screening type, because the standard is the
-- owner's and this migration does not choose one.

-- ---------------------------------------------------------------------------
-- Who a concern goes to
-- ---------------------------------------------------------------------------
insert into public.platform_settings (key, description, setting_kind, value_type,
                                      value_text, gate_type, preconditions)
values ('platform.safeguarding_lead',
        'The named safeguarding lead, as a role and an address',
        'control', 'text',
        'The platform owner, AyahSpring — privacy@ayahspring.com',
        'admin',
        'Named by the owner on 2026-10-30. It is an office and a monitored '
        || 'address rather than a person''s legal name, so the policy does not '
        || 'have to be rewritten the day somebody steps down. platform.safeguarding '
        || 'refers a concern here and nowhere else.')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- Reading it, for anybody who needs to know where to send a concern
-- ---------------------------------------------------------------------------
create or replace function public.safeguarding_lead()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select value_text from public.platform_settings
      where key = 'platform.safeguarding_lead'),
    'The platform owner, AyahSpring — privacy@ayahspring.com');
$$;

revoke all on function public.safeguarding_lead() from public;
grant execute on function public.safeguarding_lead() to authenticated, anon;

comment on function public.safeguarding_lead() is
  'Who a safeguarding concern goes to, readable without an account: a person '
  'reporting a concern about a child must not have to sign in first.';

-- ---------------------------------------------------------------------------
-- The acknowledgement
-- ---------------------------------------------------------------------------
create table public.teacher_conduct_acknowledgements (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references public.user_profiles (user_id) on delete cascade,

  -- The version of the safeguarding document that was agreed to, resolved by the
  -- writer from what is live rather than trusted from the client. A new version
  -- of the policy is a new acknowledgement, not a silent re-signing: the row
  -- records what the person actually read.
  policy_version_id uuid not null
    references public.policy_versions (id) on delete restrict,

  acknowledged_at timestamptz not null default now(),

  -- Agreeing twice to one text is one fact.
  constraint tca_once unique (user_id, policy_version_id)
);

create index tca_user_idx
  on public.teacher_conduct_acknowledgements (user_id, acknowledged_at desc);

comment on table public.teacher_conduct_acknowledgements is
  'Which version of the safeguarding and conduct policy each adult who teaches '
  'has read and agreed to. Append-only: an acknowledgement of an older version '
  'stays, because it is a record of what somebody read on a date.';

alter table public.teacher_conduct_acknowledgements enable row level security;

-- A person reads their own acknowledgements. Staff read them for the register,
-- through `screening_register()` rather than by table access.
create policy tca_read_own on public.teacher_conduct_acknowledgements
  for select to authenticated
  using (user_id = public.current_user_id());

create policy tca_read_staff on public.teacher_conduct_acknowledgements
  for select to authenticated
  using (
    public.has_role(public.current_user_id(), 'platform_admin')
    or public.has_role(public.current_user_id(), 'governance_admin')
  );

-- Append-only, enforced: editing an acknowledgement after the fact would rewrite
-- what somebody agreed to and when.
create or replace function public.refuse_acknowledgement_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'an acknowledgement is not edited or deleted; agree to the current text instead'
    using errcode = 'insufficient_privilege';
end;
$$;

create trigger teacher_conduct_acknowledgements_append_only
  before update or delete on public.teacher_conduct_acknowledgements
  for each row execute function public.refuse_acknowledgement_change();

revoke all on public.teacher_conduct_acknowledgements from anon, authenticated;
grant select on public.teacher_conduct_acknowledgements to authenticated;

-- ---------------------------------------------------------------------------
-- Agreeing
-- ---------------------------------------------------------------------------
create or replace function public.acknowledge_conduct()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor   uuid := public.current_user_id();
  v_version uuid;
  v_slug    text;
  v_id      uuid;
begin
  if v_actor is null then
    raise exception 'conduct:sign_in_to_acknowledge'
      using errcode = 'insufficient_privilege';
  end if;

  if not public.has_role(v_actor, 'instructor') then
    raise exception 'conduct:not_a_teacher'
      using errcode = 'check_violation',
            hint = 'the conduct policy is acknowledged by adults who teach';
  end if;

  -- Resolved here, not passed in. A client that could name the version could
  -- acknowledge a draft, or an old text it had already read.
  select pv.id, pd.slug
    into v_version, v_slug
    from public.policy_documents pd
    join public.policy_versions pv on pv.document_id = pd.id
   where pd.slug = 'safeguarding'
     and pv.status = 'in_force'
   order by pv.version_number desc
   limit 1;

  if v_version is null then
    raise exception 'conduct:no_published_policy'
      using errcode = 'no_data_found',
            hint = 'there is nothing to acknowledge until the conduct policy has a live version';
  end if;

  insert into public.teacher_conduct_acknowledgements (user_id, policy_version_id)
  values (v_actor, v_version)
  on conflict (user_id, policy_version_id) do nothing
  returning id into v_id;

  -- Only a first acknowledgement is audited. Agreeing again to the same text is
  -- not an event, and an audit trail full of them would hide the real one.
  if v_id is not null then
    insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
    values (v_actor, 'conduct.acknowledged', 'user_profile', v_actor,
            jsonb_build_object('policyVersionId', v_version));
  end if;

  return public.my_screening_status();
end;
$$;

revoke all on function public.acknowledge_conduct() from public, anon;
grant execute on function public.acknowledge_conduct() to authenticated;

comment on function public.acknowledge_conduct() is
  'Records that an appointed teacher read and agreed to the live safeguarding and '
  'conduct policy. The version is resolved server-side, never supplied by the client.';

-- ---------------------------------------------------------------------------
-- Who may publish for children
-- ---------------------------------------------------------------------------
-- One predicate, used by the publication gate and by the teacher's own page, so
-- the sentence on the screen and the refusal in the writer cannot disagree.
create or replace function public.may_teach_children(p_user uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor    uuid := coalesce(p_user, public.current_user_id());
  v_screening public.teacher_screenings;
  v_live     uuid;
  v_ack      boolean := false;
  v_checked  boolean := false;
  v_expired  boolean := true;
  v_recorded boolean := false;
begin
  if v_actor is null then
    return jsonb_build_object('allowed', false, 'reason', 'not_signed_in');
  end if;

  select * into v_screening from public.teacher_screenings
   where user_id = v_actor
   order by checked_at desc
   limit 1;

  -- Captured here, not read as FOUND later: the policy lookup below is another
  -- SELECT INTO and would reset it, which is exactly the sort of silent false
  -- that makes a gate say "no screening" to somebody who has one.
  v_recorded := found;

  if v_recorded then
    v_checked := v_screening.outcome = 'passed';
    v_expired := v_screening.valid_until is not null
                 and v_screening.valid_until < current_date;
  end if;

  select pv.id into v_live
    from public.policy_documents pd
    join public.policy_versions pv on pv.document_id = pd.id
   where pd.slug = 'safeguarding' and pv.status = 'in_force'
   order by pv.version_number desc
   limit 1;

  v_ack := v_live is not null and exists (
    select 1 from public.teacher_conduct_acknowledgements a
     where a.user_id = v_actor and a.policy_version_id = v_live);

  return jsonb_build_object(
    'allowed', v_checked and not v_expired and v_ack,
    'reason', case
                when not v_checked then 'no_screening'
                when v_expired       then 'screening_expired'
                when not v_ack       then 'conduct_not_acknowledged'
                else 'ok' end,
    'screeningRecorded', v_recorded,
    'screeningExpired', v_expired,
    'conductAcknowledged', v_ack,
    -- The lead, so every screen that asks "who do I tell?" answers the same.
    'lead', public.safeguarding_lead());
end;
$$;

revoke all on function public.may_teach_children(uuid) from public, anon;
grant execute on function public.may_teach_children(uuid) to authenticated;

comment on function public.may_teach_children(uuid) is
  'Whether an adult may publish a child-facing course right now: a passed, '
  'unexpired screening and an acknowledgement of the live conduct policy. Not '
  'consulted unless platform.safeguarding is on.';

-- ---------------------------------------------------------------------------
-- The teacher's own view of it
-- ---------------------------------------------------------------------------
-- Replaced rather than left alone, because a teacher who reads their own status
-- must see the same two facts the gate checks. A page that said "checked" while
-- publication refused for an unread policy would be the screen lying.
create or replace function public.my_screening_status()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
  v_row   public.teacher_screenings;
  v_gate  jsonb;
begin
  if v_actor is null then
    raise exception 'screening:not_signed_in'
      using errcode = 'insufficient_privilege';
  end if;

  v_gate := public.may_teach_children(v_actor);

  select * into v_row from public.teacher_screenings
   where user_id = v_actor
   order by checked_at desc
   limit 1;

  if not found then
    return jsonb_build_object(
      'recorded', false,
      'conductAcknowledged', v_gate -> 'conductAcknowledged',
      'mayTeachChildren', (v_gate -> 'allowed')::boolean,
      'gateReason', v_gate -> 'reason',
      'lead', v_gate -> 'lead',
      'required', public.setting_bool('platform.safeguarding', false));
  end if;

  return jsonb_build_object(
    'recorded', true,
    'outcome', v_row.outcome,
    'type', v_row.screening_type,
    'checkedAt', v_row.checked_at,
    'validUntil', v_row.valid_until,
    'expired', v_row.valid_until is not null and v_row.valid_until < current_date,
    'conductAcknowledged', v_gate -> 'conductAcknowledged',
    'mayTeachChildren', (v_gate -> 'allowed')::boolean,
    'gateReason', v_gate -> 'reason',
    'lead', v_gate -> 'lead',
    'required', public.setting_bool('platform.safeguarding', false));
end;
$$;

revoke all on function public.my_screening_status() from public, anon;
grant execute on function public.my_screening_status() to authenticated;

comment on function public.my_screening_status() is
  'A teacher''s own last screening, whether they have read the conduct policy, '
  'and whether they may publish for children today. Never the evidence reference.';

-- ---------------------------------------------------------------------------
-- The gate on publication
-- ---------------------------------------------------------------------------
-- `set_course_version_status()` is reproduced in full because PostgreSQL has no
-- way to add a clause to a function: a wrapper would be a second definition of
-- who may publish, and the two would eventually disagree. Everything except the
-- safeguarding block is byte-for-byte the previous behaviour.
create or replace function public.set_course_version_status(
  p_version_id  uuid,
  p_new_status  text,
  p_actor_id    uuid,
  p_reason      text default null
)
returns public.course_versions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old public.course_versions;
  v_allowed boolean := false;
  v_is_author boolean;
  v_is_reviewer boolean;
  v_is_priv boolean;
  v_audience text;
  v_gate jsonb;
begin
  select * into v_old from public.course_versions where id = p_version_id for update;
  if not found then
    raise exception 'course version % not found', p_version_id using errcode = 'no_data_found';
  end if;

  v_is_author   := (p_actor_id = v_old.created_by);
  v_is_priv     := public.is_privileged(p_actor_id);
  v_is_reviewer := public.has_role(p_actor_id, 'reviewer') or v_is_priv;

  v_allowed :=
    (v_old.version_status = 'draft'     and p_new_status = 'submitted' and v_is_author) or
    (v_old.version_status = 'submitted' and p_new_status = 'approved'  and v_is_reviewer) or
    (v_old.version_status = 'submitted' and p_new_status = 'rejected'  and v_is_reviewer) or
    (v_old.version_status = 'approved'  and p_new_status = 'published' and v_is_priv) or
    (v_old.version_status = 'approved'  and p_new_status = 'rejected'  and v_is_priv) or
    (v_old.version_status = 'rejected'  and p_new_status = 'draft'     and v_is_author) or
    (v_old.version_status = 'published' and p_new_status = 'retired'   and v_is_priv);

  if not v_allowed then
    raise exception
      'transition % -> % on course version % is not permitted for actor %',
      v_old.version_status, p_new_status, p_version_id, p_actor_id
      using errcode = 'insufficient_privilege';
  end if;

  if p_new_status = 'approved' and v_is_author then
    raise exception
      'the author of course version % may not approve it themselves', p_version_id
      using errcode = 'insufficient_privilege';
  end if;

  -- The safeguarding gate: the owner's decision of 2026-10-30. It is checked at
  -- publication, on the **author** rather than on whoever presses the button,
  -- and only for a course a child may be shown. Off, the gate is absent.
  if p_new_status = 'published'
     and public.setting_bool('platform.safeguarding', false) then
    select c.audience into v_audience
      from public.courses c
     where c.id = v_old.course_id;

    if v_audience in ('child', 'both') then
      v_gate := public.may_teach_children(v_old.created_by);
      if not (v_gate -> 'allowed')::boolean then
        raise exception 'safeguarding:author_not_cleared'
          using errcode = 'insufficient_privilege',
                hint = v_gate ->> 'reason';
      end if;
    end if;
  end if;

  perform set_config('app.bypassing_version_lock', 'on', true);

  if p_new_status = 'published' then
    if not exists (select 1 from public.course_sections cs
                    join public.lessons l on l.section_id = cs.id
                    where cs.course_version_id = p_version_id) then
      raise exception
        'course version % has no lessons and cannot be published', p_version_id
        using errcode = 'check_violation';
    end if;

    update public.course_versions
       set version_status = 'retired',
           retired_at     = now(),
           decision_by    = p_actor_id,
           decision_reason = 'superseded by version ' || v_old.version_number
     where course_id = v_old.course_id
       and language  = v_old.language
       and version_status = 'published';
  end if;

  update public.course_versions
     set version_status  = p_new_status,
         submitted_at    = case when p_new_status = 'submitted' then now() else submitted_at end,
         published_at    = case when p_new_status = 'published' then now() else published_at end,
         retired_at      = case when p_new_status = 'retired'   then now() else retired_at end,
         decision_by     = case when p_new_status in ('approved','rejected') then p_actor_id else decision_by end,
         decision_reason = case when p_new_status in ('approved','rejected','retired') then p_reason else decision_reason end
   where id = p_version_id
  returning * into v_old;

  perform set_config('app.bypassing_version_lock', 'off', true);

  return v_old;
end;
$$;

revoke execute on function public.set_course_version_status(uuid, text, uuid, text) from public;
revoke execute on function public.set_course_version_status(uuid, text, uuid, text) from anon;
grant  execute on function public.set_course_version_status(uuid, text, uuid, text) to authenticated;

comment on function public.set_course_version_status(uuid, text, uuid, text) is
  'The only permitted way to change a version status. Enforces who may '
  'transition, that authors cannot approve their own course, and - while '
  'platform.safeguarding is on - that a child-facing course is only published '
  'by an author who is checked and has read the conduct policy.';

-- ---------------------------------------------------------------------------
-- The lead is a control the owner can change without a deploy
-- ---------------------------------------------------------------------------
-- `platform_control_rules()` is the allowlist both the reader and the writer
-- consult, so a control that is absent from it cannot be changed by anybody —
-- including the owner. The list is reproduced with one row added; everything
-- above it is unchanged.
create or replace function public.platform_control_rules()
returns table (
  control_key         text,
  value_type          text,
  min_value           integer,
  max_value           integer,
  allowed_prefix      text,
  requires_finance    boolean,
  requires_governance boolean,
  requires_platform   boolean,
  label               text,
  unit                text,
  note                text
)
language sql
immutable
as $$
  select *
    from (values
      ('finance.reporting_currency', 'text', null::integer, null::integer, null::text,
       true, false, false,
       'Reporting currency', 'ISO 4217',
       'The one currency money is reported in. Changing it re-reports the past at whatever rates are recorded; it never restates a ledger row.'),

      ('finance.rate_sanity_factor', 'integer', 0, 1000, null::text,
       true, false, false,
       'Rate sanity factor', 'times',
       'How many times the previous rate a new one may be before recording it needs a written reason. 0 turns the check off.'),

      ('media.upload_quota_gb_per_teacher', 'integer', 1, 10000, null::text,
       false, false, true,
       'Teacher upload allowance', 'GiB',
       'Cumulative master bytes one uploader may store. Below 1 would block every upload rather than limit it, so 1 is the floor. Enforced only while platform.cost_controls is on.'),

      ('learning.offline_max_devices', 'integer', 1, 10, null::text,
       false, false, true,
       'Devices per learner', 'devices',
       'How many devices one learner may keep saved lessons on at once, counted on devices that actually hold a live save.'),

      ('learning.offline_expiry_days', 'integer', 1, 365, null::text,
       false, false, true,
       'Saved lesson lifetime', 'days',
       'How long a saved lesson plays before it asks to be refreshed. A saved lesson is a subscription artefact, not a purchase.'),

      ('delivery.live_room_base', 'text', null::integer, null::integer, 'https://',
       false, false, true,
       'Live room host', 'URL',
       'Base URL of the live-room host; a room is this plus /room/<slug>. Empty means live rooms are not connected, and joining refuses rather than handing out a URL that carries no class.'),

      ('delivery.max_attempts', 'integer', 1, 10, null::text,
       false, false, true,
       'Delivery attempts before giving up', 'attempts',
       'How many times the dispatcher tries one message before it becomes a dead letter somebody has to look at. Each retry waits longer: 5 minutes, 15, an hour, four hours, twelve.'),

      ('governance.min_approvals', 'integer', 1, 5, null::text,
       false, true, false,
       'Approvals needed to publish', 'approvals',
       'How many independent approvals a course version needs before it may be published.'),

      ('governance.panel_required', 'boolean', null::integer, null::integer, null::text,
       false, true, false,
       'Scholarly panel required', null,
       'Whether a scholarly panel must decide before publication. Off means peer review by an authorised reviewer is enough.'),

      ('governance.scholar_board_active', 'boolean', null::integer, null::integer, null::text,
       false, false, true,
       'Scholar board convened', null,
       'Whether a convened board may check reviewer credentials. Turning it on grants nothing by itself: only the owner may appoint a member, and only a member gains the power.'),

      -- Referrals. Both benefits are discounts, so the only thing to tune is how
      -- big they are and how often one account may earn one.
      ('commerce.referral_referee_percent', 'integer', 0, 100, null::text,
       false, false, true,
       'Friend''s discount', 'percent',
       'What a friend gets off their first purchase when they use an invitation code. 0 makes inviting pointless without switching the feature off; a code already shared keeps the percentage it was created with.'),

      ('commerce.referral_reward_percent', 'integer', 0, 100, null::text,
       false, false, true,
       'Inviter''s reward', 'percent',
       'What the person who invited them gets off their own next purchase, once the qualifying order has stayed paid for the refund window.'),

      ('commerce.referral_max_per_year', 'integer', 0, 1000, null::text,
       false, false, true,
       'Rewards per account a year', 'rewards',
       'How many rewards one account may earn in twelve months. 0 stops all rewards while still recording who invited whom.'),

      ('commerce.referral_reward_expiry_days', 'integer', 1, 3650, null::text,
       false, false, true,
       'Reward lifetime', 'days',
       'How long a reward code stays usable once it starts. A reward with no expiry is a liability nobody is tracking.'),

      ('platform.safeguarding_lead', 'text', null::integer, null::integer, null::text,
       false, false, true,
       'Named safeguarding lead', 'name and address',
       'Who a safeguarding concern goes to. An office and a monitored address, not a person''s legal name, so the policy does not need rewriting the day somebody steps down.')
    ) v(control_key, value_type, min_value, max_value, allowed_prefix,
        requires_finance, requires_governance, requires_platform, label, unit, note);
$$;

revoke all on function public.platform_control_rules() from public, anon;
grant execute on function public.platform_control_rules() to authenticated;

comment on function public.platform_control_rules() is
  'The allowlist of controls this screen may change: key, type, bounds, owning role and a sentence about what the number decides. One source of truth — the reader and the writer both consult it.';

-- ---------------------------------------------------------------------------
-- The safeguarding flag is a switch now
-- ---------------------------------------------------------------------------
-- It was CODE-gated for one reason, written in the register: *"the enforcement
-- needs the standard first"* — and then, later, *"name the lead before enabling"*.
-- The owner did both on 2026-10-30: a check is **recorded, with the type written
-- by whoever performed it**, and the lead is named. The gate that turns on it is
-- in `set_course_version_status()` above, so the switch now has something to
-- switch.
update public.platform_settings
   set gate_type     = 'admin',
       preconditions = 'The standard and the lead were settled by the owner on 2026-10-30, '
                    || 'so this is a switch rather than a deploy. On: a course a child may be '
                    || 'shown cannot be published unless its author holds a screening that '
                    || 'passed and has not lapsed, and has acknowledged the live '
                    || 'safeguarding policy. Off: no gate, and every refusal behind it is '
                    || 'absent rather than half-applied. What a check *is* stays free text the '
                    || 'recorder writes, because the standard differs by country and this '
                    || 'platform does not pick one. The named lead is the '
                    || 'platform.safeguarding_lead control.'
 where key = 'platform.safeguarding';
