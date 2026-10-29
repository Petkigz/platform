// A licence nobody agreed to binds nobody.
//
// The `teaching` document went in force on 2026-10-28 and said, correctly, that a
// teacher keeps the copyright and gives the platform a licence to store and show
// their course. What it could not do on its own is make anybody agree. This suite
// is about the agreement: who is asked, what happens when they have not, and the
// deliberate fact that the refusal ships switched **off** because taking an
// ability away from a teacher is a decision rather than a default.
//
// Two refusals have to stay distinguishable, and most of these tests exist to keep
// them that way. "You have not agreed" is closed by a button; "nothing is
// published" is closed by the owner, and telling a teacher to agree would send
// them looking for a button that is not there.

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    bootstrapAdmin, newUser, newProfile, newInstructor, committed,
  } = ctx;

  const admin = await bootstrapAdmin('licence-admin@example.com');

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

  const setFlag = async (on) =>
    q(`update public.platform_settings set value_text = $1
        where key = 'teaching.content_licence'`, [on ? 'true' : 'false']);

  const checksum = () => 'a'.repeat(64);

  /** A real upload through the function a teacher's browser calls.
   *  `select *` rather than `select … as r`: the return type is a composite, and
   *  selected whole it arrives as a record string instead of named fields. */
  const upload = async (actor) =>
    (await asActor(actor,
      'select * from public.register_media_upload($1,$2,$3,$4)',
      ['video/mp4', 1048576, checksum(), 'A test lesson'])).rows[0];

  const teacher = await newInstructor('licence-teacher@example.com', admin);
  const other = await newInstructor('licence-teacher-two@example.com', admin);
  const learner = await newUser('licence-learner@example.com');
  await newProfile(learner, 'Licence Learner');

  // Leave the shared database as this suite found it, whatever happens below.
  // Another suite reads `platform_settings` and would otherwise inherit a gate.
  try {
    await test('the terms are in force, and nobody has been asked yet', async () => {
      const mine = await call(teacher, 'my_teacher_terms()');
      eq(mine.documentFound, true, 'the teaching document exists');
      eq(mine.versionNumber, 1, 'version one is live');
      eq(mine.accepted, false, 'a new teacher has not agreed');
      eq(mine.enforced, false, 'the gate ships off');
      eq(mine.blockedBy, null, 'and therefore blocks nothing');
      eq(mine.canUpload, true, 'uploading is allowed');
      eq(mine.effectiveAt, '2026-10-28', 'the day it binds from');
    });

    await test('with the gate off, an unagreed teacher may upload', async () => {
      const target = await upload(teacher);
      assert(target.asset_id, 'an asset was created');
      eq(typeof target.master_bucket, 'string', 'and a bucket came back');
    });

    await test('turning the gate on refuses the upload, and says why', async () => {
      await setFlag(true);
      const mine = await call(teacher, 'my_teacher_terms()');
      eq(mine.enforced, true, 'enforcement is on');
      eq(mine.blockedBy, 'not_accepted', 'the gap is the teacher’s to close');
      eq(mine.canUpload, false, 'and it blocks');

      await rejects(() => upload(teacher), /licence:not_accepted/);
    });

    await test('agreeing is the thing that opens it, not a setting', async () => {
      const agreed = await call(teacher, 'accept_policy($1)', ['teaching']);
      eq(agreed.already, false, 'recorded now');

      const mine = await call(teacher, 'my_teacher_terms()');
      eq(mine.accepted, true, 'the account has agreed');
      eq(mine.acceptedAt !== null, true, 'with a time');
      eq(mine.blockedBy, null, 'nothing is outstanding');
      eq(mine.canUpload, true, 'and uploading is allowed again');

      const target = await upload(teacher);
      assert(target.asset_id, 'the upload goes through');
    });

    await test('agreement is per person, not per platform', async () => {
      const theirs = await call(other, 'my_teacher_terms()');
      eq(theirs.accepted, false, 'the second teacher has not agreed');
      eq(theirs.canUpload, false, 'so they cannot upload');
      await rejects(() => upload(other), /licence:not_accepted/);
    });

    await test('a learner never gains the status of a teacher by agreeing', async () => {
      // The gate is about a teacher's work, not a membership card: a learner can
      // read and agree to the same document, and that changes nothing about
      // uploading, because there is nothing in it for them to upload.
      const agreed = await call(learner, 'accept_policy($1)', ['teaching']);
      assert(agreed.slug === 'teaching', 'the agreement is recorded');
      const mine = await call(learner, 'my_teacher_terms()');
      eq(mine.accepted, true, 'they have agreed');
      eq(mine.canUpload, true, 'and nothing is refused');
    });

    await test('the owner sees the gap, and who is in it', async () => {
      const coverage = await call(admin, 'teacher_licence_coverage()');
      eq(coverage.enforced, true, 'the gate is on');
      eq(coverage.versionNumber, 1, 'against version one');
      eq(coverage.teachers >= 2, true, 'this suite’s teachers are counted');
      eq(coverage.accepted >= 1, true, 'and the one who agreed is counted');
      const names = coverage.outstanding.map((row) => row.userId);
      assert(names.includes(other), 'the teacher who has not agreed is named');
      assert(!names.includes(teacher), 'the teacher who has is not');
    });

    await test('the gap is staff business', async () => {
      await rejects(() => call(teacher, 'teacher_licence_coverage()'), /licence:not_allowed/);
      await rejects(() => call(learner, 'teacher_licence_coverage()'), /licence:not_allowed/);
    });

    await test('the unattended reader is not a client', async () => {
      // `teacher_terms_for()` answers for any account, which is what the trigger
      // needs and exactly what no client may have: it would let anyone read
      // whether somebody else had agreed.
      await rejects(
        () => asActor(teacher, 'select public.teacher_terms_for($1)', [other]),
        /permission denied/);
    });

    await test('a new version of the terms asks everybody again', async () => {
      // Publishing version 2 is an owner action on /admin/policies; here it is
      // done directly and unwound at the end of the test, because the rest of the
      // database suite reads the live version of this document.
      await q('begin');
      try {
        await q(`update public.policy_versions v set status = 'retired'
                  from public.policy_documents d
                 where d.id = v.document_id and d.slug = 'teaching' and v.status = 'in_force'`);
        await q(`insert into public.policy_versions
                   (document_id, version_number, body, change_note, status,
                    effective_at, approved_by, approved_at, approval_reason)
                 select d.id, 2, repeat('A clause of the second version. ', 20),
                        'Second version, for the test.', 'in_force',
                        current_date, $1, now(), 'test'
                   from public.policy_documents d where d.slug = 'teaching'`, [admin]);

        const mine = await call(teacher, 'my_teacher_terms()');
        eq(mine.versionNumber, 2, 'version two is live');
        eq(mine.accepted, false, 'the old agreement does not carry over');
        eq(mine.blockedBy, 'not_accepted', 'so it blocks again');
        await rejects(() => upload(teacher), /licence:not_accepted/);

        const agreed = await call(teacher, 'accept_policy($1)', ['teaching']);
        eq(agreed.versionNumber, 2, 'and agreeing records the new one');
        const after = await call(teacher, 'my_teacher_terms()');
        eq(after.canUpload, true, 'which opens it again');
      } finally {
        await q('rollback');
      }
    });

    await test('enforcement with nothing published is a different refusal', async () => {
      await q('begin');
      try {
        await q(`update public.policy_versions v set status = 'retired'
                  from public.policy_documents d
                 where d.id = v.document_id and d.slug = 'teaching' and v.status = 'in_force'`);

        const mine = await call(teacher, 'my_teacher_terms()');
        eq(mine.versionNumber, null, 'nothing is in force');
        eq(mine.blockedBy, 'not_published', 'the gap is the owner’s');
        eq(mine.canUpload, false, 'and it still blocks an upload');
        // The distinct reason matters: it is the difference between "agree" and
        // "there is nothing to agree to", and only one of those is actionable by
        // the person reading it.
        await rejects(() => upload(teacher), /licence:not_published/);
      } finally {
        await q('rollback');
      }
    });

    await test('with the gate off again, the refusal goes with it', async () => {
      await setFlag(false);
      const mine = await call(other, 'my_teacher_terms()');
      eq(mine.enforced, false, 'enforcement is off');
      eq(mine.canUpload, true, 'uploading is allowed');
      eq(mine.needsAcceptance, undefined, 'the payload carries no invented field');
      const target = await upload(other);
      assert(target.asset_id, 'and the upload goes through');
    });
  } finally {
    await setFlag(false);
  }
}
