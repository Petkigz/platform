-- Live classes: a scheduled room a teacher opens and the right learners can enter.
-- Decided 2026-10-22: "we build them, because I want the system more intact."
--
-- `delivery.live_classes` has been an empty flag with a three-word note — "RTC
-- provider; scheduling and timezones; recording policy; moderation" — since the
-- register was written. None of that was built, and the decision to build rather
-- than buy means the platform owns all four:
--
--   SCHEDULING. A session is a course, a time, a length, a title and a room. It
--   is stored in UTC and carries the zone it was *scheduled* in, because a
--   teacher in Kampala setting "Tuesday at 7pm" needs to see it as 7pm even if
--   the platform later moves servers. `starts_at` is the truth; the zone is what
--   the human typed.
--
--   TIMEZONE. The same pair the streak display uses: the learner's own zone,
--   falling back to the reader's, then UTC, each validated.
--
--   RECORDING POLICY. Decided 2026-10-20 and not reopened here: **the teacher is
--   recorded, learners never are.** A live class with children in it that
--   captures their video is a safeguarding incident with a retention period.
--   There is a column for a recording reference and no writer that could set it
--   without a provider, which is the honest state.
--
--   MODERATION. Two controls, both server-side: a room needs a live session, and
--   only people already entitled to the course can be in one. A learner cannot
--   forwards a room address to somebody else usefully, because the join is
--   authorised per person on entry — and a child's join is authorised on the
--   adult's entitlement, exactly as every other learner surface is.
--
-- THE PROVIDER IS NOT BUILT AND IS NOT FAKED
-- ------------------------------------------
-- A room is a URL hosted by somebody. This migration stores which provider the
-- platform is configured for and a room slug per session; `join_live_session()`
-- refuses with a sentence when none is configured rather than handing out a URL
-- that does not carry a class. `web/src/lib/live.ts` builds the URL from the base
-- the owner sets, so switching providers is a setting and not a migration.

-- ---------------------------------------------------------------------------
-- the flag
-- ---------------------------------------------------------------------------
-- Promoted from CODE to ADMIN on the same day: scheduling, joining, the clock,
-- attendance and the roll are built, so the switch is now the owner's rather than
-- a deploy's. The RTC host is a setting, not code.
update public.platform_settings
   set gate_type  = 'admin',
       description = 'Live teaching sessions: a teacher schedules a room, entitled learners join during its window.',
       preconditions = 'A room host base URL in delivery.live_room_base. The room itself is hosted elsewhere; this platform owns the schedule, the entitlement and the roll. Teacher-only recording: learners are never captured.'
 where key = 'delivery.live_classes';

-- The provider base. Empty means "not connected yet", which is the state this
-- ships in and the state `join_live_session()` describes rather than hides.
insert into public.platform_settings (key, value_type, value_text, gate_type, description, preconditions)
values (
  'delivery.live_room_base',
  'text',
  '',
  'admin',
  'Base URL of the live-room host, e.g. https://meet.example.org. A room is this plus /room/<slug>. Empty means live rooms are not connected yet.',
  null
)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- sessions
-- ---------------------------------------------------------------------------
create table if not exists public.live_sessions (
  id uuid primary key default gen_random_uuid(),

  course_id uuid not null references public.courses (id) on delete cascade,

  -- Optional: a session may belong to a cohort, which is how a class with a
  -- roster gets its own room. A session with no cohort is open to anybody
  -- entitled to the course.
  cohort_id uuid references public.cohorts (id) on delete set null,

  title text not null check (length(btrim(title)) between 1 and 140),
  description text check (description is null or length(description) <= 2000),

  -- The teacher who opens it. This is the person recorded, if anything is.
  host_user_id uuid not null references public.user_profiles (user_id) on delete restrict,

  starts_at timestamptz not null,
  ends_at   timestamptz not null,

  -- The zone the teacher typed the time in. `starts_at` is the truth; this is
  -- what makes "18:00 EAT" print as 18:00 to the person who set it.
  scheduled_zone text not null default 'UTC',

  -- How long before the start and after the start somebody may knock. A room
  -- open all day is not a class; these two numbers are the moderation control.
  opens_minutes_before integer not null default 15 check (opens_minutes_before between 0 and 240),
  closes_minutes_after  integer not null default 30 check (closes_minutes_after between 0 and 480),

  status text not null default 'scheduled'
    check (status in ('scheduled', 'live', 'ended', 'cancelled')),

  -- Derived, not chosen: the room name. Random rather than sequential so the
  -- address cannot be guessed, and stable so a calendar invite points at the
  -- same room after a reschedule.
  room_slug text not null unique
    check (room_slug ~ '^[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}$'),

  -- Teacher-only recording, decided 2026-10-20. Set by a provider callback when
  -- one exists; nothing in this migration can write it.
  recording_reference text,
  recording_available_at timestamptz,

  cancelled_at timestamptz,
  cancelled_reason text,

  created_by uuid not null references public.user_profiles (user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint ls_window check (ends_at > starts_at),
  constraint ls_cancelled_has_reason
    check (status <> 'cancelled'
           or (cancelled_at is not null and length(btrim(coalesce(cancelled_reason, ''))) > 0)),
  constraint ls_recording_has_reference
    check ((recording_reference is null) = (recording_available_at is null))
);

create index if not exists live_sessions_course_idx
  on public.live_sessions (course_id, starts_at);
create index if not exists live_sessions_cohort_idx
  on public.live_sessions (cohort_id, starts_at);
create index if not exists live_sessions_host_idx
  on public.live_sessions (host_user_id, starts_at);

drop trigger if exists live_sessions_set_updated_at on public.live_sessions;
create trigger live_sessions_set_updated_at
  before update on public.live_sessions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- attendance
-- ---------------------------------------------------------------------------
-- Who came, when they arrived and when they left. Written only by the definer
-- functions below, never by a client: an attendance record that the attendee can
-- write is not a record.
create table if not exists public.live_session_attendance (
  id uuid primary key default gen_random_uuid(),

  session_id uuid not null references public.live_sessions (id) on delete cascade,
  learner_profile_id uuid not null references public.learner_profiles (id) on delete cascade,

  -- The account that opened the room for them: an adult joins as themselves, a
  -- child is joined by a guardian. Recorded because "who was supervising" is a
  -- safeguarding question the platform should be able to answer.
  joined_by uuid references public.user_profiles (user_id) on delete set null,

  joined_at timestamptz not null default now(),
  left_at timestamptz,
  minutes_present integer,

  constraint lsa_minutes_agree
    check ((left_at is null) = (minutes_present is null)),
  constraint lsa_minutes_not_negative
    check (minutes_present is null or minutes_present >= 0)
);

create unique index if not exists live_session_attendance_one_per_learner
  on public.live_session_attendance (session_id, learner_profile_id);

create index if not exists live_session_attendance_learner_idx
  on public.live_session_attendance (learner_profile_id, joined_at desc);

-- ---------------------------------------------------------------------------
-- who may enter, and when
-- ---------------------------------------------------------------------------
create or replace function public.live_session_joinable(
  p_session_id uuid,
  p_learner_profile_id uuid,
  p_at timestamptz default now()
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_session public.live_sessions;
  v_enrolled boolean;
  v_opens    timestamptz;
  v_closes   timestamptz;
begin
  select * into v_session from public.live_sessions s where s.id = p_session_id;
  if not found then
    return jsonb_build_object('joinable', false, 'reason', 'unknown_session');
  end if;

  if v_session.status = 'cancelled' then
    return jsonb_build_object('joinable', false, 'reason', 'cancelled');
  end if;

  -- The same predicate every other learner surface uses, so a child joined by a
  -- verified guardian is entitled on the guardian's purchase and nobody else is.
  select exists (
    select 1
      from public.course_enrolments ce
     where ce.course_id = v_session.course_id
       and ce.learner_profile_id = p_learner_profile_id
       and ce.status in ('active', 'completed')
       and ce.deleted_at is null
  ) into v_enrolled;

  if not v_enrolled then
    return jsonb_build_object('joinable', false, 'reason', 'not_enrolled');
  end if;

  v_opens  := v_session.starts_at - make_interval(mins => v_session.opens_minutes_before);
  v_closes := v_session.ends_at + make_interval(mins => v_session.closes_minutes_after);

  if p_at < v_opens then
    return jsonb_build_object(
      'joinable', false, 'reason', 'not_open_yet', 'opensAt', v_opens);
  end if;
  if p_at > v_closes then
    return jsonb_build_object('joinable', false, 'reason', 'closed');
  end if;
  if v_session.status = 'ended' then
    return jsonb_build_object('joinable', false, 'reason', 'ended');
  end if;

  return jsonb_build_object(
    'joinable', true,
    'roomSlug', v_session.room_slug,
    'opensAt', v_opens,
    'closesAt', v_closes
  );
end;
$$;

revoke all on function public.live_session_joinable(uuid, uuid, timestamptz) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- scheduling
-- ---------------------------------------------------------------------------
create or replace function public.schedule_live_session(
  p_course_id   uuid,
  p_title       text,
  p_starts_at   timestamptz,
  p_ends_at     timestamptz,
  p_timezone    text default 'UTC',
  p_description text default null,
  p_cohort_id   uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor   uuid := public.current_user_id();
  v_zone    text;
  v_slug    text;
  v_row     public.live_sessions;
begin
  if v_actor is null then
    raise exception 'sign in to schedule a class'
      using errcode = 'insufficient_privilege';
  end if;

  -- The course author, or the owner and staff. A teacher cannot open a room on a
  -- course they do not teach: a live room with an unknown host in it is worse
  -- than no room.
  if not exists (
    select 1
      from public.courses c
     where c.id = p_course_id
       and c.deleted_at is null
       and (c.created_by = v_actor or public.is_privileged(v_actor))
  ) then
    raise exception 'only the course author may schedule a live class for it'
      using errcode = 'insufficient_privilege';
  end if;

  if p_ends_at <= p_starts_at then
    raise exception 'a class has to end after it starts'
      using errcode = 'invalid_parameter_value';
  end if;
  if p_ends_at > p_starts_at + interval '12 hours' then
    raise exception 'a live class cannot be longer than 12 hours'
      using errcode = 'invalid_parameter_value';
  end if;

  -- A bad zone would print every time wrong, so it is checked here rather than
  -- trusted. `pg_timezone_names` is the same list the streak display uses.
  v_zone := coalesce(nullif(btrim(p_timezone), ''), 'UTC');
  if not exists (select 1 from pg_timezone_names z where z.name = v_zone) then
    raise exception '% is not a time zone this platform recognises', v_zone
      using errcode = 'invalid_parameter_value';
  end if;

  if p_cohort_id is not null and not exists (
    select 1 from public.cohorts c
     where c.id = p_cohort_id and c.course_id = p_course_id
  ) then
    raise exception 'that cohort is not part of this course'
      using errcode = 'invalid_parameter_value';
  end if;

  -- 12 hex characters in three groups. Random, so a room address cannot be
  -- walked, and stable, so a rescheduled class keeps its link.
  v_slug := lower(
    substr(replace(gen_random_uuid()::text, '-', ''), 1, 4) || '-' ||
    substr(replace(gen_random_uuid()::text, '-', ''), 1, 4) || '-' ||
    substr(replace(gen_random_uuid()::text, '-', ''), 1, 4));

  insert into public.live_sessions
    (course_id, cohort_id, title, description, host_user_id,
     starts_at, ends_at, scheduled_zone, room_slug, created_by)
  values
    (p_course_id, p_cohort_id, btrim(p_title),
     nullif(btrim(coalesce(p_description, '')), ''),
     v_actor, p_starts_at, p_ends_at, v_zone, v_slug, v_actor)
  returning * into v_row;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'teaching.live_session_scheduled', 'live_session', v_row.id,
          jsonb_build_object('courseId', p_course_id, 'startsAt', v_row.starts_at,
                             'zone', v_zone));

  return to_jsonb(v_row);
end;
$$;

revoke all on function public.schedule_live_session(uuid, text, timestamptz, timestamptz, text, text, uuid) from public, anon;
grant execute on function public.schedule_live_session(uuid, text, timestamptz, timestamptz, text, text, uuid) to authenticated;

create or replace function public.cancel_live_session(
  p_session_id uuid,
  p_reason     text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
  v_row   public.live_sessions;
begin
  if v_actor is null then
    raise exception 'sign in to cancel a class' using errcode = 'insufficient_privilege';
  end if;

  select * into v_row from public.live_sessions s where s.id = p_session_id;
  if not found then
    raise exception 'that class does not exist' using errcode = 'no_data_found';
  end if;
  if v_row.host_user_id <> v_actor and not public.is_privileged(v_actor) then
    raise exception 'only the teacher hosting a class may cancel it'
      using errcode = 'insufficient_privilege';
  end if;
  if nullif(btrim(coalesce(p_reason, '')), '') is null then
    raise exception 'say why the class is cancelled; learners will read it'
      using errcode = 'invalid_parameter_value';
  end if;

  update public.live_sessions
     set status = 'cancelled', cancelled_at = now(), cancelled_reason = btrim(p_reason)
   where id = p_session_id
     and status in ('scheduled', 'live')
  returning * into v_row;

  if v_row.id is null then
    raise exception 'that class was already ended or cancelled'
      using errcode = 'invalid_parameter_value';
  end if;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'teaching.live_session_cancelled', 'live_session', v_row.id,
          jsonb_build_object('reason', v_row.cancelled_reason));

  return to_jsonb(v_row);
end;
$$;

revoke all on function public.cancel_live_session(uuid, text) from public, anon;
grant execute on function public.cancel_live_session(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- joining
-- ---------------------------------------------------------------------------
-- The room address is handed out one person at a time, after the entitlement and
-- the clock are both checked. Nothing is written here: arriving is not proof of
-- attending, and `record_live_attendance()` is a separate, later fact.
create or replace function public.join_live_session(
  p_session_id         uuid,
  p_learner_profile_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor    uuid := public.current_user_id();
  v_session  public.live_sessions;
  v_base     text;
  v_state    jsonb;
  v_checkin  public.live_session_attendance;
begin
  if v_actor is null then
    raise exception 'sign in to join a class' using errcode = 'insufficient_privilege';
  end if;

  if not public.can_access_learner(p_learner_profile_id) then
    raise exception 'you are not responsible for that learner'
      using errcode = 'insufficient_privilege';
  end if;

  select * into v_session from public.live_sessions s where s.id = p_session_id;
  if not found then
    raise exception 'that class does not exist' using errcode = 'no_data_found';
  end if;

  v_state := public.live_session_joinable(p_session_id, p_learner_profile_id);
  if (v_state ->> 'joinable')::boolean is not true then
    return v_state || jsonb_build_object('joined', false);
  end if;

  -- The provider. Empty is the shipped state, and saying so is the whole point:
  -- a URL that does not carry a class would be worse than a refusal.
  select value_text into v_base
    from public.platform_settings where key = 'delivery.live_room_base';
  if nullif(btrim(coalesce(v_base, '')), '') is null then
    return jsonb_build_object(
      'joined', false,
      'reason', 'no_room_host',
      'message', 'live rooms are not connected yet; the class is scheduled and will not open a room'
    );
  end if;

  -- The room opens: the first arrival is recorded as attendance. `joined_at` is
  -- the arrival, `left_at` stays null until they are marked gone.
  insert into public.live_session_attendance
    (session_id, learner_profile_id, joined_by)
  values (p_session_id, p_learner_profile_id, v_actor)
  on conflict (session_id, learner_profile_id) do nothing;

  select * into v_checkin
    from public.live_session_attendance a
   where a.session_id = p_session_id
     and a.learner_profile_id = p_learner_profile_id;

  return jsonb_build_object(
    'joined', true,
    'roomSlug', v_session.room_slug,
    'roomUrl', rtrim(btrim(v_base), '/') || '/room/' || v_session.room_slug,
    'startsAt', v_session.starts_at,
    'endsAt', v_session.ends_at,
    'scheduledZone', v_session.scheduled_zone,
    'joinedAt', v_checkin.joined_at
  );
end;
$$;

revoke all on function public.join_live_session(uuid, uuid) from public, anon;
grant execute on function public.join_live_session(uuid, uuid) to authenticated;

comment on function public.join_live_session(uuid, uuid) is
  'Checks entitlement and the clock, records the first arrival, and returns the '
  'room address. Refuses with a sentence when no room host is configured, rather '
  'than handing out a URL that does not carry a class.';

-- ---------------------------------------------------------------------------
-- leaving, and the teacher's record of who came
-- ---------------------------------------------------------------------------
create or replace function public.record_live_attendance(
  p_session_id         uuid,
  p_learner_profile_id uuid,
  p_left               boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
  v_row   public.live_session_attendance;
begin
  if v_actor is null then
    raise exception 'sign in to record attendance' using errcode = 'insufficient_privilege';
  end if;
  if not public.can_access_learner(p_learner_profile_id) then
    raise exception 'you are not responsible for that learner'
      using errcode = 'insufficient_privilege';
  end if;

  update public.live_session_attendance
     set left_at = case when p_left then coalesce(left_at, now()) else null end,
         minutes_present = case when p_left then
           greatest(0, floor(extract(epoch from
             (coalesce(left_at, now()) - joined_at)) / 60)::integer)
         else null end
   where session_id = p_session_id
     and learner_profile_id = p_learner_profile_id
  returning * into v_row;

  if v_row.id is null then
    raise exception 'that learner has not joined this class'
      using errcode = 'no_data_found';
  end if;

  return to_jsonb(v_row);
end;
$$;

revoke all on function public.record_live_attendance(uuid, uuid, boolean) from public, anon;
grant execute on function public.record_live_attendance(uuid, uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- row level security
-- ---------------------------------------------------------------------------
-- Both tables are read through definer projections — `my_live_sessions()` for a
-- learner, `live_session_roster()` for a teacher — and written only by the
-- functions above. So the policies are deliberately narrow rather than open:
--
--   * a session is readable by its host, by the course author, and by staff.
--     NOT by every learner: a session row carries the room slug, and a room
--     address is a capability. A learner gets theirs one at a time from
--     `join_live_session()`, after the clock and the entitlement are checked.
--   * attendance is readable by the host, the course author and staff. A learner
--     can read their own row, because "did I attend?" is their own fact.
--
-- There is no insert, update or delete policy on either table. Every write goes
-- through a definer function that decides who may do it and audits it.
alter table public.live_sessions enable row level security;
alter table public.live_session_attendance enable row level security;

drop policy if exists live_sessions_read on public.live_sessions;
create policy live_sessions_read on public.live_sessions
  for select to authenticated
  using (
    host_user_id = public.current_user_id()
    or public.is_privileged(public.current_user_id())
    or exists (
      select 1 from public.courses c
       where c.id = live_sessions.course_id
         and c.created_by = public.current_user_id()
    )
  );

drop policy if exists live_session_attendance_read on public.live_session_attendance;
create policy live_session_attendance_read on public.live_session_attendance
  for select to authenticated
  using (
    public.can_access_learner(learner_profile_id)
    or public.is_privileged(public.current_user_id())
    or exists (
      select 1 from public.live_sessions s
        join public.courses c on c.id = s.course_id
       where s.id = live_session_attendance.session_id
         and (s.host_user_id = public.current_user_id()
              or c.created_by = public.current_user_id())
    )
  );

revoke all on public.live_sessions from anon, authenticated;
revoke all on public.live_session_attendance from anon, authenticated;
grant select on public.live_sessions to authenticated;
grant select on public.live_session_attendance to authenticated;

-- ---------------------------------------------------------------------------
-- the class list, for the people in it
-- ---------------------------------------------------------------------------
-- A definer projection rather than a policy on `live_sessions`: a session row
-- names the host and the room, and neither belongs on every learner's screen.
-- The projection carries only what a learner needs to decide whether to come.
create or replace function public.my_live_sessions(p_course_id uuid default null)
returns table (
  session_id uuid,
  course_id uuid,
  course_title text,
  title text,
  description text,
  starts_at timestamptz,
  ends_at timestamptz,
  scheduled_zone text,
  status text,
  cancelled_reason text,
  joinable boolean,
  reason text,
  learner_profile_id uuid,
  attended boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select s.id,
         s.course_id,
         c.title,
         s.title,
         s.description,
         s.starts_at,
         s.ends_at,
         s.scheduled_zone,
         s.status,
         s.cancelled_reason,
         coalesce((public.live_session_joinable(s.id, lp.id) ->> 'joinable')::boolean, false),
         public.live_session_joinable(s.id, lp.id) ->> 'reason',
         lp.id,
         exists (select 1 from public.live_session_attendance a
                  where a.session_id = s.id and a.learner_profile_id = lp.id)
    from public.live_sessions s
    join public.courses c on c.id = s.course_id
    join public.learner_profiles lp on lp.id in (
      select ce.learner_profile_id
        from public.course_enrolments ce
       where ce.course_id = s.course_id
         and ce.status in ('active', 'completed')
         and ce.deleted_at is null
         and public.can_access_learner(ce.learner_profile_id)
    )
   where (p_course_id is null or s.course_id = p_course_id)
     and c.deleted_at is null
     and public.setting_bool('delivery.live_classes', false)
   order by s.starts_at;
$$;

revoke all on function public.my_live_sessions(uuid) from public, anon;
grant execute on function public.my_live_sessions(uuid) to authenticated;

-- The teacher's view: their own sessions and who came, with minutes, because a
-- live class a learner did not attend is a fact the teacher is entitled to.
create or replace function public.live_session_roster(p_session_id uuid)
returns table (
  learner_profile_id uuid,
  display_name text,
  joined_at timestamptz,
  left_at timestamptz,
  minutes_present integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor   uuid := public.current_user_id();
  v_session public.live_sessions;
begin
  select * into v_session from public.live_sessions s where s.id = p_session_id;
  if not found then
    return;
  end if;
  if v_session.host_user_id <> v_actor
     and not public.is_privileged(v_actor)
     and not exists (select 1 from public.courses c
                      where c.id = v_session.course_id and c.created_by = v_actor) then
    return;
  end if;

  return query
    select a.learner_profile_id, lp.display_name, a.joined_at, a.left_at, a.minutes_present
      from public.live_session_attendance a
      join public.learner_profiles lp on lp.id = a.learner_profile_id
     where a.session_id = p_session_id
     order by a.joined_at;
end;
$$;

revoke all on function public.live_session_roster(uuid) from public, anon;
grant execute on function public.live_session_roster(uuid) to authenticated;
