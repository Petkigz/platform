-- A separate private delivery register: the ordinary outbound queue is readable
-- by staff and must not reveal that a safeguarding concern exists. Emails contain
-- no names, concern text, file identifiers, or links to individual records.
create table public.safeguarding_alerts (
  review_id uuid primary key references public.coursework_file_reviews(id) on delete restrict,
  status text not null default 'pending' check (status in ('pending','leased','sent','failed')),
  attempts integer not null default 0 check (attempts >= 0),
  next_attempt_at timestamptz not null default now(),
  lease_token uuid,
  lease_until timestamptz,
  owner_id uuid references public.user_profiles(user_id) on delete restrict,
  provider text,
  provider_reference text,
  sent_at timestamptz,
  last_problem text check (last_problem is null or last_problem in ('address_unverified','provider_uncertain')),
  check ((status='leased') = (lease_token is not null and lease_until is not null and owner_id is not null)),
  check ((status='sent') = (sent_at is not null and provider is not null and provider_reference is not null)),
  check (provider_reference is null or length(btrim(provider_reference)) between 1 and 300)
);
alter table public.safeguarding_alerts enable row level security;
revoke all on public.safeguarding_alerts from public, anon, authenticated;

create function public.queue_safeguarding_alert() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  if new.decision='concern' then
    insert into public.safeguarding_alerts(review_id) values(new.id) on conflict do nothing;
  end if;
  return new;
end;
$$;
revoke all on function public.queue_safeguarding_alert() from public, anon, authenticated;
create trigger safeguarding_alert_on_concern after insert on public.coursework_file_reviews
for each row execute function public.queue_safeguarding_alert();

-- Unacknowledged historical concerns remain eligible when delivery is set up.
insert into public.safeguarding_alerts(review_id)
select r.id from public.coursework_file_reviews r
where r.decision='concern' and not exists (
  select 1 from public.safeguarding_concern_acknowledgements a where a.review_id=r.id
) on conflict do nothing;

create function public.requeue_reopened_safeguarding_alert() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  insert into public.safeguarding_alerts(review_id) values(old.review_id)
  on conflict (review_id) do update set status='pending', attempts=0, next_attempt_at=now(),
    lease_token=null, lease_until=null, owner_id=null, provider=null, provider_reference=null,
    sent_at=null, last_problem=null;
  return old;
end;
$$;
revoke all on function public.requeue_reopened_safeguarding_alert() from public, anon, authenticated;
create trigger safeguarding_alert_on_reopen after delete on public.safeguarding_concern_acknowledgements
for each row execute function public.requeue_reopened_safeguarding_alert();

-- Only the trusted server service role receives these machine-only RPCs.
-- A fresh random token makes an expired worker unable to settle a later lease.
create function public.claim_safeguarding_alert()
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_owner uuid; v_id uuid; v_token uuid := gen_random_uuid();
begin
  if not public.setting_bool('delivery.notifications',false) then
    return jsonb_build_object('state','disabled');
  end if;
  select so.owner_user_id into v_owner from public.safeguarding_owner so
    join public.user_profiles p on p.user_id=so.owner_user_id and p.account_status='active' and p.deleted_at is null
   where so.singleton and public.has_role(so.owner_user_id,'platform_admin');
  if v_owner is null then return jsonb_build_object('state','owner_unavailable'); end if;
  -- A crashed fifth worker must not leave a permanent, un-retryable lease.
  update public.safeguarding_alerts set status='failed',lease_token=null,lease_until=null,owner_id=null,
    last_problem='provider_uncertain' where status='leased' and lease_until < now() and attempts>=5;
  select a.review_id into v_id from public.safeguarding_alerts a
   where ((a.status='pending' and a.next_attempt_at <= now()) or (a.status='leased' and a.lease_until < now()))
     and a.attempts < 5
     and not exists (select 1 from public.safeguarding_concern_acknowledgements ack where ack.review_id=a.review_id)
   order by a.next_attempt_at,a.review_id for update of a skip locked limit 1;
  if v_id is null then return jsonb_build_object('state','empty'); end if;
  update public.safeguarding_alerts set status='leased', attempts=attempts+1,
    lease_token=v_token,lease_until=now()+interval '5 minutes',owner_id=v_owner
  where review_id=v_id;
  return jsonb_build_object('state','leased','reviewId',v_id,'token',v_token,'ownerId',v_owner);
end;
$$;
revoke all on function public.claim_safeguarding_alert() from public, anon, authenticated;
grant execute on function public.claim_safeguarding_alert() to service_role;

create function public.safeguarding_alert_send_allowed(p_review_id uuid,p_token uuid,p_owner uuid)
returns boolean language plpgsql security definer set search_path=public as $$
begin
  return public.setting_bool('delivery.notifications',false) and exists (
    select 1 from public.safeguarding_alerts a
      join public.safeguarding_owner so on so.singleton and so.owner_user_id=a.owner_id
      join public.user_profiles p on p.user_id=so.owner_user_id
     where a.review_id=p_review_id and a.status='leased' and a.lease_token=p_token
       and a.lease_until > now() and a.owner_id=p_owner and p.account_status='active' and p.deleted_at is null
       and public.has_role(p.user_id,'platform_admin')
       and not exists (select 1 from public.safeguarding_concern_acknowledgements ack where ack.review_id=a.review_id)
  );
end;
$$;
revoke all on function public.safeguarding_alert_send_allowed(uuid,uuid,uuid) from public, anon, authenticated;
grant execute on function public.safeguarding_alert_send_allowed(uuid,uuid,uuid) to service_role;

create function public.settle_safeguarding_alert(p_review_id uuid,p_token uuid,p_outcome text,p_provider text default null,p_reference text default null)
returns boolean language plpgsql security definer set search_path=public as $$
declare v_alert public.safeguarding_alerts;
begin
  select * into v_alert from public.safeguarding_alerts where review_id=p_review_id for update;
  if not found or v_alert.status <> 'leased' or v_alert.lease_token is distinct from p_token then return false; end if;
  if p_outcome='sent' then
    if coalesce(btrim(p_provider),'')='' or length(btrim(p_provider))>100
       or coalesce(btrim(p_reference),'')='' or length(btrim(p_reference))>300 then
      raise exception 'a provider reference is required' using errcode='check_violation';
    end if;
    update public.safeguarding_alerts set status='sent', provider=btrim(p_provider),provider_reference=btrim(p_reference),sent_at=now(),
      lease_token=null,lease_until=null,owner_id=null,last_problem=null where review_id=p_review_id;
  elsif p_outcome='not_sent' then
    update public.safeguarding_alerts set status='pending',attempts=greatest(0,attempts-1),
      next_attempt_at=now()+interval '15 minutes',lease_token=null,lease_until=null,owner_id=null
    where review_id=p_review_id;
  elsif p_outcome in ('address_unverified','provider_uncertain') then
    update public.safeguarding_alerts set status=case when attempts>=5 then 'failed' else 'pending' end,
      next_attempt_at=now()+interval '15 minutes',last_problem=p_outcome,
      lease_token=null,lease_until=null,owner_id=null where review_id=p_review_id;
  else raise exception 'unknown alert outcome' using errcode='invalid_parameter_value'; end if;
  return true;
end;
$$;
revoke all on function public.settle_safeguarding_alert(uuid,uuid,text,text,text) from public, anon, authenticated;
grant execute on function public.settle_safeguarding_alert(uuid,uuid,text,text,text) to service_role;

create function public.safeguarding_alert_status(p_review_ids uuid[])
returns table(review_id uuid,status text,attempts integer,last_problem text)
language plpgsql security definer set search_path=public as $$
begin
  perform public.require_coursework_retention_owner();
  if p_review_ids is null or cardinality(p_review_ids)>100 then raise exception 'too many alert IDs' using errcode='invalid_parameter_value'; end if;
  return query select a.review_id,a.status,a.attempts,a.last_problem from public.safeguarding_alerts a where a.review_id=any(p_review_ids);
end;
$$;
revoke all on function public.safeguarding_alert_status(uuid[]) from public, anon;
grant execute on function public.safeguarding_alert_status(uuid[]) to authenticated;

create function public.retry_safeguarding_alert(p_review_id uuid)
returns boolean language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
  perform public.require_coursework_retention_owner();
  update public.safeguarding_alerts a set status='pending',attempts=0,next_attempt_at=now(),last_problem=null
   where a.review_id=p_review_id and a.status='failed'
     and not exists (select 1 from public.safeguarding_concern_acknowledgements ack where ack.review_id=a.review_id)
   returning a.review_id into v_id;
  return v_id is not null;
end;
$$;
revoke all on function public.retry_safeguarding_alert(uuid) from public, anon;
grant execute on function public.retry_safeguarding_alert(uuid) to authenticated;
