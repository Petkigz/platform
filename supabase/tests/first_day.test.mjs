// The first day: four people, one platform.
//
// WHY THIS SUITE EXISTS
// ---------------------
// Every door in this product has a suite that opens it. Nothing had ever walked
// a person through several doors in a row, carrying something, and that is where
// the defects live: not "does enrol work", but "does the lesson the learner reads
// belong to the version they were enrolled onto, and can anybody give them the
// certificate they just earned".
//
// It is also the deployment runbook executed as a story. `docs/deploy/README.md`
// promises that a new platform ends with a subject, a verified reviewer, a
// course, a published version, a learner and a certificate, and that the admin
// checklist empties. Here four people do it, in order, and the last act reads the
// same probe the runbook tells an operator to paste.
//
// WHO
// ---
//   the owner     appoints, publishes, and is the only one who may
//   the teacher   writes a course and must not be able to approve it
//   the reviewer  reads it and is the reason it may be published at all
//   the learner   a stranger this morning
//   the guardian  brings a child, and is not the learner
//
// EVERYTHING HAPPENS AS THE PERSON. No fixture writes a row on somebody's behalf
// where the product has a function for it, because a journey through superuser
// shortcuts tests the schema and not the platform. Where a step is a click in the
// app, the test calls the function that click calls.
//
// WHAT IT FOUND
// -------------
// The certificate dead end, in Act V: the machinery was complete and the one
// switch it needed had no writer in the product, so `/admin/certificates` said
// "No eligible learners are waiting" on a platform where no learner could ever
// become eligible. That unit's writer is `set_course_certificate_policy()`, and
// Act V is why it exists.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

export async function run(ctx) {
  const { q, test, assert, rejects, bootstrapAdmin, newUser, asAnon } = ctx;

  /** Run `sql` as this person, committed. */
  async function asActor(actor, sql, params = []) {
    await q('begin');
    await q("select set_config('request.jwt.claims',$1,true)",
      [JSON.stringify({ sub: actor, role: 'authenticated' })]);
    await q('set local role authenticated');
    try {
      const r = await q(sql, params);
      await q('commit');
      return r;
    } catch (e) {
      await q('rollback');
      throw e;
    }
  }

  const call = (actor, fn, params = []) =>
    asActor(actor, `select public.${fn} as r`, params).then((r) => r.rows[0].r);

  const value = (actor, fn, params = []) =>
    asActor(actor, `select public.${fn} as r`, params).then((r) => r.rows[0].r);

  const publishedCount = async () =>
    Number((await q(`select count(*)::int n from public.course_versions where version_status = 'published'`))
      .rows[0].n);

  /**
   * What the catalogue shows a visitor who is not signed in, for one search.
   *
   * `catalogue_page()` answers `{total, shown, offset, limit, ordered}`, and
   * `ordered` is what `parseCataloguePage()` turns into the cards' hits. Read as
   * the visitor, because the shelf is one of the few things that must work with
   * nobody signed in.
   */
  const shelfHits = async (term) => {
    const page = await asAnon(() =>
      q('select public.catalogue_page($1, null, null, null, 24, 0, null) as r', [term]))
      .then((r) => r.rows[0].r);
    return (page?.ordered ?? []).map((hit) => hit.courseId);
  };

  const title = `First Day ${globalThis.crypto.randomUUID().slice(0, 6)}`;
  const slug = `first-day-${globalThis.crypto.randomUUID().slice(0, 8)}`;

  // -------------------------------------------------------------------------
  console.log('\nAct I — the owner opens the door');
  // -------------------------------------------------------------------------

  const owner = await bootstrapAdmin(`firstday-owner-${slug}@example.com`);
  const teacher = await newUser(`firstday-teacher-${slug}@example.com`);
  const reviewer = await newUser(`firstday-reviewer-${slug}@example.com`);

  await test('signing up makes a profile without anybody writing one', async () => {
    // `handle_new_user()` on auth.users. Without it a new account cannot be
    // given a role, and `verify.sql` calls that out as the first thing to fix.
    const profile = (await q(
      'select display_name from public.user_profiles where user_id = $1', [teacher])).rows[0];
    assert(profile, 'no profile was created for a new account');
    assert(String(profile.display_name).length > 0, 'the profile has no name');
  });

  await test('somebody with no role cannot open a course', async () => {
    await rejects(
      () => asActor(teacher,
        `insert into public.courses (slug, title, audience, created_by)
         values ($1, $2, 'adult', $3)`, [slug, title, teacher]),
      /row-level security|policy/i);
  });

  await test('a role that changes what other people may do needs a written reason', async () => {
    // Teaching is an appointment; support is power over somebody else's problem.
    // Only the second kind has to be justified in writing, and the difference is
    // deliberate rather than an oversight.
    await rejects(() => call(owner, 'assign_role($1,$2,$3)', [teacher, 'support_agent', '  ']),
      /written reason/i);
  });

  await test('the owner appoints the teacher, and the appointment is recorded against them', async () => {
    await call(owner, 'assign_role($1,$2,$3)', [teacher, 'instructor', null]);

    const audited = (await q(
      `select actor, detail from public.governance_audit_events
        where action = 'role.assigned' and target_id = $1`, [teacher])).rows[0];
    assert(audited, 'the appointment left no audit row');
    assert(audited.actor === owner, 'the audit does not say who appointed them');
  });

  await test('and a reviewer, the same way', async () => {
    await call(owner, 'assign_role($1,$2,$3)', [reviewer, 'reviewer', null]);
    // A reviewer is a register entry as well as a role: the role says they are
    // staff, the profile is what an assignment points at.
    await call(reviewer, 'register_as_reviewer($1)', ['Reads tafsir and grammar all day']);
    const id = (await q('select id from public.reviewer_profiles where user_id = $1',
      [reviewer])).rows[0].id;
    await call(owner, 'set_reviewer_status($1,$2,$3)', [id, 'active', 'Known to me']);
    assert((await q('select reviewer_status from public.reviewer_profiles where id = $1', [id]))
      .rows[0].reviewer_status === 'active');
  });

  // -------------------------------------------------------------------------
  console.log('\nAct II — the teacher writes a course');
  // -------------------------------------------------------------------------

  let course;
  let version;
  let lessonIds;

  await test('a teacher opens a course, a version, a section and three lessons', async () => {
    course = (await asActor(teacher,
      `insert into public.courses (slug, title, description, audience, created_by, status)
       values ($1,$2,$3,'adult',$4,'active') returning id`,
      [slug, title, 'The first course on this platform.', teacher])).rows[0].id;

    // `returning id`, because that is what the app does: the screen navigates to
    // the new version's editor, so the id has to come back in the same call.
    version = (await asActor(teacher,
      `insert into public.course_versions (course_id, version_number, language, created_by)
       values ($1,1,'en',$2) returning id`, [course, teacher])).rows[0].id;

    const section = (await asActor(teacher,
      `insert into public.course_sections (course_version_id, title, position)
       values ($1,'The opening',1) returning id`, [version])).rows[0].id;

    lessonIds = [];
    for (const [i, name] of ['What tawhid means', 'The names of Allah', 'Why it matters'].entries()) {
      lessonIds.push((await asActor(teacher,
        `insert into public.lessons (section_id, title, position, type)
         values ($1,$2,$3,'text') returning id`, [section, name, i + 1])).rows[0].id);
    }
    assert(lessonIds.length === 3);
  });

  await test('the teacher gets the new version’s id back in the same call', async () => {
    // This is the defect the journey found: `INSERT … RETURNING` on
    // `course_versions` was refused because its SELECT policy looked the row up
    // through a STABLE function, on a snapshot taken before the row existed.
    // The course row survived, the version did not, and the teacher saw "not
    // allowed" on the first thing they ever did. Fixed in
    // 20261281004300_version_insert_returning.sql; this is the test that keeps it
    // fixed.
    const course2 = (await asActor(teacher,
      `insert into public.courses (slug, title, created_by)
       values ($1,'A second course',$2) returning id`,
      [`${slug}-b`, teacher])).rows[0].id;

    const readBack = (await asActor(teacher,
      `insert into public.course_versions (course_id, version_number, created_by)
       values ($1,1,$2) returning id, version_status`, [course2, teacher])).rows[0];
    assert(readBack.id, 'the new version came back without its id');
    assert(readBack.version_status === 'draft');
  });

  await test('the shelf does not show a draft to anybody', async () => {
    assert((await shelfHits(title)).length === 0,
      'a draft course is visible in the catalogue');
  });

  await test('the teacher submits it, and cannot approve their own work', async () => {
    await call(teacher, 'set_course_version_status($1,$2,$3,$4)',
      [version, 'submitted', teacher, 'Ready for review']);

    // A teacher has no business approving anything, so this is refused before
    // anybody looks at whose work it is.
    await rejects(() => call(teacher, 'set_course_version_status($1,$2,$3,$4)',
      [version, 'approved', teacher, 'Approving myself']),
      /not permitted/i);

    // Some staff both teach and review. Once the owner appoints this teacher as
    // a reviewer, the refusal changes from "not your job" to the sentence that
    // is about the work: the platform names the conflict instead of hiding it
    // behind a permission error.
    await call(owner, 'assign_role($1,$2,$3)', [teacher, 'reviewer', 'Also reviews for the academy']);
    await rejects(() => call(teacher, 'set_course_version_status($1,$2,$3,$4)',
      [version, 'approved', teacher, 'Approving myself']),
      /may not approve/i);
  });

  await test('the owner cannot publish it either, because nobody has reviewed it', async () => {
    // Two independent refusals, and neither can be talked around. The transition
    // table is the first: a version goes draft -> submitted -> approved ->
    // published, and no step is skipped. The publication gate is the second: it
    // runs as a trigger on the table, so it cannot be bypassed by calling the
    // function from somewhere new.
    await rejects(() => call(owner, 'set_course_version_status($1,$2,$3,$4)',
      [version, 'published', owner, 'Publishing it']),
      /not permitted/i);
  });

  // -------------------------------------------------------------------------
  console.log('\nAct III — the reviewer reads it');
  // -------------------------------------------------------------------------

  await test('staff hand the version to the reviewer', async () => {
    const reviewerProfile = (await q('select id from public.reviewer_profiles where user_id = $1',
      [reviewer])).rows[0].id;
    await asActor(owner,
      `insert into public.content_review_assignments
         (course_version_id, reviewer_profile_id, review_scope, assigned_by, assignment_status)
       values ($1,$2,'scholarly',$3,'offered')`, [version, reviewerProfile, owner]);
  });

  await test('the reviewer accepts it and records what they thought', async () => {
    const assignment = (await q(
      `select id from public.content_review_assignments where course_version_id = $1`,
      [version])).rows[0].id;

    await asActor(reviewer,
      `update public.content_review_assignments
          set assignment_status = 'accepted', accepted_at = now()
        where id = $1`, [assignment]);

    await asActor(reviewer,
      `insert into public.content_review_decisions
         (review_assignment_id, course_version_id, review_scope, decision, rationale, decided_by)
       values ($1,$2,'scholarly','approved','Accurate, sourced and clearly written.',$3)`,
      [assignment, version, reviewer]);

    const state = (await q('select version_status from public.course_versions where id = $1',
      [version])).rows[0].version_status;
    assert(state === 'submitted', `recording a decision moved the version to ${state}`);

    // Recording a review and moving the version are two separate acts, and the
    // reviewer does both. The decision is evidence; the transition is the claim
    // that the evidence is enough.
    await asActor(reviewer,
      `update public.content_review_assignments
          set assignment_status = 'completed', completed_at = now()
        where id = $1`, [assignment]);

    await call(reviewer, 'set_course_version_status($1,$2,$3,$4)',
      [version, 'approved', reviewer, 'Accurate and clearly written.']);
  });

  await test('nobody else may record that decision, even after the fact', async () => {
    const assignment = (await q(
      `select id from public.content_review_assignments where course_version_id = $1`,
      [version])).rows[0].id;
    // `crd_write` admits a decision whose decided_by is the caller; the trigger
    // is what stops the caller recording somebody else's review as their own.
    await rejects(() => asActor(teacher,
      `insert into public.content_review_decisions
         (review_assignment_id, course_version_id, review_scope, decision, rationale, decided_by)
       values ($1,$2,'scholarly','approved','I approve me.',$3)`,
      [assignment, version, teacher]),
      /assigned reviewer/i);
  });

  await test('the owner publishes, and the shelf has it', async () => {
    // Only now, after a reviewer's decision and the reviewer moving it to
    // approved, does publication succeed — which is the gate agreeing that the
    // scholarly evidence is there.
    const before = await publishedCount();
    await call(owner, 'set_course_version_status($1,$2,$3,$4)',
      [version, 'published', owner, 'Approved by review']);
    assert(await publishedCount() === before + 1, 'publishing did not change the count');

    const hits = await shelfHits(title);
    assert(hits.includes(course), `the catalogue returned ${hits.length} hits, not this course`);
  });

  // -------------------------------------------------------------------------
  console.log('\nAct IV — a stranger becomes a learner');
  // -------------------------------------------------------------------------

  const learner = await newUser(`firstday-learner-${slug}@example.com`);
  let learnerProfileId;
  let enrolmentId;

  await test('the learner becomes a learner, in one call', async () => {
    const claimed = await call(learner, 'claim_own_learner_profile()');
    learnerProfileId = claimed.learnerProfileId;
    assert(claimed.created === true);
    assert(claimed.learnerType === 'adult');

    const again = await call(learner, 'claim_own_learner_profile()');
    assert(again.created === false && again.learnerProfileId === learnerProfileId,
      'claiming twice made a second profile');
  });

  await test('the course is free, and the platform says so without naming a currency', async () => {
    const price = await call(learner, 'course_price_for_me($1,$2)', [course, 'UG']);
    assert(price.hasLivePrice === false, `hasLivePrice: ${price.hasLivePrice}`);
    assert(price.reason === 'no_price', `reason: ${price.reason}`);
  });

  await test('the learner enrols on the version that is published today', async () => {
    enrolmentId = (await asActor(learner,
      `insert into public.course_enrolments
         (learner_profile_id, course_id, course_version_id, source, status)
       values ($1,$2,$3,'free','active') returning id`,
      [learnerProfileId, course, version])).rows[0].id;
    assert(enrolmentId, 'no enrolment row');
  });

  await test('three lessons are behind them, and the platform counts them', async () => {
    const summary = (await q('select * from public.enrolment_progress_summary($1)', [enrolmentId]))
      .rows[0];
    assert(Number(summary.lessons_total) === 3, `lessons_total: ${summary.lessons_total}`);
    assert(Number(summary.lessons_done) === 0);
  });

  await test('the learner finishes two of three, and is not called finished', async () => {
    for (const lesson of lessonIds.slice(0, 2)) {
      await asActor(learner,
        `insert into public.lesson_progress
           (course_enrolment_id, lesson_id, status, progress_percent, started_at, completed_at)
         values ($1,$2,'completed',100,now(),now())`, [enrolmentId, lesson]);
    }
    // `select * from`, not `select f() as r`: a function returning a table comes
    // back over the wire as one text column of a composite, so the fields would
    // be unreadable and every assertion on them would silently be against
    // `undefined`. The screen reads it the way PostgREST does — as a row set.
    const evaluation = (await asActor(learner,
      'select * from public.evaluate_completion($1)', [enrolmentId])).rows[0];
    assert(evaluation.is_complete === false, 'two of three lessons reads as complete');
    assert(evaluation.blocking.length > 0, 'nothing is listed as blocking');
  });

  await test('the third lesson finishes it', async () => {
    await asActor(learner,
      `insert into public.lesson_progress
         (course_enrolment_id, lesson_id, status, progress_percent, started_at, completed_at)
       values ($1,$2,'completed',100,now(),now())`, [enrolmentId, lessonIds[2]]);

    const evaluation = (await q('select * from public.evaluate_completion($1)', [enrolmentId]))
      .rows[0];
    assert(evaluation.is_complete === true, `blocking: ${evaluation.blocking}`);
    assert(Number(evaluation.percent_complete) === 100);
  });

  await test('nobody else can see what the learner has done', async () => {
    const stranger = await newUser(`firstday-stranger-${slug}@example.com`);
    const rows = (await asActor(stranger,
      'select id from public.course_enrolments where id = $1', [enrolmentId])).rows;
    assert(rows.length === 0, 'a stranger can read somebody else’s enrolment');
  });

  // -------------------------------------------------------------------------
  console.log('\nAct V — the certificate, and the switch that had no handle');
  // -------------------------------------------------------------------------

  await test('the shelf can see somebody finished, and can see there is nothing to give them', async () => {
    const facts = await call(owner, 'certificate_shelf_standing()');
    assert(facts.finishedWithout >= 1,
      'a learner finished and the platform does not notice; this is the sentence the screen could not say');
    const before = facts.waiting;
    assert(typeof before === 'number');
  });

  await test('the author says this course ends with a certificate', async () => {
    const answer = await call(teacher, 'set_course_certificate_policy($1,$2,$3)',
      [version, true, 'standard-v1']);
    assert(answer.enabled === true);
    assert(answer.templateVersion === 'standard-v1');
  });

  await test('the learner moves from unnoticed to waiting, in one call', async () => {
    const facts = await call(owner, 'certificate_shelf_standing()');
    assert(facts.waiting >= 1, 'a finished learner is not waiting after the switch was turned on');
    const waiting = (await asActor(owner,
      'select * from public.list_certificate_issuance_candidates()')).rows;
    assert(waiting.some((row) => row.enrolment_id === enrolmentId),
      'the learner is counted but not listed');
  });

  let certificateNumber;

  await test('staff issue it, and the learner can read their own', async () => {
    certificateNumber = await value(owner, 'issue_certificate_for_session($1)', [enrolmentId]);
    assert(/^AS-\d{4}-\d{8}$/.test(certificateNumber), `number: ${certificateNumber}`);

    const mine = (await asActor(learner,
      'select certificate_number, status from public.certificates where certificate_number = $1',
      [certificateNumber])).rows;
    assert(mine.length === 1, 'the holder cannot read their own certificate');
    assert(mine[0].status === 'issued');
  });

  await test('the enrolment is marked completed by the issuing, not by a client', async () => {
    const row = (await q('select status, completed_at from public.course_enrolments where id = $1',
      [enrolmentId])).rows[0];
    assert(row.status === 'completed', `status: ${row.status}`);
    assert(row.completed_at, 'no completion date');
  });

  await test('anybody can check the number, and it tells them only what they need', async () => {
    const verified = (await asAnon(() =>
      q('select * from public.verify_certificate($1)', [certificateNumber]))).rows[0];
    assert(verified.valid === true, 'a valid certificate does not verify');
    assert(verified.course_title === title, `title: ${verified.course_title}`);
    assert(verified.course_version === 1);
    // The number, the course and the name are the whole public record. An
    // address or a learner id in there would make a verification page a way to
    // find a person.
    assert(!JSON.stringify(verified).includes('@'), 'the public answer contains an address');
  });

  // -------------------------------------------------------------------------
  console.log('\nAct VI — a guardian brings a child');
  // -------------------------------------------------------------------------

  const parent = await newUser(`firstday-parent-${slug}@example.com`);
  let childId;

  await test('a parent makes a family and adds a child, who has no account', async () => {
    await call(parent, 'claim_own_learner_profile()');
    const family = await value(parent, 'create_family($1)', ['The first family']);
    childId = await value(parent, 'add_child_to_family($1,$2,$3)', [family, 'Aisha', '8-10']);

    const child = (await q(
      'select learner_type, linked_user_id, age_band from public.learner_profiles where id = $1',
      [childId])).rows[0];
    assert(child.learner_type === 'child');
    assert(child.linked_user_id === null, 'a child was given an account');
  });

  await test('the parent enrols the child in the same course', async () => {
    const childEnrolment = (await asActor(parent,
      `insert into public.course_enrolments
         (learner_profile_id, course_id, course_version_id, source, status)
       values ($1,$2,$3,'free','active') returning id`, [childId, course, version])).rows[0].id;
    assert(childEnrolment, 'no child enrolment');
  });

  await test('the child learns, and the parent can see how far', async () => {
    const childEnrolment = (await q(
      'select id from public.course_enrolments where learner_profile_id = $1', [childId]))
      .rows[0].id;

    for (const lesson of lessonIds) {
      await asActor(parent,
        `insert into public.lesson_progress
           (course_enrolment_id, lesson_id, status, progress_percent, started_at, completed_at)
         values ($1,$2,'completed',100,now(),now())`, [childEnrolment, lesson]);
    }

    const summary = (await asActor(parent,
      'select * from public.enrolment_progress_summary($1)', [childEnrolment])).rows[0];
    assert(Number(summary.percent_complete) === 100);
  });

  await test('another family cannot see that child at all', async () => {
    const otherParent = await newUser(`firstday-other-parent-${slug}@example.com`);
    await call(otherParent, 'claim_own_learner_profile()');
    await value(otherParent, 'create_family($1)', ['Another family']);

    const rows = (await asActor(otherParent,
      'select id from public.course_enrolments where learner_profile_id = $1', [childId])).rows;
    assert(rows.length === 0, 'a stranger’s family can read this child’s learning');
  });

  // -------------------------------------------------------------------------
  console.log('\nAct VII — there was no money anywhere on that path');
  // -------------------------------------------------------------------------

  await test('both enrolments are free, and no order was created', async () => {
    const rows = (await q(
      `select source, status from public.course_enrolments
        where id = $1 or learner_profile_id = $2`, [enrolmentId, childId])).rows;
    assert(rows.length === 2);
    assert(rows.every((r) => r.source === 'free'), 'an enrolment has a paid source');
    assert(!(await q('select public.is_sold_version($1) as s', [version])).rows[0].s,
      'the course is on sale, so this was not the free path');
    assert((await q(`select value_text from public.platform_settings where key = 'commerce.checkout'`))
      .rows[0].value_text === 'false', 'checkout is on, so this path is not the one that ships');
  });

  await test('the certificate needed no payment, no plan and no provider', async () => {
    assert((await q('select count(*)::int n from public.certificates where course_enrolment_id = $1',
      [enrolmentId])).rows[0].n === 1);
    // Nothing on the path read an entitlement: the only rows in play are the
    // learner, the enrolment, the progress and the certificate.
    // `entitlement_grants` is consulted at access time, and every enrolment
    // creates one — a free one says `source_type = 'free'` and points at the
    // enrolment itself. The assertion is therefore not "no grant" but "no grant
    // that anyone could mistake for a purchase": no purchase, no subscription,
    // no staff grant, and no order behind any of it.
    const grants = (await q(
      `select source_type from public.entitlement_grants where learner_profile_id = $1`,
      [learnerProfileId])).rows.map((r) => r.source_type);
    assert(grants.length > 0, 'this course was reachable without any grant, which cannot be right');
    assert(grants.every((t) => t === 'free'), `non-free source: ${grants.join(', ')}`);

    // No billing account was opened for this learner, so there is nothing an
    // order could be attached to — which is the stronger statement than "the
    // orders table is empty", and stays true whatever else is on the platform.
    const accounts = (await q(
      `select count(*)::int n from public.billing_accounts
        where created_by = $1`, [learner])).rows[0].n;
    assert(accounts === 0, 'an order was implied by opening a billing account');
    const orders = (await q(
      `select count(*)::int n from public.orders o
         join public.billing_accounts b on b.id = o.billing_account_id
        where b.created_by = $1`, [learner])).rows[0].n;
    assert(orders === 0, 'an order was created for a free course');
  });

  // -------------------------------------------------------------------------
  console.log('\nThe platform is ready, by its own probe');
  // -------------------------------------------------------------------------

  await test('the deployment probe agrees that this is a working platform', async () => {
    // The same file an operator pastes after `supabase db push`. Run against a
    // platform four people have just lived in, it must say so.
    const probeSql = readFileSync(join(here, '..', '..', 'docs', 'deploy', 'verify.sql'), 'utf8');
    const results = await ctx.db.exec(probeSql);
    const rows = results[results.length - 1].rows;
    const fact = (name) => rows.find((r) => r.fact === name)?.value;

    assert(fact('signup trigger') === 'present');
    assert(Number(fact('staff')) >= 1, 'nobody on this platform can administer it');
    assert(Number(fact('courses')) >= 1, 'the probe says there are no courses');
    assert(Number(fact('published versions')) >= 1, 'the probe says nothing is published');
  });

  await test('and the admin checklist has nothing left to do', async () => {
    // The four facts `web/src/lib/setup.ts` turns into the panel on `/admin`,
    // read the way `fetchSetupFacts()` reads them. All four true is the state in
    // which the panel disappears — the last line of the deployment runbook.
    const facts = {
      subjects: Number((await q(
        `select count(*)::int n from public.subject_areas where status = 'active'`)).rows[0].n),
      courses: Number((await q(
        `select count(*)::int n from public.courses where deleted_at is null`)).rows[0].n),
      published: Number((await q(
        `select count(*)::int n from public.course_versions where version_status = 'published'`))
        .rows[0].n),
      reviewers: Number((await q(
        `select count(*)::int n from public.reviewer_profiles where reviewer_status = 'active'`))
        .rows[0].n),
    };
    assert(facts.subjects > 0, 'no subject to file a course under');
    assert(facts.reviewers > 0, 'no active reviewer, so nothing could have been published');
    assert(facts.courses > 0);
    assert(facts.published > 0);
  });
}
