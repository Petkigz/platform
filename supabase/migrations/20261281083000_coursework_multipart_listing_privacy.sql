-- A raw storage bucket listing can contain private or unclassifiable uploads.
-- Return only exact keys belonging to library assets to ordinary staff. The
-- named safeguarding owner may also inspect unknown entries for investigation.
-- Classification never grants access to coursework or exposes its existence.
create function public.staff_unfinished_upload_access(p_bucket text, p_keys text[])
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare v_actor uuid := public.current_user_id(); v_owner boolean;
begin
  if v_actor is null or not public.is_privileged(v_actor) then
    raise exception 'only platform staff may inspect unfinished uploads' using errcode='insufficient_privilege';
  end if;
  if p_bucket is null or length(p_bucket) < 1 or length(p_bucket)>255 or p_keys is null
     or cardinality(p_keys)>500 or exists(select 1 from unnest(p_keys) k where k is null or length(k)>1024) then
    raise exception 'invalid unfinished upload request' using errcode='invalid_parameter_value';
  end if;
  v_owner := public.has_role(v_actor, 'platform_admin') and exists (
    select 1 from public.safeguarding_owner s where s.singleton and s.owner_user_id=v_actor
  );
  return jsonb_build_object('is_owner',v_owner,'library_assets',coalesce((
    select jsonb_agg(jsonb_build_object('key',ma.master_key,'asset_id',ma.id)) from public.media_assets ma
     where ma.storage_backend='r2' and ma.master_bucket=p_bucket and ma.master_key=any(p_keys)
       and public.is_library_delivery_asset(ma.id)
  ), '[]'::jsonb));
end;
$$;
revoke all on function public.staff_unfinished_upload_access(text,text[]) from public, anon;
grant execute on function public.staff_unfinished_upload_access(text,text[]) to authenticated;
