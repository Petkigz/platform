-- When a cohort stops accepting joiners, decided by the teacher.
--
-- The built behaviour left the join window open from before the start until the
-- cohort ended, so anybody could join a class in its final week and land in a
-- group whose conversation, deadlines and markbook had already moved on without
-- them. That was flagged as the precondition `learning.cohorts` was held on.
--
-- Settled 2026-10-19: **the teacher decides, per cohort**, with the default at
-- the start date. The default is the strict and fair one — a class that begins
-- on Monday stops taking joiners on Monday — and holding the window open longer
-- is a deliberate act by the person who knows whether the first two weeks are
-- catch-up-able. Recording it per cohort rather than as a platform-wide grace
-- period matters because the right answer differs between a four-week Qur'an
-- cycle and a twelve-week course with a slow opening.
--
-- Two consequences worth stating, because they are the reason this is a column
-- and not a setting:
--
--   * Closing early is allowed. A teacher may stop registration before the class
--     starts, which is what "registration closes Friday, we begin Monday" means.
--     So `join_closes_at` is not constrained to be at or after `starts_at`.
--   * It cannot outlive the class. A join window that closes after `ends_at`
--     would offer a place in a cohort that has finished, so the column carries
--     that as a table check rather than leaving it to the writer function.
--
-- Existing members are untouched: this governs arriving, not staying. Leaving
-- and closing keep working exactly as they did, and a learner already in the
-- class when the window shuts is not affected by it.

alter table public.cohorts
  add column if not exists join_closes_at timestamptz;

-- Backfill before the NOT NULL: every cohort that already exists gets the
-- default rule, which is the one its teacher would have expected.
update public.cohorts
   set join_closes_at = starts_at
 where join_closes_at is null;

alter table public.cohorts
  alter column join_closes_at set not null;

alter table public.cohorts
  drop constraint if exists cohorts_join_window_fits_the_class;
alter table public.cohorts
  add constraint cohorts_join_window_fits_the_class
  check (ends_at is null or join_closes_at <= ends_at);

comment on column public.cohorts.join_closes_at is
  'When this cohort stops accepting joiners. Defaults to starts_at: the strict and fair rule. A teacher may set it earlier (registration closes before the class begins) or later (the first weeks are catch-up-able), but never after ends_at. Governs arriving, not staying — existing members are unaffected.';

create index if not exists cohorts_join_window_idx
  on public.cohorts (course_id, join_closes_at)
  where deleted_at is null and status = 'open';

-- ---------------------------------------------------------------------------
-- create_cohort gains the window.
--
-- The old seven-argument signature is dropped first: adding a DEFAULT argument
-- to a plpgsql function creates an overload rather than replacing it, and two
-- create_cohort functions would leave whichever the caller happened to match.
-- ---------------------------------------------------------------------------

drop function if exists public.create_cohort(uuid, uuid, text, text, timestamptz, timestamptz, integer);

create or replace function public.create_cohort(
  p_course_id uuid,
  p_course_version_id uuid,
  p_title text,
  p_description text,
  p_starts_at timestamptz,
  p_ends_at timestamptz default null,
  p_capacity integer default null,
  p_join_closes_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
  v_author uuid;
  v_course_status text;
  v_status text;
  v_join_closes timestamptz;
  v_id uuid;
begin
  if v_actor is null then
    raise exception 'sign in to open a cohort' using errcode = 'insufficient_privilege';
  end if;

  if not public.setting_bool('learning.cohorts', false) then
    raise exception 'cohorts are not enabled (learning.cohorts is off)'
      using errcode = 'check_violation';
  end if;

  select c.created_by, c.status into v_author, v_course_status
    from public.courses c
   where c.id = p_course_id and c.deleted_at is null
   for update;
  if not found then
    raise exception 'course not found' using errcode = 'no_data_found';
  end if;

  -- The author of the course opens the class. Not "any teacher": the person who
  -- marks the work is the person who set it, and a second teacher with a roster
  -- of another teacher's learners is a conflict nobody has designed rules for.
  if v_author <> v_actor and not public.is_privileged(v_actor) then
    raise exception 'only the course author can open a cohort for this course'
      using errcode = 'insufficient_privilege';
  end if;
  if v_course_status <> 'active' then
    raise exception 'a cohort needs an active course'
      using errcode = 'check_violation';
  end if;

  select cv.version_status into v_status
    from public.course_versions cv
   where cv.id = p_course_version_id and cv.course_id = p_course_id;
  if not found then
    raise exception 'course version not found' using errcode = 'no_data_found';
  end if;
  if v_status <> 'published' then
    raise exception 'a cohort needs a published course version'
      using errcode = 'check_violation';
  end if;

  if p_starts_at is null then
    raise exception 'a cohort needs a start date' using errcode = 'check_violation';
  end if;
  if p_starts_at < now() then
    raise exception 'a cohort must start now or later' using errcode = 'check_violation';
  end if;
  if p_ends_at is not null and p_ends_at <= p_starts_at then
    raise exception 'a cohort must end after it starts' using errcode = 'check_violation';
  end if;
  if p_capacity is not null and p_capacity < 1 then
    raise exception 'capacity must be at least one' using errcode = 'check_violation';
  end if;

  -- Blank means "use the default", which is the start date. A window that has
  -- already shut at creation time would be a class nobody can join, and one
  -- after the end would offer a place in a finished course.
  v_join_closes := coalesce(p_join_closes_at, p_starts_at);
  if v_join_closes <= now() then
    raise exception 'the join window must close later than now; leave it blank to close it when the cohort starts'
      using errcode = 'check_violation';
  end if;
  if p_ends_at is not null and v_join_closes > p_ends_at then
    raise exception 'the join window cannot close after the cohort ends'
      using errcode = 'check_violation';
  end if;

  insert into public.cohorts
    (course_id, course_version_id, title, description, created_by,
     starts_at, ends_at, capacity, join_closes_at, status)
  values
    (p_course_id, p_course_version_id, trim(p_title), nullif(trim(coalesce(p_description, '')), ''),
     v_actor, p_starts_at, p_ends_at, p_capacity, v_join_closes, 'draft')
  returning id into v_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'cohort.created', 'cohort', v_id,
          jsonb_build_object('course_id', p_course_id,
                             'course_version_id', p_course_version_id,
                             'starts_at', p_starts_at, 'ends_at', p_ends_at,
                             'capacity', p_capacity,
                             'join_closes_at', v_join_closes,
                             'join_window_defaulted', p_join_closes_at is null));

  return v_id;
end;
$$;
revoke all on function public.create_cohort(uuid, uuid, text, text, timestamptz, timestamptz, integer, timestamptz) from public;
grant execute on function public.create_cohort(uuid, uuid, text, text, timestamptz, timestamptz, integer, timestamptz) to authenticated;

-- ---------------------------------------------------------------------------
-- Moving the window.
--
-- A narrow writer rather than a general update_cohort(): the title, dates and
-- capacity of a published class are what people registered against, and this is
-- the one field a teacher legitimately needs to change after opening — because
-- "we will take joiners for two more days" is a decision made once the class is
-- running. Anything broader waits for a reason to exist.
-- ---------------------------------------------------------------------------

create or replace function public.set_cohort_join_window(
  p_cohort_id uuid,
  p_join_closes_at timestamptz
)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
  v_status text;
  v_starts timestamptz;
  v_ends timestamptz;
  v_old timestamptz;
begin
  if v_actor is null then
    raise exception 'sign in to change a cohort' using errcode = 'insufficient_privilege';
  end if;

  if p_join_closes_at is null then
    raise exception 'choose when the cohort stops accepting joiners'
      using errcode = 'invalid_parameter_value';
  end if;

  select c.status, c.starts_at, c.ends_at, c.join_closes_at
    into v_status, v_starts, v_ends, v_old
    from public.cohorts c
   where c.id = p_cohort_id and c.deleted_at is null
   for update;
  if not found then
    raise exception 'cohort not found' using errcode = 'no_data_found';
  end if;

  if not public.can_manage_cohort(p_cohort_id) then
    raise exception 'only the teacher who opened this cohort can change it'
      using errcode = 'insufficient_privilege';
  end if;

  -- A closed or cancelled class is not accepting anybody, so moving its window
  -- would change a date on a door that is already shut.
  if v_status not in ('draft', 'open') then
    raise exception 'a % cohort is not accepting joiners, so its window cannot move', v_status
      using errcode = 'check_violation';
  end if;

  if p_join_closes_at <= now() then
    raise exception 'the join window must close later than now'
      using errcode = 'check_violation';
  end if;
  if v_ends is not null and p_join_closes_at > v_ends then
    raise exception 'the join window cannot close after the cohort ends'
      using errcode = 'check_violation';
  end if;

  update public.cohorts
     set join_closes_at = p_join_closes_at
   where id = p_cohort_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'cohort.join_window_set', 'cohort', p_cohort_id,
          jsonb_build_object('previous_join_closes_at', v_old,
                             'join_closes_at', p_join_closes_at,
                             'starts_at', v_starts, 'ends_at', v_ends));

  return p_join_closes_at;
end;
$$;
revoke all on function public.set_cohort_join_window(uuid, timestamptz) from public;
grant execute on function public.set_cohort_join_window(uuid, timestamptz) to authenticated;

-- ---------------------------------------------------------------------------
-- join_cohort enforces it.
-- ---------------------------------------------------------------------------

drop function if exists public.join_cohort(uuid, uuid);

create or replace function public.join_cohort(
  p_cohort_id uuid,
  p_learner_profile_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
  v_course uuid;
  v_status text;
  v_ends timestamptz;
  v_join_closes timestamptz;
  v_capacity integer;
  v_active integer;
  v_version uuid;
  v_id uuid;
begin
  if v_actor is null then
    raise exception 'sign in to join a cohort' using errcode = 'insufficient_privilege';
  end if;

  if not public.setting_bool('learning.cohorts', false) then
    raise exception 'cohorts are not enabled (learning.cohorts is off)'
      using errcode = 'check_violation';
  end if;

  select c.course_id, c.course_version_id, c.status, c.ends_at, c.capacity, c.join_closes_at
    into v_course, v_version, v_status, v_ends, v_capacity, v_join_closes
    from public.cohorts c
   where c.id = p_cohort_id and c.deleted_at is null
   for update;
  if not found then
    raise exception 'cohort not found' using errcode = 'no_data_found';
  end if;

  -- Joining is an opt-in by the learner or their guardian. The course author
  -- sees the roster and marks the work, but cannot silently place a child into
  -- a dated class. A guardian may join a child through can_access_learner().
  if not public.can_access_learner(p_learner_profile_id) then
    raise exception 'you can only join a learner you are responsible for'
      using errcode = 'insufficient_privilege';
  end if;

  if v_status <> 'open' then
    raise exception 'this cohort is not open to joiners' using errcode = 'check_violation';
  end if;

  -- The window the teacher set. Checked before the end date so the refusal names
  -- the thing that actually stopped them: a class can still be running after it
  -- stopped taking joiners, and "it has ended" would be a lie they could see.
  if now() > v_join_closes then
    raise exception 'this cohort stopped accepting joiners on %',
      to_char(v_join_closes, 'YYYY-MM-DD HH24:MI TZ')
      using errcode = 'check_violation';
  end if;
  if v_ends is not null and v_ends <= now() then
    raise exception 'this cohort has already ended' using errcode = 'check_violation';
  end if;

  -- A class takes one exact course version, just like an enrolment does (D5).
  -- A learner pinned to a newer edition cannot be placed in the older class and
  -- then find the lessons and assignment context do not match. Existing members
  -- of a cohort continue on its pinned edition when a new version is published;
  -- new cohorts use the new edition.
  if not exists (
    select 1
      from public.course_enrolments ce
     where ce.course_id = v_course
       and ce.course_version_id = v_version
       and ce.learner_profile_id = p_learner_profile_id
       and ce.status in ('active', 'completed')
       and ce.deleted_at is null
  ) then
    raise exception 'this learner must be enrolled in this course version first'
      using errcode = 'insufficient_privilege';
  end if;

  if exists (
    select 1 from public.cohort_members m
     where m.cohort_id = p_cohort_id
       and m.learner_profile_id = p_learner_profile_id
       and m.status = 'active'
  ) then
    raise exception 'this learner is already in the cohort' using errcode = 'unique_violation';
  end if;

  if v_capacity is not null then
    select count(*) into v_active
      from public.cohort_members m
     where m.cohort_id = p_cohort_id and m.status = 'active';
    if v_active >= v_capacity then
      raise exception 'this cohort is full' using errcode = 'program_limit_exceeded';
    end if;
  end if;

  insert into public.cohort_members (cohort_id, learner_profile_id, added_by)
  values (p_cohort_id, p_learner_profile_id, v_actor)
  returning id into v_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'cohort.joined', 'cohort_member', v_id,
          jsonb_build_object('cohort_id', p_cohort_id,
                             'learner_profile_id', p_learner_profile_id,
                             'joined_before_window_close', true));

  return v_id;
end;
$$;
revoke all on function public.join_cohort(uuid, uuid) from public;
grant execute on function public.join_cohort(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- The register: the late-join rule was the reason this flag was held.
-- value_text is untouched — cohorts still ship off pending the media path that
-- assignments need and the safeguarding review of files from children.
-- ---------------------------------------------------------------------------

update public.platform_settings
   set preconditions = 'Cohort data, exact-version pinning, opt-in join/leave, teacher management, learner join/leave screens and private-roster rules are built. The late-join rule is settled: each cohort carries join_closes_at, set by the teacher and defaulting to the start date, and the teacher can move it while the class is draft or open. A learner/guardian opts in; the author cannot silently add a learner. Remaining before enabling: the safeguarding review of files children send (which arrives with the assignment media path).'
 where key = 'learning.cohorts';

update public.platform_settings
   set preconditions = 'Self-paced deadlines are relative to enrolment (a number of days after it); cohort deadlines are absolute. The author (plus privileged staff) marks; late work is rejected by default and each task can explicitly accept it. Text hand-in, private feedback and a per-task revision loop are built: marked work can be reopened as a draft, the previous mark is snapshotted, and reopening is refused once a deadline has passed on a task that does not accept late work. One submission per learner/task. The DB accepts verified PDF/JPEG/PNG/WebP and AAC/MPEG/MP4/OGG/Opus/WAV references, up to 25 MiB each and 10 files, but upload bytes, scanning, secure delivery and retention are not wired. Build/review that path before enabling; assignments stay off'
 where key = 'learning.assignments';
