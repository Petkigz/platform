// The retention clocks, wound and walked.
//
// The privacy notice has answered one question in writing since 2026-10-22: a
// support case is kept three years after it closes, and a safeguarding or
// screening record is kept seven years after the person it concerns turns 18 —
// or seven years after it is made, where they were already an adult.
//
// Nothing enforced that. The sentence lived in one published draft and nowhere
// in the schema: no column, no job, no query. A period with no clock is a
// promise that turns into a lie the day the first record passes its date, and it
// fails in the direction nobody notices, because nothing breaks and nobody is
// told. `20261281004700_retention_clock.sql` winds both clocks.
//
// Three things this suite is written to catch, in the order they would hurt:
//
//   1. **Too early.** Deleting a record before its time destroys the evidence
//      that a check happened, and no backup un-deletes it. So every boundary is
//      tested from both sides, and the append-only trigger is asked directly:
//      a row that is not due cannot be deleted, even by somebody who has said
//      they are the cleanup and named any date they like.
//
//   2. **Never.** A job that runs and quietly does nothing is indistinguishable
//      from one that is not scheduled. The counts are compared to the plan on
//      every run, so a run that deletes more or less than it promised fails here.
//
//   3. **Invisible.** A case nobody closed has no clock, and a job that reports
//      "0 due" while a four-year-old open case sits outside every rule would be
//      telling the truth about the wrong thing. The plan reports those, and they
//      survive a run ten years on.

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    bootstrapAdmin, newUser, newProfile, newInstructor, grantRole, committed,
  } = ctx;

  const owner = await bootstrapAdmin('retention-owner@example.com');
  const governance = await newUser('retention-governance@example.com');
  await newProfile(governance, 'Hafsa Nakato');
  await committed(() => grantRole(governance, 'governance_admin', owner));
  const agent = await newUser('retention-agent@example.com');
  await newProfile(agent, 'Musa Kigozi');
  await committed(() => grantRole(agent, 'support_agent', owner));
  const learner = await newUser('retention-learner@example.com');
  await newProfile(learner, 'Zaynab Ssekandi');

  /** Act as a person and COMMIT — the writes have to outlive the call. */
  async function asActor(actor, sql, params = []) {
    await q('begin');
    await q(`select set_config('request.jwt.claims', $1, true)`,
      [JSON.stringify({ sub: actor, role: 'authenticated' })]);
    await q('set local role authenticated');
    let r;
    try {
      r = await q(sql, params);
    } catch (e) {
      await q('rollback');
      throw e;
    }
    await q('commit');
    return r;
  }

  const call = async (actor, sql, params = []) =>
    (await asActor(actor, sql, params)).rows[0].r;

  const plan = async (asOf) =>
    call(owner, 'select public.retention_plan($1::timestamptz) as r', [asOf]);

  const runJobs = async (asOf, limit = 500) =>
    call(owner, 'select public.run_retention_jobs($1::timestamptz, $2) as r', [asOf, limit]);

  const exists = async (table, id) =>
    (await q(`select count(*)::int n from public.${table} where id = $1`, [id])).rows[0].n === 1;

  const one = async (sql, params = []) => (await q(sql, params)).rows[0];

  const iso = (d) => new Date(d).toISOString();
  const plus = (base, spec) =>
    new Date(new Date(base).getTime() + spec).toISOString();

  const YEAR = 365.25 * 24 * 3600 * 1000;
  const now = new Date().toISOString();

  // -------------------------------------------------------------------------
  console.log('\nAct I — the sentence and the code are the same claim');
  // -------------------------------------------------------------------------

  await test('the published answer still says three years and seven, and the plan says the same', async () => {
    // This is the whole point: a policy is a promise about behaviour, so the
    // test that matters is whether the numbers in the text are the numbers the
    // job uses. If somebody changes one, this fails and names both.
    const body = (await one(
      `select v.body from public.policy_versions v
         join public.policy_documents d on d.id = v.document_id
        where d.slug = 'privacy' and v.status = 'in_force'`)).body;

    assert(/three years after it is closed/i.test(body),
      'the published privacy answer no longer promises three years for a support case');
    assert(/seven years after the person it concerns turns 18/i.test(body),
      'the published privacy answer no longer promises seven years for a screening record');

    const p = await plan(now);
    assert(p.policies.supportCase.years === 3, `the job keeps cases for ${p.policies.supportCase.years} years`);
    assert(p.policies.screening.years === 7, `the job keeps screenings for ${p.policies.screening.years} years`);
    assert(/privacy notice/.test(p.policies.supportCase.source),
      'the plan does not say where its number came from');
  });

  await test('the plan refuses anybody who is not the owner, and deletes nothing when asked', async () => {
    // Deleting a record before its time is destroying evidence. Governance reads
    // the register; it does not get to empty it.
    await rejects(() => call(governance, 'select public.retention_plan() as r'), /retention:not_allowed/);
    await rejects(() => call(agent, 'select public.run_retention_jobs() as r'), /retention:not_allowed/);
    await rejects(() => call(learner, 'select public.retention_plan() as r'), /retention:not_allowed/);
    await rejects(() => call(learner, 'select public.run_retention_jobs() as r'), /retention:not_allowed/);
  });

  // -------------------------------------------------------------------------
  console.log('\nAct II — a support case, and the third anniversary');
  // -------------------------------------------------------------------------

  await q(`update public.platform_settings set value_text = 'true' where key = 'platform.support'`);
  try {
    var asker = await newUser('retention-asker@example.com');
    await newProfile(asker, 'Bilal Muwanga');

    const openCase = async (subject) => (await call(asker,
      `select public.open_support_case('account', $1, 'I cannot get into my account and the code never arrives.') as r`,
      [subject]));

    // Four cases, and the only difference between them is when the clock
    // started. Three dates are written straight to the row because
    // `close_support_case` stamps `now()` and nothing may edit a closed case
    // afterwards — the fixture is what the platform would have written then.
    var ordinary = await openCase('Cannot sign in');
    var stillOpen = await openCase('Wrong certificate name');

    var boundary = await openCase('Closed exactly three years ago');
    var aged = await openCase('Closed three years and a month ago');

    // A reply from staff on each, written while the case is still open — a
    // closed case takes no replies, which is why the fixture below closes them
    // last. The point of these two rows is that the deletion can be asked about
    // the record inside the record and not only the row on top.
    await call(agent, 'select public.reply_to_support_case($1, $2) as r',
      [aged, 'We reset it. Tell us if it happens again.']);
    await call(agent, 'select public.reply_to_support_case($1, $2) as r',
      [ordinary, 'Reset sent. If it does not arrive, reply here.']);

    // Closed by the real function, so the clock starts the way the product
    // starts it: ordinary is closed today and is not due for three years.
    await call(asker, 'select public.close_support_case($1, $2) as r',
      [ordinary, 'It arrived, thank you.']);

    // The other two were closed years ago: written straight to the row because
    // nothing may edit a closed case afterwards, so this is what the platform
    // would have written then.
    await q(`update public.support_cases
                set status = 'closed', closed_by = $2, closed_at = now() - interval '3 years',
                    close_reason = 'answered long ago'
              where id = $1`, [boundary, owner]);
    await q(`update public.support_cases
                set status = 'closed', closed_by = $2,
                    closed_at = now() - interval '3 years 1 month',
                    close_reason = 'answered long ago'
              where id = $1`, [aged, owner]);
  } finally {
    await q(`update public.platform_settings set value_text = 'false' where key = 'platform.support'`);
  }

  await test('the row carries the date it goes, and the clock starts at the close', async () => {
    const row = await one(
      `select clock_started_at, due_on::text as due_on
         from public.retention_due_records where id = $1`, [ordinary]);
    const closed = new Date(row.clock_started_at);
    const due = new Date(`${row.due_on}T00:00:00Z`);
    const expected = new Date(closed.getTime() + 3 * YEAR);
    assert(Math.abs(due - expected) < 2 * 24 * 3600 * 1000,
      `a case closed ${row.clock_started_at} is due ${row.due_on}, not three years on`);

    // An open case has no row in the view: a clock that has not started cannot
    // have a date, and inventing one would be a rule nobody wrote.
    const open = await one(
      `select count(*)::int n from public.retention_due_records where id = $1`, [stillOpen]);
    assert(open.n === 0, 'an open case was given a retention date');
  });

  await test('three years to the day is due, and the day before it is not', async () => {
    const today = (await one(
      `select ($1::timestamptz at time zone 'UTC')::date::text as d`, [now])).d;
    const yesterday = (await one(
      `select ($1::timestamptz at time zone 'UTC')::date::text as d`,
      [plus(now, -24 * 3600 * 1000)])).d;

    const boundaryRow = await one(
      `select due_on::text as due_on from public.retention_due_records where id = $1`, [boundary]);
    assert(boundaryRow.due_on === today,
      `a case closed exactly three years ago is due ${boundaryRow.due_on}, not today`);

    // The same row, judged one day earlier: not due. Stated against the row
    // rather than against a total, so another suite's cases cannot make it pass.
    const notYet = await one(
      `select count(*)::int n from public.retention_due_records
        where id = $1 and due_on <= $2::date`, [boundary, yesterday]);
    assert(notYet.n === 0, 'the boundary case was already due the day before');

    const p0 = await plan(plus(now, -24 * 3600 * 1000));
    assert(p0.asOf === yesterday, `the plan judges as of ${p0.asOf}, not ${yesterday}`);
  });

  await test('a run takes exactly what the plan said was due, and no more', async () => {
    const before = await plan(now);
    assert(before.supportCases.due >= 2,
      `the plan does not see the two old cases (due: ${before.supportCases.due})`);
    assert(before.supportCases.oldestDue !== null, 'the plan does not say how old the oldest is due');

    const deleted = await runJobs(now);
    assert(deleted.deleted.supportCases === before.supportCases.due,
      `the plan said ${before.supportCases.due} cases were due; the run deleted ${deleted.deleted.supportCases}`);
    assert(deleted.remaining.supportCases === 0,
      `${deleted.remaining.supportCases} cases are still due after a run with room to take them`);

    assert(!(await exists('support_cases', boundary)),
      'the case closed exactly three years ago survived the run');
    assert(!(await exists('support_cases', aged)), 'a case closed three years and a month ago survived');
    assert(await exists('support_cases', ordinary),
      'a case closed today was deleted; the clock is not three years long');
    assert(await exists('support_cases', stillOpen), 'a case nobody closed was deleted');
  });

  await test('the messages inside a deleted case go with it, and the audit says so', async () => {
    const leftovers = await one(
      `select count(*)::int n from public.support_case_messages where case_id = any($1::uuid[])`,
      [[boundary, aged]]);
    assert(leftovers.n === 0, 'the replies outlived the cases they belong to');

    const event = await one(
      `select detail, actor from public.governance_audit_events
        where action = 'retention.purged' order by occurred_at desc limit 1`);
    assert(event.actor === owner, 'the run is attributed to somebody other than the person who ran it');
    assert(event.detail.supportCases >= 2, 'the audit entry does not say how much was deleted');
    assert(event.detail.supportCaseMessages >= 1,
      'the audit entry does not record that messages went with the cases');
  });

  await test('a run that finds nothing writes nothing', async () => {
    // An audit table that gains a row a day saying "nothing happened" buries the
    // days that mattered.
    const before = (await one(
      `select count(*)::int n from public.governance_audit_events
        where action = 'retention.purged'`)).n;
    const again = await runJobs(now);
    assert(again.deleted.supportCases === 0 && again.deleted.screenings === 0,
      'a second run at the same date deleted something');
    assert(again.audited === false, 'a run that deleted nothing claimed to have written an audit entry');
    const after = (await one(
      `select count(*)::int n from public.governance_audit_events
        where action = 'retention.purged'`)).n;
    assert(after === before, 'an empty run added an audit entry');
  });

  await test('a run cannot be talked into the future', async () => {
    // The date is a parameter so the run can be replayed, and a scheduler bug
    // that passes the wrong year must not be able to delete next decade's
    // records. Naming 2040 cleans as of today, and the plan can still be asked
    // what 2040 will look like.
    const far = await runJobs(plus(now, 14 * YEAR));
    assert(far.deleted.supportCases === 0 && far.deleted.screenings === 0,
      'a run told to clean as of fourteen years from now deleted something');
    assert(await exists('support_cases', ordinary),
      'a case closed today was deleted by a run dated in the future');

    const ahead = await plan(plus(now, 3.2 * YEAR));
    assert(ahead.supportCases.due >= 1,
      'the plan cannot be asked what will be due in three years');
  });

  await test('a case nobody closed has no clock, is reported, and is not deleted', async () => {
    await q(`update public.support_cases set created_at = now() - interval '4 years' where id = $1`,
      [stillOpen]);

    const p = await plan(now);
    assert(p.supportCases.waiting.count >= 1,
      'a four-year-old open case is not reported as having no clock');
    assert(p.supportCases.waiting.oldestCreatedAt !== null,
      'the plan reports waiting cases without saying how old the oldest is');
    assert(/never closed/i.test(p.supportCases.waiting.note),
      'the plan does not explain why those cases are outside the rule');

    // Ten years on, it is still there: the job will not end a conversation
    // somebody might still be answering. Somebody has to close it, and the
    // number on the screen is how that gets noticed.
    await runJobs(plus(now, 10 * YEAR));
    assert(await exists('support_cases', stillOpen),
      'the job deleted a case that was never closed, which no policy asked for');
  });

  await test('a batch is bounded, and the second run takes the rest', async () => {
    // A backlog must not hold a lock behind somebody's live support queue.
    await q(`update public.platform_settings set value_text = 'true' where key = 'platform.support'`);
    const batchIds = [];
    try {
      for (const subject of ['First old case', 'Second old case', 'Third old case']) {
        const id = await call(asker,
          `select public.open_support_case('other', $1,
             'A question from long ago that was answered and then closed.') as r`, [subject]);
        await q(`update public.support_cases
                    set status = 'closed', closed_by = $2, closed_at = now() - interval '5 years',
                        close_reason = 'answered'
                  where id = $1`, [id, owner]);
        batchIds.push(id);
      }
    } finally {
      await q(`update public.platform_settings set value_text = 'false' where key = 'platform.support'`);
    }

    const first = await runJobs(now, 2);
    assert(first.deleted.supportCases === 2, `a limit of 2 deleted ${first.deleted.supportCases}`);
    assert(first.remaining.supportCases >= 1, 'the run reports nothing left after stopping at its limit');

    const second = await runJobs(now, 2);
    assert(second.deleted.supportCases >= 1, 'the second run took nothing');
    for (const id of batchIds) {
      assert(!(await exists('support_cases', id)), 'a bounded run left one of the batch behind');
    }

    await rejects(() => runJobs(now, 0), /retention:limit_out_of_range/);
    await rejects(() => runJobs(now, 100000), /retention:limit_out_of_range/);
  });

  // -------------------------------------------------------------------------
  console.log('\nAct III — a screening record, two clocks, and the seventh year');
  // -------------------------------------------------------------------------

  const adultTeacher = await newInstructor('retention-teacher-adult@example.com', owner);
  const youngTeacher = await newInstructor('retention-teacher-young@example.com', owner);
  const futureTeacher = await newInstructor('retention-teacher-future@example.com', owner);

  // Recorded, then written back in time. `record_teacher_screening` stamps
  // `now()` and the append-only trigger refuses every update afterwards, so a
  // record that is eight years old is one the fixture writes directly — which is
  // also the proof that the rule cannot be dodged by editing a row.
  const insertScreening = async (userId, checkedAt, retentionUntil, basis) => (await q(
    `insert into public.teacher_screenings
       (user_id, screening_type, evidence_reference, outcome, checked_by, checked_at,
        retention_until, retention_basis)
     values ($1, 'photo ID and two references', 'vault/screenings/paper.pdf', 'passed', $2, $3, $4, $5)
     returning id`, [userId, owner, checkedAt, retentionUntil, basis])).rows[0].id;

  const oldCheck = await insertScreening(adultTeacher,
    plus(now, -8 * YEAR), plus(now, -1 * YEAR).slice(0, 10), 'check');
  const youngCheck = await insertScreening(youngTeacher,
    plus(now, -8 * YEAR), plus(now, 4 * YEAR).slice(0, 10), 'birthday');
  const futureCheck = await insertScreening(futureTeacher,
    now, plus(now, 7 * YEAR).slice(0, 10), 'check');

  await test('a record past its date goes; one still inside it does not', async () => {
    const before = await plan(now);
    const deleted = await runJobs(now);

    assert(!(await exists('teacher_screenings', oldCheck)),
      'a screening record eight years old, due a year ago, survived the cleanup');
    assert(await exists('teacher_screenings', youngCheck),
      'a record whose clock started at an eighteenth birthday was deleted on the check clock');
    assert(await exists('teacher_screenings', futureCheck),
      'a record due in seven years was deleted today');
    assert(deleted.deleted.screenings === before.screenings.due,
      `the plan said ${before.screenings.due} records were due; the run deleted ${deleted.deleted.screenings}`);
  });

  await test('the eighteenth birthday moves the date later, never earlier', async () => {
    // The person was 16 at the check, so the seven years start on their
    // eighteenth birthday. Deleting on the check clock would take a safeguarding
    // record two years early, which is the direction that cannot be undone.
    const row = await one(
      `select checked_at, retention_until::text as retention_until, retention_basis
         from public.teacher_screenings where id = $1`, [youngCheck]);
    assert(row.retention_basis === 'birthday', 'the birthday clock was not recorded as the one that started');
    const span = new Date(`${row.retention_until}T00:00:00Z`) - new Date(row.checked_at);
    assert(span > 8 * YEAR,
      `the birthday clock produced a shorter period (${Math.round(span / YEAR * 10) / 10} years) than the check clock`);

    const dueAt = async (asOf) => (await one(
      `select count(*)::int n from public.retention_due_records
        where id = $1 and due_on <= ($2::timestamptz at time zone 'UTC')::date`,
      [youngCheck, asOf])).n;

    // Ten years after the check — three years past the check clock — and still
    // not due, because the person was sixteen when it was made. Fourteen years
    // on, it is.
    assert(await dueAt(plus(now, 2 * YEAR)) === 0,
      'the birthday-clock record was due three years after the check clock said so');
    assert(await dueAt(plus(now, 5 * YEAR)) === 1,
      'the birthday-clock record is never due, so the second half of the rule never runs');
  });

  await test('recording a check now says when the record itself goes', async () => {
    const teacher = await newInstructor('retention-teacher-written@example.com', owner);

    const adult = await call(owner,
      `select public.record_teacher_screening($1, 'photo ID and two references',
         'vault/screenings/new.pdf', 'passed', null, null, date '1985-04-12') as r`, [teacher]);
    assert(adult.retentionBasis === 'check',
      'an adult checked today was put on the birthday clock');
    const span = new Date(`${adult.retentionUntil}T00:00:00Z`) - new Date(now);
    assert(Math.abs(span - 7 * YEAR) < 2 * 24 * 3600 * 1000,
      `an adult checked today is due ${adult.retentionUntil}, not seven years on`);

    // A birthday that has not happened, and one that would make the subject
    // older than the register can plausibly be, are refused rather than turned
    // into a date nothing sensible follows from.
    await rejects(() => call(owner,
      `select public.record_teacher_screening($1, 'photo ID', 'vault/x.pdf', 'passed',
         null, null, (current_date + 1)::date) as r`, [teacher]), /screening:birthday_in_the_future/);
    await rejects(() => call(owner,
      `select public.record_teacher_screening($1, 'photo ID', 'vault/x.pdf', 'passed',
         null, null, (current_date - interval '150 years')::date) as r`, [teacher]),
      /screening:birthday_implausible/);

    // The birthday itself is not kept. Only the day it implies.
    const columns = (await q(
      `select column_name from information_schema.columns
        where table_schema = 'public' and table_name = 'teacher_screenings'`)).rows
      .map((r) => r.column_name);
    assert(!columns.some((c) => /born|birth|dob/i.test(c)),
      `the screening register kept a birthday in ${columns.filter((c) => /born|birth|dob/i.test(c)).join(', ')}`);
  });

  // -------------------------------------------------------------------------
  console.log('\nAct IV — the rules that did not relax to let the clock in');
  // -------------------------------------------------------------------------

  await test('a screening record still cannot be edited, by anybody', async () => {
    await rejects(() => q(`update public.teacher_screenings set outcome = 'failed' where id = $1`,
      [futureCheck]), /is not edited/);
    await rejects(() => q(`update public.teacher_screenings set notes = 'x' where id = $1`,
      [futureCheck]), /is not edited/);
  });

  await test('a record that is not due cannot be deleted, even by a caller claiming to be the cleanup', async () => {
    // The trigger takes the cleanup's word for *who* is calling and then checks
    // the row itself: saying it is the retention run and naming any date does not
    // take a record early. This is the whole defence against a rushed psql
    // session, and it is why the job does not simply `delete from`.
    await q(`select set_config('ayahspring.retention_purge', 'on', false)`);
    await q(`select set_config('ayahspring.retention_as_of', '2099-01-01', false)`);
    try {
      await rejects(() => q('delete from public.teacher_screenings where id = $1', [futureCheck]),
        /kept until its retention date/);
      assert(await exists('teacher_screenings', futureCheck),
        'a record due in seven years was deleted by naming a date in 2099');
    } finally {
      await q(`select set_config('ayahspring.retention_purge', '', false)`);
      await q(`select set_config('ayahspring.retention_as_of', '', false)`);
    }
  });

  await test('a due record cannot be deleted outside the run either', async () => {
    // Even a due row is not fair game for anybody with a database console: it
    // goes when the cleanup takes it, and the audit entry is the record that it
    // went. Otherwise "we deleted it under the retention policy" is unprovable.
    const due = await insertScreening(adultTeacher,
      plus(now, -9 * YEAR), plus(now, -2 * YEAR).slice(0, 10), 'check');
    await rejects(() => q('delete from public.teacher_screenings where id = $1', [due]),
      /deleted only by the retention run/);
    assert(await exists('teacher_screenings', due), 'a direct delete took a due record');

    await runJobs(now);
    assert(!(await exists('teacher_screenings', due)), 'the run did not take a due record');
  });

  await test('the register and the teacher both see the date, and neither sees the evidence', async () => {
    const register = await call(owner, 'select public.screening_register() as r');
    const row = register.teachers.find((t) => t.userId === futureTeacher);
    assert(row && row.retentionUntil, 'the register does not say when a screening record will be deleted');

    const mine = await call(futureTeacher, 'select public.my_screening_status() as r');
    assert(mine.recorded === true && mine.retentionUntil === row.retentionUntil,
      'the teacher is told a different date from the register');
    assert(!('evidenceReference' in mine) && !('notes' in mine),
      "the teacher's own view exposes the evidence reference");
  });
}
