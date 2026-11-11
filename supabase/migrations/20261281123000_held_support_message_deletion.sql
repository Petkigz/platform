-- Guard held messages even when a writer other than the retention job tries
-- to delete them. The case lock serializes this check with hold/release. A
-- competing lock order can cause a deadlock; PostgreSQL then aborts a whole
-- transaction, so the caller must retry. This is not provider-side protection.
create function public.guard_held_support_message_delete()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  perform 1 from public.support_cases where id=old.case_id for update;
  if exists(select 1 from public.support_case_cleanup_holds where case_id=old.case_id) then
    raise exception 'support case messages are held from deletion' using errcode='check_violation';
  end if;
  return old;
end;
$$;
revoke all on function public.guard_held_support_message_delete() from public,anon,authenticated;
create trigger held_support_message_deletion_guard before delete on public.support_case_messages
  for each row execute function public.guard_held_support_message_delete();

-- Release removes the pause before applying deferred erasures, under the same
-- case lock and within one transaction. Failure restores the pause and messages.
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
