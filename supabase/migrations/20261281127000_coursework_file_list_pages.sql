-- Bounded pages of file metadata for an authorized submission reader. Existing
-- all-files RPC remains for older clients. No storage keys or bytes are returned.
-- Counts and cursors are a single statement snapshot, not a multi-page snapshot.
create function public.assignment_submission_files_page(p_submission_id uuid,p_after text default null,p_limit integer default 25)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare v_actor uuid:=public.current_user_id(); v_learner uuid; v_author uuid; v_may_review boolean;
  v_section integer; v_position bigint; v_asset uuid; v_files jsonb; v_next text; v_attached integer; v_pending integer;
begin
  if v_actor is null then raise exception 'sign in to read a submission' using errcode='insufficient_privilege'; end if;
  if not public.can_read_assignment_submission(p_submission_id) then
    raise exception 'that submission is not yours to read' using errcode='insufficient_privilege'; end if;
  if p_limit is null or p_limit<1 or p_limit>50 then raise exception 'invalid file page' using errcode='invalid_parameter_value'; end if;
  if p_after is not null then
    if p_after !~* '^[01]:[0-9]{1,10}:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      raise exception 'invalid file cursor' using errcode='invalid_parameter_value'; end if;
    v_section:=split_part(p_after,':',1)::integer;
    v_position:=split_part(p_after,':',2)::bigint;
    v_asset:=split_part(p_after,':',3)::uuid;
  end if;
  select s.learner_profile_id,ca.created_by into v_learner,v_author
    from public.assignment_submissions s join public.course_assignments ca on ca.id=s.assignment_id where s.id=p_submission_id;
  v_may_review := (v_author=v_actor or (public.has_role(v_actor,'platform_admin') and exists (
    select 1 from public.safeguarding_owner so where so.singleton and so.owner_user_id=v_actor)))
    and not public.is_own_learner_profile(v_learner) and not public.is_learner_family_member(v_learner)
    and not exists(select 1 from public.guardian_relationships gr where gr.learner_profile_id=v_learner
      and gr.guardian_user_id=v_actor and gr.deleted_at is null and (gr.status='active' or gr.verified_at is not null));
  with visible as materialized (
    select a.id as attachment_id,ma.id as asset_id,a.position::bigint as position,0 as section,
      ma.display_name,ma.mime_type,ma.byte_size,ma.status,ma.created_at,st.decision,st.reviewed_at
      from public.assignment_submission_assets a join public.media_assets ma on ma.id=a.media_asset_id
      left join public.coursework_file_state st on st.asset_id=ma.id
      where a.submission_id=p_submission_id and ma.deleted_at is null
    union all
    select null::uuid,ma.id,0::bigint,1,ma.display_name,ma.mime_type,ma.byte_size,ma.status,ma.created_at,null::text,null::timestamptz
      from public.coursework_upload_declarations d join public.media_assets ma on ma.id=d.asset_id
      where d.submission_id=p_submission_id and ma.deleted_at is null and ma.status in ('pending','quarantined')
        and not exists(select 1 from public.assignment_submission_assets a where a.media_asset_id=ma.id)
  ), chosen as (
    select * from visible v where p_after is null or (v.section,v.position,v.asset_id)>(v_section,v_position,v_asset)
     order by v.section,v.position,v.asset_id limit p_limit+1
  ), numbered as (
    select *,row_number() over(order by section,position,asset_id) as n from chosen
  )
  select coalesce((select jsonb_agg(jsonb_build_object('attachmentId',x.attachment_id,'assetId',x.asset_id,
        'name',x.display_name,'mimeType',x.mime_type,'byteSize',x.byte_size::text,'status',x.status,'uploadedAt',x.created_at)
        || case when coalesce(v_may_review,false) then jsonb_build_object('review',coalesce(x.decision,'none'),'reviewedAt',x.reviewed_at)
                else '{}'::jsonb end order by x.section,x.position,x.asset_id)
      from numbered x where x.n<=p_limit),'[]'::jsonb),
    case when (select count(*) from numbered)>p_limit then
      (select x.section::text||':'||x.position::text||':'||x.asset_id::text from numbered x where x.n=p_limit) else null end,
    (select count(*)::int from visible where section=0),
    (select count(*)::int from visible where section=1)
  into v_files,v_next,v_attached,v_pending;
  return jsonb_build_object('files',v_files,'nextCursor',v_next,'attachedCount',v_attached,'pendingCount',v_pending);
end;
$$;
revoke all on function public.assignment_submission_files_page(uuid,text,integer) from public,anon;
grant execute on function public.assignment_submission_files_page(uuid,text,integer) to authenticated;
