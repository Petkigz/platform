// What a plan gives you, and why a lesson cannot be saved.
//
// Two silences this pins shut:
//
//   - a learner on Basic saw no Save button and was told nothing, so the one
//     thing Plus sells was invisible to the person it is sold to;
//   - `/subscriptions` listed periods and slots and never said what the plan
//     includes.
//
// The rule the suite enforces hardest is the boring one: `lesson_download_standing()`
// *explains* `may_download_lesson()` and must never disagree with it. Two
// predicates that drift apart is how a screen promises something the writer
// then refuses.

export async function run(ctx) {
  const {
    q, test, assert,
    bootstrapAdmin, newUser, newProfile, newInstructor, committed,
    newCourse, newVersion, newSection, newLesson, newAsset,
  } = ctx;

  const admin = await bootstrapAdmin('standing-admin@example.com');
  const teacher = await newInstructor('standing-teacher@example.com', admin);

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
    const userId = await newUser(`standing-adult-${seq}@example.com`);
    await newProfile(userId, name);
    const learnerId = (await scalar(
      `insert into public.learner_profiles (display_name, learner_type, age_band, linked_user_id)
       values ($1,'adult','18+',$2) returning id`, [name, userId])).id;
    return { userId, learnerId, name };
  }

  /** A course whose one lesson has a verified first-party video. */
  async function taught({ media = true } = {}) {
    seq += 1;
    const course = await newCourse(teacher, { status: 'active', title: `Standing Course ${seq}` });
    const version = await newVersion(course, teacher);
    const section = await newSection(version);
    const lesson = await newLesson(section);
    if (media) {
      const asset = await newAsset(teacher, { status: 'available' });
      await q(`insert into public.lesson_resources
                 (lesson_id, resource_type, media_asset_id, display_name, position)
               values ($1,'video',$2,'Recorded lesson',1)`, [lesson, asset]);
    }
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

  async function withOffline(on, fn) {
    const before = (await scalar(
      `select value_text from public.platform_settings where key = 'learning.offline'`)).value_text;
    await q(`update public.platform_settings set value_text = $1
              where key = 'learning.offline'`, [on ? 'true' : 'false']);
    try {
      return await fn();
    } finally {
      await q(`update public.platform_settings set value_text = $1
                where key = 'learning.offline'`, [before ?? 'false']);
    }
  }

  const standing = (actor, lessonId) =>
    asActor(actor, 'select public.lesson_download_standing($1) s', [lessonId])
      .then((r) => r.rows[0].s);

  const may = (actor, lessonId) =>
    asActor(actor, 'select public.may_download_lesson($1) m', [lessonId])
      .then((r) => r.rows[0].m);

  // -------------------------------------------------------------------------
  console.log('\nThe standing explains the predicate');
  // -------------------------------------------------------------------------

  await test('every case agrees with may_download_lesson()', async () => {
    const person = await adult('Agreeing');
    const other = await adult('Unrelated');

    // Each case is built once and then read with the feature in the state its
    // label names, because the standing includes the flag while
    // `may_download_lesson()` deliberately does not — the page combines them,
    // and the combination is what has to agree.
    const featureOff = await taught();
    await grantAccess(person.learnerId, featureOff.version);

    const notEntitled = await taught();

    const entitledNoPlus = await taught();
    await grantAccess(person.learnerId, entitledNoPlus.version);

    const entitledPlus = await taught();
    await grantAccess(other.learnerId, entitledPlus.version);
    await grantFeature(other.learnerId);

    const noMedia = await taught({ media: false });
    await grantAccess(other.learnerId, noMedia.version);
    await grantFeature(other.learnerId);

    const cases = [
      { label: 'feature off', lesson: featureOff.lesson, actor: person.userId, flag: false },
      { label: 'not entitled', lesson: notEntitled.lesson, actor: other.userId, flag: true },
      { label: 'entitled without plus', lesson: entitledNoPlus.lesson, actor: person.userId, flag: true },
      { label: 'entitled with plus', lesson: entitledPlus.lesson, actor: other.userId, flag: true },
      { label: 'no media', lesson: noMedia.lesson, actor: other.userId, flag: true },
    ];

    for (const c of cases) {
      await withOffline(c.flag, async () => {
        const s = await standing(c.actor, c.lesson);
        const m = await may(c.actor, c.lesson);
        assert(s.enabled === c.flag, `${c.label}: enabled was ${s.enabled}`);
        assert(s.allowed === (m && c.flag),
          `${c.label}: standing said ${s.allowed}, the page would offer ${m && c.flag}`);
      });
    }
  });

  await test('a learner on Basic is told it is a Plus feature, in a sentence', async () => {
    const person = await adult('Basic Plan');
    const shop = await taught();
    await grantAccess(person.learnerId, shop.version);
    await withOffline(true, async () => {
      const s = await standing(person.userId, shop.lesson);
      assert(s.reason === 'needs_plus', `reason was ${s.reason}`);
      assert(s.needsPlus === true, 'the reason does not name the shelf that fixes it');
      assert(/plus feature/i.test(s.message), `message was ${s.message}`);
    });
  });

  await test('somebody who cannot watch the lesson is not sold a plan instead', async () => {
    const person = await adult('Not Enrolled');
    const shop = await taught();
    await withOffline(true, async () => {
      const s = await standing(person.userId, shop.lesson);
      assert(s.reason === 'not_entitled', `reason was ${s.reason}`);
      // The important part: enrolling is the fix, not upgrading. Pointing a
      // non-buyer at the Plus shelf would sell them something still useless.
      assert(s.needsPlus === false, 'an unenrolled visitor was pointed at a plan');
    });
  });

  await test('the flag off is said once, and is its own reason', async () => {
    const person = await adult('Flag Off');
    const shop = await taught();
    await grantAccess(person.learnerId, shop.version);
    await grantFeature(person.learnerId);
    await withOffline(false, async () => {
      const s = await standing(person.userId, shop.lesson);
      assert(s.enabled === false, 'the standing claimed the feature was on');
      assert(s.reason === 'feature_off', `reason was ${s.reason}`);
      assert(s.allowed === false);
    });
  });

  await test('a lesson with nothing verified to save says so', async () => {
    const person = await adult('No Media');
    const shop = await taught({ media: false });
    await grantAccess(person.learnerId, shop.version);
    await grantFeature(person.learnerId);
    await withOffline(true, async () => {
      const s = await standing(person.userId, shop.lesson);
      assert(s.reason === 'no_media', `reason was ${s.reason}`);
    });
  });

  await test('a family cannot combine one member\'s course with another\'s plan', async () => {
    const shop = await taught();
    const parent = await adult('Combining Parent');
    // A family with two adults: one bought the course, the other has Plus.
    const family = (await scalar(
      `insert into public.families (name, created_by) values ('Standing Family', $1) returning id`,
      [parent.userId])).id;
    const partner = await adult('Combining Partner');
    for (const member of [parent, partner]) {
      await q(`insert into public.family_memberships
                 (family_id, user_id, membership_type, status, joined_at)
               values ($1,$2,'guardian','active',now())`, [family, member.userId]);
    }
    await grantAccess(parent.learnerId, shop.version);
    await grantFeature(partner.learnerId);

    await withOffline(true, async () => {
      const s = await standing(parent.userId, shop.lesson);
      assert(s.allowed === false,
        'a plan held by one adult and a course held by another were combined');
      assert(s.reason === 'needs_plus', `reason was ${s.reason}`);
    });
  });

  // -------------------------------------------------------------------------
  console.log('\nWhat a plan includes');
  // -------------------------------------------------------------------------

  /** Plans are staff work, so every writer runs as the platform admin. */
  const staff = (sql, params = []) => asActor(admin, sql, params).then((r) => r.rows);

  async function aPlusPlan() {
    const plan = (await staff('select public.create_plan($1,$2,$3,$4) id',
      [`standing-plus-${crypto.randomUUID().slice(0, 6)}`, 'Plus household', 'Everything', 'plus']))[0].id;
    const version = (await staff('select public.create_plan_version($1,$2,$3,$4,$5) id',
      [plan, 2, 2, 'month', 'Plus terms']))[0].id;
    await staff(`select public.add_plan_entitlement($1,'feature',null,null,'offline_downloads')`, [version]);
    await staff(`select public.set_plan_price($1,25000,'UGX',null)`, [version]);
    await staff('select public.activate_plan_version($1)', [version]);
    return { plan, version };
  }

  async function aBasicPlan() {
    const plan = (await staff('select public.create_plan($1,$2,$3,$4) id',
      [`standing-basic-${crypto.randomUUID().slice(0, 6)}`, 'Basic household', 'The course', 'basic']))[0].id;
    const version = (await staff('select public.create_plan_version($1,$2,$3,$4,$5) id',
      [plan, 0, 1, 'month', 'Basic terms']))[0].id;
    const subject = (await q("select id from public.subject_areas where code='quran' limit 1")).rows[0].id;
    await staff(`select public.add_plan_entitlement($1,'catalogue',$2,null,null)`, [version, subject]);
    await staff(`select public.set_plan_price($1,9000,'UGX',null)`, [version]);
    await staff('select public.activate_plan_version($1)', [version]);
    return { plan, version };
  }

  async function subscribe(learner, planVersion, planId, { status = 'active' } = {}) {
    const account = (await scalar(
      `insert into public.billing_accounts
         (display_name, billing_country, billing_currency, status, created_by)
       values ('Standing household','UG','UGX','active',$1) returning id`,
      [learner.userId])).id;

    // A subscription is a checkout outcome, not a row a person writes. The
    // trigger says so, and the trusted-writer marker is how the workflow says
    // it is the workflow — transaction-local, so it cannot leak into another
    // test.
    return committed(async () => {
      await q(`select set_config('app.subscription_writer','on',true)`);
      return (await scalar(
        `insert into public.subscriptions
           (billing_account_id, plan_id, plan_version_id, status,
            current_period_start, current_period_end)
         values ($1,$2,$3,$4, now(), now() + interval '20 days') returning id`,
        [account, planId, planVersion, status])).id;
    });
  }

  await test('a Plus subscriber sees the shelf, the period and the feature in words', async () => {
    const person = await adult('Plus Subscriber');
    const plus = await aPlusPlan();
    await subscribe(person, plus.version, plus.plan);

    const rows = (await asActor(person.userId,
      'select public.my_plan_summary() s')).rows[0].s;
    assert(rows.length === 1, `summary listed ${rows.length} plans`);
    const row = rows[0];
    assert(row.tier === 'plus', `tier was ${row.tier}`);
    assert(row.planName === 'Plus household');
    assert(row.interval === 'month');
    assert(row.currentPeriodEnd, 'the summary does not say when the period ends');
    assert(row.features.length === 1, `features were ${JSON.stringify(row.features)}`);
    assert(row.features[0].code === 'offline_downloads');
    assert(/no connection/i.test(row.features[0].label),
      `the label was not a sentence: ${row.features[0].label}`);
  });

  await test('a Basic subscriber sees what the plan carries and no Plus feature', async () => {
    const person = await adult('Basic Subscriber');
    const basic = await aBasicPlan();
    await subscribe(person, basic.version, basic.plan);

    const rows = (await asActor(person.userId,
      'select public.my_plan_summary() s')).rows[0].s;
    assert(rows.length === 1);
    assert(rows[0].tier === 'basic');
    assert(rows[0].features.length === 0, 'a basic plan reported a plus feature');
    assert(rows[0].subjects.length === 1, `catalogue subjects were ${JSON.stringify(rows[0].subjects)}`);
    assert(/qur/i.test(rows[0].subjects[0]), `subject was ${rows[0].subjects[0]}`);
  });

  await test('somebody else\'s plan is not in the summary', async () => {
    const mine = await adult('Mine');
    const theirs = await adult('Theirs');
    const plus = await aPlusPlan();
    await subscribe(theirs, plus.version, plus.plan);
    const rows = (await asActor(mine.userId,
      'select public.my_plan_summary() s')).rows[0].s;
    assert(rows.length === 0, `a stranger's plan appeared: ${JSON.stringify(rows)}`);
  });

  await test('a lapsed period is not listed as a plan somebody is on', async () => {
    const person = await adult('Lapsed');
    const plus = await aPlusPlan();
    const id = await subscribe(person, plus.version, plus.plan);
    // A lapsed period is expressed the way the schema expresses it: the period
    // moved into the past, and the subscription with it. The check constraint
    // insists start <= end, so both move.
    // `sub_timestamps_agree` is right to insist on the pair: an expired
    // subscription with no moment of expiry cannot say when it lapsed.
    await committed(async () => {
      await q(`select set_config('app.subscription_writer','on',true)`);
      await q(`update public.subscriptions
                  set current_period_start = now() - interval '40 days',
                      current_period_end   = now() - interval '10 days',
                      cancelled_at = now() - interval '10 days',
                      status = 'expired'
                where id = $1`, [id]);
    });
    const rows = (await asActor(person.userId,
      'select public.my_plan_summary() s')).rows[0].s;
    assert(rows.length === 0, 'an expired subscription was still reported as live');
  });

  await test('the label falls back to the code rather than to a guess', async () => {
    assert((await scalar("select public.plan_feature_label('offline_downloads') l")).l
      === 'Watch lessons inside the app with no connection');
    assert((await scalar("select public.plan_feature_label('something_new') l")).l
      === 'something_new');
  });
}
