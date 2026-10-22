-- A streak and a few badges, derived from the progress that already exists.
--
-- The learner dashboard answered "what have I enrolled in" and nothing about
-- *returning*. For an adult that is adequate; for a seven-year-old it is the whole
-- product — the reason to open the lesson tomorrow is that yesterday counted.
--
-- Two design choices keep this small and honest:
--
--   * **Nothing new is stored.** A streak is computed from `lesson_progress`, and a
--     badge is a threshold over facts the platform already records. There is no
--     `streaks` table to drift out of step with the lessons, no nightly job to miss a
--     day, and no way for a counter to say 12 when the progress says 9. The cost is a
--     computation per page view, which at this scale is nothing.
--   * **Days are local.** "Yesterday" is a fact about the learner's timezone, not the
--     server's. A lesson finished at 22:30 in Kampala is 19:30 UTC and must still count
--     for that day — otherwise a learner who studies every evening sees their streak
--     break every night.
--
-- The flag ships off, like every other visible learner feature here. Turning it on is
-- one switch on `/admin`, and turning it off removes the display without losing
-- anything, because nothing was stored.

insert into public.platform_settings
  (key, description, value_type, value_text, gate_type, preconditions, flag_group)
values
  ('learning.streaks', 'Daily streaks and milestone badges for learners', 'boolean', 'false',
   'admin', 'None — derived from progress that already exists; no new data collected',
   'Learner features')
on conflict (key) do nothing;

create or replace function public.learner_engagement(p_learner_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor     uuid := public.current_user_id();
  v_tz        text;
  v_today     date;
  v_current   integer := 0;
  v_longest   integer := 0;
  v_last_day  date;
  v_lessons   integer := 0;
  v_courses   integer := 0;
  v_certs     integer := 0;
  v_first     timestamptz;
  v_tenth     timestamptz;
  v_course_on timestamptz;
  v_cert_on   timestamptz;
  v_badges    jsonb := '[]'::jsonb;
begin
  if not public.setting_bool('learning.streaks', false) then
    raise exception 'streaks and badges are not enabled'
      using errcode = 'insufficient_privilege';
  end if;

  if p_learner_id is null or not public.can_access_learner(p_learner_id) then
    raise exception 'you cannot read this learner''s progress'
      using errcode = 'insufficient_privilege';
  end if;

  -- Whose day is it? An adult learner's own time zone. A child has no account, so the
  -- day is the one the person reading lives in — a guardian in Kampala looking at a
  -- child's evening lesson sees it counted today, which is what they would say if asked.
  select nullif(btrim(up.timezone), '')
    into v_tz
    from public.learner_profiles lp
    left join public.user_profiles up on up.user_id = lp.linked_user_id
   where lp.id = p_learner_id;

  if v_tz is null or not exists (
    select 1 from pg_timezone_names where name = v_tz
  ) then
    select nullif(btrim(up.timezone), '')
      into v_tz
      from public.user_profiles up
     where up.user_id = v_actor;

    if v_tz is null or not exists (select 1 from pg_timezone_names where name = v_tz) then
      v_tz := 'UTC';
    end if;
  end if;

  v_today := (now() at time zone v_tz)::date;

  -- -------------------------------------------------------------------------
  -- The streak: consecutive calendar days with at least one finished lesson
  -- -------------------------------------------------------------------------
  with days as (
    select distinct (p.completed_at at time zone v_tz)::date as d
      from public.lesson_progress p
      join public.course_enrolments ce on ce.id = p.course_enrolment_id
     where ce.learner_profile_id = p_learner_id
       and ce.deleted_at is null
       and p.status = 'completed'
       and p.completed_at is not null
  ),
  runs as (
    select d, d - (row_number() over (order by d))::int as grp
      from days
  ),
  scored as (
    select grp, count(*)::int as len, max(d) as last_day
      from runs
     group by grp
  )
  select
    -- A streak survives until the end of tomorrow: finishing yesterday and not yet
    -- today is a live streak, not a broken one. That is the difference between
    -- encouraging a learner and telling them off at breakfast.
    coalesce(max(len) filter (where last_day >= v_today - 1), 0),
    coalesce(max(len), 0),
    max(last_day)
    into v_current, v_longest, v_last_day
    from scored;

  -- -------------------------------------------------------------------------
  -- What has been finished
  -- -------------------------------------------------------------------------
  select count(*)::int, min(p.completed_at)
    into v_lessons, v_first
    from public.lesson_progress p
    join public.course_enrolments ce on ce.id = p.course_enrolment_id
   where ce.learner_profile_id = p_learner_id
     and ce.deleted_at is null
     and p.status = 'completed'
     and p.completed_at is not null;

  -- The tenth lesson, dated, so a badge earned last month carries last month's date.
  select p.completed_at
    into v_tenth
    from public.lesson_progress p
    join public.course_enrolments ce on ce.id = p.course_enrolment_id
   where ce.learner_profile_id = p_learner_id
     and ce.deleted_at is null
     and p.status = 'completed'
     and p.completed_at is not null
   order by p.completed_at
   offset 9 limit 1;

  select count(*)::int, min(ce.completed_at)
    into v_courses, v_course_on
    from public.course_enrolments ce
   where ce.learner_profile_id = p_learner_id
     and ce.deleted_at is null
     and ce.status = 'completed';

  select count(*)::int, min(c.issued_at)
    into v_certs, v_cert_on
    from public.certificates c
   where c.learner_profile_id = p_learner_id
     and c.status = 'issued';

  -- -------------------------------------------------------------------------
  -- The badges. Only milestones with an honest date are here; a streak is shown as
  -- a number instead, because "you earned a 7-day streak badge on Tuesday" is a
  -- sentence the data cannot support without a table that exists only to say so.
  -- -------------------------------------------------------------------------
  if v_lessons >= 1 then
    v_badges := v_badges || jsonb_build_object(
      'code', 'first_lesson',
      'name', 'First step',
      'description', 'Finished a lesson.',
      'earnedOn', to_char(v_first at time zone v_tz, 'YYYY-MM-DD'));
  end if;

  if v_lessons >= 10 then
    v_badges := v_badges || jsonb_build_object(
      'code', 'ten_lessons',
      'name', 'Ten lessons',
      'description', 'Finished ten lessons.',
      'earnedOn', to_char(v_tenth at time zone v_tz, 'YYYY-MM-DD'));
  end if;

  if v_courses >= 1 then
    v_badges := v_badges || jsonb_build_object(
      'code', 'first_course',
      'name', 'Course complete',
      'description', 'Completed a whole course.',
      'earnedOn', to_char(v_course_on at time zone v_tz, 'YYYY-MM-DD'));
  end if;

  if v_certs >= 1 then
    v_badges := v_badges || jsonb_build_object(
      'code', 'first_certificate',
      'name', 'Certified',
      'description', 'Was issued a certificate.',
      'earnedOn', to_char(v_cert_on at time zone v_tz, 'YYYY-MM-DD'));
  end if;

  return jsonb_build_object(
    'enabled', true,
    'learnerProfileId', p_learner_id,
    'timezone', v_tz,
    'streakDays', v_current,
    'longestStreakDays', v_longest,
    'lastActiveOn', case when v_last_day is null then null
                         else to_char(v_last_day, 'YYYY-MM-DD') end,
    'lessonsCompleted', v_lessons,
    'coursesCompleted', v_courses,
    'certificates', v_certs,
    'badges', v_badges
  );
end;
$$;

revoke all on function public.learner_engagement(uuid) from public, anon;
grant execute on function public.learner_engagement(uuid) to authenticated;

comment on function public.learner_engagement(uuid) is
  'Streak, totals and milestone badges for one learner, computed from existing progress in the learner''s own time zone (the reader''s for a child with no account). Stores nothing. Refuses a learner the caller cannot access, and refuses entirely while learning.streaks is off.';
