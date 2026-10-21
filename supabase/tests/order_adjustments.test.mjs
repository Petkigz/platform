// Unit 21 — an order's total is held against the parts that make it up.
//
// Before this: `orders_totals_agree` kept an order internally consistent and
// nothing kept it honest about its own rows. `subtotal_minor` was not held to
// the sum of the lines, `order_adjustments` had an insert policy that asked
// only "is this a billing member?" and no reader at all, and there was no
// column for a fee — so a provider charge was either folded into the tax column
// (a lie on an invoice) or into the total (which the CHECK refuses).
//
// These tests drive the writer, the void, and the trigger that fires when an
// order is about to become history.

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    asUser, committed,
    newUser, newProfile, grantRole,
    newInstructor, newReviewer, satisfyReview, bootstrapAdmin,
    newCourse, newVersion, newSection, newLesson,
  } = ctx;

  const admin    = await bootstrapAdmin('oa-admin@example.com');
  const teacher  = await newInstructor('oa-teacher@example.com', admin);
  const reviewer = await newReviewer('oa-reviewer@example.com', admin);

  const finance = await newUser('oa-finance@example.com');
  await newProfile(finance, 'Finance Admin');
  await committed(() => grantRole(finance, 'finance_admin', admin));

  const support = await newUser('oa-support@example.com');
  await newProfile(support, 'Support Agent');
  await committed(() => grantRole(support, 'support_agent', admin));

  /** Act as a user and COMMIT, so a later block can act on what was created. */
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
  const count = async (sql, params) =>
    (await q(`select count(*)::int n from (${sql}) t`, params)).rows[0].n;

  const transition = (versionId, status, actor) =>
    q('select id from public.set_course_version_status($1,$2,$3,$4)',
      [versionId, status, actor, 'order adjustments test']);

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
    const userId = await newUser(`oa-buyer-${buyerSeq}@example.com`);
    await newProfile(userId, name);
    const learnerId = (await q(
      `insert into public.learner_profiles (display_name, learner_type, age_band, linked_user_id)
       values ($1,'adult','18+',$2) returning id`, [name, userId])).rows[0].id;
    return { userId, learnerId, name };
  }

  async function sellableCourse(over = {}) {
    const course  = await newCourse(teacher, { status: 'active', title: over.title ?? 'Adjusted Course' });
    const version = await newVersion(course, teacher);
    const section = await newSection(version);
    await newLesson(section);

    const productId = (await q(
      `insert into public.products (product_type, name, status, created_by)
       values ('course',$1,'active',$2) returning id`,
      [over.productName ?? 'Adjusted Course product', teacher])).rows[0].id;
    await q(`insert into public.product_course_versions (product_id, course_id, course_version_id)
             values ($1,$2,$3)`, [productId, course, version]);
    const priceId = (await q(
      `insert into public.prices
         (product_id, amount_minor, currency_code, billing_interval, status)
       values ($1,$2,$3,'one_time','active') returning id`,
      [productId, over.amountMinor ?? 30000, over.currency ?? 'UGX'])).rows[0].id;

    await transition(version, 'submitted', teacher);
    await transition(version, 'approved', reviewer);
    await satisfyReview(version, reviewer, admin);
    await transition(version, 'published', admin);

    return { course, version, productId, priceId };
  }

  /** A real pending order, made the only way one can be made. */
  async function pendingOrder(buyer, over = {}) {
    const offer = await sellableCourse(over);
    const made = await withCheckoutOn(() =>
      asActor(buyer.userId, 'select public.create_course_order($1,$2) as r',
        [offer.course, offer.priceId]));
    return { ...offer, ...made.rows[0].r, buyer };
  }

  const addAdjustment = (actor, orderId, type, amount, over = {}) =>
    asActor(actor,
      'select public.add_order_adjustment($1,$2,$3,$4,$5,$6) as r',
      [orderId, type, amount, over.direction ?? null, over.reason ?? 'test adjustment',
       over.itemId ?? null]);

  const voidAdjustment = (actor, adjustmentId, reason = 'entered in error') =>
    asActor(actor, 'select public.void_order_adjustment($1,$2) as r',
      [adjustmentId, reason]);

  const totalsOf = (orderId) =>
    scalar(`select currency_code, subtotal_minor, discount_minor, tax_minor,
                   fee_minor, total_minor, status
              from public.orders where id = $1`, [orderId]);

  const adjustmentRow = (id) =>
    scalar(`select adjustment_type, direction, amount_minor, currency_code,
                   description, order_item_id, voided_at, voided_by, voided_reason
              from public.order_adjustments where id = $1`, [id]);

  // ---------------------------------------------------------------------
  // The shape of it
  // ---------------------------------------------------------------------

  await test('an order has a fee column and the totals identity includes it', async () => {
    const buyer = await newBuyer('Fee Column');
    const order = await pendingOrder(buyer, { amountMinor: 20000 });

    // subtotal - discount + tax + fee = total. The old identity, without fee,
    // is what has to be refused now.
    await q(`update public.orders set fee_minor = 500, total_minor = 20500
              where id = $1`, [order.orderId]);
    const withFee = await totalsOf(order.orderId);
    assert(Number(withFee.fee_minor) === 500, `fee_minor is ${withFee.fee_minor}`);
    assert(Number(withFee.total_minor) === 20500, `total is ${withFee.total_minor}`);

    await rejects(
      () => q(`update public.orders set fee_minor = 700 where id = $1`, [order.orderId]),
      /orders_totals_agree/);

    // Back to what the writer made, so later assertions start clean.
    await q(`update public.orders set fee_minor = 0, total_minor = 20000
              where id = $1`, [order.orderId]);

    const fresh = await scalar(
      `select column_default from information_schema.columns
        where table_schema = 'public' and table_name = 'orders' and column_name = 'fee_minor'`);
    assert(fresh && /0/.test(fresh.column_default),
      `fee_minor defaults to ${fresh?.column_default}, so an order made before it existed would not read as zero`);
  });

  await test('a voided adjustment names who voided it and why', async () => {
    const checks = (await q(
      `select conname from pg_constraint
        where conrelid = 'public.order_adjustments'::regclass and contype = 'c'
        order by conname`)).rows.map((r) => r.conname);
    for (const wanted of ['oa_amount_non_negative', 'oa_void_agrees']) {
      assert(checks.includes(wanted), `${wanted} is missing from order_adjustments`);
    }

    const buyer = await newBuyer('Void Shape');
    const order = await pendingOrder(buyer);
    const made = await addAdjustment(finance, order.orderId, 'manual_discount', 1000);
    const id = made.rows[0].r.adjustmentId;

    await rejects(
      () => q(`update public.order_adjustments set voided_at = now() where id = $1`, [id]),
      /oa_void_agrees/);
    await rejects(
      () => q(`update public.order_adjustments
                 set voided_at = now(), voided_by = $2, voided_reason = '   '
               where id = $1`, [id, finance]),
      /oa_void_agrees/);
    await rejects(
      () => q(`update public.order_adjustments set amount_minor = -1000 where id = $1`, [id]),
      /oa_amount_non_negative/);
  });

  await test('the client-side adjustment policy is gone and the read is not', async () => {
    const rows = (await q(
      `select polname from pg_policy where polrelid = 'public.order_adjustments'::regclass`
    )).rows.map((r) => r.polname);
    assert(!rows.includes('order_adjustments_insert'),
      'a billing member can still write an adjustment row directly');
    assert(rows.includes('order_adjustments_read'),
      'the read policy went with the insert policy, so a payer cannot see their own invoice');
  });

  await test('only the two writers are callable, and the arithmetic is not', async () => {
    const rows = (await q(
      `select p.proname,
              bool_or(has_function_privilege('anon'::name, p.oid, 'execute'::text)) as anon_may,
              bool_or(has_function_privilege('authenticated'::name, p.oid, 'execute'::text)) as auth_may,
              count(*)::int as overloads
         from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public'
          and p.proname in ('add_order_adjustment','void_order_adjustment','recompute_order_totals')
        group by p.proname`)).rows;
    assert(rows.length === 3, `expected three functions, found ${rows.length}`);
    for (const row of rows) {
      assert(row.anon_may === false, `${row.proname} is callable anonymously`);
      assert(row.overloads === 1, `${row.proname} has ${row.overloads} overloads`);
      if (row.proname === 'recompute_order_totals') {
        // A recompute nobody asked for is a total that changed with no row to
        // explain it, so the arithmetic is only reachable from the writers.
        assert(row.auth_may === false, 'a client can recompute an order total directly');
      } else {
        assert(row.auth_may === true, `${row.proname} is not callable by a signed-in user`);
      }
    }
  });

  // ---------------------------------------------------------------------
  // Who may adjust an order
  // ---------------------------------------------------------------------

  await test('a payer cannot adjust their own order', async () => {
    const buyer = await newBuyer('Self Server');
    const order = await pendingOrder(buyer);

    await rejects(
      () => addAdjustment(buyer.userId, order.orderId, 'manual_discount', 30000),
      /only a finance admin or platform admin/i);

    const back = await totalsOf(order.orderId);
    assert(Number(back.total_minor) === 30000,
      `the total moved to ${back.total_minor} for a payer who asked nicely`);
  });

  await test('a support agent cannot adjust an order either', async () => {
    // is_privileged() includes support_agent, so a gate written as "staff only"
    // would have handed the least-privileged role in the platform the ability to
    // change what an order costs. Pinned, because that is the easy mistake.
    const buyer = await newBuyer('Supported');
    const order = await pendingOrder(buyer);

    await rejects(
      () => addAdjustment(support, order.orderId, 'manual_discount', 5000),
      /only a finance admin or platform admin/i);
    await rejects(
      () => voidAdjustment(support, '00000000-0000-0000-0000-000000000000'),
      /only a finance admin or platform admin/i);

    const privileged = await scalar(
      'select public.is_privileged($1) as p', [support]);
    assert(privileged.p === true,
      'the support agent is not privileged, so this test is not testing the trap');
  });

  await test('an anonymous caller is refused', async () => {
    await q('begin');
    await q(`select set_config('request.jwt.claims', '', true)`);
    await q('set local role authenticated');
    await rejects(
      () => q(`select public.add_order_adjustment(gen_random_uuid(),'fee',100,null,'x',null)`),
      /sign in to adjust an order/i);
    await q('rollback');
  });

  // ---------------------------------------------------------------------
  // What an adjustment does to the total
  // ---------------------------------------------------------------------

  await test('a manual discount reduces the total and is a credit', async () => {
    const buyer = await newBuyer('Discounted');
    const order = await pendingOrder(buyer, { amountMinor: 30000 });

    const made = await addAdjustment(finance, order.orderId, 'manual_discount', 5000,
      { reason: 'Loyalty discount, agreed by email' });
    const r = made.rows[0].r;

    assert(r.direction === 'credit', `direction is ${r.direction}`);
    assert(r.amountMinor === '5000', `amountMinor is ${JSON.stringify(r.amountMinor)}`);
    assert(r.discountMinor === '5000', `discountMinor is ${r.discountMinor}`);
    assert(r.totalMinor === '25000', `totalMinor is ${r.totalMinor}`);
    assert(r.subtotalMinor === '30000', `subtotalMinor is ${r.subtotalMinor}`);
    assert(r.currencyCode === 'UGX', `currency is ${r.currencyCode}`);

    const back = await totalsOf(order.orderId);
    assert(Number(back.discount_minor) === 5000 && Number(back.total_minor) === 25000,
      `the table says discount ${back.discount_minor}, total ${back.total_minor}`);
    assert(Number(back.subtotal_minor) - Number(back.discount_minor)
           + Number(back.tax_minor) + Number(back.fee_minor) === Number(back.total_minor),
      'the columns no longer satisfy the identity they are checked against');

    const row = await adjustmentRow(r.adjustmentId);
    assert(row.currency_code.trim() === 'UGX',
      `the adjustment is in ${row.currency_code}, not the order's currency`);
    assert(row.description === 'Loyalty discount, agreed by email', 'the reason was not stored');

    const audit = await scalar(
      `select actor from public.governance_audit_events
        where action = 'commerce.order_adjustment_added' and target_id = $1`, [r.adjustmentId]);
    assert(audit && audit.actor === finance, 'the adjustment was not audited against its author');
  });

  await test('tax, fees and shipping each land in their own column', async () => {
    const buyer = await newBuyer('Itemised');
    const order = await pendingOrder(buyer, { amountMinor: 40000 });

    await addAdjustment(finance, order.orderId, 'tax', 3000, { reason: 'VAT at 7.5%' });
    await addAdjustment(finance, order.orderId, 'fee', 900, { reason: 'Provider fee' });
    await addAdjustment(finance, order.orderId, 'shipping', 1500,
      { reason: 'Posted certificate' });

    const back = await totalsOf(order.orderId);
    assert(Number(back.tax_minor) === 3000, `tax is ${back.tax_minor}`);
    // Fee and shipping share the fee column: both are charges added to the
    // order that are not tax. An invoice shows them separately from the
    // adjustment rows; the order only has to total correctly.
    assert(Number(back.fee_minor) === 2400, `fee is ${back.fee_minor}`);
    assert(Number(back.discount_minor) === 0, `discount is ${back.discount_minor}`);
    assert(Number(back.total_minor) === 45400, `total is ${back.total_minor}`);

    const rows = (await q(
      `select adjustment_type, direction from public.order_adjustments
        where order_id = $1 order by created_at`, [order.orderId])).rows;
    assert(rows.length === 3, `${rows.length} adjustments were stored`);
    assert(rows.every((x) => x.direction === 'debit'), 'a charge was stored as a credit');
  });

  await test('rounding is the only type that asks which way it goes', async () => {
    const buyer = await newBuyer('Rounded');
    const order = await pendingOrder(buyer, { amountMinor: 12347 });

    await rejects(
      () => addAdjustment(finance, order.orderId, 'rounding', 47, { reason: 'Rounded down' }),
      /needs a direction/i);

    const down = await addAdjustment(finance, order.orderId, 'rounding', 47,
      { direction: 'credit', reason: 'Rounded down to the nearest 100' });
    assert(down.rows[0].r.discountMinor === '47',
      `a rounding credit landed as ${down.rows[0].r.discountMinor}`);
    assert(down.rows[0].r.totalMinor === '12300', `total is ${down.rows[0].r.totalMinor}`);

    const up = await addAdjustment(finance, order.orderId, 'rounding', 100,
      { direction: 'debit', reason: 'Rounded up to the nearest 100' });
    assert(up.rows[0].r.feeMinor === '100', `a rounding debit landed as ${up.rows[0].r.feeMinor}`);
    assert(up.rows[0].r.totalMinor === '12400', `total is ${up.rows[0].r.totalMinor}`);
  });

  await test('a type and a direction that contradict each other are refused', async () => {
    const buyer = await newBuyer('Contradictory');
    const order = await pendingOrder(buyer);

    for (const [type, direction] of [
      ['manual_discount', 'debit'],
      ['tax', 'credit'],
      ['fee', 'credit'],
      ['shipping', 'credit'],
    ]) {
      await rejects(
        () => addAdjustment(finance, order.orderId, type, 1000,
          { direction, reason: 'should not work' }),
        /always a/i);
    }

    const adjustments = await count(
      'select id from public.order_adjustments where order_id = $1', [order.orderId]);
    assert(adjustments === 0, `${adjustments} contradictory adjustments were stored`);
  });

  await test('a promotion adjustment is refused until the policy is decided', async () => {
    const buyer = await newBuyer('Promoted');
    const order = await pendingOrder(buyer);

    // oa_promotion_agrees requires a promotion_redemption_id, and nothing can
    // write one. Accepting a hand-typed id would manufacture the row the
    // constraint exists to guarantee.
    await rejects(
      () => addAdjustment(finance, order.orderId, 'promotion', 5000,
        { reason: 'Ramadan campaign' }),
      /promotions policy is undecided/i);
  });

  await test('an unknown type, a bad amount and a missing reason are refused', async () => {
    const buyer = await newBuyer('Malformed');
    const order = await pendingOrder(buyer);

    await rejects(
      () => addAdjustment(finance, order.orderId, 'goodwill', 1000),
      /unknown adjustment type/i);
    await rejects(
      () => addAdjustment(finance, order.orderId, 'fee', 0, { reason: 'nothing' }),
      /positive whole amount/i);
    await rejects(
      () => addAdjustment(finance, order.orderId, 'fee', -500, { reason: 'negative' }),
      /positive whole amount/i);
    await rejects(
      () => addAdjustment(finance, order.orderId, 'fee', null, { reason: 'null' }),
      /positive whole amount/i);
    await rejects(
      () => asActor(finance, 'select public.add_order_adjustment($1,$2,$3,null,$4,null)',
        [order.orderId, 'fee', 500, '   ']),
      /written reason/i);
    await rejects(
      () => addAdjustment(finance, order.orderId, 'fee', 500, { reason: 'x'.repeat(501) }),
      /500 characters or fewer/i);

    const adjustments = await count(
      'select id from public.order_adjustments where order_id = $1', [order.orderId]);
    assert(adjustments === 0, `${adjustments} malformed adjustments were stored`);
  });

  await test('the currency comes from the order, and is not a parameter', async () => {
    const args = (await scalar(
      `select pg_get_function_arguments(
         'public.add_order_adjustment(uuid,text,bigint,text,text,uuid)'::regprocedure) as a`
    )).a;
    assert(!/currency/.test(args),
      `the writer accepts a currency (${args}), so an adjustment could be recorded ` +
      'in a currency that cannot be added to the order total');

    const buyer = await newBuyer('Dollar Order');
    const order = await pendingOrder(buyer, { amountMinor: 10000, currency: 'USD' });
    const made = await addAdjustment(finance, order.orderId, 'fee', 250,
      { reason: 'Card fee' });

    const row = await adjustmentRow(made.rows[0].r.adjustmentId);
    assert(row.currency_code.trim() === 'USD',
      `the adjustment is in ${row.currency_code} on a USD order`);
    assert(made.rows[0].r.currencyCode === 'USD', `the response says ${made.rows[0].r.currencyCode}`);
  });

  await test('an item reference has to belong to the order, and changes no amount', async () => {
    const buyer = await newBuyer('Itemised Note');
    const mine = await pendingOrder(buyer, { amountMinor: 25000 });
    const theirs = await pendingOrder(buyer, { amountMinor: 15000 });

    const otherItem = (await scalar(
      'select id from public.order_items where order_id = $1', [theirs.orderId])).id;

    await rejects(
      () => addAdjustment(finance, mine.orderId, 'manual_discount', 2000,
        { itemId: otherItem, reason: 'wrong line' }),
      /not on this order/i);

    const ownItem = (await scalar(
      'select id from public.order_items where order_id = $1', [mine.orderId])).id;
    const before = await totalsOf(mine.orderId);
    const made = await addAdjustment(finance, mine.orderId, 'manual_discount', 2000,
      { itemId: ownItem, reason: 'Partial discount on the one line' });

    const row = await adjustmentRow(made.rows[0].r.adjustmentId);
    assert(row.order_item_id === ownItem, 'the reference was not stored');
    assert(Number(before.subtotal_minor) === 25000,
      `the subtotal moved to ${before.subtotal_minor} because an adjustment named a line`);

    // Per-line repricing is order_items.discount_minor, set before the order is
    // placed. An adjustment naming a line is a note about what it is for.
    const line = await scalar(
      'select line_total_minor, discount_minor from public.order_items where id = $1', [ownItem]);
    assert(Number(line.line_total_minor) === 25000 && Number(line.discount_minor) === 0,
      'naming a line on an adjustment repriced it');
  });

  await test('a discount larger than the order is refused', async () => {
    const buyer = await newBuyer('Over Discounted');
    const order = await pendingOrder(buyer, { amountMinor: 10000 });

    await rejects(
      () => addAdjustment(finance, order.orderId, 'manual_discount', 10001,
        { reason: 'free for a friend' }),
      /below zero/i);

    const adjustments = await count(
      'select id from public.order_adjustments where order_id = $1', [order.orderId]);
    assert(adjustments === 0,
      `${adjustments} adjustments survived a refusal — the recompute has to roll the insert back with it`);
  });

  // ---------------------------------------------------------------------
  // Voiding
  // ---------------------------------------------------------------------

  await test('voiding puts the total back and keeps the row readable', async () => {
    const buyer = await newBuyer('Voided');
    const order = await pendingOrder(buyer, { amountMinor: 30000 });

    const made = await addAdjustment(finance, order.orderId, 'manual_discount', 8000,
      { reason: 'Applied to the wrong order' });
    const id = made.rows[0].r.adjustmentId;
    assert(made.rows[0].r.totalMinor === '22000', `total is ${made.rows[0].r.totalMinor}`);

    const voided = await voidAdjustment(finance, id, 'Wrong order, applied to OA-2291 instead');
    assert(voided.rows[0].r.totalMinor === '30000',
      `voiding left the total at ${voided.rows[0].r.totalMinor}`);
    assert(voided.rows[0].r.discountMinor === '0',
      `voiding left the discount at ${voided.rows[0].r.discountMinor}`);

    const row = await adjustmentRow(id);
    assert(row.voided_at, 'the voided adjustment has no voided_at');
    assert(row.voided_by === finance, 'the void is not attributed');
    assert(row.voided_reason === 'Wrong order, applied to OA-2291 instead',
      'the void reason was not stored');
    assert(row.adjustment_type === 'manual_discount' && Number(row.amount_minor) === 8000,
      'voiding rewrote the adjustment itself rather than withdrawing it');

    const back = await totalsOf(order.orderId);
    assert(Number(back.total_minor) === 30000, `the order total is ${back.total_minor}`);

    const audit = await scalar(
      `select actor from public.governance_audit_events
        where action = 'commerce.order_adjustment_voided' and target_id = $1`, [id]);
    assert(audit && audit.actor === finance, 'the void was not audited');

    await rejects(() => voidAdjustment(finance, id, 'twice'), /already voided/i);
    await rejects(() => voidAdjustment(finance, id, '   '), /already voided|written reason/i);
    await rejects(
      () => voidAdjustment(finance, '00000000-0000-0000-0000-000000000000', 'nope'),
      /does not exist/i);
  });

  await test('a voided adjustment counts for nothing but stays on the invoice', async () => {
    const buyer = await newBuyer('Readable Void');
    const order = await pendingOrder(buyer, { amountMinor: 20000 });

    const first = await addAdjustment(finance, order.orderId, 'fee', 1200,
      { reason: 'Provider fee' });
    await addAdjustment(finance, order.orderId, 'fee', 800, { reason: 'Handling' });
    await voidAdjustment(finance, first.rows[0].r.adjustmentId, 'Fee was waived');

    const back = await totalsOf(order.orderId);
    assert(Number(back.fee_minor) === 800, `fees are ${back.fee_minor}`);
    assert(Number(back.total_minor) === 20800, `total is ${back.total_minor}`);

    const visible = await asUser(buyer.userId, () =>
      count(`select id from public.order_adjustments where order_id = $1`, [order.orderId]));
    assert(visible === 2,
      `the payer saw ${visible} of the two adjustments on their own order — ` +
      'a voided row that disappears leaves a total nobody can reconstruct');
  });

  // ---------------------------------------------------------------------
  // After payment the total is history
  // ---------------------------------------------------------------------

  await test('a paid order cannot be adjusted or voided', async () => {
    const buyer = await newBuyer('Paid Then Adjusted');
    const order = await pendingOrder(buyer, { amountMinor: 30000 });

    const made = await addAdjustment(finance, order.orderId, 'manual_discount', 5000,
      { reason: 'Before payment' });
    const id = made.rows[0].r.adjustmentId;

    await q('select id from public.record_payment_success($1,$2,$3,$4,null,$5)',
      [order.orderId, admin, 'manual', 'OA-PAID-1', 'Cash, receipt OA-1']);

    await rejects(
      () => addAdjustment(finance, order.orderId, 'fee', 500, { reason: 'After payment' }),
      /its total is history/i);
    await rejects(() => voidAdjustment(finance, id, 'Changed my mind'),
      /its total is history/i);

    const back = await totalsOf(order.orderId);
    assert(back.status === 'paid', `the order is '${back.status}'`);
    assert(Number(back.total_minor) === 25000,
      `the paid total moved to ${back.total_minor} — a ledger row was already written for 25000`);
    const stillLive = await adjustmentRow(id);
    assert(!stillLive.voided_at, 'the pre-payment discount was withdrawn after payment');
  });

  // ---------------------------------------------------------------------
  // The trigger: an order has to describe its rows before it is paid
  // ---------------------------------------------------------------------

  await test('an order whose subtotal is not its lines cannot be paid', async () => {
    const buyer = await newBuyer('Mismatched');
    const order = await pendingOrder(buyer, { amountMinor: 30000 });

    await q(`update public.orders set subtotal_minor = 5000, total_minor = 5000
              where id = $1`, [order.orderId]);

    await rejects(
      () => q(`update public.orders
                 set status = 'paid', paid_at = now(),
                     payment_confirmed_by = $2, payment_evidence = 'test'
               where id = $1`, [order.orderId, admin]),
      /its subtotal is 5000 but its line items add up to 30000/);

    const back = await totalsOf(order.orderId);
    assert(back.status === 'pending_payment', `the order is '${back.status}' after a refusal`);
  });

  await test('an order whose discount is not its adjustments cannot be paid', async () => {
    const buyer = await newBuyer('Hand Edited');
    const order = await pendingOrder(buyer, { amountMinor: 30000 });

    // A hand-edited column, which is exactly what the writer does not do: it
    // derives every one of these from the rows.
    await q(`update public.orders set discount_minor = 10000, total_minor = 20000
              where id = $1`, [order.orderId]);

    await rejects(
      () => q(`update public.orders
                 set status = 'paid', paid_at = now(),
                     payment_confirmed_by = $2, payment_evidence = 'test'
               where id = $1`, [order.orderId, admin]),
      /its discount is 10000 but its live adjustments credit 0/);
  });

  await test('an order with no lines cannot be paid', async () => {
    const buyer = await newBuyer('Itemless');
    const order = await pendingOrder(buyer, { amountMinor: 30000 });

    await q('delete from public.order_items where order_id = $1', [order.orderId]);

    await rejects(
      () => q(`update public.orders
                 set status = 'paid', paid_at = now(),
                     payment_confirmed_by = $2, payment_evidence = 'test'
               where id = $1`, [order.orderId, admin]),
      /line items add up to 0/);
  });

  await test('recomputing puts a hand-edited order back together so it can be paid', async () => {
    const buyer = await newBuyer('Recomputed');
    const order = await pendingOrder(buyer, { amountMinor: 30000 });

    await q(`update public.orders set discount_minor = 10000, total_minor = 20000
              where id = $1`, [order.orderId]);

    // The arithmetic is not callable by a client, but a superuser — support
    // tooling, a migration, a repair — can run it, and it derives every column
    // from the rows rather than accepting any of them.
    const fixed = await scalar('select public.recompute_order_totals($1) as r', [order.orderId]);
    assert(fixed.r.totalMinor === '30000', `the recompute produced ${fixed.r.totalMinor}`);

    await q('select id from public.record_payment_success($1,$2,$3,$4,null,$5)',
      [order.orderId, admin, 'manual', 'OA-RECOMPUTED', 'Cash, receipt OA-2']);
    const back = await totalsOf(order.orderId);
    assert(back.status === 'paid', `the order is '${back.status}' after the recompute`);
  });

  await test('an adjustment changes what the payer pays, and what the teacher earns is pinned', async () => {
    const buyer = await newBuyer('End To End');
    const order = await pendingOrder(buyer, { amountMinor: 50000 });

    await addAdjustment(finance, order.orderId, 'manual_discount', 10000,
      { reason: 'Scholarship, approved' });
    await addAdjustment(finance, order.orderId, 'fee', 1250,
      { reason: 'Mobile money fee' });

    const before = await totalsOf(order.orderId);
    assert(Number(before.total_minor) === 41250, `the total to pay is ${before.total_minor}`);

    await q('select id from public.record_payment_success($1,$2,$3,$4,null,$5)',
      [order.orderId, admin, 'manual', 'OA-E2E', 'Cash, receipt OA-3']);

    const capture = await scalar(
      `select amount_minor, currency_code from public.financial_transactions
        where order_id = $1 and transaction_type = 'capture'`, [order.orderId]);
    assert(capture, 'no capture was written for the paid order');
    assert(Number(capture.amount_minor) === 41250,
      `the ledger captured ${capture.amount_minor}, not the adjusted total`);

    const earnings = await scalar(
      `select gross_amount_minor, net_amount_minor, revenue_share_percent
         from public.instructor_earnings_entries where order_id = $1`, [order.orderId]);
    assert(earnings, 'no earnings were accrued');

    // PINNED, NOT ENDORSED. accrue_instructor_earnings() computes gross as
    // sum(order_items.line_total_minor) for the teacher's courses — the
    // SUBTOTAL. So an order-level discount is absorbed by the platform and the
    // teacher's share is still computed on the pre-discount price, while a fee
    // is kept by the platform and is not in the gross either. Both halves of
    // that are defensible for a fee and a tax. For a discount it is an open
    // business decision — who funds a promotion — and at the extreme it pays
    // the teacher more than the order collected. Asserted here so the behaviour
    // is a fact somebody chose rather than something nobody noticed; the
    // decision is recorded in NEXT.md.
    assert(Number(earnings.gross_amount_minor) === Number(before.subtotal_minor),
      `the teacher's gross is ${earnings.gross_amount_minor} on a subtotal of ${before.subtotal_minor}`);
    assert(Number(earnings.gross_amount_minor) === 50000,
      `the teacher's gross is ${earnings.gross_amount_minor}, not the sticker price`);
    assert(Number(earnings.gross_amount_minor) !== Number(before.total_minor),
      'the gross equals the total, so this test is no longer pinning the distinction');

    // net is the teacher's share of gross, rounded half away from zero, and
    // `iee_split_agrees` already holds the row to that expression. Recomputed
    // here in exact integer arithmetic (the share is numeric(5,2), so scaling
    // by 100 keeps it whole).
    const share = Number(earnings.revenue_share_percent);
    const shareScaled = BigInt(Math.round(share * 100));
    // round(gross * share / 100), half away from zero, in exact integers:
    // floor((2 * gross * shareScaled + 10000) / 20000).
    const expectedNet = Number(
      (BigInt(earnings.gross_amount_minor) * shareScaled * 2n + 10000n) / 20000n);
    assert(Number(earnings.net_amount_minor) === expectedNet,
      `net is ${earnings.net_amount_minor}, expected ${expectedNet} at a ${share}% share`);

    const grants = await count(
      `select id from public.entitlement_grants
        where learner_profile_id = $1 and course_version_id = $2 and status = 'active'`,
      [buyer.learnerId, order.courseVersionId]);
    assert(grants === 1, `${grants} entitlements for the discounted, paid order`);
  });
}
