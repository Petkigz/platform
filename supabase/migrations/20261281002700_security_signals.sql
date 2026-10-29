-- The register existed; this is the part that notices.
--
-- `platform.incident` was registered as CODE with one sentence: *"The register
-- exists as of 2026-10-27; the detection does not."* That is exactly right. An
-- incident register is only as good as the moment somebody remembers it exists,
-- and the person who would remember is the person who is busy dealing with the
-- thing.
--
-- WHAT THIS IS, AND WHAT IT REFUSES TO BE
-- ---------------------------------------
-- It counts. It does not judge. There is no score, no threshold, no "suspicious"
-- label and no automatic incident — those would be the platform deciding what
-- counts as a breach, and that decision belongs to a person reading the facts.
-- What it does is put the facts where somebody will see them: how many of the
-- auditable actions that matter — role changes, data exports, account closures,
-- guardian consent withdrawals, takedowns, API keys, quarantined media — happened
-- on each of the last thirty days, and when the last incident was written down.
--
-- The distinction is the reason this is safe to build "to completion": a screen
-- that says *"14 data exports on Tuesday, and no incident recorded since March"*
-- is information. A screen that says *"anomaly detected"* is an accusation made
-- by a threshold nobody chose.
--
-- WHAT IT DELIBERATELY DOES NOT DO
-- --------------------------------
-- It does not detect a breach of anything it cannot see: it reads
-- `governance_audit_events`, so a break-in that leaves no audit entry is invisible
-- here, and the flag's precondition says so rather than implying coverage. Nor
-- does it notify anybody — delivery is the outbox's job and the outbox has no
-- provider yet.

create or replace function public.security_signal_actions()
returns text[]
language sql
immutable
as $$
  -- Prefixes, not a list of exact names. A new audited action under one of these
  -- families is counted the day it is introduced, rather than the day somebody
  -- remembers to add it here — the failure mode of a hand-written list is that it
  -- silently stops covering the thing that was just built.
  select array[
    'role.',
    'account.',
    'guardian.consent_revoked',
    'data.',
    'takedown.',
    'institution.api_key',
    'media.upload_quarantined'
  ];
$$;

comment on function public.security_signal_actions() is
  'The action families counted by security_signals(). Prefixes, so a newly audited action in one of these families is counted without an edit.';

create or replace function public.security_signals(p_days integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor  uuid := public.current_user_id();
  v_days   integer := greatest(1, least(365, coalesce(p_days, 30)));
  v_from   timestamptz := now() - make_interval(days => greatest(1, least(365, coalesce(p_days, 30))));
  v_last   timestamptz;
begin
  if v_actor is null
     or not (public.has_role(v_actor, 'platform_admin')
             or public.has_role(v_actor, 'governance_admin')) then
    raise exception 'incident:not_allowed'
      using errcode = 'insufficient_privilege';
  end if;

  select max(i.created_at) into v_last from public.security_incidents i;

  return (
    with watched as (
      select e.action, e.occurred_at
        from public.governance_audit_events e
       where e.occurred_at >= v_from
         and exists (
           select 1 from unnest(public.security_signal_actions()) as p(pattern)
            where e.action like p.pattern || '%')
    ),
    by_action as (
      select action, count(*)::int as events, max(occurred_at) as last_at
        from watched
       group by action
    ),
    by_day as (
      select date_trunc('day', occurred_at)::date as day, count(*)::int as events
        from watched
       group by 1
    )
    select jsonb_build_object(
      'window', jsonb_build_object(
        'days', v_days,
        'from', v_from,
        'to', now()),
      'watched', to_jsonb(public.security_signal_actions()),
      'actions', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'action', b.action,
                 'events', b.events,
                 'lastAt', b.last_at) order by b.events desc, b.action)
          from by_action b), '[]'::jsonb),
      'days', coalesce((
        select jsonb_agg(jsonb_build_object('day', d.day, 'events', d.events)
                         order by d.day)
          from by_day d), '[]'::jsonb),
      'events', (select count(*)::int from watched),
      'incidents', jsonb_build_object(
        'recordedInWindow', (select count(*)::int from public.security_incidents i
                              where i.created_at >= v_from),
        'open', (select count(*)::int from public.security_incidents i
                  where i.closed_at is null),
        'lastRecordedAt', v_last,
        -- Factual, not a judgement: how much audited activity has happened since
        -- the last time anybody wrote an incident down. Both numbers are true;
        -- what they mean is for a person to say.
        'signalsSinceLast', (select count(*)::int
                               from public.governance_audit_events e
                              where (v_last is null or e.occurred_at > v_last)
                                and exists (
                                  select 1 from unnest(public.security_signal_actions()) as p(pattern)
                                   where e.action like p.pattern || '%')))));
end;
$$;

revoke all on function public.security_signals(integer) from public, anon;
grant execute on function public.security_signals(integer) to authenticated;

comment on function public.security_signals(integer) is
  'Counts of auditable actions worth a person''s attention, by action and by day, with the incident register beside them. It counts; it does not judge, score or open an incident.';

-- ---------------------------------------------------------------------------
-- The flag says what is now true of the detection
-- ---------------------------------------------------------------------------
update public.platform_settings
   set preconditions = '**The register was built 2026-10-27; detection now counts (2026-10-28).** '
        || '`security_signals()` shows the last thirty days of auditable actions that would matter if '
        || 'something went wrong — role changes, data exports, account closures, guardian consent '
        || 'withdrawals, takedowns, API keys, quarantined media — beside the incident register and the '
        || 'date anything was last written down. `/admin/incidents` renders it above the cases. **It '
        || 'counts and does not judge**: there is no score, no threshold, no automatic incident and no '
        || 'notification, because deciding that something is a breach is a person''s job and a '
        || 'threshold nobody chose is an accusation. What is still missing, and written here rather than '
        || 'implied: it can only see what is audited, so a break-in that leaves no audit row is '
        || 'invisible; and it notifies nobody — delivery is the outbox, and the outbox has no provider '
        || 'until a key is set. The owner''s remaining decision is who is told, how fast, and whether a '
        || 'member of staff is on call'
 where key = 'platform.incident';
