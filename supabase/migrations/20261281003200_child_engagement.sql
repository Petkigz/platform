-- A child's streak is a second decision, made by the adults, not a default.
--
-- WHAT WAS WRONG
-- --------------
-- Two flags claimed this feature and only one of them did anything.
-- `learning.streaks` was built in full: the strip on `/learn`, the badge
-- catalogue, the twelve-week calendar on `/progress`, the child's strip at
-- `/family`. `family.engagement` — "Badges, streaks, visible progress for
-- children" — was read by no line of code, and its precondition still said the
-- mechanics were undesigned (`gamif: 0`, `badge: 0`, `streak: 0`). A switch on
-- the dashboard that changes nothing is worse than no switch: it tells the owner
-- they have turned something on, or off, when they have not.
--
-- WHAT THE OWNER DECIDED (2026-10-30)
-- ----------------------------------
-- A child's engagement is a **private streak and a shelf of badges, visible to
-- the child and the adults in their family. No points, no leaderboard, nothing
-- compared across children.** So the mechanics are `learning.streaks`, and the
-- question "do children get them at all" is its own decision — which is exactly
-- what `family.engagement` now is.
--
-- The two switches mean different things and both must be on for a child:
--
--   * `learning.streaks` — the mechanics exist and an adult learner sees their
--     own streak and badges.
--   * `family.engagement` — children get them too. Off, a child's record and
--     strip do not render for anybody, and an adult's does.
--
-- WHY A SECOND SWITCH IS NOT OVERKILL
-- -----------------------------------
-- A streak and a badge are the one part of this platform aimed at making a
-- seven-year-old come back tomorrow, and that is a parent's decision before it
-- is a product default. It is also the only part where a number about a child
-- would ever be shown to an adult, so the adults get their own key.
--
-- It is enforced in `may_show_engagement()`, which both reading functions ask,
-- rather than on the pages: a page that forgot to ask would still be refused by
-- the function, and the strip on `/family` and the record on `/progress` cannot
-- disagree about whether a child has engagement.
--
-- The message is deliberately different from the platform-wide one — "not
-- enabled for children" — so a guardian learns that streaks exist and that this
-- platform does not show them for children, rather than that nothing here works.

insert into public.platform_settings
  (key, description, value_type, value_text, gate_type, preconditions, flag_group)
values
  ('family.engagement',
   'A child''s streak and badges, shown only to the child and the adults in their family',
   'boolean', 'false', 'admin',
   'Mechanics designed 2026-10-30: private streak and badges, visible to the child and their guardian only. No points, no leaderboards, nothing compared across children. Needs learning.streaks on as well; off loses a display, not a record',
   'Children and families')
on conflict (key) do update
  set description   = excluded.description,
      preconditions = excluded.preconditions;

update public.platform_settings
   set preconditions = 'None — derived from progress that already exists; no new data collected. '
                    || 'A streak is computed in the learner''s own time zone (the reader''s for a child '
                    || 'with no account) and nothing is stored, so turning it off removes a display and '
                    || 'loses nothing. For a child this is only half the switch: family.engagement must '
                    || 'also be on, because a streak aimed at a seven-year-old is a parent''s decision'
 where key = 'learning.streaks';

-- ---------------------------------------------------------------------------
-- One predicate, asked by both readers
-- ---------------------------------------------------------------------------
create or replace function public.may_show_engagement(p_learner_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.setting_bool('learning.streaks', false)
     and exists (
       select 1
         from public.learner_profiles lp
        where lp.id = p_learner_id
          and (lp.learner_type <> 'child'
               or public.setting_bool('family.engagement', false))
     );
$$;

-- Internal only. It answers a question about a named learner, and the two
-- functions that ask it have already decided the caller may read that learner;
-- granting it to a role would let anybody probe whether an id is a child.
revoke all on function public.may_show_engagement(uuid) from public, anon, authenticated;

comment on function public.may_show_engagement(uuid) is
  'Whether engagement (the streak and the badges) may be shown for this learner: learning.streaks must be on, and a child also needs family.engagement. Internal — the readers that use it have already checked who is asking.';

-- ---------------------------------------------------------------------------
-- The two readers, re-emitted with the second key
-- ---------------------------------------------------------------------------

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

  -- The children's switch, and it is checked *after* the access check on purpose:
  -- whether a given learner is a child is not something a stranger should be able
  -- to learn from an error message.
  if not public.may_show_engagement(p_learner_id) then
    raise exception 'streaks and badges are not enabled for children'
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
  'Streak, totals and milestone badges for one learner, computed from existing progress in the learner''s own time zone (the reader''s for a child with no account). Stores nothing. Refuses a learner the caller cannot access, and refuses while learning.streaks is off — or, for a child, while family.engagement is off.';

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

  -- The children's switch, and it is checked *after* the access check on purpose:
  -- whether a given learner is a child is not something a stranger should be able
  -- to learn from an error message.
  if not public.may_show_engagement(p_learner_id) then
    raise exception 'streaks and badges are not enabled for children'
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
  'One learner''s whole record for screen 18: twelve weeks of study days, the badge catalogue with earned and not-yet-earned states and the date each was earned, current courses and certificates. Derived on read in the learner''s own time zone; stores nothing; refuses a learner the caller cannot access, and refuses while learning.streaks is off — or, for a child, while family.engagement is off.';
