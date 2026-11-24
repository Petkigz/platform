// The fifth, separately approved step for the AyahSpring test project: the two
// migrations that follow the 354 already recorded there,
// `20261281148000_notification_facts.sql` and
// `20261281149000_policy_version_shown.sql`. The owner was asked on
// 2026-11-24 whether to apply the first by itself or with the second, with
// the second suggested, and said "continue"; the environment's reviewer
// still has to approve the run itself.
//
// What they do. The first keeps a notification as what it is made of, so it
// can be said in the reader's language: one nullable column on
// `notifications`, one function, and seven functions replaced by their
// earlier definitions plus the facts. The second adds a function that
// records an agreement to a policy only for the version its reader was
// shown. Neither changes a row, and neither turns a switch on.
//
// This is NOT a general migration runner. It starts only when all of these
// hold, and says which one did not:
//
//   * the local files are the 354 already applied (same bytes as when this
//     was written) followed by exactly the two reviewed here (same bytes);
//   * the hosted history is exactly those 354, in order, and neither
//     migration's own change is already there;
//   * the project still has no Auth user and no learner;
//   * a rehearsal on the hosted database itself, inside one transaction that
//     is then rolled back, runs both to the end AND leaves `anon` and
//     `authenticated` with exactly the privileges they hold in the database
//     the suites run on;
//   * nothing of the rehearsal is left afterwards;
//   * the CLI's own dry-run names exactly the two.
//
// After the CLI applies them, the history and the privileges are read again.
//
// What it cannot do: stop somebody else changing the database between two of
// its checks, undo a migration the CLI has committed, or prove anything about
// Auth, PostgREST or the application. The CLI applies each file in its own
// transaction, so a failure in the second would leave the first applied; the
// rehearsal runs both first for that reason, and a run that then finds 355
// recorded does not start and says so. A run that finds all 356 already
// recorded applies nothing and only repeats the comparison.
//
// The first four steps (scripts/hosted-migration-apply.mjs, the 342;
// scripts/hosted-migration-advance.mjs, the ten;
// scripts/hosted-migration-one-more.mjs, the 353rd; and
// scripts/hosted-migration-354.mjs, the 354th) are spent and are left as
// they were. This file borrows their checks and none of their decisions.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { databaseUrlChecks, verifiedTlsUrl, trustedCaReady, extractMigrationNames, pendingMatchesLocal, failureCategories } from './hosted-migration-dry-run.mjs';
import { historyMatches } from './hosted-migration-apply.mjs';
import { chainHash, privilegeProblems, readPrivileges, unsafeInsideTransaction } from './hosted-migration-advance.mjs';
import { PRIVILEGES, DEFAULTS, localMigrations } from './api-role-privileges.mjs';

const migrationsDir = fileURLToPath(new URL('../supabase/migrations/', import.meta.url));
const caPath = fileURLToPath(new URL('../certs/supabase-prod-ca-2021.crt', import.meta.url));

export const APPLIED_COUNT = 354;
// The 354 files recorded on the hosted project, as they are in this repository.
export const APPLIED_HASH = '05959f9fc759cdd07e574775d065099210d3d31e0060cebd6370f3dab21fdf0c';
export const PENDING = ['20261281148000_notification_facts.sql', '20261281149000_policy_version_shown.sql'];
// The two as they were when they were reviewed for this step.
export const PENDING_HASH = 'b89ee68c59c71dd2ba02e2dba986baa09aec7ea4a4ed8d7ded6ee6e2f77e456c';

// Null when the local files are the reviewed chain; otherwise why not.
export function localChainProblem(names = localMigrations(), hashOf = chainHash) {
  const applied = names.slice(0, APPLIED_COUNT); const pending = names.slice(APPLIED_COUNT);
  if (applied.length !== APPLIED_COUNT || hashOf(applied) !== APPLIED_HASH) return 'the first 354 local files are not the ones recorded on the hosted project';
  if (pending.length !== PENDING.length || pending.some((name, i) => name !== PENDING[i])) return 'the local files after the 354 are not exactly the two reviewed';
  if (hashOf(pending) !== PENDING_HASH) return 'a migration has changed since it was reviewed';
  return null;
}

// Each migration's own first change. `has_facts` is the column that keeps
// what a notification is made of; `has_shown` is the function that takes the
// version a reader was shown. Both false before, both true after.
const STATE = `select current_database() as database, current_user::text as actor,
  (select count(*) from auth.users)::int as auth_users,
  (select count(*) from public.learner_profiles)::int as learners,
  exists (select 1 from pg_attribute a where a.attrelid = to_regclass('public.notifications') and a.attname = 'facts' and not a.attisdropped) as has_facts,
  to_regprocedure('public.accept_policy(text,integer)') is not null as has_shown`;

export async function inspect(client) {
  await client.query('begin read only');
  try {
    const { rows: [row] } = await client.query(STATE);
    const history = (await client.query('select version, name from supabase_migrations.schema_migrations order by version')).rows;
    return { row, history };
  } finally { await client.query('rollback'); }
}

const untouched = (state, applied) => state.row.database === 'postgres' && state.row.actor === 'postgres'
  && Number(state.row.auth_users) === 0 && Number(state.row.learners) === 0
  && state.row.has_facts === false && state.row.has_shown === false
  && historyMatches(state.history, applied);

// The database's own words about our own SQL: an SQLSTATE and one line. Never
// used for connection failures, whose text can name the host.
function databaseError(error) {
  const code = typeof error?.code === 'string' && /^[0-9A-Z]{5}$/.test(error.code) ? error.code : null;
  if (!code) return 'no database error code (connection or driver failure)';
  return `SQLSTATE ${code}: ${String(error.message ?? '').split('\n')[0].slice(0, 300)}`;
}

// Both migrations in one transaction on the real database, then rolled back.
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
      return { ok: true, privileges: await lines(PRIVILEGES), defaults: await lines(DEFAULTS) };
    } catch (error) { return { ok: false, message: `Rehearsal ran both migrations, but the privileges could not be read. ${databaseError(error)}` }; }
  } finally { await client.query('rollback'); }
}

// Inputs are injectable for isolated tests; the real run uses the verified
// client and CLI below. Raw CLI output is never returned.
export async function plan356({ client, runCli, target, applied, pending, expected, readSql, log = console.log }) {
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
    if (!untouched(before, applied)) return { ok: false, message: `Not started: the hosted history is not exactly the ${applied.length} migrations expected (it records ${before.history.length}), or one of the two migrations' changes is already present. Compare history and schema by hand; do not retry.` };
    log(`Hosted history is exactly the ${applied.length} expected; no Auth user, no learner.`);

    const trial = await rehearse(client, pending, readSql);
    if (!trial.ok) return { ok: false, message: `Not applied. ${trial.message}\nThe rehearsal's transaction was rolled back.` };
    const afterTrial = await inspect(client);
    if (!untouched(afterTrial, applied)) return { ok: false, message: 'Not applied: after the rehearsal was rolled back the database is not as it was. Stop and inspect it.' };
    const trialProblems = privilegeProblems(expected, trial);
    if (trialProblems.length) return { ok: false, message: `Not applied. The two migrations ran in rehearsal, but would not leave the API roles as the tested database has them:\n  ${trialProblems.join('\n  ')}` };
    log(`Rehearsal on the hosted database: the two migrations ran inside one transaction and were rolled back; anon and authenticated would hold exactly the ${expected.privileges.length} privileges of the tested database. Nothing was left behind.`);

    const dry = await runCli(['db', 'push', `--remote=${target}`, '--skip-vault', '--dry-run']);
    if (dry.code !== 0) return { ok: false, message: `Not applied: the CLI dry-run failed. Possible categories: ${failureCategories(dry.output).join('; ') || 'Unclassified CLI failure'}.` };
    if (!pendingMatchesLocal(extractMigrationNames(dry.output), pending)) return { ok: false, message: 'Not applied: the CLI dry-run does not name exactly the two reviewed migrations.' };
    // Somebody else could still change the database after this check.
    const recheck = await inspect(client);
    if (!untouched(recheck, applied)) return { ok: false, message: 'Not applied: the database changed during the checks.' };
    log('CLI dry-run names exactly the two. Applying.');

    applyStarted = true;
    const apply = await runCli(['db', 'push', `--remote=${target}`, '--skip-vault', '--yes']);
    const after = await inspect(client);
    if (apply.code !== 0) {
      return { ok: false, message: `The CLI reported a failure while applying. Possible categories: ${failureCategories(apply.output).join('; ') || 'Unclassified CLI failure'}. The history now records ${after.history.length} migrations. Stop; compare history and schema before anything else. Run again: this job applies only if the history is still exactly the first ${applied.length} and neither change is there, and otherwise only reports.` };
    }
    if (!historyMatches(after.history, all)) return { ok: false, message: `The CLI reported success, but the history records ${after.history.length} migrations and is not the ${all.length} expected. Stop and investigate.` };
    if (after.row.has_facts !== true || after.row.has_shown !== true) return { ok: false, message: `All ${all.length} migrations are recorded, but one of the two migrations' own changes is not there. Stop and investigate.` };
    const problems = privilegeProblems(expected, await readPrivileges(client));
    if (problems.length) return { ok: false, message: `All ${all.length} migrations are recorded, but the API roles do not hold what the tested database gives them:\n  ${problems.join('\n  ')}` };
    return { ok: true, message: `Applied. The history records all ${all.length} migrations in order, and anon and authenticated hold exactly the ${expected.privileges.length} privileges of the tested database, with the same ${expected.defaults.length} defaults for new objects. This does not prove Auth, PostgREST or the application, and it turns no switch on.` };
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
    const result = await plan356({ client, runCli: cli, target, applied, pending, expected,
      readSql: (name) => readFileSync(`${migrationsDir}/${name}`, 'utf8') });
    (result.ok ? console.log : console.error)(result.message);
    if (!result.ok) process.exitCode = 1;
  } catch {
    fail('Not applied: the database could not be reached, or a check could not be completed.');
  } finally { await client.end().catch(() => {}); }
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
