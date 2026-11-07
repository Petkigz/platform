-- A legacy lesson resource can still point at an older coursework master.
-- The offline booking writer chose the first available master, returned its ID,
-- and wrote a device/download record without checking coursework provenance.
-- Preserve ordinary offline saves; reject a conflicting selection atomically.
alter function public.save_offline_lesson(uuid,text,text) rename to save_offline_lesson_before_coursework_guard;
revoke all on function public.save_offline_lesson_before_coursework_guard(uuid,text,text) from public,anon,authenticated;
create function public.save_offline_lesson(p_lesson_id uuid,p_device_key text,p_device_label text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_result jsonb; v_asset_id uuid; v_purpose text;
begin
  v_result:=public.save_offline_lesson_before_coursework_guard(p_lesson_id,p_device_key,p_device_label);
  if coalesce((v_result->>'saved')::boolean,false) and v_result->>'mediaAssetId' is not null then
    v_asset_id:=(v_result->>'mediaAssetId')::uuid;
    -- Attachment and lesson-resource writers lock this row as well. Inspect
    -- provenance in a fresh statement after waiting, not a stable snapshot.
    select purpose into v_purpose from public.media_assets where id=v_asset_id for update;
    if not found or v_purpose<>'library'
       or exists(select 1 from public.legacy_coursework_provenance where asset_id=v_asset_id)
       or exists(select 1 from public.coursework_upload_declarations where asset_id=v_asset_id)
       or exists(select 1 from public.assignment_submission_assets where media_asset_id=v_asset_id)
       or exists(select 1 from public.assignment_submission_revisions where asset_ids @> jsonb_build_array(v_asset_id::text)) then
      -- The exception rolls back the booking and device writes too. It does not
      -- disclose the coursework context to the unrelated entitled learner.
      raise exception 'this lesson cannot be saved until its media is reviewed' using errcode='check_violation';
    end if;
  end if;
  return v_result;
end;
$$;
revoke all on function public.save_offline_lesson(uuid,text,text) from public,anon;
grant execute on function public.save_offline_lesson(uuid,text,text) to authenticated;
