-- The numbers a course owner asks for, before the numbers about behaviour.
--
-- `teacher_course_analytics()` answered "what are people doing in my course".
-- The first questions a teacher actually asks are older than that: how many are
-- enrolled, how many finished, how many certificates went out. Those are stocks
-- — a count of the course, not of the window — and they were missing.
--
-- Two additions, both aggregate and both free of learner references:
--
--   * `enrolments` — total, active, completed, and how many joined inside the
--     window. Total and window are different questions and a report that mixes
--     them answers neither.
--   * `certificates` — issued and revoked for this course's enrolments.
--
-- Deliberately not money. Earnings already have their own screen and their own
-- currency question; folding a figure in shillings into a page of counts would
-- invite exactly the mixing this schema spends effort avoiding.

create or replace function public.teacher_course_analytics(
  p_course_id uuid,
  p_days integer default 30
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor  uuid := public.current_user_id();
  v_title  text;
  v_author uuid;
  v_since  timestamptz;
  v_result jsonb;
begin
  if v_actor is null then
    raise exception 'sign in to read a course report'
      using errcode = 'insufficient_privilege';
  end if;

  select c.title, c.created_by into v_title, v_author
    from public.courses c
   where c.id = p_course_id and c.deleted_at is null;

  if v_title is null then
    raise exception 'that course does not exist' using errcode = 'no_data_found';
  end if;

  if v_author <> v_actor and not public.is_privileged(v_actor) then
    raise exception 'a course report belongs to the teacher who wrote the course'
      using errcode = 'insufficient_privilege';
  end if;

  if not public.setting_bool('delivery.analytics', false) then
    raise exception 'analytics is not enabled; turn on delivery.analytics to collect events'
      using errcode = 'insufficient_privilege';
  end if;

  if p_days is null or p_days < 1 or p_days > 3650 then
    raise exception 'ask for between 1 and 3650 days'
      using errcode = 'invalid_parameter_value';
  end if;

  v_since := now() - make_interval(days => p_days);

  -- Every event that belongs to this course. A `course.viewed` names a version;
  -- a `lesson.opened` names a lesson whose section belongs to a version.
  -- Anything else the platform records — a search, a plan view — is not about a
  -- course and is not counted here. One statement, so the set is materialised
  -- once and every figure below comes from the same snapshot.
  with course_events as (
    select a.event_code,
           a.occurred_at,
           a.actor_id,
           a.learner_profile_id,
           case when a.subject_type = 'lesson' then a.subject_id end as lesson_id
      from public.analytics_events a
     where a.occurred_at >= v_since
       and (
         (a.subject_type = 'course_version' and exists (
            select 1 from public.course_versions cv
             where cv.id = a.subject_id and cv.course_id = p_course_id))
         or
         (a.subject_type = 'lesson' and exists (
            select 1
              from public.lessons l
              join public.course_sections cs on cs.id = l.section_id
              join public.course_versions cv on cv.id = cs.course_version_id
             where l.id = a.subject_id and cv.course_id = p_course_id))
       )
  )
  select jsonb_build_object(
    'courseId', p_course_id,
    'title', v_title,
    'days', p_days,
    'since', v_since,
    'events', (select count(*) from course_events),
    'learners', (select count(distinct learner_profile_id) from course_events),
    'people', (select count(distinct actor_id) from course_events),
    'byEvent', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'code', e.event_code,
               'description', c.description,
               'events', e.events,
               'learners', e.learners) order by e.events desc, e.event_code), '[]'::jsonb)
        from (
          select event_code,
                 count(*) as events,
                 count(distinct learner_profile_id) as learners
            from course_events
           group by event_code
        ) e
        left join public.analytics_event_codes c on c.code = e.event_code),
    'daily', (
      select coalesce(jsonb_agg(jsonb_build_object('day', d.day, 'events', d.events)
                                order by d.day), '[]'::jsonb)
        from (
          select (occurred_at at time zone 'UTC')::date as day, count(*) as events
            from course_events
           where event_code = 'lesson.opened'
           group by 1
        ) d),
    'lessons', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'lessonId', x.lesson_id,
               'title', x.title,
               'opens', x.opens,
               'learners', x.learners) order by x.opens desc, x.title), '[]'::jsonb)
        from (
          select ce.lesson_id, l.title,
                 count(*) as opens,
                 count(distinct ce.learner_profile_id) as learners
            from course_events ce
            join public.lessons l on l.id = ce.lesson_id
           where ce.event_code = 'lesson.opened'
           group by ce.lesson_id, l.title
           order by count(*) desc, l.title
           limit 10
        ) x),
    -- Enrolment and certificates are about the course, not about the window:
    -- "how many are in it" is a stock, while the event counts above are flows.
    'enrolments', (
      select coalesce(jsonb_build_object(
               'total', count(*),
               'active', count(*) filter (where e.status = 'active'),
               'completed', count(*) filter (where e.status = 'completed'),
               'joinedInWindow', count(*) filter (where e.enrolled_at >= v_since)), '{}'::jsonb)
        from public.course_enrolments e
       where e.course_id = p_course_id
         and e.deleted_at is null),
    'certificates', (
      select coalesce(jsonb_build_object(
               'issued', count(*) filter (where c.status = 'issued'),
               'revoked', count(*) filter (where c.status = 'revoked')), '{}'::jsonb)
        from public.certificates c
        join public.course_enrolments e on e.id = c.course_enrolment_id
       where e.course_id = p_course_id),
    'aggregateOnly', true
  )
  into v_result;

  return v_result;
end;
$$;

revoke all on function public.teacher_course_analytics(uuid, integer) from public, anon;
grant execute on function public.teacher_course_analytics(uuid, integer) to authenticated;

comment on function public.teacher_course_analytics(uuid, integer) is
  'Aggregate activity and stock for one course: counts per event, distinct '
  'learners, a daily series of lesson opens, the ten most-opened lessons, '
  'enrolment totals and certificate totals. Author or staff only. Never returns '
  'a learner reference — a per-learner view is the cohort progress question, '
  'not this one.';
