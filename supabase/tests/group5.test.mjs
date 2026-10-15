// Group 5 tests: orders, payments, refunds, payouts.
//
// D4 is frozen, so these are the tests that would catch someone quietly
// breaking it: money as integers, a redirect that is not proof of payment,
// idempotent callbacks, a refund request that is not a refund, and a ceiling
// computed from the ledger rather than a cached balance.

export async function run(ctx) {
  const {
    q, count, test, assert, rejects,
    asUser, asAnon,
    newUser, newProfile,
    bootstrapAdmin, newInstructor, newReviewer,
  } = ctx;

  const admin    = await bootstrapAdmin('g5-admin@example.com');
  const finance  = await bootstrapAdmin('g5-finance@example.com');
  const teacher  = await newInstructor('g5-teacher@example.com', admin);
  const stranger = await newUser('g5-stranger@example.com');
  await newProfile(stranger);

  async function newPayer(email) {
    const userId = await newUser(email);
    await newProfile(userId, email);
    const acct = (await q(
      `insert into public.billing_accounts (display_name, billing_currency, created_by)
       values ('Payer', 'UGX', $1) returning id`, [userId])).rows[0].id;
    await q(`insert into public.billing_account_memberships
               (billing_account_id, user_id, granted_by) values ($1,$2,$2)`, [acct, userId]);
    return { userId, acct };
  }

  // An order whose line items add up to its total.
  async function newOrder(acct, { total = 30000, currency = 'UGX' } = {}) {
    const prod = (await q(
      `insert into public.products (product_type, name, status, created_by)
       values ('course','Paid course','active',$1) returning id`, [teacher])).rows[0].id;
    const order = (await q(
      `insert into public.orders
         (billing_account_id, currency_code, subtotal_minor, discount_minor, tax_minor, total_minor, status)
       values ($1, $2, $3, 0, 0, $3, 'pending_payment') returning id`,
      [acct, currency, total])).rows[0].id;
    await q(`insert into public.order_items
               (order_id, product_id, quantity, unit_price_minor, currency_code, line_total_minor, item_snapshot)
             values ($1, $2, 1, $3, $4, $3, '{"title":"Paid course"}')`,
      [order, prod, total, currency]);
    return { order, prod };
  }

  // ---------------------------------------------------------------------
  console.log('Schema');

  await test('all twenty Group 5 tables exist', async () => {
    const want = ['orders', 'order_items', 'order_adjustments', 'order_status_history',
      'payment_attempts', 'payment_provider_accounts', 'payment_provider_events',
      'payment_method_references', 'financial_transactions', 'transaction_provider_references',
      'payment_reconciliations', 'payment_reconciliation_items', 'currency_exchange_rates',
      'refund_requests', 'refund_transactions', 'payment_disputes', 'financial_adjustments',
      'instructor_earnings_entries', 'instructor_payouts', 'instructor_payout_items'];
    const names = (await q(
      `select table_name from information_schema.tables
        where table_schema='public' and table_type='BASE TABLE'`)).rows.map(r => r.table_name);
    for (const t of want) assert(names.includes(t), `missing table ${t}`);
  });

  // ---------------------------------------------------------------------
  console.log('\nOrder integrity');

  await test('order totals must agree with their components', async () => {
    const { acct } = await newPayer('ord-1@example.com');
    await rejects(() => q(
      `insert into public.orders
         (billing_account_id, currency_code, subtotal_minor, discount_minor, tax_minor, total_minor)
       values ($1,'UGX',30000,5000,0,30000)`, [acct]),
      'an order whose total did not match subtotal - discount + tax was accepted');
  });

  await test('a paid order must name who confirmed it and against what', async () => {
    const { acct } = await newPayer('ord-2@example.com');
    await rejects(() => q(
      `insert into public.orders
         (billing_account_id, currency_code, subtotal_minor, total_minor, status, paid_at)
       values ($1,'UGX',30000,30000,'paid',now())`, [acct]),
      'an order was marked paid with no confirmation evidence');
  });

  await test('order line items must use the order currency', async () => {
    const { acct } = await newPayer('ord-3@example.com');
    const { order, prod } = await newOrder(acct);
    await rejects(() => q(
      `insert into public.order_items
         (order_id, product_id, quantity, unit_price_minor, currency_code, line_total_minor)
       values ($1,$2,1,1000,'USD',1000)`, [order, prod]),
      'a mixed-currency line item was accepted');
  });

  await test('order status history is append-only and automatic', async () => {
    const { acct } = await newPayer('ord-4@example.com');
    const { order } = await newOrder(acct);
    await q(`update public.orders set status='cancelled', cancelled_at=now() where id=$1`, [order]);

    const hist = (await q(
      `select to_status from public.order_status_history where order_id=$1`, [order])).rows;
    assert(hist.length === 1 && hist[0].to_status === 'cancelled',
      `unexpected history: ${JSON.stringify(hist)}`);

    await rejects(() => q('delete from public.order_status_history where order_id=$1', [order]),
      'order history was deleted');
  });

  // ---------------------------------------------------------------------
  console.log('\nProof of payment');

  await test('a payment cannot be confirmed on nothing at all', async () => {
    const { acct } = await newPayer('pay-1@example.com');
    const { order } = await newOrder(acct);
    await rejects(() => q(
      'select * from public.record_payment_success($1,$2,$3,$4)',
      [order, admin, 'mtn_momo', 'REF123']),
      'a payment was confirmed with no verified event and no manual evidence');
  });

  await test('an unverified provider event cannot confirm a payment', async () => {
    const { acct } = await newPayer('pay-2@example.com');
    const { order } = await newOrder(acct);
    const ev = (await q(
      `insert into public.payment_provider_events
         (provider, provider_event_id, event_type, signature_verified)
       values ('mtn_momo','evt-unverified','payment.success',false) returning id`)).rows[0].id;

    await rejects(() => q(
      'select * from public.record_payment_success($1,$2,$3,$4,$5)',
      [order, admin, 'mtn_momo', 'REF', ev]),
      'an event that failed signature verification confirmed a payment');
  });

  await test('a verified provider event confirms the payment and writes the ledger', async () => {
    const { acct } = await newPayer('pay-3@example.com');
    const { order } = await newOrder(acct);
    const ev = (await q(
      `insert into public.payment_provider_events
         (provider, provider_event_id, event_type, signature_verified)
       values ('mtn_momo','evt-ok-1','payment.success',true) returning id`)).rows[0].id;

    const o = (await q(
      'select * from public.record_payment_success($1,$2,$3,$4,$5)',
      [order, admin, 'mtn_momo', 'MTN-REF-1', ev])).rows[0];

    assert(o.status === 'paid', `order status is ${o.status}`);
    assert(o.payment_confirmed_by === admin, 'the confirming actor was not recorded');
    assert(o.payment_evidence, 'no evidence reference was recorded');

    const cap = (await q(
      `select transaction_type, amount_minor, currency_code from public.financial_transactions
        where order_id=$1`, [order])).rows[0];
    assert(cap.transaction_type === 'capture', `expected a capture, got ${cap.transaction_type}`);
    assert(Number(cap.amount_minor) === 30000, `captured ${cap.amount_minor}`);

    const processed = (await q(
      'select processing_status from public.payment_provider_events where id=$1', [ev])).rows[0].processing_status;
    assert(processed === 'processed', `event left in state ${processed}`);
  });

  await test('the same provider event cannot be applied twice', async () => {
    const { acct } = await newPayer('pay-4@example.com');
    const { order } = await newOrder(acct);
    const ev = (await q(
      `insert into public.payment_provider_events
         (provider, provider_event_id, event_type, signature_verified)
       values ('mtn_momo','evt-dup','payment.success',true) returning id`)).rows[0].id;

    await q('select * from public.record_payment_success($1,$2,$3,$4,$5)',
      [order, admin, 'mtn_momo', 'MTN-REF-2', ev]);

    // A different order, same event: must be refused.
    const { order: order2 } = await newOrder(acct);
    await rejects(() => q(
      'select * from public.record_payment_success($1,$2,$3,$4,$5)',
      [order2, admin, 'mtn_momo', 'MTN-REF-3', ev]),
      'an already-processed provider event was applied to a second order');

    // The same order again is a retry, not an error, and must not duplicate.
    await q('select * from public.record_payment_success($1,$2,$3,$4,$5)',
      [order, admin, 'mtn_momo', 'MTN-REF-2', ev]);
    const caps = await count(
      `select count(*)::int n from public.financial_transactions
        where order_id=$1 and transaction_type='capture'`, [order]);
    assert(caps === 1, `a retry produced ${caps} captures`);
  });

  await test('the callback inbox deduplicates on provider plus event id', async () => {
    await q(`insert into public.payment_provider_events
               (provider, provider_event_id, event_type, signature_verified)
             values ('airtel_money','evt-unique','payment.success',true)`);
    await rejects(() => q(
      `insert into public.payment_provider_events
         (provider, provider_event_id, event_type, signature_verified)
       values ('airtel_money','evt-unique','payment.success',true)`),
      'the same provider event was stored twice');
  });

  await test('manual confirmation requires a privileged actor and written evidence', async () => {
    const { acct, userId } = await newPayer('pay-5@example.com');
    const { order } = await newOrder(acct);
    await rejects(() => q(
      'select * from public.record_payment_success($1,$2,$3,$4,null,$5)',
      [order, userId, 'manual', 'CASH-1', 'handed over cash at the office']),
      'a non-privileged actor manually confirmed a payment');

    await q('select * from public.record_payment_success($1,$2,$3,$4,null,$5)',
      [order, admin, 'manual', 'CASH-1', 'Cash received at the Kampala office, receipt 4471']);
    const o = (await q('select status, payment_evidence from public.orders where id=$1', [order])).rows[0];
    assert(o.status === 'paid', 'manual confirmation did not complete');
    assert(o.payment_evidence.includes('Cash received'), 'the evidence was not recorded');
  });

  await test('payment attempts are idempotent per order', async () => {
    const { acct } = await newPayer('pay-6@example.com');
    const { order } = await newOrder(acct);
    const mk = () => q(
      `insert into public.payment_attempts
         (order_id, amount_minor, currency_code, provider, method, idempotency_key)
       values ($1,30000,'UGX','mtn_momo','mobile_money','key-abc')`, [order]);
    await mk();
    await rejects(() => mk(), 'a retried idempotency key created a second charge');
  });

  // ---------------------------------------------------------------------
  console.log('\nRefunds');

  await test('a refund request is not a completed refund', async () => {
    const { acct } = await newPayer('ref-1@example.com');
    const { order } = await newOrder(acct, { total: 30000 });
    await q('select * from public.record_payment_success($1,$2,$3,$4,null,$5)',
      [order, admin, 'manual', 'R1', 'Cash, receipt 1']);

    const req = (await q(
      `insert into public.refund_requests (order_id, requested_amount_minor, currency_code, reason, requested_by)
       values ($1, 10000, 'UGX', 'Changed my mind', $2) returning id`, [order, admin])).rows[0].id;

    const refunded = (await q('select public.refundable_amount($1) as v', [order])).rows[0].v;
    assert(Number(refunded) === 30000,
      `a request alone reduced the refundable balance to ${refunded}`);

    const st = (await q('select status from public.orders where id=$1', [order])).rows[0].status;
    assert(st === 'paid', `the order status changed to ${st} on a mere request`);
  });

  await test('a refund cannot exceed the captured amount net of prior refunds', async () => {
    const { acct } = await newPayer('ref-2@example.com');
    const { order } = await newOrder(acct, { total: 30000 });
    await q('select * from public.record_payment_success($1,$2,$3,$4,null,$5)',
      [order, admin, 'manual', 'R2', 'Cash, receipt 2']);

    await q(`insert into public.refund_transactions
               (order_id, amount_minor, currency_code, status, refunded_at, processed_by)
             values ($1, 20000, 'UGX', 'completed', now(), $2)`, [order, admin]);

    assert(Number((await q('select public.refundable_amount($1) as v', [order])).rows[0].v) === 10000,
      'the refundable balance did not account for the first refund');

    await rejects(() => q(
      `insert into public.refund_transactions
         (order_id, amount_minor, currency_code, status, refunded_at, processed_by)
       values ($1, 15000, 'UGX', 'completed', now(), $2)`, [order, admin]),
      'a refund exceeding the remaining balance was allowed');

    // Concurrent pending refunds count against the ceiling too.
    await q(`insert into public.refund_transactions
               (order_id, amount_minor, currency_code, status)
             values ($1, 8000, 'UGX', 'pending')`, [order]);
    await rejects(() => q(
      `insert into public.refund_transactions
         (order_id, amount_minor, currency_code, status)
       values ($1, 5000, 'UGX', 'pending')`, [order]),
      'two pending refunds together exceeded the refundable balance');
  });

  await test('a refund does not delete learning history', async () => {
    const { acct } = await newPayer('ref-3@example.com');
    const { order } = await newOrder(acct);
    await q('select * from public.record_payment_success($1,$2,$3,$4,null,$5)',
      [order, admin, 'manual', 'R3', 'Cash, receipt 3']);

    const owner = await newUser('refund-learner@example.com');
    await newProfile(owner);
    const learner = (await q(
      `insert into public.learner_profiles (display_name, learner_type, age_band, linked_user_id)
       values ('Refund learner','adult','18+',$1) returning id`, [owner])).rows[0].id;
    const course = (await q(
      `insert into public.courses (slug, title, created_by, status)
       values ('refund-course','Refund course',$1,'active') returning id`, [teacher])).rows[0].id;
    // Left as a draft: D5 freezes the whole subtree on publication, and this
    // test only needs the rows to exist.
    const version = (await q(
      `insert into public.course_versions (course_id, version_number, language, created_by)
       values ($1,1,'en',$2) returning id`, [course, teacher])).rows[0].id;
    const section = (await q(
      `insert into public.course_sections (course_version_id, title) values ($1,'S') returning id`,
      [version])).rows[0].id;
    const lesson = (await q(
      `insert into public.lessons (section_id, title) values ($1,'L') returning id`, [section])).rows[0].id;

    const enr = (await q(
      `insert into public.course_enrolments (learner_profile_id, course_id, course_version_id, source)
       values ($1,$2,$3,'purchase') returning id`, [learner, course, version])).rows[0].id;
    await q(`insert into public.lesson_progress
               (course_enrolment_id, lesson_id, status, progress_percent, completed_at)
             values ($1,$2,'completed',100,now())`, [enr, lesson]);

    await q(`insert into public.refund_transactions
               (order_id, amount_minor, currency_code, status, refunded_at, processed_by)
             values ($1, 30000, 'UGX', 'completed', now(), $2)`, [order, admin]);

    const progress = await count(
      'select count(*)::int n from public.lesson_progress where course_enrolment_id=$1', [enr]);
    assert(progress === 1, 'a refund deleted the learner\'s progress');
  });

  await test('a requester may not approve their own refund', async () => {
    const { acct } = await newPayer('ref-4@example.com');
    const { order } = await newOrder(acct);
    await q('select * from public.record_payment_success($1,$2,$3,$4,null,$5)',
      [order, admin, 'manual', 'R4', 'Cash, receipt 4']);
    await rejects(() => q(
      `insert into public.refund_requests
         (order_id, requested_amount_minor, currency_code, reason, requested_by, decided_by, decided_at)
       values ($1, 5000, 'UGX', 'self-serving', $2, $2, now())`, [order, admin]),
      'a requester approved their own refund');
  });

  // ---------------------------------------------------------------------
  console.log('\nLedger and payouts');

  await test('financial adjustments are append-only', async () => {
    const { acct } = await newPayer('led-1@example.com');
    const { order } = await newOrder(acct);
    const adj = (await q(
      `insert into public.financial_adjustments (order_id, adjustment_type, amount_minor, currency_code, reason, created_by)
       values ($1,'write_off',-500,'UGX','Rounding on a mobile money fee',$2) returning id`,
      [order, admin])).rows[0].id;
    await rejects(() => q(
      `update public.financial_adjustments set amount_minor = -100 where id=$1`, [adj]),
      'a financial adjustment was edited');
  });

  await test('the revenue split is recorded and its arithmetic is checked', async () => {
    const { acct } = await newPayer('led-2@example.com');
    const { order } = await newOrder(acct, { total: 30000 });
    await q('select * from public.record_payment_success($1,$2,$3,$4,null,$5)',
      [order, admin, 'manual', 'L2', 'Cash, receipt 5']);

    await q(`insert into public.instructor_earnings_entries
               (instructor_user_id, order_id, gross_amount_minor, currency_code,
                revenue_share_percent, net_amount_minor)
             values ($1,$2,30000,'UGX',70,21000)`, [teacher, order]);

    await rejects(() => q(
      `insert into public.instructor_earnings_entries
         (instructor_user_id, order_id, gross_amount_minor, currency_code,
          revenue_share_percent, net_amount_minor)
       values ($1,$2,30000,'UGX',70,25000)`, [teacher, order]),
      'an earnings entry whose net did not match the recorded split was accepted');
  });

  await test('an earning can only be paid out once, at its net amount', async () => {
    const { acct } = await newPayer('led-3@example.com');
    const { order } = await newOrder(acct, { total: 40000 });
    await q('select * from public.record_payment_success($1,$2,$3,$4,null,$5)',
      [order, admin, 'manual', 'L3', 'Cash, receipt 6']);

    const e1 = (await q(
      `insert into public.instructor_earnings_entries
         (instructor_user_id, order_id, gross_amount_minor, currency_code,
          revenue_share_percent, net_amount_minor)
       values ($1,$2,40000,'UGX',70,28000) returning id`, [teacher, order])).rows[0].id;
    const e2 = (await q(
      `insert into public.instructor_earnings_entries
         (instructor_user_id, order_id, gross_amount_minor, currency_code,
          revenue_share_percent, net_amount_minor)
       values ($1,$2,40000,'UGX',70,28000) returning id`, [teacher, order])).rows[0].id;

    const payout = (await q(
      `insert into public.instructor_payouts (instructor_user_id, amount_minor, currency_code, created_by)
       values ($1,56000,'UGX',$2) returning id`, [teacher, admin])).rows[0].id;

    await rejects(() => q(
      `insert into public.instructor_payout_items (payout_id, earnings_entry_id, amount_minor)
       values ($1,$2,20000)`, [payout, e1]),
      'a payout item did not match the net earning');

    await q(`insert into public.instructor_payout_items (payout_id, earnings_entry_id, amount_minor)
             values ($1,$2,28000)`, [payout, e1]);
    await q(`insert into public.instructor_payout_items (payout_id, earnings_entry_id, amount_minor)
             values ($1,$2,28000)`, [payout, e2]);

    await rejects(() => q(
      `insert into public.instructor_payout_items (payout_id, earnings_entry_id, amount_minor)
       values ($1,$2,28000)`, [payout, e1]),
      'the same earning was paid out twice');
  });

  // ---------------------------------------------------------------------
  console.log('\nRow level security');

  await test('a billing member sees their orders but not the ledger', async () => {
    const { acct, userId } = await newPayer('rls-fin@example.com');
    const { order } = await newOrder(acct);
    await q('select * from public.record_payment_success($1,$2,$3,$4,null,$5)',
      [order, admin, 'manual', 'RLS1', 'Cash, receipt 7']);

    const orders = await asUser(userId, () =>
      count('select count(*)::int n from public.orders where id=$1', [order]));
    assert(orders === 1, `a billing member saw ${orders} of their own orders`);

    const ledger = await asUser(userId, () =>
      count('select count(*)::int n from public.financial_transactions'));
    assert(ledger === 0, `a billing member saw ${ledger} ledger rows`);

    const events = await asUser(userId, () =>
      count('select count(*)::int n from public.payment_provider_events'));
    assert(events === 0, `a billing member saw ${events} provider events`);
  });

  await test('one instructor cannot see another\'s earnings', async () => {
    const { acct } = await newPayer('rls-earn@example.com');
    const { order } = await newOrder(acct);
    await q('select * from public.record_payment_success($1,$2,$3,$4,null,$5)',
      [order, admin, 'manual', 'RLS2', 'Cash, receipt 8']);
    await q(`insert into public.instructor_earnings_entries
               (instructor_user_id, order_id, gross_amount_minor, currency_code,
                revenue_share_percent, net_amount_minor)
             values ($1,$2,30000,'UGX',70,21000)`, [teacher, order]);

    const other = await newInstructor('other-instructor@example.com', admin);
    const seen = await asUser(other, () =>
      count('select count(*)::int n from public.instructor_earnings_entries'));
    assert(seen === 0, `a second instructor saw ${seen} earnings entries`);

    const own = await asUser(teacher, () =>
      count('select count(*)::int n from public.instructor_earnings_entries'));
    assert(own >= 1, 'an instructor could not see their own earnings');
  });

  await test('a stranger sees no financial data at all', async () => {
    const orders = await asUser(stranger, () => count('select count(*)::int n from public.orders'));
    const attempts = await asUser(stranger, () => count('select count(*)::int n from public.payment_attempts'));
    assert(orders === 0, `a stranger saw ${orders} orders`);
    assert(attempts === 0, `a stranger saw ${attempts} payment attempts`);
  });

  await test('exchange rates are public; writing them is not', async () => {
    await q(`insert into public.currency_exchange_rates
               (base_currency, quote_currency, rate, source, observed_at)
             values ('UGX','USD',0.00026,'central_bank', now())`);
    const n = await asAnon(() => count('select count(*)::int n from public.currency_exchange_rates'));
    assert(n >= 1, `anonymous saw ${n} exchange rates`);

    await rejects(() => asUser(stranger, () => q(
      `insert into public.currency_exchange_rates
         (base_currency, quote_currency, rate, source, observed_at)
       values ('UGX','USD',99,'made_up', now())`)),
      'a non-privileged user wrote an exchange rate');
  });
}
