// The memorisation tracker: what a learner has memorised, and when to look at it
// again.
//
// `learning.hifz` was registered with "revision schedule and decay model
// designed" as its precondition, and nothing had been designed. This suite tests
// the design rather than a UI: the ladder, the way a verdict moves a passage
// along it, and the four things that would break quietly —
//
//   * **a shaky review returns to the first rung** — the whole point of the
//     ladder is that it comes back down;
//   * **the schedule is the learner's own report** — no score is written, and an
//     outcome that is neither solid nor shaky is refused rather than treated as
//     one of them;
//   * **a passage is archived, never deleted**, and its reviews stay readable;
//   * **the flag decides whether the page exists, not whether the data does** —
//     off returns `{enabled:false}` and nothing else, so a switched-off feature
//     cannot be read as "this learner has memorised nothing".

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    bootstrapAdmin, newUser, newProfile,
  } = ctx;

  const admin = await bootstrapAdmin('hifz-admin@example.com');

  async function asActor(actor, sql, params = []) {
    await q('begin');
    await q(`select set_config('request.jwt.claims',$1,true)`,
      [JSON.stringify({ sub: actor, role: 'authenticated' })]);
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

  const call = async (actor, fn, params = []) =>
    (await asActor(actor, `select public.${fn} as r`, params)).rows[0].r;

  const eq = (actual, expected, what) =>
    assert(actual === expected,
      `${what}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);

  const flag = (on) =>
    q(`update public.platform_settings set value_text = $1 where key = 'learning.hifz'`,
      [on ? 'true' : 'false']);

  const addPassage = (actor, learner, label, status) =>
    call(actor, 'add_hifz_passage($1,$2,$3)', [learner, label, status ?? 'learning']);

  const review = (actor, passage, outcome) =>
    call(actor, 'review_hifz_passage($1,$2)', [passage, outcome]);

  const read = (actor, learner) =>
    call(actor, 'my_hifz($1)', [learner]);

  // -------------------------------------------------------------------------
  // Fixtures: an adult learner of their own, and a child in a family.
  // -------------------------------------------------------------------------
  const adult = await newUser('hifz-adult@example.com');
  await newProfile(adult);
  const adultProfile = (await q(
    `insert into public.learner_profiles (linked_user_id, display_name, learner_type)
     values ($1, 'Adult Learner', 'adult') returning id`, [adult])).rows[0].id;

  const parent = await newUser('hifz-parent@example.com');
  await newProfile(parent);
  const familyId = (await q(
    `insert into public.families (name, created_by) values ('Hifz Family', $1) returning id`,
    [parent])).rows[0].id;
  await q(
    `insert into public.family_memberships (family_id, user_id, membership_type, status, joined_at)
     values ($1, $2, 'owner', 'active', now())`, [familyId, parent]);
  const childProfile = (await q(
    `insert into public.learner_profiles
       (family_id, display_name, learner_type, age_band)
     values ($1, 'Hifz Child', 'child', '8-10') returning id`, [familyId])).rows[0].id;

  const stranger = await newUser('hifz-stranger@example.com');
  await newProfile(stranger);

  // -------------------------------------------------------------------------
  // The flag
  // -------------------------------------------------------------------------
  await test('off is one key, and it does not look like an empty record', async () => {
    await flag(false);
    const off = await read(adult, adultProfile);
    eq(off.enabled, false, 'enabled while off');
    eq(Object.keys(off).length, 1, 'keys returned while off');
    await rejects(() => addPassage(adult, adultProfile, 'Al-Fatihah'), /hifz:not_enabled/);
  });

  // -------------------------------------------------------------------------
  // Adding
  // -------------------------------------------------------------------------
  await test('a learner adds their own passage, and it is due immediately', async () => {
    await flag(true);

    const id = await addPassage(adult, adultProfile, '  Al-Fatihah 1–7  ');
    assert(id, 'the passage id');

    const row = (await q(
      `select learner_profile_id, label, status, rung, interval_days, next_due_on
         from public.hifz_passages where id = $1`, [id])).rows[0];
    eq(row.label, 'Al-Fatihah 1–7', 'the label is trimmed, not mangled');
    eq(row.status, 'learning', 'a new passage is still being learned');
    eq(row.rung, 0, 'the first rung');
    eq(Number(row.interval_days), 1, 'the first interval');
    eq(row.learner_profile_id, adultProfile, 'whose record it is');
  });

  await test('a guardian adds one for a child, and the child is the record', async () => {
    const id = await addPassage(parent, childProfile, 'The last three of Al-Baqarah');
    const row = (await q('select created_by, learner_profile_id from public.hifz_passages where id = $1',
      [id])).rows[0];
    eq(row.created_by, parent, 'who typed it');
    eq(row.learner_profile_id, childProfile, 'whose memory it records');
  });

  await test('somebody else cannot add to a learner they cannot access', async () => {
    await rejects(() => addPassage(stranger, adultProfile, 'Not mine'), /hifz:not_allowed/);
    await rejects(() => read(stranger, adultProfile), /hifz:not_allowed/);
  });

  await test('a blank label, a long label and a bad status are refused by name', async () => {
    await rejects(() => addPassage(adult, adultProfile, '   '), /hifz:label_required/);
    await rejects(() => addPassage(adult, adultProfile, 'x'.repeat(201)), /hifz:label_too_long/);
    await rejects(() => addPassage(adult, adultProfile, 'Ayat al-Kursi', 'finished'), /hifz:bad_status/);
  });

  await test('the same label twice is refused, because two schedules for one thing is a bug', async () => {
    await rejects(() => addPassage(adult, adultProfile, 'al-fatihah 1–7'), /hifz:already_exists/);
  });

  // -------------------------------------------------------------------------
  // The ladder
  // -------------------------------------------------------------------------
  await test('solid climbs the ladder one rung at a time and stops at the top', async () => {
    const id = await addPassage(adult, adultProfile, 'Ladder climb');

    const ladder = (await q('select public.hifz_ladder() as l')).rows[0].l;
    eq(ladder.length, 7, 'seven rungs');
    eq(ladder[0], 1, 'the first rung is a day');
    eq(ladder[6], 160, 'the last rung');

    for (let i = 0; i < ladder.length; i += 1) {
      const result = await review(adult, id, 'solid');
      eq(Number(result.intervalDays), ladder[Math.min(i + 1, ladder.length - 1)],
        `interval after solid review ${i + 1}`);
    }

    // Two more: it must sit at the top, not fall off it.
    await review(adult, id, 'solid');
    const top = await review(adult, id, 'solid');
    eq(Number(top.intervalDays), 160, 'still 160 after the ladder runs out');
    eq(Number(top.rung), 6, 'still the last rung');
  });

  await test('shaky returns to the first rung and counts a lapse, and never a score', async () => {
    const id = await addPassage(adult, adultProfile, 'Ladder fall');
    await review(adult, id, 'solid');
    await review(adult, id, 'solid');

    const result = await review(adult, id, 'shaky');
    eq(Number(result.intervalDays), 1, 'back to tomorrow');
    eq(Number(result.rung), 0, 'back to the first rung');

    const row = (await q(
      `select lapses, review_count from public.hifz_passages where id = $1`, [id])).rows[0];
    eq(row.lapses, 1, 'one lapse');
    eq(row.review_count, 3, 'three reviews');

    // The review row keeps what it decided at the time.
    const last = (await q(
      `select outcome, rung, interval_days from public.hifz_reviews
        where passage_id = $1 order by created_at desc limit 1`, [id])).rows[0];
    eq(last.outcome, 'shaky', 'the outcome is recorded');
    eq(last.rung, 0, 'the rung it decided');
    eq(Number(last.interval_days), 1, 'the interval it decided');

    // No column anywhere is a score, and the payload says nothing else.
    const columns = (await q(
      `select column_name from information_schema.columns
        where table_schema = 'public'
          and table_name in ('hifz_passages', 'hifz_reviews')`)).rows.map((r) => r.column_name);
    assert(!columns.some((c) => /score|grade|rating|mastery|proficiency/i.test(c)),
      `a hifz table grew a score column: ${columns.join(', ')}`);
  });

  await test('an outcome that is neither solid nor shaky is refused', async () => {
    const id = await addPassage(adult, adultProfile, 'Bad outcome');
    await rejects(() => review(adult, id, 'maybe'), /hifz:bad_outcome/);
    await rejects(() => review(adult, id, ''), /hifz:bad_outcome/);
  });

  // -------------------------------------------------------------------------
  // Where a passage is
  // -------------------------------------------------------------------------
  await test('the learner names where they are, and it is only a label', async () => {
    const id = await addPassage(adult, adultProfile, 'Status change');
    const result = await call(adult, 'set_hifz_passage_status($1,$2)', [id, 'memorised']);
    eq(result.status, 'memorised', 'the status the learner chose');

    const row = (await q('select status from public.hifz_passages where id = $1', [id])).rows[0];
    eq(row.status, 'memorised', 'stored');

    await rejects(
      () => call(adult, 'set_hifz_passage_status($1,$2)', [id, 'mastered']),
      /hifz:bad_status/);
  });

  await test('the page reads counts, the ladder and a days-until number', async () => {
    const record = await read(adult, adultProfile);
    eq(record.enabled, true, 'enabled');
    eq(record.learnerId, adultProfile, 'whose page');
    eq(record.ladder.length, 7, 'the ladder travels with the record');
    eq(typeof record.counts.passages, 'number', 'a count of passages');
    eq(typeof record.counts.due, 'number', 'a count of what is due');

    // Due things sort first; within the due ones, by label.
    const days = record.passages.map((p) => Number(p.daysUntilDue));
    const firstFuture = days.findIndex((d) => d > 0);
    if (firstFuture >= 0) {
      assert(days.slice(firstFuture).every((d) => d > 0),
        `a due passage came after one that is not due: ${days.join(',')}`);
    }
    // Every live passage is in the payload with a number for how soon it is due,
    // which is what the page sorts and prints.
    assert(record.passages.every((p) => Number.isInteger(Number(p.daysUntilDue))),
      `a passage has no daysUntilDue: ${JSON.stringify(record.passages)}`);
  });

  await test('a passage just reviewed says when it is next due', async () => {
    const id = await addPassage(adult, adultProfile, 'Scheduled');
    const result = await review(adult, id, 'solid');
    const record = await read(adult, adultProfile);
    const row = record.passages.find((p) => p.id === id);
    eq(row.daysUntilDue, Number(result.intervalDays), 'days until due matches the interval');
    eq(row.nextDueOn, result.nextDueOn, 'the date');
  });

  // -------------------------------------------------------------------------
  // Putting it away
  // -------------------------------------------------------------------------
  await test('archiving hides a passage and keeps every review', async () => {
    const id = await addPassage(adult, adultProfile, 'To archive');
    await review(adult, id, 'solid');

    const before = (await q('select count(*)::int as n from public.hifz_reviews where passage_id = $1',
      [id])).rows[0].n;
    eq(await call(adult, 'archive_hifz_passage($1)', [id]), true, 'archived');

    const after = (await q('select count(*)::int as n from public.hifz_reviews where passage_id = $1',
      [id])).rows[0].n;
    eq(after, before, 'reviews after archiving');
    eq((await q('select archived_at is not null as a from public.hifz_passages where id = $1',
      [id])).rows[0].a, true, 'the row is still there, dated');

    const record = await read(adult, adultProfile);
    assert(!record.passages.some((p) => p.id === id), 'an archived passage is not on the page');
    await rejects(() => review(adult, id, 'solid'), /hifz:passage_not_found/);
  });

  await test('somebody else cannot review or archive a passage they cannot access', async () => {
    const id = await addPassage(adult, adultProfile, 'Private');
    await rejects(() => review(stranger, id, 'solid'), /hifz:not_allowed/);
    await rejects(() => call(stranger, 'archive_hifz_passage($1)', [id]), /hifz:not_allowed/);
  });

  // -------------------------------------------------------------------------
  // Grants
  // -------------------------------------------------------------------------
  await test('row level security is on for both tables', async () => {
    // A grant without RLS is a table every signed-in account can read. This
    // asserts the switch that makes the policies above mean anything.
    for (const table of ['hifz_passages', 'hifz_reviews']) {
      const on = (await q(
        `select relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace
          where n.nspname = 'public' and c.relname = $1`, [table])).rows[0];
      eq(on.relrowsecurity, true, `RLS on ${table}`);
    }
  });

  await test('a learner cannot read another learner\'s passages through the table', async () => {
    // The policy, not the function: `/hifz?learner=<somebody else>` is refused in
    // `my_hifz()`, and a direct read must be refused by the table as well.
    await q('begin');
    await q(`select set_config('request.jwt.claims',$1,true)`,
      [JSON.stringify({ sub: stranger, role: 'authenticated' })]);
    await q('set local role authenticated');
    try {
      const rows = await q('select id from public.hifz_passages');
      eq(rows.rows.length, 0, 'a stranger read somebody else\'s passages');
    } finally {
      await q('rollback');
    }
  });

  await test('the tables are readable but not writable by a client', async () => {
    // Reads go through policies; writes go through the functions, which is the
    // only way the ladder cannot be skipped.
    await q('begin');
    await q(`select set_config('request.jwt.claims',$1,true)`,
      [JSON.stringify({ sub: adult, role: 'authenticated' })]);
    await q('set local role authenticated');
    try {
      await rejects(
        () => q(`insert into public.hifz_passages (learner_profile_id, label, created_by)
                values ($1, 'Direct', $2)`, [adultProfile, adult]),
        /permission denied/i);
    } finally {
      await q('rollback');
    }
  });

  await test('an anonymous caller cannot read the record', async () => {
    await q('begin');
    await q('set local role anon');
    try {
      await rejects(() => q('select public.my_hifz(null)'), /permission denied/i);
    } finally {
      await q('rollback');
    }
  });

  // Leave the global switch as it was found, or every later suite inherits it.
  await flag(false);
  assert(admin, 'fixture');
}
