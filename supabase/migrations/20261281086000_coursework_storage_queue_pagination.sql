-- The old 50-row list could strand later files behind held or unresolved items.
-- Keep the old RPC for existing clients and expose an owner-only keyset page.
create function public.coursework_bytes_awaiting_page(
  p_after timestamptz default null, p_after_id uuid default null, p_limit integer default 50
) returns table(asset_id uuid,master_bucket text,master_key text,display_name text,
  tombstoned_at timestamptz,purge_due_at timestamptz,sort_at timestamptz)
language plpgsql stable security definer set search_path=public as $$
begin
  perform public.require_coursework_retention_owner();
  if (p_after is null) <> (p_after_id is null) then
    raise exception 'both storage cursor values are required' using errcode='invalid_parameter_value';
  end if;
  if p_limit is null or p_limit<1 or p_limit>100 then
    raise exception 'storage page limit must be between 1 and 100' using errcode='invalid_parameter_value';
  end if;
  return query select ma.id,ma.master_bucket,ma.master_key,coalesce(ma.display_name,ma.master_key),
      ma.deleted_at,ma.purge_due_at,coalesce(ma.purge_due_at,ma.deleted_at)
    from public.media_assets ma
    where ma.purpose='coursework' and ma.deleted_at is not null and ma.purged_at is null
      and (p_after is null or (coalesce(ma.purge_due_at,ma.deleted_at),ma.id) > (p_after,p_after_id))
    order by coalesce(ma.purge_due_at,ma.deleted_at),ma.id limit p_limit;
end;
$$;
revoke all on function public.coursework_bytes_awaiting_page(timestamptz,uuid,integer) from public,anon;
grant execute on function public.coursework_bytes_awaiting_page(timestamptz,uuid,integer) to authenticated;
