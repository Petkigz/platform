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
    return { course, version, lesson, asset };
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

  await test('a mixed-use legacy coursework master cannot be booked or disclosed as a lesson save', async () => withOffline(async () => {
    const me=await learner('Mixed-use Learner');
    const lesson=await taughtLesson();
    await grantAccess(me.learnerId,lesson.version);
    await grantFeature(me.learnerId);
    // Simulate surviving pre-boundary provenance on an existing lesson resource.
    await q('insert into public.legacy_coursework_provenance(asset_id) values($1)',[lesson.asset]);
    await rejects(()=>save(me.userId,lesson.lesson),/cannot be saved until its media is reviewed/i);
    assert((await scalar('select count(*)::int n from public.offline_downloads where learner_profile_id=$1',[me.learnerId])).n===0,
      'a refused mixed-use save wrote a booking');
    assert((await scalar('select count(*)::int n from public.offline_devices where learner_profile_id=$1',[me.learnerId])).n===0,
      'a refused mixed-use save left a device');
    await rejects(()=>asActor(me.userId,'select public.save_offline_lesson_before_coursework_guard($1,$2,$3)',
      [lesson.lesson,'device-abcdefghijklmnop','Phone']),/permission denied/i);
    // A later ordinary resource in the same lesson remains saveable too.
    const safe=await newAsset(teacher,{status:'available'});
    await q(`insert into public.lesson_resources(lesson_id,resource_type,media_asset_id,display_name,position)
      values($1,'video',$2,'Another lesson file',2)`,[lesson.lesson,safe]);
    const mixedLessonSave=await save(me.userId,lesson.lesson);
    assert(mixedLessonSave.saved===true && mixedLessonSave.mediaAssetId===safe,'a safe lesson file was unnecessarily blocked or the private ID leaked');
    // Other lessons and the underlying offline feature remain available.
    const ordinary=await taughtLesson();
    await grantAccess(me.learnerId,ordinary.version);
    assert((await save(me.userId,ordinary.lesson)).saved===true,'ordinary offline saving was disabled');
  }));

  await test('resource-specific saves record the selected media and retain prior booking associations', async () => withOffline(async () => {
    const me=await learner('Multiple resources');
    const lesson=await taughtLesson();
    await grantAccess(me.learnerId,lesson.version);
    await grantFeature(me.learnerId);
    const first=(await scalar('select id from public.lesson_resources where lesson_id=$1 and media_asset_id=$2',[lesson.lesson,lesson.asset])).id;
    const secondAsset=await newAsset(teacher,{status:'available'});
    const second=(await scalar(`insert into public.lesson_resources(lesson_id,resource_type,media_asset_id,display_name,position)
      values($1,'video',$2,'Second resource',2) returning id`,[lesson.lesson,secondAsset])).id;
    const resourceSave=async resource=>(await asActor(me.userId,'select public.save_offline_lesson_for_resource($1,$2,$3,$4) as r',
      [lesson.lesson,resource,'device-resource-save-123','Phone'])).rows[0].r;
    const a=await resourceSave(first);
    const check=async (actor,download,resource)=>(await asActor(actor,'select public.offline_booking_matches_resource($1,$2,$3) as ok',[download,lesson.lesson,resource])).rows[0].ok;
    assert(await check(me.userId,a.downloadId,first)===true,'the recorded resource could not be verified');
    assert(await check(me.userId,a.downloadId,second)===false,'an unbooked resource passed the check');
    const b=await resourceSave(second);
    assert(await check(me.userId,b.downloadId,first)===false && await check(me.userId,b.downloadId,second)===true,'the check did not follow the new booking');
    const stranger=await learner('Resource stranger');
    assert(await check(stranger.userId,b.downloadId,second)===false,'a stranger used another learner booking');
    await q('update public.offline_downloads set removed_at=now() where id=$1',[b.downloadId]);
    assert(await check(me.userId,b.downloadId,second)===false,'a removed booking was accepted');
    await q("update public.offline_downloads set removed_at=null, saved_at=now()-interval '2 days',expires_at=now()-interval '1 day' where id=$1",[b.downloadId]);
    assert(await check(me.userId,b.downloadId,second)===false,'an expired booking was accepted');
    await q("update public.offline_downloads set saved_at=now(),expires_at=now()+interval '1 day' where id=$1",[b.downloadId]);
    await q('update public.offline_devices set revoked_at=now() where id=(select device_id from public.offline_downloads where id=$1)',[b.downloadId]);
    assert(await check(me.userId,b.downloadId,second)===false,'a revoked device booking was accepted');
    await q('update public.offline_devices set revoked_at=null where id=(select device_id from public.offline_downloads where id=$1)',[b.downloadId]);
    assert(a.saved && b.saved && a.downloadId===b.downloadId && b.mediaAssetId===secondAsset,'the booking did not follow the selected resource');
    assert((await scalar('select media_asset_id from public.offline_downloads where id=$1',[b.downloadId])).media_asset_id===secondAsset,'the latest asset was not recorded');
    const history=(await q('select asset_id from public.offline_download_asset_history where download_id=$1 order by asset_id',[b.downloadId])).rows.map(r=>r.asset_id);
    assert(history.length===2 && history.includes(lesson.asset) && history.includes(secondAsset),'earlier resource evidence was lost or a spurious asset was recorded');
    await rejects(()=>asActor(me.userId,'select * from public.offline_download_asset_history'),/permission denied/i);
    const other=await taughtLesson();
    const unrelated=(await scalar('select id from public.lesson_resources where lesson_id=$1',[other.lesson])).id;
    await rejects(()=>resourceSave(unrelated),/cannot be saved until its media is reviewed/i);
    assert((await scalar('select media_asset_id from public.offline_downloads where id=$1',[b.downloadId])).media_asset_id===secondAsset,'a refused resource changed the booking');
    assert((await scalar('select count(*)::int n from public.offline_download_asset_history where download_id=$1',[b.downloadId])).n===2,'a refused resource changed history');
    await q('insert into public.legacy_coursework_provenance(asset_id) values($1)',[secondAsset]);
    assert(await check(me.userId,b.downloadId,second)===false,'coursework provenance did not invalidate the booking');
    await rejects(()=>resourceSave(second),/cannot be saved until its media is reviewed/i);
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
