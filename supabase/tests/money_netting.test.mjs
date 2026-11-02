// What nets against what, now that the owner has said.
//
// `/admin/money-report` has refused to produce a net figure since it was built, and
// said so on its face: three questions about the business were open, and guessing
// would have buried the answer inside a sum that looked authoritative. The owner
// answered all three on 2026-11-01, and this suite walks each one against real
// ledger rows rather than trusting the arithmetic.
//
//   I.   A chargeback offsets nothing. It is a debit in its own period, and the
//        capture it answers is still there, unchanged.
//   II.  A provider fee is the platform's, never the teacher's — and the teacher's
//        share is subtracted from what the platform keeps, because money owed to a
//        teacher is not money the platform made.
//   III. A reversal belongs to the period it happened in. Nothing is back-dated, so
//        a report read last month does not change today.
//   IV.  A net figure that cannot include a market says so instead of being small.

export async function run(ctx) {
  const {
    q, test, assert, committed,
    newUser, newProfile, bootstrapAdmin, newInstructor, newReviewer, satisfyReview,
    newCourse, newVersion, newSection, newLesson,
  } = ctx;

  const owner = await bootstrapAdmin('netting-owner@example.com');
  const finance = await newUser('netting-finance@example.com');
  await newProfile(finance, 'Hafsa Nakato');
  await committed(() => ctx.grantRole(finance, 'finance_admin', owner));
  const teacher = await newInstructor('netting-teacher@example.com', owner);

  const scalar = async (sql, params = []) => (await q(sql, params)).rows[0];

  async function asActor(actor, fn) {
    await q('begin');
    await q("select set_config('request.jwt.claims',$1,true)",
      [JSON.stringify({ sub: actor, role: 'authenticated' })]);
    await q('set local role authenticated');
    try {
      const result = await fn();
      await q('commit');
      return result;
    } catch (e) {
      await q('rollback');
      throw e;
    }
  }

  const call = async (actor, sql, params = []) =>
    (await asActor(actor, () => q(sql, params))).rows[0];

  async function refuses(pattern, fn) {
    let caught;
    try { await fn(); } catch (e) { caught = e; }
    assert(caught, `expected an error matching ${pattern}`);
    const message = String(caught.message ?? caught);
    assert(pattern.test(message), `expected ${pattern}; got: ${message.slice(0, 240)}`);
  }

  const report = async (from, to, actor = owner) =>
    (await call(actor, 'select public.report_money_in_reporting_currency($1::timestamptz,$2::timestamptz) as r',
      [from, to])).r;

  // A window nobody else writes into. Every other suite stamps money at now() —
  // `currency_reporting` excepted, and it claims 300–400 days back — so this one
  // sits in the months between them. The report also refuses a window that ends in
  // the future, which is why it cannot simply be next year.
  const day = 86_400_000;
  const now = Date.now();
  const FROM = new Date(now - 290 * day).toISOString();
  const MIDDLE = new Date(now - 245 * day).toISOString();
  const TO = new Date(now - 200 * day).toISOString();
  const DURING = new Date(now - 270 * day).toISOString();
  const LATER = new Date(now - 210 * day).toISOString();

  // The reporting currency is USD by default; the ledger rows are written in USD so
  // no rate is needed for the arithmetic under test. The identity rate is recorded
  // because `to_reporting_currency` answers for the reporting currency itself.
  await committed(() => q("update public.platform_settings set value_text='USD' where key='finance.reporting_currency'"));

  /** One ledger row, at a moment inside the window unless told otherwise. */
  const ledger = async (type, amount, over = {}) => committed(() => q(
    `insert into public.financial_transactions
       (transaction_type, direction, amount_minor, currency_code, occurred_at)
     values ($1, $2, $3, $4, $5) returning id`, [
      type,
      over.direction ?? (type === 'capture' ? 'credit' : 'debit'),
      amount,
      over.currency ?? 'USD',
      over.at ?? DURING,
    ]));

  /** A version to earn against, so the teacher-share line is a real number. */
  const reviewer = await newReviewer('netting-reviewer@example.com', owner);
  const transition = (versionId, status, actor) =>
    q('select id from public.set_course_version_status($1,$2,$3,$4)',
      [versionId, status, actor, 'netting test']);

  const course = await newCourse(teacher, { status: 'active' });
  const version = await newVersion(course, teacher);
  const section = await newSection(version);
  await newLesson(section);
  await transition(version, 'submitted', teacher);
  await transition(version, 'approved', reviewer);
  await satisfyReview(version, reviewer, owner);
  await transition(version, 'published', owner);

  const earning = async (gross, over = {}) => committed(() => q(
    `insert into public.instructor_earnings_entries
       (instructor_user_id, gross_amount_minor, currency_code,
        revenue_share_percent, net_amount_minor, status, accrued_at)
     values ($1,$2,$3,$4,$5,$6,$7) returning id`, [
      teacher,
      gross,
      'USD',
      50,
      Math.round(gross * 50 / 100),
      over.status ?? 'accrued',
      over.at ?? DURING,
    ]));

  // -------------------------------------------------------------------------
  console.log('\nAct I — a chargeback offsets nothing');
  // -------------------------------------------------------------------------

  await test('the figure is captures less everything that came back, and says so', async () => {
    const before = (await report(FROM, TO)).netting;
    assert(before.complete === true, 'a window with no unconvertible row is incomplete');

    await ledger('capture', 10_000);
    await ledger('chargeback', 2_000);

    const after = (await report(FROM, TO)).netting;
    const captures = after.lines.find((l) => l.code === 'captures');
    const chargebacks = after.lines.find((l) => l.code === 'chargebacks');

    assert(captures.amountMinor === '10000', `captures ${captures.amountMinor}`);
    assert(chargebacks.amountMinor === '2000', `chargebacks ${chargebacks.amountMinor}`);
    assert(chargebacks.sign === 'subtract');

    // 10 000 in, 2 000 charged back, no teacher share: 8 000 handled.
    assert(after.platformNetMinor === '8000', `net ${after.platformNetMinor}`);

    // The rule is on the report, not only in the code: a net total whose rules live
    // in a commit message is a total nobody can check.
    assert(/offsets nothing/.test(chargebacks.rule), chargebacks.rule);
  });

  await test('a capture a chargeback answers is not rewritten', async () => {
    const id = (await ledger('capture', 5_000)).rows[0].id;
    await ledger('chargeback', 1_000);

    const row = await scalar(
      'select transaction_type, direction, amount_minor::text as amount from public.financial_transactions where id = $1',
      [id]);
    assert(row.transaction_type === 'capture', `type ${row.transaction_type}`);
    assert(row.amount === '5000', `the capture was rewritten to ${row.amount}`);
  });

  // -------------------------------------------------------------------------
  console.log('\nAct II — a fee is the platform\'s, and the teacher\'s share is not the platform\'s money');
  // -------------------------------------------------------------------------

  await test('a provider fee comes off what the platform keeps and not off a teacher', async () => {
    const zero = (await report(FROM, TO)).netting;
    await ledger('provider_fee', 500);
    await earning(4_000);

    const after = (await report(FROM, TO)).netting;
    const fees = after.lines.find((l) => l.code === 'providerFees');
    const share = after.lines.find((l) => l.code === 'teacherShare');

    assert(fees.amountMinor === '500', `fees ${fees.amountMinor}`);
    assert(share.amountMinor === '2000', `share ${share.amountMinor}`);
    assert(/never off a teacher/i.test(fees.rule), fees.rule);

    // A 4 000 sale at a 50% share is 2 000 to the teacher, untouched by the fee:
    // the earnings row says so, and the report does not adjust it.
    const entry = await scalar(
      "select net_amount_minor::text as net from public.instructor_earnings_entries where instructor_user_id = $1 order by accrued_at desc limit 1",
      [teacher]);
    assert(entry.net === '2000', `earnings net ${entry.net}`);

    // And the fee has moved the platform's own line, not the teacher's.
    assert(BigInt(after.platformNetMinor) === BigInt(zero.platformNetMinor) - 500n,
      `net ${zero.platformNetMinor} -> ${after.platformNetMinor}`);
  });

  await test('the money owed to a teacher is subtracted once, so the last line is what is kept', async () => {
    const r = (await report(FROM, TO)).netting;
    const teacherShare = BigInt(r.lines.find((l) => l.code === 'teacherShare').amountMinor);
    assert(BigInt(r.platformRetainedMinor) === BigInt(r.platformNetMinor) - teacherShare,
      `retained ${r.platformRetainedMinor} from net ${r.platformNetMinor} and share ${teacherShare}`);
    assert(/not a ledger row at all/.test(r.lines.find((l) => l.code === 'teacherShare').rule));
    assert(/lie by omission/.test(r.note), r.note);
  });

  await test('a reversed earning stops counting against the platform', async () => {
    const before = (await report(FROM, TO)).netting;
    await earning(2_000, { status: 'reversed' });
    const after = (await report(FROM, TO)).netting;

    assert(after.lines.find((l) => l.code === 'teacherShare').amountMinor
      === before.lines.find((l) => l.code === 'teacherShare').amountMinor,
      'a reversed earning was subtracted as though the teacher still had it');
  });

  // -------------------------------------------------------------------------
  console.log('\nAct III — a reversal belongs to the period it happened in');
  // -------------------------------------------------------------------------

  await test('a reversal outside the window is not in this window’s figure', async () => {
    const before = (await report(FROM, TO)).netting;
    await ledger('reversal', 3_000, { at: LATER });

    const inside = (await report(FROM, MIDDLE)).netting;
    assert(inside.platformNetMinor === before.platformNetMinor,
      `a later reversal changed the closed period: ${before.platformNetMinor} -> ${inside.platformNetMinor}`);

    const later = (await report(MIDDLE, TO)).netting;
    assert(later.lines.find((l) => l.code === 'reversals').amountMinor === '3000',
      'the reversal is in no period at all');
  });

  await test('a pair of periods adds up to the whole', async () => {
    const early = (await report(FROM, MIDDLE)).netting;
    const late = (await report(MIDDLE, TO)).netting;
    const both = (await report(FROM, TO)).netting;

    // Nothing falls between the two windows and nothing is counted twice.
    for (const code of ['captures', 'refunds', 'chargebacks', 'reversals', 'providerFees']) {
      const part = (x) => BigInt(x.lines.find((l) => l.code === code).amountMinor);
      assert(part(early) + part(late) === part(both), `${code} does not add across the boundary`);
    }
  });

  // -------------------------------------------------------------------------
  console.log('\nAct IV — an incomplete figure is withheld, not rounded down');
  // -------------------------------------------------------------------------

  await test('a currency with no rate makes the net incomplete rather than small', async () => {
    const before = (await report(FROM, TO)).netting;
    assert(before.platformNetMinor !== null);

    // Recorded in a currency nothing has quoted into USD. The gross sections list
    // it; the net figure must refuse to pretend it does not exist.
    await ledger('capture', 7_000, { currency: 'GHS' });

    const after = (await report(FROM, TO)).netting;
    assert(after.complete === false, 'a net figure was produced with a market missing');
    assert(after.platformNetMinor === null, `net ${after.platformNetMinor} was produced anyway`);
    assert(after.platformRetainedMinor === null, 'the retained line was produced anyway');
    assert(Array.isArray(after.missingRates) && after.missingRates.includes('GHS'),
      `missing ${JSON.stringify(after.missingRates)}`);
    assert(/not zero/.test(after.note), after.note);
  });

  await test('once a rate exists the figure appears and includes the market', async () => {
    await committed(() => q(
      `insert into public.currency_exchange_rates
         (base_currency, quote_currency, rate, observed_at, source)
       values ('GHS','USD',0.08, $1, 'netting test')`, [DURING]));

    const after = (await report(FROM, TO)).netting;
    assert(after.complete === true, 'the figure is still incomplete with a rate recorded');
    assert(after.platformNetMinor !== null);
    // 7 000 minor units of GHS is 70.00 cedi, which is 5.60 USD — 560 minor units.
    // The whole divisor chain in one number: a rate applied to minor units without
    // it is a 100x error that still looks like a sum.
    const captures = after.lines.find((l) => l.code === 'captures');
    assert(BigInt(captures.amountMinor) >= 560n, `captures ${captures.amountMinor}`);
  });

  await test('a currency with no minor unit is not divided by a hundred', async () => {
    // UGX has no minor unit at all, and this platform is operated from Uganda, so
    // the case is not hypothetical.
    await committed(() => q(
      `insert into public.currency_exchange_rates
         (base_currency, quote_currency, rate, observed_at, source)
       values ('UGX','USD',0.00027, $1, 'netting test')`, [DURING]));

    const before = (await report(FROM, TO)).netting;
    await ledger('capture', 5_000_000, { currency: 'UGX' });
    const after = (await report(FROM, TO)).netting;

    // 5 000 000 shillings is not 5 000 000 minor units of anything but itself:
    // 5 000 000 × 0.00027 = 1 350 USD = 135 000 minor units, and no division first.
    const delta = BigInt(after.lines.find((l) => l.code === 'captures').amountMinor)
      - BigInt(before.lines.find((l) => l.code === 'captures').amountMinor);
    assert(delta === 135_000n, `a UGX capture contributed ${delta}, not 135000`);
  });

  // -------------------------------------------------------------------------
  console.log('\nAct V — who may read it');
  // -------------------------------------------------------------------------

  await test('the net figure is behind the same gate as the rest of the report', async () => {
    await refuses(/finance admin or platform admin/, () => report(FROM, TO, teacher));
    const asFinance = await report(FROM, TO, finance);
    assert(asFinance.netting, 'a finance admin could not read the net figure');
  });
}
