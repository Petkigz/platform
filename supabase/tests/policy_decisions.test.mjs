// The owner answered. This suite is the record of what was decided, and the proof
// that the last question is a fact rather than a decision.
//
// Two things it protects:
//
//   * the answers are *in the drafts*, in the words the owner chose, not in a
//     comment somewhere that a reader of the policy never sees; and
//   * exactly one question is left — the operator's name and contact details —
//     because a made-up name in a privacy notice is worse than an unanswered one,
//     and because four copies of the same fact would eventually disagree.
//
// The publication tests run inside a transaction that is rolled back, so the suite
// leaves the register exactly as it found it: seven drafts, nothing in force.

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    bootstrapAdmin, newUser, newProfile, grantRole, committed,
  } = ctx;

  const admin = await bootstrapAdmin('decisions-admin@example.com');

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

  /** Something that must not survive the test: run it, then undo it. */
  async function whileRolledBack(actor, work) {
    await q('begin');
    await q(`select set_config('request.jwt.claims',$1,true)`,
      [JSON.stringify({ sub: actor, role: 'authenticated' })]);
    await q('set local role authenticated');
    try {
      return await work();
    } finally {
      await q('rollback');
    }
  }

  const body = async (slug) => (await q(
    `select v.body, v.change_note, v.id from public.policy_versions v
       join public.policy_documents d on d.id = v.document_id
      where d.slug = $1 and v.status = 'draft'`, [slug])).rows[0];

  const governance = await newUser('decisions-governance@example.com');
  await newProfile(governance, 'Decisions Governance');
  await committed(() => grantRole(governance, 'governance_admin', admin));

  await test('one question is left in the whole register, and it is a fact nobody can invent', async () => {
    const rows = (await q(
      `select d.slug, public.policy_open_decisions(v.body) as open, v.body
         from public.policy_documents d
         join public.policy_versions v on v.document_id = d.id
        where v.status = 'draft'`)).rows;

    const total = rows.reduce((sum, r) => sum + r.open, 0);
    assert(total === 1, `expected one open decision in the register, found ${total}`);
    const holder = rows.find((r) => r.open === 1);
    assert(holder.slug === 'privacy',
      `the remaining question should be in the privacy notice, it is in ${holder.slug}`);
    assert(/name and contact details of the operator/.test(holder.body),
      'the remaining marker is not the operator’s name');

    // The other three places that need the same fact point at it rather than
    // repeating it, so there is one string to type and no way for them to disagree.
    for (const slug of ['children', 'safeguarding', 'takedown']) {
      assert(/operator named in the privacy notice/.test((await body(slug)).body),
        `${slug} does not refer to the operator named in the privacy notice`);
    }
  });

  await test('the drafts say what was decided, in the owner’s words', async () => {
    const terms = (await body('terms')).body;
    assert(/courts of Uganda hear any dispute/.test(terms), 'terms: governing law');
    assert(/Ugandan law governs/.test(terms), 'terms: the law');
    assert(/USD 20/.test(terms), 'terms: the limit of liability');
    assert(/merchant of record is connected/.test(terms), 'terms: what is sold, and when');
    assert(/death or personal injury caused by negligence/.test(terms),
      'terms: the liability carve-out that cannot be excluded');

    const privacy = (await body('privacy')).body;
    assert(/Data Protection and Privacy Act, 2019 of Uganda/.test(privacy), 'privacy: the Act');
    assert(/Personal Data Protection Office \(PDPO\)/.test(privacy), 'privacy: the authority');
    assert(/three years after it is closed/.test(privacy), 'privacy: support retention');
    assert(/seven years after the person it concerns turns 18/.test(privacy),
      'privacy: safeguarding retention');
    assert(/Frankfurt region/.test(privacy), 'privacy: where the data is hosted');

    const children = (await body('children')).body;
    assert(/No one under 13 may use this platform anywhere, in any country/.test(children),
      'children: the under-13 position is not absolute');
    assert(/deleted within 30 days/.test(children), 'children: turning 18');

    const refunds = (await body('refunds')).body;
    assert(/applies on top of any right the law gives you/.test(refunds),
      'refunds: the statutory period is replaced rather than added to');
    assert(/no part-month refund/.test(refunds), 'refunds: mid-month cancellation');

    const teaching = (await body('teaching')).body;
    assert(/paid monthly, on the 15th/.test(teaching), 'teaching: the schedule');
    assert(/USD 50/.test(teaching), 'teaching: the minimum balance');
    assert(/teacher bears the transfer fee/.test(teaching), 'teaching: who pays the fee');

    const safeguarding = (await body('safeguarding')).body;
    assert(/not a criminal-record check/.test(safeguarding),
      'safeguarding: the gap is described rather than papered over');
    assert(/acknowledged within 24 hours/.test(safeguarding), 'safeguarding: the timescale');

    const takedown = (await body('takedown')).body;
    assert(/decided within 14 days/.test(takedown), 'takedown: the decision timescale');
    assert(/10 days to respond/.test(takedown), 'takedown: the counter-notice window');
    assert(/Three upheld notices/.test(takedown), 'takedown: what counts as repeated');
  });

  await test('no document invents a contact detail to fill the gap', async () => {
    const rows = (await q(
      `select d.slug, v.body from public.policy_documents d
         join public.policy_versions v on v.document_id = d.id
        where v.status = 'draft'`)).rows;
    for (const row of rows) {
      assert(!/[\w.+-]+@[\w-]+\.[a-z]{2,}/i.test(row.body),
        `${row.slug} contains an email address nobody supplied`);
      assert(!/\[address\]|TBD|TODO|XXX/i.test(row.body),
        `${row.slug} contains a placeholder that is not an owner decision marker`);
    }
  });

  await test('the answered documents can be published; the one with a question cannot', async () => {
    const termsDraft = await body('terms');

    const published = await whileRolledBack(admin, async () => {
      const result = (await q('select public.approve_policy_version($1,$2,$3) as r',
        [termsDraft.id, '2026-11-01', 'The owner answered every question in this text.'])).rows[0].r;
      const live = (await q('select status from public.policy_versions where id = $1',
        [termsDraft.id])).rows[0].status;
      return { result, live };
    });
    assert(published.result.status === 'in_force', 'the answered terms would not publish');
    assert(published.live === 'in_force', 'the version is not in force inside the transaction');

    const privacyDraft = await body('privacy');
    await whileRolledBack(admin, async () => {
      await rejects(() => q('select public.approve_policy_version($1,$2,$3)',
        [privacyDraft.id, '2026-11-01', 'Trying to publish with a question open.']),
      /policy:decisions_open/);
    });
  });

  await test('typing the one name is the whole of the last step', async () => {
    // Exactly what the owner will do on /admin/policies: replace the marker in the
    // draft, save it, publish it. Done here in a transaction and undone afterwards.
    const draft = await body('privacy');
    const answered = draft.body.replace(
      '[OWNER DECISION: the name and contact details of the operator of this platform.]',
      'AyahSpring is operated by its owner, who can be reached at the address published on the '
      + 'contact page of this deployment.',
    );
    assert(answered !== draft.body, 'the marker was not in the draft');
    assert(!/\[OWNER DECISION/.test(answered), 'something is still unanswered after the edit');

    const result = await whileRolledBack(admin, async () => {
      const saved = (await q('select public.save_policy_draft($1,$2,$3) as r',
        ['privacy', answered, 'The operator is named in the notice.'])).rows[0].r;
      assert(saved.openDecisions === 0, 'the saved draft still counts open decisions');
      return (await q('select public.approve_policy_version($1,$2,$3) as r',
        [saved.id, '2026-11-01', 'The owner supplied the one fact the notice was waiting for.'])).rows[0].r;
    });
    assert(result.status === 'in_force', 'the privacy notice would not publish once the name was in');

    // And the register is untouched: still one question, still the same one.
    const after = (await q(
      `select coalesce(sum(public.policy_open_decisions(v.body)), 0)::int as n
         from public.policy_versions v where v.status = 'draft'`)).rows[0].n;
    assert(after === 1, `the rolled-back edit changed the register: ${after} open decisions`);
  });

  await test('the register counts one open decision, and staff can see which', async () => {
    const board = await call(governance, 'policy_register()');
    assert(board.counts.openDecisions === 1,
      `the register counts ${board.counts.openDecisions} open decisions`);
    const privacy = board.documents.find((d) => d.slug === 'privacy');
    assert(privacy.draft.openDecisions === 1, 'the privacy draft is not the one counted');
    const terms = board.documents.find((d) => d.slug === 'terms');
    assert(terms.draft.openDecisions === 0, 'the terms draft still counts a question');
  });

  await test('the flag row no longer lists questions that have been answered', async () => {
    const row = (await q(
      `select preconditions from public.platform_settings where key = 'platform.legal'`)).rows[0];
    assert(/answered as of 2026-10-27/.test(row.preconditions),
      'the legal flag does not record that the decisions were made');
    assert(/One marker remains/.test(row.preconditions),
      'the legal flag does not name the one question left');
    assert(!/answer those markers/i.test(row.preconditions),
      'the legal flag still asks for markers that are answered');
  });

  await test('the revenue share is 50 per cent, and it is still the owner’s number', async () => {
    const share = (await q(
      `select value_text from public.platform_settings
        where key = 'teaching.revenue_share_percent'`)).rows[0].value_text;
    assert(share === '50', `the teacher's share is ${share}, not the 50 the owner chose`);
    // Confirmed on 2026-10-27 against the 2026-10-19 decision; the teaching policy
    // records the terms around it.
    const teaching = (await body('teaching')).body;
    assert(/Earnings accrue/.test(teaching), 'the teaching policy says nothing about accrual');
  });
}
