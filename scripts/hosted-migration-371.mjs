// The eleventh, separately approved step for the AyahSpring test project: the
// one migration that follows the 370,
// `20261281164000_review_decided_in_own_name.sql`. The owner asked for it on
// 2026-11-27 ("Prepare 371"); the environment's reviewer still has to
// approve the run itself.
//
// What that migration does: `set_course_version_status()` and
// `re_pin_enrolment()` believed the actor they were handed, so an account
// with no role could approve a course by naming an administrator; a reviewer
// could rewrite their own assignment and decide a review that was never
// accepted, or was declined or cancelled. It replaces three functions, adds
// two trigger functions and two triggers, and changes no table, no column
// and no row. It gives no role anything.
//
// The project may hold accounts (the site is deployed), as for the step
// before this one. What stands in place of "an empty project": the migration
// writes no row, and this job insists on seeing that in a rehearsal on the
// hosted database before it applies anything.
//
// This is NOT a general migration runner. It starts only when all of these
// hold, and says which one did not:
//
//   * the local files are the 370 already applied (same bytes as when this
//     was written) followed by exactly the one reviewed here (same bytes);
//   * the hosted history is exactly those 370, in order;
//   * none of what the migration adds is there already, and the hole it
//     closes is open: asked, as a signed-in person, to move a course version
//     in somebody else's name, the database does not refuse on that ground
//     (the version asked about does not exist, so nothing is written);
//   * a rehearsal on the hosted database itself, inside one transaction that
//     is then rolled back, runs to the end; leaves both functions refusing
//     another person's name, both triggers and the decision rule in place,
//     and every assignment and decision exactly as it was; AND leaves `anon`
//     and `authenticated` with exactly the privileges they hold in the
//     database the suites run on;
//   * nothing of the rehearsal is left afterwards;
//   * the CLI's own dry-run names exactly the one.
//
// After the CLI applies it, the history, the same facts and the privileges
// are read again, and the same question is asked again: it must be refused.
//
// What it cannot do: stop somebody else changing the database between two of
// its checks, undo a migration the CLI has committed (nothing in it destroys
// anything; an earlier definition of each function is in the migrations),
// or prove anything about Auth, PostgREST or the application. It does not
// show that a reviewer's real session is refused: the question is asked over
// the database connection with a signed-in person's claims set, which is
// what the functions read. A run that finds all 371 already recorded applies
// nothing and only repeats the comparison.
//
// The ten steps before it are left as they were. This file borrows their
// checks and none of their decisions.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { databaseUrlChecks, verifiedTlsUrl, trustedCaReady, extractMigrationNames, pendingMatchesLocal, failureCategories } from './hosted-migration-dry-run.mjs';
import { historyMatches } from './hosted-migration-apply.mjs';
import { chainHash, privilegeProblems, readPrivileges, unsafeInsideTransaction } from './hosted-migration-advance.mjs';
import { PRIVILEGES, DEFAULTS, localMigrations } from './api-role-privileges.mjs';

const migrationsDir = fileURLToPath(new URL('../supabase/migrations/', import.meta.url));
const caPath = fileURLToPath(new URL('../certs/supabase-prod-ca-2021.crt', import.meta.url));


export const APPLIED_COUNT = 370;
// The 370 files this step starts from, as they are in this repository.
export const APPLIED_HASH = '689d060a5dbbbb82a2ec1154447a14ea3cd3cc32962c3e2585d1ce0f91050612';
export const PENDING = ['20261281164000_review_decided_in_own_name.sql'];
// The one as it was when it was reviewed for this step.
export const PENDING_HASH = 'e6e802bc5b8cbb5fac8322aec1948c5bef48f29468bca2e372e81e3ccfb4bbab';

// Null when the local files are the reviewed chain; otherwise why not.
export function localChainProblem(names = localMigrations(), hashOf = chainHash) {
  const applied = names.slice(0, APPLIED_COUNT); const pending = names.slice(APPLIED_COUNT);
  if (applied.length !== APPLIED_COUNT || hashOf(applied) !== APPLIED_HASH) return 'the first 370 local files are not the ones this step was reviewed against';
  if (pending.length !== PENDING.length || pending.some((name, i) => name !== PENDING[i])) return 'the local files after the 370 are not exactly the one reviewed';
  if (hashOf(pending) !== PENDING_HASH) return 'the migration has changed since it was reviewed';
  return null;
}

// What the migration adds, counted: the two functions that now ask whose name
// a change is made in (0 before, 2 after), the two triggers (0, 2), and the
// rule about when a decision may be recorded (0, 1). And what it must leave
// alone: every assignment and every decision, with a mark that changes if
// any assignment's state or times do.
const STATE = `select current_database() as database, current_user::text as actor,
  (select count(*) from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname in ('set_course_version_status', 're_pin_enrolment') and p.prosrc like '%in your own name%')::int as own_name,
  (select count(*) from pg_trigger t where not t.tgisinternal and ((t.tgrelid = 'public.content_review_assignments'::regclass and t.tgname = 'cra_guard_update') or (t.tgrelid = 'public.content_review_decisions'::regclass and t.tgname = 'crd_complete_assignment')))::int as triggers,
  (select count(*) from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname = 'validate_review_decision' and p.prosrc like '%still open%')::int as decision_rule,
  (select count(*) from public.content_review_assignments)::int as assignments,
  (select count(*) from public.content_review_decisions)::int as decisions,
  (select coalesce(md5(string_agg(a.id::text || a.course_version_id::text || a.reviewer_profile_id::text || a.review_scope || a.assignment_status || coalesce(a.accepted_at::text, '') || coalesce(a.completed_at::text, ''), ',' order by a.id)), 'none') from public.content_review_assignments a) as assignments_mark`;

// Three people and a course version that do not exist.
const SOMEBODY = '00000000-0000-4000-8000-00000000a371';
const SOMEBODY_ELSE = '00000000-0000-4000-8000-00000000b371';
const NO_VERSION = '00000000-0000-4000-8000-00000000c371';

// The hole itself, asked about: signed in as one person, move a course
// version in the name of another. True only when the database refuses for
// that reason. Nothing is written either way: no such version exists, and the
// savepoint takes back the claims. Call it inside a transaction.
export async function refusesAnotherName(client) {
  await client.query('savepoint own_name_probe');
  try {
    await client.query(`select set_config('request.jwt.claims', '{"sub":"${SOMEBODY}","role":"authenticated"}', true)`);
    await client.query(`select public.set_course_version_status('${NO_VERSION}', 'approved', '${SOMEBODY_ELSE}', 'hosted step 371: asking, not moving')`);
    return false;
  } catch (error) {
    return error?.code === '42501' && /in your own name/.test(String(error?.message ?? ''));
  } finally { await client.query('rollback to savepoint own_name_probe'); }
}

export async function inspect(client) {
  await client.query('begin read only');
  try {
    const { rows: [row] } = await client.query(STATE);
    const history = (await client.query('select version, name from supabase_migrations.schema_migrations order by version')).rows;
    const refuses = await refusesAnotherName(client);
    return { row, history, refuses };
  } finally { await client.query('rollback'); }
}

const absent = (row) => Number(row.own_name) === 0 && Number(row.triggers) === 0 && Number(row.decision_rule) === 0;
// What must be there once the migration has run.
const inPlace = (row) => Number(row.own_name) === 2 && Number(row.triggers) === 2 && Number(row.decision_rule) === 1;
const sameRows = (a, b) => Number(a.assignments) === Number(b.assignments) && Number(a.decisions) === Number(b.decisions) && a.assignments_mark === b.assignments_mark;
const untouched = (state, applied) => state.row.database === 'postgres' && state.row.actor === 'postgres'
  && absent(state.row) && state.refuses === false && historyMatches(state.history, applied);
const counts = (row) => `${row.own_name} of the 2 functions asking whose name, ${row.triggers} of the 2 triggers, ${row.decision_rule} of the 1 decision rule`;

// The database's own words about our own SQL: an SQLSTATE and one line. Never
// used for connection failures, whose text can name the host.
function databaseError(error) {
  const code = typeof error?.code === 'string' && /^[0-9A-Z]{5}$/.test(error.code) ? error.code : null;
  if (!code) return 'no database error code (connection or driver failure)';
  return `SQLSTATE ${code}: ${String(error.message ?? '').split('\n')[0].slice(0, 300)}`;
}

// The migration in one transaction on the real database, then rolled back.
// Returns what the two roles would hold afterwards.
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
    try {
      const lines = async (sql) => (await client.query(sql)).rows.map((r) => r.line);
      // Still inside the transaction: what the migration made, and whether the hole is shut.
      const { rows: [row] } = await client.query(STATE);
      const refuses = await refusesAnotherName(client);
      return { ok: true, row, refuses, privileges: await lines(PRIVILEGES), defaults: await lines(DEFAULTS) };
    } catch (error) { return { ok: false, message: `Rehearsal ran the migration, but what it left could not be read. ${databaseError(error)}` }; }
  } finally { await client.query('rollback'); }
}

// Inputs are injectable for isolated tests; the real run uses the verified
// client and CLI below. Raw CLI output is never returned.
export async function plan371({ client, runCli, target, applied, pending, expected, readSql, log = console.log }) {
  let applyStarted = false;
  const all = [...applied, ...pending];
  try {
    const before = await inspect(client);
    if (before.row.database !== 'postgres' || before.row.actor !== 'postgres') return { ok: false, message: 'Not started: not connected to the postgres database as postgres.' };
    if (historyMatches(before.history, all)) {
      if (!inPlace(before.row) || !before.refuses) return { ok: false, message: `Nothing applied: all ${all.length} migrations are already recorded, but what the last one adds is not all there (${counts(before.row)}; a change in somebody else's name is ${before.refuses ? 'refused' : 'NOT refused'}). Stop and investigate.` };
      const problems = privilegeProblems(expected, await readPrivileges(client));
      if (problems.length) return { ok: false, message: `Nothing applied: all ${all.length} migrations are already recorded. The API roles do not hold what the tested database gives them:\n  ${problems.join('\n  ')}` };
      return { ok: true, message: `Nothing applied: all ${all.length} migrations are already recorded; a change in somebody else's name is refused; and anon and authenticated hold exactly the ${expected.privileges.length} privileges of the tested database.` };
    }
    if (!historyMatches(before.history, applied)) return { ok: false, message: `Not started: the hosted history is not exactly the ${applied.length} migrations expected (it records ${before.history.length}). Compare history and schema by hand; do not retry.` };
    if (!untouched(before, applied)) return { ok: false, message: `Not started: the database is not as this step expects before it runs (${counts(before.row)}; a change in somebody else's name is ${before.refuses ? 'already refused' : 'not refused'}). Somebody has made part of this change by hand; compare the functions and triggers with the migration.` };
    log(`Hosted history is exactly the ${applied.length} expected; none of what the migration adds is there, and a change in somebody else's name is not refused; ${before.row.assignments} assignments and ${before.row.decisions} decisions.`);

    const trial = await rehearse(client, pending, readSql);
    if (!trial.ok) return { ok: false, message: `Not applied. ${trial.message}\nThe rehearsal's transaction was rolled back.` };
    const afterTrial = await inspect(client);
    if (!untouched(afterTrial, applied) || !sameRows(afterTrial.row, before.row)) return { ok: false, message: 'Not applied: after the rehearsal was rolled back the database is not as it was. Stop and inspect it.' };
    if (!inPlace(trial.row) || !trial.refuses) return { ok: false, message: `Not applied. In rehearsal the migration left ${counts(trial.row)}, and a change in somebody else's name was ${trial.refuses ? 'refused' : 'NOT refused'}. Nothing was changed.` };
    if (!sameRows(trial.row, before.row)) return { ok: false, message: `Not applied. In rehearsal the migration changed a row it is meant to leave alone: ${trial.row.assignments} assignments and ${trial.row.decisions} decisions where there were ${before.row.assignments} and ${before.row.decisions}, or an assignment's state or times. Nothing was changed.` };
    const trialProblems = privilegeProblems(expected, trial);
    if (trialProblems.length) return { ok: false, message: `Not applied. The migration ran in rehearsal, but would not leave the API roles as the tested database has them:\n  ${trialProblems.join('\n  ')}` };
    log(`Rehearsal on the hosted database: the migration ran inside one transaction and was rolled back; with it, a change in somebody else's name was refused, both triggers and the decision rule were in place, and all ${before.row.assignments} assignments and ${before.row.decisions} decisions were as before; anon and authenticated would hold exactly the ${expected.privileges.length} privileges of the tested database. Nothing was left behind.`);

    const dry = await runCli(['db', 'push', `--remote=${target}`, '--skip-vault', '--dry-run']);
    if (dry.code !== 0) return { ok: false, message: `Not applied: the CLI dry-run failed. Possible categories: ${failureCategories(dry.output).join('; ') || 'Unclassified CLI failure'}.` };
    if (!pendingMatchesLocal(extractMigrationNames(dry.output), pending)) return { ok: false, message: 'Not applied: the CLI dry-run does not name exactly the one reviewed migration.' };
    // Somebody else could still change the database after this check.
    const recheck = await inspect(client);
    if (!untouched(recheck, applied)) return { ok: false, message: 'Not applied: the database changed during the checks.' };
    log('CLI dry-run names exactly the one. Applying.');

    applyStarted = true;
    const apply = await runCli(['db', 'push', `--remote=${target}`, '--skip-vault', '--yes']);
    const after = await inspect(client);
    if (apply.code !== 0) {
      return { ok: false, message: `The CLI reported a failure while applying. Possible categories: ${failureCategories(apply.output).join('; ') || 'Unclassified CLI failure'}. The history now records ${after.history.length} migrations. Stop; compare history and schema before anything else. Run again: this job applies only if the history is still exactly the first ${applied.length} and nothing of the migration is there, and otherwise only reports.` };
    }
    if (!historyMatches(after.history, all)) return { ok: false, message: `The CLI reported success, but the history records ${after.history.length} migrations and is not the ${all.length} expected. Stop and investigate.` };
    if (!inPlace(after.row) || !after.refuses) return { ok: false, message: `All ${all.length} migrations are recorded, but what the last one adds is not all there (${counts(after.row)}; a change in somebody else's name is ${after.refuses ? 'refused' : 'NOT refused'}). Stop and investigate.` };
    const problems = privilegeProblems(expected, await readPrivileges(client));
    if (problems.length) return { ok: false, message: `All ${all.length} migrations are recorded, but the API roles do not hold what the tested database gives them:\n  ${problems.join('\n  ')}` };
    return { ok: true, message: `Applied. The history records all ${all.length} migrations in order; asked as a signed-in person to move a course version in somebody else's name, the database refuses; both triggers and the decision rule are in place; ${after.row.assignments} assignments and ${after.row.decisions} decisions, where there were ${before.row.assignments} and ${before.row.decisions}; anon and authenticated hold exactly the ${expected.privileges.length} privileges of the tested database, with the same ${expected.defaults.length} defaults for new objects. This does not prove Auth, PostgREST or the application, it was not asked through a real session, and it turns no switch on.` };
  } catch {
    return { ok: false, message: applyStarted ? `The outcome of the apply, or of the checks after it, is not known. Compare history and schema before anything else. Run again: this job applies only if the history is still exactly the first ${applied.length}; with all ${all.length} recorded it only repeats the comparison.` : 'Not applied: a check could not be completed.' };
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
    const result = await plan371({ client, runCli: cli, target, applied, pending, expected,
      readSql: (name) => readFileSync(`${migrationsDir}/${name}`, 'utf8') });
    (result.ok ? console.log : console.error)(result.message);
    if (!result.ok) process.exitCode = 1;
  } catch {
    fail('Not applied: the database could not be reached, or a check could not be completed.');
  } finally { await client.end().catch(() => {}); }
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
