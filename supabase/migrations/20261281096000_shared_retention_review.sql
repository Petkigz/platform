-- Count files rather than rows when historical assets have several submission
-- contexts, and give the safeguarding owner a paginated list of the due assets
-- the automatic writer deliberately leaves alone for individual handling.
create or replace function public.purge_coursework_files(
  p_now   timestamptz default now(),
  p_limit integer default 500
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor    uuid := public.current_user_id();
  v_as_of    date := least((p_now at time zone 'UTC')::date,
                           (now() at time zone 'UTC')::date);
  v_id       uuid;
  v_submission uuid;
  v_changed  integer;
  v_purged   integer := 0;
  v_left     integer := 0;
  v_held     integer := 0;
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

  -- Lock the same media row as the hold writer, then re-read the retention
  -- view in a separate command. If a hold committed while this run waited for
  -- the row lock, the recheck sees it before the tombstone is written. A hold
  -- that starts after this run owns the lock cannot retroactively stop a deletion.
  for v_id, v_submission in
    select asset_id, submission_id from public.coursework_file_retention
     where due_on <= v_as_of and tombstoned_at is null and not held
       and not public.coursework_asset_needs_individual_review(asset_id)
     order by due_on, asset_id limit p_limit
  loop
    -- Submission writers lock this row before changing the revision or hand-in
    -- clock. Recheck after both locks; a concurrently removed parent is not an
    -- orphan we can safely classify from the earlier candidate list.
    perform 1 from public.assignment_submissions where id=v_submission for update;
    if not found then continue; end if;
    perform 1 from public.media_assets where id = v_id for update;
    if exists (
      select 1 from public.coursework_file_retention
       where asset_id = v_id and due_on <= v_as_of
         and tombstoned_at is null and not held
         and not public.coursework_asset_needs_individual_review(asset_id)
    ) then
      perform set_config('app.media_status_transition', 'on', true);
      update public.media_assets
         set status = 'deleted', deleted_at = now(), purge_due_at = now()
       where id = v_id and deleted_at is null;
      get diagnostics v_changed = row_count;
      v_purged := v_purged + v_changed;
      perform set_config('app.media_status_transition', '', true);
    end if;
  end loop;

  if v_purged > 0 then
    insert into public.governance_audit_events (actor, action, target_type, detail)
    values (v_actor, 'retention.coursework_files_deleted', 'retention_run',
            jsonb_build_object('asOf', v_as_of, 'files', v_purged, 'limit', p_limit));
  end if;

  select count(distinct asset_id)::int into v_left
    from public.coursework_file_retention
   where due_on <= v_as_of and tombstoned_at is null and not held;

  select count(distinct asset_id)::int into v_held
    from public.coursework_file_retention
   where held and tombstoned_at is null;

  return jsonb_build_object(
    'asOf', v_as_of,
    'deleted', v_purged,
    'remaining', v_left,
    'held', v_held,
    'awaitingStorage',
      (select count(*)::int from public.media_assets
        where purpose = 'coursework' and deleted_at is not null and purged_at is null));
end;
$$;


create or replace function public.coursework_retention_plan_internal(p_now timestamptz default now())
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor      uuid := public.current_user_id();
  v_as_of      date := (p_now at time zone 'UTC')::date;
  v_due        integer;
  v_oldest     date;
  v_next       date;
  v_held       integer;
  v_held_oldest date;
  v_awaiting   integer;
  v_awaiting_oldest timestamptz;
  v_erased     integer;
begin
  if v_actor is null or not public.has_role(v_actor, 'platform_admin') then
    raise exception 'retention:not_allowed'
      using errcode = 'insufficient_privilege',
            hint = 'a child''s file is deleted by the owner or the cleanup they schedule';
  end if;

  select count(distinct asset_id)::int, min(due_on) into v_due, v_oldest
    from public.coursework_file_retention
   where due_on <= v_as_of
     and tombstoned_at is null
     and not held;

  select min(due_on) into v_next
    from public.coursework_file_retention
   where due_on > v_as_of
     and tombstoned_at is null
     and not held;

  select count(distinct asset_id)::int, min(due_on) into v_held, v_held_oldest
    from public.coursework_file_retention
   where held and tombstoned_at is null;

  -- Tombstoned and not yet confirmed deleted from storage. This database cannot
  -- close these itself; the number is here so it is never mistaken for zero.
  select count(*)::int, min(purge_due_at) into v_awaiting, v_awaiting_oldest
    from public.media_assets
   where purpose = 'coursework'
     and deleted_at is not null
     and purged_at is null;

  select count(distinct asset_id)::int into v_erased
    from public.coursework_file_retention
   where basis = 'erasure';

  return jsonb_build_object(
    'asOf', v_as_of,
    'policies', jsonb_build_object(
      'courseworkFile', jsonb_build_object(
        'years', 1,
        'days', null,
        'clock', 'one year after the later of the class ending and the file being handed in',
        'source', 'The owner''s answer of 2026-11-01: "a year after the class ends."'),
      'erasedRecord', jsonb_build_object(
        'years', null,
        'days', 30,
        'clock', 'thirty days after the learner''s record was erased, where that is sooner',
        'source', 'The children''s policy: a child''s learning record is deleted thirty days after the guardian''s account closes.')),
    'files', jsonb_build_object(
      'due', v_due,
      'oldestDue', v_oldest,
      'nextDue', v_next,
      'erasedToDate', v_erased,
      'held', jsonb_build_object(
        'count', v_held,
        'oldestDue', v_held_oldest,
        'note', 'Files somebody held on purpose. Deletion stops while a hold is open and needs a written reason to end.')),
    'storage', jsonb_build_object(
      'awaiting', v_awaiting,
      'oldestDue', v_awaiting_oldest,
      'note', 'Unwatchable; storage deletion has not been recorded. An owner statement does not independently verify the object or its copies.'));
end;
$$;


create function public.coursework_shared_retention_review_page(p_after uuid default null,p_limit integer default 51)
returns table(asset_id uuid,display_name text,earliest_due date,submission_contexts bigint,
              in_lesson boolean,erasure_review boolean,held boolean)
language plpgsql stable security definer set search_path=public as $$
begin
  perform public.require_coursework_retention_owner();
  if not public.coursework_active_actor() then raise exception 'coursework:not_allowed' using errcode='insufficient_privilege'; end if;
  if p_limit is null or p_limit<1 or p_limit>100 then
    raise exception 'invalid shared retention review page' using errcode='invalid_parameter_value';
  end if;
  return query select ma.id,ma.display_name,
    (select min(r.due_on) from public.coursework_file_retention r where r.asset_id=ma.id),
    (select count(distinct r.submission_id) from public.coursework_file_retention r where r.asset_id=ma.id),
    exists(select 1 from public.lesson_resources lr where lr.media_asset_id=ma.id),
    exists(select 1 from public.coursework_erasure_review_assets x where x.asset_id=ma.id),
    exists(select 1 from public.coursework_retention_holds h where h.asset_id=ma.id and h.closed_at is null)
  from public.media_assets ma
  where ma.purpose='coursework' and ma.deleted_at is null and (p_after is null or ma.id>p_after)
    and exists(select 1 from public.coursework_file_retention r where r.asset_id=ma.id and r.due_on<=(now() at time zone 'UTC')::date)
    and public.coursework_asset_needs_individual_review(ma.id)
  order by ma.id limit p_limit;
end;
$$;
revoke all on function public.coursework_shared_retention_review_page(uuid,integer) from public,anon;
grant execute on function public.coursework_shared_retention_review_page(uuid,integer) to authenticated;
