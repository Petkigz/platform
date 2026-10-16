// Payment-confirmed subscription start, paid-period entitlements, household
// allocation, and cancellation. The provider is simulated only through the
// existing privileged manual-evidence path; live callbacks still require P12.

export async function run(ctx) {
  const { q, test, assert, rejects, bootstrapAdmin, newUser, newProfile } = ctx;
  const admin = await bootstrapAdmin('sub-admin@example.com');
  const payer = await newUser('sub-payer@example.com');
  await newProfile(payer, 'Payer');
  const stranger = await newUser('sub-stranger@example.com');
  await newProfile(stranger, 'Stranger');

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

  // A plain INSERT can be allowed while INSERT ... RETURNING is refused by
  // the SELECT policy until the creator-membership AFTER trigger has run.
  await asActor(payer,
    `insert into public.billing_accounts
       (display_name,billing_country,billing_currency,status,created_by)
     values ('Payer household','UG','UGX','active',$1)`, [payer]);
  const account = (await q('select id from public.billing_accounts where created_by=$1',[payer])).rows[0].id;

  // The auth/profile fixtures are prepared at owner level; the access path
  // below is still driven by the real payer session.
  const adult = (await q(
    `insert into public.learner_profiles(display_name,learner_type,age_band,linked_user_id)
     values ('Payer','adult','18+',$1) returning id`, [payer])).rows[0].id;

  const family = (await asActor(payer,
    'select public.create_family($1) id', ['Subscription family'])).rows[0].id;
  const child1 = (await asActor(payer,
    'select public.add_child_to_family($1,$2,$3) id', [family,'Child One','8-10'])).rows[0].id;
  const child2 = (await asActor(payer,
    'select public.add_child_to_family($1,$2,$3) id', [family,'Child Two','11-13'])).rows[0].id;

  const subject = (await q("select id from public.subject_areas where code='quran' limit 1")).rows[0].id;

  async function makePlan(code, { adults=1, children=1, interval='month' } = {}) {
    const plan = (await asActor(admin,
      'select public.create_plan($1,$2,$3) id', [code,code,'Subscription test plan'])).rows[0].id;
    const version = (await asActor(admin,
      'select public.create_plan_version($1,$2,$3,$4,$5) id',
      [plan,children,adults,interval,'Test terms'])).rows[0].id;
    await asActor(admin,
      "select public.add_plan_entitlement($1,'catalogue',$2,null,null)",[version,subject]);
    await asActor(admin,
      "select public.add_plan_entitlement($1,'feature',null,null,'offline_downloads')",[version]);
    const price = (await asActor(admin,
      "select public.set_plan_price($1,25000,'UGX',null) id",[version])).rows[0].id;
    await asActor(admin,'select public.activate_plan_version($1)',[version]);
    return { plan,version,price };
  }

  async function createOrder(who, plan, learner=adult, accountId=account, priceId=plan.price) {
    return asActor(who,
      'select * from public.create_plan_order($1,$2,$3,$4)',
      [accountId,plan.version,priceId,learner]);
  }

  const plan = await makePlan('family-subscription');
  let initialOrder = null;
  let subscription = null;

  await test('checkout resolves the amount from the active plan price and creates pending only', async () => {
    const result = await createOrder(payer,plan);
    const row = result.rows[0];
    initialOrder = row.order_id;
    subscription = row.subscription_id;
    assert(String(row.amount_minor) === '25000', `amount was ${row.amount_minor}`);
    assert(row.currency_code === 'UGX');

    const order = (await q('select status,total_minor,currency_code,placed_by from public.orders where id=$1',[initialOrder])).rows[0];
    assert(order.status === 'pending_payment', `order status was ${order.status}`);
    assert(String(order.total_minor) === '25000');
    assert(order.currency_code === 'UGX' && order.placed_by === payer);

    const sub = (await q('select status,started_at,current_period_end from public.subscriptions where id=$1',[subscription])).rows[0];
    assert(sub.status === 'pending', `subscription status was ${sub.status}`);
    assert(sub.started_at === null && sub.current_period_end === null,
      'a pending order started the paid period');
    assert((await q("select id from public.entitlement_grants where source_type='subscription' and source_id=$1",[subscription])).rows.length===0,
      'pending checkout granted access before payment');
  });

  await test('only the selected learner gets subscription access after verified manual confirmation', async () => {
    assert(initialOrder && subscription, 'preceding checkout did not establish its premise');
    await q("select public.record_payment_success($1,$2,'manual','SUB-E2E-1',null,'Bank receipt SUB-E2E-1')",
      [initialOrder,admin]);

    const sub=(await q('select status,started_at,current_period_start,current_period_end from public.subscriptions where id=$1',[subscription])).rows[0];
    assert(sub.status==='active',`subscription status was ${sub.status}`);
    assert(sub.started_at!==null && sub.current_period_start!==null && sub.current_period_end!==null,
      'paid subscription has no period');
    assert(new Date(sub.current_period_end)>new Date(sub.current_period_start), 'period end is not after start');

    const allocation=(await q(`select learner_profile_id,slot_type,status,effective_until
      from public.family_plan_allocations where subscription_id=$1`,[subscription])).rows;
    assert(allocation.length===1,'payment should allocate exactly the learner selected at checkout');
    assert(allocation[0].learner_profile_id===adult && allocation[0].slot_type==='adult');

    const grants=(await q(`select scope_type,subject_area_id,feature_code,status,effective_until
      from public.entitlement_grants where source_type='subscription' and source_id=$1`,[subscription])).rows;
    assert(grants.length===2,`expected subject and feature grants, got ${grants.length}`);
    assert(grants.some(g=>g.scope_type==='subject' && g.subject_area_id===subject));
    assert(grants.some(g=>g.scope_type==='feature' && g.feature_code==='offline_downloads'));
    assert(grants.every(g=>g.status==='active' && new Date(g.effective_until).getTime()===new Date(sub.current_period_end).getTime()),
      'grants must expire with the paid period');
  });

  await test('a family member can allocate a child and receives the same bounded plan grants', async () => {
    assert(subscription, 'preceding payment did not establish its premise');
    const allocation=(await asActor(payer,
      'select public.allocate_subscription_learner($1,$2) id',[subscription,child1])).rows[0].id;
    assert(allocation, 'allocation id was not returned');
    const row=(await q(`select learner_profile_id,slot_type from public.family_plan_allocations where id=$1`,[allocation])).rows[0];
    assert(row.learner_profile_id===child1 && row.slot_type==='child');
    const grants=(await q(`select scope_type from public.entitlement_grants
      where learner_profile_id=$1 and source_type='subscription' and source_id=$2`,[child1,subscription])).rows;
    assert(grants.length===2,`child received ${grants.length} plan grants, expected 2`);
  });

  await test('an allocation cannot exceed the child allowance', async () => {
    assert(subscription, 'preceding payment did not establish its premise');
    await rejects(() => asActor(payer,
      'select public.allocate_subscription_learner($1,$2)',[subscription,child2]),
      /allows 1 child slot/i);
    assert((await q('select count(*)::int n from public.family_plan_allocations where subscription_id=$1 and status=\'active\'',[subscription])).rows[0].n===2,
      'failed allocation inserted a row');
  });

  await test('a second overlapping checkout for the same plan is refused', async () => {
    await rejects(() => createOrder(payer,plan), /already has a pending or unexpired subscription/i);
  });

  await test('a stranger cannot use another payer account or allocate its subscription', async () => {
    await rejects(() => createOrder(stranger,plan), /cannot pay from that billing account/i);
    await rejects(() => asActor(stranger,
      'select public.allocate_subscription_learner($1,$2)',[subscription,child2]),
      /not a member of this billing account/i);
  });

  await test('cancellation preserves access through the already-paid period', async () => {
    const end=(await q('select current_period_end from public.subscriptions where id=$1',[subscription])).rows[0].current_period_end;
    const changed=(await asActor(payer,
      "select public.cancel_subscription($1,'Household no longer needs this plan') ok",[subscription])).rows[0].ok;
    assert(changed===true);
    const sub=(await q('select status,cancelled_at,current_period_end from public.subscriptions where id=$1',[subscription])).rows[0];
    assert(sub.status==='cancelled' && sub.cancelled_at!==null);
    assert(new Date(sub.current_period_end).getTime()===new Date(end).getTime());
    const grants=(await q(`select status,effective_until from public.entitlement_grants
      where source_type='subscription' and source_id=$1`,[subscription])).rows;
    assert(grants.length===4,'two allocated learners should retain two grants each');
    assert(grants.every(g=>g.status==='active' && new Date(g.effective_until).getTime()===new Date(end).getTime()),
      'cancellation must not claw back already-paid access');
  });

  await test('cancellation requires a reason and is idempotent', async () => {
    await rejects(() => asActor(payer,
      "select public.cancel_subscription($1,'   ')",[subscription]), /written cancellation reason/i);
    const again=(await asActor(payer,
      "select public.cancel_subscription($1,'Already cancelled') ok",[subscription])).rows[0].ok;
    assert(again===false, 'cancelling twice should be idempotent');
  });

  await test('a pending checkout can be cancelled and a late payment is refused', async () => {
    const second=await makePlan('cancel-pending-plan');
    const result=await createOrder(payer,second);
    const row=result.rows[0];
    const changed=(await asActor(payer,
      "select public.cancel_subscription($1,'Changed my mind before paying') ok",[row.subscription_id])).rows[0].ok;
    assert(changed===true);
    const order=(await q('select status,cancelled_at from public.orders where id=$1',[row.order_id])).rows[0];
    assert(order.status==='cancelled' && order.cancelled_at!==null);
    await rejects(() => q("select public.record_payment_success($1,$2,'manual','SUB-LATE-1',null,'Late receipt')",
      [row.order_id,admin]),/cancelled order cannot be confirmed as paid/i);
    assert((await q('select status from public.subscriptions where id=$1',[row.subscription_id])).rows[0].status==='cancelled');
  });

  await test('a cancelled checkout cannot leave an orphan pending subscription lock', async () => {
    const second=await makePlan('retry-after-cancel');
    const first=(await createOrder(payer,second)).rows[0];
    await asActor(payer,"select public.cancel_subscription($1,'Retry safely')",[first.subscription_id]);
    const retry=(await createOrder(payer,second)).rows[0];
    assert(retry.order_id!==first.order_id && retry.subscription_id!==first.subscription_id,
      'cancellation did not release the pending purchase lock');
  });

  await test('direct authenticated status changes cannot activate a subscription', async () => {
    const second=await makePlan('direct-state-test');
    const pending=(await createOrder(payer,second)).rows[0];
    // Run at owner level to get past the table RLS policy. This proves the
    // database trigger itself, not merely the absence of an UPDATE policy, is
    // the thing forbidding a forged activation.
    await rejects(() => q(
      "update public.subscriptions set status='active',started_at=now(),current_period_start=now(),current_period_end=now()+interval '1 month' where id=$1",
      [pending.subscription_id]), /must use the subscription workflow/i);
    assert((await q('select status from public.subscriptions where id=$1',[pending.subscription_id])).rows[0].status==='pending');
  });

  await test('plan order refuses a price belonging to another version', async () => {
    const second=await makePlan('wrong-price-plan');
    await rejects(() => createOrder(payer,plan,adult,account,second.price),
      /price is not currently available for this plan version/i);
  });

  await test('the status history records pending, payment activation and user cancellation', async () => {
    const rows=(await q('select from_status,to_status,changed_by from public.subscription_history where subscription_id=$1 order by occurred_at',[subscription])).rows;
    assert(rows.map(x=>x.to_status).join(',')==='pending,active,cancelled',
      `history was ${rows.map(x=>x.to_status).join(',')}`);
    assert(rows[0].changed_by===payer && rows[2].changed_by===payer,
      'user-initiated history entries must retain the user actor');
  });
}
