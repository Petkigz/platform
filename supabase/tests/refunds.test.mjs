// Refunds.
//
// The refund tables shipped in 20261020000300 with a ceiling trigger, a
// self-approval ban, a ledger writer and a refundable-balance function — and
// nothing that ever created a row for them to act on. No customer who paid
// could ask for their money back.
//
// Every test here drives the writers that migration added, because the previous
// suite could not: it had no fixtures that went through the application path, so
// it could not notice that the application path did not exist.

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    asUser, committed,
    newUser, newProfile,
    newInstructor, newReviewer, satisfyReview, bootstrapAdmin,
    newCourse, newVersion, newSection, newLesson,
  } = ctx;

  const admin    = await bootstrapAdmin('ref-admin@example.com');
  const teacher  = await newInstructor('ref-teacher@example.com', admin);
  const reviewer = await newReviewer('ref-reviewer@example.com', admin);

  const count = async (sql, params) =>
    (await q(`select count(*)::int n from (${sql}) t`, params)).rows[0].n;

  const scalar = async (sql, params) => (await q(sql, params)).rows[0];

  const transition = (versionId, status, actor) =>
    q('select id from public.set_course_version_status($1,$2,$3,$4)',
      [versionId, status, actor, 'refund test']);

  /**
   * Act as a user and COMMIT.
   *
   * asUser() rolls back, which is right for a single assertion but useless here:
   * most of these tests need the buyer's request to still exist when staff act
   * on it in a later block. is_local is transaction-scoped, so set_config only
   * means anything inside an explicit transaction.
   */
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

  const requestAs = (buyer, order, amount, reason) =>
    asActor(buyer, 'select public.request_refund($1,$2,$3) as id', [order, amount, reason]);

  // Approval and settlement have to commit too, or the row the next step needs
  // is rolled back before it is read.
  const approveAs = (staff, requestId, notes) =>
    asActor(staff, 'select public.decide_refund_request($1,$2,$3)', [requestId, true, notes]);
  const settleAs = (staff, txnId, reference) =>
    asActor(staff, 'select public.complete_refund($1,$2,$3)', [txnId, reference, staff]);
  const txnIdFor = async (requestId) => {
    const r = await q('select id from public.refund_transactions where refund_request_id = $1',
      [requestId]);
    if (!r.rows[0]) throw new Error(`no refund transaction was created for ${requestId}`);
    return r.rows[0].id;
  };

  let seq = 0;
  async function newAdult(name) {
    seq += 1;
    const userId = await newUser(`ref-buyer-${seq}@example.com`);
    await newProfile(userId, name);
    const learnerId = (await q(
      `insert into public.learner_profiles (display_name, learner_type, age_band, linked_user_id)
       values ($1,'adult','18+',$2) returning id`, [name, userId])).rows[0].id;
    return { userId, learnerId };
  }

  /** A billing account whose creator is a member, plus a paid, captured order. */
  async function paidOrder(name, totalMinor = 30000) {
    const { userId, learnerId } = await newAdult(name);
    const account = (await q(
      `insert into public.billing_accounts (display_name, billing_currency, status, created_by)
       values ($1, 'UGX', 'active', $2) returning id`, [name, userId])).rows[0].id;
    await q(`insert into public.billing_account_memberships
               (billing_account_id, user_id, can_view_invoices, status, granted_by)
             values ($1, $2, true, 'active', $3)
             on conflict (billing_account_id, user_id) do nothing`, [account, userId, admin]);

    // A course that is actually sold, so a product and price exist to charge.
    const course  = await newCourse(teacher, { status: 'active' });
    const version = await newVersion(course, teacher);
    const section = await newSection(version);
    const lesson = await newLesson(section);
    const prod = (await q(
      `insert into public.products (product_type, name, status, created_by)
       values ('course','Refundable course','active',$1) returning id`, [teacher])).rows[0].id;
    await q(`insert into public.product_course_versions (product_id, course_id, course_version_id)
             values ($1,$2,$3)`, [prod, course, version]);
    await q(`insert into public.prices (product_id, amount_minor, currency_code, billing_interval, status)
             values ($1, $2, 'UGX', 'one_time', 'active')`, [prod, totalMinor]);
    await transition(version, 'submitted', teacher);
    // Publication needs a scholarly approval on record first.
    await satisfyReview(version, reviewer, admin);
    await transition(version, 'approved', reviewer);
    await transition(version, 'published', admin);

    const order = (await q(
      `insert into public.orders (billing_account_id, currency_code, subtotal_minor, total_minor, status)
       values ($1, 'UGX', $2, $2, 'pending_payment') returning id`,
      [account, totalMinor])).rows[0].id;
    const priceId = (await q(
      'select id from public.prices where product_id = $1 limit 1', [prod])).rows[0].id;
    await q(`insert into public.order_items
               (order_id, product_id, price_id, quantity, unit_price_minor,
                currency_code, discount_minor, line_total_minor)
             values ($1, $2, $3, 1, $4, 'UGX', 0, $4)`,
      [order, prod, priceId, totalMinor]);

    // Confirming creates the capture row that refundable_amount() sums.
    await q('select id from public.record_payment_success($1,$2,$3,$4,null,$5)',
      [order, admin, 'manual', `REF-CAP-${seq}`, 'Bank statement']);

    return { userId, learnerId, account, order, totalMinor, course, version, lesson };
  }

  // -------------------------------------------------------------------
  // The writer exists at all
  // -------------------------------------------------------------------

  await test('a buyer can request a refund, and it is recorded', async () => {
    const { userId, order } = await paidOrder('Refund Asker');
    let id = null;

    await asUser(userId, async () => {
      id = (await q('select public.request_refund($1,$2,$3) as id',
        [order, 30000, 'The course was not what I expected'])).rows[0].id;
      assert(typeof id === 'string' && id.length > 0, 'no request id returned');

      const row = await scalar(
        `select requested_by, requested_amount_minor, currency_code, status
           from public.refund_requests where id = $1`, [id]);
      assert(row.requested_by === userId,
        `request attributed to ${row.requested_by}, expected the caller ${userId}`);
      assert(row.status === 'requested', `status was ${row.status}`);
      assert(Number(row.requested_amount_minor) === 30000, 'amount not stored');
      // Currency comes from the order, never from the caller.
      assert(row.currency_code === 'UGX', `currency was ${row.currency_code}`);
    });
  });

  await test('requesting a refund moves no money', async () => {
    const { userId, order } = await paidOrder('Patient Buyer');
    const id = (await requestAs(userId, order, 30000, 'Changed my mind')).rows[0].id;

    const ledger = await count(
      `select 1 from public.financial_transactions
        where order_id = $1 and transaction_type = 'refund'`, [order]);
    assert(ledger === 0, `asking created ${ledger} ledger rows; it should create none`);

    const txns = await count(
      'select 1 from public.refund_transactions where refund_request_id = $1', [id]);
    assert(txns === 0, `asking created ${txns} transactions; approval is what creates one`);
  });

  // -------------------------------------------------------------------
  // Who may ask
  // -------------------------------------------------------------------

  await test('someone outside the billing account cannot request a refund', async () => {
    const { order } = await paidOrder('Account Holder');
    const { userId: stranger } = await newAdult('Unrelated Stranger');

    await asUser(stranger, async () => {
      await rejects(
        () => q('select public.request_refund($1,$2,$3) as id',
          [order, 30000, 'I would like that money']),
        /not on the billing account/i,
      );
    });

    const rows = await count('select 1 from public.refund_requests where order_id = $1', [order]);
    assert(rows === 0, `${rows} requests exist from someone with no relationship to the order`);
  });

  await test('the insert policy itself requires a billing relationship', async () => {
    // The function is not the only path to the table. Before this migration the
    // policy checked only that the request was self-attributed, so a raw insert
    // naming any order id was accepted.
    const { order } = await paidOrder('Policy Holder');
    const { userId: stranger } = await newAdult('Direct Inserter');

    await asUser(stranger, async () => {
      await rejects(
        () => q(`insert into public.refund_requests
                   (order_id, requested_amount_minor, currency_code, reason, requested_by)
                 values ($1, 100, 'UGX', 'direct insert', $2)`, [order, stranger]),
        /row-level security/i,
      );
    });
  });

  await test('a refund cannot be requested on an order that was never paid', async () => {
    const { userId } = await newAdult('Unpaid Order Holder');
    const account = (await q(
      `insert into public.billing_accounts (display_name, billing_currency, status, created_by)
       values ('Unpaid','UGX','active',$1) returning id`, [userId])).rows[0].id;
    await q(`insert into public.billing_account_memberships
               (billing_account_id, user_id, status, granted_by)
             values ($1,$2,'active',$3)
             on conflict (billing_account_id, user_id) do nothing`, [account, userId, admin]);
    const order = (await q(
      `insert into public.orders (billing_account_id, currency_code, subtotal_minor, total_minor, status)
       values ($1,'UGX',100,100,'pending_payment') returning id`, [account])).rows[0].id;

    await asUser(userId, async () => {
      await rejects(
        () => q('select public.request_refund($1,$2,$3) as id',
          [order, 100, 'Refund please']),
        /nothing to refund/i,
      );
    });
  });

  await test('a request above the refundable balance is refused', async () => {
    const { userId, order } = await paidOrder('Greedy Buyer', 30000);

    await asUser(userId, async () => {
      await rejects(
        () => q('select public.request_refund($1,$2,$3) as id',
          [order, 999999, 'I would like more than I paid']),
        /exceeds the refundable balance/i,
      );
    });
  });

  await test('a blank reason is refused', async () => {
    const { userId, order } = await paidOrder('Terse Buyer');

    await asUser(userId, async () => {
      await rejects(
        () => q('select public.request_refund($1,$2,$3) as id', [order, 100, '   ']),
        /say what the refund is for/i,
      );
    });
  });

  // -------------------------------------------------------------------
  // Deciding
  // -------------------------------------------------------------------

  await test('a learner cannot decide their own refund', async () => {
    const { userId, order } = await paidOrder('Decisive Buyer');
    const id = (await requestAs(userId, order, 30000, 'Please')).rows[0].id;

    await asUser(userId, async () => {
      // The refusal names the two roles that may decide rather than saying
      // "staff": a support agent is staff, and support approving refunds was
      // exactly the seam the staff-day journey found.
      await rejects(
        () => q('select public.decide_refund_request($1,$2,$3)', [id, true, 'why not']),
        /finance admin or platform admin/i,
      );
    });
  });

  await test('staff cannot approve a refund they requested themselves', async () => {
    // An admin is a billing member of their own account, so they can file. The
    // ban is on deciding it, which is rr_not_self_approved — but the function
    // says so in words rather than letting the constraint surface raw.
    const account = (await q(
      `insert into public.billing_accounts (display_name, billing_currency, status, created_by)
       values ('Admin own','UGX','active',$1) returning id`, [admin])).rows[0].id;
    await q(`insert into public.billing_account_memberships
               (billing_account_id, user_id, status, granted_by)
             values ($1,$2,'active',$2)
             on conflict (billing_account_id, user_id) do nothing`, [account, admin]);

    const prod = (await q(
      `insert into public.products (product_type, name, status, created_by)
       values ('course','Self refund','active',$1) returning id`, [teacher])).rows[0].id;
    await q(`insert into public.prices (product_id, amount_minor, currency_code, billing_interval, status)
             values ($1, 5000, 'UGX', 'one_time', 'active')`, [prod]);
    // A paid order needs evidence as well as a status (orders_paid_agrees and
    // orders_paid_has_evidence), so go through the real confirmation path
    // rather than asserting the status by hand.
    const order = (await q(
      `insert into public.orders (billing_account_id, currency_code, subtotal_minor, total_minor, status)
       values ($1,'UGX',5000,5000,'pending_payment') returning id`, [account])).rows[0].id;
    const priceId = (await q(
      'select id from public.prices where product_id = $1 limit 1', [prod])).rows[0].id;
    await q(`insert into public.order_items
               (order_id, product_id, price_id, quantity, unit_price_minor,
                currency_code, discount_minor, line_total_minor)
             values ($1,$2,$3,1,5000,'UGX',0,5000)`, [order, prod, priceId]);
    await q('select id from public.record_payment_success($1,$2,$3,$4,null,$5)',
      [order, admin, 'manual', 'REF-SELF-1', 'Bank statement']);

    // Committed, so the decision below is refusing a request that exists.
    // This test passed for the wrong reason until rejects() started checking
    // the message: the request had been rolled back, so the rejection was
    // "refund request not found" and the self-approval ban was never exercised.
    const id = (await requestAs(admin, order, 5000, 'My own order')).rows[0].id;

    await asUser(admin, async () => {
      await rejects(
        () => q('select public.decide_refund_request($1,$2,$3)', [id, true, 'fine']),
        /cannot decide a refund you requested yourself/i,
      );
    });

    const still = await scalar('select status from public.refund_requests where id = $1', [id]);
    assert(still.status === 'requested',
      `the request became ${still.status}; a self-approval must not go through`);
  });

  await test('declining a refund requires a written reason', async () => {
    const { userId, order } = await paidOrder('Declined Buyer');
    const id = (await requestAs(userId, order, 30000, 'Not for me')).rows[0].id;

    await asUser(admin, async () => {
      await rejects(
        () => q('select public.decide_refund_request($1,$2,$3)', [id, false, '   ']),
        /needs a written reason/i,
      );
    });
  });

  // -------------------------------------------------------------------
  // Approval is a decision, not a payment — the D4 distinction
  // -------------------------------------------------------------------

  await test('approving creates a pending transaction and moves no money', async () => {
    const { userId, order } = await paidOrder('Approved Buyer');
    const id = (await requestAs(userId, order, 30000, 'Duplicate charge')).rows[0].id;

    await asUser(admin, async () => {
      await q('select public.decide_refund_request($1,$2,$3)',
        [id, true, 'Duplicate confirmed on the statement']);

      const txn = await scalar(
        `select status, amount_minor from public.refund_transactions
          where refund_request_id = $1`, [id]);
      assert(txn, 'no refund transaction was created on approval');
      assert(txn.status === 'pending',
        `transaction status was ${txn.status}; approval must not settle it`);
      assert(Number(txn.amount_minor) === 30000, 'amount not carried over');
    });

    // The ledger must not have moved yet. This is the assertion that would fail
    // if approving and settling were collapsed into one step.
    const ledger = await count(
      `select 1 from public.financial_transactions
        where order_id = $1 and transaction_type = 'refund'`, [order]);
    assert(ledger === 0, `approval wrote ${ledger} ledger rows; settling is what writes them`);

    const status = (await q('select status from public.orders where id = $1', [order])).rows[0].status;
    assert(status === 'paid', `order became ${status} before anything was settled`);
  });

  await test('settling writes the ledger entry, links it back, and refunds the order', async () => {
    const { userId, order } = await paidOrder('Settled Buyer');
    const id = (await requestAs(userId, order, 30000, 'Never received access')).rows[0].id;
    await approveAs(admin, id, 'Approved');

    const txnId = await txnIdFor(id);

    await settleAs(admin, txnId, 'PROVIDER-REF-1');

    const ledger = (await q(
      `select amount_minor, direction, status from public.financial_transactions
        where order_id = $1 and transaction_type = 'refund'`, [order])).rows[0];
    assert(ledger, 'no ledger entry was written');
    assert(Number(ledger.amount_minor) === 30000, `ledger amount was ${ledger.amount_minor}`);
    assert(ledger.direction === 'debit', `ledger direction was ${ledger.direction}`);

    // The column that had never been written before this migration.
    const linked = (await q(
      'select financial_transaction_id from public.refund_requests where id = $1', [id])).rows[0];
    assert(linked.financial_transaction_id, 'the request was not linked to its ledger entry');

    const req = (await q('select status from public.refund_requests where id = $1', [id])).rows[0];
    assert(req.status === 'completed', `request status was ${req.status}`);

    const os = (await q('select status from public.orders where id = $1', [order])).rows[0].status;
    assert(os === 'refunded', `order status was ${os}, expected fully refunded`);

    const left = (await q('select public.refundable_amount($1) as n', [order])).rows[0].n;
    assert(Number(left) === 0, `refundable balance is ${left} after a full refund`);
  });

  await test('a partial refund leaves the order partially refunded', async () => {
    const { userId, order } = await paidOrder('Partial Buyer', 40000);
    const id = (await requestAs(userId, order, 15000, 'One of two lessons was missing')).rows[0].id;
    await approveAs(admin, id, 'Agreed');
    const txnId = await txnIdFor(id);
    await settleAs(admin, txnId, 'PROVIDER-REF-2');

    const os = (await q('select status from public.orders where id = $1', [order])).rows[0].status;
    assert(os === 'partially_refunded', `order status was ${os}`);

    const left = (await q('select public.refundable_amount($1) as n', [order])).rows[0].n;
    assert(Number(left) === 25000, `refundable balance is ${left}, expected 25000`);
  });

  await test('settling twice is a no-op rather than a double payment', async () => {
    const { userId, order } = await paidOrder('Retried Buyer');
    const id = (await requestAs(userId, order, 30000, 'Retried webhook')).rows[0].id;
    await approveAs(admin, id, 'Approved');
    const txnId = await txnIdFor(id);
    await settleAs(admin, txnId, 'PROVIDER-REF-3');
    // A provider retries. The second call must not pay twice.
    await settleAs(admin, txnId, 'PROVIDER-REF-3');

    const rows = await count(
      `select 1 from public.financial_transactions
        where order_id = $1 and transaction_type = 'refund'`, [order]);
    assert(rows === 1, `${rows} ledger entries for one refund; a retry must be idempotent`);
  });

  await test('a settled refund cannot be un-settled', async () => {
    const { userId, order } = await paidOrder('Reversing Buyer');
    const id = (await requestAs(userId, order, 30000, 'Then changed my mind back')).rows[0].id;
    await approveAs(admin, id, 'Approved');
    const txnId = await txnIdFor(id);
    await settleAs(admin, txnId, 'PROVIDER-REF-4');

    // Two separate protections, and they have to be asserted separately.
    //
    // First: there is no UPDATE policy on refund_transactions at all, so an
    // authenticated caller cannot write to it even with a privileged role —
    // is_privileged() is used inside policy expressions, it is not an RLS
    // bypass. A blocked UPDATE matches zero rows and raises nothing, so the
    // assertion is that the row is unchanged, not that an error was thrown.
    await asUser(admin, async () => {
      await q(`update public.refund_transactions set status = 'failed', refunded_at = null
                where id = $1`, [txnId]);
      const still = await scalar(
        'select status from public.refund_transactions where id = $1', [txnId]);
      assert(still.status === 'completed',
        `an authenticated caller changed the status to ${still.status}`);
    });

    // Second: the trigger, which is what actually stops the SECURITY DEFINER
    // path (a definer function bypasses RLS but not triggers). To reach it the
    // update has to be attempted where RLS does not apply — superuser — so this
    // runs outside asUser on purpose.
    await rejects(
      () => q(`update public.refund_transactions set status = 'failed', refunded_at = null
                where id = $1`, [txnId]),
      /cannot be un-completed/i,
    );

    const final = await scalar('select status from public.refund_transactions where id = $1', [txnId]);
    assert(final.status === 'completed', `the refund ended up ${final.status}`);
  });

  await test('a buyer cannot read the refund transactions of another order', async () => {
    const a = await paidOrder('First Buyer');
    const b = await paidOrder('Second Buyer');

    await asUser(b.userId, async () => {
      const visible = await count(
        'select 1 from public.refund_transactions where order_id = $1', [a.order]);
      assert(visible === 0,
        `another buyer's refund transactions were visible (${visible} rows)`);
    });
  });

  await test('every refund decision is written to the audit trail', async () => {
    const { userId, order } = await paidOrder('Audited Buyer');
    let id = null;

    // Every step commits, because the audit rows have to survive to the query.
    id = (await asActor(userId,
      'select public.request_refund($1,$2,$3) as id',
      [order, 30000, 'Audit me'])).rows[0].id;
    await asActor(admin,
      'select public.decide_refund_request($1,$2,$3)', [id, true, 'Audited approval']);
    const txnId = await txnIdFor(id);
    await asActor(admin, 'select public.complete_refund($1,$2)', [txnId, 'AUD-REF']);

    const actions = (await q(
      `select string_agg(action, ',' order by action) s
         from public.governance_audit_events
        where target_type in ('refund_request','refund_transaction')
          and target_id in ($1, $2)`, [id, txnId])).rows[0].s;

    assert(actions && actions.includes('refund.requested'), `audit actions were: ${actions}`);
    assert(actions && actions.includes('refund.approved'), `audit actions were: ${actions}`);
    assert(actions && actions.includes('refund.completed'), `audit actions were: ${actions}`);
  });
  // -------------------------------------------------------------------
  // A settled refund takes the course back
  // -------------------------------------------------------------------

  /** Run a refund all the way to settlement and return the transaction id. */
  async function settle(fixture, amountMinor, reason = 'Full refund please') {
    const id = (await requestAs(fixture.userId, fixture.order, amountMinor, reason)).rows[0].id;
    await approveAs(admin, id, 'Agreed');
    const txnId = await txnIdFor(id);
    await settleAs(admin, txnId, 'SETTLED-REF');
    return { requestId: id, txnId };
  }

  await test('a full refund revokes the entitlement the order paid for', async () => {
    const f = await paidOrder('Revoked Buyer');

    const before = await scalar(
      `select status from public.entitlement_grants
        where source_type = 'purchase' and source_id = $1`, [f.order]);
    assert(before && before.status === 'active', `grant was ${before?.status} before refund`);

    await settle(f, f.totalMinor);

    const after = await scalar(
      `select status, revoked_at, revocation_reason from public.entitlement_grants
        where source_type = 'purchase' and source_id = $1`, [f.order]);
    assert(after.status === 'revoked', `grant status was ${after.status} after a full refund`);
    assert(after.revoked_at, 'revoked_at was not set');
    assert(after.revocation_reason, 'revocation_reason was not set');
  });

  await test('a refunded learner can no longer open the lesson', async () => {
    // The row being revoked is not the same as access being closed. This is the
    // assertion that would catch a revocation which updated the table but was
    // never consulted by the access check.
    const f = await paidOrder('Locked Out Buyer');

    const openBefore = (await q(
      'select public.can_access_lesson($1,$2) as ok', [f.learnerId, f.lesson])).rows[0].ok;
    assert(openBefore === true, 'the learner could not open the lesson before the refund');

    await settle(f, f.totalMinor);

    const openAfter = (await q(
      'select public.can_access_lesson($1,$2) as ok', [f.learnerId, f.lesson])).rows[0].ok;
    assert(openAfter === false, 'the learner can still open the lesson after a full refund');
  });

  await test('the enrolment is withdrawn so the course leaves the learning list', async () => {
    const f = await paidOrder('Withdrawn Buyer');
    await settle(f, f.totalMinor);

    const enrolment = await scalar(
      `select status from public.course_enrolments
        where learner_profile_id = $1 and course_version_id = $2`, [f.learnerId, f.version]);
    assert(enrolment.status === 'withdrawn',
      `enrolment was ${enrolment.status}; the learner would still see a course they cannot open`);
  });

  await test('a partial refund leaves access in place', async () => {
    // The terse version of the rule is "a refund revokes access". That is wrong
    // for a partial: someone who paid 40000 and had 15000 returned because a
    // lesson was missing has still paid for the course. Taking it back would be
    // taking money and goods both.
    const f = await paidOrder('Partial Refund Buyer', 40000);
    await settle(f, 15000, 'One lesson was missing');

    const grant = await scalar(
      `select status from public.entitlement_grants
        where source_type = 'purchase' and source_id = $1`, [f.order]);
    assert(grant.status === 'active', `a partial refund revoked access (${grant.status})`);

    const open = (await q(
      'select public.can_access_lesson($1,$2) as ok', [f.learnerId, f.lesson])).rows[0].ok;
    assert(open === true, 'a partial refund closed access');
  });

  await test('revocation is written to the entitlement history', async () => {
    const f = await paidOrder('Audited Revocation');
    const { requestId } = await settle(f, f.totalMinor);
    void requestId;

    const grantId = (await q(
      `select id from public.entitlement_grants
        where source_type = 'purchase' and source_id = $1`, [f.order])).rows[0].id;

    const event = await scalar(
      `select event_type, from_status, to_status, reason from public.entitlement_events
        where entitlement_grant_id = $1 order by occurred_at desc limit 1`, [grantId]);
    assert(event.event_type === 'revoked', `last event was ${event.event_type}`);
    assert(event.from_status === 'active' && event.to_status === 'revoked',
      `transition recorded as ${event.from_status} -> ${event.to_status}`);
  });

  await test('a learner entitled another way keeps access after the refund', async () => {
    // Only the grant this order paid for is revoked. A family entitlement or a
    // scholarship covering the same version still stands, and withdrawing the
    // enrolment too would lock the learner out of something they have a right
    // to open.
    const f = await paidOrder('Doubly Entitled Buyer');

    await q(`insert into public.entitlement_grants
               (learner_profile_id, scope_type, course_version_id,
                source_type, source_id, status, effective_from)
             values ($1,'course_version',$2,'scholarship',$3,'active',now())`,
      [f.learnerId, f.version, f.order]);

    await settle(f, f.totalMinor);

    const open = (await q(
      'select public.can_access_lesson($1,$2) as ok', [f.learnerId, f.lesson])).rows[0].ok;
    assert(open === true, 'access was closed despite an active scholarship grant');

    const enrolment = await scalar(
      `select status from public.course_enrolments
        where learner_profile_id = $1 and course_version_id = $2`, [f.learnerId, f.version]);
    assert(enrolment.status !== 'withdrawn',
      `enrolment was withdrawn although the learner is still entitled (${enrolment.status})`);
  });

  await test('progress survives the refund, because a refund is not a claim the learning did not happen', async () => {
    // D7: grading and certificate history is never deleted.
    const f = await paidOrder('Progress Kept Buyer');

    // lp_completed_means_full requires 100% before a lesson counts as completed.
    await q(`insert into public.lesson_progress
               (course_enrolment_id, lesson_id, status, progress_percent,
                started_at, completed_at)
             select id, $2, 'completed', 100, now() - interval '1 day', now()
               from public.course_enrolments
              where learner_profile_id = $1 and course_version_id = $3`,
      [f.learnerId, f.lesson, f.version]);

    await settle(f, f.totalMinor);

    const kept = await count(
      `select 1 from public.lesson_progress lp
         join public.course_enrolments ce on ce.id = lp.course_enrolment_id
        where ce.learner_profile_id = $1 and lp.lesson_id = $2`, [f.learnerId, f.lesson]);
    assert(kept === 1, `progress rows remaining: ${kept}; a refund must not erase them`);
  });

  await test('revoking twice does not double-count or fail', async () => {
    const f = await paidOrder('Idempotent Revocation');
    await settle(f, f.totalMinor);

    const n = await q('select public.revoke_entitlements_for_refund($1,$2,$3) as n',
      [f.order, admin, 'Refunded in full; access withdrawn.']);
    assert(Number(n.rows[0].n) === 0, `a second revocation touched ${n.rows[0].n} grants`);

    const events = await count(
      `select 1 from public.entitlement_events ee
         join public.entitlement_grants eg on eg.id = ee.entitlement_grant_id
        where eg.source_id = $1 and ee.event_type = 'revoked'`, [f.order]);
    assert(events === 1, `${events} revocation events for one refund`);
  });

  // -------------------------------------------------------------------
  // Who may call the revocation writer at all
  // -------------------------------------------------------------------
  //
  // revoke_entitlements_for_refund() is SECURITY DEFINER owned by postgres and
  // its body trusts its arguments. It was granted to authenticated, which meant
  // any signed-in user could strip any learner's course access on any order and
  // write themselves in as the revoking actor. The grant is now withdrawn; this
  // test is what keeps it withdrawn. Without it, re-granting by accident is
  // invisible: every other test in this suite calls the function at superuser
  // level, where grants do not apply.

  await test('a learner cannot call the revocation writer directly', async () => {
    const f = await paidOrder('Revocation Intruder');

    await asUser(f.userId, async () => {
      await rejects(
        () => q('select public.revoke_entitlements_for_refund($1,$2,$3) as n',
          [f.order, f.userId, 'Taking my own access away from someone else']),
        /permission denied/i,
        'a signed-in learner could invoke a SECURITY DEFINER function that revokes entitlements');
    });

    const stillActive = await count(
      `select 1 from public.entitlement_grants
        where source_type = 'purchase' and source_id = $1 and status = 'active'`, [f.order]);
    assert(stillActive === 1,
      `active grants after the refused call: ${stillActive}; the refusal must leave access untouched`);
  });

  await test('a learner cannot credit earnings by calling the writer directly', async () => {
    const f = await paidOrder('Earnings Intruder A');

    // One rejection per asUser block: the first error aborts the transaction,
    // so a second assertion in the same block reports the abort rather than the
    // refusal it was written to check.
    await asUser(f.userId, async () => {
      await rejects(
        () => q('select public.accrue_instructor_earnings($1,null,$2) as n',
          [f.order, f.userId]),
        /permission denied/i,
        'a signed-in learner could credit earnings by calling the writer directly');
    });
  });

  await test('a learner cannot reverse a teacher\'s earnings directly', async () => {
    const f = await paidOrder('Earnings Intruder B');

    await asUser(f.userId, async () => {
      await rejects(
        () => q('select public.reverse_earnings_for_refund($1,$2,$3) as n',
          [f.order, f.userId, 'Wiping the teacher']),
        /permission denied/i,
        'a signed-in learner could reverse a teacher\'s earnings directly');
    });
  });

}
