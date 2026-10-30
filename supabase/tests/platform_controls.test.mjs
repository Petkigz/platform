// The controls with no writer, given one — each with its own bounds.
//
// Nine settings could only be changed with an UPDATE against a table the owner
// cannot see: the reporting currency, the rate sanity factor, the upload quota,
// the device cap, the saved-lesson lifetime, the live-room host, and three
// governance numbers. That is the shape the standing role rule rejects.
//
// This suite exists because the obvious fix — one function that writes any key
// it is given — is the same hole with a friendlier name. So it pins the three
// refusals that make this an allowlist rather than a settings hole:
//
//   1. a key not on the list is refused, with a sentence saying where it lives
//   2. a feature switch is refused and pointed at the flag dashboard
//   3. a control that already has its own writer is refused and named
//
// And it pins that the gate is per control, not per screen: a finance admin and
// a governance admin see different lists, and neither can reach the other's.

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    asUser, committed, bootstrapAdmin, newUser, newProfile, grantRole,
  } = ctx;

  const admin = await bootstrapAdmin('ctl-admin@example.com');
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

  async function staffWith(code) {
    const userId = await newUser(`ctl-${code}-${crypto.randomUUID().slice(0, 6)}@example.com`);
    await newProfile(userId, code);
    await committed(() => grantRole(userId, code, admin));
    return userId;
  }

  const set = (actor, key, value, reason = 'A reason for the record') =>
    asActor(actor, 'select public.set_platform_control($1,$2,$3) r', [key, value, reason])
      .then((r) => r.rows[0].r);

  const controlsFor = (actor) =>
    asActor(actor, 'select public.platform_controls() c').then((r) => r.rows[0].c);

  const keysFor = async (actor) => (await controlsFor(actor)).controls.map((c) => c.key);
  const current = async (key) =>
    (await scalar('select value_text v from public.platform_settings where key = $1', [key])).v;

  const restore = (key, value) => q(
    'update public.platform_settings set value_text = $2 where key = $1', [key, value]);

  const financeAdmin = await staffWith('finance_admin');
  const governanceAdmin = await staffWith('governance_admin');
  const supportAgent = await staffWith('support_agent');

  // -------------------------------------------------------------------------
  console.log('\nWho sees which control');
  // -------------------------------------------------------------------------

  await test('a learner has no controls at all', async () => {
    const learner = await newUser('ctl-learner@example.com');
    await newProfile(learner, 'Learner');
    await rejects(() => controlsFor(learner), /only platform staff/i);
    await rejects(() => q('select public.platform_controls()'), /sign in/i);
  });

  await test('a support agent sees an empty list rather than other people\u2019s numbers', async () => {
    // A support agent is privileged — they work queues — and owns none of these
    // controls. The count of what a teacher may store is not theirs to change,
    // and per the same rule `staff_attention()` follows, it is not theirs to see.
    const result = await controlsFor(supportAgent);
    assert(result.controls.length === 0,
      `a support agent saw ${result.controls.length} control(s)`);
    assert(result.totalControls === 15, `the register holds ${result.totalControls}`);
    assert(result.mineCount === 0, 'the count disagrees with the list');
  });

  await test('a finance admin sees the money controls and nothing else', async () => {
    const keys = await keysFor(financeAdmin);
    assert(keys.length === 2, `a finance admin saw ${keys.length}: ${keys.join(', ')}`);
    assert(keys.includes('finance.reporting_currency'), 'the reporting currency is missing');
    assert(keys.includes('finance.rate_sanity_factor'), 'the rate sanity factor is missing');
    // Not theirs: what a teacher may store is a cost decision for the owner.
    assert(!keys.includes('media.upload_quota_gb_per_teacher'),
      'a finance admin can change the upload quota');
    assert(!keys.includes('governance.min_approvals'),
      'a finance admin can change the publication threshold');
  });

  await test('a governance admin sees the governance controls and nothing else', async () => {
    const keys = await keysFor(governanceAdmin);
    assert(keys.length === 2, `a governance admin saw ${keys.length}: ${keys.join(', ')}`);
    assert(keys.includes('governance.min_approvals'), 'min approvals is missing');
    assert(keys.includes('governance.panel_required'), 'panel_required is missing');
    assert(!keys.includes('finance.reporting_currency'),
      'a governance admin can change the reporting currency');
    // Convening the board is the owner's act.
    assert(!keys.includes('governance.scholar_board_active'),
      'a governance admin can convene the scholarly board');
  });

  await test('a platform admin sees all fifteen', async () => {
    const result = await controlsFor(admin);
    assert(result.controls.length === 15, `saw ${result.controls.length}`);
    assert(result.mineCount === 15 && result.totalControls === 15, 'the counts disagree');
    for (const row of result.controls) {
      assert(typeof row.value === 'string', `${row.key} has no value`);
      assert(row.label && row.note && row.note.length > 20,
        `${row.key} does not explain itself`);
    }
  });

  // -------------------------------------------------------------------------
  console.log('\nIt is an allowlist, not a settings hole');
  // -------------------------------------------------------------------------

  await test('a feature switch is refused, and pointed at the dashboard', async () => {
    // Relative, not absolute: an earlier suite may legitimately have a switch on
    // and restored it after. The claim is that *this writer* does not move it.
    const before = await current('learning.discussion');
    await rejects(
      () => set(admin, 'learning.discussion', before === 'true' ? 'false' : 'true'),
      /is a feature switch .*flag dashboard/i);
    assert((await current('learning.discussion')) === before,
      'a feature switch was flipped through the controls writer');
  });

  await test('a control with its own writer is refused, and named', async () => {
    await rejects(
      () => set(admin, 'commerce.refund_window_hours', '999'),
      /has its own writer .*not changed here/i);
    await rejects(
      () => set(admin, 'teaching.revenue_share_percent', '90'),
      /has its own writer/i);
    assert((await current('commerce.refund_window_hours')) === '72',
      'the refund window was moved through the wrong door');

    // And its own writer still works, so the refusal is about the door and not
    // about the setting being broken.
    await asActor(admin, 'select public.set_refund_window(72,$1)', ['Still three days']);
    assert((await current('commerce.refund_window_hours')) === '72');
  });

  await test('a key that does not exist is refused rather than created', async () => {
    await rejects(() => set(admin, 'finance.invented_control', '1'),
      /not a control this screen may change/i);
    const n = await scalar(
      "select count(*)::int n from public.platform_settings where key = 'finance.invented_control'");
    assert(n.n === 0, 'the writer created a setting');
  });

  // -------------------------------------------------------------------------
  console.log('\nBounds, types and reasons');
  // -------------------------------------------------------------------------

  await test('a reason is required, and nothing is written without one', async () => {
    await rejects(() => set(admin, 'finance.rate_sanity_factor', '20', '   '),
      /say why/i);
    assert((await current('finance.rate_sanity_factor')) === '10',
      'a change with no reason went through');
  });

  await test('an integer control refuses a number that is not whole', async () => {
    await rejects(() => set(admin, 'learning.offline_expiry_days', '30.5'),
      /takes a whole number/i);
    await rejects(() => set(admin, 'learning.offline_expiry_days', 'thirty'),
      /takes a whole number/i);
  });

  await test('each control keeps its own bounds, not a shared guess', async () => {
    // The device cap tops out at ten; the expiry at a year; the quota at ten
    // thousand. One bound for all three would be wrong for two of them.
    await rejects(() => set(admin, 'learning.offline_max_devices', '11'),
      /above the ceiling of 10/i);
    await rejects(() => set(admin, 'learning.offline_max_devices', '0'),
      /below the floor of 1/i);
    await rejects(() => set(admin, 'learning.offline_expiry_days', '366'),
      /above the ceiling of 365/i);
    await rejects(() => set(admin, 'media.upload_quota_gb_per_teacher', '0'),
      /below the floor of 1/i);
    await rejects(() => set(admin, 'governance.min_approvals', '6'),
      /above the ceiling of 5/i);
    await rejects(() => set(admin, 'governance.min_approvals', '0'),
      /below the floor of 1/i);
  });

  await test('a boolean control takes true or false and nothing else', async () => {
    await rejects(() => set(admin, 'governance.panel_required', 'yes'),
      /on or off/i);
    await rejects(() => set(admin, 'governance.scholar_board_active', '1'),
      /on or off/i);
  });

  await test('the reporting currency is an ISO code, and lower case is helped rather than refused', async () => {
    await rejects(() => set(admin, 'finance.reporting_currency', 'dollars'),
      /three-letter ISO code/i);
    const result = await set(financeAdmin, 'finance.reporting_currency', 'eur',
      'Reading the report in euros for the European family pilot');
    assert(result.value === 'EUR', `it stored ${result.value}`);
    assert((await current('finance.reporting_currency')) === 'EUR', 'it was not stored');
    await restore('finance.reporting_currency', 'USD');
  });

  await test('the live-room host may be emptied, and must otherwise be https', async () => {
    await rejects(() => set(admin, 'delivery.live_room_base', 'meet.example.org'),
      /must be empty or start with https:\/\//i);
    await rejects(() => set(admin, 'delivery.live_room_base', 'http://meet.example.org'),
      /must be empty or start with https:\/\//i);

    await set(admin, 'delivery.live_room_base', 'https://meet.example.org',
      'Room provider connected for the pilot cohort');
    assert((await current('delivery.live_room_base')) === 'https://meet.example.org');

    // Empty is the honest shipped state: joining refuses rather than handing out
    // a URL that carries no class.
    const cleared = await set(admin, 'delivery.live_room_base', '',
      'Provider contract lapsed; live rooms are disconnected again');
    assert(cleared.value === '', 'the host could not be cleared');
  });

  // -------------------------------------------------------------------------
  console.log('\nAnother role\u2019s control is not a screen question');
  // -------------------------------------------------------------------------

  await test('a finance admin cannot write a control they cannot see', async () => {
    await rejects(
      () => set(financeAdmin, 'media.upload_quota_gb_per_teacher', '500'),
      /only a platform admin/i);
    assert((await current('media.upload_quota_gb_per_teacher')) === '50',
      'a finance admin changed the upload quota');
  });

  await test('a governance admin cannot write the reporting currency', async () => {
    await rejects(
      () => set(governanceAdmin, 'finance.reporting_currency', 'GBP'),
      /only a finance admin or platform admin/i);
    assert((await current('finance.reporting_currency')) === 'USD',
      'a governance admin changed the reporting currency');
  });

  await test('a support agent cannot write any control', async () => {
    await rejects(
      () => set(supportAgent, 'learning.offline_max_devices', '9'),
      /only a platform admin/i);
  });

  // -------------------------------------------------------------------------
  console.log('\nThe record');
  // -------------------------------------------------------------------------

  await test('a change is audited with the old value, the new one and the reason', async () => {
    await set(admin, 'learning.offline_max_devices', '4',
      'Tablets ship with more storage this year');
    const event = await scalar(
      `select actor, action, detail from public.governance_audit_events
        where action = 'setting.control_changed'
          and detail->>'key' = 'learning.offline_max_devices'
        order by occurred_at desc limit 1`);
    assert(event, 'the change wrote no audit row');
    assert(event.actor === admin, 'the audit does not name who changed it');
    assert(event.detail.from === '3', `it recorded the old value as ${event.detail.from}`);
    assert(event.detail.to === '4', `it recorded the new value as ${event.detail.to}`);
    assert(/tablets ship/i.test(event.detail.reason), 'the reason was not kept');
    await restore('learning.offline_max_devices', '3');
  });

  await test('writing the value it already has changes nothing and writes no audit row', async () => {
    // A save button pressed twice is not an error; it is also not an event. An
    // audit trail full of no-ops is a trail nobody reads.
    const before = (await q(
      `select count(*)::int n from public.governance_audit_events
        where action = 'setting.control_changed'`)).rows[0].n;

    const result = await set(admin, 'learning.offline_max_devices', '3',
      'Saving the same number again');
    assert(result.changed === false, 'an unchanged value reported a change');

    const after = (await q(
      `select count(*)::int n from public.governance_audit_events
        where action = 'setting.control_changed'`)).rows[0].n;
    assert(after === before, `a no-op wrote ${after - before} audit row(s)`);
  });

  await test('the value the writer stores is the value the reader shows', async () => {
    await set(admin, 'finance.rate_sanity_factor', '25', 'Rounding errors in the provider feed');
    const row = (await controlsFor(admin)).controls
      .find((c) => c.key === 'finance.rate_sanity_factor');
    assert(row && row.value === '25', `the screen shows ${row && row.value}`);
    // And the function that actually reads it agrees.
    assert((await scalar("select public.setting_int('finance.rate_sanity_factor', 10) n")).n === 25,
      'the reader and the stored row disagree');
    await restore('finance.rate_sanity_factor', '10');
  });

  await test('the rules are the only source of bounds, and the writer is held to them', async () => {
    // If a control gained a rule without a writer check, or the reverse, this
    // catches it: every declared rule must be reachable and must carry bounds or
    // a prefix where its type needs one.
    const rules = (await q('select * from public.platform_control_rules()')).rows;
    assert(rules.length === 15, `${rules.length} rules`);
    for (const r of rules) {
      if (r.value_type === 'integer') {
        assert(r.min_value !== null && r.max_value !== null,
          `${r.control_key} is an integer with no bounds`);
        assert(r.min_value < r.max_value, `${r.control_key} has an empty range`);
      }
      if (r.value_type === 'text') {
        // Two text controls are deliberately unconstrained by prefix: a currency
        // is an ISO code checked by its own writer, and the safeguarding lead is
        // an office and a monitored address — there is no prefix that would make
        // it more correct, and inventing one would refuse a perfectly good answer.
        assert(
          ['finance.reporting_currency', 'platform.safeguarding_lead'].includes(r.control_key)
            || r.allowed_prefix !== null,
          `${r.control_key} is free text with no rule`);
      }
    }
    // And every rule names a real setting.
    for (const r of rules) {
      const seen = await scalar(
        'select count(*)::int n from public.platform_settings where key = $1',
        [r.control_key]);
      assert(seen.n === 1, `${r.control_key} is a rule with no setting behind it`);
    }
  });
}
