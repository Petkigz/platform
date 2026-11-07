-- A shared coursework master can be queued only after every surviving context
-- has its own due clock, never from the earliest one alone. Legacy library,
-- lesson use, open holds, erasure exceptions and ambiguous storage remain
-- separate cases. Queueing is not a storage deletion.
create function public.queue_reviewed_shared_coursework(p_asset_id uuid,p_reason text,p_confirm text)
returns boolean language plpgsql security definer set search_path=public as $$
declare v_asset public.media_assets; v_prior text:=current_setting('app.media_status_transition',true);
  v_contexts uuid[]; v_current_contexts uuid[];
begin
  perform public.lock_coursework_erasure_review_owner();
  if length(trim(coalesce(p_reason,'')))<3 or length(trim(p_reason))>1000
     or p_confirm is distinct from 'I reviewed every context and understand this only queues storage deletion' then
    raise exception 'confirm the review and provide a reason' using errcode='invalid_parameter_value';
  end if;
  -- The same ordering as retention: lock each currently attributable submission
  -- before the asset, then re-evaluate the complete clock after both locks.
  select array_agg(r.submission_id order by r.submission_id) into v_contexts
    from public.coursework_file_retention r where r.asset_id=p_asset_id;
  perform s.id from public.assignment_submissions s where s.id=any(coalesce(v_contexts,'{}'::uuid[]))
   order by s.id for update;
  select * into v_asset from public.media_assets where id=p_asset_id for update;
  if not found or v_asset.purpose<>'coursework' then
    raise exception 'the coursework file was not found' using errcode='no_data_found';
  end if;
  if v_asset.deleted_at is not null then return false; end if;
  -- A previously uncommitted attachment could have appeared while the asset
  -- lock was being acquired. Do not act on a context whose submission row was
  -- not among the rows locked above; retry with a fresh candidate set instead.
  select array_agg(r.submission_id order by r.submission_id) into v_current_contexts
    from public.coursework_file_retention r where r.asset_id=p_asset_id;
  if v_current_contexts is distinct from v_contexts then
    raise exception 'submission contexts changed during review; refresh and retry' using errcode='serialization_failure';
  end if;
  if v_asset.status<>'available' then
    raise exception 'pending or quarantined files need separate individual handling' using errcode='check_violation';
  end if;
  if exists(select 1 from public.coursework_retention_holds where asset_id=p_asset_id and closed_at is null) then
    raise exception 'a safeguarding hold is open' using errcode='check_violation';
  end if;
  if exists(select 1 from public.coursework_erasure_review_assets where asset_id=p_asset_id)
     or exists(select 1 from public.lesson_resources where media_asset_id=p_asset_id)
     or public.coursework_storage_needs_individual_review(p_asset_id) then
    raise exception 'the file has a separate erasure, lesson or storage issue that needs individual handling' using errcode='check_violation';
  end if;
  if (select count(*) from public.coursework_file_retention where asset_id=p_asset_id)<2 then
    raise exception 'the file no longer has multiple submission contexts; refresh the register' using errcode='check_violation';
  end if;
  if exists(select 1 from public.coursework_file_retention where asset_id=p_asset_id
             and (due_on is null or due_on>(now() at time zone 'UTC')::date)) then
    raise exception 'not all submission contexts are due; keep the file until every clock permits deletion' using errcode='check_violation';
  end if;
  perform set_config('app.media_status_transition','on',true);
  update public.media_assets set status='deleted',deleted_at=now(),purge_due_at=now() where id=p_asset_id;
  perform set_config('app.media_status_transition',coalesce(v_prior,''),true);
  insert into public.governance_audit_events(actor,action,target_type,target_id,detail)
    values(public.current_user_id(),'coursework.shared_retention_review_queued','media_asset',p_asset_id,
      jsonb_build_object('reason',trim(p_reason),'storageDeletionVerified',false));
  return true;
end;
$$;
revoke all on function public.queue_reviewed_shared_coursework(uuid,text,text) from public,anon;
grant execute on function public.queue_reviewed_shared_coursework(uuid,text,text) to authenticated;
