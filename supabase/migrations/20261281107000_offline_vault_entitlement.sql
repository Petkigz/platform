-- Enforce live entitlement at save, URL and vault-key time; CHECK constraints
-- do not automatically re-evaluate when their timestamps pass.
create or replace function public.may_download_lesson(p_lesson_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_lesson_id is not null
     and public.current_user_id() is not null
     and exists (
    select 1
      from public.lessons l
      join public.course_sections cs on cs.id = l.section_id
      join public.learner_profiles lp on lp.deleted_at is null
     where l.id = p_lesson_id
       and (lp.linked_user_id = public.current_user_id()
            or public.is_learner_family_member(lp.id))

       -- Entitlement to the version, deliberately NOT can_access_lesson().
       -- That function also returns true for a free preview while
       -- learning.previews is on, and a sample is free to watch but not free
       -- to keep: otherwise any lesson an author marked as a preview could be
       -- downloaded by anyone, and the paid feature would have a hole in it
       -- the size of a preview. The same reasoning is why this is keyed per
       -- learner profile rather than per session -- access and the feature
       -- have to belong to the same learner, not to two different members of
       -- one family.
       and public.can_access_course_version(lp.id, cs.course_version_id)

       -- And the plan actually being paid for has to carry the feature. The
       -- grant is bounded by the paid period, so a lapsed subscription stops
       -- saving without anything being revoked by hand.
       and exists (
             select 1
               from public.entitlement_grants eg
              where eg.learner_profile_id = lp.id
                and eg.scope_type = 'feature'
                and eg.feature_code = 'offline_downloads'
                -- CHECK constraints are evaluated on writes, not as time
                -- passes. Recheck the end of the grant at access time.
                and eg.status = 'active'
                and eg.effective_from <= now()
                and (eg.effective_until is null or eg.effective_until>now())
           )

       -- And there has to be something first-party to save. A hotlinked
       -- external_url belongs to somebody else's server and cannot be
       -- downloaded at all; media that is still pending or quarantined must
       -- never be handed out, which is the whole reason that state machine
       -- exists. Verified first-party media, or nothing.
       and exists (
             select 1
               from public.lesson_resources lr
               join public.media_assets ma on ma.id = lr.media_asset_id
              where lr.lesson_id = l.id
                and ma.status = 'available'
           )
  );
$$;


create or replace function public.lesson_download_standing(p_lesson_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor   uuid := public.current_user_id();
  v_version uuid;
  v_entitled boolean := false;
  v_granted  boolean := false;
  v_media    boolean := false;
  v_enabled  boolean;
  v_reason   text;
  v_message  text;
begin
  v_enabled := public.setting_bool('learning.offline', false);

  if p_lesson_id is null then
    return jsonb_build_object('enabled', v_enabled, 'allowed', false,
      'reason', 'no_lesson', 'needsPlus', false,
      'message', 'There is no lesson to save.');
  end if;

  select cs.course_version_id into v_version
    from public.lessons l
    join public.course_sections cs on cs.id = l.section_id
   where l.id = p_lesson_id;

  if v_version is null then
    return jsonb_build_object('enabled', v_enabled, 'allowed', false,
      'reason', 'no_lesson', 'needsPlus', false,
      'message', 'There is no lesson to save.');
  end if;

  -- 5. Something first-party and verified to save. A hotlinked external_url
  -- belongs to somebody else's server, and pending or quarantined media must
  -- never be handed out — the same rule `may_download_lesson()` applies.
  select exists (
    select 1
      from public.lesson_resources lr
      join public.media_assets ma on ma.id = lr.media_asset_id
     where lr.lesson_id = p_lesson_id
       and ma.status = 'available')
    into v_media;

  if v_actor is not null then
    -- 3 and 4, over every profile this person may act for. The entitlement and
    -- the grant must belong to the *same* learner, which is why they are one
    -- query rather than two: a family must not combine one member's course with
    -- another's plan.
    select bool_or(public.can_access_course_version(lp.id, v_version)),
           bool_or(public.can_access_course_version(lp.id, v_version)
                   and exists (
                     select 1
                       from public.entitlement_grants eg
                      where eg.learner_profile_id = lp.id
                        and eg.scope_type = 'feature'
                        and eg.feature_code = 'offline_downloads'
                        and eg.status = 'active'
                        and eg.effective_from <= now()
                        and (eg.effective_until is null or eg.effective_until>now())))
      into v_entitled, v_granted
      from public.learner_profiles lp
     where lp.deleted_at is null
       and (lp.linked_user_id = v_actor or public.is_learner_family_member(lp.id));

    v_entitled := coalesce(v_entitled, false);
    v_granted  := coalesce(v_granted, false);
  end if;

  v_reason := case
    when v_actor is null      then 'signed_out'
    when not v_enabled        then 'feature_off'
    when not v_entitled       then 'not_entitled'
    when not v_granted        then 'needs_plus'
    when not v_media          then 'no_media'
    else 'allowed'
  end;

  v_message := case v_reason
    when 'signed_out'   then 'Sign in to save a lesson on this device.'
    when 'feature_off'  then 'Saving lessons on a device is not switched on for this platform yet.'
    when 'not_entitled' then 'Watching this lesson does not include keeping it. Saving starts once you are enrolled in the course.'
    when 'needs_plus'   then 'Saving a lesson on this device is a Plus feature. Your plan does not include it yet.'
    when 'no_media'     then 'This lesson has no verified video to save yet.'
    else 'You can save this lesson on this device.'
  end;

  return jsonb_build_object(
    'enabled', v_enabled,
    'allowed', v_reason = 'allowed',
    'reason', v_reason,
    'needsPlus', v_reason = 'needs_plus',
    'message', v_message);
end;
$$;


create or replace function public.offline_booking_matches_resource(p_download_id uuid,p_lesson_id uuid,p_resource_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select public.current_user_id() is not null and public.setting_bool('learning.offline',false)
    and public.may_download_lesson(p_lesson_id) and exists (
      select 1 from public.offline_downloads od
      join public.offline_devices d on d.id=od.device_id and d.learner_profile_id=od.learner_profile_id
      join public.learner_profiles lp on lp.id=od.learner_profile_id
      join public.lessons l on l.id=od.lesson_id
      join public.course_sections cs on cs.id=l.section_id
      join public.lesson_resources lr on lr.id=p_resource_id and lr.lesson_id=l.id and lr.media_asset_id=od.media_asset_id
      join public.media_assets ma on ma.id=lr.media_asset_id
      where od.id=p_download_id and od.lesson_id=p_lesson_id and od.removed_at is null and od.expires_at>now()
        and d.revoked_at is null and lp.deleted_at is null and lp.status='active'
        and (lp.linked_user_id=public.current_user_id() or public.is_learner_family_member(lp.id))
        and public.can_access_course_version(lp.id,cs.course_version_id)
        and exists(select 1 from public.entitlement_grants eg where eg.learner_profile_id=lp.id
          and eg.scope_type='feature' and eg.feature_code='offline_downloads' and eg.status='active' and eg.effective_from<=now() and (eg.effective_until is null or eg.effective_until>now()))
        and ma.purpose='library' and ma.status='available' and ma.deleted_at is null
        and not exists(select 1 from public.legacy_coursework_provenance p where p.asset_id=ma.id)
        and not exists(select 1 from public.coursework_upload_declarations a where a.asset_id=ma.id)
        and not exists(select 1 from public.assignment_submission_assets a where a.media_asset_id=ma.id)
        and not exists(select 1 from public.assignment_submission_revisions r where r.asset_ids @> jsonb_build_array(ma.id::text))
    );
$$;
revoke all on function public.offline_booking_matches_resource(uuid,uuid,uuid) from public,anon;
grant execute on function public.offline_booking_matches_resource(uuid,uuid,uuid) to authenticated;


-- Returning a vault key is a separate access decision from listing a saved
-- record. Privileged staff read policies alone do not give them another
-- learner's decryption key. Existing valid saves remain usable when an operator
-- turns off new bookings, provided their own entitlement and expiry remain live.
create function public.offline_save_key_allowed(p_download_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select public.current_user_id() is not null and exists (
    select 1 from public.offline_downloads od
    join public.offline_devices d on d.id=od.device_id and d.learner_profile_id=od.learner_profile_id
    join public.learner_profiles lp on lp.id=od.learner_profile_id
    join public.lessons l on l.id=od.lesson_id
    join public.course_sections cs on cs.id=l.section_id
    join public.media_assets ma on ma.id=od.media_asset_id
    where od.id=p_download_id and od.removed_at is null and od.expires_at>now() and d.revoked_at is null
      and lp.deleted_at is null and lp.status='active'
      and (lp.linked_user_id=public.current_user_id() or public.is_learner_family_member(lp.id))
      and public.can_access_course_version(lp.id,cs.course_version_id)
      and exists(select 1 from public.entitlement_grants eg where eg.learner_profile_id=lp.id
        and eg.scope_type='feature' and eg.feature_code='offline_downloads' and eg.status='active'
        and eg.effective_from<=now() and (eg.effective_until is null or eg.effective_until>now()))
      and ma.purpose='library' and ma.status='available' and ma.deleted_at is null
      and not exists(select 1 from public.legacy_coursework_provenance p where p.asset_id=ma.id)
      and not exists(select 1 from public.coursework_upload_declarations d where d.asset_id=ma.id)
      and not exists(select 1 from public.assignment_submission_assets a where a.media_asset_id=ma.id)
      and not exists(select 1 from public.assignment_submission_revisions r where r.asset_ids @> jsonb_build_array(ma.id::text))
      -- One booking/key can have encrypted an earlier resource. A later
      -- rebooking must not make a known prior coursework copy openable.
      and not exists(select 1 from public.offline_download_asset_history oh
        join public.media_assets prior on prior.id=oh.asset_id where oh.download_id=od.id and (
          prior.purpose<>'library'
          or exists(select 1 from public.legacy_coursework_provenance p where p.asset_id=prior.id)
          or exists(select 1 from public.coursework_upload_declarations a where a.asset_id=prior.id)
          or exists(select 1 from public.assignment_submission_assets a where a.media_asset_id=prior.id)
          or exists(select 1 from public.assignment_submission_revisions r where r.asset_ids @> jsonb_build_array(prior.id::text))))
  );
$$;
revoke all on function public.offline_save_key_allowed(uuid) from public,anon;
grant execute on function public.offline_save_key_allowed(uuid) to authenticated;
