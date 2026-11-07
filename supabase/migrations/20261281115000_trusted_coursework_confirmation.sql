-- A browser cannot attest that storage was checked. Only the server may invoke
-- the confirmation transition, after authenticating the caller and checking
-- storage. This does not scan content or make external storage immutable.
revoke all on function public.confirm_coursework_upload(uuid) from public, anon, authenticated, service_role;

create function public.confirm_coursework_upload_from_server(
  p_actor uuid, p_asset_id uuid, p_bucket text, p_key text, p_bytes bigint
) returns uuid language plpgsql security definer set search_path=public,pg_catalog as $$
declare v_asset public.media_assets; v_claims text := current_setting('request.jwt.claims',true); v_result uuid;
begin
  if p_actor is null then raise exception 'sign in to hand in a file' using errcode='insufficient_privilege'; end if;
  -- Coordinates and declared size must still be those the server checked. The
  -- underlying state machine takes this same lock and rechecks actor authority.
  select * into v_asset from public.media_assets where id=p_asset_id for update;
  if not found or v_asset.storage_backend <> 'r2' or v_asset.master_bucket is distinct from p_bucket
     or v_asset.master_key is distinct from p_key or v_asset.byte_size is distinct from p_bytes then
    raise exception 'the upload record changed; check it again' using errcode='check_violation';
  end if;
  -- The caller is exclusively the trusted server. Scope the verified identity to
  -- this transaction and restore the original claims before returning.
  perform set_config('request.jwt.claims',jsonb_build_object('sub',p_actor,'role','authenticated')::text,true);
  v_result := public.confirm_coursework_upload(p_asset_id);
  perform set_config('request.jwt.claims',coalesce(v_claims,''),true);
  return v_result;
end;
$$;
revoke all on function public.confirm_coursework_upload_from_server(uuid,uuid,text,text,bigint) from public,anon,authenticated;
grant execute on function public.confirm_coursework_upload_from_server(uuid,uuid,text,text,bigint) to service_role;
comment on function public.confirm_coursework_upload_from_server(uuid,uuid,text,text,bigint) is
  'Trusted server only: rechecks the verified actor, upload state and checked coordinates. A storage HEAD checks size at one instant, not contents, malware or subsequent replacement.';
