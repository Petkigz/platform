-- The generic media withdrawal RPC allowed any privileged staff member or the
-- uploader to tombstone private coursework, including files on safeguarding
-- hold. Until a dedicated coursework withdrawal workflow is reviewed, fail
-- closed for coursework and for historical library files used as submissions.
-- Existing objects and mixed-purpose references are not changed or deleted.
alter function public.delete_media_asset(uuid, text) rename to delete_media_asset_internal;
revoke all on function public.delete_media_asset_internal(uuid, text) from public, anon, authenticated;
create function public.delete_media_asset(p_asset_id uuid, p_reason text)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_purpose text; v_uploader uuid; v_actor uuid := public.current_user_id();
begin
  if v_actor is null then
    raise exception 'sign in to delete an upload' using errcode = 'insufficient_privilege';
  end if;
  -- Attachment and hold writers use the same asset lock. Inspect the current
  -- attachment state after obtaining it, rather than authorizing a stale row.
  select ma.purpose, ma.uploaded_by into v_purpose, v_uploader
    from public.media_assets ma where ma.id = p_asset_id for update;
  if v_purpose = 'coursework' or exists (
    select 1 from public.assignment_submission_assets asa where asa.media_asset_id = p_asset_id
  ) then
    -- An unrelated caller gets the same result as for an unknown asset; a
    -- guessed UUID must not reveal that another learner handed in a file.
    if v_uploader is distinct from v_actor and not coalesce(public.may_watch_master(p_asset_id), false) then
      if public.is_privileged(v_actor) then return false; end if;
      raise exception 'you may only delete your own uploads' using errcode = 'insufficient_privilege';
    end if;
    raise exception 'coursework cannot be withdrawn through the media library; contact privacy@ayahspring.com for review'
      using errcode = 'insufficient_privilege';
  end if;
  return public.delete_media_asset_internal(p_asset_id, p_reason);
end;
$$;
revoke all on function public.delete_media_asset(uuid, text) from public, anon;
grant execute on function public.delete_media_asset(uuid, text) to authenticated;
