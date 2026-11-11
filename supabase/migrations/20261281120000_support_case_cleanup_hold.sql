-- An owner can pause scheduled deletion of an identified support case while
-- reviewing a potential safeguarding concern. This is NOT a full evidence
-- preservation guarantee: account erasure and other paths can redact messages.
-- Open holds and their private, append-only events do not grant case access.
create table public.support_case_cleanup_holds (
  case_id uuid primary key references public.support_cases(id) on delete restrict,
  opened_by uuid not null, opened_at timestamptz not null default now(),
  reason text not null check (length(trim(reason)) between 3 and 1000)
);
create table public.support_case_cleanup_hold_events (
  id uuid primary key default gen_random_uuid(), case_id uuid not null,
  actor uuid not null, action text not null check (action in ('held','released')),
  reason text not null check (length(trim(reason)) between 3 and 1000),
  occurred_at timestamptz not null default now()
);
alter table public.support_case_cleanup_holds enable row level security;
alter table public.support_case_cleanup_hold_events enable row level security;
revoke all on public.support_case_cleanup_holds, public.support_case_cleanup_hold_events from public,anon,authenticated;

create function public.guard_support_case_cleanup_hold_events()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  raise exception 'support cleanup pause history cannot be changed' using errcode='insufficient_privilege';
end;
$$;
revoke all on function public.guard_support_case_cleanup_hold_events() from public,anon,authenticated;
create trigger support_case_cleanup_hold_events_append_only before update or delete on public.support_case_cleanup_hold_events
  for each row execute function public.guard_support_case_cleanup_hold_events();

create function public.guard_held_support_case_deletion()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if exists(select 1 from public.support_case_cleanup_holds h where h.case_id=old.id) then
    raise exception 'support case is held from scheduled cleanup' using errcode='check_violation';
  end if;
  return old;
end;
$$;
revoke all on function public.guard_held_support_case_deletion() from public,anon,authenticated;
create trigger held_support_case_deletion_guard before delete on public.support_cases
  for each row execute function public.guard_held_support_case_deletion();

create function public.change_support_case_cleanup_hold(p_case_id uuid,p_action text,p_reason text)
returns boolean language plpgsql security definer set search_path=public as $$
declare v_actor uuid:=public.current_user_id();
begin
  perform public.lock_coursework_erasure_review_owner();
  if p_action not in ('hold','release') or p_action is null or length(trim(coalesce(p_reason,''))) not between 3 and 1000 then
    raise exception 'choose an action and give a reason' using errcode='check_violation'; end if;
  perform 1 from public.support_cases where id=p_case_id for update;
  if not found then raise exception 'support case not found' using errcode='no_data_found'; end if;
  if p_action='hold' then
    insert into public.support_case_cleanup_holds(case_id,opened_by,reason) values(p_case_id,v_actor,trim(p_reason)) on conflict do nothing;
  else
    delete from public.support_case_cleanup_holds where case_id=p_case_id;
  end if;
  if not found then return false; end if;
  insert into public.support_case_cleanup_hold_events(case_id,actor,action,reason)
    values(p_case_id,v_actor,case when p_action='hold' then 'held' else 'released' end,trim(p_reason));
  return true;
end;
$$;
revoke all on function public.change_support_case_cleanup_hold(uuid,text,text) from public,anon;
grant execute on function public.change_support_case_cleanup_hold(uuid,text,text) to authenticated;

create function public.support_case_cleanup_hold_status(p_case_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare v_result jsonb;
begin
  perform public.require_coursework_retention_owner();
  if not public.coursework_active_actor() then raise exception 'coursework:not_allowed' using errcode='insufficient_privilege'; end if;
  if not exists(select 1 from public.support_cases where id=p_case_id) then raise exception 'support case not found' using errcode='no_data_found'; end if;
  select jsonb_build_object('held',true,'reason',h.reason,'openedAt',h.opened_at) into v_result
    from public.support_case_cleanup_holds h where h.case_id=p_case_id;
  return coalesce(v_result,jsonb_build_object('held',false));
end;
$$;
revoke all on function public.support_case_cleanup_hold_status(uuid) from public,anon;
grant execute on function public.support_case_cleanup_hold_status(uuid) to authenticated;

create function public.support_case_cleanup_hold_page(p_after uuid default null,p_limit integer default 51)
returns table(case_id uuid, case_number text, reason text, opened_at timestamptz)
language plpgsql stable security definer set search_path=public as $$
begin
  perform public.require_coursework_retention_owner();
  if not public.coursework_active_actor() then raise exception 'coursework:not_allowed' using errcode='insufficient_privilege'; end if;
  if p_limit is null or p_limit<1 or p_limit>100 then raise exception 'invalid hold page' using errcode='invalid_parameter_value'; end if;
  return query select h.case_id,c.case_number,h.reason,h.opened_at
    from public.support_case_cleanup_holds h join public.support_cases c on c.id=h.case_id
    where p_after is null or h.case_id>p_after order by h.case_id limit p_limit;
end;
$$;
revoke all on function public.support_case_cleanup_hold_page(uuid,integer) from public,anon;
grant execute on function public.support_case_cleanup_hold_page(uuid,integer) to authenticated;


-- Owner-only history for a case that still exists; event ids give a stable page
-- cursor without exposing the private log as a table or relying on timestamps.
create function public.support_case_cleanup_hold_history(p_case_id uuid,p_after uuid default null,p_limit integer default 51)
returns table(event_id uuid, action text, reason text, occurred_at timestamptz)
language plpgsql stable security definer set search_path=public as $$
begin
  perform public.require_coursework_retention_owner();
  if not public.coursework_active_actor() then raise exception 'coursework:not_allowed' using errcode='insufficient_privilege'; end if;
  if not exists(select 1 from public.support_cases where id=p_case_id) then raise exception 'support case not found' using errcode='no_data_found'; end if;
  if p_limit is null or p_limit<1 or p_limit>100 then raise exception 'invalid history page' using errcode='invalid_parameter_value'; end if;
  return query select e.id,e.action,e.reason,e.occurred_at from public.support_case_cleanup_hold_events e
    where e.case_id=p_case_id and (p_after is null or e.id>p_after) order by e.id limit p_limit;
end;
$$;
revoke all on function public.support_case_cleanup_hold_history(uuid,uuid,integer) from public,anon;
grant execute on function public.support_case_cleanup_hold_history(uuid,uuid,integer) to authenticated;

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
   where kind = 'support_case' and public.support_case_retention_due_at(clock_started_at) <= p_now
     and not exists (select 1 from public.support_case_cleanup_holds h where h.case_id = retention_due_records.id);
  select min(due_on) into v_case_next
    from public.retention_due_records
   where kind = 'support_case' and public.support_case_retention_due_at(clock_started_at) > p_now
     and not exists (select 1 from public.support_case_cleanup_holds h where h.case_id = retention_due_records.id);

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
  v_screen_ids  uuid[];
  v_cases       integer := 0;
  v_changed     integer;
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

  -- A case may have changed after the candidate list was read. Lock the
  -- case, recheck its actual close time and only then remove its messages.
  -- This uses the same case-first order as the support conversation writers.
  for v_one in
    select id from public.retention_due_records
     where kind='support_case' and public.support_case_retention_due_at(clock_started_at) <= v_as_of_time
       and not exists (select 1 from public.support_case_cleanup_holds h where h.case_id=retention_due_records.id)
     order by clock_started_at, id limit p_limit
  loop
    perform 1 from public.support_cases c
      where c.id=v_one and c.closed_at is not null
        and public.support_case_retention_due_at(c.closed_at) <= v_as_of_time
      for update;
    if not found then continue; end if;
    if exists(select 1 from public.support_case_cleanup_holds h where h.case_id=v_one) then continue; end if;
    delete from public.support_case_messages where case_id=v_one;
    get diagnostics v_changed = row_count;
    v_messages := v_messages + v_changed;
    delete from public.support_cases where id=v_one;
    get diagnostics v_changed = row_count;
    v_cases := v_cases + v_changed;
  end loop;

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
   where kind = 'support_case' and public.support_case_retention_due_at(clock_started_at) <= v_as_of_time
     and not exists (select 1 from public.support_case_cleanup_holds h where h.case_id=retention_due_records.id);
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
