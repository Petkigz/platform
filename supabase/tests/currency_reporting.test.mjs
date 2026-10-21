// Money is reported in one currency, and every conversion says where its rate came from.
//
// `currency_exchange_rates` was built in the payments migration with an index
// shaped for exactly one question — the newest rate for a pair at a moment — and
// nothing could write to it. `financial_transactions.fx_rate`, `fx_source` and
// `fx_observed_at` were required by a constraint whenever a settlement landed in
// another currency, and no function ever set one. So the platform charged in
// whatever currency a family had and every money screen summed them together,
// which is not a number: 5 000 UGX and 3 USD are 100x apart in minor units
// before they are converted, and UGX has no minor unit at all.
//
// What is pinned here is the three things that make a converted total
// trustworthy rather than merely present: a rate always has a source, a pair
// nobody recorded resolves to nothing instead of to 1, and the report says
// aloud what it could not convert.

export async function run(ctx) {
  const {
    q, test, assert, rejects, committed, asUser,
    newUser, newProfile, grantRole, bootstrapAdmin,
  } = ctx;

  const admin = await bootstrapAdmin('fx-admin@example.com');
  await newProfile(admin, 'FX Admin');

  const finance = await newUser('fx-finance@example.com');
  await newProfile(finance, 'Finance Admin');
  await committed(() => grantRole(finance, 'finance_admin', admin));

  // Privileged, and outside every decision here. This is the refusal that
  // matters: is_privileged() would admit a support agent to a money report.
  const support = await newUser('fx-support@example.com');
  await newProfile(support, 'Support Agent');
  await committed(() => grantRole(support, 'support_agent', admin));

  const ordinary = await newUser('fx-ordinary@example.com');
  await newProfile(ordinary, 'Ordinary Person');

  const teacher = await newUser('fx-teacher@example.com');
  await newProfile(teacher, 'A Teacher Who Earns');

  /** Writes commit, so a later test can read what an earlier one decided. */
  async function asActor(actor, sql, params = []) {
    await q('begin');
    await q('select set_config(\'request.jwt.claims\',$1,true)', [
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

  const recordRate = (actor, base, quote, rate, source, observedAt = null, reason = null) =>
    asActor(actor,
      'select public.record_exchange_rate($1,$2,$3,$4,$5,$6) as r',
      [base, quote, rate, source, observedAt, reason]).then((res) => res.rows[0].r);
  const resolve = (actor, base, quote, asOf = null) =>
    asActor(actor, 'select public.resolve_exchange_rate($1,$2,$3) as r', [base, quote, asOf])
      .then((res) => res.rows[0].r);
  const convert = (actor, amount, currency, asOf = null) =>
    asActor(actor, 'select public.to_reporting_currency($1,$2,$3) as r', [amount, currency, asOf])
      .then((res) => res.rows[0].r);
  const settle = (actor, txnId, amount, currency, rateId = null) =>
    asActor(actor, 'select public.record_transaction_settlement($1,$2,$3,$4) as r',
      [txnId, amount, currency, rateId]).then((res) => res.rows[0].r);
  const report = (actor, from, to) =>
    asActor(actor, 'select public.report_money_in_reporting_currency($1,$2) as r', [from, to])
      .then((res) => res.rows[0].r);

  const day = 86400000;
  const now = Date.now();
  // A window nobody else writes into: every other suite stamps money at now(),
  // so a report over the last month would be a report about their fixtures.
  const winFrom = new Date(now - 400 * day).toISOString();
  const winTo = new Date(now - 300 * day).toISOString();
  const inWindow = new Date(now - 350 * day).toISOString();

  // Defaults to now(), which is outside the report window below: a settlement
  // fixture is about settling, and it must not turn up in a total asserted on
  // by a later test.
  async function transaction(currency, amount, {
    type = 'capture', direction = 'credit', occurredAt = new Date(now).toISOString(),
    status = 'pending',
  } = {}) {
    const res = await q(
      `insert into public.financial_transactions
         (transaction_type, direction, amount_minor, currency_code, status, occurred_at)
       values ($1,$2,$3,$4,$5,$6) returning id`,
      [type, direction, amount, currency, status, occurredAt]);
    return res.rows[0].id;
  }

  async function setSetting(key, value) {
    await q('update public.platform_settings set value_text = $2 where key = $1', [key, value]);
  }
  async function settingOf(key) {
    return (await q('select value_text v from public.platform_settings where key = $1', [key]))
      .rows[0].v;
  }
  async function auditFor(action, targetId) {
    return (await q(
      `select actor, detail from public.governance_audit_events
        where action = $1 and target_id = $2 order by occurred_at desc`,
      [action, targetId])).rows;
  }

  // -------------------------------------------------------------------
  // The accessors, and a defect in one of them
  // -------------------------------------------------------------------

  await test('setting_int falls back to its default when the key does not exist', async () => {
    // Documented as "falling back to p_default when unset or blank", and it did
    // not: a SQL function whose query returns no rows returns NULL, so a missing
    // key ignored the default. Every caller happened to pass a seeded key.
    const rows = (await q(
      `select public.setting_int('finance.no_such_key', 7) as missing,
              public.setting_int('finance.rate_sanity_factor', 0) as present`)).rows;
    assert(rows[0].missing === 7, `a missing key returned ${rows[0].missing}, not the default`);
    assert(rows[0].present === 10, `the seeded factor read ${rows[0].present}`);
  });

  await test('setting_text reads the reporting currency and defaults when absent', async () => {
    const rows = (await q(
      `select public.setting_text('finance.reporting_currency', 'EUR') as reporting,
              public.setting_text('finance.no_such_key', 'EUR') as fallback,
              public.setting_text('finance.no_such_key') as nothing`)).rows;
    assert(rows[0].reporting === 'USD', `reporting currency is ${rows[0].reporting}`);
    assert(rows[0].fallback === 'EUR', 'a missing key ignored its default');
    assert(rows[0].nothing === null, 'a missing key with no default should be NULL');
  });

  await test('both settings are documented as controls, not as feature flags', async () => {
    const rows = (await q(
      `select key, value_type, gate_type from public.platform_settings
        where key in ('finance.reporting_currency','finance.rate_sanity_factor') order by key`)).rows;
    assert(rows.length === 2, `expected two finance controls, found ${rows.length}`);
    assert(rows[0].value_type === 'integer', `the factor is ${rows[0].value_type}`);
    assert(rows[1].value_type === 'text', `the reporting currency is ${rows[1].value_type}`);
    for (const row of rows) {
      assert(row.gate_type === 'admin', `${row.key} has gate ${row.gate_type}`);
    }
  });

  // -------------------------------------------------------------------
  // Minor units: the 100x mistake
  // -------------------------------------------------------------------

  await test('the minor-unit divisor matches the list the web layer keeps', async () => {
    // web/src/lib/money.ts holds the same three lists, because a browser cannot
    // call this function. Both sides are pinned against the same codes here and
    // in web/src/lib/currency.test.ts, so a change to one is a failing test
    // rather than a quietly different total.
    const zero = ['BIF','CLP','DJF','GNF','ISK','JPY','KMF','KRW','PYG','RWF',
                  'UGX','UYI','VND','VUV','XAF','XOF','XPF'];
    const three = ['BHD','IQD','JOD','KWD','LYD','OMR','TND'];
    const two = ['USD','GBP','EUR','KES','NGN','ZAR','AED','SAR'];

    for (const code of zero) {
      const d = (await q('select public.currency_minor_divisor($1) d', [code])).rows[0].d;
      assert(d === 1, `${code} has divisor ${d}, expected 1`);
    }
    for (const code of three) {
      const d = (await q('select public.currency_minor_divisor($1) d', [code])).rows[0].d;
      assert(d === 1000, `${code} has divisor ${d}, expected 1000`);
    }
    for (const code of two) {
      const d = (await q('select public.currency_minor_divisor($1) d', [code])).rows[0].d;
      assert(d === 100, `${code} has divisor ${d}, expected 100`);
    }
  });

  await test('a code that is not a currency is refused rather than defaulted', async () => {
    await rejects(() => q(`select public.currency_minor_divisor('US')`),
      'a two-letter code was given a divisor');
    await rejects(() => q(`select public.currency_minor_divisor(null)`),
      'nothing at all was given a divisor');
  });

  // -------------------------------------------------------------------
  // Recording a rate
  // -------------------------------------------------------------------

  await test('only a finance admin or platform admin may record a rate', async () => {
    await rejects(() => recordRate(ordinary, 'UGX', 'USD', 0.00027, 'central bank'),
      'an ordinary person recorded a rate');
    await rejects(() => recordRate(support, 'UGX', 'USD', 0.00027, 'central bank'),
      'a support agent recorded a rate');
  });

  await test('a finance admin records a rate, and the source travels with it', async () => {
    const id = await recordRate(finance, 'UGX', 'USD', 0.00027, 'Bank of Uganda, mid rate');
    assert(typeof id === 'string' && id.length === 36, `no id came back: ${id}`);

    const rows = (await q(
      `select base_currency, quote_currency, rate::text, source, observed_at
         from public.currency_exchange_rates where id = $1`, [id])).rows;
    assert(rows[0].base_currency.trim() === 'UGX', `base is ${rows[0].base_currency}`);
    assert(rows[0].quote_currency.trim() === 'USD', `quote is ${rows[0].quote_currency}`);
    assert(rows[0].rate === '0.00027000', `rate stored as ${rows[0].rate}`);
    assert(rows[0].source === 'Bank of Uganda, mid rate', 'the source was not stored');

    const audit = await auditFor('finance.exchange_rate_recorded', id);
    assert(audit.length === 1, `expected one audit row, found ${audit.length}`);
    assert(audit[0].actor === finance, 'the audit row does not name who recorded it');
    assert(audit[0].detail.base_currency === 'UGX', 'the audit row lost the pair');
  });

  await test('a platform admin may record one too', async () => {
    const id = await recordRate(admin, 'KES', 'USD', 0.0077, 'Central Bank of Kenya');
    assert(typeof id === 'string', 'a platform admin could not record a rate');
  });

  await test('a rate must have a source a person could go and check', async () => {
    await rejects(() => recordRate(finance, 'NGN', 'USD', 0.00065, ''),
      'a blank source was accepted');
    await rejects(() => recordRate(finance, 'NGN', 'USD', 0.00065, null),
      'a missing source was accepted');
    await rejects(() => recordRate(finance, 'NGN', 'USD', 0.00065, 'x'.repeat(201)),
      'a 201-character source was accepted');
  });

  await test('a currency cannot be quoted against itself', async () => {
    await rejects(() => recordRate(finance, 'USD', 'USD', 1, 'identity'),
      'a self-pair was recorded');
  });

  await test('a rate must be positive and sane', async () => {
    await rejects(() => recordRate(finance, 'GBP', 'USD', 0, 'published'),
      'a zero rate was recorded');
    await rejects(() => recordRate(finance, 'GBP', 'USD', -1.27, 'published'),
      'a negative rate was recorded');
    await rejects(() => recordRate(finance, 'GBP', 'USD', null, 'published'),
      'a missing rate was recorded');
    await rejects(() => recordRate(finance, 'GBP', 'USD', 1000000001, 'published'),
      'a rate above a billion was recorded');
  });

  await test('a rate cannot be observed in the future, but may be backdated', async () => {
    await rejects(() => recordRate(finance, 'GBP', 'USD', 1.27, 'published',
      new Date(now + day).toISOString()), 'a future observation was accepted');

    const id = await recordRate(finance, 'GBP', 'USD', 1.27, 'published', inWindow);
    const observed = (await q(
      'select observed_at from public.currency_exchange_rates where id = $1', [id]))
      .rows[0].observed_at;
    assert(new Date(observed).toISOString() === inWindow,
      `a backdated rate was stored at ${observed}`);
  });

  await test('a rate recorded for a past moment is what a report window resolves', async () => {
    // The report converts at the end of its window, so the rate in force for a
    // window that closed 300 days ago is the one observed before then, not the
    // newest one on the shelf.
    await recordRate(finance, 'UGX', 'USD', 0.00027, 'Bank of Uganda', inWindow);
    const inWindowRate = await resolve(ordinary, 'UGX', 'USD', winTo);
    const newest = await resolve(ordinary, 'UGX', 'USD');
    assert(inWindowRate.source === 'Bank of Uganda',
      `the window resolved to ${inWindowRate.source}`);
    assert(newest.source === 'Bank of Uganda, mid rate',
      `the newest observation resolved to ${newest.source}`);
    assert(inWindowRate.rateId !== newest.rateId, 'both moments resolved to the same row');
  });

  await test('a rate that moved implausibly far needs a written reason', async () => {
    await recordRate(finance, 'ABC', 'USD', 1.0, 'published', inWindow);

    await rejects(() => recordRate(finance, 'ABC', 'USD', 50.0, 'published',
      new Date(now - 349 * day).toISOString()),
      'a 50x move was recorded without a reason');

    const id = await recordRate(finance, 'ABC', 'USD', 50.0, 'published',
      new Date(now - 349 * day).toISOString(),
      'Redenomination: the issuing bank revalued the unit by 50 to 1');
    const audit = await auditFor('finance.exchange_rate_recorded', id);
    assert(audit.length === 1, 'the override was not audited');
    assert(audit[0].detail.previous_rate === '1.00000000',
      `the audit row does not carry the rate it moved from: ${audit[0].detail.previous_rate}`);
    assert(String(audit[0].detail.override_reason).startsWith('Redenomination'),
      'the written reason was not kept');
  });

  await test('the first rate for a pair is never an outlier', async () => {
    const id = await recordRate(finance, 'XYZ', 'USD', 99999, 'published', inWindow);
    assert(typeof id === 'string', 'a first observation was refused as implausible');
  });

  await test('setting the sanity factor to zero turns the check off', async () => {
    const before = await settingOf('finance.rate_sanity_factor');
    await recordRate(finance, 'DSB', 'USD', 1.0, 'published', inWindow);
    try {
      await setSetting('finance.rate_sanity_factor', '0');
      const id = await recordRate(finance, 'DSB', 'USD', 5000, 'published',
        new Date(now - 348 * day).toISOString());
      assert(typeof id === 'string', 'a disabled guard still refused the rate');
    } finally {
      await setSetting('finance.rate_sanity_factor', before);
    }
    await rejects(() => recordRate(finance, 'DSB', 'USD', 500000, 'published',
      new Date(now - 347 * day).toISOString()),
      'the guard did not come back when the setting was restored');
  });

  // -------------------------------------------------------------------
  // Resolving a rate
  // -------------------------------------------------------------------

  await test('the same currency resolves to exactly one, with nothing claimed', async () => {
    const res = await resolve(ordinary, 'USD', 'USD');
    assert(res.rate === '1', `identity rate is ${res.rate}`);
    assert(res.source === 'identity', `identity source is ${res.source}`);
    assert(res.derived === false, 'identity was marked derived');
    assert(res.rateId === null, 'identity invented a rate row');
  });

  await test('the newest observation at or before the moment is the one used', async () => {
    await recordRate(finance, 'TST', 'USD', 2.0, 'earlier', new Date(now - 380 * day).toISOString());
    await recordRate(finance, 'TST', 'USD', 3.5, 'later', new Date(now - 360 * day).toISOString());
    await recordRate(finance, 'TST', 'USD', 9.0, 'newest', new Date(now - 10 * day).toISOString());

    const asOf = new Date(now - 300 * day).toISOString();
    const res = await resolve(ordinary, 'TST', 'USD', asOf);
    assert(res.rate === '3.50000000', `resolved to ${res.rate}, expected the second observation`);
    assert(res.source === 'later', `resolved to the wrong row: ${res.source}`);

    const older = await resolve(ordinary, 'TST', 'USD', new Date(now - 370 * day).toISOString());
    assert(older.rate === '2.00000000', `an earlier moment resolved to ${older.rate}`);
  });

  await test('a rate observed after the moment is not available to it', async () => {
    const res = await resolve(ordinary, 'TST', 'USD', new Date(now - 390 * day).toISOString());
    assert(res === null, `a rate from the future was used: ${JSON.stringify(res)}`);
  });

  await test('only the other direction recorded gives an inverted rate that says so', async () => {
    await recordRate(finance, 'USD', 'INV', 4.0, 'published inverse', inWindow);
    const res = await resolve(ordinary, 'INV', 'USD');
    assert(res !== null, 'the inverse was not found');
    assert(res.derived === true, 'an inverted rate was presented as a published one');
    assert(Number(res.rate) === 0.25, `the inverse is ${res.rate}, expected 0.25`);
    assert(res.source.includes('derived by inverting'), `the source does not say it was derived: ${res.source}`);
    assert(res.source.includes('published inverse'), 'the derivation lost the rate it came from');
  });

  await test('a pair nobody recorded resolves to nothing at all', async () => {
    const res = await resolve(ordinary, 'QQQ', 'USD');
    assert(res === null, `an unrecorded pair resolved to ${JSON.stringify(res)}`);
    // Not 1. Assuming an unknown currency is worth a dollar would be invisible
    // in a total that still looked like a number.
    const nothing = await resolve(ordinary, null, 'USD');
    assert(nothing === null, 'a missing currency resolved to something');
  });

  // -------------------------------------------------------------------
  // Converting
  // -------------------------------------------------------------------

  await test('the reporting currency converts to itself untouched', async () => {
    const res = await convert(ordinary, 12345, 'USD');
    assert(res.amountMinor === '12345', `identity conversion gave ${res.amountMinor}`);
    assert(res.currency === 'USD', `identity conversion gave ${res.currency}`);
    assert(res.source === 'identity', 'identity conversion claimed a source');
  });

  await test('a zero-decimal currency is not multiplied by a hundred', async () => {
    // 5 000 minor units of UGX is 5 000 shillings. At 0.00027 USD each that is
    // 1.35 dollars, which is 135 minor units of USD.
    const res = await convert(ordinary, 5000, 'UGX');
    assert(res.amountMinor === '135', `5 000 UGX converted to ${res.amountMinor} cents`);
    assert(res.currency === 'USD', `converted into ${res.currency}`);
    assert(res.derived === false, 'the UGX rate was marked derived');
  });

  await test('a two-decimal currency divides and multiplies by its own divisor', async () => {
    // 12 345 minor units of GBP is 123.45 pounds, at 1.27 that is 156.7815
    // dollars, which is 15 678 cents after rounding.
    const res = await convert(ordinary, 12345, 'GBP');
    assert(res.amountMinor === '15678', `123.45 GBP converted to ${res.amountMinor} cents`);
  });

  await test('a three-decimal currency is not treated as a two-decimal one', async () => {
    await recordRate(finance, 'BHD', 'USD', 2.65, 'published', inWindow);
    // 1 000 minor units of BHD is one dinar, worth 2.65 dollars = 265 cents.
    const res = await convert(ordinary, 1000, 'BHD');
    assert(res.amountMinor === '265', `1 BHD converted to ${res.amountMinor} cents`);
  });

  await test('rounding is half away from zero, on the reporting currency unit', async () => {
    await recordRate(finance, 'RND', 'USD', 0.005, 'published', inWindow);
    // One minor unit of RND (zero decimals would make this 1 unit; RND is not
    // on the zero-decimal list, so it is 0.01 units) at 0.005 is 0.00005
    // dollars. Use a whole unit instead: 100 minor units = 1 RND = 0.005 USD
    // = 0.5 cents, which rounds away from zero to 1.
    const res = await convert(ordinary, 100, 'RND');
    assert(res.amountMinor === '1', `exactly half a cent rounded to ${res.amountMinor}`);
  });

  await test('an unconvertible amount comes back as nothing', async () => {
    const res = await convert(ordinary, 500, 'QQQ');
    assert(res === null, `a currency with no rate converted to ${JSON.stringify(res)}`);
    assert(await convert(ordinary, null, 'UGX') === null, 'a missing amount converted');
  });

  await test('a reporting currency that is not a code is refused loudly', async () => {
    const before = await settingOf('finance.reporting_currency');
    try {
      await setSetting('finance.reporting_currency', 'DOLLARS');
      await rejects(() => convert(ordinary, 500, 'UGX'),
        'a misconfigured reporting currency was silently accepted');
    } finally {
      await setSetting('finance.reporting_currency', before);
    }
    const res = await convert(ordinary, 5000, 'UGX');
    assert(res.amountMinor === '135', 'the reporting currency did not come back');
  });

  // -------------------------------------------------------------------
  // Settlements: what actually landed
  // -------------------------------------------------------------------

  await test('only finance staff may settle a transaction', async () => {
    const id = await transaction('UGX', 12000);
    await rejects(() => settle(ordinary, id, 12000, 'UGX'), 'an ordinary person settled');
    await rejects(() => settle(support, id, 12000, 'UGX'), 'a support agent settled');
    await rejects(() => settle(finance, '00000000-0000-4000-8000-000000000000', 1, 'UGX'),
      'settling nothing was allowed');
  });

  await test('a settlement in the transaction currency cites no rate', async () => {
    const id = await transaction('UGX', 12000);
    const res = await settle(finance, id, 11850, 'UGX');
    assert(res.status === 'settled', `status came back ${res.status}`);
    assert(res.fxRate === null, `a same-currency settlement claimed a rate: ${res.fxRate}`);
    assert(res.fxSource === null, 'a same-currency settlement claimed a source');
    assert(res.settlementAmountMinor === '11850', `settled ${res.settlementAmountMinor}`);

    const rows = (await q(
      `select status, settlement_amount_minor, settlement_currency, fx_rate, fx_source, fx_observed_at
         from public.financial_transactions where id = $1`, [id])).rows;
    assert(rows[0].status === 'settled', 'the row was not marked settled');
    assert(rows[0].fx_rate === null, 'the row carries an fx rate it should not');
    assert(rows[0].fx_observed_at === null, 'the row carries an fx timestamp it should not');

    const audit = await auditFor('finance.transaction_settled', id);
    assert(audit.length === 1, `expected one audit row, found ${audit.length}`);
    assert(audit[0].detail.restated === false, 'a first settlement was called a restatement');
  });

  await test('a same-currency settlement refuses to be given a rate to cite', async () => {
    const rateId = await recordRate(finance, 'ZZZ', 'USD', 0.5, 'published');
    const id = await transaction('UGX', 5000);
    await rejects(() => settle(finance, id, 5000, 'UGX', rateId),
      'a settlement that needed no conversion cited one anyway');
  });

  await test('a cross-currency settlement without a recorded rate is refused', async () => {
    const id = await transaction('QQQ', 5000);
    await rejects(() => settle(finance, id, 100, 'USD'),
      'a settlement invented an exchange rate');
  });

  await test('a cross-currency settlement stamps the rate it used', async () => {
    const id = await transaction('UGX', 5000000);
    const res = await settle(finance, id, 1350, 'USD');
    assert(res.fxRate !== null, 'the settlement recorded no rate');
    assert(Number(res.fxRate) === 0.00027, `the rate stamped was ${res.fxRate}`);
    assert(res.fxSource === 'Bank of Uganda, mid rate',
      `the source stamped was ${res.fxSource}`);
    assert(res.derived === false, 'a published rate was marked derived');
    assert(res.rateId !== null, 'the settlement does not say which row it used');
    assert(res.settlementCurrency === 'USD', `settled into ${res.settlementCurrency}`);

    const rows = (await q(
      `select fx_rate::text, fx_source, fx_observed_at, settlement_amount_minor, settlement_currency
         from public.financial_transactions where id = $1`, [id])).rows;
    assert(rows[0].fx_source === 'Bank of Uganda, mid rate',
      'the fx source did not reach the ledger');
    assert(rows[0].fx_observed_at !== null, 'the fx timestamp did not reach the ledger');
    assert(rows[0].settlement_currency.trim() === 'USD', 'the settlement currency did not reach the ledger');

    const audit = await auditFor('finance.transaction_settled', id);
    assert(audit[0].detail.rate_id === res.rateId, 'the audit row lost the rate id');
  });

  await test('a named rate row is used exactly, in either direction', async () => {
    const forward = await recordRate(finance, 'KES', 'USD', 0.0077, 'Central Bank of Kenya', inWindow);
    const id = await transaction('KES', 100000);
    const res = await settle(finance, id, 770, 'USD', forward);
    assert(Number(res.fxRate) === 0.0077, `the named rate was not used: ${res.fxRate}`);
    assert(res.rateId === forward, 'the settlement named a different row');
    assert(res.derived === false, 'a forward rate was called derived');

    const inverse = await recordRate(finance, 'USD', 'KES', 130, 'Central Bank of Kenya', inWindow);
    const other = await transaction('KES', 130000);
    const derived = await settle(finance, other, 1000, 'USD', inverse);
    assert(derived.derived === true, 'an inverted rate was not marked derived');
    assert(Math.abs(Number(derived.fxRate) - 1 / 130) < 1e-12,
      `the inverted rate is ${derived.fxRate}`);
    assert(derived.fxSource.includes('derived by inverting'),
      `the ledger would not show the derivation: ${derived.fxSource}`);
  });

  await test('a named rate for some other pair is refused', async () => {
    const unrelated = await recordRate(finance, 'GBP', 'EUR', 1.17, 'published', inWindow);
    const id = await transaction('KES', 1000);
    await rejects(() => settle(finance, id, 10, 'USD', unrelated),
      'a settlement cited a rate between two other currencies');
  });

  await test('a transaction that failed or was reversed cannot be settled', async () => {
    const failed = await transaction('UGX', 1000, { status: 'failed' });
    await rejects(() => settle(finance, failed, 1000, 'UGX'), 'a failed transaction settled');

    const reversed = await transaction('UGX', 1000, { status: 'reversed' });
    await rejects(() => settle(finance, reversed, 1000, 'UGX'), 'a reversed transaction settled');
  });

  await test('a provider restatement is allowed and keeps the earlier figure', async () => {
    const id = await transaction('UGX', 20000);
    await settle(finance, id, 19900, 'UGX');
    const again = await settle(finance, id, 19750, 'UGX');
    assert(again.restated === true, 'a second settlement did not say it was a restatement');
    assert(again.settlementAmountMinor === '19750', `the restatement stored ${again.settlementAmountMinor}`);

    const audit = await auditFor('finance.transaction_settled', id);
    assert(audit.length === 2, `expected both settlements audited, found ${audit.length}`);
    assert(audit[0].detail.previous_settlement_amount_minor === '19900',
      `the restatement lost the figure it replaced: ${audit[0].detail.previous_settlement_amount_minor}`);
    assert(audit[0].detail.previous_status === 'settled', 'the restatement lost the earlier status');
  });

  await test('a settled amount must be a whole number of minor units', async () => {
    const id = await transaction('UGX', 1000);
    await rejects(() => settle(finance, id, -5, 'UGX'), 'a negative settlement was accepted');
    await rejects(() => settle(finance, id, null, 'UGX'), 'a missing settlement was accepted');
    await rejects(() => settle(finance, id, 1000, 'SHILLINGS'), 'a word was accepted as a currency');
    // Zero is allowed: a provider can settle nothing at all after fees.
    const nothing = await settle(finance, id, 0, 'UGX');
    assert(nothing.settlementAmountMinor === '0', 'a zero settlement was refused');
  });

  // -------------------------------------------------------------------
  // The report
  // -------------------------------------------------------------------

  await test('only finance staff may read the report', async () => {
    await rejects(() => report(ordinary, winFrom, winTo), 'an ordinary person read the report');
    await rejects(() => report(support, winFrom, winTo), 'a support agent read the report');
  });

  await test('the window has to be a window', async () => {
    await rejects(() => report(finance, null, winTo), 'a report with no start');
    await rejects(() => report(finance, winTo, winFrom), 'a report that ends before it starts');
    await rejects(() => report(finance, winFrom, new Date(now + day).toISOString()),
      'a report ending in the future');
    await rejects(() => report(finance, new Date(now - 800 * day).toISOString(), winTo),
      'a report spanning more than a year');
  });

  await test('an empty window reports nothing rather than failing', async () => {
    const res = await report(finance,
      new Date(now - 900 * day).toISOString(), new Date(now - 800 * day).toISOString());
    assert(res.reportingCurrency === 'USD', `reporting currency is ${res.reportingCurrency}`);
    assert(res.rows.length === 0, `an empty window returned ${res.rows.length} rows`);
    assert(res.earnings.length === 0, 'an empty window returned earnings');
    assert(res.byDirection.length === 0, 'an empty window returned directions');
    assert(res.totals.transactions === 0, `an empty window counted ${res.totals.transactions}`);
  });

  // One convertible currency, one that nobody recorded a rate for, and a
  // refund in the same currency so the direction split has something to split.
  const captureUgx = await transaction('UGX', 500000,
    { type: 'capture', direction: 'credit', occurredAt: inWindow });
  const captureQqq = await transaction('QQQ', 900,
    { type: 'capture', direction: 'credit', occurredAt: inWindow });
  await transaction('UGX', 50000,
    { type: 'refund', direction: 'debit', occurredAt: inWindow });
  await transaction('USD', 2500,
    { type: 'capture', direction: 'credit', occurredAt: inWindow });

  await q(
    `insert into public.instructor_earnings_entries
       (instructor_user_id, financial_transaction_id, gross_amount_minor, currency_code,
        revenue_share_percent, net_amount_minor, status, accrued_at)
     values ($1,$2,500000,'UGX',50,250000,'accrued',$3)`,
    [teacher, captureUgx, inWindow]);
  await q(
    `insert into public.instructor_earnings_entries
       (instructor_user_id, gross_amount_minor, currency_code,
        revenue_share_percent, net_amount_minor, status, accrued_at)
     values ($1,900,'QQQ',50,450,'accrued',$2)`,
    [teacher, inWindow]);

  await test('the report converts what it can and names what it cannot', async () => {
    const res = await report(finance, winFrom, winTo);
    // A timestamptz inside jsonb is rendered in the session zone, so the window
    // is compared as a moment rather than as a string.
    assert(new Date(res.window.from).getTime() === new Date(winFrom).getTime(),
      `the window came back as ${res.window.from}`);
    assert(new Date(res.window.to).getTime() === new Date(winTo).getTime(),
      `the window ended at ${res.window.to}`);
    assert(res.rows.length >= 4, `expected at least four groups, found ${res.rows.length}`);

    const capture = res.rows.find(
      (r) => r.transactionType === 'capture' && r.currency === 'UGX');
    assert(capture !== undefined, 'the UGX capture is missing from the report');
    assert(capture.count === 1, `the UGX capture counted ${capture.count}`);
    assert(capture.amountMinor === '500000', `gross was ${capture.amountMinor}`);
    // 500 000 shillings at 0.00027 is 135 dollars = 13 500 cents.
    assert(capture.reportingAmountMinor === '13500',
      `the UGX capture reported as ${capture.reportingAmountMinor}`);

    const dollars = res.rows.find(
      (r) => r.transactionType === 'capture' && r.currency === 'USD');
    assert(dollars.reportingAmountMinor === '2500', 'a dollar amount was converted');

    const unconverted = res.unconverted.find((u) => u.currency === 'QQQ');
    assert(unconverted !== undefined, 'a currency with no rate was silently converted');
    assert(unconverted.amountMinor === '900', `the unconverted amount is ${unconverted.amountMinor}`);
    assert(res.totals.missingRates.includes('QQQ'),
      `missing rates are ${JSON.stringify(res.totals.missingRates)}`);
    assert(res.totals.unconvertedGroups >= 2,
      `expected the QQQ transaction and its earnings, found ${res.totals.unconvertedGroups}`);
    void captureQqq;
  });

  await test('the report gives a rate for every figure it converted', async () => {
    const res = await report(finance, winFrom, winTo);
    const pairs = res.ratesUsed.map((r) => r.base);
    assert(pairs.includes('UGX'),
      `UGX has no rate in ratesUsed: ${JSON.stringify(res.ratesUsed)}`);
    assert(pairs.includes('USD'), 'the identity conversion is not reported as a rate used');
    const ugx = res.ratesUsed.find((r) => r.base === 'UGX');
    assert(ugx.source === 'Bank of Uganda', `the rate used has source ${ugx.source}`);
    assert(ugx.observedAt !== null, 'the rate used has no observation time');
    assert(ugx.rateId !== null, 'the rate used cannot be traced to a row');
  });

  await test('the report separates directions and refuses to net them', async () => {
    const res = await report(finance, winFrom, winTo);
    const credit = res.byDirection.find((d) => d.direction === 'credit');
    const debit = res.byDirection.find((d) => d.direction === 'debit');
    assert(credit !== undefined && debit !== undefined,
      `directions are ${JSON.stringify(res.byDirection)}`);
    // 13 500 (UGX capture) + 2 500 (USD capture) = 16 000 cents of credits.
    assert(credit.reportingAmountMinor === '16000',
      `credits total ${credit.reportingAmountMinor}`);
    // 50 000 UGX refunded at 0.00027 is 13.50 dollars = 1 350 cents.
    assert(debit.reportingAmountMinor === '1350', `debits total ${debit.reportingAmountMinor}`);

    // No single figure that adds a refund to a capture. Whether they net is a
    // business decision, and a report that made it would bury the answer in a
    // sum nobody reads the terms of.
    assert(res.totals.reportingAmountMinor === undefined,
      'the report produced a net figure across directions');
    assert(res.note.includes('nets'), 'the report does not say that it does not net');
  });

  await test('the report converts what teachers are owed, in the same currency', async () => {
    const res = await report(finance, winFrom, winTo);
    const earned = res.earnings.find((e) => e.currency === 'UGX');
    assert(earned !== undefined, `earnings rows are ${JSON.stringify(res.earnings)}`);
    assert(earned.grossAmountMinor === '500000', `gross earnings were ${earned.grossAmountMinor}`);
    assert(earned.netAmountMinor === '250000', `net earnings were ${earned.netAmountMinor}`);
    // Half of 135 dollars is 67.50, which is 6 750 cents.
    assert(earned.reportingNetMinor === '6750',
      `earnings reported as ${earned.reportingNetMinor}`);
    assert(earned.reportingGrossMinor === '13500',
      `gross earnings reported as ${earned.reportingGrossMinor}`);

    const owed = res.earnings.find((e) => e.currency === 'QQQ');
    assert(owed.reportingNetMinor === null,
      `earnings in a currency with no rate were converted to ${owed.reportingNetMinor}`);
  });

  await test('a rate that moved implausibly is shown beside the total', async () => {
    // ABC moved 1 -> 50 with a written reason, and the report window resolves
    // ABC at the later observation, so the reader of the total can see it.
    await transaction('ABC', 1000,
      { type: 'capture', direction: 'credit', occurredAt: inWindow });
    const res = await report(finance, winFrom, winTo);
    const outlier = res.outliers.find((o) => o.base === 'ABC');
    assert(outlier !== undefined, `outliers are ${JSON.stringify(res.outliers)}`);
    assert(outlier.previousRate === '1.00000000', `the outlier lost its previous rate: ${outlier.previousRate}`);
    assert(outlier.factor === 10, `the outlier lost the factor: ${outlier.factor}`);
  });

  await test('a window whose rate is older than the window still resolves', async () => {
    // The report converts at p_to, so a rate observed before the window is the
    // one in force for it, and a rate observed after the window is not.
    const later = await recordRate(finance, 'UGX', 'USD', 0.00019, 'a later observation',
      new Date(now - 10 * day).toISOString());
    const res = await report(finance, winFrom, winTo);
    const ugx = res.ratesUsed.find((r) => r.base === 'UGX');
    assert(ugx.rateId !== later, 'the report used a rate observed after its own window');
    assert(Number(ugx.rate) === 0.00027, `the report used ${ugx.rate}`);
  });

  // -------------------------------------------------------------------
  // Grants
  // -------------------------------------------------------------------

  await test('the writers and the report are not callable anonymously', async () => {
    const expected = {
      record_exchange_rate: false,
      record_transaction_settlement: false,
      report_money_in_reporting_currency: false,
      resolve_exchange_rate: false,
      to_reporting_currency: false,
      setting_text: false,
      // A pure lookup with no table behind it, mirrored in the browser by
      // money.ts. Nothing is disclosed by it that the browser does not know.
      currency_minor_divisor: true,
    };
    const rows = (await q(
      `select p.proname,
              bool_or(has_function_privilege('anon'::name, p.oid, 'execute'::text)) as anon_may,
              bool_or(has_function_privilege('authenticated'::name, p.oid, 'execute'::text)) as auth_may
         from pg_proc p
         join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public'
          and p.proname in ('record_exchange_rate', 'record_transaction_settlement',
                            'report_money_in_reporting_currency', 'resolve_exchange_rate',
                            'to_reporting_currency', 'currency_minor_divisor', 'setting_text')
        group by p.proname`)).rows;
    assert(rows.length === 7, `expected seven functions, found ${rows.length}`);
    for (const row of rows) {
      assert(row.anon_may === expected[row.proname],
        `${row.proname}: anon execute is ${row.anon_may}, expected ${expected[row.proname]}`);
      assert(row.auth_may === true, `${row.proname} is not callable by a signed-in user`);
    }
  });

  await test('each new function exists exactly once', async () => {
    // A DEFAULT added to an existing signature creates an overload, and the old
    // one keeps answering calls that meant the new one.
    const rows = (await q(
      `select p.proname, count(*)::int n
         from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public'
          and p.proname in ('setting_int','setting_text','currency_minor_divisor',
                            'record_exchange_rate','resolve_exchange_rate',
                            'to_reporting_currency','record_transaction_settlement',
                            'report_money_in_reporting_currency')
        group by p.proname`)).rows;
    assert(rows.length === 8, `expected eight functions, found ${rows.length}`);
    for (const row of rows) {
      assert(row.n === 1, `${row.proname} has ${row.n} overloads`);
    }
  });

  await test('an ordinary user can convert without being able to read the register', async () => {
    // cer_read makes the rate table public on purpose: a storefront may need to
    // show a converted price. What is not public is the settings table that
    // says which currency to convert into, and setting_text reads it as its
    // definer so an ordinary person gets the answer without the register.
    const res = await convert(ordinary, 5000, 'UGX');
    assert(res !== null && res.amountMinor === '135',
      `an ordinary user could not convert: ${JSON.stringify(res)}`);

    await asUser(ordinary, async () => {
      const seen = (await q('select count(*)::int n from public.platform_settings')).rows[0].n;
      assert(seen === 0, `an ordinary user read ${seen} settings rows`);
    });
  });
}
