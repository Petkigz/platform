// Nobody writes on a discussion board before agreeing to the terms and the
// privacy notice in force (20261281157000, the owner's answer of 2026-11-26).
//
// Everything here happens inside one transaction that is rolled back, because
// one test publishes a new version of the privacy notice and no other suite
// should find it in force.

export async function run(ctx) {
  const { q, test, assert, rejects, bootstrapAdmin, newUser, newProfile, newInstructor, newCourse, grantRole } = ctx;

  const admin = await bootstrapAdmin('agree-admin@example.com');
  const teacher = await newInstructor('agree-teacher@example.com', admin);
  const course = await newCourse(teacher, { status: 'active', title: 'Agreement Course' });
  const governance = await newUser('agree-governance@example.com');
  await newProfile(governance, 'Agree Governance');
  await grantRole(governance, 'governance_admin', admin);

  let seq = 0;
  async function student(name) {
    seq += 1;
    const userId = await newUser(`agree-student-${seq}@example.com`);
    await newProfile(userId, name);
    const learnerId = (await q(
      `insert into public.learner_profiles (display_name, learner_type, age_band, linked_user_id)
       values ($1,'adult','18+',$2) returning id`, [name, userId])).rows[0].id;
    await q(
      `insert into public.entitlement_grants (learner_profile_id, scope_type, course_id, source_type)
       values ($1,'course',$2,'purchase')`, [learnerId, course]);
    return userId;
  }

  let step = 0;
  async function asActor(actor, sql, params = []) {
    const point = `agree_${step += 1}`;
    await q(`savepoint ${point}`);
    await q(`select set_config('request.jwt.claims',$1,true)`, [JSON.stringify({ sub: actor, role: 'authenticated' })]);
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
  const call = async (actor, fn, params = []) => (await asActor(actor, `select public.${fn} as r`, params)).rows[0].r;

  const mine = (actor, board = 'students') => call(actor, 'my_board($1)', [board]);
  const name = (actor, handle, board = 'students') => call(actor, 'set_board_handle($1,$2)', [board, handle]);
  const start = (actor, title, body, board = 'students') => call(actor, 'post_board_thread($1,$2,$3)', [board, title, body]);
  const reply = (actor, thread, body) => call(actor, 'post_board_reply($1,$2)', [thread, body]);
  const list = (actor, board = 'students') => call(actor, 'board_threads_page($1)', [board]);
  const open = (actor, thread) => call(actor, 'board_thread($1)', [thread]);
  const agreeTo = (actor, slug, version) => call(actor, 'accept_policy($1,$2)', [slug, version]);
  const agreeAll = async (actor) => {
    for (const owed of (await mine(actor)).agreements) await agreeTo(actor, owed.slug, owed.versionNumber);
  };
  const inForce = async (slug) => (await q(
    `select v.version_number n, v.body from public.policy_versions v
       join public.policy_documents d on d.id = v.document_id
      where d.slug = $1 and v.status = 'in_force'`, [slug])).rows[0];

  console.log('\nAgreeing before writing on a board');

  await q('begin');
  try {
    await q(`update public.platform_settings set value_text = 'true'
              where key in ('community.student_board','community.teacher_board')`);
    const terms = await inForce('terms');
    const privacy = await inForce('privacy');
    assert(terms && privacy, 'the terms or the privacy notice has no version in force, so this suite is reading the wrong thing');

    await test('an account that has agreed to nothing is told which two documents, and their versions', async () => {
      const person = await student('Agreed To Nothing');
      const said = await mine(person);
      assert(said.kind === 'student' && said.open === true, JSON.stringify(said));
      assert(JSON.stringify(said.agreements) === JSON.stringify([
        { slug: 'terms', title: 'Terms of use', versionNumber: terms.n },
        { slug: 'privacy', title: 'Privacy notice', versionNumber: privacy.n },
      ]), `owed: ${JSON.stringify(said.agreements)}`);
    });

    await test('without agreeing it reads, and reports, and cannot choose a username or write', async () => {
      const writer = await student('Already Here');
      await agreeAll(writer);
      await name(writer, 'already_here');
      const made = await start(writer, 'A thread to read', 'Words somebody agreed before writing.');

      const person = await student('Reads Only');
      assert((await list(person)).threads.some((t) => t.id === made.threadId), 'a member who has not agreed could not read the board');
      assert((await open(person, made.threadId)).thread.body.includes('agreed before writing'), 'a member who has not agreed could not open a thread');
      await rejects(() => name(person, 'reads_only'), /^board:agree_first$/);
      await rejects(() => start(person, 'I have not agreed', 'body'), /^board:agree_first$/);
      await rejects(() => reply(person, made.threadId, 'nor here'), /^board:agree_first$/);
      // A report is how somebody is protected. A document does not stand in its way.
      assert((await call(person, 'report_board_post($1,$2,$3)', [made.threadId, null, 'This should be looked at.'])).reported === true);
      assert((await q(`select count(*)::int n from public.board_handles where user_id = $1`, [person])).rows[0].n === 0, 'a username was made without agreement');
    });

    await test('one of the two is not enough; both recorded opens the box to write in', async () => {
      const person = await student('One Then Both');
      await agreeTo(person, 'terms', terms.n);
      const half = await mine(person);
      assert(half.agreements.length === 1 && half.agreements[0].slug === 'privacy', JSON.stringify(half.agreements));
      await rejects(() => name(person, 'one_then_both'), /^board:agree_first$/);
      await agreeTo(person, 'privacy', privacy.n);
      assert((await mine(person)).agreements.length === 0, 'something was still owed after both were agreed to');
      assert((await name(person, 'one_then_both')).handle === 'one_then_both');
      const made = await start(person, 'Now I may write', 'body');
      await reply(person, made.threadId, 'and reply');
      // Each agreement is a row and an audit event, written by accept_policy() and by nothing here.
      const rows = (await q(
        `select d.slug, v.version_number n from public.policy_acceptances a
           join public.policy_versions v on v.id = a.policy_version_id
           join public.policy_documents d on d.id = v.document_id
          where a.user_id = $1 order by d.sort_order`, [person])).rows;
      assert(JSON.stringify(rows) === JSON.stringify([{ slug: 'terms', n: terms.n }, { slug: 'privacy', n: privacy.n }]), JSON.stringify(rows));
      const audit = (await q(`select count(*)::int n from public.governance_audit_events where actor = $1 and action = 'policy.accepted'`, [person])).rows[0].n;
      assert(audit === 2, `audit events: ${audit}`);
    });

    await test('a document that asks for no agreement here is not asked for', async () => {
      // The terms for teachers ask for agreement elsewhere. The teachers' board asks for the same two as the students'.
      const said = await mine(teacher, 'teachers');
      assert(said.kind === 'teacher', JSON.stringify(said));
      assert(JSON.stringify(said.agreements.map((a) => a.slug)) === JSON.stringify(['terms', 'privacy']), JSON.stringify(said.agreements));
      await rejects(() => name(teacher, 'a_teacher', 'teachers'), /^board:agree_first$/);
      await agreeAll(teacher);
      // agreeAll read the students' board; the two documents are the same ones.
      assert((await mine(teacher, 'teachers')).agreements.length === 0);
      assert((await name(teacher, 'a_teacher', 'teachers')).handle === 'a_teacher');
    });

    await test('staff moderate without agreeing, and agree before they write', async () => {
      const writer = await student('Reported Writer');
      const reporter = await student('The Reporter');
      await agreeAll(writer); await agreeAll(reporter);
      await name(writer, 'reported_writer'); await name(reporter, 'the_reporter');
      const made = await start(writer, 'A thread to moderate', 'body');
      const bad = await reply(writer, made.threadId, 'something unkind');
      await call(reporter, 'report_board_post($1,$2,$3)', [made.threadId, bad.replyId, 'Unkind.']);

      for (const person of [admin, governance]) {
        const said = await mine(person);
        assert(said.kind === 'staff' && said.moderator === true && said.agreements.length === 2, JSON.stringify(said));
        assert((await call(person, 'board_report_queue()', [])).reports.some((r) => r.replyId === bad.replyId), 'staff who have not agreed cannot read the queue');
        await rejects(() => name(person, person === admin ? 'the_owner' : 'the_governor'), /^board:agree_first$/);
      }
      const done = await call(governance, 'moderate_board_post($1,$2,$3,$4)', [made.threadId, bad.replyId, true, 'Unkind to a learner.']);
      assert(done.removed === true, 'governance that has not agreed could not take a post down');
      await agreeAll(admin);
      await name(admin, 'the_owner');
      await reply(admin, made.threadId, 'Thank you for reporting it.');
    });

    await test('when a new version is published, an account that agreed to the old one is asked again before it writes', async () => {
      const person = await student('Agreed To The Old One');
      const other = await student('Arrives Later');
      await agreeAll(person);
      await name(person, 'old_agreement');
      const made = await start(person, 'Written under the old notice', 'body');

      const draft = await call(admin, 'save_policy_draft($1,$2,$3)', ['privacy',
        `${privacy.body}\n\n## The discussion boards\n\nA sentence about the boards, for this test.`, 'Says what the boards keep.']);
      await call(admin, 'approve_policy_version($1,$2,$3)', [draft.id, '2026-11-26', 'Reviewed and approved.']);
      const now = await inForce('privacy');
      assert(now.n === privacy.n + 1, `the version in force is ${now.n}`);

      const said = await mine(person);
      assert(JSON.stringify(said.agreements) === JSON.stringify([{ slug: 'privacy', title: 'Privacy notice', versionNumber: now.n }]),
        `owed after a new version: ${JSON.stringify(said.agreements)}`);
      // The username stays theirs and what they wrote stays up.
      assert(said.handle === 'old_agreement' && said.handleFixed === true);
      assert((await open(other, made.threadId)).thread.state === 'visible');
      await rejects(() => start(person, 'Before agreeing again', 'body'), /^board:agree_first$/);
      await rejects(() => reply(person, made.threadId, 'nor a reply'), /^board:agree_first$/);
      // The number they were shown before is no longer the one in force.
      await rejects(() => agreeTo(person, 'privacy', privacy.n), /policy:changed/);
      await agreeTo(person, 'privacy', now.n);
      assert((await mine(person)).agreements.length === 0);
      await reply(person, made.threadId, 'After agreeing to the new one.');
      // And their own post can still be taken back, as it could before they agreed again.
      await call(person, 'withdraw_board_post($1,$2)', [made.threadId, null]);
      assert((await open(person, made.threadId)).thread.state === 'withdrawn');

      // Somebody new is asked for the terms and the new notice, never the old.
      const fresh = (await mine(other)).agreements;
      assert(JSON.stringify(fresh.map((a) => [a.slug, a.versionNumber])) === JSON.stringify([['terms', terms.n], ['privacy', now.n]]), JSON.stringify(fresh));
    });

    await test('the list of what is owed cannot be asked for from outside', async () => {
      const held = (await q(
        `select has_function_privilege('anon', 'public.board_agreements_owed(uuid)', 'execute') as anon,
                has_function_privilege('authenticated', 'public.board_agreements_owed(uuid)', 'execute') as signed_in,
                has_function_privilege('authenticated', 'public.board_writer(uuid,text)', 'execute') as writer,
                has_function_privilege('anon', 'public.my_board(text)', 'execute') as my_anon,
                has_function_privilege('authenticated', 'public.my_board(text)', 'execute') as my_in,
                has_function_privilege('anon', 'public.set_board_handle(text,text)', 'execute') as set_anon,
                has_function_privilege('authenticated', 'public.set_board_handle(text,text)', 'execute') as set_in`)).rows[0];
      assert(JSON.stringify(held) === JSON.stringify({ anon: false, signed_in: false, writer: false, my_anon: false, my_in: true, set_anon: false, set_in: true }),
        JSON.stringify(held));
    });
  } finally {
    await q('rollback');
  }

  await test('both switches say it, and say what the notice does not', async () => {
    const rows = (await q(`select key, preconditions from public.platform_settings where key like 'community.%' order by key`)).rows;
    assert(rows.length === 2);
    for (const row of rows) {
      assert(/has agreed to the Terms of use and the Privacy notice in force/.test(row.preconditions), `${row.key} does not say agreement comes first`);
      assert(/does not mention the boards/.test(row.preconditions), `${row.key} does not say the notice is silent about the boards`);
    }
  });
}
