-- Keep library moderation and authorized coursework moderation, but do not
-- let unrelated staff quarantine private files by guessing an asset ID.
create or replace function public.quarantine_media_upload(
  p_asset_id uuid,
  p_reason   text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor  uuid;
  v_status text;
begin
  v_actor := public.current_user_id();

  if v_actor is null then
    raise exception 'sign in to quarantine an upload'
      using errcode = 'insufficient_privilege';
  end if;

  -- Serialize account suspension and existing role revocations with this act.
  perform 1 from public.user_profiles where user_id=v_actor for share;
  perform ura.id from public.user_role_assignments ura
    join public.roles r on r.id=ura.role_id
   where ura.user_id=v_actor for share of ura, r;
  if not public.is_privileged(v_actor) then
    raise exception 'only staff may quarantine an upload'
      using errcode = 'insufficient_privilege';
  end if;

  if coalesce(trim(p_reason), '') = '' then
    raise exception 'a reason is required to quarantine an upload'
      using errcode = 'invalid_parameter_value';
  end if;

  select status into v_status
    from public.media_assets
   where id = p_asset_id
   for update;

  if not found then
    raise exception 'media asset % not found', p_asset_id
      using errcode = 'no_data_found';
  end if;

  -- A guessed ID must not let unrelated staff disrupt a private hand-in, or
  -- reveal whether it exists. Library moderation remains unchanged. The owner
  -- and other privileged actors who may actually open this file keep the act.
  if not public.is_library_delivery_asset(p_asset_id)
     and not public.may_read_coursework_master(p_asset_id) then
    raise exception 'media asset % not found', p_asset_id
      using errcode = 'no_data_found';
  end if;

  if v_status = 'deleted' then
    return false;
  end if;

  perform set_config('app.media_status_transition', 'on', true);

  update public.media_assets
     set status = 'quarantined'
   where id = p_asset_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'media.upload_quarantined', 'media_asset', p_asset_id,
          jsonb_build_object('reason', trim(p_reason)));

  return true;
end;
$$;
