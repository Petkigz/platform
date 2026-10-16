-- Staff-managed payment disputes. This records the case and its reviewed
-- outcome; it does not pretend to submit evidence to a live provider.

create or replace function public.open_payment_dispute(
  p_financial_transaction_id uuid,
  p_order_id uuid,
  p_dispute_type text,
  p_disputed_amount_minor bigint,
  p_currency_code text,
  p_provider_reference text default null
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  v_actor uuid:=public.current_user_id();
  v_tx public.financial_transactions;
  v_reference text:=nullif(btrim(coalesce(p_provider_reference,'')),'');
  v_id uuid;
begin
  if v_actor is null or not (public.has_role(v_actor,'platform_admin') or public.has_role(v_actor,'finance_admin')) then
    raise exception 'only a finance admin or platform admin may open a payment dispute'
      using errcode='insufficient_privilege';
  end if;
  select * into v_tx from public.financial_transactions where id=p_financial_transaction_id;
  if not found then raise exception 'financial transaction % not found',p_financial_transaction_id using errcode='no_data_found'; end if;
  if p_order_id is not null and v_tx.order_id is distinct from p_order_id then
    raise exception 'the financial transaction does not belong to the named order'
      using errcode='invalid_parameter_value';
  end if;
  if p_dispute_type not in ('chargeback','fraud','unauthorised','not_received','other') then
    raise exception 'unsupported dispute type: %',p_dispute_type using errcode='invalid_parameter_value';
  end if;
  if p_disputed_amount_minor is null or p_disputed_amount_minor<=0 or p_disputed_amount_minor>v_tx.amount_minor then
    raise exception 'disputed amount must be greater than zero and no more than the transaction amount'
      using errcode='invalid_parameter_value';
  end if;
  if p_currency_code is null or p_currency_code !~ '^[A-Z]{3}$' or p_currency_code<>v_tx.currency_code::text then
    raise exception 'dispute currency must match the transaction currency'
      using errcode='invalid_parameter_value';
  end if;
  if v_reference is not null and v_tx.provider_reference is not null
     and v_reference<>v_tx.provider_reference then
    raise exception 'provider reference does not match the financial transaction'
      using errcode='invalid_parameter_value';
  end if;

  insert into public.payment_disputes
    (financial_transaction_id,order_id,dispute_type,provider,provider_reference,
     disputed_amount_minor,currency_code,status)
  values
    (p_financial_transaction_id,coalesce(p_order_id,v_tx.order_id),p_dispute_type,
     coalesce(v_tx.provider,'manual'),v_reference,p_disputed_amount_minor,p_currency_code,'open')
  returning id into v_id;

  insert into public.governance_audit_events(actor,action,target_type,target_id,detail)
  values(v_actor,'payment.dispute_opened','payment_dispute',v_id,
    jsonb_build_object('financial_transaction_id',p_financial_transaction_id,
      'order_id',coalesce(p_order_id,v_tx.order_id),'dispute_type',p_dispute_type,
      'amount_minor',p_disputed_amount_minor,'currency_code',p_currency_code));
  return v_id;
end;
$$;
revoke all on function public.open_payment_dispute(uuid,uuid,text,bigint,text,text) from public;
grant execute on function public.open_payment_dispute(uuid,uuid,text,bigint,text,text) to authenticated;

create or replace function public.update_payment_dispute(
  p_dispute_id uuid,
  p_status text,
  p_resolution_notes text
)
returns boolean
language plpgsql
security definer
set search_path=public
as $$
declare
  v_actor uuid:=public.current_user_id();
  v_dispute public.payment_disputes;
  v_note text:=nullif(btrim(coalesce(p_resolution_notes,'')),'');
  v_terminal boolean;
begin
  if v_actor is null or not (public.has_role(v_actor,'platform_admin') or public.has_role(v_actor,'finance_admin')) then
    raise exception 'only a finance admin or platform admin may update a payment dispute'
      using errcode='insufficient_privilege';
  end if;
  select * into v_dispute from public.payment_disputes where id=p_dispute_id for update;
  if not found then raise exception 'payment dispute % not found',p_dispute_id using errcode='no_data_found'; end if;
  if p_status not in ('under_review','evidence_submitted','won','lost','withdrawn') then
    raise exception 'unsupported dispute transition: %',p_status using errcode='invalid_parameter_value';
  end if;
  if v_note is null then raise exception 'a written dispute note is required' using errcode='invalid_parameter_value'; end if;
  if v_dispute.status in ('won','lost','withdrawn') then
    if v_dispute.status=p_status then return false; end if;
    raise exception 'a resolved dispute cannot be changed' using errcode='check_violation';
  end if;
  if not (
    (v_dispute.status='open' and p_status in ('under_review','withdrawn'))
    or (v_dispute.status='under_review' and p_status in ('evidence_submitted','won','lost','withdrawn'))
    or (v_dispute.status='evidence_submitted' and p_status in ('won','lost','withdrawn'))
  ) then
    raise exception 'dispute cannot move from % to %',v_dispute.status,p_status
      using errcode='check_violation';
  end if;

  v_terminal:=p_status in ('won','lost','withdrawn');
  update public.payment_disputes
     set status=p_status,
         resolved_at=case when v_terminal then now() else null end,
         resolution_notes=v_note
   where id=p_dispute_id;
  insert into public.governance_audit_events(actor,action,target_type,target_id,detail)
  values(v_actor,'payment.dispute_status_changed','payment_dispute',p_dispute_id,
    jsonb_build_object('from_status',v_dispute.status,'to_status',p_status,'notes',v_note));
  return true;
end;
$$;
revoke all on function public.update_payment_dispute(uuid,text,text) from public;
grant execute on function public.update_payment_dispute(uuid,text,text) to authenticated;

comment on function public.open_payment_dispute(uuid,uuid,text,bigint,text,text) is
  'Opens a provider dispute against an exact financial transaction. Finance/platform staff only; amount and currency must agree with the ledger.';
comment on function public.update_payment_dispute(uuid,text,text) is
  'Advances the dispute through open -> under_review -> evidence_submitted -> outcome. Every transition requires a written note; resolved cases are immutable.';
