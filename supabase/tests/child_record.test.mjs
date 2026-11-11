// The third clock: a child's learning record, thirty days after the guardian goes.
//
// The children's policy makes a promise with a number in it that neither of the
// other two clocks covers:
//
//   "A child's learning record is deleted with the guardian's account, 30 days
//    after that account closes. The exception is a certificate already issued:
//    its number stays verifiable... It verifies the certificate, not the child."
//
// Closing the account already took the name, the notes, the bookmarks, the
// reviews and the shares. What it left was the record of what the child actually
// did — enrolments, progress, submissions, attempts, attendance — because a
// certificate points at an enrolment with `on delete restrict`, and deleting the
// enrolment would have taken the certificate with it. So the promise was kept
// everywhere except where it mattered, and nobody could see the gap from a screen.
//
// Three things this suite is written to catch:
//
//   1. **The certificate dying with the record.** It is the one thing the policy
//      says must survive, and the whole schema change exists to let it.
//   2. **The record surviving the purge.** The sweep at the end of Act III asks
//      `information_schema` for *every* table with a `learner_profile_id` column
//      rather than the list somebody remembered — so a table added next month
//      fails here instead of quietly keeping a child.
//   3. **Taking the wrong child.** A child whose guardian is still an active
//      member of the family is not on this clock at all, and neither is an adult.

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    bootstrapAdmin, newUser, newProfile, newInstructor, newReviewer,
    grantRole, committed, newCourse, newVersion, newSection, newLesson, satisfyReview,
  } = ctx;

  const owner = await bootstrapAdmin('child-record-owner@example.com');
  const teacher = await newInstructor('child-record-teacher@example.com', owner);
  const reviewer = await newReviewer('child-record-reviewer@example.com', owner);

  /** Act as a person and COMMIT, or roll back on error. */
  async function asActor(actor, sql, params = []) {
    await q('begin');
    await q(`select set_config('request.jwt.claims', $1, true)`,
      [JSON.stringify({ sub: actor, role: 'authenticated' })]);
    await q('set local role authenticated');
    let r;
    try {
      r = await q(sql, params);
    } catch (e) {
      await q('rollback');
      throw e;
    }
    await q('commit');
    return r;
  }

  const call = async (actor, sql, params = []) =>
    (await asActor(actor, sql, params)).rows[0].r;

  const one = async (sql, params = []) => (await q(sql, params)).rows[0];
  const count = async (sql, params = []) =>
    (await q(`select count(*)::int n from (${sql}) t`, params)).rows[0].n;

  const plan = async (asOf) =>
    call(owner, 'select public.retention_plan($1::timestamptz) as r', [asOf]);
  const runJobs = async (asOf, limit = 500) =>
    call(owner, 'select public.run_retention_jobs($1::timestamptz, $2) as r', [asOf, limit]);

  const now = new Date().toISOString();
  const DAY = 24 * 3600 * 1000;
  const plus = (base, ms) => new Date(new Date(base).getTime() + ms).toISOString();

  /**
   * Every table in the schema that can name a learner, and the ones that still do.
   *
   * Reads `information_schema`-equivalent catalogues rather than a remembered
   * list, so a table added later is caught by the *next* run of this suite rather
   * than by nobody. The certificate is the stated exception and is excluded by
   * name here so the exclusion is visible.
   */
  async function sweepFor(learnerId) {
    const tables = (await q(
      `select c.relname as table_name
         from pg_class c
         join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
         join pg_attribute a on a.attrelid = c.oid and a.attname = 'learner_profile_id'
        where c.relkind = 'r' and a.attnum > 0 and not a.attisdropped
        order by 1`)).rows.map((r) => r.table_name);

    const offenders = [];
    for (const table of tables) {
      if (table === 'certificates') continue;
      const n = (await q(
        `select count(*)::int n from public.${table} where learner_profile_id = $1`,
        [learnerId])).rows[0].n;
      if (n > 0) offenders.push(`${table} (${n})`);
    }
    return { tables, offenders };
  }

  async function withFlag(key, fn) {
    const before = (await one(
      'select value_text from public.platform_settings where key = $1', [key])).value_text;
    await q('update public.platform_settings set value_text = $1 where key = $2', ['true', key]);
    try {
      return await fn();
    } finally {
      await q('update public.platform_settings set value_text = $1 where key = $2', [before, key]);
    }
  }

  // -------------------------------------------------------------------------
  console.log('\nAct I — a child who studies, and a guardian who pays');
  // -------------------------------------------------------------------------

  const guardian = await newUser('child-record-guardian@example.com');
  await newProfile(guardian, 'Amina Ssekandi');

  const family = await call(guardian, `select public.create_family('The Ssekandis') as r`);
  const child = await call(guardian,
    `select public.add_child_to_family($1, 'Maryam Ssekandi', '8-10') as r`, [family]);

  const course = await newCourse(teacher, { status: 'active' });
  const version = await newVersion(course, teacher);
  const section = await newSection(version);
  const lesson = await newLesson(section, { title: 'Letters', position: 1 });
  const transition = (status, actor) =>
    q('select id from public.set_course_version_status($1,$2,$3,$4)',
      [version, status, actor, 'child record']);
  await transition('submitted', teacher);
  await satisfyReview(version, reviewer, owner);
  await transition('approved', reviewer);
  await transition('published', owner);

  await committed(() => q(
    `insert into public.course_completion_policies
       (course_version_id, completion_mode, certificate_enabled, certificate_template_version)
     values ($1, 'all_lessons', true, 'child-v1')`, [version]));

  const enrolment = (await q(
    `insert into public.course_enrolments
       (learner_profile_id, course_id, course_version_id, source, status)
     values ($1, $2, $3, 'purchase', 'active') returning id`,
    [child, course, version])).rows[0].id;

  await q(`insert into public.lesson_progress
             (course_enrolment_id, lesson_id, status, progress_percent, started_at, completed_at)
           values ($1, $2, 'completed', 100, now(), now())`, [enrolment, lesson]);

  // A purchase, so the ledger has something to keep. The child is named on the
  // order, which is exactly the link that has to go while the money facts stay.
  const billing = (await q(
    `insert into public.billing_accounts
       (display_name, billing_country, billing_currency, created_by)
     values ('The Ssekandis', 'UG', 'UGX', $1) returning id`, [guardian])).rows[0].id;
  await q(`insert into public.billing_account_memberships
             (billing_account_id, user_id, status, granted_by)
           values ($1, $2, 'active', $2)
           on conflict (billing_account_id, user_id) do nothing`, [billing, guardian]);

  const order = (await q(
    `insert into public.orders
       (billing_account_id, currency_code, subtotal_minor, total_minor, status, learner_profile_id)
     values ($1, 'UGX', 25000, 25000, 'pending_payment', $2) returning id`,
    [billing, child])).rows[0].id;

  // A certificate, issued the way the product issues one.
  const certificate = (await q('select id from public.issue_certificate($1,$2)',
    [enrolment, owner])).rows[0].id;

  // A support case that names the child, because a case is a conversation about
  // somebody and the link to them is not part of the conversation.
  const supportCase = await withFlag('platform.support', () =>
    call(guardian,
      `select public.open_support_case('content', 'Lesson will not play',
         'The first lesson stalls after ten seconds on our tablet.', $1) as r`, [child]));

  await test('the child has a record worth deleting, and a certificate worth keeping', async () => {
    assert(await count('select 1 from public.course_enrolments where id = $1', [enrolment]) === 1);
    const cert = await one(
      'select course_enrolment_id, certificate_number from public.certificates where id = $1',
      [certificate]);
    assert(cert.course_enrolment_id === enrolment, 'the certificate was not issued against the enrolment');
    assert(cert.certificate_number.startsWith('AyahSpring') || cert.certificate_number.length > 0);
    assert((await one('select learner_profile_id from public.orders where id = $1', [order]))
      .learner_profile_id === child, 'the order does not name the child');
  });

  // -------------------------------------------------------------------------
  console.log('\nAct II — the guardian closes the account, and the clock starts');
  // -------------------------------------------------------------------------

  await test('closing the account takes the name and leaves the record, and says so', async () => {
    const receipt = await call(guardian, 'select public.erase_my_account($1) as r',
      ['Amina Ssekandi']);

    assert(receipt.closed === true, 'the account did not close');
    assert(receipt.learnersErased === 1, `closing the account erased ${receipt.learnersErased} learners`);

    const profile = await one(
      'select display_name, status, deleted_at from public.learner_profiles where id = $1', [child]);
    assert(profile.display_name === 'Deleted learner',
      `the child is still called ${profile.display_name}`);
    assert(profile.status === 'archived', `the profile is ${profile.status}`);
    assert(profile.deleted_at !== null, 'no clock started');

    // The record itself is still there — this is the gap, stated as a fixture.
    assert(await count('select 1 from public.course_enrolments where learner_profile_id = $1', [child]) === 1,
      'the enrolment went with the account, so this suite is testing nothing');
    assert(await count('select 1 from public.lesson_progress where course_enrolment_id = $1', [enrolment]) === 1);
  });

  await test('the sweep the purge is judged by would find the child today', async () => {
    // A sweep that finds nothing because it looks at nothing is the failure mode
    // of every "nothing left" assertion ever written. This is the control: before
    // the purge the same function names the tables that still point at her.
    const before = await sweepFor(child);
    assert(before.tables.length > 15,
      `the sweep only found ${before.tables.length} tables, so it is not reading the schema`);
    assert(before.offenders.length >= 2,
      `the sweep found nothing even before the purge (${before.offenders.join(', ')}), so it cannot prove anything`);
    assert(before.offenders.some((o) => o.startsWith('course_enrolments')),
      'the sweep did not see the enrolment it is about to delete');
  });

  await test('the plan puts the record on a thirty-day clock, not on nothing', async () => {
    const p = await plan(now);
    assert(p.policies.learnerRecord.days === 30,
      `the plan keeps a child's record for ${p.policies.learnerRecord.days} days`);
    assert(/children's policy/.test(p.policies.learnerRecord.source),
      'the plan does not say which document the thirty days come from');

    const due = await one(
      `select due_on::text as due_on, clock_started_at
         from public.retention_due_records where kind = 'learner_record' and id = $1`, [child]);
    const expected = new Date(new Date(due.clock_started_at).getTime() + 30 * DAY);
    assert(Math.abs(new Date(`${due.due_on}T00:00:00Z`) - expected) < 2 * DAY,
      `the record is due ${due.due_on}, not thirty days after the account closed`);
    assert(p.learnerRecords.due === 0, 'a record due in thirty days is reported as due today');
    assert(p.learnerRecords.nextDue !== null, 'the plan does not say when the next record falls due');
  });

  await test('the child record survives until the exact thirty-day instant', async () => {
    // The original child is not due yet. This second child gives the job an
    // isolated real deletion target without consuming the certificate fixture.
    const boundary = (await one(`insert into public.learner_profiles
      (display_name, learner_type, age_band, status, deleted_at, family_id)
      values ('Boundary child', 'child', '8-10', 'archived',
        date_trunc('day',now() at time zone 'UTC') at time zone 'UTC' - interval '732 hours', $1) returning id`, [family])).id;
    const deadline = (await one(`select (deleted_at + interval '720 hours')::text as at
      from public.learner_profiles where id=$1`, [boundary])).at;
    const before = (await call(owner, "select public.retention_plan($1::timestamptz - interval '1 microsecond') as r", [deadline]));
    const at = (await call(owner, 'select public.retention_plan($1::timestamptz) as r', [deadline]));
    assert(at.learnerRecords.due === before.learnerRecords.due + 1, 'plan did not count the exact boundary');
    const early = await call(owner, "select public.run_retention_jobs($1::timestamptz - interval '1 microsecond',5000) as r", [deadline]);
    assert(early.deleted.learnerRecords===0, 'cleanup reported an early erasure');
    assert((await one('select status from public.learner_profiles where id=$1',[boundary])).status==='archived', 'record was erased before its deadline');
    const done = await call(owner, 'select public.run_retention_jobs($1::timestamptz,5000) as r', [deadline]);
    assert(done.deleted.learnerRecords===1, 'the due record was not counted');
    assert((await one('select status from public.learner_profiles where id=$1',[boundary])).status==='erased', 'the record was not erased at its deadline');
    await runJobs(plus(now, 400 * DAY));
    assert((await one('select status from public.learner_profiles where id=$1',[child])).status==='archived', 'a future request bypassed the actual database clock');
    const source = (await one("select pg_get_functiondef('public.run_retention_jobs(timestamptz,integer)'::regprocedure) as source")).source;
    const lock = source.indexOf('perform 1 from public.learner_profiles lp where lp.id=v_one');
    const erase = source.indexOf('v_learner_result := public.purge_learner_record(v_one)', lock);
    assert(lock >= 0 && erase > lock && source.slice(lock,erase).includes('for update') &&
      source.slice(lock,erase).includes("lp.deleted_at + interval '720 hours' <= v_as_of_time"),
      'candidate clock is no longer rechecked while the profile is locked');
  });

  await test('a day early is not due, and the day itself is', async () => {
    await q(`update public.learner_profiles set deleted_at = now() - interval '29 days' where id = $1`,
      [child]);

    const early = await one(
      `select count(*)::int n from public.retention_due_records
        where kind = 'learner_record' and id = $1
          and due_on <= ($2::timestamptz at time zone 'UTC')::date`, [child, now]);
    assert(early.n === 0, 'a record twenty-nine days in is already due');

    const earlyRun = await runJobs(now);
    // The run is asked about every clock, so its own count is what matters here.
    assert(earlyRun.deleted.learnerRecords === 0, 'the run deleted a record a day early');
    assert(await count('select 1 from public.course_enrolments where learner_profile_id = $1', [child]) === 1,
      'the enrolment went a day early');

    await q(`update public.learner_profiles set deleted_at = $2::timestamptz - interval '720 hours' where id = $1`,
      [child, now]);
    const onTheDay = await one(
      `select count(*)::int n from public.retention_due_records
        where kind = 'learner_record' and id = $1
          and due_on <= ($2::timestamptz at time zone 'UTC')::date`, [child, now]);
    assert(onTheDay.n === 1, 'the thirtieth day is not yet due, so the period is longer than promised');
  });

  // -------------------------------------------------------------------------
  console.log('\nAct III — the purge, and the one thing that survives it');
  // -------------------------------------------------------------------------

  await test('the run deletes the record and keeps the certificate', async () => {
    const before = await plan(now);
    const done = await runJobs(now);

    assert(done.deleted.learnerRecords === 1,
      `the run erased ${done.deleted.learnerRecords} learner records`);
    assert(before.learnerRecords.due === 1, `the plan said ${before.learnerRecords.due} were due`);

    // The child's own record.
    assert(await count('select 1 from public.course_enrolments where learner_profile_id = $1', [child]) === 0,
      'the enrolment survived the purge');
    assert(await count('select 1 from public.lesson_progress where course_enrolment_id = $1', [enrolment]) === 0,
      'the lesson progress survived the purge');

    // The certificate, which is the whole point of the schema change.
    const cert = await one(
      `select certificate_number, status, course_title, course_enrolment_id, evidence_erased_at
         from public.certificates where id = $1`, [certificate]);
    assert(cert !== undefined && cert.status === 'issued', 'the certificate was deleted or revoked');
    assert(cert.course_enrolment_id === null, 'the certificate still points at a deleted enrolment');
    assert(cert.evidence_erased_at !== null, 'the certificate does not record that its evidence was erased');
    assert(cert.course_title.length > 0, 'the certificate snapshot was emptied');

    const verified = await one('select * from public.verify_certificate($1)',
      [cert.certificate_number]);
    assert(verified.valid === true, 'the certificate no longer verifies by its number');
    assert(verified.course_title.length > 0, 'verification returned no course');
  });

  await test('the ledger keeps the money and loses the child', async () => {
    const row = await one('select total_minor, status, learner_profile_id from public.orders where id = $1',
      [order]);
    assert(row.total_minor === 25000, 'the order total changed');
    assert(row.learner_profile_id === null, 'the order still names the child');
  });

  await test('the support case keeps the conversation and loses the link', async () => {
    const row = await one(
      'select subject, body, learner_profile_id from public.support_cases where id = $1',
      [supportCase]);
    assert(row.learner_profile_id === null, 'the case still names the child');
    assert(row.subject === '[erased]',
      'the case text was not erased when the account closed, so this is reading the wrong row');
  });

  await test('what is left is a tombstone, and it names nobody', async () => {
    const row = await one(
      `select display_name, status, erased_at, age_band, family_id, linked_user_id, learner_type
         from public.learner_profiles where id = $1`, [child]);
    assert(row.status === 'erased', `the profile is ${row.status}`);
    assert(row.erased_at !== null, 'the row does not say when its record was deleted');
    assert(row.display_name === 'Deleted learner', `the tombstone is still called ${row.display_name}`);
    assert(row.age_band === null, 'the tombstone kept an age band');
    assert(row.family_id === null, 'the tombstone is still attached to a family');
    assert(row.linked_user_id === null, 'the tombstone still points at an account');
    assert(row.learner_type === 'child', 'the type is part of the row, not of the person');
  });

  await test('nothing anywhere else still points at the child', async () => {
    const { tables, offenders } = await sweepFor(child);
    assert(tables.length > 15, `the sweep only found ${tables.length} tables`);
    assert(tables.includes('course_enrolments') && tables.includes('orders'),
      'the sweep missed a table it is known to have');
    assert(offenders.length === 0, `these still point at the child: ${offenders.join(', ')}`);

    // The certificate is the one exception, and it is the row the policy says
    // must survive.
    const kept = await count(
      'select 1 from public.certificates where learner_profile_id = $1', [child]);
    assert(kept === 1, 'the certificate row is not the one exception the sweep allows');
  });

  await test('the run says what it did, and running it again changes nothing', async () => {
    const event = await one(
      `select detail from public.governance_audit_events
        where action = 'retention.purged' order by occurred_at desc limit 1`);
    assert(event.detail.learnerRecords === 1, 'the audit entry does not record the deleted record');

    const again = await runJobs(now);
    assert(again.deleted.learnerRecords === 0, 'a second run erased the same child again');

    const p = await plan(now);
    assert(p.learnerRecords.erasedToDate >= 1, 'the plan does not report how many records have been erased');
    assert(p.learnerRecords.due === 0, 'the erased record is still reported as due');
  });

  // -------------------------------------------------------------------------
  console.log('\nAct IV — the children this clock must not take');
  // -------------------------------------------------------------------------

  await test('a child whose guardian is still here is not on the clock at all', async () => {
    const parent = await newUser('child-record-parent@example.com');
    await newProfile(parent, 'Yusuf Muwanga');
    const fam = await call(parent, `select public.create_family('The Muwangas') as r`);
    const kept = await call(parent,
      `select public.add_child_to_family($1, 'Bilal Muwanga', '11-13') as r`, [fam]);

    const enrol = (await q(
      `insert into public.course_enrolments
         (learner_profile_id, course_id, course_version_id, source, status)
       values ($1, $2, $3, 'free', 'active') returning id`, [kept, course, version])).rows[0].id;

    const p = await plan(now);
    const onClock = await count(
      `select 1 from public.retention_due_records
        where kind = 'learner_record' and id = $1`, [kept]);
    assert(onClock === 0, 'a child whose guardian never closed an account is on the clock');
    assert(p.learnerRecords.due === 0);

    // And a run far in the future still does not take them: the clock is not a
    // timeout on childhood, it is a consequence of the account closing.
    await runJobs(plus(now, 400 * DAY));
    assert(await count('select 1 from public.course_enrolments where id = $1', [enrol]) === 1,
      'a run four hundred days later deleted a child whose parent is still here');

    await q('delete from public.course_enrolments where id = $1', [enrol]);
  });

  await test('an adult closing their own account is not this clock', async () => {
    // `/account/delete` tells an adult their enrolments and progress are kept.
    // Whether that should change is the owner's call; what must not happen is
    // this job quietly deciding for them.
    const adult = await newUser('child-record-adult@example.com');
    await newProfile(adult, 'Khadija Nakato');
    const profile = (await q(
      `insert into public.learner_profiles (display_name, learner_type, age_band, linked_user_id)
       values ('Khadija Nakato', 'adult', '18+', $1) returning id`, [adult])).rows[0].id;

    await call(adult, 'select public.erase_my_account($1) as r', ['Khadija Nakato']);
    await q(`update public.learner_profiles set deleted_at = now() - interval '90 days' where id = $1`,
      [profile]);

    const onClock = await count(
      `select 1 from public.retention_due_records
        where kind = 'learner_record' and id = $1`, [profile]);
    assert(onClock === 0, 'an adult profile is on the children\'s clock');

    const before = (await one('select status from public.learner_profiles where id = $1', [profile])).status;
    await runJobs(now);
    const after = (await one('select status from public.learner_profiles where id = $1', [profile])).status;
    assert(before === after, 'the run changed an adult profile');
  });

  await test('nobody can call the purge directly, and it refuses an adult if they could', async () => {
    const privilege = await one(
      `select has_function_privilege('authenticated', 'public.purge_learner_record(uuid)', 'execute') as can,
              has_function_privilege('anon', 'public.purge_learner_record(uuid)', 'execute') as anon_can`);
    assert(privilege.can === false && privilege.anon_can === false,
      'the per-child purge is executable from a session, which is a second door with no gate');

    const adult = await one(
      `select id from public.learner_profiles where learner_type = 'adult' and status = 'archived' limit 1`);
    if (adult) {
      await rejects(() => q('select public.purge_learner_record($1)', [adult.id]),
        /learner:not_a_child/);
    }
  });

  await test('a certificate cannot be re-attached, and its erasure cannot be undone', async () => {
    await rejects(() => q(
      'update public.certificates set course_enrolment_id = $2 where id = $1',
      [certificate, enrolment]), /cannot be re-attached/);

    await rejects(() => q(
      'update public.certificates set evidence_erased_at = null where id = $1',
      [certificate]), /already recorded/);
  });

  await test('an enrolment cannot vanish without the certificate saying why', async () => {
    // The foreign key is `on delete set null`, which is what lets the purge keep
    // the certificate — but a null with no explanation reads as a broken row. The
    // guard makes the explanation compulsory, and this proves it by trying to
    // delete an enrolment out from under a live certificate.
    const parent = await newUser('child-record-guardian-two@example.com');
    await newProfile(parent, 'Halima Nakato');
    const fam = await call(parent, `select public.create_family('The Nakatos') as r`);
    const learner = await call(parent,
      `select public.add_child_to_family($1, 'Sumayya Nakato', '8-10') as r`, [fam]);

    const enrol = (await q(
      `insert into public.course_enrolments
         (learner_profile_id, course_id, course_version_id, source, status)
       values ($1, $2, $3, 'free', 'active') returning id`, [learner, course, version])).rows[0].id;
    await q(`insert into public.lesson_progress
               (course_enrolment_id, lesson_id, status, progress_percent, completed_at)
             values ($1, $2, 'completed', 100, now())`, [enrol, lesson]);
    const cert = (await q('select id from public.issue_certificate($1,$2)',
      [enrol, owner])).rows[0].id;

    // The progress rows go first, the way the purge does it: the enrolment is
    // `on delete restrict` from everything else, so the certificate's own null is
    // the last thing that could stop the delete — which is the thing under test.
    await q('delete from public.lesson_progress where course_enrolment_id = $1', [enrol]);
    await rejects(() => q('delete from public.course_enrolments where id = $1', [enrol]),
      /lost its enrolment without recording why/);
    assert(await count('select 1 from public.course_enrolments where id = $1', [enrol]) === 1,
      'the enrolment went anyway');

    // Recording why first is the only way through, and it leaves a verifying
    // certificate behind it.
    await q(`update public.certificates set course_enrolment_id = null, evidence_erased_at = now()
              where id = $1`, [cert]);
    await q('delete from public.course_enrolments where id = $1', [enrol]);
    const number = (await one('select certificate_number from public.certificates where id = $1',
      [cert])).certificate_number;
    const verified = await one('select valid from public.verify_certificate($1)', [number]);
    assert(verified.valid === true, 'a certificate whose evidence was removed no longer verifies');
  });
  await test('a held support case keeps its child link through purge and clears it at release', async () => {
    const prior=await one('select owner_user_id,configured_at from public.safeguarding_owner where singleton');
    await q('delete from public.safeguarding_owner where singleton');
    await q('select public.bootstrap_safeguarding_owner($1)',[owner]);
    try {
      const g=await newUser('child-held-support-guardian@example.com');
      await newProfile(g,'Case Guardian');
      const f=await call(g,"select public.create_family('Case family') as r");
      const c=await call(g,"select public.add_child_to_family($1,'Case child','8-10') as r",[f]);
      const held=await withFlag('platform.support',()=>call(g,"select public.open_support_case('other','Held child case','Held case text',$1) as r",[c]));
      const ordinary=await withFlag('platform.support',()=>call(g,"select public.open_support_case('other','Other child case','Other case text',$1) as r",[c]));
      await call(owner,"select public.change_support_case_cleanup_hold($1,'hold','Safety review') as r",[held]);
      assert((await call(g,'select public.erase_my_account($1) as r',['Case Guardian'])).closed===true);
      const result=(await q('select public.purge_learner_record($1) as r',[c])).rows[0].r;
      assert(result.erased===true && result.heldSupportCaseLinks===1 && result.nothingLeft===false,'purge did not disclose the held link');
      assert((await one('select learner_profile_id from public.support_cases where id=$1',[held])).learner_profile_id===c,'held child link was lost');
      assert((await one('select learner_profile_id from public.support_cases where id=$1',[ordinary])).learner_profile_id===null,'ordinary child link survived');
      assert((await one('select status from public.learner_profiles where id=$1',[c])).status==='erased','child purge was blocked');
      assert(!(await one("select has_table_privilege('authenticated','public.support_case_deferred_child_links','select') as can")).can,'deferred links are exposed');
      await call(owner,"select public.change_support_case_cleanup_hold($1,'release','Review complete') as r",[held]);
      assert((await one('select learner_profile_id from public.support_cases where id=$1',[held])).learner_profile_id===null,'released link was not removed');
      assert(await count('select 1 from public.support_case_deferred_child_links where case_id=$1',[held])===0,'released task remains');
    } finally {
      await q('delete from public.safeguarding_owner where singleton');
      if(prior) await q('insert into public.safeguarding_owner(singleton,owner_user_id,configured_at) values(true,$1,$2)',[prior.owner_user_id,prior.configured_at]);
    }
  });

}
