-- Holds and storage registers contain file names, object keys and safeguarding
-- reasons. A generic administrative role is not the identified safeguarding
-- owner. Restrict the register, its writers and storage attestations to that
-- owner, including when no owner is configured. Routine retention execution is
-- intentionally unchanged; its independent concurrency and deletion guarantees
-- remain subject to review.
create function public.require_coursework_retention_owner()
returns void language plpgsql stable security definer set search_path = public as $$
begin
  if public.current_user_id() is null or not public.has_role(public.current_user_id(), 'platform_admin')
     or not exists (select 1 from public.safeguarding_owner so
                     where so.singleton and so.owner_user_id = public.current_user_id()) then
    raise exception 'coursework:not_allowed' using errcode = 'insufficient_privilege';
  end if;
end;
$$;
revoke all on function public.require_coursework_retention_owner() from public, anon, authenticated;

alter function public.hold_coursework_file(uuid, text) rename to hold_coursework_file_internal;
revoke all on function public.hold_coursework_file_internal(uuid, text) from public, anon, authenticated;
create function public.hold_coursework_file(p_asset_id uuid, p_reason text)
returns uuid language plpgsql security definer set search_path = public as $$
begin
  perform public.require_coursework_retention_owner();
  perform 1 from public.media_assets where id = p_asset_id for update;
  return public.hold_coursework_file_internal(p_asset_id, p_reason);
end;
$$;
revoke all on function public.hold_coursework_file(uuid, text) from public, anon;
grant execute on function public.hold_coursework_file(uuid, text) to authenticated;

alter function public.release_coursework_hold(uuid, text) rename to release_coursework_hold_internal;
revoke all on function public.release_coursework_hold_internal(uuid, text) from public, anon, authenticated;
create function public.release_coursework_hold(p_asset_id uuid, p_reason text)
returns uuid language plpgsql security definer set search_path = public as $$
begin
  perform public.require_coursework_retention_owner();
  perform 1 from public.media_assets where id = p_asset_id for update;
  return public.release_coursework_hold_internal(p_asset_id, p_reason);
end;
$$;
revoke all on function public.release_coursework_hold(uuid, text) from public, anon;
grant execute on function public.release_coursework_hold(uuid, text) to authenticated;

alter function public.coursework_hold_count() rename to coursework_hold_count_internal;
revoke all on function public.coursework_hold_count_internal() from public, anon, authenticated;
create function public.coursework_hold_count()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  perform public.require_coursework_retention_owner();
  return public.coursework_hold_count_internal();
end;
$$;
revoke all on function public.coursework_hold_count() from public, anon;
grant execute on function public.coursework_hold_count() to authenticated;

alter function public.coursework_retention_plan(timestamptz) rename to coursework_retention_plan_internal;
revoke all on function public.coursework_retention_plan_internal(timestamptz) from public, anon, authenticated;
create function public.coursework_retention_plan(p_now timestamptz default now())
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  perform public.require_coursework_retention_owner();
  return public.coursework_retention_plan_internal(p_now);
end;
$$;
revoke all on function public.coursework_retention_plan(timestamptz) from public, anon;
grant execute on function public.coursework_retention_plan(timestamptz) to authenticated;

alter function public.record_coursework_purge(uuid) rename to record_coursework_purge_internal;
revoke all on function public.record_coursework_purge_internal(uuid) from public, anon, authenticated;
create function public.record_coursework_purge(p_asset_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  perform public.require_coursework_retention_owner();
  perform 1 from public.media_assets where id = p_asset_id for update;
  if exists (select 1 from public.coursework_retention_holds h
             where h.asset_id = p_asset_id and h.closed_at is null) then
    raise exception 'a held file cannot be recorded as deleted from storage'
      using errcode = 'check_violation';
  end if;
  return public.record_coursework_purge_internal(p_asset_id);
end;
$$;
revoke all on function public.record_coursework_purge(uuid) from public, anon;
grant execute on function public.record_coursework_purge(uuid) to authenticated;

alter function public.coursework_holds(integer) rename to coursework_holds_internal;
revoke all on function public.coursework_holds_internal(integer) from public, anon, authenticated;
create function public.coursework_holds(p_limit integer default 50)
returns table (asset_id uuid, display_name text, master_bucket text, master_key text,
  reason text, opened_by uuid, opened_by_name text, opened_at timestamptz,
  still_readable boolean, due_on date) language plpgsql stable security definer set search_path = public as $$
begin
  perform public.require_coursework_retention_owner();
  return query select * from public.coursework_holds_internal(least(greatest(coalesce(p_limit, 50), 1), 200));
end;
$$;
revoke all on function public.coursework_holds(integer) from public, anon;
grant execute on function public.coursework_holds(integer) to authenticated;

alter function public.coursework_bytes_awaiting(integer) rename to coursework_bytes_awaiting_internal;
revoke all on function public.coursework_bytes_awaiting_internal(integer) from public, anon, authenticated;
create function public.coursework_bytes_awaiting(p_limit integer default 50)
returns table (asset_id uuid, master_bucket text, master_key text, display_name text,
  tombstoned_at timestamptz, purge_due_at timestamptz) language plpgsql stable security definer set search_path = public as $$
begin
  perform public.require_coursework_retention_owner();
  return query select * from public.coursework_bytes_awaiting_internal(least(greatest(coalesce(p_limit, 50), 1), 200));
end;
$$;
revoke all on function public.coursework_bytes_awaiting(integer) from public, anon;
grant execute on function public.coursework_bytes_awaiting(integer) to authenticated;

