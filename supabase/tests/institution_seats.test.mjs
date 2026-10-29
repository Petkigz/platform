// A school buys thirty seats, and thirty pupils get a course.
//
// The institution half of the platform was built and the commerce half was never
// designed: a madrasah could join and could not buy anything. This suite is about
// the purchase that involves no payment provider at all — an invoice recorded by
// staff, a code per seat handed out by the school, and a redeeming parent.
//
// Two rules are tested as hard as the happy path, because they are the ones that
// would be broken quietly:
//
//   * **The school never learns who redeemed a seat.** Its report is counts, a
//     date, a price and a course title. A test asserts that no learner id and no
//     display name appear anywhere in the payload.
//   * **A refused claim does not spend a code.** A code handed to somebody
//     already enrolled must still work for somebody else.

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    bootstrapAdmin, newUser, newProfile, newInstructor, newCourse, newVersion,
    newReviewer, satisfyReview, committed,
  } = ctx;

  const admin = await bootstrapAdmin('seats-admin@example.com');

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
    q(`update public.platform_settings set value_text = $1
        where key = 'commerce.institutions'`, [on ? 'true' : 'false']);

  const hash = (seed) => seed.repeat(64).slice(0, 64);
  // A well-formed hash nobody holds, for the "unknown code" case: a malformed
  // one would be refused for the wrong reason and the test would pass anyway.
  const UNKNOWN = '9'.repeat(64);

  // -------------------------------------------------------------------------
  // Fixtures
  // -------------------------------------------------------------------------
  const teacher = await newInstructor('seats-teacher@example.com', admin);
  const reviewer = await newReviewer('seats-reviewer@example.com', admin);

  const course = await newCourse(teacher, { title: 'Tajweed foundations', status: 'active' });
  const version = await newVersion(course, teacher);
  await satisfyReview(version, reviewer, admin);
  await q(`update public.course_versions
              set version_status = 'published', decision_by = $2,
                  decision_reason = 'Approved for the seats test'
            where id = $1`, [version, admin]);

  async function account(email, name) {
    const id = await newUser(email);
    await newProfile(id, name);
    return id;
  }

  // The school's administrator, and a second member who is not one.
  const schoolAdmin = await account('seats-principal@example.com', 'Principal Amina');
  const schoolMember = await account('seats-member@example.com', 'A member');
  const parent = await account('seats-parent@example.com', 'A parent');
  const stranger = await account('seats-stranger@example.com', 'A stranger');

  const school = (await q(
    `insert into public.institutions (code, name, institution_type)
     values ('seats-test', 'Dar ul-Ilm', 'madrasah') returning id`)).rows[0].id;

  await committed(async () => {
    await q(`insert into public.institution_memberships (institution_id, user_id, role, joined_by)
            values ($1, $2, 'admin', $2), ($1, $3, 'member', $2)`,
      [school, schoolAdmin, schoolMember]);
  });

  // The parent's own learner profile is created through the platform's own
  // function, so the fixture is the same shape a real account has.
  await asActor(parent, 'select public.claim_own_learner_profile()');
  const parentLearner = (await q(
    `select id from public.learner_profiles where linked_user_id = $1`, [parent])).rows[0].id;

  // A second learner belonging to nobody — the "somebody else's child" case.
  const strangerLearner = (await q(
    `insert into public.learner_profiles (display_name, learner_type, age_band, linked_user_id)
     values ('Not yours', 'adult', '18+', $1) returning id`, [stranger])).rows[0].id;

  let orderId = null;

  try {
    // -----------------------------------------------------------------------
    await test('with the flag off, nothing may be bought and no code works', async () => {
      await flag(false);
      await rejects(
        () => call(admin, 'record_institution_seat_order($1,$2,$3,$4,$5)',
          [school, course, 5, 'INV-1', 'A test order']),
        /institution:seats_closed/);
      await rejects(
        () => call(parent, 'claim_institution_seat($1)', [hash('a')]),
        /institution:seats_closed/);
    });

    await flag(true);

    await test('only the owner records a purchase, and only for a published course', async () => {
      await rejects(
        () => call(schoolAdmin, 'record_institution_seat_order($1,$2,$3,$4,$5)',
          [school, course, 5, 'INV-1', 'A test order']),
        /institution:not_allowed/);

      const draft = await newCourse(teacher, { title: 'Not published yet' });
      await newVersion(draft, teacher);
      await rejects(
        () => call(admin, 'record_institution_seat_order($1,$2,$3,$4,$5)',
          [school, draft, 5, 'INV-2', 'A test order']),
        /institution:not_published/);
    });

    await test('an invoice with no reference is refused, and so is half a price', async () => {
      await rejects(
        () => call(admin, 'record_institution_seat_order($1,$2,$3,$4,$5)',
          [school, course, 5, '  ', 'A test order']),
        /institution:invoice_required/);
      await rejects(
        () => call(admin, 'record_institution_seat_order($1,$2,$3,$4,$5,$6)',
          [school, course, 5, 'INV-3', 'A test order', 1500]),
        /institution:money_incomplete/);
      await rejects(
        () => call(admin, 'record_institution_seat_order($1,$2,$3,$4,$5,$6,$7)',
          [school, course, 5, 'INV-3', '   ', 1500, 'USD']),
        /institution:reason_required/);
    });

    await test('the owner records thirty seats against an invoice, pinned to an edition', async () => {
      const result = await call(admin, 'record_institution_seat_order($1,$2,$3,$4,$5,$6,$7)',
        [school, course, 30, 'BR-2026-0041', 'Bank transfer received', 1500, 'usd']);
      orderId = result.orderId;
      assert(orderId, 'an order came back');
      eq(result.courseVersionId, version, 'the published edition is the one pinned');
      eq(result.seats, 30, 'thirty seats');

      const row = (await q(
        `select seats, unit_price_minor, currency_code, invoice_reference, course_version_id
           from public.institution_seat_orders where id = $1`, [orderId])).rows[0];
      eq(row.seats, 30, 'stored seats');
      eq(Number(row.unit_price_minor), 1500, 'the price in minor units, as recorded');
      eq(row.currency_code, 'USD', 'the currency, upper-cased');
      eq(row.course_version_id, version, 'the pin, stored');
    });

    await test('the school issues codes, and cannot issue more than it bought', async () => {
      await rejects(
        () => call(schoolMember, 'issue_institution_seat_codes($1,$2)',
          [orderId, JSON.stringify([{ hash: hash('b'), tail: 'BBBB' }])]),
        /institution:not_an_admin/);

      const three = await call(schoolAdmin, 'issue_institution_seat_codes($1,$2)', [orderId,
        JSON.stringify([
          { hash: hash('b'), tail: 'BBBB' },
          { hash: hash('c'), tail: 'CCCC' },
          { hash: hash('d'), tail: 'DDDD' },
        ])]);
      eq(three.issued, 3, 'three issued');
      eq(three.total, 3, 'three in total');

      // Twenty-seven more fills the order exactly; twenty-eight would be one
      // seat more than the school paid for.
      const batch = (count) => JSON.stringify(Array.from({ length: count }, (_, i) => ({
        hash: i.toString(16).padStart(4, '0').repeat(16).slice(0, 64),
        tail: 'EEEE',
      })));
      const rest = await call(schoolAdmin, 'issue_institution_seat_codes($1,$2)',
        [orderId, batch(27)]);
      eq(rest.total, 30, 'the order is exactly filled');

      await rejects(
        () => call(schoolAdmin, 'issue_institution_seat_codes($1,$2)', [orderId, batch(1)]),
        /institution:not_enough_seats/);
    });

    await test('codes are stored only as hashes and a four-character tail', async () => {
      const rows = (await q(
        `select code_hash, code_tail from public.institution_seat_codes where order_id = $1`,
        [orderId])).rows;
      for (const row of rows) {
        assert(/^[a-f0-9]{64}$/.test(row.code_hash), 'a hash, not a code');
        assert(/^[A-Z0-9]{4}$/.test(row.code_tail), 'a tail, four characters');
      }
    });

    await test('nobody can read the seat tables directly', async () => {
      // RLS is on with no policies at all: these rows are one step from a grant.
      for (const table of ['institution_seat_orders', 'institution_seat_codes']) {
        const open = (await q(
          `select relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace
            where n.nspname = 'public' and c.relname = $1`, [table])).rows[0];
        eq(open.relrowsecurity, true, `RLS on ${table}`);
      }
      // RLS with no policy returns nothing rather than raising, so the claim
      // is about the rows a client can see, not about an error message.
      const visible = await asActor(schoolAdmin, 'select * from public.institution_seat_codes');
      eq(visible.rows.length, 0, 'a client reads no seat codes');
    });

    // -----------------------------------------------------------------------
    await test('a code that does not exist is refused, and so is a malformed one', async () => {
      await rejects(
        () => call(parent, 'claim_institution_seat($1)', [UNKNOWN]),
        /institution:code_unknown/);
      await rejects(
        () => call(parent, 'claim_institution_seat($1)', ['not-a-hash']),
        /institution:bad_code/);
    });

    await test('a parent redeems a seat for their own learning', async () => {
      const claimed = await call(parent, 'claim_institution_seat($1)', [hash('b')]);
      eq(claimed.courseId, course, 'the course');
      eq(claimed.courseTitle, 'Tajweed foundations', 'with a title, so the screen can say what');
      eq(claimed.versionNumber, 1, 'the edition that was bought');
      eq(claimed.learnerProfileId, parentLearner, 'their own learner profile');

      const enrolment = (await q(
        `select source, institution_id, course_version_id, status
           from public.course_enrolments where learner_profile_id = $1 and course_id = $2`,
        [parentLearner, course])).rows[0];
      eq(enrolment.source, 'institution', 'the source names who paid');
      eq(enrolment.institution_id, school, 'and which school');
      eq(enrolment.course_version_id, version, 'pinned to the bought edition');
      eq(enrolment.status, 'active', 'active');

      const grant = (await q(
        `select source_type, status from public.entitlement_grants
          where learner_profile_id = $1 and course_version_id = $2`, [parentLearner, version])).rows[0];
      eq(grant.source_type, 'institution', 'the ledger says an institution paid');
      eq(grant.status, 'active', 'and the grant is live');
    });

    await test('the seat is spent, and the second click says so', async () => {
      await rejects(
        () => call(parent, 'claim_institution_seat($1)', [hash('b')]),
        /institution:code_used/);
      const row = (await q(
        `select claimed_by, claimed_at, learner_profile_id from public.institution_seat_codes
          where code_hash = $1`, [hash('b')])).rows[0];
      eq(row.claimed_by, parent, 'the account that redeemed it');
      eq(row.learner_profile_id, parentLearner, 'and the learner it went to');
      assert(row.claimed_at, 'with a time');
    });

    await test('a code handed to somebody already enrolled does not spend itself', async () => {
      // The parent is enrolled now. Using a second code would burn a seat for
      // nothing — so it is refused, and the code stays available.
      await rejects(
        () => call(parent, 'claim_institution_seat($1)', [hash('c')]),
        /institution:already_enrolled/);

      const stillFree = (await q(
        `select claimed_at, voided_at from public.institution_seat_codes where code_hash = $1`,
        [hash('c')])).rows[0];
      eq(stillFree.claimed_at, null, 'not claimed');
      eq(stillFree.voided_at, null, 'not voided');

      // And it works for somebody else.
      const other = await call(stranger, 'claim_institution_seat($1)', [hash('c')]);
      eq(other.learnerProfileId, strangerLearner, 'it went to the other account');
    });

    await test('nobody may spend a seat on a learner they do not have', async () => {
      await rejects(
        () => call(parent, 'claim_institution_seat($1,$2)', [hash('d'), strangerLearner]),
        /institution:not_your_learner/);
      const untouched = (await q(
        `select claimed_at from public.institution_seat_codes where code_hash = $1`,
        [hash('d')])).rows[0];
      eq(untouched.claimed_at, null, 'the refusal spent nothing');
    });

    // -----------------------------------------------------------------------
    await test('the school sees counts, and never a person', async () => {
      const seats = await call(schoolAdmin, 'my_institution_seats()');
      eq(seats.enabled, true, 'the feature is on');
      eq(seats.isAdmin, true, 'for an administrator');
      eq(seats.totals.seats, 30, 'thirty seats bought');
      eq(seats.totals.claimed, 2, 'two redeemed');

      const order = seats.orders[0];
      eq(order.orderId, orderId, 'the order');
      eq(order.courseTitle, 'Tajweed foundations', 'the course title is theirs to see');
      eq(order.seats, 30, 'the seats');
      eq(order.claimed, 2, 'the claims');

      // The whole payload, searched for the things that must not be in it.
      const text = JSON.stringify(seats);
      for (const forbidden of [parentLearner, strangerLearner, parent, stranger, 'A parent']) {
        assert(!text.includes(forbidden),
          `the institution report leaked ${forbidden}`);
      }
      assert(!/learnerProfileId/i.test(text), 'no learner id field at all');
      assert(!/claimedBy/i.test(text), 'no account field at all');
    });

    await test('an ordinary member is told less than an administrator', async () => {
      const seats = await call(schoolMember, 'my_institution_seats()');
      eq(seats.joined, true, 'they belong');
      eq(seats.isAdmin, false, 'and are not an administrator');
      eq(seats.orders.length, 0, 'which courses the school bought is not theirs to read');
      eq(seats.totals.seats, 0, 'nor the money');
    });

    await test('staff see every school that has bought anything, as counts', async () => {
      const directory = await call(admin, 'institution_seat_directory()');
      eq(directory.enabled, true, 'the feature is on');
      const row = directory.institutions.find((entry) => entry.institutionId === school);
      assert(row, 'the school is listed');
      eq(row.seats, 30, 'thirty seats');
      eq(row.claimed, 2, 'two claimed');
      await rejects(() => call(schoolAdmin, 'institution_seat_directory()'), /institution:not_allowed/);
    });

    // -----------------------------------------------------------------------
    await test('voiding an unclaimed code stops it, and says why', async () => {
      const codeId = (await q(
        `select id from public.institution_seat_codes where code_hash = $1`, [hash('d')])).rows[0].id;
      await rejects(
        () => call(schoolAdmin, 'void_institution_seat_code($1,$2)', [codeId, '  ']),
        /institution:reason_required/);
      const result = await call(schoolAdmin, 'void_institution_seat_code($1,$2)',
        [codeId, 'Printed twice']);
      eq(result.voided, true, 'voided');
      eq(result.entitlementRevoked, false, 'nothing had been granted');

      await rejects(
        () => call(parent, 'claim_institution_seat($1)', [hash('d')]),
        /institution:code_voided/);
    });

    await test('taking a seat back revokes the grant and deletes nothing', async () => {
      const codeId = (await q(
        `select id from public.institution_seat_codes where code_hash = $1`, [hash('b')])).rows[0].id;
      const result = await call(schoolAdmin, 'void_institution_seat_code($1,$2)',
        [codeId, 'The family left the school']);
      eq(result.entitlementRevoked, true, 'the entitlement was revoked');

      const grant = (await q(
        `select status, revoked_at, revocation_reason from public.entitlement_grants
          where source_type = 'institution' and source_id = $1 and learner_profile_id = $2`,
        [codeId, parentLearner])).rows[0];
      eq(grant.status, 'revoked', 'the grant is revoked');
      assert(grant.revoked_at, 'with a time');
      eq(grant.revocation_reason, 'The family left the school', 'and the reason in words');

      // A hold changes no money and deletes nothing: the enrolment and
      // everything done under it survive.
      const enrolment = (await q(
        `select id, status from public.course_enrolments
          where learner_profile_id = $1 and course_id = $2 and deleted_at is null`,
        [parentLearner, course])).rows[0];
      assert(enrolment, 'the enrolment is still there');
      eq(enrolment.status, 'active', 'and untouched');
    });

    await test('a school cannot void another school’s code', async () => {
      const other = (await q(
        `insert into public.institutions (code, name, institution_type)
         values ('seats-other', 'Another school', 'school') returning id`)).rows[0].id;
      const otherAdmin = await account('seats-other-admin@example.com', 'Another principal');
      await committed(async () => {
        await q(`insert into public.institution_memberships (institution_id, user_id, role, joined_by)
                values ($1, $2, 'admin', $2)`, [other, otherAdmin]);
      });
      const codeId = (await q(
        `select id from public.institution_seat_codes where code_hash = $1`, [hash('c')])).rows[0].id;
      await rejects(
        () => call(otherAdmin, 'void_institution_seat_code($1,$2)', [codeId, 'Not mine']),
        /institution:not_an_admin/);
    });
  } finally {
    await flag(false);
  }
}
