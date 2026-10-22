// Asking to be paid.
//
// The earnings statement shows what a teacher has earned. This is the other
// half: the request, the hold that keeps a refund from being paid out first,
// and the one function that is allowed to mark an earning `paid`.
//
// The rule under test throughout is that a request moves no money. Only
// `complete_instructor_payout`, by finance, with a provider reference, can.

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    bootstrapAdmin, newUser, newProfile, newInstructor, grantRole, committed,
  } = ctx;

  const admin = await bootstrapAdmin('pay-admin@example.com');
  const finance = await newUser('pay-finance@example.com');
  await newProfile(finance, 'Finance');
  await committed(() => grantRole(finance, 'finance_admin', admin));
  const teacher = await newInstructor('pay-teacher@example.com', admin);

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

  const options = (actor) =>
    asActor(actor, 'select public.my_payout_options() o').then((r) => r.rows[0].o);
  const history = (actor) =>
    asActor(actor, 'select public.my_payouts(20) h').then((r) => r.rows[0].h);
  const request = (actor, currency, destination = 'MTN MoMo 0772 000 000', ack = true) =>
    asActor(actor, 'select public.request_instructor_payout($1,$2,$3) p',
      [currency, destination, ack]).then((r) => r.rows[0].p);

  async function accrue(instructor, { gross, currency = 'UGX', daysAgo = 40, share = 50 }) {
    const net = Math.round((gross * share) / 100);
    return (await scalar(
      `insert into public.instructor_earnings_entries
         (instructor_user_id, gross_amount_minor, currency_code,
          revenue_share_percent, net_amount_minor, status, accrued_at)
       values ($1,$2,$3,$4,$5,'accrued', now() - make_interval(days => $6)) returning id`,
      [instructor, gross, currency, share, net, daysAgo])).id;
  }

  async function setFlag(key, value) {
    await q('update public.platform_settings set value_text = $1 where key = $2', [value, key]);
  }

  // `teaching.payouts` is CODE-gated: the trigger refuses to enable it from the
  // application at any privilege level. A deploy sets this marker, so the suite
  // sets it too, and puts the platform back afterwards.
  await q("select set_config('app.bypassing_code_flag','on',false)");
  await setFlag('teaching.payouts', 'true');
  await setFlag('teaching.payout_hold_days', '14');

  await test('an earning inside its refund hold is not payable yet', async () => {
    const person = await newInstructor('pay-hold@example.com', admin);
    await accrue(person, { gross: 20000, daysAgo: 40 });   // payable
    await accrue(person, { gross: 10000, daysAgo: 2 });    // still held

    const o = await options(person);
    assert(o.payoutsEnabled === true, 'the options do not reflect the flag');
    assert(Number(o.holdDays) === 14, `hold read as ${o.holdDays}`);
    const ugx = o.currencies.find((c) => c.currency === 'UGX');
    assert(Number(ugx.eligibleMinor) === 10000,
      `eligible was ${ugx.eligibleMinor}; only the 40-day-old 20,000 at 50% is out of hold`);
    assert(Number(ugx.eligibleEntries) === 1);
    assert(Number(ugx.heldMinor) === 5000, `held was ${ugx.heldMinor}`);
    assert(ugx.nextEligibleAt !== null, 'a held entry has no date it becomes payable');
  });

  await test('requesting needs the flag, a destination, a currency and a tax acknowledgement', async () => {
    const person = await newInstructor('pay-guards@example.com', admin);
    await accrue(person, { gross: 20000, daysAgo: 40 });

    await setFlag('teaching.payouts', 'false');
    await rejects(() => request(person, 'UGX'), /not switched on/i);
    await setFlag('teaching.payouts', 'true');

    await rejects(() => request(person, 'UGX', '  '), /where the money should go/i);
    await rejects(() => request(person, 'UGX', 'MoMo 0772', false), /your own responsibility/i);
    await rejects(() => request(person, 'X'), /currency/i);
    await rejects(() => request(person, 'USD'), /nothing to pay out/i);
  });

  await test('a request is a statement of intent, not a payment', async () => {
    const person = await newInstructor('pay-request@example.com', admin);
    const kept = await accrue(person, { gross: 30000, daysAgo: 40 });
    await accrue(person, { gross: 5000, daysAgo: 1 });

    const id = await request(person, 'UGX', 'Airtel Money 0700 111 222');
    const row = await scalar(`select status, amount_minor::text a, currency_code,
                                     tax_ack_at is not null ack, requested_at is not null asked
                                from public.instructor_payouts where id = $1`, [id]);
    assert(row.status === 'scheduled', `status was ${row.status}`);
    assert(Number(row.a) === 15000, `the request is for ${row.a}; only out-of-hold earnings count`);
    assert(row.currency_code.trim() === 'UGX');
    assert(row.ack === true && row.asked === true);

    // Nothing moved: the earning is still owed, not paid.
    const after = await scalar('select status from public.instructor_earnings_entries where id = $1', [kept]);
    assert(after.status === 'accrued', `the earning became ${after.status} on a request`);
  });

  await test('one open request per currency, and a second currency is its own request', async () => {
    const person = await newInstructor('pay-once@example.com', admin);
    await accrue(person, { gross: 20000, daysAgo: 40, currency: 'UGX' });
    await accrue(person, { gross: 4000, daysAgo: 40, currency: 'USD' });

    await request(person, 'UGX');
    await rejects(() => request(person, 'UGX'), /already have a payout waiting/i);
    const usd = await request(person, 'USD');
    assert(usd, 'a different currency was refused');
  });

  await test('a teacher may cancel their own request, and nobody else\'s', async () => {
    const person = await newInstructor('pay-cancel@example.com', admin);
    const other = await newInstructor('pay-cancel-other@example.com', admin);
    await accrue(person, { gross: 20000, daysAgo: 40 });

    const id = await request(person, 'UGX');
    await rejects(
      () => asActor(other, 'select public.cancel_instructor_payout($1)', [id]),
      /not yours/i);

    const result = await asActor(person, 'select public.cancel_instructor_payout($1) r', [id])
      .then((r) => r.rows[0].r);
    assert(result.status === 'cancelled');

    // Cancelled frees the currency again.
    const again = await request(person, 'UGX');
    assert(again, 'a cancelled request still blocks a new one');
  });

  await test('only finance reads the queue, and it shows what is payable today', async () => {
    const person = await newInstructor('pay-queue@example.com', admin);
    await accrue(person, { gross: 20000, daysAgo: 40 });
    const id = await request(person, 'UGX');

    await rejects(
      () => asActor(person, 'select public.instructor_payout_queue(50)'),
      /only a finance admin or platform admin/i);
    await rejects(
      () => asActor(admin, 'select public.instructor_payout_queue(0)'),
      /between 1 and 200/i);

    const queue = await asActor(finance, 'select public.instructor_payout_queue(50) q')
      .then((r) => r.rows[0].q);
    const row = queue.payouts.find((p) => p.id === id);
    assert(row, 'the request is not in the queue');
    assert(row.teacherName === 'Test User', `teacher name was ${row.teacherName}`);
    assert(Number(row.eligibleNowMinor) === 10000, `eligible now was ${row.eligibleNowMinor}`);
  });

  await test('completing a payout is the only thing that marks an earning paid', async () => {
    const person = await newInstructor('pay-complete@example.com', admin);
    const entry = await accrue(person, { gross: 20000, daysAgo: 40 });
    const id = await request(person, 'UGX');

    await rejects(
      () => asActor(person, 'select public.complete_instructor_payout($1,$2,$3)', [id, 'MTN', 'REF1']),
      /only a finance admin or platform admin/i);
    await rejects(
      () => asActor(finance, 'select public.complete_instructor_payout($1,$2,$3)', [id, '', 'REF1']),
      /provider that sent it/i);

    // A new earning inside the hold must not be swept into the payment.
    await accrue(person, { gross: 1000, daysAgo: 1 });

    const done = await asActor(finance, 'select public.complete_instructor_payout($1,$2,$3) r',
      [id, 'MTN MoMo', 'MOMO-9001']).then((r) => r.rows[0].r);
    assert(done.status === 'completed', `status was ${done.status}`);
    assert(Number(done.amountMinor) === 10000, `paid ${done.amountMinor}`);

    const paid = await scalar('select status from public.instructor_earnings_entries where id = $1', [entry]);
    assert(paid.status === 'paid', `the earning is ${paid.status}`);

    const row = await scalar(`select status, provider, provider_reference, amount_minor::text a,
                                     completed_at is not null done
                                from public.instructor_payouts where id = $1`, [id]);
    assert(row.status === 'completed' && row.done === true);
    assert(row.provider === 'MTN MoMo' && row.provider_reference === 'MOMO-9001');
    assert(Number(row.a) === 10000, 'the payout amount was not reconciled to the ledger');

    // And it cannot happen twice.
    await rejects(
      () => asActor(finance, 'select public.complete_instructor_payout($1,$2,$3)', [id, 'MTN', 'X']),
      /already completed/i);
  });

  await test('after payment the statement agrees: nothing eligible, an amount paid', async () => {
    const person = await newInstructor('pay-after@example.com', admin);
    await accrue(person, { gross: 20000, daysAgo: 40 });
    const id = await request(person, 'UGX');
    await asActor(finance, 'select public.complete_instructor_payout($1,$2,$3)', [id, 'MTN', 'R-2']);

    const o = await options(person);
    const ugx = o.currencies.find((c) => c.currency === 'UGX');
    assert(Number(ugx.eligibleMinor) === 0, `still eligible: ${ugx.eligibleMinor}`);
    assert(ugx.openPayout === null, 'a completed payout is still open');

    const earnings = await asActor(person, 'select public.my_earnings(50) e')
      .then((r) => r.rows[0].e);
    const total = earnings.byCurrency.find((c) => c.currency === 'UGX');
    assert(Number(total.paidMinor) === 10000, `paid shows ${total.paidMinor}`);
    assert(Number(total.owedMinor) === 0, `owed shows ${total.owedMinor}`);
    assert(earnings.nothingPaidYet === false);
  });

  await test('a failed payout leaves the earnings owed and says why', async () => {
    const person = await newInstructor('pay-fail@example.com', admin);
    await accrue(person, { gross: 20000, daysAgo: 40 });
    const id = await request(person, 'UGX');

    await rejects(
      () => asActor(finance, 'select public.fail_instructor_payout($1,$2)', [id, '  ']),
      /say why the payout failed/i);

    await asActor(finance, 'select public.fail_instructor_payout($1,$2)', [id, 'Number closed']);
    const row = await scalar(`select status, failure_reason from public.instructor_payouts where id = $1`, [id]);
    assert(row.status === 'failed' && row.failure_reason === 'Number closed');

    const o = await options(person);
    const ugx = o.currencies.find((c) => c.currency === 'UGX');
    assert(Number(ugx.eligibleMinor) === 10000, 'a failed payout swallowed the earnings');

    const mine = await history(person);
    assert(mine[0].status === 'failed' && mine[0].failureReason === 'Number closed');
  });

  await test('the refund hold is a setting, changed from a screen with a reason', async () => {
    await rejects(
      () => asActor(finance, 'select public.set_payout_policy(400,$1)', ['too long']),
      /between 0 and 365/i);
    await rejects(
      () => asActor(finance, 'select public.set_payout_policy(7,$1)', ['  ']),
      /written reason/i);
    await rejects(
      () => asActor(teacher, 'select public.set_payout_policy(7,$1)', ['nope']),
      /only a finance admin or platform admin/i);

    await asActor(finance, 'select public.set_payout_policy(7,$1)', ['shorter refund window']);
    const days = (await scalar(
      "select value_text from public.platform_settings where key = 'teaching.payout_hold_days'")).value_text;
    assert(days === '7', `hold is ${days}`);

    const audited = (await scalar(
      `select count(*)::int n from public.governance_audit_events
        where action = 'teaching.payout_hold_changed'
          and detail->>'new_days' = '7'`)).n;
    assert(audited === 1, `the change produced ${audited} audit events`);

    // Put it back for the suites that follow.
    await asActor(finance, 'select public.set_payout_policy(14,$1)', ['restore']);
  });

  await test('a signed-out caller is refused everywhere', async () => {
    for (const sql of [
      'select public.my_payout_options()',
      'select public.my_payouts(20)',
      "select public.request_instructor_payout('UGX','somewhere',true)",
      'select public.instructor_payout_queue(50)',
    ]) {
      await rejects(() => q(sql), /sign in to/i);
    }
  });

  await test('the flag cannot be switched on by anybody at runtime', async () => {
    // A migration or deploy sets app.bypassing_code_flag. Nothing in the
    // application can, which is why the whole payout path stays dormant until
    // a provider, a destination and a tax treatment exist.
    await q("select set_config('app.bypassing_code_flag','',false)");
    await setFlag('teaching.payouts', 'false');
    await rejects(
      () => q("update public.platform_settings set value_text='true' where key='teaching.payouts'"),
      /CODE-gated/);
    const value = (await scalar(
      "select value_text from public.platform_settings where key = 'teaching.payouts'")).value_text;
    assert(value === 'false', `the flag is ${value}`);
  });
}
