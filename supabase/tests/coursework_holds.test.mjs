// The named safeguarding owner manages private hold and storage registers.
// A tombstone makes a file unreadable, but does not prove its stored bytes are
// gone. A held object must not be recorded as deleted from storage.

export async function run(ctx) {
  const {
    q, test, assert, rejects, committed,
    newUser, newProfile, bootstrapAdmin, newInstructor, newReviewer, satisfyReview,
    newCourse, newVersion, newSection, newLesson,
  } = ctx;

  // These integration suites share a database in some runs. Preserve the flags
  // they change so a later suite tests its own setup rather than our leftovers.
  const originalFlags = (await q("select key,value_text from public.platform_settings where key in ('learning.assignments','learning.cohorts')")).rows;
  const suiteOwner = (await q('select owner_user_id,configured_at from public.safeguarding_owner where singleton')).rows[0];
  await q('delete from public.safeguarding_owner where singleton');
  try {

  const owner = await bootstrapAdmin('holds-owner@example.com');
  const otherAdmin = await bootstrapAdmin('holds-other-admin@example.com');
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

  const holdList = async (actor = owner) =>
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

  await test('retention details fail closed before an owner is configured', async () => {
    await rejects(() => holdList(owner), /coursework:not_allowed/);
    await rejects(() => call(owner, 'select public.hold_coursework_file($1,$2)', [asset, 'A concern.']), /coursework:not_allowed/);
    await rejects(() => call(owner, 'select * from public.coursework_bytes_awaiting()'), /coursework:not_allowed/);
  });
  await q('select public.bootstrap_safeguarding_owner($1)', [owner]);

  await test('a suspended or closed owner loses staff access until reinstated', async () => {
    const setStatus = (status, deleted) => committed(async () => {
      await q("select set_config('app.account_erasure', 'on', true)");
      await q('update public.user_profiles set account_status=$2, deleted_at=$3 where user_id=$1', [owner, status, deleted]);
    });
    const priorRefundOwner = (await q('select owner_user_id, configured_at from public.refund_approval_owner where singleton')).rows[0];
    await q('delete from public.refund_approval_owner where singleton');
    await q('select public.bootstrap_refund_approval_owner($1)', [owner]);
    try {
      for (const [status, deleted] of [['suspended', null], ['closed', new Date().toISOString()], ['active', new Date().toISOString()]]) {
        await setStatus(status, deleted);
        const predicates = (await q("select public.has_role($1,'platform_admin') as role, public.is_privileged($1) as priv", [owner])).rows[0];
        assert(predicates.role === false && predicates.priv === false, `${status} owner kept staff authority`);
        await rejects(() => holdList(owner), /coursework:not_allowed/);
        await rejects(() => call(owner, 'select * from public.safeguarding_concern_queue()'), /only the configured safeguarding owner/);
        await rejects(() => call(owner, 'select public.run_retention_jobs()'), /retention:not_allowed/);
        await rejects(() => call(owner, 'select public.decide_refund_request($1,true,$2)', [crypto.randomUUID(), 'reviewed']), /only the configured owner/);
      }
    } finally {
      await setStatus('active', null);
      await q('delete from public.refund_approval_owner where singleton');
      if (priorRefundOwner) await q('insert into public.refund_approval_owner (singleton, owner_user_id, configured_at) values (true,$1,$2)', [priorRefundOwner.owner_user_id, priorRefundOwner.configured_at]);
    }
    const predicates = (await q("select public.has_role($1,'platform_admin') as role, public.is_privileged($1) as priv", [owner])).rows[0];
    assert(predicates.role === true && predicates.priv === true, 'reinstatement did not restore the unrevoked staff role');
    await holdList(owner);
    await committed(async () => {
      await q("select set_config('app.account_erasure', 'on', true)");
      await q("update public.user_profiles set account_status='suspended' where user_id=$1", [teacher]);
    });
    try {
      const teacherRole = (await q("select public.has_role($1,'instructor') as role", [teacher])).rows[0].role;
      assert(teacherRole === true, 'ordinary role membership is needed for screening even when suspended');
    } finally {
      await committed(async () => {
        await q("select set_config('app.account_erasure', 'on', true)");
        await q("update public.user_profiles set account_status='active' where user_id=$1", [teacher]);
      });
    }
  });

  await test('unrelated staff cannot read or change private retention records', async () => {
    for (const actor of [governance, otherAdmin, agent, teacher]) {
      for (const [sql, args] of [
        ['select * from public.coursework_holds()', []],
        ['select public.coursework_hold_count()', []],
        ['select public.coursework_retention_plan()', []],
        ['select * from public.coursework_bytes_awaiting()', []],
        ['select public.hold_coursework_file($1,$2)', [asset, 'A concern.']],
        ['select public.release_coursework_hold($1,$2)', [asset, 'A reason.']],
        ['select public.record_coursework_purge($1)', [asset]],
      ]) await rejects(() => call(actor, sql, args), /coursework:not_allowed/);
    }
    for (const [sql, args] of [
      ['select * from public.coursework_holds_internal(50)', []],
      ['select public.coursework_hold_count_internal()', []],
      ['select public.coursework_retention_plan_internal(now())', []],
      ['select * from public.coursework_bytes_awaiting_internal(50)', []],
      ['select public.hold_coursework_file_internal($1,$2)', [asset, 'A concern.']],
      ['select public.release_coursework_hold_internal($1,$2)', [asset, 'A reason.']],
      ['select public.record_coursework_purge_internal($1)', [asset]],
    ]) await rejects(() => call(otherAdmin, sql, args), /permission denied/);
  });

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
    const rows = await holdList(owner);
    eq(rows.length, 0, 'holds on a fresh clock');

    const count = (await call(owner, 'select public.coursework_hold_count() as c')).c;
    eq(count.held, 0, 'the held count');
    eq(count.holdingNothing, 0, 'holds on files that are gone');
  });

  // -------------------------------------------------------------------------
  console.log('\nAct II — a hold says who, why, and whether the file is there');
  // -------------------------------------------------------------------------

  await test('a hold appears with its reason, its author and its date', async () => {
    await call(owner, 'select public.hold_coursework_file($1,$2)',
      [asset, 'A safeguarding concern is open about this photograph.']);

    const rows = await holdList(owner);
    eq(rows.length, 1, 'holds after one was placed');
    eq(rows[0].asset_id, asset, 'the file held');
    eq(rows[0].reason, 'A safeguarding concern is open about this photograph.',
      'the reason the next reader needs');
    eq(rows[0].opened_by, owner, 'who placed the hold');
    eq(rows[0].still_readable, true, 'the file is still there');
    assert(rows[0].due_on !== null,
      'the hold lost the date it is holding the file past');

    const count = (await call(owner, 'select public.coursework_hold_count() as c')).c;
    eq(count.held, 1, 'the held count');
    eq(count.holdingNothing, 0, 'a hold on a file that is still there');
  });

  await test('the owner reads the register and cannot double-hold a file', async () => {
    const rows = await holdList(owner);
    eq(rows.length, 1, 'the owner sees the hold');

    await rejects(
      () => asActor(owner, () => q('select public.hold_coursework_file($1,$2)',
        [asset, 'Holding it again for a different reason.'])),
      /already held/);
    eq((await holdList()).length, 1, 'a second hold was created for one file');
  });

  await test('releasing puts the file back on the clock and empties the register', async () => {
    await call(owner, 'select public.release_coursework_hold($1,$2)',
      [asset, 'The concern is closed and the record can go.']);

    eq((await holdList()).length, 0, 'holds after release');

    const retention = (await q(
      'select held, due_on from public.coursework_file_retention where asset_id = $1',
      [asset])).rows[0];
    eq(retention.held, false, 'the retention row still says it is held');
    assert(retention.due_on !== null,
      'a released file has no date, so the clock would never reach it');

    const count = (await call(owner, 'select public.coursework_hold_count() as c')).c;
    eq(count.held, 0, 'the held count after release');
  });

  // -------------------------------------------------------------------------
  console.log('\nAct III — a held file may be unreadable while bytes remain');
  // -------------------------------------------------------------------------

  await test('an unreadable held file is counted, and its deletion cannot be recorded', async () => {
    await call(owner, 'select public.hold_coursework_file($1,$2)',
      [asset, 'The concern is still open.']);

    // The submission is erased the way the clock does it: the row goes, the
    // attachment cascades, and the asset is tombstoned in the same transaction.
    await committed(async () => {
      await q('delete from public.assignment_submissions where id = $1', [submission]);
    });

    const rows = await holdList(owner);
    eq(rows.length, 1, 'the hold outlives the submission');
    eq(rows[0].still_readable, false,
      'a hold on a deleted file reports the file as readable');

    const count = (await call(owner, 'select public.coursework_hold_count() as c')).c;
    eq(count.held, 1, 'the held count');
    eq(count.holdingNothing, 1, 'holds whose files are no longer readable');
    await rejects(() => call(owner, 'select public.record_coursework_purge($1)', [asset]), /held file/i);
    const pendingBytes = (await q('select purged_at from public.media_assets where id=$1', [asset])).rows[0].purged_at;
    assert(pendingBytes === null, 'a held file was marked as purged');

    const heldPage = (await asActor(owner, () => q('select * from public.coursework_bytes_awaiting_page_with_holds(null,null,100)'))).rows;
    eq(heldPage.find((entry) => entry.asset_id === asset)?.held, true, 'the storage page must identify an open hold');
    await rejects(() => asActor(governance, () => q('select * from public.coursework_bytes_awaiting_page_with_holds(null,null,50)')), /coursework:not_allowed/);

    // Release remains possible after review; it does not itself delete bytes.
    await call(owner, 'select public.release_coursework_hold($1,$2)',
      [asset, 'Releasing a hold on a file that no longer exists.']);
    eq((await holdList()).length, 0, 'holds after releasing a dead one');
    const releasedPage = (await asActor(owner, () => q('select * from public.coursework_bytes_awaiting_page_with_holds(null,null,100)'))).rows;
    eq(releasedPage.find((entry) => entry.asset_id === asset)?.held, false, 'the storage page must reflect release');
  });

  await test('a hold preserves an existing byte deadline instead of adding thirty days', async () => {
    await q("update public.media_assets set purge_due_at = '2020-01-02 03:04:05+00' where id = $1", [asset]);
    await call(owner, 'select public.hold_coursework_file($1,$2)', [asset, 'Reviewing an already due object.']);
    const held = (await q('select purge_due_at from public.media_assets where id = $1', [asset])).rows[0];
    eq(held.purge_due_at, null, 'a hold must suspend the deadline');
    try {
      await call(owner, 'select public.release_coursework_hold($1,$2)', [asset, 'The review is complete.']);
      const restored = (await q("select purge_due_at = '2020-01-02 03:04:05+00'::timestamptz as restored from public.media_assets where id = $1", [asset])).rows[0];
      eq(restored.restored, true, 'the overdue deadline was not restored');
    } finally {
      const open = (await q('select exists(select 1 from public.coursework_retention_holds where asset_id=$1 and closed_at is null) as held', [asset])).rows[0].held;
      if (open) await call(owner, 'select public.release_coursework_hold($1,$2)', [asset, 'Test cleanup after review.']);
    }
  });

  await test('future deadlines survive holds and missing historical dates keep the fallback', async () => {
    await q("update public.media_assets set purge_due_at = '2099-06-01 12:00:00+00' where id = $1", [asset]);
    try {
      await call(owner, 'select public.hold_coursework_file($1,$2)', [asset, 'Holding a future deadline.']);
      await call(owner, 'select public.release_coursework_hold($1,$2)', [asset, 'The review is complete.']);
      const future = (await q("select purge_due_at = '2099-06-01 12:00:00+00'::timestamptz as restored from public.media_assets where id = $1", [asset])).rows[0];
      eq(future.restored, true, 'the future deadline was not restored');
      await call(owner, 'select public.hold_coursework_file($1,$2)', [asset, 'Simulating an old hold.']);
      await q('update public.coursework_retention_holds set previous_purge_due_at = null where asset_id = $1 and closed_at is null', [asset]);
      await call(owner, 'select public.release_coursework_hold($1,$2)', [asset, 'The historical review is complete.']);
      const fallback = (await q("select purge_due_at between now() + interval '29 days' and now() + interval '31 days' as scheduled from public.media_assets where id = $1", [asset])).rows[0];
      eq(fallback.scheduled, true, 'an unknown historical date should retain the conservative fallback');
    } finally {
      const open = (await q('select exists(select 1 from public.coursework_retention_holds where asset_id=$1 and closed_at is null) as held', [asset])).rows[0].held;
      if (open) await call(owner, 'select public.release_coursework_hold($1,$2)', [asset, 'Test cleanup after review.']);
    }
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

  } finally {
    for (const flag of originalFlags) await q('update public.platform_settings set value_text=$2 where key=$1', [flag.key,flag.value_text]);
    await q('delete from public.safeguarding_owner where singleton');
    if (suiteOwner) await q('insert into public.safeguarding_owner(singleton,owner_user_id,configured_at) values(true,$1,$2)', [suiteOwner.owner_user_id,suiteOwner.configured_at]);
  }
}
