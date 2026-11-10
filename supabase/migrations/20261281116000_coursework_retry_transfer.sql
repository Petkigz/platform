-- Reissue an upload target for an existing pending declaration, without making
-- a duplicate record. This checks the uploader and learner/guardian authority
-- again and binds the requested file facts to the original declaration. The
-- returned coordinates are for server signing, not evidence that bytes exist.
create function public.retry_coursework_upload_target(
  p_asset_id uuid, p_submission_id uuid, p_mime_type text, p_byte_size bigint, p_checksum text
) returns public.media_upload_target language plpgsql security definer set search_path=public as $$
declare v_actor uuid := public.current_user_id(); v_asset public.media_assets;
        v_learner uuid; v_sub_status text; v_assignment_status text; v_declared uuid;
        v_result public.media_upload_target;
begin
  if v_actor is null then raise exception 'sign in to retry this upload' using errcode='insufficient_privilege'; end if;
  select * into v_asset from public.media_assets where id=p_asset_id for update;
  if not found or v_asset.purpose <> 'coursework' or v_asset.uploaded_by is distinct from v_actor then
    raise exception 'this pending upload is not available to you' using errcode='insufficient_privilege'; end if;
  select s.learner_profile_id,s.status,a.status,d.declared_by
    into v_learner,v_sub_status,v_assignment_status,v_declared
    from public.coursework_upload_declarations d
    join public.assignment_submissions s on s.id=d.submission_id
    join public.course_assignments a on a.id=s.assignment_id and a.deleted_at is null
   where d.asset_id=p_asset_id and d.submission_id=p_submission_id for update of s for share of a;
  if not found or v_declared is distinct from v_actor or not public.coursework_hand_in_authorized(v_learner) then
    raise exception 'this pending upload is not available to you' using errcode='insufficient_privilege'; end if;
  if v_asset.status <> 'pending' or v_asset.deleted_at is not null or v_asset.purged_at is not null
     or exists(select 1 from public.assignment_submission_assets x where x.media_asset_id=p_asset_id) then
    raise exception 'this upload is no longer pending; refresh the file list' using errcode='check_violation'; end if;
  if v_sub_status <> 'draft' or v_assignment_status <> 'open' then
    raise exception 'files can only be sent to an open draft' using errcode='check_violation'; end if;
  if (select count(*) from public.assignment_submission_assets x where x.submission_id=p_submission_id) >= public.coursework_max_files() then
    raise exception 'this assignment already has the maximum number of attached files' using errcode='program_limit_exceeded'; end if;
  if v_asset.storage_backend <> 'r2' or v_asset.byte_size is distinct from p_byte_size
     or v_asset.mime_type is distinct from lower(trim(coalesce(p_mime_type,'')))
     or v_asset.checksum is distinct from lower(trim(coalesce(p_checksum,''))) then
    raise exception 'choose the same file and file type as the original upload' using errcode='check_violation'; end if;
  v_result := (v_asset.id,v_asset.master_bucket,v_asset.master_key)::public.media_upload_target;
  return v_result;
end;
$$;
revoke all on function public.retry_coursework_upload_target(uuid,uuid,text,bigint,text) from public,anon;
grant execute on function public.retry_coursework_upload_target(uuid,uuid,text,bigint,text) to authenticated;
