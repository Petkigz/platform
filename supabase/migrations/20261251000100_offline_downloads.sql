-- Downloads that live in the app and nowhere else.
-- Decided 2026-10-22:
--
--   "offline downloads work like youtube downloads: they only exist in the app
--    locally but not in their file manager, and a user has to be subscribed to a
--    plus plan — a plan on top of the basic plan with more features, more like
--    the vip package."
--
-- Three things follow, and only the first existed.
--
--   1. THE PLAN. `may_download_lesson()` has required an `offline_downloads`
--      feature grant since 2026-10-20, and a Plus-tier plan carrying it while a
--      Basic one does not. What was missing is that a tier is not a real column:
--      nothing says which plan is the VIP one, so no screen can show two shelves
--      and no rule can say "a Plus plan, at least".
--
--   2. THE BOOK. A save has to be a record: which lesson, which device, when it
--      expires. Without it a subscription can lapse and a downloaded course keeps
--      playing forever, and the number of devices a person uses is unknowable.
--
--   3. THE EXPIRY AND THE DEVICE CAP. Both were named as open in that migration
--      and are settled here by the owner's answer: a saved lesson is a
--      *subscription* artefact, so it lapses with the subscription, and a device
--      is a named thing with a cap.
--
-- WHY "IT LIVES IN THE APP" IS A LAYOUT, NOT A SECURITY CLAIM
-- ----------------------------------------------------------
-- Nothing can guarantee that bytes handed to a browser stay out of its file
-- manager: a determined person can always save a stream. What the platform can
-- do, and does here, is make the app the only supported place they exist —
-- stored in IndexedDB under a keyed record, never written to the Downloads
-- folder, never returned by the download route as a file, and unplayable once
-- the record expires or the subscription lapses. The honest sentence is on the
-- screen: this keeps a lesson on this device, it is not a copy you own.

-- The two open questions this flag was blocked on are answered today — device
-- limits and expiry — and the record that honours them is built below. So the
-- switch stops being a deploy and becomes the owner's, the same promotion
-- `delivery.live_classes` got for the same reason.
update public.platform_settings
   set gate_type = 'admin',
       description = 'Saving a lesson to a device, inside the app, for a Plus plan.',
       preconditions = 'A Plus plan whose live version carries offline_downloads, and verified first-party media. learning.offline_max_devices and learning.offline_expiry_days decide the cap and the clock. Nothing is written to the file manager: the bytes live in the app''s own storage.'
 where key = 'learning.offline';

-- ---------------------------------------------------------------------------
-- the tier
-- ---------------------------------------------------------------------------
alter table public.plans
  add column if not exists tier text not null default 'basic'
    check (tier in ('basic', 'plus'));

comment on column public.plans.tier is
  'basic or plus. A tier is a shelf, not a permission: what a plan actually '
  'grants is its version''s entitlement rows. Downloading requires a plan whose '
  'tier is plus AND whose live version carries the offline_downloads feature, '
  'so neither column alone can hand out the feature by accident.';

-- Deliberately NOT unique per tier. A tier is a shelf, not a plan: a market may
-- sell two Basic plans at different prices, and two Plus plans for two regions.
-- What makes a plan the VIP one is the tier *and* the feature grant its live
-- version carries, and neither is improved by forbidding a second row.
create index if not exists plans_tier_live_idx
  on public.plans (tier)
  where status = 'active' and deleted_at is null;

-- ---------------------------------------------------------------------------
-- the limits, as settings the owner controls
-- ---------------------------------------------------------------------------
insert into public.platform_settings (key, value_type, value_text, gate_type, description, preconditions)
values
  ('learning.offline_max_devices', 'integer', '3', 'admin',
   'How many devices one learner may keep downloads on at once. Adding a fourth refuses until one is removed.',
   null),
  ('learning.offline_expiry_days', 'integer', '30', 'admin',
   'How long a saved lesson stays playable before the app asks the learner to refresh it. A saved lesson is a subscription artefact, not a purchase.',
   null)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- devices
-- ---------------------------------------------------------------------------
create table if not exists public.offline_devices (
  id uuid primary key default gen_random_uuid(),

  learner_profile_id uuid not null
    references public.learner_profiles (id) on delete cascade,

  -- A random identifier the app generates on first run and keeps in local
  -- storage. Not a fingerprint: the platform does not want to know what the
  -- hardware is, only that this is one device and that is another.
  device_key text not null check (device_key ~ '^[A-Za-z0-9_-]{16,64}$'),

  -- What the learner calls it, so "remove a device" is a choice they can make.
  label text check (label is null or length(btrim(label)) between 1 and 60),

  first_seen_at timestamptz not null default now(),
  last_seen_at  timestamptz not null default now(),
  revoked_at    timestamptz,

  unique (learner_profile_id, device_key)
);

create index if not exists offline_devices_learner_idx
  on public.offline_devices (learner_profile_id)
  where revoked_at is null;

-- ---------------------------------------------------------------------------
-- the book of saves
-- ---------------------------------------------------------------------------
create table if not exists public.offline_downloads (
  id uuid primary key default gen_random_uuid(),

  device_id uuid not null references public.offline_devices (id) on delete cascade,
  learner_profile_id uuid not null references public.learner_profiles (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,

  -- The resource the bytes came from, so a republished lesson can be recognised
  -- as a different thing rather than silently serving the old file.
  media_asset_id uuid references public.media_assets (id) on delete set null,

  saved_at timestamptz not null default now(),
  expires_at timestamptz not null,
  removed_at timestamptz,
  bytes_stored bigint check (bytes_stored is null or bytes_stored >= 0),

  constraint od_expiry_after_save check (expires_at > saved_at),
  constraint od_id_matches_device
    unique (device_id, lesson_id)
);

create index if not exists offline_downloads_live_idx
  on public.offline_downloads (learner_profile_id, expires_at)
  where removed_at is null;

-- ---------------------------------------------------------------------------
-- saving a lesson
-- ---------------------------------------------------------------------------
-- One function, one decision. It answers with everything the screen needs and
-- writes the record that makes the expiry real. The bytes are fetched
-- separately, through the existing signed download route.
create or replace function public.save_offline_lesson(
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
     and ma.status = 'available'
   order by lr.position
   limit 1;

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

revoke all on function public.save_offline_lesson(uuid, text, text) from public, anon;
grant execute on function public.save_offline_lesson(uuid, text, text) to authenticated;

comment on function public.save_offline_lesson(uuid, text, text) is
  'Records a lesson saved to one device, with the expiry the owner set. '
  'Requires may_download_lesson() and honours learning.offline_max_devices. '
  'The bytes are fetched separately; this is the booking, not the file.';

-- ---------------------------------------------------------------------------
-- what is on this device, and what has lapsed
-- ---------------------------------------------------------------------------
create or replace function public.my_offline_lessons(p_device_key text)
returns table (
  download_id uuid,
  lesson_id uuid,
  lesson_title text,
  course_title text,
  saved_at timestamptz,
  expires_at timestamptz,
  lapsed boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select od.id, od.lesson_id, l.title, c.title, od.saved_at, od.expires_at,
         od.expires_at <= now()
    from public.offline_downloads od
    join public.offline_devices d on d.id = od.device_id
    join public.lessons l on l.id = od.lesson_id
    join public.course_sections cs on cs.id = l.section_id
    join public.course_versions cv on cv.id = cs.course_version_id
    join public.courses c on c.id = cv.course_id
   where d.device_key = p_device_key
     and d.revoked_at is null
     and od.removed_at is null
     and public.can_access_learner(od.learner_profile_id)
   order by od.saved_at desc;
$$;

revoke all on function public.my_offline_lessons(text) from public, anon;
grant execute on function public.my_offline_lessons(text) to authenticated;

create or replace function public.forget_offline_lesson(p_download_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
  v_row   public.offline_downloads;
begin
  if v_actor is null then
    raise exception 'sign in to remove a saved lesson'
      using errcode = 'insufficient_privilege';
  end if;

  update public.offline_downloads od
     set removed_at = now()
   where od.id = p_download_id
     and od.removed_at is null
     and exists (
       select 1 from public.offline_devices d
        where d.id = od.device_id
          and (d.learner_profile_id in (
                 select lp.id from public.learner_profiles lp
                  where lp.linked_user_id = v_actor)
               or public.is_learner_family_member(d.learner_profile_id))
     )
  returning * into v_row;

  if v_row.id is null then
    raise exception 'that saved lesson is not on this account'
      using errcode = 'no_data_found';
  end if;

  return jsonb_build_object('removed', true, 'downloadId', v_row.id);
end;
$$;

revoke all on function public.forget_offline_lesson(uuid) from public, anon;
grant execute on function public.forget_offline_lesson(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- devices: look, and remove one
-- ---------------------------------------------------------------------------
create or replace function public.my_offline_devices()
returns table (
  device_id uuid,
  learner_profile_id uuid,
  learner_name text,
  label text,
  first_seen_at timestamptz,
  last_seen_at timestamptz,
  saved_count integer
)
language sql
stable
security definer
set search_path = public
as $$
  select d.id, d.learner_profile_id, lp.display_name, d.label,
         d.first_seen_at, d.last_seen_at,
         (select count(*)::integer from public.offline_downloads od
           where od.device_id = d.id and od.removed_at is null
             and od.expires_at > now())
    from public.offline_devices d
    join public.learner_profiles lp on lp.id = d.learner_profile_id
   where d.revoked_at is null
     and (lp.linked_user_id = public.current_user_id()
          or public.is_learner_family_member(d.learner_profile_id))
   order by d.last_seen_at desc;
$$;

revoke all on function public.my_offline_devices() from public, anon;
grant execute on function public.my_offline_devices() to authenticated;

create or replace function public.remove_offline_device(p_device_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
  v_row   public.offline_devices;
begin
  if v_actor is null then
    raise exception 'sign in to remove a device'
      using errcode = 'insufficient_privilege';
  end if;

  update public.offline_devices d
     set revoked_at = now()
   where d.id = p_device_id
     and d.revoked_at is null
     and (d.learner_profile_id in (
            select lp.id from public.learner_profiles lp
             where lp.linked_user_id = v_actor)
          or public.is_learner_family_member(d.learner_profile_id))
  returning * into v_row;

  if v_row.id is null then
    raise exception 'that device is not on this account'
      using errcode = 'no_data_found';
  end if;

  -- Revoking the device ends the saves on it. A record still playable after the
  -- device was removed would make the cap decorative.
  update public.offline_downloads
     set removed_at = now()
   where device_id = v_row.id and removed_at is null;

  return jsonb_build_object('removed', true, 'deviceId', v_row.id);
end;
$$;

revoke all on function public.remove_offline_device(uuid) from public, anon;
grant execute on function public.remove_offline_device(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- row level security
-- ---------------------------------------------------------------------------
-- Both tables are read through the definer projections above and written only by
-- the functions above. No insert, update or delete policy exists, deliberately.
alter table public.offline_devices enable row level security;
alter table public.offline_downloads enable row level security;

drop policy if exists offline_devices_read on public.offline_devices;
create policy offline_devices_read on public.offline_devices
  for select to authenticated
  using (
    public.can_access_learner(learner_profile_id)
    or public.is_privileged(public.current_user_id())
  );

drop policy if exists offline_downloads_read on public.offline_downloads;
create policy offline_downloads_read on public.offline_downloads
  for select to authenticated
  using (
    public.can_access_learner(learner_profile_id)
    or public.is_privileged(public.current_user_id())
  );

revoke all on public.offline_devices from anon, authenticated;
revoke all on public.offline_downloads from anon, authenticated;
grant select on public.offline_devices to authenticated;
grant select on public.offline_downloads to authenticated;
