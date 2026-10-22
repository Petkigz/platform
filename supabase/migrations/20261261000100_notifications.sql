-- ---------------------------------------------------------------------------
-- Telling somebody something, inside the application.
--
-- `delivery.notifications` ships off and no email or SMS provider exists. That
-- has been allowed to mean "the platform says nothing", which is wrong: a
-- teacher whose payout failed, and a learner whose class starts tomorrow, both
-- deserve to be told, and neither needs a vendor to hear it.
--
-- So this is the in-app centre, and it is two different things kept apart.
--
--   STORED    something that happened. Written once by the function that did
--             it, read later, marked read. Money events are the first users
--             because a failed payout is the one message that must not be
--             missed.
--
--   DERIVED   something about to happen, computed at read time from the rows
--             that already say so — a live session within a day, a plan
--             renewing within three. Nothing is written, so nothing can be
--             stale, duplicated or need a scheduler that does not exist.
--
-- Both are gated on the feature they describe. A reminder about a live class
-- cannot appear while `delivery.live_classes` is off, and a renewal notice
-- cannot appear while `commerce.subscriptions` is off, because in both cases
-- the thing being reminded of is not reachable.
-- ---------------------------------------------------------------------------

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references public.user_profiles (user_id) on delete cascade,

  -- Closed vocabulary. A new event is a migration, not a string somebody typed.
  kind text not null check (kind in ('payout_paid', 'payout_failed', 'payout_cancelled')),

  title text not null check (length(btrim(title)) between 1 and 140),
  body  text not null check (length(btrim(body)) between 1 and 1000),

  -- Where to go to do something about it. Internal paths only: a notification
  -- that links off-platform is a phishing template with a database row.
  href text check (href is null or href ~ '^/'),

  severity text not null default 'info'
    check (severity in ('info', 'action', 'warning')),

  -- The same event delivered twice is one message. Null means "always new".
  dedupe_key text,

  created_at timestamptz not null default now(),
  read_at    timestamptz
);

create unique index if not exists notifications_one_per_dedupe
  on public.notifications (user_id, dedupe_key)
  where dedupe_key is not null;

create index if not exists notifications_user_idx
  on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists notifications_read on public.notifications;
create policy notifications_read on public.notifications
  for select to authenticated
  using (user_id = public.current_user_id());

-- Marking read is the only update a person may make to their own message, and
-- the policy says so rather than trusting the caller to pass only that field.
drop policy if exists notifications_mark_read on public.notifications;
create policy notifications_mark_read on public.notifications
  for update to authenticated
  using (user_id = public.current_user_id())
  with check (user_id = public.current_user_id());

grant select, update on public.notifications to authenticated;

comment on table public.notifications is
  'In-app messages about something that happened. A reminder about something about to happen is computed at read time instead, so it cannot be stale.';

-- ---------------------------------------------------------------------------
-- notify_user() — internal
--
-- Not granted: it takes a user id, and a caller could reach anybody with it.
-- Every writer is a SECURITY DEFINER function that has already decided who is
-- affected.
-- ---------------------------------------------------------------------------
create or replace function public.notify_user(
  p_user     uuid,
  p_kind     text,
  p_title    text,
  p_body     text,
  p_href     text default null,
  p_severity text default 'info',
  p_dedupe   text default null
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

  insert into public.notifications (user_id, kind, title, body, href, severity, dedupe_key)
  values (p_user, p_kind, btrim(p_title), btrim(p_body), p_href, p_severity, p_dedupe)
  on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.notify_user(uuid, text, text, text, text, text, text) from public;

comment on function public.notify_user(uuid, text, text, text, text, text, text) is
  'Internal. Writes one in-app message, ignoring a repeat of the same dedupe key. Not granted: it takes a user id.';

-- ---------------------------------------------------------------------------
-- notification_badge() — the count, cheaply
-- ---------------------------------------------------------------------------
create or replace function public.notification_badge()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int
    from public.notifications n
   where n.user_id = public.current_user_id()
     and n.read_at is null;
$$;

revoke all on function public.notification_badge() from public;
grant execute on function public.notification_badge() to authenticated;

comment on function public.notification_badge() is
  'How many unread in-app messages the signed-in person has. Derived reminders are not counted: they are not unread, they are current.';

-- ---------------------------------------------------------------------------
-- my_notifications() — the centre
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
    select n.id, n.kind, n.title, n.body, n.href, n.severity, n.created_at, n.read_at
      from public.notifications n
     where n.user_id = v_actor
     order by n.created_at desc
     limit v_limit
  loop
    v_recent := v_recent || jsonb_build_object(
      'id',        v_row.id,
      'kind',      v_row.kind,
      'title',     v_row.title,
      'body',      v_row.body,
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
  if v_live_on then
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
  if v_subs_on then
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

revoke all on function public.my_notifications(integer) from public;
grant execute on function public.my_notifications(integer) to authenticated;

comment on function public.my_notifications(integer) is
  'The signed-in person''s in-app centre: stored messages newest first, and reminders computed from the rows that already say they are coming. Each reminder is gated on its own feature flag.';

-- ---------------------------------------------------------------------------
-- mark_notifications_read()
-- ---------------------------------------------------------------------------
create or replace function public.mark_notifications_read(p_ids uuid[] default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
  v_count integer;
begin
  if v_actor is null then
    raise exception 'sign in to mark a notification read'
      using errcode = 'insufficient_privilege';
  end if;

  update public.notifications n
     set read_at = now()
   where n.user_id = v_actor
     and n.read_at is null
     and (p_ids is null or n.id = any (p_ids));

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.mark_notifications_read(uuid[]) from public;
grant execute on function public.mark_notifications_read(uuid[]) to authenticated;

comment on function public.mark_notifications_read(uuid[]) is
  'Marks the caller''s own messages read — the given ids, or every unread one when no ids are given. Never touches anybody else''s.';

-- ---------------------------------------------------------------------------
-- The first three writers: money that moved, or failed to
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
    'payout_paid:' || p_payout_id::text);

  return jsonb_build_object('id', p_payout_id, 'status', 'completed',
                            'amountMinor', v_total::text, 'entries', v_count);
end;
$$;

revoke all on function public.complete_instructor_payout(uuid, text, text) from public;
grant execute on function public.complete_instructor_payout(uuid, text, text) to authenticated;

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
    'payout_failed:' || p_payout_id::text);

  return jsonb_build_object('id', p_payout_id, 'status', 'failed');
end;
$$;

revoke all on function public.fail_instructor_payout(uuid, text) from public;
grant execute on function public.fail_instructor_payout(uuid, text) to authenticated;

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
      'payout_cancelled:' || p_payout_id::text);
  end if;

  return jsonb_build_object('id', p_payout_id, 'status', 'cancelled');
end;
$$;

revoke all on function public.cancel_instructor_payout(uuid) from public;
grant execute on function public.cancel_instructor_payout(uuid) to authenticated;
