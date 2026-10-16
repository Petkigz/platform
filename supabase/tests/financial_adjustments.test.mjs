// Append-only finance corrections and the clawback already announced by
// reverse_earnings_for_refund() when a teacher was paid before a full refund.

export async function run(ctx) {
  const { q, test, assert, rejects, bootstrapAdmin, newUser, newProfile, grantRole } = ctx;
  const platformAdmin = await bootstrapAdmin('fa-platform@example.com');
  const finance = await newUser('fa-finance@example.com');
  await newProfile(finance, 'Finance');
  await grantRole(finance, 'finance_admin', platformAdmin);
  const governance = await newUser('fa-governance@example.com');
  await newProfile(governance, 'Governance');
  await grantRole(governance, 'governance_admin', platformAdmin);
  const support = await newUser('fa-support@example.com');
  await newProfile(support, 'Support');
  await grantRole(support, 'support_agent', platformAdmin);
  const teacher = await newUser('fa-teacher@example.com');
  await newProfile(teacher, 'Teacher');
  const buyer = await newUser('fa-buyer@example.com');
  await newProfile(buyer, 'Buyer');

  async function asActor(actor, sql, params = []) {
    await q('begin');
    await q('select set_config(\'request.jwt.claims\',$1,true)', [
      JSON.stringify({ sub: actor, role: 'authenticated' }),
    ]);
    await q('set local role authenticated');
    try {
      const result = await q(sql, params);
      await q('commit');
      return result;
    } catch (e) {
      await q('rollback');
      throw e;
    }
  }

  const account = (await q(`insert into public.billing_accounts
    (display_name,billing_country,billing_currency,status,created_by)
    values ('FA payer','UG','UGX','active',$1) returning id`,[buyer])).rows[0].id;

  let serial=0;
  async function makeOrder({status='refunded', withPaidEarnings=true, currency='UGX'}={}) {
    serial += 1;
    const order=(await q(`insert into public.orders
      (billing_account_id,currency_code,subtotal_minor,discount_minor,tax_minor,total_minor,
       status,placed_at,paid_at,payment_confirmed_by,payment_evidence)
      values($1,$2,10000,0,0,10000,$3,now(),now(),$4,'test-confirmed') returning id`,
      [account,currency,status,platformAdmin])).rows[0].id;
    const capture=(await q(`insert into public.financial_transactions
      (order_id,billing_account_id,transaction_type,direction,amount_minor,currency_code,status)
      values($1,$2,'capture','credit',10000,$3,'settled') returning id`,[order,account,currency])).rows[0].id;
    let refund=null;
    if (status==='refunded' || status==='partially_refunded') {
      refund=(await q(`insert into public.financial_transactions
        (order_id,billing_account_id,transaction_type,direction,amount_minor,currency_code,status)
        values($1,$2,'refund','debit',10000,$3,'settled') returning id`,[order,account,currency])).rows[0].id;
    }
    if (withPaidEarnings) {
      await q(`insert into public.instructor_earnings_entries
        (instructor_user_id,order_id,financial_transaction_id,gross_amount_minor,currency_code,
         revenue_share_percent,net_amount_minor,status)
        values($1,$2,$3,10000,$4,50,5000,'paid')`,[teacher,order,capture,currency]);
    }
    return {order,capture,refund};
  }

  await test('finance admin records a signed, linked adjustment and audit event', async () => {
    const fixture=await makeOrder({status:'paid',withPaidEarnings:false});
    const id=(await asActor(finance,
      "select public.record_financial_adjustment($1,$2,'correction',-1250,'UGX','Processor fee corrected') id",
      [fixture.order,fixture.capture])).rows[0].id;
    const adjustment=(await q('select order_id,financial_transaction_id,adjustment_type,amount_minor,currency_code,reason,created_by from public.financial_adjustments where id=$1',[id])).rows[0];
    assert(adjustment.order_id===fixture.order && adjustment.financial_transaction_id===fixture.capture);
    assert(adjustment.adjustment_type==='correction' && Number(adjustment.amount_minor)===-1250);
    assert(adjustment.currency_code==='UGX' && adjustment.reason==='Processor fee corrected');
    assert(adjustment.created_by===finance);
    const event=(await q(`select actor,action,detail from public.governance_audit_events
      where action='financial.adjustment_recorded' and target_id=$1`,[id])).rows[0];
    assert(event.actor===finance && event.action==='financial.adjustment_recorded');
    assert(Number(event.detail.amount_minor)===-1250 && event.detail.reason==='Processor fee corrected');
  });

  await test('adjustment may link a transaction alone when the transaction has an order', async () => {
    const fixture=await makeOrder({status:'paid',withPaidEarnings:false});
    const id=(await asActor(finance,
      "select public.record_financial_adjustment(null,$1,'fee_reversal',500,'UGX','Fee returned') id",
      [fixture.capture])).rows[0].id;
    const row=(await q('select order_id,financial_transaction_id,amount_minor from public.financial_adjustments where id=$1',[id])).rows[0];
    assert(row.order_id===null && row.financial_transaction_id===fixture.capture && Number(row.amount_minor)===500);
  });

  await test('both links must point to the same order', async () => {
    const a=await makeOrder({status:'paid',withPaidEarnings:false});
    const b=await makeOrder({status:'paid',withPaidEarnings:false});
    await rejects(() => asActor(finance,
      "select public.record_financial_adjustment($1,$2,'correction',100,'UGX','wrong link')",
      [a.order,b.capture]), /does not belong to the named order/i);
  });

  await test('currency must match both linked records', async () => {
    const fixture=await makeOrder({status:'paid',withPaidEarnings:false});
    await rejects(() => asActor(finance,
      "select public.record_financial_adjustment($1,$2,'correction',100,'USD','wrong currency')",
      [fixture.order,fixture.capture]), /currency does not match/i);
  });

  await test('an adjustment needs a target, a nonzero amount and a reason', async () => {
    await rejects(() => asActor(finance,
      "select public.record_financial_adjustment(null,null,'other',100,'UGX','reason')"), /link the adjustment/i);
    const fixture=await makeOrder({status:'paid',withPaidEarnings:false});
    await rejects(() => asActor(finance,
      "select public.record_financial_adjustment($1,null,'other',0,'UGX','reason')",[fixture.order]), /non-zero/i);
    await rejects(() => asActor(finance,
      "select public.record_financial_adjustment($1,null,'other',100,'UGX','  ')",[fixture.order]), /written reason/i);
  });

  await test('earnings_clawback is not accepted as a caller-chosen generic adjustment', async () => {
    const fixture=await makeOrder({status:'refunded'});
    await rejects(() => asActor(finance,
      "select public.record_financial_adjustment($1,$2,'earnings_clawback',-1,'UGX','invented amount')",
      [fixture.order,fixture.refund]), /unsupported adjustment type/i);
  });

  await test('a fully refunded order records the exact paid earnings as a negative clawback', async () => {
    const fixture=await makeOrder({status:'refunded'});
    const id=(await asActor(finance,
      "select public.record_earnings_clawback($1,'Teacher was paid before full refund') id",[fixture.order])).rows[0].id;
    const row=(await q(`select order_id,financial_transaction_id,adjustment_type,amount_minor,currency_code,reason,created_by
      from public.financial_adjustments where id=$1`,[id])).rows[0];
    assert(row.order_id===fixture.order && row.financial_transaction_id===fixture.refund);
    assert(row.adjustment_type==='earnings_clawback' && Number(row.amount_minor)===-5000);
    assert(row.currency_code==='UGX' && row.reason==='Teacher was paid before full refund' && row.created_by===finance);
    const event=(await q(`select actor,action,detail from public.governance_audit_events
      where action='earnings.clawback_recorded' and target_id=$1`,[id])).rows[0];
    assert(event.actor===finance && Number(event.detail.amount_minor)===-5000);
  });

  await test('a paid refund clawback is one-per-order and cannot be guessed twice', async () => {
    const fixture=await makeOrder({status:'refunded'});
    await asActor(finance,"select public.record_earnings_clawback($1,'First recovery')",[fixture.order]);
    await rejects(() => asActor(finance,
      "select public.record_earnings_clawback($1,'Duplicate recovery')",[fixture.order]),
      /financial_adjustments_one_earnings_clawback_per_order|duplicate key/i);
    assert((await q("select count(*)::int n from public.financial_adjustments where order_id=$1 and adjustment_type='earnings_clawback'",[fixture.order])).rows[0].n===1);
  });

  await test('a partial refund does not authorize an earnings clawback', async () => {
    const fixture=await makeOrder({status:'partially_refunded'});
    await rejects(() => asActor(finance,
      "select public.record_earnings_clawback($1,'Not a full refund')",[fixture.order]),
      /fully refunded order/i);
  });

  await test('there must be paid instructor earnings to claw back', async () => {
    const fixture=await makeOrder({status:'refunded',withPaidEarnings:false});
    await rejects(() => asActor(finance,
      "select public.record_earnings_clawback($1,'Nothing was paid')",[fixture.order]),
      /no paid instructor earnings/i);
  });

  await test('governance admin and support agent cannot make finance adjustments', async () => {
    const fixture=await makeOrder({status:'paid',withPaidEarnings:false});
    for (const actor of [governance,support,teacher,buyer]) {
      await rejects(() => asActor(actor,
        "select public.record_financial_adjustment($1,null,'other',100,'UGX','not authorized')",
        [fixture.order]), /only a finance admin or platform admin/i);
    }
  });

  await test('adjustments are append-only', async () => {
    const fixture=await makeOrder({status:'paid',withPaidEarnings:false});
    const id=(await asActor(finance,
      "select public.record_financial_adjustment($1,null,'other',100,'UGX','append only') id",
      [fixture.order])).rows[0].id;
    await rejects(() => q("update public.financial_adjustments set reason='rewritten' where id=$1",[id]), /append-only/i);
    await rejects(() => q('delete from public.financial_adjustments where id=$1',[id]), /append-only/i);
    assert((await q('select reason from public.financial_adjustments where id=$1',[id])).rows[0].reason==='append only');
  });
}
