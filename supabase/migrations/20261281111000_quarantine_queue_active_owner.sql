-- The private quarantine register must enforce active owner authority as its
-- write path already does, including when called directly instead of via UI.
create or replace function public.coursework_quarantine_queue(p_limit integer default 50, p_after uuid default null)
returns table(asset_id uuid, display_name text, previous_status text, quarantined_at timestamptz, recorded_reason text)
language plpgsql security definer set search_path = public as $$
begin
  perform public.require_coursework_retention_owner();
  if not public.coursework_active_actor() then raise exception 'coursework:not_allowed' using errcode='insufficient_privilege'; end if;
  if p_limit is null or p_limit < 1 or p_limit > 100 then
    raise exception 'limit must be between 1 and 100' using errcode='invalid_parameter_value';
  end if;
  return query
    select ma.id, ma.display_name, cq.previous_status, cq.quarantined_at,
           (select e.detail->>'reason' from public.governance_audit_events e
             where e.target_type='media_asset' and e.target_id=ma.id and e.action='media.upload_quarantined'
             order by e.occurred_at desc, e.id desc limit 1)
      from public.media_assets ma
      left join public.coursework_quarantine_state cq on cq.asset_id=ma.id
     where ma.status='quarantined' and ma.deleted_at is null
       and not public.is_library_delivery_asset(ma.id)
       and (p_after is null or ma.id > p_after)
     order by ma.id limit p_limit;
end;
$$;
