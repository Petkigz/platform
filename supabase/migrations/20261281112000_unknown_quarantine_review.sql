-- Historic quarantine rows may lack a trustworthy prior status. They must not
-- be silently promoted. The owner can choose a future state only after review,
-- with different evidence requirements and explicit acknowledgement that the
-- database has not checked the object or scanned it for malware.
create function public.review_unknown_coursework_quarantine(
  p_asset_id uuid,p_new_status text,p_reason text,p_confirm text
) returns text language plpgsql security definer set search_path=public as $$
declare v_asset public.media_assets; v_prior text:=current_setting('app.media_status_transition',true);
begin
  perform public.lock_coursework_erasure_review_owner();
  if p_new_status not in ('pending','available') or p_new_status is null
     or length(trim(coalesce(p_reason,''))) not between 3 and 1000 then
    raise exception 'choose a state and provide a review reason' using errcode='invalid_parameter_value'; end if;
  if (p_new_status='pending' and p_confirm is distinct from 'I understand the prior state is unknown and the upload still needs confirmation')
     or (p_new_status='available' and p_confirm is distinct from 'I checked upload completion and understand this is not a scan or storage verification') then
    raise exception 'confirm the limits of the review' using errcode='invalid_parameter_value'; end if;
  select * into v_asset from public.media_assets where id=p_asset_id for update;
  if not found or v_asset.status<>'quarantined' or v_asset.deleted_at is not null or v_asset.purged_at is not null then
    raise exception 'file is not an eligible quarantined file' using errcode='check_violation'; end if;
  if v_asset.purpose<>'coursework' and not exists(select 1 from public.legacy_coursework_provenance p where p.asset_id=p_asset_id)
     and not exists(select 1 from public.assignment_submission_assets a where a.media_asset_id=p_asset_id)
     and not exists(select 1 from public.coursework_upload_declarations d where d.asset_id=p_asset_id)
     and not exists(select 1 from public.assignment_submission_revisions r where r.asset_ids @> jsonb_build_array(p_asset_id::text)) then
    raise exception 'file is not attributable to coursework' using errcode='check_violation'; end if;
  if exists(select 1 from public.coursework_quarantine_state where asset_id=p_asset_id) then
    raise exception 'a previous state is recorded; use the ordinary release' using errcode='check_violation'; end if;
  if p_new_status='pending' and (v_asset.purpose<>'coursework'
      or not exists(select 1 from public.coursework_upload_declarations d where d.asset_id=p_asset_id)
      or exists(select 1 from public.assignment_submission_assets a where a.media_asset_id=p_asset_id)
      or exists(select 1 from public.assignment_submission_revisions r where r.asset_ids @> jsonb_build_array(p_asset_id::text))) then
    raise exception 'pending recovery requires an unattached coursework upload declaration' using errcode='check_violation'; end if;
  if p_new_status='available' and not (
      exists(select 1 from public.assignment_submission_assets a where a.media_asset_id=p_asset_id)
      or exists(select 1 from public.assignment_submission_revisions r where r.asset_ids @> jsonb_build_array(p_asset_id::text))) then
    raise exception 'an attached or recorded revision context is required for available recovery' using errcode='check_violation'; end if;
  perform set_config('app.media_status_transition','on',true);
  update public.media_assets set status=p_new_status where id=p_asset_id;
  perform set_config('app.media_status_transition',coalesce(v_prior,''),true);
  insert into public.governance_audit_events(actor,action,target_type,target_id,detail)
    values(public.current_user_id(),'coursework.unknown_quarantine_reviewed','media_asset',p_asset_id,
      jsonb_build_object('chosen_status',p_new_status,'previous_status_unknown',true,'reason',trim(p_reason),
                         'storage_verified',false,'malware_scanned',false));
  return p_new_status;
end;
$$;
revoke all on function public.review_unknown_coursework_quarantine(uuid,text,text,text) from public,anon;
grant execute on function public.review_unknown_coursework_quarantine(uuid,text,text,text) to authenticated;

-- Versioned list keeps the earlier RPC working for old clients. These are
-- current metadata facts, not proof of upload completion or object safety.
create function public.coursework_quarantine_review_page(p_limit integer default 50,p_after uuid default null)
returns table(asset_id uuid,display_name text,previous_status text,quarantined_at timestamptz,recorded_reason text,
  pending_recovery_possible boolean,available_context_present boolean)
language plpgsql security definer set search_path=public as $$
begin
  return query select q.asset_id,q.display_name,q.previous_status,q.quarantined_at,q.recorded_reason,
    (ma.purpose='coursework' and exists(select 1 from public.coursework_upload_declarations d where d.asset_id=ma.id)
      and not exists(select 1 from public.assignment_submission_assets a where a.media_asset_id=ma.id)
      and not exists(select 1 from public.assignment_submission_revisions r where r.asset_ids @> jsonb_build_array(ma.id::text))),
    (exists(select 1 from public.assignment_submission_assets a where a.media_asset_id=ma.id)
      or exists(select 1 from public.assignment_submission_revisions r where r.asset_ids @> jsonb_build_array(ma.id::text)))
    from public.coursework_quarantine_queue(p_limit,p_after) q join public.media_assets ma on ma.id=q.asset_id
   order by q.asset_id;
end;
$$;
revoke all on function public.coursework_quarantine_review_page(integer,uuid) from public,anon;
grant execute on function public.coursework_quarantine_review_page(integer,uuid) to authenticated;
