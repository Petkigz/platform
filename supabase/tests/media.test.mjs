// Where the videos actually live.
//
// lesson_resources permits two sources: external_url and media_asset_id. Until
// now only the URL was usable, because media_assets had no writer — so every
// video had to be hotlinked from elsewhere, the opposite of D8.
//
// The hole found while probing this, and now closed:
//
//   The UPDATE policy was `uploaded_by = current_user_id() OR is_privileged()`
//   with no column restriction. Verified directly before writing any code: an
//   uploader inserted a row with status='pending', ran
//   `update media_assets set status='available'` on it, and the update landed.
//   No bytes were ever uploaded. The whole pending/available state machine could
//   be bypassed by the person with the most reason to bypass it.
//
// The test below re-runs that exact sequence and requires it to fail.

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    asUser, newUser, newProfile, newInstructor, bootstrapAdmin,
  } = ctx;

  const admin    = await bootstrapAdmin('media-admin@example.com');
  const teacher  = await newInstructor('media-teacher@example.com', admin);

  const SHA = 'a'.repeat(64);

  /** Act as a user and COMMIT. The functions read the actor from the session. */
  async function asActor(actor, sql, params) {
    await q('begin');
    await q(`select set_config('request.jwt.claims', $1, true)`,
      [JSON.stringify({ sub: actor, role: 'authenticated' })]);
    await q('set local role authenticated');
    let r;
    try {
      r = await q(sql, params);
    } catch (e) {
      await q('rollback');
      throw e;
    }
    await q('commit');
    return r;
  }

  const register = (who, opts = {}) =>
    asActor(who, 'select * from public.register_media_upload($1,$2,$3,$4,$5)', [
      opts.mime ?? 'video/mp4',
      opts.bytes ?? 1048576,
      opts.checksum ?? SHA,
      opts.duration ?? 600,
      opts.backend ?? 'r2',
    ]);

  const statusOf = async (assetId) =>
    (await q('select status, deleted_at, master_key, master_bucket from public.media_assets where id=$1',
      [assetId])).rows[0];

  // -------------------------------------------------------------------
  console.log('\nRegistering an upload');
  // -------------------------------------------------------------------

  await test('an uploader registers a pending upload and is told where to put it', async () => {
    const r = (await register(teacher)).rows[0];

    assert(r.asset_id, 'no asset id returned');
    assert(r.master_bucket === 'ayahspring-masters',
      `bucket was ${r.master_bucket}`);
    assert(typeof r.master_key === 'string' && r.master_key.length > 0,
      'no object key returned');

    const row = await statusOf(r.asset_id);
    assert(row.status === 'pending', `status was ${row.status}, expected pending`);
    assert(row.deleted_at === null, 'a new upload must not be deleted');
  });

  await test('the object key is derived from the asset, never supplied by the caller', async () => {
    // The key identifies an object in the bucket. If the caller named it, one
    // teacher could register an asset pointing at another teacher's object.
    const a = (await register(teacher)).rows[0];
    const b = (await register(teacher)).rows[0];

    assert(a.master_key !== b.master_key, 'two uploads were given the same key');
    assert(a.master_key.startsWith(String(a.asset_id)),
      `key ${a.master_key} is not derived from id ${a.asset_id}`);
    assert(!a.master_key.includes('placeholder'),
      'the placeholder key survived the update');
  });

  await test('a checksum that is not a SHA-256 hex digest is refused', async () => {
    for (const bad of ['not-a-hash', 'A'.repeat(64), 'a'.repeat(63), 'z'.repeat(64), '']) {
      await rejects(() => register(teacher, { checksum: bad }),
        /64-character lowercase hex SHA-256/i);
    }
  });

  await test('a file needs a size and a type', async () => {
    await rejects(() => register(teacher, { bytes: 0 }), /needs a size/i);
    await rejects(() => register(teacher, { bytes: -1 }), /needs a size/i);
    await rejects(() => register(teacher, { mime: '   ' }), /needs a type/i);
  });

  await test('an unsupported storage backend is refused by name', async () => {
    await rejects(() => register(teacher, { backend: 'ftp-server' }),
      /unsupported storage backend: ftp-server/i);
  });

  await test('a negative duration is refused', async () => {
    await rejects(() => register(teacher, { duration: -5 }), /duration cannot be negative/i);
  });

  await test('an anonymous caller cannot register an upload', async () => {
    await q('begin');
    await q(`select set_config('request.jwt.claims', '', true)`);
    await q('set local role authenticated');
    await rejects(() => register(null), /sign in to upload/i);
    await q('rollback');
  });

  // -------------------------------------------------------------------
  console.log('\nThe self-confirmation hole');
  // -------------------------------------------------------------------

  await test('an uploader cannot mark their own upload available', async () => {
    // This is the exact sequence that succeeded before this migration: insert
    // pending, then update status directly. No bytes are involved at any point.
    const r = (await register(teacher)).rows[0];
    assert((await statusOf(r.asset_id)).status === 'pending', 'precondition: starts pending');

    let message = null;
    await asActor(teacher,
      `update public.media_assets set status = 'available' where id = $1`, [r.asset_id])
      .catch((e) => { message = String(e.message); });

    assert(message !== null,
      'an uploader was able to promote their own upload to available');
    assert(/only staff may change the status/i.test(message),
      `refused for the wrong reason: ${message}`);

    assert((await statusOf(r.asset_id)).status === 'pending',
      `status is ${ (await statusOf(r.asset_id)).status }; the update must not have landed`);
  });

  await test('an uploader can still correct the description of their own upload', async () => {
    // Closing the hole must not lock the uploader out of their own metadata, or
    // fixing a wrong duration would need staff.
    const r = (await register(teacher, { duration: 1 })).rows[0];

    await asActor(teacher,
      `update public.media_assets set duration_seconds = 120 where id = $1`, [r.asset_id]);

    const row = (await q('select duration_seconds, status from public.media_assets where id=$1',
      [r.asset_id])).rows[0];
    assert(Number(row.duration_seconds) === 120,
      `duration is ${row.duration_seconds}, expected 120`);
    assert(row.status === 'pending', 'status must be untouched');
  });

  await test('an uploader cannot point their own upload at another key', async () => {
    const mine   = (await register(teacher)).rows[0];
    const theirs = (await register(teacher)).rows[0];

    let message = null;
    await asActor(teacher,
      `update public.media_assets set master_key = $2 where id = $1`,
      [mine.asset_id, theirs.master_key])
      .catch((e) => { message = String(e.message); });

    // Either RLS or the unique constraint may stop this; what must not happen is
    // one asset silently becoming another's object.
    const row = (await q('select master_key from public.media_assets where id=$1',
      [mine.asset_id])).rows[0];
    if (row.master_key !== mine.master_key) {
      assert(message !== null, 'the key changed with no refusal');
    }
  });

  await test('a stranger cannot read or confirm someone else\'s upload', async () => {
    const r = (await register(teacher)).rows[0];
    const stranger = await newUser('media-stranger@example.com');
    await newProfile(stranger, 'Stranger');

    // Read as the stranger, not at superuser level: the superuser bypasses RLS
    // entirely, so querying it here would have proved nothing either way.
    let visible = -1;
    await asUser(stranger, async () => {
      visible = (await q(
        `select count(*)::int n from public.media_assets where id = $1`,
        [r.asset_id])).rows[0].n;
    });
    assert(visible === 0,
      `an unrelated user can see ${visible} of someone else's uploads`);

    await rejects(
      () => asActor(stranger, 'select public.confirm_media_upload($1)', [r.asset_id]),
      /only staff may confirm/i);
  });

  // -------------------------------------------------------------------
  console.log('\nConfirmation');
  // -------------------------------------------------------------------

  await test('staff confirm an upload and it becomes available', async () => {
    const r = (await register(teacher)).rows[0];

    const changed = (await asActor(admin,
      'select public.confirm_media_upload($1) as c', [r.asset_id])).rows[0].c;
    assert(changed === true, 'confirmation reported no change');

    assert((await statusOf(r.asset_id)).status === 'available',
      `status was ${(await statusOf(r.asset_id)).status}`);
  });

  await test('confirming twice is idempotent, not an error', async () => {
    const r = (await register(teacher)).rows[0];
    await asActor(admin, 'select public.confirm_media_upload($1)', [r.asset_id]);

    const second = (await asActor(admin,
      'select public.confirm_media_upload($1) as c', [r.asset_id])).rows[0].c;
    assert(second === false, 'a second confirmation should report no change');
    assert((await statusOf(r.asset_id)).status === 'available');
  });

  await test('a deleted upload cannot be confirmed', async () => {
    const r = (await register(teacher)).rows[0];
    await asActor(teacher, 'select public.delete_media_asset($1)', [r.asset_id]);

    await rejects(() => asActor(admin, 'select public.confirm_media_upload($1)', [r.asset_id]),
      /has been deleted/i);
  });

  await test('confirming an unknown upload is refused', async () => {
    await rejects(() => asActor(admin,
      'select public.confirm_media_upload($1)', ['00000000-0000-4000-8000-000000000000']),
      /not found/i);
  });

  // -------------------------------------------------------------------
  console.log('\nQuarantine and deletion');
  // -------------------------------------------------------------------

  await test('quarantining needs staff and a written reason', async () => {
    const r = (await register(teacher)).rows[0];

    await rejects(() => asActor(teacher,
      'select public.quarantine_media_upload($1,$2)', [r.asset_id, 'bad']),
      /only staff may quarantine/i);

    await rejects(() => asActor(admin,
      'select public.quarantine_media_upload($1,$2)', [r.asset_id, '   ']),
      /a reason is required/i);

    await asActor(admin, 'select public.quarantine_media_upload($1,$2)',
      [r.asset_id, 'digest mismatch on ingest']);

    assert((await statusOf(r.asset_id)).status === 'quarantined');
  });

  await test('a quarantined upload can be re-confirmed after fixing it', async () => {
    const r = (await register(teacher)).rows[0];
    await asActor(admin, 'select public.quarantine_media_upload($1,$2)',
      [r.asset_id, 'digest mismatch']);

    await asActor(admin, 'select public.confirm_media_upload($1)', [r.asset_id]);
    assert((await statusOf(r.asset_id)).status === 'available');
  });

  await test('an uploader may withdraw their own upload, which soft-deletes it', async () => {
    // D7: soft delete. The master object is not destroyed here — retention is a
    // scheduled decision, not a side effect of one click.
    const r = (await register(teacher)).rows[0];

    const deleted = (await asActor(teacher,
      'select public.delete_media_asset($1) as d', [r.asset_id])).rows[0].d;
    assert(deleted === true, 'deletion reported no change');

    const row = await statusOf(r.asset_id);
    assert(row.status === 'deleted', `status was ${row.status}`);
    assert(row.deleted_at !== null, 'deleted_at was not set');
  });

  await test('deleting twice reports no change rather than failing', async () => {
    const r = (await register(teacher)).rows[0];
    await asActor(teacher, 'select public.delete_media_asset($1)', [r.asset_id]);

    const again = (await asActor(teacher,
      'select public.delete_media_asset($1) as d', [r.asset_id])).rows[0].d;
    assert(again === false, 'a second deletion should report no change');
  });

  await test('a stranger cannot delete someone else\'s upload', async () => {
    const r = (await register(teacher)).rows[0];
    const stranger = await newUser('media-stranger2@example.com');
    await newProfile(stranger, 'Stranger Two');

    await rejects(() => asActor(stranger,
      'select public.delete_media_asset($1)', [r.asset_id]),
      /only delete your own/i);

    assert((await statusOf(r.asset_id)).deleted_at === null, 'the upload was deleted');
  });

  // -------------------------------------------------------------------
  console.log('\nIt can now be attached to a lesson');
  // -------------------------------------------------------------------

  await test('a confirmed upload can be the source of a lesson resource', async () => {
    // This is the join that was impossible before: lesson_resources allows
    // exactly one of media_asset_id or external_url, and media_asset_id had
    // nothing to point at.
    const { newCourse, newVersion, newSection, newLesson } = ctx;
    const course  = await newCourse(teacher, { status: 'active' });
    const version = await newVersion(course, teacher);
    const section = await newSection(version);
    const lesson  = await newLesson(section);

    const r = (await register(teacher)).rows[0];
    await asActor(admin, 'select public.confirm_media_upload($1)', [r.asset_id]);

    await asActor(teacher,
      `insert into public.lesson_resources
         (lesson_id, resource_type, media_asset_id, display_name, position, access_classification)
       values ($1,'video',$2,'The recorded lesson',1,'enrolled')`,
      [lesson, r.asset_id]);

    const row = (await q(
      `select resource_type, display_name, media_asset_id, external_url
         from public.lesson_resources where lesson_id = $1`, [lesson])).rows[0];

    assert(row.media_asset_id === r.asset_id, 'the resource does not point at the upload');
    assert(row.external_url === null, 'the single-source rule was bypassed');
    assert(row.display_name === 'The recorded lesson');
  });

  await test('a pending upload is refused as a lesson source only by convention, not by the database', async () => {
    // Recorded rather than papered over: nothing in the schema stops a pending
    // asset from being attached, so the check has to live in the application
    // layer. Stated here so the gap is visible instead of assumed closed.
    const { newCourse, newVersion, newSection, newLesson } = ctx;
    const course  = await newCourse(teacher, { status: 'active' });
    const version = await newVersion(course, teacher);
    const section = await newSection(version);
    const lesson  = await newLesson(section);

    const r = (await register(teacher)).rows[0];
    assert((await statusOf(r.asset_id)).status === 'pending', 'precondition: still pending');

    let landed = false;
    await asActor(teacher,
      `insert into public.lesson_resources
         (lesson_id, resource_type, media_asset_id, display_name, position, access_classification)
       values ($1,'video',$2,'Unconfirmed',1,'enrolled')`, [lesson, r.asset_id])
      .then(() => { landed = true; });

    assert(landed === true,
      'expected the database to allow this — the application layer must filter on status');
  });

  // -------------------------------------------------------------------
  console.log('\nAudit trail');
  // -------------------------------------------------------------------

  await test('registration, confirmation and deletion are all audited', async () => {
    const r = (await register(teacher)).rows[0];
    await asActor(admin, 'select public.confirm_media_upload($1)', [r.asset_id]);
    await asActor(teacher, 'select public.delete_media_asset($1)', [r.asset_id]);

    const actions = (await q(
      `select action from public.governance_audit_events
        where target_type='media_asset' and target_id=$1 order by occurred_at`,
      [r.asset_id])).rows.map((x) => x.action);

    assert(actions.join(',') === 'media.upload_registered,media.upload_confirmed,media.upload_deleted',
      `audit actions were [${actions.join(', ')}]`);
  });
}
