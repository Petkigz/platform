-- Preserve a held case's child link during child-record purge without retaining
-- the rest of the child record. This is a private deferred erasure, not proof
-- that information erased elsewhere or external copies can be recovered.
create table public.support_case_deferred_child_links (
  case_id uuid primary key references public.support_cases(id) on delete restrict,
  child_id uuid not null references public.learner_profiles(id) on delete restrict
);
alter table public.support_case_deferred_child_links enable row level security;
revoke all on public.support_case_deferred_child_links from public,anon,authenticated;

create function public.defer_held_support_child_unlink()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if current_setting('app.child_coursework_erasure',true)='on'
    and old.learner_profile_id is not null and new.learner_profile_id is null
    and exists(select 1 from public.support_case_cleanup_holds where case_id=old.id) then
    insert into public.support_case_deferred_child_links(case_id,child_id)
      values(old.id,old.learner_profile_id) on conflict (case_id) do nothing;
    return null;
  end if;
  return new;
end;
$$;
revoke all on function public.defer_held_support_child_unlink() from public,anon,authenticated;
create trigger held_support_child_unlink_guard before update on public.support_cases
  for each row execute function public.defer_held_support_child_unlink();

-- Lock learner then linked cases before the existing purge. The hold writer
-- locks the case; recheck by the later update's trigger after those locks.
-- Competing lock orders may still abort a transaction and require retry.
alter function public.purge_learner_record(uuid) rename to purge_learner_record_before_held_case_guard;
revoke all on function public.purge_learner_record_before_held_case_guard(uuid) from public,anon,authenticated;
create function public.purge_learner_record(p_learner_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_result jsonb; v_count integer;
begin
  perform 1 from public.learner_profiles where id=p_learner_id for update;
  perform c.id from public.support_cases c where c.learner_profile_id=p_learner_id order by c.id for update;
  v_result:=public.purge_learner_record_before_held_case_guard(p_learner_id);
  select count(*)::int into v_count from public.support_case_deferred_child_links where child_id=p_learner_id;
  if v_count>0 then v_result:=jsonb_set(v_result,'{nothingLeft}','false'::jsonb,true); end if;
  return v_result || jsonb_build_object('heldSupportCaseLinks',v_count);
end;
$$;
revoke all on function public.purge_learner_record(uuid) from public,anon,authenticated;

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
