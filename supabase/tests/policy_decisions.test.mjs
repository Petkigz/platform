// The owner answered — all twenty-three — and then published. This suite is the
// record of what was decided and the proof that the register holds no unanswered
// question, in the live text rather than in a draft nobody reads.
//
// What it protects:
//
//   * the answers are *in the drafts*, in the words the owner chose, not in a
//     comment somewhere that a reader of the policy never sees;
//   * the operator is **AyahSpring**, reachable at privacy@ayahspring.com,
//     operated from Uganda — a trading name and an address, and *not* an
//     incorporated entity, because "Inc." is a claim about a registration that
//     has not happened and a notice may not make claims it cannot support;
//   * the three other documents that need a controller point at that line rather
//     than repeating it, so there is one string to keep correct; and
//   * the guard still works: a document with a question in it cannot be put in
//     force, even though every seeded document is now answered.
//
// Since 2026-10-28 the seven documents are in force from that date, published on
// the owner's recorded instruction because a fresh deployment has no accounts when
// the migrations run. Nothing here may disturb that; the one test that writes a
// document does it inside a transaction that is rolled back.

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
    `select v.body, v.change_note, v.id, v.status, v.effective_at, v.approval_reason,
            v.approved_by, v.version_number
       from public.policy_versions v
       join public.policy_documents d on d.id = v.document_id
      where d.slug = $1 and v.status = 'in_force'`, [slug])).rows[0];

  const governance = await newUser('decisions-governance@example.com');
  await newProfile(governance, 'Decisions Governance');
  await committed(() => grantRole(governance, 'governance_admin', admin));

  await test('no question is left in the register', async () => {
    const rows = (await q(
      `select d.slug, public.policy_open_decisions(v.body) as open, v.body, v.change_note
         from public.policy_documents d
         join public.policy_versions v on v.document_id = d.id
        where v.status = 'in_force'`)).rows;
    // Seven seeded documents. An earlier suite adds an eighth and publishes it, so
    // this counts the slugs rather than the rows.
    const slugs = rows.map((r) => r.slug);
    for (const slug of ['terms', 'privacy', 'children', 'refunds', 'teaching',
                        'safeguarding', 'takedown']) {
      assert(slugs.includes(slug), `${slug} is not in force`);
    }

    const total = rows.reduce((sum, r) => sum + r.open, 0);
    assert(total === 0, `the register still holds ${total} open decisions`);
    // And none of them says so in prose either — a marker rewritten by hand into
    // the same words would pass a counter and fail a reader.
    for (const row of rows) {
      assert(!/\[OWNER DECISION/i.test(row.body),
        `${row.slug} still contains an owner decision marker`);
      assert(!/TODO|TBD|\[address\]/i.test(row.body),
        `${row.slug} still contains a placeholder`);
    }
  });

  await test('the operator is named, and named honestly', async () => {
    const privacy = (await body('privacy')).body;

    assert(/AyahSpring is the controller/.test(privacy),
      'the privacy notice does not name the controller');
    assert(/privacy@ayahspring\.com/.test(privacy),
      'the privacy notice gives no way to reach the controller');
    assert(/operated from Uganda/.test(privacy),
      'the notice does not say where the operator is');

    // The refused suffix. "Inc." states that a company is registered somewhere;
    // nothing is, and a privacy notice is the last place to guess.
    for (const row of (await q(
      `select d.slug, v.body from public.policy_documents d
         join public.policy_versions v on v.document_id = d.id
        where v.status = 'in_force'`)).rows) {
      assert(!/\b(Inc|Ltd|Limited|LLC|GmbH|PLC)\b/.test(row.body),
        `${row.slug} claims an incorporated entity that has not been registered`);
      assert(!/registration number|company number|registered office/i.test(row.body),
        `${row.slug} claims a company registration`);
    }

    // Exactly one address in the whole register, so the operator can be reached
    // and no fifth invented inbox has crept in.
    const emails = new Set();
    for (const row of (await q(
      `select d.slug, v.body from public.policy_documents d
         join public.policy_versions v on v.document_id = d.id
        where v.status = 'in_force'`)).rows) {
      for (const m of row.body.matchAll(/[\w.+-]+@[\w-]+\.[a-z]{2,}/gi)) emails.add(m[0]);
    }
    assert(emails.size === 1, `the register carries ${[...emails].join(', ')}`);
    assert(emails.has('privacy@ayahspring.com'), 'the address is not the operator’s');

    // The other three places that need the same fact point at it rather than
    // repeating it, so there is one string to type and no way for them to disagree.
    for (const slug of ['children', 'safeguarding', 'takedown']) {
      assert(/operator named in the privacy notice/.test((await body(slug)).body),
        `${slug} does not refer to the operator named in the privacy notice`);
    }
  });

  await test('the under-13 rule is the same in both documents that state it', async () => {
    // The privacy notice used to say "not knowingly enrol a child under 13 there",
    // meaning the country where verification is switched on, while the children's
    // policy carried the owner's absolute answer. Two documents, two rules, and the
    // weaker one was the one a parent reads first.
    const privacy = (await body('privacy')).body;
    const children = (await body('children')).body;
    assert(/No one under 13 may use this platform anywhere, in any country/.test(privacy),
      'the privacy notice states a weaker under-13 rule than the children’s policy');
    assert(/No one under 13 may use this platform anywhere, in any country/.test(children),
      'the children’s policy lost the owner’s absolute rule');
    assert(!/does not knowingly enrol a child under 13 there/.test(privacy),
      'the privacy notice still describes the rule country by country');
  });

  await test('the documents say what was decided, in the owner’s words', async () => {
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

  await test('every document is in force, dated, and records the instruction', async () => {
    const SEEDED = ['terms', 'privacy', 'children', 'refunds', 'teaching',
                    'safeguarding', 'takedown'];

    // The publication record is version 1 of each seeded document. A later suite
    // amends the terms — which replaces the live version and retires it — so the
    // question "what was published on the instruction" is asked of version 1, not
    // of whatever happens to be live now.
    const published = (await q(
      `select d.slug, v.status, v.effective_at, v.approved_by, v.approval_reason,
              v.approved_at
         from public.policy_documents d
         join public.policy_versions v on v.document_id = d.id
        where v.version_number = 1
          and d.slug = any($1::text[])
        order by d.slug`, [SEEDED])).rows;
    assert(published.length === 7, `expected seven published documents, found ${published.length}`);

    for (const row of published) {
      assert(row.status === 'in_force' || row.status === 'retired',
        `${row.slug} version 1 is ${row.status}, so it was never published`);
      assert(new Date(row.effective_at).toISOString().slice(0, 10) === '2026-10-28',
        `${row.slug} takes effect on ${row.effective_at}`);
      assert(row.approved_at, `${row.slug} has no approval time`);
      // No account existed when the migrations ran, so the record is the
      // instruction — not a name that did not click a button.
      assert(row.approved_by === null, `${row.slug} names an approver`);
      assert(/^Owner instruction, 2026-10-28/.test(row.approval_reason),
        `${row.slug} does not record the owner's instruction`);
    }

    // Every one of them still has a live version, and a visitor reads all seven.
    const live = await whileRolledBack(admin, async () => (
      await q('select public.policies_in_force() as r')).rows[0].r);
    assert(Array.isArray(live) && live.length >= 7, 'the public register is missing documents');
    for (const slug of SEEDED) {
      assert(live.some((row) => row.slug === slug), `${slug} is not readable by a visitor`);
    }
  });

  await test('the constraint still requires a reason, and an approver unless instructed', async () => {
    // The widening is narrow on purpose: `approved_by` may be null only when the
    // reason begins "Owner instruction". Anything else is refused by the table.
    // Written as the table's owner rather than as an app role: an `authenticated`
    // session is refused by RLS before the constraint is ever consulted, and a
    // probe that tests the wrong layer proves nothing.
    await q('begin');
    try {
      await q('savepoint constraint_probe');
      await rejects(
        () => q(`update public.policy_versions
                   set approved_by = null, approval_reason = 'Looks fine to me.'
                 where status = 'in_force'
                   and document_id = (select id from public.policy_documents where slug = 'terms')`),
        /pv_in_force_needs_approval|violates check constraint/);
      await q('rollback to savepoint constraint_probe');

      // And the instruction form is still accepted: the reason is what the row
      // says it is, and nothing is published with an empty one.
      await q('savepoint reason_probe');
      await rejects(
        () => q(`update public.policy_versions
                   set approval_reason = '   '
                 where status = 'in_force'
                   and document_id = (select id from public.policy_documents where slug = 'terms')`),
        /pv_in_force_needs_approval|violates check constraint/);
      await q('rollback to savepoint reason_probe');
    } finally {
      await q('rollback');
    }
  });

  await test('the guard still refuses a question, even though none is planted', async () => {
    // Without this, "no open decisions" and "the counter is broken" look identical.
    await whileRolledBack(admin, async () => {
      const saved = (await q('select public.save_policy_draft($1,$2,$3) as r',
        ['terms',
         'Terms of use\n\n' + 'These are the terms on which the platform is offered. '.repeat(6)
           + '\n\n[OWNER DECISION: which regulator supervises the terms.]',
         'A draft with one question left in it.'])).rows[0].r;
      assert(saved.openDecisions === 1, 'the saved draft does not count its question');

      await q('savepoint refused');
      await rejects(
        () => q('select public.approve_policy_version($1,$2,$3)',
          [saved.id, '2026-11-01', 'Publishing with a question open.']),
        /decisions_open/);
      await q('rollback to savepoint refused');
    });

    const after = (await q(
      `select coalesce(sum(public.policy_open_decisions(v.body)), 0)::int as n
         from public.policy_versions v where v.status = 'draft'`)).rows[0].n;
    assert(after === 0, `a rolled-back edit changed the register: ${after} open decisions`);
  });

  await test('the register counts zero open decisions, and staff can still read it', async () => {
    const board = await call(governance, 'policy_register()');
    assert(board.counts.openDecisions === 0,
      `the register counts ${board.counts.openDecisions} open decisions`);
    for (const doc of board.documents ?? []) {
      assert(!doc.draft || doc.draft.openDecisions === 0,
        `${doc.slug} still reports a question`);
    }
  });

  await test('the flag row says the questions are answered, and names the only step left', async () => {
    const row = (await q(
      `select preconditions from public.platform_settings where key = 'platform.legal'`)).rows[0];
    assert(/Published 2026-10-28/.test(row.preconditions),
      'the legal flag does not record that the documents were published');
    assert(/privacy@ayahspring\.com/.test(row.preconditions),
      'the legal flag does not name the contact the notice gives');
    assert(/a change is a new version/i.test(row.preconditions),
      'the legal flag does not say how a published document changes');
    assert(!/publish each draft/i.test(row.preconditions),
      'the legal flag still tells the owner to publish drafts that are published');
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
