-- A notification says what happened in a way any language can repeat.
--
-- A stored message was two English sentences composed here, with an amount, a
-- reference, a title or somebody's reason inside them, and nothing in the row
-- said which part was which. A reader of another language could be told the
-- kind of message in their language and nothing more.
--
-- From this migration a message is also stored as what it is made of:
--
--   payout_paid           amountMinor, currency, reference
--   payout_failed         amountMinor, currency, reason
--   payout_cancelled      amountMinor, currency
--   media_encode_failed   part (uploader | author), name (or null), reason
--   live_cancelled        title, startsAt, zone, reason
--   live_recording_ready  title, startsAt, zone
--
-- and the page says the sentence. `kind` already names which sentence.
--
-- What does not change:
--   * `title` and `body` are still written, in English, exactly as before.
--     The export of a person's data, and any reader that does not know
--     `facts`, read what they always read.
--   * A row written before this migration has no `facts` and is not given
--     any: its amount, its reference and its reason exist only inside its
--     sentences, and taking a sentence apart to guess them would be inventing
--     a record. Such a row is shown as it was written.
--   * Who may call what. The new notify_user() is internal, like the old one.
--   * The two reminders (a class within a day, a plan's period ending) are
--     worked out when read and are untouched.
--
-- A reason is what a person typed (staff, for a payout; a teacher, for a
-- class) or what the encoder reported. It is kept as written. It is not
-- translated here or anywhere.

alter table public.notifications
  add column if not exists facts jsonb;

alter table public.notifications drop constraint if exists notifications_facts_is_an_object;
alter table public.notifications add constraint notifications_facts_is_an_object
  check (facts is null or jsonb_typeof(facts) = 'object');

comment on column public.notifications.facts is
  'What the message is made of, by name, so a page can say it in the reader''s language. Null on a message written before 2026-11-24: shown as its English title and body.';

-- ---------------------------------------------------------------------------
-- notify_user() with facts — internal
-- ---------------------------------------------------------------------------
-- A second function of the same name and one more argument, which has no
-- default: a call with seven arguments or fewer is still the first function,
-- and nothing that called it changes. Dropping the first would have changed
-- the signature that the hosted-migration checks and the PostgREST contract
-- name.

create or replace function public.notify_user(
  p_user     uuid,
  p_kind     text,
  p_title    text,
  p_body     text,
  p_href     text,
  p_severity text,
  p_dedupe   text,
  p_facts    jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_user is null then
    raise exception 'a notification needs somebody to read it'
      using errcode = 'invalid_parameter_value';
  end if;

  if p_facts is not null and jsonb_typeof(p_facts) <> 'object' then
    raise exception 'what a notification is made of is given by name'
      using errcode = 'invalid_parameter_value';
  end if;

  insert into public.notifications (user_id, kind, title, body, href, severity, dedupe_key, facts)
  values (p_user, p_kind, btrim(p_title), btrim(p_body), p_href,
          coalesce(p_severity, 'info'), p_dedupe, p_facts)
  on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.notify_user(uuid, text, text, text, text, text, text, jsonb) from public;
revoke all on function public.notify_user(uuid, text, text, text, text, text, text, jsonb) from anon, authenticated;

comment on function public.notify_user(uuid, text, text, text, text, text, text, jsonb) is
  'Internal. Writes one in-app message with what it is made of, ignoring a repeat of the same dedupe key. Not granted: it takes a user id.';

-- ---------------------------------------------------------------------------
-- The six writers. Each is its last definition, reproduced in full because
-- PostgreSQL cannot wrap the function it replaces, with one change: the call
-- that writes the message also passes what the message is made of.
-- A test compares each with the definition it replaces.
-- ---------------------------------------------------------------------------

create or replace function public.complete_instructor_payout(
  p_payout_id          uuid,
  p_provider           text,
  p_provider_reference text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor      uuid := public.current_user_id();
  v_row        public.instructor_payouts;
  v_provider   text;
  v_reference  text;
  v_hold       integer;
  v_entry      record;
  v_total      bigint := 0;
  v_count      integer := 0;
begin
  if v_actor is null then
    raise exception 'sign in to record a payout'
      using errcode = 'insufficient_privilege';
  end if;
  if not (public.has_role(v_actor, 'finance_admin') or public.has_role(v_actor, 'platform_admin')) then
    raise exception 'only a finance admin or platform admin may record a payout'
      using errcode = 'insufficient_privilege';
  end if;

  v_provider  := nullif(btrim(coalesce(p_provider, '')), '');
  v_reference := nullif(btrim(coalesce(p_provider_reference, '')), '');
  if v_provider is null or v_reference is null then
    raise exception 'a payout needs the provider that sent it and the reference it was sent under, or it cannot be checked later'
      using errcode = 'invalid_parameter_value';
  end if;

  select * into v_row from public.instructor_payouts where id = p_payout_id for update;
  if not found then
    raise exception 'that payout does not exist'
      using errcode = 'no_data_found';
  end if;
  if v_row.status not in ('scheduled', 'processing') then
    raise exception 'a payout that is already % cannot be completed', v_row.status
      using errcode = 'check_violation';
  end if;

  v_hold := public.setting_int('teaching.payout_hold_days', 14);

  for v_entry in
    select e.id, e.net_amount_minor
      from public.instructor_earnings_entries e
     where e.instructor_user_id = v_row.instructor_user_id
       and e.currency_code::text = v_row.currency_code::text
       and e.status in ('accrued', 'payable')
       and e.accrued_at <= now() - make_interval(days => v_hold)
     order by e.accrued_at, e.id
  loop
    -- The item trigger marks the entry `paid` and refuses a second item for the
    -- same earning, so a double payout has to fail here rather than surface as
    -- a duplicated transfer.
    insert into public.instructor_payout_items (payout_id, earnings_entry_id, amount_minor)
    values (p_payout_id, v_entry.id, v_entry.net_amount_minor);
    v_total := v_total + v_entry.net_amount_minor;
    v_count := v_count + 1;
  end loop;

  if v_count = 0 then
    raise exception 'nothing is payable on this request any more; cancel it and let the teacher ask again'
      using errcode = 'check_violation';
  end if;

  update public.instructor_payouts
     set amount_minor      = v_total,
         status            = 'completed',
         completed_at      = now(),
         provider          = v_provider,
         provider_reference = v_reference
   where id = p_payout_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'payout.completed', 'instructor_payout', p_payout_id,
          jsonb_build_object('currency', v_row.currency_code::text,
                             'requestedMinor', v_row.amount_minor::text,
                             'paidMinor', v_total::text,
                             'entries', v_count,
                             'provider', v_provider,
                             'providerReference', v_reference));

  perform public.notify_user(
    v_row.instructor_user_id,
    'payout_paid',
    'Your payout has been sent',
    format('%s was sent under reference %s.', v_total::text || ' ' || v_row.currency_code::text, v_reference),
    '/teach/payouts',
    'info',
    'payout_paid:' || p_payout_id::text,
    jsonb_build_object('amountMinor', v_total::text,
                       'currency', btrim(v_row.currency_code::text),
                       'reference', v_reference));

  return jsonb_build_object('id', p_payout_id, 'status', 'completed',
                            'amountMinor', v_total::text, 'entries', v_count);
end;
$$;

create or replace function public.fail_instructor_payout(
  p_payout_id uuid,
  p_reason    text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor  uuid := public.current_user_id();
  v_row    public.instructor_payouts;
  v_reason text;
begin
  if v_actor is null then
    raise exception 'sign in to record a failed payout'
      using errcode = 'insufficient_privilege';
  end if;
  if not (public.has_role(v_actor, 'finance_admin') or public.has_role(v_actor, 'platform_admin')) then
    raise exception 'only a finance admin or platform admin may record a failed payout'
      using errcode = 'insufficient_privilege';
  end if;

  v_reason := nullif(btrim(coalesce(p_reason, '')), '');
  if v_reason is null then
    raise exception 'say why the payout failed; the teacher will read it'
      using errcode = 'invalid_parameter_value';
  end if;

  select * into v_row from public.instructor_payouts where id = p_payout_id for update;
  if not found then
    raise exception 'that payout does not exist'
      using errcode = 'no_data_found';
  end if;
  if v_row.status not in ('scheduled', 'processing') then
    raise exception 'a payout that is already % cannot be marked failed', v_row.status
      using errcode = 'check_violation';
  end if;

  update public.instructor_payouts
     set status = 'failed', failure_reason = v_reason
   where id = p_payout_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'payout.failed', 'instructor_payout', p_payout_id,
          jsonb_build_object('currency', v_row.currency_code::text,
                             'amountMinor', v_row.amount_minor::text,
                             'reason', v_reason));

  -- Sent as well as recorded: a teacher who does not open the payouts screen
  -- for a week still needs to know the money did not arrive.
  perform public.notify_user(
    v_row.instructor_user_id,
    'payout_failed',
    'A payout did not go through',
    format('%s was not sent. %s Your earnings are still owed and nothing has been lost.',
           v_row.amount_minor::text || ' ' || v_row.currency_code::text, v_reason),
    '/teach/payouts',
    'warning',
    'payout_failed:' || p_payout_id::text,
    jsonb_build_object('amountMinor', v_row.amount_minor::text,
                       'currency', btrim(v_row.currency_code::text),
                       'reason', v_reason));

  return jsonb_build_object('id', p_payout_id, 'status', 'failed');
end;
$$;

create or replace function public.cancel_instructor_payout(p_payout_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
  v_row   public.instructor_payouts;
begin
  if v_actor is null then
    raise exception 'sign in to cancel a payout'
      using errcode = 'insufficient_privilege';
  end if;

  select * into v_row from public.instructor_payouts where id = p_payout_id for update;
  if not found then
    raise exception 'that payout does not exist'
      using errcode = 'no_data_found';
  end if;

  if v_row.instructor_user_id <> v_actor and not public.staff_only() then
    raise exception 'that payout is not yours'
      using errcode = 'insufficient_privilege';
  end if;

  if v_row.status <> 'scheduled' then
    raise exception 'a payout that is already % cannot be cancelled here', v_row.status
      using errcode = 'check_violation';
  end if;

  update public.instructor_payouts
     set status = 'cancelled', cancelled_at = now()
   where id = p_payout_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'payout.cancelled', 'instructor_payout', p_payout_id,
          jsonb_build_object('currency', v_row.currency_code::text,
                             'amountMinor', v_row.amount_minor::text,
                             'by', case when v_row.instructor_user_id = v_actor
                                        then 'teacher' else 'staff' end));

  -- Nobody needs telling that they cancelled their own request; a teacher whose
  -- request staff cancelled does.
  if v_row.instructor_user_id <> v_actor then
    perform public.notify_user(
      v_row.instructor_user_id,
      'payout_cancelled',
      'A payout request was cancelled',
      format('The request for %s was cancelled by the platform. Your earnings are still owed; ask again when you are ready.',
             v_row.amount_minor::text || ' ' || v_row.currency_code::text),
      '/teach/payouts',
      'warning',
      'payout_cancelled:' || p_payout_id::text,
      jsonb_build_object('amountMinor', v_row.amount_minor::text,
                         'currency', btrim(v_row.currency_code::text)));
  end if;

  return jsonb_build_object('id', p_payout_id, 'status', 'cancelled');
end;
$$;

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
      v_dedupe,
      jsonb_build_object('part', 'uploader',
                         'name', nullif(btrim(coalesce(v_asset.display_name, '')), ''),
                         'reason', v_reason));
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
      v_dedupe,
      jsonb_build_object('part', 'author',
                         'name', nullif(btrim(coalesce(v_asset.display_name, '')), ''),
                         'reason', v_reason));
    v_seen := v_seen || v_author.created_by;
    v_written := v_written + 1;
  end loop;

  return v_written;
end;
$$;

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
         'live-cancel:' || v_row.id::text,
         jsonb_build_object('title', v_row.title,
                            'startsAt', v_row.starts_at,
                            'zone', v_row.scheduled_zone,
                            'reason', v_row.cancelled_reason)
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
           'live-recording:' || v_row.id::text,
           jsonb_build_object('title', v_row.title,
                              'startsAt', v_row.starts_at,
                              'zone', v_row.scheduled_zone)
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

-- ---------------------------------------------------------------------------
-- my_notifications(): a kept message arrives with what it is made of.
-- Reproduced in full; `facts` is the one addition. The reminders are as they
-- were.
-- ---------------------------------------------------------------------------

create or replace function public.my_notifications(p_limit integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor    uuid := public.current_user_id();
  v_limit    integer;
  v_recent   jsonb := '[]'::jsonb;
  v_remind   jsonb := '[]'::jsonb;
  v_row      record;
  v_unread   integer;
  v_live_on  boolean;
  v_subs_on  boolean;
  v_class    record;
  v_renew    record;
begin
  if v_actor is null then
    raise exception 'sign in to read your notifications'
      using errcode = 'insufficient_privilege';
  end if;

  v_limit := greatest(1, least(coalesce(p_limit, 30), 100));

  for v_row in
    select n.id, n.kind, n.title, n.body, n.facts, n.href, n.severity, n.created_at, n.read_at
      from public.notifications n
     where n.user_id = v_actor
       -- Muted messages are kept, not shown. The first kind is money that did
       -- not arrive and is never muted.
       and public.notification_enabled(v_actor, n.kind)
     order by n.created_at desc
     limit v_limit
  loop
    v_recent := v_recent || jsonb_build_object(
      'id',        v_row.id,
      'kind',      v_row.kind,
      'title',     v_row.title,
      'body',      v_row.body,
      'facts',     v_row.facts,
      'href',      v_row.href,
      'severity',  v_row.severity,
      'createdAt', v_row.created_at,
      'readAt',    v_row.read_at
    );
  end loop;

  v_unread := public.notification_badge();
  v_live_on := public.setting_bool('delivery.live_classes', false);
  v_subs_on := public.setting_bool('commerce.subscriptions', false);

  -- A class within the next day, for a course one of my learner profiles is in.
  -- "Mine" is the same rule the rest of the platform uses: an adult's own
  -- profile, or a learner in a family I am an active member of.
  if v_live_on and public.notification_enabled(v_actor, 'class_starting') then
    for v_class in
      select s.id, s.title, s.starts_at, c.title as course_title
        from public.live_sessions s
        join public.courses c on c.id = s.course_id
       where s.status in ('scheduled', 'live')
         and s.starts_at between now() - interval '15 minutes' and now() + interval '1 day'
         and exists (
               select 1
                 from public.course_enrolments ce
                 join public.learner_profiles lp on lp.id = ce.learner_profile_id
                where ce.course_id = s.course_id
                  and ce.status in ('active', 'completed')
                  and ce.deleted_at is null
                  and (lp.linked_user_id = v_actor
                       or public.is_learner_family_member(lp.id))
             )
       order by s.starts_at
       limit 5
    loop
      v_remind := v_remind || jsonb_build_object(
        'kind',      'class_starting',
        'title',     v_class.title,
        'body',      format('Your class in %s starts %s.', v_class.course_title,
                            to_char(v_class.starts_at at time zone 'UTC', 'DD Mon HH24:MI "UTC"')),
        'href',      '/live',
        'severity',  'action',
        'happensAt', v_class.starts_at,
        'sortKey',   0
      );
    end loop;
  end if;

  -- A plan renewing within three days. The membership check is explicit rather
  -- than delegated to the `subscriptions` policy: this function is SECURITY
  -- DEFINER, so the policy does not apply inside it.
  if v_subs_on and public.notification_enabled(v_actor, 'plan_renewing') then
    for v_renew in
      select s.id, s.current_period_end, p.name as plan_name, s.status
        from public.subscriptions s
        join public.plans p on p.id = s.plan_id
       where s.status in ('active', 'trialing', 'past_due')
         and s.current_period_end is not null
         and s.current_period_end between now() and now() + interval '3 days'
         and exists (
               select 1
                 from public.billing_account_memberships bam
                where bam.billing_account_id = s.billing_account_id
                  and bam.user_id = v_actor
                  and bam.status = 'active'
             )
       order by s.current_period_end
       limit 5
    loop
      v_remind := v_remind || jsonb_build_object(
        'kind',      'plan_renewing',
        'title',     format('%s renews soon', v_renew.plan_name),
        'body',      format('The next period starts %s. Cancel before then if you do not want it to continue.',
                            to_char(v_renew.current_period_end at time zone 'UTC', 'DD Mon YYYY')),
        'href',      '/subscriptions',
        'severity',  'info',
        'happensAt', v_renew.current_period_end,
        'sortKey',   1
      );
    end loop;
  end if;

  return jsonb_build_object(
    'unreadCount', v_unread,
    'reminders',   v_remind,
    'recent',      v_recent
  );
end;
$$;
