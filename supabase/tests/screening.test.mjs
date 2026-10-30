// A record that a check happened — and nothing that pretends to be the check.
//
// The safeguarding policy says screening is not built into the product, and that
// stays true: what exists here is a register of what staff were told and when, so
// that "has this adult been checked?" can be answered by looking rather than by
// remembering. The standard, the checker and the lifetime are the owner's, which is
// why the type is free text and the expiry is their number.
//
// The tests below are as much about what cannot happen as what can: a learner is
// never screened, a record is never edited, and the evidence reference cannot be
// read back by anybody through the API.

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    bootstrapAdmin, newUser, newProfile, newInstructor, grantRole, committed,
  } = ctx;

  const admin = await bootstrapAdmin('screening-admin@example.com');

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

  const teacher = await newInstructor('screening-teacher@example.com', admin);
  const second = await newInstructor('screening-teacher-two@example.com', admin);

  const governance = await newUser('screening-governance@example.com');
  await newProfile(governance, 'Screening Governance');
  await committed(() => grantRole(governance, 'governance_admin', admin));

  const learner = await newUser('screening-learner@example.com');
  await newProfile(learner, 'Screening Learner');

  await test('nothing recorded is a status, not a fail', async () => {
    const own = await call(teacher, 'my_screening_status()');
    eq(own.recorded, false, 'a teacher with no check on file');

    const register = await call(admin, 'screening_register()');
    const row = register.teachers.find((t) => t.userId === teacher);
    assert(row, 'the teacher appears in the register');
    eq(row.status, 'none', 'their status');
    eq(register.counts.teachers >= 2, true, 'at least this suite’s teachers are counted');
    eq(register.counts.none >= 1, true, 'somebody without a check is counted');
  });

  await test('recording a check needs staff, and a check on a teacher', async () => {
    await rejects(() => call(teacher, 'record_teacher_screening($1,$2,$3)',
      [teacher, 'Basic disclosure', 'file-1']), /screening:not_allowed/);
    await rejects(() => call(governance, 'record_teacher_screening($1,$2,$3)',
      [learner, 'Basic disclosure', 'file-2']), /screening:not_a_teacher/);
    await rejects(() => call(governance, 'record_teacher_screening($1,$2,$3)',
      [teacher, '  ', 'file-3']), /screening:type_required/);
    await rejects(() => call(governance, 'record_teacher_screening($1,$2,$3)',
      [teacher, 'Basic disclosure', '']), /screening:reference_required/);
    await rejects(() => call(governance, 'record_teacher_screening($1,$2,$3)',
      ['00000000-0000-0000-0000-000000000000', 'Basic disclosure', 'file-4']),
    /screening:user_not_found/);
  });

  await test('a check valid in the past is refused rather than recorded as lapsed', async () => {
    await rejects(() => call(governance, 'record_teacher_screening($1,$2,$3,$4,$5)',
      [teacher, 'Basic disclosure', 'file-5', 'passed', '2020-01-01']),
    /screening:validity_in_the_past/);
  });

  await test('governance records a check, the teacher reads their own, and the reference is unreadable', async () => {
    const recorded = await call(governance, 'record_teacher_screening($1,$2,$3,$4,$5,$6)',
      [teacher, 'Basic disclosure', 'vault/teacher-1.pdf', 'passed', '2099-01-01',
        'Saw the certificate in person.']);
    eq(recorded.outcome, 'passed', 'the recorded outcome');

    const own = await call(teacher, 'my_screening_status()');
    eq(own.recorded, true, 'the teacher’s own record');
    eq(own.type, 'Basic disclosure', 'what kind of check');
    eq(own.expired, false, 'an expiry in 2099 has not passed');
    eq('evidenceReference' in own, false, 'the evidence reference is not in the response');
    eq('notes' in own, false, 'staff notes are not in the teacher’s response');

    // Not even the person being checked can read the reference column back.
    await rejects(() => asActor(teacher,
      `select evidence_reference from public.teacher_screenings where user_id = $1`,
      [teacher]), /permission denied/i);
    await rejects(() => asActor(governance,
      `select evidence_reference from public.teacher_screenings where user_id = $1`,
      [teacher]), /permission denied/i);

    const register = await call(admin, 'screening_register()');
    const row = register.teachers.find((t) => t.userId === teacher);
    eq(row.status, 'checked', 'the register says the teacher is checked');
    eq(row.checkedByName, 'Screening Governance', 'who recorded it');
    eq(row.validUntil instanceof Date ? row.validUntil.toISOString().slice(0, 10) : String(row.validUntil).slice(0, 10),
      '2099-01-01', 'the expiry the staff member chose');
  });

  await test('a failed check is a status, not a quiet absence of one', async () => {
    await call(governance, 'record_teacher_screening($1,$2,$3,$4)',
      [second, 'Basic disclosure', 'vault/teacher-2.pdf', 'failed']);

    const own = await call(second, 'my_screening_status()');
    eq(own.outcome, 'failed', 'the teacher is told');

    const register = await call(admin, 'screening_register()');
    eq(register.teachers.find((t) => t.userId === second).status, 'failed',
      'the register says failed');
    eq(register.counts.failed >= 1, true, 'and counts it');
  });

  await test('a later check supersedes the last, and a record is never edited or deleted', async () => {
    await call(governance, 'record_teacher_screening($1,$2,$3,$4,$5)',
      [second, 'Enhanced disclosure', 'vault/teacher-2b.pdf', 'passed', '2099-06-01']);

    const own = await call(second, 'my_screening_status()');
    eq(own.type, 'Enhanced disclosure', 'the latest check is the one that counts');
    eq(own.outcome, 'passed', 'and its outcome');

    const id = (await q(
      `select id from public.teacher_screenings where user_id = $1 order by checked_at desc limit 1`,
      [second])).rows[0].id;
    await rejects(() => q(
      `update public.teacher_screenings set outcome = 'failed' where id = $1`, [id]),
    /not edited or deleted/);
    await rejects(() => q(
      `delete from public.teacher_screenings where id = $1`, [id]),
    /not edited or deleted/);

    const rows = (await q(
      `select count(*)::int n from public.teacher_screenings where user_id = $1`, [second])).rows[0].n;
    eq(rows, 2, 'both checks are still on the record');
  });

  await test('the register is staff reading, and it says nothing about the evidence', async () => {
    await rejects(() => call(teacher, 'screening_register()'), /screening:not_allowed/);
    await rejects(() => call(learner, 'screening_register()'), /screening:not_allowed/);

    const register = await call(governance, 'screening_register()');
    const row = register.teachers.find((t) => t.userId === teacher);
    eq('evidenceReference' in row, false, 'no reference in the register row');
    eq(register.counts.checked >= 2, true, 'both teachers hold a current check');
  });

  await test('a check that has passed its date reads as expired, not as current', async () => {
    // Inserted a day past its expiry as the database owner, because the writer
    // refuses to record a check that has already lapsed. This is what the row
    // looks like a year later, without waiting a year.
    await q(`insert into public.teacher_screenings
               (user_id, screening_type, evidence_reference, outcome, checked_by, valid_until)
             values ($1, 'Annual refresher', 'vault/old.pdf', 'passed', $2, current_date - 1)`,
    [teacher, admin]);

    const lapsed = await call(teacher, 'my_screening_status()');
    eq(lapsed.expired, true, 'a check whose date has passed');

    const register = await call(admin, 'screening_register()');
    eq(register.teachers.find((t) => t.userId === teacher).status, 'expired',
      'the register says expired rather than checked');
    eq(register.counts.expired >= 1, true, 'and counts it');
    eq(register.counts.checked >= 1, true, 'while the teacher with a current check still counts');
  });

  await test('the flag is now a switch, because the standard and the lead are settled', async () => {
    const flag = (await q(
      `select gate_type, preconditions from public.platform_settings
        where key = 'platform.safeguarding'`)).rows[0];
    // CODE until 2026-10-30, because "the enforcement needs the standard first"
    // and then "name the lead before enabling". The owner did both, so the gate
    // that turns on this flag now exists in set_course_version_status() and the
    // dashboard may flip it.
    eq(flag.gate_type, 'admin',
      'the standard and the lead are decided, so this is a switch and not a deploy');
    assert(!/Nothing exists/.test(flag.preconditions),
      'the preconditions no longer claim nothing exists');
    assert(/screening/.test(flag.preconditions),
      'and they name the screening the gate now checks');
    assert(/safeguarding_lead|lead/.test(flag.preconditions),
      'and point at the named lead, the other thing the register was waiting for');
  });
}
