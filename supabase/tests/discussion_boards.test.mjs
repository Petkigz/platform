// Two discussion boards (20261281153000_discussion_boards.sql).
//
// What this suite holds: who is let in and for how long, that nothing a
// member can call or read gives away the account behind a username, that the
// one function which does is staff-only, needs a reason and is audited, and
// that a post is shown at once and can be taken back, reported and taken
// down.

export async function run(ctx) {
  const { q, test, assert, rejects, bootstrapAdmin, newUser, newProfile, newInstructor, newCourse, grantRole, verifyGuardian } = ctx;

  const admin = await bootstrapAdmin('boards-admin@example.com');
  const teacher = await newInstructor('boards-teacher@example.com', admin);
  const otherTeacher = await newInstructor('boards-teacher-2@example.com', admin);
  const support = await newUser('boards-support@example.com');
  await newProfile(support, 'Boards Support');
  await grantRole(support, 'support_agent', admin);
  const course = await newCourse(teacher, { status: 'active', title: 'Boards Course' });

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
  const call = (actor, sql, params) => asActor(actor, `select ${sql} as r`, params).then((res) => res.rows[0].r);

  let seq = 0;
  // An account that is a learner, with one grant.
  async function student(name, source = 'purchase', over = {}) {
    seq += 1;
    const userId = await newUser(`boards-student-${seq}@example.com`);
    await newProfile(userId, name);
    const learnerId = (await q(
      `insert into public.learner_profiles (display_name, learner_type, age_band, linked_user_id)
       values ($1,$2,$3,$4) returning id`,
      [name, over.child ? 'child' : 'adult', over.child ? '11-13' : '18+', userId])).rows[0].id;
    let grantId = null;
    if (source) {
      grantId = (await q(
        `insert into public.entitlement_grants (learner_profile_id, scope_type, course_id, source_type, effective_until)
         values ($1,'course',$2,$3,$4) returning id`,
        [learnerId, course, source, over.until ?? null])).rows[0].id;
    }
    return { userId, learnerId, grantId, name };
  }

  const flags = (students, teachers) => q(
    `update public.platform_settings set value_text = case key
        when 'community.student_board' then $1 when 'community.teacher_board' then $2 end
      where key in ('community.student_board','community.teacher_board')`,
    [students ? 'true' : 'false', teachers ? 'true' : 'false']);

  const mine = (actor, board) => call(actor, 'public.my_board($1)', [board]);
  const name = (actor, board, handle) => call(actor, 'public.set_board_handle($1,$2)', [board, handle]);
  const start = (actor, board, title, body) => call(actor, 'public.post_board_thread($1,$2,$3)', [board, title, body]);
  const reply = (actor, thread, body) => call(actor, 'public.post_board_reply($1,$2)', [thread, body]);
  const list = (actor, board) => call(actor, 'public.board_threads_page($1)', [board]);
  const open = (actor, thread) => call(actor, 'public.board_thread($1)', [thread]);
  const report = (actor, thread, replyId, reason) => call(actor, 'public.report_board_post($1,$2,$3)', [thread, replyId, reason]);
  const takeBack = (actor, thread, replyId = null) => call(actor, 'public.withdraw_board_post($1,$2)', [thread, replyId]);
  const queue = (actor) => call(actor, 'public.board_report_queue()', []);
  const moderate = (actor, thread, replyId, remove, reason) => call(actor, 'public.moderate_board_post($1,$2,$3,$4)', [thread, replyId, remove, reason]);
  const author = (actor, thread, replyId, reason) => call(actor, 'public.board_author($1,$2,$3)', [thread, replyId, reason]);

  console.log('\nTwo discussion boards');

  await test('both boards ship off, and switched off they open for nobody but staff', async () => {
    const rows = (await q(`select key, value_text, gate_type from public.platform_settings where key like 'community.%' order by key`)).rows;
    assert(rows.length === 2 && rows.every((r) => r.value_text === 'false' && r.gate_type === 'admin_setup'),
      `the board switches are not both off: ${JSON.stringify(rows)}`);
    const paid = await student('Closed Board Student');
    const said = await mine(paid.userId, 'students');
    assert(said.open === false && said.kind === 'student', `a closed board did not say so: ${JSON.stringify(said)}`);
    await rejects(() => list(paid.userId, 'students'), /board:closed/);
    await rejects(() => name(paid.userId, 'students', 'quiet_owl'), /board:closed/);
    await rejects(() => list(teacher, 'teachers'), /board:closed/);
    // Staff can read a closed board, to clear what is in it.
    const seen = await list(admin, 'students');
    assert(Array.isArray(seen.threads), 'staff could not read a board that is switched off');
  });

  await flags(true, true);
  try {
    await test('a student is let in by a class somebody paid for, and by nothing else', async () => {
      for (const source of ['purchase', 'subscription', 'family_entitlement', 'scholarship', 'institution']) {
        const person = await student(`Paid by ${source}`, source);
        const said = await mine(person.userId, 'students');
        assert(said.kind === 'student' && said.open === true, `${source} did not open the board: ${JSON.stringify(said)}`);
        assert((await list(person.userId, 'students')).threads.length >= 0, `${source} could not read`);
      }
      for (const source of ['free', 'admin_grant', 'promotion', null]) {
        const person = await student(`Not paid ${source}`, source);
        const said = await mine(person.userId, 'students');
        assert(said.kind === null, `${source} opened the board: ${JSON.stringify(said)}`);
        await rejects(() => list(person.userId, 'students'), /board:not_allowed/);
        await rejects(() => name(person.userId, 'students', `free_${seq}`), /board:not_allowed/);
      }
      // A grant for a feature is not a class.
      const feature = await student('Feature Only', null);
      await q(`insert into public.entitlement_grants (learner_profile_id, scope_type, feature_code, source_type)
               values ($1,'feature','offline','subscription')`, [feature.learnerId]);
      assert((await mine(feature.userId, 'students')).kind === null, 'a feature grant opened the board');
    });

    await test('access ends when the paid class does, and says when it will', async () => {
      const until = new Date(Date.now() + 3 * 86400_000).toISOString();
      const person = await student('Plan Until', 'subscription', { until });
      let said = await mine(person.userId, 'students');
      assert(said.kind === 'student' && new Date(said.until).getTime() === new Date(until).getTime(),
        `the end of access was not said: ${JSON.stringify(said)}`);
      await name(person.userId, 'students', 'plan_until');
      const made = await start(person.userId, 'students', 'A question while I am in', 'Is this the right place to ask?');

      // The plan ends: revoked, as a refund does it.
      await q(`update public.entitlement_grants set status='revoked', revoked_at=now(), revocation_reason='test' where id=$1`, [person.grantId]);
      said = await mine(person.userId, 'students');
      assert(said.kind === null && said.handle === 'plan_until', `access outlived the plan: ${JSON.stringify(said)}`);
      await rejects(() => list(person.userId, 'students'), /board:not_allowed/);
      await rejects(() => open(person.userId, made.threadId), /board:not_allowed/);
      await rejects(() => reply(person.userId, made.threadId, 'still here?'), /board:not_allowed/);
      // What they wrote is still theirs to take back.
      assert((await takeBack(person.userId, made.threadId)).state === 'withdrawn', 'somebody out of the board could not take back their own thread');

      // Two grants: the later end is the one said, and one with no end means no end.
      const two = await student('Two Grants', 'purchase', { until: new Date(Date.now() + 86400_000).toISOString() });
      await q(`insert into public.entitlement_grants (learner_profile_id, scope_type, course_id, source_type, effective_until)
               values ($1,'course',$2,'subscription',$3)`, [two.learnerId, course, until]);
      assert(new Date((await mine(two.userId, 'students')).until).getTime() === new Date(until).getTime(), 'the later end was not the one said');
      await q(`insert into public.entitlement_grants (learner_profile_id, scope_type, course_id, source_type)
               values ($1,'course',$2,'institution')`, [two.learnerId, course]);
      assert((await mine(two.userId, 'students')).until === null, 'a class with no end still gave the board one');
    });

    await test('a child without a login gets in through the family account that looks after them; one who only pays does not', async () => {
      const parent = await newUser('boards-parent@example.com');
      await newProfile(parent, 'Boards Parent');
      const payer = await newUser('boards-payer@example.com');
      await newProfile(payer, 'Boards Payer');
      const family = (await q(`insert into public.families (name, created_by) values ('Boards Family',$1) returning id`, [parent])).rows[0].id;
      await q(`insert into public.family_memberships (family_id, user_id, membership_type, status, joined_at)
               values ($1,$2,'owner','active',now()) on conflict do nothing`, [family, parent]);
      await q(`insert into public.family_memberships (family_id, user_id, membership_type, status, joined_at)
               values ($1,$2,'billing_manager','active',now())`, [family, payer]);
      const kid = (await q(`insert into public.learner_profiles (display_name, learner_type, age_band, family_id) values ('Boards Kid','child','8-10',$1) returning id`, [family])).rows[0].id;

      // No paid class yet: the family account is not let in.
      assert((await mine(parent, 'students')).kind === null, 'a family with no paid class was let in');
      const grant = (await q(`insert into public.entitlement_grants (learner_profile_id, scope_type, course_id, source_type) values ($1,'course',$2,'purchase') returning id`, [kid, course])).rows[0].id;
      const said = await mine(parent, 'students');
      assert(said.kind === 'student', `the family account was not let in on the child's paid class: ${JSON.stringify(said)}`);
      await name(parent, 'students', 'small_reader');
      const made = await start(parent, 'students', 'A question from a child', 'How long should I practise?');
      assert((await list(parent, 'students')).threads.find((t) => t.id === made.threadId).kind === 'student');
      // Somebody who only pays for the family is not.
      assert((await mine(payer, 'students')).kind === null, 'a billing-only member was let in');
      await rejects(() => list(payer, 'students'), /board:not_allowed/);

      // Where guardian verification is enforced, the family account must be the child's verified guardian.
      await q(`update public.platform_settings set value_text = 'true' where key = 'family.guardian_verification'`);
      try {
        assert((await mine(parent, 'students')).kind === null, 'an unverified guardian was let in while verification is enforced');
        await rejects(() => list(parent, 'students'), /board:not_allowed/);
        await verifyGuardian(parent, kid);
        assert((await mine(parent, 'students')).kind === 'student', 'a verified guardian was not let in');
      } finally {
        await q(`update public.platform_settings set value_text = 'false' where key = 'family.guardian_verification'`);
      }

      // The child's class ends: the family account is out.
      await q(`update public.entitlement_grants set status='revoked', revoked_at=now(), revocation_reason='test' where id=$1`, [grant]);
      assert((await mine(parent, 'students')).kind === null, 'the family account stayed in after the child\'s class ended');

      // A learner with a login of their own is that login and no other: the family account is not let in on it.
      const grown = await student('Family Adult With Login', 'purchase');
      await q(`update public.learner_profiles set family_id = $2 where id = $1`, [grown.learnerId, family]);
      assert((await mine(grown.userId, 'students')).kind === 'student');
      assert((await mine(parent, 'students')).kind === null, 'a family account was let in on the class of a learner who has their own login');
      // A child with a login of their own gets in like an adult.
      const child = await student('Child With Login', 'family_entitlement', { child: true });
      assert((await mine(child.userId, 'students')).kind === 'student', 'a child with a login and a paid class was not let in');
    });

    await test('teachers are in both; the teachers\' board is for teachers and staff only', async () => {
      assert((await mine(teacher, 'students')).kind === 'teacher');
      assert((await mine(teacher, 'teachers')).kind === 'teacher');
      const paid = await student('Curious Student');
      assert((await mine(paid.userId, 'teachers')).kind === null, 'a student was let in to the teachers\' board');
      await rejects(() => list(paid.userId, 'teachers'), /board:not_allowed/);
      await rejects(() => name(paid.userId, 'teachers', 'not_a_teacher'), /board:not_allowed/);
      await rejects(() => start(paid.userId, 'teachers', 'Let me in please', 'x'), /board:not_allowed/);
      // Support is staff and is not let in: it is the owner and governance who moderate.
      assert((await mine(support, 'teachers')).kind === null && (await mine(support, 'students')).kind === null, 'support was let in');
      assert((await mine(admin, 'teachers')).kind === 'staff' && (await mine(admin, 'teachers')).moderator === true);
      // A teacher whose role is taken away is out at the next call.
      const leaving = await newInstructor('boards-teacher-leaving@example.com', admin);
      assert((await mine(leaving, 'teachers')).kind === 'teacher');
      await q(`update public.user_role_assignments set revoked_at = now(), revocation_reason = 'test' where user_id = $1`, [leaving]);
      assert((await mine(leaving, 'teachers')).kind === null, 'a teacher no longer appointed was still let in');
      await rejects(() => list(leaving, 'teachers'), /board:not_allowed/);
      await rejects(() => mine(teacher, 'staffroom'), /board:not_found/);
    });

    await test('a username: its shape, taken once, one for each board, fixed once written under', async () => {
      const a = await student('Handle A');
      const b = await student('Handle B');
      await rejects(() => start(a.userId, 'students', 'No name yet', 'x'), /board:no_handle/);
      for (const bad of ['ab', 'x'.repeat(25), 'two words', 'a@b', 'a.b.c', '<b>bold', 'semi;colon', 'tab\there', 'zero\u200bwidth', 'slash/name', 'dash-name', '']) {
        await rejects(() => name(a.userId, 'students', bad), /board:handle_shape/, JSON.stringify(bad));
      }
      for (const reserved of ['Admin', 'the_moderator', 'AyahSpring_help', 'Staff1', 'official_news', 'support_desk']) {
        await rejects(() => name(a.userId, 'students', reserved), /board:handle_reserved/, reserved);
      }
      assert((await name(a.userId, 'students', 'Quiet_Owl')).handle === 'Quiet_Owl');
      // Any script.
      assert((await name(b.userId, 'students', 'طالبة_علم')).handle === 'طالبة_علم');
      await name(b.userId, 'students', 'night_reader');
      // Taken, whatever the capitals.
      await rejects(() => name(b.userId, 'students', 'quiet_owl'), /board:handle_taken/);
      // Changed freely until something is written.
      assert((await name(a.userId, 'students', 'Quiet_Owl_2')).handle === 'Quiet_Owl_2');
      assert((await mine(a.userId, 'students')).handleFixed === false);
      await start(a.userId, 'students', 'First thread under a name', 'Hello.');
      assert((await mine(a.userId, 'students')).handleFixed === true);
      await rejects(() => name(a.userId, 'students', 'another_name'), /board:handle_fixed/);
      // Asking for the name already held is not a change.
      assert((await name(a.userId, 'students', 'Quiet_Owl_2')).handle === 'Quiet_Owl_2');
      // The same word on the other board is another name, and a teacher holds one on each.
      await name(teacher, 'students', 'ustadh_h');
      await name(teacher, 'teachers', 'night_reader');
      assert((await mine(teacher, 'students')).handle === 'ustadh_h' && (await mine(teacher, 'teachers')).handle === 'night_reader');
    });

    await test('a post is shown at once, with a username and a kind and no account', async () => {
      const asker = await student('Real Name Asker');
      const reader = await student('Real Name Reader');
      await name(asker.userId, 'students', 'shy_asker');
      await name(reader.userId, 'students', 'kind_reader');
      const made = await start(asker.userId, 'students', '  A hard question to ask  ', '  I have fallen behind and am ashamed to say so.  ');
      // No approval: the next person to look sees it.
      const seen = (await list(reader.userId, 'students')).threads.find((t) => t.id === made.threadId);
      assert(seen && seen.title === 'A hard question to ask' && seen.handle === 'shy_asker' && seen.kind === 'student' && seen.mine === false && seen.replies === 0,
        `the thread was not listed as written: ${JSON.stringify(seen)}`);
      assert((await list(asker.userId, 'students')).threads.find((t) => t.id === made.threadId).mine === true);

      const answered = await reply(teacher, made.threadId, 'Many do. Start with one page a day.');
      await reply(reader.userId, made.threadId, 'I was there last year.');
      const whole = await open(reader.userId, made.threadId);
      assert(whole.thread.body === 'I have fallen behind and am ashamed to say so.' && whole.thread.handle === 'shy_asker');
      assert(whole.replies.length === 2 && whole.replies[0].kind === 'teacher' && whole.replies[0].handle === 'ustadh_h' && whole.replies[1].mine === true,
        `the replies were not as written: ${JSON.stringify(whole.replies)}`);
      assert((await list(reader.userId, 'students')).threads.find((t) => t.id === made.threadId).replies === 2);

      // Nothing a member is handed names an account, a learner or a person.
      const everything = JSON.stringify([await list(reader.userId, 'students'), whole, await mine(reader.userId, 'students'), answered]);
      for (const secret of [asker.userId, asker.learnerId, 'Real Name Asker', 'boards-student', teacher, 'boards-teacher', 'userId', 'user_id', 'email']) {
        assert(!everything.includes(secret), `a member was handed ${secret}`);
      }
      // …and the tables themselves are closed to the API roles.
      for (const table of ['board_handles', 'board_threads', 'board_replies', 'board_reports']) {
        await rejects(() => asActor(reader.userId, `select * from public.${table} limit 1`), /permission denied/, table);
        for (const role of ['anon', 'authenticated']) {
          const held = (await q(`select count(*)::int n from information_schema.role_table_grants where table_schema='public' and table_name=$1 and grantee=$2`, [table, role])).rows[0].n;
          assert(held === 0, `${role} holds ${held} privileges on ${table}`);
        }
        const policies = (await q(`select count(*)::int n from pg_policies where schemaname='public' and tablename=$1`, [table])).rows[0].n;
        const rls = (await q(`select relrowsecurity from pg_class where oid = ('public.' || $1)::regclass`, [table])).rows[0].relrowsecurity;
        assert(policies === 0 && rls === true, `${table}: ${policies} policies, row security ${rls}`);
      }
    });

    await test('what is written is held to its limits, and to a number in a day', async () => {
      const writer = await student('Limit Writer');
      await name(writer.userId, 'students', 'limit_writer');
      await rejects(() => start(writer.userId, 'students', 'abc', 'body'), /board:title_length/);
      await rejects(() => start(writer.userId, 'students', 'x'.repeat(141), 'body'), /board:title_length/);
      await rejects(() => start(writer.userId, 'students', 'A fine title', '   '), /board:body_length/);
      await rejects(() => start(writer.userId, 'students', 'A fine title', 'x'.repeat(6001)), /board:body_length/);
      let last;
      for (let i = 0; i < 5; i += 1) last = await start(writer.userId, 'students', `Thread number ${i}`, 'body');
      await rejects(() => start(writer.userId, 'students', 'A sixth today', 'body'), /board:too_many/);
      await rejects(() => reply(writer.userId, last.threadId, ''), /board:body_length/);
      await rejects(() => reply(writer.userId, '00000000-0000-4000-8000-000000000000', 'x'), /board:not_found/);
      // Yesterday's do not count.
      await q(`update public.board_threads set created_at = created_at - interval '25 hours'
                where handle_id = (select id from public.board_handles where handle = 'limit_writer')`);
      await start(writer.userId, 'students', 'A new day', 'body');
    });

    await test('the author takes a post back: it is gone for others and kept', async () => {
      const a = await student('Withdraw A');
      const b = await student('Withdraw B');
      await name(a.userId, 'students', 'withdraw_a');
      await name(b.userId, 'students', 'withdraw_b');
      const made = await start(a.userId, 'students', 'A thread to reply in', 'body');
      const r1 = await reply(b.userId, made.threadId, 'SECRET-WORDS I regret');
      await reply(a.userId, made.threadId, 'a later reply');
      await rejects(() => takeBack(a.userId, made.threadId, r1.replyId), /board:not_found/);
      assert((await takeBack(b.userId, made.threadId, r1.replyId)).state === 'withdrawn');
      const seen = await open(a.userId, made.threadId);
      assert(seen.replies.length === 2 && seen.replies[0].state === 'withdrawn' && seen.replies[0].body === undefined && seen.replies[0].handle === undefined,
        `a reply taken back still said something: ${JSON.stringify(seen.replies[0])}`);
      assert(!JSON.stringify(seen).includes('SECRET-WORDS'));
      // Its author still sees it, marked.
      assert((await open(b.userId, made.threadId)).replies[0].body === 'SECRET-WORDS I regret');
      assert((await list(a.userId, 'students')).threads.find((t) => t.id === made.threadId).replies === 1);
      // Twice is once.
      await takeBack(b.userId, made.threadId, r1.replyId);
      assert((await list(a.userId, 'students')).threads.find((t) => t.id === made.threadId).replies === 1);
      // The thread itself.
      await rejects(() => takeBack(b.userId, made.threadId), /board:not_found/);
      await takeBack(a.userId, made.threadId);
      assert(!(await list(b.userId, 'students')).threads.some((t) => t.id === made.threadId));
      await rejects(() => open(b.userId, made.threadId), /board:not_found/);
      await rejects(() => reply(b.userId, made.threadId, 'too late'), /board:not_found/);
      assert((await open(a.userId, made.threadId)).thread.state === 'withdrawn');
      assert((await q(`select count(*)::int n from public.board_replies where thread_id=$1`, [made.threadId])).rows[0].n === 2, 'taking back deleted something');
    });

    await test('a report reaches the owner; taking down hides the post and is audited', async () => {
      const rude = await student('Rude Writer');
      const hurt = await student('Hurt Reader');
      const also = await student('Also Hurt');
      await name(rude.userId, 'students', 'rude_writer');
      await name(hurt.userId, 'students', 'hurt_reader');
      await name(also.userId, 'students', 'also_hurt');
      const made = await start(hurt.userId, 'students', 'Asking about tajweed', 'How do I hold a madd?');
      const bad = await reply(rude.userId, made.threadId, 'SECRET-INSULT what a stupid question');

      await rejects(() => report(rude.userId, made.threadId, bad.replyId, 'my own post'), /board:own_post/);
      await rejects(() => report(hurt.userId, made.threadId, bad.replyId, 'no'), /board:reason_length/);
      await rejects(() => queue(hurt.userId), /board:not_allowed/);
      await rejects(() => queue(teacher), /board:not_allowed/);
      await rejects(() => queue(support), /board:not_allowed/);
      assert((await report(hurt.userId, made.threadId, bad.replyId, 'This is an insult.')).reported === true);
      await rejects(() => report(hurt.userId, made.threadId, bad.replyId, 'Again, an insult.'), /board:already_reported/);
      await report(also.userId, made.threadId, bad.replyId, 'Unkind to a beginner.');

      const waiting = (await queue(admin)).reports.filter((r) => r.threadId === made.threadId);
      assert(waiting.length === 1 && waiting[0].replyId === bad.replyId && waiting[0].reports === 2 && waiting[0].handle === 'rude_writer'
        && waiting[0].body.includes('SECRET-INSULT') && waiting[0].reasons.length === 2,
        `the queue did not hold the post once with both reports: ${JSON.stringify(waiting)}`);
      // The queue names no account: not the writer's and not a reporter's.
      const queued = JSON.stringify(waiting);
      for (const secret of [rude.userId, hurt.userId, also.userId, 'Rude Writer', 'Hurt Reader', 'boards-student']) {
        assert(!queued.includes(secret), `the queue names ${secret}`);
      }

      // Nobody but the owner and governance decides.
      for (const person of [teacher, hurt.userId, support]) {
        await rejects(() => moderate(person, made.threadId, bad.replyId, true, 'Insulting a learner.'), /board:not_allowed/);
      }
      await rejects(() => moderate(admin, made.threadId, bad.replyId, true, ' no '), /board:reason_required/);
      const done = await moderate(admin, made.threadId, bad.replyId, true, 'Insulting a learner.');
      assert(done.removed === true && done.reportsClosed === 2);
      const after = await open(hurt.userId, made.threadId);
      assert(after.replies[0].state === 'removed' && !JSON.stringify(after).includes('SECRET-INSULT'), 'a post taken down was still shown');
      assert((await queue(admin)).reports.every((r) => r.threadId !== made.threadId), 'a decided report is still waiting');
      const audit = (await q(`select actor, detail from public.governance_audit_events where action='board.post_removed' and target_id=$1`, [bad.replyId])).rows;
      assert(audit.length === 1 && audit[0].actor === admin && audit[0].detail.reason === 'Insulting a learner.', 'taking a post down was not audited');
      // It can be reported again only as a new matter, and it is not there to report.
      await rejects(() => report(also.userId, made.threadId, bad.replyId, 'Still unkind.'), /board:not_found/);

      // A report that is not upheld: the post stays, the report closes.
      const fine = await reply(also.userId, made.threadId, 'Hold it for two counts.');
      await report(rude.userId, made.threadId, fine.replyId, 'I do not like it.');
      assert((await moderate(admin, made.threadId, fine.replyId, false, 'Nothing wrong with it.')).reportsClosed === 1);
      assert((await open(hurt.userId, made.threadId)).replies[1].state === 'visible');

      // A whole thread taken down is gone from the list.
      await report(also.userId, made.threadId, null, 'Reporting the thread itself.');
      await moderate(admin, made.threadId, null, true, 'Test of removing a thread.');
      assert(!(await list(also.userId, 'students')).threads.some((t) => t.id === made.threadId));
      await rejects(() => open(also.userId, made.threadId), /board:not_found/);
    });

    await test('a blocked username reads and cannot write', async () => {
      const person = await student('Blocked Writer');
      await name(person.userId, 'students', 'blocked_writer');
      const made = await start(person.userId, 'students', 'Before the block', 'body');
      const handleId = (await q(`select id from public.board_handles where handle='blocked_writer'`)).rows[0].id;
      await rejects(() => call(teacher, 'public.block_board_handle($1,$2,$3)', [handleId, true, 'Not mine to do.']), /board:not_allowed/);
      await rejects(() => call(admin, 'public.block_board_handle($1,$2,$3)', [handleId, true, '']), /board:reason_required/);
      await call(admin, 'public.block_board_handle($1,$2,$3)', [handleId, true, 'Repeated insults.']);
      assert((await mine(person.userId, 'students')).blocked === true);
      assert((await list(person.userId, 'students')).threads.some((t) => t.id === made.threadId), 'a blocked username could not read');
      await rejects(() => start(person.userId, 'students', 'After the block', 'body'), /board:blocked/);
      await rejects(() => reply(person.userId, made.threadId, 'body'), /board:blocked/);
      await call(admin, 'public.block_board_handle($1,$2,$3)', [handleId, false, 'Apologised.']);
      await reply(person.userId, made.threadId, 'I am sorry.');
      const audit = (await q(`select action from public.governance_audit_events where target_id=$1 order by occurred_at, id`, [handleId])).rows.map((r) => r.action);
      assert(JSON.stringify(audit) === JSON.stringify(['board.handle_blocked', 'board.handle_unblocked']), `blocking was not audited: ${audit}`);
    });

    await test('the account behind a post: the owner or governance, with a reason, and written down first', async () => {
      const person = await student('Behind The Name');
      await name(person.userId, 'students', 'behind_the_name');
      const made = await start(person.userId, 'students', 'A worrying post', 'Something that needs a person to help.');
      const before = (await q(`select count(*)::int n from public.governance_audit_events where action='board.author_opened'`)).rows[0].n;
      for (const nosy of [teacher, otherTeacher, support, person.userId]) {
        await rejects(() => author(nosy, made.threadId, null, 'I would like to know who this is.'), /board:not_allowed/);
      }
      await rejects(() => author(admin, made.threadId, null, 'curious'), /board:reason_required/);
      await rejects(() => author(admin, '00000000-0000-4000-8000-000000000000', null, 'A post that is not there.'), /board:not_found/);
      assert((await q(`select count(*)::int n from public.governance_audit_events where action='board.author_opened'`)).rows[0].n === before, 'a refused look was recorded as a look');
      const who = await author(admin, made.threadId, null, 'The post suggests the writer is at risk.');
      assert(who.userId === person.userId && who.name === 'Behind The Name' && who.handle === 'behind_the_name', `the wrong account: ${JSON.stringify(who)}`);
      const audit = (await q(`select actor, target_id, detail from public.governance_audit_events where action='board.author_opened' order by occurred_at desc limit 1`)).rows[0];
      assert(audit.actor === admin && audit.target_id === made.threadId && audit.detail.reason === 'The post suggests the writer is at risk.', 'the look was not written down');
      // The audit entry does not itself hold the account.
      assert(!JSON.stringify(audit.detail).includes(person.userId));
      // An account erased since: the post stays under its name and is nobody's.
      const gone = await student('Erased Later');
      await name(gone.userId, 'students', 'erased_later');
      const left = await start(gone.userId, 'students', 'Written before leaving', 'body');
      await q(`update public.board_handles set user_id = null where handle = 'erased_later'`);
      assert((await list(person.userId, 'students')).threads.find((t) => t.id === left.threadId).handle === 'erased_later');
      assert((await author(admin, left.threadId, null, 'Checking an erased account.')).userId === null);
    });

    await test('closing an account takes its words off the boards and cuts the username from it', async () => {
      const leaving = await student('Leaving Person');
      const staying = await student('Staying Person');
      await name(leaving.userId, 'students', 'leaving_person');
      await name(staying.userId, 'students', 'staying_person');
      const alone = await start(leaving.userId, 'students', 'SECRET-TITLE nobody answered', 'SECRET-BODY one');
      const answered = await start(leaving.userId, 'students', 'SECRET-TITLE somebody answered', 'SECRET-BODY two');
      await reply(staying.userId, answered.threadId, 'An answer that stays.');
      const theirs = await start(staying.userId, 'students', 'A thread that stays', 'body');
      await reply(leaving.userId, theirs.threadId, 'SECRET-REPLY from the one leaving');
      await report(leaving.userId, theirs.threadId, null, 'A report from the one leaving.');

      // The account closes itself, the way the account page does it.
      await call(leaving.userId, 'public.erase_my_account($1)', ['Leaving Person']);

      const everything = JSON.stringify((await q(
        `select (select jsonb_agg(to_jsonb(t)) from public.board_threads t) as threads,
                (select jsonb_agg(to_jsonb(r)) from public.board_replies r) as replies,
                (select jsonb_agg(to_jsonb(h)) from public.board_handles h) as handles,
                (select jsonb_agg(to_jsonb(br)) from public.board_reports br) as reports`)).rows[0]);
      for (const secret of ['SECRET-TITLE', 'SECRET-BODY', 'SECRET-REPLY', 'leaving_person', leaving.userId]) {
        assert(!everything.includes(secret), `${secret} is still in the board tables after the account was closed`);
      }
      // A thread nobody answered is gone; one with an answer keeps the answer in its place.
      assert(!(await list(staying.userId, 'students')).threads.some((t) => t.id === alone.threadId));
      const kept = await open(staying.userId, answered.threadId);
      assert(kept.thread.title === '[erased]' && kept.thread.body === '[erased]' && kept.thread.handle.startsWith('gone_') && kept.replies[0].body === 'An answer that stays.',
        `the answered thread was not kept with its words erased: ${JSON.stringify(kept.thread)}`);
      const other = await open(staying.userId, theirs.threadId);
      assert(other.replies[0].state === 'withdrawn' && other.replies[0].body === undefined);
      assert((await list(staying.userId, 'students')).threads.find((t) => t.id === theirs.threadId).replies === 0);
      // The report stays in the queue and names nobody.
      assert((await queue(admin)).reports.some((r) => r.threadId === theirs.threadId));
      // Staff are told the account is gone.
      const who = await author(admin, answered.threadId, null, 'Checking a closed account.');
      assert(who.userId === null && who.name === null, `a closed account was still behind its posts: ${JSON.stringify(who)}`);
      // The name is free again, and the closed account is let in nowhere.
      await rejects(() => list(leaving.userId, 'students'), /board:not_allowed/);
      const next = await student('Next Person');
      assert((await name(next.userId, 'students', 'leaving_person')).handle === 'leaving_person');
    });

    await test('the teachers\' board is its own room, under its own names', async () => {
      await name(otherTeacher, 'teachers', 'tired_teacher');
      const made = await start(teacher, 'teachers', 'A class I cannot reach', 'What do you do with a silent group?');
      await reply(otherTeacher, made.threadId, 'Ask one of them by name, kindly.');
      const seen = await open(otherTeacher, made.threadId);
      assert(seen.thread.handle === 'night_reader' && seen.thread.kind === 'teacher' && seen.replies[0].handle === 'tired_teacher');
      // It is not on the students' board, and a student cannot open it by its id.
      const paid = await student('Id Guesser');
      assert(!(await list(paid.userId, 'students')).threads.some((t) => t.id === made.threadId));
      await rejects(() => open(paid.userId, made.threadId), /board:not_allowed/);
      await rejects(() => reply(paid.userId, made.threadId, 'hello teachers'), /board:not_allowed/);
      await rejects(() => report(paid.userId, made.threadId, null, 'Let me see this.'), /board:not_allowed/);
      // One teacher cannot find out who another is.
      await rejects(() => author(otherTeacher, made.threadId, null, 'Which colleague wrote this?'), /board:not_allowed/);
      // Staff read it and are marked as staff when they write.
      await name(admin, 'teachers', 'the_owner');
      await reply(admin, made.threadId, 'Thank you both.');
      assert((await open(teacher, made.threadId)).replies[1].kind === 'staff');
    });

    await test('signed out, or as a visitor, nothing answers', async () => {
      for (const fn of ['my_board(text)', 'set_board_handle(text,text)', 'board_threads_page(text,timestamptz,integer)', 'board_thread(uuid)',
        'post_board_thread(text,text,text)', 'post_board_reply(uuid,text)', 'withdraw_board_post(uuid,uuid)', 'report_board_post(uuid,uuid,text)',
        'board_report_queue()', 'moderate_board_post(uuid,uuid,boolean,text)', 'block_board_handle(uuid,boolean,text)', 'board_author(uuid,uuid,text)']) {
        const held = (await q(`select has_function_privilege('anon', 'public.' || $1, 'execute') as anon, has_function_privilege('authenticated', 'public.' || $1, 'execute') as signed_in`, [fn])).rows[0];
        assert(held.anon === false && held.signed_in === true, `${fn}: ${JSON.stringify(held)}`);
      }
      for (const fn of ['board_standing(uuid,text)', 'board_switch(text)', 'board_enter(uuid,text)', 'board_writer(uuid,text)']) {
        const held = (await q(`select has_function_privilege('anon', 'public.' || $1, 'execute') as anon, has_function_privilege('authenticated', 'public.' || $1, 'execute') as signed_in`, [fn])).rows[0];
        assert(held.anon === false && held.signed_in === false, `${fn} can be called from outside: ${JSON.stringify(held)}`);
      }
    });
  } finally {
    await flags(false, false);
  }
}
