-- Show current hold status alongside the private storage queue. Keep the
-- previous RPC for existing clients; this is a snapshot, not a lock on R2.
create function public.coursework_bytes_awaiting_page_with_holds(
  p_after timestamptz default null, p_after_id uuid default null, p_limit integer default 50
) returns table(asset_id uuid, master_bucket text, master_key text, display_name text,
  tombstoned_at timestamptz, purge_due_at timestamptz, sort_at timestamptz, held boolean)
language plpgsql stable security definer set search_path=public as $$
begin
  perform public.require_coursework_retention_owner();
  return query
    select page.asset_id, page.master_bucket, page.master_key, page.display_name,
      page.tombstoned_at, page.purge_due_at, page.sort_at,
      exists (select 1 from public.coursework_retention_holds h
              where h.asset_id=page.asset_id and h.closed_at is null)
    from public.coursework_bytes_awaiting_page(p_after,p_after_id,p_limit) page
    order by page.sort_at, page.asset_id;
end;
$$;
revoke all on function public.coursework_bytes_awaiting_page_with_holds(timestamptz,uuid,integer) from public,anon;
grant execute on function public.coursework_bytes_awaiting_page_with_holds(timestamptz,uuid,integer) to authenticated;
