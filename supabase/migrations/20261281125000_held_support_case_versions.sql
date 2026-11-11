-- Keep prior versions when a held case or message is edited. Current rows stay
-- usable; copies are private to the identified owner and are removed on release.
-- The case and messages already in place when a hold starts are protected from
-- deletion by earlier migrations. Earlier losses and external copies cannot be
-- recovered. Concurrent row-lock inversions can abort a transaction for retry.
create table public.support_case_held_versions (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.support_cases(id) on delete restrict,
  source_kind text not null check(source_kind in ('case','message')),
  source_id uuid not null,
  captured_at timestamptz not null default clock_timestamp(),
  content jsonb not null check(jsonb_typeof(content)='object')
);
create index support_case_held_versions_page on public.support_case_held_versions(case_id,id);
alter table public.support_case_held_versions enable row level security;
revoke all on public.support_case_held_versions from public,anon,authenticated;

create function public.capture_held_support_case_version()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if old is distinct from new and exists(select 1 from public.support_case_cleanup_holds where case_id=old.id) then
    insert into public.support_case_held_versions(case_id,source_kind,source_id,content)
      values(old.id,'case',old.id,to_jsonb(old));
  end if;
  return new;
end;
$$;
revoke all on function public.capture_held_support_case_version() from public,anon,authenticated;
create trigger capture_held_support_case_version before update on public.support_cases
  for each row execute function public.capture_held_support_case_version();

create function public.capture_held_support_message_version()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  -- The message row is already locked. Lock its old case before checking for
  -- a hold, so an edit cannot race an owner placing or releasing the pause.
  perform 1 from public.support_cases where id=old.case_id for update;
  if old is distinct from new and exists(select 1 from public.support_case_cleanup_holds where case_id=old.case_id) then
    insert into public.support_case_held_versions(case_id,source_kind,source_id,content)
      values(old.case_id,'message',old.id,to_jsonb(old));
  end if;
  return new;
end;
$$;
revoke all on function public.capture_held_support_message_version() from public,anon,authenticated;
create trigger capture_held_support_message_version before update on public.support_case_messages
  for each row execute function public.capture_held_support_message_version();

-- The owner sees versions only while the case remains held. UUID order is a
-- stable cursor, not chronological order. Clients must revisit the first page.
create function public.support_case_held_version_page(p_case_id uuid,p_after uuid default null,p_limit integer default 21)
returns table(version_id uuid,source_kind text,source_id uuid,captured_at timestamptz,content jsonb)
language plpgsql stable security definer set search_path=public as $$
begin
  perform public.require_coursework_retention_owner();
  if not public.coursework_active_actor() then raise exception 'coursework:not_allowed' using errcode='insufficient_privilege'; end if;
  if p_limit is null or p_limit<1 or p_limit>100 then raise exception 'invalid version page' using errcode='invalid_parameter_value'; end if;
  if not exists(select 1 from public.support_case_cleanup_holds where case_id=p_case_id) then
    raise exception 'support case is not held' using errcode='check_violation'; end if;
  return query select v.id,v.source_kind,v.source_id,v.captured_at,v.content from public.support_case_held_versions v
   where v.case_id=p_case_id and (p_after is null or v.id>p_after) order by v.id limit p_limit;
end;
$$;
revoke all on function public.support_case_held_version_page(uuid,uuid,integer) from public,anon;
grant execute on function public.support_case_held_version_page(uuid,uuid,integer) to authenticated;

create or replace function public.change_support_case_cleanup_hold(p_case_id uuid,p_action text,p_reason text)
returns boolean language plpgsql security definer set search_path=public as $$
declare v_actor uuid:=public.current_user_id(); v_deferred record;
begin
  perform public.lock_coursework_erasure_review_owner();
  if p_action not in ('hold','release') or p_action is null or length(trim(coalesce(p_reason,''))) not between 3 and 1000 then
    raise exception 'choose an action and give a reason' using errcode='check_violation'; end if;
  perform 1 from public.support_cases where id=p_case_id for update;
  if not found then raise exception 'support case not found' using errcode='no_data_found'; end if;
  if p_action='hold' then
    insert into public.support_case_cleanup_holds(case_id,opened_by,reason) values(p_case_id,v_actor,trim(p_reason)) on conflict do nothing;
    if not found then return false; end if;
  else
    -- If there is no hold, a duplicate release is a no-op and must not
    -- accidentally process anything. The case row is already locked.
    if not exists(select 1 from public.support_case_cleanup_holds where case_id=p_case_id) then return false; end if;
    -- The case lock remains held; rollback restores the pause if erasure fails.
    delete from public.support_case_cleanup_holds where case_id=p_case_id;
    delete from public.support_case_held_versions where case_id=p_case_id;
    -- If child purge deferred this link, remove it now, but only if the case
    -- still points to the same child. The task and hold go in this transaction.
    update public.support_cases c set learner_profile_id=null
      from public.support_case_deferred_child_links d
      where c.id=p_case_id and d.case_id=c.id and c.learner_profile_id=d.child_id;
    delete from public.support_case_deferred_child_links where case_id=p_case_id;
    for v_deferred in select * from public.support_case_deferred_erasures where case_id=p_case_id order by actor_id loop
      delete from public.support_case_messages where case_id=p_case_id and author_user_id=v_deferred.actor_id;
      if v_deferred.requester_name is not null then
        update public.support_cases set subject='[erased]',body='[erased]',
          resolution_note=public.redact_name(resolution_note,v_deferred.requester_name)
          where id=p_case_id;
        update public.support_case_messages set body=public.redact_name(body,v_deferred.requester_name)
          where case_id=p_case_id and public.redact_name(body,v_deferred.requester_name) <> body;
      end if;
    end loop;
    delete from public.support_case_deferred_erasures where case_id=p_case_id;
  end if;
  insert into public.support_case_cleanup_hold_events(case_id,actor,action,reason)
    values(p_case_id,v_actor,case when p_action='hold' then 'held' else 'released' end,trim(p_reason));
  return true;
end;
$$;
