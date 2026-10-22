// The storage meter.
//
// A quota a teacher cannot see is felt as an outage: the first they hear of
// 50 GB is the upload that bounces. These tests pin the meter to the same
// numbers the refusal uses —
//
//   - a teacher sees their own masters by status, and nothing else;
//   - soft-deleted and withdrawn files do not count, quarantined and pending do;
//   - with cost controls off the meter says "no cap" rather than pretending
//     there is one, and with them on it names the figure and the space left;
//   - staff see who is storing what, biggest first, flagged when over.

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    bootstrapAdmin, newUser, newProfile, newInstructor,
  } = ctx;

  const admin = await bootstrapAdmin('meter-admin@example.com');
  const teacher = await newInstructor('meter-teacher@example.com', admin);
  const other = await newInstructor('meter-other@example.com', admin);

  const scalar = async (sql, params = []) => (await q(sql, params)).rows[0];
  const GiB = 1024 * 1024 * 1024;

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

  async function asset(uploader, bytes, { status = 'available', deleted = false } = {}) {
    return (await scalar(
      `insert into public.media_assets
         (storage_backend, master_bucket, master_key, checksum, mime_type,
          byte_size, status, uploaded_by, deleted_at)
       values ('r2','masters',$1,$2,'video/mp4',$3,$4,$5,$6) returning id`,
      [`meter-${crypto.randomUUID()}.mp4`,
        crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '').slice(0, 32),
        bytes, status, uploader, deleted ? new Date().toISOString() : null])).id;
  }

  const meter = (actor) =>
    asActor(actor, 'select public.my_media_storage() m').then((r) => r.rows[0].m);

  async function withCostControls(on, quotaGb, fn) {
    const before = (await scalar(
      `select value_text from public.platform_settings where key = 'platform.cost_controls'`)).value_text;
    const beforeQuota = (await scalar(
      `select value_text from public.platform_settings where key = 'media.upload_quota_gb_per_teacher'`)).value_text;
    await q(`update public.platform_settings set value_text = $1 where key = 'platform.cost_controls'`,
      [on ? 'true' : 'false']);
    if (quotaGb !== null) {
      await q(`update public.platform_settings set value_text = $1
               where key = 'media.upload_quota_gb_per_teacher'`, [String(quotaGb)]);
    }
    try {
      return await fn();
    } finally {
      await q(`update public.platform_settings set value_text = $1 where key = 'platform.cost_controls'`,
        [before ?? 'false']);
      await q(`update public.platform_settings set value_text = $1
               where key = 'media.upload_quota_gb_per_teacher'`, [beforeQuota ?? '50']);
    }
  }

  await test('a teacher sees their own masters, by status', async () => {
    const person = await adultTeacher('Meter One');
    await asset(person, 1000, { status: 'available' });
    await asset(person, 2000, { status: 'pending' });
    await asset(person, 500, { status: 'quarantined' });

    const reading = await meter(person);
    assert(reading.usedBytes === '3500', `used was ${reading.usedBytes}`);
    assert(reading.fileCount === 3, `counted ${reading.fileCount} files`);
    const statuses = reading.byStatus.map((s) => s.status).sort().join(',');
    assert(statuses === 'available,pending,quarantined', `byStatus was ${statuses}`);
    // The two heaviest are reported first, because that is what a teacher looks
    // at when deciding what to withdraw.
    assert(reading.byStatus[0].status === 'pending' && reading.byStatus[0].bytes === '2000');
  });

  await test('withdrawn and deleted masters are not counted', async () => {
    const person = await adultTeacher('Meter Two');
    await asset(person, 4000, { status: 'available' });
    await asset(person, 9000, { status: 'deleted' });
    await asset(person, 9000, { status: 'available', deleted: true });

    const reading = await meter(person);
    assert(reading.usedBytes === '4000', `used was ${reading.usedBytes}`);
    assert(reading.fileCount === 1, `counted ${reading.fileCount} files`);
  });

  await test('with cost controls off the meter says there is no cap', async () => {
    const person = await adultTeacher('Meter Three');
    await asset(person, 1234);
    const reading = await withCostControls(false, null, () => meter(person));
    assert(reading.enforced === false, 'the meter claimed to enforce a quota');
    assert(reading.quotaBytes === null, `quotaBytes was ${JSON.stringify(reading.quotaBytes)}`);
    assert(reading.remainingBytes === null, 'a quota that does not exist got a remainder');
    assert(reading.usedBytes === '1234', 'used bytes disappeared when the cap did');
  });

  await test('with cost controls on the meter names the cap and the space left', async () => {
    const person = await adultTeacher('Meter Four');
    await asset(person, 1024);
    const reading = await withCostControls(true, 1, () => meter(person));
    assert(reading.enforced === true);
    assert(reading.quotaBytes === String(GiB), `quota was ${reading.quotaBytes}`);
    assert(reading.remainingBytes === String(GiB - 1024), `remaining was ${reading.remainingBytes}`);
  });

  await test('the per-teacher overview is staff only', async () => {
    const person = await adultTeacher('Meter Five');
    await rejects(() => asActor(person,
      'select * from public.media_storage_overview(10)'), /only platform staff/i);
  });

  await test('staff see who is storing what, biggest first, and who is over', async () => {
    const heavy = await adultTeacher('Heavy Uploader');
    const light = await adultTeacher('Light Uploader');
    await asset(heavy, 1610612736); // 1.5 GiB
    await asset(light, 104857600);  // 100 MiB

    const rows = await withCostControls(true, 1, async () =>
      (await asActor(admin, 'select * from public.media_storage_overview(10)')).rows);

    const heavyRow = rows.find((r) => r.uploader_id === heavy);
    const lightRow = rows.find((r) => r.uploader_id === light);
    assert(heavyRow && lightRow, 'an uploader is missing from the overview');
    assert(heavyRow.display_name === 'Heavy Uploader', `name was ${heavyRow.display_name}`);
    assert(Number(heavyRow.bytes) === 1610612736);
    assert(Number(heavyRow.used_percent) === 150, `percent was ${heavyRow.used_percent}`);
    assert(heavyRow.over_quota === true, 'an over-quota uploader was not flagged');
    assert(lightRow.over_quota === false);
    assert(Number(lightRow.used_percent) === 9, `percent was ${lightRow.used_percent}`);
    // Biggest first: the screen is a list of who to talk to.
    const position = rows.findIndex((r) => r.uploader_id === heavy);
    const lightPosition = rows.findIndex((r) => r.uploader_id === light);
    assert(position < lightPosition, 'the overview is not ordered by bytes');
  });

  await test('with cost controls off the overview reports no quota, not zero percent', async () => {
    const rows = await withCostControls(false, null, async () =>
      (await asActor(admin, 'select * from public.media_storage_overview(5)')).rows);
    assert(rows.length > 0, 'no uploaders to read');
    assert(rows.every((r) => r.quota_bytes === null), 'a quota was reported while unenforced');
    assert(rows.every((r) => r.used_percent === null), 'a percentage was invented');
    assert(rows.every((r) => r.over_quota === false), 'somebody was flagged without a quota');
  });

  // -------------------------------------------------------------------------
  async function adultTeacher(name) {
    const userId = await newUser(`meter-${crypto.randomUUID().slice(0, 8)}@example.com`);
    await newProfile(userId, name);
    return userId;
  }
}
