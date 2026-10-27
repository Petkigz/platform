// Sponsoring a seat: a learner asks, staff decide, a donor covers it.
//
// The rules that make this safe are mostly about what each side is *not* told.
// A donor chooses from a pool of approved seats and never learns a name; the
// learner is told their seat was covered and never learns who paid. These tests
// hold that, and hold the money side — a pledge is not a payment, and only
// staff recording a reference turns one into a seat.

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    bootstrapAdmin, newUser, newProfile, newInstructor, newReviewer, grantRole,
    newCourse, newVersion, newSection, newLesson, satisfyReview,
  } = ctx;

  const admin = await bootstrapAdmin('sponsor-admin@example.com');
  const teacher = await newInstructor('sponsor-teacher@example.com', admin);
  const reviewer = await newReviewer('sponsor-reviewer@example.com', admin);

  const finance = await newUser('sponsor-finance@example.com');
  await newProfile(finance, 'Finance Person');
  await grantRole(finance, 'finance_admin', admin);

  const support = await newUser('sponsor-support@example.com');
  await newProfile(support, 'Support Person');
  await grantRole(support, 'support_agent', admin);

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

  const scalar = async (sql, params = []) => (await q(sql, params)).rows[0];
  const eq = (actual, expected, what) =>
    assert(actual === expected,
      `${what}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);

  const flag = (key, on) =>
    asActor(admin, 'update public.platform_settings set value_text = $2 where key = $1',
      [key, on ? 'true' : 'false']);

  await flag('commerce.sponsorship', true);
  try {
    let seq = 0;
    async function person(name) {
      seq += 1;
      const userId = await newUser(`spn-${seq}@example.com`);
      await newProfile(userId, name);
      const learnerId = (await scalar(
        `insert into public.learner_profiles (display_name, learner_type, age_band, linked_user_id)
         values ($1,'adult','18+',$2) returning id`, [name, userId])).id;
      return { userId, learnerId, name };
    }

    async function sellable(amount = 30000, market = 'UG') {
      seq += 1;
      const course = await newCourse(teacher, { status: 'active', title: `Sponsored course ${seq}` });
      const version = await newVersion(course, teacher);
      const section = await newSection(version);
      await newLesson(section);
      const productId = (await scalar(
        `insert into public.products (product_type, name, status, created_by)
         values ('course',$1,'active',$2) returning id`, [`Sponsored product ${seq}`, teacher])).id;
      await q(`insert into public.product_course_versions (product_id, course_id, course_version_id)
               values ($1,$2,$3)`, [productId, course, version]);
      await q(`insert into public.prices
                 (product_id, amount_minor, currency_code, billing_interval, status, market, effective_from)
               values ($1,$2,'UGX','one_time','active',$3,now())`, [productId, amount, market]);
      for (const [status, actor] of [['submitted', teacher], ['approved', reviewer],
                                     ['published', admin]]) {
        await q('select id from public.set_course_version_status($1,$2,$3,$4)',
          [version, status, actor, 'sponsorship test']);
        if (status === 'approved') await satisfyReview(version, reviewer, admin);
      }
      return { course, version, productId };
    }

    const apply = (actor, learnerId, courseId, reason) =>
      asActor(actor, 'select public.apply_for_sponsorship($1,$2,$3) as r',
        [learnerId, courseId, reason]).then((res) => res.rows[0].r);

    const decide = (actor, applicationId, approve, reason) =>
      asActor(actor, 'select public.decide_sponsorship_application($1,$2,$3) as r',
        [applicationId, approve, reason]).then((res) => res.rows[0].r);

    const pool = async (actor, country = 'UG') =>
      (await asActor(actor, 'select public.sponsorship_pool($1) as r', [country])).rows[0].r;

    const pledge = (actor, seatCode, country = 'UG', note = null) =>
      asActor(actor, 'select public.pledge_sponsorship($1,$2,$3) as r',
        [seatCode, country, note]).then((res) => res.rows[0].r);

    const recordPayment = (actor, sponsorshipId, ref) =>
      asActor(actor, 'select public.record_sponsorship_payment($1,$2,null) as r',
        [sponsorshipId, ref]).then((res) => res.rows[0].r);

    /** A learner with an approved seat, and the code a donor uses. */
    async function approvedSeat(amount = 30000) {
      const learner = await person(`Learner ${seq + 1}`);
      const offer = await sellable(amount);
      const made = await apply(learner.userId, learner.learnerId, offer.course,
        'I cannot afford this course at the moment.');
      const decision = await decide(admin, made.applicationId, true, 'Checked with the family.');
      return { learner, offer, applicationId: made.applicationId, seatCode: decision.seatCode };
    }

    // ---------------------------------------------------------------------
    // Asking
    // ---------------------------------------------------------------------
    await test('a learner asks for a sponsored seat', async () => {
      const learner = await person('Asker One');
      const offer = await sellable();
      const made = await apply(learner.userId, learner.learnerId, offer.course, 'My income changed.');
      eq(made.status, 'submitted', 'the application');

      const row = (await scalar('select * from public.sponsorship_applications where id = $1',
        [made.applicationId]));
      eq(row.applied_by, learner.userId, 'who asked');
      eq(row.seat_code, null, 'a seat code before anybody decided');
    });

    await test('asking needs a reason, a course on sale and a learner who is yours', async () => {
      const learner = await person('Asker Two');
      const stranger = await person('Asker Stranger');
      const offer = await sellable();

      await rejects(
        () => apply(learner.userId, learner.learnerId, offer.course, '   '),
        /reason_required/);

      await rejects(
        () => apply(stranger.userId, learner.learnerId, offer.course, 'Not my learner'),
        /learner_not_yours/);

      await apply(learner.userId, learner.learnerId, offer.course, 'The first ask.');
      await rejects(
        () => apply(learner.userId, learner.learnerId, offer.course, 'same thing twice'),
        /already_asked/);
    });

    await test('asking for a course you already hold is refused', async () => {
      const learner = await person('Asker Three');
      const offer = await sellable();
      // The learner already holds it, which is what a purchase leaves behind.
      await q(`insert into public.entitlement_grants
                 (learner_profile_id, scope_type, course_version_id, source_type, status)
               values ($1,'course_version',$2,'purchase','active')`,
        [learner.learnerId, offer.version]);

      await rejects(
        () => apply(learner.userId, learner.learnerId, offer.course, 'I have it already'),
        /already_has_access/);
    });

    await test('the feature ships off, and asking says so rather than failing', async () => {
      const learner = await person('Asker Off');
      const offer = await sellable();
      await flag('commerce.sponsorship', false);
      try {
        await rejects(
          () => apply(learner.userId, learner.learnerId, offer.course, 'while it is off'),
          /disabled/);
        const seen = await pool(learner.userId);
        eq(seen.enabled, false, 'the pool while off');
        eq(seen.seats.length, 0, 'seats while off');
      } finally {
        await flag('commerce.sponsorship', true);
      }
    });

    // ---------------------------------------------------------------------
    // Deciding
    // ---------------------------------------------------------------------
    await test('only the owner or finance decides, and either way needs a reason', async () => {
      const learner = await person('Asker Four');
      const offer = await sellable();
      const made = await apply(learner.userId, learner.learnerId, offer.course, 'Please consider.');

      await rejects(() => decide(learner.userId, made.applicationId, true, 'yes'), /not_allowed/);
      await rejects(() => decide(support.userId, made.applicationId, true, 'yes'), /not_allowed/);
      await rejects(() => decide(admin, made.applicationId, true, '  '), /reason_required/);

      const yes = await decide(finance, made.applicationId, true, 'Verified with the madrasah.');
      eq(yes.status, 'approved', 'the decision');
      assert(/^SPN-[A-Z0-9]{6}$/.test(yes.seatCode), `the seat code was ${yes.seatCode}`);

      await rejects(() => decide(admin, made.applicationId, false, 'too late'), /already_decided/);
    });

    await test('a declined request keeps its reason for the applicant to read', async () => {
      const learner = await person('Asker Five');
      const offer = await sellable();
      const made = await apply(learner.userId, learner.learnerId, offer.course, 'Please.');

      await decide(admin, made.applicationId, false, 'This course is free for your region already.');

      const board = (await asActor(learner.userId,
        'select public.my_sponsorship_applications() as r')).rows[0].r;
      const row = board.applications.find((a) => a.id === made.applicationId);
      eq(row.status, 'declined', 'the status');
      eq(row.decisionReason, 'This course is free for your region already.', 'the reason');
      eq(row.seatCode, null, 'a seat code on a declined request');
    });

    // ---------------------------------------------------------------------
    // The pool
    // ---------------------------------------------------------------------
    await test('the pool shows approved seats and nothing that identifies anybody', async () => {
      await approvedSeat(40000);
      const donor = await person('Donor One');

      const seen = await pool(donor.userId);
      eq(seen.enabled, true, 'the pool');
      assert(seen.seats.length > 0, 'the pool is empty with an approved seat in it');

      const seat = seen.seats[0];
      assert(/^SPN-/.test(seat.seatCode), 'the seat has no code');
      assert(seat.courseTitle, 'the seat names no course');
      eq(seat.price.resolved, true, 'the price was not resolved for the reader');

      // The seat carries exactly these fields, and the whole payload — as text —
      // carries no name, no address, no learner id and no word of anybody's
      // reason. A field nobody looked at is exactly how a pool leaks.
      eq(JSON.stringify(Object.keys(seat).sort()),
        JSON.stringify(['approvedAt', 'audience', 'courseSlug', 'courseTitle',
                        'difficulty', 'price', 'seatCode']),
        'the fields on a seat');

      const blob = JSON.stringify(seen).toLowerCase();
      for (const forbidden of ['learnername', 'learner_profile_id', 'learnerprofileid',
                              'email', 'appliedby', 'cannot afford']) {
        assert(!blob.includes(forbidden),
          `the pool payload carries "${forbidden}": ${blob.slice(0, 400)}`);
      }
    });

    await test('the pool is for people who are signed in', async () => {
      // A definer function with no session: no actor, so no pool.
      const anon = (await q("select public.sponsorship_pool('UG') as r")).rows[0].r;
      eq(anon.enabled, false, 'the pool for a session with no user');
      const anonMay = (await q(
        `select has_function_privilege('anon'::name, 'public.sponsorship_pool(text)', 'execute') as may`
      )).rows[0].may;
      eq(anonMay, false, 'an anonymous caller may read the pool');
    });

    // ---------------------------------------------------------------------
    // Pledging
    // ---------------------------------------------------------------------
    await test('a sponsor takes a seat at the price their own market carries', async () => {
      const seat = await approvedSeat(40000);
      const donor = await person('Donor Two');

      const taken = await pledge(donor.userId, seat.seatCode, 'UG');
      eq(taken.status, 'pledged', 'the pledge');
      eq(Number(taken.amountMinor), 40000, 'the amount');
      eq(taken.currencyCode, 'UGX', 'the currency');

      const row = (await scalar('select * from public.sponsorships where id = $1',
        [taken.sponsorshipId]));
      eq(row.recorded_at, null, 'a pledge recorded as paid');
      eq(row.reference, null, 'a pledge with a receipt');
    });

    await test('a claimed seat leaves the pool and cannot be claimed twice', async () => {
      const seat = await approvedSeat();
      const first = await person('Donor Three');
      const second = await person('Donor Four');

      await pledge(first.userId, seat.seatCode, 'UG');

      await rejects(() => pledge(second.userId, seat.seatCode, 'UG'), /seat_taken/);

      const seen = await pool(second.userId);
      assert(!seen.seats.some((s) => s.seatCode === seat.seatCode),
        'a claimed seat is still on the list');
    });

    await test('you cannot sponsor the seat you asked for', async () => {
      const seat = await approvedSeat();
      await rejects(() => pledge(seat.learner.userId, seat.seatCode, 'UG'), /own_seat/);
    });

    await test('a seat with no price where the sponsor is cannot be pledged', async () => {
      const seat = await approvedSeat(40000, 'UG');
      const donor = await person('Donor Five');
      // The course is priced for UG only, so a Kenyan sponsor has no price and
      // is told so rather than charged the Ugandan one.
      await rejects(() => pledge(donor.userId, seat.seatCode, 'KE'), /no_price_for_you/);
    });

    await test('a seat code that does not exist is refused by name', async () => {
      const donor = await person('Donor Six');
      await rejects(() => pledge(donor.userId, 'SPN-NOSUCH', 'UG'), /seat_not_found/);
    });

    // ---------------------------------------------------------------------
    // Withdrawing
    // ---------------------------------------------------------------------
    await test('a sponsor can change their mind, and the seat returns to the pool', async () => {
      const seat = await approvedSeat();
      const donor = await person('Donor Seven');
      const other = await person('Donor Eight');
      const taken = await pledge(donor.userId, seat.seatCode, 'UG');

      await rejects(
        () => asActor(other.userId, 'select public.withdraw_sponsorship($1,null)', [taken.sponsorshipId]),
        /not_allowed/);

      const out = (await asActor(donor.userId, 'select public.withdraw_sponsorship($1,$2) as r',
        [taken.sponsorshipId, 'Changed my mind'])).rows[0].r;
      eq(out.status, 'withdrawn', 'the withdrawal');

      const seen = await pool(other.userId);
      assert(seen.seats.some((s) => s.seatCode === seat.seatCode),
        'the seat did not come back to the pool');
    });

    // ---------------------------------------------------------------------
    // The money, recorded
    // ---------------------------------------------------------------------
    await test('staff record the money, and that is what grants the seat', async () => {
      const seat = await approvedSeat(40000);
      const donor = await person('Donor Nine');
      const taken = await pledge(donor.userId, seat.seatCode, 'UG');

      await rejects(
        () => recordPayment(donor.userId, taken.sponsorshipId, 'BANK-1'), /not_allowed/);
      await rejects(
        () => asActor(admin, 'select public.record_sponsorship_payment($1,$2,null)', [taken.sponsorshipId, '  ']),
        /reference_required/);

      const paid = await recordPayment(finance, taken.sponsorshipId, 'BANK-2026-001');
      eq(paid.status, 'paid', 'the payment');
      assert(paid.entitlementGrantId, 'no entitlement was granted');

      const grant = (await scalar('select * from public.entitlement_grants where id = $1',
        [paid.entitlementGrantId]));
      eq(grant.source_type, 'scholarship', 'the grant source');
      eq(grant.learner_profile_id, seat.learner.learnerId, 'who the grant is for');

      const enrolment = (await scalar(
        `select * from public.course_enrolments
          where learner_profile_id = $1 and course_id = $2 and deleted_at is null`,
        [seat.learner.learnerId, seat.offer.course]));
      assert(enrolment, 'the learner was granted access but not enrolled');
      eq(enrolment.source, 'scholarship', 'the enrolment source');

      // And the learner can open it.
      const canAccess = (await scalar('select public.can_access_course_version($1,$2) as v',
        [seat.learner.learnerId, seat.offer.version])).v;
      eq(canAccess, true, 'the learner still cannot open the course they were given');
    });

    await test('recording the same payment twice changes nothing', async () => {
      const seat = await approvedSeat();
      const donor = await person('Donor Ten');
      const taken = await pledge(donor.userId, seat.seatCode, 'UG');
      const first = await recordPayment(admin, taken.sponsorshipId, 'BANK-2');
      const second = await recordPayment(admin, taken.sponsorshipId, 'BANK-2-AGAIN');

      eq(second.changed, false, 'the second recording');
      eq(second.entitlementGrantId, first.entitlementGrantId, 'the grant it points at');

      const grants = (await scalar(
        `select count(*)::int n from public.entitlement_grants
          where source_id = $1 and source_type = 'scholarship'`, [taken.sponsorshipId])).n;
      eq(grants, 1, 'grants for one sponsorship');
    });

    await test('a paid sponsorship cannot be withdrawn', async () => {
      const seat = await approvedSeat();
      const donor = await person('Donor Eleven');
      const taken = await pledge(donor.userId, seat.seatCode, 'UG');
      await recordPayment(admin, taken.sponsorshipId, 'BANK-3');

      await rejects(
        () => asActor(donor.userId, 'select public.withdraw_sponsorship($1,null)', [taken.sponsorshipId]),
        /already_paid/);
    });

    // ---------------------------------------------------------------------
    // What each side is told
    // ---------------------------------------------------------------------
    await test('the learner is told the seat was covered, and not by whom', async () => {
      const seat = await approvedSeat();
      const donor = await person('Donor Twelve');
      const taken = await pledge(donor.userId, seat.seatCode, 'UG');
      await recordPayment(admin, taken.sponsorshipId, 'BANK-4');

      const board = (await asActor(seat.learner.userId,
        'select public.my_sponsorship_applications() as r')).rows[0].r;
      const row = board.applications.find((a) => a.id === seat.applicationId);

      eq(row.status, 'funded', 'the application after the seat was paid for');
      eq(row.covered, true, 'whether it was covered');
      eq(row.seatCode, seat.seatCode, 'the seat code');

      const blob = JSON.stringify(board).toLowerCase();
      assert(!blob.includes('donor'), 'the applicant was told a donor name');
      assert(!blob.includes('@example.com'), 'the applicant was told an email address');
    });

    await test('the sponsor sees what they paid for and not who', async () => {
      const seat = await approvedSeat();
      const donor = await person('Donor Thirteen');
      const taken = await pledge(donor.userId, seat.seatCode, 'UG', 'In memory of my father.');
      await recordPayment(admin, taken.sponsorshipId, 'BANK-5');

      const board = (await asActor(donor.userId, 'select public.my_sponsorships() as r')).rows[0].r;
      const row = board.sponsorships.find((s) => s.id === taken.sponsorshipId);

      eq(row.status, 'paid', 'the sponsorship');
      eq(row.reference, 'BANK-5', 'the receipt reference');
      eq(row.courseTitle, seat.offer.course ? row.courseTitle : '', 'the course');
      assert(row.courseTitle, 'the sponsor cannot see which course they paid for');

      const blob = JSON.stringify(board).toLowerCase();
      assert(!blob.includes(seat.learner.name.toLowerCase()),
        'the sponsor was told the learner’s name');
      assert(!blob.includes(seat.learner.learnerId),
        'the sponsor was handed a learner id');
    });

    // ---------------------------------------------------------------------
    // The staff desk
    // ---------------------------------------------------------------------
    await test('the staff overview is for the two deciding roles only', async () => {
      const learner = await person('Overview Learner');
      await rejects(
        () => asActor(learner.userId, 'select public.sponsorship_overview()'), /not_allowed/);
      await rejects(
        () => asActor(support.userId, 'select public.sponsorship_overview()'), /not_allowed/);

      const board = (await asActor(admin, 'select public.sponsorship_overview() as r')).rows[0].r;
      assert(Array.isArray(board.waiting), 'the waiting queue is missing');
      assert(Array.isArray(board.seats), 'the seats list is missing');
      assert(board.counts.funded > 0, 'nothing is recorded as funded');
      eq(board.counts.paid >= board.counts.funded, true, 'paid seats fewer than funded applications');
    });

    await test('every decision is audited with its reason', async () => {
      const rows = (await q(
        `select action, detail from public.governance_audit_events
          where action like 'sponsorship.%' order by occurred_at desc`)).rows;
      const actions = new Set(rows.map((r) => r.action));
      for (const expected of ['sponsorship.application_submitted',
                              'sponsorship.application_approved',
                              'sponsorship.application_declined',
                              'sponsorship.pledged',
                              'sponsorship.paid']) {
        assert(actions.has(expected), `${expected} was never audited`);
      }
      const declined = rows.find((r) => r.action === 'sponsorship.application_declined');
      assert(declined.detail.reason, 'a declined request was audited without its reason');
    });
  } finally {
    await flag('commerce.sponsorship', false);
  }
}
