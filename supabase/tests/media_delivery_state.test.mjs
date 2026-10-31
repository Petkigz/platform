// Does the file a teacher uploaded actually play?
//
// `media_renditions_read` is `may_play_rendition() OR is_privileged()`, and
// `may_play_rendition()` requires the copy to be `available` and a lesson to
// reference it which the caller can reach. Right for serving bytes, useless for
// answering "is my upload ready": the person waiting sees nothing.
//
// So the two functions here return *counts* rather than rows — how many copies
// exist, in what state, and why the last failure failed — and this suite pins
// three things that would each be silent if wrong: who may ask, what an empty
// answer means, and that no object coordinate comes back with the answer.

export async function run(ctx) {
  const {
    q, test, assert, rejects, asAnon, committed,
    bootstrapAdmin, newUser, newProfile, newInstructor, newReviewer, ensureReviewerProfile,
    newCourse, newVersion, newSection, newLesson, newAsset,
  } = ctx;

  const admin = await bootstrapAdmin('delivery-admin@example.com');
  const teacher = await newInstructor('delivery-teacher@example.com', admin);
  await newProfile(teacher, 'Teacher');
  const otherTeacher = await newInstructor('delivery-other@example.com', admin);
  await newProfile(otherTeacher, 'Other teacher');
  const reviewer = await newReviewer('delivery-reviewer@example.com', admin);
  const unassignedReviewer = await newReviewer('delivery-unassigned@example.com', admin);
  const learnerUser = await newUser('delivery-learner@example.com');
  await newProfile(learnerUser, 'Learner');
  const strangerUser = await newUser('delivery-stranger@example.com');
  await newProfile(strangerUser, 'Stranger');

  async function asActor(actor, sql, params = []) {
    await q('begin');
    await q("select set_config('request.jwt.claims',$1,true)",
      [JSON.stringify({ sub: actor, role: 'authenticated' })]);
    await q('set local role authenticated');
    try { const r = await q(sql, params); await q('commit'); return r; }
    catch (e) { await q('rollback'); throw e; }
  }

  // One row per uploaded file in the version. The single-lesson screen calls
  // this too and keeps the rows for its lesson, so every test here is also a test
  // of that screen's only read.
  const versionState = async (actor, versionId) =>
    (await asActor(actor, 'select * from public.version_delivery_state($1)', [versionId])).rows;

  const libraryState = async (actor) =>
    (await asActor(actor, 'select * from public.my_media_delivery()')).rows;

  /** A copy of a master, written as staff would write it. */
  async function copyOf(assetId, profile, status, over = {}) {
    return (await q(
      `insert into public.media_renditions
         (asset_id, profile, bucket, object_key, mime_type, byte_size, width, height,
          duration_seconds, status, failure_reason, created_by)
       values ($1,$2,'ayahspring-renditions',$3,$4,$5,$6,$7,600,$8,$9,$10) returning id`,
      [assetId, profile,
       `${assetId}/${profile}/${crypto.randomUUID()}.bin`,
       over.mimeType ?? (profile === 'audio' ? 'audio/mp4' : 'video/mp4'),
       over.byteSize ?? 1048576,
       over.width === undefined ? (profile === 'audio' ? null : 1280) : over.width,
       over.height === undefined ? (profile === 'audio' ? null : 720) : over.height,
       status, status === 'failed' ? (over.reason ?? 'encoder exited 137') : null,
       admin])).rows[0].id;
  }

  /** A draft course with one lesson, owned by `teacher`. */
  async function ownedLesson() {
    const course = await newCourse(teacher, { status: 'active' });
    const version = await newVersion(course, teacher);
    const section = await newSection(version);
    const lesson = await newLesson(section);
    return { course, version, section, lesson };
  }

  async function attach(lessonId, assetId, position = 1) {
    const id = (await q(
      `insert into public.lesson_resources (lesson_id, resource_type, media_asset_id, display_name, position)
       values ($1,'video',$2,'Recorded lesson',$3) returning id`, [lessonId, assetId, position])).rows[0].id;
    return id;
  }

  async function assignReviewer(versionId, reviewerUserId) {
    const profile = await ensureReviewerProfile(reviewerUserId, admin);
    await committed(async () => {
      await q(`insert into public.content_review_assignments
                 (course_version_id, reviewer_profile_id, review_scope, assigned_by,
                  assignment_status, accepted_at)
               values ($1,$2,'scholarly',$3,'accepted',now())`, [versionId, profile, admin]);
    });
  }

  // -------------------------------------------------------------------------
  // What each state reports
  // -------------------------------------------------------------------------

  await test('a verified master with no copies is reported as nothing playable', async () => {
    const { lesson, version } = await ownedLesson();
    const asset = await newAsset(teacher, { status: 'available' });
    const resource = await attach(lesson, asset);

    const rows = await versionState(teacher, version);
    assert(rows.length === 1, 'the lesson has one uploaded file and the report must have one row');
    const row = rows[0];
    assert(row.resource_id === resource, 'the row is keyed by the resource, so a screen can join on it');
    assert(row.asset_status === 'available', 'the master is verified');
    assert(row.available_copies === 0 && row.pending_copies === 0 && row.failed_copies === 0,
      'a verified master with no copies must report three zeroes, not one null');
    assert(row.video_ready === false && row.audio_ready === false,
      'nothing has been encoded, so nothing may claim to be playable');
  });

  await test('a pending copy is pending, and is not playable', async () => {
    const { lesson, version } = await ownedLesson();
    const asset = await newAsset(teacher, { status: 'available' });
    await attach(lesson, asset);
    await copyOf(asset, '720p', 'pending');

    const row = (await versionState(teacher, version))[0];
    assert(row.pending_copies === 1 && row.available_copies === 0);
    assert(row.video_ready === false, 'a copy still being encoded is not something a browser can play');
  });

  await test('one available video copy makes the file playable, and two do not count twice', async () => {
    const { lesson, version } = await ownedLesson();
    const asset = await newAsset(teacher, { status: 'available' });
    await attach(lesson, asset);
    // The ladder a worker actually writes for one master.
    await copyOf(asset, '720p', 'pending');
    await copyOf(asset, '480p', 'available');
    await copyOf(asset, 'audio', 'available');

    const row = (await versionState(teacher, version))[0];
    assert(row.available_copies === 2);
    assert(row.pending_copies === 1);
    assert(row.video_ready === true);
    assert(row.audio_ready === true);
  });

  await test('a poster or a manifest is not a player', async () => {
    const { lesson, version } = await ownedLesson();
    const asset = await newAsset(teacher, { status: 'available' });
    await attach(lesson, asset);
    await copyOf(asset, 'poster', 'available', { mimeType: 'image/jpeg', width: 1280, height: 720 });
    await copyOf(asset, 'manifest', 'available', { mimeType: 'application/vnd.apple.mpegurl', width: null, height: null });

    const row = (await versionState(teacher, version))[0];
    assert(row.available_copies === 2, 'both copies exist');
    assert(row.video_ready === false,
      'a poster and a manifest are delivery copies and neither one is a video a browser plays');
  });

  await test('an audio-only encode says so instead of saying nothing', async () => {
    const { lesson, version } = await ownedLesson();
    const asset = await newAsset(teacher, { status: 'available' });
    await attach(lesson, asset);
    await copyOf(asset, 'audio', 'available');

    const row = (await versionState(teacher, version))[0];
    assert(row.audio_ready === true && row.video_ready === false,
      'a learner gets sound and no picture, and the page has to be able to say that');
  });

  await test('a failure carries its reason, and the most recent one wins', async () => {
    const { lesson, version } = await ownedLesson();
    const asset = await newAsset(teacher, { status: 'available' });
    await attach(lesson, asset);
    await copyOf(asset, '720p', 'failed', { reason: 'disk full' });
    // Two failed profiles, written in order, so `updated_at` decides which
    // reason is shown — the newest, because it is the one that still applies.
    await copyOf(asset, '480p', 'failed', { reason: 'codec not supported' });
    // `set_updated_at()` stamps now() on every update, so the ordering has to be
    // written rather than slept for. The trigger is off for exactly two
    // statements and back on in a finally, because a suite that leaves a
    // trigger disabled breaks every suite after it.
    await q('alter table public.media_renditions disable trigger media_renditions_set_updated_at');
    try {
      await q(`update public.media_renditions set updated_at = now() - interval '1 hour'
                where asset_id = $1 and profile = '720p'`, [asset]);
      await q(`update public.media_renditions set updated_at = now()
                where asset_id = $1 and profile = '480p'`, [asset]);
    } finally {
      await q('alter table public.media_renditions enable trigger media_renditions_set_updated_at');
    }

    const row = (await versionState(teacher, version))[0];
    assert(row.failed_copies === 2);
    assert(row.failure_reason === 'codec not supported',
      'the author is shown the reason that still applies, not the first one ever recorded');
  });

  await test('a held master is reported as held, whatever copies exist', async () => {
    const { lesson, version } = await ownedLesson();
    // Quarantining does not delete the copies; it stops them being served. The
    // report has to show both facts or a teacher will ask why a copy that is
    // "available" is not playing.
    const asset = await newAsset(teacher, { status: 'quarantined' });
    await attach(lesson, asset);
    await copyOf(asset, '720p', 'available');

    const row = (await versionState(teacher, version))[0];
    assert(row.asset_status === 'quarantined');
    assert(row.available_copies === 1);
  });

  await test('a withdrawn master disappears from the report', async () => {
    const { lesson, version } = await ownedLesson();
    const asset = await newAsset(teacher, { status: 'available' });
    await attach(lesson, asset);
    await copyOf(asset, '720p', 'available');
    await q(`update public.media_assets set deleted_at = now() where id = $1`, [asset]);

    const rows = await versionState(teacher, version);
    assert(rows.length === 0, 'D7: a tombstoned master is gone from every path, this one included');
  });

  await test('a lesson of only external addresses has nothing to report', async () => {
    // The common case, and it must not look like a failure: no uploaded files
    // means no rows, and the screen renders nothing extra.
    const { lesson, version } = await ownedLesson();
    await q(`insert into public.lesson_resources (lesson_id, resource_type, external_url, display_name, position)
             values ($1,'video','https://video.example/watch/1','Talk',1)`, [lesson]);
    assert((await versionState(teacher, version)).length === 0);
  });

  // -------------------------------------------------------------------------
  // Who may ask
  // -------------------------------------------------------------------------

  await test('the version author may ask, and so may the person who uploaded the file', async () => {
    const { lesson, version } = await ownedLesson();
    // Staff uploaded this one, not the author — the case `may_watch_master()`
    // learned to handle and this report has to agree with.
    const asset = await newAsset(admin, { status: 'available' });
    await attach(lesson, asset);
    await copyOf(asset, '720p', 'available');

    assert((await versionState(teacher, version)).length === 1, 'the author may ask about their own lesson');
    assert((await versionState(admin, version)).length === 1, 'the uploader may ask, even as staff');
    assert(version, 'the version exists');
  });

  await test('a reviewer assigned to the version may ask; one who is not may not', async () => {
    const { lesson, version } = await ownedLesson();
    const asset = await newAsset(teacher, { status: 'available' });
    await attach(lesson, asset);
    await copyOf(asset, '720p', 'available');

    assert((await versionState(reviewer, version)).length === 0,
      'an unassigned reviewer is a stranger to this version');
    await assignReviewer(version, reviewer);
    assert((await versionState(reviewer, version)).length === 1,
      'what is under review is what a learner gets, so the reviewer gets the same report');
    assert((await versionState(unassignedReviewer, version)).length === 0,
      'a second reviewer is not carried in by the first one\'s assignment');
  });

  await test('another teacher, a learner and a stranger all get nothing', async () => {
    const { lesson, version } = await ownedLesson();
    const asset = await newAsset(teacher, { status: 'available' });
    await attach(lesson, asset);
    await copyOf(asset, '720p', 'available');

    for (const [who, id] of [
      ['another teacher', otherTeacher],
      ['a signed-in learner', learnerUser],
      ['a stranger with an account', strangerUser],
    ]) {
      assert((await versionState(id, version)).length === 0, `${who} must not see a draft lesson's encoding state`);
    }
  });

  await test('no session at all may run either function', async () => {
    const { lesson, version } = await ownedLesson();
    assert(lesson, 'the fixture builds a lesson');

    // `asAnon` is a signed-in session with no user in it. The grant is to
    // `authenticated`, so the call is allowed and returns nothing — which is the
    // answer, not an error.
    await asAnon(async () => {
      assert((await q('select * from public.version_delivery_state($1)', [version])).rows.length === 0);
      assert((await q('select * from public.my_media_delivery()')).rows.length === 0);
    });

    // The anonymous role cannot execute them at all: the functions are revoked
    // from public and granted only to authenticated. One transaction each —
    // a refused statement aborts the block it is in, so the second refusal in
    // the same block would be reported as "transaction is aborted" and would
    // pass while proving nothing.
    const refusedAsAnon = async (sql, params = []) => {
      await q('begin');
      await q("select set_config('request.jwt.claims','',true)");
      await q('set local role anon');
      try {
        await rejects(() => q(sql, params), /permission denied/i);
      } finally {
        await q('rollback');
      }
    };

    await refusedAsAnon('select * from public.version_delivery_state($1)', [version]);
    await refusedAsAnon('select * from public.my_media_delivery()');
  });

  await test('the answer carries no object coordinates', async () => {
    // The whole reason these are functions rather than a widened policy. A
    // column added to `media_renditions` must not appear here by accident, so
    // the check is against the shape of a real answer rather than a comment.
    const { lesson, version } = await ownedLesson();
    const asset = await newAsset(teacher, { status: 'available' });
    await attach(lesson, asset);
    await copyOf(asset, '720p', 'available');

    const shapes = [
      ['version_delivery_state',
        (await asActor(admin, 'select * from public.version_delivery_state($1)', [version])).rows[0]],
      ['my_media_delivery',
        (await asActor(admin, 'select * from public.my_media_delivery()')).rows[0]],
    ];
    for (const [name, row] of shapes) {
      assert(row, `${name} returned nothing to inspect`);
      for (const forbidden of ['bucket', 'object_key', 'checksum', 'master_key', 'master_bucket']) {
        assert(!(forbidden in row), `${name} must not return ${forbidden}`);
      }
    }
  });

  await test('a version reports every lesson in reading order, with the lesson id', async () => {
    // The rehearsal screen renders sections and lessons in curriculum order, so
    // an unordered answer would make it re-sort — and a re-sort is where the
    // rows and the titles drift apart.
    const { version, section, lesson } = await ownedLesson();
    const second = await newLesson(section, { title: 'Second', position: 2 });
    const third = await newLesson(section, { title: 'Third', position: 3 });

    const firstAsset = await newAsset(teacher);
    const thirdAsset = await newAsset(teacher);
    await attach(lesson, firstAsset);
    await attach(third, thirdAsset);
    assert(second, 'the middle lesson has no upload and must still be absent from this report, not invented');

    const rows = await versionState(teacher, version);
    assert(
      JSON.stringify(rows.map((r) => r.lesson_id)) === JSON.stringify([lesson, third]),
      'only lessons with an uploaded file appear, in the order the course reads',
    );
  });

  await test('one version never reports another version\'s files', async () => {
    const mine = await ownedLesson();
    const asset = await newAsset(teacher);
    await attach(mine.lesson, asset);

    const otherCourse = await newCourse(teacher, { status: 'active' });
    const otherVersion = await newVersion(otherCourse, teacher);

    assert((await versionState(teacher, otherVersion)).length === 0,
      'a version with no uploads reports nothing, not its sibling\'s uploads');
  });

  await test('the lesson-level read is gone, so the guard is written once', async () => {
    // Two security-definer functions guarding the same three people by two
    // spellings is a guard that is wrong once. The single-lesson screen filters
    // this function's rows instead.
    const { version } = await ownedLesson();
    await rejects(
      () => q('select * from public.lesson_delivery_state($1)', [version]),
      /does not exist|permission denied|function/i,
    );
  });

  await test('a file\'s uploader sees that file even in a course that is not theirs', async () => {
    // Staff upload into a teacher's course. The teacher sees the encoding state
    // of everything in their version; the staff member who uploaded one file
    // sees that file — and nothing else about a course they do not author.
    const { version, lesson } = await ownedLesson();
    const theirs = await newCourse(otherTeacher, { status: 'active' });
    const theirVersion = await newVersion(theirs, otherTeacher);
    const theirSection = await newSection(theirVersion);
    const theirLesson = await newLesson(theirSection);

    const uploadedByStaff = await newAsset(admin);
    await attach(lesson, uploadedByStaff);
    const teachersOwnFile = await newAsset(otherTeacher);
    await attach(theirLesson, teachersOwnFile);

    assert((await versionState(admin, theirVersion)).length === 1,
      'the up loader sees the file they are waiting on');
    assert((await versionState(admin, version)).length === 1,
      'and not the rest of the platform\'s inventory');
    assert((await versionState(otherTeacher, version)).length === 0,
      'a teacher who did not upload into this course and does not author it sees nothing');
  });

  // -------------------------------------------------------------------------
  // The uploader's own library
  // -------------------------------------------------------------------------

  await test('the library reports an asset with no copies as zero, not as missing', async () => {
    const uploaded = await newAsset(otherTeacher, { status: 'available' });
    const rows = await libraryState(otherTeacher);
    const row = rows.find((r) => r.asset_id === uploaded);
    assert(row, 'every visible master gets a row, encoded or not — otherwise the library cannot say "nothing yet"');
    assert(row.available_copies === 0 && row.video_ready === false);
  });

  await test('the library shows only what media_assets_read shows', async () => {
    const mine = await newAsset(otherTeacher, { status: 'available' });
    await copyOf(mine, '720p', 'available');
    const theirs = await newAsset(teacher, { status: 'available' });
    await copyOf(theirs, '720p', 'available');

    const rows = await libraryState(learnerUser);
    assert(rows.length === 0, 'a learner uploaded nothing and must see nothing');

    const teacherRows = await libraryState(otherTeacher);
    const ids = teacherRows.map((r) => r.asset_id);
    assert(ids.includes(mine), 'the uploader sees their own file');
    assert(!ids.includes(theirs), 'and not somebody else\'s');
    assert(teacherRows.find((r) => r.asset_id === mine).video_ready === true);
  });

  await test('staff see every file, and a withdrawn one is nobody\'s', async () => {
    const live = await newAsset(teacher, { status: 'available' });
    const withdrawn = await newAsset(teacher, { status: 'available' });
    await q(`update public.media_assets set deleted_at = now() where id = $1`, [withdrawn]);

    const ids = (await libraryState(admin)).map((r) => r.asset_id);
    assert(ids.includes(live), 'staff moderate, so staff see the encoding state');
    assert(!ids.includes(withdrawn), 'a tombstoned master is not in the library and not in this report');
  });

  await test('a failed encode is visible to the uploader, which is the point', async () => {
    const asset = await newAsset(otherTeacher, { status: 'available' });
    await copyOf(asset, '720p', 'failed', { reason: 'encoder exited 137 (out of memory)' });

    const row = (await libraryState(otherTeacher)).find((r) => r.asset_id === asset);
    assert(row.failed_copies === 1, 'failed copies used to be invisible to everyone but staff');
    assert(row.failure_reason === 'encoder exited 137 (out of memory)');
    assert(row.video_ready === false);
  });
}
