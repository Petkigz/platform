-- Keep the existing authorization and response shape, but build the list once
-- instead of repeatedly concatenating a growing JSON array. The list remains a
-- single, potentially large response; this does not cap declarations, remove
-- uploads, verify storage, or solve oversized direct PUTs.
create or replace function public.assignment_submission_files_internal(p_submission_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare v_actor uuid:=public.current_user_id(); v_author uuid; v_learner uuid;
  v_may_review boolean:=false; v_out jsonb;
begin
  if v_actor is null then
    raise exception 'sign in to read a submission' using errcode='insufficient_privilege';
  end if;
  if not public.can_read_assignment_submission(p_submission_id) then
    raise exception 'that submission is not yours to read' using errcode='insufficient_privilege';
  end if;
  select ca.created_by,s.learner_profile_id into v_author,v_learner
    from public.assignment_submissions s join public.course_assignments ca on ca.id=s.assignment_id
   where s.id=p_submission_id;
  v_may_review := (public.is_privileged(v_actor) or v_author=v_actor)
    and not (public.is_own_learner_profile(v_learner) or public.is_learner_family_member(v_learner));

  with visible as (
    select asa.id as attachment_id, asa.media_asset_id as asset_id, asa.position,
           ma.display_name,ma.mime_type,ma.byte_size,ma.status,ma.created_at,
           st.decision,st.reviewed_at,0 as section
      from public.assignment_submission_assets asa
      join public.media_assets ma on ma.id=asa.media_asset_id
      left join public.coursework_file_state st on st.asset_id=asa.media_asset_id
     where asa.submission_id=p_submission_id and ma.deleted_at is null
    union all
    select null::uuid,ma.id,null::integer,ma.display_name,ma.mime_type,ma.byte_size,
           ma.status,ma.created_at,null::text,null::timestamptz,1
      from public.coursework_upload_declarations d
      join public.media_assets ma on ma.id=d.asset_id
     where d.submission_id=p_submission_id and ma.deleted_at is null
       and ma.status in ('pending','quarantined')
       and not exists(select 1 from public.assignment_submission_assets a where a.media_asset_id=ma.id)
  )
  select coalesce(jsonb_agg(
    jsonb_build_object('attachmentId',v.attachment_id,'assetId',v.asset_id,
      'name',v.display_name,'mimeType',v.mime_type,'byteSize',v.byte_size::text,
      'status',v.status,'uploadedAt',v.created_at)
    || case when v_may_review then jsonb_build_object('review',coalesce(v.decision,'none'),'reviewedAt',v.reviewed_at)
            else '{}'::jsonb end
    order by v.section,v.position nulls last,v.created_at,v.asset_id
  ),'[]'::jsonb) into v_out from visible v;
  return v_out;
end;
$$;
