-- Keep a quarantined unconfirmed upload visible without changing the existing
-- submission and review-privacy wrappers or opening the file to new readers.
create or replace function public.assignment_submission_files_internal(p_submission_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_out        jsonb := '[]'::jsonb;
  v_row        record;
  v_actor      uuid := public.current_user_id();
  v_may_review boolean := false;
  v_author     uuid;
  v_learner    uuid;
begin
  if v_actor is null then
    raise exception 'sign in to read a submission'
      using errcode = 'insufficient_privilege';
  end if;

  if not public.can_read_assignment_submission(p_submission_id) then
    raise exception 'that submission is not yours to read'
      using errcode = 'insufficient_privilege';
  end if;

  select ca.created_by, s.learner_profile_id
    into v_author, v_learner
    from public.assignment_submissions s
    join public.course_assignments ca on ca.id = s.assignment_id
   where s.id = p_submission_id;

  v_may_review := (public.is_privileged(v_actor) or v_author = v_actor)
                  and not (public.is_own_learner_profile(v_learner)
                           or public.is_learner_family_member(v_learner));

  for v_row in
    -- Handed in, in the order they were attached.
    select asa.id, asa.media_asset_id, asa.position, ma.display_name,
           ma.mime_type, ma.byte_size, ma.status, ma.created_at,
           st.decision, st.reviewed_at
      from public.assignment_submission_assets asa
      join public.media_assets ma on ma.id = asa.media_asset_id
      left join public.coursework_file_state st on st.asset_id = asa.media_asset_id
     where asa.submission_id = p_submission_id
       and ma.deleted_at is null

    union all

    -- An unattached file can be pending or held for review. Both must remain
    -- visible to an authorized submission reader; a quarantine must not look
    -- like a vanished upload. Do not duplicate attached quarantined files.
    select null::uuid, ma.id, 0, ma.display_name,
           ma.mime_type, ma.byte_size, ma.status, ma.created_at,
           null::text, null::timestamptz
      from public.coursework_upload_declarations d
      join public.media_assets ma on ma.id = d.asset_id
     where d.submission_id = p_submission_id
       and ma.deleted_at is null
       and ma.status in ('pending','quarantined')
       and not exists (select 1 from public.assignment_submission_assets already
                        where already.media_asset_id = ma.id)
  loop
    v_out := v_out || (jsonb_build_object(
      'attachmentId', case when v_row.id is null then null else v_row.id end,
      'assetId',      v_row.media_asset_id,
      'name',         v_row.display_name,
      'mimeType',     v_row.mime_type,
      'byteSize',     v_row.byte_size::text,
      'status',       v_row.status,
      'uploadedAt',   v_row.created_at
    ) || case when v_may_review then jsonb_build_object(
      'review',     coalesce(v_row.decision, 'none'),
      'reviewedAt', v_row.reviewed_at
    ) else '{}'::jsonb end);
  end loop;

  return v_out;
end;
$$;
