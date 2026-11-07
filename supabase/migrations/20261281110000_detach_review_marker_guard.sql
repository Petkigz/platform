-- A later ordinary cascade must not bypass a prior unresolved detach review.
create or replace function public.retire_coursework_file_on_detach()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if exists(select 1 from public.assignment_submissions where id=old.submission_id)
    or exists(select 1 from public.coursework_erasure_review_assets r where r.asset_id=old.media_asset_id)
    or exists(select 1 from public.coursework_detach_review_assets r where r.asset_id=old.media_asset_id)
  then return old; end if;
  -- The parent is gone, but the same historical file can still serve another
  -- submission, a lesson, an offline booking or a prior child-erasure review.
  -- Lock before the fresh checks, as the other writers lock this asset too.
  perform 1 from public.media_assets where id=old.media_asset_id for update;
  -- A concurrent review could have committed while this transaction waited.
  if exists(select 1 from public.coursework_erasure_review_assets r where r.asset_id=old.media_asset_id)
    or exists(select 1 from public.coursework_detach_review_assets r where r.asset_id=old.media_asset_id)
  then return old; end if;
  if not exists(select 1 from public.child_revision_erasure_scope s where s.transaction_id=txid_current())
     and exists(select 1 from public.media_assets ma where ma.id=old.media_asset_id and ma.purpose='coursework')
     and (exists(select 1 from public.assignment_submission_assets a where a.media_asset_id=old.media_asset_id and a.submission_id<>old.submission_id)
       or exists(select 1 from public.coursework_upload_declarations d where d.asset_id=old.media_asset_id and d.submission_id<>old.submission_id)
       or exists(select 1 from public.assignment_submission_revisions r where r.submission_id<>old.submission_id and r.asset_ids @> jsonb_build_array(old.media_asset_id::text))
       or exists(select 1 from public.lesson_resources lr where lr.media_asset_id=old.media_asset_id)
       or (exists(select 1 from public.offline_downloads od where od.media_asset_id=old.media_asset_id) or exists(select 1 from public.offline_download_asset_history oh where oh.asset_id=old.media_asset_id))) then
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
