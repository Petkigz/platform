// The help desk.
//
// What is pinned here is the part that is easy to get wrong: who may open a
// case, whose context may be attached to it, who may read an internal note,
// and whether switching the feature off strands a conversation that is already
// in flight. The state machine itself is asserted through the outcomes rather
// than by poking columns, because the columns are only reachable through the
// writer functions.

export async function run(ctx) {
  const {
    q, test, assert, asUser, committed,
    newUser, newProfile, grantRole, bootstrapAdmin,
  } = ctx;

  const admin = await bootstrapAdmin('support-admin@example.com');
  const agent = await newUser('support-agent@example.com');
  await newProfile(agent, 'Support Agent');
  await committed(() => grantRole(agent, 'support_agent', admin));

  let seq = 0;
  /** A fresh account per test: the five-open ceiling is per requester, and
   *  tests that share an asker would start failing on each other's backlog. */
  async function newAsker(label = 'Asker') {
    seq += 1;
    const userId = await newUser(`support-asker-${seq}@example.com`);
    await newProfile(userId, `${label} ${seq}`);
    const learnerId = (await q(
      `insert into public.learner_profiles (display_name, learner_type, age_band, linked_user_id)
       values ($1,'adult','18+',$2) returning id`, [`${label} ${seq}`, userId])).rows[0].id;
    return { userId, learnerId };
  }

  const asker = await newAsker('Asker');
  const stranger = await newAsker('Stranger');

  /** A billing account the asker belongs to, with a pending order on it. */
  const orderId = await committed(async () => {
    const account = (await q(
      `insert into public.billing_accounts (display_name, billing_currency, status, created_by)
       values ('Asker billing','UGX','active',$1) returning id`, [asker.userId])).rows[0].id;
    await q(
      `insert into public.billing_account_memberships
         (billing_account_id, user_id, can_view_invoices, status, granted_by)
       values ($1,$2,true,'active',$3)
       on conflict (billing_account_id, user_id) do nothing`,
      [account, asker.userId, admin]);
    return (await q(
      `insert into public.orders (billing_account_id, currency_code, subtotal_minor, total_minor, status)
       values ($1,'UGX',30000,30000,'pending_payment') returning id`, [account])).rows[0].id;
  });

  // Writes have to commit: the queue tests read back what an earlier step did.
  async function asActor(actor, sql, params = []) {
    await q('begin');
    await q("select set_config('request.jwt.claims',$1,true)",
      [JSON.stringify({ sub: actor, role: 'authenticated' })]);
    await q('set local role authenticated');
    try { const r = await q(sql, params); await q('commit'); return r; }
    catch (e) { await q('rollback'); throw e; }
  }
  const open = (who, category, subject, body, learner = null, order = null) =>
    asActor(who, 'select public.open_support_case($1,$2,$3,$4,$5) as id',
      [category, subject, body, learner, order]);
  const reply = (who, caseId, body, internal = false) =>
    asActor(who, 'select public.reply_to_support_case($1,$2,$3) as id',
      [caseId, body, internal]);
  const assign = (who, caseId, to) =>
    asActor(who, 'select public.assign_support_case($1,$2)', [caseId, to]);
  const prioritise = (who, caseId, priority) =>
    asActor(who, 'select public.set_support_case_priority($1,$2)', [caseId, priority]);
  const resolve = (who, caseId, note) =>
    asActor(who, 'select public.resolve_support_case($1,$2)', [caseId, note]);
  const close = (who, caseId, reason) =>
    asActor(who, 'select public.close_support_case($1,$2)', [caseId, reason]);
  const caseRow = async (id) =>
    (await q('select * from public.support_cases where id = $1', [id])).rows[0];

  /**
   * Assert that `who` is refused, for the reason claimed.
   *
   * Runs the statement directly rather than through asActor(), because asActor
   * rolls the whole transaction back on error and a savepoint cannot then be
   * released. `who === null` means no session at all.
   */
  async function refused(who, sql, params, pattern) {
    await q('begin');
    await q("select set_config('request.jwt.claims',$1,true)",
      [who === null ? '' : JSON.stringify({ sub: who, role: 'authenticated' })]);
    await q('set local role authenticated');
    await q('savepoint expected_refusal');
    let caught;
    try { await q(sql, params); } catch (e) { caught = e; }
    await q('rollback to savepoint expected_refusal');
    await q('rollback');
    assert(caught, `expected a refusal matching ${pattern}`);
    const text = String(caught.message ?? caught);
    assert(pattern.test(text),
      `refused, but not for the reason asserted: expected ${pattern}, got: ${text.slice(0, 200)}`);
  }

  const SQL_OPEN = 'select public.open_support_case($1,$2,$3,$4,$5) as id';
  const SQL_REPLY = 'select public.reply_to_support_case($1,$2,$3) as id';
  const SQL_ASSIGN = 'select public.assign_support_case($1,$2)';
  const SQL_PRIORITY = 'select public.set_support_case_priority($1,$2)';
  const SQL_RESOLVE = 'select public.resolve_support_case($1,$2)';
  const SQL_CLOSE = 'select public.close_support_case($1,$2)';

  // -------------------------------------------------------------------
  await test('the flag is off by default and refuses a new case', async () => {
    assert((await q("select value_text from public.platform_settings where key='platform.support'")).rows[0].value_text === 'false');
    await refused(asker.userId, SQL_OPEN,
      ['account', 'Cannot sign in', 'My OTP never arrives.', null, null],
      /support is not open yet/i);
    assert((await q('select count(*)::int n from public.support_cases')).rows[0].n === 0);
  });

  await q("update public.platform_settings set value_text='true' where key='platform.support'");
  try {
    await test('a signed-in account opens a case and gets a human case number', async () => {
      const a = await newAsker('Numbered');
      const id = (await open(a.userId, 'payment', 'Charged twice', 'I was charged twice for one course.')).rows[0].id;
      const row = await caseRow(id);
      assert(/^SC-\d{6}$/.test(row.case_number), `case number was ${row.case_number}`);
      assert(row.status === 'open' && row.priority === 'normal');
      // The actor is the session, so there is no argument to spoof.
      assert(row.requested_by === a.userId, 'the case was recorded against the wrong account');
      assert(row.subject === 'Charged twice' && row.body === 'I was charged twice for one course.');
    });

    await test('anonymous callers are refused', async () => {
      await refused(null, 'select public.open_support_case($1,$2,$3)',
        ['other', 'No session', 'No session at all.'], /sign in to ask for help/i);
    });

    await test('category, subject and body are validated by name', async () => {
      const a = await newAsker('Validator');
      await refused(a.userId, SQL_OPEN, ['telepathy', 'Odd category', 'Body text here.', null, null],
        /unsupported support category: telepathy/i);
      await refused(a.userId, SQL_OPEN, ['account', '  ', 'Body text here.', null, null],
        /short subject/i);
      await refused(a.userId, SQL_OPEN, ['account', 'Blank body', '   ', null, null],
        /describe the problem/i);
    });

    await test('context must belong to the requester', async () => {
      // A stranger's learner profile, and an order on somebody else's billing
      // account, are both refused — otherwise a case becomes a way to pull
      // another person's details into a thread staff will discuss.
      await refused(asker.userId, SQL_OPEN,
        ['family', 'About a child', 'Body text here.', stranger.learnerId, null],
        /learner you do not have access to/i);
      await refused(stranger.userId, SQL_OPEN,
        ['payment', 'About an order', 'Body text here.', null, orderId],
        /not on the billing account/i);
      await refused(asker.userId, SQL_OPEN,
        ['payment', 'Missing order', 'Body text here.', null, '00000000-0000-0000-0000-000000000000'],
        /order not found/i);

      const id = (await open(asker.userId, 'family', 'About my own progress', 'Body text here.',
        asker.learnerId, orderId)).rows[0].id;
      const row = await caseRow(id);
      assert(row.learner_profile_id === asker.learnerId && row.order_id === orderId);
    });

    await test('five open cases is the ceiling for one account', async () => {
      const flooder = await newAsker('Flooder');
      for (let i = 1; i <= 5; i++) {
        assert((await open(flooder.userId, 'other', `Open case ${i}`, 'Still waiting.')).rows[0].id);
      }
      await refused(flooder.userId, SQL_OPEN, ['other', 'Open case 6', 'Still waiting.', null, null],
        /five open requests/i);
      // Closing one frees the slot, which is the remedy the message offers.
      const first = (await q(
        'select id from public.support_cases where requested_by=$1 order by created_at limit 1',
        [flooder.userId])).rows[0].id;
      await close(flooder.userId, first, 'Solved it myself.');
      assert((await open(flooder.userId, 'other', 'Open case 6', 'Still waiting.')).rows[0].id);
    });

    await test('a case is visible to its requester and to staff, and to nobody else', async () => {
      const a = await newAsker('Visible');
      const id = (await open(a.userId, 'access', 'Cannot open a lesson', 'The video will not load.')).rows[0].id;
      await reply(a.userId, id, 'It happens on my phone too.');
      await asUser(a.userId, async () => {
        assert((await q('select count(*)::int n from public.support_cases where id=$1', [id])).rows[0].n === 1);
        assert((await q('select count(*)::int n from public.support_case_messages where case_id=$1', [id])).rows[0].n === 1);
      });
      await asUser(agent, async () => {
        assert((await q('select count(*)::int n from public.support_cases where id=$1', [id])).rows[0].n === 1);
      });
      await asUser(stranger.userId, async () => {
        assert((await q('select count(*)::int n from public.support_cases where id=$1', [id])).rows[0].n === 0,
          'another account could read the case');
        assert((await q('select count(*)::int n from public.support_case_messages where case_id=$1', [id])).rows[0].n === 0);
      });
    });

    await test('nobody writes to the tables directly', async () => {
      await refused(asker.userId,
        `insert into public.support_cases (case_number, requested_by, category, subject, body)
         values ('SC-999999',$1,'other','Forged','Forged case.')`, [asker.userId],
        /permission denied/i);
      await refused(agent,
        `update public.support_cases set priority='urgent' where case_number like 'SC-%'`, [],
        /permission denied/i);
    });

    await test('a requester replies, and cannot write an internal note', async () => {
      const a = await newAsker('Replier');
      const id = (await open(a.userId, 'certificate', 'Certificate missing', 'I finished but there is no certificate.')).rows[0].id;
      const messageId = (await reply(a.userId, id, 'It has been three days.')).rows[0].id;
      const row = (await q('select author_kind, is_internal from public.support_case_messages where id=$1', [messageId])).rows[0];
      // Computed from who the author is, not from what the request asked for.
      assert(row.author_kind === 'requester' && row.is_internal === false);
      await refused(a.userId, SQL_REPLY, [id, 'Let me annotate this.', true],
        /only staff may write an internal note/i);
      await refused(stranger.userId, SQL_REPLY, [id, 'Me too.', false],
        /cannot reply to somebody else/i);
    });

    await test('an internal note is invisible to the requester and readable by staff', async () => {
      const a = await newAsker('Internal');
      const id = (await open(a.userId, 'payment', 'Refund question', 'Where is my refund?')).rows[0].id;
      await reply(agent, id, 'Checking the ledger now.', false);
      await reply(agent, id, 'Asked three times; escalate if not settled today.', true);

      await asUser(agent, async () => {
        assert((await q('select count(*)::int n from public.support_case_messages where case_id=$1', [id])).rows[0].n === 2);
      });
      await asUser(a.userId, async () => {
        const rows = (await q(
          'select body, is_internal from public.support_case_messages where case_id=$1 order by created_at',
          [id])).rows;
        assert(rows.length === 1, `the requester saw ${rows.length} of 2 messages`);
        assert(rows[0].is_internal === false && /ledger/.test(rows[0].body));
      });
    });

    await test('only staff may triage, and resolving needs the note the requester reads', async () => {
      const a = await newAsker('Triaged');
      const id = (await open(a.userId, 'account', 'Change my email', 'I lost access to my old address.')).rows[0].id;
      await refused(a.userId, SQL_ASSIGN, [id, agent], /only staff may assign/i);
      await refused(a.userId, SQL_PRIORITY, [id, 'urgent'], /only staff may set a case priority/i);
      await refused(a.userId, SQL_RESOLVE, [id, 'Fixed.'], /only staff may resolve/i);
      await refused(agent, SQL_RESOLVE, [id, '   '], /say how this was resolved/i);
      await refused(agent, SQL_PRIORITY, [id, 'critical'], /unsupported priority: critical/i);

      await prioritise(agent, id, 'high');
      await assign(agent, id, agent);
      let row = await caseRow(id);
      assert(row.priority === 'high' && row.status === 'assigned');
      assert(row.assigned_to === agent && row.assigned_by === agent && row.assigned_at !== null);

      await resolve(agent, id, 'Email updated after verification.');
      row = await caseRow(id);
      assert(row.status === 'resolved' && row.resolved_by === agent
        && row.resolution_note === 'Email updated after verification.');
    });

    await test('a requester who replies to a resolved case reopens it', async () => {
      const a = await newAsker('Reopened');
      const id = (await open(a.userId, 'access', 'Still cannot open it', 'The lesson is locked.')).rows[0].id;
      await assign(agent, id, agent);
      await resolve(agent, id, 'Entitlement re-granted.');
      assert((await caseRow(id)).status === 'resolved');

      await reply(a.userId, id, 'No, it is still locked.');
      const row = await caseRow(id);
      // Back to the state it was in, with the resolution cleared — a resolved
      // badge on an unanswered case is how a queue lies about itself.
      assert(row.status === 'assigned', `status was ${row.status}`);
      assert(row.resolved_at === null && row.resolved_by === null && row.resolution_note === null);

      const actions = (await q(
        `select action from public.governance_audit_events
          where target_type='support_case' and target_id=$1 order by occurred_at`,
        [id])).rows.map(x => x.action);
      assert(actions.includes('support_case.reopened'), `actions were ${actions.join(',')}`);
    });

    await test('a staff reply does not reopen or resolve anything', async () => {
      const a = await newAsker('Answered');
      const id = (await open(a.userId, 'other', 'A question', 'How long does a refund take?')).rows[0].id;
      await reply(agent, id, 'Three working days once approved.', false);
      const row = await caseRow(id);
      // Answering is not resolving: the status stays open until somebody says
      // the case is finished.
      assert(row.status === 'open' && row.resolved_at === null);
    });

    await test('closing is terminal, reasoned, and open to the requester', async () => {
      const a = await newAsker('Withdrawer');
      const id = (await open(a.userId, 'other', 'Withdraw this', 'Asked in the wrong place.')).rows[0].id;
      await refused(stranger.userId, SQL_CLOSE, [id, 'Closed by a stranger.'],
        /cannot close somebody else/i);
      await refused(a.userId, SQL_CLOSE, [id, '  '], /give a reason for closing/i);

      await close(a.userId, id, 'Asked in the wrong place.');
      const row = await caseRow(id);
      assert(row.status === 'closed' && row.closed_by === a.userId
        && row.close_reason === 'Asked in the wrong place.');

      await refused(a.userId, SQL_REPLY, [id, 'One more thing.', false], /this case is closed/i);
      await refused(agent, SQL_CLOSE, [id, 'Again.'], /already closed/i);
      await refused(agent, SQL_ASSIGN, [id, agent], /closed case cannot be assigned/i);
    });

    await test('switching the flag off stops new cases but not the work in flight', async () => {
      const a = await newAsker('InFlight');
      const id = (await open(a.userId, 'payment', 'In flight when disabled', 'Still waiting on this.')).rows[0].id;
      await q("update public.platform_settings set value_text='false' where key='platform.support'");

      await refused(a.userId, SQL_OPEN, ['other', 'New case while off', 'Should not be accepted.', null, null],
        /support is not open yet/i);
      await refused(a.userId, SQL_REPLY, [id, 'Any update?', false], /support is not open right now/i);

      // The kill switch must not strand a conversation: staff can still answer
      // and finish what is already open.
      assert((await reply(agent, id, 'Refund issued today.', false)).rows[0].id);
      await resolve(agent, id, 'Refund issued.');
      assert((await caseRow(id)).status === 'resolved');
      await close(agent, id, 'Settled and confirmed.');
      assert((await caseRow(id)).status === 'closed');
    });

    await test('opening, triage and closure are audited', async () => {
      await q("update public.platform_settings set value_text='true' where key='platform.support'");
      const a = await newAsker('Audited');
      const id = (await open(a.userId, 'account', 'Audit me', 'Checking the trail.')).rows[0].id;
      await reply(a.userId, id, 'A follow-up.');
      await reply(agent, id, 'An internal check.', true);
      await prioritise(agent, id, 'urgent');
      await assign(agent, id, agent);
      await resolve(agent, id, 'Handled.');
      await close(agent, id, 'Confirmed with the requester.');

      const actions = (await q(
        `select action from public.governance_audit_events
          where target_type='support_case' and target_id=$1 order by occurred_at`,
        [id])).rows.map(x => x.action);
      assert(actions.join(',') === [
        'support_case.opened',
        'support_case.replied',
        'support_case.internal_note',
        'support_case.prioritised',
        'support_case.assigned',
        'support_case.resolved',
        'support_case.closed',
      ].join(','), `actions were ${actions.join(',')}`);

      // That the log itself is append-only is pinned in group3.test.mjs, which
      // reaches the rows as superuser. Asserting it again here would only test
      // RLS visibility: a row-level trigger does not fire for a DELETE that
      // cannot see any rows, so the absence of an error would prove nothing.
    });
  } finally {
    await q("update public.platform_settings set value_text='false' where key='platform.support'");
  }
}
