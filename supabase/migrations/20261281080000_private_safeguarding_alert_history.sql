-- A reopened concern or owner retry resets the current delivery state. Keep the
-- previous provider reference and attempt history in a separate private journal,
-- rather than silently overwriting evidence that the provider accepted a message.
-- The journal contains no email address, case text, file name, or lease token.
create table public.safeguarding_alert_events (
  id bigint generated always as identity primary key,
  review_id uuid not null references public.coursework_file_reviews(id) on delete restrict,
  previous_status text,
  status text not null check (status in ('pending','leased','sent','failed')),
  attempts integer not null check (attempts >= 0),
  owner_id uuid,
  provider text,
  provider_reference text,
  problem text,
  recorded_at timestamptz not null default now()
);
create index safeguarding_alert_events_review_order on public.safeguarding_alert_events(review_id,id desc);
alter table public.safeguarding_alert_events enable row level security;
revoke all on public.safeguarding_alert_events from public, anon, authenticated;
revoke all on sequence public.safeguarding_alert_events_id_seq from public, anon, authenticated;
create trigger safeguarding_alert_events_append_only before update or delete on public.safeguarding_alert_events
for each row execute function public.reject_event_mutation();

create function public.record_safeguarding_alert_event()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if tg_op='INSERT' then
    insert into public.safeguarding_alert_events(review_id,status,attempts,owner_id,provider,provider_reference,problem)
    values(new.review_id,new.status,new.attempts,new.owner_id,new.provider,new.provider_reference,new.last_problem);
  elsif new.status is distinct from old.status or new.attempts is distinct from old.attempts
        or new.lease_token is distinct from old.lease_token then
    insert into public.safeguarding_alert_events(review_id,previous_status,status,attempts,owner_id,provider,provider_reference,problem)
    values(new.review_id,old.status,new.status,new.attempts,
      case when new.status='sent' then old.owner_id else new.owner_id end,
      new.provider,new.provider_reference,new.last_problem);
  end if;
  return new;
end;
$$;
revoke all on function public.record_safeguarding_alert_event() from public, anon, authenticated;
create trigger safeguarding_alert_events_insert after insert on public.safeguarding_alerts
for each row execute function public.record_safeguarding_alert_event();
create trigger safeguarding_alert_events_update after update on public.safeguarding_alerts
for each row execute function public.record_safeguarding_alert_event();

-- Preserve the current state if this migration is installed after alert dispatch
-- was already running. Previous transitions cannot be reconstructed honestly.
insert into public.safeguarding_alert_events(review_id,status,attempts,owner_id,provider,provider_reference,problem)
select review_id,status,attempts,owner_id,provider,provider_reference,last_problem from public.safeguarding_alerts;

create function public.safeguarding_alert_recent_history(p_review_ids uuid[], p_per_alert integer default 5)
returns table(review_id uuid,status text,attempts integer,provider text,provider_reference text,problem text,recorded_at timestamptz)
language plpgsql stable security definer set search_path=public as $$
begin
  perform public.require_coursework_retention_owner();
  if p_review_ids is null or cardinality(p_review_ids)>50 or p_per_alert is null or p_per_alert<1 or p_per_alert>10 then
    raise exception 'invalid alert history request' using errcode='invalid_parameter_value';
  end if;
  return query
    select e.review_id,e.status,e.attempts,e.provider,e.provider_reference,e.problem,e.recorded_at
    from (
      select x.*, row_number() over(partition by x.review_id order by x.id desc) as n
        from public.safeguarding_alert_events x where x.review_id=any(p_review_ids)
    ) e where e.n <= p_per_alert order by e.review_id,e.id desc;
end;
$$;
revoke all on function public.safeguarding_alert_recent_history(uuid[],integer) from public, anon;
grant execute on function public.safeguarding_alert_recent_history(uuid[],integer) to authenticated;

-- Full history stays reachable after acknowledgement or repeated retries.
create function public.safeguarding_alert_history(p_review_id uuid,p_before bigint default null,p_limit integer default 50)
returns table(event_id text,status text,attempts integer,provider text,provider_reference text,problem text,recorded_at timestamptz)
language plpgsql stable security definer set search_path=public as $$
begin
  perform public.require_coursework_retention_owner();
  if p_review_id is null or p_limit is null or p_limit<1 or p_limit>100 or (p_before is not null and p_before<1) then
    raise exception 'invalid alert history cursor' using errcode='invalid_parameter_value';
  end if;
  return query select e.id::text,e.status,e.attempts,e.provider,e.provider_reference,e.problem,e.recorded_at
    from public.safeguarding_alert_events e where e.review_id=p_review_id and (p_before is null or e.id<p_before)
    order by e.id desc limit p_limit;
end;
$$;
revoke all on function public.safeguarding_alert_history(uuid,bigint,integer) from public, anon;
grant execute on function public.safeguarding_alert_history(uuid,bigint,integer) to authenticated;
