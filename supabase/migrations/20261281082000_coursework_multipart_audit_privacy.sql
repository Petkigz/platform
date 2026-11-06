-- Prevent the library multipart audit RPC from recording private coursework
-- metadata in the staff-visible governance trail, even when called directly.
create or replace function public.abandon_media_upload(
  p_asset_id  uuid,
  p_upload_id text,
  p_reason    text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor  uuid := public.current_user_id();
  v_bucket text;
  v_key    text;
  v_status text;
  v_size   bigint;
begin
  if v_actor is null or not public.is_privileged(v_actor) then
    raise exception 'only platform staff may abandon an unfinished upload'
      using errcode = 'insufficient_privilege';
  end if;

  -- Required, like every other reversal in this schema. "Cleaning up" is not a
  -- reason; what is worth reading later is why somebody decided these bytes were
  -- not going to arrive.
  if coalesce(btrim(p_reason), '') = '' then
    raise exception 'abandoning an unfinished upload needs a written reason'
      using errcode = 'invalid_parameter_value';
  end if;

  if coalesce(btrim(p_upload_id), '') = '' then
    raise exception 'an unfinished upload needs the id storage gave it'
      using errcode = 'invalid_parameter_value';
  end if;

  -- Storage's ids are short. This is not a validation of their format, which is
  -- storage's business; it stops a request body from being recorded verbatim
  -- into the audit trail.
  if length(btrim(p_upload_id)) > 512 then
    raise exception 'that is not an upload id storage issued'
      using errcode = 'invalid_parameter_value';
  end if;

  -- No row lock: nothing here changes the asset, and locking it would hold up a
  -- teacher's resume or a staff confirmation for the duration of a cleanup.
  select ma.master_bucket, ma.master_key, ma.status, ma.byte_size
    into v_bucket, v_key, v_status, v_size
    from public.media_assets ma
   where ma.id = p_asset_id
   for update;

  if not found then
    raise exception 'no media asset %', p_asset_id
      using errcode = 'no_data_found';
  end if;

  -- This staff-visible governance trail must never record private coursework
  -- keys or sizes. The asset lock also serializes against attachment writers;
  -- it cannot lock a later request to external object storage.
  if not public.is_library_delivery_asset(p_asset_id) then
    raise exception 'no media asset %', p_asset_id using errcode = 'no_data_found';
  end if;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'media.upload_abandoned', 'media_asset', p_asset_id,
          jsonb_build_object(
            'upload_id', btrim(p_upload_id),
            'master_bucket', v_bucket,
            'master_key', v_key,
            'asset_status', v_status,
            'declared_byte_size', v_size,
            'reason', btrim(p_reason)));

  return true;
end;
$$;
