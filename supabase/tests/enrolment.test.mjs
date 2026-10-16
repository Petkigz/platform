// Enrolment gate.
//
// This is the suite for the hole that wiring the enrol button exposed:
// `course_enrolments_insert` checked only that you may act for the learner,
// never whether the course was for sale. Any signed-in user could POST an
// enrolment against a paid course with source = 'free' and walk past the
// entire payment stack — no product, no price, no order, no callback.
//
// The interesting assertions here are the negative ones. An RLS-blocked INSERT
// raises, unlike a blocked UPDATE, so `rejects` is the right tool — but a
// count assertion follows each one, because "it raised" and "no row appeared"
// are different claims and only the second one is what we care about.

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    asUser, committed,
    newUser, newProfile, bootstrapAdmin,
    newInstructor, newReviewer, satisfyReview,
    newCourse, newVersion, newSection, newLesson,
  } = ctx;

  const admin    = await bootstrapAdmin('enr-admin@example.com');
  const teacher  = await newInstructor('enr-teacher@example.com', admin);
  const reviewer = await newReviewer('enr-reviewer@example.com', admin);

  const count = async (sql, params) =>
    (await q(`select count(*)::int n from (${sql}) t`, params)).rows[0].n;

  const setVersion = (versionId, status, actor) =>
    q('select id from public.set_course_version_status($1, $2, $3, $4)',
      [versionId, status, actor, 'enrolment']);

  async function adult(email, name) {
    const userId = await newUser(email);
    await newProfile(userId, name ?? email);
    const learnerId = (await q(
      `insert into public.learner_profiles (display_name, learner_type, age_band, linked_user_id)
       values ($1, 'adult', '18+', $2) returning id`, [name ?? email, userId])).rows[0].id;
    return { userId, learnerId };
  }

  async function publishedCourse() {
    const course  = await newCourse(teacher, { status: 'active' });
    const version = await newVersion(course, teacher);
    const section = await newSection(version);
    await newLesson(section);
    await setVersion(version, 'submitted', teacher);
    await setVersion(version, 'approved', reviewer);
    await satisfyReview(version, reviewer, admin);
    await setVersion(version, 'published', admin);
    return { course, version };
  }

  async function makePaid({ course, version }, amountMinor = 30000) {
    const product = (await q(
      `insert into public.products (product_type, name, status, created_by)
       values ('course', 'Paid course', 'active', $1) returning id`, [teacher])).rows[0].id;
    await q(`insert into public.product_course_versions (product_id, course_id, course_version_id)
             values ($1, $2, $3)`, [product, course, version]);
    await q(`insert into public.prices
               (product_id, amount_minor, currency_code, billing_interval, status)
             values ($1, $2, 'UGX', 'one_time', 'active')`, [product, amountMinor]);
    return product;
  }

  const enrol = (learnerId, courseId, versionId, source = 'free') =>
    q(`insert into public.course_enrolments
         (learner_profile_id, course_id, course_version_id, source, status)
       values ($1, $2, $3, $4, 'active') returning id`,
      [learnerId, courseId, versionId, source]);

  // -------------------------------------------------------------------
  // The hole
  // -------------------------------------------------------------------
  await test('a free course can be enrolled in by its learner', async () => {
    const pc = await publishedCourse();
    const me = await adult('enr-free@example.com', 'Free Learner');

    await asUser(me.userId, async () => {
      const r = await enrol(me.learnerId, pc.course, pc.version);
      assert(r.rows.length === 1, 'a free enrolment was refused');
      const src = (await q(
        'select source from public.course_enrolments where id = $1', [r.rows[0].id])).rows[0].source;
      assert(src === 'free', `expected source 'free', got '${src}'`);
    });
  });

  await test('a paid course cannot be taken for free', async () => {
    const pc = await publishedCourse();
    await makePaid(pc);
    const thief = await adult('enr-thief@example.com', 'Thief');

    await asUser(thief.userId, async () => {
      await rejects(() => enrol(thief.learnerId, pc.course, pc.version, 'free'),
        'a learner enrolled in a paid course without paying');
    });

    // Counted outside asUser: a rejected statement aborts the transaction, so
    // anything queried after it inside the same block reports the abort rather
    // than the row count.
    const n = await count(
      `select 1 from public.course_enrolments
        where learner_profile_id = $1 and course_id = $2`, [thief.learnerId, pc.course]);
    assert(n === 0, `the refused enrolment left ${n} row(s) behind`);
  });

  await test('claiming source = purchase does not help either', async () => {
    const pc = await publishedCourse();
    await makePaid(pc);
    const liar = await adult('enr-liar@example.com', 'Liar');

    await asUser(liar.userId, async () => {
      await rejects(() => enrol(liar.learnerId, pc.course, pc.version, 'purchase'),
        'a learner asserted a purchase that never happened');
    });

    const n = await count(
      `select 1 from public.course_enrolments where learner_profile_id = $1`, [liar.learnerId]);
    assert(n === 0, 'the enrolment was written anyway');
  });

  await test('a sold course cannot be recorded as free even by staff', async () => {
    const pc = await publishedCourse();
    await makePaid(pc);
    const lucky = await adult('enr-lucky@example.com', 'Lucky');

    // An entitlement makes the enrolment legitimate; recording it as 'free'
    // would corrupt the ledger even though the access is real.
    await committed(async () => {
      await q(`insert into public.entitlement_grants
                 (learner_profile_id, scope_type, course_version_id, source_type)
               values ($1, 'course_version', $2, 'purchase')`, [lucky.learnerId, pc.version]);
    });

    await asUser(admin, async () => {
      await rejects(() => enrol(lucky.learnerId, pc.course, pc.version, 'free'),
        'a paid enrolment was recorded with source = free');
    });
  });

  // -------------------------------------------------------------------
  // The legitimate path
  // -------------------------------------------------------------------
  await test('an entitlement opens the enrolment', async () => {
    const pc = await publishedCourse();
    await makePaid(pc);
    const buyer = await adult('enr-buyer@example.com', 'Buyer');

    // Before: closed.
    await asUser(buyer.userId, async () => {
      await rejects(() => enrol(buyer.learnerId, pc.course, pc.version, 'purchase'),
        'enrolment succeeded before any entitlement existed');
    });

    await committed(async () => {
      await q(`insert into public.entitlement_grants
                 (learner_profile_id, scope_type, course_version_id, source_type)
               values ($1, 'course_version', $2, 'purchase')`, [buyer.learnerId, pc.version]);
    });

    // After: open, and it must be recorded as a purchase.
    await asUser(buyer.userId, async () => {
      const r = await enrol(buyer.learnerId, pc.course, pc.version, 'purchase');
      assert(r.rows.length === 1, 'an entitled learner could not enrol');
    });
  });

  await test('revoking the entitlement does not remove an existing enrolment', async () => {
    const pc = await publishedCourse();
    await makePaid(pc);
    const buyer = await adult('enr-revoke@example.com', 'Revoked Buyer');

    await committed(async () => {
      await q(`insert into public.entitlement_grants
                 (learner_profile_id, scope_type, course_version_id, source_type)
               values ($1, 'course_version', $2, 'purchase')`, [buyer.learnerId, pc.version]);
      // Committed, not asUser: asUser rolls back, and the assertion below needs
      // this enrolment to still exist.
      await enrol(buyer.learnerId, pc.course, pc.version, 'purchase');
    });

    const grant = (await q(
      `select id from public.entitlement_grants where learner_profile_id = $1`,
      [buyer.learnerId])).rows[0].id;
    // eg_revocation_agrees requires both the timestamp and a reason.
    await q(`update public.entitlement_grants
                set status = 'revoked', revoked_at = now(), revoked_by = $1,
                    revocation_reason = 'test'
              where id = $2`, [admin, grant]);

    // D7/D6: history is not rewritten. Access stops at the entitlement check,
    // not by deleting the enrolment.
    const still = await count(
      `select 1 from public.course_enrolments
        where learner_profile_id = $1 and deleted_at is null`, [buyer.learnerId]);
    assert(still === 1, 'revoking an entitlement deleted the enrolment row');

    const access = (await q(
      'select public.can_access_course_version($1, $2) v', [buyer.learnerId, pc.version])).rows[0].v;
    assert(access === false, 'a revoked entitlement still grants access');
  });

  // -------------------------------------------------------------------
  // D6 and suspension
  // -------------------------------------------------------------------
  await test('a retired version stops new enrolments but keeps existing ones', async () => {
    const pc = await publishedCourse();
    const early = await adult('enr-early@example.com', 'Early');
    // Committed so it survives the retirement below; asUser would roll it back.
    await committed(async () => {
      await enrol(early.learnerId, pc.course, pc.version);
    });

    await setVersion(pc.version, 'retired', admin);

    const late = await adult('enr-late@example.com', 'Late');
    await asUser(late.userId, async () => {
      await rejects(() => enrol(late.learnerId, pc.course, pc.version),
        'a retired version accepted a new enrolment (D6)');
    });

    const kept = await count(
      `select 1 from public.course_enrolments where learner_profile_id = $1`,
      [early.learnerId]);
    assert(kept === 1, 'retiring a version removed an existing enrolment (D6)');
  });

  await test('a suspended course cannot be enrolled in', async () => {
    const pc = await publishedCourse();
    await q(`update public.courses
                set suspended_at = now(), suspended_reason = 'enrolment test', suspended_by = $1
              where id = $2`, [admin, pc.course]);

    const blocked = await adult('enr-blocked@example.com', 'Blocked');
    await asUser(blocked.userId, async () => {
      await rejects(() => enrol(blocked.learnerId, pc.course, pc.version),
        'a suspended course accepted an enrolment');
    });
  });

  // -------------------------------------------------------------------
  // Acting for someone else
  // -------------------------------------------------------------------
  await test('you cannot enrol a stranger', async () => {
    const pc = await publishedCourse();
    const me      = await adult('enr-me@example.com', 'Me');
    const someone = await adult('enr-someone@example.com', 'Someone Else');

    await asUser(me.userId, async () => {
      await rejects(() => enrol(someone.learnerId, pc.course, pc.version),
        'one learner enrolled another learner without authority');
    });
  });

  // -------------------------------------------------------------------
  // The gate is a function, so it can be asked directly
  // -------------------------------------------------------------------
  await test('can_enrol_in_version agrees with the policy', async () => {
    const pc = await publishedCourse();
    const me = await adult('enr-direct@example.com', 'Direct');

    const free = (await q(
      'select public.can_enrol_in_version($1, $2) v', [me.learnerId, pc.version])).rows[0].v;
    assert(free === true, 'a free published version should be enrolable');

    await makePaid(pc);
    const paid = (await q(
      'select public.can_enrol_in_version($1, $2) v', [me.learnerId, pc.version])).rows[0].v;
    assert(paid === false, 'a paid version should not be enrolable without an entitlement');

    const sold = (await q(
      'select public.is_sold_version($1) v', [pc.version])).rows[0].v;
    assert(sold === true, 'is_sold_version did not see the product attachment');
  });
}
