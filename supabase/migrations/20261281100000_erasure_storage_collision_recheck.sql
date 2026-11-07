-- Apply the newer conservative cross-backend key/rendition check to both owner
-- erasure-review actions too. A later collision must prevent removing evidence,
-- even when a storage statement was recorded before the collision was noticed.
create or replace function public.queue_reviewed_coursework_erasure(p_asset_id uuid,p_reason text,p_confirm text)
returns text language plpgsql security definer set search_path=public as $$
declare v_asset public.media_assets; v_prior text:=current_setting('app.media_status_transition',true);
begin
  perform public.lock_coursework_erasure_review_owner();
  if length(trim(coalesce(p_reason,'')))<3 or length(trim(p_reason))>1000
     or p_confirm is distinct from 'I reviewed all surviving uses and understand this only queues storage deletion' then
    raise exception 'confirm the review and provide a reason' using errcode='invalid_parameter_value';
  end if;
  select * into v_asset from public.media_assets where id=p_asset_id for update;
  if not found or not exists(select 1 from public.coursework_erasure_review_assets where asset_id=p_asset_id) then
    raise exception 'the erasure review entry was not found' using errcode='no_data_found';
  end if;
  if v_asset.purpose<>'coursework' then
    raise exception 'legacy library files require separate individual handling' using errcode='check_violation';
  end if;
  if exists(select 1 from public.coursework_retention_holds where asset_id=p_asset_id and closed_at is null) then
    raise exception 'a safeguarding hold is open' using errcode='check_violation';
  end if;
  if public.coursework_storage_needs_individual_review(p_asset_id)
     or exists(select 1 from public.assignment_submission_assets where media_asset_id=p_asset_id)
     or exists(select 1 from public.coursework_upload_declarations where asset_id=p_asset_id)
     or exists(select 1 from public.assignment_submission_revisions where asset_ids @> jsonb_build_array(p_asset_id::text))
     or exists(select 1 from public.lesson_resources where media_asset_id=p_asset_id)
     or exists(select 1 from public.media_renditions where asset_id=p_asset_id)
     or exists(select 1 from public.media_assets other where other.id<>p_asset_id
         and other.storage_backend=v_asset.storage_backend and other.master_bucket=v_asset.master_bucket and other.master_key=v_asset.master_key)
     or exists(select 1 from public.media_renditions r where r.bucket=v_asset.master_bucket and r.object_key=v_asset.master_key)
  then raise exception 'the file or its storage key has another surviving use; investigate it individually' using errcode='check_violation'; end if;
  if v_asset.purged_at is not null then return 'statement_recorded'; end if;
  if v_asset.deleted_at is not null then return 'already_queued'; end if;
  if v_asset.status<>'available' then
    raise exception 'pending or quarantined files need separate individual handling' using errcode='check_violation';
  end if;
  perform set_config('app.media_status_transition','on',true);
  update public.media_assets set status='deleted',deleted_at=now(),purge_due_at=now() where id=p_asset_id;
  perform set_config('app.media_status_transition',coalesce(v_prior,''),true);
  insert into public.governance_audit_events(actor,action,target_type,target_id,detail)
    values(public.current_user_id(),'coursework.erasure_review_queued','media_asset',p_asset_id,
      jsonb_build_object('reason',trim(p_reason),'storageDeletionVerified',false));
  return 'queued';
end;
$$;

create or replace function public.clear_coursework_erasure_review(p_asset_id uuid,p_learner_id uuid,p_confirm text)
returns boolean language plpgsql security definer set search_path=public as $$
declare v_asset public.media_assets; v_count integer;
begin
  perform public.lock_coursework_erasure_review_owner();
  if p_confirm is distinct from 'I understand a storage statement is not verified deletion' then
    raise exception 'confirm that the storage statement is not verified deletion' using errcode='invalid_parameter_value';
  end if;
  select * into v_asset from public.media_assets where id=p_asset_id for update;
  if not found or v_asset.purpose<>'coursework' or v_asset.deleted_at is null or v_asset.purged_at is null then
    raise exception 'a coursework storage-deletion statement must be recorded first' using errcode='check_violation';
  end if;
  if public.coursework_storage_needs_individual_review(p_asset_id)
     or exists(select 1 from public.coursework_retention_holds where asset_id=p_asset_id and closed_at is null)
     or exists(select 1 from public.assignment_submission_assets where media_asset_id=p_asset_id)
     or exists(select 1 from public.coursework_upload_declarations where asset_id=p_asset_id)
     or exists(select 1 from public.assignment_submission_revisions where asset_ids @> jsonb_build_array(p_asset_id::text))
     or exists(select 1 from public.lesson_resources where media_asset_id=p_asset_id)
     or exists(select 1 from public.media_renditions where asset_id=p_asset_id)
     or exists(select 1 from public.media_assets other where other.id<>p_asset_id
          and other.storage_backend=v_asset.storage_backend and other.master_bucket=v_asset.master_bucket and other.master_key=v_asset.master_key)
     or exists(select 1 from public.media_renditions r where r.bucket=v_asset.master_bucket and r.object_key=v_asset.master_key)
  then raise exception 'the file still needs individual handling' using errcode='check_violation'; end if;
  delete from public.coursework_erasure_review_assets where asset_id=p_asset_id and learner_id=p_learner_id;
  get diagnostics v_count=row_count;
  if v_count=0 then return false; end if;
  insert into public.governance_audit_events(actor,action,target_type,target_id,detail)
    values(public.current_user_id(),'coursework.erasure_review_entry_removed','media_asset',p_asset_id,
      jsonb_build_object('storageStatementRecorded',true,'storageDeletionVerified',false));
  return true;
end;
$$;
