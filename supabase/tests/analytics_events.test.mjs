// Analytics, kept forever.
//
// The owner, 2026-10-22: "analytics, everything is kept and is stored forever
// because you never know what might happen." That sentence decides retention and
// makes three things true, which is what this suite pins:
//
//   - the vocabulary is closed: a typo is refused at write time, because a row
//     written wrongly is wrong for as long as the platform exists;
//   - the store is append-only: no delete, and no update except the
//     de-identification performed by account erasure;
//   - a closed account loses its name, not its rows.
//
// Plus the parts that make it safe to switch on: nothing is recorded while the
// flag is off, nothing is recorded for a signed-out visitor, and staff read
// aggregates rather than people.

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    asAnon, bootstrapAdmin,
    newUser, newProfile, newInstructor, newCourse, newVersion, newSection, newLesson,
    satisfyReview,
  } = ctx;

  const admin = await bootstrapAdmin('analytics-admin@example.com');
  const teacher = await newInstructor('analytics-teacher@example.com', admin);

  const count = async (sql, params = []) =>
    (await q(`select count(*)::int n from (${sql}) t`, params)).rows[0].n;

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
  async function adult(name) {
    seq += 1;
    const userId = await newUser(`analytics-adult-${seq}@example.com`);
    await newProfile(userId, name);
    const learnerId = (await scalar(
      `insert into public.learner_profiles (display_name, learner_type, age_band, linked_user_id)
       values ($1,'adult','18+',$2) returning id`, [name, userId])).id;
    return { userId, learnerId, name };
  }

  async function aLesson() {
    seq += 1;
    const course = await newCourse(teacher, { status: 'active', title: `Analytics Course ${seq}` });
    const version = await newVersion(course, teacher);
    const section = await newSection(version);
    const lesson = await newLesson(section, { title: `Analytics Lesson ${seq}` });
    return { course, version, lesson };
  }

  const record = (actor, code, subjectId = null, learnerId = null, properties = {}) =>
    asActor(actor, 'select public.record_analytics_event($1,$2,$3,$4) r',
      [code, subjectId, learnerId, JSON.stringify(properties)]).then((r) => r.rows[0].r);

  /** Turn capture on for one test and put the setting back afterwards. */
  async function withAnalytics(fn) {
    const before = (await scalar(
      `select value_text from public.platform_settings where key = 'delivery.analytics'`)).value_text;
    await q(`update public.platform_settings set value_text = 'true'
              where key = 'delivery.analytics'`);
    try {
      return await fn();
    } finally {
      await q(`update public.platform_settings set value_text = $1
                where key = 'delivery.analytics'`, [before ?? 'false']);
    }
  }

  // -------------------------------------------------------------------------
  // the vocabulary
  // -------------------------------------------------------------------------

  await test('the vocabulary is closed, described and versioned', async () => {
    const rows = (await q(
      `select code, description, subject_type, learner_scoped, since_version
         from public.analytics_event_codes order by code`)).rows;
    assert(rows.length === 7, `expected 7 events, found ${rows.length}`);
    for (const row of rows) {
      assert(/^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/.test(row.code), `bad code shape: ${row.code}`);
      assert(row.description.length > 10, `${row.code} has no real description`);
      assert(Number(row.since_version) === 1, `${row.code} has no vocabulary version`);
    }
    // The learner-scoped ones are the ones that name a child. If this list grows,
    // it is a privacy decision rather than a refactor.
    const scoped = rows.filter((r) => r.learner_scoped).map((r) => r.code).sort().join(',');
    assert(scoped === 'checkout.started,download.saved,lesson.opened,live.joined',
      `learner-scoped events are ${scoped}`);
  });

  await test('a signed-in user can read the vocabulary but nobody can edit it', async () => {
    const learner = await adult('Vocabulary Reader');
    const seen = (await asActor(learner.userId,
      'select count(*)::int n from public.analytics_event_codes')).rows[0].n;
    assert(seen === 7, `a signed-in user saw ${seen} codes`);
    await rejects(() => asActor(learner.userId,
      `insert into public.analytics_event_codes (code, description) values ('made.up','No')`),
    /permission denied|row-level security/i);
  });

  await test('the flag is an admin switch now, and ships off', async () => {
    const row = await scalar(
      `select value_text, gate_type from public.platform_settings where key = 'delivery.analytics'`);
    assert(row.value_text === 'false', 'analytics capture ships enabled');
    assert(row.gate_type === 'admin', `the gate is ${row.gate_type}, so the owner could not enable it`);
  });

  // -------------------------------------------------------------------------
  // the writer
  // -------------------------------------------------------------------------

  await test('nothing is recorded while the flag is off', async () => {
    const person = await adult('Flag Off');
    const { lesson } = await aLesson();
    const before = await count('select 1 from public.analytics_events');
    const result = await record(person.userId, 'lesson.opened', lesson, person.learnerId);
    assert(result.recorded === false && result.reason === 'feature_off', JSON.stringify(result));
    assert(await count('select 1 from public.analytics_events') === before,
      'a row was written while the flag was off');
  });

  await test('a signed-out visitor records nothing, and leaves no row', async () => {
    await withAnalytics(async () => {
      const before = await count('select 1 from public.analytics_events');
      const result = (await asAnon(() => q(
        `select public.record_analytics_event('search.performed',null,null,'{"query":"zakat"}') r`)))
        .rows[0].r;
      assert(result.recorded === false && result.reason === 'signed_out', JSON.stringify(result));
      assert(await count('select 1 from public.analytics_events') === before,
        'a signed-out visit was recorded');
    });
  });

  await test('an event the vocabulary does not contain is refused', async () => {
    const person = await adult('Typo Recorder');
    const { lesson } = await aLesson();
    await withAnalytics(async () => {
      await rejects(() => record(person.userId, 'lesson.viewed', lesson, person.learnerId),
        /unknown analytics event/i);
      // And a mistake in the subject is refused too, rather than stored as a
      // dangling reference that a report would silently drop.
      await rejects(() => record(person.userId, 'lesson.opened',
        '00000000-0000-0000-0000-000000000000', person.learnerId),
      /no lesson exists with id/i);
    });
  });

  await test('an event is stored with its actor, learner and subject', async () => {
    const person = await adult('Recorder');
    const { lesson } = await aLesson();
    await withAnalytics(async () => {
      const result = await record(person.userId, 'lesson.opened', lesson, person.learnerId);
      assert(result.recorded === true, JSON.stringify(result));
      const row = await scalar(
        `select event_code, subject_type, subject_id, actor_id, learner_profile_id, properties,
                (occurred_at at time zone 'UTC')::date as day
           from public.analytics_events where id = $1`, [result.id]);
      assert(row.event_code === 'lesson.opened');
      assert(row.subject_type === 'lesson' && row.subject_id === lesson);
      assert(row.actor_id === person.userId && row.learner_profile_id === person.learnerId);
      assert(row.properties && typeof row.properties === 'object');
    });
  });

  await test('a learner-scoped event needs a learner the caller can reach', async () => {
    const owner = await adult('Rightful');
    const stranger = await adult('Stranger');
    const { lesson } = await aLesson();
    await withAnalytics(async () => {
      await rejects(() => record(owner.userId, 'lesson.opened', lesson, null),
        /names a learner/i);
      await rejects(() => record(stranger.userId, 'lesson.opened', lesson, owner.learnerId),
        /cannot record an event for that learner/i);
      // A non-learner event cannot smuggle one in either.
      const second = await aLesson();
      await rejects(() => record(owner.userId, 'course.viewed', second.version, owner.learnerId),
        /not about a learner/i);
    });
  });

  await test('properties are a small object, not a place to put payloads', async () => {
    const person = await adult('Payload');
    await withAnalytics(async () => {
      await rejects(() => record(person.userId, 'search.performed', null, null,
        { query: 'x'.repeat(3000) }), /limited to 2 KB/i);
      await rejects(() => asActor(person.userId,
        `select public.record_analytics_event('search.performed',null,null,'"a string"')`),
      /must be a JSON object/i);
    });
  });

  // -------------------------------------------------------------------------
  // append-only
  // -------------------------------------------------------------------------

  await test('an event cannot be deleted or rewritten', async () => {
    const person = await adult('Immutable');
    const { lesson } = await aLesson();
    await withAnalytics(async () => {
      const result = await record(person.userId, 'lesson.opened', lesson, person.learnerId);
      await rejects(() => q('delete from public.analytics_events where id = $1', [result.id]),
        /kept forever/i);
      await rejects(() => q(
        `update public.analytics_events set event_code = 'course.viewed' where id = $1`, [result.id]),
      /de-identified but not rewritten/i);
      // Nulling the person without an erasure in progress is a rewrite too.
      await rejects(() => q(
        'update public.analytics_events set actor_id = null where id = $1', [result.id]),
      /de-identified but not rewritten/i);
    });
  });

  await test('nobody reads the store directly, staff included', async () => {
    await rejects(() => asActor(admin, 'select count(*) from public.analytics_events'),
      /permission denied/i);
    await rejects(() => asAnon(() => q('select count(*) from public.analytics_events')),
      /permission denied/i);
  });

  await test('one month of events is a unit that can be detached', async () => {
    const name = (await q('select public.analytics_ensure_month(now()) as name')).rows[0].name;
    assert(/^analytics_events_\d{4}_\d{2}$/.test(name), `partition is called ${name}`);
    const exists = (await q(
      `select count(*)::int n from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relname = $1 and c.relrowsecurity`, [name])).rows[0].n;
    assert(exists === 1, 'the month partition does not exist or does not answer to RLS');
  });

  // -------------------------------------------------------------------------
  // reading it back
  // -------------------------------------------------------------------------

  await test('staff read totals, a learner is refused', async () => {
    const person = await adult('Reporter');
    const { lesson, version } = await aLesson();
    await withAnalytics(async () => {
      await record(person.userId, 'lesson.opened', lesson, person.learnerId);
      await record(person.userId, 'lesson.opened', lesson, person.learnerId);
      await record(person.userId, 'course.viewed', version);

      const totals = (await asActor(admin,
        'select * from public.analytics_event_totals(30)')).rows;
      const opened = totals.find((r) => r.event_code === 'lesson.opened');
      assert(Number(opened.events) >= 2, `lesson.opened counted ${opened.events}`);
      assert(Number(opened.actors) >= 1 && Number(opened.learners) >= 1);
      // Every code is listed, including the ones with no traffic yet — a report
      // that hides a row cannot show that a feature is never used.
      assert(totals.length === 7, `totals listed ${totals.length} events`);

      const daily = (await asActor(admin,
        `select * from public.analytics_daily('lesson.opened', 30)`)).rows;
      assert(daily.length === 1, `expected one day bucket, got ${daily.length}`);
      assert(Number(daily[0].events) >= 2, `the day bucket has ${daily[0].events} events`);

      await rejects(() => asActor(person.userId,
        'select * from public.analytics_event_totals(30)'), /only platform staff/i);
      await rejects(() => asActor(person.userId,
        `select * from public.analytics_daily('lesson.opened', 30)`), /only platform staff/i);
      await rejects(() => asActor(person.userId,
        'select * from public.analytics_search_terms(30, 10)'), /only platform staff/i);
      await rejects(() => asActor(admin,
        'select * from public.analytics_event_totals(0)'), /between 1 and 3650/i);
    });
  });

  await test('search terms are the one report that reads the payload', async () => {
    const person = await adult('Searcher');
    await withAnalytics(async () => {
      await record(person.userId, 'search.performed', null, null, { query: 'zakat', results: 4 });
      await record(person.userId, 'search.performed', null, null, { query: 'zakat', results: 2 });
      await record(person.userId, 'search.performed', null, null, { query: 'wudu', results: 9 });
      const terms = (await asActor(admin,
        'select * from public.analytics_search_terms(30, 10)')).rows;
      assert(terms[0].term === 'zakat' && Number(terms[0].searches) === 2,
        `top term was ${JSON.stringify(terms[0])}`);
      assert(terms.some((t) => t.term === 'wudu'), 'a second term was dropped');
    });
  });

  // -------------------------------------------------------------------------
  // erasure
  // -------------------------------------------------------------------------

  await test('closing an account keeps the events and loses the name', async () => {
    const person = await adult('Erased Person');
    const { lesson } = await aLesson();
    await withAnalytics(async () => {
      await record(person.userId, 'lesson.opened', lesson, person.learnerId);
      await record(person.userId, 'download.saved', lesson, person.learnerId);

      const before = await count('select 1 from public.analytics_events');
      const result = (await asActor(person.userId,
        'select public.erase_my_account($1) r', [person.name])).rows[0].r;
      assert(result.closed === true, JSON.stringify(result));
      assert(Number(result.deidentified.analyticsEvents) >= 2,
        `erasure de-identified ${JSON.stringify(result.deidentified)}`);

      // The row is still there — that is what "kept forever" means — and it no
      // longer names anyone.
      assert(await count('select 1 from public.analytics_events') === before,
        'erasure deleted analytics rows instead of de-identifying them');
      const stale = await count(
        `select 1 from public.analytics_events
          where actor_id = $1 or learner_profile_id = $2`, [person.userId, person.learnerId]);
      assert(stale === 0, `${stale} analytics rows still name the closed account`);
    });
  });
}
