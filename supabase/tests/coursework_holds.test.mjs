// Who is holding a child's file, and why — and the bucket nobody can reach from here.
//
// The clock shipped with a writer and no register. The permission split made the
// gap visible: holds are governance work or the owner's, the plan is the owner's
// alone, so a governance admin could place a hold and never read it back. Two
// people could hold two files and neither could see the other's, and a hold nobody
// can review is a hold nobody can release — which turns "not yet" into "for ever".
//
// These tests are about the two things a register has to get right: the list is
// readable by the people who can act on it, and it tells the truth about what it
// is holding. A hold on a file that has already gone keeps nothing, and a
// deletion recorded before it happened is the failure the queue exists to prevent.

export async function run(ctx) {
  const {
    q, test, assert, rejects, committed,
    newUser, newProfile, bootstrapAdmin, newInstructor, newReviewer, satisfyReview,
    newCourse, newVersion, newSection, newLesson,
  } = ctx;

  const owner = await bootstrapAdmin('holds-owner@example.com');
  const governance = await newUser('holds-governance@example.com');
  await newProfile(governance, 'Hafsa Nakato');
  await committed(() => ctx.grantRole(governance, 'governance_admin', owner));
  const agent = await newUser('holds-agent@example.com');
  await newProfile(agent, 'Musa Kigozi');
  await committed(() => ctx.grantRole(agent, 'support_agent', owner));
  const teacher = await newInstructor('holds-teacher@example.com', owner);
  const reviewer = await newReviewer('holds-reviewer@example.com', owner);

  const eq = (actual, expected, what) =>
    assert(actual === expected,
      `${what}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);

  async function asActor(actor, fn) {
    await q('begin');
    await q(`select set_config('request.jwt.claims',$1,true)`,
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

  const holdList = async (actor = governance) =>
    (await asActor(actor, () => q('select * from public.coursework_holds()'))).rows;

  const transition = (versionId, status, actor) =>
    q('select id from public.set_course_version_status($1,$2,$3,$4)',
      [versionId, status, actor, 'coursework holds test']);

  // One published course, one learner, one handed-in file. The clock only exists
  // for a file that arrived through the real path, so the fixture walks it.
  const course = await newCourse(teacher, { status: 'active' });
  const version = await newVersion(course, teacher);
  const section = await newSection(version);
  await newLesson(section);
  await transition(version, 'submitted', teacher);
  await transition(version, 'approved', reviewer);
  await satisfyReview(version, reviewer, owner);
  await transition(version, 'published', owner);

  await q("update public.platform_settings set value_text='true' where key='learning.assignments'");

  const digest = () => crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');

  /** A learner who hands one file in, the way a family does it. */
  let seq = 0;
  async function handIn(name) {
    seq += 1;
    const learnerUser = await newUser(`holds-learner-${seq}@example.com`);
    await newProfile(learnerUser, name);
    const learnerId = await committed(async () => {
      const id = (await q(
        `insert into public.learner_profiles (display_name, learner_type, age_band, linked_user_id)
         values ($1,'adult','18+',$2) returning id`, [name, learnerUser])).rows[0].id;
      await q(
        `insert into public.course_enrolments
           (learner_profile_id, course_id, course_version_id, source, status)
         values ($1,$2,$3,'free','active')`, [id, course, version]);
      return id;
    });

    const assignment = (await call(teacher,
      'select public.create_course_assignment($1,$2,$3,$4,$5,$6,$7,$8) as id',
      [version, null, `Hand-in ${seq}`, 'One page, in your own hand.', 7, null, false, 10])).id;
    await call(teacher, 'select public.set_course_assignment_status($1,$2)', [assignment, 'open']);

    const submission = (await call(learnerUser,
      'select public.save_assignment_draft($1,$2,$3) as id',
      [assignment, learnerId, 'My page.'])).id;
    const declared = await call(learnerUser,
      'select * from public.register_coursework_upload($1,$2,$3,$4,$5)',
      [submission, 'Page one.jpg', 'image/jpeg', 1_800_000, digest()]);
    const asset = declared.asset_id;
    await call(learnerUser, 'select public.confirm_coursework_upload($1) as id', [asset]);
    await call(learnerUser, 'select public.submit_assignment($1)', [submission]);
    return { learnerUser, learnerId, assignment, submission, asset };
  }

  // Two files: one the hold tests carry through to a tombstone, and one kept
  // readable so the refusal in Act IV is proved on something that is still there.
  const first = await handIn('Yusuf');
  const asset = first.asset;
  const submission = first.submission;
  const second = await handIn('Amina');

  // -------------------------------------------------------------------------
  console.log('\nAct I — who may read the register');
  // -------------------------------------------------------------------------

  await test('a support agent cannot read who is holding a child’s file', async () => {
    await rejects(
      () => asActor(agent, () => q('select * from public.coursework_holds()')),
      /not_allowed/);
    await rejects(
      () => asActor(agent, () => q('select public.coursework_hold_count()')),
      /not_allowed/);

    // …and a visitor with no account is refused before anything else.
    await rejects(
      () => ctx.asAnon(() => q('select * from public.coursework_holds()')),
      /not_allowed/);
  });

  await test('the register is empty until somebody holds a file', async () => {
    const rows = await holdList(governance);
    eq(rows.length, 0, 'holds on a fresh clock');

    const count = (await call(governance, 'select public.coursework_hold_count() as c')).c;
    eq(count.held, 0, 'the held count');
    eq(count.holdingNothing, 0, 'holds on files that are gone');
  });

  // -------------------------------------------------------------------------
  console.log('\nAct II — a hold says who, why, and whether the file is there');
  // -------------------------------------------------------------------------

  await test('a hold appears with its reason, its author and its date', async () => {
    await call(governance, 'select public.hold_coursework_file($1,$2)',
      [asset, 'A safeguarding concern is open about this photograph.']);

    const rows = await holdList(governance);
    eq(rows.length, 1, 'holds after one was placed');
    eq(rows[0].asset_id, asset, 'the file held');
    eq(rows[0].reason, 'A safeguarding concern is open about this photograph.',
      'the reason the next reader needs');
    eq(rows[0].opened_by_name, 'Hafsa Nakato', 'who placed the hold');
    eq(rows[0].still_readable, true, 'the file is still there');
    assert(rows[0].due_on !== null,
      'the hold lost the date it is holding the file past');

    const count = (await call(governance, 'select public.coursework_hold_count() as c')).c;
    eq(count.held, 1, 'the held count');
    eq(count.holdingNothing, 0, 'a hold on a file that is still there');
  });

  await test('the owner reads the same register, and cannot double-hold a file', async () => {
    const rows = await holdList(owner);
    eq(rows.length, 1, 'the owner sees the governance hold');

    await rejects(
      () => asActor(owner, () => q('select public.hold_coursework_file($1,$2)',
        [asset, 'Holding it again for a different reason.'])),
      /already held/);
    eq((await holdList()).length, 1, 'a second hold was created for one file');
  });

  await test('releasing puts the file back on the clock and empties the register', async () => {
    await call(governance, 'select public.release_coursework_hold($1,$2)',
      [asset, 'The concern is closed and the record can go.']);

    eq((await holdList()).length, 0, 'holds after release');

    const retention = (await q(
      'select held, due_on from public.coursework_file_retention where asset_id = $1',
      [asset])).rows[0];
    eq(retention.held, false, 'the retention row still says it is held');
    assert(retention.due_on !== null,
      'a released file has no date, so the clock would never reach it');

    const count = (await call(governance, 'select public.coursework_hold_count() as c')).c;
    eq(count.held, 0, 'the held count after release');
  });

  // -------------------------------------------------------------------------
  console.log('\nAct III — a hold on a file that has gone keeps nothing');
  // -------------------------------------------------------------------------

  await test('a hold outliving its file is counted, and says so', async () => {
    await call(governance, 'select public.hold_coursework_file($1,$2)',
      [asset, 'The concern is still open.']);

    // The submission is erased the way the clock does it: the row goes, the
    // attachment cascades, and the asset is tombstoned in the same transaction.
    await committed(async () => {
      await q('delete from public.assignment_submissions where id = $1', [submission]);
    });

    const rows = await holdList(governance);
    eq(rows.length, 1, 'the hold outlives the submission');
    eq(rows[0].still_readable, false,
      'a hold on a deleted file reports the file as readable');

    const count = (await call(governance, 'select public.coursework_hold_count() as c')).c;
    eq(count.held, 1, 'the held count');
    eq(count.holdingNothing, 1, 'holds that are holding nothing');

    // Releasing still works, and is the only way to stop the register lying.
    await call(governance, 'select public.release_coursework_hold($1,$2)',
      [asset, 'Releasing a hold on a file that no longer exists.']);
    eq((await holdList()).length, 0, 'holds after releasing a dead one');
  });

  // -------------------------------------------------------------------------
  console.log('\nAct IV — the bucket, and the refusal that keeps it honest');
  // -------------------------------------------------------------------------

  await test('a deletion cannot be recorded for a file that is still readable', async () => {
    const readable = (await q('select deleted_at from public.media_assets where id = $1',
      [second.asset])).rows[0].deleted_at;
    eq(readable, null, 'the second fixture file is still readable');

    await rejects(
      () => asActor(owner, () => q('select public.record_coursework_purge($1)', [second.asset])),
      /still readable/);
  });

  await test('a tombstoned object is queued, and recording the deletion empties it', async () => {
    // The clock's own press: the file is unwatchable and its bytes fall due. The
    // status transition guard needs the setting the cleanup function sets, because
    // a media status is not something a screen may change by hand.
    // `set_config(..., true)` is transaction-local, so the setting and the write it
    // permits have to be in one transaction — the same shape `purge_coursework_files`
    // uses when it does this itself.
    await committed(async () => {
      await q(`select set_config('app.media_status_transition','on',true)`);
      await q(`update public.media_assets
                  set status = 'deleted', deleted_at = now(), purge_due_at = now()
                where id = $1`, [second.asset]);
    });

    const queued = (await asActor(owner,
      () => q('select * from public.coursework_bytes_awaiting()'))).rows;
    const mine = queued.find((row) => row.asset_id === second.asset);
    assert(mine, 'a tombstoned coursework file is not in the storage queue');
    assert(mine.master_key, 'the queue carries no key for a person to act on');

    const recorded = (await call(owner, 'select public.record_coursework_purge($1) as done',
      [second.asset])).done;
    eq(recorded, true, 'the first recording of a deletion');

    const after = (await asActor(owner,
      () => q('select * from public.coursework_bytes_awaiting()'))).rows;
    eq(after.filter((row) => row.asset_id === second.asset).length, 0,
      'the object is still queued after the deletion was recorded');

    const again = (await call(owner, 'select public.record_coursework_purge($1) as done',
      [second.asset])).done;
    eq(again, false, 'recording the same deletion twice reports a second deletion');

    const stored = (await q(
      'select purged_at, purged_by from public.media_assets where id = $1', [second.asset])).rows[0];
    assert(stored.purged_at !== null, 'the deletion left no date');
    eq(stored.purged_by, owner, 'the deletion does not name who recorded it');
  });
}
