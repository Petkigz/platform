-- Owner-only coordinates for a read-only storage metadata check on an existing
-- quarantine. The API must not return these coordinates or a signed URL to the
-- browser; the check is not an object-content or malware verification.
create function public.coursework_quarantine_inspection_target(p_asset_id uuid)
returns table(asset_id uuid,storage_backend text,master_bucket text,master_key text,declared_bytes bigint)
language plpgsql stable security definer set search_path=public as $$
begin
  perform public.require_coursework_retention_owner();
  if not public.coursework_active_actor() then raise exception 'coursework:not_allowed' using errcode='insufficient_privilege'; end if;
  return query select ma.id,ma.storage_backend,ma.master_bucket,ma.master_key,ma.byte_size
    from public.media_assets ma where ma.id=p_asset_id and ma.status='quarantined'
      and ma.deleted_at is null and ma.purged_at is null and not public.is_library_delivery_asset(ma.id);
end;
$$;
revoke all on function public.coursework_quarantine_inspection_target(uuid) from public,anon;
grant execute on function public.coursework_quarantine_inspection_target(uuid) to authenticated;
