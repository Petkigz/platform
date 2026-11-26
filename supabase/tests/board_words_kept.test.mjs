// What a closed account wrote on a board is kept, cut from the account, and
// the owner is told when a post is reported (20261281158000, the owner's
// answers of 2026-11-26).
//
// Everything here happens inside one transaction that is rolled back: the
// boards are switched on for it and no other suite should find them on.

export async function run(ctx) {
  const { q, test, assert, rejects, bootstrapAdmin, newUser, newProfile, newInstructor, newCourse, grantRole } = ctx;

  const admin = await bootstrapAdmin('kept-admin@example.com');
  const teacher = await newInstructor('kept-teacher@example.com', admin);
  const course = await newCourse(teacher, { status: 'active', title: 'Kept Words Course' });
  const governance = await newUser('kept-governance@example.com');
  await newProfile(governance, 'Kept Governance');
  await grantRole(governance, 'governance_admin', admin);
  const support = await newUser('kept-support@example.com');
  await newProfile(support, 'Kept Support');
  await grantRole(support, 'support_agent', admin);

  let seq = 0;
  async function student(name) {
    seq += 1;
    const userId = await newUser(`kept-student-${seq}@example.com`);
    await newProfile(userId, name);
    const learnerId = (await q(
      `insert into public.learner_profiles (display_name, learner_type, age_band, linked_user_id)
       values ($1,'adult','18+',$2) returning id`, [name, userId])).rows[0].id;
    await q(
      `insert into public.entitlement_grants (learner_profile_id, scope_type, course_id, source_type)
       values ($1,'course',$2,'purchase')`, [learnerId, course]);
    // Agreed to what the boards ask for, as the box records it.
    await q(
      `insert into public.policy_acceptances (user_id, policy_version_id)
       select $1, v.id from public.policy_versions v
         join public.policy_documents d on d.id = v.document_id
        where d.slug in ('terms','privacy') and v.status = 'in_force'
       on conflict do nothing`, [userId]);
    return userId;
  }

  let step = 0;
  async function asActor(actor, sql, params = []) {
    const point = `kept_${step += 1}`;
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

  const name = (actor, handle) => call(actor, 'set_board_handle($1,$2)', ['students', handle]);
  const start = (actor, title, body) => call(actor, 'post_board_thread($1,$2,$3)', ['students', title, body]);
  const reply = (actor, thread, body) => call(actor, 'post_board_reply($1,$2)', [thread, body]);
  const open = (actor, thread) => call(actor, 'board_thread($1)', [thread]);
  const report = (actor, thread, replyId, reason) => call(actor, 'report_board_post($1,$2,$3)', [thread, replyId, reason]);
  const kept = (actor, thread, replyId, reason) => call(actor, 'board_kept_post($1,$2,$3)', [thread, replyId, reason]);
  const told = async (user) => (await q(
    `select kind, title, body, href, severity, facts, dedupe_key from public.notifications
      where user_id = $1 and kind = 'board_reported' order by dedupe_key`, [user])).rows;

  console.log('\nWhat a closed account wrote is kept; the owner is told of a report');

  await q('begin');
  try {
    await q(`update public.platform_settings set value_text = 'true'
              where key in ('community.student_board','community.teacher_board')`);

    const leaving = await student('Kept Leaving');
    const staying = await student('Kept Staying');
    await name(leaving, 'kept_leaving');
    await name(staying, 'kept_staying');
    const alone = await start(leaving, 'KEPT-TITLE nobody answered', 'KEPT-BODY one');
    const theirs = await start(staying, 'A thread that stays', 'A body that stays.');
    const answer = await reply(leaving, theirs.threadId, 'KEPT-REPLY from the one leaving');
    const before = (await q(`select count(*)::int n from public.board_kept_words`)).rows[0].n;

    await test('closing an account takes its words off the board, and keeps them where nobody reads', async () => {
      await call(leaving, 'erase_my_account($1)', ['Kept Leaving']);

      // Off the board, as before: the rows a reader can reach say nothing.
      const board = JSON.stringify((await q(
        `select (select jsonb_agg(to_jsonb(t)) from public.board_threads t) as threads,
                (select jsonb_agg(to_jsonb(r)) from public.board_replies r) as replies,
                (select jsonb_agg(to_jsonb(h)) from public.board_handles h) as handles`)).rows[0]);
      for (const secret of ['KEPT-TITLE', 'KEPT-BODY', 'KEPT-REPLY', 'kept_leaving', leaving]) {
        assert(!board.includes(secret), `${secret} is still on the board after the account closed`);
      }
      const seen = await open(staying, theirs.threadId);
      assert(seen.replies[0].state === 'withdrawn' && seen.replies[0].body === undefined,
        `the reply of a closed account is still shown: ${JSON.stringify(seen.replies[0])}`);

      // Kept: one row for the thread, one for the reply, with the words.
      const rows = (await q(
        `select thread_id, reply_id, title, body, written_at from public.board_kept_words order by written_at`)).rows;
      assert(rows.length === before + 2, `${rows.length - before} rows were kept, not 2`);
      const thread = rows.find((r) => r.thread_id === alone.threadId && r.reply_id === null);
      const said = rows.find((r) => r.reply_id === answer.replyId);
      assert(thread && thread.title === 'KEPT-TITLE nobody answered' && thread.body === 'KEPT-BODY one');
      assert(said && said.title === null && said.body === 'KEPT-REPLY from the one leaving' && said.thread_id === theirs.threadId);
      // What is kept is the words, not whose they were.
      const everything = JSON.stringify((await q(`select jsonb_agg(to_jsonb(k)) j from public.board_kept_words k`)).rows[0].j);
      assert(!everything.includes(leaving) && !everything.includes('kept_leaving'),
        'the kept words name the account or its username');
      const columns = (await q(
        `select column_name from information_schema.columns
          where table_schema = 'public' and table_name = 'board_kept_words' order by 1`)).rows.map((r) => r.column_name);
      assert(JSON.stringify(columns) === JSON.stringify(['body', 'id', 'kept_at', 'reply_id', 'thread_id', 'title', 'written_at']),
        `the kept table has these columns: ${columns.join(', ')}`);
      // The post that stayed was not copied: its writer has not closed anything.
      assert(!rows.some((r) => r.thread_id === theirs.threadId && r.reply_id === null));
    });

    await test('the kept table answers nobody; the one way in is the owner or governance, with a reason, written down first', async () => {
      for (const who of [staying, teacher, support, governance, admin]) {
        await rejects(() => asActor(who, 'select count(*) from public.board_kept_words'), /permission denied/);
      }
      for (const who of [staying, teacher, support]) {
        await rejects(() => kept(who, alone.threadId, null, 'I would like to read what was erased.'), /^board:not_allowed$/);
      }
      await rejects(() => kept(admin, alone.threadId, null, 'short'), /^board:reason_required$/);
      // A post whose writer is still here has nothing kept.
      await rejects(() => kept(admin, theirs.threadId, null, 'Checking a post that is still on the board.'), /^board:not_found$/);

      const audited = async () => (await q(
        `select count(*)::int n from public.governance_audit_events where action = 'board.kept_words_opened'`)).rows[0].n;
      // The refusals above wrote nothing down.
      const start0 = await audited();
      assert(start0 === 0, `${start0} entries were written by refusals`);

      const thread = await kept(admin, alone.threadId, null, 'Somebody says this post threatened them before the account closed.');
      assert(thread.title === 'KEPT-TITLE nobody answered' && thread.body === 'KEPT-BODY one' && thread.writtenAt && thread.keptAt,
        `the owner was given ${JSON.stringify(thread)}`);
      assert(JSON.stringify(Object.keys(thread).sort()) === JSON.stringify(['body', 'keptAt', 'title', 'writtenAt']),
        'the answer carries more than the words and the two times');
      const said = await kept(governance, theirs.threadId, answer.replyId, 'A reported reply, read for the safeguarding record.');
      assert(said.title === null && said.body === 'KEPT-REPLY from the one leaving');
      assert((await audited()) === start0 + 2, 'reading kept words was not written down each time');
      const entry = (await q(
        `select actor, target_type, target_id, detail from public.governance_audit_events
          where action = 'board.kept_words_opened' and target_id = $1`, [answer.replyId])).rows[0];
      assert(entry.actor === governance && entry.target_type === 'board_reply' && entry.target_id === answer.replyId
        && entry.detail.reason === 'A reported reply, read for the safeguarding record.',
        `the audit entry says ${JSON.stringify(entry)}`);
      // The account behind it is still gone: keeping the words did not keep the name.
      const author = await call(admin, 'board_author($1,$2,$3)', [alone.threadId, null, 'Checking that a closed account is not named.']);
      assert(author.userId === null && author.name === null, `a closed account was named: ${JSON.stringify(author)}`);
    });

    await test('a report tells the owner, once for a post in a day, and tells nobody else', async () => {
      const writer = await student('Kept Writer');
      const first = await student('Kept First Reporter');
      const second = await student('Kept Second Reporter');
      await name(writer, 'kept_writer');
      const made = await start(writer, 'REPORTED-TITLE', 'REPORTED-BODY words nobody is sent');
      const mine0 = (await told(admin)).length;

      await report(first, made.threadId, null, 'REPORT-REASON it is unkind.');
      await report(second, made.threadId, null, 'REPORT-REASON it is still unkind.');

      const messages = await told(admin);
      assert(messages.length === mine0 + 1, `the owner was told ${messages.length - mine0} times about one post`);
      const message = messages.find((m) => m.dedupe_key.includes(made.threadId));
      assert(message, 'no message is about the reported post');
      assert(message.href === '/admin/boards' && message.severity === 'action' && message.facts.board === 'students',
        `the message is ${JSON.stringify(message)}`);
      const whole = JSON.stringify(message);
      // It names the post, so that a second report of it is not a second message; nothing about people.
      for (const secret of ['REPORTED-TITLE', 'REPORTED-BODY', 'REPORT-REASON', 'kept_writer', writer, first, second]) {
        assert(!whole.includes(secret), `the message carries ${secret}`);
      }
      // Governance moderates and is not told; nor support, the teacher, the writer or the reporters.
      for (const who of [governance, support, teacher, writer, first, second]) {
        assert((await told(who)).length === 0, 'somebody other than the owner was told of a report');
      }
      // Another post is another message.
      const other = await reply(writer, made.threadId, 'A reply that is reported as well.');
      await report(first, made.threadId, other.replyId, 'This one as well.');
      assert((await told(admin)).length === mine0 + 2);
      // The owner reporting a post themselves does not need telling.
      const more = await start(writer, 'Another thread', 'Another body.');
      await report(admin, more.threadId, null, 'The owner reports it.');
      assert((await told(admin)).length === mine0 + 2, 'the owner was told of their own report');
    });

    await test('being told of a report is not a preference anybody switches', async () => {
      assert((await q(`select public.notification_kind_is_locked('board_reported') as r`)).rows[0].r === true);
      assert((await q(`select public.notification_enabled($1,'board_reported') as r`, [admin])).rows[0].r === true);
      await rejects(() => call(admin, 'set_notification_preference($1,$2)', ['board_reported', false]));
      const prefs = JSON.stringify(await call(admin, 'my_notification_preferences()'));
      assert(!prefs.includes('board_reported'), 'the kind is offered as a preference');
      // The two that were locked before still are, and an ordinary one is not.
      for (const [kind, locked] of [['payout_failed', true], ['payout_cancelled', true], ['payout_paid', false], ['teaching_answered', false]]) {
        assert((await q(`select public.notification_kind_is_locked($1) as r`, [kind])).rows[0].r === locked, kind);
      }
    });

    await test('both switches say the notice has to say it first', async () => {
      const rows = (await q(
        `select key, preconditions from public.platform_settings
          where key in ('community.student_board','community.teacher_board') order by key`)).rows;
      assert(rows.length === 2);
      for (const row of rows) {
        assert(row.preconditions.includes('what a closed account wrote is kept'), row.key);
        assert(row.preconditions.includes('publish a privacy notice that says posts are kept'), row.key);
      }
    });

    await test('a post taken back or taken down is off the board for its writer too, and its words stay in the record', async () => {
      const writer = await student('Kept Writer');
      const reader = await student('Kept Reader');
      await name(writer, 'off_writer');
      await name(reader, 'off_reader');
      const mine = await start(writer, 'OFF-TITLE taken back', 'OFF-BODY taken back');
      const theirs2 = await start(reader, 'A thread with a reply', 'A body.');
      const unkind = await reply(writer, theirs2.threadId, 'OFF-REPLY taken down');
      const regret = await reply(writer, theirs2.threadId, 'OFF-REPLY taken back');

      // Only the writer takes a post back; only a moderator takes one down.
      await rejects(() => call(reader, 'withdraw_board_post($1,$2)', [mine.threadId, null]), /^board:not_found$/);
      for (const who of [reader, teacher, support, writer]) {
        await rejects(() => call(who, 'moderate_board_post($1,$2,$3,$4)', [theirs2.threadId, unkind.replyId, true, 'Not theirs to take down.']), /^board:not_allowed$/);
      }

      await call(writer, 'withdraw_board_post($1,$2)', [mine.threadId, null]);
      await call(writer, 'withdraw_board_post($1,$2)', [theirs2.threadId, regret.replyId]);
      await call(governance, 'moderate_board_post($1,$2,$3,$4)', [theirs2.threadId, unkind.replyId, true, 'Unkind to another learner.']);

      // Off the board, for the one who wrote it as for anybody else.
      for (const who of [reader, writer]) {
        await rejects(() => open(who, mine.threadId), /^board:not_found$/);
        const seen = await open(who, theirs2.threadId);
        assert(!JSON.stringify(seen).includes('OFF-REPLY') && !JSON.stringify(seen).includes('off_writer'),
          `a reply that is gone is still shown: ${JSON.stringify(seen.replies)}`);
        // Each keeps its place and says only that it is gone.
        assert(seen.replies.length === 2 && seen.replies.map((r) => r.state).sort().join() === 'removed,withdrawn');
        for (const gone of seen.replies) {
          assert(JSON.stringify(Object.keys(gone).sort()) === JSON.stringify(['createdAt', 'id', 'mine', 'state']), JSON.stringify(gone));
        }
      }
      // The moderators still read it where it was.
      for (const who of [governance, admin]) {
        const thread = await open(who, mine.threadId);
        assert(thread.thread.state === 'withdrawn' && thread.thread.body === 'OFF-BODY taken back', JSON.stringify(thread.thread));
        const seen = await open(who, theirs2.threadId);
        assert(seen.replies.map((r) => r.body).sort().join('|') === 'OFF-REPLY taken back|OFF-REPLY taken down', JSON.stringify(seen.replies));
      }
      // Nobody else on the staff does.
      for (const who of [teacher, support]) {
        await rejects(() => open(who, mine.threadId), /^board:/);
      }

      // In the record: the words are in the rows they were written to.
      const rows = (await q(
        `select (select body from public.board_threads where id = $1) thread,
                (select state from public.board_threads where id = $1) thread_state,
                (select body from public.board_replies where id = $2) reply,
                (select state from public.board_replies where id = $2) reply_state,
                (select body from public.board_replies where id = $3) regret,
                (select state from public.board_replies where id = $3) regret_state`, [mine.threadId, unkind.replyId, regret.replyId])).rows[0];
      assert(rows.thread === 'OFF-BODY taken back' && rows.thread_state === 'withdrawn', JSON.stringify(rows));
      assert(rows.reply === 'OFF-REPLY taken down' && rows.reply_state === 'removed', JSON.stringify(rows));
      assert(rows.regret === 'OFF-REPLY taken back' && rows.regret_state === 'withdrawn', JSON.stringify(rows));

      // And after the writer closes the account the words are still held, without the account:
      // read with a reason, written down.
      await call(writer, 'erase_my_account($1)', ['Kept Writer']);
      const after = await kept(admin, mine.threadId, null, 'Reading it again after the account closed.');
      assert(after.body === 'OFF-BODY taken back' && after.title === 'OFF-TITLE taken back', JSON.stringify(after));
      const later = await kept(governance, theirs2.threadId, unkind.replyId, 'Reading it again after the account closed.');
      assert(later.body === 'OFF-REPLY taken down', JSON.stringify(later));
      const last = await kept(governance, theirs2.threadId, regret.replyId, 'Reading it again after the account closed.');
      assert(last.body === 'OFF-REPLY taken back', JSON.stringify(last));
      for (const answer of [after, later, last]) {
        assert(!JSON.stringify(answer).includes(writer) && !JSON.stringify(answer).includes('off_writer'));
      }
    });

    await test('nothing deletes a board post: no signed-in role may, and no function does', async () => {
      const tables = ['board_threads', 'board_replies', 'board_kept_words', 'board_reports'];
      for (const table of tables) {
        for (const role of ['anon', 'authenticated']) {
          for (const right of ['DELETE', 'TRUNCATE', 'UPDATE', 'INSERT']) {
            const has = (await q(`select has_table_privilege($1, $2, $3) as yes`, [role, `public.${table}`, right])).rows[0].yes;
            assert(has === false, `${role} may ${right} public.${table}`);
          }
        }
      }
      // No function in the database deletes from the tables that hold what was written.
      const deleting = (await q(
        `select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
          where n.nspname = 'public'
            and p.prosrc ~* 'delete\s+from\s+(public\.)?(board_threads|board_replies|board_kept_words)\M'`)).rows.map((r) => r.proname);
      assert(deleting.length === 0, `these functions delete board posts: ${deleting.join(', ')}`);
      // Nor does anything remove them when something else goes: the only cascade is a reply or a report with its thread, and no thread is ever deleted.
      const cascades = (await q(
        `select conrelid::regclass::text as child, confrelid::regclass::text as parent
           from pg_constraint
          where contype = 'f' and confdeltype = 'c'
            and conrelid::regclass::text in ('board_threads','board_replies','board_kept_words','public.board_threads','public.board_replies','public.board_kept_words')
          order by 1, 2`)).rows.map((r) => `${r.child.replace('public.', '')}>${r.parent.replace('public.', '')}`);
      assert(JSON.stringify(cascades) === JSON.stringify(['board_replies>board_threads']), `cascades: ${cascades.join(', ')}`);
    });

    await test('both switches say there is no time limit and that the draft notice has to be published', async () => {
      const rows = (await q(
        `select key, preconditions from public.platform_settings
          where key in ('community.student_board','community.teacher_board') order by key`)).rows;
      assert(rows.length === 2);
      for (const row of rows) {
        assert(row.preconditions.includes('board posts are kept with no time limit'), row.key);
        assert(row.preconditions.includes('in the policy register as a draft (version 3)'), row.key);
        assert(row.preconditions.split('board posts are kept with no time limit').length === 2, 'said twice');
      }
    });
  } finally {
    await q('rollback');
  }
}
