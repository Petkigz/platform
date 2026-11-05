-- Serialize the ordinary scheduled coursework cleanup with the owner hold
-- writer. This protects the scheduling path, not every other deletion path or
-- an object already deleted from storage. PostgreSQL concurrency must also be
-- checked against the deployed database; the in-memory test harness is single
-- connection and cannot prove the interleaving.
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
  for v_id in
    select asset_id from public.coursework_file_retention
     where due_on <= v_as_of and tombstoned_at is null and not held
     order by due_on, asset_id limit p_limit
  loop
    perform 1 from public.media_assets where id = v_id for update;
    if exists (
      select 1 from public.coursework_file_retention
       where asset_id = v_id and due_on <= v_as_of
         and tombstoned_at is null and not held
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

  select count(*)::int into v_left
    from public.coursework_file_retention
   where due_on <= v_as_of and tombstoned_at is null and not held;

  select count(*)::int into v_held
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

revoke all on function public.purge_coursework_files(timestamptz, integer) from public, anon;
grant execute on function public.purge_coursework_files(timestamptz, integer) to authenticated;

comment on function public.purge_coursework_files(timestamptz, integer) is
  'Tombstones due coursework using a media-row lock and a hold recheck. The object is queued separately; other deletion paths and real multi-session concurrency require separate review.';

