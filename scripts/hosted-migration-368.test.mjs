// The plan for the ten migrations after the 358, run against a real engine
// (PGlite) holding the real migrations, with a stand-in for the CLI. What this
// cannot show: the hosted database's own behaviour, the pooler, or the real
// CLI. The hosted run rehearses on the hosted database for that.
import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { APPLIED_COUNT, APPLIED_HASH, PENDING, PENDING_HASH, localChainProblem, plan368 } from './hosted-migration-368.mjs';
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
// The hosted project as this step needs to find it: the 358 and their history.
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
// A CLI that applies each migration with its history row, as the real one
// does, and then reports `code`. `stopAfter` is how many it gets through.
const fakeCli = (db, calls, { apply = true, code = 0, dryNames = pending, stopAfter = pending.length } = {}) => async (args) => {
  calls.push(args.includes('--dry-run') ? 'dry-run' : 'apply');
  if (args.includes('--dry-run')) return { code: 0, output: names(dryNames) };
  if (apply) for (const name of pending.slice(0, stopAfter)) { await db.exec(sqlOf(name)); await db.exec(record(name)); }
  return { code, output: code ? 'permission denied secret-value' : '' };
};
const run = (client, runCli, over = {}) => plan368({ client, runCli, target: 'not-a-real-url', applied, pending, expected, readSql: sqlOf, log: () => {}, ...over });
const stateOf = async (db) => (await db.query(`select (select count(*)::int from supabase_migrations.schema_migrations) as recorded,
  to_regclass('public.board_threads') is not null as has_boards,
  to_regclass('public.owner_alerts') is not null as has_alerts`)).rows[0];
const BEFORE = { recorded: 358, has_boards: false, has_alerts: false };
const AFTER = { recorded: 368, has_boards: true, has_alerts: true };

test('the reviewed files are pinned, and a later migration does not widen the step', () => {
  assert.equal(applied.length, 358);
  assert.equal(applied.at(-1), '20261281151000_teaching_answer_told.sql');
  assert.deepEqual(pending, PENDING);
  assert.equal(pending.length, 10);
  assert.equal(pending[0], '20261281152000_refunds_policy_plan_given_back.sql');
  assert.equal(pending.at(-1), '20261281161000_board_post_off_the_board_kept.sql');
  assert.equal(chainHash(applied), APPLIED_HASH);
  assert.equal(chainHash(pending), PENDING_HASH);
  assert.equal(localChainProblem(chain), null);
  const pinned = (list) => (list.length === APPLIED_COUNT ? APPLIED_HASH : PENDING_HASH);
  assert.match(localChainProblem([...chain, '20270101000000_later.sql'], pinned), /not exactly the ten reviewed/);
  assert.match(localChainProblem(chain.slice(0, -1), pinned), /not exactly the ten reviewed/);
  assert.match(localChainProblem(chain, (list) => (list.length === APPLIED_COUNT ? APPLIED_HASH : 'changed')), /changed since it was reviewed/);
  assert.match(localChainProblem(chain, () => 'changed'), /first 358/);
  // Each can be rehearsed: nothing in them ends or escapes a transaction.
  for (const name of pending) assert.equal(unsafeInsideTransaction(sqlOf(name)), false, name);
});

test('rehearses, applies and finds the hosted roles as the tested database has them', async () => {
  const { db, client } = await hosted();
  assert.deepEqual(await stateOf(db), BEFORE);
  const calls = []; const said = [];
  const result = await run(client, fakeCli(db, calls), { log: (line) => said.push(line) });
  assert.equal(result.ok, true, result.message);
  assert.deepEqual(calls, ['dry-run', 'apply']);
  assert.match(said.join('\n'), /Rehearsal on the hosted database: the ten migrations ran inside one transaction and were rolled back/);
  assert.match(result.message, /records all 368 migrations in order/);
  assert.match(result.message, new RegExp(`exactly the ${expected.privileges.length} privileges`));
  assert.match(result.message, /turns no switch on/);
  assert.match(result.message, /the privacy notice it adds is a draft/);
  assert.deepEqual(await stateOf(db), AFTER);

  // What the ten leave behind on a project with nobody in it.
  // Every switch they add is off, and email is still off.
  const switches = (await db.query(`select key, value_text from public.platform_settings
    where key in ('community.student_board', 'community.teacher_board', 'family.child_login', 'delivery.notifications') order by key`)).rows;
  assert.deepEqual(switches.map((r) => r.key), ['community.student_board', 'community.teacher_board', 'delivery.notifications', 'family.child_login']);
  for (const row of switches) assert.equal(row.value_text, 'false', row.key);
  // The privacy notice in force is still version 2; version 3 is a draft. The refunds policy has a new version in force.
  const policies = (await db.query(`select d.slug, v.version_number as n, v.status from public.policy_versions v
    join public.policy_documents d on d.id = v.document_id where d.slug in ('privacy', 'refunds') order by d.slug, v.version_number`)).rows;
  assert.deepEqual(policies.filter((r) => r.slug === 'privacy').map((r) => `${r.n}:${r.status}`), ['1:retired', '2:in_force', '3:draft']);
  assert.equal(policies.filter((r) => r.slug === 'refunds' && r.status === 'in_force').length, 1);
  assert.equal(policies.filter((r) => r.slug === 'refunds').at(-1).status, 'in_force');
  // Nothing was written to anybody: no message, no alert, no post.
  assert.deepEqual((await db.query(`select (select count(*)::int from public.notifications) as messages,
    (select count(*)::int from public.owner_alerts) as alerts, (select count(*)::int from public.board_threads) as threads,
    (select count(*)::int from public.board_kept_words) as kept`)).rows[0], { messages: 0, alerts: 0, threads: 0, kept: 0 });
  // The private tables answer neither role; the worker's functions are closed to both.
  for (const table of ['owner_alerts', 'board_kept_words', 'board_threads', 'board_replies', 'board_reports']) {
    for (const role of ['anon', 'authenticated']) {
      assert.equal((await db.query(`select has_table_privilege('${role}', 'public.${table}', 'select') as yes`)).rows[0].yes, false, `${role} reads ${table}`);
    }
  }
  for (const fn of ['claim_owner_alert()', 'settle_owner_alert(uuid,uuid,text,text,text)', 'owner_alert_send_allowed(uuid,uuid,uuid)']) {
    assert.deepEqual((await db.query(`select has_function_privilege('anon', 'public.${fn}', 'execute') as anon, has_function_privilege('authenticated', 'public.${fn}', 'execute') as signed_in`)).rows[0], { anon: false, signed_in: false }, fn);
  }

  // A second run applies nothing and only compares.
  const again = [];
  const second = await run(client, fakeCli(db, again));
  assert.equal(second.ok, true); assert.deepEqual(again, []); assert.match(second.message, /Nothing applied/);
  // …and says so when the roles hold something the tested database does not.
  await db.exec('grant select on public.owner_alerts to authenticated;');
  const third = await run(client, fakeCli(db, again));
  assert.equal(third.ok, false); assert.deepEqual(again, []);
  assert.match(third.message, /held on the hosted database and not on the tested one:[\s\S]*owner_alerts/);
  await db.close();
});

test('stops before applying, and leaves nothing, when a check fails', async () => {
  const { db, client } = await hosted();
  const start = await stateOf(db);
  const calls = [];
  const untouched = async (label) => { assert.deepEqual(await stateOf(db), start, label); assert.ok(!calls.includes('apply'), label); };

  // The fourth fails on the hosted database: named, with the database's code, and the three before it are rolled back with it.
  let result = await run(client, fakeCli(db, calls), { readSql: (name) => (name === pending[3] ? 'comment on table public.board_threads is \'rehearsed\'; revoke all on function public.no_such_function() from anon;' : sqlOf(name)) });
  assert.equal(result.ok, false);
  assert.match(result.message, /Rehearsal stopped in 20261281155000_child_login_from_twelve\.sql\. SQLSTATE 42883/);
  assert.deepEqual(calls, []); await untouched('failed rehearsal');

  // They run, but would leave a role with something the tested database does not give it.
  result = await run(client, fakeCli(db, calls), { readSql: (name) => (name === pending.at(-1) ? `${sqlOf(name)}\ngrant select on public.owner_alerts to authenticated;` : sqlOf(name)) });
  assert.equal(result.ok, false);
  assert.match(result.message, /would not leave the API roles as the tested database has them/);
  assert.match(result.message, /owner_alerts/);
  assert.deepEqual(calls, []); await untouched('differing privileges');

  // The CLI would apply something other than the ten.
  for (const dryNames of [[], [...pending, '20270101000000_later.sql'], pending.slice(0, 9), pending.slice(1), ['20261281151000_teaching_answer_told.sql', ...pending]]) {
    result = await run(client, fakeCli(db, calls, { dryNames }));
    assert.equal(result.ok, false); assert.match(result.message, /does not name exactly the ten reviewed migrations/);
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

test('a history that is not exactly the 358, or a change already made by hand, does not start', async () => {
  const short = await hosted(APPLIED_COUNT - 2);
  const calls = [];
  let result = await run(short.client, fakeCli(short.db, calls));
  assert.equal(result.ok, false); assert.match(result.message, /it records 356/); assert.deepEqual(calls, []);
  await short.db.close();
  // The history says 358, and somebody has already made the first change outside it.
  const { db, client } = await hosted();
  await db.exec(sqlOf(pending[0]));
  result = await run(client, fakeCli(db, calls));
  assert.equal(result.ok, false); assert.match(result.message, /one of the ten migrations' changes is already present/); assert.deepEqual(calls, []);
  await db.close();
});

test('a failure while applying is said as it is, without the CLI\'s own words', async () => {
  // The CLI fails before applying: a second run starts from the same 358 and may apply.
  const early = await hosted(); const earlyCalls = [];
  let result = await run(early.client, fakeCli(early.db, earlyCalls, { apply: false, code: 1 }));
  assert.equal(result.ok, false);
  assert.match(result.message, /history now records 358 migrations\./); assert.doesNotMatch(result.message, /secret-value/);
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
  assert.equal(result.ok, false); assert.match(result.message, /records 358 migrations and is not the 368 expected/);
  await other.db.close();
  // The CLI stops after the third of the ten: said with the number, and a second run does not carry on from there.
  const part = await hosted(); const partCalls = [];
  result = await run(part.client, fakeCli(part.db, partCalls, { stopAfter: 3, code: 1 }));
  assert.equal(result.ok, false);
  assert.match(result.message, /history now records 361 migrations\./);
  assert.match(result.message, /some of the ten may be recorded and the rest not/);
  assert.doesNotMatch(result.message, /secret-value/);
  result = await run(part.client, fakeCli(part.db, partCalls));
  assert.equal(result.ok, false);
  assert.match(result.message, /it records 361/); assert.match(result.message, /this job will not finish it/);
  assert.deepEqual(partCalls, ['dry-run', 'apply']);
  await part.db.close();
});
