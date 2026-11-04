// Handing in a file.
//
// The whole point of this feature is the shape of the permission, so almost every
// test here is about what each of the three people involved may do, and where the
// door that lets a learner confirm their own file stops:
//
//   the learner      declares a file for their own draft, sends it, confirms it,
//                    and can then read it back — but only that file, and only
//                    while the draft is open;
//   the guardian     the same, for a child in their family, because a child
//                    profile has no login;
//   the teacher      reads every file handed in on their own course, and cannot
//                    reach one handed in on anybody else's;
//   everybody else   nothing. Not the names, not the sizes, not the bytes.
//
// Then the two structural promises that make the narrow door safe:
//
//   * a coursework file can never be taught from — a lesson resource pointing at
//     one is refused by a trigger, not by a convention;
//   * the self-confirm path cannot be used to promote a library file, and the
//     staff-only path is still the only way a file becomes teachable.
//
// And the limits, which are checked where they are cheap: before the transfer
// rather than after it.

export async function run(ctx) {
  const {
    q, test, assert, committed,
    newUser, newProfile, bootstrapAdmin, newInstructor, newReviewer, satisfyReview,
    newCourse, newVersion, newSection, newLesson,
  } = ctx;

  const admin = await bootstrapAdmin('coursework-admin@example.com');
  const teacher = await newInstructor('coursework-teacher@example.com', admin);
  const otherTeacher = await newInstructor('coursework-other-teacher@example.com', admin);
  const reviewer = await newReviewer('coursework-reviewer@example.com', admin);

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

  async function refused(actor, sql, params = [], pattern) {
    await q('begin');
    await q("select set_config('request.jwt.claims',$1,true)",
      [actor === null ? '' : JSON.stringify({ sub: actor, role: 'authenticated' })]);
    await q('set local role authenticated');
    await q('savepoint coursework_refusal');
    let caught;
    try { await q(sql, params); } catch (e) { caught = e; }
    await q('rollback to savepoint coursework_refusal');
    await q('rollback');
    assert(caught, `expected an error matching ${pattern}`);
    const message = String(caught.message ?? caught);
    assert(pattern.test(message), `expected ${pattern}; got: ${message.slice(0, 240)}`);
  }

  /**
   * The same assertion, for a call already wrapped in its own transaction — the
   * helpers above open one per call, so a refusal is caught and rolled back here
   * rather than inside `refused()`.
   */
  async function refuses(pattern, fn) {
    // No transaction here: every helper above opens and rolls back its own, and
    // a second `begin` around one would roll back this frame's work instead.
    let caught;
    try { await fn(); } catch (e) { caught = e; }
    assert(caught, `expected an error matching ${pattern}`);
    const message = String(caught.message ?? caught);
    assert(pattern.test(message), `expected ${pattern}; got: ${message.slice(0, 240)}`);
  }

  const transition = (versionId, status, actor) =>
    q('select id from public.set_course_version_status($1,$2,$3,$4)',
      [versionId, status, actor, 'coursework test']);

  async function publishedCourse(author = teacher) {
    const course = await newCourse(author, { status: 'active' });
    const version = await newVersion(course, author);
    const section = await newSection(version);
    await newLesson(section);
    await transition(version, 'submitted', author);
    await transition(version, 'approved', reviewer);
    await satisfyReview(version, reviewer, admin);
    await transition(version, 'published', admin);
    return { course, version };
  }

  let seq = 0;
  async function learner(name, enrolIn) {
    seq += 1;
    const userId = await newUser(`coursework-learner-${seq}@example.com`);
    await newProfile(userId, `${name} ${seq}`);
    const learnerId = await committed(async () => {
      const id = (await q(
        `insert into public.learner_profiles (display_name, learner_type, age_band, linked_user_id)
         values ($1,'adult','18+',$2) returning id`, [`${name} ${seq}`, userId])).rows[0].id;
      if (enrolIn) {
        await q(
          `insert into public.course_enrolments
             (learner_profile_id, course_id, course_version_id, source, status)
           values ($1,$2,$3,'free','active')`, [id, enrolIn.course, enrolIn.version]);
      }
      return id;
    });
    return { userId, learnerId };
  }

  async function parentWithChild(enrolIn) {
    seq += 1;
    const userId = await newUser(`coursework-parent-${seq}@example.com`);
    await newProfile(userId, `Parent ${seq}`);
    const childId = await committed(async () => {
      const familyId = (await q(
        `insert into public.families (name, created_by, status)
         values ($1,$2,'active') returning id`, [`Coursework family ${seq}`, userId])).rows[0].id;
      await q(
        `insert into public.family_memberships
           (family_id, user_id, membership_type, status, joined_at, created_by)
         values ($1,$2,'owner','active',now(),$3)`, [familyId, userId, userId]);
      const id = (await q(
        `insert into public.learner_profiles
           (display_name, learner_type, age_band, family_id, status)
         values ($1,'child','8-10',$2,'active') returning id`, [`Child ${seq}`, familyId])).rows[0].id;
      await q(
        `insert into public.course_enrolments
           (learner_profile_id, course_id, course_version_id, source, status)
         values ($1,$2,$3,'free','active')`, [id, enrolIn.course, enrolIn.version]);
      return id;
    });
    return { userId, childId };
  }

  const SQL_CREATE = `select public.create_course_assignment(
    $1,$2,$3,$4,$5,$6,$7,$8) as id`;
  const SQL_STATUS = 'select public.set_course_assignment_status($1,$2)';
  const SQL_SAVE = 'select public.save_assignment_draft($1,$2,$3) as id';
  // Column list rather than the composite: a named composite type arrives as
  // raw text over the wire, and a test that parsed it would be testing a parser.
  const SQL_DECLARE = `select * from public.register_coursework_upload($1,$2,$3,$4,$5)`;
  const SQL_CONFIRM = 'select public.confirm_coursework_upload($1) as id';
  const SQL_FILES = 'select public.assignment_submission_files($1) as f';
  const SQL_WATCH = 'select public.may_watch_master($1) as w';
  const SQL_SUBMIT = 'select public.submit_assignment($1)';

  const digest = () => crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');

  const create = async (author, version, input = {}) => {
    const id = (await call(author, SQL_CREATE, [
      version,
      input.cohortId ?? null,
      input.title ?? 'Photograph your handwriting',
      input.instructions ?? 'One page, in your own hand.',
      input.dueAfterDays ?? 7,
      input.dueAt ?? null,
      input.acceptLate ?? false,
      input.pointsPossible ?? 10,
    ])).id;
    await call(author, SQL_STATUS, [id, 'open']);
    return id;
  };

  const draft = async (actor, assignmentId, learnerId, body = '') =>
    (await call(actor, SQL_SAVE, [assignmentId, learnerId, body])).id;

  const declare = async (actor, submissionId, over = {}) =>
    call(actor, SQL_DECLARE, [
      submissionId,
      over.name ?? 'Page one.jpg',
      over.mime ?? 'image/jpeg',
      over.size ?? 1_800_000,
      over.checksum ?? digest(),
    ]);

  /** A task of its own, so a test that closes or opens one cannot disturb another. */
  const freshAssignment = async (author = teacher, over = {}) =>
    create(author, version, { title: over.title ?? `Task ${++seq}`, ...over });

  const { course, version } = await publishedCourse();

  await q("update public.platform_settings set value_text='true' where key='learning.assignments'");
  await q("update public.platform_settings set value_text='true' where key='learning.cohorts'");

  const assignment = await create(teacher, version);

  // -------------------------------------------------------------------------
  console.log('\nAct I — declaring a file, before any byte moves');
  // -------------------------------------------------------------------------

  await test('a declared file is the learner\'s own, pending, and named', async () => {
    const who = await learner('Declarer', { course, version });
    const submission = await draft(who.userId, assignment, who.learnerId);

    const target = await declare(who.userId, submission);
    assert(target.asset_id, 'no asset id');
    assert(target.master_bucket === 'ayahspring-masters', `bucket ${target.master_bucket}`);
    // Derived from the row's own id, so it cannot be aimed at anybody else's object.
    assert(target.master_key === `${target.asset_id}/image-jpeg`, `key ${target.master_key}`);

    const row = await scalar(
      `select purpose, status, uploaded_by, display_name, byte_size
         from public.media_assets where id = $1`, [target.asset_id]);
    assert(row.purpose === 'coursework', `purpose ${row.purpose}`);
    assert(row.status === 'pending', `status ${row.status}`);
    assert(row.uploaded_by === who.userId, 'the row was not written in the uploader\'s name');
    assert(row.display_name === 'Page one.jpg', `name ${row.display_name}`);
    assert(Number(row.byte_size) === 1_800_000);

    // Declared, and not yet attached: nothing here claims the file arrived.
    const attached = (await scalar(
      `select count(*)::int n from public.assignment_submission_assets
        where media_asset_id = $1`, [target.asset_id])).n;
    assert(attached === 0, 'a file that had not arrived was attached');
  });

  await test('the limits fire before the transfer, not after it', async () => {
    const who = await learner('Limits', { course, version });
    const submission = await draft(who.userId, assignment, who.learnerId);

    // 25 MiB exactly is allowed; one byte over is refused. The learner learns
    // this in the file picker sentence rather than after a long upload.
    await declare(who.userId, submission, { size: 26_214_400 });
    await refuses(/cannot exceed 25 MiB/i,
      () => declare(who.userId, submission, { size: 26_214_401 }));
    await refuses(/file type is not supported/i,
      () => declare(who.userId, submission, { mime: 'video/mp4' }));
    await refuses(/checksum/i,
      () => declare(who.userId, submission, { checksum: 'nope' }));
    await refuses(/needs a name/i,
      () => declare(who.userId, submission, { name: '   ' }));
  });

  await test('library attachments are refused and coursework still respects the size boundary', async () => {
    // A library item is not a private coursework upload, even at the size cap.
    const who = await learner('Boundary', { course, version });
    const submission = await draft(who.userId, assignment, who.learnerId);

    const atCap = await q(
      `insert into public.media_assets
         (storage_backend, master_bucket, master_key, checksum, mime_type, byte_size, status, uploaded_by)
       values ('r2','masters',$1,$2,'application/pdf',$3,'available',$4) returning id`,
      [`boundary/${crypto.randomUUID()}`, digest(), 26_214_400, who.userId]);
    await refused(who.userId, 'select public.attach_assignment_asset($1,$2)', [submission, atCap.rows[0].id], /must be declared coursework/i);
    const declared = await declare(who.userId, submission, { size: 26_214_400, mime: 'application/pdf' });
    await call(who.userId, SQL_CONFIRM, [declared.asset_id]);

    const overCap = await q(
      `insert into public.media_assets
         (storage_backend, master_bucket, master_key, checksum, mime_type, byte_size, status, uploaded_by)
       values ('r2','masters',$1,$2,'application/pdf',$3,'available',$4) returning id`,
      [`boundary/${crypto.randomUUID()}`, digest(), 26_214_401, who.userId]);
    await refused(who.userId,
      'select public.attach_assignment_asset($1,$2)', [submission, overCap.rows[0].id],
      /cannot exceed 25 MiB/i);

    // And the new door refuses the same two files for the same reason.
    await refuses(/cannot exceed 25 MiB/i,
      () => declare(who.userId, submission, { size: 26_214_401 }));
    assert(await scalar('select public.coursework_max_bytes() as b').b === '26214400'
      || Number((await scalar('select public.coursework_max_bytes() as b')).b) === 26_214_400);
  });

  await test('the ten-file cap is refused at the eleventh, not at the hand-in', async () => {
    const who = await learner('Ten Files', { course, version });
    const submission = await draft(who.userId, assignment, who.learnerId);
    for (let i = 0; i < 10; i += 1) {
      const target = await declare(who.userId, submission, { name: `Page ${i + 1}.jpg` });
      await call(who.userId, SQL_CONFIRM, [target.asset_id]);
    }
    await refuses(/at most 10 files/i,
      () => declare(who.userId, submission, { name: 'Page 11.jpg' }));
  });

  await test('a stranger cannot declare a file against somebody else’s draft', async () => {
    const who = await learner('Somebody', { course, version });
    const outsider = await learner('Stranger', { course, version });
    const submission = await draft(who.userId, assignment, who.learnerId);

    await refused(outsider.userId, SQL_DECLARE,
      [submission, 'x.pdf', 'application/pdf', 1000, digest()],
      /learner you are responsible for/i);
  });

  // -------------------------------------------------------------------------
  console.log('\nAct II — the narrower door');
  // -------------------------------------------------------------------------

  await test('confirming makes the file available and attaches it, in one step', async () => {
    const who = await learner('Hands In', { course, version });
    const submission = await draft(who.userId, assignment, who.learnerId);
    const target = await declare(who.userId, submission);

    const attachmentId = (await call(who.userId, SQL_CONFIRM, [target.asset_id])).id;
    assert(attachmentId, 'no attachment id');

    const asset = await scalar('select status, purpose from public.media_assets where id = $1',
      [target.asset_id]);
    assert(asset.status === 'available', `status ${asset.status}`);
    assert(asset.purpose === 'coursework');

    const attached = await scalar(
      `select submission_id, attached_by, position from public.assignment_submission_assets
        where id = $1`, [attachmentId]);
    assert(attached.submission_id === submission, 'attached to the wrong submission');
    assert(attached.attached_by === who.userId);
    assert(attached.position === 1, `position ${attached.position}`);
  });

  await test('confirming twice is the same file, not a second one', async () => {
    const who = await learner('Retries', { course, version });
    const submission = await draft(who.userId, assignment, who.learnerId);
    const target = await declare(who.userId, submission);

    const first = (await call(who.userId, SQL_CONFIRM, [target.asset_id])).id;
    const second = (await call(who.userId, SQL_CONFIRM, [target.asset_id])).id;
    assert(first === second, 'a retried confirmation produced a second attachment');
    const count = (await scalar(
      `select count(*)::int n from public.assignment_submission_assets
        where submission_id = $1`, [submission])).n;
    assert(count === 1, `${count} attachments after two confirmations`);
  });

  await test('nobody may confirm a file they did not hand in', async () => {
    const who = await learner('Owner', { course, version });
    const outsider = await learner('Meddler', { course, version });
    const submission = await draft(who.userId, assignment, who.learnerId);
    const target = await declare(who.userId, submission);

    await refused(outsider.userId, SQL_CONFIRM, [target.asset_id], /only the uploader/i);
    const still = await scalar('select status from public.media_assets where id = $1',
      [target.asset_id]);
    assert(still.status === 'pending', `a refused confirmation changed the status to ${still.status}`);
  });

  await test('the self-confirm door does not open for a library file', async () => {
    // The staff-only rule for lesson media has to survive this migration. A
    // teacher who uploaded a file to the library cannot mark it available by
    // calling the coursework function on it.
    const row = await q(
      `insert into public.media_assets
         (storage_backend, master_bucket, master_key, checksum, mime_type, byte_size, status, uploaded_by)
       values ('r2','masters',$1,$2,'video/mp4',1000,'pending',$3) returning id`,
      [`library/${crypto.randomUUID()}`, digest(), teacher]);
    await refused(teacher, SQL_CONFIRM, [row.rows[0].id], /not handed in as coursework/i);

    const status = await scalar('select status from public.media_assets where id = $1',
      [row.rows[0].id]);
    assert(status.status === 'pending', 'a library file was promoted without staff');
  });

  await test('staff may confirm a coursework file, for the incident nobody expected', async () => {
    const who = await learner('Incident', { course, version });
    const submission = await draft(who.userId, assignment, who.learnerId);
    const target = await declare(who.userId, submission);

    const attachmentId = (await call(admin, SQL_CONFIRM, [target.asset_id])).id;
    assert(attachmentId, 'staff could not complete a hand-in');
    const status = await scalar('select status from public.media_assets where id = $1',
      [target.asset_id]);
    assert(status.status === 'available');
  });

  // -------------------------------------------------------------------------
  console.log('\nAct III — a coursework file can never be taught from');
  // -------------------------------------------------------------------------

  await test('a lesson cannot point at a handed-in file', async () => {
    const who = await learner('Not Content', { course, version });
    const submission = await draft(who.userId, assignment, who.learnerId);
    const target = await declare(who.userId, submission);
    await call(who.userId, SQL_CONFIRM, [target.asset_id]);

    // The learner's own file is available — and is still refused as lesson
    // content, because the trigger asks what it *is*, not whether it is ready.
    const lesson = (await scalar(
      `select l.id from public.lessons l
         join public.course_sections cs on cs.id = l.section_id
        where cs.course_version_id = $1 limit 1`, [version])).id;
    await refused(teacher,
      `insert into public.lesson_resources
         (lesson_id, resource_type, media_asset_id, display_name, access_classification)
       values ($1,'document',$2,'Handed-in page','enrolled')`,
      [lesson, target.asset_id], /cannot be taught from/i);
  });

  await test('a library file already used in a lesson cannot be attached as coursework', async () => {
    const who = await learner('Teachable library', { course, version });
    const submission = await draft(who.userId, assignment, who.learnerId);
    const asset = (await q(
      `insert into public.media_assets
         (storage_backend, master_bucket, master_key, checksum, mime_type, byte_size, status, uploaded_by)
       values ('r2','masters',$1,$2,'image/jpeg',1000,'available',$3) returning id`,
      [`teachable/${crypto.randomUUID()}`, digest(), who.userId])).rows[0].id;
    const draftVersion = await newVersion(course, teacher, { version_number: 180 + seq });
    const section = await newSection(draftVersion);
    const lesson = await newLesson(section);
    await asActor(teacher, () => q(
      `insert into public.lesson_resources (lesson_id, resource_type, media_asset_id, display_name, access_classification)
       values ($1,'document',$2,'Library page','enrolled')`, [lesson, asset]));
    await refused(who.userId, 'select public.attach_assignment_asset($1,$2)',
      [submission, asset], /must be declared coursework/i);
  });

  await test('a coursework file cannot be attached to a different submission', async () => {
    const who = await learner('Separate submissions', { course, version });
    const first = await draft(who.userId, assignment, who.learnerId);
    const secondAssignment = await create(teacher, version, { title: 'Another assignment' });
    const second = await draft(who.userId, secondAssignment, who.learnerId);
    const declared = await declare(who.userId, first);
    await call(who.userId, SQL_CONFIRM, [declared.asset_id]);
    await refused(who.userId, 'select public.attach_assignment_asset($1,$2)',
      [second, declared.asset_id], /must be declared coursework/i);
  });

  await test('a library file is still refused to a lesson until staff confirm it', async () => {
    const row = await q(
      `insert into public.media_assets
         (storage_backend, master_bucket, master_key, checksum, mime_type, byte_size, status, uploaded_by, display_name)
       values ('r2','masters',$1,$2,'application/pdf',1000,'pending',$3,'Worksheet') returning id`,
      [`library/${crypto.randomUUID()}`, digest(), teacher]);
    // A draft version, because a published one is frozen (D5) and would refuse
    // the insert for a reason that has nothing to do with this test.
    const draftVersion = await newVersion(course, teacher, { version_number: 90 + seq });
    const section = await newSection(draftVersion);
    const lesson = await newLesson(section);

    // A pending library file is teachable from the moment it is confirmed, and
    // the trigger does not change that. What must not change is who confirms it.
    await call(admin, 'select public.confirm_media_upload($1) as ok', [row.rows[0].id]);
    await asActor(teacher,
      () => q(`insert into public.lesson_resources
                 (lesson_id, resource_type, media_asset_id, display_name, access_classification)
               values ($1,'document',$2,'Worksheet','enrolled')`, [lesson, row.rows[0].id]));
    const used = (await scalar(
      `select count(*)::int n from public.lesson_resources where media_asset_id = $1`,
      [row.rows[0].id])).n;
    assert(used === 1, 'a confirmed library file could not be taught from');
  });

  // -------------------------------------------------------------------------
  console.log('\nAct IV — who can read what was handed in');
  // -------------------------------------------------------------------------

  let sharedSubmission;
  let sharedAsset;
  let ownerUser;

  await test('the learner and the course author can both list the file, and a stranger cannot', async () => {
    const who = await learner('Readable', { course, version });
    const outsider = await learner('Unrelated', { course, version });
    const submission = await draft(who.userId, assignment, who.learnerId, 'My page is attached.');
    const target = await declare(who.userId, submission, { name: 'Surah practice.jpg' });
    await call(who.userId, SQL_CONFIRM, [target.asset_id]);

    const mine = (await call(who.userId, SQL_FILES, [submission])).f;
    assert(Array.isArray(mine) && mine.length === 1, `learner saw ${JSON.stringify(mine)}`);
    assert(mine[0].name === 'Surah practice.jpg', `name ${mine[0].name}`);
    assert(mine[0].status === 'available');
    assert(mine[0].byteSize === '1800000', `size ${mine[0].byteSize}`);
    assert(mine[0].assetId === target.asset_id);

    const teachers = (await call(teacher, SQL_FILES, [submission])).f;
    assert(teachers.length === 1, 'the course author could not see the file');
    assert(teachers[0].name === 'Surah practice.jpg');

    await refused(outsider.userId, SQL_FILES, [submission], /not yours to read/i);
    await refused(otherTeacher, SQL_FILES, [submission], /not yours to read/i);

    sharedSubmission = submission;
    sharedAsset = target.asset_id;
    ownerUser = who.userId;
  });

  await test('a file still arriving is listed, so a reload does not look empty', async () => {
    const who = await learner('Mid Upload', { course, version });
    const submission = await draft(who.userId, assignment, who.learnerId);
    const target = await declare(who.userId, submission, { name: 'Half sent.jpg' });

    const files = (await call(who.userId, SQL_FILES, [submission])).f;
    assert(files.length === 1, `listed ${files.length}`);
    assert(files[0].status === 'pending', `status ${files[0].status}`);
    assert(files[0].attachmentId === null, 'a pending file claimed to be attached');

    // And once it arrives there is still only one entry, not two.
    await call(who.userId, SQL_CONFIRM, [target.asset_id]);
    assert((await call(who.userId, SQL_FILES, [submission])).f.length === 1,
      'the file was listed twice after it arrived');
  });

  await test('a guardian hands in for a child, and can read it back', async () => {
    const family = await parentWithChild({ course, version });
    const submission = await draft(family.userId, assignment, family.childId, 'Recited with baba.');
    const target = await declare(family.userId, submission, { name: 'Recitation.m4a', mime: 'audio/x-m4a' });
    await call(family.userId, SQL_CONFIRM, [target.asset_id]);

    const files = (await call(family.userId, SQL_FILES, [submission])).f;
    assert(files.length === 1 && files[0].name === 'Recitation.m4a');
    assert((await call(teacher, SQL_FILES, [submission])).f.length === 1,
      'the teacher could not see a child\'s hand-in');
  });

  await test('the teacher may watch a handed-in master, and nobody else may', async () => {
    assert((await call(teacher, SQL_WATCH, [sharedAsset])).w === true,
      'the course author cannot open the file they are marking');
    assert((await call(ownerUser, SQL_WATCH, [sharedAsset])).w === true,
      'the learner cannot open their own hand-in');
    assert((await call(admin, SQL_WATCH, [sharedAsset])).w === true,
      'staff cannot open a handed-in file');

    const outsider = await learner('Peeker', { course, version });
    assert((await call(outsider.userId, SQL_WATCH, [sharedAsset])).w === false,
      'an unrelated learner could reach somebody else\'s hand-in');
    assert((await call(otherTeacher, SQL_WATCH, [sharedAsset])).w === false,
      'another teacher could reach a hand-in on a course that is not theirs');
  });

  await test('removing the file closes the door again', async () => {
    const who = await learner('Takes Back', { course, version });
    const submission = await draft(who.userId, assignment, who.learnerId);
    const target = await declare(who.userId, submission);
    await call(who.userId, SQL_CONFIRM, [target.asset_id]);
    assert((await call(teacher, SQL_WATCH, [target.asset_id])).w === true);

    await call(who.userId, 'select public.remove_assignment_asset($1,$2) as r',
      [submission, target.asset_id]);

    assert((await call(teacher, SQL_WATCH, [target.asset_id])).w === false,
      'a removed file could still be read by the teacher');
    assert((await call(who.userId, SQL_WATCH, [target.asset_id])).w === true,
      'the learner lost access to their own upload');
    assert((await call(who.userId, SQL_FILES, [submission])).f.length === 0,
      'a removed file is still listed');
  });

  await test('a file handed in after the deadline window closed is refused, not silently taken', async () => {
    const closing = await freshAssignment();
    const who = await learner('Too Late', { course, version });
    const submission = await draft(who.userId, closing, who.learnerId);
    const target = await declare(who.userId, submission);

    // The teacher closes the task while the transfer is in flight.
    await call(teacher, SQL_STATUS, [closing, 'closed']);
    await refused(who.userId, SQL_CONFIRM, [target.asset_id], /only be attached to an open draft/i);

    const status = await scalar('select status from public.media_assets where id = $1',
      [target.asset_id]);
    assert(status.status === 'pending', 'a file was promoted after the task closed');
  });

  // -------------------------------------------------------------------------
  console.log('\nAct V — the record');
  // -------------------------------------------------------------------------

  await test('declaring and handing in are both audited, without the bytes', async () => {
    const declared = await scalar(
      `select detail from public.governance_audit_events
        where action = 'coursework.upload_declared' and target_id = $1`, [sharedAsset]);
    assert(declared, 'the declaration was not audited');
    assert(declared.detail.submission_id === sharedSubmission,
      `audited the wrong submission: ${JSON.stringify(declared.detail)}`);

    const handedIn = await scalar(
      `select detail from public.governance_audit_events
        where action = 'coursework.file_handed_in' and target_id = $1`, [sharedSubmission]);
    assert(handedIn, 'the hand-in was not audited');
    assert(handedIn.detail.media_asset_id === sharedAsset);
    assert(handedIn.detail.mime_type === 'image/jpeg');
  });

  await test('a draft with only a file and no words can be submitted', async () => {
    // The old path required body text; a photograph with nothing written beside
    // it is a legitimate hand-in, and the database said so before the file could
    // ever arrive.
    const pictureTask = await freshAssignment();
    const who = await learner('Picture Only', { course, version });
    const submission = await draft(who.userId, pictureTask, who.learnerId, '');
    const target = await declare(who.userId, submission);
    await call(who.userId, SQL_CONFIRM, [target.asset_id]);

    await call(who.userId, SQL_SUBMIT, [submission]);
    const row = await scalar('select status from public.assignment_submissions where id = $1',
      [submission]);
    assert(row.status === 'submitted', `status ${row.status}`);
  });
}
