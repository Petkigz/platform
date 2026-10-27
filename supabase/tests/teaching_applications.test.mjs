// Applying to teach.
//
// Teaching here is by appointment. This suite holds the two halves of that in
// tension: anybody may *ask*, and nobody may *become a teacher* by asking.
// Submitting creates a row and nothing else — no role, no course, no profile.
// An approval by staff is what grants `instructor`, and it is a written
// decision with a name against it.

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    bootstrapAdmin, newUser, newProfile,
  } = ctx;

  const admin = await bootstrapAdmin('teachapp-admin@example.com');

  const governance = await newUser('teachapp-governance@example.com');
  await newProfile(governance, 'Governance Person');
  await q(`insert into public.user_role_assignments (user_id, role_id, assigned_by)
           select $1, id, $2 from public.roles where code = 'governance_admin'`,
    [governance, admin]);

  const support = await newUser('teachapp-support@example.com');
  await newProfile(support, 'Support Person');
  await q(`insert into public.user_role_assignments (user_id, role_id, assigned_by)
           select $1, id, $2 from public.roles where code = 'support_agent'`,
    [support, admin]);

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
  const eq = (actual, expected, what) =>
    assert(actual === expected,
      `${what}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);

  const flag = (on) =>
    asActor(admin, `update public.platform_settings set value_text = $1
                     where key = 'teaching.applications'`, [on ? 'true' : 'false']);

  const apply = (actor, headline, qualifications, url, note = null) =>
    asActor(actor, 'select public.submit_teaching_application($1,$2,$3,$4) as r',
      [headline, qualifications, url, note]).then((res) => res.rows[0].r);

  const decide = (actor, id, approve, reason) =>
    asActor(actor, 'select public.decide_teaching_application($1,$2,$3) as r',
      [id, approve, reason]).then((res) => res.rows[0].r);

  const isInstructor = async (actor) =>
    (await q(`select public.has_role($1,'instructor') as v`, [actor])).rows[0].v;

  let seq = 0;
  async function applicant(name) {
    seq += 1;
    const userId = await newUser(`teachapp-${seq}@example.com`);
    await newProfile(userId, name);
    return userId;
  }

  await flag(true);
  try {
    // ---------------------------------------------------------------------
    // Asking
    // ---------------------------------------------------------------------
    await test('somebody may ask to teach, and asking grants nothing', async () => {
      const person = await applicant('Applicant One');
      const made = await apply(
        person,
        'Tajweed and Quran recitation for children',
        'I hold an ijazah in Hafs from my teacher in Cairo, and I have taught in a madrasah for six years.',
        'https://example.org/sample-lesson',
        'I teach evenings East Africa Time.',
      );
      eq(made.status, 'submitted', 'the application');

      const row = (await scalar('select * from public.teaching_applications where id = $1',
        [made.applicationId]));
      eq(row.applicant_id, person, 'who applied');
      eq(row.granted_role_assignment_id, null, 'a role was granted by submitting');

      eq(await isInstructor(person), false, 'submitting made them an instructor');
      const courses = (await scalar(
        'select count(*)::int n from public.courses where created_by = $1', [person])).n;
      eq(courses, 0, 'submitting made a course');
    });

    await test('asking needs a signature, a real link and enough words about the qualifications', async () => {
      const person = await applicant('Applicant Two');

      await rejects(
        () => apply(person, 'Tajweed', 'I know a lot.', 'not-a-link'),
        /check constraint/);

      await rejects(
        () => apply(person, 'Tajweed', 'Short.', 'https://example.org/x'),
        /check constraint/);

      await rejects(
        () => apply(person, 'Hi', 'I hold an ijazah in Hafs from my teacher in Cairo.', 'https://example.org/x'),
        /check constraint/);
    });

    await test('one open application at a time, and a teacher does not apply', async () => {
      const person = await applicant('Applicant Three');
      await apply(person, 'Fiqh for adults', 'I have taught fiqh to adults for eight years and hold a degree in Islamic law.', 'https://example.org/a');

      await rejects(
        () => apply(person, 'Fiqh again', 'A second application while the first is open would be two rows in one queue.', 'https://example.org/b'),
        /already_applied/);

      const teacher = await newUser('teachapp-teacher@example.com');
      await newProfile(teacher, 'Already Teaching');
      await q(`insert into public.user_role_assignments (user_id, role_id, assigned_by)
               select $1, id, $2 from public.roles where code = 'instructor'`,
        [teacher, admin]);

      await rejects(
        () => apply(teacher, 'More teaching', 'I already hold the instructor role and do not need to apply for it.', 'https://example.org/c'),
        /already_teaching/);
    });

    await test('applications ship closed, and a closed door says so', async () => {
      const person = await applicant('Applicant Four');
      await flag(false);
      try {
        await rejects(
          () => apply(person, 'Tajweed', 'I hold an ijazah in Hafs from my teacher in Cairo.', 'https://example.org/x'),
          /applications_closed/);

        const own = (await asActor(person,
          'select public.my_teaching_application() as r')).rows[0].r;
        eq(own.open, false, 'the application door');
      } finally {
        await flag(true);
      }
    });

    // ---------------------------------------------------------------------
    // Deciding
    // ---------------------------------------------------------------------
    await test('only staff decide, and a decision needs words', async () => {
      const person = await applicant('Applicant Five');
      const made = await apply(person, 'Arabic grammar', 'I taught Arabic grammar at a secondary school for ten years.', 'https://example.org/x');

      await rejects(() => decide(person, made.applicationId, true, 'yes'), /not_allowed/);
      // A support badge is not an appointment. Support answers tickets; the
      // owner and governance decide who teaches.
      await rejects(() => decide(support, made.applicationId, true, 'looks fine'), /not_allowed/);
      await rejects(() => decide(admin, made.applicationId, true, '  '), /reason_required/);

      const out = await decide(admin, made.applicationId, true, 'Watched the sample; sound.');
      eq(out.status, 'approved', 'the decision');
      assert(out.roleAssignmentId, 'no role assignment was recorded');

      eq(await isInstructor(person), true, 'an approved applicant still cannot teach');

      await rejects(
        () => decide(admin, made.applicationId, false, 'changed my mind'),
        /already_decided/);
    });

    await test('the approval is recorded twice: as a decision and as a role', async () => {
      const person = await applicant('Applicant Six');
      const made = await apply(person, 'Seerah for teenagers', 'I have run youth circles for nine years and studied with a scholar in Madinah.', 'https://example.org/y');
      // Governance may appoint as well as the owner: two staff badges, one act.
      await decide(governance, made.applicationId, true, 'Known to me; approved.');

      // Scoped to this application and this applicant, because earlier tests in
      // the same run have approvals of their own.
      const rows = (await q(
        `select action, detail from public.governance_audit_events
          where (target_type = 'teaching_application' and target_id = $1)
             or (target_type = 'user' and target_id = $2)
          order by occurred_at`, [made.applicationId, person])).rows;

      const approved = rows.find((r) => r.action === 'teaching.application_approved');
      assert(approved, 'the approval was not audited');
      eq(approved.detail.reason, 'Known to me; approved.', 'the written reason');

      const role = rows.find((r) => r.action === 'role.assigned' && r.detail.via === 'teaching_application');
      assert(rows.some((r) => r.action === 'teaching.application_submitted'),
        'the submission itself was not audited');
      assert(role, 'the role grant was not audited alongside the approval');
    });

    await test('a decline keeps its reason where the applicant reads it, and may be asked again', async () => {
      const person = await applicant('Applicant Seven');
      const first = await apply(person, 'Tajweed', 'I studied tajweed for two years and would like to teach it here.', 'https://example.org/z');
      await decide(admin, first.applicationId, false, 'The sample is too short to judge; send a full lesson.');

      const own = (await asActor(person, 'select public.my_teaching_application() as r')).rows[0].r;
      eq(own.application.status, 'declined', 'the status the applicant reads');
      eq(own.application.decisionReason, 'The sample is too short to judge; send a full lesson.', 'the reason');
      eq(own.isInstructor, false, 'a declined applicant may teach');

      const second = await apply(person, 'Tajweed, second attempt', 'I studied tajweed for two years; here is a full lesson as asked.', 'https://example.org/z2');
      eq(second.status, 'submitted', 'a second application after a decline');
    });

    await test('an applicant may take their own application back', async () => {
      const person = await applicant('Applicant Eight');
      const made = await apply(person, 'Hadith sciences', 'I studied hadith for four years and have a teacher in Amman.', 'https://example.org/w');

      const other = await applicant('Applicant Nine');
      await rejects(
        () => asActor(other, 'select public.withdraw_teaching_application()'), /nothing_to_withdraw/);

      const out = (await asActor(person,
        'select public.withdraw_teaching_application() as r')).rows[0].r;
      eq(out.status, 'withdrawn', 'the withdrawal');

      await rejects(() => decide(admin, made.applicationId, true, 'too late'), /already_decided/);
    });

    // ---------------------------------------------------------------------
    // The queue
    // ---------------------------------------------------------------------
    await test('the queue is for staff, and only staff see an address', async () => {
      const person = await applicant('Applicant Ten');
      await apply(person, 'Quran memorisation', 'I memorised the whole Quran and have taught hifz for seven years.', 'https://example.org/q');

      await rejects(
        () => asActor(person, 'select public.teaching_application_queue()'), /not_allowed/);
      await rejects(
        () => asActor(support, 'select public.teaching_application_queue()'), /not_allowed/);

      const queue = (await asActor(admin, 'select public.teaching_application_queue() as r')).rows[0].r;
      assert(queue.waiting.length > 0, 'the queue is empty');
      const mine = queue.waiting.find((row) => row.headline === 'Quran memorisation');
      assert(mine, 'the application is not in the queue');
      assert(/@example\.com$/.test(mine.email), 'the staff queue carries no address to reply to');
      assert(queue.counts.waiting >= 1, 'the counts are missing');

      // An applicant reading their own row does not get their email back.
      const own = (await asActor(person, 'select public.my_teaching_application() as r')).rows[0].r;
      assert(!('email' in own.application), 'the applicant’s own reader returned an address');
    });

    await test('an applicant cannot read anybody else’s application', async () => {
      const one = await applicant('Applicant Eleven');
      const two = await applicant('Applicant Twelve');
      const made = await apply(one, 'Aqeedah', 'I have taught aqeedah to adults for five years with a scholar.', 'https://example.org/aq');

      const visible = (await asActor(two,
        'select count(*)::int n from public.teaching_applications where id = $1',
        [made.applicationId])).rows[0].n;
      eq(visible, 0, 'another applicant can read this row');
    });

    await test('the flag says it is the owner’s, and says what approving does', async () => {
      const row = await scalar(
        `select gate_type, preconditions, description
           from public.platform_settings where key = 'teaching.applications'`);
      eq(row.gate_type, 'admin', 'a built feature must not stay CODE-gated');
      assert(/appointment/i.test(row.preconditions), 'the precondition does not say teaching is by appointment');
      assert(/instructor/.test(row.preconditions), 'the precondition does not say what approving grants');
    });
  } finally {
    await flag(false);
  }
}
