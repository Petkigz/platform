-- Keep the named-owner and original account-closure behavior. This private
-- wrapper expands only the precheck: snapshots and declarations can still be
-- under hold after their current attachment has been removed.
alter function public.erase_my_account_internal(text) rename to erase_my_account_before_revision_hold_guard;
revoke all on function public.erase_my_account_before_revision_hold_guard(text) from public,anon,authenticated;
create function public.erase_my_account_internal(p_confirm text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_actor uuid:=public.current_user_id(); v_name text; v_status text; v_deleted timestamptz;
  v_families uuid[];
begin
  -- The public wrapper already locks this profile. Preserve its validation,
  -- its idempotent response and the original error for an incorrect name.
  select display_name,account_status,deleted_at into v_name,v_status,v_deleted
    from public.user_profiles where user_id=v_actor for update;
  if not found or v_deleted is not null or v_status='closed'
     or btrim(coalesce(p_confirm,''))<>btrim(v_name) then
    return public.erase_my_account_before_revision_hold_guard(p_confirm);
  end if;
  select array_agg(distinct family_id) into v_families from public.family_memberships
   where user_id=v_actor and status='active';
  perform f.id from public.families f where f.id=any(coalesce(v_families,'{}'::uuid[])) order by f.id for update;
  perform m.id from public.family_memberships m where m.family_id=any(coalesce(v_families,'{}'::uuid[])) order by m.id for update;
  perform lp.id from public.learner_profiles lp
   where lp.family_id=any(coalesce(v_families,'{}'::uuid[])) or lp.linked_user_id=v_actor order by lp.id for update;
  -- Lock submission rows before calculating the asset set. Writers cannot add a
  -- child revision or attachment during the check. Holds take asset locks; the
  -- final predicate is deliberately a new statement after acquiring them.
  perform s.id from public.assignment_submissions s join public.learner_profiles lp on lp.id=s.learner_profile_id
   where lp.family_id=any(coalesce(v_families,'{}'::uuid[])) or lp.linked_user_id=v_actor order by s.id for update of s;
  perform ma.id from public.media_assets ma where exists (
    select 1 from public.assignment_submissions s join public.learner_profiles lp on lp.id=s.learner_profile_id
    where (lp.family_id=any(coalesce(v_families,'{}'::uuid[])) or lp.linked_user_id=v_actor) and (
      exists(select 1 from public.assignment_submission_assets a where a.submission_id=s.id and a.media_asset_id=ma.id)
      or exists(select 1 from public.coursework_upload_declarations d where d.submission_id=s.id and d.asset_id=ma.id)
      or exists(select 1 from public.assignment_submission_revisions r where r.submission_id=s.id and r.asset_ids @> jsonb_build_array(ma.id::text))
    )
  ) order by ma.id for update;
  if exists(select 1 from public.learner_profiles lp
    where lp.deleted_at is null and lp.learner_type='child'
      and (lp.linked_user_id=v_actor or (
        lp.family_id=any(coalesce(v_families,'{}'::uuid[])) and not exists (
          select 1 from public.family_memberships m where m.family_id=lp.family_id
            and m.user_id<>v_actor and m.status='active')))
      and public.learner_has_held_coursework(lp.id)
  ) then
    raise exception 'this account is linked to a separate child login or held coursework that needs individual review; contact privacy@ayahspring.com to close your account'
      using errcode='check_violation';
  end if;
  return public.erase_my_account_before_revision_hold_guard(p_confirm);
end;
$$;
revoke all on function public.erase_my_account_internal(text) from public,anon,authenticated;
