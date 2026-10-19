// The revenue-share percentage is a business decision, not a migration
// default to invent. This suite verifies that the seeded 0 can be changed by
// finance/platform staff through the audited writer and by nobody else.

export async function run(ctx) {
  const { q, test, assert, rejects, bootstrapAdmin, newUser, newProfile, grantRole } = ctx;

  const platformAdmin = await bootstrapAdmin('share-platform@example.com');
  const financeAdmin = await newUser('share-finance@example.com');
  await newProfile(financeAdmin, 'Finance admin');
  await grantRole(financeAdmin, 'finance_admin', platformAdmin);

  const governanceAdmin = await newUser('share-governance@example.com');
  await newProfile(governanceAdmin, 'Governance admin');
  await grantRole(governanceAdmin, 'governance_admin', platformAdmin);

  const supportAgent = await newUser('share-support@example.com');
  await newProfile(supportAgent, 'Support agent');
  await grantRole(supportAgent, 'support_agent', platformAdmin);

  const ordinary = await newUser('share-ordinary@example.com');
  await newProfile(ordinary, 'Ordinary user');

  /** Call as the named user; the actor is derived from the JWT, never an arg. */
  async function setAs(actor, percent, reason) {
    await q('begin');
    await q('select set_config(\'request.jwt.claims\', $1, true)', [
      JSON.stringify({ sub: actor, role: 'authenticated' }),
    ]);
    await q('set local role authenticated');
    try {
      const r = await q('select public.set_revenue_share_percent($1,$2) as percent', [
        percent,
        reason,
      ]);
      await q('commit');
      return r;
    } catch (e) {
      await q('rollback');
      throw e;
    }
  }

  async function currentPercent() {
    const r = await q(`select value_text from public.platform_settings
      where key='teaching.revenue_share_percent'`);
    return Number(r.rows[0]?.value_text);
  }

  await test('the register ships the share the owner chose, not an invented one', async () => {
    // 0 was the honest value while the number was unchosen. It was chosen on
    // 2026-10-19, and the register is the seed: every fresh environment has to
    // start from the decision rather than from the placeholder, because
    // earnings accrue at whatever this says when an order is confirmed.
    assert((await currentPercent()) === 50,
      `the shipped share is ${await currentPercent()}, expected the chosen 50`);

    const row = (await q(`select description, preconditions
      from public.platform_settings
      where key='teaching.revenue_share_percent'`)).rows[0];
    assert(/chosen at 50%/i.test(row.description),
      'the register no longer says who chose the number or when');
    assert(/tax treatment/i.test(row.preconditions),
      'choosing the percentage must not quietly settle the terms around it');

    // The change is in the log, and the log says it came from a migration
    // rather than pretending an administrator made it.
    const seeded = (await q(`select actor, detail from public.governance_audit_events
      where action='teaching.revenue_share_changed' and detail->>'source'='migration'`)).rows;
    assert(seeded.length === 1, `expected one migration-sourced change, got ${seeded.length}`);
    assert(seeded[0].actor === null, 'a migration claimed an actor it did not have');
    assert(Number(seeded[0].detail.previous_percent) === 0);
    assert(Number(seeded[0].detail.new_percent) === 50);
    assert(String(seeded[0].detail.reason).length > 10,
      'the recorded decision has no reason worth reading');
  });

  await test('finance admin sets a percentage and the actor/reason are audited', async () => {
    const r = await setAs(financeAdmin, 25, 'Approved instructor payout policy');
    assert(Number(r.rows[0]?.percent) === 25, 'writer returned the wrong percentage');
    assert((await currentPercent()) === 25, 'setting was not updated');

    const audit = (await q(`select actor, action, target_type, detail
      from public.governance_audit_events
      where action='teaching.revenue_share_changed'
      order by occurred_at desc limit 1`)).rows[0];
    assert(audit.actor === financeAdmin, 'audit actor did not come from the finance admin session');
    assert(audit.action === 'teaching.revenue_share_changed');
    assert(audit.target_type === 'platform_setting');
    assert(audit.detail.key === 'teaching.revenue_share_percent');
    assert(Number(audit.detail.previous_percent) === 50,
      'the audit trail lost the share that was in force before this change');
    assert(Number(audit.detail.new_percent) === 25);
    assert(audit.detail.reason === 'Approved instructor payout policy');
  });

  await test('platform admin may change the percentage too', async () => {
    const r = await setAs(platformAdmin, 30, 'Corrected after finance review');
    assert(Number(r.rows[0]?.percent) === 30);
    assert((await currentPercent()) === 30);
  });

  await test('percentage boundaries 0 and 100 are valid', async () => {
    await setAs(financeAdmin, 0, 'Return to the unset business decision');
    assert((await currentPercent()) === 0);
    await setAs(financeAdmin, 100, 'Test upper bound');
    assert((await currentPercent()) === 100);
    await setAs(financeAdmin, 0, 'Restore safe unset default');
    assert((await currentPercent()) === 0);
  });

  await test('out-of-range percentages are refused and do not change the setting', async () => {
    await setAs(financeAdmin, 0, 'Establish safe test baseline');
    for (const percent of [-1, 101, 250]) {
      await rejects(() => setAs(financeAdmin, percent, 'bad value'),
        /between 0 and 100/i);
      assert((await currentPercent()) === 0,
        `invalid ${percent}% changed the stored value`);
    }
  });

  await test('a written reason is required', async () => {
    for (const reason of ['', '   ', null]) {
      await rejects(() => setAs(financeAdmin, 20, reason), /written reason is required/i);
      assert((await currentPercent()) === 0, 'a no-reason request changed the setting');
    }
  });

  await test('a governance admin cannot change financial policy', async () => {
    await rejects(() => setAs(governanceAdmin, 20, 'not my domain'),
      /only a finance admin or platform admin/i);
    assert((await currentPercent()) === 0);
  });

  await test('a support agent cannot change financial policy', async () => {
    await rejects(() => setAs(supportAgent, 20, 'not my domain'),
      /only a finance admin or platform admin/i);
    assert((await currentPercent()) === 0);
  });

  await test('an ordinary user cannot change financial policy', async () => {
    await rejects(() => setAs(ordinary, 20, 'not my domain'),
      /only a finance admin or platform admin/i);
    assert((await currentPercent()) === 0);
  });

  await test('an anonymous caller cannot change financial policy', async () => {
    await q('begin');
    await q("select set_config('request.jwt.claims', '', true)");
    await q('set local role authenticated');
    await rejects(
      () => q("select public.set_revenue_share_percent(20,'anonymous')"),
      /sign in to change the revenue share/i,
    );
    await q('rollback');
    assert((await currentPercent()) === 0);
  });

  await test('caller cannot spoof the actor through RPC arguments', async () => {
    // The exact signature has only (percent, reason); actor always comes from
    // current_user_id(). A caller-supplied actor would let one admin forge
    // another admin's financial action.
    await q('begin');
    await q('select set_config(\'request.jwt.claims\', $1, true)', [
      JSON.stringify({ sub: financeAdmin, role: 'authenticated' }),
    ]);
    await q('set local role authenticated');
    await rejects(
      () => q("select public.set_revenue_share_percent(20,'spoof', $1)", [platformAdmin]),
      /function public\.set_revenue_share_percent\(integer, unknown, unknown\) does not exist/i,
    );
    await q('rollback');
    assert((await currentPercent()) === 0);
  });
}
