// Agreeing to a policy names the version that was read.
//
// accept_policy(slug) records whatever is in force at the instant it runs, so
// a page left open while the owner publishes records an agreement to a text
// nobody showed its reader. accept_policy(slug, version) takes the number the
// reader was shown and refuses when that is not the one in force.
//
// This suite publishes a new version of a real document, which the suites
// after it would then find. So everything it does to the documents happens in
// one transaction that is undone at the end; each call is a savepoint, so a
// refusal undoes only itself.

export async function run(ctx) {
  const { q, test, assert, rejects, bootstrapAdmin, newUser, newProfile } = ctx;

  const admin = await bootstrapAdmin('shown-admin@example.com');
  async function account(email, name) {
    const id = await newUser(email);
    await newProfile(id, name);
    return id;
  }
  const early = await account('shown-early@example.com', 'Read It Early');
  const late = await account('shown-late@example.com', 'Left The Page Open');

  let step = 0;
  async function asActor(actor, sql, params = []) {
    const point = `shown_${step += 1}`;
    await q(`savepoint ${point}`);
    await q(`select set_config('request.jwt.claims',$1,true)`,
      [JSON.stringify(actor ? { sub: actor, role: 'authenticated' } : { role: 'authenticated' })]);
    await q('set local role authenticated');
    try {
      const result = await q(sql, params);
      await q('reset role');
      await q(`release savepoint ${point}`);
      return result;
    } catch (e) {
      // Undoes the role as well: it was set after the savepoint.
      await q(`rollback to savepoint ${point}`);
      throw e;
    }
  }
  const scalar = async (sql, params = []) => (await q(sql, params)).rows[0];
  const call = async (actor, fn, params = []) =>
    (await asActor(actor, `select public.${fn} as r`, params)).rows[0].r;
  const eq = (actual, expected, what) =>
    assert(actual === expected, `${what}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);

  const SLUG = 'privacy';
  const liveOf = async () => scalar(
    `select v.* from public.policy_versions v join public.policy_documents d on d.id = v.document_id
      where d.slug = $1 and v.status = 'in_force'`, [SLUG]);
  const agreements = async (userId) => (await q(
    `select v.version_number n from public.policy_acceptances a
       join public.policy_versions v on v.id = a.policy_version_id
       join public.policy_documents d on d.id = v.document_id
      where a.user_id = $1 and d.slug = $2 order by v.version_number`, [userId, SLUG])).rows.map((r) => r.n);
  const audited = async (userId) => (await scalar(
    `select count(*)::int n from public.governance_audit_events where actor = $1 and action = 'policy.accepted'`, [userId])).n;

  console.log('\nThe version that was read');

  const first = await liveOf();
  assert(first, 'the privacy notice has no version in force, so this suite is reading the wrong thing');
  const N = first.version_number;

  await q('begin');
  try {

  await test('agreeing to the version that was shown records it, once', async () => {
    const done = await call(early, 'accept_policy($1,$2)', [SLUG, N]);
    eq(done.versionNumber, N, 'the version recorded');
    eq(done.already, false, 'the first agreement');
    eq(done.slug, SLUG, 'the document');
    const again = await call(early, 'accept_policy($1,$2)', [SLUG, N]);
    eq(again.already, true, 'a second press');
    eq(again.acceptedAt, done.acceptedAt, 'the time of the first');
    assert((await agreements(early)).join() === String(N), `agreements were ${await agreements(early)}`);
    eq(await audited(early), 1, 'audit events for one agreement');
  });

  await test('a number is compared, not looked up: one that is not in force records nothing', async () => {
    for (const wrong of [N + 1, N - 1 > 0 ? N - 1 : N + 2, 0, -1, 1000000]) {
      if (wrong === N) continue;
      await rejects(() => call(late, 'accept_policy($1,$2)', [SLUG, wrong]), /policy:changed/, `version ${wrong} was accepted`);
    }
    assert((await agreements(late)).length === 0, 'an agreement was recorded for a version that is not in force');
    eq(await audited(late), 0, 'audit events for a refusal');
  });

  // The owner publishes while `late` still has the old text on the screen.
  const body = `${first.body}\n\n## A correction\n\nOne sentence was unclear and has been rewritten.`;
  const saved = await call(admin, 'save_policy_draft($1,$2,$3)', [SLUG, body, 'Clarifying one sentence.']);
  await call(admin, 'approve_policy_version($1,$2,$3)', [saved.id, '2026-11-24', 'Reviewed and approved.']);
  const second = await liveOf();
  // The number the new version was given. Not always N + 1: a draft the owner
  // has not published (20261281160000) holds a number of its own.
  const NEXT = saved.versionNumber;

  await test('a page left open while a new version is published records nothing when its button is pressed', async () => {
    eq(second.version_number, NEXT, 'the version now in force');
    await rejects(() => call(late, 'accept_policy($1,$2)', [SLUG, N]), /policy:changed/, 'the old number was accepted after a new version');
    assert((await agreements(late)).length === 0, `agreements were ${await agreements(late)}`);
    eq(await audited(late), 0, 'audit events for a refusal');
    // Nothing was written against the retired version either.
    eq((await scalar('select count(*)::int n from public.policy_acceptances where policy_version_id = $1 and user_id = $2',
      [first.id, late])).n, 0, 'agreements to the retired version');
  });

  await test('the same reader, shown the new version, agrees to that one', async () => {
    const done = await call(late, 'accept_policy($1,$2)', [SLUG, NEXT]);
    eq(done.versionNumber, NEXT, 'the version recorded');
    eq(done.already, false, 'the first agreement');
    assert((await agreements(late)).join() === String(NEXT), `agreements were ${await agreements(late)}`);
    eq(await audited(late), 1, 'audit events for one agreement');
  });

  await test('an earlier agreement is kept, and its reader is asked again for the new text', async () => {
    assert((await agreements(early)).join() === String(N), `agreements were ${await agreements(early)}`);
    const standing = await call(early, 'my_policy_standing()');
    const row = standing.acceptanceRequired.find((r) => r.slug === SLUG);
    eq(row.versionNumber, NEXT, 'the version asked for');
    eq(row.acceptedAt, null, 'agreement to a version not yet read');
    // Which is how a page knows this is a change and not a first reading.
    assert(standing.history.some((h) => h.slug === SLUG && h.versionNumber === N), 'the earlier agreement is not in the history');
    // Naming the retired number cannot bring it back.
    await rejects(() => call(early, 'accept_policy($1,$2)', [SLUG, N]), /policy:changed/, 'a retired version was agreed to again');
  });

  await test('what is refused before anything is compared', async () => {
    await rejects(() => call(late, 'accept_policy($1,$2)', [SLUG, null]), /policy:version_required/, 'no version was accepted');
    await rejects(() => call(late, 'accept_policy($1,$2)', ['no-such-policy', 1]), /policy:not_found/, 'a document nobody published');
    await rejects(() => call(null, 'accept_policy($1,$2)', [SLUG, NEXT]), /policy:not_signed_in/, 'nobody agreed');
    // The slug is read the way the first function reads it.
    const done = await call(late, 'accept_policy($1,$2)', [`  ${SLUG.toUpperCase()} `, NEXT]);
    eq(done.already, true, 'the same document, typed loosely');
  });

  await test('a visitor cannot call it, and the first function is as it was', async () => {
    const may = async (role) => (await scalar(
      `select has_function_privilege($1, 'public.accept_policy(text,integer)', 'execute') as may`, [role])).may;
    eq(await may('anon'), false, 'anon');
    eq(await may('authenticated'), true, 'authenticated');
    eq((await scalar(`select count(*)::int n from pg_proc p join pg_namespace s on s.oid = p.pronamespace
                       where s.nspname = 'public' and p.proname = 'accept_policy'`)).n, 2, 'functions called accept_policy');
    // By slug alone it still records whatever is in force, and compares nothing.
    const other = await account('shown-other@example.com', 'By Slug Alone');
    const done = await call(other, 'accept_policy($1)', [SLUG]);
    eq(done.versionNumber, NEXT, 'the version in force');
  });
  } finally {
    await q('rollback');
  }

  await test('the documents are left as they were found', async () => {
    const now = await liveOf();
    eq(now.id, first.id, 'the version in force after this suite');
    eq((await scalar(`select count(*)::int n from public.policy_acceptances where user_id = any($1::uuid[])`, [[early, late]])).n, 0,
      'agreements left behind');
  });
}
