// Optional local PostgreSQL lock test. It applies every migration and creates
// synthetic rows in an explicitly named empty database. Never use a project DB.
//
// What it is for: `save_assessment_response()` and `submit_assessment_attempt()`
// both lock the attempt row, so that an answer and a submission arriving at
// the same moment are put in an order. PGlite is one connection and cannot
// show that; this does, with two.
import { Client } from 'pg';
import { readFile, readdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';

if (process.env.ASSESSMENT_LOCK_TEST !== '1' || !process.env.PGHOST?.startsWith('/') ||
    process.env.PGDATABASE !== 'ayahspring_assessment_lock_test') {
  throw new Error('Use ASSESSMENT_LOCK_TEST=1, a local Unix PGHOST and empty PGDATABASE=ayahspring_assessment_lock_test');
}

const a = new Client(), b = new Client(), observer = new Client();
try {
  await Promise.all([a.connect(), b.connect(), observer.connect()]);
  const existing = await a.query("select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','auth') and c.relkind in ('r','p','v','m','S') limit 1");
  if (existing.rowCount) throw new Error('Database is not empty; refusing to run');
  await a.query(await readFile(new URL('harness.sql', import.meta.url), 'utf8'));
  const dir = new URL('../migrations/', import.meta.url);
  for (const f of (await readdir(dir)).filter((x) => x.endsWith('.sql')).sort()) await a.query(await readFile(new URL(f, dir), 'utf8'));

  const actor = randomUUID(), learner = randomUUID(), course = randomUUID(), version = randomUUID();
  const enrolment = randomUUID(), assessment = randomUUID(), q1 = randomUUID(), q2 = randomUUID();
  await a.query('insert into auth.users(id,email) values($1,$2)', [actor, `${actor}@example.test`]);
  // Synthetic coordinates: only the fixture bypasses foreign keys and triggers.
  // The functions under test and every write they make run normally afterwards.
  await a.query("set session_replication_role='replica'");
  await a.query("insert into public.learner_profiles(id,linked_user_id,display_name,learner_type,age_band) values($1,$2,'Synthetic learner','adult','18+')", [learner, actor]);
  await a.query("insert into public.courses(id,slug,title,created_by) values($1,'answer-race','Synthetic course',$2)", [course, actor]);
  await a.query('insert into public.course_versions(id,course_id,version_number,created_by) values($1,$2,1,$3)', [version, course, actor]);
  await a.query('insert into public.course_enrolments(id,learner_profile_id,course_id,course_version_id) values($1,$2,$3,$4)', [enrolment, learner, course, version]);
  await a.query("insert into public.assessments(id,course_version_id,title,type,pass_threshold,status) values($1,$2,'Synthetic quiz','graded',50,'active')", [assessment, version]);
  const choice = '{"prompt":"Pick one","choices":[{"id":"a","text":"A"},{"id":"b","text":"B"}]}';
  await a.query(`insert into public.assessment_questions(id,assessment_id,type,content,answer_key,points,position,grading_method)
                 values($1,$3,'single_choice',$4,'"b"',1,1,'automatic'),($2,$3,'single_choice',$4,'"b"',1,2,'automatic')`, [q1, q2, assessment, choice]);
  await a.query("set session_replication_role='origin'");

  let number = 0;
  const open = async () => (await observer.query(
    "insert into public.assessment_attempts(assessment_id,learner_profile_id,course_enrolment_id,attempt_number,status) values($1,$2,$3,$4,'in_progress') returning id",
    [assessment, learner, enrolment, ++number])).rows[0].id;
  async function begin(client) {
    await client.query('begin');
    await client.query("select set_config('request.jwt.claims',$1,true)", [JSON.stringify({ sub: actor, role: 'authenticated' })]);
    await client.query('set local role authenticated');
  }
  async function blocked(waiter, blocker) {
    await observer.query('select pg_sleep(0.1)');
    const pids = (await observer.query('select pg_blocking_pids($1) ids', [waiter.processID])).rows[0].ids;
    assert.ok(pids.includes(blocker.processID), `expected ${waiter.processID} to wait for ${blocker.processID}; got ${pids}`);
  }
  const save = (client, attempt, question, content) => client.query('select public.save_assessment_response($1,$2,$3::jsonb) held', [attempt, question, JSON.stringify(content)]);
  const submit = (client, attempt) => client.query('select (public.submit_assessment_attempt($1)).status status', [attempt]);
  const sheet = async (attempt) => (await observer.query('select question_id, response_content, score, graded_at from public.assessment_responses where assessment_attempt_id=$1', [attempt])).rows;
  const result = async (attempt) => (await observer.query('select status, score_earned, passed from public.assessment_attempts where id=$1', [attempt])).rows[0];
  const once = async (client, fn) => { await begin(client); const r = await fn(); await client.query('commit'); return r; };

  // The privileges are the real ones: a learner cannot write the table.
  let attempt = await open();
  await begin(a);
  await assert.rejects(a.query("insert into public.assessment_responses(assessment_attempt_id,question_id,response_content,score,is_correct,graded_by,graded_at) values($1,$2,'\"a\"',1,true,$3,now())", [attempt, q1, actor]), (e) => e.code === '42501');
  await a.query('rollback');

  // 1. Two first answers to the same question, neither seeing a row. The
  //    second waits for the first and then replaces it: one row, the later answer.
  await begin(a); await begin(b);
  await save(a, attempt, q1, 'a');
  const second = save(b, attempt, q1, 'b'); await blocked(b, a);
  await a.query('commit'); await second; await b.query('commit');
  let rows = await sheet(attempt);
  assert.equal(rows.length, 1, 'two answers to one question left two rows');
  assert.equal(rows[0].response_content, 'b');

  // 2. A change of answer is on its way when the attempt is handed in. The
  //    submission waits, and marks the changed answer.
  await once(a, () => save(a, attempt, q2, 'a'));
  await begin(a); await begin(b);
  await save(a, attempt, q2, 'b');
  const handing = submit(b, attempt); await blocked(b, a);
  await a.query('commit'); assert.equal((await handing).rows[0].status, 'graded'); await b.query('commit');
  let marked = await result(attempt);
  assert.equal(Number(marked.score_earned), 2, 'the submission marked the answer as it was before the change');
  assert.equal(marked.passed, true);

  // 3. The attempt is being handed in when a change of answer arrives. The
  //    change waits, and is refused: the marking has read the row.
  attempt = await open();
  await once(a, () => save(a, attempt, q1, 'a'));
  await once(a, () => save(a, attempt, q2, 'a'));
  await begin(a); await begin(b);
  assert.equal((await submit(a, attempt)).rows[0].status, 'graded');
  const late = save(b, attempt, q1, 'b'); const refused = assert.rejects(late, /already been submitted/);
  await blocked(b, a); await a.query('commit'); await refused; await b.query('rollback');
  marked = await result(attempt);
  assert.equal(Number(marked.score_earned), 0); assert.equal(marked.passed, false);
  rows = await sheet(attempt);
  assert.equal(rows.find((r) => r.question_id === q1).response_content, 'a', 'an answer changed after the attempt was marked');

  // 4. The same, with an answer being taken back while the attempt is handed
  //    in: refused, and the row is still there.
  attempt = await open();
  await once(a, () => save(a, attempt, q1, 'b'));
  await once(a, () => save(a, attempt, q2, 'b'));
  await begin(a); await begin(b);
  await submit(a, attempt);
  const taking = save(b, attempt, q2, ''); const kept = assert.rejects(taking, /already been submitted/);
  await blocked(b, a); await a.query('commit'); await kept; await b.query('rollback');
  assert.equal((await sheet(attempt)).length, 2);
  assert.equal(Number((await result(attempt)).score_earned), 2);

  // 5. An answer taken back just before handing in: the submission waits, then
  //    finds the question unanswered and is refused. The attempt stays open.
  attempt = await open();
  await once(a, () => save(a, attempt, q1, 'b'));
  await once(a, () => save(a, attempt, q2, 'b'));
  await begin(a); await begin(b);
  assert.equal((await save(a, attempt, q2, '')).rows[0].held, false);
  const early = submit(b, attempt); const unanswered = assert.rejects(early, /unanswered questions/);
  await blocked(b, a); await a.query('commit'); await unanswered; await b.query('rollback');
  assert.equal((await result(attempt)).status, 'in_progress');

  // 6. Two submissions of one attempt. One marks it; the other is refused.
  await once(a, () => save(a, attempt, q2, 'b'));
  await begin(a); await begin(b);
  await submit(a, attempt);
  const twice = submit(b, attempt); const once2 = assert.rejects(twice, /cannot be submitted/);
  await blocked(b, a); await a.query('commit'); await once2; await b.query('rollback');
  assert.equal(Number((await result(attempt)).score_earned), 2);

  console.log('PostgreSQL passed six selected assessment answer and submission lock races.');
} finally { await Promise.all([a.end().catch(() => {}), b.end().catch(() => {}), observer.end().catch(() => {})]); }
