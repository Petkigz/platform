// The tenth, separately approved step for the AyahSpring test project: the
// one migration that follows the 369,
// `20261281163000_duplicate_subjects_retired.sql`. The owner asked for it on
// 2026-11-27 ("prepare the migration"); the environment's reviewer still has
// to approve the run itself.
//
// What that migration does: two seed migrations spelled two subject codes
// differently, so the catalogue lists Aqeedah twice and Islamic history
// twice. It sets `status = 'retired'` on the first seed's two, `aqidah` and
// `islamic-history`, which is what the Retire button on /admin/subjects
// does, and which that page can undo. It moves nothing, deletes nothing,
// adds no table, column or function, and gives no role anything. If anything
// points at a duplicate it leaves that duplicate alone.
//
// THIS IS THE FIRST STEP WRITTEN FOR A PROJECT THAT MAY HOLD ACCOUNTS. The
// nine before it refused unless the project had no Auth user and no learner.
// The site has been deployed since, and its owner has to be able to sign up
// before or after this runs, so that condition is gone. What stands in its
// place: the migration writes to two rows of one table (and two rows of the
// audit log), and this job insists on seeing exactly that in a rehearsal on
// the hosted database before it applies anything.
//
// This is NOT a general migration runner. It starts only when all of these
// hold, and says which one did not:
//
//   * the local files are the 369 already applied (same bytes as when this
//     was written) followed by exactly the one reviewed here (same bytes);
//   * the hosted history is exactly those 369, in order;
//   * both duplicates and both subjects that stay are there and active;
//   * a rehearsal on the hosted database itself, inside one transaction that
//     is then rolled back, runs to the end; retires exactly the two and
//     leaves the number of subjects as it was; AND leaves `anon` and
//     `authenticated` with exactly the privileges they hold in the database
//     the suites run on;
//   * nothing of the rehearsal is left afterwards;
//   * the CLI's own dry-run names exactly the one.
//
// After the CLI applies it, the history, the four subjects and the
// privileges are read again.
//
// What it cannot do: stop somebody else changing the database between two of
// its checks, undo a migration the CLI has committed (the owner can, from
// /admin/subjects), or prove anything about Auth, PostgREST or the
// application. The rehearsal holds a lock on two subject rows for as long as
// it runs, a few seconds. A run that finds all 370 already recorded applies
// nothing and only repeats the comparison.
//
// The nine steps before it are left as they were. This file borrows their
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

export const APPLIED_COUNT = 369;
// The 369 files this step starts from, as they are in this repository.
export const APPLIED_HASH = 'd532068fa803064c707221fa56e26ada5ff8b5e65e086afaf5ba85d4b92f3cd4';
export const PENDING = ['20261281163000_duplicate_subjects_retired.sql'];
// The one as it was when it was reviewed for this step.
export const PENDING_HASH = '095c053f11f2383c234f7474afe5d6c708d38566ccc9c7f63f9138d417f313e7';

// Null when the local files are the reviewed chain; otherwise why not.
export function localChainProblem(names = localMigrations(), hashOf = chainHash) {
  const applied = names.slice(0, APPLIED_COUNT); const pending = names.slice(APPLIED_COUNT);
  if (applied.length !== APPLIED_COUNT || hashOf(applied) !== APPLIED_HASH) return 'the first 369 local files are not the ones this step was reviewed against';
  if (pending.length !== PENDING.length || pending.some((name, i) => name !== PENDING[i])) return 'the local files after the 369 are not exactly the one reviewed';
  if (hashOf(pending) !== PENDING_HASH) return 'the migration has changed since it was reviewed';
  return null;
}

// The migration's own change, read from the four rows it is about: how many
// of the two duplicates are still active (2 before it, 0 after), how many of
// the two that stay are active (2 before and after), and how many subjects
// there are at all (the same before and after: nothing is deleted).
const STATE = `select current_database() as database, current_user::text as actor,
  (select count(*) from public.subject_areas where code in ('aqidah', 'islamic-history') and status = 'active' and deleted_at is null)::int as duplicates_active,
  (select count(*) from public.subject_areas where code in ('aqeedah', 'history') and status = 'active' and deleted_at is null)::int as kept_active,
  (select count(*) from public.subject_areas)::int as subjects`;

export async function inspect(client) {
  await client.query('begin read only');
  try {
    const { rows: [row] } = await client.query(STATE);
    const history = (await client.query('select version, name from supabase_migrations.schema_migrations order by version')).rows;
    return { row, history };
  } finally { await client.query('rollback'); }
}

const untouched = (state, applied) => state.row.database === 'postgres' && state.row.actor === 'postgres'
  && Number(state.row.duplicates_active) === 2 && Number(state.row.kept_active) === 2
  && historyMatches(state.history, applied);
// What the four rows must look like once the migration has run.
const retired = (row) => Number(row.duplicates_active) === 0 && Number(row.kept_active) === 2;

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
      // Still inside the transaction: what the migration made of the four rows.
      const { rows: [row] } = await client.query(STATE);
      return { ok: true, row, privileges: await lines(PRIVILEGES), defaults: await lines(DEFAULTS) };
    } catch (error) { return { ok: false, message: `Rehearsal ran the migration, but the privileges could not be read. ${databaseError(error)}` }; }
  } finally { await client.query('rollback'); }
}

// Inputs are injectable for isolated tests; the real run uses the verified
// client and CLI below. Raw CLI output is never returned.
export async function plan370({ client, runCli, target, applied, pending, expected, readSql, log = console.log }) {
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
    if (!historyMatches(before.history, applied)) return { ok: false, message: `Not started: the hosted history is not exactly the ${applied.length} migrations expected (it records ${before.history.length}). Compare history and schema by hand; do not retry.` };
    if (!untouched(before, applied)) return { ok: false, message: `Not started: the four subjects are not as this step expects (${before.row.duplicates_active} of the 2 duplicates active, ${before.row.kept_active} of the 2 that stay active). Somebody has already retired or changed one; look at /admin/subjects.` };
    log(`Hosted history is exactly the ${applied.length} expected; both duplicates and both subjects that stay are active, among ${before.row.subjects} subjects.`);

    const trial = await rehearse(client, pending, readSql);
    if (!trial.ok) return { ok: false, message: `Not applied. ${trial.message}\nThe rehearsal's transaction was rolled back.` };
    const afterTrial = await inspect(client);
    if (!untouched(afterTrial, applied)) return { ok: false, message: 'Not applied: after the rehearsal was rolled back the database is not as it was. Stop and inspect it.' };
    if (!retired(trial.row) || Number(trial.row.subjects) !== Number(before.row.subjects)) return { ok: false, message: `Not applied. In rehearsal the migration left ${trial.row.duplicates_active} of the 2 duplicates active, ${trial.row.kept_active} of the 2 that stay active, and ${trial.row.subjects} subjects where there were ${before.row.subjects}. It retires a duplicate only when nothing points at it: something on the hosted database does. Nothing was changed.` };
    const trialProblems = privilegeProblems(expected, trial);
    if (trialProblems.length) return { ok: false, message: `Not applied. The migration ran in rehearsal, but would not leave the API roles as the tested database has them:\n  ${trialProblems.join('\n  ')}` };
    log(`Rehearsal on the hosted database: the migration ran inside one transaction and was rolled back; it retired exactly the two duplicates and left all ${before.row.subjects} subjects in place; anon and authenticated would hold exactly the ${expected.privileges.length} privileges of the tested database. Nothing was left behind.`);

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
      return { ok: false, message: `The CLI reported a failure while applying. Possible categories: ${failureCategories(apply.output).join('; ') || 'Unclassified CLI failure'}. The history now records ${after.history.length} migrations. Stop; compare history and schema before anything else. Run again: this job applies only if the history is still exactly the first ${applied.length} and both duplicates are still active, and otherwise only reports.` };
    }
    if (!historyMatches(after.history, all)) return { ok: false, message: `The CLI reported success, but the history records ${after.history.length} migrations and is not the ${all.length} expected. Stop and investigate.` };
    if (!retired(after.row) || Number(after.row.subjects) !== Number(before.row.subjects)) return { ok: false, message: `All ${all.length} migrations are recorded, but the subjects are not as expected (${after.row.duplicates_active} of the 2 duplicates active, ${after.row.kept_active} of the 2 that stay active, ${after.row.subjects} subjects where there were ${before.row.subjects}). Look at /admin/subjects.` };
    const problems = privilegeProblems(expected, await readPrivileges(client));
    if (problems.length) return { ok: false, message: `All ${all.length} migrations are recorded, but the API roles do not hold what the tested database gives them:\n  ${problems.join('\n  ')}` };
    return { ok: true, message: `Applied. The history records all ${all.length} migrations in order; aqidah and islamic-history are retired, aqeedah and history are active, and all ${before.row.subjects} subjects are still there; anon and authenticated hold exactly the ${expected.privileges.length} privileges of the tested database, with the same ${expected.defaults.length} defaults for new objects. This does not prove Auth, PostgREST or the application, and it turns no switch on.` };
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
    const result = await plan370({ client, runCli: cli, target, applied, pending, expected,
      readSql: (name) => readFileSync(`${migrationsDir}/${name}`, 'utf8') });
    (result.ok ? console.log : console.error)(result.message);
    if (!result.ok) process.exitCode = 1;
  } catch {
    fail('Not applied: the database could not be reached, or a check could not be completed.');
  } finally { await client.end().catch(() => {}); }
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
