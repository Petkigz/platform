// Who may write the register.
//
// The read policy on `platform_settings` is `is_privileged`, and that is right:
// knowing a feature is off is part of being staff. The write policy was the
// same clause, which meant a support agent could turn `commerce.checkout` on
// with one UPDATE — not through any screen, but the table is a door too, and a
// screen that hides a button is not a permission check.
//
// These tests are about that door. The dashboard is the other one, and it is
// tested where the dashboard lives.

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    committed, bootstrapAdmin, newUser, newProfile, grantRole,
  } = ctx;

  const admin = await bootstrapAdmin('auth-admin@example.com');

  const employee = async (email, code) => {
    const id = await newUser(email);
    await newProfile(id, code);
    await committed(() => grantRole(id, code, admin));
    return id;
  };

  const finance = await employee('auth-finance@example.com', 'finance_admin');
  const governance = await employee('auth-gov@example.com', 'governance_admin');
  const support = await employee('auth-support@example.com', 'support_agent');
  const learner = await newUser('auth-learner@example.com');
  await newProfile(learner, 'Learner');

  /**
   * Run one statement as an actor, then roll back. Nothing these tests do
   * should leak into a later suite — the settings they touch are global.
   */
  async function as(actor, sql, params = []) {
    await q('begin');
    await q(`select set_config('request.jwt.claims', $1, true)`,
      [JSON.stringify({ sub: actor, role: 'authenticated' })]);
    await q('set local role authenticated');
    try {
      return await q(sql, params);
    } finally {
      await q('rollback');
    }
  }

  const value = async (key) =>
    (await q('select value_text from public.platform_settings where key = $1', [key])).rows[0]
      ?.value_text;

  // -------------------------------------------------------------------------
  console.log('\nA switch belongs to the platform admin');
  // -------------------------------------------------------------------------

  await test('the register splits into ninety-one flags and seventeen controls', async () => {
    const kinds = (await q(
      `select setting_kind, count(*)::int n from public.platform_settings group by 1`)).rows;
    const byKind = Object.fromEntries(kinds.map((r) => [r.setting_kind, r.n]));
    assert(byKind.flag === 91, `${byKind.flag} flags`);
    assert(byKind.control === 17, `${byKind.control} controls`);
  });

  await test('a support agent may read the register but not flip it', async () => {
    const before = await value('commerce.checkout');

    const read = await as(support, 'select count(*)::int n from public.platform_settings');
    assert(read.rows[0].n === 108, `could read ${read.rows[0].n} rows`);

    await rejects(
      () => as(support, `update public.platform_settings set value_text = 'true'
                          where key = 'commerce.checkout'`),
      /only the platform admin may change a feature switch; commerce\.checkout may be read, not flipped/);

    assert(await value('commerce.checkout') === before, 'the switch moved anyway');
  });

  await test('a finance admin cannot flip a switch either', async () => {
    // Finance owns money. `commerce.checkout` is money-adjacent, which is
    // exactly the argument that would be made for letting them.
    const before = await value('platform.support');
    await rejects(
      () => as(finance, `update public.platform_settings set value_text = $1
                          where key = 'platform.support'`,
        [before === 'true' ? 'false' : 'true']),
      /only the platform admin/);
  });

  await test('a governance admin cannot flip a switch', async () => {
    // Relative, not absolute: an earlier suite may already have turned this on,
    // and a write that changes nothing is not a write.
    const before = await value('learning.discussion');
    await rejects(
      () => as(governance, `update public.platform_settings set value_text = $1
                             where key = 'learning.discussion'`,
        [before === 'true' ? 'false' : 'true']),
      /only the platform admin/);
  });

  await test('the platform admin can, and it sticks within the statement', async () => {
    const before = await value('commerce.checkout');
    const next = before === 'true' ? 'false' : 'true';
    const result = await as(admin, `update public.platform_settings set value_text = $1
                                     where key = 'commerce.checkout' returning value_text`,
      [next]);
    assert(result.rows[0].value_text === next, 'the platform admin was refused');
    // Rolled back by `as()`, so the suite leaves the global value where it was.
    assert(await value('commerce.checkout') === before, 'the test leaked a value');
  });

  await test('demoting a flag so it can be flipped is refused at the first write', async () => {
    // gate_type = 'code' refuses to be enabled; leaving gate_type editable for
    // staff would make that a two-step formality.
    await rejects(
      () => as(support, `update public.platform_settings set gate_type = 'admin'
                          where key = 'learning.multi_language'`),
      /only the platform admin/);
  });

  await test('a settings write with no session is still allowed, because a migration is one', async () => {
    // The guard reads the session. A seed or a backfill runs with none, and
    // every migration in this repository is exactly that.
    const before = await value('learning.discussion');
    await q(`update public.platform_settings set value_text = 'false'
              where key = 'learning.discussion'`);
    assert(await value('learning.discussion') === 'false', 'a sessionless write was refused');
    if (before !== 'false') {
      await q(`update public.platform_settings set value_text = $1
                where key = 'learning.discussion'`, [before]);
    }
  });

  // -------------------------------------------------------------------------
  console.log('\nA control goes to its own writer');
  // -------------------------------------------------------------------------

  await test('a control cannot be changed by writing the table instead of its writer', async () => {
    await rejects(
      () => as(support, `update public.platform_settings set value_text = '90'
                          where key = 'teaching.revenue_share_percent'`),
      /\[teaching\.revenue_share_percent\] has its own writer and its own role/);

    await rejects(
      () => as(finance, `update public.platform_settings set value_text = 'EUR'
                          where key = 'governance.min_approvals'`),
      /has its own writer and its own role/);
  });

  await test('every writer still works through its own door', async () => {
    // The guard has to be invisible to the sanctioned paths, or it would have
    // exchanged one hole for a broken screen.
    const share = await as(finance,
      `select public.set_revenue_share_percent(51, 'checking the guard') p`);
    assert(share.rows[0].p === 51, 'the revenue share writer was refused');

    const currency = await as(finance,
      `select public.set_platform_control('finance.reporting_currency','EUR','guard check') p`);
    assert(currency.rows[0].p.value === 'EUR', `control was ${JSON.stringify(currency.rows[0].p)}`);

    const approvals = await as(governance,
      `select public.set_platform_control('governance.min_approvals','2','guard check') p`);
    assert(approvals.rows[0].p.value === '2', 'the governance control writer was refused');

    // The refund window is staff work, not finance's alone: that is the whole
    // reason support may move it.
    const window = await as(support, `select public.set_refund_window(48, 'guard check') p`);
    assert(window.rows[0].p === 48, `window was ${JSON.stringify(window.rows[0].p)}`);
  });

  await test('a control keeps its own role even through the allowlist', async () => {
    // `may_change_control()` is still the gate for the ten; the new guard did
    // not quietly widen it.
    await rejects(
      () => as(finance,
        `select public.set_platform_control('media.upload_quota_gb_per_teacher','500','mine now')`),
      /only a platform admin/i);

    await rejects(
      () => as(governance,
        `select public.set_platform_control('finance.rate_sanity_factor','20','mine now')`),
      /only .*finance/i);
  });

  await test('a learner reads an empty register and writes nothing', async () => {
    // RLS filters rather than raising here: a learner selecting gets no rows,
    // and an UPDATE that matches no visible row updates nothing. The assertion
    // is that the register is empty to them and unmoved afterwards, not that
    // the statement exploded — an error and an empty list would look the same
    // to a caller that only counted.
    const read = await as(learner, 'select count(*)::int n from public.platform_settings');
    assert(read.rows[0].n === 0, `a learner could read ${read.rows[0].n} settings`);

    const before = await value('commerce.checkout');
    const write = await as(learner, `update public.platform_settings set value_text = 'true'
                                      where key = 'commerce.checkout' returning key`);
    assert(write.rows.length === 0, 'a learner updated a setting');
    assert(await value('commerce.checkout') === before, 'the switch moved');
  });
}
