-- Read-only, private inspection target. This is not permission to delete an
-- object, and the result cannot record or prove erasure. The web endpoint
-- rechecks this RPC after contacting storage.
create function public.coursework_storage_presence_target(p_asset_id uuid)
returns table(asset_id uuid,storage_backend text,master_bucket text,master_key text)
language plpgsql volatile security definer set search_path=public as $$
begin
  perform public.require_coursework_retention_owner();
  return query select m.id,m.storage_backend,m.master_bucket,m.master_key
    from public.media_assets m
    where m.id=p_asset_id and m.purpose='coursework' and m.deleted_at is not null and m.purged_at is null;
end;
$$;
revoke all on function public.coursework_storage_presence_target(uuid) from public,anon;
grant execute on function public.coursework_storage_presence_target(uuid) to authenticated;
