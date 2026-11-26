-- An email to the owner when a board post is reported.
--
-- The owner, 2026-11-26: "build the private email alert". Migration 365 writes
-- a message inside the site when a post is reported; that still means opening
-- the site. This is the part that reaches an inbox.
--
-- **Private, like the safeguarding alerts (20261281079000).** The ordinary
-- outbox (`outbound_messages`) can be read by staff, and the owner ruled on
-- 2026-11-25 that staff are not told of a report. So the alert has a register
-- of its own, with no grant and no policy, worked only by the server's
-- service role. The email carries nothing about the post or about anybody: it
-- says a post was reported and where the desk is.
--
-- **How many.** One alert waits for an owner at a time: a second report while
-- one is waiting adds nothing. After an email has gone, the next is not sent
-- for fifteen minutes, and it is delayed rather than dropped. An alert is
-- dropped, unsent, when no report is waiting any more by the time it would
-- go, or when its reader no longer holds `platform_admin`.
--
-- **What it needs before anything is sent:** `delivery.notifications` on, the
-- email provider's key and sender, and a scheduler calling
-- `/api/cron/owner-alert`. Until then alerts wait here and nothing leaves.
-- The owner's own report does not alert the owner.

create table public.owner_alerts (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.user_profiles (user_id) on delete cascade,
  kind               text not null check (kind in ('board_reported')),
  status             text not null default 'pending'
                       check (status in ('pending', 'leased', 'sent', 'failed', 'dropped')),
  attempts           integer not null default 0 check (attempts >= 0),
  next_attempt_at    timestamptz not null default now(),
  lease_token        uuid,
  lease_until        timestamptz,
  provider           text,
  provider_reference text,
  sent_at            timestamptz,
  last_problem       text check (last_problem is null or last_problem in ('address_unverified', 'provider_uncertain')),
  created_at         timestamptz not null default now(),
  constraint owner_alerts_lease check ((status = 'leased') = (lease_token is not null and lease_until is not null)),
  constraint owner_alerts_sent check ((status = 'sent') = (sent_at is not null and provider is not null and provider_reference is not null)),
  constraint owner_alerts_reference check (provider_reference is null or length(btrim(provider_reference)) between 1 and 300)
);

-- One alert of a kind waits for one reader at a time.
create unique index owner_alerts_one_waiting
  on public.owner_alerts (user_id, kind) where status in ('pending', 'leased');
create index owner_alerts_due on public.owner_alerts (next_attempt_at) where status in ('pending', 'leased');

alter table public.owner_alerts enable row level security;
revoke all on public.owner_alerts from public, anon, authenticated;

comment on table public.owner_alerts is
  'Emails waiting to tell the owner that something needs them. Which owner, what kind, and how the sending went: nothing about a post or a person. No grant and no policy; worked by the service role through claim_owner_alert() and settle_owner_alert().';

-- Whether there is still something of this kind for the owner to do.
create function public.owner_alert_still_needed(p_kind text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case p_kind
    when 'board_reported' then exists (select 1 from public.board_reports br where br.resolved_at is null)
    else false
  end;
$$;
revoke all on function public.owner_alert_still_needed(text) from public, anon, authenticated;

-- A report queues an alert for every owner but the one who made it.
create function public.queue_owner_alert_for_board_report()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.owner_alerts (user_id, kind, next_attempt_at)
  select o.user_id, 'board_reported',
         greatest(now(), coalesce(
           (select max(a.sent_at) + interval '15 minutes'
              from public.owner_alerts a
             where a.user_id = o.user_id and a.kind = 'board_reported' and a.status = 'sent'),
           now()))
    from (select distinct ura.user_id
            from public.user_role_assignments ura
            join public.roles r on r.id = ura.role_id
           where r.code = 'platform_admin'
             and ura.user_id is distinct from new.reporter_id
             and public.has_role(ura.user_id, 'platform_admin')) o
  on conflict do nothing;
  return new;
end;
$$;
revoke all on function public.queue_owner_alert_for_board_report() from public, anon, authenticated;

create trigger board_reports_alert_owner
  after insert on public.board_reports
  for each row execute function public.queue_owner_alert_for_board_report();

-- ---------------------------------------------------------------------------
-- The three the server's worker calls. Service role only.
-- ---------------------------------------------------------------------------
create function public.claim_owner_alert()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id    uuid;
  v_user  uuid;
  v_kind  text;
  v_token uuid := gen_random_uuid();
begin
  if not public.setting_bool('delivery.notifications', false) then
    return jsonb_build_object('state', 'disabled');
  end if;

  -- A worker that died on its fifth try must not hold a lease for ever.
  update public.owner_alerts
     set status = 'failed', lease_token = null, lease_until = null, last_problem = 'provider_uncertain'
   where status = 'leased' and lease_until < now() and attempts >= 5;

  -- Nothing left to do, or nobody left to tell: not sent, and said so.
  update public.owner_alerts a
     set status = 'dropped', lease_token = null, lease_until = null
   where (a.status = 'pending' or (a.status = 'leased' and a.lease_until < now()))
     and (not public.has_role(a.user_id, 'platform_admin') or not public.owner_alert_still_needed(a.kind));

  select a.id, a.user_id, a.kind into v_id, v_user, v_kind
    from public.owner_alerts a
   where ((a.status = 'pending' and a.next_attempt_at <= now()) or (a.status = 'leased' and a.lease_until < now()))
     and a.attempts < 5
   order by a.next_attempt_at, a.id
     for update of a skip locked
   limit 1;
  if v_id is null then
    return jsonb_build_object('state', 'empty');
  end if;

  update public.owner_alerts
     set status = 'leased', attempts = attempts + 1, lease_token = v_token,
         lease_until = now() + interval '5 minutes'
   where id = v_id;

  return jsonb_build_object('state', 'leased', 'alertId', v_id, 'token', v_token, 'ownerId', v_user, 'kind', v_kind);
end;
$$;
revoke all on function public.claim_owner_alert() from public, anon, authenticated;
grant execute on function public.claim_owner_alert() to service_role;

-- Asked just before the email leaves: still switched on, still this worker's
-- lease, still the owner, still something to do.
create function public.owner_alert_send_allowed(p_alert uuid, p_token uuid, p_owner uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.setting_bool('delivery.notifications', false) and exists (
    select 1 from public.owner_alerts a
     where a.id = p_alert and a.status = 'leased' and a.lease_token = p_token
       and a.lease_until > now() and a.user_id = p_owner
       and public.has_role(a.user_id, 'platform_admin')
       and public.owner_alert_still_needed(a.kind));
end;
$$;
revoke all on function public.owner_alert_send_allowed(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.owner_alert_send_allowed(uuid, uuid, uuid) to service_role;

create function public.settle_owner_alert(
  p_alert     uuid,
  p_token     uuid,
  p_outcome   text,
  p_provider  text default null,
  p_reference text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_alert public.owner_alerts;
begin
  select * into v_alert from public.owner_alerts where id = p_alert for update;
  if not found or v_alert.status <> 'leased' or v_alert.lease_token is distinct from p_token then
    return false;
  end if;

  if p_outcome = 'sent' then
    if coalesce(btrim(p_provider), '') = '' or length(btrim(p_provider)) > 100
       or coalesce(btrim(p_reference), '') = '' or length(btrim(p_reference)) > 300 then
      raise exception 'a provider reference is required' using errcode = 'check_violation';
    end if;
    update public.owner_alerts
       set status = 'sent', provider = btrim(p_provider), provider_reference = btrim(p_reference),
           sent_at = now(), lease_token = null, lease_until = null, last_problem = null
     where id = p_alert;
  elsif p_outcome = 'not_sent' then
    -- The check before sending said no. If there is nothing left to tell, or
    -- nobody to tell, it is dropped; otherwise it waits and the try is not counted.
    if public.has_role(v_alert.user_id, 'platform_admin') and public.owner_alert_still_needed(v_alert.kind) then
      update public.owner_alerts
         set status = 'pending', attempts = greatest(0, attempts - 1),
             next_attempt_at = now() + interval '15 minutes', lease_token = null, lease_until = null
       where id = p_alert;
    else
      update public.owner_alerts
         set status = 'dropped', lease_token = null, lease_until = null
       where id = p_alert;
    end if;
  elsif p_outcome in ('address_unverified', 'provider_uncertain') then
    update public.owner_alerts
       set status = case when attempts >= 5 then 'failed' else 'pending' end,
           next_attempt_at = now() + interval '15 minutes', last_problem = p_outcome,
           lease_token = null, lease_until = null
     where id = p_alert;
  else
    raise exception 'unknown alert outcome' using errcode = 'invalid_parameter_value';
  end if;
  return true;
end;
$$;
revoke all on function public.settle_owner_alert(uuid, uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.settle_owner_alert(uuid, uuid, text, text, text) to service_role;

-- ---------------------------------------------------------------------------
-- What the owner can see of it: their own alerts, as counts.
-- ---------------------------------------------------------------------------
create function public.my_owner_alerts()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
begin
  if v_actor is null or not public.has_role(v_actor, 'platform_admin') then
    raise exception 'owner_alert:not_allowed' using errcode = 'insufficient_privilege';
  end if;
  return jsonb_build_object(
    'sending',     public.setting_bool('delivery.notifications', false),
    'waiting',     (select count(*)::int from public.owner_alerts a where a.user_id = v_actor and a.status in ('pending', 'leased')),
    'failed',      (select count(*)::int from public.owner_alerts a where a.user_id = v_actor and a.status = 'failed'),
    'lastSentAt',  (select max(a.sent_at) from public.owner_alerts a where a.user_id = v_actor and a.status = 'sent'),
    'lastProblem', (select a.last_problem from public.owner_alerts a
                     where a.user_id = v_actor and a.last_problem is not null and a.status in ('pending', 'leased', 'failed')
                     order by a.created_at desc limit 1));
end;
$$;
revoke all on function public.my_owner_alerts() from public, anon;
grant execute on function public.my_owner_alerts() to authenticated;

comment on function public.my_owner_alerts() is
  'For an account holding platform_admin: whether email is switched on, how many of its own alerts are waiting or have failed, when the last one went, and the last problem. Nothing about any post.';
