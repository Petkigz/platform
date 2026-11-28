// The plan for the one migration after the 370 (a review is decided by the
// reviewer it was given to, in their own name), run against a real engine
// (PGlite) holding the real migrations, with a stand-in for the CLI. What
// this cannot show: the hosted database's own behaviour, the pooler, or the
// real CLI. The hosted run rehearses on the hosted database for that.
import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { APPLIED_COUNT, APPLIED_HASH, PENDING, PENDING_HASH, localChainProblem, plan371, refusesAnotherName } from './hosted-migration-371.mjs';
import { chainHash, unsafeInsideTransaction } from './hosted-migration-advance.mjs';
import { localMigrations, reference } from './api-role-privileges.mjs';

const dir = new URL('../supabase/migrations/', import.meta.url);
const sqlOf = (name) => readFileSync(new URL(name, dir), 'utf8');
const harness = readFileSync(new URL('../supabase/tests/harness.sql', import.meta.url), 'utf8');
// Later migrations must not change what this one-time step is allowed to do.
const chain = localMigrations().slice(0, APPLIED_COUNT + PENDING.length);
const applied = chain.slice(0, APPLIED_COUNT); const pending = chain.slice(APPLIED_COUNT);
let expected;
before(async () => { expected = await reference(chain.length); });

const record = (name) => `insert into supabase_migrations.schema_migrations (version, name) values ('${name.slice(0, 14)}', '${name.slice(15, -4)}');`;
// The hosted project as this step needs to find it: the 370 and their history.
async function hosted(count = APPLIED_COUNT) {
  const db = new PGlite();
  await db.exec(harness);
  await db.exec('create schema supabase_migrations; create table supabase_migrations.schema_migrations (version text primary key, name text);');
  for (const name of chain.slice(0, count)) { await db.exec(sqlOf(name)); await db.exec(record(name)); }
  // pg's client runs a string of several statements as one; PGlite needs exec.
  // PGlite's only database is not called postgres; the hosted one is, and the
  // plan insists on it.
  const client = { query: async (sql) => (/;\s*\S/.test(sql.replace(/--[^\n]*/g, '')) ? (await db.exec(sql), { rows: [] }) : db.query(sql.replace('current_database() as database', `'postgres'::text as database`))) };
  return { db, client };
}
const names = (list) => list.map((x) => ` • ${x}`).join('\n');
// A CLI that applies the migration with its history row, as the real one does,
// and then reports `code`.
const fakeCli = (db, calls, { apply = true, code = 0, dryNames = pending } = {}) => async (args) => {
  calls.push(args.includes('--dry-run') ? 'dry-run' : 'apply');
  if (args.includes('--dry-run')) return { code: 0, output: names(dryNames) };
  if (apply) for (const name of pending) { await db.exec(sqlOf(name)); await db.exec(record(name)); }
  return { code, output: code ? 'permission denied secret-value' : '' };
};
const run = (client, runCli, over = {}) => plan371({ client, runCli, target: 'not-a-real-url', applied, pending, expected, readSql: sqlOf, log: () => {}, ...over });
const stateOf = async (db) => (await db.query(`select (select count(*)::int from supabase_migrations.schema_migrations) as recorded,
  (select count(*)::int from pg_proc where pronamespace = 'public'::regnamespace and proname in ('set_course_version_status', 're_pin_enrolment') and prosrc like '%in your own name%') as own_name,
  (select count(*)::int from pg_trigger where not tgisinternal and tgname in ('cra_guard_update', 'crd_complete_assignment')) as triggers,
  (select count(*)::int from public.content_review_assignments) as assignments,
  (select count(*)::int from public.content_review_decisions) as decisions`)).rows[0];
const BEFORE = { recorded: 370, own_name: 0, triggers: 0, assignments: 0, decisions: 0 };
const AFTER = { recorded: 371, own_name: 2, triggers: 2, assignments: 0, decisions: 0 };

const ADMIN = '00000000-0000-4000-8000-000000000a01';
const TEACHER = '00000000-0000-4000-8000-000000000a02';
const REVIEWER = '00000000-0000-4000-8000-000000000a03';
// A project somebody has used: a submitted course, a reviewer, and one review
// decided while still marked accepted (which is how a decision left it until
// this migration). Written as the server writes, with no session.
async function used(db) {
  for (const [id, email] of [[ADMIN, 'admin'], [TEACHER, 'teacher'], [REVIEWER, 'reviewer']]) {
    await db.exec(`insert into auth.users (id, email) values ('${id}', '${email}@example.test')`);
  }
  await db.exec(`
    insert into public.courses (id, slug, title, audience, created_by, status)
      values ('00000000-0000-4000-8000-000000000c01', 'step-371', 'Step 371', 'both', '${TEACHER}', 'active');
    insert into public.course_versions (id, course_id, version_number, language, created_by)
      values ('00000000-0000-4000-8000-000000000c02', '00000000-0000-4000-8000-000000000c01', 1, 'en', '${TEACHER}');
    insert into public.reviewer_profiles (id, user_id, reviewer_status, verified_at, verified_by)
      values ('00000000-0000-4000-8000-000000000c03', '${REVIEWER}', 'active', now(), '${ADMIN}');
    insert into public.content_review_assignments (id, course_version_id, reviewer_profile_id, review_scope, assigned_by, assignment_status, accepted_at)
      values ('00000000-0000-4000-8000-000000000c04', '00000000-0000-4000-8000-000000000c02', '00000000-0000-4000-8000-000000000c03', 'scholarly', '${ADMIN}', 'accepted', now());
    insert into public.content_review_decisions (review_assignment_id, course_version_id, review_scope, decision, rationale, decided_by)
      values ('00000000-0000-4000-8000-000000000c04', '00000000-0000-4000-8000-000000000c02', 'scholarly', 'approved', 'Read through.', '${REVIEWER}');`);
}
const reviewOf = async (db) => (await db.query(`select assignment_status, accepted_at::text as accepted_at, completed_at::text as completed_at from public.content_review_assignments`)).rows;

test('the reviewed files are pinned, and a later migration does not widen the step', () => {
  assert.equal(applied.length, 370);
  assert.equal(applied.at(-1), '20261281163000_duplicate_subjects_retired.sql');
  assert.deepEqual(pending, PENDING);
  assert.deepEqual(pending, ['20261281164000_review_decided_in_own_name.sql']);
  assert.equal(chainHash(applied), APPLIED_HASH);
  assert.equal(chainHash(pending), PENDING_HASH);
  assert.equal(localChainProblem(chain), null);
  const pinned = (list) => (list.length === APPLIED_COUNT ? APPLIED_HASH : PENDING_HASH);
  assert.match(localChainProblem([...chain, '20270101000000_later.sql'], pinned), /not exactly the one reviewed/);
  assert.match(localChainProblem(chain.slice(0, -1), pinned), /not exactly the one reviewed/);
  assert.match(localChainProblem(chain, (list) => (list.length === APPLIED_COUNT ? APPLIED_HASH : 'changed')), /changed since it was reviewed/);
  assert.match(localChainProblem(chain, () => 'changed'), /first 370/);
  // It can be rehearsed: nothing in it ends or escapes a transaction.
  assert.equal(unsafeInsideTransaction(sqlOf(pending[0])), false);
});

test('rehearses, applies, and finds the hole shut and the roles as the tested database has them', async () => {
  const { db, client } = await hosted();
  assert.deepEqual(await stateOf(db), BEFORE);
  // The hole, as the job asks about it: open before.
  await db.query('begin');
  assert.equal(await refusesAnotherName(client), false);
  await db.query('rollback');
  const calls = []; const said = [];
  const result = await run(client, fakeCli(db, calls), { log: (line) => said.push(line) });
  assert.equal(result.ok, true, result.message);
  assert.deepEqual(calls, ['dry-run', 'apply']);
  assert.match(said.join('\n'), /none of what the migration adds is there, and a change in somebody else's name is not refused; 0 assignments and 0 decisions/);
  assert.match(said.join('\n'), /Rehearsal on the hosted database: the migration ran inside one transaction and was rolled back; with it, a change in somebody else's name was refused, both triggers and the decision rule were in place/);
  assert.match(result.message, /records all 371 migrations in order; asked as a signed-in person to move a course version in somebody else's name, the database refuses/);
  assert.match(result.message, new RegExp(`exactly the ${expected.privileges.length} privileges`));
  assert.match(result.message, /was not asked through a real session, and it turns no switch on/);
  assert.deepEqual(await stateOf(db), AFTER);
  await db.query('begin');
  assert.equal(await refusesAnotherName(client), true);
  // The question leaves nobody signed in behind it.
  assert.equal((await db.query(`select coalesce(current_setting('request.jwt.claims', true), '') as claims`)).rows[0].claims, '');
  await db.query('rollback');
  // A second run applies nothing and only compares.
  const again = [];
  const second = await run(client, fakeCli(db, again));
  assert.equal(second.ok, true, second.message); assert.deepEqual(again, []); assert.match(second.message, /Nothing applied: all 371 migrations are already recorded; a change in somebody else's name is refused/);
  // …and says so when the roles hold something the tested database does not.
  await db.exec('grant execute on function public.notify_user(uuid,text,text,text,text,text,text) to anon;');
  const third = await run(client, fakeCli(db, again));
  assert.equal(third.ok, false); assert.deepEqual(again, []);
  assert.match(third.message, /1 held on the hosted database and not on the tested one:\s+function\|anon\|notify_user\(/);
  // …and when the history says 371 and a function is the old one again.
  await db.exec('revoke execute on function public.notify_user(uuid,text,text,text,text,text,text) from anon;');
  await db.exec(sqlOf('20261017000100_enrolments.sql').match(/create or replace function public\.re_pin_enrolment\([\s\S]*?\$\$;/)[0]);
  const fourth = await run(client, fakeCli(db, again));
  assert.equal(fourth.ok, false); assert.deepEqual(again, []);
  assert.match(fourth.message, /already recorded, but what the last one adds is not all there \(1 of the 2 functions asking whose name/);
  await db.close();
});

test('a project somebody has used: every assignment and decision is left exactly as it was', async () => {
  const { db, client } = await hosted();
  await used(db);
  const start = await reviewOf(db);
  assert.deepEqual(start.map((r) => r.assignment_status), ['accepted']);
  const calls = []; const said = [];
  const result = await run(client, fakeCli(db, calls), { log: (line) => said.push(line) });
  assert.equal(result.ok, true, result.message); assert.deepEqual(calls, ['dry-run', 'apply']);
  assert.match(said.join('\n'), /all 1 assignments and 1 decisions were as before/);
  assert.match(result.message, /1 assignments and 1 decisions, where there were 1 and 1/);
  assert.deepEqual(await reviewOf(db), start, 'a review already decided keeps the state it was in');
  assert.equal((await db.query('select count(*)::int as n from auth.users')).rows[0].n, 3);

  // A migration that touched a review would be stopped in rehearsal.
  const other = await hosted();
  await used(other.db);
  const otherCalls = [];
  const touched = await run(other.client, fakeCli(other.db, otherCalls), {
    readSql: (name) => `${sqlOf(name)}\nupdate public.content_review_assignments set assignment_status = 'completed', completed_at = now();` });
  assert.equal(touched.ok, false);
  assert.match(touched.message, /changed a row it is meant to leave alone: 1 assignments and 1 decisions where there were 1 and 1, or an assignment's state or times/);
  assert.deepEqual(otherCalls, []);
  assert.deepEqual((await reviewOf(other.db)).map((r) => [r.assignment_status, r.completed_at]), [['accepted', null]]);
  await db.close(); await other.db.close();
});

test('stops before applying, and leaves nothing, when a check fails', async () => {
  const { db, client } = await hosted();
  const start = await stateOf(db);
  const calls = [];
  const untouched = async (label) => { assert.deepEqual(await stateOf(db), start, label); assert.ok(!calls.includes('apply'), label); };

  // The migration fails on the hosted database: named, with the database's code.
  let result = await run(client, fakeCli(db, calls), { readSql: () => 'comment on table public.subject_areas is \'rehearsed\'; revoke all on function public.no_such_function() from anon;' });
  assert.equal(result.ok, false);
  assert.match(result.message, /Rehearsal stopped in 20261281164000_review_decided_in_own_name\.sql\. SQLSTATE 42883/);
  assert.deepEqual(calls, []); await untouched('failed rehearsal');

  // It runs and does not shut the hole.
  result = await run(client, fakeCli(db, calls), { readSql: () => 'comment on table public.subject_areas is \'rehearsed\';' });
  assert.equal(result.ok, false);
  assert.match(result.message, /In rehearsal the migration left 0 of the 2 functions asking whose name, 0 of the 2 triggers, 0 of the 1 decision rule, and a change in somebody else's name was NOT refused\. Nothing was changed/);
  assert.deepEqual(calls, []); await untouched('a migration that shuts nothing');

  // It runs, but would leave a role with something the tested database does not give it.
  result = await run(client, fakeCli(db, calls), { readSql: (name) => `${sqlOf(name)}\ngrant execute on function public.notify_user(uuid,text,text,text,text,text,text) to anon;` });
  assert.equal(result.ok, false);
  assert.match(result.message, /would not leave the API roles as the tested database has them/);
  assert.match(result.message, /function\|anon\|notify_user\(/);
  assert.deepEqual(calls, []); await untouched('differing privileges');

  // The CLI would apply something other than the one.
  for (const dryNames of [[], [...pending, '20270101000000_later.sql'], ['20261281163000_duplicate_subjects_retired.sql']]) {
    result = await run(client, fakeCli(db, calls, { dryNames }));
    assert.equal(result.ok, false); assert.match(result.message, /does not name exactly the one reviewed migration/);
    await untouched('differing dry-run');
  }
  result = await run(client, async () => { calls.push('dry-run'); return { code: 1, output: 'password authentication failed secret-value' }; });
  assert.equal(result.ok, false); assert.match(result.message, /Database authentication/); assert.doesNotMatch(result.message, /secret-value/);
  await untouched('failed dry-run');

  await db.close();
});

test('a history that is not exactly the 370, or a change already made by hand, does not start', async () => {
  const short = await hosted(APPLIED_COUNT - 2);
  const calls = [];
  let result = await run(short.client, fakeCli(short.db, calls));
  assert.equal(result.ok, false); assert.match(result.message, /it records 368/); assert.deepEqual(calls, []);
  await short.db.close();
  // The history says 370, and somebody has already made the change outside it.
  const { db, client } = await hosted();
  await db.exec(sqlOf(pending[0]));
  result = await run(client, fakeCli(db, calls));
  assert.equal(result.ok, false);
  assert.match(result.message, /not as this step expects before it runs \(2 of the 2 functions asking whose name, 2 of the 2 triggers, 1 of the 1 decision rule; a change in somebody else's name is already refused\)/);
  assert.deepEqual(calls, []);
  await db.close();
});

test('a failure while applying is said as it is, without the CLI\'s own words', async () => {
  // The CLI fails before applying: a second run starts from the same 370 and may apply.
  const early = await hosted(); const earlyCalls = [];
  let result = await run(early.client, fakeCli(early.db, earlyCalls, { apply: false, code: 1 }));
  assert.equal(result.ok, false);
  assert.match(result.message, /history now records 370 migrations\./); assert.doesNotMatch(result.message, /secret-value/);
  result = await run(early.client, fakeCli(early.db, earlyCalls));
  assert.equal(result.ok, true, result.message); assert.deepEqual(earlyCalls, ['dry-run', 'apply', 'dry-run', 'apply']);
  await early.db.close();
  // A lost connection after the CLI started: the outcome is said to be unknown.
  const lost = await hosted();
  result = await run(lost.client, async (args) => { if (args.includes('--dry-run')) return { code: 0, output: names(pending) }; lost.client.query = async () => { throw new Error('connection terminated host.example'); }; return { code: 0, output: '' }; });
  assert.equal(result.ok, false); assert.match(result.message, /is not known/); assert.doesNotMatch(result.message, /host\.example/);
  await lost.db.close();
  // The CLI says it succeeded and recorded nothing.
  const other = await hosted();
  result = await run(other.client, fakeCli(other.db, [], { apply: false }));
  assert.equal(result.ok, false); assert.match(result.message, /records 370 migrations and is not the 371 expected/);
  await other.db.close();
});
