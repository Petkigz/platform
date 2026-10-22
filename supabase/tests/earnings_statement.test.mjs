// What a teacher has earned.
//
// The rows existed since 2026-11-02 and nothing read them: a teacher could not
// see a single figure about their own work. This suite pins the statement —
//
//   - it is per currency, never summed across currencies;
//   - a reversed entry is not owed;
//   - a stranger sees nothing of somebody else's;
//   - and it says whether payouts exist at all, because `teaching.payouts` ships
//     off and no money has ever left the platform.

export async function run(ctx) {
  const {
    q, test, assert,
    rejects, bootstrapAdmin, newUser, newProfile, newInstructor,
  } = ctx;

  const admin = await bootstrapAdmin('earn-admin@example.com');
  const teacher = await newInstructor('earn-teacher@example.com', admin);
  const other = await newInstructor('earn-other@example.com', admin);

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

  const statement = (actor, limit = 50) =>
    asActor(actor, 'select public.my_earnings($1) e', [limit]).then((r) => r.rows[0].e);

  /** One accrual, written the way the platform writes them. */
  async function accrue(instructor, {
    gross, share = 50, currency = 'UGX', status = 'accrued', when = null,
  } = {}) {
    const net = Math.round((gross * share) / 100);
    return (await scalar(
      `insert into public.instructor_earnings_entries
         (instructor_user_id, gross_amount_minor, currency_code,
          revenue_share_percent, net_amount_minor, status, accrued_at)
       values ($1,$2,$3,$4,$5,$6, coalesce($7::timestamptz, now())) returning id`,
      [instructor, gross, currency, share, net, status, when])).id;
  }

  await test('earnings are reported per currency and never summed across them', async () => {
    const shillings = await accrue(teacher, { gross: 30000, currency: 'UGX' });
    await accrue(teacher, { gross: 10000, currency: 'UGX' });
    await accrue(teacher, { gross: 2000, currency: 'USD' });
    void shillings;

    const result = await statement(teacher);
    assert(result.byCurrency.length === 2,
      `expected two currencies, got ${JSON.stringify(result.byCurrency)}`);
    const ugx = result.byCurrency.find((c) => c.currency === 'UGX');
    const usd = result.byCurrency.find((c) => c.currency === 'USD');
    assert(Number(ugx.owedMinor) === 15000 + 5000,
      `UGX owed was ${ugx.owedMinor} (50% of 30,000 and 10,000 is 20,000)`);
    assert(Number(usd.owedMinor) === 1000, `USD owed was ${usd.owedMinor}`);
    assert(Number(ugx.grossMinor) === 40000);
    assert(result.entries.length === 3, `listed ${result.entries.length} entries`);
  });

  await test('the split is the one recorded on the row, not the current setting', async () => {
    const historical = await accrue(teacher, { gross: 20000, share: 40, currency: 'EUR' });
    const result = await statement(teacher);
    const row = result.entries.find((e) => e.id === historical);
    assert(Number(row.sharePercent) === 40, `share was ${row.sharePercent}`);
    assert(Number(row.netMinor) === 8000, `net was ${row.netMinor}`);
    // And the setting still says what a *new* sale would use.
    assert(Number(result.sharePercent) === 50, `setting read as ${result.sharePercent}`);
  });

  await test('a reversed entry is kept, and is not owed', async () => {
    const person = await adultInstructor('Reversed');
    await accrue(person, { gross: 30000, currency: 'UGX' });
    const reversed = await accrue(person, { gross: 10000, currency: 'UGX', status: 'reversed' });

    const result = await statement(person);
    const ugx = result.byCurrency.find((c) => c.currency === 'UGX');
    assert(Number(ugx.owedMinor) === 15000, `owed was ${ugx.owedMinor}`);
    assert(Number(ugx.reversedMinor) === 5000, `reversed was ${ugx.reversedMinor}`);
    // Gross is the sale, not the share: 30,000 sold, 10,000 reversed out.
    assert(Number(ugx.grossMinor) === 30000, `gross counted the reversal: ${ugx.grossMinor}`);
    // The row is still there: a refund reverses an accrual, it does not erase it.
    assert(result.entries.some((e) => e.id === reversed), 'the reversed entry vanished');
  });

  await test('a stranger sees none of it', async () => {
    const person = await adultInstructor('Stranger');
    const result = await statement(person);
    assert(result.entries.length === 0, `a stranger saw ${result.entries.length} entries`);
    assert(result.byCurrency.length === 0, 'a stranger was shown a currency total');
    assert(result.nothingPaidYet === true);
  });

  await test('a signed-out caller is refused, and the limit is validated', async () => {
    const person = await adultInstructor('Limits');
    await rejects(() => q('select public.my_earnings(50)'),
      /sign in to read your earnings/i);
    await rejects(() => statement(person, 0), /between 1 and 500/i);
    await rejects(() => statement(person, 501), /between 1 and 500/i);
  });

  await test('the statement says whether payouts exist at all', async () => {
    const person = await adultInstructor('Honest');
    const result = await statement(person);
    // Shipped state: `teaching.payouts` is CODE-gated and off. The number is
    // returned so the screen can say it rather than infer it from an empty list.
    assert(result.payoutsEnabled === false, 'the statement claims payouts are enabled');
    assert(result.nothingPaidYet === true);
  });

  await test('a paid entry is not also counted as owed', async () => {
    const person = await adultInstructor('Paid');
    await accrue(person, { gross: 10000, currency: 'UGX', status: 'payable' });
    await accrue(person, { gross: 40000, currency: 'UGX', status: 'paid' });
    const result = await statement(person);
    const ugx = result.byCurrency.find((c) => c.currency === 'UGX');
    assert(Number(ugx.owedMinor) === 5000, `owed was ${ugx.owedMinor} (only the payable one)`);
    assert(Number(ugx.paidMinor) === 20000, `paid was ${ugx.paidMinor}`);
    assert(result.nothingPaidYet === false, 'a paid entry did not clear nothingPaidYet');
  });

  // -------------------------------------------------------------------------
  async function adultInstructor(name) {
    const id = await newUser(`earn-${crypto.randomUUID().slice(0, 8)}@example.com`);
    await newProfile(id, name);
    return id;
  }
}
