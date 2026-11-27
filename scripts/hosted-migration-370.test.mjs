// The plan for the one migration after the 369 (the two duplicate subjects
// retired), run against a real engine (PGlite) holding the real migrations,
// with a stand-in for the CLI. What this cannot show: the hosted database's
// own behaviour, the pooler, or the real CLI. The hosted run rehearses on the
// hosted database for that.
//
// It also holds the one branch of the migration its suite cannot reach,
// because a suite runs after the migration has: a duplicate that something
// points at is left alone.
import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { APPLIED_COUNT, APPLIED_HASH, PENDING, PENDING_HASH, localChainProblem, plan370 } from './hosted-migration-370.mjs';
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
// The hosted project as this step needs to find it: the 369 and their history.
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
const run = (client, runCli, over = {}) => plan370({ client, runCli, target: 'not-a-real-url', applied, pending, expected, readSql: sqlOf, log: () => {}, ...over });
const stateOf = async (db) => (await db.query(`select (select count(*)::int from supabase_migrations.schema_migrations) as recorded,
  (select count(*)::int from public.subject_areas where code in ('aqidah', 'islamic-history') and status = 'active') as duplicates_active,
  (select count(*)::int from public.subject_areas where code in ('aqeedah', 'history') and status = 'active') as kept_active,
  (select count(*)::int from public.subject_areas) as subjects`)).rows[0];
const BEFORE = { recorded: 369, duplicates_active: 2, kept_active: 2, subjects: 37 };
const AFTER = { recorded: 370, duplicates_active: 0, kept_active: 2, subjects: 37 };

test('the reviewed files are pinned, and a later migration does not widen the step', () => {
  assert.equal(applied.length, 369);
  assert.equal(applied.at(-1), '20261281162000_provider_events.sql');
  assert.deepEqual(pending, PENDING);
  assert.deepEqual(pending, ['20261281163000_duplicate_subjects_retired.sql']);
  assert.equal(chainHash(applied), APPLIED_HASH);
  assert.equal(chainHash(pending), PENDING_HASH);
  assert.equal(localChainProblem(chain), null);
  const pinned = (list) => (list.length === APPLIED_COUNT ? APPLIED_HASH : PENDING_HASH);
  assert.match(localChainProblem([...chain, '20270101000000_later.sql'], pinned), /not exactly the one reviewed/);
  assert.match(localChainProblem(chain.slice(0, -1), pinned), /not exactly the one reviewed/);
  assert.match(localChainProblem(chain, (list) => (list.length === APPLIED_COUNT ? APPLIED_HASH : 'changed')), /changed since it was reviewed/);
  assert.match(localChainProblem(chain, () => 'changed'), /first 369/);
  // It can be rehearsed: nothing in it ends or escapes a transaction.
  assert.equal(unsafeInsideTransaction(sqlOf(pending[0])), false);
});

test('rehearses, applies and finds the hosted roles as the tested database has them', async () => {
  const { db, client } = await hosted();
  assert.deepEqual(await stateOf(db), BEFORE);
  const calls = []; const said = [];
  const result = await run(client, fakeCli(db, calls), { log: (line) => said.push(line) });
  assert.equal(result.ok, true, result.message);
  assert.deepEqual(calls, ['dry-run', 'apply']);
  assert.match(said.join('\n'), /both duplicates and both subjects that stay are active, among 37 subjects/);
  assert.match(said.join('\n'), /Rehearsal on the hosted database: the migration ran inside one transaction and was rolled back; it retired exactly the two duplicates and left all 37 subjects in place/);
  assert.match(result.message, /records all 370 migrations in order; aqidah and islamic-history are retired, aqeedah and history are active, and all 37 subjects are still there/);
  assert.match(result.message, new RegExp(`exactly the ${expected.privileges.length} privileges`));
  assert.match(result.message, /turns no switch on/);
  assert.deepEqual(await stateOf(db), AFTER);
  // What a visitor's catalogue reads: nine disciplines, no name twice.
  const seen = (await db.query(`select lower(name) as name from public.subject_areas where status = 'active' and deleted_at is null and parent_subject_id is null order by 1`)).rows.map((r) => r.name);
  assert.equal(seen.length, 9); assert.equal(new Set(seen).size, 9);
  // Retired, not deleted, and written to the audit log by the table's own trigger, once each, by nobody.
  assert.deepEqual((await db.query(`select s.code, s.status, s.deleted_at, (select count(*)::int from public.governance_audit_events e where e.action = 'subject.retired' and e.target_id = s.id and e.actor is null) as logged
    from public.subject_areas s where s.code in ('aqidah', 'islamic-history') order by 1`)).rows,
  [{ code: 'aqidah', status: 'retired', deleted_at: null, logged: 1 }, { code: 'islamic-history', status: 'retired', deleted_at: null, logged: 1 }]);
  // A second run applies nothing and only compares.
  const again = [];
  const second = await run(client, fakeCli(db, again));
  assert.equal(second.ok, true); assert.deepEqual(again, []); assert.match(second.message, /Nothing applied/);
  // …and says so when the roles hold something the tested database does not.
  await db.exec('grant execute on function public.notify_user(uuid,text,text,text,text,text,text) to anon;');
  const third = await run(client, fakeCli(db, again));
  assert.equal(third.ok, false); assert.deepEqual(again, []);
  assert.match(third.message, /1 held on the hosted database and not on the tested one:\s+function\|anon\|notify_user\(/);
  await db.close();
});

test('stops before applying, and leaves nothing, when a check fails', async () => {
  const { db, client } = await hosted();
  const start = await stateOf(db);
  const calls = [];
  const untouched = async (label) => { assert.deepEqual(await stateOf(db), start, label); assert.ok(!calls.includes('apply'), label); };

  // The migration fails on the hosted database: named, with the database's code.
  let result = await run(client, fakeCli(db, calls), { readSql: () => 'comment on table public.subject_areas is \'rehearsed\'; revoke all on function public.no_such_function() from anon;' });
  assert.equal(result.ok, false);
  assert.match(result.message, /Rehearsal stopped in 20261281163000_duplicate_subjects_retired\.sql\. SQLSTATE 42883/);
  assert.deepEqual(calls, []); await untouched('failed rehearsal');

  // It runs, but would leave a role with something the tested database does not give it.
  result = await run(client, fakeCli(db, calls), { readSql: (name) => `${sqlOf(name)}\ngrant execute on function public.notify_user(uuid,text,text,text,text,text,text) to anon;` });
  assert.equal(result.ok, false);
  assert.match(result.message, /would not leave the API roles as the tested database has them/);
  assert.match(result.message, /function\|anon\|notify_user\(/);
  assert.deepEqual(calls, []); await untouched('differing privileges');

  // The CLI would apply something other than the one.
  for (const dryNames of [[], [...pending, '20270101000000_later.sql'], ['20261281162000_provider_events.sql']]) {
    result = await run(client, fakeCli(db, calls, { dryNames }));
    assert.equal(result.ok, false); assert.match(result.message, /does not name exactly the one reviewed migration/);
    await untouched('differing dry-run');
  }
  result = await run(client, async () => { calls.push('dry-run'); return { code: 1, output: 'password authentication failed secret-value' }; });
  assert.equal(result.ok, false); assert.match(result.message, /Database authentication/); assert.doesNotMatch(result.message, /secret-value/);
  await untouched('failed dry-run');

  await db.close();
});

test('a project that holds an account is not refused: this step is for a deployed site', async () => {
  const { db, client } = await hosted();
  await db.exec(`insert into auth.users (id, email) values ('00000000-0000-4000-8000-000000000001', 'somebody@example.test')`);
  const calls = [];
  const result = await run(client, fakeCli(db, calls));
  assert.equal(result.ok, true, result.message); assert.deepEqual(calls, ['dry-run', 'apply']);
  assert.deepEqual(await stateOf(db), AFTER);
  assert.equal((await db.query('select count(*)::int as n from auth.users')).rows[0].n, 1);
  await db.close();
});

test('a duplicate that something points at is left alone, and the job applies nothing', async () => {
  // The migration by itself, on a database where a subdivision was filed under the duplicate.
  const pointed = await hosted();
  await pointed.db.exec(`insert into public.subject_areas (code, name, parent_subject_id) select 'aqidah.creed', 'Creed', id from public.subject_areas where code = 'aqidah'`);
  await pointed.db.exec(sqlOf(pending[0]));
  assert.deepEqual((await pointed.db.query(`select code, status from public.subject_areas where code in ('aqidah', 'islamic-history') order by 1`)).rows,
    [{ code: 'aqidah', status: 'active' }, { code: 'islamic-history', status: 'retired' }], 'only the one nothing points at is retired');
  assert.equal((await pointed.db.query(`select count(*)::int as n from public.subject_areas where code = 'aqidah.creed' and status = 'active'`)).rows[0].n, 1, 'and what pointed at it is untouched');
  await pointed.db.close();

  // The job, on such a database: the rehearsal sees one duplicate left, and nothing is applied.
  const { db, client } = await hosted();
  await db.exec(`insert into public.subject_areas (code, name, parent_subject_id) select 'history.early', 'Early', id from public.subject_areas where code = 'islamic-history'`);
  const start = await stateOf(db);
  const calls = [];
  const result = await run(client, fakeCli(db, calls));
  assert.equal(result.ok, false);
  assert.match(result.message, /In rehearsal the migration left 1 of the 2 duplicates active, 2 of the 2 that stay active, and 38 subjects where there were 38/);
  assert.match(result.message, /something on the hosted database does\. Nothing was changed/);
  assert.deepEqual(calls, []); assert.deepEqual(await stateOf(db), start);
  await db.close();
});

test('a history that is not exactly the 369, or a change already made by hand, does not start', async () => {
  const short = await hosted(APPLIED_COUNT - 2);
  const calls = [];
  let result = await run(short.client, fakeCli(short.db, calls));
  assert.equal(result.ok, false); assert.match(result.message, /it records 367/); assert.deepEqual(calls, []);
  await short.db.close();
  // The history says 369, and somebody has already made the change outside it.
  const { db, client } = await hosted();
  await db.exec(sqlOf(pending[0]));
  result = await run(client, fakeCli(db, calls));
  assert.equal(result.ok, false); assert.match(result.message, /the four subjects are not as this step expects \(0 of the 2 duplicates active, 2 of the 2 that stay active\)/); assert.deepEqual(calls, []);
  await db.close();
});

test('a failure while applying is said as it is, without the CLI\'s own words', async () => {
  // The CLI fails before applying: a second run starts from the same 369 and may apply.
  const early = await hosted(); const earlyCalls = [];
  let result = await run(early.client, fakeCli(early.db, earlyCalls, { apply: false, code: 1 }));
  assert.equal(result.ok, false);
  assert.match(result.message, /history now records 369 migrations\./); assert.doesNotMatch(result.message, /secret-value/);
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
  assert.equal(result.ok, false); assert.match(result.message, /records 369 migrations and is not the 370 expected/);
  await other.db.close();
});
