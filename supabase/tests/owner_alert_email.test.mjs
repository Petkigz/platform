// An email to the owner when a board post is reported (20261281159000, the
// owner's instruction of 2026-11-26): a private register worked by the
// service role, one alert waiting at a time, nothing about the post in it.
//
// Everything here happens inside one transaction that is rolled back: the
// boards and email delivery are switched on for it.

export async function run(ctx) {
  const { q, test, assert, rejects, bootstrapAdmin, newUser, newProfile, newInstructor, newCourse, grantRole } = ctx;

  const admin = await bootstrapAdmin('alert-admin@example.com');
  const teacher = await newInstructor('alert-teacher@example.com', admin);
  const course = await newCourse(teacher, { status: 'active', title: 'Owner Alert Course' });
  const governance = await newUser('alert-governance@example.com');
  await newProfile(governance, 'Alert Governance');
  await grantRole(governance, 'governance_admin', admin);

  let seq = 0;
  async function student(name) {
    seq += 1;
    const userId = await newUser(`alert-student-${seq}@example.com`);
    await newProfile(userId, name);
    const learnerId = (await q(
      `insert into public.learner_profiles (display_name, learner_type, age_band, linked_user_id)
       values ($1,'adult','18+',$2) returning id`, [name, userId])).rows[0].id;
    await q(
      `insert into public.entitlement_grants (learner_profile_id, scope_type, course_id, source_type)
       values ($1,'course',$2,'purchase')`, [learnerId, course]);
    await q(
      `insert into public.policy_acceptances (user_id, policy_version_id)
       select $1, v.id from public.policy_versions v
         join public.policy_documents d on d.id = v.document_id
        where d.slug in ('terms','privacy') and v.status = 'in_force'
       on conflict do nothing`, [userId]);
    return userId;
  }

  let step = 0;
  async function as(role, actor, sql, params = []) {
    const point = `alert_${step += 1}`;
    await q(`savepoint ${point}`);
    await q(`select set_config('request.jwt.claims',$1,true)`,
      [JSON.stringify(actor ? { sub: actor, role } : { role })]);
    await q(`set local role ${role}`);
    try {
      const result = await q(sql, params);
      await q('reset role');
      await q(`release savepoint ${point}`);
      return result;
    } catch (e) {
      await q(`rollback to savepoint ${point}`);
      throw e;
    }
  }
  const call = async (actor, fn, params = []) => (await as('authenticated', actor, `select public.${fn} as r`, params)).rows[0].r;
  const service = async (fn, params = []) => (await as('service_role', null, `select public.${fn} as r`, params)).rows[0].r;

  const start = (actor, title, body) => call(actor, 'post_board_thread($1,$2,$3)', ['students', title, body]);
  const report = (actor, thread, reason) => call(actor, 'report_board_post($1,$2,$3)', [thread, null, reason]);
  const alerts = async (user) => (await q(
    `select * from public.owner_alerts where user_id = $1 order by created_at, id`, [user])).rows;
  // Other suites leave owners behind; a report alerts each of them. Only this suite's owner is worked here.
  const onlyMine = () => q(`delete from public.owner_alerts where user_id <> $1`, [admin]);
  const setFlag = (value) => q(`update public.platform_settings set value_text = $1 where key = 'delivery.notifications'`, [value]);

  console.log('\nAn email to the owner when a board post is reported');

  await q('begin');
  try {
    await q(`update public.platform_settings set value_text = 'true'
              where key in ('community.student_board','community.teacher_board')`);
    await setFlag('false');
    await q('delete from public.owner_alerts');

    const writer = await student('Alert Writer');
    const first = await student('Alert First');
    const second = await student('Alert Second');
    await call(writer, 'set_board_handle($1,$2)', ['students', 'alert_writer']);
    const one = await start(writer, 'ALERT-TITLE one', 'ALERT-BODY one');
    const two = await start(writer, 'ALERT-TITLE two', 'ALERT-BODY two');
    // A second writer: one account starts only so many threads in a day.
    const other = await student('Alert Other Writer');
    await call(other, 'set_board_handle($1,$2)', ['students', 'alert_other']);

    await test('a report queues one alert for the owner, and for nobody else', async () => {
      await report(first, one.threadId, 'ALERT-REASON it is unkind.');
      const mine = await alerts(admin);
      assert(mine.length === 1 && mine[0].kind === 'board_reported' && mine[0].status === 'pending' && mine[0].attempts === 0,
        `the owner has ${JSON.stringify(mine)}`);
      for (const who of [governance, teacher, writer, first]) {
        assert((await alerts(who)).length === 0, 'somebody other than the owner has an alert waiting');
      }
      // A second report, of this post or another, adds nothing while one is waiting.
      await report(second, one.threadId, 'ALERT-REASON still unkind.');
      await report(second, two.threadId, 'ALERT-REASON this one too.');
      assert((await alerts(admin)).length === 1);
      // The register holds who is told and how the sending went: nothing about a post or a person.
      const columns = (await q(
        `select column_name from information_schema.columns
          where table_schema = 'public' and table_name = 'owner_alerts' order by 1`)).rows.map((r) => r.column_name);
      assert(JSON.stringify(columns) === JSON.stringify(['attempts', 'created_at', 'id', 'kind', 'last_problem', 'lease_token',
        'lease_until', 'next_attempt_at', 'provider', 'provider_reference', 'sent_at', 'status', 'user_id']), columns.join(', '));
      const whole = JSON.stringify(mine);
      for (const secret of ['ALERT-TITLE', 'ALERT-BODY', 'ALERT-REASON', writer, first, one.threadId]) {
        assert(!whole.includes(secret), `the alert carries ${secret}`);
      }
    });

    await test('nobody signed in reads the register or works it', async () => {
      for (const who of [admin, governance, first]) {
        await rejects(() => as('authenticated', who, 'select count(*) from public.owner_alerts'), /permission denied/);
        await rejects(() => call(who, 'claim_owner_alert()'), /permission denied/);
        await rejects(() => call(who, 'settle_owner_alert($1,$2,$3)', [null, null, 'sent']), /permission denied/);
        await rejects(() => call(who, 'owner_alert_send_allowed($1,$2,$3)', [null, null, who]), /permission denied/);
      }
      await rejects(() => as('anon', null, 'select public.claim_owner_alert()'), /permission denied/);
    });

    await test('while email is switched off nothing is claimed; switched on, the alert is leased, sent and settled', async () => {
      await onlyMine();
      assert((await service('claim_owner_alert()')).state === 'disabled');
      assert((await alerts(admin))[0].status === 'pending', 'an alert moved while email was off');

      await setFlag('true');
      const lease = await service('claim_owner_alert()');
      assert(lease.state === 'leased' && lease.ownerId === admin && lease.kind === 'board_reported' && lease.alertId && lease.token,
        `the lease is ${JSON.stringify(lease)}`);
      assert(JSON.stringify(Object.keys(lease).sort()) === JSON.stringify(['alertId', 'kind', 'ownerId', 'state', 'token']));
      // Leased: a second worker finds nothing.
      assert((await service('claim_owner_alert()')).state === 'empty');
      assert((await service('owner_alert_send_allowed($1,$2,$3)', [lease.alertId, lease.token, admin])) === true);
      // Not for another reader, and not with another token.
      assert((await service('owner_alert_send_allowed($1,$2,$3)', [lease.alertId, lease.token, governance])) === false);
      assert((await service('owner_alert_send_allowed($1,$2,$3)', [lease.alertId, lease.alertId, admin])) === false);
      assert((await service('settle_owner_alert($1,$2,$3,$4,$5)', [lease.alertId, lease.alertId, 'sent', 'resend', 'ref-1'])) === false);
      await rejects(() => service('settle_owner_alert($1,$2,$3)', [lease.alertId, lease.token, 'sent']), /a provider reference is required/);
      await rejects(() => service('settle_owner_alert($1,$2,$3)', [lease.alertId, lease.token, 'made_up']), /unknown alert outcome/);
      assert((await service('settle_owner_alert($1,$2,$3,$4,$5)', [lease.alertId, lease.token, 'sent', 'resend', 'ref-1'])) === true);
      const sent = (await alerts(admin))[0];
      assert(sent.status === 'sent' && sent.provider === 'resend' && sent.provider_reference === 'ref-1' && sent.sent_at && sent.lease_token === null,
        `after sending: ${JSON.stringify(sent)}`);
      // Settled once: the same lease settles nothing again.
      assert((await service('settle_owner_alert($1,$2,$3,$4,$5)', [lease.alertId, lease.token, 'sent', 'resend', 'ref-2'])) === false);
    });

    await test('after an email has gone, the next waits fifteen minutes and is not dropped', async () => {
      const three = await start(writer, 'ALERT-TITLE three', 'ALERT-BODY three');
      await report(first, three.threadId, 'ALERT-REASON a third post.');
      await onlyMine();
      const rows = await alerts(admin);
      const waiting = rows.find((r) => r.status === 'pending');
      const sent = rows.find((r) => r.status === 'sent');
      assert(rows.length === 2 && waiting && sent, `the owner has ${rows.map((r) => r.status).join(', ')}`);
      const gap = new Date(waiting.next_attempt_at).getTime() - new Date(sent.sent_at).getTime();
      assert(gap === 15 * 60 * 1000, `the next alert is due ${gap / 60000} minutes after the last email`);
      assert((await service('claim_owner_alert()')).state === 'empty', 'an alert was claimed before it was due');
      // When it is due, it is claimed.
      await q(`update public.owner_alerts set next_attempt_at = now() - interval '1 second' where id = $1`, [waiting.id]);
      const lease = await service('claim_owner_alert()');
      assert(lease.state === 'leased' && lease.alertId === waiting.id);

      // The address could not be used: it waits, the problem is kept, and the fifth try is the last.
      assert((await service('settle_owner_alert($1,$2,$3)', [lease.alertId, lease.token, 'address_unverified'])) === true);
      let row = (await alerts(admin)).find((r) => r.id === waiting.id);
      assert(row.status === 'pending' && row.last_problem === 'address_unverified' && row.attempts === 1);
      await q(`update public.owner_alerts set attempts = 4, next_attempt_at = now() - interval '1 second' where id = $1`, [waiting.id]);
      const last = await service('claim_owner_alert()');
      assert(last.state === 'leased');
      assert((await service('settle_owner_alert($1,$2,$3)', [last.alertId, last.token, 'provider_uncertain'])) === true);
      row = (await alerts(admin)).find((r) => r.id === waiting.id);
      assert(row.status === 'failed' && row.attempts === 5 && row.last_problem === 'provider_uncertain', JSON.stringify(row));
      assert((await service('claim_owner_alert()')).state === 'empty', 'a failed alert was claimed again');
    });

    await test('an alert is dropped, unsent, when nothing is waiting any more or its reader is no longer the owner', async () => {
      const four = await start(other, 'ALERT-TITLE four', 'ALERT-BODY four');
      await report(first, four.threadId, 'ALERT-REASON a fourth post.');
      await onlyMine();
      await q(`update public.owner_alerts set next_attempt_at = now() - interval '1 second' where status = 'pending'`);
      // The owner dealt with every report before the email went.
      await q(`update public.board_reports set resolved_at = now(), resolved_by = $1, outcome = 'kept' where resolved_at is null`, [admin]);
      assert((await service('claim_owner_alert()')).state === 'empty');
      const rows = await alerts(admin);
      assert(rows.filter((r) => r.status === 'dropped').length === 1 && !rows.some((r) => r.status === 'pending'),
        `after everything was dealt with: ${rows.map((r) => r.status).join(', ')}`);

      // Dealt with between the claim and the sending: the check says no, and settling drops it.
      const five = await start(other, 'ALERT-TITLE five', 'ALERT-BODY five');
      await report(first, five.threadId, 'ALERT-REASON a fifth post.');
      await onlyMine();
      await q(`update public.owner_alerts set next_attempt_at = now() - interval '1 second' where status = 'pending'`);
      const lease = await service('claim_owner_alert()');
      assert(lease.state === 'leased');
      await q(`update public.board_reports set resolved_at = now(), resolved_by = $1, outcome = 'kept' where resolved_at is null`, [admin]);
      assert((await service('owner_alert_send_allowed($1,$2,$3)', [lease.alertId, lease.token, admin])) === false);
      assert((await service('settle_owner_alert($1,$2,$3)', [lease.alertId, lease.token, 'not_sent'])) === true);
      assert((await alerts(admin)).find((r) => r.id === lease.alertId).status === 'dropped');

      // The owner's own report alerts nobody about themselves.
      const six = await start(other, 'ALERT-TITLE six', 'ALERT-BODY six');
      const before = (await alerts(admin)).length;
      await report(admin, six.threadId, 'The owner reports it.');
      assert((await alerts(admin)).length === before, 'the owner was alerted to their own report');
    });

    await test('the owner sees how their own alerts stand; nobody else does', async () => {
      const mine = await call(admin, 'my_owner_alerts()');
      assert(mine.sending === true && mine.waiting === 0 && mine.failed === 1 && mine.lastSentAt && mine.lastProblem === 'provider_uncertain',
        `the owner is told ${JSON.stringify(mine)}`);
      assert(JSON.stringify(Object.keys(mine).sort()) === JSON.stringify(['failed', 'lastProblem', 'lastSentAt', 'sending', 'waiting']));
      for (const who of [governance, teacher, first]) {
        await rejects(() => call(who, 'my_owner_alerts()'), /^owner_alert:not_allowed$/);
      }
      await setFlag('false');
      assert((await call(admin, 'my_owner_alerts()')).sending === false);
    });
  } finally {
    await q('rollback');
  }
}
