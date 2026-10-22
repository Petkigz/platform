// Unit 23 — a discount is shared at the revenue-share rate (decision of 2026-10-22).
//
// `accrue_instructor_earnings()` used to compute a teacher's gross as the sum of
// the order's lines for their courses — the subtotal. A credit recorded by
// `add_order_adjustment()` therefore came entirely out of the platform's margin,
// and a discount that took an order to nothing still accrued a share of the full
// price.
//
// Now the credits are apportioned across the teachers who actually earn from the
// order, in proportion to their lines, and a teacher's gross is their lines less
// their share. At a 50% revenue share that means each side bears half the
// discount: subtotal 50 000, discount 10 000 → gross 40 000, net 20 000, and the
// platform keeps 21 250 of the 41 250 collected.
//
// The apportionment has to be exact. Integer division leaves a remainder, and a
// remainder in a split is money that quietly disappears, so the leftover units
// go to the largest remainders and the tests below assert the sum.

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    asUser, committed,
    newUser, newProfile, grantRole,
    newInstructor, newReviewer, satisfyReview, bootstrapAdmin,
    newCourse, newVersion, newSection, newLesson,
  } = ctx;

  // The revenue share is one global row, and this suite's arithmetic assumes the
  // chosen 50 unless a test says otherwise. Set it rather than inherit it: a
  // suite that runs earlier must not decide what these numbers mean.
  await q(`update public.platform_settings set value_text = '50'
            where key = 'teaching.revenue_share_percent'`);

  const admin    = await bootstrapAdmin('ds-admin@example.com');
  const teacher  = await newInstructor('ds-teacher@example.com', admin);
  const second   = await newInstructor('ds-second@example.com', admin);
  const reviewer = await newReviewer('ds-reviewer@example.com', admin);

  const finance = await newUser('ds-finance@example.com');
  await newProfile(finance, 'Share Finance');
  await committed(() => grantRole(finance, 'finance_admin', admin));

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
      [versionId, status, actor, 'discount sharing test']);

  /** Run with the checkout flag on, and put it back however this exits. */
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

  /**
   * The revenue share is one global setting, and other suites assert the value
   * the platform ships with, so it is changed here and put back in a finally.
   */
  async function withShare(percent, fn) {
    const before = (await scalar(
      `select value_text from public.platform_settings
        where key = 'teaching.revenue_share_percent'`))?.value_text ?? '50';
    await q(`update public.platform_settings set value_text = $1
              where key = 'teaching.revenue_share_percent'`, [String(percent)]);
    try {
      return await fn();
    } finally {
      await q(`update public.platform_settings set value_text = $1
                where key = 'teaching.revenue_share_percent'`, [before]);
    }
  }

  let buyerSeq = 0;
  async function newBuyer(name) {
    buyerSeq += 1;
    const userId = await newUser(`ds-buyer-${buyerSeq}@example.com`);
    await newProfile(userId, name);
    const learnerId = (await q(
      `insert into public.learner_profiles (display_name, learner_type, age_band, linked_user_id)
       values ($1,'adult','18+',$2) returning id`, [name, userId])).rows[0].id;
    return { userId, learnerId, name };
  }

  /** A published one-time course sold by `author`, with a product and a price. */
  async function sellableCourse(author, amountMinor, label = 'Share Course') {
    const course  = await newCourse(author, { status: 'active', title: label });
    const version = await newVersion(course, author);
    const section = await newSection(version);
    await newLesson(section);
    const productId = (await q(
      `insert into public.products (product_type, name, status, created_by)
       values ('course',$1,'active',$2) returning id`, [`${label} product`, author])).rows[0].id;
    await q(`insert into public.product_course_versions (product_id, course_id, course_version_id)
             values ($1,$2,$3)`, [productId, course, version]);
    const priceId = (await q(
      `insert into public.prices (product_id, amount_minor, currency_code, billing_interval, status)
       values ($1,$2,'UGX','one_time','active') returning id`, [productId, amountMinor])).rows[0].id;
    await transition(version, 'submitted', author);
    await transition(version, 'approved', reviewer);
    await satisfyReview(version, reviewer, admin);
    await transition(version, 'published', admin);
    return { course, version, productId, priceId };
  }

  async function pendingOrder(buyer, amountMinor = 50000, author = teacher) {
    const offer = await sellableCourse(author, amountMinor);
    const made = await withCheckoutOn(() =>
      asActor(buyer.userId, 'select public.create_course_order($1,$2) as r',
        [offer.course, buyer.learnerId]));
    return { ...offer, orderId: made.rows[0].r.orderId };
  }

  /**
   * An order with several lines — two teachers on one order. No writer can
   * produce one today (`create_course_order()` sells one course), but the
   * accrual is written for the case and the apportionment has to be right when a
   * bundle or a multi-course checkout eventually produces one, so it is built by
   * hand here rather than left untested.
   */
  async function multiLineOrder(buyer, lines, creditMinor) {
    const offers = [];
    for (const line of lines) {
      offers.push(await sellableCourse(line.author ?? teacher, line.amountMinor,
        line.label ?? 'Bundled'));
    }
    const accountId = (await q(
      `insert into public.billing_accounts (display_name, billing_currency, billing_country, created_by)
       values ($1,'UGX','UG',$2) returning id`, [buyer.name, buyer.userId])).rows[0].id;
    const subtotal = lines.reduce((sum, l) => sum + l.amountMinor, 0);
    const orderId = (await q(
      `insert into public.orders
         (billing_account_id, currency_code, subtotal_minor, discount_minor,
          tax_minor, fee_minor, total_minor, status, placed_by, placed_at)
       values ($1,'UGX',$2,0,0,0,$2,'pending_payment',$3,now()) returning id`,
      [accountId, subtotal, buyer.userId])).rows[0].id;

    for (let i = 0; i < lines.length; i += 1) {
      const offer = offers[i];
      await q(
        `insert into public.order_items
           (order_id, product_id, price_id, quantity, unit_price_minor, currency_code,
            line_total_minor, item_snapshot)
         values ($1,$2,$3,1,$4,'UGX',$4,$5)`,
        [orderId, offer.productId, offer.priceId, lines[i].amountMinor,
         JSON.stringify({ title: lines[i].label ?? 'Bundled' })]);
    }

    if (creditMinor > 0) {
      await asActor(finance, 'select public.add_order_adjustment($1,$2,$3,null,$4,null)',
        [orderId, 'manual_discount', creditMinor, 'Bundle discount, approved']);
    }

    return { orderId, subtotal, offers };
  }

  const pay = (orderId, reference) =>
    q('select id from public.record_payment_success($1,$2,$3,$4,null,$5)',
      [orderId, admin, 'manual', reference, `Cash, receipt ${reference}`]);

  const earningsFor = async (orderId, instructor = teacher) =>
    scalar(`select gross_amount_minor, shared_discount_minor, net_amount_minor,
                   revenue_share_percent, currency_code
              from public.instructor_earnings_entries
             where order_id = $1 and instructor_user_id = $2`, [orderId, instructor]);

  const captureOf = (orderId) =>
    scalar(`select amount_minor from public.financial_transactions
             where order_id = $1 and transaction_type = 'capture'`, [orderId]);

  // ---------------------------------------------------------------------
  // The regression: nothing changes when nothing was discounted
  // ---------------------------------------------------------------------

  await test('an order with no discount accrues exactly as before', async () => {
    const buyer = await newBuyer('No Discount');
    const order = await pendingOrder(buyer, 30000);
    await pay(order.orderId, 'DS-1');

    const row = await earningsFor(order.orderId);
    assert(row, 'no earnings were accrued');
    assert(Number(row.gross_amount_minor) === 30000,
      `gross is ${row.gross_amount_minor}, not the line total`);
    assert(Number(row.shared_discount_minor) === 0,
      `a discount of ${row.shared_discount_minor} was borne on an order with none`);
    assert(Number(row.net_amount_minor) === 15000,
      `net is ${row.net_amount_minor} at a ${row.revenue_share_percent}% share`);
  });

  // ---------------------------------------------------------------------
  // The decision
  // ---------------------------------------------------------------------

  await test('a discount is split at the revenue-share rate', async () => {
    const buyer = await newBuyer('Split');
    const order = await pendingOrder(buyer, 50000);

    await asActor(finance, 'select public.add_order_adjustment($1,$2,$3,null,$4,null)',
      [order.orderId, 'manual_discount', 10000, 'Scholarship, approved']);
    await pay(order.orderId, 'DS-2');

    const row = await earningsFor(order.orderId);
    assert(Number(row.gross_amount_minor) === 40000,
      `gross is ${row.gross_amount_minor}: the discount was not taken off the teacher's lines`);
    assert(Number(row.shared_discount_minor) === 10000,
      `the row says the teacher bore ${row.shared_discount_minor} of a 10000 discount`);
    assert(Number(row.net_amount_minor) === 20000,
      `net is ${row.net_amount_minor}: at 50% the teacher should lose half the discount, not all of it`);

    // The teacher's loss is half the discount, which is the whole point of
    // "shared at the revenue-share rate": 25 000 → 20 000.
    assert(25000 - Number(row.net_amount_minor) === 5000,
      `the teacher lost ${25000 - Number(row.net_amount_minor)} of a 10000 discount at a 50% share`);

    const capture = await captureOf(order.orderId);
    assert(Number(capture.amount_minor) === 40000,
      `the ledger captured ${capture.amount_minor}; the discount did not reach it`);

    // And the platform's own half: of the 40 000 collected it keeps 20 000.
    assert(Number(capture.amount_minor) - Number(row.net_amount_minor) === 20000,
      'the platform kept the teacher’s half of the discount');
  });

  await test('a fee is the platform’s, and is not shared or accrued', async () => {
    const buyer = await newBuyer('Fee Split');
    const order = await pendingOrder(buyer, 50000);

    await asActor(finance, 'select public.add_order_adjustment($1,$2,$3,null,$4,null)',
      [order.orderId, 'manual_discount', 10000, 'Scholarship']);
    await asActor(finance, 'select public.add_order_adjustment($1,$2,$3,null,$4,null)',
      [order.orderId, 'fee', 1250, 'Mobile money fee']);
    await pay(order.orderId, 'DS-3');

    const row = await earningsFor(order.orderId);
    const capture = await captureOf(order.orderId);

    assert(Number(capture.amount_minor) === 41250,
      `the payer was charged ${capture.amount_minor}, not the adjusted total`);
    // The fee does not enter gross (it is not the teacher's revenue) and does
    // not share the discount: gross is still the lines less the credit.
    assert(Number(row.gross_amount_minor) === 40000,
      `gross is ${row.gross_amount_minor} — a fee was folded into the teacher's revenue`);
    assert(Number(row.shared_discount_minor) === 10000,
      `the teacher bore ${row.shared_discount_minor} of a discount plus a fee`);
    assert(Number(row.net_amount_minor) === 20000, `net is ${row.net_amount_minor}`);

    // What the platform keeps, explicitly: the capture less the teacher, and the
    // fee is part of it.
    assert(Number(capture.amount_minor) - Number(row.net_amount_minor) === 21250,
      `the platform kept ${Number(capture.amount_minor) - Number(row.net_amount_minor)}`);
  });

  await test('the row explains itself: gross plus what was borne is the line total', async () => {
    const buyer = await newBuyer('Explainable');
    const order = await pendingOrder(buyer, 33000);
    await asActor(finance, 'select public.add_order_adjustment($1,$2,$3,null,$4,null)',
      [order.orderId, 'manual_discount', 3000, 'Agreed by email']);
    await pay(order.orderId, 'DS-4');

    const row = await earningsFor(order.orderId);
    const lineTotal = Number((await scalar(
      'select sum(line_total_minor)::bigint as t from public.order_items where order_id = $1',
      [order.orderId])).t);

    assert(Number(row.gross_amount_minor) + Number(row.shared_discount_minor) === lineTotal,
      `${row.gross_amount_minor} + ${row.shared_discount_minor} is not the line total ${lineTotal}, ` +
      'so a reader cannot reconstruct what the teacher was paid for');
  });

  await test('a voided discount is not shared with anybody', async () => {
    const buyer = await newBuyer('Voided Discount');
    const order = await pendingOrder(buyer, 40000);

    const made = await asActor(finance,
      'select public.add_order_adjustment($1,$2,$3,null,$4,null) as r',
      [order.orderId, 'manual_discount', 8000, 'Applied in error']);
    await asActor(finance, 'select public.void_order_adjustment($1,$2)',
      [made.rows[0].r.adjustmentId, 'Wrong order']);
    await pay(order.orderId, 'DS-5');

    const row = await earningsFor(order.orderId);
    assert(Number(row.gross_amount_minor) === 40000,
      `gross is ${row.gross_amount_minor} — a withdrawal someone made still cost the teacher`);
    assert(Number(row.shared_discount_minor) === 0,
      `the teacher bore ${row.shared_discount_minor} for a discount that was voided`);
  });

  // ---------------------------------------------------------------------
  // The ends: the rule is the share, not a fixed split
  // ---------------------------------------------------------------------

  await test('at a 0% share the teacher bears none of it', async () => {
    const buyer = await newBuyer('Zero Share');
    const order = await pendingOrder(buyer, 25000);
    await asActor(finance, 'select public.add_order_adjustment($1,$2,$3,null,$4,null)',
      [order.orderId, 'manual_discount', 5000, 'Platform-funded']);

    await withShare(0, () => pay(order.orderId, 'DS-6'));

    const row = await earningsFor(order.orderId);
    assert(Number(row.revenue_share_percent) === 0,
      `the row was accrued at ${row.revenue_share_percent}%`);
    assert(Number(row.gross_amount_minor) === 20000,
      `gross is ${row.gross_amount_minor}, not the discounted line total`);
    assert(Number(row.net_amount_minor) === 0, `net is ${row.net_amount_minor} at a 0% share`);
    // At 0% the teacher keeps nothing either way, so "who bears the discount" has
    // no effect on them — but the row must still say what the platform collected.
    const audit = await scalar(
      `select count(*)::int n from public.governance_audit_events
        where action = 'earnings.accrued_at_zero_share' and target_id = $1`, [order.orderId]);
    assert(audit.n === 1, 'a 0% accrual was not flagged in the audit log');
  });

  await test('at a 100% share the teacher bears all of it', async () => {
    const buyer = await newBuyer('Full Share');
    const order = await pendingOrder(buyer, 25000);
    await asActor(finance, 'select public.add_order_adjustment($1,$2,$3,null,$4,null)',
      [order.orderId, 'manual_discount', 5000, 'Teacher-funded']);

    await withShare(100, () => pay(order.orderId, 'DS-7'));

    const row = await earningsFor(order.orderId);
    assert(Number(row.revenue_share_percent) === 100, `accrued at ${row.revenue_share_percent}%`);
    assert(Number(row.gross_amount_minor) === 20000, `gross is ${row.gross_amount_minor}`);
    assert(Number(row.net_amount_minor) === 20000,
      `net is ${row.net_amount_minor} — at 100% the teacher should keep the discounted total`);
    assert(Number(row.shared_discount_minor) === 5000,
      `the teacher bore ${row.shared_discount_minor} of a 5000 discount at a 100% share`);
  });

  await test('an order discounted to nothing cannot be paid, and says so', async () => {
    // Not a limitation of the sharing: `financial_transactions.amount_minor` is
    // `> 0`, so a capture for zero is refused and a 100% discount cannot go
    // through a payment at all. That is the right refusal — an order that costs
    // nothing needs a fulfilment path of its own, not a payment of nothing — but
    // it means a full scholarship is currently unreachable, and that gap is
    // recorded in NEXT.md rather than papered over here.
    const buyer = await newBuyer('Free');
    const order = await pendingOrder(buyer, 15000);
    await asActor(finance, 'select public.add_order_adjustment($1,$2,$3,null,$4,null)',
      [order.orderId, 'manual_discount', 15000, 'Full scholarship']);

    await rejects(() => pay(order.orderId, 'DS-8'), /amount_minor_check|violates check/i);

    const back = await scalar('select status from public.orders where id = $1', [order.orderId]);
    assert(back.status === 'pending_payment',
      `the order is '${back.status}' after a refused zero capture`);
    const rows = await count(
      'select id from public.instructor_earnings_entries where order_id = $1', [order.orderId]);
    assert(rows === 0, 'a zero-value payment accrued earnings');
  });

  // ---------------------------------------------------------------------
  // Several teachers on one order
  // ---------------------------------------------------------------------

  await test('a discount is apportioned by line, and sums exactly', async () => {
    const buyer = await newBuyer('Two Teachers');
    const order = await multiLineOrder(buyer, [
      { author: teacher, amountMinor: 33333, label: 'First' },
      { author: second,  amountMinor: 66667, label: 'Second' },
    ], 1000);
    await pay(order.orderId, 'DS-9');

    const first  = await earningsFor(order.orderId, teacher);
    const other  = await earningsFor(order.orderId, second);
    assert(first && other, 'one of the two teachers was not accrued');

    // 1000 apportioned 33333:66667 is 333.33 and 666.67 — 333 and 666 by integer
    // division, leaving one unit to the larger remainder.
    assert(Number(first.shared_discount_minor) === 333,
      `the smaller line bore ${first.shared_discount_minor}, expected 333`);
    assert(Number(other.shared_discount_minor) === 667,
      `the larger line bore ${other.shared_discount_minor}, expected 667`);
    assert(Number(first.shared_discount_minor) + Number(other.shared_discount_minor) === 1000,
      'the apportionment does not add up to the discount, so a minor unit evaporated');

    assert(Number(first.gross_amount_minor) === 33000,
      `first gross is ${first.gross_amount_minor}, expected 33300 − 333`);
    assert(Number(other.gross_amount_minor) === 66000,
      `second gross is ${other.gross_amount_minor}, expected 66000`);
    assert(Number(first.gross_amount_minor) + Number(other.gross_amount_minor) === 99000,
      'the two grosses do not add up to the discounted subtotal');
  });

  await test('a discount of one minor unit across equal lines still lands', async () => {
    const buyer = await newBuyer('One Unit');
    const order = await multiLineOrder(buyer, [
      { author: teacher, amountMinor: 1000, label: 'Left' },
      { author: second,  amountMinor: 1000, label: 'Right' },
    ], 1);
    await pay(order.orderId, 'DS-10');

    const first = await earningsFor(order.orderId, teacher);
    const other = await earningsFor(order.orderId, second);
    const borne = Number(first.shared_discount_minor) + Number(other.shared_discount_minor);
    assert(borne === 1, `the one-unit discount was borne as ${borne}, so it vanished`);
    // Exactly one of them carries it, and neither gross exceeds its own line.
    assert(Number(first.shared_discount_minor) === 0 || Number(first.shared_discount_minor) === 1,
      `the share is ${first.shared_discount_minor}`);
    assert(Number(first.gross_amount_minor) + Number(other.gross_amount_minor) === 1999,
      'the grosses do not add up to subtotal less the discount');
  });

  await test('a teacher who is a member of the buying account still earns nothing', async () => {
    // The existing exclusion, re-asserted because the apportionment changed the
    // query around it: a teacher buying their own course should produce no row,
    // not a zero row, and should not absorb a share of the discount.
    const offer = await sellableCourse(teacher, 20000, 'Self Taught');
    const selfBuyer = {
      userId: teacher,
      name: 'Teacher Buying Own',
    };
    // One purchase covers one learner, so even a teacher buying their own
    // course has to be a learner on it.
    const teacherLearner = (await q(
      `insert into public.learner_profiles (display_name, learner_type, age_band, linked_user_id)
       values ('Teacher Buying Own','adult','18+',$1) returning id`, [teacher])).rows[0].id;
    const made = await withCheckoutOn(() =>
      asActor(teacher, 'select public.create_course_order($1,$2) as r',
        [offer.course, teacherLearner]));

    await asActor(finance, 'select public.add_order_adjustment($1,$2,$3,null,$4,null)',
      [made.rows[0].r.orderId, 'manual_discount', 2000, 'Self purchase']);
    await pay(made.rows[0].r.orderId, 'DS-11');

    const rows = await count(
      'select id from public.instructor_earnings_entries where order_id = $1',
      [made.rows[0].r.orderId]);
    assert(rows === 0, `${rows} earnings rows were accrued to a teacher buying their own course`);
    assert(selfBuyer.userId === teacher);
  });

  // ---------------------------------------------------------------------
  // Idempotence and the column
  // ---------------------------------------------------------------------

  await test('a second accrual does not double-charge the discount', async () => {
    const buyer = await newBuyer('Twice');
    const order = await pendingOrder(buyer, 30000);
    await asActor(finance, 'select public.add_order_adjustment($1,$2,$3,null,$4,null)',
      [order.orderId, 'manual_discount', 6000, 'Once']);
    await pay(order.orderId, 'DS-12');

    const first = await earningsFor(order.orderId);
    // A replayed confirmation: record_payment_success() is idempotent for a paid
    // order and returns early, so this drives the accrual directly.
    const accrued = await scalar(
      'select public.accrue_instructor_earnings($1,$2,$3) as n',
      [order.orderId, (await scalar(
        'select id from public.financial_transactions where order_id = $1 and transaction_type = $2',
        [order.orderId, 'capture'])).id, admin]);
    assert(Number(accrued.n) === 0, `a replay accrued ${accrued.n} more entries`);

    const again = await earningsFor(order.orderId);
    assert(Number(again.gross_amount_minor) === Number(first.gross_amount_minor),
      `gross changed from ${first.gross_amount_minor} to ${again.gross_amount_minor} on a replay`);
    assert(Number(again.shared_discount_minor) === Number(first.shared_discount_minor),
      'the discount was shared twice');

    const rows = await count(
      'select id from public.instructor_earnings_entries where order_id = $1', [order.orderId]);
    assert(rows === 1, `${rows} earnings rows for one teacher on one order`);
  });

  await test('what a teacher bore is recorded, readable by them, and not editable', async () => {
    const buyer = await newBuyer('Readable');
    const order = await pendingOrder(buyer, 20000);
    await asActor(finance, 'select public.add_order_adjustment($1,$2,$3,null,$4,null)',
      [order.orderId, 'manual_discount', 4000, 'Readable']);
    await pay(order.orderId, 'DS-13');

    const seen = await asUser(teacher, async () => (await q(
      `select gross_amount_minor, shared_discount_minor from public.instructor_earnings_entries
        where order_id = $1`, [order.orderId])).rows[0]);
    assert(seen, 'the teacher cannot see their own earnings row');
    assert(Number(seen.shared_discount_minor) === 4000,
      `the teacher sees ${seen.shared_discount_minor} borne, not 4000`);
    assert(Number(seen.gross_amount_minor) === 16000, `the teacher sees gross ${seen.gross_amount_minor}`);

    // A teacher can read it and must not be able to rewrite what they bore.
    // `iee_write` is an INSERT policy for staff and there is no UPDATE policy, so
    // the update matches no rows rather than raising — RLS filters a write it has
    // no policy for. Asserted on the outcome, because "no error" is not "no
    // effect".
    const touched = await asUser(teacher, async () => (await q(
      `update public.instructor_earnings_entries
          set shared_discount_minor = 0
        where order_id = $1
        returning shared_discount_minor`, [order.orderId])).rows.length);
    assert(touched === 0, `the teacher rewrote ${touched} earnings rows`);

    const after = await scalar(
      `select shared_discount_minor from public.instructor_earnings_entries where order_id = $1`,
      [order.orderId]);
    assert(Number(after.shared_discount_minor) === 4000,
      `what the teacher bore changed to ${after.shared_discount_minor}`);
  });

  await test('the column defaults to zero, which is true of every older row', async () => {
    const row = await scalar(
      `select column_default, is_nullable, data_type
         from information_schema.columns
        where table_schema = 'public'
          and table_name = 'instructor_earnings_entries'
          and column_name = 'shared_discount_minor'`);
    assert(row, 'shared_discount_minor does not exist');
    assert(/0/.test(row.column_default ?? ''), `the default is ${row.column_default}`);
    assert(row.is_nullable === 'NO', 'the column is nullable, so it can be silently unknown');
    assert(row.data_type === 'bigint', `the column is ${row.data_type}, not bigint`);

    // The default is what makes the column true of rows written before it
    // existed: nothing could credit an order before 20261225000100, so a row
    // that predates the column bore nothing. Asserted on an order with no
    // adjustment rather than on a date range — migration prefixes are ahead of
    // the clock, and a cross-suite count only fails in the full run.
    const buyer = await newBuyer('Legacy Default');
    const order = await pendingOrder(buyer, 10000);
    await pay(order.orderId, 'DS-14');
    const row2 = await scalar(
      `select shared_discount_minor from public.instructor_earnings_entries where order_id = $1`,
      [order.orderId]);
    assert(Number(row2.shared_discount_minor) === 0,
      `a row written with no discount defaults to ${row2.shared_discount_minor}, not 0`);
  });
}
