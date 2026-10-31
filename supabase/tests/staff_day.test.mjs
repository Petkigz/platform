// The staff day.
//
// `first_day.test.mjs` walks the platform as the four people it exists for: an
// owner, a teacher, a learner, a parent. This is the other half of the same
// question, and the half the roadmap's "test all roles" phase had left open:
// **the three staff roles behind `/admin`**, walked as themselves, in one day,
// in one database, in the order a day actually happens.
//
// Why this is not just four more feature suites:
//
// Every staff surface already has a test of its own — the refund queue, the
// reviewer register, the guardian decisions, the role page. Each of them asks
// "does this screen's writer work for the role it names". None of them asks the
// question a person asks on their first morning: **whose work is this, and is
// the platform sure?** That question only has a wrong answer at a seam, where
// one layer says "money is finance's" and another says "any staff member".
//
// Walking it as three people found two seams like that, both now fixed in
// `20261281004400_staff_switchboard.sql`:
//
//   1. A support agent — the least-privileged staff role, kept that way on
//      purpose — could grant `platform_admin` to anybody, and could revoke the
//      owner's. The "last privileged account" guard did not fire, because the
//      agent revoking it was themselves privileged. Two statements from the
//      least-trusted staff account and the owner is locked out of their platform.
//
//   2. A support agent could approve refunds, while `/admin` filed refunds under
//      money (finance only), `staff_attention()` kept the refund count from
//      support, and the role table describes refunds as the finance admin's.
//
// What the suite pins is the *settled* matrix, including the places where the
// platform deliberately gives a role less than it might: support opens a refund
// and finance decides it, the refund window itself is any staff member's
// because it bounds asking rather than deciding, and the feature switches are
// the owner's alone.

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    bootstrapAdmin, newUser, newProfile, newInstructor,
    newCourse, newVersion, newSection, newLesson, newReviewer, satisfyReview,
  } = ctx;

  const owner = await bootstrapAdmin('staffday-owner@example.com');
  const support = await newUser('staffday-support@example.com');
  const finance = await newUser('staffday-finance@example.com');
  const governance = await newUser('staffday-governance@example.com');
  const teacher = await newInstructor('staffday-teacher@example.com', owner);
  const reviewer = await newReviewer('staffday-reviewer@example.com', owner);

  /**
   * Act as a person and COMMIT.
   *
   * `asUser()` rolls back, which is right for a single assertion and useless
   * for a day: the support agent's reply has to still exist when finance reads
   * the case two acts later. The session variables are transaction-scoped, so
   * much of this suite's honesty comes from this one detail.
   */
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

  /** One scalar answer, from a function. */
  const call = async (actor, fn, params = []) =>
    (await asActor(actor, `select public.${fn} as r`, params)).rows[0].r;

  const count = async (sql, params = []) =>
    (await q(`select count(*)::int n from (${sql}) t`, params)).rows[0].n;

  let sequence = 0;

  /**
   * A customer who has paid for a real course.
   *
   * Everything on the money path needs one, and the order is confirmed through
   * `record_payment_success()` rather than by writing `status = 'paid'` by
   * hand — the paid state has constraints attached (evidence, a capture row,
   * a timestamp), and a fixture that fakes it would prove nothing about what
   * happens to a real one.
   */
  async function paidCustomer(name) {
    sequence += 1;
    const userId = await newUser(`staffday-buyer-${sequence}@example.com`);
    await newProfile(userId, name);
    const learnerId = (await q(
      `insert into public.learner_profiles (display_name, learner_type, age_band, linked_user_id)
       values ($1, 'adult', '18+', $2) returning id`, [name, userId])).rows[0].id;
    const account = (await q(
      `insert into public.billing_accounts (display_name, billing_country, billing_currency, created_by)
       values ($1, 'UG', 'UGX', $2) returning id`, [name, userId])).rows[0].id;
    await q(
      `insert into public.billing_account_memberships
         (billing_account_id, user_id, can_view_invoices, status, granted_by)
       values ($1, $2, true, 'active', $3)
       on conflict (billing_account_id, user_id) do nothing`, [account, userId, owner]);

    const totalMinor = 60000;
    const course = await newCourse(teacher, { status: 'active' });
    const version = await newVersion(course, teacher);
    const section = await newSection(version);
    await newLesson(section);

    const product = (await q(
      `insert into public.products (product_type, name, status, created_by)
       values ('course', 'A course somebody bought', 'active', $1) returning id`,
      [teacher])).rows[0].id;
    await q(
      `insert into public.product_course_versions (product_id, course_id, course_version_id)
       values ($1,$2,$3)`, [product, course, version]);
    await q(
      `insert into public.prices (product_id, amount_minor, currency_code, billing_interval, status)
       values ($1, $2, 'UGX', 'one_time', 'active')`, [product, totalMinor]);

    const transition = (status, actor) =>
      q('select id from public.set_course_version_status($1,$2,$3,$4)',
        [version, status, actor, 'staff day']);
    await transition('submitted', teacher);
    await satisfyReview(version, reviewer, owner);
    await transition('approved', reviewer);
    await transition('published', owner);

    const order = (await q(
      `insert into public.orders
         (billing_account_id, currency_code, subtotal_minor, total_minor, status)
       values ($1, 'UGX', $2, $2, 'pending_payment') returning id`,
      [account, totalMinor])).rows[0].id;
    const priceId = (await q(
      'select id from public.prices where product_id = $1 limit 1', [product])).rows[0].id;
    await q(
      `insert into public.order_items
         (order_id, product_id, price_id, quantity, unit_price_minor,
          currency_code, discount_minor, line_total_minor)
       values ($1, $2, $3, 1, $4, 'UGX', 0, $4)`,
      [order, product, priceId, totalMinor]);

    // The confirmation is finance's own work, exercised as finance rather than
    // as the database owner: the manual-evidence path requires a privileged
    // actor with written evidence.
    await q('select public.record_payment_success($1,$2,$3,$4,null,$5)',
      [order, finance, 'manual', `SDAY-CAP-${sequence}`, 'Bank statement, 12 Aug']);

    return { userId, learnerId, account, order, totalMinor, course, version };
  }

  /** A parent who has asked to be recognised as a child's guardian. */
  async function guardianCase(name) {
    sequence += 1;
    const parent = await newUser(`staffday-parent-${sequence}@example.com`);
    await newProfile(parent, name);
    const family = await call(parent, 'create_family($1)', [`${name}'s family`]);
    const child = await call(parent, 'add_child_to_family($1,$2,$3)',
      [family, `${name}'s child`, '8-10']);
    const submitted = await call(parent, 'submit_guardian_consent($1,$2,$3,$4,$5)',
      [child, 'parent', 'video_call', 'CASE-REF-18', 'I am this child’s mother.']);
    return { parent, child, caseId: submitted.caseId, family };
  }

  // -------------------------------------------------------------------------
  console.log('\nAct I — the owner opens the door');
  // -------------------------------------------------------------------------

  await test('the owner appoints the three staff roles, each with a reason', async () => {
    await asActor(owner, 'select public.assign_role($1,$2,$3)',
      [support, 'support_agent', 'Answers the help queue']);
    await asActor(owner, 'select public.assign_role($1,$2,$3)',
      [finance, 'finance_admin', 'Runs refunds and the ledger']);
    await asActor(owner, 'select public.assign_role($1,$2,$3)',
      [governance, 'governance_admin', 'Reviewer register and guardian decisions']);

    for (const person of [support, finance, governance]) {
      assert(await q('select public.is_privileged($1) p', [person]).then((r) => r.rows[0].p),
        'an appointed staff member is not privileged');
    }
  });

  await test('a privileged appointment without a reason is refused', async () => {
    const stranger = await newUser('staffday-no-reason@example.com');
    await rejects(() => asActor(owner, 'select public.assign_role($1,$2,$3)',
      [stranger, 'support_agent', '   ']),
      /written reason/i);
  });

  await test('every appointment is on the audit trail, with the owner against it', async () => {
    const rows = (await q(
      `select target_id, detail->>'role' as role_code, detail, actor
         from public.governance_audit_events
        where action = 'role.assigned'
          and target_id in ($1,$2,$3)`, [support, finance, governance])).rows;

    assert(rows.length === 3, `${rows.length} appointment(s) recorded, expected 3`);
    assert(rows.every((r) => r.actor === owner), 'an appointment is not attributed to the owner');
    assert(rows.every((r) => Boolean(r.detail?.reason)),
      'an appointment has no reason on it');
  });

  // -------------------------------------------------------------------------
  console.log('\nAct II — the support agent answers the help queue');
  // -------------------------------------------------------------------------

  const customer = await paidCustomer('Amina Nabbosa');
  let caseId;

  await test('the owner opens the help desk for the day', async () => {
    // The queue is a feature switch, and switches are the owner's: this is the
    // one person who may decide the platform takes requests today. Left on, the
    // journey below would silently change the state of every suite after it,
    // so the act closes it again on the way out.
    await asActor(owner,
      `update public.platform_settings set value_text = 'true' where key = 'platform.support'`);
    assert((await q(
      `select value_text from public.platform_settings where key = 'platform.support'`
    )).rows[0].value_text === 'true');

    caseId = await call(customer.userId, 'open_support_case($1,$2,$3)',
      ['payment', 'Charged twice for one course',
       'My card was charged twice on the 12th. The course is fine, the second charge is not.']);

    const seen = (await asActor(support,
      'select subject from public.support_cases where id = $1', [caseId])).rows;
    assert(seen.length === 1, 'support cannot read a case a learner opened');
  });

  await test('support replies, and the learner can read the reply', async () => {
    await asActor(support, 'select public.reply_to_support_case($1,$2,$3)',
      [caseId, 'I can see the second charge. I have opened a refund for it.', false]);

    const seen = (await asActor(customer.userId,
      `select body from public.support_case_messages where case_id = $1`, [caseId])).rows;
    assert(seen.some((r) => /opened a refund/i.test(r.body)),
      'the person who asked for help cannot read the answer');
  });

  let supportRefund;

  await test('support opens a refund on the customer’s behalf', async () => {
    // Two days after the payment, so nothing about the window is being tested
    // here: this is the staff path, which is deliberately exempt from it — a
    // support call that ends in "the window closed, nothing I can do" loses a
    // family over a course that was sold wrong.
    supportRefund = await call(support, 'request_refund($1,$2,$3)',
      [customer.order, 60000, 'Duplicate charge, confirmed on the statement']);

    assert(supportRefund, 'support could not open a refund on the customer’s behalf');
    const row = (await q('select requested_by, status from public.refund_requests where id = $1',
      [supportRefund])).rows[0];
    assert(row.requested_by === support, 'the refund is not attributed to the person who opened it');
    assert(row.status === 'requested');
  });

  await test('...and cannot approve it, because that is finance’s signature', async () => {
    await rejects(() => asActor(support,
      'select public.decide_refund_request($1,$2,$3)', [supportRefund, true, 'Approved by me']),
      /finance admin or platform admin/i);
  });

  await test('support cannot appoint a platform admin', async () => {
    const friend = await newUser('staffday-friend@example.com');
    await asActor(friend, `insert into public.user_profiles (user_id, display_name)
                           values ($1,'A friend') on conflict do nothing`, [friend]);

    await rejects(() => asActor(support, 'select public.assign_role($1,$2,$3)',
      [friend, 'platform_admin', 'They seem nice']),
      /only the platform admin/i);
    assert((await q('select public.is_privileged($1) p', [friend])).rows[0].p === false,
      'a support agent granted a platform admin');
  });

  await test('support cannot take the owner’s role away either', async () => {
    // This is the one that would have ended the platform: the "last privileged
    // account" guard counts the caller, so an agent revoking the owner was
    // never the last one — they were.
    await rejects(() => asActor(support, 'select public.revoke_role($1,$2,$3)',
      [owner, 'platform_admin', 'I run this place now']),
      /only the platform admin/i);
    assert((await q('select public.is_privileged($1) p', [owner])).rows[0].p === true,
      'the owner lost the platform');
  });

  await test('but support can appoint an ordinary role — that is their work too', async () => {
    const friend = await newUser('staffday-teacher-friend@example.com');
    await asActor(friend, `insert into public.user_profiles (user_id, display_name)
                           values ($1,'A teacher') on conflict do nothing`, [friend]);

    await asActor(support, 'select public.assign_role($1,$2,$3)',
      [friend, 'instructor', 'Applying to teach']);
    assert(await q('select public.has_role($1,$2) h', [friend, 'instructor'])
      .then((r) => r.rows[0].h), 'a support agent could not appoint a teacher');
  });

  await test('the owner closes the help desk again at the end of the day', async () => {
    await asActor(owner,
      `update public.platform_settings set value_text = 'false' where key = 'platform.support'`);
    assert((await q(
      `select value_text from public.platform_settings where key = 'platform.support'`
    )).rows[0].value_text === 'false');
  });

  await test('nobody outside staff can reach the queue at all', async () => {
    await rejects(() => asActor(customer.userId, 'select public.staff_attention()'),
      /only platform staff/i);
    await rejects(() => asActor(customer.userId, 'select public.resolve_support_case($1,$2)',
      [caseId, 'Closing my own case']),
      /only staff/i);
  });

  // -------------------------------------------------------------------------
  console.log('\nAct III — finance decides the money');
  // -------------------------------------------------------------------------

  await test('finance approves the refund support opened', async () => {
    await asActor(finance, 'select public.decide_refund_request($1,$2,$3)',
      [supportRefund, true, 'Duplicate confirmed against the capture']);

    const request = (await q(
      'select status, decided_by from public.refund_requests where id = $1', [supportRefund])).rows[0];
    assert(request.status === 'approved');
    assert(request.decided_by === finance, 'the decision is not attributed to finance');
  });

  await test('and the money has not moved: the transaction is only pending', async () => {
    // The distinction the whole finance half of the platform is built on. A
    // decision is not a transfer, and there is no provider in this deployment
    // to make one.
    const txn = (await q(
      'select status, amount_minor from public.refund_transactions where refund_request_id = $1',
      [supportRefund])).rows[0];
    assert(txn.status === 'pending', `the refund transaction is ${txn.status}, not pending`);
    assert(Number(txn.amount_minor) === 60000);

    const order = (await q('select status from public.orders where id = $1',
      [customer.order])).rows[0];
    assert(order.status === 'paid', `the order is ${order.status}; a pending refund moved it`);
  });

  await test('finance records an adjustment against the sale, with its reason', async () => {
    const id = await call(finance, 'record_financial_adjustment($1,$2,$3,$4,$5,$6)',
      [customer.order, null, 'goodwill_credit', -5000, 'UGX',
       'Kept the family on the platform after the duplicate charge']);

    const row = (await q(
      `select amount_minor, currency_code, reason from public.financial_adjustments where id = $1`,
      [id])).rows[0];
    assert(Number(row.amount_minor) === -5000);
    assert(row.currency_code === 'UGX');
    assert(/duplicate charge/i.test(row.reason));
  });

  await test('finance cannot decide who may review', async () => {
    const profile = (await q('select id from public.reviewer_profiles where user_id = $1',
      [reviewer])).rows[0].id;
    await rejects(() => asActor(finance, 'select public.set_reviewer_status($1,$2,$3)',
      [profile, 'active', 'Looks fine to me']),
      /governance admin/i);
  });

  const guardian = await guardianCase('Khadija Namusoke');

  await test('finance cannot decide a guardian case', async () => {
    await rejects(() => asActor(finance, 'select public.decide_guardian_consent($1,$2,$3)',
      [guardian.caseId, 'verified', 'She sounds genuine']),
      /guardian:not_allowed/);
  });

  // -------------------------------------------------------------------------
  console.log('\nAct IV — governance decides who is who');
  // -------------------------------------------------------------------------

  await test('governance can suspend a reviewer, and reinstating keeps the original verifier', async () => {
    const profile = (await q('select id from public.reviewer_profiles where user_id = $1',
      [reviewer])).rows[0];
    const originalVerifier = (await q(
      'select verified_by from public.reviewer_profiles where id = $1', [profile.id])).rows[0]
      .verified_by;
    assert(originalVerifier, 'the fixture reviewer was never verified');

    await asActor(governance, 'select public.set_reviewer_status($1,$2,$3)',
      [profile.id, 'suspended', 'A reference could not be reached']);
    let row = (await q('select reviewer_status from public.reviewer_profiles where id = $1',
      [profile.id])).rows[0];
    assert(row.reviewer_status === 'suspended', `reviewer is ${row.reviewer_status}`);

    await asActor(governance, 'select public.set_reviewer_status($1,$2,$3)',
      [profile.id, 'active', 'Reference reached the following day']);
    row = (await q('select reviewer_status, verified_by from public.reviewer_profiles where id = $1',
      [profile.id])).rows[0];
    assert(row.reviewer_status === 'active');
    // Verification is recorded once. Reinstating is not a second verification,
    // and the row must still name the person who actually checked the papers.
    assert(row.verified_by === originalVerifier,
      'reinstating rewrote who verified the reviewer');
  });

  await test('governance decides the guardian’s case', async () => {
    await asActor(governance, 'select public.decide_guardian_consent($1,$2,$3,$4)',
      [guardian.caseId, 'verified', 'Identity confirmed on the call', 12]);

    // Read as the parent, because the function asks about the caller — a
    // question about an argument would let anybody ask it about anybody.
    const verified = await asActor(guardian.parent,
      'select public.is_verified_guardian_of($1) v', [guardian.child])
      .then((r) => r.rows[0].v);
    assert(verified === true, 'the parent decision did not make the parent verified');
  });

  await test('and the parent can now read what the child is doing', async () => {
    const readable = await asActor(guardian.parent,
      'select display_name from public.learner_profiles where id = $1', [guardian.child]);
    assert(readable.rows.length === 1, 'a verified guardian cannot read their own child');
  });

  await test('governance cannot decide a refund', async () => {
    const second = await paidCustomer('Yusuf Kaggwa');
    const request = await call(second.userId, 'request_refund($1,$2,$3)',
      [second.order, 10000, 'Changed my mind about the add-on']);

    await rejects(() => asActor(governance, 'select public.decide_refund_request($1,$2,$3)',
      [request, true, 'The support case looked genuine']),
      /finance admin or platform admin/i);
  });

  await test('governance cannot write a ledger adjustment', async () => {
    await rejects(() => asActor(governance, 'select public.record_financial_adjustment($1,$2,$3,$4,$5,$6)',
      [customer.order, null, 'correction', 100, 'UGX', 'Rounding']),
      /finance admin/i);
  });

  // -------------------------------------------------------------------------
  console.log('\nAct V — the switchboard, and whose queue is whose');
  // -------------------------------------------------------------------------

  await test('the feature switches are the owner’s, not staff’s', async () => {
    // Every layer that mentions a switch says the same thing, and this is the
    // layer that decides: the trigger, not the screen.
    await rejects(() => asActor(finance,
      `update public.platform_settings set value_text = 'true' where key = 'commerce.checkout'`),
      /platform admin/i);

    await asActor(owner,
      `update public.platform_settings set value_text = 'true' where key = 'commerce.checkout'`);
    assert((await q(
      `select value_text from public.platform_settings where key = 'commerce.checkout'`
    )).rows[0].value_text === 'true');
    // Put it back: checkout stays off until a provider exists, and other suites
    // read this register too.
    await asActor(owner,
      `update public.platform_settings set value_text = 'false' where key = 'commerce.checkout'`);
  });

  await test('the refund window is any staff member’s, deliberately', async () => {
    // This one looks like an inconsistency and is not: the window bounds
    // *asking*, and support is where a closed window gets explained. Pinned so
    // a later tidy-up cannot quietly take it away from them.
    const hours = await call(support, 'set_refund_window($1,$2)',
      [96, 'Longer window over the school holidays']);
    assert(Number(hours) === 96);
    await asActor(support, 'select public.set_refund_window($1,$2)', [72, 'Back to the default']);
  });

  await test('each role’s queue is its own', async () => {
    const queues = async (actor) =>
      (await asActor(actor, 'select public.staff_attention() a')).rows[0].a;

    const supportQueues = (await queues(support)).queues.map((row) => row.code);
    assert(supportQueues.includes('support'), 'support has no support queue');
    for (const code of ['refunds', 'disputes', 'reconciliation', 'payouts']) {
      assert(!supportQueues.includes(code), `support was shown the ${code} queue`);
    }

    const financeQueues = (await queues(finance)).queues.map((row) => row.code);
    assert(financeQueues.includes('refunds'), 'finance has no refund queue');
    assert(!financeQueues.includes('support'), 'finance was shown the support queue');

    const governanceQueues = (await queues(governance)).queues.map((row) => row.code);
    assert(governanceQueues.includes('guardians') || governanceQueues.includes('appeals'),
      'governance has no governance queue');
    for (const code of ['refunds', 'support']) {
      assert(!governanceQueues.includes(code), `governance was shown the ${code} queue`);
    }
  });

  // -------------------------------------------------------------------------
  console.log('\nThe day, read back from the audit trail');
  // -------------------------------------------------------------------------

  await test('four people did four things only they could do, and it is all written down', async () => {
    const actions = (await q(
      `select action, actor from public.governance_audit_events
        where actor in ($1,$2,$3,$4)`, [owner, support, finance, governance])).rows;

    const by = (actor) => actions.filter((row) => row.actor === actor).map((row) => row.action);

    assert(by(owner).includes('role.assigned'), 'the owner’s appointments are not recorded');
    assert(by(support).some((a) => /refund\.requested/.test(a)),
      'the refund support opened is not recorded against them');
    assert(by(finance).includes('refund.approved'),
      'finance’s decision is not recorded against them');
    assert(by(governance).length > 0, 'governance did nothing that was recorded');
  });

  await test('the owner is still the owner at the end of the day', async () => {
    assert(await q('select public.is_privileged($1) p', [owner]).then((r) => r.rows[0].p),
      'the platform lost its owner');
    assert(await q(
      `select public.has_role($1,'platform_admin') h`, [owner]).then((r) => r.rows[0].h));
    assert(await q('select public.has_role($1,$2) h', [support, 'support_agent'])
      .then((r) => r.rows[0].h), 'support lost their role');
  });
}
