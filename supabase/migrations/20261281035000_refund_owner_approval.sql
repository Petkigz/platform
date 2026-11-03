-- One explicit account, never all holders of a role. Empty means approvals are
-- disabled until the database operator performs the one-time bootstrap.
create table public.refund_approval_owner (
  singleton boolean primary key default true check (singleton),
  owner_user_id uuid not null references public.user_profiles(user_id) on delete restrict,
  configured_at timestamptz not null default now()
);
alter table public.refund_approval_owner enable row level security;
revoke all on public.refund_approval_owner from public, anon, authenticated;

-- Deliberately unavailable to application roles: whoever can grant an admin role
-- through the dashboard must not be able to appoint themselves owner. This is a
-- one-time database-operator bootstrap, not a claim that role implies ownership.
create function public.bootstrap_refund_approval_owner(p_owner uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_owner is null or not public.has_role(p_owner, 'platform_admin') then
    raise exception 'the refund owner must be an active platform admin' using errcode = 'check_violation';
  end if;
  insert into public.refund_approval_owner (singleton, owner_user_id) values (true, p_owner);
  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
    values (null, 'refund.owner_bootstrapped', 'user_profile', p_owner,
            jsonb_build_object('method', 'database operator bootstrap'));
end;
$$;
revoke all on function public.bootstrap_refund_approval_owner(uuid) from public, anon, authenticated;

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
  v_owner uuid;
begin
  if v_actor is null then
    raise exception 'sign in to decide a refund' using errcode = 'insufficient_privilege';
  end if;

  if p_approve is null then
    raise exception 'choose approve or decline' using errcode = 'check_violation';
  end if;

  if p_approve then
    select owner_user_id into v_owner from public.refund_approval_owner where singleton;
    if v_owner is null then
      raise exception 'refund approval owner is not configured; ask the operator to complete setup'
        using errcode = 'insufficient_privilege';
    end if;
    if v_actor <> v_owner or not public.has_role(v_actor, 'platform_admin') then
      raise exception 'only the configured owner may approve a refund'
        using errcode = 'insufficient_privilege';
    end if;
  elsif not (public.has_role(v_actor, 'finance_admin')
          or public.has_role(v_actor, 'platform_admin')) then
    raise exception 'only a finance admin or platform admin may decline a refund'
      using errcode = 'insufficient_privilege';
  end if;

  select * into v_req from public.refund_requests where id = p_request_id for update;
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
    select * into v_order from public.orders where id = v_req.order_id for update;

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

revoke execute on function public.decide_refund_request(uuid, boolean, text) from public, anon;
grant execute on function public.decide_refund_request(uuid, boolean, text) to authenticated;
comment on function public.decide_refund_request(uuid, boolean, text) is
  'Only the configured owner may approve, never their own request; approval records a pending transaction and does not initiate payment.';

-- Status is scoped to the caller and does not disclose the owner's identity.
create function public.refund_approval_status()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_actor uuid := public.current_user_id();
  v_owner uuid;
begin
  if v_actor is null or not public.is_privileged(v_actor) then
    raise exception 'only staff may inspect refund approval status' using errcode = 'insufficient_privilege';
  end if;
  select owner_user_id into v_owner from public.refund_approval_owner where singleton;
  return jsonb_build_object('configured', v_owner is not null,
    'is_owner', coalesce(v_actor = v_owner and public.has_role(v_actor, 'platform_admin'), false));
end;
$$;
revoke all on function public.refund_approval_status() from public, anon;
grant execute on function public.refund_approval_status() to authenticated;
