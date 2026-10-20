// Renditions: the only media a learner is ever served.
//
// A master in media_assets is the archive and is never handed to a browser; a
// rendition is a delivery copy, staff-written, playable exactly where its lesson
// is open. These tests pin that split, the derived object keys, the closed
// profile vocabulary, and the contrast with may_download_lesson() — watching a
// free preview is allowed, keeping one is not.
//
// No transcode worker exists, so nothing calls these writers in production. The
// register is built first because a worker needs somewhere to write.

export async function run(ctx) {
  const {
    q, test, assert, rejects, asAnon,
    bootstrapAdmin, newUser, newProfile, newInstructor,
    newCourse, newVersion, newSection, newLesson, newAsset,
  } = ctx;

  const admin = await bootstrapAdmin('rendition-admin@example.com');
  const teacher = await newInstructor('rendition-teacher@example.com', admin);
  await newProfile(teacher, 'Teacher');
  const learnerUser = await newUser('rendition-learner@example.com');
  await newProfile(learnerUser, 'Learner');
  const strangerUser = await newUser('rendition-stranger@example.com');
  await newProfile(strangerUser, 'Stranger');

  async function asActor(actor, sql, params = []) {
    await q('begin');
    await q('select set_config(\'request.jwt.claims\',$1,true)', [
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

  const REGISTER = `select * from public.register_media_rendition($1,$2,$3,$4,$5,$6,$7,$8,$9)`;
  const register = (actor, asset, profile, over = {}) =>
    asActor(actor, REGISTER, [
      asset,
      profile,
      over.mimeType ?? 'video/mp4',
      over.byteSize ?? 5_242_880,
      // Not ??: an explicit null is the point of the audio/poster cases, where
      // a rendition has neither dimension rather than the default pair.
      over.width === undefined ? 1280 : over.width,
      over.height === undefined ? 720 : over.height,
      over.bitrate === undefined ? 1200 : over.bitrate,
      over.duration === undefined ? 600 : over.duration,
      over.checksum ?? null,
    ]);

  // A taught lesson with a verified master behind it, and a learner entitled to
  // the version it lives in.
  async function taughtLesson({ preview = false, assetStatus = 'available' } = {}) {
    const course = await newCourse(teacher, { status: 'active' });
    const version = await newVersion(course, teacher);
    const section = await newSection(version);
    const lesson = await newLesson(section, { is_preview: preview });
    const asset = await newAsset(teacher, { status: assetStatus });
    await q(`insert into public.lesson_resources (lesson_id, resource_type, media_asset_id, display_name, position)
             values ($1,'video',$2,'Recorded lesson',1)`, [lesson, asset]);
    return { course, version, lesson, asset };
  }

  async function enrol(userId, versionId) {
    const learner = (await q(
      `insert into public.learner_profiles (display_name, learner_type, age_band, linked_user_id)
       values ('Learner','adult','18+',$1) returning id`, [userId])).rows[0].id;
    await q(`insert into public.entitlement_grants (learner_profile_id, scope_type, course_version_id, source_type, status)
             values ($1,'course_version',$2,'purchase','active')`, [learner, versionId]);
    return learner;
  }

  const mayPlay = async (actor, renditionId) =>
    (await asActor(actor, 'select public.may_play_rendition($1) as ok', [renditionId])).rows[0].ok;

  const taught = await taughtLesson();
  await enrol(learnerUser, taught.version);

  // -------------------------------------------------------------------------
  // Who may write
  // -------------------------------------------------------------------------

  let rendition = null;

  await test('a privileged worker registers a pending rendition with a derived bucket and key', async () => {
    const row = (await register(admin, taught.asset, '720p')).rows[0];
    rendition = row.rendition_id;
    assert(row.bucket === 'ayahspring-renditions', `bucket was ${row.bucket}`);
    // The key is derived from the asset id and the master's own mime slug, so it
    // cannot collide with another asset's object. This is also the shape
    // assertRenditionKey() accepts in web/src/lib/media-r2.ts.
    assert(row.object_key === `${taught.asset}/video-mp4/720p`, `key was ${row.object_key}`);

    const stored = (await q('select profile, status, byte_size, width, height, created_by from public.media_renditions where id=$1',
      [rendition])).rows[0];
    assert(stored.profile === '720p' && stored.status === 'pending', `status was ${stored.status}`);
    assert(String(stored.byte_size) === '5242880');
    assert(stored.width === 1280 && stored.height === 720);
    assert(stored.created_by === admin);
  });

  await test('the teacher who uploaded the master may not register a rendition of it', async () => {
    // A rendition is what other people are served, so it is staff-written. The
    // uploader is the person with the most reason to want their own copy marked
    // available without anybody checking it.
    await rejects(() => register(teacher, taught.asset, '480p'),
      'the uploader registered a rendition');
  });

  await test('a learner, a stranger and an anonymous visitor may not register one either', async () => {
    await rejects(() => register(learnerUser, taught.asset, '480p'), 'a learner registered a rendition');
    await rejects(() => register(strangerUser, taught.asset, '480p'), 'a stranger registered a rendition');
    await rejects(() => asAnon(() => register(strangerUser, taught.asset, '480p')), 'an anonymous visitor registered a rendition');
  });

  await test('only platform staff may confirm or fail a rendition', async () => {
    await rejects(() => asActor(teacher, 'select public.confirm_media_rendition($1)', [rendition]),
      'the uploader confirmed their own rendition');
    await rejects(() => asActor(teacher, 'select public.fail_media_rendition($1,$2)', [rendition, 'no reason to give']),
      'the uploader failed a rendition');
  });

  // -------------------------------------------------------------------------
  // What may be registered
  // -------------------------------------------------------------------------

  await test('a rendition cannot be encoded from a master that is not available', async () => {
    const pending = await taughtLesson({ assetStatus: 'pending' });
    await rejects(() => register(admin, pending.asset, '720p'),
      'a rendition was encoded from an unverified master');

    const held = await taughtLesson({ assetStatus: 'available' });
    await asActor(admin, 'select public.quarantine_media_upload($1,$2)', [held.asset, 'rights query']);
    await rejects(() => register(admin, held.asset, '720p'),
      'a rendition was encoded from a quarantined master');
  });

  await test('one rendition per profile per asset', async () => {
    await rejects(() => register(admin, taught.asset, '720p'),
      'a second 720p rendition was registered for the same master');
    // A different profile of the same master is fine, and is the normal case.
    const other = (await register(admin, taught.asset, '360p')).rows[0];
    assert(other.object_key === `${taught.asset}/video-mp4/360p`, `key was ${other.object_key}`);
  });

  await test('the profile vocabulary is closed', async () => {
    for (const profile of ['4K', 'original', '', 'master']) {
      await rejects(() => register(admin, taught.asset, profile),
        `profile ${JSON.stringify(profile)} was accepted`);
    }
  });

  await test('a rendition has both dimensions or neither', async () => {
    await rejects(() => register(admin, taught.asset, 'audio', { width: 1280, height: null, mimeType: 'audio/mp4' }),
      'a width without a height was accepted');
    // Audio, posters and manifests have no picture size, so neither is right.
    const audio = (await register(admin, taught.asset, 'audio', { width: null, height: null, mimeType: 'audio/mp4' })).rows[0];
    assert(audio.object_key === `${taught.asset}/video-mp4/audio`,
      `the key should follow the master's own mime slug, and was ${audio.object_key}`);
  });

  await test('a checksum is optional, but if given it is a real digest', async () => {
    await rejects(() => register(admin, taught.asset, 'poster', { checksum: 'not-a-digest', mimeType: 'image/jpeg' }),
      'a malformed checksum was accepted');
    const poster = (await register(admin, taught.asset, 'poster', {
      checksum: 'b'.repeat(64), mimeType: 'image/jpeg', width: null, height: null,
    })).rows[0];
    const stored = (await q('select checksum from public.media_renditions where id=$1', [poster.rendition_id])).rows[0];
    assert(stored.checksum === 'b'.repeat(64), 'the checksum was not stored');
  });

  // -------------------------------------------------------------------------
  // The state machine
  // -------------------------------------------------------------------------

  await test('confirmation is the only path from pending to available', async () => {
    assert(await mayPlay(learnerUser, rendition) === false, 'a pending rendition was playable');
    await asActor(admin, 'select public.confirm_media_rendition($1)', [rendition]);
    const stored = (await q('select status from public.media_renditions where id=$1', [rendition])).rows[0];
    assert(stored.status === 'available', `status was ${stored.status}`);
    await rejects(() => asActor(admin, 'select public.confirm_media_rendition($1)', [rendition]),
      'an available rendition was confirmed twice');
  });

  await test('a failed rendition needs a written reason and is never served', async () => {
    const doomed = (await register(admin, taught.asset, '1080p')).rows[0].rendition_id;
    await rejects(() => asActor(admin, 'select public.fail_media_rendition($1,$2)', [doomed, '   ']),
      'a failure was recorded with no reason');
    await asActor(admin, 'select public.fail_media_rendition($1,$2)', [doomed, 'encode crashed']);
    const stored = (await q('select status, failure_reason from public.media_renditions where id=$1', [doomed])).rows[0];
    assert(stored.status === 'failed' && stored.failure_reason === 'encode crashed');
    assert(await mayPlay(learnerUser, doomed) === false, 'a failed rendition was playable');
    await rejects(() => asActor(admin, 'select public.confirm_media_rendition($1)', [doomed]),
      'a failed rendition was confirmed');
  });

  // -------------------------------------------------------------------------
  // Who may be served
  // -------------------------------------------------------------------------

  await test('a rendition is playable exactly where its lesson is open', async () => {
    assert(await mayPlay(learnerUser, rendition) === true, 'an enrolled learner could not play the lesson');
    assert(await mayPlay(strangerUser, rendition) === false, 'a stranger could play it');
    assert(await mayPlay(teacher, rendition) === false,
      'the author could play a rendition through this predicate; authors read their own media by another path');
    assert(await asAnon(async () =>
      (await q('select public.may_play_rendition($1) as ok', [rendition])).rows[0].ok) === false,
      'an anonymous visitor could play it');
  });

  await test('quarantining a master withdraws every rendition derived from it', async () => {
    // Its own lesson and its own learner, because a master cannot be
    // un-quarantined by a test: the status guard refuses a direct write from
    // anybody who is not staff in session, and restoring it through a function
    // that does not exist would be inventing one.
    const held = await taughtLesson();
    const heldUser = await newUser('rendition-held@example.com');
    await newProfile(heldUser, 'Held Learner');
    await enrol(heldUser, held.version);
    const id = (await register(admin, held.asset, '720p')).rows[0].rendition_id;
    await asActor(admin, 'select public.confirm_media_rendition($1)', [id]);

    assert(await mayPlay(heldUser, id) === true, 'the premise failed: playback was refused before quarantine');
    await asActor(admin, 'select public.quarantine_media_upload($1,$2)', [held.asset, 'rights query']);
    assert(await mayPlay(heldUser, id) === false,
      'a rendition stayed playable after its master was quarantined');
    const rows = (await asActor(heldUser, 'select id from public.media_renditions where id=$1', [id])).rows;
    assert(rows.length === 0, 'the rendition row stayed readable after its master was quarantined');
  });

  await test('a rendition row is not readable by somebody who may not play it', async () => {
    const asStranger = (await asActor(strangerUser,
      'select id, object_key from public.media_renditions where id=$1', [rendition])).rows;
    assert(asStranger.length === 0, 'a stranger could read the object key of a rendition');
    const asLearner = (await asActor(learnerUser,
      'select id, object_key from public.media_renditions where id=$1', [rendition])).rows;
    assert(asLearner.length === 1, 'an entitled learner could not read the rendition they may play');
    const asStaff = (await asActor(admin, 'select count(*)::int as n from public.media_renditions')).rows[0].n;
    assert(asStaff > 0, 'privileged staff could not read the register');
  });

  await test('watching a free preview is allowed, which is exactly where saving differs', async () => {
    const preview = await taughtLesson({ preview: true });
    const previewLearner = await newUser('rendition-preview@example.com');
    await newProfile(previewLearner, 'Preview Watcher');
    // A learner profile with no entitlement at all: this person has not bought
    // the course, so any access comes from the preview bypass alone. Grants are
    // never deleted in this schema, so the fixture simply never has one.
    await q(`insert into public.learner_profiles (display_name, learner_type, age_band, linked_user_id)
             values ('Preview Watcher','adult','18+',$1)`, [previewLearner]);

    const id = (await register(admin, preview.asset, '480p')).rows[0].rendition_id;
    await asActor(admin, 'select public.confirm_media_rendition($1)', [id]);

    await q("update public.platform_settings set value_text='true' where key='learning.previews'");
    try {
      assert(await mayPlay(previewLearner, id) === true,
        'a free preview could not be watched while learning.previews is on');
      assert((await asActor(previewLearner, 'select public.may_download_lesson($1) as ok',
        [preview.lesson])).rows[0].ok === false,
        'the same learner could save the preview they may watch');
    } finally {
      await q("update public.platform_settings set value_text='false' where key='learning.previews'");
    }
    assert(await mayPlay(previewLearner, id) === false,
      'a preview stayed playable with the bypass switched off');
  });

  await test('may_play_rendition is not callable by the public or an anonymous visitor', async () => {
    for (const role of ['public', 'anon']) {
      const allowed = (await q(
        `select has_function_privilege($1,'public.may_play_rendition(uuid)','EXECUTE') as ok`, [role])).rows[0].ok;
      assert(allowed === false, `${role} can execute may_play_rendition`);
    }
    for (const fn of ['public.may_play_rendition(uuid)', 'public.confirm_media_rendition(uuid)']) {
      const allowed = (await q(
        `select has_function_privilege('authenticated',$1,'EXECUTE') as ok`, [fn])).rows[0].ok;
      assert(allowed === true, `authenticated lost execute on ${fn}`);
    }
  });

  await test('the renditions bucket is the one the web layer signs for', async () => {
    // Two places name this bucket: this migration and DEFAULT_RENDITIONS_BUCKET
    // in web/src/lib/media-r2.ts. A drift would sign playback URLs for a bucket
    // no row records, and the learner would get a 404 rather than an error.
    const row = (await q('select bucket from public.media_renditions where id=$1', [rendition])).rows[0];
    assert(row.bucket === 'ayahspring-renditions', `the derived bucket was ${row.bucket}`);
  });
}
