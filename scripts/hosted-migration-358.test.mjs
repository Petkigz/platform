// The plan for the one migration after the 357, run against a real engine
// (PGlite) holding the real migrations, with a stand-in for the CLI. What this
// cannot show: the hosted database's own behaviour, the pooler, or the real
// CLI. The hosted run rehearses on the hosted database for that.
import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { APPLIED_COUNT, APPLIED_HASH, PENDING, PENDING_HASH, localChainProblem, plan358 } from './hosted-migration-358.mjs';
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
// The hosted project as this step needs to find it: the 357 and their history.
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
const run = (client, runCli, over = {}) => plan358({ client, runCli, target: 'not-a-real-url', applied, pending, expected, readSql: sqlOf, log: () => {}, ...over });
const stateOf = async (db) => (await db.query(`select (select count(*)::int from supabase_migrations.schema_migrations) as recorded,
  (select position('teaching_answered' in p.prosrc) > 0 from pg_proc p where p.oid = 'public.decide_teaching_application(uuid,boolean,text)'::regprocedure) as has_telling`)).rows[0];

test('the reviewed files are pinned, and a later migration does not widen the step', () => {
  assert.equal(applied.length, 357);
  assert.equal(applied.at(-1), '20261281150000_plan_refund_ends_plan.sql');
  assert.deepEqual(pending, PENDING);
  assert.deepEqual(pending, ['20261281151000_teaching_answer_told.sql']);
  assert.equal(chainHash(applied), APPLIED_HASH);
  assert.equal(chainHash(pending), PENDING_HASH);
  assert.equal(localChainProblem(chain), null);
  const pinned = (list) => (list.length === APPLIED_COUNT ? APPLIED_HASH : PENDING_HASH);
  assert.match(localChainProblem([...chain, '20270101000000_later.sql'], pinned), /not exactly the one reviewed/);
  assert.match(localChainProblem(chain.slice(0, -1), pinned), /not exactly the one reviewed/);
  assert.match(localChainProblem(chain, (list) => (list.length === APPLIED_COUNT ? APPLIED_HASH : 'changed')), /changed since it was reviewed/);
  assert.match(localChainProblem(chain, () => 'changed'), /first 357/);
  // It can be rehearsed: nothing in it ends or escapes a transaction.
  assert.equal(unsafeInsideTransaction(sqlOf(pending[0])), false);
});

test('rehearses, applies and finds the hosted roles as the tested database has them', async () => {
  const { db, client } = await hosted();
  assert.deepEqual(await stateOf(db), { recorded: 357, has_telling: false });
  const calls = []; const said = [];
  const result = await run(client, fakeCli(db, calls), { log: (line) => said.push(line) });
  assert.equal(result.ok, true, result.message);
  assert.deepEqual(calls, ['dry-run', 'apply']);
  assert.match(said.join('\n'), /Rehearsal on the hosted database: the migration ran inside one transaction and was rolled back/);
  assert.match(result.message, /records all 358 migrations in order/);
  assert.match(result.message, new RegExp(`exactly the ${expected.privileges.length} privileges`));
  assert.match(result.message, /turns no switch on/);
  assert.deepEqual(await stateOf(db), { recorded: 358, has_telling: true });
  // The functions it replaces stay closed to a visitor and open to somebody signed in, as on the tested database.
  for (const fn of ['decide_teaching_application(uuid,boolean,text)', 'my_teaching_application()', 'set_notification_preference(text,boolean)', 'my_notification_preferences()']) {
    assert.deepEqual((await db.query(`select has_function_privilege('anon', 'public.${fn}', 'execute') as anon, has_function_privilege('authenticated', 'public.${fn}', 'execute') as signed_in`)).rows[0], { anon: false, signed_in: true }, fn);
  }
  // The word is in both closed lists, and nowhere is a message written by applying it.
  assert.deepEqual((await db.query(`select (select count(*)::int from pg_constraint where conname in ('notifications_kind_check', 'notification_preferences_kind_check') and position('teaching_answered' in pg_get_constraintdef(oid)) > 0) as lists, (select count(*)::int from public.notifications) as messages`)).rows[0], { lists: 2, messages: 0 });
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
  let result = await run(client, fakeCli(db, calls), { readSql: () => 'comment on table public.teaching_applications is \'rehearsed\'; revoke all on function public.no_such_function() from anon;' });
  assert.equal(result.ok, false);
  assert.match(result.message, /Rehearsal stopped in 20261281151000_teaching_answer_told\.sql\. SQLSTATE 42883/);
  assert.deepEqual(calls, []); await untouched('failed rehearsal');

  // It runs, but would leave a role with something the tested database does not give it.
  result = await run(client, fakeCli(db, calls), { readSql: (name) => `${sqlOf(name)}\ngrant execute on function public.notify_user(uuid,text,text,text,text,text,text) to anon;` });
  assert.equal(result.ok, false);
  assert.match(result.message, /would not leave the API roles as the tested database has them/);
  assert.match(result.message, /function\|anon\|notify_user\(/);
  assert.deepEqual(calls, []); await untouched('differing privileges');

  // The CLI would apply something other than the one.
  for (const dryNames of [[], [...pending, '20270101000000_later.sql'], ['20261281150000_plan_refund_ends_plan.sql']]) {
    result = await run(client, fakeCli(db, calls, { dryNames }));
    assert.equal(result.ok, false); assert.match(result.message, /does not name exactly the one reviewed migration/);
    await untouched('differing dry-run');
  }
  result = await run(client, async () => { calls.push('dry-run'); return { code: 1, output: 'password authentication failed secret-value' }; });
  assert.equal(result.ok, false); assert.match(result.message, /Database authentication/); assert.doesNotMatch(result.message, /secret-value/);
  await untouched('failed dry-run');

  // A project that is no longer empty.
  await db.exec(`insert into auth.users (id, email) values ('00000000-0000-4000-8000-000000000001', 'somebody@example.test')`);
  calls.length = 0;
  result = await run(client, fakeCli(db, calls));
  assert.equal(result.ok, false); assert.match(result.message, /approved for a project with no data/); assert.deepEqual(calls, []);
  await db.close();
});

test('a history that is not exactly the 357, or a change already made by hand, does not start', async () => {
  const short = await hosted(APPLIED_COUNT - 2);
  const calls = [];
  let result = await run(short.client, fakeCli(short.db, calls));
  assert.equal(result.ok, false); assert.match(result.message, /it records 355/); assert.deepEqual(calls, []);
  await short.db.close();
  // The history says 357, and somebody has already made the change outside it.
  const { db, client } = await hosted();
  await db.exec(sqlOf(pending[0]));
  result = await run(client, fakeCli(db, calls));
  assert.equal(result.ok, false); assert.match(result.message, /the migration's change is already present/); assert.deepEqual(calls, []);
  await db.close();
});

test('a failure while applying is said as it is, without the CLI\'s own words', async () => {
  // The CLI fails before applying: a second run starts from the same 357 and may apply.
  const early = await hosted(); const earlyCalls = [];
  let result = await run(early.client, fakeCli(early.db, earlyCalls, { apply: false, code: 1 }));
  assert.equal(result.ok, false);
  assert.match(result.message, /history now records 357 migrations\./); assert.doesNotMatch(result.message, /secret-value/);
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
  assert.equal(result.ok, false); assert.match(result.message, /records 357 migrations and is not the 358 expected/);
  await other.db.close();
});
