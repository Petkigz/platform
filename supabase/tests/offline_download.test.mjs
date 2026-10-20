// Offline download is a paid feature, not a consequence of enrolment.
//
// Decided 2026-10-20: saving a lesson to a device requires a plan that carries
// the 'offline_downloads' feature. Buying a course lets you watch it; watching
// is not keeping. These tests pin the predicate may_download_lesson() and the
// closed vocabulary of sellable feature codes.
//
// Nothing here moves a byte. The predicate decides entitlement only; the signed
// download path is not built, and device limits and download expiry are still
// open in FLAGS.md under learning.offline.

export async function run(ctx) {
  const {
    q, test, assert, rejects, asAnon,
    bootstrapAdmin, newUser, newProfile, newInstructor,
    newCourse, newVersion, newSection, newLesson, newAsset,
  } = ctx;

  const admin = await bootstrapAdmin('offline-admin@example.com');
  const plus = await newUser('offline-plus@example.com');
  await newProfile(plus, 'Plus Payer');
  const basic = await newUser('offline-basic@example.com');
  await newProfile(basic, 'Basic Payer');
  const stranger = await newUser('offline-stranger@example.com');
  await newProfile(stranger, 'Stranger');
  const teacher = await newInstructor('offline-teacher@example.com', admin);
  await newProfile(teacher, 'Teacher');

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

  const may = async (actor, lessonId) =>
    (await asActor(actor, 'select public.may_download_lesson($1) as ok', [lessonId])).rows[0].ok;

  const subject = (await q("select id from public.subject_areas where code='quran' limit 1")).rows[0].id;

  // A lesson with verified first-party video, in a version tagged to the subject
  // a subscription plan covers.
  async function taughtLesson({ preview = false, assetStatus = 'available', hotlink = false } = {}) {
    const course = await newCourse(teacher, { status: 'active' });
    const version = await newVersion(course, teacher);
    await q('insert into public.course_version_subjects (course_version_id, subject_area_id) values ($1,$2)',
      [version, subject]);
    const section = await newSection(version);
    const lesson = await newLesson(section, { is_preview: preview });
    if (hotlink) {
      await q(`insert into public.lesson_resources (lesson_id, resource_type, external_url, display_name, position)
               values ($1,'video','https://example.com/lesson.mp4','Hotlinked lesson',1)`, [lesson]);
    } else {
      const asset = await newAsset(teacher, { status: assetStatus });
      await q(`insert into public.lesson_resources (lesson_id, resource_type, media_asset_id, display_name, position)
               values ($1,'video',$2,'Recorded lesson',1)`, [lesson, asset]);
    }
    return { course, version, lesson };
  }

  // Access grant, the way a course purchase would leave one.
  async function grantAccess(learner, versionId) {
    await q(`insert into public.entitlement_grants (learner_profile_id, scope_type, course_version_id, source_type, status)
             values ($1,'course_version',$2,'purchase','active')`, [learner, versionId]);
  }

  // The feature grant a Plus plan carries, bounded like a paid period.
  async function grantFeature(learner, { status = 'active', until = null } = {}) {
    await q(`insert into public.entitlement_grants
               (learner_profile_id, scope_type, feature_code, source_type, status, effective_until)
             values ($1,'feature','offline_downloads','subscription',$2,$3)`, [learner, status, until]);
  }

  // newProfile() makes the user_profiles row; a learner profile is a separate
  // thing and is what entitlements are keyed on.
  async function learnerFor(userId, name = 'Learner') {
    return (await q(
      `insert into public.learner_profiles (display_name, learner_type, age_band, linked_user_id)
       values ($1,'adult','18+',$2) returning id`, [name, userId])).rows[0].id;
  }

  // -------------------------------------------------------------------------
  // The decision itself
  // -------------------------------------------------------------------------

  const plusLearner = await learnerFor(plus, 'Plus Payer');
  const basicLearner = await learnerFor(basic, 'Basic Payer');
  const strangerLearner = await learnerFor(stranger, 'Stranger');

  const watched = await taughtLesson();
  await grantAccess(plusLearner, watched.version);
  await grantFeature(plusLearner);
  await grantAccess(basicLearner, watched.version);
  await grantAccess(strangerLearner, watched.version);

  await test('a learner on a plan that carries the feature may save a verified lesson', async () => {
    assert(await may(plus, watched.lesson) === true, 'a Plus subscriber was refused a download');
  });

  await test('enrolment alone never carries it: same lesson, same access, no feature grant', async () => {
    // The Basic payer can open exactly the same lesson. What they cannot do is
    // keep it. That difference is the whole decision, so it is asserted from
    // both sides rather than inferred from one.
    assert((await asActor(basic, 'select public.can_access_lesson_now($1) as ok', [watched.lesson])).rows[0].ok === true,
      'the Basic payer lost access to the lesson itself');
    assert(await may(basic, watched.lesson) === false, 'a plan without the feature was allowed to save');
  });

  await test('a learner who bought the course outright but holds no subscription may not save', async () => {
    assert(await may(stranger, watched.lesson) === false, 'a course purchase alone carried the download feature');
  });

  await test('an unenrolled stranger and an anonymous visitor are both refused', async () => {
    const outsider = await newUser('offline-outsider@example.com');
    await newProfile(outsider, 'Outsider');
    assert(await may(outsider, watched.lesson) === false, 'an unenrolled user was allowed to save');
    assert(await asAnon(async () =>
      (await q('select public.may_download_lesson($1) as ok', [watched.lesson])).rows[0].ok) === false,
      'an anonymous visitor was allowed to save');
  });

  // -------------------------------------------------------------------------
  // What may be saved
  // -------------------------------------------------------------------------

  await test('a hotlinked lesson cannot be saved even by a plan that carries the feature', async () => {
    const linked = await taughtLesson({ hotlink: true });
    await grantAccess(plusLearner, linked.version);
    assert(await may(plus, linked.lesson) === false,
      'an external_url was offered as a download; it belongs to somebody else\'s server');
  });

  await test('media that is still pending is never handed out', async () => {
    const pending = await taughtLesson({ assetStatus: 'pending' });
    await grantAccess(plusLearner, pending.version);
    assert(await may(plus, pending.lesson) === false, 'unverified media was downloadable');
  });

  await test('quarantined media stays quarantined', async () => {
    const held = await taughtLesson({ assetStatus: 'quarantined' });
    await grantAccess(plusLearner, held.version);
    assert(await may(plus, held.lesson) === false, 'quarantined media was downloadable');
  });

  await test('a free preview may be watched but not kept', async () => {
    // Previews bypass payment only while learning.previews is on, so the flag
    // has to be on for "may watch it" to be true at all. What this pins is that
    // the download feature is a separate question from the preview bypass: a
    // free lesson is free to watch and not free to keep.
    const preview = await taughtLesson({ preview: true });
    await q("update public.platform_settings set value_text='true' where key='learning.previews'");
    try {
      assert((await asActor(stranger, 'select public.can_access_lesson($1,$2) as ok',
        [strangerLearner, preview.lesson])).rows[0].ok === true, 'the preview was not open to watch');
      assert(await may(stranger, preview.lesson) === false, 'a preview could be saved without the feature');
      assert(await may(plus, preview.lesson) === false,
        'a preview was savable by somebody with the feature but no access to this course');
      await grantAccess(plusLearner, preview.version);
      await grantFeature(plusLearner);
      assert(await may(plus, preview.lesson) === true,
        'a learner with access and the feature was refused a preview they may already watch');
    } finally {
      await q("update public.platform_settings set value_text='false' where key='learning.previews'");
    }
  });

  // -------------------------------------------------------------------------
  // The feature lapses with the plan
  // -------------------------------------------------------------------------

  await test('an expired grant stops saving without anything being revoked by hand', async () => {
    const lapsed = await newUser('offline-lapsed@example.com');
    await newProfile(lapsed, 'Lapsed');
    const learner = await learnerFor(lapsed, 'Lapsed');
    await grantAccess(learner, watched.version);
    await grantFeature(learner, { status: 'expired' });
    assert(await may(lapsed, watched.lesson) === false, 'an expired feature grant still allowed saving');
  });

  await test('a revoked grant stops saving', async () => {
    const revoked = await newUser('offline-revoked@example.com');
    await newProfile(revoked, 'Revoked');
    const learner = await learnerFor(revoked, 'Revoked');
    await grantAccess(learner, watched.version);
    await q(`insert into public.entitlement_grants
               (learner_profile_id, scope_type, feature_code, source_type, status, revoked_at, revoked_by, revocation_reason)
             values ($1,'feature','offline_downloads','subscription','revoked',now(),$2,'refund issued')`,
      [learner, admin]);
    assert(await may(revoked, watched.lesson) === false, 'a revoked feature grant still allowed saving');
  });

  await test('the schema refuses an active grant whose paid period has already passed', async () => {
    // eg_active_is_live is what makes "status is enough" honest in the
    // predicate, so the guarantee behind that shortcut is pinned too.
    const past = new Date(Date.now() - 86_400_000).toISOString();
    await rejects(() => grantFeature(plusLearner, { until: past }),
      'an active grant was allowed to outlive its own window');
  });

  // -------------------------------------------------------------------------
  // A guardian saves for a child
  // -------------------------------------------------------------------------

  await test('a guardian may save for a child in the family, and a stranger may not', async () => {
    const guardian = await newUser('offline-guardian@example.com');
    await newProfile(guardian, 'Guardian');
    const family = (await asActor(guardian, 'select public.create_family($1) id', ['Offline family'])).rows[0].id;
    const child = (await asActor(guardian, 'select public.add_child_to_family($1,$2,$3) id',
      [family, 'Child', '8-10'])).rows[0].id;

    await grantAccess(child, watched.version);
    await grantFeature(child);

    assert(await may(guardian, watched.lesson) === true,
      'a guardian could not save a lesson for their own child');
    assert(await may(stranger, watched.lesson) === false,
      'the family grant leaked to an unrelated session');
  });

  // -------------------------------------------------------------------------
  // The vocabulary is closed
  // -------------------------------------------------------------------------

  await test('a plan cannot be sold with a misspelt feature code', async () => {
    const plan = (await asActor(admin, 'select public.create_plan($1,$2,$3) id',
      ['typo-plan', 'typo-plan', 'Typo plan'])).rows[0].id;
    const version = (await asActor(admin, 'select public.create_plan_version($1,$2,$3,$4,$5) id',
      [plan, 0, 1, 'month', 'Terms'])).rows[0].id;
    // The typo that would otherwise take money and grant nothing, silently.
    await rejects(() => asActor(admin,
      "select public.add_plan_entitlement($1,'feature',null,null,'offline_download')", [version]),
      'an unknown feature code was sellable');
    await asActor(admin,
      "select public.add_plan_entitlement($1,'feature',null,null,'offline_downloads')", [version]);
    const rows = (await q("select feature_code from public.plan_entitlements where plan_version_id=$1 and scope_type='feature'",
      [version])).rows;
    assert(rows.length === 1 && rows[0].feature_code === 'offline_downloads',
      'the permitted code was not accepted after the typo was refused');
  });

  await test('the predicate reads the same code the vocabulary permits', async () => {
    // Two places name 'offline_downloads': the constraint that lets a plan
    // carry it, and the predicate that honours it. If they ever drift, a plan
    // sells a feature nobody can use. This is the parity check.
    const def = (await q(`select pg_get_constraintdef(oid) as d from pg_constraint
                          where conname='pe_feature_vocabulary'`)).rows[0].d;
    assert(def.includes('offline_downloads'), `the vocabulary no longer names the code: ${def}`);
    const body = (await q(`select pg_get_functiondef(oid) as d from pg_proc
                           where proname='may_download_lesson'`)).rows[0].d;
    assert(body.includes("'offline_downloads'"), 'the predicate no longer reads the vocabulary code');

    // plan_feature_codes() is what the admin form offers; the constraint is what
    // the schema enforces. Test the behaviour rather than parsing the constraint
    // text: every advertised code must actually be sellable, or the form offers
    // a plan that will be refused on save.
    const codes = (await q('select unnest(public.plan_feature_codes()) as code order by 1')).rows.map((r) => r.code);
    assert(codes.length > 0, 'the vocabulary advertises no codes at all');
    const plan = (await asActor(admin, 'select public.create_plan($1,$2,$3) id',
      ['parity-plan', 'parity-plan', 'Parity plan'])).rows[0].id;
    const version = (await asActor(admin, 'select public.create_plan_version($1,$2,$3,$4,$5) id',
      [plan, 0, 1, 'month', 'Terms'])).rows[0].id;
    for (const code of codes) {
      await q(`insert into public.plan_entitlements (plan_version_id, scope_type, feature_code)
               values ($1,'feature',$2)`, [version, code]);
    }
    const sold = (await q("select feature_code from public.plan_entitlements where plan_version_id=$1 and scope_type='feature' order by 1",
      [version])).rows.map((r) => r.feature_code);
    assert(JSON.stringify(sold) === JSON.stringify(codes),
      `the advertised vocabulary is not what the schema accepts: advertised ${codes}, accepted ${sold}`);
  });

  await test('may_download_lesson is not callable by the public or an anonymous visitor', async () => {
    for (const role of ['public', 'anon']) {
      const allowed = (await q(
        `select has_function_privilege($1, 'public.may_download_lesson(uuid)', 'EXECUTE') as ok`, [role])).rows[0].ok;
      assert(allowed === false, `${role} can execute may_download_lesson`);
    }
    const auth = (await q(
      `select has_function_privilege('authenticated','public.may_download_lesson(uuid)','EXECUTE') as ok`)).rows[0].ok;
    assert(auth === true, 'authenticated lost execute on may_download_lesson');
  });

  // -------------------------------------------------------------------------
  // End to end through the real plan, order and payment path
  // -------------------------------------------------------------------------

  await test('a paid Plus subscription carries the feature all the way to the predicate', async () => {
    const payer = await newUser('offline-e2e@example.com');
    await newProfile(payer, 'E2E Payer');
    const learner = await learnerFor(payer, 'E2E Payer');

    await asActor(payer,
      `insert into public.billing_accounts (display_name,billing_country,billing_currency,status,created_by)
       values ('E2E household','UG','UGX','active',$1)`, [payer]);
    const account = (await q('select id from public.billing_accounts where created_by=$1', [payer])).rows[0].id;

    const plan = (await asActor(admin, 'select public.create_plan($1,$2,$3) id',
      ['plus-e2e', 'Plus', 'Carries offline saving'])).rows[0].id;
    const version = (await asActor(admin, 'select public.create_plan_version($1,$2,$3,$4,$5) id',
      [plan, 0, 1, 'month', 'Plus terms'])).rows[0].id;
    await asActor(admin, "select public.add_plan_entitlement($1,'catalogue',$2,null,null)", [version, subject]);
    await asActor(admin, "select public.add_plan_entitlement($1,'feature',null,null,'offline_downloads')", [version]);
    const price = (await asActor(admin, "select public.set_plan_price($1,25000,'UGX',null) id", [version])).rows[0].id;
    await asActor(admin, 'select public.activate_plan_version($1)', [version]);

    const lesson = await taughtLesson();
    assert(await may(payer, lesson.lesson) === false, 'saving worked before anything was paid for');

    const order = (await asActor(payer, 'select * from public.create_plan_order($1,$2,$3,$4)',
      [account, version, price, learner])).rows[0];
    await q("select public.record_payment_success($1,$2,'manual','OFFLINE-E2E-1',null,'Receipt OFFLINE-E2E-1')",
      [order.order_id, admin]);

    // The catalogue entitlement became a subject grant, which is what opens the
    // lesson; the feature grant is what allows it to be kept.
    const grants = (await q(`select scope_type, feature_code, subject_area_id, status
                             from public.entitlement_grants
                             where source_type='subscription' and source_id=$1`, [order.subscription_id])).rows;
    assert(grants.some((g) => g.scope_type === 'subject' && g.subject_area_id === subject),
      'payment did not propagate the catalogue entitlement');
    assert(grants.some((g) => g.scope_type === 'feature' && g.feature_code === 'offline_downloads' && g.status === 'active'),
      'payment did not propagate the offline_downloads feature');
    assert(await may(payer, lesson.lesson) === true,
      'a paid Plus subscription could not save the lesson it just unlocked');
  });

  await test('the feature still ships off: the predicate exists, the flag does not move', async () => {
    const flag = (await q("select value_text from public.platform_settings where key='learning.offline'")).rows[0].value_text;
    assert(flag === 'false', `learning.offline was ${flag}; deciding entitlement is not shipping downloads`);
  });
}
