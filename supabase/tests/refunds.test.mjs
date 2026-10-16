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
    return userId;
  }

  /** A billing account whose creator is a member, plus a paid, captured order. */
  async function paidOrder(name, totalMinor = 30000) {
    const userId = await newAdult(name);
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
    await newLesson(section);
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

    return { userId, account, order, totalMinor };
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
    const stranger = await newAdult('Unrelated Stranger');

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
    const stranger = await newAdult('Direct Inserter');

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
    const userId = await newAdult('Unpaid Order Holder');
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
      await rejects(
        () => q('select public.decide_refund_request($1,$2,$3)', [id, true, 'why not']),
        /only staff may decide/i,
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
}
