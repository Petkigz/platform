-- Staff may manage library media, but an aggregate per person that includes
-- private coursework reveals who submitted files and their number/size. Keep
-- the existing quota calculation unchanged; this overview is the library
-- portion only, including historical library rows only while not attached to
-- a submission. Legacy files that lost attribution cannot be classified here.
create or replace function public.media_storage_overview(p_limit integer default 50)
returns table (
  uploader_id uuid,
  display_name text,
  files integer,
  bytes bigint,
  quota_bytes bigint,
  used_percent integer,
  over_quota boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_enforced boolean := public.setting_bool('platform.cost_controls', false);
  v_gb integer := public.setting_int('media.upload_quota_gb_per_teacher', 50);
  v_quota bigint;
begin
  if not public.is_privileged(public.current_user_id()) then
    raise exception 'only platform staff may read storage use across teachers'
      using errcode = 'insufficient_privilege';
  end if;

  if p_limit is null or p_limit < 1 or p_limit > 1000 then
    raise exception 'ask for between 1 and 1000 uploaders'
      using errcode = 'invalid_parameter_value';
  end if;

  -- A quota of null means "not enforced", which is a different fact from
  -- "over quota". The screen renders null as no cap rather than as 100%.
  v_quota := case when v_enforced then v_gb::bigint * 1024 * 1024 * 1024 else null end;

  return query
    select ma.uploaded_by,
           coalesce(up.display_name, 'Deleted account'),
           count(*)::integer,
           coalesce(sum(ma.byte_size), 0)::bigint,
           v_quota,
           case
             when v_quota is null then null
             when v_quota = 0 then 100
             else least(999, floor(coalesce(sum(ma.byte_size), 0)::numeric * 100 / v_quota))::integer
           end,
           case when v_quota is null then false
                else coalesce(sum(ma.byte_size), 0) > v_quota end
      from public.media_assets ma
      left join public.user_profiles up on up.user_id = ma.uploaded_by
     where ma.deleted_at is null
       and ma.status <> 'deleted'
       and public.is_library_delivery_asset(ma.id)
     group by ma.uploaded_by, up.display_name
     order by coalesce(sum(ma.byte_size), 0) desc
     limit p_limit;
end;
$$;

comment on function public.media_storage_overview(integer) is
  'Staff overview of library master bytes only, not total quota consumption. Coursework and currently attached legacy files are excluded. The actual allowance still counts all applicable masters.';
