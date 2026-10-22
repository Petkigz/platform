// "Download my data."
//
// The export is a definer function with no arguments, which means every `where` clause
// inside it is the boundary rather than a convenience. These tests are therefore mostly
// about what is *not* in the document: another family's child, another account's order,
// a co-guardian's private note.

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    asAnon,
    bootstrapAdmin, newUser, newProfile, newInstructor, newReviewer,
    newCourse, newVersion, newSection, newLesson, satisfyReview,
  } = ctx;

  const admin = await bootstrapAdmin('export-admin@example.com');
  const teacher = await newInstructor('export-teacher@example.com', admin);
  const reviewer = await newReviewer('export-reviewer@example.com', admin);

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

  const scalar = async (sql, params = []) => (await q(sql, params)).rows[0];

  async function transition(versionId, status, actor) {
    await q('select id from public.set_course_version_status($1,$2,$3,$4)',
      [versionId, status, actor, 'export test']);
  }

  let seq = 0;
  async function adult(name) {
    seq += 1;
    const userId = await newUser(`export-adult-${seq}@example.com`);
    await newProfile(userId, name);
    const learnerId = (await scalar(
      `insert into public.learner_profiles (display_name, learner_type, age_band, linked_user_id)
       values ($1,'adult','18+',$2) returning id`, [name, userId])).id;
    return { userId, learnerId, name };
  }

  async function makeCourse({ sellable = false } = {}) {
    seq += 1;
    const course = await newCourse(teacher, { status: 'active', title: `Export Course ${seq}` });
    const version = await newVersion(course, teacher);
    const section = await newSection(version);
    const lesson = await newLesson(section);

    // A priced course is a *sold* version, and the enrolment policy refuses to record
    // one as a free enrolment — so only the order test asks for a price.
    if (sellable) {
      const productId = (await scalar(
        `insert into public.products (product_type, name, status, created_by)
         values ('course',$1,'active',$2) returning id`,
        [`Export product ${seq}`, teacher])).id;
      await q(`insert into public.product_course_versions (product_id, course_id, course_version_id)
               values ($1,$2,$3)`, [productId, course, version]);
      await q(`insert into public.prices
                 (product_id, amount_minor, currency_code, billing_interval, status, market, effective_from)
               values ($1,$2,'UGX','one_time','active','UG',now())`, [productId, 30000]);
    }

    await transition(version, 'submitted', teacher);
    await transition(version, 'approved', admin);
    await satisfyReview(version, reviewer, admin);
    await transition(version, 'published', admin);
    return { course, version, lesson };
  }

  const publishedCourse = () => makeCourse();

  // Enrolled *as the person entitled to do it*: the enrolment trigger is what writes
  // the `free` entitlement, and it reads the session. A superuser insert would leave a
  // learner enrolled with no access, which is a different bug than the one under test.
  async function enrolAs(actor, learnerId, course, version) {
    const result = await asActor(actor,
      `insert into public.course_enrolments
         (learner_profile_id, course_id, course_version_id, source, status)
       values ($1,$2,$3,'free','active') returning id`, [learnerId, course, version]);
    return result.rows[0].id;
  }

  // Notes and bookmarks are flag-gated in the database, so a test that writes one has
  // to open the gate and put it back — the same discipline the notes suite uses.
  async function withNotesOn(fn) {
    const before = (await scalar(
      `select value_text from public.platform_settings where key = 'learning.notes_bookmarks'`)).value_text;
    await q(`update public.platform_settings set value_text = 'true'
              where key = 'learning.notes_bookmarks'`);
    try {
      return await fn();
    } finally {
      await q(`update public.platform_settings set value_text = $1
                where key = 'learning.notes_bookmarks'`, [before]);
    }
  }

  const exportAs = async (actor) => {
    const result = await asActor(actor, 'select public.export_my_data() d');
    return result.rows[0].d;
  };

  // ---------------------------------------------------------------------------
  // What is in it
  // ---------------------------------------------------------------------------
  await test('the document carries the account, its learner and their study record', async () => withNotesOn(async () => {
    const me = await adult('Exporting Adult');
    const course = await publishedCourse();
    const enrolmentId = await enrolAs(me.userId, me.learnerId, course.course, course.version);

    await q(`insert into public.lesson_progress
               (course_enrolment_id, lesson_id, status, progress_percent, started_at, completed_at)
             values ($1,$2,'completed',100,now(),now())`, [enrolmentId, course.lesson]);
    // Written as the learner, because the note writer checks that the caller can open
    // the lesson — a superuser insert would not prove the export carries a real note.
    await asActor(me.userId,
      `insert into public.lesson_notes (user_id, learner_profile_id, course_enrolment_id, lesson_id, body)
       values ($1,$2,$3,$4,'A note I wrote')`,
      [me.userId, me.learnerId, enrolmentId, course.lesson]);

    const doc = await exportAs(me.userId);

    assert(doc.formatVersion === 1, 'no format version');
    assert(doc.account.displayName === 'Exporting Adult');
    assert(doc.learners.length === 1, `${doc.learners.length} learners in my own export`);
    const learner = doc.learners[0];
    assert(learner.displayName === 'Exporting Adult');
    assert(learner.enrolments.length === 1, 'the enrolment is missing');
    assert(learner.enrolments[0].course.startsWith('Export Course'), 'the course title is missing');
    assert(learner.enrolments[0].lessonsCompleted === 1, 'completed lessons missing');
    assert(learner.enrolments[0].progressPercent === 100, 'progress missing');
    assert(doc.notes.length === 1, 'my note is missing');
    assert(doc.notes[0].body === 'A note I wrote');
  }));

  await test('it carries orders, and only the accounts the caller belongs to', async () => {
    const me = await adult('Paying Adult');
    const other = await adult('Other Payer');
    const course = await makeCourse({ sellable: true });

    const buy = async (who) => {
      const before = (await scalar(
        `select value_text from public.platform_settings where key = 'commerce.checkout'`)).value_text;
      await q(`update public.platform_settings set value_text = 'true' where key = 'commerce.checkout'`);
      try {
        return (await asActor(who.userId,
          'select public.create_course_order($1,$2,$3,null) r',
          [course.course, who.learnerId, 'UG'])).rows[0].r;
      } finally {
        await q(`update public.platform_settings set value_text = $1 where key = 'commerce.checkout'`,
          [before]);
      }
    };

    const mine = await buy(me);
    await buy(other);

    const doc = await exportAs(me.userId);
    assert(doc.orders.length === 1, `${doc.orders.length} orders in my export`);
    assert(doc.orders[0].number === mine.orderId
      ? false
      : /^AS-\d{8}$/.test(doc.orders[0].number), 'the receipt number is missing');
    assert(doc.orders[0].totalMinor === '30000', `total ${doc.orders[0].totalMinor}`);

    const otherDoc = await exportAs(other.userId);
    assert(otherDoc.orders.length === 1, 'the other payer lost their own order');
    assert(otherDoc.orders[0].number !== doc.orders[0].number, 'two people exported one order');
  });

  // ---------------------------------------------------------------------------
  // What is not
  // ---------------------------------------------------------------------------
  await test('a family guardian exports the child; a stranger exports neither', async () => {
    const guardian = await adult('Guardian');
    const stranger = await adult('Stranger');

    const familyId = (await scalar(
      `insert into public.families (name, created_by) values ('Export family', $1) returning id`,
      [guardian.userId])).id;
    await q(`insert into public.family_memberships
               (family_id, user_id, membership_type, status, joined_at)
             values ($1,$2,'owner','active',now())`, [familyId, guardian.userId]);

    const childName = 'Export Child';
    await q(
      `insert into public.learner_profiles (family_id, display_name, learner_type, age_band)
       values ($1,$2,'child','8-10')`, [familyId, childName]);

    const doc = await exportAs(guardian.userId);
    const names = doc.learners.map((l) => l.displayName);
    assert(names.includes(childName), `the child is missing from the guardian's export: ${names}`);
    const child = doc.learners.find((l) => l.displayName === childName);
    assert(child.learnerType === 'child' && child.ageBand === '8-10',
      'the child was exported without the facts that identify them');

    const theirDoc = await exportAs(stranger.userId);
    assert(!theirDoc.learners.some((l) => l.displayName === childName),
      'a stranger exported a child they have nothing to do with');
  });

  await test('a billing manager exports the family but not the child', async () => {
    // Paying for a family is not parenting it: `is_learner_family_member()` is the
    // boundary the rest of the application uses, and the export reuses it rather than
    // inventing a second rule.
    const owner = await adult('Family Owner');
    const payer = await adult('Billing Manager');

    const familyId = (await scalar(
      `insert into public.families (name, created_by) values ('Billing family', $1) returning id`,
      [owner.userId])).id;
    await q(`insert into public.family_memberships
               (family_id, user_id, membership_type, status, joined_at)
             values ($1,$2,'owner','active',now()), ($1,$3,'billing_manager','active',now())`,
      [familyId, owner.userId, payer.userId]);

    await q(
      `insert into public.learner_profiles (family_id, display_name, learner_type, age_band)
       values ($1,'Billing Child','child','11-13')`, [familyId]);

    const doc = await exportAs(payer.userId);
    assert(!doc.learners.some((l) => l.displayName === 'Billing Child'),
      'a billing manager exported a child they may not read');
    assert(doc.families.length === 1, 'the membership is missing from their own export');
    assert(doc.families[0].role === 'billing_manager');
  });

  await test("another learner's private note is not exported", async () => withNotesOn(async () => {
    const one = await adult('Note Writer One');
    const two = await adult('Note Writer Two');
    const course = await publishedCourse();

    const oneEnrolment = await enrolAs(one.userId, one.learnerId, course.course, course.version);
    const twoEnrolment = await enrolAs(two.userId, two.learnerId, course.course, course.version);

    await asActor(one.userId,
      `insert into public.lesson_notes (user_id, learner_profile_id, course_enrolment_id, lesson_id, body)
       values ($1,$2,$3,$4,'Only mine')`,
      [one.userId, one.learnerId, oneEnrolment, course.lesson]);
    await asActor(two.userId,
      `insert into public.lesson_notes (user_id, learner_profile_id, course_enrolment_id, lesson_id, body)
       values ($1,$2,$3,$4,'Also only mine')`,
      [two.userId, two.learnerId, twoEnrolment, course.lesson]);

    const mine = await exportAs(one.userId);
    assert(mine.notes.length === 1, `${mine.notes.length} notes in my export`);
    assert(mine.notes[0].body === 'Only mine', "another learner's note was exported to me");

    const theirs = await exportAs(two.userId);
    assert(theirs.notes.length === 1 && theirs.notes[0].body === 'Also only mine',
      'the other learner lost their own note');
  }));

  await test('signed out, there is nothing to export', async () => {
    let refused = false;
    await asAnon(async () => {
      try {
        await q('select public.export_my_data()');
      } catch (e) {
        refused = /sign in to download your data/.test(e.message);
      }
    });
    assert(refused, 'the export answered a signed-out caller');
  });
}
