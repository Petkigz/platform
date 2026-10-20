// Watching a lesson you have a reason to watch.
//
// Before this suite, `may_play_rendition()` asked one question — is this caller an
// entitled learner, right now — and the two other people who need the same bytes
// had no path at all. A teacher who uploaded a lesson could not watch it, and a
// reviewer assigned to judge a version could read the row naming its object key
// without being able to play it.
//
// So most of these tests are about who is refused, and about the two refusals that
// must not be confused with each other: a reviewer gets the delivery copy and not
// the archive, and nobody gets a copy to keep.

export async function run(ctx) {
  const {
    q, test, assert, asAnon, committed,
    bootstrapAdmin, newUser, newProfile, newInstructor, newReviewer, ensureReviewerProfile,
    newCourse, newVersion, newSection, newLesson, newAsset,
  } = ctx;

  const admin = await bootstrapAdmin('master-admin@example.com');
  const teacher = await newInstructor('master-teacher@example.com', admin);
  await newProfile(teacher, 'Uploader');
  const outsider = await newInstructor('master-outsider@example.com', admin);
  const reviewer = await newReviewer('master-reviewer@example.com', admin);
  const finishedReviewer = await newReviewer('master-finished@example.com', admin);
  const declinedReviewer = await newReviewer('master-declined@example.com', admin);
  const learnerUser = await newUser('master-learner@example.com');
  await newProfile(learnerUser, 'Learner');
  const strangerUser = await newUser('master-stranger@example.com');
  await newProfile(strangerUser, 'Stranger');

  async function asActor(actor, sql, params = []) {
    await q('begin');
    await q("select set_config('request.jwt.claims',$1,true)",
      [JSON.stringify({ sub: actor, role: 'authenticated' })]);
    await q('set local role authenticated');
    try { const r = await q(sql, params); await q('commit'); return r; }
    catch (e) { await q('rollback'); throw e; }
  }

  const mayWatch = async (actor, assetId) =>
    (await asActor(actor, 'select public.may_watch_master($1) as ok', [assetId])).rows[0].ok;

  const mayPlay = async (actor, renditionId) =>
    (await asActor(actor, 'select public.may_play_rendition($1) as ok', [renditionId])).rows[0].ok;

  const target = (actor, assetId) =>
    asActor(actor, 'select * from public.master_preview_target($1)', [assetId])
      .then((r) => r.rows);

  /** A review assignment in a given state, because the state is the whole point. */
  async function assign(versionId, reviewerUserId, status) {
    const profile = await ensureReviewerProfile(reviewerUserId, admin);
    return committed(async () => {
      const id = (await q(
        `insert into public.content_review_assignments
           (course_version_id, reviewer_profile_id, review_scope, assigned_by,
            assignment_status, accepted_at, completed_at)
         values ($1,$2,'scholarly',$3,$4,
                 case when $4 = 'offered' then null else now() end,
                 case when $4 in ('completed','cancelled') then now() else null end)
         returning id`, [versionId, profile, admin, status])).rows[0].id;
      return id;
    });
  }

  const setStatus = (assignmentId, status) => committed(async () => {
    await q(
      `update public.content_review_assignments
          set assignment_status = $2,
              completed_at = case when $2 in ('completed','cancelled') then now() else null end
        where id = $1`, [assignmentId, status]);
  });

  // -------------------------------------------------------------------------
  // A version under review, with a master behind its lesson
  // -------------------------------------------------------------------------

  const course = await newCourse(teacher, { status: 'active' });
  const version = await newVersion(course, teacher);
  const section = await newSection(version);
  const lesson = await newLesson(section, { title: 'The lesson under review' });
  const asset = await newAsset(teacher, { status: 'available' });
  await q(
    `insert into public.lesson_resources
       (lesson_id, resource_type, media_asset_id, display_name, position)
     values ($1,'video',$2,'Recorded lesson',1)`, [lesson, asset]);

  // A master somebody else uploaded, attached to the same teacher's lesson: the
  // case where the person who teaches the version is not the person who made the
  // file.
  const staffUploaded = await newAsset(admin, { status: 'pending' });
  await q(
    `insert into public.lesson_resources
       (lesson_id, resource_type, media_asset_id, display_name, position)
     values ($1,'video',$2,'Uploaded by staff',2)`, [lesson, staffUploaded]);

  // A different course, so a reviewer of one cannot reach the other.
  const otherCourse = await newCourse(teacher, { status: 'active' });
  const otherVersion = await newVersion(otherCourse, teacher, { version_number: 1 });
  const otherLesson = await newLesson(await newSection(otherVersion));
  const otherAsset = await newAsset(teacher, { status: 'available' });
  await q(
    `insert into public.lesson_resources
       (lesson_id, resource_type, media_asset_id, display_name, position)
     values ($1,'video',$2,'Another course',1)`, [otherLesson, otherAsset]);

  const activeAssignment = await assign(version, reviewer, 'accepted');
  await assign(version, finishedReviewer, 'completed');
  await assign(version, declinedReviewer, 'declined');

  // One rendition of the lesson's master, confirmed the way the worker would.
  const rendition = (await asActor(admin,
    `select * from public.register_media_rendition($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [asset, '720p', 'video/mp4', 5_242_880, 1280, 720, 1200, 600, null])).rows[0].rendition_id;
  await asActor(admin, 'select public.confirm_media_rendition($1)', [rendition]);

  // An entitled learner, so the branch that already worked can be checked against
  // the two that were added.
  const learnerProfile = await committed(async () => {
    const id = (await q(
      `insert into public.learner_profiles
         (display_name, learner_type, age_band, linked_user_id)
       values ('Learner','adult','18+',$1) returning id`, [learnerUser])).rows[0].id;
    await q(
      `insert into public.entitlement_grants
         (learner_profile_id, scope_type, course_version_id, source_type, status)
       values ($1,'course_version',$2,'purchase','active')`, [id, version]);
    return id;
  });

  // -------------------------------------------------------------------------
  console.log('\nThe archive: who may watch a master');
  // -------------------------------------------------------------------------

  await test('the person who uploaded a master may watch it, in any state', async () => {
    assert(await mayWatch(teacher, asset) === true,
      'a teacher could not watch the file they uploaded');
    const pending = await newAsset(teacher, { status: 'pending' });
    assert(await mayWatch(teacher, pending) === true,
      'a teacher could not watch their own upload before it was verified');
  });

  await test('platform staff may watch any master, because they are the ones moderating it', async () => {
    assert(await mayWatch(admin, asset) === true, 'staff could not watch a teacher\'s master');
    const pending = await newAsset(teacher, { status: 'pending' });
    assert(await mayWatch(admin, pending) === true,
      'staff could not watch a pending upload, which is the one they must look at before confirming it');
  });

  await test('a version author who did not upload the file may watch it only while it is available', async () => {
    // Staff uploaded this one for the teacher's lesson, and it is still pending.
    // The status is not changed in place: media_assets has a status guard that
    // refuses a transition from anybody who is not staff in session, and a
    // fixture that fights it would be a fixture that lies about the writer path.
    assert(await mayWatch(teacher, staffUploaded) === false,
      'a version author could watch a pending master they did not upload');

    const staffReady = await newAsset(admin, { status: 'available' });
    await q(
      `insert into public.lesson_resources
         (lesson_id, resource_type, media_asset_id, display_name, position)
       values ($1,'video',$2,'Uploaded by staff, verified',3)`, [lesson, staffReady]);
    assert(await mayWatch(teacher, staffReady) === true,
      'a version author could not watch an available master attached to their lesson');
    assert(await mayWatch(outsider, staffReady) === false,
      'any teacher could watch it, not just the one who wrote the version');
  });

  await test('a stranger may not watch it, and neither may another teacher', async () => {
    assert(await mayWatch(strangerUser, asset) === false, 'a stranger could watch a master');
    assert(await mayWatch(outsider, asset) === false,
      'a teacher who wrote nothing here could watch another teacher\'s master');
    assert(await mayWatch(learnerUser, asset) === false,
      'an entitled learner could watch the archive; learners get delivery copies');
  });

  await test('a reviewer gets the delivery copy and not the archive', async () => {
    // What is under review is what a learner will see. A master is up to 8 GiB of
    // unedited footage and the job does not need it.
    assert(await mayWatch(reviewer, asset) === false,
      'a reviewer could watch the master of the version they are reviewing');
    assert(await mayPlay(reviewer, rendition) === true,
      'a reviewer could not watch the rendition of the version they are reviewing');
  });

  await test('an anonymous visitor may not watch anything', async () => {
    assert(await asAnon(async () =>
      (await q('select public.may_watch_master($1) as ok', [asset])).rows[0].ok) === false,
      'an anonymous visitor could watch a master');
    for (const fn of ['public.may_watch_master(uuid)', 'public.master_preview_target(uuid)',
      'public.may_review_version_media(uuid)']) {
      for (const role of ['public', 'anon']) {
        const allowed = (await q(
          `select has_function_privilege($1,$2,'EXECUTE') as ok`, [role, fn])).rows[0].ok;
        assert(allowed === false, `${role} can execute ${fn}`);
      }
    }
  });

  await test('quarantine leaves the file with its uploader and with moderation, and takes it from the course', async () => {
    const held = await newAsset(admin, { status: 'available' });
    await q(
      `insert into public.lesson_resources
         (lesson_id, resource_type, media_asset_id, display_name, position)
       values ($1,'video',$2,'Held lesson',4)`, [lesson, held]);
    // The teacher did not upload it, so before quarantine their access comes from
    // the version-author branch alone.
    assert(await mayWatch(teacher, held) === true, 'the premise failed: the author could not watch it');

    await asActor(admin, 'select public.quarantine_media_upload($1,$2)', [held, 'rights query']);
    assert(await mayWatch(admin, held) === true, 'moderation lost sight of a quarantined file');
    assert(await mayWatch(teacher, held) === false,
      'a version author kept watching a master that was pulled from their course');

    const own = await newAsset(teacher, { status: 'available' });
    await asActor(admin, 'select public.quarantine_media_upload($1,$2)', [own, 'rights query']);
    assert(await mayWatch(teacher, own) === true,
      'a teacher lost sight of their own quarantined file, so they could not answer the takedown');
  });

  await test('a withdrawn master is watchable by nobody', async () => {
    const doomed = await newAsset(teacher, { status: 'available' });
    await asActor(admin, 'select public.delete_media_asset($1,$2)', [doomed, 'withdrawn on request']);
    assert(await mayWatch(teacher, doomed) === false,
      'the uploader could still watch a file that was withdrawn');
    assert(await mayWatch(admin, doomed) === false, 'staff could still watch a withdrawn file');
    assert((await target(admin, doomed)).length === 0,
      'a withdrawn master still had object coordinates');
  });

  // -------------------------------------------------------------------------
  console.log('\nThe route reads its coordinates from one function');
  // -------------------------------------------------------------------------

  await test('the target function answers with the object, or with nothing', async () => {
    const rows = await target(teacher, asset);
    assert(rows.length === 1, `the uploader got ${rows.length} rows`);
    assert(rows[0].asset_id === asset);
    assert(rows[0].master_key, 'no object key came back');
    assert(rows[0].master_bucket, 'no bucket came back');
  });

  await test('a master you may not watch and a master that does not exist answer the same way', async () => {
    // The difference would tell a caller which assets are real.
    const refused = await target(strangerUser, asset);
    const missing = await target(strangerUser, '00000000-0000-4000-8000-000000000000');
    assert(refused.length === 0 && missing.length === 0,
      'a refusal and a missing row were distinguishable');
  });

  await test('the target function returns seven columns and nothing else', async () => {
    const rows = await target(admin, asset);
    // The harness's assert is (condition, message), not node:assert, so the
    // column list is compared as one string: a difference then shows up in the
    // failure text instead of only as "not equal".
    assert(Object.keys(rows[0]).sort().join(',') ===
      'asset_id,byte_size,display_name,master_bucket,master_key,mime_type,status',
      `it returned ${JSON.stringify(Object.keys(rows[0]))}`);
    // checksum, technical_metadata and uploaded_by are nobody else's business:
    // the digest belongs to the takedown record and the metadata to moderation.
    assert(!('checksum' in rows[0]), 'the signing path exposes the digest');
    assert(!('technical_metadata' in rows[0]), 'the signing path exposes the metadata');
    assert(!('uploaded_by' in rows[0]), 'the signing path exposes who uploaded it');
  });

  // -------------------------------------------------------------------------
  console.log('\nThe delivery copy: three branches, one answer');
  // -------------------------------------------------------------------------

  await test('the teacher who wrote the version may play its rendition', async () => {
    assert(await mayPlay(teacher, rendition) === true,
      'a teacher could not watch the lesson they recorded');
    assert(await mayPlay(learnerUser, rendition) === true,
      'the premise failed: an entitled learner could not play it');
  });

  await test('a reviewer may play it while the assignment is active, and not after', async () => {
    assert(await mayPlay(reviewer, rendition) === true, 'an accepted reviewer could not play it');
    assert(await mayPlay(finishedReviewer, rendition) === false,
      'a reviewer who had already finished could still play it');
    assert(await mayPlay(declinedReviewer, rendition) === false,
      'a reviewer who declined the assignment could play it');

    await setStatus(activeAssignment, 'completed');
    try {
      assert(await mayPlay(reviewer, rendition) === false,
        'a reviewer kept the bytes after their assignment was completed');
    } finally {
      await setStatus(activeAssignment, 'in_progress');
    }
    assert(await mayPlay(reviewer, rendition) === true,
      'a reviewer who is still working did not get the bytes back');
  });

  await test('a reviewer of one version may not play another version\'s rendition', async () => {
    const otherRendition = (await asActor(admin,
      `select * from public.register_media_rendition($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [otherAsset, '480p', 'video/mp4', 3_145_728, 854, 480, 900, 600, null])).rows[0].rendition_id;
    await asActor(admin, 'select public.confirm_media_rendition($1)', [otherRendition]);

    assert(await mayPlay(reviewer, otherRendition) === false,
      'a reviewer reached a version they were never assigned');
    assert(await mayPlay(teacher, otherRendition) === true,
      'a teacher could not watch their own other course');
  });

  await test('a stranger may not play it, and the rendition row stays unreadable', async () => {
    assert(await mayPlay(strangerUser, rendition) === false, 'a stranger could play it');
    assert(await mayPlay(outsider, rendition) === false, 'another teacher could play it');
    const rows = (await asActor(reviewer,
      'select id, object_key from public.media_renditions where id=$1', [rendition])).rows;
    assert(rows.length === 1, 'an active reviewer could not read the rendition row they may play');
    const none = (await asActor(finishedReviewer,
      'select id, object_key from public.media_renditions where id=$1', [rendition])).rows;
    assert(none.length === 0, 'a finished reviewer could still read the object key');
  });

  await test('quarantining the master withdraws the rendition from everybody but the archive', async () => {
    const held = await taughtRendition();
    assert(await mayPlay(teacher, held.rendition) === true, 'the premise failed');
    assert(await mayPlay(reviewer, held.rendition) === true, 'the premise failed');
    assert(await mayPlay(learnerUser, held.rendition) === true, 'the premise failed');

    await asActor(admin, 'select public.quarantine_media_upload($1,$2)', [held.asset, 'rights query']);
    assert(await mayPlay(teacher, held.rendition) === false,
      'a teacher kept watching a rendition whose master was quarantined');
    assert(await mayPlay(reviewer, held.rendition) === false,
      'a reviewer kept watching a rendition whose master was quarantined');
    assert(await mayPlay(learnerUser, held.rendition) === false,
      'a learner kept watching a rendition whose master was quarantined');
    // The uploader still sees their own file, which is what makes a takedown
    // answerable.
    assert(await mayWatch(teacher, held.asset) === true,
      'quarantine took the uploader\'s own file away from them');
  });

  /** A second lesson, master and rendition, for the cases that end in quarantine. */
  async function taughtRendition() {
    const heldLesson = await newLesson(section, { title: 'Held lesson', position: 2 });
    const heldAsset = await newAsset(teacher, { status: 'available' });
    await q(
      `insert into public.lesson_resources
         (lesson_id, resource_type, media_asset_id, display_name, position)
       values ($1,'video',$2,'Recorded lesson',1)`, [heldLesson, heldAsset]);
    const id = (await asActor(admin,
      `select * from public.register_media_rendition($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [heldAsset, '720p', 'video/mp4', 5_242_880, 1280, 720, 1200, 600, null])).rows[0].rendition_id;
    await asActor(admin, 'select public.confirm_media_rendition($1)', [id]);
    // The reviewer's assignment covers the version, so this lesson is in scope
    // without another fixture.
    return { asset: heldAsset, rendition: id };
  }

  // -------------------------------------------------------------------------
  console.log('\nNobody gets a copy');
  // -------------------------------------------------------------------------

  await test('watching is not saving: the teacher and the reviewer may not download the lesson', async () => {
    for (const who of [teacher, reviewer, learnerUser]) {
      const ok = (await asActor(who, 'select public.may_download_lesson($1) as ok', [lesson])).rows[0].ok;
      assert(ok === false,
        'watching a rendition granted an offline copy, which is an entitlement and not a role');
    }
  });

  await test('the predicate refuses a null rather than answering yes', async () => {
    for (const fn of ['public.may_watch_master($1)', 'public.may_review_version_media($1)']) {
      const ok = (await asActor(teacher, `select ${fn} as ok`, [null])).rows[0].ok;
      assert(ok === false, `${fn} answered yes about null`);
    }
    const rows = await target(teacher, null);
    assert(rows.length === 0, 'the target function answered about null');
  });

  await test('the learner profile fixture is the one the entitlement uses', async () => {
    const rows = (await q(
      `select count(*)::int n from public.entitlement_grants
        where learner_profile_id=$1 and status='active'`, [learnerProfile])).rows[0].n;
    assert(rows === 1, 'the premise failed: the learner had no active grant');
  });
}
