// Changing the refund window is a decision, so it has a writer and a screen.
//
// `commerce.refund_window_hours` was added by a schema migration, which means
// the owner could change it — with an UPDATE against a table they cannot see.
// That is the shape this project keeps rejecting: the standing rule is that a
// routine change is a field or a button on the screen of whoever is allowed to
// make it.
//
// What this suite pins is that the writer is not an UPDATE with extra steps: a
// reason in writing, a range with bounds a person can understand, an audit row
// carrying the old value beside the new one, and no power to rewrite the rest of
// the register under cover of a feature about refunds.

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    asUser, committed, bootstrapAdmin, newUser, newProfile, grantRole,
  } = ctx;

  const admin = await bootstrapAdmin('win-ctl-admin@example.com');
  const scalar = async (sql, params = []) => (await q(sql, params)).rows[0];

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

  const set = (actor, hours, reason) =>
    asActor(actor, 'select public.set_refund_window($1,$2) h', [hours, reason])
      .then((r) => r.rows[0].h);

  const hours = async () =>
    (await scalar(`select value_text::int n from public.platform_settings
                    where key = 'commerce.refund_window_hours'`)).n;

  const restore = (value) => q(
    `update public.platform_settings set value_text = $1
      where key = 'commerce.refund_window_hours'`, [String(value)]);

  // -------------------------------------------------------------------------
  console.log('\nWho may move it');
  // -------------------------------------------------------------------------

  await test('a signed-out caller cannot move the window', async () => {
    await rejects(() => q('select public.set_refund_window(24, $1)', ['A reason']),
      /only platform staff/i);
  });

  await test('a learner cannot move the window', async () => {
    const userId = await newUser('win-ctl-learner@example.com');
    await newProfile(userId, 'Learner');
    await rejects(() => set(userId, 24, 'Because I want my money back faster'),
      /only platform staff/i);
    assert((await hours()) === 72, 'a learner changed the window');
  });

  await test('a support agent may move it, and it is attributed to them', async () => {
    // The window is a policy about customers' money rather than a governance
    // act: whoever works the refund queue needs to be able to answer "three
    // days is too short for this market".
    const agent = await newUser('win-ctl-agent@example.com');
    await newProfile(agent, 'Support');
    await committed(() => grantRole(agent, 'support_agent', admin));

    await set(agent, 96, 'Ramadan and Eid weeks need a longer window');
    assert((await hours()) === 96, 'the window did not move');
    await restore(72);
  });

  // -------------------------------------------------------------------------
  console.log('\nThe reason, the bounds, the record');
  // -------------------------------------------------------------------------

  await test('a change needs a reason in writing', async () => {
    await rejects(() => set(admin, 48, '   '), /why the window/i);
    assert((await hours()) === 72, 'a change with no reason went through');
  });

  await test('a negative window is refused and says what to do instead', async () => {
    await rejects(() => set(admin, -1, 'Testing'),
      /use 0 to close self-serve refunds/i);
    assert((await hours()) === 72, 'a negative window went through');
  });

  await test('a window longer than a year is refused with the number in the sentence', async () => {
    await rejects(() => set(admin, 8761, 'Forever'), /longer than a year/i);
    assert((await hours()) === 72, 'a year-long window went through');
  });

  await test('zero is allowed and closes self-serve refunds', async () => {
    await set(admin, 0, 'No self-serve refunds while we sort out the provider');
    assert((await hours()) === 0, 'zero was refused');
    // And the clock agrees: `refund_window_hours()` clamps and reads the row.
    assert((await scalar('select public.refund_window_hours() n')).n === 0,
      'the reader disagrees with the writer');
    await restore(72);
  });

  await test('the change is audited with the old value, the new one and the reason', async () => {
    await set(admin, 120, 'Market research said five days');
    const event = await scalar(
      `select actor, action, detail from public.governance_audit_events
        where action = 'setting.refund_window_changed'
        order by occurred_at desc limit 1`);
    assert(event.action === 'setting.refund_window_changed', `action was ${event.action}`);
    assert(event.actor === admin, 'the audit does not name who changed it');
    assert(Number(event.detail.from_hours) === 72,
      `it recorded the old value as ${event.detail.from_hours}`);
    assert(Number(event.detail.to_hours) === 120,
      `it recorded the new value as ${event.detail.to_hours}`);
    assert(/market research/i.test(event.detail.reason),
      `the reason was not kept: ${event.detail.reason}`);
    await restore(72);
  });

  await test('the writer cannot reach any other control in the register', async () => {
    // A general settings writer would let any privileged account rewrite the
    // revenue share or the reporting currency under cover of refunds. This one
    // touches exactly one key, and the test is that the others did not move.
    const before = (await scalar(
      `select value_text v from public.platform_settings
        where key = 'teaching.revenue_share_percent'`)).v;
    await set(admin, 36, 'Probing whether this reaches further than it says');
    const after = (await scalar(
      `select value_text v from public.platform_settings
        where key = 'teaching.revenue_share_percent'`)).v;
    assert(before === after, 'a refund-window write changed the revenue share');
    await restore(72);
  });

  await test('the setting ships at 72 and is an ADMIN control', async () => {
    const row = await scalar(
      `select value_text, gate_type from public.platform_settings
        where key = 'commerce.refund_window_hours'`);
    assert(row.value_text === '72', `it shipped at ${row.value_text}`);
    assert(row.gate_type === 'admin', `it ships ${row.gate_type}-gated`);
  });
}
