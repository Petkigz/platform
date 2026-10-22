-- What the quota is doing, on the screen of the person it applies to.
--
-- `media_upload_allowance()` already refuses an upload that would not fit, and
-- that is the safety. What was missing is the *meter*: a teacher could not see
-- how much of their 50 GB they were using until the moment an upload bounced,
-- which turns a generous allowance into a surprise. A limit nobody can see is
-- felt as an outage.
--
-- Two readers, and they are different questions:
--
--   `my_media_storage()` — the caller's own bytes, by status, with the quota
--   beside it. Shown on `/teach/media`.
--
--   `media_storage_overview()` — staff only: who is storing what, biggest
--   first, with each person's share of the quota. The dashboard version of the
--   same fact, because the owner runs the bill.
--
-- Both count exactly what the enforcement counts — masters, not renditions,
-- soft-deleted excluded, quarantined and pending included — and both read the
-- same `media_storage_used()`/`media_upload_allowance()` they already trust,
-- so the meter cannot disagree with the refusal. A second definition of "used"
-- is how a screen ends up telling a teacher they have room that the writer then
-- refuses.

-- ---------------------------------------------------------------------------
-- one teacher's own number
-- ---------------------------------------------------------------------------
create or replace function public.my_media_storage()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
  v_allow jsonb;
  v_by_status jsonb;
  v_files integer;
begin
  if v_actor is null then
    raise exception 'media:not_signed_in'
      using errcode = 'insufficient_privilege';
  end if;

  -- The same function the upload route calls, with nothing declared. If the
  -- allowance changes shape, this screen changes with it.
  v_allow := public.media_upload_allowance(0);

  select coalesce(jsonb_agg(jsonb_build_object(
           'status', s.status, 'files', s.files, 'bytes', s.bytes::text)
           order by s.bytes desc), '[]'::jsonb),
         coalesce(sum(s.files), 0)::integer
    into v_by_status, v_files
    from (
      select ma.status,
             count(*) as files,
             coalesce(sum(ma.byte_size), 0) as bytes
        from public.media_assets ma
       where ma.uploaded_by = v_actor
         and ma.deleted_at is null
         and ma.status <> 'deleted'
       group by ma.status
    ) s;

  return v_allow || jsonb_build_object(
    'fileCount', v_files,
    'byStatus', v_by_status);
end;
$$;

revoke all on function public.my_media_storage() from public, anon;
grant execute on function public.my_media_storage() to authenticated;

comment on function public.my_media_storage() is
  'The caller''s own master bytes, broken down by asset status, with the quota '
  'and remaining space from media_upload_allowance(). The meter and the refusal '
  'are the same numbers.';

-- ---------------------------------------------------------------------------
-- what the whole platform is storing, by teacher
-- ---------------------------------------------------------------------------
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
     group by ma.uploaded_by, up.display_name
     order by coalesce(sum(ma.byte_size), 0) desc
     limit p_limit;
end;
$$;

revoke all on function public.media_storage_overview(integer) from public, anon;
grant execute on function public.media_storage_overview(integer) to authenticated;

comment on function public.media_storage_overview(integer) is
  'Master bytes per uploader, biggest first, with each one''s share of the '
  'teacher quota. Staff only. quota_bytes and used_percent are null while '
  'platform.cost_controls is off, because the quota is then not enforced and '
  '"0%" would be a lie.';
