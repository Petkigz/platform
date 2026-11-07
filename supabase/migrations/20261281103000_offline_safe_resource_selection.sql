-- Select an eligible ordinary resource without letting an earlier mixed-use
-- resource unnecessarily disable the rest of the lesson. The outer wrapper
-- still locks and rechecks the selected master before returning.
-- Skip a private first resource when another ordinary lesson file is available.
create or replace function public.save_offline_lesson_before_coursework_guard(
  p_lesson_id    uuid,
  p_device_key   text,
  p_device_label text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor      uuid := public.current_user_id();
  v_learner    uuid;
  v_device     uuid;
  v_cap        integer;
  v_days       integer;
  v_active     integer;
  v_download   public.offline_downloads;
  v_asset      uuid;
  v_title      text;
begin
  if v_actor is null then
    raise exception 'sign in to save a lesson'
      using errcode = 'insufficient_privilege';
  end if;

  if p_device_key is null or p_device_key !~ '^[A-Za-z0-9_-]{16,64}$' then
    raise exception 'this device could not be identified; the app generates that key on first run'
      using errcode = 'invalid_parameter_value';
  end if;

  if not public.setting_bool('learning.offline', false) then
    return jsonb_build_object(
      'saved', false,
      'reason', 'feature_off',
      'message', 'saving lessons for offline use is not open yet'
    );
  end if;

  -- The predicate that already existed, unchanged. A Plus plan, a live grant,
  -- an entitled version and verified first-party media — all four, or no save.
  if not public.may_download_lesson(p_lesson_id) then
    return jsonb_build_object(
      'saved', false,
      'reason', 'not_entitled',
      'message', 'saving a lesson needs an active Plus plan covering this course'
    );
  end if;

  -- The learner the save belongs to: this account's own profile, or a child
  -- whose family this account is an active member of. Deliberately the same
  -- shape `may_download_lesson()` accepts, so the record cannot name a learner
  -- the predicate would not have allowed.
  select lp.id
    into v_learner
    from public.lesson_resources lr
    join public.lessons l on l.id = lr.lesson_id
    join public.course_sections cs on cs.id = l.section_id
    join public.learner_profiles lp on lp.deleted_at is null
   where l.id = p_lesson_id
     and (lp.linked_user_id = v_actor or public.is_learner_family_member(lp.id))
     and lp.status = 'active'
   order by (lp.linked_user_id = v_actor) desc
   limit 1;

  if v_learner is null then
    return jsonb_build_object(
      'saved', false,
      'reason', 'no_learner',
      'message', 'there is no learner on this account to keep the lesson for'
    );
  end if;

  select value_text::integer into v_cap
    from public.platform_settings where key = 'learning.offline_max_devices';
  select value_text::integer into v_days
    from public.platform_settings where key = 'learning.offline_expiry_days';

  v_cap  := coalesce(v_cap, 3);
  v_days := coalesce(v_days, 30);

  -- The cap is checked BEFORE the device is registered. Registering first and
  -- refusing after would leave an empty device row behind on every refusal, which
  -- the learner would then see in their own list and could not explain.
  select d.id into v_device
    from public.offline_devices d
   where d.learner_profile_id = v_learner
     and d.device_key = p_device_key;

  -- A device counts against the cap only while it holds a save that has not been
  -- removed and has not expired. An old phone with nothing on it is not a slot.
  select count(distinct d.id)::integer
    into v_active
    from public.offline_devices d
    join public.offline_downloads od on od.device_id = d.id
   where d.learner_profile_id = v_learner
     and d.revoked_at is null
     and od.removed_at is null
     and od.expires_at > now()
     and (v_device is null or d.id <> v_device);

  if v_active >= v_cap then
    return jsonb_build_object(
      'saved', false,
      'reason', 'device_limit',
      'cap', v_cap,
      'message', format(
        'this lesson would be on more than %s devices; remove one first', v_cap)
    );
  end if;

  -- Registered after the check. A returning device is not a new one, and a
  -- revoked device that comes back is re-registered rather than refused: the
  -- learner removed it and they are entitled.
  insert into public.offline_devices (learner_profile_id, device_key, label)
  values (v_learner, p_device_key, nullif(btrim(coalesce(p_device_label, '')), ''))
  on conflict (learner_profile_id, device_key) do update
    set last_seen_at = now(),
        revoked_at = null,
        label = coalesce(excluded.label, public.offline_devices.label)
  returning id into v_device;

  select ma.id into v_asset
    from public.lesson_resources lr
    join public.media_assets ma on ma.id = lr.media_asset_id
   where lr.lesson_id = p_lesson_id
     and ma.status = 'available' and ma.purpose='library'
     and not exists(select 1 from public.legacy_coursework_provenance p where p.asset_id=ma.id)
     and not exists(select 1 from public.coursework_upload_declarations d where d.asset_id=ma.id)
     and not exists(select 1 from public.assignment_submission_assets a where a.media_asset_id=ma.id)
     and not exists(select 1 from public.assignment_submission_revisions r where r.asset_ids @> jsonb_build_array(ma.id::text))
   order by lr.position
   limit 1;

  if v_asset is null then
    raise exception 'this lesson cannot be saved until its media is reviewed' using errcode='check_violation';
  end if;

  select l.title into v_title from public.lessons l where l.id = p_lesson_id;

  -- Re-saving refreshes the clock rather than creating a second row: a lesson is
  -- on a device or it is not.
  insert into public.offline_downloads
    (device_id, learner_profile_id, lesson_id, media_asset_id, expires_at)
  values
    (v_device, v_learner, p_lesson_id, v_asset, now() + make_interval(days => v_days))
  on conflict (device_id, lesson_id) do update
    set expires_at = now() + make_interval(days => v_days),
        removed_at = null,
        saved_at = now(),
        media_asset_id = excluded.media_asset_id
  returning * into v_download;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'learning.offline_lesson_saved', 'lesson', p_lesson_id,
          jsonb_build_object('learnerProfileId', v_learner, 'deviceId', v_device,
                             'expiresAt', v_download.expires_at));

  return jsonb_build_object(
    'saved', true,
    'downloadId', v_download.id,
    'learnerProfileId', v_learner,
    'lessonId', p_lesson_id,
    'title', v_title,
    'mediaAssetId', v_asset,
    'expiresAt', v_download.expires_at,
    'days', v_days
  );
end;
$$;


