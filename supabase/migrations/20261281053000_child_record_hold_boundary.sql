-- Child record cleanup used to cascade-delete held submission contexts and
-- tombstone their attachments. Protect the whole child record while it has an
-- attached open hold, and report the deferral instead of pretending it was
-- erased. This does not reconcile the separate thirty-day and one-year clocks.
create function public.learner_has_held_coursework(p_learner_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.assignment_submissions s
    join public.assignment_submission_assets a on a.submission_id = s.id
    join public.coursework_retention_holds h on h.asset_id = a.media_asset_id
    where s.learner_profile_id = p_learner_id and h.closed_at is null
  );
$$;
revoke all on function public.learner_has_held_coursework(uuid) from public, anon, authenticated;

alter function public.purge_learner_record(uuid) rename to purge_learner_record_internal;
revoke all on function public.purge_learner_record_internal(uuid) from public, anon, authenticated;
create function public.purge_learner_record(p_learner_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  -- Hold writers lock the asset before creating the hold. Lock every attached
  -- asset in deterministic order and inspect holds afterwards, so a hold that
  -- commits while this operation waits is included in the recheck.
  perform ma.id from public.media_assets ma
    join public.assignment_submission_assets asa on asa.media_asset_id = ma.id
    join public.assignment_submissions s on s.id = asa.submission_id
   where s.learner_profile_id = p_learner_id order by ma.id for update of ma;
  if public.learner_has_held_coursework(p_learner_id) then
    return jsonb_build_object('erased', false, 'blockedByCourseworkHold', true);
  end if;
  return public.purge_learner_record_internal(p_learner_id);
end;
$$;
revoke all on function public.purge_learner_record(uuid) from public, anon, authenticated;

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
     where kind = 'learner_record' and due_on <= v_as_of
       and not public.learner_has_held_coursework(id)
     order by due_on, id
     limit p_limit
  loop
    -- The candidate list is only a snapshot. The private writer locks the media
    -- rows and rechecks: a newly committed hold must not be skipped.
    v_learner_result := public.purge_learner_record(v_one);
    if coalesce((v_learner_result ->> 'blockedByCourseworkHold')::boolean, false) is false then
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
   where kind = 'learner_record' and due_on <= v_as_of;

  select count(*)::int into v_learner_held
    from public.retention_due_records
   where kind = 'learner_record' and due_on <= v_as_of
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

revoke all on function public.run_retention_jobs(timestamptz, integer) from public, anon;
grant execute on function public.run_retention_jobs(timestamptz, integer) to authenticated;

comment on function public.run_retention_jobs(timestamptz, integer) is
  'Deletes what the four clocks say is due — closed support cases past three years, screening records past seven, children''s learning records past thirty days, and handed-in files past a year — in bounded batches, and writes one audit event when it removed anything.';
