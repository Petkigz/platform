// Saving a lesson to a device, and the three things that end it.
//
// Decided 2026-10-22: downloads work like an app's own downloads — they live in
// the app, not in the file manager — and they need a Plus plan on top of Basic.
//
// `offline_download.test.mjs` already pins the predicate. This suite pins the
// record: the save is bookable once, it expires, it is capped per device, and
// removing a device takes its saves with it.

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    bootstrapAdmin, newUser, newProfile, newInstructor,
    newCourse, newVersion, newSection, newLesson, newAsset,
  } = ctx;

  const admin = await bootstrapAdmin('saved-admin@example.com');
  const teacher = await newInstructor('saved-teacher@example.com', admin);
  const subject = (await q("select id from public.subject_areas where code='quran' limit 1")).rows[0].id;

  const scalar = async (sql, params = []) => (await q(sql, params)).rows[0];

  async function asActor(actor, sql, params = []) {
    await q('begin');
    await q("select set_config('request.jwt.claims',$1,true)", [
      JSON.stringify({ sub: actor, role: 'authenticated' }),
    ]);
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

  let seq = 0;
  async function learner(name) {
    seq += 1;
    const userId = await newUser(`saved-learners-${seq}@example.com`);
    await newProfile(userId, name);
    const learnerId = (await scalar(
      `insert into public.learner_profiles (display_name, learner_type, age_band, linked_user_id)
       values ($1,'adult','18+',$2) returning id`, [name, userId])).id;
    return { userId, learnerId, name };
  }

  /** A lesson whose video is first-party and verified. */
  async function taughtLesson() {
    seq += 1;
    const course = await newCourse(teacher, { status: 'active', title: `Saved Course ${seq}` });
    const version = await newVersion(course, teacher);
    await q('insert into public.course_version_subjects (course_version_id, subject_area_id) values ($1,$2)',
      [version, subject]);
    const section = await newSection(version);
    const lesson = await newLesson(section);
    const asset = await newAsset(teacher, { status: 'available' });
    await q(`insert into public.lesson_resources
               (lesson_id, resource_type, media_asset_id, display_name, position)
             values ($1,'video',$2,'Recorded lesson',1)`, [lesson, asset]);
    return { course, version, lesson };
  }

  const grantAccess = (learnerId, versionId) =>
    q(`insert into public.entitlement_grants
         (learner_profile_id, scope_type, course_version_id, source_type, status)
       values ($1,'course_version',$2,'purchase','active')`, [learnerId, versionId]);

  const grantFeature = (learnerId) =>
    q(`insert into public.entitlement_grants
         (learner_profile_id, scope_type, feature_code, source_type, status)
       values ($1,'feature','offline_downloads','subscription','active')`, [learnerId]);

  async function withOffline(fn) {
    const before = (await scalar(
      `select value_text from public.platform_settings where key = 'learning.offline'`)).value_text;
    await q(`update public.platform_settings set value_text = 'true'
              where key = 'learning.offline'`);
    try {
      return await fn();
    } finally {
      await q(`update public.platform_settings set value_text = $1
                where key = 'learning.offline'`, [before]);
    }
  }

  const save = async (actor, lessonId, deviceKey = 'device-abcdefghijklmnop') =>
    (await asActor(actor, 'select public.save_offline_lesson($1,$2,$3) r',
      [lessonId, deviceKey, 'Phone'])).rows[0].r;

  // ---------------------------------------------------------------------------
  // The save
  // ---------------------------------------------------------------------------
  await test('a Plus learner saves a lesson, once, and it carries an expiry', async () => withOffline(async () => {
    const me = await learner('Saving Learner');
    const lesson = await taughtLesson();
    await grantAccess(me.learnerId, lesson.version);
    await grantFeature(me.learnerId);

    const first = await save(me.userId, lesson.lesson);
    assert(first.saved === true, `refused: ${first.reason}`);
    assert(first.expiresAt !== undefined, 'the save carries no expiry');
    assert(first.mediaAssetId !== null, 'the save does not name the file it came from');

    // Saving the same lesson again refreshes the clock rather than adding a row:
    // a lesson is on a device or it is not.
    await save(me.userId, lesson.lesson);
    const rows = await scalar(
      `select count(*)::int n from public.offline_downloads
        where learner_profile_id = $1 and removed_at is null`, [me.learnerId]);
    assert(rows.n === 1, `${rows.n} rows for one lesson on one device`);

    const listed = (await asActor(me.userId,
      'select * from public.my_offline_lessons($1)', ['device-abcdefghijklmnop'])).rows;
    assert(listed.length === 1, `${listed.length} lessons on the device`);
    assert(listed[0].lesson_title.length > 0, 'the list has no lesson title');
    assert(listed[0].lapsed === false, 'a fresh save is reported as lapsed');
  }));

  await test('a learner without the feature is refused, and nothing is written', async () => withOffline(async () => {
    const me = await learner('Basic Learner');
    const lesson = await taughtLesson();
    await grantAccess(me.learnerId, lesson.version);

    const result = await save(me.userId, lesson.lesson);
    assert(result.saved === false, 'a Basic learner saved a lesson');
    assert(result.reason === 'not_entitled', `reason ${result.reason}`);

    const rows = await scalar(
      `select count(*)::int n from public.offline_downloads
        where learner_profile_id = $1`, [me.learnerId]);
    assert(rows.n === 0, 'a refusal still wrote a download row');
  }));

  await test('the feature being off is a sentence, not an error', async () => {
    const me = await learner('Waiting Learner');
    const lesson = await taughtLesson();
    await grantAccess(me.learnerId, lesson.version);
    await grantFeature(me.learnerId);

    const result = await save(me.userId, lesson.lesson);
    assert(result.saved === false, 'a save succeeded with learning.offline off');
    assert(result.reason === 'feature_off', `reason ${result.reason}`);
    assert(typeof result.message === 'string', 'the refusal has no sentence');
  });

  // ---------------------------------------------------------------------------
  // The cap
  // ---------------------------------------------------------------------------
  await test('a fourth device is refused, and removing one makes room', async () => withOffline(async () => {
    const me = await learner('Three Devices');
    const lesson = await taughtLesson();
    await grantAccess(me.learnerId, lesson.version);
    await grantFeature(me.learnerId);

    for (const key of ['device-aaaaaaaaaaaaaaaa', 'device-bbbbbbbbbbbbbbbb', 'device-cccccccccccccccc']) {
      const saved = await save(me.userId, lesson.lesson, key);
      assert(saved.saved === true, `${key} was refused: ${saved.reason}`);
    }

    const fourth = await save(me.userId, lesson.lesson, 'device-dddddddddddddddd');
    assert(fourth.saved === false, 'a fourth device was allowed');
    assert(fourth.reason === 'device_limit', `reason ${fourth.reason}`);
    assert(fourth.cap === 3, `cap reported as ${fourth.cap}`);

    const devices = (await asActor(me.userId, 'select * from public.my_offline_devices()')).rows;
    assert(devices.length === 3, `${devices.length} devices listed`);

    await asActor(me.userId, 'select public.remove_offline_device($1)', [devices[0].device_id]);

    const after = await save(me.userId, lesson.lesson, 'device-dddddddddddddddd');
    assert(after.saved === true, `still refused after removing one: ${after.reason}`);
  }));

  await test('removing a device takes its saves with it', async () => withOffline(async () => {
    const me = await learner('Revoking Learner');
    const lesson = await taughtLesson();
    await grantAccess(me.learnerId, lesson.version);
    await grantFeature(me.learnerId);
    await save(me.userId, lesson.lesson);

    const device = (await asActor(me.userId,
      'select device_id from public.my_offline_devices() limit 1')).rows[0];
    await asActor(me.userId, 'select public.remove_offline_device($1)', [device.device_id]);

    const listed = (await asActor(me.userId,
      'select * from public.my_offline_lessons($1)', ['device-abcdefghijklmnop'])).rows;
    assert(listed.length === 0, 'a removed device still lists its lessons');

    const live = await scalar(
      `select count(*)::int n from public.offline_downloads
        where learner_profile_id = $1 and removed_at is null`, [me.learnerId]);
    assert(live.n === 0, 'saves survived the removal of their device');
  }));

  // ---------------------------------------------------------------------------
  // Lapse
  // ---------------------------------------------------------------------------
  await test('a save from last month is reported as lapsed', async () => withOffline(async () => {
    const me = await learner('Stale Learner');
    const lesson = await taughtLesson();
    await grantAccess(me.learnerId, lesson.version);
    await grantFeature(me.learnerId);
    await save(me.userId, lesson.lesson);

    await q(`update public.offline_downloads
               set saved_at = now() - interval '40 days',
                   expires_at = now() - interval '10 days'
             where learner_profile_id = $1`, [me.learnerId]);

    const listed = (await asActor(me.userId,
      'select * from public.my_offline_lessons($1)', ['device-abcdefghijklmnop'])).rows;
    assert(listed.length === 1, 'a lapsed save disappeared instead of saying so');
    assert(listed[0].lapsed === true, 'a save past its expiry is not reported as lapsed');
  }));

  // ---------------------------------------------------------------------------
  // Boundaries
  // ---------------------------------------------------------------------------
  await test('forgetting a lesson marks it removed rather than deleting the record', async () => withOffline(async () => {
    const me = await learner('Tidy Learner');
    const lesson = await taughtLesson();
    await grantAccess(me.learnerId, lesson.version);
    await grantFeature(me.learnerId);
    const saved = await save(me.userId, lesson.lesson);

    await asActor(me.userId, 'select public.forget_offline_lesson($1)', [saved.downloadId]);

    const row = await scalar('select removed_at from public.offline_downloads where id = $1',
      [saved.downloadId]);
    assert(row !== undefined, 'the record was deleted');
    assert(row.removed_at !== null, 'the record was not marked removed');
  }));

  await test('nobody can list or remove another account\'s downloads', async () => withOffline(async () => {
    const owner = await learner('Owner Learner');
    const stranger = await learner('Stranger Learner');
    const lesson = await taughtLesson();
    await grantAccess(owner.learnerId, lesson.version);
    await grantFeature(owner.learnerId);
    const saved = await save(owner.userId, lesson.lesson);

    const theirs = (await asActor(stranger.userId,
      'select * from public.my_offline_lessons($1)', ['device-abcdefghijklmnop'])).rows;
    assert(theirs.length === 0, 'a stranger listed another account\'s downloads');

    await rejects(() => asActor(stranger.userId,
      'select public.forget_offline_lesson($1)', [saved.downloadId]),
      'a stranger removed another account\'s saved lesson');

    const devices = (await asActor(stranger.userId, 'select * from public.my_offline_devices()')).rows;
    assert(devices.length === 0, 'a stranger listed another account\'s devices');
  }));

  await test('a device key has to look like one', async () => withOffline(async () => {
    const me = await learner('Careless Learner');
    const lesson = await taughtLesson();
    await grantAccess(me.learnerId, lesson.version);
    await grantFeature(me.learnerId);

    await rejects(() => save(me.userId, lesson.lesson, 'short'),
      'a four-character device key was accepted');
    await rejects(() => save(me.userId, lesson.lesson, 'has spaces in it and is long enough'),
      'a device key with spaces was accepted');
  }));
}
