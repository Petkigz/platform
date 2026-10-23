// The 72-hour refund window.
//
// The owner's rule, 2026-10-23: *a customer can only get a refund between the 72
// hours that happen after the payment.* Before this there was no clock at all —
// a family could ask a year later and the only limits were the refundable
// balance and somebody's judgement.
//
// What this suite pins, in the order it matters:
//
//   1. The clock is the payment's, and it is read in the database. A client
//      cannot ask early or late by moving its own clock; `paid_at` is written by
//      `record_payment_success()` from a verified confirmation, never by a
//      browser coming back.
//   2. It bounds *asking*, not *deciding*. A request made at hour 71 is valid
//      and can be approved at hour 200 — a rule that expired requests in flight
//      would punish the customer for the platform's speed.
//   3. It is a customer policy, so staff are exempt. A support call that ends in
//      "the window closed" is how a platform loses a family over a course that
//      was sold wrong, and a rule with no way to make something right gets
//      worked around in SQL, where nothing is audited.
//   4. A closed window is *said*, not hidden: `refund_standing()` decomposes the
//      same predicate the writer enforces, so the screen can print the date.

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    asUser, committed, bootstrapAdmin, newUser, newProfile, grantRole,
  } = ctx;

  const admin = await bootstrapAdmin('win-admin@example.com');
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
         values ('course','Window course','active',$1) returning id`, [admin])).id;
    }
    return productId;
  };

  async function newBuyer(name) {
    seq += 1;
    const userId = await newUser(`win-${seq}@example.com`);
    await newProfile(userId, name);
    const account = (await scalar(
      `insert into public.billing_accounts (display_name, billing_currency, status, created_by)
       values ($1,'UGX','active',$2) returning id`, [name, userId])).id;
    return { userId, account };
  }

  /**
   * A paid, captured order, `ageHours` old.
   *
   * The age is applied to `paid_at` *and* to the capture, because the refund
   * ceiling reads the ledger. Moving only one of them would make the fixture
   * argue with itself instead of testing the clock.
   */
  async function paidOrder(account, { totalMinor = 30000, ageHours = 1 } = {}) {
    const order = (await scalar(
      `insert into public.orders (billing_account_id, currency_code, subtotal_minor, total_minor, status)
       values ($1,'UGX',$2,$2,'pending_payment') returning id`,
      [account, totalMinor])).id;
    await q(
      `insert into public.order_items
         (order_id, product_id, quantity, unit_price_minor, currency_code,
          discount_minor, line_total_minor, item_snapshot)
       values ($1,$2,1,$3,'UGX',0,$3,$4)`,
      [order, await product(), totalMinor, JSON.stringify({ title: 'Window course' })]);

    await q('select id from public.record_payment_success($1,$2,$3,$4,null,$5)',
      [order, admin, 'manual', `REF-WIN-${seq}-${totalMinor}`, 'Bank statement']);

    if (ageHours > 0) {
      await q(`update public.orders set paid_at = paid_at - make_interval(hours => $2)
               where id = $1`, [order, ageHours]);
      await q(`update public.financial_transactions
                  set occurred_at = occurred_at - make_interval(hours => $2)
                where order_id = $1 and transaction_type = 'capture'`, [order, ageHours]);
    }
    return order;
  }

  const ask = (buyer, order, amount = 1000) =>
    asActor(buyer, 'select public.request_refund($1,$2,$3) id',
      [order, amount, 'Please refund this']).then((r) => r.rows[0].id);

  const standingFor = (actor, order) =>
    asActor(actor, 'select public.refund_standing($1) s', [order]).then((r) => r.rows[0].s);

  // -------------------------------------------------------------------------
  console.log('\nThe clock');
  // -------------------------------------------------------------------------

  await test('a payment an hour old can be refunded', async () => {
    const { userId, account } = await newBuyer('Window Fresh');
    const order = await paidOrder(account, { ageHours: 1 });

    const standing = await standingFor(userId, order);
    assert(standing.allowed === true, `refused: ${standing.message}`);
    assert(standing.reason === 'allowed', `reason was ${standing.reason}`);
    assert(standing.windowHours === 72, `the window is ${standing.windowHours} hours`);
    assert(standing.remainingHours > 70 && standing.remainingHours <= 72,
      `${standing.remainingHours} hours left on a payment an hour old`);

    const id = await ask(userId, order);
    assert(typeof id === 'string', 'no request was created inside the window');
  });

  await test('a payment older than the window is refused, and the sentence says when it closed', async () => {
    const { userId, account } = await newBuyer('Window Late');
    const order = await paidOrder(account, { ageHours: 73 });

    await rejects(() => ask(userId, order), /refund window closed/i);

    const standing = await standingFor(userId, order);
    assert(standing.allowed === false, 'the standing says a closed window is open');
    assert(standing.reason === 'window_closed', `reason was ${standing.reason}`);
    assert(standing.remainingHours === 0, `${standing.remainingHours} hours left on a closed window`);
    assert(/closed on/i.test(standing.message), `it said ${standing.message}`);
    assert(/\d{2} \w{3} \d{4}/.test(standing.message),
      `the message names no date: ${standing.message}`);

    // And no row was created by the attempt.
    const rows = await scalar(
      'select count(*)::int n from public.refund_requests where order_id = $1', [order]);
    assert(rows.n === 0, `a refused request still wrote ${rows.n} row(s)`);
  });

  await test('the boundary is the payment, not the calendar day', async () => {
    const { userId, account } = await newBuyer('Window Edge');
    // 71 hours and 59 minutes: inside by a minute.
    const inside = await paidOrder(account, { ageHours: 71 });
    await q(`update public.orders set paid_at = paid_at - interval '59 minutes' where id = $1`,
      [inside]);
    const id = await ask(userId, inside);
    assert(typeof id === 'string', 'a payment 71h59m old was refused');

    // 72 hours and a minute: outside.
    const outside = await paidOrder(account, { ageHours: 72 });
    await q(`update public.orders set paid_at = paid_at - interval '1 minute' where id = $1`,
      [outside]);
    await rejects(() => ask(userId, outside), /refund window closed/i);
  });

  await test('the window is a setting, not a number in the code', async () => {
    const { userId, account } = await newBuyer('Window Setting');
    const order = await paidOrder(account, { ageHours: 80 });
    await rejects(() => ask(userId, order), /refund window closed/i);

    await committed(async () => {
      await q(`update public.platform_settings set value_text = '96'
               where key = 'commerce.refund_window_hours'`);
    });
    try {
      assert((await scalar('select public.refund_window_hours() n')).n === 96,
        'the setting did not reach the function');
      const standing = await standingFor(userId, order);
      assert(standing.allowed === true, 'widening the setting did not reopen the window');
      const id = await ask(userId, order);
      assert(typeof id === 'string', 'the widened window still refused');
    } finally {
      await committed(async () => {
        await q(`update public.platform_settings set value_text = '72'
                 where key = 'commerce.refund_window_hours'`);
      });
    }
  });

  await test('a zero window means no self-serve refunds, and a negative one is clamped', async () => {
    const { userId, account } = await newBuyer('Window Zero');
    const order = await paidOrder(account, { ageHours: 0 });

    await committed(async () => {
      await q(`update public.platform_settings set value_text = '0'
               where key = 'commerce.refund_window_hours'`);
    });
    try {
      await rejects(() => ask(userId, order), /refund window closed/i);
      await committed(async () => {
        await q(`update public.platform_settings set value_text = '-5'
                 where key = 'commerce.refund_window_hours'`);
      });
      assert((await scalar('select public.refund_window_hours() n')).n === 0,
        'a negative window was not clamped to zero');
    } finally {
      await committed(async () => {
        await q(`update public.platform_settings set value_text = '72'
                 where key = 'commerce.refund_window_hours'`);
      });
    }
  });

  // -------------------------------------------------------------------------
  console.log('\nThe clock does not decide');
  // -------------------------------------------------------------------------

  await test('a request made in time can be decided after the window has closed', async () => {
    const { userId, account } = await newBuyer('Window Decided');
    const order = await paidOrder(account, { ageHours: 70 });
    const request = await ask(userId, order);

    // The clock runs out while the request is waiting on a person.
    await q(`update public.orders set paid_at = paid_at - interval '5 hours' where id = $1`,
      [order]);
    await rejects(() => ask(userId, order), /refund window closed/i);

    // Approval is not bounded by the window: it bounds asking.
    await asActor(admin, 'select public.decide_refund_request($1,true,$2)',
      [request, 'Agreed, despite the delay']);

    const settled = await scalar(
      'select status from public.refund_requests where id = $1', [request]);
    assert(settled.status === 'approved',
      `a request made in time was ${settled.status} because the clock moved`);
  });

  // -------------------------------------------------------------------------
  console.log('\nStaff may still make it right');
  // -------------------------------------------------------------------------

  await test('staff can open a request outside the window, and it is attributed to them', async () => {
    const { userId, account } = await newBuyer('Window Goodwill');
    const order = await paidOrder(account, { ageHours: 200 });

    await rejects(() => ask(userId, order), /refund window closed/i);

    const id = await asActor(admin, 'select public.request_refund($1,$2,$3) id',
      [order, 5000, 'Sold the wrong course; refunding as a goodwill gesture']).then((r) => r.rows[0].id);

    const row = await scalar(
      'select requested_by, requested_amount_minor, status from public.refund_requests where id = $1',
      [id]);
    assert(row.requested_by === admin, 'the staff request is not attributed to the staff member');
    assert(row.status === 'requested', `it was created ${row.status}`);

    // Two-person rule still holds: the same person cannot approve it.
    await rejects(
      () => asActor(admin, 'select public.decide_refund_request($1,true,$2)', [id, 'Mine']),
      /cannot decide a refund you requested yourself/i);
  });

  await test('a staff request outside the window is recorded as staff-opened', async () => {
    // The audit has to answer "was this inside the policy" without anybody
    // reconstructing the clock a year later.
    const { account } = await newBuyer('Window Audit');
    const order = await paidOrder(account, { ageHours: 200 });
    const id = await asActor(admin, 'select public.request_refund($1,$2,$3) id',
      [order, 1000, 'Goodwill']).then((r) => r.rows[0].id);

    const event = await scalar(
      `select action, detail from public.governance_audit_events
        where target_id = $1 order by occurred_at desc limit 1`, [id]);
    assert(event.action === 'refund.requested_by_staff',
      `the audit says ${event.action}`);
    // A customer request carries the window it was judged against; a staff one
    // deliberately does not, because the window did not apply.
    assert(event.detail.window_hours === null,
      `a staff request recorded a window of ${event.detail.window_hours}`);
  });

  await test('an ordinary customer request records the window it was judged against', async () => {
    const { userId, account } = await newBuyer('Window Audit Customer');
    const order = await paidOrder(account, { ageHours: 1 });
    const id = await ask(userId, order);
    const event = await scalar(
      `select action, detail from public.governance_audit_events
        where target_id = $1 order by occurred_at desc limit 1`, [id]);
    assert(event.action === 'refund.requested', `the audit says ${event.action}`);
    assert(Number(event.detail.window_hours) === 72,
      `the audit recorded a window of ${event.detail.window_hours}`);
  });

  // -------------------------------------------------------------------------
  console.log('\nThe standing explains the writer');
  // -------------------------------------------------------------------------

  await test('the standing agrees with the writer, reason for reason', async () => {
    const { userId, account } = await newBuyer('Window Agreement');

    // Open.
    const fresh = await paidOrder(account, { ageHours: 1 });
    let standing = await standingFor(userId, fresh);
    let wrote = true;
    try { await ask(userId, fresh); } catch { wrote = false; }
    assert(standing.allowed === wrote,
      `the standing said ${standing.allowed} and the writer ${wrote ? 'accepted' : 'refused'}`);

    // Closed.
    const old = await paidOrder(account, { ageHours: 100 });
    standing = await standingFor(userId, old);
    wrote = true;
    try { await ask(userId, old); } catch { wrote = false; }
    assert(standing.allowed === wrote,
      `the standing said ${standing.allowed} and the writer ${wrote ? 'accepted' : 'refused'}`);
    assert(standing.allowed === false, 'a payment 100 hours old is still refundable');

    // Nothing left to refund: a full refund has already been taken.
    const spent = await paidOrder(account, { totalMinor: 8000, ageHours: 1 });
    const refundAll = await scalar(
      `insert into public.refund_transactions (order_id, amount_minor, currency_code, status, refunded_at)
       values ($1, 8000, 'UGX', 'completed', now()) returning id`, [spent]);
    assert(refundAll.id, 'the fixture could not complete a refund');
    standing = await standingFor(userId, spent);
    assert(standing.allowed === false, 'an order with nothing left says it is refundable');
    assert(standing.reason === 'nothing_left', `reason was ${standing.reason}`);
  });

  await test('an unpaid order has nothing to refund, and the standing says so', async () => {
    const { userId, account } = await newBuyer('Window Unpaid');
    const order = (await scalar(
      `insert into public.orders (billing_account_id, currency_code, subtotal_minor, total_minor, status)
       values ($1,'UGX',12000,12000,'pending_payment') returning id`, [account])).id;

    const standing = await standingFor(userId, order);
    assert(standing.allowed === false && standing.reason === 'not_paid',
      `reason was ${standing.reason}`);
    await rejects(() => ask(userId, order), /nothing to refund/i);
  });

  await test("a stranger cannot read the standing for somebody else's order", async () => {
    const { account } = await newBuyer('Window Private');
    const order = await paidOrder(account, { ageHours: 1 });
    const { userId: outsider } = await newBuyer('Window Outsider');
    await rejects(() => standingFor(outsider, order), /not on the billing account/i);
  });

  await test('the standing is refused to a signed-out caller', async () => {
    await rejects(
      () => q("select public.refund_standing('00000000-0000-0000-0000-000000000000')"),
      /sign in/i);
  });

  // -------------------------------------------------------------------------
  console.log('\nThe setting is a decision, not a deploy');
  // -------------------------------------------------------------------------

  await test('the window is a documented admin control, and ships at 72', async () => {
    const row = await scalar(
      `select value_type, value_text, gate_type from public.platform_settings
        where key = 'commerce.refund_window_hours'`);
    assert(row, 'the setting is not in the register');
    assert(row.value_type === 'integer' && row.value_text === '72',
      `it ships as ${row.value_type} ${row.value_text}`);
    assert(row.gate_type === 'admin', `it ships ${row.gate_type}-gated`);
  });

  await test('a learner cannot move the window', async () => {
    const { userId } = await newBuyer('Window Tamper');
    await asUser(userId, async () => {
      await q(`update public.platform_settings set value_text = '99999'
               where key = 'commerce.refund_window_hours'`);
    });
    const after = await scalar(`select value_text v from public.platform_settings
                                 where key = 'commerce.refund_window_hours'`);
    assert(after.v === '72', `a learner moved the window to ${after.v}`);
  });
}
