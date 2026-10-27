// The incident register: what happened, who is told, and by when.
//
// The interesting part is not that an incident can be opened. It is that the
// register refuses the two shortcuts that make an incident register decorative:
// closing over an obligation nobody met, and closing with no change recorded.
//
// What these tests also pin down is everything the register **deliberately does
// not** do. No deadline is derived from a discovery time; no list of names is
// ever returned; and "not told" is a recorded decision with a reason rather than
// a row that quietly disappears.

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    bootstrapAdmin, newUser, newProfile, grantRole, committed,
  } = ctx;

  const admin = await bootstrapAdmin('incident-admin@example.com');

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

  const governance = await newUser('incident-governance@example.com');
  await newProfile(governance, 'Incident Governance');
  await committed(() => grantRole(governance, 'governance_admin', admin));

  // A support agent is privileged for refunds and cases and is not an incident role.
  const support = await newUser('incident-support@example.com');
  await newProfile(support, 'Incident Support');
  await committed(() => grantRole(support, 'support_agent', admin));

  const teacher = await newUser('incident-teacher@example.com');
  await newProfile(teacher, 'Incident Teacher');

  let incidentId = '';

  await test('an incident is not opened by a learner or a support agent', async () => {
    await rejects(() => call(teacher, 'open_incident($1,$2)',
      ['Something happened', 'A panel of text that is long enough to be a summary.']),
    /incident:not_allowed/);
    await rejects(() => call(support, 'open_incident($1,$2)',
      ['Something happened', 'A panel of text that is long enough to be a summary.']),
    /incident:not_allowed/);
    // A support agent cannot read it either, and the refusal is the function's.
    await rejects(() => call(support, 'incident_register()'), /incident:not_allowed/);
  });

  await test('opening one generates a reference and validates what it is told', async () => {
    await rejects(() => call(admin, 'open_incident($1,$2)',
      ['ab', 'A panel of text that is long enough to be a summary.']),
    /incident:title_required/);
    await rejects(() => call(admin, 'open_incident($1,$2)',
      ['A real title', 'too short']), /incident:summary_required/);
    await rejects(() => call(admin, 'open_incident($1,$2,$3)',
      ['A real title', 'A panel of text that is long enough to be a summary.', 'catastrophic']),
    /incident:severity_invalid/);
    // A discovery in the future would start every clock that hangs off it late.
    await rejects(() => call(admin, 'open_incident($1,$2,$3,$4)',
      ['A real title', 'A panel of text that is long enough to be a summary.', 'minor',
        new Date(Date.now() + 86400000).toISOString()]),
    /incident:discovered_in_the_future/);
    // It cannot have started after it was found.
    await rejects(() => call(admin, 'open_incident($1,$2,$3,$4,$5)',
      ['A real title', 'A panel of text that is long enough to be a summary.', 'minor',
        '2026-10-01T10:00:00Z', '2026-10-02T10:00:00Z']),
    /incident:occurred_after_discovery/);
    await rejects(() => call(admin, 'open_incident($1,$2,$3,$4,$5,$6)',
      ['A real title', 'A panel of text that is long enough to be a summary.', 'minor',
        null, null, ['everything']]), /incident:category_invalid/);

    const opened = await call(admin, 'open_incident($1,$2,$3,$4,$5,$6)',
      ['A backup was exposed', 'A nightly backup was served without authentication for 40 minutes.',
        'critical', '2026-10-27T08:00:00Z', '2026-10-27T07:20:00Z', ['accounts', 'children']]);
    eq(opened.status, 'open', 'the status of a new incident');
    eq(/^INC-2026-\d{4}$/.test(opened.reference), true,
      `the generated reference (${opened.reference})`);
    incidentId = opened.id;
  });

  await test('impact is counts, never a list of people, and the counts must be coherent', async () => {
    await rejects(() => call(admin, 'record_incident_impact($1,$2,$3)',
      [incidentId, 10, 11]), /incident:count_incoherent/);
    await rejects(() => call(admin, 'record_incident_impact($1,$2)',
      [incidentId, -1]), /incident:count_invalid/);

    const impact = await call(admin, 'record_incident_impact($1,$2,$3,$4,$5)',
      [incidentId, 412, 30, 12, 'Names and email addresses were readable by anybody with the URL.']);
    eq(impact.people, 412, 'people affected');
    eq(impact.children, 30, 'children among them');

    const detail = await call(admin, 'incident_detail($1)', [incidentId]);
    eq(detail.incident.people, 412, 'the count on the record');
    assert(/readable by anybody/.test(detail.incident.harm), 'the harm assessment is kept');
    // Nothing in the payload names a person: there is no per-person row to return.
    const serialised = JSON.stringify(detail);
    eq(/@/.test(serialised), false, 'no email address appears anywhere in the detail');
  });

  await test('an obligation needs a body, a basis and a deadline — and nothing derives the deadline', async () => {
    // Four placeholders every time: the deadline has no default, so a three-argument
    // call is a bind error rather than the refusal being tested.
    await rejects(() => call(admin, 'add_incident_notification($1,$2,$3,$4)',
      [incidentId, 'x', 'The law', new Date().toISOString()]), /incident:audience_required/);
    await rejects(() => call(admin, 'add_incident_notification($1,$2,$3,$4)',
      [incidentId, 'The regulator', 'law', new Date().toISOString()]), /incident:basis_required/);

    const due = new Date(Date.now() + 72 * 3600 * 1000).toISOString();
    const added = await call(admin, 'add_incident_notification($1,$2,$3,$4)',
      [incidentId, 'The data protection authority', 'The 72-hour rule for personal data breaches', due]);
    eq(new Date(added.dueAt).getTime(), new Date(due).getTime(),
      'the deadline that was typed, unchanged');

    // A second one, already past its date, so the lateness branch can be exercised.
    const late = await call(admin, 'add_incident_notification($1,$2,$3,$4)',
      [incidentId, 'The affected schools', 'Their data was in the backup', '2026-10-27T09:00:00Z']);
    eq(late.audience, 'The affected schools', 'the second obligation');
  });

  await test('nothing resolves while an obligation is neither told nor waived', async () => {
    await rejects(() => call(admin, 'set_incident_status($1,$2,$3)',
      [incidentId, 'resolved', 'Fixed the bucket policy.']), /incident:obligations_open/);

    // The first one is told, late or not, and that is recorded as such.
    const list = await call(admin, 'incident_detail($1)', [incidentId]);
    const reg = list.notifications.find((n) => n.audience.startsWith('The data protection'));
    const told = await call(admin, 'mark_incident_notified($1,$2,$3)',
      [reg.id, 'Letter', 'Sent by recorded post.']);
    eq(told.late, false, 'told inside its deadline');
    await rejects(() => call(admin, 'mark_incident_notified($1,$2)',
      [reg.id, 'Email']), /incident:already_told/);
    // A told obligation cannot then be waived.
    await rejects(() => call(admin, 'waive_incident_notification($1,$2)',
      [reg.id, 'We decided not to.']), /incident:already_told/);

    // Still one outstanding, so resolution is still refused.
    await rejects(() => call(admin, 'set_incident_status($1,$2,$3)',
      [incidentId, 'resolved', 'Fixed the bucket policy.']), /incident:obligations_open/);
  });

  await test('deciding not to tell somebody is a decision with a reason, not a deletion', async () => {
    const detail = await call(admin, 'incident_detail($1)', [incidentId]);
    const schools = detail.notifications.find((n) => n.audience === 'The affected schools');
    await rejects(() => call(admin, 'waive_incident_notification($1,$2)',
      [schools.id, 'no']), /incident:reason_required/);

    const waived = await call(governance, 'waive_incident_notification($1,$2)',
      [schools.id, 'The schools had already been told by their own IT provider, and a second notice would have confused parents.']);
    eq(waived.waived, true, 'waived');

    const after = await call(admin, 'incident_detail($1)', [incidentId]);
    eq(after.notifications.find((n) => n.id === schools.id).state, 'waived',
      'the obligation stays on the record, decided rather than deleted');
    assert(/already been told/.test(after.notifications.find((n) => n.id === schools.id).waiveReason),
      'the reason is kept');
    eq(after.notifications.length, 2, 'both obligations are still there');
    // The decision is in the timeline, not only on the row.
    assert(after.entries.some((e) => e.kind === 'decision' && /Decided not to tell/.test(e.body)),
      'the waiver is in the log');
  });

  await test('an incident cannot close without a recorded lesson', async () => {
    await call(admin, 'set_incident_status($1,$2,$3)',
      [incidentId, 'contained', 'The bucket policy was corrected and the public route removed.']);
    await rejects(() => call(admin, 'set_incident_status($1,$2,$3)',
      [incidentId, 'closed', 'Done.']), /incident:transition_invalid/);

    await call(admin, 'set_incident_status($1,$2,$3)',
      [incidentId, 'resolved', 'Every affected account was contacted and no further access was seen.']);
    await rejects(() => call(admin, 'set_incident_status($1,$2,$3)',
      [incidentId, 'closed', 'Done.']), /incident:lessons_required/);

    await rejects(() => call(admin, 'record_incident_lesson($1,$2)',
      [incidentId, 'Be careful.']), /incident:lessons_required/);
    await call(admin, 'record_incident_lesson($1,$2)',
      [incidentId, 'Backup objects are now private by default and the storage policy is checked in CI.']);

    const closed = await call(admin, 'set_incident_status($1,$2,$3)',
      [incidentId, 'closed', 'Everything that had to be done was done and written down.']);
    eq(closed.status, 'closed', 'closed');
  });

  await test('a closed incident is reopened rather than edited, and its timeline cannot be rewritten', async () => {
    await rejects(() => call(admin, 'record_incident_impact($1,$2,$3)',
      [incidentId, 500, 40]), /incident:closed/);
    await rejects(() => call(admin, 'add_incident_notification($1,$2,$3,$4)',
      [incidentId, 'Somebody else', 'A late thought', new Date().toISOString()]), /incident:closed/);
    await rejects(() => call(admin, 'log_incident_entry($1,$2)',
      [incidentId, 'Also this happened.']), /incident:not_found|incident:closed/);

    const reopened = await call(admin, 'set_incident_status($1,$2,$3)',
      [incidentId, 'open', 'A second copy of the backup turned up on another host.']);
    eq(reopened.status, 'open', 'reopened');

    const detail = await call(admin, 'incident_detail($1)', [incidentId]);
    eq(detail.incident.closedAt, null, 'the closure date is cleared, not left to contradict the status');
    eq(detail.incident.resolvedAt, null, 'and so is the resolution date');
    assert(detail.entries.length >= 8, 'the history is all still there');

    const entryId = detail.entries[0].id;
    await rejects(() => q(`update public.incident_entries set body = 'Something else' where id = $1`,
      [entryId]), /incident:entry_append_only/);
    await rejects(() => q(`delete from public.incident_entries where id = $1`, [entryId]),
      /incident:entry_append_only/);
  });

  await test('the learner notice is written and held, and is not sent', async () => {
    await rejects(() => call(admin, 'save_incident_notice($1,$2)',
      [incidentId, 'sorry']), /incident:notice_required/);
    const saved = await call(admin, 'save_incident_notice($1,$2)',
      [incidentId, 'A backup of the platform was briefly readable by anybody with its address. '
        + 'Your name, email address and the courses you are enrolled on may have been in it. '
        + 'Your password was not, and nothing in your account has changed.']);
    eq(saved.saved, true, 'saved');
    eq(saved.sent, false, 'and explicitly not sent');

    const detail = await call(admin, 'incident_detail($1)', [incidentId]);
    assert(/Your password was not/.test(detail.incident.learnerNotice), 'the text is kept');
  });

  await test('the register counts what is late and what has nobody to tell', async () => {
    // A second incident, with no obligations at all: the quiet failure mode.
    await call(admin, 'open_incident($1,$2,$3)',
      ['A staff account was shared',
        'One member of staff used another member of staff’s login for a day.',
        'minor']);

    const register = await call(admin, 'incident_register()');
    assert(register.incidents.length >= 2, 'both incidents are listed');
    eq(register.counts.noObligations >= 1, true, 'an incident with nobody to tell is counted');
    const first = register.incidents.find((i) => i.id === incidentId);
    eq(first.children, 30, 'the child count is on the list');
    eq(first.hasLessons, true, 'and whether a lesson was recorded');
    eq(first.obligations, 2, 'both obligations are counted');
    eq(first.told, 1, 'one was told');
    eq(first.waived, 1, 'one was decided against');
    eq(first.overdue, 0, 'and none is outstanding');
  });

  await test('the flag says what is built, and is no longer able to say nothing exists', async () => {
    const row = (await q(
      `select gate_type, preconditions from public.platform_settings where key = 'platform.incident'`)).rows[0];
    eq(row.gate_type, 'code', 'detection and delivery are still missing, so the gate is code');
    eq(/Nothing exists/.test(row.preconditions), false, 'the register exists');
    assert(/incident register/i.test(row.preconditions), 'and the preconditions name it');
    assert(/detection/i.test(row.preconditions), 'while naming detection as still absent');
    assert(/email or SMS provider/i.test(row.preconditions), 'and delivery');
  });

  await test('nobody reads the tables directly; the functions are the only door', async () => {
    for (const table of ['security_incidents', 'incident_notifications', 'incident_entries']) {
      await rejects(() => asActor(admin, `select * from public.${table}`),
        /permission denied/i);
      await rejects(() => asActor(admin,
        `insert into public.${table} default values`), /permission denied/i);
    }
  });
}
