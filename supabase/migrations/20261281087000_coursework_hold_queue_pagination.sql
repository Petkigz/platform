-- Keep every active hold reachable in the owner dashboard, even if older holds
-- remain open. A hold may have multiple historic attachment rows; report its
-- earliest current due date once rather than duplicating the hold in the list.
create function public.coursework_holds_page(
  p_after timestamptz default null,p_after_id uuid default null,p_limit integer default 50
) returns table(asset_id uuid,display_name text,master_bucket text,master_key text,
  reason text,opened_by uuid,opened_by_name text,opened_at timestamptz,
  still_readable boolean,due_on date)
language plpgsql stable security definer set search_path=public as $$
begin
  perform public.require_coursework_retention_owner();
  if (p_after is null) <> (p_after_id is null) then
    raise exception 'both hold cursor values are required' using errcode='invalid_parameter_value';
  end if;
  if p_limit is null or p_limit<1 or p_limit>100 then
    raise exception 'hold page limit must be between 1 and 100' using errcode='invalid_parameter_value';
  end if;
  return query
    select h.asset_id,coalesce(ma.display_name,ma.master_key),ma.master_bucket,ma.master_key,
      h.reason,h.opened_by,coalesce(up.display_name,'a member of staff whose name is gone'),
      h.opened_at,ma.deleted_at is null,
      (select min(r.due_on) from public.coursework_file_retention r where r.asset_id=h.asset_id)
    from public.coursework_retention_holds h
    join public.media_assets ma on ma.id=h.asset_id
    left join public.user_profiles up on up.user_id=h.opened_by
    where h.closed_at is null and (p_after is null or (h.opened_at,h.asset_id)>(p_after,p_after_id))
    order by h.opened_at,h.asset_id limit p_limit;
end;
$$;
revoke all on function public.coursework_holds_page(timestamptz,uuid,integer) from public,anon;
grant execute on function public.coursework_holds_page(timestamptz,uuid,integer) to authenticated;
