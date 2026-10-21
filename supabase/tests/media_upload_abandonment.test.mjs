// Abandoning an upload nobody finished.
//
// A multipart upload stores its parts as they arrive, but the object does not
// exist until the upload is completed. So a transfer nobody finished leaves bytes
// in the bucket that no row in this schema mentions: they are billed, they cannot
// be served, and before `abandon_media_upload()` existed nothing in the platform
// could record that somebody decided to stop paying for them.
//
// These tests pin the three things that make it a decision rather than a cleanup
// script: only staff may make it, it needs a reason in writing, and it changes no
// row — an unfinished upload says nothing about the asset, which may still be
// waiting to be resumed by the teacher who owns it.

export async function run(ctx) {
  const {
    q, test, assert, rejects, asAnon,
    bootstrapAdmin, newUser, newProfile, newInstructor, newAsset,
  } = ctx;

  const admin = await bootstrapAdmin('abandonment-admin@example.com');
  const teacher = await newInstructor('abandonment-teacher@example.com', admin);
  await newProfile(teacher, 'Abandonment Teacher');
  const learnerUser = await newUser('abandonment-learner@example.com');
  await newProfile(learnerUser, 'Abandonment Learner');

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

  const ABANDON = 'select public.abandon_media_upload($1,$2,$3)';
  const abandon = (actor, assetId, uploadId, reason) =>
    asActor(actor, ABANDON, [assetId, uploadId, reason]);

  const eventsFor = async (assetId) =>
    (await q(
      `select actor, detail from public.governance_audit_events
        where action='media.upload_abandoned' and target_id=$1
        order by occurred_at`, [assetId])).rows;

  const assetState = async (assetId) =>
    (await q(
      `select status, master_bucket, master_key, byte_size, deleted_at
         from public.media_assets where id=$1`, [assetId])).rows[0];

  let seq = 0;

  /** A pending master belonging to the teacher, with a key of the derived shape. */
  async function unfinished(over = {}) {
    seq += 1;
    const owner = over.owner ?? teacher;
    const assetId = await newAsset(owner, {
      bucket: over.bucket ?? 'ayahspring-masters',
      key: `${crypto.randomUUID()}/video-mp4`,
      status: over.status ?? 'pending',
    });
    return { assetId, owner, uploadId: over.uploadId ?? `2~upload-${seq}` };
  }

  await test('staff may end an unfinished upload, and the decision is written down', async () => {
    const u = await unfinished();

    const result = await abandon(admin, u.assetId, u.uploadId, 'the teacher left it at part 300 in June');
    assert(result.rows[0].abandon_media_upload === true, 'the function did not report success');

    const events = await eventsFor(u.assetId);
    assert(events.length === 1, `one abandonment wrote ${events.length} audit entries`);
    const detail = events[0].detail;
    assert(detail.upload_id === u.uploadId, `the upload id was ${JSON.stringify(detail.upload_id)}`);
    assert(detail.reason === 'the teacher left it at part 300 in June',
      `the reason was ${JSON.stringify(detail.reason)}`);
    const row = await assetState(u.assetId);
    assert(detail.master_key === row.master_key, 'the audit entry does not name the object');
    assert(detail.master_bucket === row.master_bucket, 'the audit entry does not name the bucket');
    assert(detail.declared_byte_size === row.byte_size,
      `the declared size was ${JSON.stringify(detail.declared_byte_size)}`);
    assert(detail.asset_status === 'pending',
      `the asset's state at the time was ${JSON.stringify(detail.asset_status)}`);
    assert(events[0].actor === admin, 'the audit entry does not say who decided');
  });

  await test('the asset row is not touched, because the file may still be resumable', async () => {
    // The parts being gone is not the asset being withdrawn. A teacher who comes
    // back to a stalled upload either resumes it or starts again on the same row;
    // quarantining or tombstoning here would be a decision about the file dressed
    // up as a decision about the bytes.
    const u = await unfinished();
    const before = await assetState(u.assetId);

    await abandon(admin, u.assetId, u.uploadId, 'cleanup of a stalled transfer');
    const after = await assetState(u.assetId);

    assert(after.status === before.status && after.status === 'pending',
      `the status moved to ${after.status}`);
    assert(after.deleted_at === null, 'abandoning an upload tombstoned the asset');
    assert(after.master_key === before.master_key, 'the object key moved');
  });

  await test('a leftover upload of a file that already arrived may also be ended', async () => {
    // An earlier attempt can stall and a later one succeed: the object exists, the
    // stalled upload's parts do not belong to it, and they are still being paid
    // for. Refusing on status would keep the one case where cleanup is safest.
    const u = await unfinished({ status: 'available' });

    await abandon(admin, u.assetId, u.uploadId, 'the parts of an earlier attempt');
    const events = await eventsFor(u.assetId);
    assert(events.length === 1, `one abandonment wrote ${events.length} audit entries`);
    assert(events[0].detail.asset_status === 'available',
      `the state at the time was ${JSON.stringify(events[0].detail.asset_status)}`);
    assert((await assetState(u.assetId)).status === 'available',
      'an available master was demoted by a cleanup');
  });

  await test('it needs a written reason', async () => {
    const u = await unfinished();
    await rejects(() => abandon(admin, u.assetId, u.uploadId, '   '), /needs a written reason/);
    await rejects(() => abandon(admin, u.assetId, u.uploadId, null), /needs a written reason/);
    const events = await eventsFor(u.assetId);
    assert(events.length === 0, 'a refused abandonment still wrote an audit entry');
  });

  await test('it needs the id storage gave the upload', async () => {
    const u = await unfinished();
    await rejects(() => abandon(admin, u.assetId, '   ', 'cleanup'),
      /needs the id storage gave it/);
    await rejects(() => abandon(admin, u.assetId, null, 'cleanup'),
      /needs the id storage gave it/);
    // Not a format check — storage's ids are its own business. This one stops a
    // request body from being recorded verbatim into the audit trail.
    await rejects(() => abandon(admin, u.assetId, 'x'.repeat(513), 'cleanup'),
      /not an upload id storage issued/);
    assert((await eventsFor(u.assetId)).length === 0, 'a refusal was recorded anyway');
  });

  await test('only staff may end an upload, including the person who started it', async () => {
    const u = await unfinished();
    // The uploader is the person with the most reason to want a stalled transfer
    // gone from their library, and the one whose reason nobody else could check.
    await rejects(() => abandon(teacher, u.assetId, u.uploadId, 'mine, and it never finished'),
      /only platform staff may abandon/);
    await rejects(() => abandon(learnerUser, u.assetId, u.uploadId, 'please'),
      /only platform staff may abandon/);
    // asAnon takes a function: no claims at all, so there is no actor to be
    // privileged, and the refusal is the same sentence rather than a second rule.
    await rejects(
      () => asAnon(() => q(ABANDON, [u.assetId, u.uploadId, 'please'])),
      /only platform staff may abandon/,
    );
    assert((await eventsFor(u.assetId)).length === 0, 'a refusal was recorded anyway');
  });

  await test('an upload of an asset that does not exist is refused', async () => {
    await rejects(
      () => abandon(admin, crypto.randomUUID(), '2~nothing', 'cleanup'),
      /no media asset/,
    );
  });

  await test('each decision is its own entry, so two cleanups are not one', async () => {
    const u = await unfinished();
    await abandon(admin, u.assetId, '2~first-attempt', 'the first attempt stalled');
    await abandon(admin, u.assetId, '2~second-attempt', 'the second attempt stalled too');

    const events = await eventsFor(u.assetId);
    assert(events.length === 2, `two abandonments wrote ${events.length} audit entries`);
    const ids = events.map((event) => event.detail.upload_id);
    assert(ids.includes('2~first-attempt') && ids.includes('2~second-attempt'),
      `the two uploads were not told apart: ${JSON.stringify(ids)}`);
  });

  await test('the reason is recorded trimmed, and the id with it', async () => {
    const u = await unfinished({ uploadId: '  2~padded  ' });
    await abandon(admin, u.assetId, u.uploadId, '  a reason with padding  ');

    const events = await eventsFor(u.assetId);
    assert(events.length === 1, `one abandonment wrote ${events.length} audit entries`);
    assert(events[0].detail.reason === 'a reason with padding',
      `the reason was ${JSON.stringify(events[0].detail.reason)}`);
    assert(events[0].detail.upload_id === '2~padded',
      `the upload id was ${JSON.stringify(events[0].detail.upload_id)}`);
  });
}
