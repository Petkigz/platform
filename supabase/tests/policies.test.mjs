// The documents, in force, and the promise that the database will not make the
// owner's decisions for them.
//
// Since 2026-10-28 all seven are published: the owner answered every question and
// then said publish. So this suite starts from the state a real deployment starts
// in — seven documents live, nothing in draft — and checks the three things that
// make publication mean something:
//
//   * a live version says when it took effect and on whose instruction, and it
//     freezes; a change is a new version, never an edit;
//   * a document with an open `[OWNER DECISION: …]` cannot be put in force, proved
//     on a draft written here because no seeded document carries one any more;
//   * an acceptance names a version rather than a document, so a retired version
//     keeps the signature it was given and its reader is asked again for the new one.

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    bootstrapAdmin, newUser, newProfile, asAnon,
  } = ctx;

  const admin = await bootstrapAdmin('policy-admin@example.com');

  async function account(email, name) {
    const id = await newUser(email);
    await newProfile(id, name);
    return id;
  }

  const learner = await account('policy-learner@example.com', 'Policy Learner');

  const governance = await account('policy-governance@example.com', 'Governance Person');
  await q(`insert into public.user_role_assignments (user_id, role_id, assigned_by)
           select $1, id, $2 from public.roles where code = 'governance_admin'`,
    [governance, admin]);

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

  const scalar = async (sql, params = []) => (await q(sql, params)).rows[0];
  const call = async (actor, fn, params = []) =>
    (await asActor(actor, `select public.${fn} as r`, params)).rows[0].r;

  /** Work that must leave no trace: run it inside a transaction, then undo it. */
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
  const eq = (actual, expected, what) =>
    assert(actual === expected,
      `${what}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);

  const docId = async (slug) =>
    (await scalar('select id from public.policy_documents where slug = $1', [slug])).id;
  const draftOf = async (slug) =>
    (await scalar(
      `select v.* from public.policy_versions v join public.policy_documents d on d.id = v.document_id
        where d.slug = $1 and v.status = 'draft' order by v.version_number desc limit 1`,
      [slug]));
  const liveOf = async (slug) =>
    (await scalar(
      `select v.* from public.policy_versions v join public.policy_documents d on d.id = v.document_id
        where d.slug = $1 and v.status = 'in_force'`, [slug]));

  // The clean text: a body with every owner decision answered. Used wherever a
  // test needs a document that *can* go in force.
  async function cleanBody(slug) {
    const draft = await draftOf(slug);
    const source = draft?.body ?? (await liveOf(slug)).body;
    return source.replace(/\[OWNER DECISION:[^\]]*\]/g, 'Answered by the owner.').trim();
  }

  await test('the seven documents are published, from one date, on one instruction', async () => {
    const docs = (await q(
      `select d.slug, d.acceptance_required,
              count(v.id) filter (where v.status = 'draft') as drafts,
              count(v.id) filter (where v.status = 'in_force') as live,
              max(v.effective_at) as effective,
              max(v.approved_by::text) as approver,
              max(v.approval_reason) as reason
         from public.policy_documents d
         left join public.policy_versions v on v.document_id = d.id
        group by d.slug, d.acceptance_required
        order by d.slug`)).rows;

    assert(docs.length === 7, `expected the seven documents, found ${docs.length}`);
    for (const doc of docs) {
      eq(Number(doc.drafts), 0, `${doc.slug} still has a draft, so it was not published`);
      eq(Number(doc.live), 1, `${doc.slug} live versions`);
      eq(new Date(doc.effective).toISOString().slice(0, 10), '2026-10-28',
        `${doc.slug} effective date`);
      // No account existed when the migrations ran, so the instruction is the
      // record. Naming a person who did not click would be worse.
      eq(doc.approver, null, `${doc.slug} names an approver who does not exist`);
      assert(/^Owner instruction/.test(doc.reason ?? ''),
        `${doc.slug} does not record the instruction that published it`);
    }
    // Terms, privacy and the teacher terms are agreed to; the rest are read.
    eq(docs.find((d) => d.slug === 'terms').acceptance_required, true, 'terms require acceptance');
    eq(docs.find((d) => d.slug === 'safeguarding').acceptance_required, false,
      'a safeguarding policy is read, not agreed to');

    const live = await call(learner, 'policies_in_force()');
    eq(live.length, 7, 'the documents a visitor is shown');
    assert(live.every((row) => row.versionNumber === 1), 'a published version is not version one');
  });

  await test('a document in force is readable by a visitor who has no account', async () => {
    const page = await asAnon(() => q(`select public.policy_page('terms') as r`)).then(
      (res) => res.rows[0].r);
    eq(page.versionNumber, 1, 'the version a visitor reads');
    assert(!/\[OWNER DECISION/.test(page.body), 'a visitor is shown an unanswered question');
    assert(/Terms of use/.test(page.title), 'the page has no title');
    assert(page.body.length > 500, 'the body is suspiciously short');
    assert(/AyahSpring is the controller/.test(
      (await asAnon(() => q(`select public.policy_page('privacy') as r`)).then(
        (res) => res.rows[0].r)).body),
    'the live privacy notice does not name the operator');

    // A slug nobody has published answers with nothing rather than with a draft.
    eq(await asAnon(() => q(`select public.policy_page('no-such-policy') as r`)).then(
      (res) => res.rows[0].r), null, 'a slug that does not exist produced a page');
  });

  await test('a draft with an open decision cannot be put in force', async () => {
    // Every seeded document is answered now, so the guard is proved on a text
    // written here with one question still in it — and rolled back, because a
    // draft left behind would be a document nobody meant to write.
    await whileRolledBack(admin, async () => {
      const saved = (await q('select public.save_policy_draft($1,$2,$3) as r',
        ['takedown',
         `${(await liveOf('takedown')).body}\n\n[OWNER DECISION: who decides an appeal.]`,
         'A draft with one question left in it.'])).rows[0].r;
      eq(saved.openDecisions, 1, 'the saved draft counts its open decision');

      // A refused statement aborts the surrounding transaction, so the refusal is
      // taken at a savepoint and the state is read back from it.
      await q('savepoint refused');
      await rejects(
        () => q('select public.approve_policy_version($1,$2,$3)',
          [saved.id, '2026-11-01', 'Ready to publish.']),
        /decisions_open/);
      await q('rollback to savepoint refused');

      eq((await q('select status from public.policy_versions where id = $1',
        [saved.id])).rows[0].status, 'draft', 'the refused version');
    });

    // And the live register is untouched by any of it.
    eq((await liveOf('takedown')).version_number, 1, 'the refused approval changed the live version');
  });

  await test('a decision needs a written reason, and only the owner may give one', async () => {
    await whileRolledBack(admin, async () => {
      const saved = (await q('select public.save_policy_draft($1,$2,$3) as r',
        ['refunds', `${(await liveOf('refunds')).body}\n\nA sentence added by the owner.`,
         'One sentence clarified.'])).rows[0].r;

      await q('savepoint a');
      await rejects(
        () => q('select public.approve_policy_version($1,$2,$3)', [saved.id, '2026-11-01', '  ']),
        /reason_required/);
      await q('rollback to savepoint a');

      // The reviewer is taken from the claims, so each refusal is made as that
      // account rather than as the admin who opened the transaction.
      for (const actor of [governance, learner]) {
        await q(`select set_config('request.jwt.claims',$1,true)`,
          [JSON.stringify({ sub: actor, role: 'authenticated' })]);
        await q('savepoint b');
        await rejects(
          () => q('select public.approve_policy_version($1,$2,$3)',
            [saved.id, '2026-11-01', 'I think it is fine.']),
          /not_allowed/);
        await q('rollback to savepoint b');
      }
    });
  });

  await test('a change is a new version: the old one retires and keeps its signature', async () => {
    const v1 = await liveOf('terms');
    eq(v1.version_number, 1, 'the published terms');

    // The reader agrees to version one.
    const first = await call(learner, 'accept_policy($1)', ['terms']);
    eq(first.versionNumber, 1, 'the version accepted');
    eq(first.already, false, 'the first acceptance');

    // The owner amends one sentence. The text that was agreed to is not edited —
    // it is replaced by a new version, and the old one is retired.
    const body = `${v1.body}\n\n## A correction\n\nOne sentence was ambiguous and has been rewritten.`;
    const saved = await call(admin, 'save_policy_draft($1,$2,$3)',
      ['terms', body, 'Clarifying one sentence.']);
    eq(saved.versionNumber, 2, 'a change is a new version');

    const out = await call(admin, 'approve_policy_version($1,$2,$3)',
      [saved.id, '2026-11-01', 'Reviewed against the code and approved.']);
    eq(out.status, 'in_force', 'the approval');
    eq(out.replaced, v1.id, 'the version it replaced');

    const live = await liveOf('terms');
    eq(live.version_number, 2, 'the live version');
    eq(live.approved_by, admin, 'who approved it');
    eq(live.approval_reason, 'Reviewed against the code and approved.', 'the written reason');
    // A `date` comes back as a Date object from this driver, not as a string.
    eq(new Date(live.effective_at).toISOString().slice(0, 10), '2026-11-01', 'the effective date');

    const old = await scalar('select status from public.policy_versions where id = $1', [v1.id]);
    eq(old.status, 'retired', 'the version it replaced');

    // The acceptance of version one still exists — a retired version is history.
    eq((await q('select count(*)::int n from public.policy_acceptances where policy_version_id = $1',
      [v1.id])).rows[0].n, 1, 'the acceptance of a retired version');

    // And the account is asked again, for the new text.
    const standing = await call(learner, 'my_policy_standing()');
    const terms = standing.acceptanceRequired.find((row) => row.slug === 'terms');
    eq(terms.versionNumber, 2, 'the version now live');
    eq(terms.acceptedAt, null, 'acceptance of a version nobody has read');
  });

  await test('a version in force cannot be rewritten or deleted', async () => {
    const live = await liveOf('terms');

    await rejects(
      () => q(`update public.policy_versions set body = 'Something else entirely, quietly.' where id = $1`,
        [live.id]),
      /cannot be edited/);

    await rejects(
      () => q('delete from public.policy_versions where id = $1', [live.id]),
      /cannot be deleted/);

    // The approval record is not part of the text either: changing who agreed is
    // not the same as changing what they agreed to.
    const unchanged = await scalar('select body from public.policy_versions where id = $1', [live.id]);
    eq(unchanged.body, live.body, 'the body after a refused edit');
  });

  await test('only a live version can be accepted, and doing it twice changes nothing', async () => {
    const before = await call(learner, 'my_policy_standing()');
    eq(before.acceptanceRequired.length, 3,
      'the documents awaiting acceptance: the amended terms, the privacy notice and '
      + 'the teacher terms');

    const first = await call(learner, 'accept_policy($1)', ['terms']);
    eq(first.versionNumber, 2, 'the version accepted');
    eq(first.already, false, 'the first acceptance');

    const second = await call(learner, 'accept_policy($1)', ['terms']);
    eq(second.already, true, 'the second acceptance is not a second record');
    eq(second.acceptedAt, first.acceptedAt, 'the time it was accepted');

    const rows = await q(
      `select count(*)::int n from public.policy_acceptances a
        join public.policy_versions v on v.id = a.policy_version_id
        join public.policy_documents d on d.id = v.document_id
       where a.user_id = $1 and d.slug = 'terms'`, [learner]);
    eq(rows.rows[0].n, 2, 'acceptance rows — one per version that was in force');

    // A slug nobody has published is not a typo to be forgiven. A document with no
    // live version is checked in the next test, because every seeded document now
    // has one.
    await rejects(() => call(learner, 'accept_policy($1)', ['no-such-policy']), /not_found/);
  });

  await test('the register is staff work; the text is the owner’s', async () => {
    await rejects(() => call(learner, 'policy_register()'), /not_allowed/);

    const board = await call(governance, 'policy_register()');
    eq(board.documents.length, 7, 'governance cannot see the register');
    eq(board.counts.openDecisions, 0, 'the open decisions counted after the owner answered');

    // Governance reads; it does not write. The refusal is the same one the
    // approval test makes, checked here on the other writer.
    await rejects(
      () => call(governance, 'save_policy_draft($1,$2,$3)',
        ['terms', 'x'.repeat(400), 'Rewritten by governance.']),
      /not_allowed/);

    const owner = await call(admin, 'policy_register()');
    const terms = owner.documents.find((doc) => doc.slug === 'terms');
    eq(terms.live.versionNumber, 2, 'the live version on the register');
    eq(terms.acceptedAccounts, 1, 'accounts that accepted the current version');
    eq(terms.draft, null, 'a document was left in draft');
    eq(terms.versions.length, 2, 'every version is listed, retired ones included');

    // The full body is a separate read, so the register stays small. The register
    // carries version numbers rather than ids for the live text, and the version
    // list carries both.
    const liveId = terms.versions.find((v) => v.status === 'in_force').id;
    const live = await call(admin, 'policy_draft($1)', [liveId]);
    assert(live.body.length > 200, 'the reader did not receive the text');

    // A retired version is still readable in full: it is what somebody agreed to.
    const retired = owner.documents.find((doc) => doc.slug === 'terms')
      .versions.find((v) => v.status === 'retired');
    const old = await call(admin, 'policy_draft($1)', [retired.id]);
    assert(/These terms/.test(old.body), 'the retired version lost its text');
    assert(old.body !== live.body, 'the retired version was quietly rewritten');
  });

  await test('the owner can add a document, and it reaches nobody until approved', async () => {
    await rejects(
      () => call(learner, 'create_policy_document($1,$2,$3)',
        ['incident-response', 'Incident response', 'What happens when something goes wrong.']),
      /not_allowed/);
    await rejects(
      () => call(governance, 'create_policy_document($1,$2,$3)',
        ['incident-response', 'Incident response', 'What happens when something goes wrong.']),
      /not_allowed/);

    // The slug is an address and the checks are named, because the screen that
    // shows them is written by whoever reads the refusal.
    await rejects(
      () => call(admin, 'create_policy_document($1,$2,$3)',
        ['Incident Response!', 'Incident response', 'What happens when something goes wrong.']),
      /slug_invalid/);
    await rejects(
      () => call(admin, 'create_policy_document($1,$2,$3)', ['incident-response', 'No', 'Too short.']),
      /title_required/);
    await rejects(
      () => call(admin, 'create_policy_document($1,$2,$3)', ['incident-response', 'Incident response', 'short']),
      /summary_required/);
    await rejects(
      () => call(admin, 'create_policy_document($1,$2,$3,$4)',
        ['incident-response', 'Incident response', 'What happens when something goes wrong.', 'nobody']),
      /audience_invalid/);

    const created = await call(admin, 'create_policy_document($1,$2,$3,$4,$5)',
      ['incident-response', 'Incident response (draft)', 'What happens when something goes wrong, and who is told.', 'everyone', false]);
    eq(created.slug, 'incident-response', 'the slug it was given');

    const again = await call(admin, 'create_policy_document($1,$2,$3)',
      ['incident-response', 'Incident response', 'What happens when something goes wrong.'])
      .then(() => null).catch((e) => e);
    assert(/policy:exists/.test(String(again?.message ?? '')), 'the same slug was accepted twice');

    // It is in the register, it has no version, and it is therefore not in force.
    const register = await call(admin, 'policy_register()');
    const row = register.documents.find((doc) => doc.slug === 'incident-response');
    assert(row, 'the new document is not on the register');
    eq(row.live, null, 'a document added with no text is somehow in force');
    eq(row.draft, null, 'a document added with no text has a draft');
    eq(row.acceptedAccounts, 0, 'accounts that agreed to nothing');

    // And a visitor still sees nothing: no approved text, so no page.
    eq(await asAnon(() => q(`select public.policy_page('incident-response') as r`)).then(
      (res) => res.rows[0].r), null, 'a document with no version produced a page');

    // Nor can anybody agree to a document that is not in force.
    await rejects(
      () => call(learner, 'accept_policy($1)', ['incident-response']), /not_in_force/);

    // The first version is written and approved through the ordinary path.
    const saved = await call(admin, 'save_policy_draft($1,$2,$3)',
      ['incident-response', `${'## What this is\n\n' + 'A runbook nobody has written yet. '.repeat(10)}`,
        'First draft.']);
    eq(saved.versionNumber, 1, 'the first version of a new document');
    const approved = await call(admin, 'approve_policy_version($1,$2,$3)',
      [saved.id, '2026-12-01', 'The owner wrote the runbook.']);
    eq(approved.status, 'in_force', 'the first version of the new document');
    eq(approved.replaced, null, 'a document that had no version to replace');
  });

  await test('the switches now describe what is built, and not what is not', async () => {
    const rows = (await q(
      `select key, gate_type, preconditions from public.platform_settings
        where key like 'platform.%'
          and key in ('platform.legal', 'platform.terms_versioning', 'platform.safeguarding',
                      'platform.takedown', 'platform.incident', 'platform.age_assurance',
                      'platform.withdrawal_right')
        order by key`)).rows;
    eq(rows.length, 7, 'the seven policy flags');

    const of = (key) => rows.find((r) => r.key === key);
    // Versioning needs nothing but the owner's decisions in the text, and the
    // publishing itself is a screen — so it is a runtime toggle, not a deploy.
    eq(of('platform.terms_versioning').gate_type, 'admin', 'terms versioning');
    // Legal still needs a document: the decisions, and the people to name.
    eq(of('platform.legal').gate_type, 'admin_setup', 'the legal register');

    // A flag that says nothing exists while the machinery exists is a lie that
    // survives until somebody reads it. Every one of the seven is past that now.
    for (const row of rows) {
      assert(!/Nothing exists/.test(row.preconditions),
        `${row.key} still says "Nothing exists"`);
    }
    assert(/incident register/i.test(of('platform.incident').preconditions),
      'incident response does not name the register that exists');
    assert(/detection/i.test(of('platform.incident').preconditions),
      'incident response does not say detection is missing');
    assert(/Published 2026-10-28/.test(of('platform.legal').preconditions),
      'legal does not say the documents are published');
    assert(/privacy@ayahspring\.com/.test(of('platform.legal').preconditions),
      'legal does not name the operator’s contact');
    assert(/screening/i.test(of('platform.safeguarding').preconditions),
      'safeguarding does not name the screening gap');
  });
}
