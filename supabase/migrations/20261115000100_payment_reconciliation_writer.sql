-- Staff-run reconciliation against a provider statement.
--
-- No live provider statement format is assumed. The admin imports/pastes signed
-- minor-unit rows and the database matches them by provider reference. Credit is
-- positive; debit is negative. A missing/ambiguous/mismatched internal row is
-- retained as unmatched/discrepant for staff review, never silently dropped.

alter table public.payment_reconciliations
  drop constraint if exists payment_reconciliations_closed_agrees;
alter table public.payment_reconciliations
  add constraint payment_reconciliations_closed_agrees
  check ((status='closed')=(closed_at is not null));

create unique index if not exists pri_one_provider_reference_per_run
  on public.payment_reconciliation_items(reconciliation_id,provider_reference)
  where provider_reference is not null;

create or replace function public.start_payment_reconciliation(
  p_provider text,
  p_period_start date,
  p_period_end date
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  v_actor uuid:=public.current_user_id();
  v_provider text:=nullif(btrim(coalesce(p_provider,'')),'');
  v_id uuid;
begin
  if v_actor is null or not (public.has_role(v_actor,'platform_admin') or public.has_role(v_actor,'finance_admin')) then
    raise exception 'only a finance admin or platform admin may start reconciliation'
      using errcode='insufficient_privilege';
  end if;
  if v_provider is null or length(v_provider)>80 then
    raise exception 'a provider name under 80 characters is required'
      using errcode='invalid_parameter_value';
  end if;
  if p_period_start is null or p_period_end is null or p_period_start>p_period_end then
    raise exception 'the reconciliation period start must be on or before its end'
      using errcode='invalid_parameter_value';
  end if;

  insert into public.payment_reconciliations(provider,period_start,period_end,status,started_by)
  values(v_provider,p_period_start,p_period_end,'open',v_actor)
  returning id into v_id;

  insert into public.governance_audit_events(actor,action,target_type,target_id,detail)
  values(v_actor,'payment.reconciliation_started','payment_reconciliation',v_id,
    jsonb_build_object('provider',v_provider,'period_start',p_period_start,'period_end',p_period_end));
  return v_id;
end;
$$;
revoke all on function public.start_payment_reconciliation(text,date,date) from public;
grant execute on function public.start_payment_reconciliation(text,date,date) to authenticated;

create or replace function public.add_reconciliation_statement_line(
  p_reconciliation_id uuid,
  p_provider_reference text,
  p_provider_amount_minor bigint,
  p_currency_code text
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  v_actor uuid:=public.current_user_id();
  v_rec public.payment_reconciliations;
  v_ref text:=nullif(btrim(coalesce(p_provider_reference,'')),'');
  v_matches integer;
  v_tx public.financial_transactions;
  v_internal bigint;
  v_status text:='unmatched';
  v_reason text;
  v_id uuid;
begin
  if v_actor is null or not (public.has_role(v_actor,'platform_admin') or public.has_role(v_actor,'finance_admin')) then
    raise exception 'only a finance admin or platform admin may import reconciliation lines'
      using errcode='insufficient_privilege';
  end if;
  select * into v_rec from public.payment_reconciliations where id=p_reconciliation_id for update;
  if not found then raise exception 'reconciliation % not found',p_reconciliation_id using errcode='no_data_found'; end if;
  if v_rec.status not in ('open','in_progress') then
    raise exception 'only an open reconciliation can accept statement lines'
      using errcode='check_violation';
  end if;
  if v_ref is null then raise exception 'a provider reference is required' using errcode='invalid_parameter_value'; end if;
  if p_provider_amount_minor is null or p_provider_amount_minor=0 then
    raise exception 'statement amount must be a non-zero signed minor-unit integer'
      using errcode='invalid_parameter_value';
  end if;
  if p_currency_code is null or p_currency_code !~ '^[A-Z]{3}$' then
    raise exception 'currency must be a three-letter uppercase ISO code' using errcode='invalid_parameter_value';
  end if;

  select count(*) into v_matches
    from public.financial_transactions ft
   where ft.provider=v_rec.provider
     and (ft.provider_reference=v_ref or exists(
       select 1 from public.transaction_provider_references tpr
        where tpr.financial_transaction_id=ft.id and tpr.provider=v_rec.provider
          and tpr.reference_value=v_ref));

  if v_matches=1 then
    select * into v_tx from public.financial_transactions ft
     where ft.provider=v_rec.provider
       and (ft.provider_reference=v_ref or exists(
         select 1 from public.transaction_provider_references tpr
          where tpr.financial_transaction_id=ft.id and tpr.provider=v_rec.provider
            and tpr.reference_value=v_ref))
     limit 1;
    v_internal:=case when v_tx.direction='credit' then v_tx.amount_minor else -v_tx.amount_minor end;
    if v_tx.currency_code::text<>p_currency_code then
      v_status:='discrepant'; v_reason:='currency differs from the internal transaction';
    elsif v_tx.occurred_at::date not between v_rec.period_start and v_rec.period_end then
      v_status:='discrepant'; v_reason:='internal transaction is outside the reconciliation period';
    elsif v_internal<>p_provider_amount_minor then
      v_status:='discrepant'; v_reason:='provider amount differs from the signed internal amount';
    else
      v_status:='matched';
    end if;
  elsif v_matches=0 then
    v_reason:='no internal transaction matches this provider reference';
  else
    v_reason:='more than one internal transaction matches this provider reference';
  end if;

  insert into public.payment_reconciliation_items
    (reconciliation_id,financial_transaction_id,provider_reference,
     internal_amount_minor,provider_amount_minor,currency_code,match_status,discrepancy_reason)
  values
    (p_reconciliation_id,case when v_matches=1 then v_tx.id else null end,v_ref,
     case when v_matches=1 then v_internal else null end,p_provider_amount_minor,
     p_currency_code,v_status,v_reason)
  returning id into v_id;

  update public.payment_reconciliations set status='in_progress' where id=p_reconciliation_id;
  insert into public.governance_audit_events(actor,action,target_type,target_id,detail)
  values(v_actor,'payment.reconciliation_line_added','payment_reconciliation',p_reconciliation_id,
    jsonb_build_object('item_id',v_id,'provider_reference',v_ref,'match_status',v_status,
                       'provider_amount_minor',p_provider_amount_minor,'currency_code',p_currency_code,
                       'reason',v_reason));
  return v_id;
end;
$$;
revoke all on function public.add_reconciliation_statement_line(uuid,text,bigint,text) from public;
grant execute on function public.add_reconciliation_statement_line(uuid,text,bigint,text) to authenticated;

create or replace function public.resolve_reconciliation_item(
  p_item_id uuid,
  p_financial_transaction_id uuid,
  p_reason text
)
returns text
language plpgsql
security definer
set search_path=public
as $$
declare
  v_actor uuid:=public.current_user_id();
  v_item public.payment_reconciliation_items;
  v_rec public.payment_reconciliations;
  v_tx public.financial_transactions;
  v_signed bigint;
  v_status text;
  v_reason text:=nullif(btrim(coalesce(p_reason,'')),'');
begin
  if v_actor is null or not (public.has_role(v_actor,'platform_admin') or public.has_role(v_actor,'finance_admin')) then
    raise exception 'only a finance admin or platform admin may resolve reconciliation items'
      using errcode='insufficient_privilege';
  end if;
  select * into v_item from public.payment_reconciliation_items where id=p_item_id for update;
  if not found then raise exception 'reconciliation item % not found',p_item_id using errcode='no_data_found'; end if;
  select * into v_rec from public.payment_reconciliations where id=v_item.reconciliation_id for update;
  if v_rec.status not in ('open','in_progress','discrepancies_found') then
    raise exception 'a closed or balanced reconciliation cannot be changed' using errcode='check_violation';
  end if;
  select * into v_tx from public.financial_transactions where id=p_financial_transaction_id;
  if not found then raise exception 'financial transaction % not found',p_financial_transaction_id using errcode='no_data_found'; end if;
  if v_tx.provider is distinct from v_rec.provider then
    raise exception 'the transaction belongs to a different provider' using errcode='invalid_parameter_value';
  end if;
  if not (v_tx.provider_reference=v_item.provider_reference or exists(
    select 1 from public.transaction_provider_references tpr
     where tpr.financial_transaction_id=v_tx.id and tpr.provider=v_rec.provider
       and tpr.reference_value=v_item.provider_reference)) then
    raise exception 'the transaction does not have the statement provider reference' using errcode='invalid_parameter_value';
  end if;
  v_signed:=case when v_tx.direction='credit' then v_tx.amount_minor else -v_tx.amount_minor end;
  if v_tx.currency_code::text=v_item.currency_code
     and v_tx.occurred_at::date between v_rec.period_start and v_rec.period_end
     and v_signed=v_item.provider_amount_minor then
    v_status:='matched';
  else
    v_status:='discrepant';
  end if;
  if v_status='discrepant' and v_reason is null then
    raise exception 'a discrepant resolution requires a written reason' using errcode='invalid_parameter_value';
  end if;

  update public.payment_reconciliation_items
     set financial_transaction_id=v_tx.id,internal_amount_minor=v_signed,
         match_status=v_status,discrepancy_reason=case when v_status='matched' then null else v_reason end
   where id=p_item_id;
  update public.payment_reconciliations set status='in_progress' where id=v_rec.id;
  insert into public.governance_audit_events(actor,action,target_type,target_id,detail)
  values(v_actor,'payment.reconciliation_item_resolved','payment_reconciliation',v_rec.id,
    jsonb_build_object('item_id',p_item_id,'financial_transaction_id',v_tx.id,
                       'match_status',v_status,'reason',v_reason));
  return v_status;
end;
$$;
revoke all on function public.resolve_reconciliation_item(uuid,uuid,text) from public;
grant execute on function public.resolve_reconciliation_item(uuid,uuid,text) to authenticated;

create or replace function public.finalize_payment_reconciliation(p_reconciliation_id uuid)
returns text
language plpgsql
security definer
set search_path=public
as $$
declare
  v_actor uuid:=public.current_user_id();
  v_count integer;
  v_bad integer;
  v_status text;
begin
  if v_actor is null or not (public.has_role(v_actor,'platform_admin') or public.has_role(v_actor,'finance_admin')) then
    raise exception 'only a finance admin or platform admin may finalize reconciliation'
      using errcode='insufficient_privilege';
  end if;
  perform 1 from public.payment_reconciliations where id=p_reconciliation_id and status in ('open','in_progress','discrepancies_found') for update;
  if not found then raise exception 'reconciliation is missing or cannot be finalized' using errcode='check_violation'; end if;
  select count(*),count(*) filter(where match_status<>'matched')
    into v_count,v_bad from public.payment_reconciliation_items where reconciliation_id=p_reconciliation_id;
  if v_count=0 then raise exception 'a reconciliation needs at least one statement line' using errcode='check_violation'; end if;
  v_status:=case when v_bad=0 then 'balanced' else 'discrepancies_found' end;
  update public.payment_reconciliations set status=v_status where id=p_reconciliation_id;
  insert into public.governance_audit_events(actor,action,target_type,target_id,detail)
  values(v_actor,'payment.reconciliation_finalized','payment_reconciliation',p_reconciliation_id,
    jsonb_build_object('status',v_status,'lines',v_count,'unmatched_or_discrepant',v_bad));
  return v_status;
end;
$$;
revoke all on function public.finalize_payment_reconciliation(uuid) from public;
grant execute on function public.finalize_payment_reconciliation(uuid) to authenticated;

create or replace function public.close_payment_reconciliation(p_reconciliation_id uuid,p_reason text)
returns boolean
language plpgsql
security definer
set search_path=public
as $$
declare
  v_actor uuid:=public.current_user_id();
  v_status text;
  v_reason text:=nullif(btrim(coalesce(p_reason,'')),'');
begin
  if v_actor is null or not (public.has_role(v_actor,'platform_admin') or public.has_role(v_actor,'finance_admin')) then
    raise exception 'only a finance admin or platform admin may close reconciliation'
      using errcode='insufficient_privilege';
  end if;
  if v_reason is null then raise exception 'a written close reason is required' using errcode='invalid_parameter_value'; end if;
  select status into v_status from public.payment_reconciliations where id=p_reconciliation_id for update;
  if not found then raise exception 'reconciliation % not found',p_reconciliation_id using errcode='no_data_found'; end if;
  if v_status='closed' then return false; end if;
  if v_status not in ('balanced','discrepancies_found') then
    raise exception 'finalize the reconciliation before closing it' using errcode='check_violation';
  end if;
  update public.payment_reconciliations set status='closed',closed_at=now() where id=p_reconciliation_id;
  insert into public.governance_audit_events(actor,action,target_type,target_id,detail)
  values(v_actor,'payment.reconciliation_closed','payment_reconciliation',p_reconciliation_id,
    jsonb_build_object('previous_status',v_status,'reason',v_reason));
  return true;
end;
$$;
revoke all on function public.close_payment_reconciliation(uuid,text) from public;
grant execute on function public.close_payment_reconciliation(uuid,text) to authenticated;

comment on function public.start_payment_reconciliation(text,date,date) is
  'Opens a staff reconciliation window. Provider statement lines are entered separately; no provider-specific file format is assumed.';
comment on function public.add_reconciliation_statement_line(uuid,text,bigint,text) is
  'Adds a signed provider statement amount and matches by provider reference, currency, signed amount and period; unmatched rows are preserved.';
comment on function public.resolve_reconciliation_item(uuid,uuid,text) is
  'Manually links an unmatched/discrepant statement line to its exact provider transaction; discrepancies require a reason.';
comment on function public.finalize_payment_reconciliation(uuid) is
  'Sets balanced only when every imported line matches; otherwise sets discrepancies_found.';
comment on function public.close_payment_reconciliation(uuid,text) is
  'Closes a finalized reconciliation with a written reason, preserving its immutable session outcome.';
