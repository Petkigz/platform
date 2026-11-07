-- A tombstoned asset no longer participates in media_assets_location_key. A
-- later row can therefore name the same bucket/key, including a live library
-- asset, while the coursework storage queue still says to delete that key.
-- Also flag coursework renditions: the existing queue accounts for the master
-- only, not every additional object. No database check can freeze object storage.
create function public.coursework_storage_needs_individual_review(p_asset_id uuid)
returns boolean language sql volatile security definer set search_path=public as $$
  select exists (
    select 1 from public.media_assets ma where ma.id=p_asset_id and (
      exists(select 1 from public.media_assets other where other.id<>ma.id
             and other.master_bucket=ma.master_bucket and other.master_key=ma.master_key)
      or exists(select 1 from public.media_renditions r where r.asset_id=ma.id
                or (r.bucket=ma.master_bucket and r.object_key=ma.master_key))
    )
  );
$$;
revoke all on function public.coursework_storage_needs_individual_review(uuid) from public,anon,authenticated;

-- Keep earlier list signatures for old clients; the current UI consumes the
-- checked page and fails closed if the new status is missing.
create function public.coursework_bytes_awaiting_checked_page(
  p_after timestamptz default null,p_after_id uuid default null,p_limit integer default 50
) returns table(asset_id uuid,master_bucket text,master_key text,display_name text,
  tombstoned_at timestamptz,purge_due_at timestamptz,sort_at timestamptz,held boolean,storage_review_needed boolean,storage_backend text)
language plpgsql stable security definer set search_path=public as $$
begin
  perform public.require_coursework_retention_owner();
  if not public.coursework_active_actor() then raise exception 'coursework:not_allowed' using errcode='insufficient_privilege'; end if;
  return query select page.asset_id,page.master_bucket,page.master_key,page.display_name,
    page.tombstoned_at,page.purge_due_at,page.sort_at,page.held,
    public.coursework_storage_needs_individual_review(page.asset_id),ma.storage_backend
    from public.coursework_bytes_awaiting_page_with_holds(p_after,p_after_id,p_limit) page
    join public.media_assets ma on ma.id=page.asset_id
    order by page.sort_at,page.asset_id;
end;
$$;
revoke all on function public.coursework_bytes_awaiting_checked_page(timestamptz,uuid,integer) from public,anon;
grant execute on function public.coursework_bytes_awaiting_checked_page(timestamptz,uuid,integer) to authenticated;

create or replace function public.record_coursework_purge(p_asset_id uuid)
returns boolean language plpgsql security definer set search_path=public as $$
declare v_purpose text;
begin
  perform public.lock_coursework_erasure_review_owner();
  select purpose into v_purpose from public.media_assets where id=p_asset_id for update;
  if not found or v_purpose<>'coursework' then
    raise exception 'that coursework file does not exist' using errcode='no_data_found';
  end if;
  if exists(select 1 from public.coursework_retention_holds where asset_id=p_asset_id and closed_at is null) then
    raise exception 'a held file cannot be recorded as deleted from storage' using errcode='check_violation';
  end if;
  if public.coursework_storage_needs_individual_review(p_asset_id) then
    raise exception 'this storage location or its extra objects need individual review; do not delete it as routine cleanup'
      using errcode='check_violation';
  end if;
  return public.record_coursework_purge_internal(p_asset_id);
end;
$$;
comment on function public.record_coursework_purge(uuid) is
  'Owner statement only, not verified deletion. Refuses holds and known storage-key or rendition conflicts; object storage and concurrent external changes are outside this transaction.';
