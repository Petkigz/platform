// An applicant is told when their application to teach is answered.
//
// `teaching_applications.test.mjs` holds who may ask, who may decide and what
// a decision grants; none of that moved. This suite holds the one thing the
// migration `20261281151000_teaching_answer_told.sql` adds: a decision writes
// the applicant one message, of a kind they may switch off, that says the
// outcome and does not carry what the owner wrote.

export async function run(ctx) {
  const { q, test, assert, rejects, bootstrapAdmin, newUser, newProfile } = ctx;

  const admin = await bootstrapAdmin('teachtold-admin@example.com');
  const bystander = await newUser('teachtold-bystander@example.com');
  await newProfile(bystander, 'Told Bystander');

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
  const flag = (on) =>
    asActor(admin, `update public.platform_settings set value_text = $1
                     where key = 'teaching.applications'`, [on ? 'true' : 'false']);
  const apply = (actor) =>
    asActor(actor, 'select public.submit_teaching_application($1,$2,$3,$4) as r', [
      'Tajweed for beginners',
      'I hold an ijazah in Hafs and have taught children in a madrasah for six years.',
      'https://example.org/sample-lesson',
      null,
    ]).then((res) => res.rows[0].r);
  const decide = (actor, id, approve, reason) =>
    asActor(actor, 'select public.decide_teaching_application($1,$2,$3) as r',
      [id, approve, reason]).then((res) => res.rows[0].r);
  const mine = (actor) =>
    asActor(actor, 'select public.my_teaching_application() as r').then((res) => res.rows[0].r);
  const centre = (actor) =>
    asActor(actor, 'select public.my_notifications(30) n').then((res) => res.rows[0].n);
  const prefs = (actor) =>
    asActor(actor, 'select public.my_notification_preferences() p').then((res) => res.rows[0].p);
  const setPref = (actor, kind, on) =>
    asActor(actor, 'select public.set_notification_preference($1,$2)', [kind, on]);
  const messages = async (userId) =>
    (await q(`select kind, title, body, href, severity, dedupe_key, facts
                from public.notifications where user_id = $1 order by created_at, id`, [userId])).rows;

  let seq = 0;
  async function applicant(name) {
    seq += 1;
    const userId = await newUser(`teachtold-${seq}@example.com`);
    await newProfile(userId, name);
    return userId;
  }

  // What the owner writes. It must be found nowhere in a message.
  const PRAISE = 'SECRET-PRAISE watched the sample twice';
  const REFUSAL = 'SECRET-REFUSAL the sample has no recitation in it';

  console.log('\nAn answer to an application is told');

  await flag(true);
  try {
    await test('approving writes the applicant one message that says approved and not why', async () => {
      const person = await applicant('Told Approved');
      const made = await apply(person);
      assert((await messages(person)).length === 0, 'asking wrote a message');

      const out = await decide(admin, made.applicationId, true, PRAISE);
      assert(out.status === 'approved' && out.roleAssignmentId, JSON.stringify(out));

      const rows = await messages(person);
      assert(rows.length === 1, `the applicant has ${rows.length} messages`);
      const [m] = rows;
      assert(m.kind === 'teaching_answered', m.kind);
      assert(m.href === '/teach/apply' && m.severity === 'info', JSON.stringify(m));
      assert(m.dedupe_key === `teaching-answer:${made.applicationId}`, m.dedupe_key);
      assert(JSON.stringify(m.facts) === JSON.stringify({ outcome: 'approved' }), JSON.stringify(m.facts));
      assert(m.title === 'Your application to teach was approved', m.title);
      assert(!JSON.stringify(m).includes('SECRET'), 'what the owner wrote was copied into the message');
      // The reason is where it was: on the application, for the applicant.
      assert((await mine(person)).application.decisionReason === PRAISE);
      // The decision is still what it was.
      assert((await scalar(`select public.has_role($1,'instructor') v`, [person])).v === true);
      assert((await messages(admin)).length === 0, 'whoever decided was sent a message');
    });

    await test('declining writes one message that says not approved and not why', async () => {
      const person = await applicant('Told Declined');
      const made = await apply(person);
      const out = await decide(admin, made.applicationId, false, REFUSAL);
      assert(out.status === 'declined' && out.roleAssignmentId === null, JSON.stringify(out));

      const rows = await messages(person);
      assert(rows.length === 1, `the applicant has ${rows.length} messages`);
      const [m] = rows;
      assert(JSON.stringify(m.facts) === JSON.stringify({ outcome: 'declined' }), JSON.stringify(m.facts));
      assert(m.title === 'Your application to teach was not approved', m.title);
      assert(!JSON.stringify(m).includes('SECRET'), 'what the owner wrote was copied into the message');
      assert((await scalar(`select public.has_role($1,'instructor') v`, [person])).v === false);
    });

    await test('the applicant reads it in their centre, counted, and nobody else does', async () => {
      const person = await applicant('Told Reader');
      const made = await apply(person);
      await decide(admin, made.applicationId, false, REFUSAL);

      const box = await centre(person);
      assert(box.unreadCount === 1, `unread was ${box.unreadCount}`);
      assert(box.recent.length === 1 && box.recent[0].kind === 'teaching_answered', JSON.stringify(box.recent));
      assert(box.recent[0].facts.outcome === 'declined' && box.recent[0].href === '/teach/apply');

      const other = await centre(bystander);
      assert(other.recent.length === 0 && other.unreadCount === 0, 'somebody else was told');
      const direct = await asActor(bystander, 'select id from public.notifications');
      assert(direct.rows.length === 0, `a direct read returned ${direct.rows.length} rows`);
    });

    await test('an answer is given once, and so is its message', async () => {
      const person = await applicant('Told Once');
      const made = await apply(person);
      await decide(admin, made.applicationId, false, REFUSAL);
      await rejects(() => decide(admin, made.applicationId, true, PRAISE), /teaching:already_decided/);
      assert((await messages(person)).length === 1, 'a refused second decision wrote a message');

      // A second application is a second answer, and a second message.
      const again = await apply(person);
      await decide(admin, again.applicationId, true, PRAISE);
      const rows = await messages(person);
      assert(rows.length === 2, `two answers wrote ${rows.length} messages`);
      assert(rows.map((m) => m.facts.outcome).join() === 'declined,approved', rows.map((m) => m.facts.outcome).join());
    });

    await test('a decision that is refused tells nobody', async () => {
      const person = await applicant('Told Nothing');
      const made = await apply(person);
      await rejects(() => decide(bystander, made.applicationId, true, PRAISE), /teaching:not_allowed/);
      await rejects(() => decide(admin, made.applicationId, true, '   '), /teaching:reason_required/);
      assert((await messages(person)).length === 0, 'a refused decision wrote a message');
    });

    await test('taking an application back writes no message', async () => {
      const person = await applicant('Told Withdrawn');
      await apply(person);
      await asActor(person, 'select public.withdraw_teaching_application()');
      assert((await messages(person)).length === 0, 'taking it back wrote a message');
    });

    await test('the applicant’s page is told whether they will be told', async () => {
      const person = await applicant('Told Asked');
      assert((await mine(person)).answerTold === true, 'somebody who changed nothing is not told');
      await setPref(person, 'teaching_answered', false);
      assert((await mine(person)).answerTold === false, 'somebody who switched it off is said to be told');
      await setPref(person, 'teaching_answered', true);
      assert((await mine(person)).answerTold === true);
      // The rest of the reply is what it was.
      const reply = await mine(person);
      assert(JSON.stringify(Object.keys(reply).sort()) === JSON.stringify(['answerTold', 'application', 'isInstructor', 'open']),
        Object.keys(reply).join());
      assert(reply.open === true && reply.isInstructor === false && reply.application === null);
    });

    await test('switched off, the message is still written and is not shown or counted', async () => {
      const person = await applicant('Told Quietly');
      const made = await apply(person);
      await setPref(person, 'teaching_answered', false);
      await decide(admin, made.applicationId, true, PRAISE);

      assert((await messages(person)).length === 1, 'a switched-off message was not written');
      const quiet = await centre(person);
      assert(quiet.recent.length === 0 && quiet.unreadCount === 0, JSON.stringify(quiet));

      await setPref(person, 'teaching_answered', true);
      const loud = await centre(person);
      assert(loud.recent.length === 1 && loud.unreadCount === 1, 'switching it back on did not bring the message back');
    });

    await test('the kind is one of the nine, can be switched, and is not locked', async () => {
      const person = await applicant('Told Chooser');
      const list = await prefs(person);
      const row = list.find((p) => p.kind === 'teaching_answered');
      assert(list.length === 9 && row, `the list has ${list.length} kinds`);
      assert(row.enabled === true && row.locked === false && row.available === true, JSON.stringify(row));
      await rejects(() => setPref(person, 'teaching_decided', false), /not something the platform tells you about/);
      await rejects(
        () => q(`insert into public.notifications (user_id, kind, title, body) values ($1,'teaching_decided','T','B')`, [person]),
        /notifications_kind_check/, 'the table took a kind that is not one');
      await rejects(
        () => q(`insert into public.notification_preferences (user_id, kind, enabled) values ($1,'teaching_decided',false)`, [person]),
        /notification_preferences_kind_check/, 'a preference was kept for a kind that is not one');
    });

    await test('it is said to be in use while applications are open or one of yours is waiting', async () => {
      const waiting = await applicant('Told Waiting');
      const idle = await applicant('Told Idle');
      await apply(waiting);
      const available = async (who) => (await prefs(who)).find((p) => p.kind === 'teaching_answered').available;

      await flag(false);
      try {
        assert((await available(idle)) === false, 'closed, with nothing waiting, it is offered as in use');
        assert((await available(waiting)) === true, 'somebody whose application is waiting is told it is not in use');
        // It can still be chosen in advance.
        await setPref(idle, 'teaching_answered', false);
        assert((await prefs(idle)).find((p) => p.kind === 'teaching_answered').enabled === false);
      } finally {
        await flag(true);
      }
      assert((await available(idle)) === true, 'open, it is not offered as in use');
    });

    await test('who may call what is as it was', async () => {
      for (const [signature, anon, authenticated] of [
        ['public.decide_teaching_application(uuid,boolean,text)', false, true],
        ['public.my_teaching_application()', false, true],
        ['public.my_notification_preferences()', false, true],
        ['public.set_notification_preference(text,boolean)', false, true],
        ['public.notify_user(uuid,text,text,text,text,text,text,jsonb)', false, false],
        ['public.notification_enabled(uuid,text)', false, false],
      ]) {
        const row = await scalar(
          `select has_function_privilege('anon', $1, 'execute') as anon,
                  has_function_privilege('authenticated', $1, 'execute') as authenticated`, [signature]);
        assert(row.anon === anon && row.authenticated === authenticated, `${signature}: ${JSON.stringify(row)}`);
      }
      const person = await applicant('Told Direct');
      await rejects(
        () => asActor(bystander, `insert into public.notifications (user_id, kind, title, body) values ($1,'teaching_answered','T','B')`, [person]),
        /permission denied|row-level security/i, 'a signed-in person wrote somebody an answer');
    });
  } finally {
    await flag(false);
  }
}
