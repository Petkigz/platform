// The documents, and the promise that the database will not make the owner's
// decisions for them.
//
// The interesting test in this file is the third one: a draft that still holds an
// open `[OWNER DECISION: …]` cannot be put in force. Everything else exists to
// make that refusal meaningful — a live version that cannot be rewritten, an
// acceptance that names a version rather than a document, and a history that
// survives the version it replaced.

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

  // The clean text: the draft with every owner decision answered. Used wherever a
  // test needs a document that *can* go in force.
  async function cleanBody(slug) {
    const draft = await draftOf(slug);
    return draft.body
      .replace(/\[OWNER DECISION:[^\]]*\]/g, 'Answered by the owner on 2026-10-26.')
      .trim();
  }

  await test('the register ships as drafts, with nothing in force', async () => {
    const docs = (await q(
      `select d.slug, d.acceptance_required,
              count(v.id) filter (where v.status = 'draft') as drafts,
              count(v.id) filter (where v.status = 'in_force') as live
         from public.policy_documents d
         left join public.policy_versions v on v.document_id = d.id
        group by d.slug, d.acceptance_required
        order by d.slug`)).rows;

    assert(docs.length >= 7, `expected the seven documents, found ${docs.length}`);
    for (const doc of docs) {
      eq(Number(doc.drafts), 1, `${doc.slug} drafts`);
      eq(Number(doc.live), 0, `${doc.slug} live versions`);
    }
    // Terms, privacy and the teacher terms are agreed to; the rest are read.
    eq(docs.find((d) => d.slug === 'terms').acceptance_required, true, 'terms require acceptance');
    eq(docs.find((d) => d.slug === 'safeguarding').acceptance_required, false,
      'a safeguarding policy is read, not agreed to');

    // Nothing a visitor can read, because nothing has been approved.
    const live = await call(learner, 'policies_in_force()');
    eq(live.length, 0, 'a policy was live without being approved');
  });

  await test('a draft either waits on a decision or records that the owner made it', async () => {
    // The original rule was "every seeded draft carries a marker", because a legal
    // position written as though it were settled is the one thing a policy must not
    // do. Once the owner answers, that rule inverts: a text with no markers has to
    // say who decided it. Either state is honest; an undecided text with no marker is
    // the failure, and so is an answered text with nobody's name on the change.
    const rows = (await q(
      `select d.slug, v.body, v.change_note, public.policy_open_decisions(v.body) as open
         from public.policy_documents d
         join public.policy_versions v on v.document_id = d.id
        where v.status = 'draft'`)).rows;

    for (const row of rows) {
      if (row.open > 0) continue;
      assert(/owner answered the decisions/i.test(row.change_note ?? ''),
        `${row.slug} has no [OWNER DECISION] marker and no record of who decided — somebody wrote a legal position as if it were settled`);
    }
    // The marker machinery itself must still be exercised. Since 2026-10-28 no
    // planted document carries an open question, so the counter is proved on a
    // text that does — otherwise a broken counter and a fully answered register
    // would look exactly the same.
    const counted = await scalar(
      `select public.policy_open_decisions($1) as n`,
      ['One thing. [OWNER DECISION: a question.] Another. [OWNER DECISION: another.]']);
    eq(counted.n, 2, 'the open-decision counter');
    eq(await scalar(`select public.policy_open_decisions('nothing here') as n`).then((r) => r.n),
      0, 'a clean text counts zero');
  });

  await test('a draft with an open decision cannot be put in force', async () => {
    // Every seeded draft is answered now, so the guard is proved on a text written
    // here with one question still in it — and rolled back, because a draft left
    // behind would be a document nobody meant to write.
    const takedown = await draftOf('takedown');
    await whileRolledBack(admin, async () => {
      const saved = (await q('select public.save_policy_draft($1,$2,$3) as r',
        ['takedown',
         `${takedown.body}\n\n[OWNER DECISION: who decides an appeal against a takedown.]`,
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

      // The refusal left everything where it was: still a draft, still not live.
      const after = (await q('select status from public.policy_versions where id = $1',
        [saved.id])).rows[0];
      eq(after.status, 'draft', 'the refused version');
    });

    // And the seeded register is untouched by any of it.
    const live = await scalar(
      `select count(*)::int n from public.policy_versions v
         join public.policy_documents d on d.id = v.document_id
        where d.slug = 'takedown' and v.status = 'in_force'`);
    eq(live.n, 0, 'a refused approval produced a live version');
  });

  await test('a decision needs a written reason, and only the owner may give one', async () => {
    const draft = await draftOf('terms');
    await rejects(
      () => call(admin, 'approve_policy_version($1,$2,$3)', [draft.id, '2026-11-01', '  ']),
      /reason_required/);
    await rejects(
      () => call(governance, 'approve_policy_version($1,$2,$3)',
        [draft.id, '2026-11-01', 'Governance thinks it is fine.']),
      /not_allowed/);
    await rejects(
      () => call(learner, 'approve_policy_version($1,$2,$3)', [draft.id, '2026-11-01', 'Mine now.']),
      /not_allowed/);
  });

  await test('written out in full, the terms can be put in force', async () => {
    const body = await cleanBody('terms');
    const saved = await call(admin, 'save_policy_draft($1,$2,$3)',
      ['terms', body, 'The owner answered the open questions.']);
    eq(saved.openDecisions, 0, 'the new draft still has open decisions');
    eq(saved.versionNumber, 2, 'a new draft is a new version');

    const out = await call(admin, 'approve_policy_version($1,$2,$3)',
      [saved.id, '2026-11-01', 'Reviewed against the code and approved.']);
    eq(out.status, 'in_force', 'the approval');
    eq(out.versionNumber, 2, 'which version went live');

    const live = await liveOf('terms');
    eq(live.version_number, 2, 'the live version');
    eq(live.approved_by, admin, 'who approved it');
    eq(live.approval_reason, 'Reviewed against the code and approved.', 'the written reason');
    // A `date` comes back as a Date object from this driver, not as a string.
    eq(new Date(live.effective_at).toISOString().slice(0, 10), '2026-11-01', 'the effective date');

    // Version 1 was never in force, so it is still a draft — the history says
    // exactly that rather than pretending it was replaced.
    const first = await scalar(
      `select status from public.policy_versions v join public.policy_documents d on d.id = v.document_id
        where d.slug = 'terms' and v.version_number = 1`);
    eq(first.status, 'draft', 'the unauthorised first draft');
  });

  await test('a policy in force is readable by a visitor who has no account', async () => {
    const list = await asAnon(() => q('select public.policies_in_force() as r')).then(
      (res) => res.rows[0].r);
    assert(list.some((row) => row.slug === 'terms'), 'the live terms are not listed');

    const page = await asAnon(() => q(`select public.policy_page('terms') as r`)).then(
      (res) => res.rows[0].r);
    eq(page.versionNumber, 2, 'the version a visitor reads');
    assert(page.body.includes('Terms of use') === false, 'the body should be the text, not the title');
    assert(page.body.length > 500, 'the body is suspiciously short');

    // A draft is not readable by a visitor, and a slug nobody has approved
    // answers with nothing rather than with the draft.
    eq(await asAnon(() => q(`select public.policy_page('takedown') as r`)).then(
      (res) => res.rows[0].r), null, 'a draft leaked to a visitor');
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

    // The approval reason is not part of the text either: changing the record of
    // who agreed is not the same as changing what they agreed to.
    const unchanged = await scalar('select body from public.policy_versions where id = $1', [live.id]);
    eq(unchanged.body, live.body, 'the body after a refused edit');
  });

  await test('accepting records a version and a time, and doing it twice changes nothing', async () => {
    const before = await call(learner, 'my_policy_standing()');
    eq(before.outstanding, 1, 'documents awaiting acceptance before any is given');
    eq(before.acceptanceRequired.length, 1,
      'only a live document can be outstanding — the teacher terms are still a draft');

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
    eq(rows.rows[0].n, 1, 'acceptance rows');

    const after = await call(learner, 'my_policy_standing()');
    eq(after.outstanding, 0, 'nothing is outstanding once the only live document is accepted');
    assert(after.history.some((row) => row.slug === 'terms'), 'the history does not list the acceptance');

    // A document that is not in force cannot be accepted, and a slug nobody has
    // published is not a typo to be forgiven.
    await rejects(() => call(learner, 'accept_policy($1)', ['takedown']), /not_in_force/);
    await rejects(() => call(learner, 'accept_policy($1)', ['no-such-policy']), /not_found/);
  });

  await test('a new version is a fresh agreement, and the old one keeps its signature', async () => {
    const v2 = await liveOf('terms');
    const body = `${v2.body}\n\n## A correction\n\nOne sentence was ambiguous and has been rewritten.`;
    const saved = await call(admin, 'save_policy_draft($1,$2,$3)',
      ['terms', body, 'Clarifying one sentence.']);
    await call(admin, 'approve_policy_version($1,$2,$3)',
      [saved.id, '2026-12-01', 'Clarification approved.']);

    const old = await scalar('select status from public.policy_versions where id = $1', [v2.id]);
    eq(old.status, 'retired', 'the version it replaced');

    // The acceptance of version 2 still exists — a retired version is history.
    const kept = await q(
      'select count(*)::int n from public.policy_acceptances where policy_version_id = $1', [v2.id]);
    eq(kept.rows[0].n, 1, 'the acceptance of a retired version');

    // And the account is asked again, for the new text.
    const standing = await call(learner, 'my_policy_standing()');
    const terms = standing.acceptanceRequired.find((row) => row.slug === 'terms');
    eq(terms.versionNumber, 3, 'the version now live');
    eq(terms.acceptedAt, null, 'acceptance of a version nobody has read');
  });

  await test('the register is staff work; the text is the owner’s', async () => {
    await rejects(() => call(learner, 'policy_register()'), /not_allowed/);

    const board = await call(governance, 'policy_register()');
    assert(board.documents.length >= 7, 'governance cannot see the register');
    eq(board.counts.openDecisions, 0, 'the open decisions counted after the owner answered');
    // Governance reads; it does not write. The refusal is the same one the
    // approval test makes, checked here on the other writer.
    await rejects(
      () => call(governance, 'save_policy_draft($1,$2,$3)',
        ['terms', 'x'.repeat(400), 'Rewritten by governance.']),
      /not_allowed/);

    const owner = await call(admin, 'policy_register()');
    const terms = owner.documents.find((doc) => doc.slug === 'terms');
    eq(terms.live.versionNumber, 3, 'the live version on the register');
    eq(terms.acceptedAccounts, 0, 'accounts that accepted the current version');
    eq(terms.versions.length, 3, 'every version is listed');

    // The full body is a separate read, so the register stays small.
    const draft = await call(admin, 'policy_draft($1)', [terms.draft.id]);
    assert(draft.body.length > 200, 'the editor did not receive the text');
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
    // survives until somebody reads it. Every one of the seven is past that now:
    // the incident register was the last, and it names the three things still
    // missing (detection, delivery, a deadline) instead of claiming a blank page.
    for (const row of rows) {
      assert(!/Nothing exists/.test(row.preconditions),
        `${row.key} still says "Nothing exists"`);
    }
    assert(/incident register/i.test(of('platform.incident').preconditions),
      'incident response does not name the register that exists');
    assert(/detection/i.test(of('platform.incident').preconditions),
      'incident response does not say detection is missing');
    assert(/draft/i.test(of('platform.legal').preconditions), 'legal does not mention the drafts');
    assert(/screening/i.test(of('platform.safeguarding').preconditions),
      'safeguarding does not name the screening gap');
  });
}
