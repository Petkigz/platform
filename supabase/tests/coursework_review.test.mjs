// Somebody looked at the file, and the platform can say who.
//
// The gap this suite is written around was one sentence wide and total: a child's
// uploaded file is confirmed by the uploader and attached to their own draft, and
// **no member of staff ever sees it or records having looked**. So the platform
// could not answer the question a safeguarding lead is actually asked — "who has
// seen my child's photograph?" — and nothing was inconsistent, only absent.
//
// Four acts:
//
//   I.   Who may review, and the three refusals that matter: the family that sent
//        the file, a stranger, and student staff who can see the queue but not the
//        file.
//   II.  What a review is: an event, append-only, with words when it is a concern.
//   III. Who is told. The marker and staff see the state; the household does not,
//        because "concern" on a child's own hand-in is a message with no context.
//   IV.  What it never does: gate a file, or die with it.

export async function run(ctx) {
  const {
    q, test, assert, committed,
    newUser, newProfile, bootstrapAdmin, newInstructor, newReviewer, satisfyReview,
    newCourse, newVersion, newSection, newLesson,
  } = ctx;

  const owner = await bootstrapAdmin('coursework-review-owner@example.com');
  const otherTeacher = await newInstructor('coursework-review-other@example.com', owner);
  const teacher = await newInstructor('coursework-review-teacher@example.com', owner);
  const reviewer = await newReviewer('coursework-review-reviewer@example.com', owner);
  const agent = await newUser('coursework-review-agent@example.com');
  await newProfile(agent, 'Musa Kigozi');
  await committed(() => ctx.grantRole(agent, 'support_agent', owner));

  const scalar = async (sql, params = []) => (await q(sql, params)).rows[0];

  async function asActor(actor, fn) {
    await q('begin');
    await q("select set_config('request.jwt.claims',$1,true)",
      [JSON.stringify({ sub: actor, role: 'authenticated' })]);
    await q('set local role authenticated');
    try {
      const result = await fn();
      await q('commit');
      return result;
    } catch (e) {
      await q('rollback');
      throw e;
    }
  }

  const call = async (actor, sql, params = []) =>
    (await asActor(actor, () => q(sql, params))).rows[0];

  async function refuses(pattern, fn) {
    let caught;
    try { await fn(); } catch (e) { caught = e; }
    assert(caught, `expected an error matching ${pattern}`);
    const message = String(caught.message ?? caught);
    assert(pattern.test(message), `expected ${pattern}; got: ${message.slice(0, 240)}`);
  }

  const transition = (versionId, status, actor) =>
    q('select id from public.set_course_version_status($1,$2,$3,$4)',
      [versionId, status, actor, 'coursework review test']);

  async function publishedCourse() {
    const course = await newCourse(teacher, { status: 'active' });
    const version = await newVersion(course, teacher);
    const section = await newSection(version);
    await newLesson(section);
    await transition(version, 'submitted', teacher);
    await transition(version, 'approved', reviewer);
    await satisfyReview(version, reviewer, owner);
    await transition(version, 'published', owner);
    return { course, version };
  }

  const { course, version } = await publishedCourse();

  await q("update public.platform_settings set value_text='true' where key='learning.assignments'");
  await q("update public.platform_settings set value_text='true' where key='learning.cohorts'");

  const assignment = (await call(teacher,
    'select public.create_course_assignment($1,$2,$3,$4,$5,$6,$7,$8) as id', [
      version, null, 'Photograph your handwriting', 'One page, in your own hand.',
      7, null, false, 10,
    ])).id;
  await call(teacher, 'select public.set_course_assignment_status($1,$2)', [assignment, 'open']);

  let seq = 0;
  /** A household: a guardian account and a child profile with no login. */
  async function household() {
    seq += 1;
    const guardian = await newUser(`coursework-review-parent-${seq}@example.com`);
    await newProfile(guardian, `Guardian ${seq}`);
    const childId = await committed(async () => {
      const familyId = (await q(
        `insert into public.families (name, created_by, status)
         values ($1,$2,'active') returning id`, [`Review family ${seq}`, guardian])).rows[0].id;
      await q(
        `insert into public.family_memberships
           (family_id, user_id, membership_type, status, joined_at, created_by)
         values ($1,$2,'owner','active',now(),$3)`, [familyId, guardian, guardian]);
      const id = (await q(
        `insert into public.learner_profiles
           (display_name, learner_type, age_band, family_id, status)
         values ($1,'child','8-10',$2,'active') returning id`, [`Child ${seq}`, familyId])).rows[0].id;
      await q(
        `insert into public.course_enrolments
           (learner_profile_id, course_id, course_version_id, source, status)
         values ($1,$2,$3,'free','active')`, [id, course, version]);
      return id;
    });
    return { guardian, childId };
  }

  const digest = () => crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');

  /** A child's photograph, handed in and confirmed. */
  async function handedIn() {
    const { guardian, childId } = await household();
    const submission = (await call(guardian, 'select public.save_assignment_draft($1,$2,$3) as id',
      [assignment, childId, 'My page.'])).id;
    const declared = await call(guardian,
      'select * from public.register_coursework_upload($1,$2,$3,$4,$5)',
      [submission, 'Page one.jpg', 'image/jpeg', 1_800_000, digest()]);
    await call(guardian, 'select public.confirm_coursework_upload($1) as id', [declared.asset_id]);
    await call(guardian, 'select public.submit_assignment($1)', [submission]);
    return { guardian, childId, submission, asset: declared.asset_id };
  }

  const review = async (actor, asset, decision, note = null) =>
    (await call(actor, 'select public.record_coursework_review($1,$2,$3) as r',
      [asset, decision, note])).r;

  // -------------------------------------------------------------------------
  console.log('\nAct I — who may look, and who may say they did');
  // -------------------------------------------------------------------------

  await test('the teacher the work was handed to records a clear review', async () => {
    const row = await handedIn();
    const out = await review(teacher, row.asset, 'clear');
    assert(out.recorded === true, 'the review was not recorded');
    assert(out.decision === 'clear');

    const stored = await scalar(
      `select decision, note, reviewed_by, reviewed_at
         from public.coursework_file_reviews where asset_id = $1`, [row.asset]);
    assert(stored.decision === 'clear', `decision ${stored.decision}`);
    assert(stored.note === null, 'a clear review grew a note nobody wrote');
    assert(stored.reviewed_by === teacher, 'the review was not written in the reviewer\'s name');
  });

  await test('the family that sent the file cannot vouch for it', async () => {
    const row = await handedIn();
    // The guardian acts for a child profile with no login of its own, which is how
    // every child hands work in today.
    await refuses(/family that sent a file/, () => review(row.guardian, row.asset, 'clear'));
  });

  await test('another teacher cannot review what was not handed to them', async () => {
    const row = await handedIn();
    await refuses(/only the teacher the work was handed to/, () =>
      review(otherTeacher, row.asset, 'clear'));
  });

  await test('staff may review, because an incident may need somebody outside the course', async () => {
    const row = await handedIn();
    const out = await review(agent, row.asset, 'clear');
    assert(out.recorded === true, 'a support agent could not record a review');
  });

  // -------------------------------------------------------------------------
  console.log('\nAct II — what a review is');
  // -------------------------------------------------------------------------

  await test('a concern has to carry a sentence; a clear does not', async () => {
    const row = await handedIn();
    await refuses(/needs a sentence/, () => review(teacher, row.asset, 'concern'));
    await refuses(/needs a sentence/, () => review(teacher, row.asset, 'concern', 'ok'));

    const out = await review(teacher, row.asset, 'concern', 'One page is a photograph of a screen, not handwriting.');
    assert(out.decision === 'concern');
    const stored = await scalar('select note from public.coursework_file_reviews where asset_id = $1',
      [row.asset]);
    assert(stored.note.startsWith('One page'), `note ${stored.note}`);
  });

  await test('the same person saying the same thing twice is one review', async () => {
    const row = await handedIn();
    const first = await review(teacher, row.asset, 'clear');
    const second = await review(teacher, row.asset, 'clear');
    assert(first.id === second.id, 'a double click became two reviews');
    assert(second.recorded === false, 'the second call claimed to have recorded something new');

    const count = (await scalar(
      'select count(*)::int n from public.coursework_file_reviews where asset_id = $1',
      [row.asset])).n;
    assert(count === 1, `${count} reviews for one file`);
  });

  await test('changing the mind is a second review, and both survive', async () => {
    const row = await handedIn();
    await review(teacher, row.asset, 'concern', 'The image looks like a photograph of a screen.');
    await review(teacher, row.asset, 'clear', 'Resolved with the family.');

    const rows = (await q(
      'select decision, note from public.coursework_file_reviews where asset_id = $1 order by reviewed_at, id',
      [row.asset])).rows;
    assert(rows.length === 2, `${rows.length} reviews recorded`);
    assert(rows[0].decision === 'concern' && rows[1].decision === 'clear');

    // The latest is the state, which is what every screen reads.
    const state = await scalar('select decision from public.coursework_file_state where asset_id = $1',
      [row.asset]);
    assert(state.decision === 'clear', `latest state ${state.decision}`);
  });

  await test('a review is not edited and not deleted, by anybody', async () => {
    const row = await handedIn();
    await review(teacher, row.asset, 'clear');

    await refuses(/record of what somebody saw/, () =>
      q('update public.coursework_file_reviews set decision = $2 where asset_id = $1',
        [row.asset, 'concern']));
    await refuses(/record of what somebody saw/, () =>
      q('delete from public.coursework_file_reviews where asset_id = $1', [row.asset]));
  });

  await test('a file still arriving, and a file that went, have nothing to review', async () => {
    const { guardian, childId } = await household();
    const submission = (await call(guardian, 'select public.save_assignment_draft($1,$2,$3) as id',
      [assignment, childId, 'Draft.'])).id;
    const declared = await call(guardian,
      'select * from public.register_coursework_upload($1,$2,$3,$4,$5)',
      [submission, 'Arriving.jpg', 'image/jpeg', 400_000, digest()]);

    await refuses(/nothing to look at yet/, () =>
      review(teacher, declared.asset_id, 'clear'));

    await call(guardian, 'select public.confirm_coursework_upload($1) as id', [declared.asset_id]);
    await call(guardian, 'select public.submit_assignment($1)', [submission]);
    await committed(() => q('delete from public.assignment_submissions where id = $1', [submission]));

    await refuses(/has been deleted/, () => review(teacher, declared.asset_id, 'clear'));
  });

  // -------------------------------------------------------------------------
  console.log('\nAct III — who is told, and who is not');
  // -------------------------------------------------------------------------

  await test('the marker is told what state a file is in', async () => {
    const row = await handedIn();
    const before = (await call(teacher, 'select public.assignment_submission_files($1) as f',
      [row.submission])).f;
    assert(before[0].review === 'none', `review ${before[0].review}`);

    await review(teacher, row.asset, 'concern', 'A photograph of somebody else, not the learner’s work.');
    const after = (await call(teacher, 'select public.assignment_submission_files($1) as f',
      [row.submission])).f;
    assert(after[0].review === 'concern', `review ${after[0].review}`);
    assert(after[0].reviewedAt, 'the marker is not told when the review happened');
  });

  await test('the household is told nothing about reviews — the keys are not there at all', async () => {
    const row = await handedIn();
    await review(teacher, row.asset, 'concern', 'A photograph of somebody else, not the learner’s work.');

    const seen = (await call(row.guardian, 'select public.assignment_submission_files($1) as f',
      [row.submission])).f;
    assert(seen.length === 1, 'the family cannot see their own file');
    assert(!('review' in seen[0]), 'the family was told a teacher marked a concern');
    assert(!('reviewedAt' in seen[0]), 'the family was told when a review happened');
  });

  // -------------------------------------------------------------------------
  console.log('\nAct IV — what a review never does');
  // -------------------------------------------------------------------------

  await test('reviewing gates nothing: the marker opens a file nobody reviewed', async () => {
    const row = await handedIn();
    const watched = await call(teacher, 'select public.may_watch_master($1) as w', [row.asset]);
    assert(watched.w === true, 'an unreviewed file could not be opened by the marker');
  });

  await test('the review survives the file it was about', async () => {
    const row = await handedIn();
    await review(owner, row.asset, 'concern', 'Kept for the safeguarding record.');

    await committed(() => q('delete from public.assignment_submissions where id = $1', [row.submission]));

    const kept = await scalar('select decision from public.coursework_file_reviews where asset_id = $1',
      [row.asset]);
    assert(kept.decision === 'concern', 'the review died with the file');

    const watched = await call(teacher, 'select public.may_watch_master($1) as w', [row.asset]);
    assert(watched.w === false, 'a deleted file could still be watched because it had been reviewed');
  });

  await test('the staff queue puts unreviewed first and says nothing is waiting behind it', async () => {
    const row = await handedIn();

    const summary = await call(owner, 'select public.coursework_review_summary() as s');
    assert(summary.s.files >= 1, `files ${summary.s.files}`);
    assert(summary.s.unreviewed >= 1, 'the unreviewed file is not counted');
    assert(summary.s.gates === false, 'the summary claims a review gates a file');
    assert(summary.s.reviewsOutlivingFiles >= 1, 'a review that outlives its file is not counted');

    const queue = (await call(owner, 'select public.coursework_review_queue(200) as q')).q;
    const firstReviewedAt = queue.findIndex((f) => f.review !== 'none');
    const lastUnreviewedAt = queue.map((f) => f.review).lastIndexOf('none');
    if (firstReviewedAt !== -1 && lastUnreviewedAt !== -1) {
      assert(lastUnreviewedAt < firstReviewedAt, 'a reviewed file was listed above an unreviewed one');
    }

    const listed = queue.find((f) => f.assetId === row.asset);
    assert(listed, 'the new file is not in the queue');
    assert(listed.learnerName && listed.fileName, 'the queue cannot name what it is asking about');
  });

  await test('the queue and the summary are staff-only', async () => {
    await refuses(/coursework:not_allowed/, () =>
      call(teacher, 'select public.coursework_review_summary() as s'));
    await refuses(/coursework:not_allowed/, () =>
      call(teacher, 'select public.coursework_review_queue(10) as q'));
    await refuses(/coursework:not_allowed/, () =>
      call(otherTeacher, 'select public.coursework_review_summary() as s'));
  });
}
