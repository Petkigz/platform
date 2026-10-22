-- ---------------------------------------------------------------------------
-- Asking to be paid, and the machinery that stops it from being a lie.
--
-- `instructor_earnings_entries` records what a teacher has earned and
-- `instructor_payouts` records money actually sent. Between the two there was
-- nothing: no request, no queue, no hold period, no place to say "the refund
-- window has not closed on that sale yet".
--
-- This migration adds the request. It does NOT add a provider, and it cannot:
-- `teaching.payouts` stays off. What it does add is a path that is correct the
-- day a provider exists, and harmless while none does.
--
-- Three rules, each because a payout is somebody's rent.
--
--   1. An earning is not payable until its refund window has closed. The window
--      is `teaching.payout_hold_days` (default 14), so the owner can move it
--      without a migration.
--   2. One open request per teacher per currency. Two requests over the same
--      shillings would pay them twice, and the unique index is what makes that
--      impossible rather than unlikely.
--   3. Completing a payout is the only thing that marks an entry `paid`, and it
--      can only be done by finance with a provider reference in hand. A
--      request that quietly marked itself paid would be the exact lie the
--      earnings screen refuses to tell.
--
-- The amount on a request is an estimate. Entries reverse and new ones accrue
-- while a request waits, so what actually moves is the ledger at the moment
-- finance completes it — and the teacher's screen says so.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- The hold period, as a setting
-- ---------------------------------------------------------------------------
insert into public.platform_settings
  (key, value_type, value_text, description, gate_type, preconditions, flag_group)
values
  ('teaching.payout_hold_days', 'integer', '14',
   'Days an earning must sit before a teacher may ask to be paid, so a refund can land first. 0 means no hold.',
   'admin',
   'Chosen by the owner when payouts are enabled. Until then the default of 14 days is unused, because no request can be made.',
   'Teaching')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- Columns the request needs. Nothing on the existing table moves.
-- ---------------------------------------------------------------------------
alter table public.instructor_payouts
  add column if not exists requested_at   timestamptz,
  add column if not exists tax_ack_at     timestamptz,
  add column if not exists tax_ack_by     uuid references public.user_profiles (user_id) on delete set null,
  add column if not exists cancelled_at   timestamptz,
  add column if not exists failure_reason text;

alter table public.instructor_payouts
  add constraint ip_cancelled_agrees check (
    (cancelled_at is null) = (status <> 'cancelled')
  ),
  add constraint ip_tax_ack_agrees check (
    (tax_ack_at is null) = (tax_ack_by is null)
  );

-- Rule 2: one open request per teacher per currency. A partial unique index
-- rather than a trigger, because this is exactly what a unique index is for.
create unique index if not exists ip_one_open_per_currency
  on public.instructor_payouts (instructor_user_id, currency_code)
  where status in ('scheduled', 'processing');

-- ---------------------------------------------------------------------------
-- instructor_payout_totals — internal
--
-- The split between "payable now" and "still in its refund window", per
-- currency. Deliberately not granted to anyone: it takes an instructor id as an
-- argument and would happily answer for somebody else. Callers are all
-- SECURITY DEFINER functions that have already decided who is asking.
-- ---------------------------------------------------------------------------
create or replace function public.instructor_payout_totals(
  p_instructor uuid,
  p_hold_days  integer
)
returns table (
  currency         text,
  eligible_minor   bigint,
  eligible_entries bigint,
  held_minor       bigint,
  held_entries     bigint,
  next_eligible_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select e.currency_code::text,
         coalesce(sum(e.net_amount_minor)
           filter (where e.accrued_at <= now() - make_interval(days => p_hold_days)), 0)::bigint,
         count(*)
           filter (where e.accrued_at <= now() - make_interval(days => p_hold_days)),
         coalesce(sum(e.net_amount_minor)
           filter (where e.accrued_at > now() - make_interval(days => p_hold_days)), 0)::bigint,
         count(*)
           filter (where e.accrued_at > now() - make_interval(days => p_hold_days)),
         min(e.accrued_at + make_interval(days => p_hold_days))
           filter (where e.accrued_at > now() - make_interval(days => p_hold_days))
    from public.instructor_earnings_entries e
   where e.instructor_user_id = p_instructor
     and e.status in ('accrued', 'payable')
   group by e.currency_code
$$;

revoke all on function public.instructor_payout_totals(uuid, integer) from public;

comment on function public.instructor_payout_totals(uuid, integer) is
  'Internal. Earned-and-not-reversed per currency, split by whether the refund hold has passed. Not granted: takes an instructor id.';

-- ---------------------------------------------------------------------------
-- my_payout_options() — what a teacher may ask for, and what is still on hold
-- ---------------------------------------------------------------------------
create or replace function public.my_payout_options()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor   uuid := public.current_user_id();
  v_enabled boolean;
  v_hold    integer;
  v_rows    jsonb := '[]'::jsonb;
  v_tot     record;
  v_open    record;
  v_ack     timestamptz;
begin
  if v_actor is null then
    raise exception 'sign in to see your payout options'
      using errcode = 'insufficient_privilege';
  end if;

  v_enabled := public.setting_bool('teaching.payouts', false);
  v_hold    := public.setting_int('teaching.payout_hold_days', 14);

  select max(p.tax_ack_at) into v_ack
    from public.instructor_payouts p
   where p.instructor_user_id = v_actor;

  -- Every currency this teacher has ever earned in, not only the ones with
  -- money currently owed: a currency that has been fully paid is still a fact
  -- about their account, and silently dropping the row would read as though the
  -- earnings had vanished.
  for v_tot in
    select c.currency,
           coalesce(t.eligible_minor, 0)    as eligible_minor,
           coalesce(t.eligible_entries, 0)  as eligible_entries,
           coalesce(t.held_minor, 0)        as held_minor,
           coalesce(t.held_entries, 0)      as held_entries,
           t.next_eligible_at
      from (select distinct e.currency_code::text as currency
              from public.instructor_earnings_entries e
             where e.instructor_user_id = v_actor) c
      left join public.instructor_payout_totals(v_actor, v_hold) t
             on t.currency = c.currency
     order by c.currency
  loop
    v_open := null;
    select p.id, p.status, p.amount_minor, p.requested_at, p.scheduled_at,
           p.destination_hint, p.provider, p.provider_reference,
           p.completed_at, p.cancelled_at, p.failure_reason
      into v_open
      from public.instructor_payouts p
     where p.instructor_user_id = v_actor
       and p.currency_code::text = v_tot.currency
       and p.status in ('scheduled', 'processing')
     order by p.scheduled_at desc
     limit 1;

    v_rows := v_rows || jsonb_build_object(
      'currency',         v_tot.currency,
      'eligibleMinor',    v_tot.eligible_minor::text,
      'eligibleEntries',  v_tot.eligible_entries,
      'heldMinor',        v_tot.held_minor::text,
      'heldEntries',      v_tot.held_entries,
      'nextEligibleAt',   v_tot.next_eligible_at,
      'openPayout', case when v_open.id is null then null else jsonb_build_object(
          'id',            v_open.id,
          'status',        v_open.status,
          'amountMinor',   v_open.amount_minor::text,
          'requestedAt',   coalesce(v_open.requested_at, v_open.scheduled_at),
          'destination',   v_open.destination_hint
        ) end
    );
  end loop;

  return jsonb_build_object(
    'payoutsEnabled',   v_enabled,
    'holdDays',         v_hold,
    'taxAcknowledgedAt', v_ack,
    'currencies',       v_rows
  );
end;
$$;

revoke all on function public.my_payout_options() from public;
grant execute on function public.my_payout_options() to authenticated;

comment on function public.my_payout_options() is
  'For the signed-in teacher: per currency, what could be requested now and what is still inside its refund hold. Never mixes currencies.';

-- ---------------------------------------------------------------------------
-- The history: what was asked for and what happened to it
-- ---------------------------------------------------------------------------
create or replace function public.my_payouts(p_limit integer default 20)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
  v_rows  jsonb := '[]'::jsonb;
  v_row   record;
begin
  if v_actor is null then
    raise exception 'sign in to read your payouts'
      using errcode = 'insufficient_privilege';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 200 then
    raise exception 'a payout history is between 1 and 200 rows'
      using errcode = 'invalid_parameter_value';
  end if;

  for v_row in
    select p.id, p.currency_code, p.amount_minor, p.status, p.scheduled_at,
           p.requested_at, p.completed_at, p.cancelled_at, p.failure_reason,
           p.destination_hint, p.provider, p.provider_reference,
           (select count(*) from public.instructor_payout_items i where i.payout_id = p.id) as item_count
      from public.instructor_payouts p
     where p.instructor_user_id = v_actor
     order by p.scheduled_at desc
     limit p_limit
  loop
    v_rows := v_rows || jsonb_build_object(
      'id',               v_row.id,
      'currency',         v_row.currency_code::text,
      'amountMinor',      v_row.amount_minor::text,
      'status',           v_row.status,
      'requestedAt',      coalesce(v_row.requested_at, v_row.scheduled_at),
      'completedAt',      v_row.completed_at,
      'cancelledAt',      v_row.cancelled_at,
      'failureReason',    v_row.failure_reason,
      'destination',      v_row.destination_hint,
      'provider',         v_row.provider,
      'providerReference',v_row.provider_reference,
      'itemCount',        v_row.item_count
    );
  end loop;

  return v_rows;
end;
$$;

revoke all on function public.my_payouts(integer) from public;
grant execute on function public.my_payouts(integer) to authenticated;

comment on function public.my_payouts(integer) is
  'The signed-in teacher''s own payout history, newest first.';

-- ---------------------------------------------------------------------------
-- request_instructor_payout()
-- ---------------------------------------------------------------------------
create or replace function public.request_instructor_payout(
  p_currency        text,
  p_destination     text,
  p_acknowledge_tax boolean
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor      uuid := public.current_user_id();
  v_currency   text;
  v_destination text;
  v_hold       integer;
  v_amount     bigint;
  v_id         uuid;
begin
  if v_actor is null then
    raise exception 'sign in to request a payout'
      using errcode = 'insufficient_privilege';
  end if;

  if not public.setting_bool('teaching.payouts', false) then
    raise exception 'payouts are not switched on yet: there is no provider, destination or tax treatment behind them'
      using errcode = 'insufficient_privilege';
  end if;

  v_currency := upper(btrim(coalesce(p_currency, '')));
  if v_currency !~ '^[A-Z]{3}$' then
    raise exception 'choose the currency to be paid in'
      using errcode = 'invalid_parameter_value';
  end if;

  v_destination := nullif(btrim(coalesce(p_destination, '')), '');
  if v_destination is null or length(v_destination) < 3 then
    raise exception 'say where the money should go, in enough detail for a human to act on'
      using errcode = 'invalid_parameter_value';
  end if;

  -- A person cannot meaningfully agree to a tax position they were not shown,
  -- and silence is not agreement.
  if p_acknowledge_tax is not true then
    raise exception 'confirm that declaring this income is your own responsibility before requesting a payout'
      using errcode = 'check_violation';
  end if;

  v_hold := public.setting_int('teaching.payout_hold_days', 14);

  select t.eligible_minor into v_amount
    from public.instructor_payout_totals(v_actor, v_hold) t
   where t.currency = v_currency;

  if coalesce(v_amount, 0) <= 0 then
    raise exception 'there is nothing to pay out in % yet: earnings inside the refund hold or already paid do not count', v_currency
      using errcode = 'check_violation';
  end if;

  if exists (
    select 1 from public.instructor_payouts p
     where p.instructor_user_id = v_actor
       and p.currency_code::text = v_currency
       and p.status in ('scheduled', 'processing')
  ) then
    raise exception 'you already have a payout waiting in %; cancel it before asking again', v_currency
      using errcode = 'check_violation';
  end if;

  insert into public.instructor_payouts
    (instructor_user_id, amount_minor, currency_code, destination_hint,
     status, scheduled_at, requested_at, tax_ack_at, tax_ack_by, created_by)
  values
    (v_actor, v_amount, v_currency, v_destination,
     'scheduled', now(), now(), now(), v_actor, v_actor)
  returning id into v_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'payout.requested', 'instructor_payout', v_id,
          jsonb_build_object('currency', v_currency,
                             'amountMinor', v_amount::text,
                             'holdDays', v_hold));

  return v_id;
exception
  when unique_violation then
    raise exception 'you already have a payout waiting in %; cancel it before asking again', v_currency
      using errcode = 'check_violation';
end;
$$;

revoke all on function public.request_instructor_payout(text, text, boolean) from public;
grant execute on function public.request_instructor_payout(text, text, boolean) to authenticated;

comment on function public.request_instructor_payout(text, text, boolean) is
  'Records a teacher''s request to be paid in one currency. Refused while teaching.payouts is off. Moves no money and marks no earning paid.';

-- ---------------------------------------------------------------------------
-- cancel_instructor_payout()
-- ---------------------------------------------------------------------------
create or replace function public.cancel_instructor_payout(p_payout_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
  v_row   public.instructor_payouts;
begin
  if v_actor is null then
    raise exception 'sign in to cancel a payout'
      using errcode = 'insufficient_privilege';
  end if;

  select * into v_row from public.instructor_payouts where id = p_payout_id for update;
  if not found then
    raise exception 'that payout does not exist'
      using errcode = 'no_data_found';
  end if;

  if v_row.instructor_user_id <> v_actor and not public.staff_only() then
    raise exception 'that payout is not yours'
      using errcode = 'insufficient_privilege';
  end if;

  if v_row.status <> 'scheduled' then
    raise exception 'a payout that is already % cannot be cancelled here', v_row.status
      using errcode = 'check_violation';
  end if;

  update public.instructor_payouts
     set status = 'cancelled', cancelled_at = now()
   where id = p_payout_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'payout.cancelled', 'instructor_payout', p_payout_id,
          jsonb_build_object('currency', v_row.currency_code::text,
                             'amountMinor', v_row.amount_minor::text,
                             'by', case when v_row.instructor_user_id = v_actor
                                        then 'teacher' else 'staff' end));

  return jsonb_build_object('id', p_payout_id, 'status', 'cancelled');
end;
$$;

revoke all on function public.cancel_instructor_payout(uuid) from public;
grant execute on function public.cancel_instructor_payout(uuid) to authenticated;

comment on function public.cancel_instructor_payout(uuid) is
  'Cancels a scheduled payout. The teacher may cancel their own; staff may cancel any. Nothing has moved, so nothing is reversed.';

-- ---------------------------------------------------------------------------
-- instructor_payout_queue() — the staff side
-- ---------------------------------------------------------------------------
create or replace function public.instructor_payout_queue(p_limit integer default 50)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor   uuid := public.current_user_id();
  v_hold    integer;
  v_enabled boolean;
  v_rows    jsonb := '[]'::jsonb;
  v_row     record;
  v_eligible bigint;
begin
  if v_actor is null then
    raise exception 'sign in to read the payout queue'
      using errcode = 'insufficient_privilege';
  end if;
  if not (public.has_role(v_actor, 'finance_admin') or public.has_role(v_actor, 'platform_admin')) then
    raise exception 'only a finance admin or platform admin may read the payout queue'
      using errcode = 'insufficient_privilege';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 200 then
    raise exception 'the payout queue is between 1 and 200 rows'
      using errcode = 'invalid_parameter_value';
  end if;

  v_hold    := public.setting_int('teaching.payout_hold_days', 14);
  v_enabled := public.setting_bool('teaching.payouts', false);

  for v_row in
    select p.id, p.instructor_user_id, p.currency_code, p.amount_minor, p.status,
           p.scheduled_at, p.requested_at, p.destination_hint, p.provider,
           p.provider_reference, p.completed_at, p.cancelled_at, p.failure_reason,
           u.display_name as teacher_name
      from public.instructor_payouts p
      left join public.user_profiles u on u.user_id = p.instructor_user_id
     order by p.scheduled_at desc
     limit p_limit
  loop
    -- What the ledger says today. A request made three weeks ago is not an
    -- instruction to pay a number that has since shrunk.
    v_eligible := 0;
    if v_row.status in ('scheduled', 'processing') then
      select coalesce(t.eligible_minor, 0) into v_eligible
        from public.instructor_payout_totals(v_row.instructor_user_id, v_hold) t
       where t.currency = v_row.currency_code::text;
    end if;

    v_rows := v_rows || jsonb_build_object(
      'id',              v_row.id,
      'teacherName',     v_row.teacher_name,
      'currency',        v_row.currency_code::text,
      'amountMinor',     v_row.amount_minor::text,
      'eligibleNowMinor', coalesce(v_eligible, 0)::text,
      'status',          v_row.status,
      'requestedAt',     coalesce(v_row.requested_at, v_row.scheduled_at),
      'destination',     v_row.destination_hint,
      'provider',        v_row.provider,
      'providerReference', v_row.provider_reference,
      'completedAt',     v_row.completed_at,
      'cancelledAt',     v_row.cancelled_at,
      'failureReason',   v_row.failure_reason
    );
  end loop;

  return jsonb_build_object(
    'payoutsEnabled', v_enabled,
    'holdDays',       v_hold,
    'payouts',        v_rows
  );
end;
$$;

revoke all on function public.instructor_payout_queue(integer) from public;
grant execute on function public.instructor_payout_queue(integer) to authenticated;

comment on function public.instructor_payout_queue(integer) is
  'Finance/platform admin only. Every payout request with what the ledger says is payable today, so a stale request is visible before it is paid.';

-- ---------------------------------------------------------------------------
-- complete_instructor_payout() — the only place an earning becomes `paid`
-- ---------------------------------------------------------------------------
create or replace function public.complete_instructor_payout(
  p_payout_id          uuid,
  p_provider           text,
  p_provider_reference text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor      uuid := public.current_user_id();
  v_row        public.instructor_payouts;
  v_provider   text;
  v_reference  text;
  v_hold       integer;
  v_entry      record;
  v_total      bigint := 0;
  v_count      integer := 0;
begin
  if v_actor is null then
    raise exception 'sign in to record a payout'
      using errcode = 'insufficient_privilege';
  end if;
  if not (public.has_role(v_actor, 'finance_admin') or public.has_role(v_actor, 'platform_admin')) then
    raise exception 'only a finance admin or platform admin may record a payout'
      using errcode = 'insufficient_privilege';
  end if;

  v_provider  := nullif(btrim(coalesce(p_provider, '')), '');
  v_reference := nullif(btrim(coalesce(p_provider_reference, '')), '');
  if v_provider is null or v_reference is null then
    raise exception 'a payout needs the provider that sent it and the reference it was sent under, or it cannot be checked later'
      using errcode = 'invalid_parameter_value';
  end if;

  select * into v_row from public.instructor_payouts where id = p_payout_id for update;
  if not found then
    raise exception 'that payout does not exist'
      using errcode = 'no_data_found';
  end if;
  if v_row.status not in ('scheduled', 'processing') then
    raise exception 'a payout that is already % cannot be completed', v_row.status
      using errcode = 'check_violation';
  end if;

  v_hold := public.setting_int('teaching.payout_hold_days', 14);

  for v_entry in
    select e.id, e.net_amount_minor
      from public.instructor_earnings_entries e
     where e.instructor_user_id = v_row.instructor_user_id
       and e.currency_code::text = v_row.currency_code::text
       and e.status in ('accrued', 'payable')
       and e.accrued_at <= now() - make_interval(days => v_hold)
     order by e.accrued_at, e.id
  loop
    -- The item trigger marks the entry `paid` and refuses a second item for the
    -- same earning, so a double payout has to fail here rather than surface as
    -- a duplicated transfer.
    insert into public.instructor_payout_items (payout_id, earnings_entry_id, amount_minor)
    values (p_payout_id, v_entry.id, v_entry.net_amount_minor);
    v_total := v_total + v_entry.net_amount_minor;
    v_count := v_count + 1;
  end loop;

  if v_count = 0 then
    raise exception 'nothing is payable on this request any more; cancel it and let the teacher ask again'
      using errcode = 'check_violation';
  end if;

  update public.instructor_payouts
     set amount_minor      = v_total,
         status            = 'completed',
         completed_at      = now(),
         provider          = v_provider,
         provider_reference = v_reference
   where id = p_payout_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'payout.completed', 'instructor_payout', p_payout_id,
          jsonb_build_object('currency', v_row.currency_code::text,
                             'requestedMinor', v_row.amount_minor::text,
                             'paidMinor', v_total::text,
                             'entries', v_count,
                             'provider', v_provider,
                             'providerReference', v_reference));

  return jsonb_build_object('id', p_payout_id, 'status', 'completed',
                            'amountMinor', v_total::text, 'entries', v_count);
end;
$$;

revoke all on function public.complete_instructor_payout(uuid, text, text) from public;
grant execute on function public.complete_instructor_payout(uuid, text, text) to authenticated;

comment on function public.complete_instructor_payout(uuid, text, text) is
  'Marks the eligible earnings paid, records the provider reference, and sets the payout to the amount the ledger actually owed. Finance/platform admin only.';

-- ---------------------------------------------------------------------------
-- fail_instructor_payout()
-- ---------------------------------------------------------------------------
create or replace function public.fail_instructor_payout(
  p_payout_id uuid,
  p_reason    text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor  uuid := public.current_user_id();
  v_row    public.instructor_payouts;
  v_reason text;
begin
  if v_actor is null then
    raise exception 'sign in to record a failed payout'
      using errcode = 'insufficient_privilege';
  end if;
  if not (public.has_role(v_actor, 'finance_admin') or public.has_role(v_actor, 'platform_admin')) then
    raise exception 'only a finance admin or platform admin may record a failed payout'
      using errcode = 'insufficient_privilege';
  end if;

  v_reason := nullif(btrim(coalesce(p_reason, '')), '');
  if v_reason is null then
    raise exception 'say why the payout failed; the teacher will read it'
      using errcode = 'invalid_parameter_value';
  end if;

  select * into v_row from public.instructor_payouts where id = p_payout_id for update;
  if not found then
    raise exception 'that payout does not exist'
      using errcode = 'no_data_found';
  end if;
  if v_row.status not in ('scheduled', 'processing') then
    raise exception 'a payout that is already % cannot be marked failed', v_row.status
      using errcode = 'check_violation';
  end if;

  update public.instructor_payouts
     set status = 'failed', failure_reason = v_reason
   where id = p_payout_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'payout.failed', 'instructor_payout', p_payout_id,
          jsonb_build_object('currency', v_row.currency_code::text,
                             'amountMinor', v_row.amount_minor::text,
                             'reason', v_reason));

  return jsonb_build_object('id', p_payout_id, 'status', 'failed');
end;
$$;

revoke all on function public.fail_instructor_payout(uuid, text) from public;
grant execute on function public.fail_instructor_payout(uuid, text) to authenticated;

comment on function public.fail_instructor_payout(uuid, text) is
  'Records that a payout did not go through, with the reason the teacher will read. Nothing is marked paid, so the earnings stay owed.';

-- ---------------------------------------------------------------------------
-- set_payout_policy() — the hold period, decided from a screen
-- ---------------------------------------------------------------------------
create or replace function public.set_payout_policy(
  p_hold_days integer,
  p_reason    text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor  uuid := public.current_user_id();
  v_reason text;
  v_old    integer;
begin
  if v_actor is null then
    raise exception 'sign in to change the payout policy'
      using errcode = 'insufficient_privilege';
  end if;
  if not (public.has_role(v_actor, 'finance_admin') or public.has_role(v_actor, 'platform_admin')) then
    raise exception 'only a finance admin or platform admin may change the payout policy'
      using errcode = 'insufficient_privilege';
  end if;
  if p_hold_days is null or p_hold_days < 0 or p_hold_days > 365 then
    raise exception 'the refund hold must be between 0 and 365 days'
      using errcode = 'check_violation';
  end if;

  v_reason := nullif(btrim(coalesce(p_reason, '')), '');
  if v_reason is null then
    raise exception 'a written reason is required to change the payout policy'
      using errcode = 'check_violation';
  end if;

  v_old := public.setting_int('teaching.payout_hold_days', 14);

  update public.platform_settings
     set value_text = p_hold_days::text,
         updated_by = v_actor
   where key = 'teaching.payout_hold_days'
     and value_type = 'integer';

  if not found then
    raise exception 'the payout hold setting is missing or is not an integer setting'
      using errcode = 'check_violation';
  end if;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'teaching.payout_hold_changed', 'platform_setting', null,
          jsonb_build_object('key', 'teaching.payout_hold_days',
                             'previous_days', v_old,
                             'new_days', p_hold_days,
                             'reason', v_reason));

  return p_hold_days;
end;
$$;

revoke all on function public.set_payout_policy(integer, text) from public;
grant execute on function public.set_payout_policy(integer, text) to authenticated;

comment on function public.set_payout_policy(integer, text) is
  'Sets how long an earning waits before it may be requested, so a refund can land first. Finance/platform admin only, with a written reason and an audit event.';

-- ---------------------------------------------------------------------------
-- The gate now has less missing behind it, and still says what is missing
-- ---------------------------------------------------------------------------
update public.platform_settings
   set preconditions = 'Request, hold period, queue and cancellation are built. Still missing before money can move: a payout provider, per-teacher destination details, and a tax treatment per country. teaching.payouts stays off until those exist.'
 where key = 'teaching.payouts';
