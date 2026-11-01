// A handed-in photograph now has an end date, and the database enforces it.
//
// The owner answered the question on 2026-11-01 — a file a child hands in is kept
// for a year after the class ends — and the gap this suite is written around is
// the one that made the answer urgent: the children's thirty-day clock deletes a
// child's submissions, the attachment rows cascade away with them, and the file
// itself stayed in the bucket belonging to nobody the database could name.
//
// Four acts, in the order the damage would happen:
//
//   I.   The clock itself, from both sides: a class that ends later holds the file
//        longer, an erased record shortens it, and neither can be talked into a
//        date by a client.
//   II.  What happens when the record goes: the file is unwatchable at once, by
//        everybody including staff, and its bytes fall due rather than staying
//        forever.
//   III. The press: what is due goes, what is held does not, and a hold needs a
//        written reason at both ends.
//   IV.  The queue this database cannot empty. A tombstone is not a deletion, and
//        the screen has to say so with a key a person can act on.

export async function run(ctx) {
  const {
    q, test, assert, committed,
    newUser, newProfile, bootstrapAdmin, newInstructor, newReviewer, satisfyReview,
    newCourse, newVersion, newSection, newLesson,
  } = ctx;

  const owner = await bootstrapAdmin('coursework-retention-owner@example.com');
  const governance = await newUser('coursework-retention-governance@example.com');
  await newProfile(governance, 'Hafsa Nakato');
  await committed(() => ctx.grantRole(governance, 'governance_admin', owner));
  const agent = await newUser('coursework-retention-agent@example.com');
  await newProfile(agent, 'Musa Kigozi');
  await committed(() => ctx.grantRole(agent, 'support_agent', owner));
  const teacher = await newInstructor('coursework-retention-teacher@example.com', owner);
  const reviewer = await newReviewer('coursework-retention-reviewer@example.com', owner);

  const scalar = async (sql, params = []) => (await q(sql, params)).rows[0];

  async function asActor(actor, fn) {
    await q('begin');
    await q('select set_config(' + "'request.jwt.claims'" + ',$1,true)',
      [JSON.stringify({ sub: actor, role: 'authenticated' })]);
    await q('set local role authenticated');
    try {
      const result = await fn();
      await q('commit');
      return result;
    } catch (e) {
      await q('rollback');
      throw e;
    }
  }

  const call = async (actor, sql, params = []) =>
    (await asActor(actor, () => q(sql, params))).rows[0];

  async function refuses(pattern, fn) {
    let caught;
    try { await fn(); } catch (e) { caught = e; }
    assert(caught, `expected an error matching ${pattern}`);
    const message = String(caught.message ?? caught);
    assert(pattern.test(message), `expected ${pattern}; got: ${message.slice(0, 240)}`);
  }

  const transition = (versionId, status, actor) =>
    q('select id from public.set_course_version_status($1,$2,$3,$4)',
      [versionId, status, actor, 'coursework retention test']);

  async function publishedCourse() {
    const course = await newCourse(teacher, { status: 'active' });
    const version = await newVersion(course, teacher);
    const section = await newSection(version);
    await newLesson(section);
    await transition(version, 'submitted', teacher);
    await transition(version, 'approved', reviewer);
    await satisfyReview(version, reviewer, owner);
    await transition(version, 'published', owner);
    return { course, version };
  }

  const { course, version } = await publishedCourse();

  await q("update public.platform_settings set value_text='true' where key='learning.assignments'");
  await q("update public.platform_settings set value_text='true' where key='learning.cohorts'");

  let seq = 0;
  async function learner(name, cohortId = null) {
    seq += 1;
    const userId = await newUser(`coursework-retention-learner-${seq}@example.com`);
    await newProfile(userId, `${name} ${seq}`);
    const learnerId = await committed(async () => {
      const id = (await q(
        `insert into public.learner_profiles (display_name, learner_type, age_band, linked_user_id)
         values ($1,'adult','18+',$2) returning id`, [`${name} ${seq}`, userId])).rows[0].id;
      await q(
        `insert into public.course_enrolments
           (learner_profile_id, course_id, course_version_id, source, status)
         values ($1,$2,$3,'free','active')`, [id, course, version]);
      if (cohortId) {
        await q(
          `insert into public.cohort_members
             (cohort_id, learner_profile_id, status, joined_at, added_by)
           values ($1,$2,'active',now(),$3)`, [cohortId, id, teacher]);
      }
      return id;
    });
    return { userId, learnerId };
  }

  const createAssignment = async (over = {}) => {
    // A cohort task is dated absolutely; a self-paced one is a number of days
    // after enrolment. The writer refuses both at once, so the default follows
    // the cohort rather than making every caller remember.
    const cohortDue = over.cohortId
      ? (over.dueAt ?? new Date(Date.now() + 30 * 86_400_000).toISOString())
      : null;
    const id = (await call(teacher, 'select public.create_course_assignment($1,$2,$3,$4,$5,$6,$7,$8) as id', [
      version,
      over.cohortId ?? null,
      over.title ?? `Hand-in ${++seq}`,
      over.instructions ?? 'One page, in your own hand.',
      over.cohortId ? null : (over.dueAfterDays ?? 7),
      over.cohortId ? cohortDue : (over.dueAt ?? null),
      over.acceptLate ?? false,
      over.pointsPossible ?? 10,
    ])).id;
    await call(teacher, 'select public.set_course_assignment_status($1,$2)', [id, 'open']);
    return id;
  };

  const digest = () => crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');

  /** A submission with one file attached, the way a family hands one in. */
  async function handedIn(assetSize = 1_800_000) {
    const who = await learner('Handing in');
    const assignment = await createAssignment();
    const submission = (await call(who.userId, 'select public.save_assignment_draft($1,$2,$3) as id',
      [assignment, who.learnerId, 'My page.'])).id;
    const declared = await call(who.userId,
      'select * from public.register_coursework_upload($1,$2,$3,$4,$5)',
      [submission, 'Page one.jpg', 'image/jpeg', assetSize, digest()]);
    const asset = declared.asset_id;
    await call(who.userId, 'select public.confirm_coursework_upload($1) as id', [asset]);
    await call(who.userId, 'select public.submit_assignment($1)', [submission]);
    return { ...who, assignment, submission, asset };
  }

  /** Backdates everything the clock reads, so a boundary can be walked. */
  const backdate = (row, interval) => committed(async () => {
    await q(`update public.assignment_submission_assets
                set created_at = now() - $2::interval
              where media_asset_id = $1`, [row.asset, interval]);
    await q(`update public.assignment_submissions
                set created_at = now() - $2::interval,
                    submitted_at = now() - $2::interval
              where id = $1`, [row.submission, interval]);
  });

  const retentionRows = async (row) =>
    (await q('select * from public.coursework_file_retention where asset_id = $1',
      [row.asset])).rows[0];

  const plan = async (actor = owner) =>
    (await call(actor, 'select public.coursework_retention_plan() as p')).p;

  const purge = async (actor = owner) =>
    (await call(actor, 'select public.purge_coursework_files() as p')).p;

  // -------------------------------------------------------------------------
  console.log('\nAct I — the clock, and which anchor it starts from');
  // -------------------------------------------------------------------------

  await test('a handed-in file is due a year after it was handed in', async () => {
    const row = await handedIn();
    const record = await retentionRows(row);
    assert(record, 'the file has no retention row at all');
    assert(record.basis === 'handed_in', `basis ${record.basis}`);
    const due = new Date(record.due_on);
    const days = (due.getTime() - Date.now()) / 86_400_000;
    assert(days > 360 && days < 371, `due in ${Math.round(days)} days, not about a year`);
  });

  await test('a class that ends later holds the file longer, and says so', async () => {
    const cohort = (await call(teacher,
      `select public.create_cohort($1,$2,$3,$4, now() + interval '1 day', null, null) as id`,
      [course, version, 'A dated class', 'A class with an end date'])).id;
    await call(teacher, "select public.set_cohort_status($1,'open')", [cohort]);

    const who = await learner('Cohort learner', cohort);
    const assignment = await createAssignment({ cohortId: cohort });

    const submission = (await call(who.userId, 'select public.save_assignment_draft($1,$2,$3) as id',
      [assignment, who.learnerId, 'Cohort work.'])).id;
    const declared = await call(who.userId,
      'select * from public.register_coursework_upload($1,$2,$3,$4,$5)',
      [submission, 'Cohort page.jpg', 'image/jpeg', 900_000, digest()]);
    const asset = declared.asset_id;
    await call(who.userId, 'select public.confirm_coursework_upload($1) as id', [asset]);
    await call(who.userId, 'select public.submit_assignment($1)', [submission]);

    // Backdated only once every writer has accepted them. The clock is what is
    // under test, and a cohort, a task deadline and a hand-in may not be
    // *created* already finished — rules worth keeping, obeyed by this fixture.
    //
    // The class ended a year ago and the hand-in happened two years ago, so the
    // later anchor is the class: the file is due now, not a year ago.
    await q(`update public.cohorts
                set starts_at      = now() - interval '3 years',
                    join_closes_at = now() - interval '2 years',
                    ends_at        = now() - interval '1 year'
              where id = $1`, [cohort]);
    await q(`update public.course_assignments
                set due_at = now() - interval '2 years'
              where id = $1`, [assignment]);
    await q(`update public.assignment_submission_assets set created_at = now() - interval '2 years'
              where media_asset_id = $1`, [asset]);
    await q(`update public.assignment_submissions
                set created_at = now() - interval '2 years',
                    submitted_at = now() - interval '2 years'
              where id = $1`, [submission]);

    const record = await retentionRows({ asset });
    assert(record.basis === 'class_end', `basis ${record.basis}`);
    const days = (new Date(record.due_on).getTime() - Date.now()) / 86_400_000;
    assert(Math.abs(days) < 2, `due ${Math.round(days)} days from now, expected today`);
  });

  await test('an erased learning record shortens the clock and never lengthens it', async () => {
    const row = await handedIn();
    await committed(() => q(
      `update public.learner_profiles set deleted_at = now() - interval '40 days' where id = $1`,
      [row.learnerId]));

    const record = await retentionRows(row);
    assert(record.basis === 'erasure', `basis ${record.basis}`);
    const days = (new Date(record.due_on).getTime() - Date.now()) / 86_400_000;
    // Thirty days after a record erased forty days ago is ten days past.
    assert(days < -8 && days > -12, `due ${Math.round(days)} days from now, expected ten days ago`);
  });

  // -------------------------------------------------------------------------
  console.log('\nAct II — when the record goes, the file stops being watchable');
  // -------------------------------------------------------------------------

  await test('deleting the submission tombstones the file and starts the byte clock', async () => {
    const row = await handedIn();
    assert((await call(teacher, 'select public.may_watch_master($1) as w', [row.asset])).w === true,
      'the marker could not open a file that was just handed in');

    await committed(() => q('delete from public.assignment_submissions where id = $1', [row.submission]));

    const asset = await scalar(
      'select status, deleted_at, purge_due_at, purged_at from public.media_assets where id = $1',
      [row.asset]);
    assert(asset.status === 'deleted', `status ${asset.status}`);
    assert(asset.deleted_at, 'the file was not tombstoned when its submission went');
    assert(asset.purged_at === null, 'the bytes were recorded as deleted by a trigger');

    const days = (new Date(asset.purge_due_at).getTime() - Date.now()) / 86_400_000;
    assert(days > 29 && days < 31, `bytes due in ${Math.round(days)} days, expected thirty`);
  });

  await test('and then nobody can watch it — not the teacher, not the family, not staff', async () => {
    const row = await handedIn();
    await committed(() => q('delete from public.assignment_submissions where id = $1', [row.submission]));

    for (const [who, name] of [[teacher, 'teacher'], [owner, 'owner'], [row.userId, 'family']]) {
      const watched = await call(who, 'select public.may_watch_master($1) as w', [row.asset]);
      assert(watched.w === false, `${name} could still watch a file whose submission had been deleted`);
    }
  });

  // -------------------------------------------------------------------------
  console.log('\nAct III — the press, and what it refuses');
  // -------------------------------------------------------------------------

  await test('a file inside its year survives the press, and is counted as next', async () => {
    const row = await handedIn();
    const before = await purge();
    const asset = await scalar('select deleted_at from public.media_assets where id = $1', [row.asset]);
    assert(asset.deleted_at === null, 'a file inside its year was deleted');
    assert(before.remaining >= 0);

    const summary = await plan();
    assert(summary.files.nextDue, 'the plan does not say when anything is next due');
  });

  await test('a file whose year is up is deleted, unwatchable, and audited without a name', async () => {
    const row = await handedIn();
    await backdate(row, '2 years');

    const watched = await call(teacher, 'select public.may_watch_master($1) as w', [row.asset]);
    assert(watched.w === true, 'a file past its date could not be watched before the press ran');

    const run = await purge();
    assert(run.deleted >= 1, `the press deleted ${run.deleted} files`);
    assert(run.awaitingStorage >= 1, 'the bytes were not queued for storage');

    const asset = await scalar('select status, deleted_at, purge_due_at from public.media_assets where id = $1',
      [row.asset]);
    assert(asset.status === 'deleted', `status ${asset.status}`);
    assert(asset.purge_due_at, 'a deleted file has no byte date; nothing would ever queue it');

    const after = await call(teacher, 'select public.may_watch_master($1) as w', [row.asset]);
    assert(after.w === false, 'the teacher could still watch a deleted file');

    const audit = await scalar(
      `select detail from public.governance_audit_events
        where action = 'retention.coursework_files_deleted'
        order by occurred_at desc limit 1`);
    assert(audit, 'the deletion was not audited');
    assert(!JSON.stringify(audit.detail).includes('Page one'), 'the audit entry carried a file name');
  });

  await test('a hold stops the press, needs a reason at both ends, and only staff may set one', async () => {
    const row = await handedIn();
    await backdate(row, '2 years');

    await refuses(/written reason/, () =>
      call(governance, 'select public.hold_coursework_file($1,$2)', [row.asset, 'x']));
    await refuses(/only governance staff or the owner/, () =>
      call(agent, 'select public.hold_coursework_file($1,$2)', [row.asset, 'a safeguarding question']));
    await refuses(/only governance staff or the owner/, () =>
      call(teacher, 'select public.hold_coursework_file($1,$2)', [row.asset, 'a safeguarding question']));

    await call(governance, 'select public.hold_coursework_file($1,$2)',
      [row.asset, 'A safeguarding case names this file']);

    const run = await purge();
    assert(run.held >= 1, 'the held file was not counted');
    const asset = await scalar('select deleted_at from public.media_assets where id = $1', [row.asset]);
    assert(asset.deleted_at === null, 'the press deleted a file that was on hold');

    await refuses(/written reason/, () =>
      call(governance, 'select public.release_coursework_hold($1,$2)', [row.asset, 'ok']));
    await call(governance, 'select public.release_coursework_hold($1,$2)',
      [row.asset, 'The case was closed with no concern']);

    const again = await purge();
    assert(again.deleted >= 1, 'releasing the hold did not put the file back in front of the press');
  });

  await test('only the owner runs the press', async () => {
    await refuses(/retention:not_allowed/, () => call(governance, 'select public.purge_coursework_files()'));
    await refuses(/retention:not_allowed/, () => call(agent, 'select public.purge_coursework_files()'));
    await refuses(/retention:not_allowed/, () => call(teacher, 'select public.coursework_retention_plan()'));
  });

  // -------------------------------------------------------------------------
  console.log('\nAct IV — the queue this database cannot empty');
  // -------------------------------------------------------------------------

  await test('a tombstone is not a deletion, and the queue names the object', async () => {
    const row = await handedIn();
    await backdate(row, '2 years');
    await purge();

    const listed = (await asActor(owner,
      () => q('select * from public.coursework_bytes_awaiting(500)'))).rows
      .find((r) => r.asset_id === row.asset);
    assert(listed, 'the tombstoned object is not in the storage queue');
    assert(listed.master_bucket && listed.master_key, 'the queue gives no key to delete');
  });

  await test('recording the deletion refuses before it happened, and counts down after', async () => {
    const row = await handedIn();
    await refuses(/still readable/, () =>
      call(owner, 'select public.record_coursework_purge($1)', [row.asset]));

    await backdate(row, '2 years');
    await purge();

    const before = (await plan()).storage.awaiting;
    const recorded = await call(owner, 'select public.record_coursework_purge($1) as ok', [row.asset]);
    assert(recorded.ok === true, 'the recorded deletion was refused');

    // A second call is a no-op, not a second audit entry.
    const again = await call(owner, 'select public.record_coursework_purge($1) as ok', [row.asset]);
    assert(again.ok === false, 'the same deletion was recorded twice');

    const after = (await plan()).storage.awaiting;
    assert(after === before - 1, `awaiting went ${before} -> ${after}`);
  });

  await test('the whole cleanup includes the fourth clock, and reports what it held', async () => {
    const row = await handedIn();
    await backdate(row, '2 years');

    const run = await call(owner, 'select public.run_retention_jobs() as r');
    assert(run.r.deleted.courseworkFiles >= 1, `courseworkFiles ${run.r.deleted.courseworkFiles}`);
    assert(run.r.held.courseworkFiles !== undefined, 'the run does not report held files');
    assert(run.r.audited === true);

    const asset = await scalar('select deleted_at from public.media_assets where id = $1', [row.asset]);
    assert(asset.deleted_at, 'the combined run did not delete a due file');
  });
}
