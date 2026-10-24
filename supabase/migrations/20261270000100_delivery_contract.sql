-- ---------------------------------------------------------------------------
-- A message that cannot be delivered must stop being retried, and somebody
-- must see it.
--
-- The outbox has been the honest half of a delivery system since 2026-12-33:
-- `queue_message()` renders a named template into `outbound_messages`, the row
-- says `queued`, and the constraint refuses `sent` without a provider and a
-- time. What it has never had is the other half — the state machine a dispatcher
-- runs on. That gap is not "a provider is missing". A provider is one HTTP call.
-- These are the things that decide whether that call is safe to make:
--
--   1. A CLAIM, so two dispatcher runs cannot both send the same message. A row
--      is leased for five minutes to the account that took it. If the process
--      dies mid-send, the lease expires and the row comes back — which is why
--      the lease is short and why a duplicate is the failure mode we accept:
--      a duplicate receipt is an annoyance, a missing one is a support ticket,
--      and no at-least-once queue can promise better without the provider
--      supporting idempotency keys.
--
--   2. A CLOCK, so a failing provider is not hammered. `next_attempt_at` moves
--      forward on every retry (5 minutes, then 15, an hour, four hours, twelve),
--      and a row is only eligible when that moment has passed.
--
--   3. A DEAD LETTER, so a permanently bad address does not retry forever.
--      `status = 'failed'` now means *nothing more will be tried*, and it
--      carries the moment it happened. Before this, `failed` was a word with no
--      rule behind it.
--
--   4. A SUPPRESSION LIST, so a hard bounce stops the next send too. This is
--      the one piece that is not about the queue at all: mailing a known-bad
--      address repeatedly is how a sending domain gets blocked, and once it is
--      blocked every other family stops receiving receipts. An address that
--      hard-bounced or was marked as a complaint is recorded here, and
--      `queue_message()` writes the row as `suppressed` instead of `queued` —
--      so there is still a record that the platform owed somebody a message and
--      chose not to send it, which is the honest version of quietly dropping it.
--
--   5. A WAY BACK. A dead letter is a dead end that needs a person: staff can
--      retry one from `/admin/messages` with a written reason, and the retry is
--      audited with the error it died on.
--
-- NOTHING SENDS. There is still no provider and no credential. What changed is
-- that the contract a provider plugs into exists, is enforced in the database
-- rather than in a worker, and is exercised by tests against a fake. Writing the
-- worker now would be plumbing that has never run against a real endpoint; the
-- dispatcher is one sign-in and one call to `claim_outbound_messages()`, and the
-- file that will hold it is described in `DECISIONS.md`.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- The queue's state
-- ---------------------------------------------------------------------------
alter table public.outbound_messages
  add column if not exists next_attempt_at timestamptz not null default now(),
  add column if not exists claimed_at      timestamptz,
  add column if not exists claimed_until   timestamptz,
  add column if not exists claimed_by      uuid
    references public.user_profiles (user_id) on delete set null,
  add column if not exists suppressed_reason text,
  add column if not exists dead_lettered_at  timestamptz;

-- A claim is all three or none of them. Half a lease cannot be reasoned about.
alter table public.outbound_messages
  drop constraint if exists om_claim_agrees;
alter table public.outbound_messages
  add constraint om_claim_agrees check (
    (claimed_at is null) = (claimed_until is null)
    and (claimed_at is null) = (claimed_by is null)
  );

-- `sent` is a claim about the world. A provider name made it checkable; the
-- provider's own identifier is what makes it *verifiable* by somebody who was
-- not there, which is the same reason an order's payment needs evidence.
alter table public.outbound_messages
  drop constraint if exists om_sent_has_reference;
alter table public.outbound_messages
  add constraint om_sent_has_reference check (
    status <> 'sent' or provider_reference is not null
  );

alter table public.outbound_messages
  drop constraint if exists om_suppressed_has_reason;
alter table public.outbound_messages
  add constraint om_suppressed_has_reason check (
    status <> 'suppressed' or suppressed_reason is not null
  );

-- A dead letter is the terminal failure, and the moment is part of it.
update public.outbound_messages
   set dead_lettered_at = coalesce(updated_at, now())
 where status = 'failed' and dead_lettered_at is null;

alter table public.outbound_messages
  drop constraint if exists om_dead_letter_agrees;
alter table public.outbound_messages
  add constraint om_dead_letter_agrees check (
    (status = 'failed') = (dead_lettered_at is not null)
  );

-- The claim query reads only queued rows, so the index only covers them.
create index if not exists outbound_messages_claim_idx
  on public.outbound_messages (next_attempt_at, created_at)
  where status = 'queued';

comment on column public.outbound_messages.next_attempt_at is
  'When this row becomes eligible again. Moved forward by the backoff on every retryable failure.';
comment on column public.outbound_messages.claimed_until is
  'A lease. A second dispatcher run cannot take a row another run holds, and a crashed run hands it back when this passes.';
comment on column public.outbound_messages.dead_lettered_at is
  'Set when status becomes failed: nothing more will be tried until a person asks for it.';

-- ---------------------------------------------------------------------------
-- The do-not-send list
-- ---------------------------------------------------------------------------
-- Addresses are stored normalised, because "Ali@Example.com " and
-- "ali@example.com" are one mailbox and a suppression list that treated them as
-- two would let a hard bounce through on the next send.
create or replace function public.normalise_address(p_address text)
returns text
language sql
immutable
as $$
  -- Strip every space and lower-case the rest. An email cannot contain a space,
  -- and an SMS number is routinely written with them.
  select lower(regexp_replace(btrim(coalesce(p_address, '')), '\s+', '', 'g'));
$$;

comment on function public.normalise_address(text) is
  'One mailbox, one spelling: trimmed, lower-cased, whitespace removed. Used by the suppression list so a hard bounce cannot be routed around by capitalisation.';

create table if not exists public.message_suppressions (
  id uuid primary key default gen_random_uuid(),

  channel text not null check (channel in ('email', 'sms')),

  address text not null check (length(address) between 3 and 320),

  reason text not null check (length(btrim(reason)) > 0),

  -- Why it is here. A bounce and a complaint are both permanent, and a person
  -- adding one by hand is neither — the distinction is what tells a future
  -- reader whether this was the provider's judgement or ours.
  source text not null default 'manual'
    check (source in ('bounce', 'complaint', 'manual')),

  suppressed_by uuid references public.user_profiles (user_id) on delete set null,

  created_at timestamptz not null default now(),

  -- The address is already normalised by the writer; the constraint is the belt
  -- to that braces, because a row inserted by hand would otherwise be invisible
  -- to the lookup.
  constraint ms_normalised check (address = public.normalise_address(address))
);

create unique index if not exists message_suppressions_one
  on public.message_suppressions (channel, address);

alter table public.message_suppressions enable row level security;

create policy message_suppressions_read on public.message_suppressions
  for select using (public.is_privileged(public.current_user_id()));

-- No client write policy: rows enter through suppress_address() and through a
-- bounce recorded by the dispatcher, both definer functions.
revoke all on public.message_suppressions from public, anon;
grant select on public.message_suppressions to authenticated;

comment on table public.message_suppressions is
  'Addresses the platform will not send to. A hard bounce is permanent, and mailing a known-bad address is how a sending domain gets blocked for everybody.';

-- ---------------------------------------------------------------------------
-- How many attempts before a message is a dead letter
-- ---------------------------------------------------------------------------
insert into public.platform_settings
  (key, value_type, value_text, gate_type, description, preconditions)
values
  ('delivery.max_attempts', 'integer', '5', 'admin',
   'How many times the dispatcher will try one message before it becomes a dead letter somebody has to look at. Each retry waits longer than the last: 5 minutes, 15, an hour, four hours, twelve. Below 1 would dead-letter on the first attempt, so 1 is the floor.',
   null)
on conflict (key) do nothing;

create or replace function public.delivery_max_attempts()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select least(10, greatest(1, public.setting_int('delivery.max_attempts', 5)));
$$;

revoke all on function public.delivery_max_attempts() from public, anon;
grant execute on function public.delivery_max_attempts() to authenticated;

comment on function public.delivery_max_attempts() is
  'The retry ceiling, clamped to 1–10 so a bad setting cannot either dead-letter on first failure or retry forever.';

-- ---------------------------------------------------------------------------
-- How long to wait before trying again
-- ---------------------------------------------------------------------------
create or replace function public.delivery_backoff_minutes(p_attempt integer)
returns integer
language sql
immutable
as $$
  -- Five minutes, then 15, an hour, four hours, twelve. A provider that is down
  -- for ten minutes is retried inside the outage; one that is down for a day has
  -- stopped being hammered after two attempts, which is the point of a backoff:
  -- the queue must not be the reason an outage gets worse.
  select case least(greatest(coalesce(p_attempt, 1), 1), 5)
           when 1 then 5
           when 2 then 15
           when 3 then 60
           when 4 then 240
           else 720
         end;
$$;

comment on function public.delivery_backoff_minutes(integer) is
  'Minutes to wait after a failed attempt: 5, 15, 60, 240, then 720. One place, so the schedule cannot disagree with itself.';

-- ---------------------------------------------------------------------------
-- What is in the queue, for the screen
-- ---------------------------------------------------------------------------
create or replace function public.outbox_standing()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
begin
  if v_actor is null or not public.is_privileged(v_actor) then
    raise exception 'only platform staff can see the outbox'
      using errcode = 'insufficient_privilege';
  end if;

  return jsonb_build_object(
    -- The flag is the switch. A queue that says "ready to send" while the
    -- feature is off would be telling the reader the opposite of the truth.
    'deliveryEnabled', public.setting_bool('delivery.notifications', false),
    'maxAttempts',     public.delivery_max_attempts(),
    'counts', jsonb_build_object(
      'queued',     (select count(*) from public.outbound_messages where status = 'queued'),
      'dueNow',     (select count(*) from public.outbound_messages
                      where status = 'queued' and next_attempt_at <= now()
                        and (claimed_until is null or claimed_until < now())),
      'inFlight',   (select count(*) from public.outbound_messages
                      where status = 'queued' and claimed_until is not null
                        and claimed_until >= now()),
      'sent',       (select count(*) from public.outbound_messages where status = 'sent'),
      'failed',     (select count(*) from public.outbound_messages where status = 'failed'),
      'suppressed', (select count(*) from public.outbound_messages where status = 'suppressed')),
    'nextDueAt', (select min(next_attempt_at) from public.outbound_messages
                   where status = 'queued'),
    'oldestQueuedAt', (select min(created_at) from public.outbound_messages
                        where status = 'queued'),
    'suppressedAddresses', (select count(*) from public.message_suppressions),
    'deadLetters', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', m.id, 'to', m.to_address, 'template', m.template_code,
               'attempts', m.attempts, 'lastError', m.last_error,
               'deadLetteredAt', m.dead_lettered_at) order by m.dead_lettered_at desc)
        from public.outbound_messages m
       where m.status = 'failed'), '[]'::jsonb));
end;
$$;

revoke all on function public.outbox_standing() from public, anon;
grant execute on function public.outbox_standing() to authenticated;

comment on function public.outbox_standing() is
  'The outbox as a staff member needs to read it: what is waiting, what is in flight, what has died, and whether delivery is even switched on.';

-- ---------------------------------------------------------------------------
-- Claiming work
-- ---------------------------------------------------------------------------
-- Staff-only, because there is no service_role in this schema and every machine
-- writer here is a real account: the transcode worker signs in for the same
-- reason. The consequence is the one worth having — a dispatcher is subject to
-- the same refusals as anybody, its sends are attributable, and revoking its
-- role stops it immediately.
--
-- `for update skip locked` is what makes two runs safe: the second one steps
-- over rows the first has already taken instead of queueing behind them.
create or replace function public.claim_outbound_messages(p_limit integer default 20)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor  uuid := public.current_user_id();
  v_limit  integer := least(100, greatest(1, coalesce(p_limit, 20)));
  v_lease  interval := interval '5 minutes';
  v_claims jsonb;
begin
  if v_actor is null or not public.is_privileged(v_actor) then
    raise exception 'only platform staff can dispatch messages'
      using errcode = 'insufficient_privilege';
  end if;

  -- The flag is the switch, and it is checked here rather than in a worker: a
  -- dispatcher that had to remember this would eventually be a dispatcher that
  -- forgot.
  if not public.setting_bool('delivery.notifications', false) then
    return jsonb_build_object(
      'disabled', true,
      'claimed',  '[]'::jsonb,
      'reason',   'delivery.notifications is off, so nothing is claimed and nothing sends');
  end if;

  with picked as (
    select m.id
      from public.outbound_messages m
     where m.status = 'queued'
       and m.next_attempt_at <= now()
       and (m.claimed_until is null or m.claimed_until < now())
     order by m.next_attempt_at, m.created_at
     limit v_limit
     for update skip locked
  ), leased as (
    update public.outbound_messages m
       set claimed_at    = now(),
           claimed_until = now() + v_lease,
           claimed_by    = v_actor
      from picked
     where m.id = picked.id
    returning m.*
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'id',           l.id,
           'channel',      l.channel,
           'to',           l.to_address,
           'subject',      l.subject,
           'body',         l.body,
           'templateCode', l.template_code,
           'purpose',      l.purpose,
           'attempts',     l.attempts,
           'claimedUntil', l.claimed_until
         ) order by l.next_attempt_at, l.created_at), '[]'::jsonb)
    into v_claims
    from leased l;

  return jsonb_build_object(
    'disabled', false,
    'claimed',  v_claims,
    'maxAttempts', public.delivery_max_attempts());
end;
$$;

revoke all on function public.claim_outbound_messages(integer) from public, anon;
grant execute on function public.claim_outbound_messages(integer) to authenticated;

comment on function public.claim_outbound_messages(integer) is
  'Lease the next messages to this dispatcher for five minutes. Refuses when delivery.notifications is off. Only a claimed row can be settled, which is what stops a message being marked sent by something that never tried.';

-- ---------------------------------------------------------------------------
-- What the provider said
-- ---------------------------------------------------------------------------
create or replace function public.record_delivery_outcome(
  p_message_id uuid,
  p_outcome    text,
  p_provider   text default null,
  p_reference  text default null,
  p_error      text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor   uuid := public.current_user_id();
  v_msg     public.outbound_messages;
  v_attempt integer;
  v_max     integer := public.delivery_max_attempts();
  v_wait    integer;
begin
  if v_actor is null or not public.is_privileged(v_actor) then
    raise exception 'only platform staff can record a delivery outcome'
      using errcode = 'insufficient_privilege';
  end if;

  select * into v_msg from public.outbound_messages where id = p_message_id;
  if v_msg.id is null then
    raise exception 'no such message' using errcode = 'P0002';
  end if;

  -- Only a claim can be settled. Without this, "sent" could be written by
  -- anything that can name an id — which is the claim `om_sent_has_provider`
  -- was only half of.
  if v_msg.claimed_until is null or v_msg.claimed_until < now() then
    raise exception 'that message is not claimed by anybody, so nothing tried to send it'
      using errcode = 'check_violation';
  end if;
  if v_msg.status <> 'queued' then
    raise exception 'that message is already %', v_msg.status
      using errcode = 'check_violation';
  end if;

  v_attempt := v_msg.attempts + 1;

  if p_outcome = 'sent' then
    if coalesce(btrim(p_provider), '') = '' then
      raise exception 'a delivered message names the provider that carried it'
        using errcode = 'check_violation';
    end if;
    if coalesce(btrim(p_reference), '') = '' then
      raise exception 'a delivered message needs the provider''s own reference'
        using errcode = 'check_violation';
    end if;

    update public.outbound_messages
       set status             = 'sent',
           sent_at            = now(),
           provider           = btrim(p_provider),
           provider_reference = btrim(p_reference),
           attempts           = v_attempt,
           last_error         = null,
           claimed_at         = null,
           claimed_until      = null,
           claimed_by         = null
     where id = p_message_id;

    return jsonb_build_object(
      'status', 'sent', 'attempts', v_attempt, 'nextAttemptAt', null);

  elsif p_outcome = 'error' then
    -- Retryable: the provider was unreachable, rate-limited us, or answered
    -- something that is worth another try. Not yet a dead letter unless this
    -- was the last attempt allowed.
    if coalesce(btrim(p_error), '') = '' then
      raise exception 'say what went wrong' using errcode = 'check_violation';
    end if;

    if v_attempt >= v_max then
      update public.outbound_messages
         set status           = 'failed',
             attempts         = v_attempt,
             last_error       = btrim(p_error),
             dead_lettered_at = now(),
             claimed_at       = null,
             claimed_until    = null,
             claimed_by       = null
       where id = p_message_id;

      insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
      values (v_actor, 'delivery.dead_lettered', 'outbound_message', p_message_id,
              jsonb_build_object('attempts', v_attempt, 'error', btrim(p_error),
                                 'to', v_msg.to_address, 'template', v_msg.template_code));

      return jsonb_build_object(
        'status', 'failed', 'attempts', v_attempt, 'nextAttemptAt', null,
        'deadLettered', true);
    end if;

    v_wait := public.delivery_backoff_minutes(v_attempt);

    update public.outbound_messages
       set attempts        = v_attempt,
           last_error      = btrim(p_error),
           next_attempt_at = now() + make_interval(mins => v_wait),
           claimed_at      = null,
           claimed_until   = null,
           claimed_by      = null
     where id = p_message_id;

    return jsonb_build_object(
      'status', 'queued', 'attempts', v_attempt,
      'backoffMinutes', v_wait,
      'nextAttemptAt', (now() + make_interval(mins => v_wait)));

  elsif p_outcome = 'bounce' then
    -- Permanent. The address is added to the do-not-send list in the same
    -- statement, because a bounce that only marks this message leaves the next
    -- one to bounce too.
    if coalesce(btrim(p_error), '') = '' then
      raise exception 'say why the address is unusable'
        using errcode = 'check_violation';
    end if;

    insert into public.message_suppressions (channel, address, reason, source, suppressed_by)
    values (v_msg.channel, public.normalise_address(v_msg.to_address),
            btrim(p_error), 'bounce', v_actor)
    on conflict (channel, address) do nothing;

    update public.outbound_messages
       set status            = 'suppressed',
           attempts          = v_attempt,
           suppressed_reason = btrim(p_error),
           last_error        = btrim(p_error),
           claimed_at        = null,
           claimed_until     = null,
           claimed_by        = null
     where id = p_message_id;

    insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
    values (v_actor, 'delivery.address_suppressed', 'outbound_message', p_message_id,
            jsonb_build_object('to', public.normalise_address(v_msg.to_address),
                               'template', v_msg.template_code, 'reason', btrim(p_error)));

    return jsonb_build_object('status', 'suppressed', 'attempts', v_attempt);
  end if;

  raise exception 'an outcome is sent, error or bounce — not %', coalesce(p_outcome, 'nothing')
    using errcode = 'invalid_parameter_value';
end;
$$;

revoke all on function public.record_delivery_outcome(uuid, text, text, text, text) from public, anon;
grant execute on function public.record_delivery_outcome(uuid, text, text, text, text) to authenticated;

comment on function public.record_delivery_outcome(uuid, text, text, text, text) is
  'Settle a claimed message: sent (needs the provider and its reference), error (retried on a backoff, dead-lettered at the ceiling), or bounce (suppressed here and added to the do-not-send list). Nothing else can move a row.';

-- ---------------------------------------------------------------------------
-- Saying "never again" by hand
-- ---------------------------------------------------------------------------
create or replace function public.suppress_address(
  p_channel text,
  p_address text,
  p_reason  text,
  p_source  text default 'manual'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor     uuid := public.current_user_id();
  v_address   text;
  v_reason    text;
  v_queued    integer;
begin
  if v_actor is null or not public.is_privileged(v_actor) then
    raise exception 'only platform staff can stop mail to an address'
      using errcode = 'insufficient_privilege';
  end if;
  if p_channel not in ('email', 'sms') then
    raise exception 'a channel is email or sms' using errcode = 'invalid_parameter_value';
  end if;

  v_address := public.normalise_address(p_address);
  if length(v_address) < 3 then
    raise exception 'that is not an address' using errcode = 'invalid_parameter_value';
  end if;

  v_reason := nullif(btrim(coalesce(p_reason, '')), '');
  if v_reason is null then
    raise exception 'say why this address should not be written to'
      using errcode = 'check_violation';
  end if;

  insert into public.message_suppressions (channel, address, reason, source, suppressed_by)
  values (p_channel, v_address, v_reason,
          case when p_source in ('bounce', 'complaint', 'manual') then p_source else 'manual' end,
          v_actor)
  on conflict (channel, address) do nothing;

  -- And whatever is already waiting for that mailbox is stopped too. A
  -- suppression that only applied to future messages would still deliver
  -- yesterday's queue.
  update public.outbound_messages m
     set status            = 'suppressed',
         suppressed_reason = v_reason,
         claimed_at        = null,
         claimed_until     = null,
         claimed_by        = null
   where m.channel = p_channel
     and m.status = 'queued'
     and public.normalise_address(m.to_address) = v_address;
  get diagnostics v_queued = row_count;

  insert into public.governance_audit_events (actor, action, target_type, detail)
  values (v_actor, 'delivery.address_suppressed', 'message_address',
          jsonb_build_object('channel', p_channel, 'address', v_address,
                             'reason', v_reason, 'stoppedQueued', v_queued));

  return jsonb_build_object('address', v_address, 'stoppedQueued', v_queued);
end;
$$;

revoke all on function public.suppress_address(text, text, text, text) from public, anon;
grant execute on function public.suppress_address(text, text, text, text) to authenticated;

comment on function public.suppress_address(text, text, text, text) is
  'Stop mail to one address: record it on the do-not-send list and suppress anything already queued for it. Needs a written reason.';

-- ---------------------------------------------------------------------------
-- The way back from a dead letter
-- ---------------------------------------------------------------------------
create or replace function public.retry_outbound_message(
  p_message_id uuid,
  p_reason     text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor   uuid := public.current_user_id();
  v_msg     public.outbound_messages;
  v_reason  text;
  v_error   text;
begin
  if v_actor is null or not public.is_privileged(v_actor) then
    raise exception 'only platform staff can retry a message'
      using errcode = 'insufficient_privilege';
  end if;

  select * into v_msg from public.outbound_messages where id = p_message_id;
  if v_msg.id is null then
    raise exception 'no such message' using errcode = 'P0002';
  end if;
  if v_msg.status <> 'failed' then
    raise exception 'that message is %, so there is nothing to revive', v_msg.status
      using errcode = 'check_violation';
  end if;

  -- A suppressed address is not retried from here: sending to it again is the
  -- one thing the suppression list exists to prevent. Lift the suppression
  -- first, deliberately, if the address really is usable again.
  if exists (
    select 1 from public.message_suppressions s
     where s.channel = v_msg.channel
       and s.address = public.normalise_address(v_msg.to_address)
  ) then
    raise exception 'that address is on the do-not-send list; lift the suppression first'
      using errcode = 'check_violation';
  end if;

  v_reason := nullif(btrim(coalesce(p_reason, '')), '');
  if v_reason is null then
    raise exception 'say why it is worth another try'
      using errcode = 'check_violation';
  end if;

  v_error := v_msg.last_error;

  update public.outbound_messages
     set status           = 'queued',
         attempts         = 0,
         last_error       = null,
         dead_lettered_at = null,
         next_attempt_at  = now(),
         claimed_at       = null,
         claimed_until    = null,
         claimed_by       = null
   where id = p_message_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'delivery.retried', 'outbound_message', p_message_id,
          jsonb_build_object('reason', v_reason, 'previousError', v_error,
                             'previousAttempts', v_msg.attempts));

  return jsonb_build_object('id', p_message_id, 'attempts', 0);
end;
$$;

revoke all on function public.retry_outbound_message(uuid, text) from public, anon;
grant execute on function public.retry_outbound_message(uuid, text) to authenticated;

comment on function public.retry_outbound_message(uuid, text) is
  'Put a dead-lettered message back in the queue with a clean attempt count, on a written reason. Refuses while the address is suppressed: sending to it again is the one thing the list exists to prevent.';

-- ---------------------------------------------------------------------------
-- Queueing, with the do-not-send list
-- ---------------------------------------------------------------------------
-- The function is reproduced rather than wrapped, because the ordering matters
-- and a reader should not have to look in two files to find out whether an
-- address is checked before or after the placeholder check.
--
-- It must NOT raise for a suppressed address. `queue_message()` is called from
-- the payment-confirmation path, and raising there would refuse a payment that
-- has already been taken because we could not email the receipt. The row is
-- written as `suppressed` instead: the record still says the platform owed
-- somebody a message and chose not to send it, which is the honest version of
-- quietly dropping it.
create or replace function public.queue_message(
  p_channel       text,
  p_template_code text,
  p_to            text,
  p_purpose       text,
  p_data          jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor       uuid := public.current_user_id();
  v_template    public.message_templates;
  v_subject     text;
  v_body        text;
  v_key         text;
  v_value       text;
  v_missing     text;
  v_id          uuid;
  v_suppressed  text;
begin
  -- A signed-in caller must be staff. The system paths (a confirmed payment, a
  -- guardian notice) call this with no actor, which is how they get through.
  if v_actor is not null and not public.is_privileged(v_actor) then
    raise exception 'only staff or the platform may queue a message'
      using errcode = 'insufficient_privilege';
  end if;

  select * into v_template
    from public.message_templates
   where code = p_template_code;
  if not found then
    raise exception 'no message template %', p_template_code
      using errcode = 'no_data_found';
  end if;

  if v_template.channel <> p_channel then
    raise exception 'template % is a % template, not %',
      p_template_code, v_template.channel, p_channel
      using errcode = 'check_violation';
  end if;

  if v_template.purpose <> p_purpose then
    raise exception 'template % is for %, not %',
      p_template_code, v_template.purpose, p_purpose
      using errcode = 'check_violation';
  end if;

  v_subject := v_template.subject_template;
  v_body := v_template.body_template;

  for v_key, v_value in
    select key, value #>> '{}' from jsonb_each(p_data)
  loop
    v_subject := replace(v_subject, '{{' || v_key || '}}', v_value);
    v_body := replace(v_body, '{{' || v_key || '}}', v_value);
  end loop;

  -- Name the placeholder rather than the template: "receipt_email has an
  -- unfilled placeholder" sends somebody to read SQL, "{{amount}}" sends them
  -- to the caller that forgot it.
  v_missing := substring(coalesce(v_subject, '') || ' ' || v_body from '\{\{[a-z_0-9]+\}\}');
  if v_missing is not null then
    raise exception 'template % still has an unfilled placeholder %',
      p_template_code, v_missing
      using errcode = 'check_violation';
  end if;

  select reason into v_suppressed
    from public.message_suppressions
   where channel = p_channel
     and address = public.normalise_address(p_to);

  insert into public.outbound_messages
    (channel, template_code, purpose, to_address, subject, body, payload, created_by,
     status, suppressed_reason)
  values
    (p_channel, p_template_code, p_purpose, btrim(p_to),
     nullif(btrim(coalesce(v_subject, '')), ''), v_body, p_data, v_actor,
     case when v_suppressed is null then 'queued' else 'suppressed' end,
     v_suppressed)
  returning id into v_id;

  return v_id;
end;
$$;

revoke execute on function public.queue_message(text,text,text,text,jsonb) from public, anon;
grant  execute on function public.queue_message(text,text,text,text,jsonb) to authenticated;

comment on function public.queue_message(text,text,text,text,jsonb) is
  'Render a named template into the outbox. An address on the do-not-send list is recorded as suppressed rather than queued — never raised, because this runs inside payment confirmation.';

-- ---------------------------------------------------------------------------
-- The new control belongs on the controls screen
-- ---------------------------------------------------------------------------
-- `delivery.max_attempts` is a number that decides whether a message is given up
-- on, so it belongs where the other numbers live rather than only in this file.
-- The whole nine-row list is restated because a "values" list cannot be appended
-- to; the one new row is `delivery.max_attempts`, and it is owned by the platform
-- admin because there is no delivery role and the owner is who a dead letter
-- eventually reaches.
create or replace function public.platform_control_rules()
returns table (
  control_key       text,
  value_type        text,
  min_value         integer,
  max_value         integer,
  allowed_prefix    text,
  requires_finance  boolean,
  requires_governance boolean,
  requires_platform boolean,
  label             text,
  unit              text,
  note              text
)
language sql
immutable
as $$
  select *
    from (values
      ('finance.reporting_currency', 'text', null::integer, null::integer, null::text,
       true, false, false,
       'Reporting currency', 'ISO 4217',
       'The one currency money is reported in. Changing it re-reports the past at whatever rates are recorded; it never restates a ledger row.'),

      ('finance.rate_sanity_factor', 'integer', 0, 1000, null::text,
       true, false, false,
       'Rate sanity factor', 'times',
       'How many times the previous rate a new one may be before recording it needs a written reason. 0 turns the check off.'),

      ('media.upload_quota_gb_per_teacher', 'integer', 1, 10000, null::text,
       false, false, true,
       'Teacher upload allowance', 'GiB',
       'Cumulative master bytes one uploader may store. Below 1 would block every upload rather than limit it, so 1 is the floor. Enforced only while platform.cost_controls is on.'),

      ('learning.offline_max_devices', 'integer', 1, 10, null::text,
       false, false, true,
       'Devices per learner', 'devices',
       'How many devices one learner may keep saved lessons on at once, counted on devices that actually hold a live save.'),

      ('learning.offline_expiry_days', 'integer', 1, 365, null::text,
       false, false, true,
       'Saved lesson lifetime', 'days',
       'How long a saved lesson plays before it asks to be refreshed. A saved lesson is a subscription artefact, not a purchase.'),

      ('delivery.live_room_base', 'text', null::integer, null::integer, 'https://',
       false, false, true,
       'Live room host', 'URL',
       'Base URL of the live-room host; a room is this plus /room/<slug>. Empty means live rooms are not connected, and joining refuses rather than handing out a URL that carries no class.'),

      ('delivery.max_attempts', 'integer', 1, 10, null::text,
       false, false, true,
       'Delivery attempts before giving up', 'attempts',
       'How many times the dispatcher tries one message before it becomes a dead letter somebody has to look at. Each retry waits longer: 5 minutes, 15, an hour, four hours, twelve.'),

      ('governance.min_approvals', 'integer', 1, 5, null::text,
       false, true, false,
       'Approvals needed to publish', 'approvals',
       'How many independent approvals a course version needs before it may be published.'),

      ('governance.panel_required', 'boolean', null::integer, null::integer, null::text,
       false, true, false,
       'Scholarly panel required', null,
       'Whether a scholarly panel must decide before publication. Off means peer review by an authorised reviewer is enough.'),

      ('governance.scholar_board_active', 'boolean', null::integer, null::integer, null::text,
       false, false, true,
       'Scholar board convened', null,
       'Whether a convened board may check reviewer credentials. Turning it on grants nothing by itself: only the owner may appoint a member, and only a member gains the power.')
    ) v(control_key, value_type, min_value, max_value, allowed_prefix,
        requires_finance, requires_governance, requires_platform, label, unit, note);
$$;

revoke all on function public.platform_control_rules() from public, anon;
grant execute on function public.platform_control_rules() to authenticated;
