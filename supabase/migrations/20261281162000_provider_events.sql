-- What became of a message after the provider took it.
--
-- `sent` in `outbound_messages` means the provider accepted the message and
-- gave a reference. It has never meant that the message arrived. A mailbox
-- that does not exist is usually found out afterwards: the provider answers
-- 200, and the bounce comes minutes later, to the provider and not to us.
-- The do-not-send list (`message_suppressions`, 20261270000100) was built
-- for exactly that address, and nothing ever told it: the only bounce it
-- heard of was one the provider refused on the spot.
--
-- This is the way in for the provider's own word, afterwards. The
-- application's webhook route verifies the provider's signature and calls
-- `record_provider_event()` with the server's service role. Nothing calls it
-- until a provider account exists and is pointed at that route.
--
-- **The address comes from our own row, never from the caller.** The caller
-- names a provider and that provider's reference for a message. The address
-- that is suppressed is the one the platform itself sent that message to. A
-- forged or mistaken event can at most suppress an address the platform
-- really wrote to under that reference; it cannot name one.
--
-- **What is suppressed.** A complaint (the reader marked the message as
-- spam), and a bounce the provider calls permanent. A delay or a temporary
-- bounce is recorded and suppresses nothing: a full mailbox is not a dead
-- one, and suppression is not undone in the ordinary flow.
--
-- **Once.** Providers send an event again until it is acknowledged. Each
-- event is recorded by the provider's own identifier for it, and a second
-- arrival changes nothing.
--
-- The private alerts (`safeguarding_alerts`, `owner_alerts`) are not in
-- `outbound_messages`, so an event about one of them finds no message and
-- suppresses nothing. The owner's address is not one to stop writing to
-- because one alert was delayed.

create table public.provider_events (
  id                 uuid primary key default gen_random_uuid(),
  provider           text not null check (provider in ('resend')),
  -- The provider's identifier for this event (not for the message).
  event_id           text not null check (length(btrim(event_id)) between 1 and 200),
  kind               text not null check (kind in ('delivered', 'delayed', 'bounced', 'complained', 'failed')),
  provider_reference text not null check (length(btrim(provider_reference)) between 1 and 200),
  -- Null when the reference is not a message in the outbox. When a message is
  -- removed (retention, erasure), what was said about it goes with it.
  message_id         uuid references public.outbound_messages (id) on delete cascade,
  permanent          boolean not null default false,
  suppressed         boolean not null default false,
  occurred_at        timestamptz,
  received_at        timestamptz not null default now(),
  unique (provider, event_id)
);

create index provider_events_reference_idx on public.provider_events (provider, provider_reference);

alter table public.provider_events enable row level security;
-- Staff who read the outbox read what became of its messages. No address is in this table.
create policy provider_events_read on public.provider_events
  for select using (public.is_privileged(public.current_user_id()));
revoke all on public.provider_events from public, anon, authenticated;
grant select on public.provider_events to authenticated;

comment on table public.provider_events is
  'What an email provider said about a message after accepting it: delivered, delayed, bounced, complained or failed. One row for each event, by the provider''s own identifier, so a redelivered event is recorded once. Written only by record_provider_event().';

-- The last word on a sent message, where the outbox is read.
alter table public.outbound_messages
  add column if not exists provider_outcome    text,
  add column if not exists provider_outcome_at timestamptz;

alter table public.outbound_messages
  drop constraint if exists om_provider_outcome_known;
alter table public.outbound_messages
  add constraint om_provider_outcome_known check (
    provider_outcome is null
    or provider_outcome in ('delivered', 'delayed', 'bounced', 'complained', 'failed')
  );
alter table public.outbound_messages
  drop constraint if exists om_provider_outcome_agrees;
alter table public.outbound_messages
  add constraint om_provider_outcome_agrees check (
    (provider_outcome is null) = (provider_outcome_at is null)
  );

comment on column public.outbound_messages.provider_outcome is
  'What the provider said became of a message it had accepted: delivered, delayed, bounced, complained or failed. Null until the provider says. "sent" alone means accepted, not arrived.';

-- A later, lesser word does not overwrite a graver one: a message that
-- bounced and is then reported "delayed" by a late event still bounced.
create function public.provider_outcome_rank(p_kind text)
returns integer
language sql
immutable
as $$
  select case p_kind
    when 'complained' then 5
    when 'bounced'    then 4
    when 'failed'     then 3
    when 'delivered'  then 2
    when 'delayed'    then 1
    else 0 end;
$$;

revoke all on function public.provider_outcome_rank(text) from public, anon, authenticated;

create function public.record_provider_event(
  p_provider    text,
  p_event_id    text,
  p_kind        text,
  p_reference   text,
  p_permanent   boolean default false,
  p_occurred_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_provider  text := lower(btrim(coalesce(p_provider, '')));
  v_event     text := btrim(coalesce(p_event_id, ''));
  v_kind      text := lower(btrim(coalesce(p_kind, '')));
  v_reference text := btrim(coalesce(p_reference, ''));
  v_permanent boolean := coalesce(p_permanent, false);
  v_row       uuid;
  v_msg       public.outbound_messages;
  v_suppress  boolean := false;
  v_new       boolean := false;
begin
  if v_provider <> 'resend' then
    raise exception 'unknown provider' using errcode = 'check_violation';
  end if;
  if v_kind not in ('delivered', 'delayed', 'bounced', 'complained', 'failed') then
    raise exception 'unknown provider event' using errcode = 'check_violation';
  end if;
  if v_event = '' or length(v_event) > 200 or v_reference = '' or length(v_reference) > 200 then
    raise exception 'an event identifier and a message reference are required' using errcode = 'check_violation';
  end if;

  -- An email message this provider accepted under this reference. The pair is
  -- what `sent` was settled with, so it is the platform's own record.
  select * into v_msg
    from public.outbound_messages m
   where m.provider = v_provider
     and m.provider_reference = v_reference
     and m.channel = 'email'
   order by m.sent_at desc nulls last
   limit 1
   for update;

  insert into public.provider_events
    (provider, event_id, kind, provider_reference, message_id, permanent, occurred_at)
  values (v_provider, v_event, v_kind, v_reference, v_msg.id, v_permanent, p_occurred_at)
  on conflict (provider, event_id) do nothing
  returning id into v_row;

  if v_row is null then
    return jsonb_build_object('state', 'seen');
  end if;
  if v_msg.id is null then
    return jsonb_build_object('state', 'unknown_message');
  end if;

  if public.provider_outcome_rank(v_kind) >= public.provider_outcome_rank(v_msg.provider_outcome) then
    update public.outbound_messages
       set provider_outcome    = v_kind,
           provider_outcome_at = coalesce(p_occurred_at, now())
     where id = v_msg.id;
  end if;

  v_suppress := v_kind = 'complained' or (v_kind = 'bounced' and v_permanent);
  if v_suppress then
    insert into public.message_suppressions (channel, address, reason, source, suppressed_by)
    values ('email', public.normalise_address(v_msg.to_address),
            case when v_kind = 'complained'
                 then 'The reader marked a message from the platform as spam (reported by the email provider).'
                 else 'The mailbox permanently refused a message (reported by the email provider).' end,
            case when v_kind = 'complained' then 'complaint' else 'bounce' end,
            null)
    on conflict (channel, address) do nothing
    returning true into v_new;

    update public.provider_events set suppressed = true where id = v_row;

    insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
    values (null, 'delivery.address_suppressed_by_provider', 'outbound_message', v_msg.id,
            jsonb_build_object('provider', v_provider, 'kind', v_kind,
                               'alreadySuppressed', not coalesce(v_new, false)));

    return jsonb_build_object('state', 'suppressed', 'kind', v_kind);
  end if;

  return jsonb_build_object('state', 'recorded', 'kind', v_kind);
end;
$$;

revoke all on function public.record_provider_event(text, text, text, text, boolean, timestamptz) from public, anon, authenticated;
grant execute on function public.record_provider_event(text, text, text, text, boolean, timestamptz) to service_role;

comment on function public.record_provider_event(text, text, text, text, boolean, timestamptz) is
  'The email provider''s word on a message after it was accepted, recorded once for each event. A complaint or a permanent bounce adds the address the platform itself sent that message to (never one named by the caller) to the do-not-send list. Service role only: the application''s webhook route calls it after verifying the provider''s signature.';
