-- Preserve the original owner-only RPC for older clients. The visual register
-- needs a stable page cursor so the first 200 files cannot hide later ones.
create function public.coursework_review_queue_page(
  p_after_reviewed boolean default null,p_after_attached timestamptz default null,
  p_after_asset uuid default null,p_limit integer default 50
) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare v_out jsonb;
begin
  perform public.require_coursework_retention_owner();
  if num_nonnulls(p_after_reviewed,p_after_attached,p_after_asset) not in (0,3) then
    raise exception 'all review cursor values are required' using errcode='invalid_parameter_value';
  end if;
  if p_limit is null or p_limit<1 or p_limit>100 then
    raise exception 'review page limit must be between 1 and 100' using errcode='invalid_parameter_value';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'assetId',st.asset_id,'submissionId',st.submission_id,'courseTitle',st.course_title,
    'learnerName',st.learner_name,'fileName',st.file_name,'mimeType',st.mime_type,
    'byteSize',st.byte_size::text,'attachedAt',st.attached_at,'review',coalesce(st.decision,'none'),
    'reviewedAt',st.reviewed_at,'reviewerName',st.reviewer_name
  ) order by (st.decision is not null),st.attached_at,st.asset_id),'[]'::jsonb) into v_out
  from (select * from public.coursework_file_state v
    where v.deleted_at is null and v.status='available'
      and (p_after_attached is null or ((v.decision is not null),v.attached_at,v.asset_id) >
           (p_after_reviewed,p_after_attached,p_after_asset))
    order by (v.decision is not null),v.attached_at,v.asset_id limit p_limit) st;
  return v_out;
end;
$$;
revoke all on function public.coursework_review_queue_page(boolean,timestamptz,uuid,integer) from public,anon;
grant execute on function public.coursework_review_queue_page(boolean,timestamptz,uuid,integer) to authenticated;
