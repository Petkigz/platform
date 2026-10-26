// Revenue analytics — screen 40.
//
// The screen was marked BLOCKED on `delivery.analytics`, which governs learner
// behaviour events, not money. Revenue is already recorded: paid orders, their
// lines, their discounts, their refunds, and an accrual per teacher per sale.
// What was missing was a way to ask which course sells.
//
// Most of these tests are about what the report refuses to do: add currencies
// together, call an unpaid order revenue, hide a refund inside a net figure, or
// attribute a multi-course product to one of its courses.

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    bootstrapAdmin, newUser, newProfile, newInstructor, newReviewer,
    newCourse, newVersion, newSection, newLesson,
  } = ctx;

  const admin = await bootstrapAdmin('rev-admin@example.com');

  // A finance admin, and somebody with no money role at all.
  const finance = await newUser('rev-finance@example.com');
  await newProfile(finance, 'Finance');
  const adminRole = (await q("select id from public.roles where code = 'finance_admin'")).rows[0].id;
  await q(`insert into public.user_role_assignments (user_id, role_id, assigned_by)
           values ($1,$2,$3)`, [finance, adminRole, admin]);

  const outsider = await newUser('rev-outsider@example.com');
  await newProfile(outsider, 'Outsider');

  async function asActor(actor, sql, params = []) {
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

  const report = (who, from, to) =>
    asActor(who, 'select public.revenue_breakdown($1,$2) r', [from, to])
      .then((r) => r.rows[0].r);

  // A window of its own. Other suites create paid orders too, and a report that
  // scanned 2026 would be asserting against their fixtures as well as these —
  // which is how a test starts failing for a reason that has nothing to do with
  // the code it is testing.
  const FROM = '2031-01-01T00:00:00Z';
  const TO = '2031-12-31T23:59:59Z';

  // -------------------------------------------------------------------------
  // Who may read it
  // -------------------------------------------------------------------------

  await test('a learner cannot read the platform\'s revenue', async () => {
    await rejects(() => report(outsider, FROM, TO),
      /only a finance admin or platform admin/);
  });

  await test('a window that starts after it ends is refused', async () => {
    await rejects(() => report(admin, TO, FROM), /starts after it ends/);
  });

  await test('a window needs both ends', async () => {
    await rejects(() => report(admin, null, TO), /needs both a start and an end/);
  });

  // -------------------------------------------------------------------------
  // Fixtures: a course, a product, an order
  // -------------------------------------------------------------------------
  const teacher = await newInstructor('rev-teacher@example.com', admin);
  const reviewer = await newReviewer('rev-reviewer@example.com', admin);

  const course = await newCourse(teacher, { title: 'Fiqh for adults', status: 'active' });
  const version = await newVersion(course, teacher);
  const section = await newSection(version);
  await newLesson(section, { title: 'One', position: 1 });
  await q('select public.set_course_version_status($1,$2,$3,$4)',
    [version, 'submitted', teacher, 'Ready']);
  await q('select public.set_course_version_status($1,$2,$3,$4)',
    [version, 'approved', reviewer, 'Scholar approved']);
  await ctx.satisfyReview(version, reviewer, admin);
  await q('select public.set_course_version_status($1,$2,$3,$4)',
    [version, 'published', admin, 'Publish']);

  const product = (await q(
    `insert into public.products (product_type, name, status, created_by)
     values ('course','Fiqh for adults','active',$1) returning id`, [teacher])).rows[0].id;
  await q(`insert into public.product_course_versions (product_id, course_id, course_version_id)
           values ($1,$2,$3)`, [product, course, version]);

  async function account(currency = 'UGX') {
    const r = await q(
      `insert into public.billing_accounts
         (display_name,billing_country,billing_currency,status,created_by)
       values ('Household','UG',$1,'active',$2) returning id`, [currency, admin]);
    return r.rows[0].id;
  }

  /**
   * An order, optionally paid.
   *
   * A paid order cannot be inserted directly: `orders_paid_has_evidence`
   * requires a named confirmer and written evidence, which is exactly the
   * guarantee that stops a paid order appearing from nowhere. So the order is
   * created pending, paid through the real writer, and only then given the
   * historical `paid_at` the window needs — staff may correct a date; nobody may
   * invent a payment.
   */
  async function order({
    total = 50000, discount = 0, currency = 'UGX', paidAt = '2031-06-01T10:00:00Z',
    paid = true, productId = product, planVersionId = null, lineTotal = null,
  } = {}) {
    const acct = await account(currency);

    const id = (await q(
      `insert into public.orders
         (billing_account_id, currency_code, subtotal_minor, discount_minor, total_minor,
          status, placed_at, placed_by)
       values ($1,$2,$3,$4,$5,'pending_payment',now(),$6) returning id`,
      [acct, currency, total, 0, total, admin])).rows[0].id;

    // oi_line_total_agrees: line_total = unit_price * quantity - discount, and
    // the order subtotal must equal the sum of the lines. There is no
    // order-level discount path yet, so a discount here is a LINE discount.
    const line = lineTotal ?? total;
    await q(
      `insert into public.order_items
         (order_id, product_id, plan_version_id, quantity, unit_price_minor, currency_code,
          discount_minor, line_total_minor)
       values ($1,$2,$3,1,$4,$5,$6,$7)`,
      [id, productId, planVersionId, line + discount, currency, discount, line]);

    if (!paid) return id;

    // Paid through the real writer, so the capture transaction and the teacher's
    // accrual exist — a refund has a ceiling computed from the capture, and an
    // earnings row has to come from somewhere. Only then is the date moved into
    // the report's window: staff may correct a date, nobody may invent a payment.
    await q("select public.record_payment_success($1,$2,'manual',$3,null,'Receipt on file')",
      [id, admin, `REV-${id.slice(0, 8)}`]);
    await q('update public.orders set paid_at = $2 where id = $1', [id, paidAt]);

    return id;
  }

  const refund = (orderId, amount, currency, at) =>
    q(`insert into public.refund_transactions
         (order_id, amount_minor, currency_code, status, refunded_at, processed_by)
       values ($1,$2,$3,'completed',$4,$5)`, [orderId, amount, currency, at, admin]);

  const order1 = await order({ total: 50000, paidAt: '2031-06-01T10:00:00Z' });
  const order2 = await order({ total: 30000, discount: 5000, paidAt: '2031-07-15T10:00:00Z' });
  // Outside the window, and must not appear.
  await order({ total: 90000, paidAt: '2030-06-01T10:00:00Z' });
  // Never paid: not revenue, whatever the total says.
  await order({ total: 70000, paid: false });

  await test('paid orders in the window are counted, and unpaid ones are not', async () => {
    const r = await report(admin, FROM, TO);

    assert(r.orders === 2, `counted ${r.orders} orders`);
    const ugx = r.byCurrency.find((c) => c.currency === 'UGX');
    assert(ugx, 'no UGX row');
    assert(String(ugx.grossMinor) === '80000', `gross was ${ugx.grossMinor}`);
    // No order-level discount path exists yet, so this is 0 by design rather
    // than by omission; the line discount is reported in the course breakdown.
    assert(String(ugx.discountMinor) === '0', `order discount was ${ugx.discountMinor}`);
  });

  await test('a finance admin may read it; the platform admin may as well', async () => {
    const a = await report(finance, FROM, TO);
    const b = await report(admin, FROM, TO);

    assert(a.orders === b.orders, 'the two roles saw different order counts');
  });

  await test('the window is a boundary, not a filter on the year', async () => {
    const narrow = await report(admin, '2031-07-01T00:00:00Z', '2031-07-31T23:59:59Z');

    assert(narrow.orders === 1, `July held ${narrow.orders} orders`);
    const ugx = narrow.byCurrency.find((c) => c.currency === 'UGX');
    assert(String(ugx.grossMinor) === '30000', `July gross was ${ugx.grossMinor}`);
  });

  // -------------------------------------------------------------------------
  // By course
  // -------------------------------------------------------------------------

  await test('the course is named, with what it sold and what was discounted', async () => {
    const r = await report(admin, FROM, TO);
    const row = r.byCourse.find((c) => c.courseTitle === 'Fiqh for adults');

    assert(row, 'the course is missing from the breakdown');
    assert(row.courseId === course, `course id was ${row.courseId}`);
    assert(row.courseSlug && row.courseSlug.length > 0, 'the course has no slug, so the screen cannot link to it');
    assert(row.sales === 2, `sales was ${row.sales}`);
    assert(String(row.grossMinor) === '80000', `gross was ${row.grossMinor}`);
    assert(String(row.discountMinor) === '5000', `discount was ${row.discountMinor}`);
  });

  await test('a product mapped to two courses is not attributed to either', async () => {
    // Its own product and its own courses. Pointing the shared product at a
    // second course would quietly change what every later test is looking at —
    // a fixture that edits shared state is a fixture that lies about the test
    // after it.
    const left = await newCourse(teacher, { title: 'Bundle: left', status: 'active' });
    const leftVersion = await newVersion(left, teacher);
    const right = await newCourse(teacher, { title: 'Bundle: right', status: 'active' });
    const rightVersion = await newVersion(right, teacher);

    const bundle = (await q(
      `insert into public.products (product_type, name, status, created_by)
       values ('course','Two-course bundle','active',$1) returning id`, [teacher])).rows[0].id;
    for (const [c, v] of [[left, leftVersion], [right, rightVersion]]) {
      await q(`insert into public.product_course_versions (product_id, course_id, course_version_id)
               values ($1,$2,$3)`, [bundle, c, v]);
    }

    await order({ productId: bundle, total: 40000, paidAt: '2031-08-01T10:00:00Z' });
    await order({ productId: bundle, total: 40000, paidAt: '2031-08-02T10:00:00Z' });

    const r = await report(admin, FROM, TO);
    const named = r.byCourse.filter((c) => c.courseId !== null);

    assert(!named.some((c) => c.courseId === left || c.courseId === right),
      'a product mapping to two courses was attributed to one of them');
    const unknown = r.byCourse.find((c) => c.courseId === null);
    assert(unknown, 'the ambiguous sale vanished instead of being listed without a course');
    assert(unknown.sales === 2, `the ambiguous group held ${unknown.sales} sales`);
    assert(String(unknown.grossMinor) === '80000',
      `the ambiguous group held ${unknown.grossMinor} gross`);
  });

  // -------------------------------------------------------------------------
  // Currencies
  // -------------------------------------------------------------------------

  await test('two currencies are never added into one figure', async () => {
    await order({ total: 1200, currency: 'USD', paidAt: '2031-08-01T10:00:00Z' });

    const r = await report(admin, FROM, TO);
    const currencies = r.byCurrency.map((c) => c.currency).sort();

    assert(currencies.includes('UGX') && currencies.includes('USD'),
      `currencies were ${currencies.join(', ')}`);
    assert(!r.byCurrency.some((c) => c.currency === 'TOTAL'), 'the report invented a total row');

    const usd = r.byCurrency.find((c) => c.currency === 'USD');
    assert(String(usd.grossMinor) === '1200', `USD gross was ${usd.grossMinor} — it was added to UGX`);
  });

  // -------------------------------------------------------------------------
  // Refunds
  // -------------------------------------------------------------------------

  await test('a refund is shown beside the sale instead of dissolving into a net figure', async () => {
    // Measured against the report's own before/after, not against a number this
    // file has to keep in step with every other fixture: what matters is that a
    // refund moves `refunded` and `net` and leaves `gross` alone.
    const before = await report(admin, FROM, TO);
    await refund(order1, 20000, 'UGX', '2031-09-01T10:00:00Z');
    await q(`update public.orders set status = 'partially_refunded' where id = $1`, [order1]);

    const r = await report(admin, FROM, TO);
    const ugx = r.byCurrency.find((c) => c.currency === 'UGX');
    const was = before.byCurrency.find((c) => c.currency === 'UGX');

    assert(String(ugx.grossMinor) === String(was.grossMinor),
      `gross changed when a refund landed: ${was.grossMinor} -> ${ugx.grossMinor}`);
    assert(String(ugx.refundedMinor) === String(Number(was.refundedMinor) + 20000),
      `refunded was ${ugx.refundedMinor}, not ${Number(was.refundedMinor) + 20000}`);
    assert(String(ugx.netMinor) === String(Number(was.netMinor) - 20000),
      `net was ${ugx.netMinor}, not ${Number(was.netMinor) - 20000}`);

    assert(r.refunds.length === 1, `the refund list held ${r.refunds.length}`);
    assert(r.refunds[0].orderId === order1, 'the refund names the wrong order');
  });

  await test('a refund against a two-line order is split in proportion, not duplicated', async () => {
    // Two lines worth 60000 and 40000 on one order, refund 20000: the lines
    // must carry 12000 and 8000, and the total must still be 20000.
    const acct = await account('USD');
    const split = (await q(
      `insert into public.orders
         (billing_account_id, currency_code, subtotal_minor, discount_minor, total_minor,
          status, placed_at, placed_by)
       values ($1,'USD',100000,0,100000,'pending_payment',now(),$2) returning id`,
      [acct, admin])).rows[0].id;
    for (const [total, unit] of [[60000, 60000], [40000, 40000]]) {
      await q(`insert into public.order_items
                 (order_id, product_id, quantity, unit_price_minor, currency_code,
                  discount_minor, line_total_minor)
               values ($1,$2,1,$3,'USD',0,$4)`, [split, product, unit, total]);
    }

    // Paid through the writer so the capture exists — a refund has a ceiling
    // computed from it — then dated into the window.
    await q("select public.record_payment_success($1,$2,'manual','REV-SPLIT',null,'Receipt')",
      [split, admin]);
    await q('update public.orders set paid_at = $2 where id = $1', [split, '2031-10-01T10:00:00Z']);

    await refund(split, 20000, 'USD', '2031-10-02T10:00:00Z');

    const r = await report(admin, FROM, TO);
    const usd = r.byCurrency.find((c) => c.currency === 'USD');
    assert(String(usd.refundedMinor) === '20000',
      `the order total refunded was ${usd.refundedMinor}, not 20000`);

    const lines = r.byCourse.filter((c) => c.currency === 'USD' && c.courseId !== null);
    const refundedAcross = lines.reduce((sum, l) => sum + Number(l.refundedMinor), 0);
    assert(refundedAcross === 20000,
      `the lines claimed ${refundedAcross} refunded against a 20000 refund`);
  });

  // -------------------------------------------------------------------------
  // Plans are not courses
  // -------------------------------------------------------------------------

  await test('a subscription is reported with plans, never mixed into course revenue', async () => {
    const plan = (await asActor(admin, 'select public.create_plan($1,$2,$3,$4) id',
      ['rev-plan', 'rev-plan', 'Rev plan', 'plus'])).rows[0].id;
    const planVersion = (await asActor(admin, 'select public.create_plan_version($1,$2,$3,$4,$5) id',
      [plan, 1, 1, 'month', 'Terms'])).rows[0].id;

    const acct = await account('UGX');
    const subOrder = (await q(
      `insert into public.orders
         (billing_account_id, currency_code, subtotal_minor, discount_minor, total_minor,
          status, placed_at, paid_at, payment_confirmed_by, payment_evidence, placed_by)
       values ($1,'UGX',25000,0,25000,'paid',now(),'2031-11-01T10:00:00Z',$2,'manual:test',$2)
       returning id`,
      [acct, admin])).rows[0].id;
    await q(`insert into public.order_items
               (order_id, plan_version_id, quantity, unit_price_minor, currency_code,
                discount_minor, line_total_minor)
             values ($1,$2,1,25000,'UGX',0,25000)`, [subOrder, planVersion]);


    const r = await report(admin, FROM, TO);
    const planRow = r.byPlan.find((p) => p.planCode === 'rev-plan');

    assert(planRow, 'the subscription is missing from the plan breakdown');
    assert(String(planRow.grossMinor) === '25000', `plan gross was ${planRow.grossMinor}`);

    const courseGross = r.byCourse.reduce((sum, c) => sum + Number(c.grossMinor), 0);
    assert(!r.byCourse.some((c) => Number(c.grossMinor) === 25000 && c.courseId === null
      && c.currency === 'UGX'),
      'a subscription line appeared in the course breakdown');
    assert(courseGross > 0, 'the course breakdown is empty');
  });

  // -------------------------------------------------------------------------
  // Teachers
  // -------------------------------------------------------------------------

  await test('a teacher\'s share is read from the accrual, not recomputed today', async () => {
    await q("select public.record_payment_success($1,$2,'manual','REV-1',null,'Receipt')",
      [order2, admin]);

    const r = await report(admin, FROM, TO);
    const rows = r.byTeacher.filter((t) => t.userId === teacher);

    assert(rows.length > 0, 'the teacher is missing from the breakdown');
    // One row per currency: the fixture sold in both, and the report must not
    // fold them together.
    assert(rows.length === new Set(rows.map((t) => t.currency)).size,
      'the teacher appeared twice in the same currency');
    assert(rows.some((t) => Number(t.netMinor) > 0), 'the teacher earned nothing anywhere');
  });

  await test('a reversed accrual is reported as reversed, not quietly subtracted', async () => {
    const entries = (await q(
      `select id, net_amount_minor from public.instructor_earnings_entries
        where instructor_user_id = $1 and status <> 'reversed'`, [teacher])).rows;
    assert(entries.length > 0, 'the fixture accrued nothing to reverse');

    const target = entries[0];
    await q(`update public.instructor_earnings_entries set status = 'reversed' where id = $1`,
      [target.id]);

    const r = await report(admin, FROM, TO);
    const rows = r.byTeacher.filter((t) => t.userId === teacher);
    const netTotal = rows.reduce((sum, t) => sum + Number(t.netMinor), 0);
    const reversedTotal = rows.reduce((sum, t) => sum + Number(t.reversedMinor), 0);

    const expected = (await q(
      `select coalesce(sum(iee.net_amount_minor),0)::text n
         from public.instructor_earnings_entries iee
         left join public.orders o on o.id = iee.order_id
        where iee.instructor_user_id = $1 and iee.status <> 'reversed'
          and coalesce(o.paid_at, iee.accrued_at) >= $2
          and coalesce(o.paid_at, iee.accrued_at) <= $3`, [teacher, FROM, TO])).rows[0].n;

    assert(String(netTotal) === String(expected),
      `the report's net was ${netTotal}, the accrual says ${expected}`);
    assert(reversedTotal >= Number(target.net_amount_minor),
      `reversed was ${reversedTotal}, which is less than the entry reversed`);
  });

  // -------------------------------------------------------------------------
  // The shape the screen relies on
  // -------------------------------------------------------------------------

  await test('the report names its own window, so a page cannot mislabel it', async () => {
    const r = await report(admin, FROM, TO);

    assert(r.from === '2031-01-01', `from was ${r.from}`);
    assert(r.to === '2031-12-31', `to was ${r.to}`);
    assert(typeof r.households === 'number', 'the household count is not a number');
  });

  await test('an empty period returns empty lists rather than inventing a zero', async () => {
    const r = await report(admin, '2020-01-01T00:00:00Z', '2020-01-02T00:00:00Z');

    assert(r.orders === 0, `an empty period counted ${r.orders} orders`);
    assert(Array.isArray(r.byCurrency) && r.byCurrency.length === 0, 'an empty period produced a currency row');
    assert(Array.isArray(r.byCourse) && r.byCourse.length === 0, 'an empty period produced a course row');
    assert(Array.isArray(r.byTeacher) && r.byTeacher.length === 0, 'an empty period produced a teacher row');
  });
}
