// What is waiting for a human.
//
// Each queue in this platform has a page that says what is in it. None of them
// says *that there is anything in it*, so an owner signs in with thirteen
// places to look. This suite pins the one call that answers it — and, more
// importantly, pins that the answer is different for different people. A count
// of refunds is information about the business, not a label to hide.

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    bootstrapAdmin, newUser, newProfile, grantRole, committed, newInstructor,
  } = ctx;

  const admin = await bootstrapAdmin('att-admin@example.com');
  const teacher = await newInstructor('att-teacher@example.com', admin);

  const scalar = async (sql, params = []) => (await q(sql, params)).rows[0];

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

  async function staffWith(code) {
    const userId = await newUser(`att-${code}-${crypto.randomUUID().slice(0, 6)}@example.com`);
    await newProfile(userId, code);
    await committed(() => grantRole(userId, code, admin));
    return userId;
  }

  const attention = (actor) =>
    asActor(actor, 'select public.staff_attention() a').then((r) => r.rows[0].a);
  const queue = (result, code) => result.queues.find((x) => x.code === code);

  // -------------------------------------------------------------------------
  console.log('\nPermission is the filter');
  // -------------------------------------------------------------------------

  await test('only platform staff have queues at all', async () => {
    const learner = await newUser('att-learner@example.com');
    await newProfile(learner, 'Learner');
    await rejects(() => q('select public.staff_attention()'), /sign in to/i);
    await rejects(
      () => asActor(learner, 'select public.staff_attention()'),
      /only platform staff/i);
    await rejects(
      () => asActor(teacher, 'select public.staff_attention()'),
      /only platform staff/i);
  });

  await test('a support agent gets support, and no money at all', async () => {
    const support = await staffWith('support_agent');
    const result = await attention(support);
    assert(queue(result, 'support'), 'a support agent has no support queue');
    for (const code of ['refunds', 'disputes', 'reconciliation', 'payouts']) {
      assert(!queue(result, code),
        `a support agent was shown the ${code} count`);
    }
    assert(result.canSeeFinance === false);
    assert(result.canSeeSupport === true);
    assert(result.canSeeGovernance === false);
  });

  await test('a finance admin gets money, and no support or governance', async () => {
    const finance = await staffWith('finance_admin');
    const result = await attention(finance);
    for (const code of ['refunds', 'disputes', 'reconciliation', 'payouts']) {
      assert(queue(result, code), `a finance admin has no ${code} queue`);
    }
    assert(!queue(result, 'support'), 'a finance admin was shown the support count');
    assert(!queue(result, 'appeals'), 'a finance admin was shown the appeals count');
    assert(!queue(result, 'guardians'), 'a finance admin was shown the guardians count');
    // Content moderation is open to any privileged role.
    assert(queue(result, 'reports'), 'a finance admin cannot see reported content');
  });

  await test('a governance admin gets appeals, credentials and guardians', async () => {
    const governance = await staffWith('governance_admin');
    const result = await attention(governance);
    for (const code of ['appeals', 'credentials', 'guardians']) {
      assert(queue(result, code), `a governance admin has no ${code} queue`);
    }
    assert(!queue(result, 'refunds'), 'a governance admin was shown the refund count');
    assert(!queue(result, 'support'), 'a governance admin was shown the support count');
  });

  await test('the owner gets everything', async () => {
    const result = await attention(admin);
    for (const code of ['refunds', 'disputes', 'reconciliation', 'payouts',
      'support', 'appeals', 'credentials', 'guardians',
      'reports', 'reviews', 'media']) {
      assert(queue(result, code), `the owner has no ${code} queue`);
    }
    assert(result.queues.length === 11, `the owner saw ${result.queues.length} queues`);
  });

  // -------------------------------------------------------------------------
  console.log('\nThe counts');
  // -------------------------------------------------------------------------

  await test('a queue counts what a person would have to work', async () => {
    const before = await attention(admin);
    const person = await newUser('att-refund@example.com');
    await newProfile(person, 'Refunder');

    const account = (await scalar(
      `insert into public.billing_accounts
         (display_name, billing_country, billing_currency, status, created_by)
       values ('Attention household','UG','UGX','active',$1) returning id`,
      [person])).id;
    // A paid order needs its own evidence (`orders_paid_agrees`,
    // `orders_paid_has_evidence`), and the refund ceiling reads the ledger, not
    // the order — so the capture is the thing that makes 1 000 refundable.
    const orderId = (await scalar(
      `insert into public.orders
         (billing_account_id, currency_code, subtotal_minor, total_minor,
          status, paid_at, payment_evidence)
       values ($1,'UGX',90000,90000,'paid', now(), 'attention-test') returning id`,
      [account])).id;
    await q(
      `insert into public.financial_transactions
         (order_id, billing_account_id, transaction_type, direction,
          amount_minor, currency_code, status)
       values ($1,$2,'capture','credit',90000,'UGX','settled')`, [orderId, account]);

    // Two refund requests, one already approved; only the requested one waits.
    for (const status of ['requested', 'requested', 'approved']) {
      await q(
        `insert into public.refund_requests
           (order_id, requested_by, requested_amount_minor, currency_code, reason, status)
         values ($1,$2,1000,'UGX','A reason',$3)`, [orderId, person, status]);
    }

    const after = await attention(admin);
    const added = queue(after, 'refunds').count - queue(before, 'refunds').count;
    assert(added === 2, `the refund queue moved by ${added}, not 2`);
    // And the total tracks the rows.
    assert(after.waitingCount === queue(after, 'refunds').count + queue(after, 'disputes').count +
      queue(after, 'reconciliation').count + queue(after, 'payouts').count +
      queue(after, 'support').count + queue(after, 'appeals').count +
      queue(after, 'credentials').count + queue(after, 'guardians').count +
      queue(after, 'reports').count + queue(after, 'reviews').count +
      queue(after, 'media').count,
      'the total is not the sum of the queues');
  });

  await test('a queue is still reported when it is empty', async () => {
    const result = await attention(admin);
    // Every queue the owner may work is present whatever it holds. A card that
    // vanished at zero would be indistinguishable from a queue that does not
    // exist, and the reader would have to remember which ones are missing —
    // there is no other queue, so the suite running before this one may well
    // have left media in the media queue.
    const expected = ['refunds', 'disputes', 'reconciliation', 'payouts', 'support',
      'appeals', 'credentials', 'guardians', 'reports', 'reviews', 'media'];
    const seen = result.queues.map((row) => row.code).sort();
    assert(seen.join(',') === [...expected].sort().join(','),
      `the owner saw ${seen.join(', ')}`);
    // Zero is an answer, and every row carries the page that drains it.
    for (const row of result.queues) {
      assert(typeof row.count === 'number' && row.count >= 0,
        `${row.code} carries no count`);
      assert(row.href.startsWith('/'), `${row.code} has no page: ${row.href}`);
      assert(row.detail && row.detail.length > 10, `${row.code} says nothing about itself`);
    }
    // `attention_row` is the only place a row is built, so a drained queue keeps
    // exactly the shape a busy one has — including the count of 0 that this is
    // all about.
    const empty = (await scalar(
      "select public.attention_row('empty','Nothing',0,'/admin','Nothing here yet.',null,false) row")).row;
    assert(empty.count === 0, `a zero row counted ${empty.count}`);
    assert(empty.label === 'Nothing' && empty.dormant === false,
      'a zero row lost its shape');
  });

  await test('a queue whose feature is off is marked dormant, not hidden', async () => {
    const result = await attention(admin);
    const payouts = queue(result, 'payouts');
    assert(payouts.feature === 'teaching.payouts', `feature was ${payouts.feature}`);
    assert(payouts.dormant === true,
      'payouts are off, but the queue did not say it was dormant');

    const support = queue(result, 'support');
    assert(support.dormant === true, 'support is off but the queue did not say so');

    // A queue with no feature has nothing to be dormant about.
    const appeals = queue(result, 'appeals');
    assert(appeals.feature === null && appeals.dormant === false);
  });

  await test('turning a feature on clears the dormant mark, and leaves the count', async () => {
    const before = queue(await attention(admin), 'media');
    await q("update public.platform_settings set value_text='true' where key='learning.reviews'");
    const reviews = queue(await attention(admin), 'reviews');
    assert(reviews.dormant === false, 'reviews are on but the queue still reads dormant');
    await q("update public.platform_settings set value_text='false' where key='learning.reviews'");
    const after = queue(await attention(admin), 'media');
    assert(after.count === before.count, 'the count moved when a feature was flipped');
  });
}
