-- A named owner is a person, not a role that can be moved automatically with
-- an account. Prevent self-service closure or absorption while either private
-- owner appointment points at that account. A trusted operator must arrange an
-- individual recovery/transfer first; this migration does not invent one.
-- Serialize bootstrap, closure and accepting a merge on the same profile row.
create or replace function public.bootstrap_safeguarding_owner(p_owner uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform 1 from public.user_profiles where user_id = p_owner for update;
  if not found or not public.has_role(p_owner, 'platform_admin') then
    raise exception 'the safeguarding owner must be an active platform admin' using errcode = 'check_violation';
  end if;
  insert into public.safeguarding_owner (singleton, owner_user_id) values (true, p_owner);
  insert into public.governance_audit_events(actor, action, target_type, target_id, detail)
    values (null, 'safeguarding.owner_bootstrapped', 'user_profile', p_owner,
            jsonb_build_object('method', 'database operator bootstrap'));
end;
$$;

create or replace function public.bootstrap_refund_approval_owner(p_owner uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform 1 from public.user_profiles where user_id = p_owner for update;
  if not found or not public.has_role(p_owner, 'platform_admin') then
    raise exception 'the refund owner must be an active platform admin' using errcode = 'check_violation';
  end if;
  insert into public.refund_approval_owner (singleton, owner_user_id) values (true, p_owner);
  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (null, 'refund.owner_bootstrapped', 'user_profile', p_owner,
          jsonb_build_object('method', 'database operator bootstrap'));
end;
$$;

alter function public.erase_my_account(text) rename to erase_my_account_internal;
revoke all on function public.erase_my_account_internal(text) from public, anon, authenticated;
create function public.erase_my_account(p_confirm text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_actor uuid := public.current_user_id(); v_status text; v_deleted timestamptz;
begin
  if v_actor is not null then
    select account_status, deleted_at into v_status, v_deleted
      from public.user_profiles where user_id = v_actor for update;
    -- Keep the existing idempotent answer for accounts already closed.
    if found and v_status <> 'closed' and v_deleted is null and
       (exists (select 1 from public.safeguarding_owner where singleton and owner_user_id=v_actor)
        or exists (select 1 from public.refund_approval_owner where singleton and owner_user_id=v_actor)) then
      raise exception 'this account has an owner appointment; contact privacy@ayahspring.com for individual review before closing it'
        using errcode = 'check_violation';
    end if;
  end if;
  return public.erase_my_account_internal(p_confirm);
end;
$$;
revoke all on function public.erase_my_account(text) from public, anon;
grant execute on function public.erase_my_account(text) to authenticated;

-- Only the parties to a real pending request receive the additional preview;
-- arbitrary UUID pairs must not become an owner-identity lookup.
alter function public.merge_blocks(uuid, uuid) rename to merge_blocks_internal;
revoke all on function public.merge_blocks_internal(uuid, uuid) from public, anon, authenticated;
create function public.merge_blocks(p_duplicate uuid, p_target uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_result jsonb := public.merge_blocks_internal(p_duplicate, p_target); v_actor uuid := public.current_user_id();
begin
  if v_actor in (p_duplicate, p_target) and exists (
    select 1 from public.account_merge_requests r
     where r.duplicate_user_id = p_duplicate and r.target_user_id = p_target and r.status = 'pending'
  ) and (exists (select 1 from public.safeguarding_owner where singleton and owner_user_id=p_duplicate)
         or exists (select 1 from public.refund_approval_owner where singleton and owner_user_id=p_duplicate)) then
    v_result := jsonb_set(v_result, '{ok}', 'false'::jsonb);
    v_result := jsonb_set(v_result, '{blocks}', (v_result->'blocks') || jsonb_build_array(
      'the account being absorbed has an owner appointment; contact privacy@ayahspring.com for individual review'));
  end if;
  return v_result;
end;
$$;
revoke all on function public.merge_blocks(uuid,uuid) from public, anon;
grant execute on function public.merge_blocks(uuid,uuid) to authenticated;

alter function public.decide_account_merge(uuid, boolean, text) rename to decide_account_merge_internal;
revoke all on function public.decide_account_merge_internal(uuid,boolean,text) from public, anon, authenticated;
create function public.decide_account_merge(p_request uuid, p_accept boolean, p_confirm text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_actor uuid := public.current_user_id(); v_dup uuid;
begin
  -- The inner function still handles permission, pending state, expiry and
  -- declining. Do not block a decline, a retry or an unrelated caller.
  if p_accept is true then
    select duplicate_user_id into v_dup from public.account_merge_requests
     where id=p_request and target_user_id=v_actor and status='pending' and expires_at >= now();
    if found then
      perform 1 from public.user_profiles where user_id=v_dup for update;
      if exists (select 1 from public.safeguarding_owner where singleton and owner_user_id=v_dup)
         or exists (select 1 from public.refund_approval_owner where singleton and owner_user_id=v_dup) then
        raise exception 'this account has an owner appointment; contact privacy@ayahspring.com for individual review before merging it'
          using errcode = 'check_violation';
      end if;
    end if;
  end if;
  return public.decide_account_merge_internal(p_request, p_accept, p_confirm);
end;
$$;
revoke all on function public.decide_account_merge(uuid,boolean,text) from public, anon;
grant execute on function public.decide_account_merge(uuid,boolean,text) to authenticated;
