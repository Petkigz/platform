// A receipt number.
//
// `/orders` could say "paid" and nothing else. A family asking their bank, their
// employer or their own memory had no document and no reference, and the only
// identifier was a UUID — not something anyone reads down a phone.
//
// What is worth pinning is that the number is assigned by the database, unique, and
// immutable once given. Everything else about the receipt is a page.

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    bootstrapAdmin, newUser, newProfile, newInstructor, newReviewer,
    newCourse, newVersion, newSection, newLesson, satisfyReview,
  } = ctx;

  const admin = await bootstrapAdmin('receipt-admin@example.com');
  const teacher = await newInstructor('receipt-teacher@example.com', admin);
  const reviewer = await newReviewer('receipt-reviewer@example.com', admin);

  async function asActor(actor, sql, params = []) {
    await q('begin');
    await q("select set_config('request.jwt.claims',$1,true)", [
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

  const scalar = async (sql, params = []) => (await q(sql, params)).rows[0];
  const count = async (sql, params = []) =>
    (await q(`select count(*)::int n from (${sql}) t`, params)).rows[0].n;

  /** Read as a signed-in person, committed, so a refusal cannot poison the next test. */
  async function readAs(actor, sql, params = []) {
    await q('begin');
    await q("select set_config('request.jwt.claims',$1,true)", [
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

  async function withCheckoutOn(fn) {
    const before = (await scalar(
      `select value_text from public.platform_settings where key = 'commerce.checkout'`)).value_text;
    await q(`update public.platform_settings set value_text = 'true' where key = 'commerce.checkout'`);
    try {
      return await fn();
    } finally {
      await q(`update public.platform_settings set value_text = $1 where key = 'commerce.checkout'`,
        [before]);
    }
  }

  async function transition(versionId, status, actor) {
    await q('select id from public.set_course_version_status($1,$2,$3,$4)',
      [versionId, status, actor, 'order receipt test']);
  }

  let seq = 0;
  async function sellable(amount = 30000) {
    seq += 1;
    const course = await newCourse(teacher, { status: 'active', title: `Receipt Course ${seq}` });
    const version = await newVersion(course, teacher);
    const section = await newSection(version);
    await newLesson(section);

    const productId = (await scalar(
      `insert into public.products (product_type, name, status, created_by)
       values ('course',$1,'active',$2) returning id`,
      [`Receipt product ${seq}`, teacher])).id;
    await q(`insert into public.product_course_versions (product_id, course_id, course_version_id)
             values ($1,$2,$3)`, [productId, course, version]);
    await q(`insert into public.prices
               (product_id, amount_minor, currency_code, billing_interval, status, market, effective_from)
             values ($1,$2,'UGX','one_time','active','UG',now())`, [productId, amount]);

    await transition(version, 'submitted', teacher);
    await transition(version, 'approved', admin);
    await satisfyReview(version, reviewer, admin);
    await transition(version, 'published', admin);
    return course;
  }

  async function buyer(name) {
    seq += 1;
    const userId = await newUser(`receipt-buyer-${seq}@example.com`);
    await newProfile(userId, name);
    const learnerId = (await scalar(
      `insert into public.learner_profiles (display_name, learner_type, age_band, linked_user_id)
       values ($1,'adult','18+',$2) returning id`, [name, userId])).id;
    await q(`insert into public.billing_accounts
               (display_name, billing_currency, billing_country, status, created_by)
             values ($1,'UGX','UG','active',$2)`, [name, userId]);
    return { userId, learnerId, name };
  }

  const buy = (who, courseId) =>
    withCheckoutOn(() => asActor(who.userId,
      'select public.create_course_order($1,$2,$3,null) r',
      [courseId, who.learnerId, 'UG']).then((r) => r.rows[0].r));

  // ---------------------------------------------------------------------------
  // The number
  // ---------------------------------------------------------------------------
  await test('a new order gets a readable, unique number', async () => {
    const first = await sellable();
    const second = await sellable();
    const one = await buyer('First Payer');
    const two = await buyer('Second Payer');

    const a = await buy(one, first);
    const b = await buy(two, second);

    const rows = (await q(
      `select order_number from public.orders where id = any($1::uuid[])`,
      [[a.orderId, b.orderId]])).rows.map((r) => r.order_number);

    assert(rows.length === 2, `expected two orders, found ${rows.length}`);
    for (const number of rows) {
      assert(/^AS-\d{8}$/.test(number), `'${number}' is not a receipt number`);
    }
    assert(rows[0] !== rows[1], 'two orders were given the same receipt number');

    // Sequential and ascending, so a receipt printed today does not carry a lower
    // number than one printed last week.
    const numbers = rows.map((n) => Number(n.slice(3)));
    assert(Math.max(...numbers) - Math.min(...numbers) === 1,
      `numbers did not advance by one: ${rows.join(', ')}`);
  });

  await test('a number, once given, cannot be rewritten', async () => {
    const course = await sellable();
    const who = await buyer('Rewriting');
    const made = await buy(who, course);

    const before = (await scalar(
      `select order_number from public.orders where id = $1`, [made.orderId])).order_number;

    // Not even staff, and not even the database owner: the number is what a receipt
    // cites, so a second document could otherwise claim the same order.
    await rejects(() => q(
      `update public.orders set order_number = 'AS-00000001' where id = $1`, [made.orderId]),
    /an order number cannot be changed/);

    const after = (await scalar(
      `select order_number from public.orders where id = $1`, [made.orderId])).order_number;
    assert(after === before, 'the number changed despite the refusal');

    // Everything else on the order stays editable, so the guard is narrowly the
    // number rather than the row.
    await q(`update public.orders set payment_evidence = 'noted by staff' where id = $1`,
      [made.orderId]);
  });

  await test('only somebody who may read the order may read its number', async () => {
    const course = await sellable();
    const mine = await buyer('Mine');
    const stranger = await buyer('Stranger');
    const made = await buy(mine, course);

    const seen = await readAs(mine.userId,
      `select order_number from public.orders where id = $1`, [made.orderId]);
    assert(seen.rows[0]?.order_number && /^AS-\d{8}$/.test(seen.rows[0].order_number),
      'the payer could not read their own receipt number');

    const theirs = await readAs(stranger.userId,
      `select order_number from public.orders where id = $1`, [made.orderId]);
    assert(theirs.rows.length === 0, 'a stranger could read the order number');
  });

  await test('the receipt and the order state the same total', async () => {
    const course = await sellable(40000);
    const who = await buyer('Agreeing');
    const made = await buy(who, course);

    // The receipt prints what `recompute_order_totals()` derived, not a figure of its
    // own: subtotal minus the credit adjustments must be the total, exactly.
    const row = await scalar(
      `select o.subtotal_minor, o.discount_minor, o.total_minor, o.currency_code,
              (select coalesce(sum(oa.amount_minor) filter (where oa.direction = 'credit'), 0)
                 from public.order_adjustments oa
                where oa.order_id = o.id and oa.voided_at is null) as credits
         from public.orders o where o.id = $1`, [made.orderId]);

    assert(String(row.subtotal_minor) === '40000', `subtotal ${row.subtotal_minor}`);
    assert(Number(row.subtotal_minor) - Number(row.credits) === Number(row.total_minor),
      `the receipt would not add up: ${row.subtotal_minor} - ${row.credits} != ${row.total_minor}`);
    assert(row.currency_code === 'UGX');

    const items = await count(
      `select 1 from public.order_items where order_id = $1`, [made.orderId]);
    assert(items === 1, `expected one line on the receipt, found ${items}`);
  });
}
