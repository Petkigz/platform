-- Keep confirmation idempotent for a successfully attached available file,
-- but do not report success if moderation has since quarantined it. The lock
-- held by this wrapper serializes the decision with quarantine and deletion.
create or replace function public.confirm_coursework_upload(p_asset_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_actor uuid := public.current_user_id(); v_asset public.media_assets;
        v_declared uuid; v_learner uuid;
begin
  if v_actor is null then raise exception 'sign in to hand in a file' using errcode = 'insufficient_privilege'; end if;
  select * into v_asset from public.media_assets where id = p_asset_id for update;
  if not found then raise exception 'media asset not found' using errcode = 'no_data_found'; end if;
  if v_asset.purpose <> 'coursework' then
    raise exception 'that file was not handed in as coursework' using errcode = 'check_violation';
  end if;
  if v_asset.uploaded_by is distinct from v_actor then
    raise exception 'only the uploader can confirm this file' using errcode = 'insufficient_privilege';
  end if;
  select d.declared_by, s.learner_profile_id into v_declared, v_learner
    from public.coursework_upload_declarations d
    join public.assignment_submissions s on s.id = d.submission_id
   where d.asset_id = p_asset_id;
  if not found or v_declared is distinct from v_actor or not public.coursework_hand_in_authorized(v_learner) then
    raise exception 'only the learner or a currently verified guardian with progress permission can confirm this file'
      using errcode = 'insufficient_privilege';
  end if;
  -- A retry is only successful while an already-attached file is still
  -- available. The original implementation returned the attachment before
  -- checking status, even after moderation quarantined it.
  if v_asset.status = 'quarantined' then
    raise exception 'this file is held for review and cannot be confirmed'
      using errcode = 'check_violation';
  end if;
  if v_asset.status <> 'available' and exists (
    select 1 from public.assignment_submission_assets a where a.media_asset_id = p_asset_id
  ) then
    raise exception 'this attached file is not currently available'
      using errcode = 'check_violation';
  end if;
  return public.confirm_coursework_upload_internal(p_asset_id);
end;
$$;
