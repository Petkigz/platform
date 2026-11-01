-- -----------------------------------------------------------------------------
-- A class that already happened, and the one copy of it that exists
-- -----------------------------------------------------------------------------
--
-- `live_sessions` has carried `recording_reference` and `recording_available_at`
-- since the feature was built, with a comment saying a provider callback would
-- fill them. No provider was ever connected, nothing wrote them, and no row has
-- ever held one. Meanwhile a teacher who recorded a class on their phone or in
-- the school's Zoom account had nowhere to put it, so the recording lived in a
-- chat message and the platform — which owns the schedule, the door, the clock
-- and the roll — knew nothing about it.
--
-- Two things were undecided, and the owner decided them on 2026-11-01:
--
--   * **Who may watch.** Anyone entitled to the course: an enrolled learner or
--     their guardian, the same door they would have walked through to attend.
--     Not only those who came — a recording that exists so a sick child can
--     catch up is worth more than one that exists as a reward for attendance.
--   * **How long.** As long as the enrolment lasts, which is the same rule the
--     course's own lessons already follow. Nothing new expires; nothing new
--     persists after entitlement ends.
--
-- Only the teacher is ever captured (decided 2026-10-20), so a recording holds
-- no learner and offering it is not a safeguarding question. That decision is
-- why this unit is small enough to build at all.
--
-- -----------------------------------------------------------------------------
-- 1. The reference moves out of the row everybody can read
-- -----------------------------------------------------------------------------
-- This is the part that had to change shape rather than be filled in.
-- `live_sessions_read` lets an entitled learner select the row, and row level
-- security is row level: a column on that row is readable by everybody the row
-- is. A link stored there would have been a link handed to every enrolled
-- learner directly, and a gated redirect in front of it would have been
-- decoration.
--
-- So the reference lives in its own table with RLS on and **no policy at all** —
-- the same shape `analytics_events` uses. No client can read it, write it or
-- guess it; the only way to obtain the address is `live_recording_link()`, which
-- asks `can_watch_live_recording()` first and raises rather than returning null,
-- so a caller cannot tell "no recording" from "not yours".
--
-- The two dead columns are dropped rather than left beside the new table. Two
-- homes for one fact drift, and the empty one would keep looking authoritative.

alter table public.live_sessions
  drop constraint if exists ls_recording_has_reference;
alter table public.live_sessions
  drop column if exists recording_reference;
alter table public.live_sessions
  drop column if exists recording_available_at;

create table if not exists public.live_session_recordings (
  session_id uuid primary key
    references public.live_sessions (id) on delete cascade,

  -- The address of the recording, wherever the teacher put it. HTTPS only: a
  -- `javascript:` or `data:` URL here would be a link the platform hands to a
  -- learner and a browser executes, and "the teacher pasted it" is not a reason
  -- to run it.
  reference text not null
    check (length(reference) between 12 and 2048)
    check (reference ~ '^https://[^[:space:]]+$'),

  attached_by uuid references public.user_profiles (user_id) on delete set null,
  attached_at timestamptz not null default now(),

  -- Removing is not deleting the row. A teacher who pasted the wrong link, or a
  -- school that has to take a recording down, leaves a row saying that a
  -- recording existed and when it stopped being offered — which is the fact an
  -- audit needs. `can_watch_live_recording()` reads `removed_at is null`.
  removed_at timestamptz,
  removed_by uuid references public.user_profiles (user_id) on delete set null,
  removed_reason text,

  constraint lsr_removal_has_reason
    check ((removed_at is null) = (removed_reason is null))
);

alter table public.live_session_recordings enable row level security;
revoke all on table public.live_session_recordings from public, anon, authenticated;

comment on table public.live_session_recordings is
  'The address of a recording of a live class, readable by nobody directly. RLS is on with no policy: the only way to obtain the address is live_recording_link(), which asks the permission first.';
comment on column public.live_session_recordings.reference is
  'HTTPS only. A URL that a browser would execute is not a recording link.';

-- -----------------------------------------------------------------------------
-- 2. Who may watch
-- -----------------------------------------------------------------------------
-- The teacher's own record does not depend on the feature flag: an operator
-- turning live classes off should not hide a teacher's own material from them.
-- A learner's door does, because the flag says whether live classes are a thing
-- this platform offers yet — the same rule `my_live_sessions()` follows.
--
-- "As long as the enrolment lasts" is not a separate expiry column. It is the
-- enrolment check itself: a learner who is no longer entitled stops being able
-- to watch in the same instant they stop being able to enter the course.
create or replace function public.can_watch_live_recording(p_session_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor   uuid := public.current_user_id();
  v_session public.live_sessions;
begin
  if v_actor is null or p_session_id is null then
    return false;
  end if;

  select * into v_session from public.live_sessions s where s.id = p_session_id;
  if not found then
    return false;
  end if;

  -- A cancelled class was never taught, so there is nothing to watch even if a
  -- link was attached to it before somebody cancelled it.
  if v_session.status = 'cancelled' then
    return false;
  end if;

  if not exists (
    select 1
      from public.live_session_recordings r
     where r.session_id = p_session_id
       and r.removed_at is null
  ) then
    return false;
  end if;

  -- The people who run the class, and the author of the course it belongs to.
  if v_session.host_user_id = v_actor or public.is_privileged(v_actor) then
    return true;
  end if;

  if exists (
    select 1 from public.courses c
     where c.id = v_session.course_id
       and c.created_by = v_actor
       and c.deleted_at is null
  ) then
    return true;
  end if;

  -- A learner, or the guardian of one, while their enrolment lasts.
  if not public.setting_bool('delivery.live_classes', false) then
    return false;
  end if;

  return exists (
    select 1
      from public.course_enrolments ce
      join public.learner_profiles lp on lp.id = ce.learner_profile_id
     where ce.course_id = v_session.course_id
       and ce.status in ('active', 'completed')
       and ce.deleted_at is null
       and public.can_access_learner(lp.id)
  );
end;
$$;

revoke all on function public.can_watch_live_recording(uuid) from public, anon;
grant execute on function public.can_watch_live_recording(uuid) to authenticated;

comment on function public.can_watch_live_recording(uuid) is
  'Whether this caller may watch the recording of this class. The teacher and staff always may; a learner or guardian may while an enrolment in the course lasts and the feature is on. False for a cancelled class or when no recording is attached.';

-- -----------------------------------------------------------------------------
-- 3. The address, for the one caller who may have it
-- -----------------------------------------------------------------------------
-- A definer function rather than a policy, because the point is that the address
-- reaches a browser exactly once — as a redirect — and never sits in a row that
-- somebody can select. It raises rather than returning null so that "there is no
-- recording" and "it is not yours" are the same answer to a stranger.
create or replace function public.live_recording_link(p_session_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_reference text;
begin
  if not public.can_watch_live_recording(p_session_id) then
    raise exception 'you cannot watch that recording'
      using errcode = 'insufficient_privilege';
  end if;

  select r.reference into v_reference
    from public.live_session_recordings r
   where r.session_id = p_session_id
     and r.removed_at is null;

  if v_reference is null then
    raise exception 'you cannot watch that recording'
      using errcode = 'insufficient_privilege';
  end if;

  return v_reference;
end;
$$;

revoke all on function public.live_recording_link(uuid) from public, anon;
grant execute on function public.live_recording_link(uuid) to authenticated;

comment on function public.live_recording_link(uuid) is
  'The address of a class recording, for a caller the permission admits and nobody else. Raises rather than returning null, so a stranger cannot tell "no recording" from "not yours".';

-- -----------------------------------------------------------------------------
-- 4. Attaching one
-- -----------------------------------------------------------------------------
-- The teacher made the recording somewhere else. The platform's job is to hold
-- the address, admit the right people, and say so on the record.
--
-- Three refusals carry the design:
--
--   * **Only the host, or staff.** Not any teacher on the platform, and not the
--     course author either — the person who ran the class is the person who
--     knows what is in the recording.
--   * **Only after it ended.** A link attached to a class that has not happened
--     is a promise nobody can keep.
--   * **Never to a cancelled class.** Nothing was taught.
create or replace function public.attach_live_recording(
  p_session_id uuid,
  p_url        text,
  p_announce   boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor    uuid := public.current_user_id();
  v_row      public.live_sessions;
  v_url      text := btrim(coalesce(p_url, ''));
  v_replaced boolean := false;
  v_people   integer := 0;
  v_notified integer := 0;
  v_cap      constant integer := 200;
  v_target   uuid;
  v_body     text;
  v_stamp    timestamptz := now();
begin
  if v_actor is null then
    raise exception 'sign in to attach a recording'
      using errcode = 'insufficient_privilege';
  end if;

  select * into v_row from public.live_sessions s where s.id = p_session_id;
  if not found then
    raise exception 'that class does not exist' using errcode = 'no_data_found';
  end if;

  if v_row.host_user_id <> v_actor and not public.is_privileged(v_actor) then
    raise exception 'only the teacher hosting a class may attach its recording'
      using errcode = 'insufficient_privilege';
  end if;

  if v_row.status = 'cancelled' then
    raise exception 'that class was cancelled, so there is nothing to attach'
      using errcode = 'check_violation';
  end if;

  if v_stamp < v_row.ends_at then
    raise exception 'that class has not finished yet'
      using errcode = 'check_violation';
  end if;

  if v_url = '' then
    raise exception 'a recording link is required'
      using errcode = 'invalid_parameter_value';
  end if;
  if v_url !~ '^https://[^[:space:]]+$' then
    raise exception 'a recording link must be an https address'
      using errcode = 'invalid_parameter_value';
  end if;
  if length(v_url) > 2048 then
    raise exception 'that link is too long to be a recording address'
      using errcode = 'invalid_parameter_value';
  end if;

  select exists (
    select 1 from public.live_session_recordings r where r.session_id = p_session_id
  ) into v_replaced;

  insert into public.live_session_recordings
    (session_id, reference, attached_by, attached_at, removed_at, removed_by, removed_reason)
  values (p_session_id, v_url, v_actor, v_stamp, null, null, null)
  on conflict (session_id) do update
    set reference      = excluded.reference,
        attached_by    = excluded.attached_by,
        attached_at    = excluded.attached_at,
        removed_at     = null,
        removed_by     = null,
        removed_reason = null;

  -- Telling the class is a choice, and it defaults to silence: a person who
  -- attaches a link to a class that ended last term should not message forty
  -- households by forgetting a parameter. The one message is deduped on the
  -- session, so fixing a wrong link and attaching it again does not send twice.
  if coalesce(p_announce, false) then
    select count(*)::integer into v_people
      from public.live_session_expected_people(p_session_id) p
     where p.user_id <> v_actor;

    v_body := to_char(v_row.starts_at at time zone v_row.scheduled_zone,
                      'DD Mon YYYY, HH24:MI') || ' ' || v_row.scheduled_zone ||
              ' · the recording is ready to watch';

    for v_target in
      select p.user_id
        from public.live_session_expected_people(p_session_id) p
       where p.user_id <> v_actor
       order by p.user_id
       limit v_cap
    loop
      if public.notify_user(
           v_target,
           'live_recording_ready',
           format('Recording ready: %s', v_row.title),
           v_body,
           '/live/' || v_row.id::text,
           'info',
           'live-recording:' || v_row.id::text
         ) is not null then
        v_notified := v_notified + 1;
      end if;
    end loop;
  end if;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'teaching.live_recording_attached', 'live_session', p_session_id,
          jsonb_build_object('announced', coalesce(p_announce, false),
                             'notified', v_notified,
                             'people', v_people,
                             'replaced', v_replaced));

  return jsonb_build_object(
    'sessionId',  p_session_id,
    'availableAt', v_stamp,
    'announced',  coalesce(p_announce, false),
    'notified',   v_notified,
    'people',     v_people,
    'capped',     v_people > v_cap,
    'replaced',   v_replaced
  );
end;
$$;

revoke all on function public.attach_live_recording(uuid, text, boolean) from public, anon;
grant execute on function public.attach_live_recording(uuid, text, boolean) to authenticated;

comment on function public.attach_live_recording(uuid, text, boolean) is
  'Holds the address of a recording of a class that has ended, for the host or staff. Optionally tells the people who were expected, once per class, capped at 200.';

-- -----------------------------------------------------------------------------
-- 5. Taking one down
-- -----------------------------------------------------------------------------
-- A wrong link is a wrong link, and a school that has to withdraw a recording
-- needs a way to withdraw it that is not a database console. The reason is
-- mandatory because the next person to ask "why is this class missing its
-- recording?" is answered by it, and the row stays so the fact that it existed
-- is not erased.
create or replace function public.remove_live_recording(
  p_session_id uuid,
  p_reason     text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor  uuid := public.current_user_id();
  v_row    public.live_sessions;
  v_reason text := btrim(coalesce(p_reason, ''));
begin
  if v_actor is null then
    raise exception 'sign in to remove a recording'
      using errcode = 'insufficient_privilege';
  end if;

  select * into v_row from public.live_sessions s where s.id = p_session_id;
  if not found then
    raise exception 'that class does not exist' using errcode = 'no_data_found';
  end if;

  if v_row.host_user_id <> v_actor and not public.is_privileged(v_actor) then
    raise exception 'only the teacher hosting a class may remove its recording'
      using errcode = 'insufficient_privilege';
  end if;

  if length(v_reason) < 3 then
    raise exception 'say why the recording is being removed'
      using errcode = 'invalid_parameter_value';
  end if;

  update public.live_session_recordings
     set removed_at = now(), removed_by = v_actor, removed_reason = v_reason
   where session_id = p_session_id
     and removed_at is null;

  if not found then
    raise exception 'there is no recording on that class to remove'
      using errcode = 'no_data_found';
  end if;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'teaching.live_recording_removed', 'live_session', p_session_id,
          jsonb_build_object('reason', v_reason));

  return jsonb_build_object('sessionId', p_session_id, 'removed', true, 'reason', v_reason);
end;
$$;

revoke all on function public.remove_live_recording(uuid, text) from public, anon;
grant execute on function public.remove_live_recording(uuid, text) to authenticated;

comment on function public.remove_live_recording(uuid, text) is
  'Withdraws a recording with a written reason. The row stays, so the fact that a recording existed is not erased.';

-- -----------------------------------------------------------------------------
-- 6. What the teacher's screen may know
-- -----------------------------------------------------------------------------
-- The teaching page lists a course's classes and has to say which ones already
-- have a recording. It cannot select the private table, so it asks this: a list
-- of session ids and when each one became watchable, for the host, staff and the
-- course author — and an empty list for everybody else, rather than an error that
-- would tell a caller which classes have recordings.
create or replace function public.teacher_live_recordings(p_course_id uuid)
returns table (session_id uuid, available_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select r.session_id, r.attached_at
    from public.live_session_recordings r
    join public.live_sessions s on s.id = r.session_id
    join public.courses c on c.id = s.course_id
   where s.course_id = p_course_id
     and r.removed_at is null
     and c.deleted_at is null
     and public.current_user_id() is not null
     and (
       s.host_user_id = public.current_user_id()
       or c.created_by = public.current_user_id()
       or public.is_privileged(public.current_user_id())
     );
$$;

revoke all on function public.teacher_live_recordings(uuid) from public, anon;
grant execute on function public.teacher_live_recordings(uuid) to authenticated;

comment on function public.teacher_live_recordings(uuid) is
  'Which classes of a course have a watchable recording, for the host, staff and the course author. Empty for anybody else, rather than an error that would name which classes have recordings.';

-- -----------------------------------------------------------------------------
-- 7. The closed vocabulary of notifications learns one more word
-- -----------------------------------------------------------------------------
-- `notifications.kind` and `notification_preferences.kind` are two halves of one
-- list, and `set_notification_preference()` is a third copy. A kind the platform
-- can send but the screen cannot name is a message nobody can switch off, and a
-- kind in the list that nothing sends is a switch that does nothing — so all
-- three move together, and the screen's own test asserts the list.
alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in ('payout_paid', 'payout_failed', 'payout_cancelled',
                  'media_encode_failed', 'live_cancelled', 'live_recording_ready'));

alter table public.notification_preferences
  drop constraint if exists notification_preferences_kind_check;
alter table public.notification_preferences add constraint notification_preferences_kind_check
  check (kind in ('payout_paid', 'payout_failed', 'payout_cancelled',
                  'media_encode_failed', 'class_starting', 'plan_renewing',
                  'live_cancelled', 'live_recording_ready'));

-- Reproduced in full: PostgreSQL cannot wrap the function it replaces.
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
        'media_encode_failed', 'class_starting', 'plan_renewing',
        'live_cancelled', 'live_recording_ready') then
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

-- Reproduced in full: PostgreSQL cannot wrap the function it replaces.
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
    'class_starting', 'plan_renewing', 'live_cancelled', 'live_recording_ready'
  ]::text[]
  loop
    v_out := v_out || jsonb_build_object(
      'kind',      v_kind,
      'enabled',   public.notification_enabled(v_actor, v_kind),
      'locked',    public.notification_kind_is_locked(v_kind),
      'available', case v_kind
                     when 'class_starting'       then v_live_on
                     when 'live_cancelled'       then v_live_on
                     when 'live_recording_ready' then v_live_on
                     when 'plan_renewing'        then v_subs_on
                     else true
                   end);
  end loop;

  return v_out;
end;
$$;
