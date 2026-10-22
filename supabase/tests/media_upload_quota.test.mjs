// Unit 25 — how much a teacher may upload (decision of 2026-10-22: 50 GB of
// masters, behind `platform.cost_controls`).
//
// `platform.cost_controls` has been registered since the flag table was written
// and said what was missing: "Nothing exists. Unlimited teacher uploads is how
// $250/month becomes $3,000." Per-file limits existed; nothing limited the total.
//
// Counted on master bytes because the rendition ladder stores about 2.1x the
// master and is the platform's choice, not the teacher's. Enforced at initiate,
// where a teacher can still be told, and off by default so switching it on is a
// decision rather than a deploy.

export async function run(ctx) {
  const {
    q, test, assert,
    asUser, asAnon, newUser, newProfile,
  } = ctx;

  const GB = 1024 * 1024 * 1024;

  const scalar = async (sql, params) => (await q(sql, params)).rows[0];

  /** A master of exactly `bytes`, uploaded by `who`. */
  async function asset(who, bytes, over = {}) {
    return (await q(
      `insert into public.media_assets
         (storage_backend, master_bucket, master_key, checksum, mime_type,
          byte_size, status, uploaded_by)
       values ('r2','masters',$1,$2,'video/mp4',$3,$4,$5) returning id`,
      [over.key ?? `${crypto.randomUUID()}.mp4`,
       crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, ''),
       bytes, over.status ?? 'available', who])).rows[0].id;
  }

  /** Act as a user and COMMIT, so the write is visible to the next call. */
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

  const allowance = (who, declared = 0) => asUser(who, async () =>
    (await q('select public.media_upload_allowance($1) as r', [declared])).rows[0].r);

  /** Both settings are global and other suites assert their seeds, so restore. */
  async function withGates(on, quotaGb, fn) {
    const rows = (await q(
      `select key, value_text from public.platform_settings
        where key in ('platform.cost_controls','media.upload_quota_gb_per_teacher')
        order by key`)).rows;
    try {
      await q(`update public.platform_settings set value_text = $1
                where key = 'platform.cost_controls'`, [on ? 'true' : 'false']);
      if (quotaGb !== undefined) {
        await q(`update public.platform_settings set value_text = $1
                  where key = 'media.upload_quota_gb_per_teacher'`, [String(quotaGb)]);
      }
      return await fn();
    } finally {
      for (const row of rows) {
        await q(`update public.platform_settings set value_text = $1 where key = $2`,
          [row.value_text, row.key]);
      }
    }
  }

  const teacher = await newUser('mq-teacher@example.com');
  await newProfile(teacher, 'Quota Teacher');
  const other = await newUser('mq-other@example.com');
  await newProfile(other, 'Quota Other');

  await test('the quota is a setting, not a constant, and ships at 50 GB', async () => {
    const row = await scalar(
      `select value_type, value_text, gate_type, description
         from public.platform_settings where key = 'media.upload_quota_gb_per_teacher'`);
    assert(row, 'the quota is not a setting at all');
    assert(row.value_type === 'integer', `the quota is a ${row.value_type}`);
    assert(row.value_text === '50', `the quota is seeded at ${row.value_text}, not 50`);
    assert(row.gate_type === 'admin',
      `the quota is ${row.gate_type}-gated; a number nobody can edit is a constant`);
    assert(/renditions/i.test(row.description),
      'the setting does not say that renditions are not counted, which is the first question it raises');
  });

  await test('with cost controls off there is no quota, and it visibly has no number', async () => {
    await asset(teacher, 40 * GB);
    await withGates(false, undefined, async () => {
      const a = await allowance(teacher, 500 * GB);
      assert(a.enforced === false, 'the quota is enforced while the control is off');
      assert(a.allowed === true, 'an upload was refused while no quota is in force');
      // Null, not zero: zero reads as "no space left", and a reader would act on it.
      assert(a.quotaBytes === null, `quotaBytes is ${a.quotaBytes} while not enforced`);
      assert(a.remainingBytes === null, `remainingBytes is ${a.remainingBytes} while not enforced`);
      // What is stored is still reported, because a screen may want to show it.
      assert(a.usedBytes === String(40 * GB), `usedBytes is ${a.usedBytes}`);
    });
  });

  await test('fifty gigabytes counts masters and refuses the byte that does not fit', async () => {
    await withGates(true, 50, async () => {
      const used = 40 * GB;
      const fits = await allowance(teacher, 10 * GB);
      assert(fits.enforced === true, 'the quota is not enforced while the control is on');
      assert(fits.allowed === true, `an upload that exactly fills the quota was refused: ${JSON.stringify(fits)}`);
      assert(fits.quotaBytes === String(50 * GB), `quotaBytes is ${fits.quotaBytes}`);
      assert(fits.usedBytes === String(used), `usedBytes is ${fits.usedBytes}`);
      assert(fits.remainingBytes === String(10 * GB), `remainingBytes is ${fits.remainingBytes}`);

      const over = await allowance(teacher, 10 * GB + 1);
      assert(over.allowed === false, 'one byte past the quota was allowed');
      assert(over.remainingBytes === String(10 * GB),
        'the refusal does not say how much room is left');
    });
  });

  await test('every figure is an exact decimal string', async () => {
    await withGates(true, 50, async () => {
      const a = await allowance(teacher, 1);
      for (const field of ['quotaBytes', 'usedBytes', 'remainingBytes', 'declaredBytes']) {
        assert(typeof a[field] === 'string',
          `${field} came back as ${typeof a[field]} — a byte count must not become a JS number`);
      }
      assert(a.quotaBytes === '53687091200', `50 GiB is ${a.quotaBytes}`);
    });
  });

  await test('only this uploader’s live masters count', async () => {
    await withGates(true, 50, async () => {
      const before = (await allowance(teacher, 0)).usedBytes;

      // Somebody else's bytes are theirs.
      await asset(other, 30 * GB);
      assert((await allowance(teacher, 0)).usedBytes === before,
        'another teacher’s uploads count against this one');

      // A quarantined master is still bytes in a bucket, so it counts — a quota
      // that could be dodged by uploading something that gets held would be no
      // quota at all.
      const held = await asset(teacher, 2 * GB, { status: 'quarantined' });
      const withHeld = (await allowance(teacher, 0)).usedBytes;
      assert(withHeld === String(Number(before) + 2 * GB),
        `a quarantined master is not counted: ${before} → ${withHeld}`);

      // A withdrawn one does not: D7 withdrawal is what "I no longer store this"
      // means, and the space has to come back. Withdrawn through the writer
      // rather than by hand — the status transition is staff-only, and an
      // uploader may withdraw their own file.
      // Committing, not asUser: the harness rolls a user block back, so a
      // withdrawal made inside one is never observed by the next call.
      const withdrawn = (await asActor(teacher,
        'select public.delete_media_asset($1,$2) as r',
        [held, 'Withdrawn by the teacher'])).rows[0].r;
      assert(withdrawn === true, 'the upload could not be withdrawn through the writer');
      assert((await allowance(teacher, 0)).usedBytes === before,
        'a soft-deleted master still counts against the quota');
    });
  });

  await test('renditions are not the teacher’s bytes', async () => {
    await withGates(true, 50, async () => {
      const master = await asset(teacher, 1 * GB, { key: `rq-${crypto.randomUUID()}.mp4` });
      const before = (await allowance(teacher, 0)).usedBytes;

      // Whatever the ladder stores, it stores because the platform chose to
      // transcode; charging the teacher for it would make the quota a surprise.
      const columns = (await q(
        `select column_name from information_schema.columns
          where table_schema = 'public' and table_name = 'media_renditions'
          order by ordinal_position`)).rows.map((r) => r.column_name);
      assert(columns.length > 0, 'media_renditions does not exist');
      assert(!columns.includes('uploaded_by'),
        'a rendition records an uploader, which would be the master’s teacher by accident');
      assert((await allowance(teacher, 0)).usedBytes === before,
        `storage changed when a master was added: ${before} → ${(await allowance(teacher, 0)).usedBytes}`);
      assert(master, 'no master was inserted');
    });
  });

  await test('a quota below one gigabyte is loud, not silently blocking', async () => {
    await withGates(true, 0, async () => {
      let message = '';
      try {
        await allowance(teacher, 0);
      } catch (e) {
        message = e.message;
      }
      // 0 is far more likely to be a typo than a decision, and the two wrong
      // behaviours — block everything, or allow everything — are both silent.
      assert(/quota_misconfigured/i.test(message),
        `a quota of 0 gave '${message || 'no error'}' rather than a loud refusal`);
    });
  });

  await test('the exception form gives the same answer, with the figures in it', async () => {
    await withGates(true, 50, async () => {
      const ok = await asUser(teacher, async () =>
        (await q('select public.assert_media_upload_allowed($1) as r', [1 * GB])).rows[0].r);
      assert(ok.allowed === true, 'the exception form refused an upload that fits');

      let message = '';
      try {
        await asUser(teacher, async () =>
          q('select public.assert_media_upload_allowed($1)', [999 * GB]));
      } catch (e) {
        message = e.message;
      }
      assert(/media:quota_exceeded/i.test(message),
        `an upload past the quota gave '${message || 'no error'}'`);
      // "Quota exceeded" without a figure is a dead end.
      assert(/53687091200/.test(message),
        `the refusal does not name the quota: ${message}`);
      assert(/used/.test(message), 'the refusal does not say how much is used');
    });
  });

  await test('an anonymous caller cannot read the allowance', async () => {
    await asAnon(async () => {
      let message = '';
      try {
        await q('select public.media_upload_allowance(0)');
      } catch (e) {
        message = e.message;
      }
      assert(/permission denied|not_signed_in/i.test(message),
        `an anonymous caller got '${message || 'an answer'}'`);
    });
  });
}
