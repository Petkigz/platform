// What a payer has paid, and what has not moved yet.
//
// The statement exists because there was no answer to the question a parent
// asks after a refund: what has gone out of my account, and what has come back?
// `/orders` answers "what is this order"; `/admin/money-report` answers for
// staff; nothing answered for the person who paid.
//
// The two rules this suite is really about:
//
//   1. Only money that moved is in the balance. A request is not a refund, an
//      approval is not a transfer, and a refund sent to a provider is not a
//      refund until the provider confirms it.
//   2. It is the caller's own money. A definer function does not run under RLS,
//      so membership is checked inside it — the mistake that once made
//      `my_plan_summary()` return every subscription on the platform.
//
// The invariant test at the end ties the projection to the ledger: whatever the
// statement calls a completed refund is exactly the refund the ledger recorded.

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    asUser, committed,
    newUser, newProfile, bootstrapAdmin,
  } = ctx;

  const admin = await bootstrapAdmin('stmt-admin@example.com');

  const scalar = async (sql, params = []) => (await q(sql, params)).rows[0];
  const one = async (sql, params = []) => (await q(sql, params)).rows[0].n;

  /** Act as a user and COMMIT: later steps need the row to still be there. */
  async function asActor(actor, sql, params = []) {
    await q('begin');
    await q("select set_config('request.jwt.claims',$1,true)", [
      JSON.stringify({ sub: actor, role: 'authenticated' }),
    ]);
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

  const statementFor = (actor, account = null) =>
    asActor(actor, 'select public.my_statement($1) s', [account]).then((r) => r.rows[0].s);

  let seq = 0;
  let productId = null;

  /** One product is enough: `order_items` needs a target, not a whole course. */
  const product = async () => {
    if (!productId) {
      productId = (await scalar(
        `insert into public.products (product_type, name, status, created_by)
         values ('course','Statement course','active',$1) returning id`, [admin])).id;
    }
    return productId;
  };

  /** A billing account with its creator as an active member. */
  async function newAccount(name) {
    seq += 1;
    const userId = await newUser(`stmt-${seq}@example.com`);
    await newProfile(userId, name);
    const account = (await scalar(
      `insert into public.billing_accounts (display_name, billing_currency, status, created_by)
       values ($1,'UGX','active',$2) returning id`,
      [name, userId])).id;
    return { userId, account };
  }

  /**
   * A paid, captured order on an account.
   *
   * `record_payment_success()` is the only path that can move an order to paid,
   * and it writes both the evidence columns and the capture row the refund
   * ceiling reads. Reaching around it with an UPDATE would test a fiction.
   */
  async function paidOrder(account, { totalMinor = 30000, currency = 'UGX', title = 'A course', actor = admin } = {}) {
    const order = (await scalar(
      `insert into public.orders (billing_account_id, currency_code, subtotal_minor, total_minor, status)
       values ($1,$2,$3,$3,'pending_payment') returning id`,
      [account, currency, totalMinor])).id;
    await q(
      `insert into public.order_items
         (order_id, product_id, quantity, unit_price_minor, currency_code,
          discount_minor, line_total_minor, item_snapshot)
       values ($1,$2,1,$3,$4,0,$3,$5)`,
      [order, await product(), totalMinor, currency, JSON.stringify({ title })]);
    await q('select id from public.record_payment_success($1,$2,$3,$4,null,$5)',
      [order, actor, 'manual', `REF-STMT-${seq}-${totalMinor}`, 'Bank statement']);
    return order;
  }

  /** A refund asked for by the payer, and left for the tests to move on. */
  const askRefund = (buyer, order, amount, reason = 'Changed my mind') =>
    asActor(buyer, 'select public.request_refund($1,$2,$3) id', [order, amount, reason])
      .then((r) => r.rows[0].id);

  const approveRefund = (staff, requestId) =>
    asActor(staff, 'select public.decide_refund_request($1,true,$2)', [requestId, 'Agreed'])
      .then(async () => (await scalar(
        'select id from public.refund_transactions where refund_request_id = $1',
        [requestId])).id);

  const settleRefund = (staff, txnId) =>
    asActor(staff, 'select public.complete_refund($1,$2,$3)',
      [txnId, `REF-OUT-${txnId.slice(0, 8)}`, staff]);

  const currencyOf = (statement, code) =>
    statement.accounts[0].currencies.find((c) => c.currencyCode === code);

  // -------------------------------------------------------------------------
  console.log('\nWho may read it');
  // -------------------------------------------------------------------------

  await test('a statement needs a signed-in person', async () => {
    await rejects(() => q('select public.my_statement()'), /sign in to read/i);
  });

  await test("another family's account cannot be asked for by name", async () => {
    const mine = await newAccount('Statement Mine');
    const theirs = await newAccount('Statement Theirs');
    await paidOrder(theirs.account, { totalMinor: 50000 });

    await rejects(() => statementFor(mine.userId, theirs.account),
      /you are not a member of that billing account/i);

    // And with no argument it simply is not there.
    const statement = await statementFor(mine.userId);
    const ids = statement.accounts.map((a) => a.billingAccountId);
    assert(!ids.includes(theirs.account),
      "another family's account appeared in the statement");
  });

  await test("staff do not get somebody else's statement through this function", async () => {
    // The owner is staff and is on their own account. This function answers
    // "what did I pay", and staff have `/admin/money-report` for the rest.
    const family = await newAccount('Statement Family');
    await paidOrder(family.account, { totalMinor: 42000 });

    const statement = await statementFor(admin);
    const ids = statement.accounts.map((a) => a.billingAccountId);
    assert(!ids.includes(family.account),
      'a staff account saw a family it is not a member of');
  });

  // -------------------------------------------------------------------------
  console.log('\nMoney that moved');
  // -------------------------------------------------------------------------

  await test('a paid order is one charge, and the balance is net of nothing', async () => {
    const { userId, account } = await newAccount('Statement Payer');
    await paidOrder(account, { totalMinor: 30000, title: 'Qur\u2019an for beginners' });

    const statement = await statementFor(userId);
    assert(statement.accounts.length === 1, `saw ${statement.accounts.length} accounts`);

    const ugx = currencyOf(statement, 'UGX');
    assert(ugx, 'no UGX section');
    assert(ugx.chargedMinor === '30000', `charged ${ugx.chargedMinor}`);
    assert(ugx.refundedMinor === '0', `refunded ${ugx.refundedMinor}`);
    assert(ugx.netMinor === '30000', `net ${ugx.netMinor}`);
    assert(ugx.moved.length === 1, `${ugx.moved.length} movements`);

    const charge = ugx.moved[0];
    assert(charge.kind === 'charge' && charge.direction === 'out',
      `the row was ${charge.kind}/${charge.direction}`);
    assert(charge.amountMinor === '30000', `row amount ${charge.amountMinor}`);
    assert(charge.description === 'Qur\u2019an for beginners',
      `row said ${JSON.stringify(charge.description)}`);
    assert(charge.runningMinor === '30000', `running total ${charge.runningMinor}`);
    assert(typeof charge.orderNumber === 'string' && charge.orderNumber.length > 0,
      'the movement names no order');
  });

  await test('a refund that was completed moves the balance, and the running total is the net', async () => {
    const { userId, account } = await newAccount('Statement Refunded');
    const order = await paidOrder(account, { totalMinor: 90000, title: 'Arabic grammar' });
    const request = await askRefund(userId, order, 30000);
    const txn = await approveRefund(admin, request);
    await settleRefund(admin, txn);

    const ugx = currencyOf(await statementFor(userId), 'UGX');
    assert(ugx.chargedMinor === '90000', `charged ${ugx.chargedMinor}`);
    assert(ugx.refundedMinor === '30000', `refunded ${ugx.refundedMinor}`);
    assert(ugx.netMinor === '60000', `net ${ugx.netMinor}`);

    const refund = ugx.moved.find((m) => m.kind === 'refund');
    assert(refund, 'the completed refund is not in the movements');
    assert(refund.direction === 'in', `direction ${refund.direction}`);
    assert(refund.amountMinor === '30000', `amount ${refund.amountMinor}`);
    // Rule 3: the last running total is the net, so the page's arithmetic can
    // be checked by the reader.
    assert(refund.runningMinor === '60000', `running total ${refund.runningMinor}`);
    assert(ugx.moved.length === 2, `${ugx.moved.length} movements`);
  });

  await test('the statement calls a refund complete exactly when the ledger has one', async () => {
    // The projection reads refund_transactions; the ledger is written by a
    // trigger from the same change. If the two ever diverge, one of them is
    // lying to somebody — and this is the test that would say so.
    const { userId, account } = await newAccount('Statement Ledger');
    const order = await paidOrder(account, { totalMinor: 50000 });
    const request = await askRefund(userId, order, 20000);
    const txn = await approveRefund(admin, request);
    await settleRefund(admin, txn);

    const ugx = currencyOf(await statementFor(userId), 'UGX');
    const promised = BigInt(ugx.refundedMinor);

    const ledger = (await scalar(
      `select coalesce(sum(amount_minor),0)::text total
         from public.financial_transactions
        where order_id = $1 and transaction_type = 'refund' and status = 'settled'`,
      [order])).total;

    assert(BigInt(ledger) === promised,
      `the statement says ${promised} came back and the ledger says ${ledger}`);
  });

  // -------------------------------------------------------------------------
  console.log('\nMoney that has not moved');
  // -------------------------------------------------------------------------

  await test('an undecided request is listed, said in words, and does not move the balance', async () => {
    const { userId, account } = await newAccount('Statement Waiting');
    const order = await paidOrder(account, { totalMinor: 40000 });
    await askRefund(userId, order, 15000, 'The lessons are not what I expected');

    const ugx = currencyOf(await statementFor(userId), 'UGX');
    // The whole point: asking is not getting.
    assert(ugx.netMinor === '40000', `the balance moved to ${ugx.netMinor} on a request`);
    assert(ugx.refundedMinor === '0', `refunded reads ${ugx.refundedMinor}`);
    assert(ugx.moved.length === 1, 'the request was counted as a movement');

    const waiting = ugx.notYetMoney;
    assert(waiting.length === 1, `${waiting.length} waiting rows`);
    assert(waiting[0].kind === 'refund_request', `kind was ${waiting[0].kind}`);
    assert(waiting[0].status === 'requested', `status was ${waiting[0].status}`);
    assert(waiting[0].amountMinor === '15000', `amount ${waiting[0].amountMinor}`);
    assert(/nobody has decided/i.test(waiting[0].says), `it said ${waiting[0].says}`);
    assert(waiting[0].reason === 'The lessons are not what I expected',
      'the reason the customer gave is not shown back to them');
  });

  await test('an approved refund that nobody has sent still does not move the balance', async () => {
    const { userId, account } = await newAccount('Statement Approved');
    const order = await paidOrder(account, { totalMinor: 40000 });
    const request = await askRefund(userId, order, 25000);
    await approveRefund(admin, request); // approved, provider never confirms

    const ugx = currencyOf(await statementFor(userId), 'UGX');
    assert(ugx.netMinor === '40000',
      `an approval moved the balance to ${ugx.netMinor}; approval is not a transfer`);
    assert(ugx.refundedMinor === '0', `refunded reads ${ugx.refundedMinor}`);
    assert(ugx.moved.length === 1, 'the approved refund was counted as money');

    // It is represented once, by the transaction the approval created, and not
    // twice by the request beside it.
    assert(ugx.notYetMoney.length === 1, `${ugx.notYetMoney.length} waiting rows`);
    assert(ugx.notYetMoney[0].kind === 'refund', `kind was ${ugx.notYetMoney[0].kind}`);
    assert(ugx.notYetMoney[0].status === 'pending', `status ${ugx.notYetMoney[0].status}`);
    assert(/waiting for it to confirm/i.test(ugx.notYetMoney[0].says),
      `it said ${ugx.notYetMoney[0].says}`);
  });

  await test('a refund the provider refused is shown as refused, not left in silence', async () => {
    const { userId, account } = await newAccount('Statement Failed');
    const order = await paidOrder(account, { totalMinor: 40000 });
    const request = await askRefund(userId, order, 10000);
    const txn = await approveRefund(admin, request);

    // Nothing has an UPDATE policy on refund_transactions, so a failure is the
    // provider's answer arriving through the writer.
    await q(`update public.refund_transactions
                set status = 'failed', refunded_at = null
              where id = $1`, [txn]);

    const ugx = currencyOf(await statementFor(userId), 'UGX');
    assert(ugx.netMinor === '40000', `a failed refund moved the balance to ${ugx.netMinor}`);
    const failed = ugx.notYetMoney.find((w) => w.kind === 'refund');
    assert(failed && failed.status === 'failed', 'the failed refund is not listed');
    assert(/nothing was returned/i.test(failed.says), `it said ${failed.says}`);
  });

  await test('a declined request says so, and not what staff wrote to each other', async () => {
    const { userId, account } = await newAccount('Statement Declined');
    const order = await paidOrder(account, { totalMinor: 30000 });
    const request = await askRefund(userId, order, 10000, 'I would like it back');
    await asActor(admin, 'select public.decide_refund_request($1,false,$2)',
      [request, 'Customer has used four of eighteen lessons; decline per policy']);

    const ugx = currencyOf(await statementFor(userId), 'UGX');
    assert(ugx.netMinor === '30000', 'a declined request moved the balance');
    const declined = ugx.notYetMoney.find((w) => w.kind === 'refund_request');
    assert(declined && declined.status === 'rejected', 'the decline is not listed');
    assert(/declined/i.test(declined.says), `it said ${declined.says}`);
    // The decider's note is a note to colleagues. It must not be handed to the
    // customer as if it were written for them.
    const asText = JSON.stringify(ugx);
    assert(!asText.includes('four of eighteen'),
      'staff working notes were handed to the customer');
    // Their own words, on the other hand, come back to them.
    assert(declined.reason === 'I would like it back', 'the customer reason was dropped');
  });

  await test('a bank dispute is listed, and the record says it has no entry for it', async () => {
    const { userId, account } = await newAccount('Statement Disputed');
    const order = await paidOrder(account, { totalMinor: 50000 });
    const capture = (await scalar(
      `select id from public.financial_transactions
        where order_id = $1 and transaction_type = 'capture' limit 1`, [order])).id;
    await q(
      `insert into public.payment_disputes
         (financial_transaction_id, order_id, dispute_type, provider,
          disputed_amount_minor, currency_code, status)
       values ($1,$2,'chargeback','mtn',50000,'UGX','open')`,
      [capture, order]);

    const ugx = currencyOf(await statementFor(userId), 'UGX');
    assert(ugx.netMinor === '50000', 'an open dispute moved the balance');
    const dispute = ugx.notYetMoney.find((w) => w.kind === 'dispute');
    assert(dispute, 'the dispute is not listed at all');
    assert(dispute.amountMinor === '50000', `dispute amount ${dispute.amountMinor}`);
    assert(/nothing has moved/i.test(dispute.says), `it said ${dispute.says}`);
  });

  // -------------------------------------------------------------------------
  console.log('\nCurrencies and shape');
  // -------------------------------------------------------------------------

  await test('two currencies are two sections, never one added number', async () => {
    const { userId, account } = await newAccount('Statement Two Currencies');
    await paidOrder(account, { totalMinor: 90000, currency: 'UGX' });
    await paidOrder(account, { totalMinor: 2000, currency: 'USD' });

    const statement = await statementFor(userId);
    const currencies = statement.accounts[0].currencies;
    assert(currencies.length === 2, `${currencies.length} currency sections`);
    const codes = currencies.map((c) => c.currencyCode).sort();
    assert(codes.join(',') === 'UGX,USD', `sections were ${codes.join(',')}`);

    const ugx = currencyOf(statement, 'UGX');
    const usd = currencyOf(statement, 'USD');
    assert(ugx.chargedMinor === '90000', `UGX charged ${ugx.chargedMinor}`);
    assert(usd.chargedMinor === '2000', `USD charged ${usd.chargedMinor}`);
    // Each currency's running total stays inside its own currency.
    assert(ugx.moved[0].runningMinor === '90000', `UGX running ${ugx.moved[0].runningMinor}`);
    assert(usd.moved[0].runningMinor === '2000', `USD running ${usd.moved[0].runningMinor}`);
  });

  await test('an account with no orders is an empty statement, not an error', async () => {
    const { userId } = await newAccount('Statement Empty');
    const statement = await statementFor(userId);
    assert(statement.accounts.length === 1, 'the account vanished when it was empty');
    assert(statement.accounts[0].currencies.length === 0,
      `an empty account had ${statement.accounts[0].currencies.length} currency sections`);
    assert(typeof statement.generatedAt === 'string', 'no generatedAt');
  });

  await test('an unpaid order is not a charge', async () => {
    const { userId, account } = await newAccount('Statement Unpaid');
    await q(
      `insert into public.orders (billing_account_id, currency_code, subtotal_minor, total_minor, status)
       values ($1,'UGX',15000,15000,'pending_payment')`, [account]);

    const ugx = currencyOf(await statementFor(userId), 'UGX');
    assert(!ugx, 'an unpaid order created a currency section');
  });

  // -------------------------------------------------------------------------
  console.log('\nA closed account keeps the record, and loses the person');
  // -------------------------------------------------------------------------

  await test('a revoked membership can no longer read the statement', async () => {
    const { userId, account } = await newAccount('Statement Revoked');
    await paidOrder(account, { totalMinor: 20000 });
    // Account erasure revokes the membership rather than deleting it; the
    // financial record survives, as it must, but the person cannot read it.
    await q(`update public.billing_account_memberships set status = 'revoked'
             where billing_account_id = $1 and user_id = $2`, [account, userId]);

    const statement = await statementFor(userId);
    assert(statement.accounts.length === 0,
      'a revoked member still reads the account they were removed from');
    await rejects(() => statementFor(userId, account), /not a member/i);

    // And the money is still on the account for whoever is still on it.
    const order = await one('select count(*)::int n from public.orders where billing_account_id = $1',
      [account]);
    assert(order === 1, 'the order was removed with the membership');
  });
}
