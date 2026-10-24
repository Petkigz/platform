-- ---------------------------------------------------------------------------
-- You choose what you are told
-- ---------------------------------------------------------------------------
-- The in-app centre has five kinds of message: three about a payout, one about a
-- class starting, one about a plan renewing. All five are useful; none of them
-- is useful to everybody, and until now there was no way to say so. A teacher
-- who has never had a payout still sees the payout notices their colleagues
-- talk about; a parent who does not care about a class reminder cannot turn it
-- off.
--
-- Two decisions.
--
--   1. TWO KINDS CANNOT BE TURNED OFF. `payout_failed` and `payout_cancelled`
--      are messages about a person's money not arriving. A platform that lets
--      somebody silence that — by accident, or because a preference screen
--      sorts "off" first — has built a switch whose only effect is to hide a
--      problem. The refusal says so in a sentence rather than greying the
--      control with no explanation, and `notification_enabled()` returns true
--      for both whatever the table says, so the row can never become a bypass.
--
--   2. A MUTED MESSAGE IS STILL WRITTEN, AND IS NOT COUNTED. The row is the
--      record of what the platform did; deleting it because somebody does not
--      want to be interrupted rewrites history. It is simply not shown and not
--      counted until the preference changes — which also means a person who
--      mutes and unmutes has not lost anything.
--
-- The vocabulary is closed and lives in a check constraint, exactly as the
-- notification table's does. A preference for a kind that cannot be sent is a
-- row nobody can explain later.
--
-- A third thing is reported but not stored: whether this platform currently
-- *can* send a kind. The two reminders exist only while their features are on
-- (`delivery.live_classes`, `commerce.subscriptions`), and both ship off. A
-- switch for a reminder nobody can receive is not forbidden — a person may set
-- a preference in advance — but it must not be presented as though something
-- arrives either way, so `my_notification_preferences()` says which kinds are
-- live and the screen says so.
-- ---------------------------------------------------------------------------

create table if not exists public.notification_preferences (
  user_id uuid not null
    references public.user_profiles (user_id) on delete cascade,

  kind text not null
    check (kind in ('payout_paid', 'payout_failed', 'payout_cancelled',
                    'class_starting', 'plan_renewing')),

  enabled boolean not null default true,

  updated_at timestamptz not null default now(),

  primary key (user_id, kind)
);

alter table public.notification_preferences enable row level security;

drop policy if exists notification_preferences_own on public.notification_preferences;
create policy notification_preferences_own on public.notification_preferences
  for all to authenticated
  using (user_id = public.current_user_id())
  with check (user_id = public.current_user_id());

grant select, insert, update, delete on public.notification_preferences to authenticated;

comment on table public.notification_preferences is
  'Which in-app messages a person wants. A row means an explicit choice; the absence of one means the default, which is on.';

-- ---------------------------------------------------------------------------
-- Reading the effective answer
-- ---------------------------------------------------------------------------

-- The two money kinds that cannot be silenced. Written as a function rather
-- than repeated in three places, so the feed, the badge and the writer cannot
-- disagree about which kinds are locked.
create or replace function public.notification_kind_is_locked(p_kind text)
returns boolean
language sql
immutable
as $$
  select coalesce(p_kind in ('payout_failed', 'payout_cancelled'), false);
$$;

create or replace function public.notification_enabled(p_user_id uuid, p_kind text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when p_kind is null then true
    when public.notification_kind_is_locked(p_kind) then true
    else coalesce(
      (select np.enabled from public.notification_preferences np
        where np.user_id = p_user_id and np.kind = p_kind),
      true)
  end;
$$;

/**
 * Every kind, with the answer that applies, in a fixed order.
 *
 * All five are always returned, whether or not a row exists, because a
 * preferences screen that only lists the kinds somebody has already changed
 * cannot be used to change one back.
 *
 * `locked` is a rule that cannot be changed; `available` is a fact about this
 * deployment that will change when a feature is switched on. They are separate
 * because they mean different things to the person reading the screen: one says
 * "you may not", the other says "not yet".
 */
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
    'payout_paid', 'payout_failed', 'payout_cancelled', 'class_starting', 'plan_renewing'
  ]::text[]
  loop
    v_out := v_out || jsonb_build_object(
      'kind',      v_kind,
      'enabled',   public.notification_enabled(v_actor, v_kind),
      'locked',    public.notification_kind_is_locked(v_kind),
      -- The three stored kinds are written by a payout function that does not
      -- depend on a flag. The two reminders do.
      'available', case v_kind
                     when 'class_starting' then v_live_on
                     when 'plan_renewing' then v_subs_on
                     else true
                   end);
  end loop;

  return v_out;
end;
$$;

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
       ('payout_paid', 'payout_failed', 'payout_cancelled', 'class_starting', 'plan_renewing') then
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

-- The two helpers are internal: they read a *named* person's choices, so
-- granting them would let anybody who knows a user id ask whether that person
-- silenced their class reminders. They are only ever called from the two
-- functions below, which are SECURITY DEFINER and therefore run as the owner.
revoke all on function public.notification_kind_is_locked(text) from public, anon, authenticated;
revoke all on function public.notification_enabled(uuid, text) from public, anon, authenticated;
revoke all on function public.my_notification_preferences() from public, anon;
revoke all on function public.set_notification_preference(text, boolean) from public, anon;
grant execute on function public.my_notification_preferences() to authenticated;
grant execute on function public.set_notification_preference(text, boolean) to authenticated;

comment on function public.notification_enabled(uuid, text) is
  'The effective answer for one kind: the two money kinds are always on, everything else follows the preference row and defaults to on.';
comment on function public.set_notification_preference(text, boolean) is
  'Turn one kind of in-app message on or off for yourself. Refuses the two kinds that report money not arriving.';

-- ---------------------------------------------------------------------------
-- The feed and the badge honour the answer
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
     and n.read_at is null
     and public.notification_enabled(n.user_id, n.kind);
$$;

revoke all on function public.notification_badge() from public;
grant execute on function public.notification_badge() to authenticated;

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

revoke all on function public.my_notifications(integer) from public;
grant execute on function public.my_notifications(integer) to authenticated;

comment on function public.my_notifications(integer) is
  'The signed-in person''s in-app centre: stored messages newest first, and reminders computed from the rows that already say they are coming. Muted kinds are kept and not shown; the two money kinds cannot be muted.';
