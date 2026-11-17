// The second, explicitly approved step for the AyahSpring test project: the ten
// migrations that follow the 342 applied on the first day. The owner chose
// "apply all ten, in order" on 2026-11-17, knowing the project holds no users
// and no data.
//
// This is NOT a general migration runner. It starts only when all of these
// hold, and says which one did not:
//
//   * the local files are the 342 already applied (same bytes as the day they
//     were applied) followed by exactly the ten reviewed here (same bytes as
//     the day this was written);
//   * the hosted history is exactly those 342, in order;
//   * the project still has no Auth user and no learner;
//   * a rehearsal on the hosted database itself, all ten inside one
//     transaction that is then rolled back, runs to the end AND leaves `anon`
//     and `authenticated` with exactly the privileges they hold in the
//     database the suites run on;
//   * nothing of the rehearsal is left afterwards;
//   * the CLI's own dry-run names exactly the ten.
//
// After the CLI applies them it reads the history and the privileges again.
//
// What it cannot do: stop somebody else changing the database between two of
// its checks (separate sessions; nothing else should be writing), undo a
// migration the CLI has committed, or prove anything about Auth, PostgREST or
// the application. A run that finds all 352 already recorded applies nothing
// and only repeats the comparison.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { databaseUrlChecks, verifiedTlsUrl, trustedCaReady, extractMigrationNames, pendingMatchesLocal, failureCategories } from './hosted-migration-dry-run.mjs';
import { historyMatches } from './hosted-migration-apply.mjs';
import { PRIVILEGES, DEFAULTS, difference, localMigrations } from './api-role-privileges.mjs';

const migrationsDir = fileURLToPath(new URL('../supabase/migrations/', import.meta.url));
const caPath = fileURLToPath(new URL('../certs/supabase-prod-ca-2021.crt', import.meta.url));

export const APPLIED_COUNT = 342;
// The 342 files as they were on the day they were applied.
export const APPLIED_HASH = 'ebde8bfc2ec7d2d27b5e9d6dc6969a0d076ef5cf65e8d2a9c9379babe395c2d2';
export const PENDING = [
  '20261281136000_resume_position_revision.sql',
  '20261281137000_resume_position_write_boundary.sql',
  '20261281138000_resource_resume_foundation.sql',
  '20261281139000_resource_resume_export.sql',
  '20261281140000_retire_lesson_resume_writes.sql',
  '20261281141000_export_eligible_learners_once.sql',
  '20261281142000_lesson_access_actor_learners_first.sql',
  '20261281143000_search_lessons_materialize_candidates.sql',
  '20261281144000_platform_default_grants.sql',
  '20261281145000_assessment_answer_integrity.sql',
];
// The ten as they were when the owner approved them.
export const PENDING_HASH = 'ca926d30afdd698c79cdb66cf455c9356f208006d450bf8068184ac0078d4f5d';

export function chainHash(names, dir = migrationsDir) {
  const hash = createHash('sha256');
  for (const name of names) {
    const data = readFileSync(`${dir}/${name}`);
    hash.update(`${name}\0${data.length}\0`); hash.update(data);
  }
  return hash.digest('hex');
}

// Null when the local files are the reviewed chain; otherwise why not.
export function localChainProblem(names = localMigrations(), hashOf = chainHash) {
  const applied = names.slice(0, APPLIED_COUNT); const pending = names.slice(APPLIED_COUNT);
  if (applied.length !== APPLIED_COUNT || hashOf(applied) !== APPLIED_HASH) return 'the first 342 local files are not the ones applied on the first day';
  if (pending.length !== PENDING.length || pending.some((name, i) => name !== PENDING[i])) return 'the local files after the 342 are not exactly the ten reviewed';
  if (hashOf(pending) !== PENDING_HASH) return 'one of the ten has changed since it was reviewed';
  return null;
}

// A statement that would end the rehearsal's transaction, or cannot run inside
// one. Function bodies are set aside first: their `begin` and `end;` are block
// markers, and a COMMIT inside one is refused by the database itself.
export function unsafeInsideTransaction(sql) {
  const bare = sql.replace(/--[^\n]*/g, '').replace(/\$([A-Za-z_0-9]*)\$[\s\S]*?\$\1\$/g, "''");
  return /^\s*(begin|start\s+transaction|commit|rollback|end|abort)\s*(work|transaction)?\s*;/im.test(bare)
    || /\b(create|drop)\s+index\s+concurrently\b|\breindex\b[^;]*\bconcurrently\b|^\s*vacuum\b|\balter\s+system\b|\bcreate\s+database\b/im.test(bare);
}

const STATE = `select current_database() as database, current_user::text as actor,
  (select count(*) from auth.users)::int as auth_users,
  (select count(*) from public.learner_profiles)::int as learners,
  to_regclass('public.lesson_resource_positions') is not null as has_resource_positions,
  to_regprocedure('public.save_assessment_response(uuid,uuid,jsonb)') is not null as has_answer_writer`;

export async function inspect(client) {
  await client.query('begin read only');
  try {
    const { rows: [row] } = await client.query(STATE);
    const history = (await client.query('select version, name from supabase_migrations.schema_migrations order by version')).rows;
    return { row, history };
  } finally { await client.query('rollback'); }
}

async function lines(client, sql) { return (await client.query(sql)).rows.map((r) => r.line); }

export async function readPrivileges(client) {
  await client.query('begin read only');
  try { return { privileges: await lines(client, PRIVILEGES), defaults: await lines(client, DEFAULTS) }; }
  finally { await client.query('rollback'); }
}

// Differences between what the database gives the two API roles and what the
// tested database gives them. Empty when they are the same.
export function privilegeProblems(expected, actual) {
  const out = [];
  for (const [title, key] of [['Privileges on existing objects', 'privileges'], ['Defaults for the next object', 'defaults']]) {
    const { missing, extra } = difference(expected[key], actual[key]);
    const show = (list) => list.slice(0, 40).join('\n    ') + (list.length > 40 ? `\n    … and ${list.length - 40} more` : '');
    if (extra.length) out.push(`${title}: ${extra.length} held on the hosted database and not on the tested one:\n    ${show(extra)}`);
    if (missing.length) out.push(`${title}: ${missing.length} held on the tested database and not on the hosted one:\n    ${show(missing)}`);
  }
  return out;
}

const untouched = (state, applied) => state.row.database === 'postgres' && state.row.actor === 'postgres'
  && Number(state.row.auth_users) === 0 && Number(state.row.learners) === 0
  && state.row.has_resource_positions === false && state.row.has_answer_writer === false
  && historyMatches(state.history, applied);

// The database's own words about our own SQL: an SQLSTATE and one line. Never
// used for connection failures, whose text can name the host.
function databaseError(error) {
  const code = typeof error?.code === 'string' && /^[0-9A-Z]{5}$/.test(error.code) ? error.code : null;
  if (!code) return 'no database error code (connection or driver failure)';
  return `SQLSTATE ${code}: ${String(error.message ?? '').split('\n')[0].slice(0, 300)}`;
}

// All ten in one transaction on the real database, then rolled back. Returns
// what the two roles would hold afterwards.
export async function rehearse(client, pending, readSql) {
  await client.query('begin');
  try {
    // Nobody else should be here; if somebody is, stop rather than wait.
    await client.query(`set local lock_timeout = '15s'`);
    await client.query(`set local statement_timeout = '180s'`);
    for (const name of pending) {
      try { await client.query(readSql(name)); }
      catch (error) { return { ok: false, message: `Rehearsal stopped in ${name}. ${databaseError(error)}` }; }
    }
    try { return { ok: true, privileges: await lines(client, PRIVILEGES), defaults: await lines(client, DEFAULTS) }; }
    catch (error) { return { ok: false, message: `Rehearsal ran all ten, but the privileges could not be read. ${databaseError(error)}` }; }
  } finally { await client.query('rollback'); }
}

// Inputs are injectable for isolated tests; the real run uses the verified
// client and CLI below. Raw CLI output is never returned.
export async function advancePlan({ client, runCli, target, applied, pending, expected, readSql, log = console.log }) {
  let applyStarted = false;
  const all = [...applied, ...pending];
  try {
    const before = await inspect(client);
    if (before.row.database !== 'postgres' || before.row.actor !== 'postgres') return { ok: false, message: 'Not started: not connected to the postgres database as postgres.' };
    if (historyMatches(before.history, all)) {
      const problems = privilegeProblems(expected, await readPrivileges(client));
      if (problems.length) return { ok: false, message: `Nothing applied: all ${all.length} migrations are already recorded. The API roles do not hold what the tested database gives them:\n  ${problems.join('\n  ')}` };
      return { ok: true, message: `Nothing applied: all ${all.length} migrations are already recorded, and anon and authenticated hold exactly the ${expected.privileges.length} privileges of the tested database.` };
    }
    if (Number(before.row.auth_users) !== 0 || Number(before.row.learners) !== 0) return { ok: false, message: 'Not started: the project has an Auth user or a learner. This step was approved for a project with no data.' };
    if (!untouched(before, applied)) return { ok: false, message: `Not started: the hosted history is not exactly the ${applied.length} migrations of the first day (it records ${before.history.length}), or part of the ten is already present. Compare history and schema by hand; do not retry.` };
    log(`Hosted history is exactly the ${applied.length} expected; no Auth user, no learner.`);

    const trial = await rehearse(client, pending, readSql);
    if (!trial.ok) return { ok: false, message: `Not applied. ${trial.message}\nThe rehearsal's transaction was rolled back.` };
    const afterTrial = await inspect(client);
    if (!untouched(afterTrial, applied)) return { ok: false, message: 'Not applied: after the rehearsal was rolled back the database is not as it was. Stop and inspect it.' };
    const trialProblems = privilegeProblems(expected, trial);
    if (trialProblems.length) return { ok: false, message: `Not applied. The ten ran in rehearsal, but would not leave the API roles as the tested database has them:\n  ${trialProblems.join('\n  ')}` };
    log(`Rehearsal on the hosted database: all ${pending.length} ran inside one transaction and were rolled back; anon and authenticated would hold exactly the ${expected.privileges.length} privileges of the tested database. Nothing was left behind.`);

    const dry = await runCli(['db', 'push', `--remote=${target}`, '--skip-vault', '--dry-run']);
    if (dry.code !== 0) return { ok: false, message: `Not applied: the CLI dry-run failed. Possible categories: ${failureCategories(dry.output).join('; ') || 'Unclassified CLI failure'}.` };
    if (!pendingMatchesLocal(extractMigrationNames(dry.output), pending)) return { ok: false, message: 'Not applied: the CLI dry-run does not name exactly the ten reviewed migrations, in order.' };
    // Somebody else could still change the database after this check.
    const recheck = await inspect(client);
    if (!untouched(recheck, applied)) return { ok: false, message: 'Not applied: the database changed during the checks.' };
    log('CLI dry-run names exactly the ten. Applying.');

    applyStarted = true;
    const apply = await runCli(['db', 'push', `--remote=${target}`, '--skip-vault', '--yes']);
    const after = await inspect(client);
    if (apply.code !== 0) {
      const done = after.history.length - applied.length;
      return { ok: false, message: `The CLI reported a failure while applying. Possible categories: ${failureCategories(apply.output).join('; ') || 'Unclassified CLI failure'}. The history now records ${after.history.length} migrations${done > 0 && done <= pending.length && historyMatches(after.history, all.slice(0, after.history.length)) ? ` (the first ${done} of the ten)` : ''}. Stop; compare history and schema before anything else. Do not rerun this.` };
    }
    if (!historyMatches(after.history, all)) return { ok: false, message: `The CLI reported success, but the history records ${after.history.length} migrations and is not the ${all.length} expected. Stop and investigate.` };
    const problems = privilegeProblems(expected, await readPrivileges(client));
    if (problems.length) return { ok: false, message: `All ${all.length} migrations are recorded, but the API roles do not hold what the tested database gives them:\n  ${problems.join('\n  ')}` };
    return { ok: true, message: `Applied. The history records all ${all.length} migrations in order, and anon and authenticated hold exactly the ${expected.privileges.length} privileges of the tested database, with the same ${expected.defaults.length} defaults for new objects. This does not prove Auth, PostgREST or the application.` };
  } catch {
    return { ok: false, message: applyStarted ? 'The outcome of the apply, or of the checks after it, is not known. Stop; compare history and schema before anything else. Do not rerun this.' : 'Not applied: a check could not be completed.' };
  }
}

function cli(args) {
  return new Promise((resolve) => {
    const child = spawn(process.env.SUPABASE_CLI_BIN || 'supabase', args, { stdio: ['ignore', 'pipe', 'pipe'], env: process.env });
    let output = '';
    for (const stream of [child.stdout, child.stderr]) stream.on('data', (chunk) => { output += chunk.toString(); });
    child.on('error', () => resolve({ code: null, output }));
    child.on('close', (code) => resolve({ code, output }));
  });
}

async function main() {
  const value = process.env.AYAHSPRING_TEST_DATABASE_URL || '';
  const password = process.env.AYAHSPRING_TEST_DATABASE_PASSWORD || '';
  const fail = (message) => { console.error(message); process.exitCode = 1; };
  if (process.env.AYAHSPRING_TEST_APPLY_READY !== 'yes') return fail('Not started: the environment variable AYAHSPRING_TEST_APPLY_READY is not "yes".');
  if (!password || !Object.values(databaseUrlChecks(value)).every(Boolean)) return fail('Not started: the database URL or password secret is missing, or does not name the test project.');
  if (!trustedCaReady()) return fail('Not started: the pinned public Supabase CA is missing, changed or outside its validity period.');
  const problem = localChainProblem();
  if (problem) return fail(`Not started: ${problem}.`);
  const names = localMigrations();
  const applied = names.slice(0, APPLIED_COUNT); const pending = names.slice(APPLIED_COUNT);
  for (const name of pending) {
    if (unsafeInsideTransaction(readFileSync(`${migrationsDir}/${name}`, 'utf8'))) return fail(`Not started: ${name} has a statement that cannot be rehearsed inside a transaction.`);
  }
  let expected;
  try {
    expected = JSON.parse(readFileSync(process.env.AYAHSPRING_EXPECTED_PRIVILEGES || '', 'utf8'));
    if (expected.migrations !== names.length || expected.last !== names.at(-1) || !Array.isArray(expected.privileges) || expected.privileges.length < 1000 || !Array.isArray(expected.defaults)) throw new Error('shape');
  } catch { return fail('Not started: the reference list of privileges (scripts/api-role-privileges.mjs --write) is missing or was not built from this chain.'); }

  const { Client } = await import('pg');
  const target = verifiedTlsUrl(value, password);
  const parsed = new URL(target);
  const client = new Client({ host: parsed.hostname, port: Number(parsed.port), database: 'postgres',
    user: decodeURIComponent(parsed.username), password, connectionTimeoutMillis: 10000,
    ssl: { ca: readFileSync(caPath, 'utf8'), rejectUnauthorized: true, servername: parsed.hostname } });
  try {
    await client.connect();
    const result = await advancePlan({ client, runCli: cli, target, applied, pending, expected,
      readSql: (name) => readFileSync(`${migrationsDir}/${name}`, 'utf8') });
    (result.ok ? console.log : console.error)(result.message);
    if (!result.ok) process.exitCode = 1;
  } catch {
    fail('Not applied: the database could not be reached, or a check could not be completed.');
  } finally { await client.end().catch(() => {}); }
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
