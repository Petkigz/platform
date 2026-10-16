// Finance-staff reconciliation against signed provider statement lines.
// Provider file formats are intentionally not guessed; this tests the generic
// reference/amount/currency matching and the staff-reviewed resolution path.

export async function run(ctx) {
  const { q, test, assert, rejects, bootstrapAdmin, newUser, newProfile, grantRole } = ctx;
  const platform = await bootstrapAdmin('recon-platform@example.com');
  const finance = await newUser('recon-finance@example.com');
  await newProfile(finance, 'Finance');
  await grantRole(finance,'finance_admin',platform);
  const support = await newUser('recon-support@example.com');
  await newProfile(support,'Support');
  await grantRole(support,'support_agent',platform);
  const ordinary = await newUser('recon-ordinary@example.com');
  await newProfile(ordinary,'Ordinary');

  async function asActor(actor,sql,params=[]) {
    await q('begin');
    await q("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:actor,role:'authenticated'})]);
    await q('set local role authenticated');
    try { const r=await q(sql,params); await q('commit'); return r; }
    catch(e) { await q('rollback'); throw e; }
  }

  let runNo=0;
  async function start(who=finance) {
    runNo++;
    return (await asActor(who,
      'select public.start_payment_reconciliation($1,$2,$3) id',
      [`provider-${runNo}`,'2020-01-01','2030-12-31'])).rows[0].id;
  }
  async function providerFor(reconciliationId) {
    return (await q('select provider from public.payment_reconciliations where id=$1',[reconciliationId])).rows[0].provider;
  }
  async function transaction(provider,reference,{amount=12000,currency='UGX',direction='credit',date='now()'}={}) {
    const result=await q(`insert into public.financial_transactions
      (transaction_type,direction,amount_minor,currency_code,provider,provider_reference,status,occurred_at)
      values('capture',$1,$2,$3,$4,$5,'settled',${date}) returning id`,
      [direction,amount,currency,provider,reference]);
    return result.rows[0].id;
  }
  async function add(rec,reference,amount=12000,currency='UGX') {
    return asActor(finance,
      'select public.add_reconciliation_statement_line($1,$2,$3,$4) id',
      [rec,reference,amount,currency]);
  }

  await test('only finance/platform staff can start a reconciliation', async()=>{
    await rejects(()=>asActor(ordinary,
      "select public.start_payment_reconciliation('mock','2026-10-01','2026-10-02')"),
      /only a finance admin or platform admin/i);
    await rejects(()=>asActor(support,
      "select public.start_payment_reconciliation('mock','2026-10-01','2026-10-02')"),
      /only a finance admin or platform admin/i);
    const id=await start();
    const row=(await q('select provider,period_start,period_end,status,started_by from public.payment_reconciliations where id=$1',[id])).rows[0];
    assert(row.provider==='provider-1' && row.status==='open' && row.started_by===finance);
  });

  await test('provider line matches by reference, signed amount and currency', async()=>{
    const rec=await start();
    await transaction(await providerFor(rec),'REF-MATCH',{amount:12000,currency:'UGX',direction:'credit'});
    const result=await add(rec,'REF-MATCH',12000,'UGX');
    const item=(await q('select financial_transaction_id,internal_amount_minor,provider_amount_minor,match_status,discrepancy_reason from public.payment_reconciliation_items where id=$1',[result.rows[0].id])).rows[0];
    assert(item.financial_transaction_id!==null);
    assert(Number(item.internal_amount_minor)===12000 && Number(item.provider_amount_minor)===12000);
    assert(item.match_status==='matched' && item.discrepancy_reason===null);
  });

  await test('debit sign is compared as negative, not against unsigned magnitude', async()=>{
    const rec=await start();
    await transaction(await providerFor(rec),'REF-DEBIT',{amount:9000,currency:'UGX',direction:'debit'});
    const result=await add(rec,'REF-DEBIT',-9000,'UGX');
    const item=(await q('select internal_amount_minor,match_status from public.payment_reconciliation_items where id=$1',[result.rows[0].id])).rows[0];
    assert(Number(item.internal_amount_minor)===-9000 && item.match_status==='matched');
  });

  await test('unknown statement reference is preserved as unmatched', async()=>{
    const rec=await start();
    const result=await add(rec,'NOT-IN-LEDGER',7000,'UGX');
    const item=(await q('select financial_transaction_id,match_status,discrepancy_reason from public.payment_reconciliation_items where id=$1',[result.rows[0].id])).rows[0];
    assert(item.financial_transaction_id===null && item.match_status==='unmatched');
    assert(item.discrepancy_reason.includes('no internal transaction'));
  });

  await test('amount and currency discrepancies are recorded, not silently matched', async()=>{
    const rec=await start();
    await transaction(await providerFor(rec),'REF-AMOUNT',{amount:12000,currency:'UGX'});
    const amount=await add(rec,'REF-AMOUNT',11999,'UGX');
    const a=(await q('select match_status,discrepancy_reason from public.payment_reconciliation_items where id=$1',[amount.rows[0].id])).rows[0];
    assert(a.match_status==='discrepant' && a.discrepancy_reason.includes('amount'));

    await transaction(await providerFor(rec),'REF-CURRENCY',{amount:12000,currency:'UGX'});
    const currency=await add(rec,'REF-CURRENCY',12000,'USD');
    const c=(await q('select match_status,discrepancy_reason from public.payment_reconciliation_items where id=$1',[currency.rows[0].id])).rows[0];
    assert(c.match_status==='discrepant' && c.discrepancy_reason.includes('currency'));
  });

  await test('an ambiguous provider reference is not matched to an arbitrary transaction', async()=>{
    const rec=await start();
    await transaction(await providerFor(rec),'DUPLICATE-REF',{amount:4000});
    await transaction(await providerFor(rec),'DUPLICATE-REF',{amount:4000});
    const result=await add(rec,'DUPLICATE-REF',4000,'UGX');
    const row=(await q('select financial_transaction_id,match_status,discrepancy_reason from public.payment_reconciliation_items where id=$1',[result.rows[0].id])).rows[0];
    assert(row.financial_transaction_id===null && row.match_status==='unmatched');
    assert(row.discrepancy_reason.includes('more than one'));
  });

  await test('a transaction outside the period is flagged discrepant', async()=>{
    const rec=await start();
    await transaction(await providerFor(rec),'OUTSIDE-PERIOD',{amount:1000,date:"'2019-01-01'::timestamptz"});
    const result=await add(rec,'OUTSIDE-PERIOD',1000,'UGX');
    const row=(await q('select match_status,discrepancy_reason from public.payment_reconciliation_items where id=$1',[result.rows[0].id])).rows[0];
    assert(row.match_status==='discrepant' && row.discrepancy_reason.includes('outside'));
  });

  await test('a duplicate statement reference in one run is refused', async()=>{
    const rec=await start();
    await add(rec,'ONLY-ONCE',100,'UGX');
    await rejects(()=>add(rec,'ONLY-ONCE',100,'UGX'),/pri_one_provider_reference_per_run|duplicate key/i);
  });

  await test('manual resolution links a newly found transaction and allows a balanced close', async()=>{
    const rec=await start();
    const item=(await add(rec,'FOUND-LATER',3500,'UGX')).rows[0].id;
    const txn=await transaction(await providerFor(rec),'FOUND-LATER',{amount:3500});
    const status=(await asActor(finance,
      'select public.resolve_reconciliation_item($1,$2,null) status',[item,txn])).rows[0].status;
    assert(status==='matched');
    const finalized=(await asActor(finance,
      'select public.finalize_payment_reconciliation($1) status',[rec])).rows[0].status;
    assert(finalized==='balanced');
    const closed=(await asActor(finance,
      "select public.close_payment_reconciliation($1,'Statement agrees to ledger') ok",[rec])).rows[0].ok;
    assert(closed===true);
    const row=(await q('select status,closed_at from public.payment_reconciliations where id=$1',[rec])).rows[0];
    assert(row.status==='closed' && row.closed_at!==null);
  });

  await test('a discrepancy resolution requires a reason and preserves the mismatch', async()=>{
    const rec=await start();
    const item=(await add(rec,'RESOLVE-DIFF',1000,'UGX')).rows[0].id;
    const txn=await transaction(await providerFor(rec),'RESOLVE-DIFF',{amount:1000,currency:'USD'});
    await rejects(()=>asActor(finance,
      'select public.resolve_reconciliation_item($1,$2,null)',[item,txn]),
      /discrepant resolution requires a written reason/i);
    const status=(await asActor(finance,
      "select public.resolve_reconciliation_item($1,$2,'Statement currency confirmed by provider') status",
      [item,txn])).rows[0].status;
    assert(status==='discrepant');
  });

  await test('a reconciliation with any unmatched line finalizes as discrepancies_found', async()=>{
    const rec=await start();
    await add(rec,'STILL-MISSING',500,'UGX');
    const status=(await asActor(finance,
      'select public.finalize_payment_reconciliation($1) status',[rec])).rows[0].status;
    assert(status==='discrepancies_found');
    await rejects(()=>asActor(finance,
      'select public.close_payment_reconciliation($1,null)',[rec]),/written close reason/i);
    await asActor(finance,
      "select public.close_payment_reconciliation($1,'Reviewed unresolved statement line')",[rec]);
    assert((await q('select status from public.payment_reconciliations where id=$1',[rec])).rows[0].status==='closed');
  });

  await test('empty reconciliation cannot be finalized; matched lines are required', async()=>{
    const rec=await start();
    await rejects(()=>asActor(finance,
      'select public.finalize_payment_reconciliation($1)',[rec]),/at least one statement line/i);
  });

  await test('closed reconciliations reject further statement lines', async()=>{
    const rec=await start();
    await add(rec,'CLOSE-ME',100,'UGX');
    await asActor(finance,'select public.finalize_payment_reconciliation($1)',[rec]);
    await asActor(finance,"select public.close_payment_reconciliation($1,'Closed for test')",[rec]);
    await rejects(()=>add(rec,'TOO-LATE',200,'UGX'),/only an open reconciliation/i);
  });

  await test('adjustment/import actions have an audit trail', async()=>{
    const rec=await start();
    await transaction(await providerFor(rec),'AUDIT-REF',{amount:333});
    await add(rec,'AUDIT-REF',333,'UGX');
    const actions=(await q(`select action from public.governance_audit_events
      where target_type='payment_reconciliation' and target_id=$1 order by occurred_at`,[rec])).rows.map(r=>r.action);
    assert(actions.join(',')==='payment.reconciliation_started,payment.reconciliation_line_added',
      `audit actions were ${actions.join(',')}`);
  });
}
