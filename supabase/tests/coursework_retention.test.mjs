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

  // These integration suites share a database in some runs. Preserve the flags
  // they change so a later suite tests its own setup rather than our leftovers.
  const originalFlags = (await q("select key,value_text from public.platform_settings where key in ('learning.assignments','learning.cohorts')")).rows;
  const suiteOwner = (await q('select owner_user_id,configured_at from public.safeguarding_owner where singleton')).rows[0];
  await q('delete from public.safeguarding_owner where singleton');
  try {

  const owner = await bootstrapAdmin('coursework-retention-owner@example.com');
  await q('select public.bootstrap_safeguarding_owner($1)', [owner]);
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
    await q(`update public.coursework_upload_declarations set declared_at=now()-$2::interval where asset_id=$1`, [row.asset,interval]);
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
    await q(`update public.coursework_upload_declarations set declared_at=now()-interval '2 years' where asset_id=$1`, [asset]);
    await q(`update public.assignment_submissions
                set created_at = now() - interval '2 years',
                    submitted_at = now() - interval '2 years'
              where id = $1`, [submission]);

    const record = await retentionRows({ asset });
    assert(record.basis === 'class_end', `basis ${record.basis}`);
    const days = (new Date(record.due_on).getTime() - Date.now()) / 86_400_000;
    assert(Math.abs(days) < 2, `due ${Math.round(days)} days from now, expected today`);
  });

  await test('detached revisions and pending declarations retain a conservative clock and honour holds', async () => {
    const who=await learner('Detached retention');
    const assignment=await createAssignment();
    const submission=(await call(who.userId,'select public.save_assignment_draft($1,$2,$3) as id',
      [assignment,who.learnerId,'A draft.'])).id;
    const old=(await call(who.userId,'select * from public.register_coursework_upload($1,$2,$3,$4,$5)',
      [submission,'Earlier page.jpg','image/jpeg',1000,digest()])).asset_id;
    await call(who.userId,'select public.confirm_coursework_upload($1)',[old]);
    // Snapshot-only historical reference, with no declaration or attachment.
    await call(who.userId,'select public.remove_assignment_asset($1,$2)',[submission,old]);
    await q('delete from public.coursework_upload_declarations where asset_id=$1',[old]);
    await q(`insert into public.assignment_submission_revisions
      (submission_id,revision_number,asset_ids,feedback,marked_at,submitted_at,reopened_by,reopened_at)
      values ($1,1,jsonb_build_array($2::text),'Reviewed',now()-interval '2 years',now()-interval '2 years',$3,now()-interval '2 years')`,
      [submission,old,who.userId]);
    const pending=(await call(who.userId,'select * from public.register_coursework_upload($1,$2,$3,$4,$5)',
      [submission,'Pending page.jpg','image/jpeg',1000,digest()])).asset_id;
    const recent=(await call(who.userId,'select * from public.register_coursework_upload($1,$2,$3,$4,$5)',
      [submission,'Recent page.jpg','image/jpeg',1000,digest()])).asset_id;
    await q("update public.assignment_submissions set created_at=now()-interval '2 years' where id=$1",[submission]);
    await q("update public.coursework_upload_declarations set declared_at=now()-interval '2 years' where asset_id=$1",[pending]);
    for (const id of [old,pending]) {
      const r=await retentionRows({asset:id});
      assert(r && new Date(r.due_on)<new Date(), 'a detached old reference has no due clock');
      assert((await scalar('select count(*)::int n from public.coursework_file_retention where asset_id=$1',[id])).n===1, 'reference duplicates inflated the register');
    }
    assert(new Date((await retentionRows({asset:recent})).due_on)>new Date(), 'a recent declaration inherited an older deadline');
    await call(owner,'select public.hold_coursework_file($1,$2)',[old,'An unresolved concern']);
    try {
      await purge();
      assert((await scalar('select deleted_at from public.media_assets where id=$1',[old])).deleted_at===null, 'held detached revision was tombstoned');
      const p=await scalar('select deleted_at,purge_due_at,purged_at from public.media_assets where id=$1',[pending]);
      assert(p.deleted_at && p.purge_due_at && p.purged_at===null, 'old pending bytes were not queued truthfully');
      assert((await scalar('select deleted_at from public.media_assets where id=$1',[recent])).deleted_at===null, 'recent pending upload was deleted');
      await call(owner,'select public.release_coursework_hold($1,$2)',[old,'The concern was reviewed']);
      await purge();
      assert((await scalar('select deleted_at from public.media_assets where id=$1',[old])).deleted_at!==null, 'released detached revision was not queued');
    } finally {
      if ((await scalar('select count(*)::int n from public.coursework_retention_holds where asset_id=$1 and closed_at is null',[old])).n)
        await call(owner,'select public.release_coursework_hold($1,$2)',[old,'Fixture cleanup']);
    }
  });

  await test('a recent revision extends the current file clock and invalid snapshot values do not crash it', async () => {
    const row=await handedIn();
    await backdate(row,'2 years');
    await q(`insert into public.assignment_submission_revisions
      (submission_id,revision_number,asset_ids,feedback,marked_at,submitted_at,reopened_by,reopened_at)
      values($1,1,jsonb_build_array($2::text,'not-a-uuid'),'Reviewed',now(),now(),$3,now()),
            ($1,2,'{"legacy":"invalid shape"}'::jsonb,'Reviewed',now(),now(),$3,now())`,[row.submission,row.asset,row.userId]);
    const clock=await retentionRows(row);
    assert(clock && new Date(clock.due_on)>new Date(), 'a new revision did not extend the clock');
    assert((await scalar('select count(*)::int n from public.coursework_file_retention where asset_id=$1',[row.asset])).n===1,
      'the declaration, attachment and revision appeared as separate files');
    await purge();
    assert((await scalar('select deleted_at from public.media_assets where id=$1',[row.asset])).deleted_at===null,
      'an asset reused in a recent version was tombstoned');
  });

  await test('a file used in two submissions for the same learner is not expired by the first clock', async () => {
    const first=await handedIn();
    await backdate(first,'2 years');
    const secondAssignment=await createAssignment();
    const second=(await call(first.userId,'select public.save_assignment_draft($1,$2,$3) as id',
      [secondAssignment,first.learnerId,'Newer work.'])).id;
    await q(`insert into public.assignment_submission_revisions
      (submission_id,revision_number,asset_ids,feedback,marked_at,submitted_at,reopened_by)
      values($1,1,jsonb_build_array($2::text),'Reviewed',now(),now(),$3)`,[second,first.asset,first.userId]);
    assert((await scalar('select count(*)::int n from public.coursework_file_retention where asset_id=$1',[first.asset])).n===2);
    const queue=(await asActor(owner,()=>q('select * from public.coursework_shared_retention_review_page(null,100)'))).rows;
    const entry=queue.find(r=>r.asset_id===first.asset);
    assert(entry && Number(entry.submission_contexts)===2 && entry.held===false, 'owner cannot find the multi-submission exception');
    await refuses(/not_allowed/i,()=>asActor(governance,()=>q('select * from public.coursework_shared_retention_review_page(null,50)')));
    const after=(await asActor(owner,()=>q('select * from public.coursework_shared_retention_review_page($1,1)',[first.asset]))).rows;
    assert(!after.some(r=>r.asset_id===first.asset), 'shared review cursor repeated the entry');
    const before=(await plan()).files.held.count;
    await call(owner,'select public.hold_coursework_file($1,$2)',[first.asset,'Review this shared file']);
    try {
      const heldPlan=await plan();
      assert(heldPlan.files.held.count===before+1, 'one shared held file was counted as several files');
      const heldPage=(await asActor(owner,()=>q('select * from public.coursework_shared_retention_review_page(null,100)'))).rows;
      assert(heldPage.find(r=>r.asset_id===first.asset)?.held===true, 'shared review omitted its hold');
    } finally { await call(owner,'select public.release_coursework_hold($1,$2)',[first.asset,'Shared review test cleanup']); }
    await purge();
    assert((await scalar('select deleted_at from public.media_assets where id=$1',[first.asset])).deleted_at===null,
      'the first submission deleted a file still referenced by another submission');
  });

  await test('an open-ended cohort has no ordinary due date but erasure still applies', async () => {
    const cohort = (await call(teacher,
      `select public.create_cohort($1,$2,$3,$4, now() + interval '1 day', null, null) as id`,
      [course, version, 'Open-ended class', 'No recorded end'])).id;
    await call(teacher, "select public.set_cohort_status($1,'open')", [cohort]);
    const who = await learner('Open-ended learner', cohort);
    const assignment = await createAssignment({ cohortId: cohort });
    const submission = (await call(who.userId, 'select public.save_assignment_draft($1,$2,$3) as id',
      [assignment, who.learnerId, 'Work in an ongoing class.'])).id;
    const asset = (await call(who.userId,
      'select * from public.register_coursework_upload($1,$2,$3,$4,$5)',
      [submission, 'Page.jpg', 'image/jpeg', 900000, digest()])).asset_id;
    await call(who.userId, 'select public.confirm_coursework_upload($1)', [asset]);
    await call(who.userId, 'select public.submit_assignment($1)', [submission]);
    await backdate({ asset, submission }, '2 years');
    // An unfinished declaration in the same open-ended class has no invented end either.
    // Use a separate draft because the first submission is already handed in.
    const draftAssignment=await createAssignment({cohortId:cohort});
    const draft=(await call(who.userId,'select public.save_assignment_draft($1,$2,$3) as id',
      [draftAssignment,who.learnerId,'Unfinished work.'])).id;
    const pending=(await call(who.userId,'select * from public.register_coursework_upload($1,$2,$3,$4,$5)',
      [draft,'Unfinished page.jpg','image/jpeg',1000,digest()])).asset_id;
    await q("update public.coursework_upload_declarations set declared_at=now()-interval '2 years' where asset_id=$1",[pending]);
    await q("update public.assignment_submissions set created_at=now()-interval '2 years' where id=$1",[draft]);
    const pendingClock=await retentionRows({asset:pending});
    assert(pendingClock && pendingClock.due_on===null && pendingClock.basis==='missing_class_end', 'unfinished open-ended coursework got an invented deadline');

    let r = await retentionRows({ asset });
    assert(r.due_on === null && r.basis === 'missing_class_end', 'open-ended class received a hand-in based deadline');
    const summary = await plan();
    assert(summary.files.missingClassEnd >= 1, 'missing end dates are invisible in the owner plan');
    const listed = (await asActor(owner, () => q('select * from public.coursework_missing_class_ends()'))).rows;
    assert(listed.some((item) => item.cohort_id === cohort && Number(item.files) >= 1), 'owner cannot identify the class');
    const next = (await asActor(owner, () => q('select * from public.coursework_missing_class_ends($1,$2)', [100, cohort]))).rows;
    assert(!next.some((item) => item.cohort_id === cohort), 'the cursor repeated the same class');
    await refuses(/coursework:not_allowed/, () => call(teacher, 'select public.coursework_missing_class_ends()'));
    await refuses(/between 1 and 100/, () => call(owner, 'select public.coursework_missing_class_ends($1)', [101]));
    await purge();
    assert((await scalar('select deleted_at from public.media_assets where id=$1', [asset])).deleted_at === null,
      'cleanup tombstoned work for a class with no end date');

    await q("update public.cohorts set ends_at=now()+interval '1 month' where id=$1", [cohort]);
    r = await retentionRows({ asset });
    assert(r.basis === 'class_end' && new Date(r.due_on) > new Date(Date.now() + 390 * 86400000),
      'the recorded end did not start the ordinary year');
    await q('update public.cohorts set ends_at=null where id=$1', [cohort]);

    await q("update public.learner_profiles set deleted_at=now()-interval '40 days' where id=$1", [who.learnerId]);
    r = await retentionRows({ asset });
    assert(r.basis === 'erasure' && new Date(r.due_on) < new Date(), 'the erasure exception was lost');
    await call(owner, 'select public.hold_coursework_file($1,$2)', [asset, 'An active safeguarding review']);
    await purge();
    assert((await scalar('select deleted_at from public.media_assets where id=$1', [asset])).deleted_at === null,
      'the erasure exception bypassed a safeguarding hold');
    await call(owner, 'select public.release_coursework_hold($1,$2)', [asset, 'The review has concluded']);
    await purge();
    assert((await scalar('select deleted_at from public.media_assets where id=$1', [asset])).deleted_at !== null,
      'erasure was blocked after the hold was released');
  });

  await test('only the owner may attest the verified end of a closed class once', async () => {
    const cohort = (await call(teacher,
      `select public.create_cohort($1,$2,$3,$4, now() + interval '1 day', null, null) as id`,
      [course, version, 'Class with verified end', 'No recorded end'])).id;
    await call(teacher, "select public.set_cohort_status($1,'open')", [cohort]);
    const who = await learner('Verified end learner', cohort);
    const assignment = await createAssignment({ cohortId: cohort });
    const submission = (await call(who.userId, 'select public.save_assignment_draft($1,$2,$3) as id',
      [assignment, who.learnerId, 'A page.'])).id;
    const asset = (await call(who.userId, 'select * from public.register_coursework_upload($1,$2,$3,$4,$5)',
      [submission, 'Page.jpg', 'image/jpeg', 900000, digest()])).asset_id;
    await call(who.userId, 'select public.confirm_coursework_upload($1)', [asset]);
    await call(who.userId, 'select public.submit_assignment($1)', [submission]);
    await backdate({ asset, submission }, '2 years');
    await q(`update public.cohorts set starts_at=now()-interval '3 years',
      join_closes_at=now()-interval '2 years' where id=$1`, [cohort]);
    const sql = 'select public.attest_closed_cohort_end($1,$2,$3,$4) as ended';
    const end = new Date(Date.now() - 400 * 86400000).toISOString();
    const confirm = 'I verified the class end and understand that coursework may become due';
    const args = [cohort, end, 'The class log confirms the last session', confirm];
    await refuses(/coursework:not_allowed/, () => call(teacher, sql, args));
    const statusFixture = (status) => committed(async () => {
      await q("select set_config('app.account_erasure', 'on', true)");
      await q('update public.user_profiles set account_status=$2 where user_id=$1', [owner, status]);
    });
    await statusFixture('suspended');
    try { await refuses(/coursework:not_allowed/, () => call(owner, sql, args)); }
    finally { await statusFixture('active'); }
    await refuses(/only a closed class/, () => call(owner, sql, args));
    await call(teacher, "select public.set_cohort_status($1,'closed')", [cohort]);
    await refuses(/confirm the verified end/, () => call(owner, sql, [cohort, end, args[2], '']));
    await refuses(/written reason/, () => call(owner, sql, [cohort, end, 'x', confirm]));
    await refuses(/not in the future/, () => call(owner, sql, [cohort, new Date(Date.now() + 86400000).toISOString(), args[2], confirm]));
    await refuses(/not before the join window/, () => call(owner, sql, [cohort, new Date(Date.now() - 800 * 86400000).toISOString(), args[2], confirm]));
    const report = (await asActor(owner, () => q('select * from public.coursework_missing_class_ends()'))).rows;
    assert(report.some((item) => item.cohort_id === cohort && item.cohort_status === 'closed' && item.starts_at && item.join_closes_at), 'owner did not see the decision context');
    await call(owner, sql, args);
    const r = await retentionRows({ asset });
    assert(r.basis === 'class_end' && new Date(r.due_on) < new Date(), 'the attested end did not start the ordinary clock');
    await refuses(/only a closed class/, () => call(owner, sql, args));
    const audit = await scalar("select detail from public.governance_audit_events where action='cohort.end_attested' and target_id=$1", [cohort]);
    assert(audit.detail.reason === args[2] && audit.detail.attestation === true, 'the attestation was not audited');
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

  await test('a hold stops the press, needs a reason at both ends, and only the owner may set one', async () => {
    const row = await handedIn();
    await backdate(row, '2 years');

    await refuses(/written reason/, () =>
      call(owner, 'select public.hold_coursework_file($1,$2)', [row.asset, 'x']));
    await refuses(/coursework:not_allowed/, () =>
      call(agent, 'select public.hold_coursework_file($1,$2)', [row.asset, 'a safeguarding question']));
    await refuses(/coursework:not_allowed/, () =>
      call(teacher, 'select public.hold_coursework_file($1,$2)', [row.asset, 'a safeguarding question']));

    await call(owner, 'select public.hold_coursework_file($1,$2)',
      [row.asset, 'A safeguarding case names this file']);

    const run = await purge();
    assert(run.held >= 1, 'the held file was not counted');
    const asset = await scalar('select deleted_at from public.media_assets where id = $1', [row.asset]);
    assert(asset.deleted_at === null, 'the press deleted a file that was on hold');

    await refuses(/written reason/, () =>
      call(owner, 'select public.release_coursework_hold($1,$2)', [row.asset, 'ok']));
    await call(owner, 'select public.release_coursework_hold($1,$2)',
      [row.asset, 'The case was closed with no concern']);

    const again = await purge();
    assert(again.deleted >= 1, 'releasing the hold did not put the file back in front of the press');
  });

  await test('an owner can place a new hold after a previous hold was released', async () => {
    const row = await handedIn();
    await backdate(row, '2 years');
    await call(owner, 'select public.hold_coursework_file($1,$2)', [row.asset, 'Initial safeguarding concern']);
    await call(owner, 'select public.release_coursework_hold($1,$2)', [row.asset, 'Initial concern reviewed']);
    await call(owner, 'select public.hold_coursework_file($1,$2)', [row.asset, 'A separate new safeguarding concern']);
    await refuses(/already held/, () => call(owner, 'select public.hold_coursework_file($1,$2)', [row.asset, 'Repeated hold']));
    const current = await scalar('select reason,closed_at,closed_by,closed_reason from public.coursework_retention_holds where asset_id=$1 and closed_at is null', [row.asset]);
    assert(current.reason === 'A separate new safeguarding concern' && current.closed_at === null && current.closed_by === null && current.closed_reason === null,
      'the reopened hold did not become current');
    const holdRows = (await q('select reason,closed_at from public.coursework_retention_holds where asset_id=$1', [row.asset])).rows;
    assert(holdRows.length === 2 && holdRows.some(h => h.reason==='Initial safeguarding concern' && h.closed_at !== null), 'the previous hold was not retained');
    const events = (await q("select action,detail from public.governance_audit_events where target_id=$1 and action in ('coursework.held','coursework.hold_released')", [row.asset])).rows;
    assert(events.filter(e => e.action==='coursework.held').length === 2 && events.some(e => e.action==='coursework.hold_released'),
      'hold reopening lost prior decision history');
    await purge();
    assert((await scalar('select deleted_at from public.media_assets where id=$1',[row.asset])).deleted_at === null,
      'reopened hold failed to protect due file');
    await call(owner, 'select public.release_coursework_hold($1,$2)', [row.asset, 'The new concern was reviewed']);
  });

  await test('the owner can page past 120 open holds with equal timestamps', async () => {
    await q('begin');
    try {
      const ids = (await q(`insert into public.media_assets
        (storage_backend,master_bucket,master_key,checksum,mime_type,byte_size,status,uploaded_by,purpose)
        select 'r2','masters','hold-page/'||gen_random_uuid(),md5(gen_random_uuid()::text)||md5(gen_random_uuid()::text),
          'image/jpeg',100,'available',$1,'coursework' from generate_series(1,120) returning id`,[owner])).rows.map(r=>r.id);
      await q(`insert into public.coursework_retention_holds(asset_id,reason,opened_by,opened_at)
        select a,'Private reason',$2,'1900-01-01 00:00:00.123456+00'::timestamptz from unnest($1::uuid[]) a`,[ids,owner]);
      await q("select set_config('request.jwt.claims',$1,true)", [JSON.stringify({sub:owner,role:'authenticated'})]);
      await q('set local role authenticated');
      const seen=[]; let after=null,afterId=null;
      for (let page=0; page<5; page++) {
        const rows=(await q('select *,opened_at::text t from public.coursework_holds_page($1,$2,50)',[after,afterId])).rows;
        seen.push(...rows.map(r=>r.asset_id));
        if (rows.length<50) break;
        after=rows.at(-1).t; afterId=rows.at(-1).asset_id;
      }
      assert(ids.every(id=>seen.includes(id)) && new Set(seen).size===seen.length, 'hold pages skipped or duplicated entries');
    } finally { await q('rollback'); }
    await refuses(/coursework:not_allowed/, () => call(governance,'select * from public.coursework_holds_page(null,null,50)'));
    await refuses(/both hold cursor values/, () => call(owner,'select * from public.coursework_holds_page(now(),null,50)'));
    await refuses(/page limit/, () => call(owner,'select * from public.coursework_holds_page(null,null,101)'));
  });

  await test('the cleanup locks each asset and rechecks its hold before tombstoning', async () => {
    const definition = (await q(`select pg_get_functiondef('public.purge_coursework_files(timestamptz,integer)'::regprocedure) as source`)).rows[0].source;
    const lock = definition.indexOf('where id = v_id for update');
    const recheck = definition.indexOf('where asset_id = v_id and due_on <= v_as_of', lock);
    const update = definition.indexOf('update public.media_assets', recheck);
    assert(lock >= 0 && recheck > lock && update > recheck && definition.slice(recheck, update).includes('not held'),
      'cleanup no longer locks and rechecks the hold before tombstoning');
    // This structural test is not a multi-session PostgreSQL race test.
  });

  await test('only the owner runs the press', async () => {
    await refuses(/retention:not_allowed/, () => call(governance, 'select public.purge_coursework_files()'));
    await refuses(/retention:not_allowed/, () => call(agent, 'select public.purge_coursework_files()'));
    await refuses(/coursework:not_allowed/, () => call(teacher, 'select public.coursework_retention_plan()'));
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

  await test('the owner can page past 120 storage entries with equal sort times', async () => {
    await q('begin');
    try {
      const seeded = (await q(`insert into public.media_assets
        (storage_backend,master_bucket,master_key,checksum,mime_type,byte_size,status,uploaded_by,deleted_at,purge_due_at,purpose)
        select 'r2','masters','paging/'||gen_random_uuid(),md5(gen_random_uuid()::text)||md5(gen_random_uuid()::text),
          'image/jpeg',100,'deleted',$1,now(),'1900-01-01 00:00:00.123456+00'::timestamptz,'coursework'
        from generate_series(1,120) returning id`, [owner])).rows.map(r => r.id);
      await q("select set_config('request.jwt.claims',$1,true)", [JSON.stringify({sub:owner,role:'authenticated'})]);
      await q('set local role authenticated');
      const seen = []; let after = null, afterId = null;
      for (let page=0; page<5; page++) {
        const rows = (await q('select *,sort_at::text t from public.coursework_bytes_awaiting_page_with_holds($1,$2,50)', [after,afterId])).rows;
        seen.push(...rows.map(r => r.asset_id));
        if (rows.length < 50) break;
        after=rows.at(-1).t; afterId=rows.at(-1).asset_id;
      }
      assert(seeded.every(id => seen.includes(id)) && new Set(seen).size===seen.length, 'storage pages skipped or duplicated entries');
    } finally { await q('rollback'); }
    await refuses(/coursework:not_allowed/, () => call(governance,'select * from public.coursework_bytes_awaiting_page_with_holds(null,null,50)'));
    await refuses(/both storage cursor values/, () => call(owner,'select * from public.coursework_bytes_awaiting_page_with_holds(now(),null,50)'));
    await refuses(/page limit/, () => call(owner,'select * from public.coursework_bytes_awaiting_page_with_holds(null,null,101)'));
  });

  await test('recording a deletion refuses while readable, then records an attestation', async () => {
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

  await test('a coursework deletion statement cannot modify a tombstoned library file', async () => {
    const library = (await q(`insert into public.media_assets
      (storage_backend,master_bucket,master_key,checksum,mime_type,byte_size,status,uploaded_by,deleted_at)
      values ('r2','masters',$1,$2,'video/mp4',123,'deleted',$3,now()) returning id`,
      [`library/${crypto.randomUUID()}`,digest(),owner])).rows[0].id;
    await refuses(/coursework file does not exist/, () => call(owner, 'select public.record_coursework_purge($1)', [library]));
    const row = await scalar('select purged_at,purged_by from public.media_assets where id=$1', [library]);
    assert(row.purged_at === null && row.purged_by === null, 'coursework statement modified library metadata');
    const audit = await scalar("select count(*)::int n from public.governance_audit_events where target_id=$1 and action='retention.coursework_bytes_deleted'", [library]);
    assert(audit.n === 0, 'coursework deletion statement audited a library file');
  });

  await test('a child record with held coursework is deferred without starving other due children', async () => {
    async function childFile(label) {
      const userId = await newUser(`held-child-${++seq}@example.com`);
      await newProfile(userId, label);
      const learnerId = (await q(`insert into public.learner_profiles
        (display_name,learner_type,age_band,linked_user_id) values ($1,'child','8-10',$2) returning id`, [label,userId])).rows[0].id;
      await q(`insert into public.course_enrolments (learner_profile_id,course_id,course_version_id,source,status)
        values ($1,$2,$3,'free','active')`, [learnerId, course, version]);
      const assignment = await createAssignment();
      const submission = (await call(userId, 'select public.save_assignment_draft($1,$2,$3) as id', [assignment,learnerId,'Child work.'])).id;
      const file = await call(userId, 'select * from public.register_coursework_upload($1,$2,$3,$4,$5)',
        [submission, 'Child page.jpg', 'image/jpeg', 1000, digest()]);
      await call(userId, 'select public.confirm_coursework_upload($1)', [file.asset_id]);
      await call(userId, 'select public.submit_assignment($1)', [submission]);
      await q(`update public.learner_profiles set deleted_at=now()-interval '45 days', status='archived' where id=$1`, [learnerId]);
      return { learnerId, submission, asset: file.asset_id };
    }
    const heldChild = await childFile('Held child');
    const otherChild = await childFile('Other child');
    const pendingAttempt = (await q(`insert into public.child_login_attempts
      (learner_profile_id,guardian_user_id,username) values ($1,$2,'hold.recovery') returning id`, [heldChild.learnerId,owner])).rows[0].id;
    await call(owner, 'select public.hold_coursework_file($1,$2)', [heldChild.asset, 'An unresolved concern']);
    // Reproduce an old record marked erased while a hold exists: even the
    // owner's individual cleanup must recheck the current hold.
    await q("update public.learner_profiles set status='erased' where id=$1", [heldChild.learnerId]);
    const blockedLegacy = await call(owner, 'select public.reconcile_legacy_child_login_erasure($1) as r', [heldChild.learnerId]);
    assert(blockedLegacy.r.reconciled === false && blockedLegacy.r.blockedByCourseworkHold === true, 'legacy action bypassed the hold');
    assert(await scalar('select id from public.child_login_attempts where id=$1', [pendingAttempt]), 'legacy action removed held attempt');
    await q("update public.learner_profiles set status='archived' where id=$1", [heldChild.learnerId]);
    const run = await call(owner, 'select public.run_retention_jobs(now(),500) as r');
    assert(run.r.held.learnerRecords >= 1, 'the blocked child record was not reported');
    assert(run.r.remaining.learnerRecords >= 1, 'the due child was not counted as remaining');
    assert((await scalar('select status from public.learner_profiles where id=$1', [heldChild.learnerId])).status !== 'erased');
    assert(await scalar('select id from public.assignment_submissions where id=$1', [heldChild.submission]), 'held submission was deleted');
    assert(await scalar('select id from public.child_login_attempts where id=$1', [pendingAttempt]), 'hold did not preserve the attempt');
    assert((await scalar('select deleted_at from public.media_assets where id=$1', [heldChild.asset])).deleted_at === null,
      'held attachment was tombstoned by child cleanup');
    assert((await scalar('select status from public.learner_profiles where id=$1', [otherChild.learnerId])).status === 'erased',
      'an unrelated due child was starved behind a hold');
    await call(owner, 'select public.release_coursework_hold($1,$2)', [heldChild.asset, 'The concern has been reviewed']);
    await call(owner, 'select public.run_retention_jobs(now(),500) as r');
    assert((await scalar('select status from public.learner_profiles where id=$1', [heldChild.learnerId])).status === 'erased',
      'the child record did not return to its existing clock after release');
    assert(!(await scalar('select id from public.child_login_attempts where id=$1', [pendingAttempt])), 'released record retained the identifying attempt');
    assert(await scalar('select source_id from public.child_login_erasure_recovery where source_id=$1', [pendingAttempt]), 'released record lost recovery evidence');
  });

  await test('child revision erasure respects detached holds, then removes snapshots and queues files', async () => {
    const userId = await newUser(`revision-erasure-${++seq}@example.com`);
    await newProfile(userId, 'Revision erasure child');
    const learnerId = (await q(`insert into public.learner_profiles
      (display_name,learner_type,age_band,linked_user_id) values ('Revision child','child','8-10',$1) returning id`, [userId])).rows[0].id;
    await q(`insert into public.course_enrolments (learner_profile_id,course_id,course_version_id,source,status)
      values ($1,$2,$3,'free','active')`, [learnerId,course,version]);
    const assignment=await createAssignment();
    const submission=(await call(userId,'select public.save_assignment_draft($1,$2,$3) as id', [assignment,learnerId,'Private first version.'])).id;
    const old=(await call(userId,'select * from public.register_coursework_upload($1,$2,$3,$4,$5)',
      [submission,'Old page.jpg','image/jpeg',1000,digest()])).asset_id;
    await call(userId,'select public.confirm_coursework_upload($1)', [old]);
    await call(userId,'select public.submit_assignment($1)', [submission]);
    await call(teacher,'select public.mark_assignment_submission($1,$2,$3)', [submission,8,'Private feedback.']);
    await call(userId,'select public.reopen_assignment_submission($1)', [submission]);
    await call(userId,'select public.remove_assignment_asset($1,$2)', [submission,old]);
    // Reproduce a legacy detached snapshot without a surviving declaration, so
    // the hold and purge must find the revision reference itself.
    await q('delete from public.coursework_upload_declarations where asset_id=$1', [old]);
    const pending=(await call(userId,'select * from public.register_coursework_upload($1,$2,$3,$4,$5)',
      [submission,'Pending page.jpg','image/jpeg',1000,digest()])).asset_id;
    const shared=(await call(userId,'select * from public.register_coursework_upload($1,$2,$3,$4,$5)',
      [submission,'Shared page.jpg','image/jpeg',1000,digest()])).asset_id;
    await call(userId,'select public.confirm_coursework_upload($1)', [shared]);
    const other=await handedIn();
    await q(`insert into public.assignment_submission_revisions
      (submission_id,revision_number,asset_ids,feedback,marked_at,submitted_at,reopened_by)
      values ($1,1,jsonb_build_array($2::text),'Reviewed',now(),now(),$3)`, [other.submission,shared,other.userId]);

    const legacy=(await q(`insert into public.media_assets
      (storage_backend,master_bucket,master_key,checksum,mime_type,byte_size,status,uploaded_by)
      values ('r2','masters',$1,$2,'image/jpeg',1000,'available',$3) returning id`,
      [`legacy-erasure/${crypto.randomUUID()}`,digest(),userId])).rows[0].id;
    await q('alter table public.assignment_submission_assets disable trigger assignment_assets_coursework_only');
    try { await q('insert into public.assignment_submission_assets(submission_id,media_asset_id,attached_by) values($1,$2,$3)', [submission,legacy,userId]); }
    finally { await q('alter table public.assignment_submission_assets enable trigger assignment_assets_coursework_only'); }
    const revision=await scalar('select id from public.assignment_submission_revisions where submission_id=$1', [submission]);
    assert(revision, 'the marked version was not snapshotted');
    await refuses(/cannot be changed or deleted/i, () => committed(async () => {
      await q("select set_config('app.child_coursework_erasure','on',true)");
      await q('delete from public.assignment_submission_revisions where id=$1', [revision.id]);
    }));
    await call(owner,'select public.hold_coursework_file($1,$2)', [old,'Safeguarding review is open']);
    try {
      await q("update public.learner_profiles set deleted_at=now()-interval '45 days',status='archived' where id=$1", [learnerId]);
      const heldRun=(await call(owner,'select public.run_retention_jobs(now(),500) as r')).r;
      assert(heldRun.held.learnerRecords>=1, 'the detached revision hold was not counted');
      assert(await scalar('select id from public.assignment_submission_revisions where id=$1', [revision.id]), 'the held revision was erased');
      assert((await scalar('select deleted_at from public.media_assets where id=$1', [old])).deleted_at===null, 'the held file was tombstoned');
      await call(owner,'select public.release_coursework_hold($1,$2)', [old,'The safeguarding review is complete']);
      await call(owner,'select public.run_retention_jobs(now(),500) as r');
      assert((await scalar('select status from public.learner_profiles where id=$1', [learnerId])).status==='erased', 'the released child record did not erase');
      assert(!(await scalar('select id from public.assignment_submissions where id=$1', [submission])), 'the submission remains');
      assert(!(await scalar('select id from public.assignment_submission_revisions where id=$1', [revision.id])), 'the snapshot remains');
      for (const id of [old,pending]) {
        const asset=await scalar('select status,deleted_at,purge_due_at,purged_at from public.media_assets where id=$1', [id]);
        assert(asset.status==='deleted' && asset.deleted_at && asset.purge_due_at && new Date(asset.purge_due_at).getTime()<=Date.now(), 'a revision or pending object was not queued immediately');
        assert(asset.purged_at===null, 'a tombstone was misreported as a storage deletion');
      }
      for (const [id,reason] of [[shared,'shared_context'],[legacy,'legacy_library']]) {
        const asset=await scalar('select status,deleted_at,purge_due_at from public.media_assets where id=$1', [id]);
        assert(asset.deleted_at===null && asset.purge_due_at===null, `a ${reason} object was tombstoned: ${JSON.stringify(asset)}`);
        assert((await scalar('select reason from public.coursework_erasure_review_assets where asset_id=$1 and learner_id=$2', [id,learnerId])).reason===reason, 'individual review evidence was not retained');
      }
      const queue=(await asActor(owner,() => q('select * from public.coursework_erasure_review_page(null,null,100)'))).rows;
      assert(queue.some(r=>r.asset_id===shared && r.learner_id===learnerId), 'owner cannot see shared review');
      assert(queue.some(r=>r.asset_id===legacy && r.learner_id===learnerId), 'owner cannot see legacy review');
      const queueConfirm='I reviewed all surviving uses and understand this only queues storage deletion';
      const clearConfirm='I understand a storage statement is not verified deletion';
      const queueSql='select public.queue_reviewed_coursework_erasure($1,$2,$3) as result';
      const clearSql='select public.clear_coursework_erasure_review($1,$2,$3) as result';
      await refuses(/not_allowed/i,()=>call(governance,queueSql,[shared,'Reviewed all uses',queueConfirm]));
      await refuses(/provide a reason/i,()=>call(owner,queueSql,[shared,'x',queueConfirm]));
      await refuses(/surviving use/i,()=>call(owner,queueSql,[shared,'Reviewed all uses',queueConfirm]));
      await refuses(/legacy library/i,()=>call(owner,queueSql,[legacy,'Reviewed older file',queueConfirm]));
      await refuses(/statement must be recorded/i,()=>call(owner,clearSql,[shared,learnerId,clearConfirm]));

      await refuses(/not_allowed/i, () => asActor(governance,() => q('select * from public.coursework_erasure_review_page(null,null,50)')));
      await refuses(/permission denied/i, () => asActor(governance,() => q('select * from public.coursework_erasure_review_assets')));
      // Another record using the shared file is erased later. An existing
      // review for the first child must prevent this second purge from silently
      // tombstoning the same object or claiming no personal data remains.
      // Simulate a surviving historical attachment after the first child's
      // attachment has gone, to exercise the cascade trigger too.
      await q('alter table public.assignment_submission_assets disable trigger assignment_assets_coursework_only');
      try { await q('insert into public.assignment_submission_assets(submission_id,media_asset_id,attached_by) values($1,$2,$3)', [other.submission,shared,other.userId]); }
      finally { await q('alter table public.assignment_submission_assets enable trigger assignment_assets_coursework_only'); }
      await q("update public.learner_profiles set learner_type='child',age_band='8-10',deleted_at=now()-interval '45 days',status='archived' where id=$1",[other.learnerId]);
      const secondReceipt=(await scalar('select public.purge_learner_record($1) as r',[other.learnerId])).r;
      assert(secondReceipt.erased===true && secondReceipt.nothingLeft===false, 'the second receipt omitted unresolved shared evidence');
      assert((await scalar('select deleted_at from public.media_assets where id=$1',[shared])).deleted_at===null, 'the second purge tombstoned an unresolved shared file');
      assert((await scalar('select reason from public.coursework_erasure_review_assets where asset_id=$1 and learner_id=$2',[shared,other.learnerId])).reason==='shared_context', 'the second review context was lost');
      await refuses(/confirm the review/i,()=>call(owner,queueSql,[shared,'Valid review','wrong confirmation']));
      // A deleted historical row can still name the same physical object.
      const duplicate=(await q(`insert into public.media_assets(storage_backend,master_bucket,master_key,checksum,mime_type,byte_size,status,uploaded_by,deleted_at)
        select storage_backend,master_bucket,master_key,checksum,mime_type,byte_size,'deleted',uploaded_by,now() from public.media_assets where id=$1 returning id`,[shared])).rows[0].id;
      try { await refuses(/surviving use/i,()=>call(owner,queueSql,[shared,'Reviewed all uses',queueConfirm])); }
      finally { await q('delete from public.media_assets where id=$1',[duplicate]); }
      await committed(async()=>{ await q("select set_config('app.media_status_transition','on',true)"); await q("update public.media_assets set status='pending' where id=$1",[shared]); });
      try { await refuses(/pending or quarantined/i,()=>call(owner,queueSql,[shared,'Reviewed all uses',queueConfirm])); }
      finally { await committed(async()=>{ await q("select set_config('app.media_status_transition','on',true)"); await q("update public.media_assets set status='available' where id=$1",[shared]); }); }
      await committed(async()=>{ await q("select set_config('app.media_status_transition','on',true)"); await q("update public.media_assets set status='quarantined' where id=$1",[shared]); });
      try { await refuses(/quarantined/i,()=>call(owner,queueSql,[shared,'Reviewed all uses',queueConfirm])); }
      finally { await call(owner,'select public.release_coursework_quarantine($1,$2)',[shared,'I reviewed this quarantine and its release']); }
      await call(owner,'select public.hold_coursework_file($1,$2)',[shared,'A later concern']);
      try {
        await refuses(/hold is open/i,()=>call(owner,queueSql,[shared,'Reviewed all uses',queueConfirm]));
      } finally { await call(owner,'select public.release_coursework_hold($1,$2)',[shared,'Later concern reviewed']); }
      assert((await call(owner,queueSql,[shared,'The surviving uses have ended',queueConfirm])).result==='queued', 'the reviewed file was not queued');
      assert((await call(owner,queueSql,[shared,'The surviving uses have ended',queueConfirm])).result==='already_queued', 'a lost queue reply was not recoverable');
      assert((await scalar('select purged_at from public.media_assets where id=$1',[shared])).purged_at===null, 'queueing claimed storage deletion');
      await refuses(/statement must be recorded/i,()=>call(owner,clearSql,[shared,learnerId,clearConfirm]));
      // This records an owner assertion only; no object-store call is made by the test.
      await call(owner,'select public.record_coursework_purge($1)',[shared]);
      await refuses(/not_allowed/i,()=>call(governance,clearSql,[shared,learnerId,clearConfirm]));
      await refuses(/confirm/i,()=>call(owner,clearSql,[shared,learnerId,'wrong']));
      await call(owner,'select public.hold_coursework_file($1,$2)',[shared,'Review the recorded storage statement']);
      try { await refuses(/individual handling/i,()=>call(owner,clearSql,[shared,learnerId,clearConfirm])); }
      finally { await call(owner,'select public.release_coursework_hold($1,$2)',[shared,'Review concluded']); }
      assert((await call(owner,clearSql,[shared,learnerId,clearConfirm])).result===true, 'the first review entry was not removed');
      assert((await call(owner,clearSql,[shared,other.learnerId,clearConfirm])).result===true, 'the second review entry was not removed');
      assert((await call(owner,clearSql,[shared,other.learnerId,clearConfirm])).result===false, 'a retry falsely reported another removal');
      assert((await scalar('select count(*)::int n from public.coursework_erasure_review_assets where asset_id=$1',[legacy])).n===1, 'legacy exception disappeared');

      assert((await scalar('select count(*)::int n from public.child_revision_erasure_scope')).n===0, 'an erasure capability survived the transaction');
    } finally {
      const open=await scalar('select id from public.coursework_retention_holds where asset_id=$1 and closed_at is null', [old]);
      if (open) await call(owner,'select public.release_coursework_hold($1,$2)', [old,'Test cleanup after review']);
    }
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

  } finally {
    for (const flag of originalFlags) await q('update public.platform_settings set value_text=$2 where key=$1', [flag.key,flag.value_text]);
    await q('delete from public.safeguarding_owner where singleton');
    if (suiteOwner) await q('insert into public.safeguarding_owner(singleton,owner_user_id,configured_at) values(true,$1,$2)', [suiteOwner.owner_user_id,suiteOwner.configured_at]);
  }
}
