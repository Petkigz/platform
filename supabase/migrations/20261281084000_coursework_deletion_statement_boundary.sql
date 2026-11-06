-- A coursework deletion statement must not modify an unrelated library asset.
-- The recorded value remains an owner statement, not proof of storage deletion.
create or replace function public.record_coursework_purge(p_asset_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_purpose text;
begin
  perform public.require_coursework_retention_owner();
  select purpose into v_purpose from public.media_assets where id = p_asset_id for update;
  if not found or v_purpose <> 'coursework' then
    raise exception 'that coursework file does not exist' using errcode = 'no_data_found';
  end if;
  if exists (select 1 from public.coursework_retention_holds h
             where h.asset_id = p_asset_id and h.closed_at is null) then
    raise exception 'a held file cannot be recorded as deleted from storage'
      using errcode = 'check_violation';
  end if;
  return public.record_coursework_purge_internal(p_asset_id);
end;
$$;
comment on function public.record_coursework_purge(uuid) is
  'The named owner records an unverified storage-deletion statement for a tombstoned coursework file; the database does not delete or verify bytes. Holds are checked under the asset lock.';
