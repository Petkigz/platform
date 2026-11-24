// A plan given back.
//
// The owner decided on 2026-11-24 that a buyer in the European Union, the
// rest of the European Economic Area or the United Kingdom who pays for a
// plan gets the money back if they ask within fourteen days.
//
// Two things have to be true for that sentence to be true, and each is
// tested here against the real functions:
//
//   1. Such a buyer *can ask* for fourteen days, with nothing asked of them at
//      checkout and nothing recorded on the order; a buyer elsewhere has the
//      platform's own window, as for a course.
//   2. When the money has gone back in full, the plan *ends*: for every
//      learner on it, at that moment, and the account may buy it again. Until
//      then it runs. A partial refund ends nothing.
//
// The second was not true before 20261281150000_plan_refund_ends_plan.sql: a
// refund took back what an order bought outright and left a plan running to
// the end of its period.
//
// Payment and the refund's settlement are the manual, staff-recorded paths.
// No provider is involved and no money exists.

export async function run(ctx) {
  const { q, test, assert, rejects, bootstrapAdmin, newUser, newProfile } = ctx;

  const admin = await bootstrapAdmin('plan-refund-admin@example.com');
  // Each suite names its own approver, as the refunds suite does.
  await q('delete from public.refund_approval_owner');
  await q('select public.bootstrap_refund_approval_owner($1)', [admin]);

  async function asActor(actor, sql, params = []) {
    await q('begin');
    await q(`select set_config('request.jwt.claims',$1,true)`, [
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

  const subject = (await q(`select id from public.subject_areas where code='quran' limit 1`)).rows[0].id;

  let made = 0;
  /** A plan on sale with one adult place, one child place and two things it opens. */
  async function makePlan() {
    made += 1;
    const code = `plan-refund-${made}`;
    const plan = (await asActor(admin,
      'select public.create_plan($1,$2,$3,$4) id', [code, code, 'Plan refund test', 'plus'])).rows[0].id;
    const version = (await asActor(admin,
      'select public.create_plan_version($1,$2,$3,$4,$5) id', [plan, 1, 1, 'month', 'Test terms'])).rows[0].id;
    await asActor(admin, `select public.add_plan_entitlement($1,'catalogue',$2,null,null)`, [version, subject]);
    await asActor(admin, `select public.add_plan_entitlement($1,'feature',null,null,'offline_downloads')`, [version]);
    const price = (await asActor(admin,
      `select public.set_plan_price($1,25000,'UGX',null) id`, [version])).rows[0].id;
    await asActor(admin, 'select public.activate_plan_version($1)', [version]);
    return { plan, version, price };
  }

  /** A payer in one country, with their own adult profile and one child. */
  async function household(tag, country) {
    const payer = await newUser(`plan-refund-${tag}@example.com`);
    await newProfile(payer, `Payer ${tag}`);
    await asActor(payer,
      `insert into public.billing_accounts (display_name,billing_country,billing_currency,status,created_by)
       values ($1,$2,'UGX','active',$3)`, [`Household ${tag}`, country, payer]);
    const account = (await q('select id from public.billing_accounts where created_by=$1', [payer])).rows[0].id;
    const adult = (await q(
      `insert into public.learner_profiles(display_name,learner_type,age_band,linked_user_id)
       values ($1,'adult','18+',$2) returning id`, [`Payer ${tag}`, payer])).rows[0].id;
    const family = (await asActor(payer, 'select public.create_family($1) id', [`Family ${tag}`])).rows[0].id;
    const child = (await asActor(payer,
      'select public.add_child_to_family($1,$2,$3) id', [family, `Child ${tag}`, '8-10'])).rows[0].id;
    return { payer, account, adult, child };
  }

  /** The switch ships off; it is turned on round the one call and put back. */
  async function order(home, plan) {
    const before = (await q(
      `select value_text from public.platform_settings where key='commerce.subscriptions'`)).rows[0].value_text;
    const set = async (value) => {
      await q(`select set_config('app.bypassing_code_flag','on',false)`);
      try { await q(`update public.platform_settings set value_text=$1 where key='commerce.subscriptions'`, [value]); }
      finally { await q(`select set_config('app.bypassing_code_flag','',false)`); }
    };
    await set('true');
    try {
      return (await asActor(home.payer,
        'select * from public.create_plan_order($1,$2,$3,$4)',
        [home.account, plan.version, plan.price, home.adult])).rows[0];
    } finally {
      await set(before);
    }
  }

  let receipts = 0;
  /** Ordered, paid `hoursAgo` hours ago, and running. */
  async function running(home, plan, hoursAgo = 0) {
    const placed = await order(home, plan);
    receipts += 1;
    await q(`select public.record_payment_success($1,$2,'manual',$3,null,'Bank receipt')`,
      [placed.order_id, admin, `PLAN-REFUND-${receipts}`]);
    if (hoursAgo > 0) {
      await q(`update public.orders set paid_at = paid_at - make_interval(hours => $2) where id = $1`,
        [placed.order_id, hoursAgo]);
    }
    return { order: placed.order_id, subscription: placed.subscription_id };
  }

  const windowOf = async (who, orderId) =>
    (await asActor(who, 'select public.order_withdrawal_window($1) w', [orderId])).rows[0].w;
  const ask = async (who, orderId, amount, reason = 'We changed our minds') =>
    (await asActor(who, 'select public.request_refund($1,$2,$3) id', [orderId, amount, reason])).rows[0].id;
  /** Approve a request and record the money as returned. */
  async function payBack(requestId) {
    await asActor(admin, 'select public.decide_refund_request($1,$2,$3)', [requestId, true, 'Agreed']);
    const txn = (await q('select id from public.refund_transactions where refund_request_id=$1', [requestId])).rows[0];
    assert(txn, 'approving the request made no refund to settle');
    receipts += 1;
    await asActor(admin, 'select public.complete_refund($1,$2,$3)', [txn.id, `PLAN-REFUND-BACK-${receipts}`, admin]);
  }
  const sub = async (id) =>
    (await q(`select status,cancelled_at,cancel_reason,current_period_start,current_period_end,
                     current_period_end <= now() as over
                from public.subscriptions where id=$1`, [id])).rows[0];
  const grants = async (id) =>
    (await q(`select learner_profile_id,status,revocation_reason,revoked_by
                from public.entitlement_grants where source_type='subscription' and source_id=$1`, [id])).rows;
  const places = async (id) =>
    (await q(`select learner_profile_id,status,effective_until from public.family_plan_allocations
               where subscription_id=$1`, [id])).rows;

  const germany = await household('de', 'DE');
  const uganda = await household('ug', 'UG');
  const plan = await makePlan();

  let german = null;
  let ugandan = null;

  await test('a plan paid for from Germany has fourteen days, with nothing asked and nothing recorded', async () => {
    german = await running(germany, plan, 10 * 24);
    const row = (await q(
      `select withdrawal_decision,withdrawal_decided_at,withdrawal_country from public.orders where id=$1`,
      [german.order])).rows[0];
    assert(row.withdrawal_decision === null && row.withdrawal_decided_at === null && row.withdrawal_country === null,
      'something about the right to withdraw was recorded on a plan order');

    const w = await windowOf(germany.payer, german.order);
    assert(w.rule === 'statutory_14_days', `the rule was ${w.rule}`);
    assert(w.hours === 14 * 24, `the window was ${w.hours} hours`);
    assert(w.statutory === true && w.waived === false && w.country === 'DE', JSON.stringify(w));
    assert(w.remainingHours > 0 && w.remainingHours <= 4 * 24, `ten days in, ${w.remainingHours} hours were left`);
  });

  await test('a plan paid for from Uganda has the platform’s own window, as a course does', async () => {
    ugandan = await running(uganda, plan, 10 * 24);
    const hours = (await q('select public.refund_window_hours() h')).rows[0].h;
    const w = await windowOf(uganda.payer, ugandan.order);
    assert(w.rule === 'policy_window', `the rule was ${w.rule}`);
    assert(w.hours === hours && w.statutory === false, JSON.stringify(w));
  });

  await test('ten days after paying, the buyer in Uganda is refused and no request is made', async () => {
    await rejects(() => ask(uganda.payer, ugandan.order, 25000), /refund window closed/i);
    const n = (await q('select count(*)::int n from public.refund_requests where order_id=$1', [ugandan.order])).rows[0].n;
    assert(n === 0, `${n} requests were made`);
    const after = await sub(ugandan.subscription);
    assert(after.status === 'active' && after.over === false, 'a refused request changed the plan');
  });

  let request = null;

  await test('ten days after paying, the buyer in Germany may ask, and asking ends nothing', async () => {
    const standing = (await asActor(germany.payer,
      'select public.refund_standing($1) s', [german.order])).rows[0].s;
    assert(standing.allowed === true && standing.withdrawal.rule === 'statutory_14_days', JSON.stringify(standing));

    // A child is put on the plan first, so that the ending is seen to reach
    // every learner on it and not only the one named at checkout.
    await asActor(germany.payer,
      'select public.allocate_subscription_learner($1,$2)', [german.subscription, germany.child]);

    request = await ask(germany.payer, german.order, 25000);
    assert(request, 'no request was made');

    const after = await sub(german.subscription);
    assert(after.status === 'active' && after.over === false, 'asking ended the plan');
    const held = await grants(german.subscription);
    assert(held.length === 4 && held.every((g) => g.status === 'active'),
      `asking changed what the plan opens: ${held.map((g) => g.status).join(',')}`);
  });

  await test('when the money has gone back in full the plan ends, for every learner on it', async () => {
    assert(request, 'the request before this one was not made');
    const before = await sub(german.subscription);
    await payBack(request);

    const paid = (await q('select status from public.orders where id=$1', [german.order])).rows[0];
    assert(paid.status === 'refunded', `the order is ${paid.status}`);

    const after = await sub(german.subscription);
    assert(after.status === 'cancelled' && after.cancelled_at !== null, `the plan is ${after.status}`);
    assert(after.over === true, 'the plan still has paid time ahead of it');
    assert(new Date(after.current_period_end) < new Date(before.current_period_end),
      'the paid period was not closed early');
    assert(new Date(after.current_period_end) >= new Date(after.current_period_start),
      'the paid period ends before it began');
    assert(/refunded in full/i.test(after.cancel_reason ?? ''), `the reason kept was: ${after.cancel_reason}`);

    const held = await grants(german.subscription);
    assert(held.length === 4, `${held.length} grants`);
    assert(held.every((g) => g.status === 'revoked' && g.revoked_by === admin && /refunded in full/i.test(g.revocation_reason ?? '')),
      `grants were left: ${held.map((g) => g.status).join(',')}`);
    assert(new Set(held.map((g) => g.learner_profile_id)).size === 2, 'not both learners');

    const seats = await places(german.subscription);
    assert(seats.length === 2 && seats.every((s) => s.status === 'released' && s.effective_until !== null),
      `places were left: ${seats.map((s) => s.status).join(',')}`);
  });

  await test('the ending is written down: in the plan’s history and in the audit trail', async () => {
    const history = (await q(
      `select to_status,reason,changed_by from public.subscription_history
        where subscription_id=$1 order by occurred_at`, [german.subscription])).rows;
    assert(history.map((h) => h.to_status).join(',') === 'pending,active,cancelled',
      `the history was ${history.map((h) => h.to_status).join(',')}`);
    assert(history[2].changed_by === admin, 'the ending is not put to the person who recorded the refund');

    const audit = (await q(
      `select actor,detail from public.governance_audit_events
        where action='subscription.ended_on_refund' and target_id=$1`, [german.subscription])).rows;
    assert(audit.length === 1, `${audit.length} audit events`);
    assert(audit[0].actor === admin && audit[0].detail.order_id === german.order
      && audit[0].detail.grants_revoked === 4 && audit[0].detail.was === 'active', JSON.stringify(audit[0]));

    const counted = (await q(
      `select detail from public.governance_audit_events
        where action='entitlement.revoked_on_refund' and target_id=$1`, [german.order])).rows;
    assert(counted.length === 1 && counted[0].detail.grants_revoked === 4, JSON.stringify(counted));
  });

  await test('the buyer can read what their page says it from, and another household cannot', async () => {
    // What /subscriptions asks for, as the buyer and through their row
    // policies: the country on the account, and what became of the order.
    const read = `select b.billing_country country, o.status paid
                    from public.subscriptions s
                    join public.billing_accounts b on b.id = s.billing_account_id
                    join public.order_items i on i.id = s.origin_order_item_id
                    join public.orders o on o.id = i.order_id
                   where s.id = $1`;
    const mine = (await asActor(germany.payer, read, [german.subscription])).rows;
    assert(mine.length === 1 && mine[0].country === 'DE' && mine[0].paid === 'refunded', JSON.stringify(mine));
    const theirs = (await asActor(uganda.payer, read, [german.subscription])).rows;
    assert(theirs.length === 0, 'another household read the plan, its account or its order');
    const own = (await asActor(uganda.payer, read, [ugandan.subscription])).rows;
    assert(own.length === 1 && own[0].country === 'UG' && own[0].paid === 'paid', JSON.stringify(own));
  });

  await test('the plan the buyer in Uganda paid for was not touched by any of it', async () => {
    const after = await sub(ugandan.subscription);
    assert(after.status === 'active' && after.over === false, `it is ${after.status}`);
    const held = await grants(ugandan.subscription);
    assert(held.length === 2 && held.every((g) => g.status === 'active'), 'its grants changed');
  });

  await test('an account whose plan was refunded may buy the same plan again', async () => {
    const again = await order(germany, plan);
    assert(again.order_id && again.order_id !== german.order, 'no new order was placed');
    assert(again.subscription_id !== german.subscription, 'the ended plan was reused');
    // Left waiting for payment would block the tests below from this account.
    await asActor(germany.payer, `select public.cancel_subscription($1,'Test tidy-up')`, [again.subscription_id]);
  });

  await test('part of the money going back ends nothing', async () => {
    const home = await household('fr', 'FR');
    const mine = await running(home, await makePlan(), 2 * 24);
    await payBack(await ask(home.payer, mine.order, 10000, 'A lesson was missing'));

    const paid = (await q('select status from public.orders where id=$1', [mine.order])).rows[0];
    assert(paid.status === 'partially_refunded', `the order is ${paid.status}`);
    const after = await sub(mine.subscription);
    assert(after.status === 'active' && after.over === false, `the plan is ${after.status}`);
    const held = await grants(mine.subscription);
    assert(held.length === 2 && held.every((g) => g.status === 'active'), 'grants were taken back');
    const seats = await places(mine.subscription);
    assert(seats.length === 1 && seats[0].status === 'active', 'the place was released');

    // The rest going back is what ends it.
    await payBack(await ask(home.payer, mine.order, 15000, 'And the rest'));
    const ended = await sub(mine.subscription);
    assert(ended.status === 'cancelled' && ended.over === true, `after the rest, the plan is ${ended.status}`);
  });

  await test('a plan its buyer had cancelled keeps the reason they wrote, and still ends', async () => {
    const home = await household('ie', 'IE');
    const mine = await running(home, await makePlan(), 24);
    await asActor(home.payer, `select public.cancel_subscription($1,'We are moving house')`, [mine.subscription]);
    const cancelled = await sub(mine.subscription);
    assert(cancelled.status === 'cancelled' && cancelled.over === false, 'cancelling ended the plan early');

    await payBack(await ask(home.payer, mine.order, 25000));
    const after = await sub(mine.subscription);
    assert(after.status === 'cancelled' && after.over === true, 'the refunded plan still has paid time');
    assert(after.cancel_reason === 'We are moving house', `the reason became: ${after.cancel_reason}`);
    assert(new Date(after.cancelled_at).getTime() === new Date(cancelled.cancelled_at).getTime(),
      'the moment it was cancelled was rewritten');
    const held = await grants(mine.subscription);
    assert(held.every((g) => g.status === 'revoked'), 'grants were left');
  });

  await test('a buyer nobody recorded a country for keeps the fourteen days', async () => {
    const home = await household('xx', 'NL');
    const mine = await running(home, await makePlan(), 10 * 24);
    await q('update public.billing_accounts set billing_country = null where id=$1', [home.account]);
    const w = await windowOf(home.payer, mine.order);
    assert(w.rule === 'statutory_14_days' && w.country === null, JSON.stringify(w));
  });

  await test('after fourteen days the buyer in Europe is refused, and told it was the fourteen days', async () => {
    const home = await household('gb', 'GB');
    const mine = await running(home, await makePlan(), 14 * 24 + 1);
    await rejects(() => ask(home.payer, mine.order, 25000), /14 days you have by law to withdraw have passed/i);
    const standing = (await asActor(home.payer, 'select public.refund_standing($1) s', [mine.order])).rows[0].s;
    assert(standing.allowed === false && standing.reason === 'window_closed', JSON.stringify(standing));
    const after = await sub(mine.subscription);
    assert(after.status === 'active' && after.over === false, 'a refused request changed the plan');
  });

  await test('nobody signed in can call the function that ends a plan', async () => {
    await rejects(() => asActor(uganda.payer,
      `select public.revoke_entitlements_for_refund($1,$2,'Mine')`, [ugandan.order, uganda.payer]),
      /permission denied/i);
    await rejects(() => asActor(admin,
      `select public.revoke_entitlements_for_refund($1,$2,'Staff')`, [ugandan.order, admin]),
      /permission denied/i);
    const after = await sub(ugandan.subscription);
    assert(after.status === 'active', 'the plan was ended by a direct call');
  });
}
