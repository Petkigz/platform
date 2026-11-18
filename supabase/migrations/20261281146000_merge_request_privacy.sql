-- Asking for a merge no longer says who is registered.
--
-- `request_account_merge()` answered an address nobody has with "there is no
-- account with that email address", and any other address with a request.
-- Any signed-in account could ask about any address, as often as it liked,
-- and it could ask even while a request of its own was waiting, because the
-- address was looked up before that was checked. That is a list of who has an
-- account here, for anybody who signs up.
--
-- `my_merge_requests()` then handed the asking account the display name and
-- the user id of the account at that address.
--
-- The owner's decision (2026-11-18) was to do both of the things on offer:
--
--   1. **Every address is answered the same way.** A request is recorded and
--      waits fourteen days whether or not the address has an account. One
--      addressed to nobody has no account to wait on; it can be withdrawn
--      like any other and nobody can answer it. The reply, the list the
--      asking account reads and the rows it can select are the same in both
--      cases.
--   2. **An account may ask five times in twenty-four hours.** Each ask is a
--      row, withdrawn or not, so the count is the table's own.
--
-- And the asking account is no longer told anything about the other one: not
-- its name, not its id, and not, by reading the table, whether it exists.
--
-- What this costs, said plainly: somebody who mistypes an address is not told.
-- The request waits and nobody answers it. The screen says that a request
-- reaches an account only if the address is that account's.
--
-- Not changed: what a merge moves, what stops one, who may answer one. A
-- request the other account has to answer still shows that account who is
-- asking, because it has to decide.

-- A request addressed to nobody has no target.
alter table public.account_merge_requests
  alter column target_user_id drop not null;

comment on column public.account_merge_requests.target_user_id is
  'The account that would survive. Null when the address asked about has no '
  'account: the request is recorded all the same, so that asking does not '
  'reveal who is registered. Never shown to the account that asked.';

-- The asking account read its own rows, and `target_user_id` in them is a
-- user id when the address has an account and null when it does not. It
-- reads its requests through `my_merge_requests()`, which says neither.
drop policy account_merge_requests_read on public.account_merge_requests;

create policy account_merge_requests_read on public.account_merge_requests
  for select to authenticated
  using (
    target_user_id = public.current_user_id()
    or public.is_privileged(public.current_user_id())
  );

-- ---------------------------------------------------------------------------
-- Asking
-- ---------------------------------------------------------------------------
create or replace function public.request_account_merge(p_target_email text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor  uuid := public.current_user_id();
  v_email  text;
  v_target uuid;
  v_existing public.account_merge_requests;
  v_recent integer;
  v_id     uuid;
begin
  if v_actor is null then
    raise exception 'sign in to merge an account'
      using errcode = 'insufficient_privilege';
  end if;
  if not public.setting_bool('platform.account_merge', false) then
    raise exception 'merging accounts is not enabled on this platform yet'
      using errcode = 'feature_not_supported';
  end if;

  v_email := lower(btrim(coalesce(p_target_email, '')));
  if v_email = '' then
    raise exception 'type the email address of the account you want to keep'
      using errcode = 'invalid_parameter_value';
  end if;

  -- Asking twice is not an error: it answers with the request already
  -- waiting. Checked before the address is looked at, so a second ask says
  -- nothing about the second address.
  select * into v_existing
    from public.account_merge_requests
   where duplicate_user_id = v_actor and status = 'pending';

  if found then
    return jsonb_build_object('requested', false, 'alreadyPending', true,
                              'requestId', v_existing.id, 'expiresAt', v_existing.expires_at);
  end if;

  select id into v_target from auth.users where lower(email) = v_email;

  -- The account's own address is the one thing it may be told about: it
  -- already knows it.
  if v_target = v_actor then
    raise exception 'that is this account; sign in to the other one to merge it'
      using errcode = 'invalid_parameter_value';
  end if;

  -- Five asks in twenty-four hours, counted whether or not they were
  -- withdrawn and whoever they were addressed to.
  select count(*) into v_recent
    from public.account_merge_requests
   where duplicate_user_id = v_actor
     and requested_at > now() - interval '24 hours';

  if v_recent >= 5 then
    raise exception 'this account has asked for a merge too many times today; try again tomorrow'
      using errcode = 'program_limit_exceeded';
  end if;

  -- Recorded the same way whether or not anybody has that address.
  insert into public.account_merge_requests (duplicate_user_id, target_user_id)
  values (v_actor, v_target)
  returning id into v_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'account.merge_requested', 'user_profile', v_actor,
          jsonb_build_object('targetUserId', v_target));

  return jsonb_build_object('requested', true, 'alreadyPending', false,
                            'requestId', v_id, 'expiresAt',
                            (select expires_at from public.account_merge_requests where id = v_id));
end;
$$;

comment on function public.request_account_merge(text) is
  'Asks for this account to be merged into the account at an address. Answers '
  'the same way whether or not the address has an account, and at most five '
  'times in twenty-four hours.';

-- ---------------------------------------------------------------------------
-- Reading them
-- ---------------------------------------------------------------------------
create or replace function public.my_merge_requests()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
begin
  if v_actor is null then
    raise exception 'sign in to see merge requests'
      using errcode = 'insufficient_privilege';
  end if;

  return jsonb_build_object(
    'enabled', public.setting_bool('platform.account_merge', false),
    -- Where this account would be absorbed into: it must act, so it is shown
    -- who is asking.
    'incoming', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', r.id,
               'status', r.status,
               'requestedAt', r.requested_at,
               'expiresAt', r.expires_at,
               'expired', r.status = 'pending' and r.expires_at < now(),
               'otherName', up.display_name,
               'otherUserId', r.duplicate_user_id,
               'preview', public.merge_blocks(r.duplicate_user_id, r.target_user_id)
             ) order by r.requested_at desc)
        from public.account_merge_requests r
        left join public.user_profiles up on up.user_id = r.duplicate_user_id
       where r.target_user_id = v_actor
         and r.status in ('pending', 'completed')
    ), '[]'::jsonb),
    -- Where this account asked to go. Nothing about the other account: not
    -- its name, not its id, not whether there is one.
    'outgoing', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', r.id,
               'status', r.status,
               'requestedAt', r.requested_at,
               'expiresAt', r.expires_at,
               'expired', r.status = 'pending' and r.expires_at < now(),
               'summary', r.summary
             ) order by r.requested_at desc)
        from public.account_merge_requests r
       where r.duplicate_user_id = v_actor
         and r.status in ('pending', 'completed', 'declined', 'cancelled', 'expired')
    ), '[]'::jsonb)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Answering
--
-- The inner function compares the request's target with the caller using
-- `<>`. With no target that comparison is null, not true, so a request
-- addressed to nobody would have been answerable by anybody who knew its id,
-- the account that made it included. It is refused here, in the words every
-- other caller who is not the account asked already gets, after the same two
-- checks the inner function makes first.
-- ---------------------------------------------------------------------------
create or replace function public.decide_account_merge(p_request uuid, p_accept boolean, p_confirm text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_actor uuid := public.current_user_id(); v_dup uuid;
begin
  if v_actor is not null
     and public.setting_bool('platform.account_merge', false)
     and exists (select 1 from public.account_merge_requests
                  where id = p_request and target_user_id is null) then
    raise exception 'only the account that would survive can decide'
      using errcode = 'insufficient_privilege';
  end if;

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
