-- The staff switchboard: who may appoint, and who may refund.
--
-- The journeys this unit walks are staff journeys, and walking them as each
-- role found the same shape twice: a surface that says "money is finance's
-- work" and a writer underneath that admitted any privileged caller.
--
-- 1. ANY PRIVILEGED ROLE COULD APPOINT A PLATFORM ADMIN.
--
-- `assign_role()` asked only `is_privileged`, and every privileged role has
-- that. So a support agent — the least-privileged staff role, kept that way
-- deliberately, because "somebody who can read a case and refund an order
-- should not thereby be able to appoint the scholars" — could grant
-- `platform_admin` to anybody, including themselves, with no reason a reviewer
-- would find strange. `revoke_role()` had the same gate, which made it worse:
-- a support agent could revoke the owner's `platform_admin`, and the "last
-- privileged account cannot be revoked" guard did not fire, because the agent
-- revoking it counted as the remaining privileged account. Two statements from
-- the least-trusted staff account and the owner is locked out of their own
-- platform.
--
-- Both are now the platform admin's alone. Everything else about them is
-- unchanged: the actor still comes from the session, a privileged grant still
-- needs a written reason, a revocation still needs one, the audit rows are the
-- same, and the lockout guard still stands. A platform admin may still appoint
-- another platform admin — the owner is one person and a platform they cannot
-- hand over is a platform that cannot change hands.
--
-- 2. A SUPPORT AGENT COULD DECIDE A REFUND.
--
-- `decide_refund_request()` asked `is_privileged` too. Every screen said
-- otherwise: `/admin` files refunds under money, which it shows only to finance
-- and the owner; `staff_attention()` gives the refund count to finance only,
-- and a test pins it; the role table describes `finance_admin` as "refunds,
-- reconciliation, payment administration". A support agent who found the
-- address was shown a queue whose buttons worked, which is the one thing the
-- console was built to stop.
--
-- `request_refund()` deliberately exempts staff from the refund window, because
-- a support call that ends in "the window closed, nothing I can do" loses a
-- family. **That ability stays**: support opens a refund on a customer's
-- behalf, and finance decides it. Opening and deciding were never meant to be
-- the same signature.
--
-- What is deliberately NOT changed here, and is recorded in DECISIONS instead:
-- `record_payment_success()` (manual evidence) and `complete_refund()` (manual
-- settlement) still admit any privileged caller. Neither is reachable from any
-- screen — both are waiting on a provider — and both have been redefined
-- several times since. Rewriting a ledger writer to change one clause is how a
-- ledger acquires a bug, so they are written down as a known edge rather than
-- touched in the same unit that found them.

create or replace function public.assign_role(
  p_user_id   uuid,
  p_role_code text,
  p_reason    text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role       public.roles;
  v_existing   uuid;
  v_actor      uuid;
begin
  -- The actor comes from the session, never from an argument. Taking it as a
  -- parameter would let any signed-in user pass a privileged user's id and
  -- satisfy the check below -- the exact hole that was just closed in the
  -- earnings and entitlement writers. Role assignment is always a human
  -- acting, so there is no system path that needs an explicit actor.
  v_actor := public.current_user_id();

  if v_actor is null then
    raise exception 'sign in to assign a role'
      using errcode = 'insufficient_privilege';
  end if;

  if not public.is_privileged(v_actor) then
    raise exception 'only staff may assign roles'
      using errcode = 'insufficient_privilege';
  end if;

  if not exists (select 1 from public.user_profiles where user_id = p_user_id) then
    raise exception 'user % not found', p_user_id
      using errcode = 'no_data_found';
  end if;

  select * into v_role from public.roles where code = p_role_code;
  if not found then
    raise exception 'no such role: %', p_role_code
      using errcode = 'no_data_found';
  end if;

  -- A privileged role is the power to change what other people may do. It
  -- needs a written reason in the audit trail, not just a click.
  if v_role.is_privileged and coalesce(trim(p_reason), '') = '' then
    raise exception
      'granting the privileged role % requires a written reason', p_role_code
      using errcode = 'invalid_parameter_value';
  end if;

  -- ...and it is the owner's to give. A support agent is the least-privileged
  -- staff role on purpose; letting it hand out platform_admin would make every
  -- other boundary in this file decorative, because the shortest path to
  -- any permission would be to grant the one that has them all.
  if v_role.is_privileged
     and not public.has_role(v_actor, 'platform_admin') then
    raise exception
      'only the platform admin may grant the privileged role %', p_role_code
      using errcode = 'insufficient_privilege';
  end if;

  -- Idempotent. ura_one_active_per_role_key is a partial unique index, so a
  -- second active grant would collide; holding a role twice means nothing.
  select id into v_existing
    from public.user_role_assignments
   where user_id = p_user_id and role_id = v_role.id and revoked_at is null;

  if v_existing is not null then
    return v_existing;
  end if;

  insert into public.user_role_assignments (user_id, role_id, assigned_by)
  values (p_user_id, v_role.id, v_actor)
  returning id into v_existing;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'role.assigned', 'user', p_user_id,
          jsonb_build_object('role', v_role.code,
                             'privileged', v_role.is_privileged,
                             'reason', nullif(trim(coalesce(p_reason, '')), '')));

  return v_existing;
end;
$$;

revoke execute on function public.assign_role(uuid, text, text) from public;
grant execute on function public.assign_role(uuid, text, text) to authenticated;

comment on function public.assign_role(uuid, text, text) is
  'Grants a role to a user. Privileged actor only for ordinary roles; only the platform admin may grant a privileged one, with a written reason. Idempotent.';

create or replace function public.revoke_role(
  p_user_id   uuid,
  p_role_code text,
  p_reason    text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role        public.roles;
  v_assignment  public.user_role_assignments;
  v_remaining   integer;
  v_actor       uuid;
begin
  -- From the session, not an argument. See assign_role().
  v_actor := public.current_user_id();

  if v_actor is null then
    raise exception 'sign in to revoke a role'
      using errcode = 'insufficient_privilege';
  end if;

  if not public.is_privileged(v_actor) then
    raise exception 'only staff may revoke roles'
      using errcode = 'insufficient_privilege';
  end if;

  -- D7: a role someone held is governance history. Taking it back needs a
  -- reason on the record, and ura_revocation_reason_required enforces it too.
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'revoking a role requires a written reason'
      using errcode = 'invalid_parameter_value';
  end if;

  select * into v_role from public.roles where code = p_role_code;
  if not found then
    raise exception 'no such role: %', p_role_code
      using errcode = 'no_data_found';
  end if;

  -- Taking a privileged role away is the same power as giving it: a support
  -- agent who could revoke the owner's platform_admin could lock the owner out
  -- of their own platform, and the "last privileged account" guard below would
  -- not fire, because the agent revoking it is themselves privileged.
  if v_role.is_privileged
     and not public.has_role(v_actor, 'platform_admin') then
    raise exception
      'only the platform admin may revoke the privileged role %', p_role_code
      using errcode = 'insufficient_privilege';
  end if;

  select * into v_assignment
    from public.user_role_assignments
   where user_id = p_user_id and role_id = v_role.id and revoked_at is null
   for update;

  if not found then
    -- Nothing to revoke is not an error; a retry or a stale screen must not
    -- fail for the operator.
    return false;
  end if;

  -- Lockout guard. If this is the last active privileged account, removing it
  -- leaves nobody who can appoint anyone, and the platform cannot be staffed
  -- again without direct database access. That is a one-way door, so it is
  -- refused here rather than discovered later.
  if v_role.is_privileged then
    select count(distinct ura.user_id) into v_remaining
      from public.user_role_assignments ura
      join public.roles r on r.id = ura.role_id
     where r.is_privileged
       and ura.revoked_at is null
       and ura.user_id <> p_user_id;

    if coalesce(v_remaining, 0) = 0 then
      raise exception
        'refusing to revoke the last privileged account; appoint someone else first'
        using errcode = 'check_violation';
    end if;
  end if;

  update public.user_role_assignments
     set revoked_at = now(),
         revocation_reason = trim(p_reason)
   where id = v_assignment.id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'role.revoked', 'user', p_user_id,
          jsonb_build_object('role', v_role.code,
                             'privileged', v_role.is_privileged,
                             'reason', trim(p_reason)));

  return true;
end;
$$;

revoke execute on function public.revoke_role(uuid, text, text) from public;
grant execute on function public.revoke_role(uuid, text, text) to authenticated;

comment on function public.revoke_role(uuid, text, text) is
  'Soft-revokes a role with a written reason; only the platform admin may revoke a privileged one, and never the last privileged account.';

create or replace function public.decide_refund_request(
  p_request_id uuid,
  p_approve boolean,
  p_notes text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
  v_req   public.refund_requests;
  v_order public.orders;
  v_txn   uuid;
begin
  if v_actor is null then
    raise exception 'sign in to decide a refund' using errcode = 'insufficient_privilege';
  end if;

  -- Money going back out is finance's decision. This was `is_privileged`, which
  -- admitted a support agent — while the console filed refunds under money, the
  -- attention queue kept the refund count from support, and the role table says
  -- refunds are the finance admin's. Support still opens a refund on a
  -- customer's behalf (request_refund() exempts staff from the window for
  -- exactly that call); approving it is somebody else's signature.
  if not (public.has_role(v_actor, 'finance_admin')
          or public.has_role(v_actor, 'platform_admin')) then
    raise exception 'only a finance admin or platform admin may decide a refund'
      using errcode = 'insufficient_privilege';
  end if;

  select * into v_req from public.refund_requests where id = p_request_id;
  if v_req.id is null then
    raise exception 'refund request not found' using errcode = 'P0002';
  end if;

  if v_req.status <> 'requested' then
    raise exception
      'that refund is already %', v_req.status
      using errcode = 'check_violation';
  end if;

  -- rr_not_self_approved already forbids this. Saying it plainly is the
  -- difference between a decision that is understood and one that looks broken.
  if v_req.requested_by = v_actor then
    raise exception
      'you cannot decide a refund you requested yourself'
      using errcode = 'insufficient_privilege';
  end if;

  if not p_approve and coalesce(trim(p_notes), '') = '' then
    raise exception
      'declining a refund needs a written reason'
      using errcode = 'check_violation';
  end if;

  update public.refund_requests
     set status         = case when p_approve then 'approved' else 'rejected' end,
         decided_by     = v_actor,
         decided_at     = now(),
         decision_notes = nullif(trim(coalesce(p_notes, '')), '')
   where id = p_request_id;

  -- Approving is a decision, not a payment. The transaction sits in 'pending'
  -- until the provider confirms, and only then does the ledger move. That gap
  -- is what D4 means by "a refund request is not a completed refund".
  if p_approve then
    select * into v_order from public.orders where id = v_req.order_id;

    insert into public.refund_transactions
      (refund_request_id, order_id, amount_minor, currency_code, status)
    values
      (p_request_id, v_req.order_id, v_req.requested_amount_minor,
       v_order.currency_code, 'pending')
    returning id into v_txn;
  end if;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (
    v_actor,
    case when p_approve then 'refund.approved' else 'refund.rejected' end,
    'refund_request',
    p_request_id,
    jsonb_build_object(
      'order_id',      v_req.order_id,
      'amount_minor',  v_req.requested_amount_minor,
      'transaction_id', v_txn
    )
  );
end;
$$;

revoke execute on function public.decide_refund_request(uuid, boolean, text) from public;
grant execute on function public.decide_refund_request(uuid, boolean, text) to authenticated;

comment on function public.decide_refund_request(uuid, boolean, text) is
  'Finance admin or platform admin approves or declines. Approving creates a pending refund transaction; no money moves until it completes.';
