// Selected real-PostgreSQL races against the full migrated schema. Synthetic
// fixture setup bypasses triggers only to build a minimal graph; tested writes
// run normally. Never target an existing project or a nonempty database.
import { Client } from 'pg';
import { readFile, readdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';

if (process.env.RESUME_LOCK_TEST !== '1' || !process.env.PGHOST?.startsWith('/') || process.env.PGDATABASE !== 'ayahspring_resume_lock_test') {
  throw new Error('Use RESUME_LOCK_TEST=1, a local Unix PGHOST and empty PGDATABASE=ayahspring_resume_lock_test');
}
const a = new Client(); const b = new Client(); const observer = new Client();
try {
  await Promise.all([a.connect(), b.connect(), observer.connect()]);
  const existing = await a.query("select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','auth') and c.relkind in ('r','p','v','m','S') limit 1");
  if (existing.rowCount) throw new Error('Database is not empty; refusing to run');
  await a.query(await readFile(new URL('harness.sql', import.meta.url), 'utf8'));
  const dir = new URL('../migrations/', import.meta.url);
  for (const file of (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort()) await a.query(await readFile(new URL(file, dir), 'utf8'));
  const actor = randomUUID(), learner = randomUUID(), course = randomUUID(), v1 = randomUUID(), v2 = randomUUID();
  const section = randomUUID(), lesson = randomUUID(), emptyLesson = randomUUID(), completionLesson = randomUUID(), enrolment = randomUUID();
  const resourceA = randomUUID(), resourceB = randomUUID();
  await a.query('insert into auth.users(id,email) values($1,$2)', [actor, `${actor}@example.test`]);
  await a.query("set session_replication_role='replica'");
  await a.query("insert into public.learner_profiles(id,linked_user_id,display_name,learner_type,age_band) values($1,$2,'Synthetic learner','adult','18+')", [learner, actor]);
  await a.query("insert into public.courses(id,slug,title,created_by) values($1,'resume-race','Synthetic course',$2)", [course, actor]);
  await a.query('insert into public.course_versions(id,course_id,version_number,created_by) values($1,$2,1,$3),($4,$2,2,$3)', [v1, course, actor, v2]);
  await a.query("insert into public.course_sections(id,course_version_id,title) values($1,$2,'Synthetic section')", [section, v1]);
  await a.query("insert into public.lessons(id,section_id,title,position) values($1,$4,'First',1),($2,$4,'Second',2),($3,$4,'Third',3)", [lesson, emptyLesson, completionLesson, section]);
  await a.query("insert into public.lesson_resources(id,lesson_id,resource_type,display_name,external_url,position) values($1,$3,'audio','First','https://example.invalid/a.mp3',1),($2,$3,'audio','Second','https://example.invalid/b.mp3',2)", [resourceA, resourceB, lesson]);
  await a.query('insert into public.course_enrolments(id,learner_profile_id,course_id,course_version_id) values($1,$2,$3,$4)', [enrolment, learner, course, v1]);
  await a.query("insert into public.entitlement_grants(learner_profile_id,scope_type,course_version_id,source_type,status) values($1,'course_version',$2,'free','active')", [learner, v1]);
  await a.query("set session_replication_role='origin'");
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
  const write = (client, id, seconds, revision) => client.query('select public.compare_record_lesson_position($1,$2,$3,$4) r', [enrolment, id, seconds, revision]);
  // The real migration retires this writer. Temporarily grant it only in this
  // disposable fixture for the historical race checks, then revoke it again.
  await begin(a); await assert.rejects(write(a, emptyLesson, 20, null), (e) => e.code === '42501'); await a.query('rollback');
  await observer.query('grant execute on function public.compare_record_lesson_position(uuid,uuid,integer,uuid) to authenticated');
  // Two first writes observed no row. The loser must see a conflict, not overwrite.
  await begin(a); await begin(b);
  const first = (await write(a, emptyLesson, 20, null)).rows[0].r;
  const waitingFirst = write(b, emptyLesson, 40, null); await blocked(b, a);
  await a.query('commit'); const staleFirst = (await waitingFirst).rows[0].r; await b.query('commit');
  assert.equal(first.ok, true); assert.equal(staleFirst.ok, false); assert.equal(staleFirst.seconds, 20);
  // The same property applies to an existing row and permits a deliberate rewind.
  await begin(a); await begin(b);
  const firstRewind = (await write(a, emptyLesson, 5, first.revision)).rows[0].r;
  const waitingRewind = write(b, emptyLesson, 80, first.revision); await blocked(b, a);
  await a.query('commit'); const staleRewind = (await waitingRewind).rows[0].r; await b.query('commit');
  assert.equal(firstRewind.ok, true); assert.equal(staleRewind.ok, false); assert.equal(staleRewind.seconds, 5);
  // A concurrent direct status insert is permitted but cannot be overwritten by
  // an absent-row CAS. The loser may fail with unique_violation, not success.
  await begin(a);
  await a.query("insert into public.lesson_progress(course_enrolment_id,lesson_id,status,progress_percent,started_at,completed_at) values($1,$2,'completed',100,now(),now())", [enrolment, completionLesson]);
  await begin(b);
  const waitingInsert = write(b, completionLesson, 60, null);
  const rejected = assert.rejects(waitingInsert, (e) => e.code === '23505');
  await blocked(b, a); await a.query('commit'); await rejected; await b.query('rollback');
  const completion = (await observer.query('select status,last_video_position from public.lesson_progress where course_enrolment_id=$1 and lesson_id=$2', [enrolment, completionLesson])).rows[0];
  assert.deepEqual(completion, { status: 'completed', last_video_position: null });
  await observer.query('revoke all on function public.compare_record_lesson_position(uuid,uuid,integer,uuid) from authenticated');
  await begin(a); await assert.rejects(write(a, emptyLesson, 30, first.revision), (e) => e.code === '42501'); await a.query('rollback');
  // Resource positions share a parent progress row but compare independently.
  const resourceWrite = (client, resource, seconds, revision) => client.query(
    'select public.compare_record_resource_position($1,$2,$3,$4,$5) r', [enrolment, lesson, resource, seconds, revision]);
  await begin(a); await begin(b);
  const resourceFirst = (await resourceWrite(a, resourceA, 30, null)).rows[0].r;
  const waitingResource = resourceWrite(b, resourceA, 60, null); await blocked(b, a);
  await a.query('commit'); const staleResource = (await waitingResource).rows[0].r; await b.query('commit');
  assert.equal(resourceFirst.ok, true); assert.equal(staleResource.ok, false); assert.equal(staleResource.seconds, 30);
  await begin(a); await begin(b);
  const resourceRewind = (await resourceWrite(a, resourceA, 5, resourceFirst.revision)).rows[0].r;
  const waitingOther = resourceWrite(b, resourceB, 90, null); await blocked(b, a);
  await a.query('commit'); const other = (await waitingOther).rows[0].r; await b.query('commit');
  assert.equal(resourceRewind.ok, true); assert.equal(other.ok, true); assert.equal(other.seconds, 90);
  // The resource writer also rechecks the pin after waiting on the enrolment.
  await a.query('begin'); await a.query("set local app.bypassing_enrolment_pin='on'");
  await a.query('update public.course_enrolments set course_version_id=$2 where id=$1', [enrolment, v2]);
  await begin(b);
  const waitingResourcePin = resourceWrite(b, resourceA, 99, resourceRewind.revision);
  const resourcePinRejected = assert.rejects(waitingResourcePin, /not in the version this learner is on/);
  await blocked(b, a); await a.query('commit'); await resourcePinRejected; await b.query('rollback');
  console.log('PostgreSQL selected resume races passed: retired writer boundary, historical races under fixture grant, resource isolation and synthetic pin change.');
} finally { await Promise.all([a.end().catch(() => {}), b.end().catch(() => {}), observer.end().catch(() => {})]); }
