-- An earlier child's unresolved exception must remain protected when another
-- child using the same file is later purged. Record the second child's context,
-- preserve the object and keep both receipts honest until individual review.
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
    );
  perform ma.id from public.media_assets ma where ma.id=any(v_assets) order by ma.id for update;
  if public.learner_has_held_coursework(p_learner_id) then
    return jsonb_build_object('erased',false,'blockedByCourseworkHold',true);
  end if;
  -- Preserve the original validation and already-erased semantics. In particular,
  -- no snapshot is removed when this is not a child with a running clock.
  if v_kind is distinct from 'child' or v_deleted is null or v_status='erased' then
    return public.purge_learner_record_internal(p_learner_id);
  end if;

  insert into public.coursework_erasure_review_assets(asset_id,learner_id,reason)
    select ma.id,p_learner_id,
      case when ma.purpose<>'coursework' then 'legacy_library' else 'shared_context' end
    from public.media_assets ma where ma.id=any(v_assets) and (
      ma.purpose<>'coursework' or exists(select 1 from public.coursework_erasure_review_assets prior where prior.asset_id=ma.id) or exists(select 1 from public.lesson_resources lr where lr.media_asset_id=ma.id) or exists (
        select 1 from public.assignment_submissions other
        where other.learner_profile_id<>p_learner_id and (
          exists(select 1 from public.assignment_submission_assets a where a.submission_id=other.id and a.media_asset_id=ma.id)
          or exists(select 1 from public.coursework_upload_declarations d where d.submission_id=other.id and d.asset_id=ma.id)
          or exists(select 1 from public.assignment_submission_revisions r where r.submission_id=other.id
                     and r.asset_ids @> jsonb_build_array(ma.id::text))
        )
      )
    ) on conflict (asset_id,learner_id) do nothing;
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

create or replace function public.retire_coursework_file_on_detach()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if exists(select 1 from public.assignment_submissions where id=old.submission_id)
    or (exists(select 1 from public.child_revision_erasure_scope s where s.transaction_id=txid_current())
      and exists(select 1 from public.coursework_erasure_review_assets r where r.asset_id=old.media_asset_id))
  then return old; end if;
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

