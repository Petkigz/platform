// How much of the cash in the bank is not the platform's.
//
// The earnings statement is one teacher's view, the money report is a window of
// movement, and neither answers the balance question the owner carries. This
// suite pins the answer: owed per currency, split by the refund hold, with open
// requests beside it (not added to it), and a converted total only when a rate
// is recorded.

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    bootstrapAdmin, newUser, newProfile, newInstructor, grantRole, committed,
  } = ctx;

  const admin = await bootstrapAdmin('liab-admin@example.com');
  const finance = await newUser('liab-finance@example.com');
  await newProfile(finance, 'Finance');
  await committed(() => grantRole(finance, 'finance_admin', admin));
  const teacher = await newInstructor('liab-teacher@example.com', admin);
  const bystander = await newInstructor('liab-bystander@example.com', admin);

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

  const liability = (actor) =>
    asActor(actor, 'select public.platform_teacher_liability() l').then((r) => r.rows[0].l);

  async function accrue(instructor, { gross, currency = 'UGX', daysAgo = 40, status = 'accrued' }) {
    const net = Math.round((gross * 50) / 100);
    return (await scalar(
      `insert into public.instructor_earnings_entries
         (instructor_user_id, gross_amount_minor, currency_code,
          revenue_share_percent, net_amount_minor, status, accrued_at)
       values ($1,$2,$3,50,$4,$5, now() - make_interval(days => $6)) returning id`,
      [instructor, gross, currency, net, status, daysAgo])).id;
  }

  await test('only finance or the owner can read the position', async () => {
    await rejects(() => q('select public.platform_teacher_liability()'), /sign in to/i);
    await rejects(
      () => asActor(teacher, 'select public.platform_teacher_liability()'),
      /only a finance admin or platform admin/i);
    const ok = await liability(finance);
    assert(ok.byCurrency !== undefined, 'finance could not read it');
  });

  // Other suites leave earnings behind, so every assertion here is a delta: what
  // this test added, not what the whole platform happens to hold.
  const delta = (before, after, currency) => {
    const a = after.byCurrency.find((c) => c.currency === currency) ?? { owedMinor: '0', inHoldMinor: '0', payableNowMinor: '0', teachers: '0' };
    const b = before.byCurrency.find((c) => c.currency === currency) ?? { owedMinor: '0', inHoldMinor: '0', payableNowMinor: '0', teachers: '0' };
    return {
      owed: Number(a.owedMinor) - Number(b.owedMinor),
      inHold: Number(a.inHoldMinor) - Number(b.inHoldMinor),
      payableNow: Number(a.payableNowMinor) - Number(b.payableNowMinor),
      teachers: Number(a.teachers) - Number(b.teachers),
    };
  };

  await test('owed is a balance, split by the refund hold, per currency', async () => {
    const before = await liability(finance);
    const person = await newInstructor('liab-owed@example.com', admin);
    await accrue(person, { gross: 20000, daysAgo: 40 });   // 10,000 payable now
    await accrue(person, { gross: 10000, daysAgo: 1 });    // 5,000 in hold
    await accrue(person, { gross: 4000, daysAgo: 40, currency: 'USD' });

    const after = await liability(finance);
    const ugx = delta(before, after, 'UGX');
    assert(ugx.owed === 15000, `owed ${ugx.owed}`);
    assert(ugx.inHold === 5000, `in hold ${ugx.inHold}`);
    assert(ugx.payableNow === 10000, `payable now ${ugx.payableNow}`);
    assert(ugx.teachers === 1, `teachers ${ugx.teachers}`);

    const usd = delta(before, after, 'USD');
    assert(usd.owed === 2000, `USD owed ${usd.owed}`);
  });

  await test('a reversed earning is not owed and a paid one has left the balance', async () => {
    const before = await liability(finance);
    const person = await newInstructor('liab-hist@example.com', admin);
    await accrue(person, { gross: 30000, daysAgo: 40, currency: 'EUR' });
    await accrue(person, { gross: 10000, daysAgo: 40, currency: 'EUR', status: 'reversed' });
    await accrue(person, { gross: 20000, daysAgo: 40, currency: 'EUR', status: 'paid' });

    const after = await liability(finance);
    const b = before.byCurrency.find((c) => c.currency === 'EUR') ?? { owedMinor: '0', reversedMinor: '0', paidMinor: '0' };
    const a = after.byCurrency.find((c) => c.currency === 'EUR');
    assert(Number(a.owedMinor) - Number(b.owedMinor) === 15000,
      `owed moved by ${Number(a.owedMinor) - Number(b.owedMinor)}`);
    assert(Number(a.reversedMinor) - Number(b.reversedMinor) === 5000,
      `reversed moved by ${Number(a.reversedMinor) - Number(b.reversedMinor)}`);
    assert(Number(a.paidMinor) - Number(b.paidMinor) === 10000,
      `paid moved by ${Number(a.paidMinor) - Number(b.paidMinor)}`);
  });

  await test('an open request is shown beside the balance, not added to it', async () => {
    const person = await newInstructor('liab-open@example.com', admin);
    await accrue(person, { gross: 40000, daysAgo: 40, currency: 'GBP' });

    const before = (await liability(finance)).byCurrency.find((c) => c.currency === 'GBP');
    assert(Number(before.requestedMinor) === 0);

    await q("select set_config('app.bypassing_code_flag','on',false)");
    await q("update public.platform_settings set value_text='true' where key='teaching.payouts'");
    await asActor(person, "select public.request_instructor_payout('GBP','Barclays 1234',true)");
    await q("update public.platform_settings set value_text='false' where key='teaching.payouts'");
    await q("select set_config('app.bypassing_code_flag','',false)");

    const after = (await liability(finance)).byCurrency.find((c) => c.currency === 'GBP');
    assert(Number(after.requestedMinor) === 20000, `requested ${after.requestedMinor}`);
    assert(Number(after.openRequests) === 1, `open ${after.openRequests}`);
    // The balance did not move: a request is not a payment.
    assert(Number(after.owedMinor) === 20000, `owed moved to ${after.owedMinor}`);
  });

  await test('a converted total appears only when every currency has a rate', async () => {
    // A currency nobody has quoted makes the total unanswerable, and the
    // function names which one rather than converting the rest and quietly
    // leaving it out.
    const person = await newInstructor('liab-fx@example.com', admin);
    await accrue(person, { gross: 10000, daysAgo: 40, currency: 'ZWL' });

    const first = await liability(finance);
    assert(first.unconverted.includes('ZWL'),
      `unconverted was ${JSON.stringify(first.unconverted)}`);
    assert(first.convertedTotalMinor === null,
      `a total was produced despite an unquoted currency: ${first.convertedTotalMinor}`);

    // Record a rate for every currency the position still cannot convert —
    // including any another suite left behind.
    for (const currency of first.unconverted) {
      if (currency === first.reportingCurrency) continue;
      await q(
        `insert into public.currency_exchange_rates (base_currency, quote_currency, rate, source)
         values ($1, $2, 0.5, 'test')`,
        [currency, first.reportingCurrency]);
    }

    const after = await liability(finance);
    assert(after.unconverted.length === 0,
      `still no total: ${JSON.stringify(after.unconverted)}`);
    assert(after.convertedTotalMinor !== null, 'no total after every rate was recorded');
  });
}
