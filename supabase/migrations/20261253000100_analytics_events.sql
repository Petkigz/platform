-- What people do, kept forever — because the owner said so, on 2026-10-22.
--
--   "analytics, everything is kept and is stored forever because you never know
--    what might happen."
--
-- That answered the retention question `delivery.analytics` had been held on.
-- Three consequences were written down at the time and this migration is where
-- they stop being prose:
--
--   APPEND-ONLY. `analytics_events` accepts inserts and nothing else. A trigger
--   refuses every delete, and every update except one: de-identification, from
--   inside account erasure. The table is partitioned by month, so the one thing
--   a plain table cannot offer — dropping a month as a unit, if a law ever asks
--   — is possible without rewriting history.
--
--   A CLOSED VOCABULARY, DECIDED BEFORE THE FIRST ROW. A schema mistake in an
--   append-only store is permanent, so the event list lives in a table with a
--   description per code, and `record_analytics_event()` refuses anything not on
--   it. Seven events is deliberate: volume is the one place "keep everything"
--   meets a bill, and the mitigation is writing fewer, better events rather
--   than sampling them away.
--
--   ERASURE DE-IDENTIFIES. "Learner X finished lesson 3" is a fact the platform
--   recorded, not words a person wrote; deleting it would break every figure
--   that counts completions. So closing an account nulls the two references and
--   keeps the row, exactly as orders and certificates are handled.
--
-- What this deliberately does not do: no cookies, no anonymous tracking, no
-- fingerprinting. An event is recorded only for a signed-in person, and only
-- when the flag is on. A signed-out visitor contributes nothing.
--
-- The flag itself moves from CODE to ADMIN here, because the thing it was
-- waiting for — the pipeline — is now a deploy away no longer.

-- ---------------------------------------------------------------------------
-- the vocabulary
-- ---------------------------------------------------------------------------
-- Readable to signed-in users so a screen can explain what is recorded; not
-- writable by anyone at runtime. Adding an event is a migration, which is the
-- point: the list is a promise about what the platform collects.
create table if not exists public.analytics_event_codes (
  code            text primary key
                  check (code ~ '^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$'),
  description     text not null check (length(btrim(description)) > 0),
  subject_type    text not null default 'none'
                  check (subject_type in ('none','course','course_version','lesson',
                                          'plan','plan_version','live_session')),
  learner_scoped  boolean not null default false,
  since_version   integer not null default 1 check (since_version >= 1),
  created_at      timestamptz not null default now()
);

alter table public.analytics_event_codes enable row level security;

drop policy if exists analytics_event_codes_read on public.analytics_event_codes;
create policy analytics_event_codes_read on public.analytics_event_codes
  for select to authenticated using (true);

revoke all on public.analytics_event_codes from anon, authenticated;
grant select on public.analytics_event_codes to authenticated;

insert into public.analytics_event_codes (code, description, subject_type, learner_scoped)
values
  ('lesson.opened',   'A learner opened a lesson', 'lesson', true),
  ('course.viewed',   'Someone looked at a course page', 'course_version', false),
  ('search.performed','A catalogue search ran. The words are kept in properties.query, which is why the flag says privacy review', 'none', false),
  ('plan.viewed',     'Someone looked at a subscription plan', 'plan', false),
  ('checkout.started','Checkout was opened for a plan. The order itself is money and is recorded separately', 'plan_version', true),
  ('download.saved',  'A lesson was saved inside the app for offline use', 'lesson', true),
  ('live.joined',     'A learner entered a live class', 'live_session', true)
on conflict (code) do nothing;

comment on table public.analytics_event_codes is
  'The closed list of analytics events. Adding one is a migration, because an '
  'append-only store makes a wrongly captured event wrong forever.';

-- ---------------------------------------------------------------------------
-- the store
-- ---------------------------------------------------------------------------
-- Partitioned by month on `occurred_at`. An event is a fact with a time, so the
-- time is the partition key; a month can be attached or detached as a unit
-- without touching a row, which is what "drop it if law asks" needs.
--
-- No foreign keys, on purpose. An append-only record must not be affected by a
-- cascade from the identity tables, and it must survive a person being deleted
-- from them: the references are ids, and erasure nulls them explicitly.
create table if not exists public.analytics_events (
  id                uuid not null default gen_random_uuid(),
  occurred_at       timestamptz not null default now(),
  event_code        text not null,
  subject_type      text not null default 'none',
  subject_id        uuid,
  actor_id          uuid,
  learner_profile_id uuid,
  properties        jsonb not null default '{}'::jsonb
) partition by range (occurred_at);

create index if not exists analytics_events_occurred_idx
  on public.analytics_events (occurred_at desc);
create index if not exists analytics_events_code_occurred_idx
  on public.analytics_events (event_code, occurred_at desc);
create index if not exists analytics_events_actor_idx
  on public.analytics_events (actor_id) where actor_id is not null;
create index if not exists analytics_events_learner_idx
  on public.analytics_events (learner_profile_id) where learner_profile_id is not null;

alter table public.analytics_events enable row level security;

-- No policy at all: nothing reads this table directly. Staff read it through
-- `analytics_event_totals()` and friends, which check privilege themselves. A
-- learner never reads another learner's behaviour, and does not need to read
-- their own through an API that would also serve it to anyone with a token.
revoke all on public.analytics_events from anon, authenticated;

comment on table public.analytics_events is
  'Append-only behavioural record. Kept forever by decision (2026-10-22); the '
  'only permitted rewrite is de-identification during account erasure.';

-- ---------------------------------------------------------------------------
-- a month at a time
-- ---------------------------------------------------------------------------
-- Called by the writer before it inserts, so the partition always exists. There
-- is no DEFAULT partition on purpose: a row that belongs to no month should fail
-- loudly rather than pile up somewhere unbounded that nobody can detach.
create or replace function public.analytics_ensure_month(p_at timestamptz default now())
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_start timestamptz := date_trunc('month', coalesce(p_at, now()) at time zone 'UTC') at time zone 'UTC';
  v_end   timestamptz := v_start + interval '1 month';
  v_name  text := 'analytics_events_' || to_char(v_start at time zone 'UTC', 'YYYY_MM');
begin
  if to_regclass('public.' || v_name) is not null then
    return v_name;
  end if;

  begin
    execute format(
      'create table public.%I partition of public.analytics_events for values from (%L) to (%L)',
      v_name, v_start, v_end);
    -- Partitions do not inherit RLS from their parent, and every table in this
    -- schema answers to it. The policy is the parent's; this is the switch.
    execute format('alter table public.%I enable row level security', v_name);
  exception
    when duplicate_table then null;  -- another session created it first
  end;

  return v_name;
end;
$$;

revoke all on function public.analytics_ensure_month(timestamptz) from public, anon, authenticated;

comment on function public.analytics_ensure_month(timestamptz) is
  'Creates the monthly partition for a moment, if it does not exist. Called by '
  'the writer so a new month never rejects its first event.';

-- The month this migration ships in, so the table is usable immediately.
select public.analytics_ensure_month(now());

-- ---------------------------------------------------------------------------
-- append-only, with one exception
-- ---------------------------------------------------------------------------
create or replace function public.protect_analytics_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'analytics events are kept forever and cannot be deleted'
      using errcode = 'insufficient_privilege';
  end if;

  -- The one rewrite allowed: de-identification, from inside erasure, touching
  -- nothing but the two person references.
  if new.actor_id is null and new.learner_profile_id is null
     and coalesce(current_setting('app.account_erasure', true), '') = 'on'
     and new.id          is not distinct from old.id
     and new.occurred_at is not distinct from old.occurred_at
     and new.event_code is not distinct from old.event_code
     and new.subject_type is not distinct from old.subject_type
     and new.subject_id is not distinct from old.subject_id
     and new.properties is not distinct from old.properties then
    return new;
  end if;

  raise exception 'an analytics event is a record: it can be de-identified but not rewritten'
    using errcode = 'insufficient_privilege';
end;
$$;

drop trigger if exists analytics_events_append_only on public.analytics_events;
create trigger analytics_events_append_only
  before update or delete on public.analytics_events
  for each row execute function public.protect_analytics_event();

comment on function public.protect_analytics_event() is
  'Refuses every delete and every update of an analytics row except the '
  'de-identification performed by account erasure.';

-- ---------------------------------------------------------------------------
-- the writer
-- ---------------------------------------------------------------------------
-- One door. It refuses anything the vocabulary does not contain, refuses a
-- subject that does not match the event's declared subject type, refuses a
-- learner the caller is not responsible for, and refuses properties that are
-- not a small object. Every one of those refusals is a bug caught at write time
-- rather than a wrong row kept forever.
--
-- When the flag is off, or nobody is signed in, it records nothing and returns
-- `recorded:false` instead of raising: an instrumentation call must never be
-- able to break the page it is watching. A *misspelt* code does raise, because
-- that is a developer error and silence would be worse.
create or replace function public.record_analytics_event(
  p_code text,
  p_subject_id uuid default null,
  p_learner_profile_id uuid default null,
  p_properties jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor  uuid := public.current_user_id();
  v_event  public.analytics_event_codes;
  v_props  jsonb := coalesce(p_properties, '{}'::jsonb);
  v_exists boolean;
  v_id     uuid;
begin
  if v_actor is null then
    return jsonb_build_object('recorded', false, 'reason', 'signed_out');
  end if;

  if not public.setting_bool('delivery.analytics', false) then
    return jsonb_build_object('recorded', false, 'reason', 'feature_off');
  end if;

  select * into v_event
    from public.analytics_event_codes
   where code = btrim(coalesce(p_code, ''));

  if not found then
    raise exception 'unknown analytics event: %', coalesce(p_code, '(null)')
      using errcode = 'invalid_parameter_value';
  end if;

  if jsonb_typeof(v_props) <> 'object' then
    raise exception 'event properties must be a JSON object'
      using errcode = 'invalid_parameter_value';
  end if;

  -- A kept-forever row is not the place for a payload. 2 KB is generous for a
  -- search term and a result count, and stops a client turning this into a
  -- general-purpose store.
  if pg_column_size(v_props) > 2048 then
    raise exception 'event properties are limited to 2 KB'
      using errcode = 'invalid_parameter_value';
  end if;

  if v_event.subject_type = 'none' then
    if p_subject_id is not null then
      raise exception '% is not about a subject', v_event.code
        using errcode = 'invalid_parameter_value';
    end if;
  else
    if p_subject_id is null then
      raise exception '% needs a subject', v_event.code
        using errcode = 'invalid_parameter_value';
    end if;

    v_exists := case v_event.subject_type
      when 'course' then exists (
        select 1 from public.courses where id = p_subject_id and deleted_at is null)
      when 'course_version' then exists (
        select 1 from public.course_versions where id = p_subject_id)
      when 'lesson' then exists (
        select 1 from public.lessons where id = p_subject_id)
      when 'plan' then exists (
        select 1 from public.plans where id = p_subject_id and deleted_at is null)
      when 'plan_version' then exists (
        select 1 from public.plan_versions where id = p_subject_id)
      when 'live_session' then exists (
        select 1 from public.live_sessions where id = p_subject_id)
      else false
    end;

    if not v_exists then
      raise exception 'no % exists with id %', replace(v_event.subject_type, '_', ' '), p_subject_id
        using errcode = 'no_data_found';
    end if;
  end if;

  if v_event.learner_scoped then
    if p_learner_profile_id is null then
      raise exception '% names a learner, and this call named none', v_event.code
        using errcode = 'invalid_parameter_value';
    end if;
    if not public.can_access_learner(p_learner_profile_id) then
      raise exception 'you cannot record an event for that learner'
        using errcode = 'insufficient_privilege';
    end if;
  elsif p_learner_profile_id is not null then
    raise exception '% is not about a learner', v_event.code
      using errcode = 'invalid_parameter_value';
  end if;

  perform public.analytics_ensure_month(now());

  insert into public.analytics_events
    (event_code, subject_type, subject_id, actor_id, learner_profile_id, properties)
  values
    (v_event.code, v_event.subject_type, p_subject_id, v_actor, p_learner_profile_id, v_props)
  returning id into v_id;

  return jsonb_build_object('recorded', true, 'id', v_id);
end;
$$;

revoke all on function public.record_analytics_event(text, uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.record_analytics_event(text, uuid, uuid, jsonb) to authenticated;

comment on function public.record_analytics_event(text, uuid, uuid, jsonb) is
  'Records one behavioural event for the signed-in caller, if the flag is on. '
  'Returns {recorded:false,reason} when it declines; raises on a code, subject '
  'or learner that does not fit the vocabulary.';

-- ---------------------------------------------------------------------------
-- reading it back
-- ---------------------------------------------------------------------------
-- Staff only, and deliberately aggregate: the report answers "how many" and
-- "which days", not "who". A person's own behaviour is theirs, and nothing here
-- hands one learner's rows to another.
create or replace function public.analytics_event_totals(p_days integer default 30)
returns table (event_code text, description text, events bigint,
               actors bigint, learners bigint)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_privileged(public.current_user_id()) then
    raise exception 'only platform staff may read analytics'
      using errcode = 'insufficient_privilege';
  end if;
  if p_days is null or p_days < 1 or p_days > 3650 then
    raise exception 'ask for between 1 and 3650 days'
      using errcode = 'invalid_parameter_value';
  end if;

  return query
    select e.code,
           e.description,
           count(a.id),
           count(distinct a.actor_id),
           count(distinct a.learner_profile_id)
      from public.analytics_event_codes e
      left join public.analytics_events a
        on a.event_code = e.code
       and a.occurred_at >= now() - make_interval(days => p_days)
     group by e.code, e.description
     order by count(a.id) desc, e.code;
end;
$$;

revoke all on function public.analytics_event_totals(integer) from public, anon;
grant execute on function public.analytics_event_totals(integer) to authenticated;

create or replace function public.analytics_daily(p_code text, p_days integer default 30)
returns table (day date, events bigint)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_code text := btrim(coalesce(p_code, ''));
begin
  if not public.is_privileged(public.current_user_id()) then
    raise exception 'only platform staff may read analytics'
      using errcode = 'insufficient_privilege';
  end if;
  if p_days is null or p_days < 1 or p_days > 3650 then
    raise exception 'ask for between 1 and 3650 days'
      using errcode = 'invalid_parameter_value';
  end if;
  if not exists (select 1 from public.analytics_event_codes where code = v_code) then
    raise exception 'unknown analytics event: %', coalesce(p_code, '(null)')
      using errcode = 'invalid_parameter_value';
  end if;

  return query
    select (a.occurred_at at time zone 'UTC')::date as day, count(*)
      from public.analytics_events a
     where a.event_code = v_code
       and a.occurred_at >= now() - make_interval(days => p_days)
     group by 1
     order by 1;
end;
$$;

revoke all on function public.analytics_daily(text, integer) from public, anon;
grant execute on function public.analytics_daily(text, integer) to authenticated;

-- The one report that reads the payload, because "what do people search for" is
-- the question search analytics exists to answer. `properties.query` is why the
-- flag's precondition says privacy review.
create or replace function public.analytics_search_terms(p_days integer default 30, p_limit integer default 20)
returns table (term text, searches bigint)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_privileged(public.current_user_id()) then
    raise exception 'only platform staff may read analytics'
      using errcode = 'insufficient_privilege';
  end if;
  if p_days is null or p_days < 1 or p_days > 3650 then
    raise exception 'ask for between 1 and 3650 days'
      using errcode = 'invalid_parameter_value';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 200 then
    raise exception 'ask for between 1 and 200 terms'
      using errcode = 'invalid_parameter_value';
  end if;

  return query
    select nullif(btrim(a.properties->>'query'), '') as term, count(*)
      from public.analytics_events a
     where a.event_code = 'search.performed'
       and a.occurred_at >= now() - make_interval(days => p_days)
       and nullif(btrim(a.properties->>'query'), '') is not null
     group by 1
     order by count(*) desc, 1
     limit p_limit;
end;
$$;

revoke all on function public.analytics_search_terms(integer, integer) from public, anon;
grant execute on function public.analytics_search_terms(integer, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- the flag stops being a deploy
-- ---------------------------------------------------------------------------
-- CODE meant "the pipeline is not built". It is built, so the switch moves to
-- the owner's dashboard. The value stays 'false': nothing is recorded until the
-- owner turns it on, which is the right default for a store that keeps forever.
update public.platform_settings
   set gate_type = 'admin',
       preconditions = 'Decide who reads the report. The vocabulary records catalogue search terms'
 where key = 'delivery.analytics'
   and gate_type = 'code';

-- ---------------------------------------------------------------------------
-- erasure keeps the row and loses the name
-- ---------------------------------------------------------------------------
-- The function is recreated whole, with one addition: the analytics rows that
-- name this person are de-identified inside the same transaction, while the
-- erasure setting that the append-only guard accepts is switched on.
create or replace function public.erase_my_account(p_confirm text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor       uuid := public.current_user_id();
  v_name        text;
  v_status      text;
  v_deleted     timestamptz;
  v_family_ids  uuid[];
  v_learner_ids uuid[];
  v_open        integer;
  v_board       integer;
  v_notes       integer := 0;
  v_bookmarks   integer := 0;
  v_saved       integer := 0;
  v_reviews     integer := 0;
  v_shares      integer := 0;
  v_invites     integer := 0;
  v_guardians   integer := 0;
  v_events      integer := 0;
begin
  if v_actor is null then
    raise exception 'sign in to close an account'
      using errcode = 'insufficient_privilege';
  end if;

  select display_name, account_status, deleted_at
    into v_name, v_status, v_deleted
    from public.user_profiles
   where user_id = v_actor;

  if not found then
    raise exception 'there is no account to close'
      using errcode = 'insufficient_privilege';
  end if;

  -- Idempotent: a second press answers the same way rather than failing, because
  -- "did it work?" is the question somebody asks after a network drop.
  if v_deleted is not null or v_status = 'closed' then
    return jsonb_build_object('closed', true, 'alreadyClosed', true,
                              'learnersErased', 0);
  end if;

  if btrim(coalesce(p_confirm, '')) <> btrim(v_name) then
    raise exception 'type your name exactly as it appears to close this account'
      using errcode = 'invalid_parameter_value';
  end if;

  -- A teacher with work in flight is not a self-service case: closing the
  -- account would strand the course behind a tombstone with nobody able to
  -- publish, retire or fix it. The owner closes the teacher account first.
  select count(*)
    into v_open
    from public.course_versions v
    join public.courses c on c.id = v.course_id
   where v.created_by = v_actor
     and c.deleted_at is null
     and v.version_status in ('submitted', 'approved', 'published');

  if v_open > 0 then
    raise exception 'you still have a course in review or published; ask the platform owner to close the teacher account first'
      using errcode = 'check_violation';
  end if;

  -- The same for a board seat: the owner appoints and removes, so the owner is
  -- who ends it.
  select count(*)
    into v_board
    from public.scholarly_panel_memberships m
    join public.reviewer_profiles rp on rp.id = m.reviewer_profile_id
   where rp.user_id = v_actor
     and m.status = 'active';

  if v_board > 0 then
    raise exception 'you sit on a scholarly board; ask the platform owner to remove you first'
      using errcode = 'check_violation';
  end if;

  select array_agg(distinct family_id)
    into v_family_ids
    from public.family_memberships
   where user_id = v_actor
     and status = 'active';

  -- Children belong to the family, not to the account, so they only go with the
  -- account when it was the last adult standing. If another adult is still an
  -- active member, the family and its children stay and that adult keeps them.
  select array_agg(lp.id)
    into v_learner_ids
    from public.learner_profiles lp
   where lp.deleted_at is null
     and (
       lp.linked_user_id = v_actor
       or (
         lp.family_id = any(coalesce(v_family_ids, '{}'::uuid[]))
         and lp.learner_type = 'child'
         and not exists (
           select 1
             from public.family_memberships m
            where m.family_id = lp.family_id
              and m.user_id <> v_actor
              and m.status = 'active'
         )
       )
     );

  v_learner_ids := coalesce(v_learner_ids, '{}'::uuid[]);

  -- From here the two guards below accept the change. Transaction-local, so it
  -- cannot leak into another request on a pooled connection.
  perform set_config('app.account_erasure', 'on', true);

  -- What the person wrote.
  delete from public.lesson_notes
   where user_id = v_actor or learner_profile_id = any(v_learner_ids);
  get diagnostics v_notes = row_count;

  delete from public.lesson_bookmarks
   where user_id = v_actor or learner_profile_id = any(v_learner_ids);
  get diagnostics v_bookmarks = row_count;

  delete from public.course_wishlist where user_id = v_actor;
  get diagnostics v_saved = row_count;

  delete from public.course_reviews where written_by = v_actor;
  get diagnostics v_reviews = row_count;

  -- A post is kept as a thread; the words are not. Deleting the row would
  -- cascade into other people's replies, which are not this person's to erase.
  update public.discussion_posts
     set body = '[erased]', deleted_at = now()
   where author_user_id = v_actor
     and body <> '[erased]';

  update public.assignment_submissions
     set body_text = ''
   where (created_by = v_actor or learner_profile_id = any(v_learner_ids))
     and body_text <> '';

  -- Sharing exists only while the person does. Grants go entirely rather than
  -- being revoked, because a revoked grant is still a row naming them.
  delete from public.adult_learning_shares
   where grantee_user_id = v_actor or learner_profile_id = any(v_learner_ids);
  get diagnostics v_shares = row_count;

  delete from public.share_invitations
   where invited_by = v_actor or learner_profile_id = any(v_learner_ids);
  get diagnostics v_invites = row_count;

  delete from public.guardian_relationships
   where guardian_user_id = v_actor or learner_profile_id = any(v_learner_ids);
  get diagnostics v_guardians = row_count;

  update public.support_cases
     set subject = '[erased]', body = '[erased]'
   where requested_by = v_actor
     and (subject <> '[erased]' or body <> '[erased]');

  delete from public.support_case_messages where author_user_id = v_actor;

  -- What the platform recorded is kept. The name on it is not.
  update public.certificates
     set learner_display_name = 'Deleted learner'
   where learner_profile_id = any(v_learner_ids)
     and learner_display_name <> 'Deleted learner';

  update public.learner_profiles
     set display_name = 'Deleted learner',
         status = 'archived',
         deleted_at = now()
   where id = any(v_learner_ids);

  -- `fm_revoked_has_timestamp` is right to insist on this: a revoked membership
  -- with no moment of revocation cannot say when access ended.
  update public.family_memberships
     set status = 'revoked', revoked_at = now()
   where user_id = v_actor and status = 'active';

  update public.billing_account_memberships
     set status = 'revoked'
   where user_id = v_actor and status = 'active';

  update public.user_profiles
     set display_name = 'Deleted account',
         avatar_path = null,
         timezone = null,
         country_code = null,
         preferred_language = 'en',
         account_status = 'closed',
         deleted_at = now()
   where user_id = v_actor;

  -- Analytics is kept forever (decided 2026-10-22), so it joins the ledger on
  -- the de-identification list rather than the delete list: the rows that count
  -- a completion or a search survive, the person named on them does not. The
  -- guard on `analytics_events` permits exactly this rewrite and no other.
  update public.analytics_events
     set actor_id = null, learner_profile_id = null
   where actor_id = v_actor or learner_profile_id = any(v_learner_ids);
  get diagnostics v_events = row_count;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (
    v_actor,
    'account.closed_by_owner',
    'user_profile',
    v_actor,
    jsonb_build_object(
      'learnersErased', coalesce(array_length(v_learner_ids, 1), 0),
      'retained', 'orders, payments, refunds, audit events, enrolments, progress, certificates, analytics'
    )
  );

  return jsonb_build_object(
    'closed', true,
    'alreadyClosed', false,
    'learnersErased', coalesce(array_length(v_learner_ids, 1), 0),
    'removed', jsonb_build_object(
      'notes', v_notes,
      'bookmarks', v_bookmarks,
      'savedCourses', v_saved,
      'reviews', v_reviews,
      'shares', v_shares,
      'invitations', v_invites,
      'guardianLinks', v_guardians
    ),
    'deidentified', jsonb_build_object('analyticsEvents', v_events)
  );
end;
$$;
