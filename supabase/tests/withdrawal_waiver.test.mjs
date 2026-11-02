// The 14-day right, and the only way it can be given up.
//
// In the European Union, Iceland, Liechtenstein, Norway and the United Kingdom a
// consumer buying digital content has 14 days to withdraw. Where the content is
// supplied immediately that right can be lost — but only by an explicit agreement
// at the point of purchase, about words the buyer could read.
//
// What this suite pins:
//
//   1. The words exist in one place and reach both places they must: the checkout
//      page reads `withdrawal_wording()`, and the published refunds policy
//      contains the same string. A waiver of a document that says "no waiver is
//      offered" would be an agreement to the opposite of itself.
//   2. The box is the buyer's act. Staff cannot record a waiver on somebody
//      else's order, because the only thing a waiver has to be is voluntary.
//   3. Leaving it unticked is a purchase, not a refusal: the order still pays,
//      and the buyer keeps 14 days.
//   4. The clock is one clock. `refund_standing()` and `request_refund()` read the
//      same function, so a screen and a refusal cannot disagree.
//   5. Everywhere else the 72-hour window is unchanged — and a buyer whose country
//      was never recorded is treated as one who may have the right, because the
//      cost of guessing the other way is denying somebody a right they have.

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    newUser, newProfile, bootstrapAdmin, grantRole, asUser,
  } = ctx;

  const admin = await bootstrapAdmin('ww-admin@example.com');
  const scalar = async (sql, params = []) => (await q(sql, params)).rows[0];

  async function asActor(actor, sql, params = []) {
    await q('begin');
    await q("select set_config('request.jwt.claims',$1,true)", [
      JSON.stringify({ sub: actor, role: 'authenticated' }),
    ]);
    await q('set local role authenticated');
    let r;
    try {
      r = await q(sql, params);
    } catch (e) {
      await q('rollback');
      throw e;
    }
    await q('commit');
    return r;
  }

  let seq = 0;
  let productId = null;

  const product = async () => {
    if (!productId) {
      productId = (await scalar(
        `insert into public.products (product_type, name, status, created_by)
         values ('course','Withdrawal course','active',$1) returning id`, [admin])).id;
    }
    return productId;
  };

  /** A buyer with an account, in a named country, and their own currency. */
  async function newBuyer(country, currency = 'EUR') {
    seq += 1;
    const userId = await newUser(`ww-${seq}@example.com`);
    await newProfile(userId, `Buyer ${seq}`);
    const account = (await scalar(
      `insert into public.billing_accounts
         (display_name, billing_country, billing_currency, status, created_by)
       values ($1,$2,$3,'active',$4) returning id`,
      [`Buyer ${seq}`, country, currency, userId])).id;
    return { userId, account, country };
  }

  /** An unpaid order with one line, ready for a decision and then for payment. */
  async function order(account, { totalMinor = 30000, currency = 'EUR' } = {}) {
    const id = (await scalar(
      `insert into public.orders (billing_account_id, currency_code, subtotal_minor, total_minor, status)
       values ($1,$2,$3,$3,'pending_payment') returning id`,
      [account, currency, totalMinor])).id;
    await q(
      `insert into public.order_items
         (order_id, product_id, quantity, unit_price_minor, currency_code,
          discount_minor, line_total_minor, item_snapshot)
       values ($1,$2,1,$3,$4,0,$3,$5)`,
      [id, await product(), totalMinor, currency, JSON.stringify({ title: 'Withdrawal course' })]);
    return id;
  }

  /** Pays an order and, optionally, says how long ago. */
  async function pay(orderId, { ageHours = 0 } = {}) {
    await q('select id from public.record_payment_success($1,$2,$3,$4,null,$5)',
      [orderId, admin, 'manual', `REF-WW-${seq}-${orderId.slice(0, 6)}`, 'Bank statement']);
    if (ageHours > 0) {
      await q(`update public.orders set paid_at = paid_at - make_interval(hours => $2)
               where id = $1`, [orderId, ageHours]);
      await q(`update public.financial_transactions
                  set occurred_at = occurred_at - make_interval(hours => $2)
                where order_id = $1 and transaction_type = 'capture'`, [orderId, ageHours]);
    }
  }

  const choose = (buyer, orderId, accepted, country = null) =>
    asActor(buyer, 'select public.record_withdrawal_choice($1,$2,$3) as r',
      [orderId, accepted, country]).then((r) => r.rows[0].r);

  const offer = (country) =>
    q('select public.withdrawal_offer($1) as o', [country]).then((r) => r.rows[0].o);

  const standing = (buyer, orderId) =>
    asActor(buyer, 'select public.refund_standing($1) as s', [orderId]).then((r) => r.rows[0].s);

  const ask = (buyer, orderId, amount = 1000) =>
    asActor(buyer, 'select public.request_refund($1,$2,$3) as id',
      [orderId, amount, 'I would like to withdraw from this purchase']);

  const inForceRefunds = () => scalar(
    `select v.id, v.version_number, v.body, v.effective_at
       from public.policy_versions v
       join public.policy_documents d on d.id = v.document_id
      where d.slug = 'refunds' and v.status = 'in_force'
      order by v.version_number desc limit 1`);

  // -------------------------------------------------------------------------
  console.log('\nAct I — the words, in one place, in both places they are needed');
  // -------------------------------------------------------------------------

  await test('the published refunds policy states the withdrawal right in the same words the checkout shows', async () => {
    const wording = (await scalar('select public.withdrawal_wording() as w')).w;
    const live = await inForceRefunds();

    assert(live, 'no refunds policy version is in force');
    assert(live.body.includes(wording),
      'the checkout wording and the published policy have drifted apart');
    assert(!live.body.includes('No waiver is offered and none will be'),
      'the policy still says no waiver is offered');
    assert(!live.body.includes('[OWNER DECISION'),
      'a published policy still carries an open decision');
    assert(live.effective_at.toISOString().slice(0, 10) === '2026-11-01',
      `the published version is dated ${String(live.effective_at).slice(0, 10)}`);
  });

  await test('publishing the correction retired the version it replaced rather than deleting it', async () => {
    const rows = (await q(
      `select v.version_number, v.status
         from public.policy_versions v
         join public.policy_documents d on d.id = v.document_id
        where d.slug = 'refunds' order by v.version_number`)).rows;
    assert(rows.length >= 2, 'the earlier version was deleted, so nobody can see what was agreed to');
    assert(rows[0].status === 'retired');
    assert(rows[rows.length - 1].status === 'in_force');

    const audit = (await q(
      `select detail from public.governance_audit_events
        where action = 'policy.published' and detail ->> 'slug' = 'refunds'
        order by occurred_at desc limit 1`)).rows[0];
    assert(audit, 'the new version was published without a record of why');
    assert(/not been reviewed by a lawyer/.test(audit.detail.reason),
      'the approval reason does not say the wording is unreviewed');
  });

  await test('the offer knows which countries have the right, and says so in words', async () => {
    for (const country of ['DE', 'FR', 'GB', 'NO', 'IS']) {
      const o = await offer(country);
      assert(o.statutory === true, `${country} was treated as having no withdrawal right`);
      assert(o.canWaive === true, `${country} was not offered the waiver`);
      assert(o.reason === 'offered', `${country} reason ${o.reason}`);
      assert(o.policyVersionId, `${country} has no policy version to waive`);
      assert(/14 days/.test(o.wording));
    }

    for (const country of ['UG', 'KE', 'US', 'NG']) {
      const o = await offer(country);
      assert(o.statutory === false, `${country} was treated as a 14-day market`);
      assert(o.canWaive === false, `${country} was offered a waiver it cannot make`);
      assert(/72-hour/.test(o.message), `${country}: ${o.message}`);
    }

    const unknown = await offer(null);
    assert(unknown.statutory === true,
      'a buyer whose country is unknown was treated as having no right');
    assert(unknown.countryKnown === false);
  });

  // -------------------------------------------------------------------------
  console.log('\nAct II — the choice is the buyer\'s, recorded once, before payment');
  // -------------------------------------------------------------------------

  await test('a waiver is recorded on the order with its country and the policy version', async () => {
    const buyer = await newBuyer('DE');
    const id = await order(buyer.account);

    const result = await choose(buyer.userId, id, true, 'DE');
    assert(result.decision === 'waived');
    assert(result.country === 'DE');
    assert(result.policyVersionId, 'the waiver names no policy version');

    const row = await scalar(
      `select withdrawal_decision, withdrawal_decided_at, withdrawal_country,
              withdrawal_policy_version_id
         from public.orders where id = $1`, [id]);
    assert(row.withdrawal_decision === 'waived');
    assert(row.withdrawal_decided_at, 'the moment was not recorded');
    assert(row.withdrawal_country.trim() === 'DE');

    const live = await inForceRefunds();
    assert(row.withdrawal_policy_version_id === live.id,
      'the order names a version that is not the one in force');

    const audit = (await q(
      `select detail from public.governance_audit_events
        where action = 'order.withdrawal_choice' and target_id = $1`, [id])).rows[0];
    assert(audit, 'recording a waiver left no audit row');
    assert(audit.detail.decision === 'waived');
    assert(audit.detail.country === 'DE');
  });

  await test('a second choice is refused: one decision, and it is the first one', async () => {
    const buyer = await newBuyer('FR');
    const id = await order(buyer.account);
    await choose(buyer.userId, id, false);
    await rejects(() => choose(buyer.userId, id, true), /withdrawal:already_decided/);
  });

  await test('staff cannot waive somebody else\'s right for them', async () => {
    const buyer = await newBuyer('GB');
    const id = await order(buyer.account, { currency: 'GBP' });

    const support = await newUser('ww-support@example.com');
    await newProfile(support, 'Support Agent');
    await grantRole(support, 'support_agent', admin);

    // Not on the billing account, so not the buyer — and the privileged override
    // every other money function gives staff is deliberately absent here.
    await rejects(() => choose(support, id, true, 'GB'), /withdrawal:not_your_order/);
    const row = await scalar('select withdrawal_decision from public.orders where id = $1', [id]);
    assert(row.withdrawal_decision === null);
  });

  await test('a waiver is refused on an order that has already been paid', async () => {
    const buyer = await newBuyer('DE');
    const id = await order(buyer.account);
    await pay(id);
    await rejects(() => choose(buyer.userId, id, true), /withdrawal:already_paid/);
  });

  await test('a waiver is refused where there is no right to waive', async () => {
    const buyer = await newBuyer('UG', 'UGX');
    const id = await order(buyer.account, { currency: 'UGX' });
    await rejects(() => choose(buyer.userId, id, true, 'UG'), /withdrawal:not_applicable/);
  });

  await test('a waiver is refused when no refunds policy is in force', async () => {
    const buyer = await newBuyer('DE');
    const id = await order(buyer.account);

    // Retire the published version for the length of one call. A waiver of words
    // nobody has published is not evidence of anything, and this is the guard.
    const live = await inForceRefunds();
    await q("update public.policy_versions set status = 'retired' where id = $1", [live.id]);
    try {
      await rejects(() => choose(buyer.userId, id, true), /withdrawal:no_policy/);
      const o = await offer('DE');
      assert(o.canWaive === false, 'the box was still offered with no policy in force');
      assert(o.reason === 'no_policy_in_force');
      assert(/keep the 14 days/.test(o.message), o.message);
    } finally {
      await q("update public.policy_versions set status = 'in_force' where id = $1", [live.id]);
    }
  });

  // -------------------------------------------------------------------------
  console.log('\nAct III — unticked is a purchase, and it keeps the 14 days');
  // -------------------------------------------------------------------------

  await test('an unticked box does not block the purchase', async () => {
    const buyer = await newBuyer('DE');
    const id = await order(buyer.account);
    const kept = await choose(buyer.userId, id, false);
    assert(kept.decision === 'retained');
    assert(/keep the 14 days/.test(kept.message));

    await pay(id);
    const row = await scalar('select status from public.orders where id = $1', [id]);
    assert(row.status === 'paid', 'declining the waiver blocked the purchase');

    const s = await standing(buyer.userId, id);
    assert(s.windowHours === 336, `the buyer kept ${s.windowHours} hours, not 14 days`);
    assert(s.withdrawal.rule === 'statutory_14_days');
  });

  // -------------------------------------------------------------------------
  console.log('\nAct IV — one clock, and the rule it came from is on the answer');
  // -------------------------------------------------------------------------

  await test('a European buyer who waived nothing has 14 days, not 72 hours', async () => {
    const buyer = await newBuyer('DE');
    const id = await order(buyer.account);
    await pay(id, { ageHours: 200 });

    const s = await standing(buyer.userId, id);
    assert(s.allowed === true, `refused after 200 hours: ${s.message}`);
    assert(s.windowHours === 336);
    assert(s.withdrawal.rule === 'statutory_14_days');
    assert(/14 days/.test(s.message), s.message);

    await ask(buyer.userId, id);
  });

  await test('and 15 days is too late, said as the law rather than as policy', async () => {
    const buyer = await newBuyer('FR');
    const id = await order(buyer.account);
    await pay(id, { ageHours: 15 * 24 + 1 });

    const s = await standing(buyer.userId, id);
    assert(s.allowed === false);
    assert(s.reason === 'window_closed');
    assert(/14 days/.test(s.message), s.message);

    await rejects(() => ask(buyer.userId, id), /14 days you have by law to withdraw/);
  });

  await test('a buyer who waived got the 72-hour window they asked for', async () => {
    const buyer = await newBuyer('DE');
    const id = await order(buyer.account);
    await choose(buyer.userId, id, true);

    const inside = await standing(buyer.userId, id);
    // Not paid yet: the clock has not started, and it is already the 72-hour one.
    assert(inside.withdrawal.hours === 72, `hours ${inside.withdrawal.hours}`);
    assert(inside.withdrawal.rule === 'waived_policy_window');

    await pay(id, { ageHours: 100 });
    const late = await standing(buyer.userId, id);
    assert(late.allowed === false);
    assert(late.windowHours === 72);
    assert(/asked us to open the course immediately/.test(late.message), late.message);
    await rejects(() => ask(buyer.userId, id), /within 72 hours of payment/);
  });

  await test('outside those countries nothing changed: 72 hours, in and out', async () => {
    const buyer = await newBuyer('UG', 'UGX');

    const fresh = await order(buyer.account, { currency: 'UGX' });
    await pay(fresh, { ageHours: 1 });
    const open = await standing(buyer.userId, fresh);
    assert(open.allowed === true);
    assert(open.windowHours === 72);
    assert(open.withdrawal.rule === 'policy_window');
    await ask(buyer.userId, fresh);

    const stale = await order(buyer.account, { currency: 'UGX' });
    await pay(stale, { ageHours: 100 });
    const shut = await standing(buyer.userId, stale);
    assert(shut.allowed === false);
    assert(shut.reason === 'window_closed');
    assert(/72 hours/.test(shut.message), shut.message);
  });

  await test('a buyer whose country was never recorded keeps the benefit of the doubt', async () => {
    const buyer = await newBuyer(null, 'USD');
    const id = await order(buyer.account, { currency: 'USD' });
    await pay(id, { ageHours: 200 });

    const s = await standing(buyer.userId, id);
    assert(s.withdrawal.statutory === true,
      'an unknown country was treated as one with no withdrawal right');
    assert(s.allowed === true, s.message);
  });

  await test('the order records the country the choice was made from, not today\'s country', async () => {
    const buyer = await newBuyer('DE');
    const id = await order(buyer.account);
    await choose(buyer.userId, id, false, 'DE');

    // The account moves. The right was decided where the purchase happened.
    await q("update public.billing_accounts set billing_country = 'UG' where id = $1",
      [buyer.account]);

    const s = await standing(buyer.userId, id);
    assert(s.withdrawal.country === 'DE',
      'the clock followed the account instead of the recorded order');
    assert(s.withdrawal.rule === 'statutory_14_days');
  });

  await test('the audit says which rule the request was made under', async () => {
    const buyer = await newBuyer('DE');
    const id = await order(buyer.account);
    await pay(id, { ageHours: 10 });
    const refundId = await ask(buyer.userId, id).then((r) => r.rows[0].id);

    const event = (await q(
      `select detail from public.governance_audit_events
        where action = 'refund.requested' and target_id = $1`, [refundId])).rows[0];
    assert(event, 'the request left no audit row');
    assert(Number(event.detail.window_hours) === 336);
    assert(event.detail.window_rule === 'statutory_14_days');
  });
}
