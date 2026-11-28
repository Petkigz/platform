// The plan for the one migration after the 371 (whether an account is staff
// is a question a caller may ask about itself), run against a real engine
// (PGlite) holding the real migrations, with a stand-in for the CLI. What
// this cannot show: the hosted database's own behaviour (whether `postgres`
// there may become `anon` and `authenticated` to ask the questions, for one),
// the pooler, or the real CLI. The hosted run rehearses on the hosted database
// for that, and says so if it cannot ask.
import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { APPLIED_COUNT, APPLIED_HASH, PENDING, PENDING_HASH, localChainProblem, plan372, roleQuestions } from './hosted-migration-372.mjs';
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
// The hosted project as this step needs to find it: the 371 and their history.
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
const run = (client, runCli, over = {}) => plan372({ client, runCli, target: 'not-a-real-url', applied, pending, expected, readSql: sqlOf, log: () => {}, ...over });
const NINE = `'has_role', 'is_privileged', 'can_appoint_teacher', 'can_decide_guardian_consent', 'can_decide_sponsorship', 'can_moderate_boards', 'can_work_incidents', 'may_change_control', 'may_write_setting'`;
const stateOf = async (db) => (await db.query(`select (select count(*)::int from supabase_migrations.schema_migrations) as recorded,
  (select count(*)::int from pg_proc where pronamespace = 'public'::regnamespace and proname in ('account_has_role', 'account_is_privileged', 'own_account_has_role', 'own_account_is_privileged', 'teaches_in_public')) as added,
  (select count(*)::int from pg_proc where pronamespace = 'public'::regnamespace and proname in (${NINE}) and not prosecdef) as callers_rights,
  (select count(*)::int from public.user_role_assignments) as assignments,
  (select count(*)::int from public.instructor_public_profiles) as pages,
  current_user::text as actor, coalesce(current_setting('request.jwt.claims', true), '') as claims`)).rows[0];
const BEFORE = { recorded: 371, added: 0, callers_rights: 0, assignments: 0, pages: 0, actor: 'postgres', claims: '' };
const AFTER = { recorded: 372, added: 5, callers_rights: 9, assignments: 0, pages: 0, actor: 'postgres', claims: '' };
const questionsOf = async (db, client) => { await db.query('begin'); try { return await roleQuestions(client); } finally { await db.query('rollback'); } };

const ADMIN = '00000000-0000-4000-8000-000000000b01';
const TEACHER = '00000000-0000-4000-8000-000000000b02';
// A project somebody has used: an administrator, and a teacher with a
// published page. Written as the server writes, with no session.
async function used(db) {
  for (const [id, email] of [[ADMIN, 'admin'], [TEACHER, 'teacher']]) {
    await db.exec(`insert into auth.users (id, email) values ('${id}', '${email}@example.test')`);
    await db.exec(`insert into public.user_profiles (user_id, display_name, country_code, timezone) values ('${id}', '${email}', 'UG', 'Africa/Kampala') on conflict (user_id) do nothing`);
  }
  await db.exec(`
    begin;
    set local app.bootstrap_privileged_roles = 'on';
    insert into public.user_role_assignments (user_id, role_id, assigned_by) select '${ADMIN}', id, '${ADMIN}' from public.roles where code = 'platform_admin';
    commit;
    insert into public.user_role_assignments (user_id, role_id, assigned_by) select '${TEACHER}', id, '${ADMIN}' from public.roles where code = 'instructor';
    insert into public.instructor_public_profiles (user_id, slug, display_name, status) values ('${TEACHER}', 'step-372', 'Step 372', 'published');
    update public.platform_settings set value_text = 'true' where key = 'teaching.public_profile';`);
}
const rolesOf = async (db) => (await db.query(`select a.user_id::text as user_id, r.code, a.revoked_at::text as revoked_at from public.user_role_assignments a join public.roles r on r.id = a.role_id order by r.code`)).rows;
// What a visitor reads of the teacher pages, and what they are told about an administrator.
async function visitor(db, sql) {
  await db.query('begin');
  try {
    await db.query(`select set_config('request.jwt.claims', '', true)`);
    await db.query('set local role anon');
    return (await db.query(sql)).rows;
  } finally { await db.query('rollback'); }
}

test('the reviewed files are pinned, and a later migration does not widen the step', () => {
  assert.equal(applied.length, 371);
  assert.equal(applied.at(-1), '20261281164000_review_decided_in_own_name.sql');
  assert.deepEqual(pending, PENDING);
  assert.deepEqual(pending, ['20261281165000_role_questions_about_oneself.sql']);
  assert.equal(chainHash(applied), APPLIED_HASH);
  assert.equal(chainHash(pending), PENDING_HASH);
  assert.equal(localChainProblem(chain), null);
  const pinned = (list) => (list.length === APPLIED_COUNT ? APPLIED_HASH : PENDING_HASH);
  assert.match(localChainProblem([...chain, '20270101000000_later.sql'], pinned), /not exactly the one reviewed/);
  assert.match(localChainProblem(chain.slice(0, -1), pinned), /not exactly the one reviewed/);
  assert.match(localChainProblem(chain, (list) => (list.length === APPLIED_COUNT ? APPLIED_HASH : 'changed')), /changed since it was reviewed/);
  assert.match(localChainProblem(chain, () => 'changed'), /first 371/);
  // It can be rehearsed: nothing in it ends or escapes a transaction.
  assert.equal(unsafeInsideTransaction(sqlOf(pending[0])), false);
});

test('rehearses, applies, and finds the two roles refused about somebody else and answered about themselves', async () => {
  const { db, client } = await hosted();
  assert.deepEqual(await stateOf(db), BEFORE);
  // The hole, as the job asks about it: open before.
  assert.deepEqual(await questionsOf(db, client), { others: 'open', own: 'answered' });
  const calls = []; const said = [];
  const result = await run(client, fakeCli(db, calls), { log: (line) => said.push(line) });
  assert.equal(result.ok, true, result.message);
  assert.deepEqual(calls, ['dry-run', 'apply']);
  assert.match(said.join('\n'), /none of what the migration adds is there, and anon and authenticated are answered about an account that is not theirs; 0 role assignments and 0 teacher pages/);
  assert.match(said.join('\n'), /Rehearsal on the hosted database: the migration ran inside one transaction and was rolled back; with it, anon and authenticated were refused about an account that is not the caller's and a caller was answered about itself/);
  assert.match(result.message, /records all 372 migrations in order; asked as authenticated and as anon about an account that is not the caller's, the database refuses, and a signed-in caller is still answered about itself/);
  assert.match(result.message, new RegExp(`exactly the ${expected.privileges.length} privileges`));
  assert.match(result.message, /was not asked through a real session or the API, and it turns no switch on/);
  // The questions leave nobody signed in and no role behind them.
  assert.deepEqual(await stateOf(db), AFTER);
  assert.deepEqual(await questionsOf(db, client), { others: 'shut', own: 'answered' });
  assert.deepEqual(await stateOf(db), AFTER);
  // A second run applies nothing and only compares.
  const again = [];
  const second = await run(client, fakeCli(db, again));
  assert.equal(second.ok, true, second.message); assert.deepEqual(again, []);
  assert.match(second.message, /Nothing applied: all 372 migrations are already recorded; anon and authenticated are refused about an account that is not the caller's and a caller is answered about itself/);
  // …and says so when the roles hold something the tested database does not:
  // here, the very grant the migration exists to withhold.
  await db.exec('grant execute on function public.account_is_privileged(uuid) to authenticated;');
  const third = await run(client, fakeCli(db, again));
  assert.equal(third.ok, false); assert.deepEqual(again, []);
  assert.match(third.message, /already recorded, but what the last one adds is not all there \(5 of the 5 functions, 9 of the 9 questions running with the caller's rights \(9 expected\), 1 of the 1 policy; asked about somebody else the two roles find the door mixed \(answered, refused, refused, refused, refused\)/);
  await db.exec('revoke execute on function public.account_is_privileged(uuid) from authenticated;');
  await db.exec('grant execute on function public.notify_user(uuid,text,text,text,text,text,text) to anon;');
  const fourth = await run(client, fakeCli(db, again));
  assert.equal(fourth.ok, false); assert.deepEqual(again, []);
  assert.match(fourth.message, /1 held on the hosted database and not on the tested one:\s+function\|anon\|notify_user\(/);
  await db.exec('revoke execute on function public.notify_user(uuid,text,text,text,text,text,text) from anon;');
  // …and when the history says 372 and one of the nine runs with the owner's rights again.
  await db.exec('alter function public.can_moderate_boards(uuid) security definer;');
  const fifth = await run(client, fakeCli(db, again));
  assert.equal(fifth.ok, false); assert.deepEqual(again, []);
  assert.match(fifth.message, /already recorded, but what the last one adds is not all there \(5 of the 5 functions, 8 of the 9 questions running with the caller's rights/);
  assert.match(fifth.message, /mixed \(refused, refused, answered, refused, refused\)/);
  await db.close();
});

test('a project somebody has used: every role and every teacher page is left as it was, and the page stays public', async () => {
  const { db, client } = await hosted();
  await used(db);
  const start = await rolesOf(db);
  assert.deepEqual(start.map((r) => r.code), ['instructor', 'platform_admin']);
  const PAGES = `select slug from public.instructor_public_profiles`;
  assert.deepEqual(await visitor(db, PAGES), [{ slug: 'step-372' }]);
  // Before: a visitor is told that the administrator is staff.
  assert.deepEqual(await visitor(db, `select public.is_privileged('${ADMIN}') as v`), [{ v: true }]);
  const calls = []; const said = [];
  const result = await run(client, fakeCli(db, calls), { log: (line) => said.push(line) });
  assert.equal(result.ok, true, result.message); assert.deepEqual(calls, ['dry-run', 'apply']);
  assert.match(said.join('\n'), /all 2 role assignments and 1 teacher pages were as before/);
  assert.match(result.message, /2 role assignments and 1 teacher pages, as before/);
  assert.deepEqual(await rolesOf(db), start);
  assert.equal((await db.query('select count(*)::int as n from auth.users')).rows[0].n, 2);
  // After: the page is still public, and the visitor is refused.
  assert.deepEqual(await visitor(db, PAGES), [{ slug: 'step-372' }]);
  await assert.rejects(() => visitor(db, `select public.is_privileged('${ADMIN}') as v`), /whether an account is staff is answered to that account only/);
  await assert.rejects(() => visitor(db, `select public.has_role('${TEACHER}', 'instructor') as v`), /whether an account holds a role is answered to that account only/);

  // A migration that touched a role would be stopped in rehearsal.
  const other = await hosted();
  await used(other.db);
  const otherCalls = [];
  const touched = await run(other.client, fakeCli(other.db, otherCalls), {
    readSql: (name) => `${sqlOf(name)}\nupdate public.user_role_assignments set revoked_at = now(), revocation_reason = 'touched in rehearsal' where user_id = '${TEACHER}';` });
  assert.equal(touched.ok, false);
  assert.match(touched.message, /changed a row it is meant to leave alone: 2 role assignments and 1 teacher pages where there were 2 and 1, or an assignment's holder, role or revocation/);
  assert.deepEqual(otherCalls, []);
  assert.deepEqual((await rolesOf(other.db)).map((r) => r.revoked_at), [null, null]);
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
  assert.match(result.message, /Rehearsal stopped in 20261281165000_role_questions_about_oneself\.sql\. SQLSTATE 42883/);
  assert.deepEqual(calls, []); await untouched('failed rehearsal');

  // It runs and does not shut the hole.
  result = await run(client, fakeCli(db, calls), { readSql: () => 'comment on table public.subject_areas is \'rehearsed\';' });
  assert.equal(result.ok, false);
  assert.match(result.message, /In rehearsal the migration left 0 of the 5 functions, 0 of the 9 questions running with the caller's rights \(9 expected\), 0 of the 1 policy; asked about somebody else the two roles find the door open; asked about itself a caller is answered\. Nothing was changed/);
  assert.deepEqual(calls, []); await untouched('a migration that shuts nothing');

  // It shuts the hole and stops the caller's own question too.
  result = await run(client, fakeCli(db, calls), { readSql: (name) => `${sqlOf(name)}\nrevoke execute on function public.own_account_is_privileged(uuid) from authenticated;` });
  assert.equal(result.ok, false);
  assert.match(result.message, /Not applied\. In rehearsal the migration left 5 of the 5 functions.*not asked \(SQLSTATE 42501\)/);
  assert.deepEqual(calls, []); await untouched('a migration that refuses the caller about itself');

  // It runs, but would leave a role with something the tested database does not give it.
  result = await run(client, fakeCli(db, calls), { readSql: (name) => `${sqlOf(name)}\ngrant execute on function public.notify_user(uuid,text,text,text,text,text,text) to anon;` });
  assert.equal(result.ok, false);
  assert.match(result.message, /would not leave the API roles as the tested database has them/);
  assert.match(result.message, /function\|anon\|notify_user\(/);
  assert.deepEqual(calls, []); await untouched('differing privileges');

  // The CLI would apply something other than the one.
  for (const dryNames of [[], [...pending, '20270101000000_later.sql'], ['20261281164000_review_decided_in_own_name.sql']]) {
    result = await run(client, fakeCli(db, calls, { dryNames }));
    assert.equal(result.ok, false); assert.match(result.message, /does not name exactly the one reviewed migration/);
    await untouched('differing dry-run');
  }
  result = await run(client, async () => { calls.push('dry-run'); return { code: 1, output: 'password authentication failed secret-value' }; });
  assert.equal(result.ok, false); assert.match(result.message, /Database authentication/); assert.doesNotMatch(result.message, /secret-value/);
  await untouched('failed dry-run');

  await db.close();
});

test('a history that is not exactly the 371, a change already made by hand, or a role that cannot be taken, does not start', async () => {
  // The step before this one has not run: the hosted project as it is today.
  const short = await hosted(APPLIED_COUNT - 1);
  const calls = [];
  let result = await run(short.client, fakeCli(short.db, calls));
  assert.equal(result.ok, false); assert.match(result.message, /it records 370\)\. The step before this one has to have run/); assert.deepEqual(calls, []);
  await short.db.close();
  // The history says 371, and somebody has already made the change outside it.
  const { db, client } = await hosted();
  await db.exec(sqlOf(pending[0]));
  result = await run(client, fakeCli(db, calls));
  assert.equal(result.ok, false);
  assert.match(result.message, /not as this step expects before it runs \(5 of the 5 functions, 9 of the 9 questions running with the caller's rights \(9 expected\), 1 of the 1 policy; asked about somebody else the two roles find the door shut/);
  assert.deepEqual(calls, []);
  await db.close();
  // The connection may not become one of the two roles: said, and not read as "answered" or "refused".
  const stuck = await hosted();
  const noRole = { query: async (sql) => { if (/^set local role/.test(sql)) { const e = new Error('permission denied to set role "anon" host.example'); e.code = '42501'; throw e; } return stuck.client.query(sql); } };
  result = await run(noRole, fakeCli(stuck.db, calls));
  assert.equal(result.ok, false);
  assert.match(result.message, /Not started: the database is not as this step expects before it runs \(0 of the 5 functions.*the door mixed \(not asked \(SQLSTATE 42501\), not asked \(SQLSTATE 42501\)/);
  assert.match(result.message, /or the questions could not be asked as the two roles/);
  assert.doesNotMatch(result.message, /host\.example/);
  assert.deepEqual(calls, []);
  await stuck.db.close();
});

test('a failure while applying is said as it is, without the CLI\'s own words', async () => {
  // The CLI fails before applying: a second run starts from the same 371 and may apply.
  const early = await hosted(); const earlyCalls = [];
  let result = await run(early.client, fakeCli(early.db, earlyCalls, { apply: false, code: 1 }));
  assert.equal(result.ok, false);
  assert.match(result.message, /history now records 371 migrations\./); assert.doesNotMatch(result.message, /secret-value/);
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
  assert.equal(result.ok, false); assert.match(result.message, /records 371 migrations and is not the 372 expected/);
  await other.db.close();
});
