-- -----------------------------------------------------------------------------
-- A cancelled class stops being a class people turn up to
-- -----------------------------------------------------------------------------
--
-- `cancel_live_session()` was written with the rest of live classes, is correct,
-- demands a reason, audits itself and is tested. Nothing in the application can
-- call it. The teacher's screen lists a cancelled session and prints its reason —
-- and there is no control anywhere that makes one, so that branch has never run.
--
-- A teacher who scheduled the wrong evening, or whose class cannot happen, has
-- two options today: leave a class standing that will not take place, or email
-- everybody by hand. The first is what actually happens, and it is the worse of
-- the two: a learner opens the room at 19:00, finds a dark page, and concludes
-- the platform is broken rather than that the teacher is unwell.
--
-- THE SECOND HALF IS WORSE THAN THE MISSING BUTTON
-- -------------------------------------------------
-- Even a cancellation typed into `psql` today tells nobody. There is a
-- notification centre, an outbox, and a promise that a learner is told about the
-- things that affect them — and a cancelled class was not one of them. The
-- learner finds out by opening the page, which means they find out by arriving.
--
-- So this migration does two things together, because doing either alone leaves
-- the same hole open: a class can be cancelled from the screen the teacher
-- already uses, and cancelling it *is* the act of telling the people who were
-- going to be there.
--
-- WHO "EVERYBODY" IS
-- ------------------
-- The people with a seat in the class, addressed as accounts rather than as
-- little rows in `learner_profiles`:
--
--   * an adult learner is told themselves;
--   * a child is not a person who can be told — a child profile has no login by
--     design (`lp_no_child_login_yet`) — so their **active guardians** are told
--     instead, which is who a class being cancelled actually inconveniences;
--   * the teacher hosting it is included, so that a cancellation made by staff
--     reaches the teacher rather than being discovered by them.
--
-- One message per person, however many children of theirs are in the class. The
-- dedupe key is the session, so a retry of the same cancellation cannot produce a
-- second copy — and the person who cancelled is never notified of their own act.
--
-- THE CAP, AND WHY IT IS ADMITTED RATHER THAN HIDDEN
-- --------------------------------------------------
-- Two hundred people per cancellation. A course with a thousand enrolments would
-- otherwise write a thousand rows inside the transaction that cancels the class,
-- and a teacher whose connection drops halfway through would be left with a
-- cancelled class and a partial audience. Past the cap, the class is still
-- cancelled and the rest of the audience is not written to — so the screen says
-- how many were told and how many were not, rather than reporting success.
-- A learner who was not told still cannot enter the room; they are just not
-- warned in advance.

-- -----------------------------------------------------------------------------
-- 1. One more word in a closed vocabulary
-- -----------------------------------------------------------------------------
-- `notifications.kind` is a check constraint on purpose: "a new event is a
-- migration, not a string somebody typed". This is that migration.
alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in ('payout_paid', 'payout_failed', 'payout_cancelled',
                  'media_encode_failed', 'live_cancelled'));

-- -----------------------------------------------------------------------------
-- 2. Who is expected at a class
-- -----------------------------------------------------------------------------
-- One definition, used by the count the teacher reads before pressing and by the
-- notification the press writes. Two copies of this query would drift the day
-- somebody decided a suspended enrolment still deserved a warning, and the drift
-- would be invisible: the count would say six and five people would be told.
--
-- Internal. It returns account ids for a class, which is not a fact to hand to a
-- caller who has not first been checked against the class.
create or replace function public.live_session_expected_people(p_session_id uuid)
returns table (user_id uuid)
language sql
stable
security definer
set search_path = public
as $$
  with learners as (
    select ce.learner_profile_id
      from public.course_enrolments ce
      join public.live_sessions s on s.course_id = ce.course_id
     where s.id = p_session_id
       and ce.status in ('active', 'completed')
       and ce.deleted_at is null
  ),
  accounts as (
    -- An adult learner, told themselves.
    select lp.linked_user_id as user_id
      from public.learner_profiles lp
      join learners l on l.learner_profile_id = lp.id
     where lp.linked_user_id is not null

    union

    -- A child's guardians, because a child profile has no login to tell.
    select gr.guardian_user_id
      from public.guardian_relationships gr
      join learners l on l.learner_profile_id = gr.learner_profile_id
     where gr.status = 'active'
       and gr.deleted_at is null

    union

    -- The teacher, so staff cancelling reaches them.
    select s.host_user_id
      from public.live_sessions s
     where s.id = p_session_id
  )
  select distinct a.user_id from accounts a where a.user_id is not null
   order by a.user_id;
$$;

revoke all on function public.live_session_expected_people(uuid)
  from public, anon, authenticated;

comment on function public.live_session_expected_people(uuid) is
  'The accounts who should hear that this class is cancelled: adult learners themselves, a child''s active guardians, and the host. Internal — it returns account ids for a class.';

-- -----------------------------------------------------------------------------
-- 3. What the teacher is shown before they press
-- -----------------------------------------------------------------------------
-- A button that says "Cancel class" is a button nobody presses on a class of
-- thirty. One that says how many people it is about to tell is a button somebody
-- presses deliberately — and it is also the number the receipt afterwards is
-- checked against.
create or replace function public.live_session_audience(p_session_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor    uuid := public.current_user_id();
  v_host     uuid;
  v_title    text;
  v_status   text;
  v_learners integer;
  v_people   integer;
  v_cap      constant integer := 200;
begin
  if v_actor is null then
    raise exception 'sign in to read a class'
      using errcode = 'insufficient_privilege';
  end if;

  select s.host_user_id, s.title, s.status
    into v_host, v_title, v_status
    from public.live_sessions s
   where s.id = p_session_id;
  if not found then
    raise exception 'that class does not exist'
      using errcode = 'no_data_found';
  end if;
  if v_host <> v_actor and not public.is_privileged(v_actor) then
    raise exception 'only the teacher hosting a class may see who is expected'
      using errcode = 'insufficient_privilege';
  end if;

  -- Learners and people are different numbers and both are worth printing: a
  -- parent with two children in the class is two learners and one person to
  -- telephone, and the second is the number that decides whether this is a
  -- message or a phone call.
  select count(distinct ce.learner_profile_id)::int
    into v_learners
    from public.course_enrolments ce
    join public.live_sessions s on s.course_id = ce.course_id
   where s.id = p_session_id
     and ce.status in ('active', 'completed')
     and ce.deleted_at is null;

  -- The person asking is never told about their own act, so they are not one of
  -- the people the button is about to tell. Reporting them as one would make the
  -- number on the button larger than the number of messages it produces, and the
  -- receipt afterwards would contradict it.
  select count(*)::int into v_people
    from public.live_session_expected_people(p_session_id) p
   where p.user_id <> v_actor;

  return jsonb_build_object(
    'title',       v_title,
    'status',      v_status,
    'learners',    v_learners,
    'people',      v_people,
    'cap',         v_cap,
    'willTell',    least(v_people, v_cap),
    'capped',      v_people > v_cap,
    -- A class that has already ended or been cancelled has no button to press.
    'cancellable', v_status in ('scheduled', 'live')
  );
end;
$$;

revoke all on function public.live_session_audience(uuid) from public, anon;
grant execute on function public.live_session_audience(uuid) to authenticated;

comment on function public.live_session_audience(uuid) is
  'How many learners are in a class and how many separate people cancelling it would tell. The host or staff only.';

-- -----------------------------------------------------------------------------
-- 4. Cancelling, which now tells the people who were coming
-- -----------------------------------------------------------------------------
-- Everything the previous body did is kept: the host-or-staff check, the
-- mandatory reason, the refusal of an ended or already-cancelled class, and the
-- audit entry. What is added is the loop, and a return value that says what it
-- actually did rather than only what the row now says.
create or replace function public.cancel_live_session(
  p_session_id uuid,
  p_reason     text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor    uuid := public.current_user_id();
  v_row      public.live_sessions;
  v_cap      constant integer := 200;
  v_people   integer;
  v_notified integer := 0;
  v_target   uuid;
  v_when     text;
  v_body     text;
begin
  if v_actor is null then
    raise exception 'sign in to cancel a class' using errcode = 'insufficient_privilege';
  end if;

  select * into v_row from public.live_sessions s where s.id = p_session_id;
  if not found then
    raise exception 'that class does not exist' using errcode = 'no_data_found';
  end if;
  if v_row.host_user_id <> v_actor and not public.is_privileged(v_actor) then
    raise exception 'only the teacher hosting a class may cancel it'
      using errcode = 'insufficient_privilege';
  end if;
  if nullif(btrim(coalesce(p_reason, '')), '') is null then
    raise exception 'say why the class is cancelled; learners will read it'
      using errcode = 'invalid_parameter_value';
  end if;

  update public.live_sessions
     set status = 'cancelled', cancelled_at = now(), cancelled_reason = btrim(p_reason)
   where id = p_session_id
     and status in ('scheduled', 'live')
  returning * into v_row;

  if v_row.id is null then
    raise exception 'that class was already ended or cancelled'
      using errcode = 'invalid_parameter_value';
  end if;

  -- The host is the person most likely to be asked what happened, so the count
  -- is taken before anyone is written to: the receipt has to describe the
  -- audience, not the leftovers.
  -- The person asking is never told about their own act, so they are not one of
  -- the people the button is about to tell. Reporting them as one would make the
  -- number on the button larger than the number of messages it produces, and the
  -- receipt afterwards would contradict it.
  select count(*)::int into v_people
    from public.live_session_expected_people(p_session_id) p
   where p.user_id <> v_actor;

  v_when := to_char(
    v_row.starts_at at time zone v_row.scheduled_zone,
    'DD Mon YYYY, HH24:MI'
  ) || ' ' || v_row.scheduled_zone;
  v_body := v_when || ' · ' || v_row.cancelled_reason;

  for v_target in
    select p.user_id
      from public.live_session_expected_people(p_session_id) p
     where p.user_id <> v_actor
     order by p.user_id
     limit v_cap
  loop
    -- Deduped on the session: cancelling is already a one-way door, and this
    -- makes it a one-way door that cannot post twice if it is ever retried.
    if public.notify_user(
         v_target,
         'live_cancelled',
         format('Class cancelled: %s', v_row.title),
         v_body,
         '/live/' || v_row.id::text,
         'warning',
         'live-cancel:' || v_row.id::text
       ) is not null then
      v_notified := v_notified + 1;
    end if;
  end loop;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'teaching.live_session_cancelled', 'live_session', v_row.id,
          jsonb_build_object('reason', v_row.cancelled_reason,
                             'people', v_people,
                             'notified', v_notified));

  return to_jsonb(v_row) || jsonb_build_object(
    'people',   v_people,
    'notified', v_notified,
    'capped',   v_people > v_cap
  );
end;
$$;

revoke all on function public.cancel_live_session(uuid, text) from public, anon;
grant execute on function public.cancel_live_session(uuid, text) to authenticated;

comment on function public.cancel_live_session(uuid, text) is
  'Cancels a class with a reason a learner can read, and tells the people who were coming: adult learners, a child''s guardians, and the host. Bounded at 200 people, and the return says how many were told.';

-- -----------------------------------------------------------------------------
-- 5. The preferences screen learns the word too
-- -----------------------------------------------------------------------------
-- `notification_preferences.kind` is a second closed list, and it has to agree
-- with the first: a kind the platform can send but the screen cannot name is a
-- message a person cannot switch off, and a kind in the list that nothing sends
-- is a switch that does nothing. They are kept in step by hand, which is why the
-- screen's own test asserts the list rather than trusting it.
alter table public.notification_preferences
  drop constraint if exists notification_preferences_kind_check;
alter table public.notification_preferences
  add constraint notification_preferences_kind_check
  check (kind in ('payout_paid', 'payout_failed', 'payout_cancelled',
                  'media_encode_failed', 'class_starting', 'plan_renewing',
                  'live_cancelled'));

-- NOT LOCKED, for the same reason a failed encode is not locked.
--
-- Locking it is tempting: a cancellation is time-critical and the notification
-- is the only channel by which somebody finds out before turning up. But
-- "always on" has to keep meaning "the platform owes you this about its own
-- conduct", and the two money kinds are the ones that do. Widening it would make
-- the lock mean "important", which is a weaker promise for the messages that
-- really cannot be missed.
--
-- What a person gets for switching it off is stated on the switch instead: the
-- room still says the class was cancelled, and why, so the information is not
-- lost — only the warning before it.
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
        'live_cancelled') then
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

-- Reproduced in full: PostgreSQL cannot wrap the function it replaces. The only
-- change is the new kind in the loop, and that it is only meaningful while live
-- classes are on — the same rule `class_starting` already follows.
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
    'class_starting', 'plan_renewing', 'live_cancelled'
  ]::text[]
  loop
    v_out := v_out || jsonb_build_object(
      'kind',      v_kind,
      'enabled',   public.notification_enabled(v_actor, v_kind),
      'locked',    public.notification_kind_is_locked(v_kind),
      -- The stored kinds are written by a function that does not depend on a
      -- flag. The three live-class and subscription ones do.
      'available', case v_kind
                     when 'class_starting'  then v_live_on
                     when 'live_cancelled'  then v_live_on
                     when 'plan_renewing'   then v_subs_on
                     else true
                   end);
  end loop;

  return v_out;
end;
$$;
