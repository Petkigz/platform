// The register existed; this is the part that notices.
//
// `platform.incident` said it plainly: the register exists, the detection does
// not. What is built here counts the auditable actions that would matter if
// something went wrong, by action and by day, and puts them beside the incident
// register.
//
// The tests are mostly about what this **refuses** to be. No score, no threshold,
// no label, no automatic incident. A screen that says "fourteen data exports on
// Tuesday" is information; one that says "anomaly detected" is an accusation made
// by a number nobody chose. That distinction is the whole design, so it is what
// the suite checks.

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    bootstrapAdmin, newUser, newProfile, grantRole, committed,
  } = ctx;

  const admin = await bootstrapAdmin('signals-admin@example.com');

  async function asActor(actor, sql, params = []) {
    await q('begin');
    await q(`select set_config('request.jwt.claims',$1,true)`,
      [JSON.stringify({ sub: actor, role: 'authenticated' })]);
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

  const call = async (actor, fn, params = []) =>
    (await asActor(actor, `select public.${fn} as r`, params)).rows[0].r;

  const eq = (actual, expected, what) =>
    assert(actual === expected,
      `${what}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);

  const audit = (action, daysAgo = 0) =>
    q(`insert into public.governance_audit_events (actor, action, target_type, detail, occurred_at)
       values ($1, $2, 'user', '{}'::jsonb, now() - make_interval(days => $3))`,
      [admin, action, daysAgo]);

  const governance = await newUser('signals-governance@example.com');
  await newProfile(governance, 'Signals Governance');
  await committed(() => grantRole(governance, 'governance_admin', admin));

  const nobody = await newUser('signals-nobody@example.com');
  await newProfile(nobody, 'Nobody At All');

  /** The per-action counts of a call, as a plain map. */
  const byAction = (signals) =>
    Object.fromEntries(signals.actions.map((row) => [row.action, row.events]));

  await test('it answers with a window, a list and a count — and nothing that looks like a verdict', async () => {
    const signals = await call(admin, 'security_signals()');
    eq(signals.window.days, 30, 'a thirty-day window by default');
    assert(Array.isArray(signals.actions), 'actions are a list');
    assert(Array.isArray(signals.days), 'days are a list');
    eq(typeof signals.events, 'number', 'and there is a total');

    // This suite shares a database with every other one, so it never asserts an
    // absolute count: earlier suites legitimately grant roles and export data.
    // What it does assert is that nothing in the answer passes judgement.
    const text = JSON.stringify(signals).toLowerCase();
    for (const forbidden of ['score', 'suspicious', 'anomaly', 'threshold', 'risk']) {
      assert(!text.includes(forbidden), `the payload carries a judgement: ${forbidden}`);
    }
  });

  await test('it counts the families that would matter, and ignores the rest', async () => {
    const before = byAction(await call(admin, 'security_signals()'));

    await committed(async () => {
      await audit('role.assigned', 3);
      await audit('role.revoked', 3);
      await audit('data.exported', 2);
      await audit('data.exported', 2);
      await audit('account.closed_by_owner', 1);
      await audit('guardian.consent_revoked', 1);
      await audit('takedown.held', 5);
      await audit('institution.api_key_created', 4);
      await audit('media.upload_quarantined', 6);
      // Not security signals — ordinary platform work. Counted here they would
      // be a wall of noise nobody reads.
      await audit('course.published', 2);
      await audit('policy.accepted', 2);
      await audit('institution.seat_claimed', 2);
    });

    const after = await call(admin, 'security_signals()');
    const now = byAction(after);
    const gained = (action) => (now[action] ?? 0) - (before[action] ?? 0);

    eq(gained('role.assigned'), 1, 'one role granted');
    eq(gained('role.revoked'), 1, 'one role taken away');
    eq(gained('data.exported'), 2, 'two exports, counted together');
    eq(gained('account.closed_by_owner'), 1, 'one account closed');
    eq(gained('guardian.consent_revoked'), 1, 'one consent withdrawn');
    eq(gained('takedown.held'), 1, 'one takedown hold');
    eq(gained('institution.api_key_created'), 1, 'one API key');
    eq(gained('media.upload_quarantined'), 1, 'one quarantine');

    for (const ignored of ['course.published', 'policy.accepted', 'institution.seat_claimed']) {
      eq(gained(ignored), 0, `${ignored} is not a security signal`);
    }

    // The per-day counts have to agree with the actions, or the table is a
    // second opinion rather than a view of the same facts.
    const dayTotal = after.days.reduce((sum, row) => sum + row.events, 0);
    eq(dayTotal, after.events, 'the per-day counts agree with the total');
  });

  await test('a short window counts less, without pretending the rest did not happen', async () => {
    const narrow = await call(admin, 'security_signals($1)', [4]);
    const wide = await call(admin, 'security_signals($1)', [30]);
    // The boundary is exclusive: an event stamped exactly `p_days` ago has
    // already fallen out by the time the query runs.
    assert(narrow.events < wide.events || wide.events === 0,
      `a four-day window (${narrow.events}) should hold less than thirty days (${wide.events})`);

    // The three events stamped a day or two old are inside four days.
    const oneDay = byAction(await call(admin, 'security_signals($1)', [1]));
    const fourDay = byAction(narrow);
    assert((fourDay['data.exported'] ?? 0) >= (oneDay['data.exported'] ?? 0),
      'the wider window never holds fewer exports');
  });

  await test('a window is bounded rather than trusted', async () => {
    // A caller asking for ten years gets a year; a caller asking for nothing
    // gets a day. Neither is an error, because both are a sensible read.
    const huge = await call(admin, 'security_signals($1)', [100000]);
    eq(huge.window.days, 365, 'clamped to a year');
    const tiny = await call(admin, 'security_signals($1)', [-5]);
    eq(tiny.window.days, 1, 'clamped to a day');
  });

  await test('writing an incident down settles the gap, and it says so with numbers', async () => {
    // The two numbers the screen shows are both facts: when somebody last wrote
    // an incident, and how much audited activity there has been since. Neither
    // says "you should have written one".
    const before = await call(admin, 'security_signals()');
    const opened = await call(admin, 'open_incident($1,$2,$3)', [
      'A test incident', 'Recorded for the signals suite.', 'minor',
    ]);
    assert(opened, 'an incident was opened');

    const signals = await call(admin, 'security_signals()');
    eq(signals.incidents.open >= 1, true, 'the open count includes it');
    eq(signals.incidents.lastRecordedAt !== null, true, 'and it has a date');
    assert(signals.incidents.lastRecordedAt !== before.incidents.lastRecordedAt,
      'the date moved to this incident');
    eq(signals.incidents.signalsSinceLast, 0, 'nothing watched has happened since');
  });

  await test('the register is not readable by anybody who is not staff', async () => {
    await rejects(() => call(nobody, 'security_signals()'), /incident:not_allowed/);
  });

  await test('a governance admin may read it, because checking is their job', async () => {
    const signals = await call(governance, 'security_signals()');
    assert(signals.window.days === 30, 'the same window');
  });
}
