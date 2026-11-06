-- Shared staff audit contained review decisions, submissions, safeguarding hold
-- reasons and quarantine details. Protect both historic and future rows without
-- deleting audit history. Unattributed legacy media cannot be classified reliably.
create function public.staff_may_read_governance_event(p_action text,p_target_type text,p_target_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select public.is_privileged(public.current_user_id()) and (
    (public.has_role(public.current_user_id(),'platform_admin') and exists (
      select 1 from public.safeguarding_owner so where so.singleton and so.owner_user_id=public.current_user_id()
    )) or (
      p_action not like 'coursework.%'
      and p_action not like 'safeguarding.concern_%'
      and p_action not like 'retention.coursework_%'
      and p_target_type not in ('assignment_submission','coursework_file_review')
      and (p_target_type <> 'media_asset' or public.is_library_delivery_asset(p_target_id))
    )
  );
$$;
revoke all on function public.staff_may_read_governance_event(text,text,uuid) from public, anon;
grant execute on function public.staff_may_read_governance_event(text,text,uuid) to authenticated;

drop policy gae_read on public.governance_audit_events;
create policy gae_read on public.governance_audit_events for select to authenticated
using (public.staff_may_read_governance_event(action,target_type,target_id));

-- This definer aggregate bypasses RLS, so it must apply the same boundary: even
-- counts of private quarantines should not reach unrelated staff.
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
         and public.staff_may_read_governance_event(e.action,e.target_type,e.target_id)
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
                                and public.staff_may_read_governance_event(e.action,e.target_type,e.target_id)
                                and exists (
                                  select 1 from unnest(public.security_signal_actions()) as p(pattern)
                                   where e.action like p.pattern || '%')))));
end;
$$;
