-- An incident register: what happened, who was told, and when it was due.
--
-- `platform.incident` was the last flag row that could say **"Nothing exists"**
-- without lying. This does not make that untrue by writing a policy sentence and
-- calling it built. It builds the three things a platform needs before it can
-- answer a regulator, a teacher or a parent in the first week of a breach:
--
--   1. **a record** — what happened, when it was discovered, what was affected,
--      described in counts and never in a list of names;
--   2. **obligations with clocks** — every body or group that has to be told, why,
--      and by when, with the telling recorded when it happens; and
--   3. **a log** — every step taken, append-only, because a timeline reconstructed
--      afterwards from memory is not a timeline.
--
-- What it deliberately does **not** contain is the part that is the owner's:
--
--   * **who** must be told — the register has an `audience` field and a `basis`
--     field, both written by a person, and no list of recipients is baked in;
--   * **within what time** — `due_at` is entered, never computed from a rule. Every
--     jurisdiction the platform might serve has its own clock (72 hours, 30 days,
--     "without undue delay"), several of them overlap, and a default invented here
--     would be wrong in at least one of them and would look authoritative while
--     being wrong. The register's job is to make the clock **visible and
--     unavoidable** once a person has set it, not to guess the number;
--   * **what a learner is told** — the `learner_notice` field is where that text is
--     written and held. Nothing sends it: there is no email or SMS provider, so the
--     console says so beside the field rather than implying it left the building.
--
-- Detection is still absent and still honest: nothing in this platform watches for a
-- breach. `platform.incident` stays CODE and says exactly that.

-- ---------------------------------------------------------------------------
-- The record
-- ---------------------------------------------------------------------------
create table public.security_incidents (
  id uuid primary key default gen_random_uuid(),

  -- Said aloud in a queue: INC-2026-0007. Generated, never typed, so two
  -- incidents cannot share a name in a conversation with a regulator.
  reference text not null unique,

  title text not null check (length(btrim(title)) between 3 and 120),
  summary text not null check (length(btrim(summary)) >= 20),

  -- A working triage convention for this deployment, not a legal category.
  -- The owner may replace it when the runbook is written; what it must not be is
  -- absent, because "how bad is this" is the first question anybody asks.
  severity text not null default 'major'
    check (severity in ('critical', 'major', 'minor')),

  status text not null default 'open'
    check (status in ('open', 'contained', 'resolved', 'closed')),

  -- When it happened, if anybody knows, and when it was discovered — which is the
  -- number that matters for every disclosure clock, and the only one that is always
  -- known.
  occurred_at   timestamptz,
  discovered_at timestamptz not null default now(),
  contained_at  timestamptz,
  resolved_at   timestamptz,
  closed_at     timestamptz,

  -- What kinds of data were involved, from a closed vocabulary so a report can be
  -- grouped. Free text would let ten incidents describe the same thing ten ways.
  data_categories text[] not null default '{}'
    check (data_categories <@ array['accounts', 'learning', 'children', 'payments',
                                    'messages', 'credentials', 'teacher_records']::text[]),

  -- **Counts, never people.** The same rule the institution report follows: the
  -- register can say "412 learners, of whom 30 are children" and it cannot say who.
  -- A per-person list would turn the incident register into the single richest
  -- target on the platform — the one table that names every affected child.
  affected_people   integer not null default 0 check (affected_people >= 0),
  affected_children integer not null default 0 check (affected_children >= 0),
  affected_teachers integer not null default 0 check (affected_teachers >= 0),

  -- What could go wrong for those people, in a sentence a person wrote. Not
  -- selected from a list: the harm is specific or it has not been thought about.
  harm_assessment text,

  -- What would be told to a learner if anything could be told. Written and held;
  -- nothing sends it (no email or SMS provider exists).
  learner_notice text,

  -- What changed because of it. Required before an incident can be closed: an
  -- incident that is closed with no change recorded is a promise to have the same
  -- one again.
  lessons text,

  opened_by uuid not null references public.user_profiles (user_id) on delete restrict,
  created_at timestamptz not null default now(),

  -- The counts cannot contradict each other: children are people, and teachers are
  -- people, so neither may exceed the total.
  constraint security_incidents_counts_coherent check (
    affected_children <= affected_people and affected_teachers <= affected_people),
  -- A closure is a date as well as a status; a status without the date is a label.
  constraint security_incidents_closed_has_date check (
    (status = 'closed') = (closed_at is not null))
);

create index security_incidents_open_idx
  on public.security_incidents (status, discovered_at desc);

comment on table public.security_incidents is
  'One incident, from discovery to closure. Counts and categories only — never a row per affected person. Deadlines for notifying anybody are entered by a person, never computed, because the applicable rule is the owner''s to state.';

create sequence public.security_incident_reference_seq;

/**
 * A reference nobody has to compose: INC-<year>-<4 digits>.
 *
 * The year is the discovery year, so an incident discovered on 1 January belongs to
 * the year it was found rather than the year it started — which is how the person
 * answering the letter will date it.
 */
create or replace function public.next_incident_reference(p_year integer default null)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_year integer := coalesce(p_year, extract(year from current_date)::int);
  v_n    bigint;
begin
  v_n := nextval('public.security_incident_reference_seq');
  return format('INC-%s-%s', v_year, lpad(v_n::text, 4, '0'));
end;
$$;

revoke all on function public.next_incident_reference(integer) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Obligations: who has to be told, why, and by when
-- ---------------------------------------------------------------------------
create table public.incident_notifications (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null
    references public.security_incidents (id) on delete cascade,

  -- Who is told. Free text on purpose: "the Information Commissioner", "the
  -- parents of the 30 children in the Saturday class", "the payment provider".
  -- A closed list here would be this migration deciding the law.
  audience text not null check (length(btrim(audience)) between 2 and 120),

  -- Why they have to be told, and by what rule. Written by a person, and required:
  -- an obligation with no stated basis is a habit, and habits are how a deadline
  -- that mattered gets skipped.
  basis text not null check (length(btrim(basis)) >= 5),

  -- Set by a person. Never derived. See the header.
  due_at timestamptz not null,

  told_at timestamptz,
  told_by uuid references public.user_profiles (user_id) on delete set null,
  method  text check (method is null or length(btrim(method)) between 2 and 80),
  note    text,

  -- Deciding **not** to tell somebody is a decision, and it is recorded as one.
  -- Without this, an outstanding obligation has only two endings: told, or quietly
  -- dropped — and the second is how a deadline that mattered disappears.
  waived_at     timestamptz,
  waived_by     uuid references public.user_profiles (user_id) on delete set null,
  waive_reason  text check (waive_reason is null or length(btrim(waive_reason)) >= 10),

  created_by uuid not null references public.user_profiles (user_id) on delete restrict,
  created_at timestamptz not null default now(),

  constraint incident_notifications_told_is_complete check (
    told_at is null or (told_by is not null and method is not null)),
  constraint incident_notifications_waived_is_complete check (
    (waived_at is null) = (waive_reason is null)),
  -- An obligation is told or waived or neither, never both.
  constraint incident_notifications_one_ending check (
    told_at is null or waived_at is null)
);

create index incident_notifications_incident_idx
  on public.incident_notifications (incident_id, due_at);

comment on table public.incident_notifications is
  'One obligation to tell somebody about an incident: who, on what basis, by when, and when it was actually told. The deadline is typed by a person — a computed one would be a legal claim invented in a migration.';

-- ---------------------------------------------------------------------------
-- The log
-- ---------------------------------------------------------------------------
create table public.incident_entries (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null
    references public.security_incidents (id) on delete cascade,

  kind text not null default 'update'
    check (kind in ('update', 'containment', 'decision', 'notification', 'lesson')),

  body text not null check (length(btrim(body)) >= 5),

  actor uuid references public.user_profiles (user_id) on delete set null,
  created_at timestamptz not null default now()
);

create index incident_entries_incident_idx
  on public.incident_entries (incident_id, created_at);

comment on table public.incident_entries is
  'What was done about an incident, in order. Append-only: a timeline that can be edited afterwards is not evidence of anything.';

-- Append-only, enforced rather than promised.
create or replace function public.refuse_incident_entry_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'incident:entry_append_only'
    using errcode = 'insufficient_privilege',
          hint = 'write a new entry; the log is a record, not a document';
end;
$$;

create trigger incident_entries_append_only
  before update or delete on public.incident_entries
  for each row execute function public.refuse_incident_entry_change();

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
-- No client role reads these tables directly. Every read goes through a function
-- that decides what to return, which is the only way to keep the counts-not-people
-- rule from being undone by one `select *` in a screen. RLS is still enabled on all
-- three, and a select policy exists for the two roles that work incidents, so a
-- future direct read is not a silent hole.
alter table public.security_incidents enable row level security;
alter table public.incident_notifications enable row level security;
alter table public.incident_entries enable row level security;

create policy security_incidents_read_incident_roles on public.security_incidents
  for select to authenticated
  using (
    public.has_role(public.current_user_id(), 'platform_admin')
    or public.has_role(public.current_user_id(), 'governance_admin')
  );

create policy incident_notifications_read_incident_roles on public.incident_notifications
  for select to authenticated
  using (
    public.has_role(public.current_user_id(), 'platform_admin')
    or public.has_role(public.current_user_id(), 'governance_admin')
  );

create policy incident_entries_read_incident_roles on public.incident_entries
  for select to authenticated
  using (
    public.has_role(public.current_user_id(), 'platform_admin')
    or public.has_role(public.current_user_id(), 'governance_admin')
  );

-- The grants are what actually keep it shut, and they are deliberately absent:
-- no select is granted on any of the three, so a query against them fails even
-- though a policy exists. Writes have no policy at all; the functions are the only
-- way in.
revoke all on public.security_incidents from authenticated, anon;
revoke all on public.incident_notifications from authenticated, anon;
revoke all on public.incident_entries from authenticated, anon;

-- ---------------------------------------------------------------------------
-- Who may work an incident
-- ---------------------------------------------------------------------------
-- The owner and governance staff: the two roles that already read identity
-- evidence and decide who is trusted. A support agent is privileged for refunds and
-- cases and must not be able to read — far less write — the register that says which
-- children's data was exposed. `is_privileged()` is deliberately not used here.
create or replace function public.can_work_incidents(p_user_id uuid default null)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.has_role(coalesce(p_user_id, public.current_user_id()), 'platform_admin')
    or public.has_role(coalesce(p_user_id, public.current_user_id()), 'governance_admin'),
    false);
$$;

revoke all on function public.can_work_incidents(uuid) from public, anon;
grant execute on function public.can_work_incidents(uuid) to authenticated;

comment on function public.can_work_incidents(uuid) is
  'Owner or governance staff. Not every privileged role: the incident register says whose data was exposed.';

-- One place for the refusal, so every writer says the same thing.
create or replace function public.require_incident_role()
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
begin
  if v_actor is null then
    raise exception 'incident:not_signed_in'
      using errcode = 'insufficient_privilege';
  end if;
  if not public.can_work_incidents(v_actor) then
    raise exception 'incident:not_allowed'
      using errcode = 'insufficient_privilege',
            hint = 'the owner or governance staff work incidents';
  end if;
  return v_actor;
end;
$$;

revoke all on function public.require_incident_role() from public, anon;
grant execute on function public.require_incident_role() to authenticated;

-- ---------------------------------------------------------------------------
-- Opening one
-- ---------------------------------------------------------------------------
create or replace function public.open_incident(
  p_title          text,
  p_summary        text,
  p_severity       text default 'major',
  p_discovered_at  timestamptz default null,
  p_occurred_at    timestamptz default null,
  p_data_categories text[] default '{}'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor  uuid := public.require_incident_role();
  v_title  text := btrim(coalesce(p_title, ''));
  v_summary text := btrim(coalesce(p_summary, ''));
  v_sev    text := lower(btrim(coalesce(p_severity, 'major')));
  v_when   timestamptz := coalesce(p_discovered_at, now());
  v_cats   text[] := coalesce(p_data_categories, '{}');
  v_ref    text;
  v_id     uuid;
begin
  if length(v_title) < 3 or length(v_title) > 120 then
    raise exception 'incident:title_required'
      using errcode = 'check_violation';
  end if;
  if length(v_summary) < 20 then
    raise exception 'incident:summary_required'
      using errcode = 'check_violation',
            hint = 'what happened, in a sentence somebody else could act on';
  end if;
  if v_sev not in ('critical', 'major', 'minor') then
    raise exception 'incident:severity_invalid'
      using errcode = 'check_violation';
  end if;
  -- A discovery in the future is a typo, and it would make every clock that hangs
  -- off it start late.
  if v_when > now() + interval '5 minutes' then
    raise exception 'incident:discovered_in_the_future'
      using errcode = 'check_violation';
  end if;
  if p_occurred_at is not null and p_occurred_at > v_when then
    raise exception 'incident:occurred_after_discovery'
      using errcode = 'check_violation',
            hint = 'an incident cannot have started after it was found';
  end if;
  if not (v_cats <@ array['accounts', 'learning', 'children', 'payments',
                          'messages', 'credentials', 'teacher_records']::text[]) then
    raise exception 'incident:category_invalid'
      using errcode = 'check_violation';
  end if;

  v_ref := public.next_incident_reference(extract(year from v_when)::int);

  insert into public.security_incidents
    (reference, title, summary, severity, discovered_at, occurred_at,
     data_categories, opened_by)
  values (v_ref, v_title, v_summary, v_sev, v_when, p_occurred_at,
          (select coalesce(array_agg(distinct c order by c), '{}')
             from unnest(v_cats) c), v_actor)
  returning id into v_id;

  insert into public.incident_entries (incident_id, kind, body, actor)
  values (v_id, 'update', format('Incident opened as %s.', v_sev), v_actor);

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'incident.opened', 'security_incident', v_id,
          jsonb_build_object('reference', v_ref, 'severity', v_sev,
                             'categories', v_cats));

  return jsonb_build_object('id', v_id, 'reference', v_ref,
                            'status', 'open', 'severity', v_sev,
                            'discoveredAt', v_when);
end;
$$;

revoke all on function public.open_incident(text, text, text, timestamptz, timestamptz, text[])
  from public, anon;
grant execute on function public.open_incident(text, text, text, timestamptz, timestamptz, text[])
  to authenticated;

comment on function public.open_incident(text, text, text, timestamptz, timestamptz, text[]) is
  'Open an incident. The reference is generated; the severity is a working triage convention, not a legal category; the discovery time starts every clock that follows.';

-- ---------------------------------------------------------------------------
-- How many people, and how bad for them
-- ---------------------------------------------------------------------------
create or replace function public.record_incident_impact(
  p_incident_id uuid,
  p_people      integer,
  p_children    integer default 0,
  p_teachers    integer default 0,
  p_harm        text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor  uuid := public.require_incident_role();
  v_row    public.security_incidents;
  v_harm   text := nullif(btrim(coalesce(p_harm, '')), '');
begin
  select * into v_row from public.security_incidents where id = p_incident_id;
  if not found then
    raise exception 'incident:not_found' using errcode = 'no_data_found';
  end if;
  if v_row.status = 'closed' then
    raise exception 'incident:closed'
      using errcode = 'check_violation',
            hint = 'reopen it before changing what it says';
  end if;
  if p_people is null or p_people < 0 or coalesce(p_children, 0) < 0
     or coalesce(p_teachers, 0) < 0 then
    raise exception 'incident:count_invalid' using errcode = 'check_violation';
  end if;
  if coalesce(p_children, 0) > p_people or coalesce(p_teachers, 0) > p_people then
    raise exception 'incident:count_incoherent'
      using errcode = 'check_violation',
            hint = 'children and teachers are people; neither can exceed the total';
  end if;

  update public.security_incidents
     set affected_people = p_people,
         affected_children = coalesce(p_children, 0),
         affected_teachers = coalesce(p_teachers, 0),
         harm_assessment = v_harm
   where id = p_incident_id;

  -- The log records the change, not just the new number: "412 people" alone is
  -- unreadable a month later.
  insert into public.incident_entries (incident_id, kind, body, actor)
  values (p_incident_id, 'update',
          format('Impact recorded: %s people, of whom %s are children and %s are teachers.%s',
                 p_people, coalesce(p_children, 0), coalesce(p_teachers, 0),
                 case when v_harm is null then '' else ' ' || v_harm end),
          v_actor);

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'incident.impact_recorded', 'security_incident', p_incident_id,
          jsonb_build_object('people', p_people, 'children', coalesce(p_children, 0),
                             'teachers', coalesce(p_teachers, 0)));

  return jsonb_build_object('people', p_people,
                            'children', coalesce(p_children, 0),
                            'teachers', coalesce(p_teachers, 0));
end;
$$;

revoke all on function public.record_incident_impact(uuid, integer, integer, integer, text)
  from public, anon;
grant execute on function public.record_incident_impact(uuid, integer, integer, integer, text)
  to authenticated;

comment on function public.record_incident_impact(uuid, integer, integer, integer, text) is
  'How many people were affected, how many of them are children or teachers, and what could go wrong for them. Counts only: the register never holds a list of names.';

-- ---------------------------------------------------------------------------
-- The log
-- ---------------------------------------------------------------------------
create or replace function public.log_incident_entry(
  p_incident_id uuid,
  p_body        text,
  p_kind        text default 'update'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.require_incident_role();
  v_body  text := btrim(coalesce(p_body, ''));
  v_kind  text := lower(btrim(coalesce(p_kind, 'update')));
  v_id    uuid;
  v_row   public.security_incidents;
begin
  select * into v_row from public.security_incidents where id = p_incident_id;
  if not found then
    raise exception 'incident:not_found' using errcode = 'no_data_found';
  end if;
  -- A closed record does not collect new lines. Reopening is the honest move, and
  -- it puts the reopening itself in the log.
  if v_row.status = 'closed' then
    raise exception 'incident:closed'
      using errcode = 'check_violation',
            hint = 'reopen the incident before adding to its log';
  end if;
  if length(v_body) < 5 then
    raise exception 'incident:entry_required' using errcode = 'check_violation';
  end if;
  if v_kind not in ('update', 'containment', 'decision', 'notification', 'lesson') then
    raise exception 'incident:entry_kind_invalid' using errcode = 'check_violation';
  end if;

  insert into public.incident_entries (incident_id, kind, body, actor)
  values (p_incident_id, v_kind, v_body, v_actor)
  returning id into v_id;

  return jsonb_build_object('id', v_id, 'kind', v_kind, 'at', now());
end;
$$;

revoke all on function public.log_incident_entry(uuid, text, text) from public, anon;
grant execute on function public.log_incident_entry(uuid, text, text) to authenticated;

comment on function public.log_incident_entry(uuid, text, text) is
  'Append a line to the incident timeline. Entries cannot be edited or deleted afterwards.';

-- ---------------------------------------------------------------------------
-- Obligations
-- ---------------------------------------------------------------------------
/**
 * Somebody has to be told, on some basis, by some date.
 *
 * All three are typed by a person. `due_at` is not computed from the discovery
 * time by any rule in this function, because every rule is a legal claim and the
 * applicable law is the owner's to state — so the register makes the date visible,
 * refuses to let it be forgotten, and does not pretend to know it.
 */
create or replace function public.add_incident_notification(
  p_incident_id uuid,
  p_audience    text,
  p_basis       text,
  p_due_at      timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor    uuid := public.require_incident_role();
  v_audience text := btrim(coalesce(p_audience, ''));
  v_basis    text := btrim(coalesce(p_basis, ''));
  v_row      public.security_incidents;
  v_id       uuid;
begin
  select * into v_row from public.security_incidents where id = p_incident_id;
  if not found then
    raise exception 'incident:not_found' using errcode = 'no_data_found';
  end if;
  if v_row.status = 'closed' then
    raise exception 'incident:closed'
      using errcode = 'check_violation',
            hint = 'reopen it before adding an obligation';
  end if;
  if length(v_audience) < 2 or length(v_audience) > 120 then
    raise exception 'incident:audience_required' using errcode = 'check_violation';
  end if;
  if length(v_basis) < 5 then
    raise exception 'incident:basis_required'
      using errcode = 'check_violation',
            hint = 'say what requires this notification — a habit is not a basis';
  end if;
  if p_due_at is null then
    raise exception 'incident:due_date_required'
      using errcode = 'check_violation',
            hint = 'the deadline is the point of recording the obligation';
  end if;

  insert into public.incident_notifications
    (incident_id, audience, basis, due_at, created_by)
  values (p_incident_id, v_audience, v_basis, p_due_at, v_actor)
  returning id into v_id;

  insert into public.incident_entries (incident_id, kind, body, actor)
  values (p_incident_id, 'notification',
          format('Obligation recorded: tell %s by %s — %s.',
                 v_audience, to_char(p_due_at, 'YYYY-MM-DD HH24:MI'), v_basis),
          v_actor);

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'incident.obligation_added', 'security_incident', p_incident_id,
          jsonb_build_object('audience', v_audience, 'dueAt', p_due_at, 'basis', v_basis));

  return jsonb_build_object('id', v_id, 'audience', v_audience, 'dueAt', p_due_at);
end;
$$;

revoke all on function public.add_incident_notification(uuid, text, text, timestamptz)
  from public, anon;
grant execute on function public.add_incident_notification(uuid, text, text, timestamptz)
  to authenticated;

comment on function public.add_incident_notification(uuid, text, text, timestamptz) is
  'Record that somebody must be told, why, and by when. The deadline is entered by a person; nothing here derives a legal deadline.';

/** It was told. Once. */
create or replace function public.mark_incident_notified(
  p_notification_id uuid,
  p_method          text,
  p_note            text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor  uuid := public.require_incident_role();
  v_row    public.incident_notifications;
  v_method text := btrim(coalesce(p_method, ''));
  v_at     timestamptz := now();
begin
  select * into v_row from public.incident_notifications where id = p_notification_id;
  if not found then
    raise exception 'incident:not_found' using errcode = 'no_data_found';
  end if;
  if v_row.told_at is not null then
    raise exception 'incident:already_told'
      using errcode = 'check_violation',
            hint = 'add a line to the log instead of changing when it happened';
  end if;
  if v_row.waived_at is not null then
    raise exception 'incident:already_waived'
      using errcode = 'check_violation',
            hint = 'this obligation was decided against; record the change of mind in the log';
  end if;
  if length(v_method) < 2 or length(v_method) > 80 then
    raise exception 'incident:method_required'
      using errcode = 'check_violation',
            hint = 'how it was told — a letter, an email, a call — and to whom';
  end if;

  update public.incident_notifications
     set told_at = v_at,
         told_by = v_actor,
         method  = v_method,
         note    = nullif(btrim(coalesce(p_note, '')), '')
   where id = p_notification_id;

  insert into public.incident_entries (incident_id, kind, body, actor)
  values (v_row.incident_id, 'notification',
          format('Told %s by %s, %s against a deadline of %s.',
                 v_row.audience, v_method,
                 case when v_at <= v_row.due_at then 'inside' else 'after' end,
                 to_char(v_row.due_at, 'YYYY-MM-DD HH24:MI')),
          v_actor);

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'incident.notified', 'incident_notification', p_notification_id,
          jsonb_build_object('audience', v_row.audience, 'method', v_method,
                             'late', v_at > v_row.due_at));

  return jsonb_build_object('toldAt', v_at, 'late', v_at > v_row.due_at);
end;
$$;

revoke all on function public.mark_incident_notified(uuid, text, text) from public, anon;
grant execute on function public.mark_incident_notified(uuid, text, text) to authenticated;

comment on function public.mark_incident_notified(uuid, text, text) is
  'Record that an obligation was met, how, and whether it was late. Recording it twice is refused: the log is where a correction goes.';

/**
 * Deciding **not** to tell somebody.
 *
 * This exists because the alternative is worse: an obligation that is neither met
 * nor decided has to be either ignored (and then the register is noise) or deleted
 * (and then the decision is invisible). A waiver needs a reason, stays on the
 * record, and closes the obligation without pretending it was met.
 */
create or replace function public.waive_incident_notification(
  p_notification_id uuid,
  p_reason          text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor  uuid := public.require_incident_role();
  v_row    public.incident_notifications;
  v_reason text := btrim(coalesce(p_reason, ''));
begin
  select * into v_row from public.incident_notifications where id = p_notification_id;
  if not found then
    raise exception 'incident:not_found' using errcode = 'no_data_found';
  end if;
  if v_row.told_at is not null then
    raise exception 'incident:already_told'
      using errcode = 'check_violation',
            hint = 'it was told; there is nothing to waive';
  end if;
  if v_row.waived_at is not null then
    raise exception 'incident:already_waived' using errcode = 'check_violation';
  end if;
  if length(v_reason) < 10 then
    raise exception 'incident:reason_required'
      using errcode = 'check_violation',
            hint = 'say why this body is not being told — the decision outlives the incident';
  end if;

  update public.incident_notifications
     set waived_at = now(), waived_by = v_actor, waive_reason = v_reason
   where id = p_notification_id;

  insert into public.incident_entries (incident_id, kind, body, actor)
  values (v_row.incident_id, 'decision',
          format('Decided not to tell %s: %s', v_row.audience, v_reason), v_actor);

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'incident.obligation_waived', 'incident_notification', p_notification_id,
          jsonb_build_object('audience', v_row.audience, 'reason', v_reason));

  return jsonb_build_object('waived', true, 'reason', v_reason);
end;
$$;

revoke all on function public.waive_incident_notification(uuid, text) from public, anon;
grant execute on function public.waive_incident_notification(uuid, text) to authenticated;

comment on function public.waive_incident_notification(uuid, text) is
  'Decide, with a written reason, that an obligation will not be met. Recorded as a decision rather than deleted, so the register stays complete.';

-- ---------------------------------------------------------------------------
-- What a learner would be told
-- ---------------------------------------------------------------------------
/**
 * The text, written and held.
 *
 * There is no email or SMS provider, so nothing sends this. The console says that
 * beside the field, and says it in the same sentence that explains why the field
 * exists: a notice written during the incident is honest; a notice written
 * afterwards is an explanation.
 */
create or replace function public.save_incident_notice(
  p_incident_id uuid,
  p_notice      text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor  uuid := public.require_incident_role();
  v_notice text := btrim(coalesce(p_notice, ''));
  v_row    public.security_incidents;
begin
  select * into v_row from public.security_incidents where id = p_incident_id;
  if not found then
    raise exception 'incident:not_found' using errcode = 'no_data_found';
  end if;
  if length(v_notice) < 20 then
    raise exception 'incident:notice_required'
      using errcode = 'check_violation',
            hint = 'say what happened, what it means for them, and what to do';
  end if;

  update public.security_incidents
     set learner_notice = v_notice
   where id = p_incident_id;

  insert into public.incident_entries (incident_id, kind, body, actor)
  values (p_incident_id, 'notification',
          'Learner notice written and held. It is not sent: there is no email or SMS provider.',
          v_actor);

  return jsonb_build_object('saved', true, 'sent', false,
                            'characters', length(v_notice));
end;
$$;

revoke all on function public.save_incident_notice(uuid, text) from public, anon;
grant execute on function public.save_incident_notice(uuid, text) to authenticated;

comment on function public.save_incident_notice(uuid, text) is
  'Write and hold the notice a learner would receive. Nothing delivers it — there is no email or SMS provider — and the console says so instead of implying otherwise.';

-- ---------------------------------------------------------------------------
-- Moving through the states
-- ---------------------------------------------------------------------------
/**
 * Open → contained → resolved → closed, and back to open if it turns out not to be.
 *
 * Two conditions are enforced rather than assumed:
 *
 *   * **nothing resolves while an obligation is outstanding.** An incident marked
 *     resolved with an untold body on it is the exact failure a register exists to
 *     prevent;
 *   * **nothing closes without a lesson.** A closure with no recorded change is a
 *     promise to have the same incident again, which is the only outcome worse than
 *     having it once.
 *
 * Reopening clears the dates instead of leaving them: a status of `open` beside a
 * `resolved_at` claims a resolution that no longer holds, and the log already holds
 * the history.
 */
create or replace function public.set_incident_status(
  p_incident_id uuid,
  p_status      text,
  p_reason      text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor    uuid := public.require_incident_role();
  v_status   text := lower(btrim(coalesce(p_status, '')));
  v_reason   text := btrim(coalesce(p_reason, ''));
  v_row      public.security_incidents;
  v_open     int;
  v_lessons  text;
begin
  select * into v_row from public.security_incidents where id = p_incident_id;
  if not found then
    raise exception 'incident:not_found' using errcode = 'no_data_found';
  end if;
  if v_status not in ('open', 'contained', 'resolved', 'closed') then
    raise exception 'incident:status_invalid' using errcode = 'check_violation';
  end if;
  if v_status = v_row.status then
    raise exception 'incident:status_unchanged' using errcode = 'check_violation';
  end if;
  if not (
       (v_row.status = 'open'      and v_status in ('contained', 'resolved'))
    or (v_row.status = 'contained' and v_status in ('resolved', 'open'))
    or (v_row.status = 'resolved'  and v_status in ('closed', 'open'))
    or (v_row.status = 'closed'    and v_status = 'open')
  ) then
    raise exception 'incident:transition_invalid'
      using errcode = 'check_violation',
            hint = case v_row.status
                     when 'open' then 'an open incident is contained or resolved first'
                     when 'contained' then 'a contained incident is resolved — or reopened'
                     when 'resolved' then 'a resolved incident is closed — or reopened'
                     else 'a closed incident is reopened, not moved sideways' end;
  end if;
  if length(v_reason) < 5 then
    raise exception 'incident:reason_required'
      using errcode = 'check_violation',
            hint = 'what changed, in a sentence';
  end if;

  -- Nothing resolves or closes with an obligation that is neither met nor waived.
  if v_status in ('resolved', 'closed') then
    select count(*)::int into v_open
      from public.incident_notifications
     where incident_id = p_incident_id
       and told_at is null
       and waived_at is null;
    if v_open > 0 then
      raise exception 'incident:obligations_open'
        using errcode = 'check_violation',
              hint = format('%s obligation(s) are neither told nor waived', v_open);
    end if;
  end if;

  if v_status = 'closed' then
    v_lessons := btrim(coalesce(v_row.lessons, ''));
    if length(v_lessons) < 20 then
      raise exception 'incident:lessons_required'
        using errcode = 'check_violation',
              hint = 'record what changed before closing, or the same incident happens again';
    end if;
  end if;

  update public.security_incidents
     set status = v_status,
         contained_at = case when v_status = 'contained' then now()
                             when v_status = 'open' then null
                             else contained_at end,
         resolved_at  = case when v_status = 'resolved' then now()
                             when v_status in ('open', 'contained') then null
                             else resolved_at end,
         closed_at    = case when v_status = 'closed' then now()
                             when v_status <> 'closed' then null
                             else closed_at end
   where id = p_incident_id;

  insert into public.incident_entries (incident_id, kind, body, actor)
  values (p_incident_id,
          case when v_status = 'resolved' or v_status = 'closed' then 'decision' else 'update' end,
          format('%s → %s: %s', v_row.status, v_status, v_reason),
          v_actor);

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'incident.status_changed', 'security_incident', p_incident_id,
          jsonb_build_object('from', v_row.status, 'to', v_status, 'reason', v_reason));

  return jsonb_build_object('status', v_status, 'from', v_row.status);
end;
$$;

revoke all on function public.set_incident_status(uuid, text, text) from public, anon;
grant execute on function public.set_incident_status(uuid, text, text) to authenticated;

comment on function public.set_incident_status(uuid, text, text) is
  'Move an incident through its states with a written reason. Refuses to resolve while an obligation is outstanding, and to close without a recorded lesson.';

/** The lesson, on its own, so it can be written before the closure that needs it. */
create or replace function public.record_incident_lesson(
  p_incident_id uuid,
  p_lessons     text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor   uuid := public.require_incident_role();
  v_lessons text := btrim(coalesce(p_lessons, ''));
  v_row     public.security_incidents;
begin
  select * into v_row from public.security_incidents where id = p_incident_id;
  if not found then
    raise exception 'incident:not_found' using errcode = 'no_data_found';
  end if;
  if v_row.status = 'closed' then
    raise exception 'incident:closed'
      using errcode = 'check_violation',
            hint = 'the record is closed; reopen it if something changed';
  end if;
  if length(v_lessons) < 20 then
    raise exception 'incident:lessons_required'
      using errcode = 'check_violation',
            hint = 'what changed, so that this cannot happen the same way again';
  end if;

  update public.security_incidents set lessons = v_lessons where id = p_incident_id;

  insert into public.incident_entries (incident_id, kind, body, actor)
  values (p_incident_id, 'lesson', v_lessons, v_actor);

  return jsonb_build_object('saved', true, 'characters', length(v_lessons));
end;
$$;

revoke all on function public.record_incident_lesson(uuid, text) from public, anon;
grant execute on function public.record_incident_lesson(uuid, text) to authenticated;

comment on function public.record_incident_lesson(uuid, text) is
  'What changed because of the incident. Required before it can be closed.';

-- ---------------------------------------------------------------------------
-- Reading it
-- ---------------------------------------------------------------------------
/**
 * The queue: every incident, what is late, and what has no obligation at all.
 *
 * `noObligations` is the quiet one that matters. An incident with nobody to tell is
 * either trivial or an obligation somebody has not thought of, and the register
 * cannot tell which — so it says the count out loud and leaves the judgement to the
 * person reading it.
 */
create or replace function public.incident_register()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.require_incident_role();
begin
  return (
    with obligations as (
      select n.incident_id,
             count(*)::int as total,
             count(*) filter (where n.told_at is not null)::int as told,
             count(*) filter (where n.waived_at is not null)::int as waived,
             count(*) filter (where n.told_at is null and n.waived_at is null
                                and n.due_at < now())::int as overdue,
             min(n.due_at) filter (where n.told_at is null and n.waived_at is null) as next_due
        from public.incident_notifications n
       group by n.incident_id
    ), rows as (
      select i.*,
             coalesce(o.total, 0) as obligations_total,
             coalesce(o.told, 0) as obligations_told,
             coalesce(o.waived, 0) as obligations_waived,
             coalesce(o.overdue, 0) as obligations_overdue,
             o.next_due
        from public.security_incidents i
        left join obligations o on o.incident_id = i.id
    )
    select jsonb_build_object(
      'incidents', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'id', r.id,
                 'reference', r.reference,
                 'title', r.title,
                 'summary', r.summary,
                 'severity', r.severity,
                 'status', r.status,
                 'discoveredAt', r.discovered_at,
                 'daysOpen', greatest(0, floor(extract(epoch from (coalesce(r.closed_at, now()) - r.discovered_at)) / 86400))::int,
                 'people', r.affected_people,
                 'children', r.affected_children,
                 'teachers', r.affected_teachers,
                 'categories', to_jsonb(r.data_categories),
                 'obligations', r.obligations_total,
                 'told', r.obligations_told,
                 'waived', r.obligations_waived,
                 'overdue', r.obligations_overdue,
                 'nextDue', r.next_due,
                 'hasNotice', r.learner_notice is not null,
                 'hasImpact', r.harm_assessment is not null,
                 'hasLessons', r.lessons is not null) order by
                   case r.status when 'open' then 0 when 'contained' then 1
                                 when 'resolved' then 2 else 3 end,
                   case r.severity when 'critical' then 0 when 'major' then 1 else 2 end,
                   r.discovered_at desc)
          from rows r), '[]'::jsonb),
      'counts', jsonb_build_object(
        'open', (select count(*)::int from rows where status in ('open', 'contained')),
        'resolved', (select count(*)::int from rows where status = 'resolved'),
        'closed', (select count(*)::int from rows where status = 'closed'),
        'critical', (select count(*)::int from rows where severity = 'critical' and status <> 'closed'),
        'overdueObligations', (select coalesce(sum(obligations_overdue), 0)::int from rows),
        'noObligations', (select count(*)::int from rows where obligations_total = 0 and status <> 'closed'),
        'childrenAffected', (select coalesce(sum(affected_children), 0)::int from rows where status <> 'closed')),
      'canWork', true));
end;
$$;

revoke all on function public.incident_register() from public, anon;
grant execute on function public.incident_register() to authenticated;

comment on function public.incident_register() is
  'Every incident with its obligations and what is overdue, newest and most urgent first. Counts only — the register never returns a person.';

/** One incident: the record, the obligations and the log. */
create or replace function public.incident_detail(p_incident_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.require_incident_role();
begin
  if not exists (select 1 from public.security_incidents where id = p_incident_id) then
    raise exception 'incident:not_found' using errcode = 'no_data_found';
  end if;

  return (
    select jsonb_build_object(
      'incident', jsonb_build_object(
        'id', i.id,
        'reference', i.reference,
        'title', i.title,
        'summary', i.summary,
        'severity', i.severity,
        'status', i.status,
        'occurredAt', i.occurred_at,
        'discoveredAt', i.discovered_at,
        'containedAt', i.contained_at,
        'resolvedAt', i.resolved_at,
        'closedAt', i.closed_at,
        'categories', to_jsonb(i.data_categories),
        'people', i.affected_people,
        'children', i.affected_children,
        'teachers', i.affected_teachers,
        'harm', i.harm_assessment,
        'learnerNotice', i.learner_notice,
        'lessons', i.lessons,
        'openedBy', (select display_name from public.user_profiles where user_id = i.opened_by),
        'createdAt', i.created_at),
      'notifications', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'id', n.id,
                 'audience', n.audience,
                 'basis', n.basis,
                 'dueAt', n.due_at,
                 'toldAt', n.told_at,
                 'toldBy', (select display_name from public.user_profiles where user_id = n.told_by),
                 'method', n.method,
                 'note', n.note,
                 'waivedAt', n.waived_at,
                 'waiveReason', n.waive_reason,
                 'state', case
                   when n.told_at is not null and n.told_at > n.due_at then 'late'
                   when n.told_at is not null then 'told'
                   when n.waived_at is not null then 'waived'
                   when n.due_at < now() then 'overdue'
                   else 'due' end) order by n.due_at)
          from public.incident_notifications n
         where n.incident_id = i.id), '[]'::jsonb),
      'entries', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'id', e.id,
                 'kind', e.kind,
                 'body', e.body,
                 'actor', (select display_name from public.user_profiles where user_id = e.actor),
                 'at', e.created_at) order by e.created_at)
          from public.incident_entries e
         where e.incident_id = i.id), '[]'::jsonb))
      from public.security_incidents i
     where i.id = p_incident_id);
end;
$$;

revoke all on function public.incident_detail(uuid) from public, anon;
grant execute on function public.incident_detail(uuid) to authenticated;

comment on function public.incident_detail(uuid) is
  'One incident, in full: what is known, what is due, what was done, in order.';

-- ---------------------------------------------------------------------------
-- The flag, rewritten to match what now exists
-- ---------------------------------------------------------------------------
-- Still CODE, and for three named reasons rather than a shrug: nothing detects a
-- breach, nothing sends a notification, and no deadline is stated anywhere in the
-- product — because the deadline is the owner's to name, per market. What changed
-- is that the sentence "Nothing exists" is no longer true, and a register that says
-- so while a register exists is a lie of the kind the owner reads before switching
-- anything on.
update public.platform_settings
   set preconditions = 'Built 2026-10-27: an incident register on /admin/incidents — '
        || 'what happened, when it was found, what kinds of data were involved, how '
        || 'many people and how many of them are children (counts, never a list of '
        || 'names), every obligation to tell a body with a deadline typed by a person '
        || 'and the telling recorded with its lateness, a written decision when a body '
        || 'is not told, an append-only timeline, and the text of what a learner would '
        || 'be told, written and held. Not built: detection — nothing watches for a '
        || 'breach — delivery, because there is no email or SMS provider, and any '
        || 'default deadline, because the applicable rule differs by market. The owner '
        || 'decides: who must be told, within what time, what a learner is told, and '
        || 'who is the named incident lead',
       description = 'Breach detection, response and notification'
 where key = 'platform.incident';
