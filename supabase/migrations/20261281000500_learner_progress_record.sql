-- Progress and achievements, as one record a screen can draw.
--
-- WHAT WAS MISSING
-- ----------------
-- `learner_engagement()` answers three questions — the streak, the totals, and
-- which badges have been earned — and a strip on `/learn` prints them. Screen 18
-- was recorded as BLOCKED, "engagement mechanics undesigned", and that was the
-- honest description: there was a strip, but no page a learner could look at to
-- see their whole record, and **no badge they had not earned**. A badge you
-- cannot see is not a goal, it is a surprise that arrives or does not.
--
-- WHAT THIS DECIDES
-- -----------------
-- The mechanics, written down because they had never been:
--
--   * The **catalogue is fixed and small**. Eight badges, each a threshold over a
--     fact the platform already records. There is no table of achievements and
--     nothing is granted: a badge is true or it is not, exactly as a streak is.
--     So a badge cannot be "lost" by a bug, cannot disagree with the progress it
--     describes, and turning the feature off removes the display without taking
--     anything away.
--   * **An unearned badge says what it needs.** "Two more lessons", not a
--     silhouette. The point of showing it is to make the next step obvious.
--   * **Every earned badge carries the day it was earned** — the date the
--     threshold was actually crossed, read back from the rows that crossed it.
--     `20261247` declined to date streak badges, saying the data could not
--     support the sentence. That was too pessimistic: a run of consecutive days
--     has a start, so the seventh day of it has a date. This corrects it.
--   * **A streak badge is measured on the longest run ever**, not the current
--     one. A learner who once studied thirty days running earned that; a broken
--     streak does not un-earn it, because nothing recorded can be un-recorded.
--
-- WHAT ELSE IS ON THE PAGE
-- ------------------------
-- The last twelve weeks of study days, in the learner's own time zone (the
-- reader's for a child, exactly as `learner_engagement` decides), the courses
-- they are part of with how far each has got, and their certificates. All of it
-- derived on read; none of it stored.
--
-- Gated by `learning.streaks`, the flag that already means "daily streaks and
-- milestone badges". Turning it off makes the page say so rather than showing a
-- half-page; the function refuses for the same reason and with the same sentence.

-- ---------------------------------------------------------------------------
-- The catalogue
-- ---------------------------------------------------------------------------
-- A function rather than a table because it is a decision, not data: the
-- thresholds belong in the same file as the code that measures them, and a row
-- somebody could edit into "50 lessons" while the screen still said "ten" would
-- be two answers to one question.
create or replace function public.learner_badge_catalogue()
returns table (
  code        text,
  name        text,
  description text,
  measure     text,
  threshold   integer,
  unit        text,
  sort_order  integer
)
language sql
immutable
as $$
  select * from (values
    ('first_lesson',     'First step',     'Finished your first lesson.',             'lessons',     1,  'lesson',  10),
    ('ten_lessons',      'Ten lessons',    'Finished ten lessons.',                   'lessons',     10, 'lesson',  20),
    ('fifty_lessons',    'Fifty lessons',  'Finished fifty lessons.',                 'lessons',     50, 'lesson',  30),
    ('first_course',     'Course complete','Completed a whole course.',                'courses',     1,  'course',  40),
    ('three_courses',    'Three courses',  'Completed three whole courses.',          'courses',     3,  'course',  50),
    ('first_certificate','Certified',      'Was issued a certificate.',               'certificates',1,  'certificate', 60),
    ('seven_day_streak', 'A whole week',   'Studied seven days in a row.',            'streak',      7,  'day',     70),
    ('thirty_day_streak','A month of days','Studied thirty days in a row.',           'streak',      30, 'day',     80)
  ) as t(code, name, description, measure, threshold, unit, sort_order);
$$;

comment on function public.learner_badge_catalogue() is
  'The fixed list of milestone badges and the threshold each one measures. Nothing is stored: a badge is true when its measure reaches its threshold, so it can never disagree with the progress it describes.';

grant execute on function public.learner_badge_catalogue() to authenticated, anon;

-- ---------------------------------------------------------------------------
-- The runs of consecutive study days
-- ---------------------------------------------------------------------------
-- Extracted because three answers depend on the same shape: the current streak,
-- the longest streak ever, and the date each streak badge was earned. Three
-- copies of the gap-and-island query would be three chances to disagree about
-- whether studying at 23:00 counts for that day.
--
-- Internal: it takes a learner id and a time zone and applies no permission of
-- its own, so it is not callable by a client — only from
-- `learner_progress_record()`, which has already asked `can_access_learner()`.
-- Making it callable would be a way to read a stranger's study days.
create or replace function public.learner_study_runs(p_learner_id uuid, p_tz text)
returns table (start_day date, last_day date, len integer)
language sql
stable
security definer
set search_path = public
as $$
  with days as (
    select distinct (p.completed_at at time zone p_tz)::date as d
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
  )
  select min(d) as start_day, max(d) as last_day, count(*)::int as len
    from runs
   group by grp;
$$;

revoke all on function public.learner_study_runs(uuid, text) from public, anon, authenticated;

comment on function public.learner_study_runs(uuid, text) is
  'Runs of consecutive days with a finished lesson, in the given time zone. Internal: applies no permission check, so it is callable only from learner_progress_record().';

-- ---------------------------------------------------------------------------
-- The record
-- ---------------------------------------------------------------------------
create or replace function public.learner_progress_record(p_learner_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor    uuid := public.current_user_id();
  v_tz       text;
  v_today    date;
  v_name     text;
  v_current  integer := 0;
  v_longest  integer := 0;
  v_last_day date;
  v_lessons  integer := 0;
  v_courses  integer := 0;
  v_certs    integer := 0;
  v_days     jsonb := '[]'::jsonb;
  v_badges   jsonb := '[]'::jsonb;
  v_course_rows jsonb := '[]'::jsonb;
  v_cert_rows   jsonb := '[]'::jsonb;
  v_b          record;
  v_have     integer;
  v_on       date;
begin
  if not public.setting_bool('learning.streaks', false) then
    raise exception 'streaks and badges are not enabled'
      using errcode = 'insufficient_privilege';
  end if;

  if p_learner_id is null or not public.can_access_learner(p_learner_id) then
    raise exception 'you cannot read this learner''s progress'
      using errcode = 'insufficient_privilege';
  end if;

  select lp.display_name into v_name
    from public.learner_profiles lp
   where lp.id = p_learner_id;

  -- Whose day is it? The learner's own zone, or the reader's for a child with no
  -- account. Same rule as learner_engagement(), and it has to be the same or the
  -- strip and this page would disagree about which day a lesson was finished.
  select nullif(btrim(up.timezone), '')
    into v_tz
    from public.learner_profiles lp
    left join public.user_profiles up on up.user_id = lp.linked_user_id
   where lp.id = p_learner_id;

  if v_tz is null or not exists (select 1 from pg_timezone_names where name = v_tz) then
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
  -- Study days, and the runs they form
  -- -------------------------------------------------------------------------
  -- A run survives until the end of tomorrow: a streak is not broken at
  -- breakfast. The start of each run is what dates a streak badge.
  select coalesce(max(len) filter (where last_day >= v_today - 1), 0),
         coalesce(max(len), 0),
         max(last_day)
    into v_current, v_longest, v_last_day
    from public.learner_study_runs(p_learner_id, v_tz);

  -- The last twelve weeks, which is what a calendar can show without scrolling.
  select coalesce(jsonb_agg(to_char(d, 'YYYY-MM-DD') order by d), '[]'::jsonb)
    into v_days
    from (
      select distinct (p.completed_at at time zone v_tz)::date as d
        from public.lesson_progress p
        join public.course_enrolments ce on ce.id = p.course_enrolment_id
       where ce.learner_profile_id = p_learner_id
         and ce.deleted_at is null
         and p.status = 'completed'
         and p.completed_at is not null
    ) days
   where d > v_today - 84
     and d <= v_today;

  -- -------------------------------------------------------------------------
  -- Totals
  -- -------------------------------------------------------------------------
  select count(*)::int
    into v_lessons
    from public.lesson_progress p
    join public.course_enrolments ce on ce.id = p.course_enrolment_id
   where ce.learner_profile_id = p_learner_id
     and ce.deleted_at is null
     and p.status = 'completed'
     and p.completed_at is not null;

  select count(*)::int
    into v_courses
    from public.course_enrolments ce
   where ce.learner_profile_id = p_learner_id
     and ce.deleted_at is null
     and ce.status = 'completed';

  select count(*)::int
    into v_certs
    from public.certificates c
   where c.learner_profile_id = p_learner_id
     and c.status = 'issued';

  -- -------------------------------------------------------------------------
  -- The badges, earned or not
  -- -------------------------------------------------------------------------
  for v_b in select * from public.learner_badge_catalogue() order by sort_order loop
    v_have := 0;
    v_on := null;

    if v_b.measure = 'lessons' then
      v_have := v_lessons;
      -- The moment the count reached the threshold, not the first lesson.
      select (p.completed_at at time zone v_tz)::date
        into v_on
        from public.lesson_progress p
        join public.course_enrolments ce on ce.id = p.course_enrolment_id
       where ce.learner_profile_id = p_learner_id
         and ce.deleted_at is null
         and p.status = 'completed'
         and p.completed_at is not null
       order by p.completed_at
       offset (v_b.threshold - 1) limit 1;

    elsif v_b.measure = 'courses' then
      v_have := v_courses;
      select (ce.completed_at at time zone v_tz)::date
        into v_on
        from public.course_enrolments ce
       where ce.learner_profile_id = p_learner_id
         and ce.deleted_at is null
         and ce.status = 'completed'
         and ce.completed_at is not null
       order by ce.completed_at
       offset (v_b.threshold - 1) limit 1;

    elsif v_b.measure = 'certificates' then
      v_have := v_certs;
      select (c.issued_at at time zone v_tz)::date
        into v_on
        from public.certificates c
       where c.learner_profile_id = p_learner_id
         and c.status = 'issued'
       order by c.issued_at
       offset (v_b.threshold - 1) limit 1;

    elsif v_b.measure = 'streak' then
      v_have := v_longest;
      -- The earliest day on which any run first reached the length, which is
      -- the day the badge was earned — even if that streak ended since.
      select min(start_day + (v_b.threshold - 1))
        into v_on
        from public.learner_study_runs(p_learner_id, v_tz) r
       where r.len >= v_b.threshold;
    end if;

    v_badges := v_badges || jsonb_build_object(
      'code',        v_b.code,
      'name',        v_b.name,
      'description', v_b.description,
      'earned',      v_have >= v_b.threshold,
      'earnedOn',    case when v_have >= v_b.threshold and v_on is not null
                          then to_char(v_on, 'YYYY-MM-DD') else null end,
      'have',        v_have,
      'need',        v_b.threshold,
      'unit',        v_b.unit
    );
  end loop;

  -- -------------------------------------------------------------------------
  -- What they are studying
  -- -------------------------------------------------------------------------
  select coalesce(jsonb_agg(row order by started_at desc nulls last), '[]'::jsonb)
    into v_course_rows
    from (
      select jsonb_build_object(
               'enrolmentId',     ce.id,
               'courseTitle',     coalesce(c.title, 'Untitled course'),
               'courseSlug',      coalesce(c.slug, ''),
               'status',          ce.status,
               'lessonsDone',     coalesce(s.lessons_done, 0),
               'lessonsTotal',    coalesce(s.lessons_total, 0),
               'percentComplete', coalesce(s.percent_complete, 0)
             ) as row,
             ce.enrolled_at as started_at
        from public.course_enrolments ce
        left join public.courses c on c.id = ce.course_id
        left join lateral public.enrolment_progress_summary(ce.id) s on true
       where ce.learner_profile_id = p_learner_id
         and ce.deleted_at is null
         and ce.status in ('active', 'completed')
    ) t;

  -- The certificate's OWN course_title, never a join to `courses`. The row is a
  -- snapshot on purpose: a course renamed or retired after the fact must not
  -- rewrite what somebody's certificate says they completed.
  select coalesce(jsonb_agg(jsonb_build_object(
           'certificateNumber', c.certificate_number,
           'courseTitle',       c.course_title,
           'issuedOn',          to_char((c.issued_at at time zone v_tz)::date, 'YYYY-MM-DD'),
           'status',            c.status
         ) order by c.issued_at desc), '[]'::jsonb)
    into v_cert_rows
    from public.certificates c
   where c.learner_profile_id = p_learner_id;

  return jsonb_build_object(
    'enabled',          true,
    'learnerProfileId', p_learner_id,
    'displayName',      v_name,
    'timezone',         v_tz,
    'today',            to_char(v_today, 'YYYY-MM-DD'),
    'streakDays',       v_current,
    'longestStreakDays',v_longest,
    'lastActiveOn',     case when v_last_day is null then null
                             else to_char(v_last_day, 'YYYY-MM-DD') end,
    'totals', jsonb_build_object(
      'lessonsCompleted', v_lessons,
      'coursesCompleted', v_courses,
      'certificates',     v_certs,
      'studyDays',        (
        select count(distinct (p.completed_at at time zone v_tz)::date)::int
          from public.lesson_progress p
          join public.course_enrolments ce on ce.id = p.course_enrolment_id
         where ce.learner_profile_id = p_learner_id
           and ce.deleted_at is null
           and p.status = 'completed'
           and p.completed_at is not null)
    ),
    'studyDays',    v_days,
    'badges',       v_badges,
    'courses',      v_course_rows,
    'certificates', v_cert_rows
  );
end;
$$;

revoke all on function public.learner_progress_record(uuid) from public, anon;
grant execute on function public.learner_progress_record(uuid) to authenticated;

comment on function public.learner_progress_record(uuid) is
  'One learner''s whole record for screen 18: twelve weeks of study days, the badge catalogue with earned and not-yet-earned states and the date each was earned, current courses and certificates. Derived on read in the learner''s own time zone; stores nothing; refuses a learner the caller cannot access and refuses entirely while learning.streaks is off.';
