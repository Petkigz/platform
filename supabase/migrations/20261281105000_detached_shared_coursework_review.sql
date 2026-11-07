-- Preserve ambiguous surviving uses when an ordinary (non-child-erasure)
-- submission cascade detaches a historical coursework file. This register is
-- private evidence, not a statement that the storage object or copies exist.
create table public.coursework_detach_review_assets (
  asset_id uuid primary key references public.media_assets(id) on delete restrict,
  recorded_at timestamptz not null default now()
);
alter table public.coursework_detach_review_assets enable row level security;
revoke all on public.coursework_detach_review_assets from public,anon,authenticated;

create or replace function public.retire_coursework_file_on_detach()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if exists(select 1 from public.assignment_submissions where id=old.submission_id)
    or exists(select 1 from public.coursework_erasure_review_assets r where r.asset_id=old.media_asset_id)
  then return old; end if;
  -- The parent is gone, but the same historical file can still serve another
  -- submission, a lesson, an offline booking or a prior child-erasure review.
  -- Lock before the fresh checks, as the other writers lock this asset too.
  perform 1 from public.media_assets where id=old.media_asset_id for update;
  if not exists(select 1 from public.child_revision_erasure_scope s where s.transaction_id=txid_current())
     and exists(select 1 from public.media_assets ma where ma.id=old.media_asset_id and ma.purpose='coursework')
     and (exists(select 1 from public.assignment_submission_assets a where a.media_asset_id=old.media_asset_id and a.submission_id<>old.submission_id)
       or exists(select 1 from public.coursework_upload_declarations d where d.asset_id=old.media_asset_id and d.submission_id<>old.submission_id)
       or exists(select 1 from public.assignment_submission_revisions r where r.submission_id<>old.submission_id and r.asset_ids @> jsonb_build_array(old.media_asset_id::text))
       or exists(select 1 from public.lesson_resources lr where lr.media_asset_id=old.media_asset_id)
       or exists(select 1 from public.offline_downloads od where od.media_asset_id=old.media_asset_id)) then
    insert into public.coursework_detach_review_assets(asset_id) values(old.media_asset_id) on conflict do nothing;
    return old;
  end if;
  perform set_config('app.media_status_transition','on',true);
  update public.media_assets set status='deleted',deleted_at=coalesce(deleted_at,now()),
    purge_due_at=case
      when exists(select 1 from public.coursework_retention_holds h where h.asset_id=old.media_asset_id and h.closed_at is null) then null
      when current_setting('app.child_coursework_erasure',true)='on' then now()
      else coalesce(purge_due_at,now()+interval '30 days') end
    where id=old.media_asset_id and purpose='coursework' and deleted_at is null;
  return old;
end;
$$;


create or replace function public.coursework_asset_needs_individual_review(p_asset_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.coursework_detach_review_assets where asset_id=p_asset_id)
      or exists(select 1 from public.coursework_erasure_review_assets where asset_id=p_asset_id)
      or exists(select 1 from public.lesson_resources where media_asset_id=p_asset_id)
      or exists(select 1 from public.offline_downloads where media_asset_id=p_asset_id)
      or (select count(distinct s.id)>1 from public.assignment_submissions s
          where exists(select 1 from public.assignment_submission_assets a where a.submission_id=s.id and a.media_asset_id=p_asset_id)
             or exists(select 1 from public.coursework_upload_declarations d where d.submission_id=s.id and d.asset_id=p_asset_id)
             or exists(select 1 from public.assignment_submission_revisions r where r.submission_id=s.id
                       and r.asset_ids @> jsonb_build_array(p_asset_id::text)));
$$;


create or replace function public.coursework_storage_needs_individual_review(p_asset_id uuid)
returns boolean language sql volatile security definer set search_path=public as $$
  select exists (
    select 1 from public.media_assets ma where ma.id=p_asset_id and (
      exists(select 1 from public.coursework_detach_review_assets x where x.asset_id=ma.id)
      or exists(select 1 from public.offline_downloads od where od.media_asset_id=ma.id)
      or exists(select 1 from public.coursework_erasure_review_assets r where r.asset_id=ma.id and r.offline_copy_recorded and r.offline_copy_reviewed_at is null)
      or exists(select 1 from public.media_assets other where other.id<>ma.id
             and other.master_bucket=ma.master_bucket and other.master_key=ma.master_key)
      or exists(select 1 from public.media_renditions r where r.asset_id=ma.id
                or (r.bucket=ma.master_bucket and r.object_key=ma.master_key))
    )
  );
$$;


create function public.coursework_detach_review_page(p_after uuid default null,p_limit integer default 51)
returns table(asset_id uuid,display_name text,asset_status text,recorded_at timestamptz,
  submission_use boolean,lesson_use boolean,offline_evidence boolean,erasure_review boolean,held boolean)
language plpgsql stable security definer set search_path=public as $$
begin
  perform public.require_coursework_retention_owner();
  if not public.coursework_active_actor() then raise exception 'coursework:not_allowed' using errcode='insufficient_privilege'; end if;
  if p_limit is null or p_limit<1 or p_limit>100 then raise exception 'invalid detached review page' using errcode='invalid_parameter_value'; end if;
  return query select ma.id,ma.display_name,ma.status::text,x.recorded_at,
    (exists(select 1 from public.assignment_submission_assets a where a.media_asset_id=ma.id)
     or exists(select 1 from public.coursework_upload_declarations d where d.asset_id=ma.id)
     or exists(select 1 from public.assignment_submission_revisions r where r.asset_ids @> jsonb_build_array(ma.id::text))),
    exists(select 1 from public.lesson_resources lr where lr.media_asset_id=ma.id),
    exists(select 1 from public.offline_downloads od where od.media_asset_id=ma.id),
    exists(select 1 from public.coursework_erasure_review_assets e where e.asset_id=ma.id),
    exists(select 1 from public.coursework_retention_holds h where h.asset_id=ma.id and h.closed_at is null)
    from public.coursework_detach_review_assets x join public.media_assets ma on ma.id=x.asset_id
   where p_after is null or ma.id>p_after order by ma.id limit p_limit;
end;
$$;
revoke all on function public.coursework_detach_review_page(uuid,integer) from public,anon;
grant execute on function public.coursework_detach_review_page(uuid,integer) to authenticated;

-- Once all known uses have ended, the owner can move the master to the existing
-- storage queue. This does not delete bytes or resolve unknown device copies.
create function public.queue_reviewed_detached_coursework(p_asset_id uuid,p_reason text,p_confirm text)
returns boolean language plpgsql security definer set search_path=public as $$
declare v_asset public.media_assets; v_prior text:=current_setting('app.media_status_transition',true);
begin
  perform public.lock_coursework_erasure_review_owner();
  if length(trim(coalesce(p_reason,''))) not between 3 and 1000
     or p_confirm is distinct from 'I reviewed the surviving uses and understand this only queues storage deletion' then
    raise exception 'confirm the review and provide a reason' using errcode='invalid_parameter_value'; end if;
  select * into v_asset from public.media_assets where id=p_asset_id for update;
  if not found or v_asset.purpose<>'coursework' then raise exception 'the coursework file was not found' using errcode='no_data_found'; end if;
  if not exists(select 1 from public.coursework_detach_review_assets where asset_id=p_asset_id) then return false; end if;
  if v_asset.deleted_at is not null or v_asset.purged_at is not null or v_asset.status<>'available' then
    raise exception 'this file needs separate status or storage review' using errcode='check_violation'; end if;
  if exists(select 1 from public.coursework_retention_holds where asset_id=p_asset_id and closed_at is null)
     or exists(select 1 from public.assignment_submission_assets where media_asset_id=p_asset_id)
     or exists(select 1 from public.coursework_upload_declarations where asset_id=p_asset_id)
     or exists(select 1 from public.assignment_submission_revisions where asset_ids @> jsonb_build_array(p_asset_id::text))
     or exists(select 1 from public.lesson_resources where media_asset_id=p_asset_id)
     or exists(select 1 from public.offline_downloads where media_asset_id=p_asset_id)
     or exists(select 1 from public.coursework_erasure_review_assets where asset_id=p_asset_id) then
    raise exception 'the file has a hold or another surviving use; investigate it individually' using errcode='check_violation'; end if;
  -- The helper treats this marker as a storage conflict. Remove it inside the
  -- transaction before the check; any refusal rolls the removal back.
  delete from public.coursework_detach_review_assets where asset_id=p_asset_id;
  if public.coursework_storage_needs_individual_review(p_asset_id) then
    raise exception 'the storage location or extra objects need individual review' using errcode='check_violation'; end if;
  perform set_config('app.media_status_transition','on',true);
  update public.media_assets set status='deleted',deleted_at=now(),purge_due_at=now() where id=p_asset_id;
  perform set_config('app.media_status_transition',coalesce(v_prior,''),true);
  insert into public.governance_audit_events(actor,action,target_type,target_id,detail)
    values(public.current_user_id(),'coursework.detached_review_queued','media_asset',p_asset_id,
      jsonb_build_object('reason',trim(p_reason),'storageDeletionVerified',false));
  return true;
end;
$$;
revoke all on function public.queue_reviewed_detached_coursework(uuid,text,text) from public,anon;
grant execute on function public.queue_reviewed_detached_coursework(uuid,text,text) to authenticated;

-- A later child erasure takes over any earlier detached-file review.
create or replace function public.purge_learner_record_with_holds(p_learner_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_kind text; v_status text; v_deleted timestamptz;
  v_prior text := current_setting('app.child_coursework_erasure',true);
  v_media_transition text := current_setting('app.media_status_transition',true);
  v_result jsonb; v_assets uuid[]; v_review integer;
begin
  -- Serialize with record changes and with revision/attachment writes before
  -- locking assets. Hold writers take the same asset locks. Recheck afterwards.
  select learner_type,status,deleted_at into v_kind,v_status,v_deleted
    from public.learner_profiles where id=p_learner_id for update;
  perform s.id from public.assignment_submissions s
    where s.learner_profile_id=p_learner_id order by s.id for update;
  select coalesce(array_agg(ma.id order by ma.id),'{}'::uuid[]) into v_assets
    from public.media_assets ma where exists (
      select 1 from public.assignment_submissions s where s.learner_profile_id=p_learner_id and (
        exists (select 1 from public.assignment_submission_assets a where a.submission_id=s.id and a.media_asset_id=ma.id)
        or exists (select 1 from public.coursework_upload_declarations d where d.submission_id=s.id and d.asset_id=ma.id)
        or exists (select 1 from public.assignment_submission_revisions r where r.submission_id=s.id
                    and r.asset_ids @> jsonb_build_array(ma.id::text))
      )
    ) or (exists(select 1 from public.offline_downloads od where od.learner_profile_id=p_learner_id and od.media_asset_id=ma.id)
          and (ma.purpose='coursework' or exists(select 1 from public.legacy_coursework_provenance p where p.asset_id=ma.id)));
  perform ma.id from public.media_assets ma where ma.id=any(v_assets) order by ma.id for update;
  if public.learner_has_held_coursework(p_learner_id) then
    return jsonb_build_object('erased',false,'blockedByCourseworkHold',true);
  end if;
  -- Preserve the original validation and already-erased semantics. In particular,
  -- no snapshot is removed when this is not a child with a running clock.
  if v_kind is distinct from 'child' or v_deleted is null or v_status='erased' then
    return public.purge_learner_record_internal(p_learner_id);
  end if;

  insert into public.coursework_erasure_review_assets(asset_id,learner_id,reason,offline_copy_recorded)
    select ma.id,p_learner_id,
      case when ma.purpose<>'coursework' then 'legacy_library' else 'shared_context' end,
      exists(select 1 from public.offline_downloads od where od.media_asset_id=ma.id)
    from public.media_assets ma where ma.id=any(v_assets) and (
      ma.purpose<>'coursework' or exists(select 1 from public.coursework_detach_review_assets dr where dr.asset_id=ma.id) or exists(select 1 from public.offline_downloads od where od.media_asset_id=ma.id) or exists(select 1 from public.coursework_erasure_review_assets prior where prior.asset_id=ma.id) or exists(select 1 from public.lesson_resources lr where lr.media_asset_id=ma.id) or exists (
        select 1 from public.assignment_submissions other
        where other.learner_profile_id<>p_learner_id and (
          exists(select 1 from public.assignment_submission_assets a where a.submission_id=other.id and a.media_asset_id=ma.id)
          or exists(select 1 from public.coursework_upload_declarations d where d.submission_id=other.id and d.asset_id=ma.id)
          or exists(select 1 from public.assignment_submission_revisions r where r.submission_id=other.id
                     and r.asset_ids @> jsonb_build_array(ma.id::text))
        )
      )
    ) on conflict (asset_id,learner_id) do update
      set offline_copy_recorded=public.coursework_erasure_review_assets.offline_copy_recorded or excluded.offline_copy_recorded,
          offline_copy_reviewed_at=case when excluded.offline_copy_recorded then null else public.coursework_erasure_review_assets.offline_copy_reviewed_at end;
  -- Transfer an older detach marker into the child-specific erasure register;
  -- leaving both would make each review action block the other indefinitely.
  delete from public.coursework_detach_review_assets d where d.asset_id=any(v_assets)
    and exists(select 1 from public.coursework_erasure_review_assets r where r.asset_id=d.asset_id and r.learner_id=p_learner_id);
  select count(*)::integer into v_review from public.coursework_erasure_review_assets
    where learner_id=p_learner_id;

  -- Queue exclusively attributable coursework bytes immediately. This is a
  -- tombstone and a deadline, not a verified deletion from object storage.
  perform set_config('app.media_status_transition','on',true);
  update public.media_assets ma
     set status='deleted', deleted_at=coalesce(ma.deleted_at,now()),
         purge_due_at=least(coalesce(ma.purge_due_at,now()),now())
   where ma.id=any(v_assets) and ma.purpose='coursework' and ma.purged_at is null
     and not exists (select 1 from public.coursework_erasure_review_assets x
                      where x.asset_id=ma.id);

  insert into public.child_revision_erasure_scope(transaction_id,learner_id)
    values(txid_current(),p_learner_id) on conflict do nothing;
  delete from public.assignment_submission_revisions r
   using public.assignment_submissions s
   where r.submission_id=s.id and s.learner_profile_id=p_learner_id;
  perform set_config('app.child_coursework_erasure','on',true);
  v_result := public.purge_learner_record_internal(p_learner_id);
  delete from public.child_revision_erasure_scope
   where transaction_id=txid_current() and learner_id=p_learner_id;
  perform set_config('app.child_coursework_erasure',coalesce(v_prior,''),true);
  perform set_config('app.media_status_transition',coalesce(v_media_transition,''),true);
  if v_review>0 then v_result := jsonb_set(v_result,'{nothingLeft}','false'::jsonb,true); end if;
  return v_result || jsonb_build_object('courseworkAssetsNeedingReview',v_review);
end;
$$;

