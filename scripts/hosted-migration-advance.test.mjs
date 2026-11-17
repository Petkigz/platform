// The plan for the ten migrations after the first 342, run against a real
// engine (PGlite) holding the real migrations, with a stand-in for the CLI.
// What this cannot show: the hosted database's own behaviour, the pooler, or
// the real CLI. The hosted run rehearses on the hosted database for that.
import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { APPLIED_COUNT, APPLIED_HASH, PENDING, PENDING_HASH, advancePlan, chainHash, localChainProblem, privilegeProblems, unsafeInsideTransaction } from './hosted-migration-advance.mjs';
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
// The hosted project as it stands: the first 342 and their history.
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
// A CLI that applies `upTo` of the ten, each with its history row, as the real
// one does, and then reports `code`.
const fakeCli = (db, calls, { upTo = pending.length, code = 0, dryNames = pending } = {}) => async (args) => {
  calls.push(args.includes('--dry-run') ? 'dry-run' : 'apply');
  if (args.includes('--dry-run')) return { code: 0, output: names(dryNames) };
  for (const name of pending.slice(0, upTo)) { await db.exec(sqlOf(name)); await db.exec(record(name)); }
  return { code, output: code ? 'permission denied secret-value' : '' };
};
const run = (client, runCli, over = {}) => advancePlan({ client, runCli, target: 'not-a-real-url', applied, pending, expected, readSql: sqlOf, log: () => {}, ...over });
const stateOf = async (db) => (await db.query(`select (select count(*)::int from supabase_migrations.schema_migrations) as recorded,
  to_regclass('public.lesson_resource_positions') is not null as positions,
  to_regprocedure('public.save_assessment_response(uuid,uuid,jsonb)') is not null as writer,
  has_function_privilege('anon', 'public.notify_user(uuid,text,text,text,text,text,text)', 'execute') as anon_notifies`)).rows[0];

test('the reviewed files are pinned, and a later migration does not widen the step', () => {
  assert.equal(applied.at(-1), '20261281135000_calculated_prayer_times.sql');
  assert.deepEqual(pending, PENDING);
  assert.equal(chainHash(applied), APPLIED_HASH);
  assert.equal(chainHash(pending), PENDING_HASH);
  assert.equal(localChainProblem(chain), null);
  assert.match(localChainProblem([...chain, '20270101000000_later.sql'], (list) => (list.length === APPLIED_COUNT ? APPLIED_HASH : PENDING_HASH)), /not exactly the ten/);
  assert.match(localChainProblem(chain.slice(0, -1), (list) => (list.length === APPLIED_COUNT ? APPLIED_HASH : PENDING_HASH)), /not exactly the ten/);
  assert.match(localChainProblem(chain, (list) => (list.length === APPLIED_COUNT ? APPLIED_HASH : 'changed')), /changed since it was reviewed/);
  assert.match(localChainProblem(chain, () => 'changed'), /first 342/);
  // 1450 must follow 1440: the other order closes a function and reopens it.
  assert.ok(PENDING.indexOf('20261281144000_platform_default_grants.sql') < PENDING.indexOf('20261281145000_assessment_answer_integrity.sql'));
});

test('none of the ten ends or escapes the rehearsal transaction', () => {
  for (const name of pending) assert.equal(unsafeInsideTransaction(sqlOf(name)), false, name);
  for (const sql of ['commit;', 'select 1;\n  ROLLBACK ;', 'begin;\nselect 1;', 'create index concurrently i on t (a);', 'vacuum t;', 'end;']) assert.equal(unsafeInsideTransaction(sql), true, sql);
  assert.equal(unsafeInsideTransaction('create function f() returns int language plpgsql as $$\nbegin\n  return 1;\nend;\n$$;\n-- commit;\ndo $body$\nbegin\n  null;\nend;\n$body$;'), false);
});

test('rehearses, applies and finds the hosted roles as the tested database has them', async () => {
  const { db, client } = await hosted();
  assert.deepEqual(await stateOf(db), { recorded: 342, positions: false, writer: false, anon_notifies: true });
  const calls = []; const said = [];
  const result = await run(client, fakeCli(db, calls), { log: (line) => said.push(line) });
  assert.equal(result.ok, true, result.message);
  assert.deepEqual(calls, ['dry-run', 'apply']);
  assert.match(said.join('\n'), /Rehearsal on the hosted database: all 10 ran inside one transaction and were rolled back/);
  assert.match(result.message, /records all 352 migrations in order/);
  assert.match(result.message, new RegExp(`exactly the ${expected.privileges.length} privileges`));
  assert.deepEqual(await stateOf(db), { recorded: 352, positions: true, writer: true, anon_notifies: false });
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

  // A migration that fails on the hosted database: named, with the database's code.
  let result = await run(client, fakeCli(db, calls), { readSql: (name) => (name === pending[8] ? 'select 1; revoke all on function public.no_such_function() from anon;' : sqlOf(name)) });
  assert.equal(result.ok, false);
  assert.match(result.message, /Rehearsal stopped in 20261281144000_platform_default_grants\.sql\. SQLSTATE 42883/);
  assert.deepEqual(calls, []); await untouched('failed rehearsal');

  // The ten run, but would leave a role with something the tested database does not give it.
  result = await run(client, fakeCli(db, calls), { readSql: (name) => sqlOf(name) + (name === pending[9] ? '\ngrant execute on function public.notify_user(uuid,text,text,text,text,text,text) to anon;' : '') });
  assert.equal(result.ok, false);
  assert.match(result.message, /would not leave the API roles as the tested database has them/);
  assert.match(result.message, /function\|anon\|notify_user\(/);
  assert.deepEqual(calls, []); await untouched('differing privileges');

  // The CLI would apply something other than the ten.
  result = await run(client, fakeCli(db, calls, { dryNames: pending.slice(0, 9) }));
  assert.equal(result.ok, false); assert.match(result.message, /does not name exactly the ten/);
  await untouched('differing dry-run');
  result = await run(client, async (args) => { calls.push('dry-run'); return { code: 1, output: 'password authentication failed secret-value' }; });
  assert.equal(result.ok, false); assert.match(result.message, /Database authentication/); assert.doesNotMatch(result.message, /secret-value/);
  await untouched('failed dry-run');

  // A project that is no longer empty.
  await db.exec(`insert into auth.users (id, email) values ('00000000-0000-4000-8000-000000000001', 'somebody@example.test')`);
  calls.length = 0;
  result = await run(client, fakeCli(db, calls));
  assert.equal(result.ok, false); assert.match(result.message, /approved for a project with no data/); assert.deepEqual(calls, []);
  await db.close();
});

test('a history that is not exactly the 342 does not start', async () => {
  const { db, client } = await hosted(APPLIED_COUNT + 3);
  const calls = [];
  const result = await run(client, fakeCli(db, calls));
  assert.equal(result.ok, false); assert.match(result.message, /it records 345/); assert.deepEqual(calls, []);
  await db.close();
});

test('a failure while applying says how far it got, and a second run refuses', async () => {
  const { db, client } = await hosted();
  const calls = [];
  let result = await run(client, fakeCli(db, calls, { upTo: 3, code: 1 }));
  assert.equal(result.ok, false);
  assert.match(result.message, /history now records 345 migrations \(the first 3 of the ten\)/);
  assert.match(result.message, /does not continue from a partial history/); assert.doesNotMatch(result.message, /secret-value/);
  calls.length = 0;
  result = await run(client, fakeCli(db, calls));
  assert.equal(result.ok, false); assert.deepEqual(calls, []); assert.match(result.message, /it records 345/);
  await db.close();
  // The CLI fails before applying anything: a second run starts from the same 342 and may apply.
  const early = await hosted(); const earlyCalls = [];
  result = await run(early.client, fakeCli(early.db, earlyCalls, { upTo: 0, code: 1 }));
  assert.equal(result.ok, false); assert.match(result.message, /history now records 342 migrations\./);
  result = await run(early.client, fakeCli(early.db, earlyCalls));
  assert.equal(result.ok, true, result.message); assert.deepEqual(earlyCalls, ['dry-run', 'apply', 'dry-run', 'apply']);
  await early.db.close();
  // A lost connection after the CLI started: the outcome is said to be unknown.
  const lost = await hosted();
  result = await run(lost.client, async (args) => { if (args.includes('--dry-run')) return { code: 0, output: names(pending) }; lost.client.query = async () => { throw new Error('connection terminated host.example'); }; return { code: 0, output: '' }; });
  assert.equal(result.ok, false); assert.match(result.message, /is not known/); assert.doesNotMatch(result.message, /host\.example/);
  await lost.db.close();
  // The CLI says it succeeded but recorded fewer.
  const other = await hosted();
  result = await run(other.client, fakeCli(other.db, [], { upTo: 9 }));
  assert.equal(result.ok, false); assert.match(result.message, /records 351 migrations and is not the 352 expected/);
  await other.db.close();
});

test('differences are listed by name, both ways', () => {
  const problems = privilegeProblems({ privileges: ['a', 'b'], defaults: ['d'] }, { privileges: ['b', 'c'], defaults: [] });
  assert.equal(problems.length, 3);
  assert.match(problems[0], /1 held on the hosted database and not on the tested one:\s+c/);
  assert.match(problems[1], /1 held on the tested database and not on the hosted one:\s+a/);
  assert.match(problems[2], /Defaults for the next object: 1 held on the tested database/);
});
