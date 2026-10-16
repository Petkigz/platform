-- Write the money-out correction path already flagged by earnings clawback.
--
-- Financial adjustments are a new append-only ledger fact, never an edit to a
-- capture, refund or payout. Positive amounts add a credit/receivable; negative
-- amounts record a debit/reduction. These rows do not silently move funds.

alter table public.financial_adjustments
  drop constraint if exists financial_adjustments_adjustment_type_check;
alter table public.financial_adjustments
  add constraint financial_adjustments_adjustment_type_check
  check (adjustment_type in
    ('correction','write_off','goodwill_credit','fee_reversal','earnings_clawback','other'));

create unique index if not exists financial_adjustments_one_earnings_clawback_per_order
  on public.financial_adjustments(order_id)
  where adjustment_type='earnings_clawback' and order_id is not null;

create or replace function public.record_financial_adjustment(
  p_order_id uuid,
  p_financial_transaction_id uuid,
  p_adjustment_type text,
  p_amount_minor bigint,
  p_currency_code text,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  v_actor uuid:=public.current_user_id();
  v_order_currency text;
  v_txn_order uuid;
  v_txn_currency text;
  v_reason text:=nullif(btrim(coalesce(p_reason,'')),'');
  v_id uuid;
begin
  if v_actor is null then
    raise exception 'sign in to record a financial adjustment'
      using errcode='insufficient_privilege';
  end if;
  if not (public.has_role(v_actor,'platform_admin') or public.has_role(v_actor,'finance_admin')) then
    raise exception 'only a finance admin or platform admin may record a financial adjustment'
      using errcode='insufficient_privilege';
  end if;
  if p_order_id is null and p_financial_transaction_id is null then
    raise exception 'link the adjustment to an order or financial transaction'
      using errcode='invalid_parameter_value';
  end if;
  if p_adjustment_type not in ('correction','write_off','goodwill_credit','fee_reversal','other') then
    raise exception 'unsupported adjustment type: %',p_adjustment_type
      using errcode='invalid_parameter_value';
  end if;
  if p_amount_minor is null or p_amount_minor=0 then
    raise exception 'an adjustment must be a non-zero whole number of minor units'
      using errcode='invalid_parameter_value';
  end if;
  if p_currency_code is null or p_currency_code !~ '^[A-Z]{3}$' then
    raise exception 'currency must be a three-letter uppercase ISO code'
      using errcode='invalid_parameter_value';
  end if;
  if v_reason is null then
    raise exception 'a written reason is required for every financial adjustment'
      using errcode='invalid_parameter_value';
  end if;

  if p_order_id is not null then
    select currency_code::text into v_order_currency from public.orders where id=p_order_id;
    if not found then raise exception 'order % not found',p_order_id using errcode='no_data_found'; end if;
  end if;
  if p_financial_transaction_id is not null then
    select order_id,currency_code::text into v_txn_order,v_txn_currency
      from public.financial_transactions where id=p_financial_transaction_id;
    if not found then
      raise exception 'financial transaction % not found',p_financial_transaction_id using errcode='no_data_found';
    end if;
    if p_order_id is not null and v_txn_order is distinct from p_order_id then
      raise exception 'the financial transaction does not belong to the named order'
        using errcode='invalid_parameter_value';
    end if;
  end if;
  if v_order_currency is not null and v_order_currency<>p_currency_code then
    raise exception 'adjustment currency does not match the order currency'
      using errcode='invalid_parameter_value';
  end if;
  if v_txn_currency is not null and v_txn_currency<>p_currency_code then
    raise exception 'adjustment currency does not match the transaction currency'
      using errcode='invalid_parameter_value';
  end if;

  insert into public.financial_adjustments
    (order_id,financial_transaction_id,adjustment_type,amount_minor,currency_code,reason,created_by)
  values
    (p_order_id,p_financial_transaction_id,p_adjustment_type,p_amount_minor,p_currency_code,v_reason,v_actor)
  returning id into v_id;

  insert into public.governance_audit_events(actor,action,target_type,target_id,detail)
  values(v_actor,'financial.adjustment_recorded','financial_adjustment',v_id,
    jsonb_build_object('order_id',p_order_id,'financial_transaction_id',p_financial_transaction_id,
      'adjustment_type',p_adjustment_type,'amount_minor',p_amount_minor,
      'currency_code',p_currency_code,'reason',v_reason));
  return v_id;
end;
$$;
revoke all on function public.record_financial_adjustment(uuid,uuid,text,bigint,text,text) from public;
grant execute on function public.record_financial_adjustment(uuid,uuid,text,bigint,text,text) to authenticated;

create or replace function public.record_earnings_clawback(
  p_order_id uuid,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  v_actor uuid:=public.current_user_id();
  v_reason text:=nullif(btrim(coalesce(p_reason,'')),'');
  v_currency text;
  v_total bigint;
  v_refund_txn uuid;
  v_id uuid;
begin
  if v_actor is null then
    raise exception 'sign in to record an earnings clawback'
      using errcode='insufficient_privilege';
  end if;
  if not (public.has_role(v_actor,'platform_admin') or public.has_role(v_actor,'finance_admin')) then
    raise exception 'only a finance admin or platform admin may record an earnings clawback'
      using errcode='insufficient_privilege';
  end if;
  if v_reason is null then
    raise exception 'a written reason is required for every financial adjustment'
      using errcode='invalid_parameter_value';
  end if;

  select currency_code::text into v_currency from public.orders
   where id=p_order_id and status='refunded';
  if not found then
    raise exception 'an earnings clawback requires a fully refunded order'
      using errcode='check_violation';
  end if;
  select coalesce(sum(net_amount_minor),0)::bigint into v_total
    from public.instructor_earnings_entries
   where order_id=p_order_id and status='paid';
  if v_total<=0 then
    raise exception 'there are no paid instructor earnings to claw back'
      using errcode='check_violation';
  end if;
  select id into v_refund_txn from public.financial_transactions
   where order_id=p_order_id and transaction_type='refund' and status='settled'
   order by occurred_at desc limit 1;
  if v_refund_txn is null then
    raise exception 'the refunded order has no settled refund transaction'
      using errcode='check_violation';
  end if;

  insert into public.financial_adjustments
    (order_id,financial_transaction_id,adjustment_type,amount_minor,currency_code,reason,created_by)
  values
    (p_order_id,v_refund_txn,'earnings_clawback',-v_total,v_currency,v_reason,v_actor)
  returning id into v_id;

  insert into public.governance_audit_events(actor,action,target_type,target_id,detail)
  values(v_actor,'earnings.clawback_recorded','financial_adjustment',v_id,
    jsonb_build_object('order_id',p_order_id,'refund_transaction_id',v_refund_txn,
      'amount_minor',-v_total,'currency_code',v_currency,'reason',v_reason));
  return v_id;
end;
$$;
revoke all on function public.record_earnings_clawback(uuid,text) from public;
grant execute on function public.record_earnings_clawback(uuid,text) to authenticated;

comment on function public.record_financial_adjustment(uuid,uuid,text,bigint,text,text) is
  'Finance/platform admin only. Records a signed, currency-matched append-only adjustment linked to an order or transaction; never mutates the underlying money event.';
comment on function public.record_earnings_clawback(uuid,text) is
  'Records one negative earnings_clawback adjustment for the total instructor earnings already paid on a fully refunded order. Does not rewrite paid earnings or itself transfer funds.';
