// Telling the one person who can fix it.
//
// A failed encode used to be recorded and then left in a column nobody reads. The
// learner is now told whether to wait or to report, the author can pull the answer
// from the rehearsal, and staff can see it at /admin/media — but nobody was *pushed*
// the news, so a file could fail at three in the morning and be found by a student.
//
// These tests pin the two people who are told, the one moment that counts, and the
// three things that must not produce a message: a file that still plays, a file
// still being made, and a file that was held rather than broken.

export async function run(ctx) {
  const {
    q, test, assert, rejects, bootstrapAdmin, newUser, newProfile, newInstructor,
    newCourse, newVersion, newSection, newLesson, newAsset,
  } = ctx;

  const admin = await bootstrapAdmin('encode-notify-admin@example.com');
  const teacher = await newInstructor('encode-notify-teacher@example.com', admin);
  await newProfile(teacher, 'Teacher');
  const uploader = await newInstructor('encode-notify-uploader@example.com', admin);
  await newProfile(uploader, 'Uploader');
  const learnerUser = await newUser('encode-notify-learner@example.com');
  await newProfile(learnerUser, 'Learner');

  async function asActor(actor, sql, params = []) {
    await q('begin');
    await q("select set_config('request.jwt.claims',$1,true)",
      [JSON.stringify({ sub: actor, role: 'authenticated' })]);
    await q('set local role authenticated');
    try { const r = await q(sql, params); await q('commit'); return r; }
    catch (e) { await q('rollback'); throw e; }
  }

  /**
   * A rendition on `assetId`, registered as staff, in `pending`.
   *
   * Registered as the admin because `register_media_rendition()` is staff-only —
   * a rendition is what other people are served, so it is staff-written or it is
   * nothing. A test that registered as the teacher would be testing a state the
   * product cannot produce.
   */
  async function pendingCopy(assetId, profile = '720p') {
    const r = await asActor(admin,
      'select * from public.register_media_rendition($1,$2,$3,$4,$5,$6,$7,$8,$9)',
      [assetId, profile, profile === 'audio' ? 'audio/mp4' : 'video/mp4', 1048576,
       profile === 'audio' ? null : 1280, profile === 'audio' ? null : 720,
       1200, 600, null]);
    return r.rows[0].rendition_id;
  }

  const fail = (renditionId, reason = 'encoder exited 137') =>
    asActor(admin, 'select public.fail_media_rendition($1,$2) as ok', [renditionId, reason])
      .then((r) => r.rows[0].ok);

  const confirm = (renditionId) =>
    asActor(admin, 'select public.confirm_media_rendition($1) as ok', [renditionId])
      .then((r) => r.rows[0].ok);

  /**
   * The messages one person got *about one file*.
   *
   * Scoped by asset rather than by person because the same teacher appears in
   * several tests below: counts taken per person would accumulate across cases
   * and hide a duplicate behind an earlier test's legitimate message.
   */
  const messages = async (userId, assetId) =>
    (await q(`select * from public.notifications
               where user_id = $1 and kind = 'media_encode_failed'
                 and dedupe_key like $2
               order by created_at`, [userId, `media_failed:${assetId}:%`])).rows;

  /** A course of `teacher`'s with one lesson using an uploaded file. */
  async function taught(over = {}) {
    const course = await newCourse(teacher, { status: 'active' });
    const version = await newVersion(course, teacher);
    const section = await newSection(version);
    const lesson = await newLesson(section);
    const asset = await newAsset(over.uploadedBy ?? uploader, { status: over.assetStatus ?? 'available' });
    await q(`update public.media_assets set display_name = 'Recorded lesson' where id = $1`, [asset]);
    await q(`insert into public.lesson_resources (lesson_id, resource_type, media_asset_id, display_name, position)
             values ($1,'video',$2,'Recorded lesson',1)`, [lesson, asset]);
    return { course, version, section, lesson, asset };
  }

  // -------------------------------------------------------------------------
  // Who is told
  // -------------------------------------------------------------------------

  await test('a failure with nothing playable tells the uploader and the version author', async () => {
    const { asset } = await taught();
    const copy = await pendingCopy(asset);
    await fail(copy, 'encoder exited 137 (out of memory)');

    const toUploader = await messages(uploader, asset);
    const toAuthor = await messages(teacher, asset);

    assert(toUploader.length === 1, 'the person holding the file is told');
    assert(toAuthor.length === 1, 'and so is the person whose lesson cannot play');

    assert(/will not play/.test(toUploader[0].title), toUploader[0].title);
    assert(/Recorded lesson/.test(toUploader[0].body), 'the file is named');
    assert(/encoder exited 137/.test(toUploader[0].body), 'and the worker’s own reason is carried');

    // The two link somewhere different, because they can do different things.
    assert(toUploader[0].href === '/teach/media', toUploader[0].href);
    assert(toAuthor[0].href.startsWith('/teach/') && toAuthor[0].href.endsWith('/preview'),
      `the author goes to the rehearsal, got ${toAuthor[0].href}`);
    assert(toAuthor[0].href.includes(toAuthor[0].href.slice('/teach/'.length, -'/preview'.length)),
      'and the link names a course');

    assert(toUploader[0].severity === 'action', 'there is something to do');
  });

  await test('an author who also uploaded the file is told once', async () => {
    const { asset } = await taught({ uploadedBy: teacher });
    const copy = await pendingCopy(asset);
    await fail(copy);

    const mine = await messages(teacher, asset);
    assert(mine.length === 1, `one person, one message, got ${mine.length}`);
    assert(mine[0].href === '/teach/media', 'the uploader’s link wins: it is the shorter path to the reason');
  });

  await test('two versions using one file tell two authors', async () => {
    const other = await newInstructor('encode-notify-other@example.com', admin);
    await newProfile(other, 'Other teacher');

    const first = await taught();
    const secondCourse = await newCourse(other, { status: 'active' });
    const secondVersion = await newVersion(secondCourse, other);
    const secondSection = await newSection(secondVersion);
    const secondLesson = await newLesson(secondSection);
    await q(`insert into public.lesson_resources (lesson_id, resource_type, media_asset_id, display_name, position)
             values ($1,'video',$2,'Shared recording',1)`, [secondLesson, first.asset]);

    const copy = await pendingCopy(first.asset);
    await fail(copy);

    assert((await messages(uploader, first.asset)).length === 1);
    assert((await messages(teacher, first.asset)).length === 1);
    assert((await messages(other, first.asset)).length === 1,
      'the second version’s author cannot play it either, and is told');
    assert((await messages(other, first.asset))[0].href.endsWith('/preview'));
  });

  await test('a learner who is not an author is not told', async () => {
    const { asset } = await taught();
    const copy = await pendingCopy(asset);
    await fail(copy);
    assert((await messages(learnerUser, asset)).length === 0);
  });

  // -------------------------------------------------------------------------
  // When — and the three silences
  // -------------------------------------------------------------------------

  await test('a failure while another copy still plays tells nobody', async () => {
    const { asset } = await taught();
    const good = await pendingCopy(asset, '480p');
    await confirm(good);
    const bad = await pendingCopy(asset, '720p');
    await fail(bad);

    assert((await messages(uploader, asset)).length === 0,
      'the lesson still plays, so this is not news anybody needs');
    assert((await messages(teacher, asset)).length === 0);
  });

  await test('a failure while another copy is still being made tells nobody', async () => {
    const { asset } = await taught();
    const bad = await pendingCopy(asset, '720p');
    await pendingCopy(asset, '480p');
    await fail(bad);

    assert((await messages(uploader, asset)).length === 0,
      'a file with a copy still encoding may yet be fine; crying wolf here trains people to ignore the message');
  });

  await test('the second failure — the one that ends it — does tell somebody', async () => {
    const { asset } = await taught();
    const first = await pendingCopy(asset, '720p');
    const second = await pendingCopy(asset, '480p');
    await fail(first);
    assert((await messages(uploader, asset)).length === 0, 'still one chance left');
    await fail(second, 'codec not supported');
    assert((await messages(uploader, asset)).length === 1, 'now it is out of chances');
    assert(/codec not supported/.test((await messages(uploader, asset))[0].body),
      'and the reason is the one that ended it');
  });

  await test('a takedown is not an encode failure, and tells nobody', async () => {
    // Quarantine has its own story. Telling the author their encode failed would
    // send them to re-encode a file moderation took down on purpose.
    const { asset } = await taught();
    await pendingCopy(asset);
    await asActor(admin, 'select public.quarantine_media_upload($1,$2)', [asset, 'rights query']);
    assert((await messages(uploader, asset)).length === 0,
      'taking a file down must not look like a broken encoder');
  });

  await test('a file whose master was withdrawn gets no message', async () => {
    const { asset } = await taught();
    const copy = await pendingCopy(asset);
    await q(`update public.media_assets set deleted_at = now() where id = $1`, [asset]);
    await fail(copy);
    assert((await messages(uploader, asset)).length === 0,
      'D7: a tombstoned master is gone from every path, this one too');
  });

  await test('a file with no lesson anywhere still tells its uploader', async () => {
    // Not attached yet, and it does not play. The person who uploaded it is the
    // only one affected, and they are the one who can fix it.
    const asset = await newAsset(uploader, { status: 'available' });
    const copy = await pendingCopy(asset);
    await fail(copy);
    const mine = await messages(uploader, asset);
    assert(mine.length === 1);
    assert(/could not be turned into/.test(mine[0].body),
      'an unnamed file is still described in words rather than empty quotation marks');
    assert(mine[0].href === '/teach/media');
  });

  // -------------------------------------------------------------------------
  // Once
  // -------------------------------------------------------------------------

  await test('a second file failing on the same day is a second message', async () => {
    // The dedupe is per file, not per person: two different recordings breaking is
    // two problems, and folding them into one message would hide one.
    const first = await taught();
    const firstCopy = await pendingCopy(first.asset);
    await fail(firstCopy);

    const secondCourse = await newCourse(teacher, { status: 'active' });
    const secondVersion = await newVersion(secondCourse, teacher);
    const secondSection = await newSection(secondVersion);
    const secondLesson = await newLesson(secondSection);
    const secondAsset = await newAsset(uploader, { status: 'available' });
    await q(`insert into public.lesson_resources (lesson_id, resource_type, media_asset_id, display_name, position)
             values ($1,'video',$2,'Second recording',1)`, [secondLesson, secondAsset]);
    const secondCopy = await pendingCopy(secondAsset);
    await fail(secondCopy);

    assert((await messages(uploader, first.asset)).length === 1);
    assert((await messages(uploader, secondAsset)).length === 1);
  });

  await test('the same file failing twice in one day is one message', async () => {
    // The same file, re-registered and failed again — the case a retry produces.
    const { asset } = await taught();
    const first = await pendingCopy(asset, '720p');
    await fail(first);
    assert((await messages(uploader, asset)).length === 1);

    // A retry moves the same row back to pending, then fails again.
    await q(`update public.media_renditions set status = 'pending', failure_reason = null where id = $1`, [first]);
    await fail(first, 'still out of memory');
    assert((await messages(uploader, asset)).length === 1, 'one file, one day, one message');
  });

  // -------------------------------------------------------------------------
  // The preference, and the guard
  // -------------------------------------------------------------------------

  await test('the new kind is offered on the preference screen and can be switched off', async () => {
    const prefs = (await asActor(teacher, 'select public.my_notification_preferences() as p')).rows[0].p;
    const entry = prefs.find((one) => one.kind === 'media_encode_failed');
    assert(entry, 'the screen must be able to explain it: parsePreferences() throws on a kind it does not know');
    assert(entry.enabled === true, 'on by default');
    assert(entry.locked === false, 'it is a fact about your own file, not money the platform owes you');
    assert(entry.available === true);

    const set = (await asActor(teacher,
      "select public.set_notification_preference('media_encode_failed', false) as p")).rows[0].p;
    assert(set.enabled === false);
  });

  await test('a muted message is written and not shown', async () => {
    // The row is the record of what the platform did. It is hidden from the feed
    // and the badge until the preference changes back — the same rule the payout
    // messages follow.
    const quiet = await newInstructor('encode-notify-quiet@example.com', admin);
    await newProfile(quiet, 'Quiet');

    const course = await newCourse(quiet, { status: 'active' });
    const version = await newVersion(course, quiet);
    const section = await newSection(version);
    const lesson = await newLesson(section);
    const asset = await newAsset(quiet, { status: 'available' });
    await q(`update public.media_assets set display_name = 'Quiet recording' where id = $1`, [asset]);
    await q(`insert into public.lesson_resources (lesson_id, resource_type, media_asset_id, display_name, position)
             values ($1,'video',$2,'Quiet recording',1)`, [lesson, asset]);

    await asActor(quiet, "select public.set_notification_preference('media_encode_failed', false)");

    const copy = await pendingCopy(asset);
    await fail(copy);

    assert((await messages(quiet, asset)).length === 1, 'the record is kept');
    const feed = (await asActor(quiet, 'select public.my_notifications(30) as n')).rows[0].n;
    assert(!feed.recent.some((one) => one.kind === 'media_encode_failed'),
      'and is not shown while muted');
    assert(feed.unreadCount === 0, 'nor counted on the badge');
  });

  await test('nobody can ring somebody else’s bell about a file', async () => {
    const { asset } = await taught();
    await rejects(
      () => asActor(teacher, 'select public.notify_media_encode_failed($1)', [asset]),
      /permission denied/i,
    );
  });

  await test('a non-staff caller cannot fail a rendition at all', async () => {
    const { asset } = await taught();
    const copy = await pendingCopy(asset);
    await rejects(
      () => asActor(teacher, 'select public.fail_media_rendition($1,$2)', [copy, 'made up']),
      /only platform staff/i,
    );
    assert((await messages(uploader, asset)).length === 0);
  });

  await test('a reason is still required, and still stops before any message', async () => {
    const { asset } = await taught();
    const copy = await pendingCopy(asset);
    await rejects(
      () => asActor(admin, 'select public.fail_media_rendition($1,$2)', [copy, '   ']),
      /written reason/i,
    );
    assert((await messages(uploader, asset)).length === 0);
  });
}
