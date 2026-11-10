-- The child's 30-day deadline is an instant, not midnight at the beginning
-- of its date. Keep date summaries for compatibility; count and process only
-- records whose actual deadline has arrived. Object removal is separate.
create or replace function public.retention_plan(p_now timestamptz default now())
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor       uuid := public.current_user_id();
  v_as_of       date := (p_now at time zone 'UTC')::date;
  v_case        integer;
  v_case_old    date;
  v_case_next   date;
  v_stuck       integer;
  v_stuck_old   timestamptz;
  v_screen      integer;
  v_screen_old  date;
  v_screen_next date;
  v_learner     integer;
  v_learner_old date;
  v_learner_next date;
  v_erased      integer;
  v_orphan      integer;
  v_orphan_old  timestamptz;
begin
  if v_actor is null or not public.has_role(v_actor, 'platform_admin') then
    raise exception 'retention:not_allowed'
      using errcode = 'insufficient_privilege',
            hint = 'deleting a record before its time is destroying evidence; only the platform admin runs the clock';
  end if;

  select count(*)::int, min(due_on)
    into v_case, v_case_old
    from public.retention_due_records
   where kind = 'support_case' and due_on <= v_as_of;
  select min(due_on) into v_case_next
    from public.retention_due_records
   where kind = 'support_case' and due_on > v_as_of;

  -- A case nobody closed has no clock. Saying "0 due" without saying this would
  -- describe a queue of cases kept forever as if the rule covered them.
  select count(*)::int, min(created_at)
    into v_stuck, v_stuck_old
    from public.support_cases
   where closed_at is null
     and created_at <= p_now - interval '3 years';

  select count(*)::int, min(due_on)
    into v_screen, v_screen_old
    from public.retention_due_records
   where kind = 'screening' and due_on <= v_as_of;
  select min(due_on) into v_screen_next
    from public.retention_due_records
   where kind = 'screening' and due_on > v_as_of;

  select count(*)::int, min(due_on)
    into v_learner, v_learner_old
    from public.retention_due_records
   where kind = 'learner_record' and clock_started_at + interval '720 hours' <= p_now;
  select min(due_on) into v_learner_next
    from public.retention_due_records
   where kind = 'learner_record' and clock_started_at + interval '720 hours' > p_now;

  select count(*)::int into v_erased
    from public.learner_profiles where status = 'erased';

  -- The one child-shaped thing with no clock: a profile an account merge archived
  -- without closing anybody's account. Its record was moved to the surviving
  -- profile, so there is nothing here to delete — but a pointer nobody ever looks
  -- at is a pointer that becomes a person again if the schema moves.
  select count(*)::int, min(created_at)
    into v_orphan, v_orphan_old
    from public.learner_profiles
   where learner_type = 'child'
     and status = 'archived'
     and deleted_at is null;

  return jsonb_build_object(
    'asOf', v_as_of,
    'policies', jsonb_build_object(
      'supportCase', jsonb_build_object(
        'years', 3,
        'clock', 'three years after the case closed',
        'source', 'privacy notice: "A support case is kept for three years after it is closed."'),
      'screening', jsonb_build_object(
        'years', 7,
        'clock', 'seven years after the later of the check and the subject''s eighteenth birthday',
        'source', 'privacy notice: "A safeguarding or screening record is kept for seven years after the person it concerns turns 18, or for seven years after it is made where they were already an adult."'),
      'learnerRecord', jsonb_build_object(
        'days', 30,
        'clock', 'thirty days after the guardian''s account closed',
        'source', 'children''s policy: "A child''s learning record is deleted with the guardian''s account, 30 days after that account closes."')),
    'supportCases', jsonb_build_object(
      'due', v_case,
      'oldestDue', v_case_old,
      'nextDue', v_case_next,
      'waiting', jsonb_build_object(
        'count', v_stuck,
        'oldestCreatedAt', v_stuck_old,
        'note', 'Cases that were never closed. The three years have not started because nothing ended them, and this job will not delete a case somebody might still be answering.')),
    'screenings', jsonb_build_object(
      'due', v_screen,
      'oldestDue', v_screen_old,
      'nextDue', v_screen_next),
    'learnerRecords', jsonb_build_object(
      'due', v_learner,
      'oldestDue', v_learner_old,
      'nextDue', v_learner_next,
      'erasedToDate', v_erased,
      'waiting', jsonb_build_object(
        'count', v_orphan,
        'oldestCreatedAt', v_orphan_old,
        'note', 'Child profiles left behind by an account merge. Their record was moved to the surviving profile, so there is nothing here to delete — and no policy sets a date for the row itself.')));
end;
$$;


create or replace function public.run_retention_jobs(
  p_now   timestamptz default now(),
  p_limit integer default 500
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor       uuid := public.current_user_id();
  v_as_of       date := least((p_now at time zone 'UTC')::date,
                              (now() at time zone 'UTC')::date);
  v_as_of_time  timestamptz := least(p_now, now());
  v_case_ids    uuid[];
  v_screen_ids  uuid[];
  v_cases       integer := 0;
  v_messages    integer := 0;
  v_screenings  integer := 0;
  v_learners    integer := 0;
  v_cases_left  integer := 0;
  v_screen_left integer := 0;
  v_learner_left integer := 0;
  v_files       integer := 0;
  v_files_left  integer := 0;
  v_files_held  integer := 0;
  v_coursework  jsonb;
  v_learner_result jsonb;
  v_learner_held integer := 0;
  v_one         uuid;
begin
  if v_actor is null or not public.has_role(v_actor, 'platform_admin') then
    raise exception 'retention:not_allowed'
      using errcode = 'insufficient_privilege';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 5000 then
    raise exception 'retention:limit_out_of_range'
      using errcode = 'invalid_parameter_value',
            hint = 'between 1 and 5000 rows per call';
  end if;

  select array_agg(id) into v_case_ids
    from (select id from public.retention_due_records
           where kind = 'support_case' and due_on <= v_as_of
           order by due_on, id
           limit p_limit) picked;

  if v_case_ids is not null then
    delete from public.support_case_messages where case_id = any(v_case_ids);
    get diagnostics v_messages = row_count;

    delete from public.support_cases where id = any(v_case_ids);
    get diagnostics v_cases = row_count;
  end if;

  select array_agg(id) into v_screen_ids
    from (select id from public.retention_due_records
           where kind = 'screening' and due_on <= v_as_of
           order by due_on, id
           limit p_limit) picked;

  if v_screen_ids is not null then
    perform set_config('ayahspring.retention_purge', 'on', true);
    perform set_config('ayahspring.retention_as_of', v_as_of::text, true);
    delete from public.teacher_screenings where id = any(v_screen_ids);
    get diagnostics v_screenings = row_count;
    perform set_config('ayahspring.retention_purge', '', true);
    perform set_config('ayahspring.retention_as_of', '', true);
  end if;

  for v_one in
    select id from public.retention_due_records
     where kind = 'learner_record' and clock_started_at + interval '720 hours' <= v_as_of_time
       and not public.learner_has_held_coursework(id)
     order by due_on, id
     limit p_limit
  loop
    -- The candidate list is only a snapshot. The private writer locks the media
    -- rows and rechecks: a newly committed hold must not be skipped.
    -- Recheck the actual child and clock under the same profile lock used by
    -- the erasure writer. A changed clock or an already-erased record is not a
    -- successful deletion and must not be counted.
    perform 1 from public.learner_profiles lp where lp.id=v_one
      and lp.learner_type='child' and lp.status<>'erased' and lp.deleted_at is not null
      and lp.deleted_at + interval '720 hours' <= v_as_of_time for update;
    if not found then continue; end if;
    v_learner_result := public.purge_learner_record(v_one);
    if coalesce((v_learner_result ->> 'erased')::boolean, false)
       and not coalesce((v_learner_result ->> 'alreadyErased')::boolean, false) then
      v_learners := v_learners + 1;
    end if;
  end loop;

  -- The fourth clock. It runs after the child's record for the same reason the
  -- cases run first: a file the record clock detached has already been tombstoned
  -- by the trigger, and this arm cleans up the ordinary ones whose year is up.
  v_coursework := public.purge_coursework_files(p_now, p_limit);
  v_files := coalesce((v_coursework -> 'deleted')::int, 0);
  v_files_left := coalesce((v_coursework -> 'remaining')::int, 0);
  v_files_held := coalesce((v_coursework -> 'held')::int, 0);

  select count(*)::int into v_cases_left
    from public.retention_due_records
   where kind = 'support_case' and due_on <= v_as_of;
  select count(*)::int into v_screen_left
    from public.retention_due_records
   where kind = 'screening' and due_on <= v_as_of;
  select count(*)::int into v_learner_left
    from public.retention_due_records
   where kind = 'learner_record' and clock_started_at + interval '720 hours' <= v_as_of_time;

  select count(*)::int into v_learner_held
    from public.retention_due_records
   where kind = 'learner_record' and clock_started_at + interval '720 hours' <= v_as_of_time
     and public.learner_has_held_coursework(id);

  if v_cases + v_screenings + v_learners > 0 then
    insert into public.governance_audit_events (actor, action, target_type, detail)
    values (v_actor, 'retention.purged', 'retention_run',
            jsonb_build_object('asOf', v_as_of, 'supportCases', v_cases,
                               'supportCaseMessages', v_messages,
                               'screenings', v_screenings,
                               'learnerRecords', v_learners,
                               'courseworkFiles', v_files, 'limit', p_limit));
  end if;

  return jsonb_build_object(
    'asOf', v_as_of,
    'deleted', jsonb_build_object(
      'supportCases', v_cases,
      'supportCaseMessages', v_messages,
      'screenings', v_screenings,
      'learnerRecords', v_learners,
      'courseworkFiles', v_files),
    'remaining', jsonb_build_object(
      'supportCases', v_cases_left,
      'screenings', v_screen_left,
      'learnerRecords', v_learner_left,
      'courseworkFiles', v_files_left),
    'held', jsonb_build_object('courseworkFiles', v_files_held, 'learnerRecords', v_learner_held),
    'audited', v_cases + v_screenings + v_learners + v_files > 0);
end;
$$;
