// Staff-managed payment dispute case writer and status workflow.
// This tracks a case and resolution internally; it does not claim to submit
// evidence to a provider.

export async function run(ctx){
  const {q,test,assert,rejects,bootstrapAdmin,newUser,newProfile,grantRole}=ctx;
  const platform=await bootstrapAdmin('dispute-platform@example.com');
  const finance=await newUser('dispute-finance@example.com');await newProfile(finance,'Finance');await grantRole(finance,'finance_admin',platform);
  const support=await newUser('dispute-support@example.com');await newProfile(support,'Support');await grantRole(support,'support_agent',platform);
  const governance=await newUser('dispute-governance@example.com');await newProfile(governance,'Governance');await grantRole(governance,'governance_admin',platform);
  const ordinary=await newUser('dispute-user@example.com');await newProfile(ordinary,'User');

  async function asActor(actor,sql,params=[]){await q('begin');await q("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:actor,role:'authenticated'})]);await q('set local role authenticated');try{const r=await q(sql,params);await q('commit');return r;}catch(e){await q('rollback');throw e;}}
  let i=0;
  async function transaction({amount=10000,currency='UGX',reference=null}={}){
    i++;const ref=reference??`DISP-${i}`;
    const r=await q(`insert into public.financial_transactions
      (transaction_type,direction,amount_minor,currency_code,provider,provider_reference,status)
      values('capture','credit',$1,$2,'mockpay',$3,'settled') returning id`,[amount,currency,ref]);
    return {id:r.rows[0].id,reference:ref,amount,currency};
  }

  await test('only finance/platform admins may open a dispute',async()=>{
    const txn=await transaction();
    await rejects(()=>asActor(ordinary,
      "select public.open_payment_dispute($1,null,'fraud',5000,'UGX',$2)",[txn.id,txn.reference]),
      /only a finance admin or platform admin/i);
    await rejects(()=>asActor(support,
      "select public.open_payment_dispute($1,null,'fraud',5000,'UGX',$2)",[txn.id,txn.reference]),
      /only a finance admin or platform admin/i);
    const id=(await asActor(finance,
      "select public.open_payment_dispute($1,null,'fraud',5000,'UGX',$2) id",[txn.id,txn.reference])).rows[0].id;
    const row=(await q('select financial_transaction_id,dispute_type,provider,provider_reference,disputed_amount_minor,status from public.payment_disputes where id=$1',[id])).rows[0];
    assert(row.financial_transaction_id===txn.id && row.dispute_type==='fraud');
    assert(row.provider==='mockpay' && row.provider_reference===txn.reference);
    assert(Number(row.disputed_amount_minor)===5000 && row.status==='open');
  });

  await test('disputed amount is positive and cannot exceed transaction amount',async()=>{
    const txn=await transaction({amount:5000});
    await rejects(()=>asActor(finance,
      "select public.open_payment_dispute($1,null,'chargeback',0,'UGX',$2)",[txn.id,txn.reference]),
      /greater than zero and no more than/i);
    await rejects(()=>asActor(finance,
      "select public.open_payment_dispute($1,null,'chargeback',5001,'UGX',$2)",[txn.id,txn.reference]),
      /greater than zero and no more than/i);
  });

  await test('provider reference and currency must agree with the transaction',async()=>{
    const txn=await transaction({currency:'UGX'});
    await rejects(()=>asActor(finance,
      "select public.open_payment_dispute($1,null,'chargeback',1000,'USD',$2)",[txn.id,txn.reference]),
      /currency must match/i);
    await rejects(()=>asActor(finance,
      "select public.open_payment_dispute($1,null,'chargeback',1000,'UGX','OTHER-REF')",[txn.id]),
      /provider reference does not match/i);
  });

  await test('order, when supplied, must be the transaction order',async()=>{
    const buyer=await newUser('dispute-buyer@example.com');await newProfile(buyer,'Buyer');
    const acct=(await q(`insert into public.billing_accounts(display_name,billing_country,billing_currency,status,created_by)
      values('Dispute account','UG','UGX','active',$1) returning id`,[buyer])).rows[0].id;
    const makeOrder=async()=> (await q(`insert into public.orders
      (billing_account_id,currency_code,subtotal_minor,discount_minor,tax_minor,total_minor,status)
      values($1,'UGX',10000,0,0,10000,'draft') returning id`,[acct])).rows[0].id;
    const a=await makeOrder();const b=await makeOrder();
    const tx=await q(`insert into public.financial_transactions(order_id,transaction_type,direction,amount_minor,currency_code,provider,status)
      values($1,'capture','credit',10000,'UGX','mockpay','settled') returning id`,[a]);
    await rejects(()=>asActor(finance,
      "select public.open_payment_dispute($1,$2,'chargeback',5000,'UGX',null)",[tx.rows[0].id,b]),
      /does not belong to the named order/i);
  });

  await test('dispute lifecycle requires written notes and only permits recorded transitions',async()=>{
    const txn=await transaction();
    const id=(await asActor(finance,
      "select public.open_payment_dispute($1,null,'not_received',1000,'UGX',$2) id",[txn.id,txn.reference])).rows[0].id;
    await rejects(()=>asActor(finance,
      "select public.update_payment_dispute($1,'evidence_submitted','submitted')",[id]),
      /cannot move from open/i);
    await rejects(()=>asActor(finance,
      "select public.update_payment_dispute($1,'under_review','  ')",[id]),
      /written dispute note/i);
    const review=(await asActor(finance,
      "select public.update_payment_dispute($1,'under_review','Finance is reviewing the provider notice') changed",[id])).rows[0].changed;
    assert(review===true);
    const evidence=(await asActor(finance,
      "select public.update_payment_dispute($1,'evidence_submitted','Provider portal receipt stored') changed",[id])).rows[0].changed;
    assert(evidence===true);
    const resolved=(await asActor(finance,
      "select public.update_payment_dispute($1,'won','Provider reversed the chargeback') changed",[id])).rows[0].changed;
    assert(resolved===true);
    const row=(await q('select status,resolved_at,resolution_notes from public.payment_disputes where id=$1',[id])).rows[0];
    assert(row.status==='won'&&row.resolved_at!==null&&row.resolution_notes==='Provider reversed the chargeback');
    await rejects(()=>asActor(finance,
      "select public.update_payment_dispute($1,'lost','change outcome')",[id]),/resolved dispute cannot be changed/i);
  });

  await test('a dispute can be withdrawn before outcome and then is terminal',async()=>{
    const txn=await transaction();
    const id=(await asActor(finance,
      "select public.open_payment_dispute($1,null,'other',1000,'UGX',$2) id",[txn.id,txn.reference])).rows[0].id;
    await asActor(finance,"select public.update_payment_dispute($1,'withdrawn','Provider corrected its record')",[id]);
    await rejects(()=>asActor(finance,
      "select public.update_payment_dispute($1,'under_review','reopen')",[id]),/resolved dispute cannot be changed/i);
  });

  await test('same terminal state is idempotent',async()=>{
    const txn=await transaction();
    const id=(await asActor(finance,
      "select public.open_payment_dispute($1,null,'other',1000,'UGX',$2) id",[txn.id,txn.reference])).rows[0].id;
    await asActor(finance,"select public.update_payment_dispute($1,'under_review','Review')",[id]);
    await asActor(finance,"select public.update_payment_dispute($1,'lost','Provider upheld dispute')",[id]);
    const again=(await asActor(finance,"select public.update_payment_dispute($1,'lost','Still upheld') changed",[id])).rows[0].changed;
    assert(again===false);
  });

  await test('dispute opening and status changes are audited',async()=>{
    const txn=await transaction();
    const id=(await asActor(finance,
      "select public.open_payment_dispute($1,null,'chargeback',1000,'UGX',$2) id",[txn.id,txn.reference])).rows[0].id;
    await asActor(finance,"select public.update_payment_dispute($1,'under_review','Review started')",[id]);
    const actions=(await q(`select action from public.governance_audit_events
      where target_type='payment_dispute' and target_id=$1 order by occurred_at`,[id])).rows.map(x=>x.action);
    assert(actions.join(',')==='payment.dispute_opened,payment.dispute_status_changed',`actions were ${actions.join(',')}`);
  });

  await test('governance admin cannot alter finance-managed disputes',async()=>{
    const txn=await transaction();
    await rejects(()=>asActor(governance,
      "select public.open_payment_dispute($1,null,'chargeback',1000,'UGX',$2)",[txn.id,txn.reference]),
      /only a finance admin or platform admin/i);
  });
}
