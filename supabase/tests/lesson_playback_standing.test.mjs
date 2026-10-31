// What a learner is told when the recording is not there.
//
// The lesson page used to print one sentence — "uploaded, not yet encoded for
// playback" — for six different situations, to the one person who can do nothing
// about any of them. These tests pin the three words, the two that matter, and the
// guard that must match `lesson_resources_read` exactly: a report that can tell
// somebody about a resource they cannot see is worse than no report.

export async function run(ctx) {
  const {
    q, test, assert, rejects, asAnon,
    bootstrapAdmin, newUser, newProfile, newInstructor, newReviewer, satisfyReview,
    newCourse, newVersion, newSection, newLesson, newAsset,
  } = ctx;

  const admin = await bootstrapAdmin('standing-admin@example.com');
  const reviewer = await newReviewer('standing-reviewer@example.com', admin);
  const teacher = await newInstructor('standing-teacher@example.com', admin);
  await newProfile(teacher, 'Teacher');
  const otherTeacher = await newInstructor('standing-other@example.com', admin);
  await newProfile(otherTeacher, 'Other teacher');
  const learnerUser = await newUser('standing-learner@example.com');
  await newProfile(learnerUser, 'Learner');
  const strangerUser = await newUser('standing-stranger@example.com');
  await newProfile(strangerUser, 'Stranger');

  async function asActor(actor, sql, params = []) {
    await q('begin');
    await q("select set_config('request.jwt.claims',$1,true)",
      [JSON.stringify({ sub: actor, role: 'authenticated' })]);
    await q('set local role authenticated');
    try { const r = await q(sql, params); await q('commit'); return r; }
    catch (e) { await q('rollback'); throw e; }
  }

  const standing = async (actor, lessonId) =>
    (await asActor(actor, 'select * from public.lesson_playback_standing($1)', [lessonId])).rows;

  async function copyOf(assetId, profile, status, over = {}) {
    return (await q(
      `insert into public.media_renditions
         (asset_id, profile, bucket, object_key, mime_type, byte_size, width, height,
          duration_seconds, status, failure_reason, created_by)
       values ($1,$2,'ayahspring-renditions',$3,$4,$5,$6,$7,600,$8,$9,$10) returning id`,
      [assetId, profile, `${assetId}/${profile}/${crypto.randomUUID()}.bin`,
       over.mimeType ?? (profile === 'audio' ? 'audio/mp4' : 'video/mp4'),
       over.byteSize ?? 1048576,
       over.width === undefined ? (profile === 'audio' ? null : 1280) : over.width,
       over.height === undefined ? (profile === 'audio' ? null : 720) : over.height,
       status, status === 'failed' ? 'encoder exited 137' : null, admin])).rows[0].id;
  }

  /**
   * A course with one lesson and one uploaded file.
   *
   * `published` goes last because D5 freezes the version subtree: a lesson, its
   * resources and its preview flag have to exist before the version goes live, so
   * a test that published first and attached afterwards would be testing a state
   * the product cannot produce.
   */
  async function taught(over = {}) {
    const course = await newCourse(teacher, { status: 'active' });
    const version = await newVersion(course, teacher);
    const section = await newSection(version);
    const lesson = await newLesson(section, { is_preview: over.preview ?? false });
    const asset = await newAsset(teacher, { status: over.assetStatus ?? 'available' });
    const resource = (await q(
      `insert into public.lesson_resources
         (lesson_id, resource_type, media_asset_id, display_name, position, access_classification)
       values ($1,'video',$2,'Recorded lesson',1,$3) returning id`,
      [lesson, asset, over.access ?? 'enrolled'])).rows[0].id;

    if (over.published) {
      await q('select id from public.set_course_version_status($1,$2,$3,$4)',
        [version, 'submitted', teacher, 'test']);
      await q('select id from public.set_course_version_status($1,$2,$3,$4)',
        [version, 'approved', reviewer, 'test']);
      await satisfyReview(version, reviewer, admin);
      await q('select id from public.set_course_version_status($1,$2,$3,$4)',
        [version, 'published', admin, 'test']);
    }

    return { course, version, lesson, asset, resource };
  }

  async function enrol(userId, versionId) {
    const learner = (await q(
      `insert into public.learner_profiles (display_name, learner_type, age_band, linked_user_id)
       values ('Learner','adult','18+',$1) returning id`, [userId])).rows[0].id;
    await q(`insert into public.entitlement_grants (learner_profile_id, scope_type, course_version_id, source_type, status)
             values ($1,'course_version',$2,'purchase','active')`, [learner, versionId]);
    return learner;
  }

  // -------------------------------------------------------------------------
  // The three words
  // -------------------------------------------------------------------------

  await test('a playable copy says plays', async () => {
    const { lesson, asset } = await taught();
    await copyOf(asset, '720p', 'available');
    const rows = await standing(teacher, lesson);
    assert(rows.length === 1);
    assert(rows[0].state === 'plays');
  });

  await test('a poster or a manifest is not a player', async () => {
    const { lesson, asset } = await taught();
    await copyOf(asset, 'poster', 'available', { mimeType: 'image/jpeg', width: 1280, height: 720 });
    await copyOf(asset, 'manifest', 'available', { mimeType: 'application/vnd.apple.mpegurl', width: null, height: null });
    // Both copies exist and neither is a video. Reporting "plays" here would put
    // a learner in front of an empty player.
    assert((await standing(teacher, lesson))[0].state === 'preparing');
  });

  await test('a file still being verified is preparing, not broken', async () => {
    const { lesson } = await taught({ assetStatus: 'pending' });
    assert((await standing(teacher, lesson))[0].state === 'preparing');
  });

  await test('a copy being made is preparing', async () => {
    const { lesson, asset } = await taught();
    await copyOf(asset, '720p', 'pending');
    assert((await standing(teacher, lesson))[0].state === 'preparing');
  });

  await test('a verified file with nothing encoded is preparing', async () => {
    // The state that looks finished everywhere else. From the learner's side it is
    // the same fact as a queue, and the copy must not promise it will resolve —
    // there is no transcode worker.
    const { lesson } = await taught();
    assert((await standing(teacher, lesson))[0].state === 'preparing');
  });

  await test('a failed encode is unavailable, because no worker will retry it', async () => {
    const { lesson, asset } = await taught();
    await copyOf(asset, '720p', 'failed');
    assert((await standing(teacher, lesson))[0].state === 'unavailable');
  });

  await test('a failure with a copy still pending is preparing', async () => {
    const { lesson, asset } = await taught();
    await copyOf(asset, '720p', 'failed');
    await copyOf(asset, '480p', 'pending');
    assert((await standing(teacher, lesson))[0].state === 'preparing');
  });

  await test('a held master is unavailable even with a playable copy', async () => {
    const { lesson } = await taught({ assetStatus: 'quarantined' });
    const asset = await newAsset(teacher, { status: 'quarantined' });
    await copyOf(asset, '720p', 'available');
    assert((await standing(teacher, lesson))[0].state === 'unavailable');
  });

  await test('an external address is not in this report at all', async () => {
    // It is not an uploaded file and its fate is not ours to describe; the page
    // already knows what a link is.
    const { lesson } = await taught();
    await q(`insert into public.lesson_resources (lesson_id, resource_type, external_url, display_name, position)
             values ($1,'video','https://video.example/watch/1','Talk',2)`, [lesson]);
    const rows = await standing(teacher, lesson);
    assert(rows.length === 1, 'one uploaded file, one row');
  });

  await test('a withdrawn master is reported as nothing, not as unavailable', async () => {
    const { lesson, asset } = await taught();
    await copyOf(asset, '720p', 'available');
    await q(`update public.media_assets set deleted_at = now() where id = $1`, [asset]);
    assert((await standing(teacher, lesson)).length === 0);
  });

  // -------------------------------------------------------------------------
  // The guard, which must be `lesson_resources_read` and nothing else
  // -------------------------------------------------------------------------

  await test('an entitled learner may ask; a stranger may not', async () => {
    // Published, because that is the only state in which a learner can read the
    // version at all: `can_read_version` gives drafts to their author alone.
    const { lesson, version, asset } = await taught({ published: true });
    await copyOf(asset, '720p', 'available');

    assert((await standing(strangerUser, lesson)).length === 0,
      'a signed-in stranger is not entitled to this lesson');
    await enrol(learnerUser, version);
    assert((await standing(learnerUser, lesson))[0].state === 'plays',
      'the person the page is for can read it');
  });

  await test('another teacher cannot ask about a lesson that is not theirs', async () => {
    const { lesson, asset } = await taught({ published: true });
    await copyOf(asset, '720p', 'pending');
    assert((await standing(otherTeacher, lesson)).length === 0,
      'a published version is readable to everyone, and its encoding is not');
  });

  await test('a public preview resource is readable without an entitlement', async () => {
    // The classification is the grant: `lesson_resources_read` admits it, so this
    // must too, or a free sample would have a player and no explanation beside it.
    const { lesson, asset } = await taught({ preview: true, access: 'public_preview', published: true });
    await copyOf(asset, '720p', 'failed');
    assert((await standing(strangerUser, lesson))[0].state === 'unavailable');
  });

  await test('the author may ask, and staff may ask', async () => {
    const { lesson } = await taught();
    assert((await standing(teacher, lesson)).length === 1);
    assert((await standing(admin, lesson)).length === 1);
  });

  await test('no session at all cannot run it', async () => {
    const { lesson } = await taught();
    await asAnon(async () => {
      assert((await q('select * from public.lesson_playback_standing($1)', [lesson])).rows.length === 0,
        'a signed-in session with no user gets no rows, which is the answer');
    });

    await q('begin');
    await q("select set_config('request.jwt.claims','',true)");
    await q('set local role anon');
    try {
      await rejects(
        () => q('select * from public.lesson_playback_standing($1)', [lesson]),
        /permission denied/i,
      );
    } finally {
      await q('rollback');
    }
  });

  await test('the answer carries a state and nothing else', async () => {
    // The vocabulary is the boundary. A failure reason on this screen would be a
    // worker's log line shown to a learner.
    const { lesson, asset } = await taught();
    await copyOf(asset, '720p', 'failed');
    const row = (await standing(teacher, lesson))[0];
    assert(JSON.stringify(Object.keys(row).sort()) === JSON.stringify(['resource_id', 'state']),
      `expected two columns, got ${Object.keys(row).join(', ')}`);
    assert(row.state === 'unavailable');
  });
}
