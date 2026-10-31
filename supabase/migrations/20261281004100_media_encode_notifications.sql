-- Telling the one person who can fix it.
--
-- THE GAP
-- -------
-- A failed encode was recorded and then nobody was told. `fail_media_rendition()`
-- wrote the row and stopped: the reason sits in `media_renditions.failure_reason`,
-- which reads as an operations detail to everybody except the two people who can
-- act on it. So a recording could fail at three in the morning and be discovered
-- days later by a student, in the one message a teacher never wants to receive.
--
-- The arc that produced the rest of this feature ended here. The learner is now
-- told whether to wait or to report; the author can *pull* the answer from the
-- rehearsal and the media library; staff moderate at `/admin/media`. Everybody can
-- look. Nobody was told.
--
-- WHAT CHANGES
-- ------------
-- One new kind, `media_encode_failed`, and one internal writer called from
-- `fail_media_rendition()`.
--
-- WHO IS TOLD
-- -----------
-- Two people, and they are told differently because they can do different things:
--
--   the uploader          what is wrong with the file, and the media library
--   the version's author  the same, and the rehearsal — where the lesson that
--                         depends on it is already marked as having nothing to
--                         play
--
-- An author who also uploaded the file gets one message, not two.
--
-- WHEN
-- ----
-- Only when the file has run out of chances: no copy a browser can play, and
-- nothing still encoding. A profile that fails while another is still working is
-- not news — the lesson still plays — and telling the author about it would train
-- them to ignore these messages. That condition is decided here rather than at the
-- call site, so the wording and the moment cannot drift apart.
--
-- NOT LOCKED, AND SAID OUT LOUD
-- -----------------------------
-- The two payout kinds cannot be silenced, because they report money that did not
-- arrive and the platform owes that information about its own conduct. This is not
-- that: it is a fact about the author's own file, and they can already see it on
-- two screens they own. Locking it too would make "locked" mean "important",
-- which weakens it for the two that must never be muted for a different reason.
-- The preference screen says what turning it off costs instead.

-- ---------------------------------------------------------------------------
-- The vocabulary
-- ---------------------------------------------------------------------------

alter table public.notifications
  drop constraint if exists notifications_kind_check;

alter table public.notifications
  add constraint notifications_kind_check
  check (kind in ('payout_paid', 'payout_failed', 'payout_cancelled',
                  'media_encode_failed'));

alter table public.notification_preferences
  drop constraint if exists notification_preferences_kind_check;

alter table public.notification_preferences
  add constraint notification_preferences_kind_check
  check (kind in ('payout_paid', 'payout_failed', 'payout_cancelled',
                  'media_encode_failed', 'class_starting', 'plan_renewing'));

-- ---------------------------------------------------------------------------
-- The writer
-- ---------------------------------------------------------------------------

create or replace function public.notify_media_encode_failed(p_asset_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_asset      record;
  v_author     record;
  v_written    integer := 0;
  v_reason     text;
  v_dedupe     text;
  v_body       text;
  v_seen       uuid[] := array[]::uuid[];
begin
  if p_asset_id is null then
    return 0;
  end if;

  select ma.id, ma.display_name, ma.uploaded_by, ma.status
    into v_asset
    from public.media_assets ma
   where ma.id = p_asset_id
     and ma.deleted_at is null;

  if not found then
    return 0;
  end if;

  -- Out of chances: nothing playable, and nothing still being made. A file with a
  -- working 720p is not broken because its 480p failed, and a file with a copy
  -- still encoding may yet be fine.
  if exists (
    select 1 from public.media_renditions mr
     where mr.asset_id = p_asset_id
       and mr.status = 'pending'
  ) then
    return 0;
  end if;

  if exists (
    select 1 from public.media_renditions mr
     where mr.asset_id = p_asset_id
       and mr.status = 'available'
       and mr.profile in ('1080p','720p','480p','360p','audio')
  ) then
    return 0;
  end if;

  -- And only while the master itself is servable: a quarantined file has its own
  -- message, and telling the author their encode failed when the file was taken
  -- down would send them to fix the wrong thing.
  if v_asset.status <> 'available' then
    return 0;
  end if;

  select mr.failure_reason into v_reason
    from public.media_renditions mr
   where mr.asset_id = p_asset_id
     and mr.status = 'failed'
   order by mr.updated_at desc
   limit 1;

  -- One message per file per day per person. Four profiles failing on one file is
  -- one problem; a file that fails again after somebody tried to fix it is a new
  -- one, and a day is the shortest honest window between those.
  v_dedupe := 'media_failed:' || p_asset_id::text || ':'
              || to_char(now() at time zone 'utc', 'YYYY-MM-DD');

  -- The name is nullable: rows written before the media library had names have
  -- none, and a message that opens with an empty pair of quotation marks reads
  -- like a bug. Say the same thing without a name instead.
  v_reason := left(coalesce(nullif(btrim(v_reason), ''), 'no reason was recorded'), 300);

  if nullif(btrim(coalesce(v_asset.display_name, '')), '') is null then
    v_body := format(
      'A recording you uploaded could not be turned into something a learner can play, so it will not play until it is retried. The encoder said: %s',
      v_reason);
  else
    v_body := format(
      'The recording “%s” could not be turned into something a learner can play, so it will not play until it is retried. The encoder said: %s',
      v_asset.display_name, v_reason);
  end if;

  -- The uploader, in whatever state they are in.
  if v_asset.uploaded_by is not null then
    perform public.notify_user(
      v_asset.uploaded_by,
      'media_encode_failed',
      'A recording of yours will not play',
      v_body,
      '/teach/media',
      'action',
      v_dedupe);
    v_seen := v_seen || v_asset.uploaded_by;
    v_written := v_written + 1;
  end if;

  -- Every version that uses the file. A lesson that depends on this cannot play,
  -- and the rehearsal already marks it — so the link goes there rather than to a
  -- library the author may not think to open.
  for v_author in
    select distinct cv.created_by, cv.course_id
      from public.lesson_resources lr
      join public.lessons l on l.id = lr.lesson_id
      join public.course_sections cs on cs.id = l.section_id
      join public.course_versions cv on cv.id = cs.course_version_id
     where lr.media_asset_id = p_asset_id
       and cv.created_by is not null
  loop
    -- One message per person. An author who uploaded the file already has it.
    if v_author.created_by = any (v_seen) then
      continue;
    end if;

    perform public.notify_user(
      v_author.created_by,
      'media_encode_failed',
      'A lesson of yours has nothing to play',
      v_body || format(' The lesson is in the version you can rehearse at /teach/%s/preview.', v_author.course_id),
      '/teach/' || v_author.course_id::text || '/preview',
      'action',
      v_dedupe);
    v_seen := v_seen || v_author.created_by;
    v_written := v_written + 1;
  end loop;

  return v_written;
end;
$$;

-- Internal: it takes an asset id and notifies whoever is attached to it, so a
-- grant would let a caller ring somebody else's bell about a file of their
-- choosing. The only caller is the writer below, which is SECURITY DEFINER.
revoke all on function public.notify_media_encode_failed(uuid) from public;
revoke all on function public.notify_media_encode_failed(uuid) from anon;
revoke all on function public.notify_media_encode_failed(uuid) from authenticated;

comment on function public.notify_media_encode_failed(uuid) is
  'Tells the uploader and every version author who uses this file that it will not play — once per person per day, and only when no playable copy exists and nothing is still encoding. Internal: revoked from everybody, called by fail_media_rendition().';

-- ---------------------------------------------------------------------------
-- The call site
-- ---------------------------------------------------------------------------
-- `fail_media_rendition()` is reproduced here in full because PostgreSQL has no
-- way to wrap the function it replaces. Everything above the notify is unchanged
-- from 20261208000100_media_renditions.sql; the only addition is the perform at
-- the end.

create or replace function public.fail_media_rendition(
  p_rendition_id uuid,
  p_reason       text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor    uuid := public.current_user_id();
  v_status   text;
  v_asset_id uuid;
begin
  if v_actor is null or not public.is_privileged(v_actor) then
    raise exception 'only platform staff may fail a rendition'
      using errcode = 'insufficient_privilege';
  end if;

  if coalesce(trim(p_reason), '') = '' then
    raise exception 'a failed rendition needs a written reason'
      using errcode = 'invalid_parameter_value';
  end if;

  select status, asset_id into v_status, v_asset_id
    from public.media_renditions
   where id = p_rendition_id
     for update;

  if not found then
    raise exception 'no rendition %', p_rendition_id
      using errcode = 'no_data_found';
  end if;

  if v_status <> 'pending' then
    raise exception 'a rendition that is % cannot be failed', v_status
      using errcode = 'check_violation';
  end if;

  update public.media_renditions
     set status = 'failed',
         failure_reason = trim(p_reason)
   where id = p_rendition_id;

  -- After the update, never before: the question is whether the file has run out
  -- of chances, and this failure is not one of its chances until it is written.
  perform public.notify_media_encode_failed(v_asset_id);

  return true;
end;
$$;

comment on function public.fail_media_rendition(uuid,text) is
  'Staff-only. Records why an encode failed, and tells the uploader and the version authors when that leaves the file with nothing playable. A reason is required, because a failed rendition with no reason is indistinguishable from a bug.';

-- ---------------------------------------------------------------------------
-- The preferences screen learns the new kind
-- ---------------------------------------------------------------------------

create or replace function public.set_notification_preference(
  p_kind    text,
  p_enabled boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
  v_kind  text := nullif(btrim(coalesce(p_kind, '')), '');
begin
  if v_actor is null then
    raise exception 'sign in to choose what you are told'
      using errcode = 'insufficient_privilege';
  end if;

  if v_kind is null or v_kind not in
       ('payout_paid', 'payout_failed', 'payout_cancelled',
        'media_encode_failed', 'class_starting', 'plan_renewing') then
    raise exception '% is not something the platform tells you about', coalesce(p_kind, 'nothing')
      using errcode = 'invalid_parameter_value';
  end if;

  if public.notification_kind_is_locked(v_kind) then
    raise exception 'being told your money did not arrive cannot be turned off'
      using errcode = 'check_violation';
  end if;

  insert into public.notification_preferences (user_id, kind, enabled, updated_at)
  values (v_actor, v_kind, coalesce(p_enabled, true), now())
  on conflict (user_id, kind) do update
    set enabled = excluded.enabled,
        updated_at = now();

  return jsonb_build_object(
    'kind',    v_kind,
    'enabled', coalesce(p_enabled, true),
    'locked',  false);
end;
$$;

create or replace function public.my_notification_preferences()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor    uuid := public.current_user_id();
  v_out      jsonb := '[]'::jsonb;
  v_kind     text;
  v_live_on  boolean := public.setting_bool('delivery.live_classes', false);
  v_subs_on  boolean := public.setting_bool('commerce.subscriptions', false);
begin
  if v_actor is null then
    raise exception 'sign in to choose what you are told'
      using errcode = 'insufficient_privilege';
  end if;

  foreach v_kind in array array[
    'payout_paid', 'payout_failed', 'payout_cancelled', 'media_encode_failed',
    'class_starting', 'plan_renewing'
  ]::text[]
  loop
    v_out := v_out || jsonb_build_object(
      'kind',      v_kind,
      'enabled',   public.notification_enabled(v_actor, v_kind),
      'locked',    public.notification_kind_is_locked(v_kind),
      -- The stored kinds are written by a function that does not depend on a
      -- flag. The two reminders do.
      'available', case v_kind
                     when 'class_starting' then v_live_on
                     when 'plan_renewing' then v_subs_on
                     else true
                   end);
  end loop;

  return v_out;
end;
$$;
