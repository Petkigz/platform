// Instructor earnings.
//
// instructor_earnings_entries, instructor_payout_items and instructor_payouts
// shipped in 20261020000300 with RLS and policies, and nothing wrote to any of
// them. A teacher could sell a course, the platform could take the money, and
// no record existed anywhere that the teacher had earned anything.
//
// These tests drive the money path end to end: a confirmed payment accrues the
// share, and a refund takes it back. They exist because the eleven previous
// instances of this defect were all invisible to a green suite.
//
// The revenue share is deliberately NOT asserted as a fixed business number. It
// is a setting, undecided as a matter of policy, so the tests set it explicitly
// and assert the arithmetic against whatever it is set to.

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    asUser, committed,
    newUser, newProfile,
    newInstructor, newReviewer, satisfyReview, bootstrapAdmin,
    newCourse, newVersion, newSection, newLesson,
  } = ctx;

  const admin    = await bootstrapAdmin('earn-admin@example.com');
  const teacher  = await newInstructor('earn-teacher@example.com', admin);
  const reviewer = await newReviewer('earn-reviewer@example.com', admin);

  let learnerSeq = 0;
  async function newAdult(name) {
    learnerSeq += 1;
    const userId = await newUser(`earn-buyer-${learnerSeq}@example.com`);
    await newProfile(userId, name);
    const learnerId = (await q(
      `insert into public.learner_profiles (display_name, learner_type, age_band, linked_user_id)
       values ($1,'adult','18+',$2) returning id`, [name, userId])).rows[0].id;
    return { userId, learnerId };
  }

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
      [versionId, status, actor, 'earnings test']);

  /** Set the revenue share. Every test that cares sets it explicitly. */
  const setShare = (percent) =>
    q(`update public.platform_settings set value_text = $1
      where key = 'teaching.revenue_share_percent'`, [String(percent)]);

  /** A published course attached to a product, so it can actually be sold. */
  async function publishedCourse(author) {
    const course  = await newCourse(author, { status: 'active' });
    const version = await newVersion(course, author);
    const section = await newSection(version);
    await newLesson(section);

    const productId = (await q(
      `insert into public.products (product_type, name, status, created_by)
       values ('course','Earned course','active',$1) returning id`, [author])).rows[0].id;
    await q(`insert into public.product_course_versions (product_id, course_id, course_version_id)
             values ($1,$2,$3)`, [productId, course, version]);
    await q(`insert into public.prices (product_id, amount_minor, currency_code, billing_interval, status)
             values ($1, 30000, 'UGX', 'one_time', 'active')`, [productId]);

    await transition(version, 'submitted', author);
    await transition(version, 'approved', reviewer);
    await satisfyReview(version, reviewer, admin);
    await transition(version, 'published', admin);

    return { course, version, productId };
  }

  /** A billing account with one member who has a learner profile. */
  async function buyerAccount(name, memberOverride) {
    const buyer = await newAdult(name);
    const account = (await q(
      `insert into public.billing_accounts (display_name, billing_currency, status, created_by)
       values ($1,'UGX','active',$2) returning id`, [name, buyer.userId])).rows[0].id;
    const member = memberOverride ?? buyer.userId;
    await q(`insert into public.billing_account_memberships
               (billing_account_id, user_id, can_view_invoices, status, granted_by)
             values ($1,$2,true,'active',$3)
             on conflict (billing_account_id, user_id) do nothing`, [account, member, admin]);
    return { ...buyer, account };
  }

  async function paidOrder(buyer, pc, totalMinor = 30000) {
    const order = (await q(
      `insert into public.orders (billing_account_id, currency_code, subtotal_minor, total_minor, status)
       values ($1,'UGX',$2,$2,'pending_payment') returning id`,
      [buyer.account, totalMinor])).rows[0].id;
    const priceId = (await q(
      'select id from public.prices where product_id = $1 limit 1', [pc.productId])).rows[0].id;
    await q(`insert into public.order_items
               (order_id, product_id, price_id, quantity, unit_price_minor,
                currency_code, discount_minor, line_total_minor)
             values ($1,$2,$3,1,$4,'UGX',0,$4)`,
      [order, pc.productId, priceId, totalMinor]);
    return order;
  }

  const confirm = (order) =>
    q('select id from public.record_payment_success($1,$2,$3,$4,null,$5)',
      [order, admin, 'manual', 'EARN-1', 'Cash, receipt E1']);

  const entriesFor = (order) =>
    q(`select instructor_user_id, gross_amount_minor, net_amount_minor,
              revenue_share_percent, status
         from public.instructor_earnings_entries where order_id = $1`, [order]);

  const auditFor = (order, action) =>
    q(`select detail from public.governance_audit_events
        where target_id = $1 and action = $2`, [order, action]);

  // -------------------------------------------------------------------
  console.log('\nAccrual');
  // -------------------------------------------------------------------

  await test('a confirmed payment accrues the teacher their share', async () => {
    await setShare(70);
    const pc = await publishedCourse(teacher);
    const buyer = await buyerAccount('Earn Buyer 1');
    const order = await paidOrder(buyer, pc, 40000);

    assert((await count('select 1 from public.instructor_earnings_entries where order_id = $1', [order])) === 0,
      'earnings existed before the payment was confirmed');

    await confirm(order);

    const rows = (await entriesFor(order)).rows;
    assert(rows.length === 1, `expected 1 earnings entry, got ${rows.length}`);
    const e = rows[0];
    assert(e.instructor_user_id === teacher, 'the entry was credited to the wrong person');
    assert(Number(e.gross_amount_minor) === 40000,
      `gross was ${e.gross_amount_minor}, expected the full order total`);
    assert(Number(e.net_amount_minor) === 28000,
      `net was ${e.net_amount_minor}, expected 70% of 40000`);
    assert(Number(e.revenue_share_percent) === 70,
      `share was ${e.revenue_share_percent}, expected the configured 70`);
    assert(e.status === 'accrued', `status was ${e.status}`);
  });

  await test('replaying the payment confirmation does not credit twice', async () => {
    await setShare(70);
    const pc = await publishedCourse(teacher);
    const buyer = await buyerAccount('Earn Buyer 2');
    const order = await paidOrder(buyer, pc, 40000);

    await confirm(order);
    await confirm(order);
    await confirm(order);

    const rows = (await entriesFor(order)).rows;
    assert(rows.length === 1,
      `a replayed webhook produced ${rows.length} earnings entries for one order`);
    assert(Number(rows[0].net_amount_minor) === 28000,
      'the teacher was credited more than once');
  });

  await test('the split always satisfies its own check constraint', async () => {
    // 1/3 of an odd amount is where rounding shows up. If the function and the
    // iee_split_agrees CHECK disagree even by one minor unit, the insert fails.
    await setShare(33);
    const pc = await publishedCourse(teacher);
    const buyer = await buyerAccount('Earn Buyer 3');
    const order = await paidOrder(buyer, pc, 39999);

    await confirm(order);

    const e = (await entriesFor(order)).rows[0];
    assert(Number(e.net_amount_minor) === Math.round((39999 * 33) / 100),
      `net ${e.net_amount_minor} is not round(39999 * 33 / 100)`);
  });

  await test('a teacher buying their own course earns nothing from themselves', async () => {
    await setShare(70);
    const pc = await publishedCourse(teacher);
    // The teacher is the paying member of their own billing account.
    const teacherLearner = await newAdult('Earn Teacher Self');
    await q(`insert into public.learner_profiles (display_name, learner_type, age_band, linked_user_id)
             values ('x','adult','18+',null)`).catch(() => {});
    const account = (await q(
      `insert into public.billing_accounts (display_name, billing_currency, status, created_by)
       values ('Teacher Own','UGX','active',$1) returning id`, [teacher])).rows[0].id;
    // The creator is already a member by trigger, so this must be idempotent
    // rather than colliding on bam_one_per_user.
    await q(`insert into public.billing_account_memberships
               (billing_account_id, user_id, can_view_invoices, status, granted_by)
             values ($1,$2,true,'active',$3)
             on conflict (billing_account_id, user_id) do nothing`, [account, teacher, admin]);
    void teacherLearner;

    const order = (await q(
      `insert into public.orders (billing_account_id, currency_code, subtotal_minor, total_minor, status)
       values ($1,'UGX',40000,40000,'pending_payment') returning id`, [account])).rows[0].id;
    const priceId = (await q(
      'select id from public.prices where product_id = $1 limit 1', [pc.productId])).rows[0].id;
    await q(`insert into public.order_items
               (order_id, product_id, price_id, quantity, unit_price_minor,
                currency_code, discount_minor, line_total_minor)
             values ($1,$2,$3,1,40000,'UGX',0,40000)`, [order, pc.productId, priceId]);

    await confirm(order);

    const n = await count(
      'select 1 from public.instructor_earnings_entries where order_id = $1', [order]);
    assert(n === 0, `a self-purchase accrued ${n} entries; a teacher cannot earn from themselves`);
  });

  await test('an order spanning two teachers accrues to both, separately', async () => {
    await setShare(70);
    const teacher2 = await newInstructor('earn-teacher2@example.com', admin);
    const pc1 = await publishedCourse(teacher);
    const pc2 = await publishedCourse(teacher2);
    const buyer = await buyerAccount('Earn Buyer 4');

    const order = (await q(
      `insert into public.orders (billing_account_id, currency_code, subtotal_minor, total_minor, status)
       values ($1,'UGX',60000,60000,'pending_payment') returning id`, [buyer.account])).rows[0].id;
    for (const [pc, line] of [[pc1, 40000], [pc2, 20000]]) {
      const priceId = (await q(
        'select id from public.prices where product_id = $1 limit 1', [pc.productId])).rows[0].id;
      await q(`insert into public.order_items
                 (order_id, product_id, price_id, quantity, unit_price_minor,
                  currency_code, discount_minor, line_total_minor)
               values ($1,$2,$3,1,$4,'UGX',0,$4)`, [order, pc.productId, priceId, line]);
    }

    await confirm(order);

    const rows = (await entriesFor(order)).rows;
    assert(rows.length === 2, `expected one entry per teacher, got ${rows.length}`);
    const byTeacher = Object.fromEntries(
      rows.map((r) => [r.instructor_user_id, Number(r.net_amount_minor)]));
    assert(byTeacher[teacher] === 28000, `teacher 1 got ${byTeacher[teacher]}, expected 28000`);
    assert(byTeacher[teacher2] === 14000, `teacher 2 got ${byTeacher[teacher2]}, expected 14000`);
  });

  await test('a zero share records the sale but accrues nothing', async () => {
    await setShare(0);
    const pc = await publishedCourse(teacher);
    const buyer = await buyerAccount('Earn Buyer 5');
    const order = await paidOrder(buyer, pc, 40000);

    await confirm(order);

    const rows = (await entriesFor(order)).rows;
    assert(rows.length === 1, 'the gross record of the sale should still exist');
    assert(Number(rows[0].net_amount_minor) === 0,
      `net was ${rows[0].net_amount_minor}; a 0% share must accrue nothing`);
    assert(Number(rows[0].gross_amount_minor) === 40000,
      'the gross should still record what was sold');

    const noted = (await auditFor(order, 'earnings.accrued_at_zero_share')).rows;
    assert(noted.length === 1,
      'a 0% share must be visible in the audit trail, not silently indistinguishable from a missing setting');
  });

  await test('an out-of-range share is refused rather than applied', async () => {
    await setShare(140);
    const pc = await publishedCourse(teacher);
    const buyer = await buyerAccount('Earn Buyer 6');
    const order = await paidOrder(buyer, pc, 40000);

    await rejects(() => confirm(order), /between 0 and 100/i);
    await setShare(70);
  });

  await test('the share is snapshotted, not read later', async () => {
    await setShare(70);
    const pc = await publishedCourse(teacher);
    const buyer = await buyerAccount('Earn Buyer 7');
    const order = await paidOrder(buyer, pc, 40000);
    await confirm(order);

    // Changing the rate afterwards must not rewrite what was already earned.
    // Money already accounted for cannot move because a setting changed.
    await setShare(10);

    const e = (await entriesFor(order)).rows[0];
    assert(Number(e.revenue_share_percent) === 70,
      `the recorded share became ${e.revenue_share_percent}; it must be a snapshot`);
    assert(Number(e.net_amount_minor) === 28000,
      `net became ${e.net_amount_minor}; changing the rate must not rewrite history`);
    await setShare(70);
  });

  await test('two entries for one teacher on one order are refused', async () => {
    const pc = await publishedCourse(teacher);
    const order = (await q(
      `insert into public.orders (billing_account_id, currency_code, subtotal_minor, total_minor, status)
       values ((select id from public.billing_accounts limit 1),'UGX',40000,40000,'pending_payment')
       returning id`)).rows[0].id;
    void pc;

    await q(`insert into public.instructor_earnings_entries
               (instructor_user_id, order_id, gross_amount_minor, currency_code,
                revenue_share_percent, net_amount_minor)
             values ($1,$2,40000,'UGX',70,28000)`, [teacher, order]);

    await rejects(() => q(`insert into public.instructor_earnings_entries
               (instructor_user_id, order_id, gross_amount_minor, currency_code,
                revenue_share_percent, net_amount_minor)
             values ($1,$2,40000,'UGX',70,28000)`, [teacher, order]),
      /duplicate key/i);
  });

  // -------------------------------------------------------------------
  console.log('\nReversal on refund');
  // -------------------------------------------------------------------

  /**
   * Drive an order through to a completed refund of the given amount.
   *
   * The request must be made AS the buyer: request_refund() reads the JWT
   * subject, and there are no claims at superuser level, so calling it directly
   * is refused as anon. Committed, because staff act on it in a later block.
   */
  async function refund(order, amountMinor, reason = 'Earnings test refund', buyer) {
    const request = (await asActor(buyer.userId,
      'select public.request_refund($1,$2,$3) as id', [order, amountMinor, reason])).rows[0].id;
    // decide_refund_request() also reads the JWT subject: at superuser level
    // there are no claims, so it reads as anon and is refused.
    await asActor(admin,
      `select public.decide_refund_request($1,true,'Earnings test approval')`, [request]);
    const txn = (await q(
      `select id from public.refund_transactions where refund_request_id = $1`, [request])).rows[0].id;
    await q(`select public.complete_refund($1,$2,$3,null)`,
      [txn, 'EARN-REF-1', admin]);
    return txn;
  }

  await test('a full refund reverses the teacher\'s earnings', async () => {
    await setShare(70);
    const pc = await publishedCourse(teacher);
    const buyer = await buyerAccount('Earn Buyer 8');
    const order = await paidOrder(buyer, pc, 40000);
    await confirm(order);

    assert((await entriesFor(order)).rows[0].status === 'accrued', 'precondition: entry accrued');

    await refund(order, 40000, 'Earnings test refund', buyer);

    const e = (await entriesFor(order)).rows[0];
    assert(e.status === 'reversed',
      `status was ${e.status}; a fully refunded sale must not leave the teacher owed money`);

    const audited = (await auditFor(order, 'earnings.reversed_on_refund')).rows;
    assert(audited.length === 1, 'the reversal must be in the audit trail');
  });

  await test('a partial refund leaves the earnings intact', async () => {
    await setShare(70);
    const pc = await publishedCourse(teacher);
    const buyer = await buyerAccount('Earn Buyer 9');
    const order = await paidOrder(buyer, pc, 40000);
    await confirm(order);

    await refund(order, 15000, 'Partial refund', buyer);

    const e = (await entriesFor(order)).rows[0];
    assert(e.status === 'accrued',
      `status became ${e.status}; a partial refund means the learner still paid for what remains`);

    const o = await scalar('select status from public.orders where id = $1', [order]);
    assert(o.status === 'partially_refunded',
      `the order became ${o.status}, so this test did not exercise a partial refund`);
  });

  await test('reversal requires a written reason', async () => {
    const pc = await publishedCourse(teacher);
    const order = (await q(
      `insert into public.orders (billing_account_id, currency_code, subtotal_minor, total_minor, status)
       values ((select id from public.billing_accounts limit 1),'UGX',40000,40000,'pending_payment')
       returning id`)).rows[0].id;
    void pc;

    await rejects(
      () => q('select public.reverse_earnings_for_refund($1,$2,$3)', [order, admin, '   ']),
      /written reason/i);
  });

  await test('an entry already paid out raises a clawback rather than being rewritten', async () => {
    await setShare(70);
    const pc = await publishedCourse(teacher);
    const buyer = await buyerAccount('Earn Buyer 10');
    const order = await paidOrder(buyer, pc, 40000);
    await confirm(order);

    // Mark it paid: money has left the platform.
    await q(`update public.instructor_earnings_entries set status = 'paid' where order_id = $1`, [order]);

    await refund(order, 40000, 'Refunded after the teacher was paid', buyer);

    const e = (await entriesFor(order)).rows[0];
    assert(e.status === 'paid',
      `status became ${e.status}; a paid-out entry must not be silently rewritten`);

    const clawback = (await auditFor(order, 'earnings.clawback_needed')).rows;
    assert(clawback.length === 1,
      'money already paid for a refunded sale must be surfaced, not swallowed');
  });

  // -------------------------------------------------------------------
  console.log('\nAuthorisation');
  // -------------------------------------------------------------------

  await test('a learner cannot accrue earnings to themselves', async () => {
    const pc = await publishedCourse(teacher);
    const buyer = await buyerAccount('Earn Buyer 11');
    const order = await paidOrder(buyer, pc, 40000);

    await asUser(buyer.userId, async () => {
      await rejects(
        () => q('select public.accrue_instructor_earnings($1,null,$2)', [order, buyer.userId]),
        /permission denied/i);
    });
  });

  await test('a learner cannot reverse a teacher\'s earnings', async () => {
    await setShare(70);
    const pc = await publishedCourse(teacher);
    const buyer = await buyerAccount('Earn Buyer 12');
    const order = await paidOrder(buyer, pc, 40000);
    await confirm(order);

    await asUser(buyer.userId, async () => {
      await rejects(
        () => q('select public.reverse_earnings_for_refund($1,$2,$3)',
          [order, buyer.userId, 'Give it back']),
        /permission denied/i);
    });

    const e = (await entriesFor(order)).rows[0];
    assert(e.status === 'accrued',
      'a refused reversal must leave the entry untouched');
  });
}
