// Unit 22 — finance can see the orders it is allowed to adjust.
//
// `orders_read` is `is_billing_member()`, so a finance admin cannot read a
// single order through PostgREST. That is correct for a payer's invoice and it
// left the two adjustment writers from 20261225000100 with no way to find the
// order they apply to. `admin_orders_overview()` is the reader: definer, gated
// on the same role pair as the writers, listing only the orders whose totals can
// still change.
//
// Every assertion here is scoped to this suite's own fixtures. The queue is
// platform-wide by design, and other suites leave unpaid orders behind, so a
// whole-list count would only ever fail in the full run.

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    asUser, asAnon, committed,
    newUser, newProfile, grantRole,
    newInstructor, newReviewer, satisfyReview, bootstrapAdmin,
    newCourse, newVersion, newSection, newLesson,
  } = ctx;

  const admin    = await bootstrapAdmin('oq-admin@example.com');
  const teacher  = await newInstructor('oq-teacher@example.com', admin);
  const reviewer = await newReviewer('oq-reviewer@example.com', admin);

  const finance = await newUser('oq-finance@example.com');
  await newProfile(finance, 'Queue Finance');
  await committed(() => grantRole(finance, 'finance_admin', admin));

  const support = await newUser('oq-support@example.com');
  await newProfile(support, 'Queue Support');
  await committed(() => grantRole(support, 'support_agent', admin));

  async function asActor(actor, sql, params) {
    await q('begin');
    await q(`select set_config('request.jwt.claims', $1, true)`,
      [JSON.stringify({ sub: actor, role: 'authenticated' })]);
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

  const scalar = async (sql, params) => (await q(sql, params)).rows[0];

  const transition = (versionId, status, actor) =>
    q('select id from public.set_course_version_status($1,$2,$3,$4)',
      [versionId, status, actor, 'order queue test']);

  async function withCheckoutOn(fn) {
    const before = (await scalar(
      `select value_text from public.platform_settings where key = 'commerce.checkout'`
    ))?.value_text ?? 'false';
    await q(`update public.platform_settings set value_text = 'true'
              where key = 'commerce.checkout'`);
    try {
      return await fn();
    } finally {
      await q(`update public.platform_settings set value_text = $1
                where key = 'commerce.checkout'`, [before]);
    }
  }

  let buyerSeq = 0;
  async function newBuyer(name) {
    buyerSeq += 1;
    const userId = await newUser(`oq-buyer-${buyerSeq}@example.com`);
    await newProfile(userId, name);
    await q(
      `insert into public.learner_profiles (display_name, learner_type, age_band, linked_user_id)
       values ($1,'adult','18+',$2)`, [name, userId]);
    return { userId, name };
  }

  async function sellableCourse(amountMinor = 30000) {
    const course  = await newCourse(teacher, { status: 'active', title: 'Queued Course' });
    const version = await newVersion(course, teacher);
    const section = await newSection(version);
    await newLesson(section);
    const productId = (await q(
      `insert into public.products (product_type, name, status, created_by)
       values ('course','Queued Course product','active',$1) returning id`, [teacher])).rows[0].id;
    await q(`insert into public.product_course_versions (product_id, course_id, course_version_id)
             values ($1,$2,$3)`, [productId, course, version]);
    const priceId = (await q(
      `insert into public.prices (product_id, amount_minor, currency_code, billing_interval, status)
       values ($1,$2,'UGX','one_time','active') returning id`, [productId, amountMinor])).rows[0].id;
    await transition(version, 'submitted', teacher);
    await transition(version, 'approved', reviewer);
    await satisfyReview(version, reviewer, admin);
    await transition(version, 'published', admin);
    return { course, version, productId, priceId };
  }

  /** An unpaid order made by the only writer that can make one. */
  async function queuedOrder(buyer, amountMinor = 30000) {
    const offer = await sellableCourse(amountMinor);
    const made = await withCheckoutOn(() =>
      asActor(buyer.userId, 'select public.create_course_order($1,$2) as r',
        [offer.course, offer.priceId]));
    return { ...offer, orderId: made.rows[0].r.orderId };
  }

  /** The queue as finance sees it, narrowed to the ids this suite made. */
  async function queueFor(actor, ids, limit = 200) {
    const r = await asActor(actor, 'select public.admin_orders_overview($1) as r', [limit]);
    const all = r.rows[0].r.orders;
    return all.filter((o) => ids.includes(o.orderId));
  }

  // ---------------------------------------------------------------------
  // Who may read every order
  // ---------------------------------------------------------------------

  await test('a payer cannot read the queue', async () => {
    const buyer = await newBuyer('Queue Payer');
    const order = await queuedOrder(buyer);

    await asUser(buyer.userId, () => rejects(
      () => q('select public.admin_orders_overview(50)'),
      /only a finance admin or platform admin may review orders/i));

    // And the policy underneath is still a payer's own invoice, not a widened
    // read: the reader is a function precisely so this did not have to change.
    const seen = await asUser(buyer.userId, async () =>
      (await q('select count(*)::int n from public.orders')).rows[0].n);
    assert(seen >= 1, 'a payer lost sight of their own order');
    assert(order.orderId, 'no order was made');
  });

  await test('a support agent cannot read the queue', async () => {
    // is_privileged() includes support_agent. A reader gated on "staff" would
    // hand every order on the platform to the role whose job is one order that
    // already has a case open.
    const privileged = await scalar('select public.is_privileged($1) as p', [support]);
    assert(privileged.p === true,
      'the support agent is not privileged, so this test is not testing the trap');

    await rejects(() => asActor(support, 'select public.admin_orders_overview(50)', []),
      /only a finance admin or platform admin may review orders/i);
  });

  await test('an anonymous caller is refused', async () => {
    await asAnon(() => rejects(
      () => q('select public.admin_orders_overview(50)'),
      /sign in to review orders/i));
  });

  await test('the reader is callable by a signed-in user and exists once', async () => {
    const row = await scalar(
      `select count(*)::int as overloads,
              bool_or(has_function_privilege('anon'::name, p.oid, 'execute'::text)) as anon_may,
              bool_or(has_function_privilege('authenticated'::name, p.oid, 'execute'::text)) as auth_may
         from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = 'admin_orders_overview'`);
    assert(row.overloads === 1, `${row.overloads} overloads of admin_orders_overview`);
    assert(row.anon_may === false, 'the reader is callable anonymously');
    assert(row.auth_may === true, 'a signed-in finance admin cannot call the reader');
  });

  // ---------------------------------------------------------------------
  // What finance sees
  // ---------------------------------------------------------------------

  await test('an unpaid order is listed with the parts of its total', async () => {
    const buyer = await newBuyer('Queued Buyer');
    const order = await queuedOrder(buyer, 45000);
    // As finance, not as the fixture superuser: the writer takes the actor from
    // the session claims, and a claim-less superuser is nobody.
    await asActor(finance, 'select public.add_order_adjustment($1,$2,$3,null,$4,null)',
      [order.orderId, 'manual_discount', 5000, 'Scholarship, approved']);
    await asActor(finance, 'select public.add_order_adjustment($1,$2,$3,null,$4,null)',
      [order.orderId, 'fee', 1250, 'Mobile money fee']);

    const rows = await queueFor(finance, [order.orderId]);
    assert(rows.length === 1, `${rows.length} rows for one order`);
    const row = rows[0];

    assert(row.status === 'pending_payment', `status is ${row.status}`);
    assert(row.billingAccountName === 'Queued Buyer',
      `the account is named '${row.billingAccountName}', so finance cannot tell whose order it is`);
    assert(row.currencyCode === 'UGX', `currency is ${row.currencyCode}`);

    // Money as decimal integer strings: a JSON number is where a bigint stops
    // being exact, and these are totals.
    for (const [field, want] of [['subtotalMinor', '45000'], ['discountMinor', '5000'],
                                 ['taxMinor', '0'], ['feeMinor', '1250'],
                                 ['totalMinor', '41250']]) {
      assert(typeof row[field] === 'string', `${field} came back as ${typeof row[field]}`);
      assert(row[field] === want, `${field} is ${row[field]}, expected ${want}`);
    }

    assert(row.items.length === 1, `${row.items.length} lines`);
    assert(row.items[0].title === 'Queued Course product',
      `the line is titled '${row.items[0].title}'`);
    assert(row.items[0].lineTotalMinor === '45000', `the line total is ${row.items[0].lineTotalMinor}`);

    assert(row.adjustments.length === 2, `${row.adjustments.length} adjustments`);
    const discount = row.adjustments.find((a) => a.adjustmentType === 'manual_discount');
    assert(discount.direction === 'credit', 'the discount is not a credit');
    assert(discount.amountMinor === '5000', `the discount is ${discount.amountMinor}`);
    assert(discount.description === 'Scholarship, approved', 'the reason was not returned');
    assert(discount.voidedAt === null, 'a live adjustment reads as withdrawn');
  });

  await test('a withdrawn adjustment is still on the row', async () => {
    const buyer = await newBuyer('Withdrawn Queue');
    const order = await queuedOrder(buyer, 20000);
    const made = await asActor(finance,
      'select public.add_order_adjustment($1,$2,$3,null,$4,null) as r',
      [order.orderId, 'manual_discount', 4000, 'Applied in error']);
    await asActor(finance, 'select public.void_order_adjustment($1,$2)',
      [made.rows[0].r.adjustmentId, 'Wrong order']);

    const rows = await queueFor(finance, [order.orderId]);
    const row = rows[0];
    assert(row.adjustments.length === 1,
      `${row.adjustments.length} adjustments — a withdrawn row that disappears leaves a total nobody can reconstruct`);
    assert(row.adjustments[0].voidedAt, 'the withdrawn adjustment has no voidedAt');
    assert(row.adjustments[0].voidedReason === 'Wrong order', 'the withdrawal reason was not returned');
    assert(row.adjustments[0].voidedBy === finance, 'the withdrawal is not attributed');
    assert(row.discountMinor === '0' && row.totalMinor === '20000',
      `a withdrawn adjustment is still counted: discount ${row.discountMinor}, total ${row.totalMinor}`);
  });

  await test('orders that can no longer be adjusted are not listed', async () => {
    const buyer = await newBuyer('Settled Queue');
    const paid = await queuedOrder(buyer, 30000);
    const cancelled = await queuedOrder(buyer, 30000);

    await q('select id from public.record_payment_success($1,$2,$3,$4,null,$5)',
      [paid.orderId, admin, 'manual', 'OQ-1', 'Cash, receipt OQ-1']);
    await q(`update public.orders set status = 'cancelled', cancelled_at = now()
              where id = $1`, [cancelled.orderId]);

    const rows = await queueFor(finance, [paid.orderId, cancelled.orderId]);
    assert(rows.length === 0,
      `${rows.length} unadjustable orders are in the queue, where every button under them refuses`);

    const stillThere = await scalar('select status from public.orders where id = $1', [paid.orderId]);
    assert(stillThere.status === 'paid', `the order is '${stillThere.status}'`);
  });

  await test('a deleted order is not listed', async () => {
    const buyer = await newBuyer('Deleted Queue');
    const order = await queuedOrder(buyer);
    await q('update public.orders set deleted_at = now() where id = $1', [order.orderId]);

    const rows = await queueFor(finance, [order.orderId]);
    assert(rows.length === 0, 'a withdrawn order is still queued for adjustment');
  });

  await test('finance sees orders on accounts it is not a member of', async () => {
    // The whole point of a definer reader: `orders_read` would show a finance
    // admin nothing at all, because they are not a member of anybody's account.
    const one = await newBuyer('Queue One');
    const two = await newBuyer('Queue Two');
    const first = await queuedOrder(one, 10000);
    const second = await queuedOrder(two, 20000);

    const rows = await queueFor(finance, [first.orderId, second.orderId]);
    assert(rows.length === 2, `finance saw ${rows.length} of two orders on other people's accounts`);

    const asPayer = await asUser(one.userId, async () =>
      (await q('select count(*)::int n from public.orders where id = $1', [second.orderId])).rows[0].n);
    assert(asPayer === 0, 'a payer can read somebody else’s order');
  });

  await test('the reader limits and caps what it returns', async () => {
    const buyer = await newBuyer('Limited Queue');
    const first = await queuedOrder(buyer, 10000);
    const second = await queuedOrder(buyer, 20000);

    const one = await asActor(finance, 'select public.admin_orders_overview(1) as r', []);
    assert(one.rows[0].r.orders.length === 1, 'the limit was ignored');
    assert(one.rows[0].r.count === 1, `count is ${one.rows[0].r.count} for one row`);
    assert(one.rows[0].r.limit === 1, `limit is ${one.rows[0].r.limit}`);

    // Newest first, so the queue is the orders that just arrived rather than
    // whichever the planner happened to return.
    await q(`update public.orders set created_at = now() - interval '2 hours' where id = $1`,
      [first.orderId]);
    await q('update public.orders set created_at = now() where id = $1', [second.orderId]);
    const both = await queueFor(finance, [first.orderId, second.orderId]);
    assert(both.length === 2, `${both.length} rows for two orders`);
    assert(both[0].orderId === second.orderId,
      'the queue is not newest first, so the order somebody just made is at the bottom');

    const capped = await asActor(finance, 'select public.admin_orders_overview(5000) as r', []);
    assert(capped.rows[0].r.limit === 200,
      `a request for 5000 was accepted as ${capped.rows[0].r.limit}`);
    const defaulted = await asActor(finance, 'select public.admin_orders_overview(null) as r', []);
    assert(defaulted.rows[0].r.limit === 50,
      `no limit asked for gave ${defaulted.rows[0].r.limit}`);
    const zero = await asActor(finance, 'select public.admin_orders_overview(0) as r', []);
    assert(zero.rows[0].r.limit >= 1, `a limit of 0 was honoured as ${zero.rows[0].r.limit}`);
  });

  await test('the response is one object with an orders array', async () => {
    const r = await asActor(finance, 'select public.admin_orders_overview(5) as r', []);
    const payload = r.rows[0].r;
    assert(Array.isArray(payload.orders), 'orders is not an array');
    assert(typeof payload.count === 'number', `count is ${typeof payload.count}`);
    assert(payload.count === payload.orders.length,
      `count says ${payload.count} and the array has ${payload.orders.length}`);
    for (const row of payload.orders) {
      assert(typeof row.orderId === 'string' && typeof row.currencyCode === 'string',
        'a row came back without an id or a currency, so it cannot be rendered as money');
      assert(Array.isArray(row.items) && Array.isArray(row.adjustments),
        'a row came back without its items and adjustments');
    }
  });
}
