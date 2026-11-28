// The twelfth, separately approved step for the AyahSpring test project: the
// one migration that follows the 371,
// `20261281165000_role_questions_about_oneself.sql`. It was written on
// 2026-11-28 after the owner's "continue"; the environment's reviewer still
// has to approve the run itself, and this job cannot start until the step
// before it (371) has run.
//
// What that migration does: `has_role(uuid, text)` and `is_privileged(uuid)`
// answered about ANY account id, to a visitor who was not signed in as well,
// and seven functions built on them did the same for anybody signed in. So
// anybody could ask whether an account belongs to staff. After it, a caller
// is answered about itself and refused about anybody else; functions that run
// with the owner's rights, and the server's own key, ask as before. It adds
// five functions, changes how nine run and one policy, and changes no table,
// no column and no row.
//
// The project may hold accounts (the site is deployed), as for the two steps
// before this one. What stands in place of "an empty project": the migration
// writes no row, and this job insists on seeing that in a rehearsal on the
// hosted database before it applies anything.
//
// This is NOT a general migration runner. It starts only when all of these
// hold, and says which one did not:
//
//   * the local files are the 371 already applied (same bytes as when this
//     was written) followed by exactly the one reviewed here (same bytes);
//   * the hosted history is exactly those 371, in order;
//   * none of what the migration adds is there already, and the hole it
//     closes is open: asked as `authenticated` and as `anon` about an account
//     id that is not the caller's, the database answers (the id belongs to
//     nobody, so the answer is "no" and says nothing about anybody);
//   * a rehearsal on the hosted database itself, inside one transaction that
//     is then rolled back, runs to the end; leaves both roles refused about
//     somebody else and a signed-in caller still answered about itself, the
//     five functions, the nine running with the caller's rights and the
//     policy in place, and every role assignment and teacher page exactly as
//     it was; AND leaves `anon` and `authenticated` with exactly the
//     privileges they hold in the database the suites run on;
//   * nothing of the rehearsal is left afterwards;
//   * the CLI's own dry-run names exactly the one.
//
// After the CLI applies it, the history, the same facts and the privileges
// are read again, and the same questions are asked again: about somebody
// else they must be refused, about the caller answered.
//
// What it cannot do: stop somebody else changing the database between two of
// its checks, undo a migration the CLI has committed (nothing in it destroys
// anything; the earlier definition of each function is in the migrations),
// or prove anything about Auth, PostgREST or the application. The questions
// are asked over the database connection after `set local role`, with a
// signed-in person's claims set, which is what the functions read; no request
// goes through the API. A run that finds all 372 already recorded applies
// nothing and only repeats the comparison.
//
// The eleven steps before it are left as they were. This file borrows their
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



export const APPLIED_COUNT = 371;
// The 371 files this step starts from, as they are in this repository.
export const APPLIED_HASH = '5c3c7dbdd97a864a6c075d5e35f57a4c03daf721e967524db1a3c0b662764432';
export const PENDING = ['20261281165000_role_questions_about_oneself.sql'];
// The one as it was when it was reviewed for this step.
export const PENDING_HASH = '453c24f091d1efa6bacb059c68cb7d01ccd23d36e764b0d50483bd5f606dd1b3';

// Null when the local files are the reviewed chain; otherwise why not.
export function localChainProblem(names = localMigrations(), hashOf = chainHash) {
  const applied = names.slice(0, APPLIED_COUNT); const pending = names.slice(APPLIED_COUNT);
  if (applied.length !== APPLIED_COUNT || hashOf(applied) !== APPLIED_HASH) return 'the first 371 local files are not the ones this step was reviewed against';
  if (pending.length !== PENDING.length || pending.some((name, i) => name !== PENDING[i])) return 'the local files after the 371 are not exactly the one reviewed';
  if (hashOf(pending) !== PENDING_HASH) return 'the migration has changed since it was reviewed';
  return null;
}

// What the migration adds, counted: the five functions it creates (0 before,
// 5 after); how many of the nine questions run with the caller's rights (0,
// 9); and whether the teacher-page policy asks the new question (0, 1). And
// what it must leave alone: every role assignment and every teacher page,
// with a mark that changes if any assignment's holder, role or revocation
// does.
const NINE = `'has_role', 'is_privileged', 'can_appoint_teacher', 'can_decide_guardian_consent', 'can_decide_sponsorship', 'can_moderate_boards', 'can_work_incidents', 'may_change_control', 'may_write_setting'`;
const STATE = `select current_database() as database, current_user::text as actor,
  (select count(*) from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname in ('account_has_role', 'account_is_privileged', 'own_account_has_role', 'own_account_is_privileged', 'teaches_in_public'))::int as added,
  (select count(*) from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname in (${NINE}) and not p.prosecdef)::int as callers_rights,
  (select count(*) from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname in (${NINE}))::int as nine,
  (select count(*) from pg_policy pol where pol.polrelid = 'public.instructor_public_profiles'::regclass and pol.polname = 'instructor_public_profiles_read' and pg_get_expr(pol.polqual, pol.polrelid) like '%teaches_in_public(%')::int as policy,
  (select count(*) from public.user_role_assignments)::int as assignments,
  (select count(*) from public.instructor_public_profiles)::int as pages,
  (select coalesce(md5(string_agg(a.id::text || a.user_id::text || a.role_id::text || coalesce(a.revoked_at::text, ''), ',' order by a.id)), 'none') from public.user_role_assignments a) as assignments_mark`;

// Two people who do not exist.
const SOMEBODY = '00000000-0000-4000-8000-00000000a372';
const SOMEBODY_ELSE = '00000000-0000-4000-8000-00000000b372';

// One question, asked as one of the API's roles. 'answered' when the database
// answers, 'refused' when it refuses because the role may not ask about that
// account, and otherwise why the question could not be asked at all (so that
// "could not become that role" is never read as either). Nothing is written:
// the functions only read, and the savepoint takes back the role and the
// claims. Call it inside a transaction.
async function ask(client, role, claims, sql) {
  await client.query('savepoint role_question_probe');
  try {
    await client.query(`select set_config('request.jwt.claims', '${claims}', true)`);
    await client.query(`set local role ${role}`);
    await client.query(sql);
    return 'answered';
  } catch (error) {
    if (error?.code === '42501' && /is answered to that account only/.test(String(error?.message ?? ''))) return 'refused';
    return `not asked (${typeof error?.code === 'string' && /^[0-9A-Z]{5}$/.test(error.code) ? `SQLSTATE ${error.code}` : 'no database error code'})`;
  } finally { await client.query('rollback to savepoint role_question_probe'); }
}

// The hole itself, asked about, and the question that must go on being
// answered. `others` is what the two roles are told about an account that is
// not theirs; `own` is what a signed-in caller is told about itself.
export async function roleQuestions(client) {
  const signedIn = `{"sub":"${SOMEBODY}","role":"authenticated"}`;
  const others = [
    await ask(client, 'authenticated', signedIn, `select public.is_privileged('${SOMEBODY_ELSE}')`),
    await ask(client, 'authenticated', signedIn, `select public.has_role('${SOMEBODY_ELSE}', 'platform_admin')`),
    await ask(client, 'authenticated', signedIn, `select public.can_moderate_boards('${SOMEBODY_ELSE}')`),
    await ask(client, 'anon', '', `select public.is_privileged('${SOMEBODY_ELSE}')`),
    await ask(client, 'anon', '', `select public.has_role('${SOMEBODY_ELSE}', 'platform_admin')`),
  ];
  const own = [
    await ask(client, 'authenticated', signedIn, `select public.is_privileged('${SOMEBODY}')`),
    await ask(client, 'authenticated', signedIn, `select public.has_role('${SOMEBODY}', 'platform_admin')`),
    await ask(client, 'anon', '', `select public.is_privileged(null)`),
  ];
  const all = (list, word) => list.every((answer) => answer === word);
  return {
    // 'open' before the migration, 'shut' after it, and anything else is said in full.
    others: all(others, 'answered') ? 'open' : all(others, 'refused') ? 'shut' : `mixed (${others.join(', ')})`,
    own: all(own, 'answered') ? 'answered' : `not all answered (${own.join(', ')})`,
  };
}

export async function inspect(client) {
  await client.query('begin read only');
  try {
    const { rows: [row] } = await client.query(STATE);
    const history = (await client.query('select version, name from supabase_migrations.schema_migrations order by version')).rows;
    const questions = await roleQuestions(client);
    return { row, history, questions };
  } finally { await client.query('rollback'); }
}

const absent = (row) => Number(row.added) === 0 && Number(row.callers_rights) === 0 && Number(row.nine) === 9 && Number(row.policy) === 0;
// What must be there once the migration has run.
const inPlace = (row) => Number(row.added) === 5 && Number(row.callers_rights) === 9 && Number(row.nine) === 9 && Number(row.policy) === 1;
const shut = (questions) => questions.others === 'shut' && questions.own === 'answered';
const open = (questions) => questions.others === 'open' && questions.own === 'answered';
const sameRows = (a, b) => Number(a.assignments) === Number(b.assignments) && Number(a.pages) === Number(b.pages) && a.assignments_mark === b.assignments_mark;
const untouched = (state, applied) => state.row.database === 'postgres' && state.row.actor === 'postgres'
  && absent(state.row) && open(state.questions) && historyMatches(state.history, applied);
const counts = (row) => `${row.added} of the 5 functions, ${row.callers_rights} of the ${row.nine} questions running with the caller's rights (9 expected), ${row.policy} of the 1 policy`;
const told = (questions) => `asked about somebody else the two roles find the door ${questions.others}; asked about itself a caller is ${questions.own}`;

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
      const questions = await roleQuestions(client);
      return { ok: true, row, questions, privileges: await lines(PRIVILEGES), defaults: await lines(DEFAULTS) };
    } catch (error) { return { ok: false, message: `Rehearsal ran the migration, but what it left could not be read. ${databaseError(error)}` }; }
  } finally { await client.query('rollback'); }
}

// Inputs are injectable for isolated tests; the real run uses the verified
// client and CLI below. Raw CLI output is never returned.
export async function plan372({ client, runCli, target, applied, pending, expected, readSql, log = console.log }) {
  let applyStarted = false;
  const all = [...applied, ...pending];
  try {
    const before = await inspect(client);
    if (before.row.database !== 'postgres' || before.row.actor !== 'postgres') return { ok: false, message: 'Not started: not connected to the postgres database as postgres.' };
    if (historyMatches(before.history, all)) {
      if (!inPlace(before.row) || !shut(before.questions)) return { ok: false, message: `Nothing applied: all ${all.length} migrations are already recorded, but what the last one adds is not all there (${counts(before.row)}; ${told(before.questions)}). Stop and investigate.` };
      const problems = privilegeProblems(expected, await readPrivileges(client));
      if (problems.length) return { ok: false, message: `Nothing applied: all ${all.length} migrations are already recorded. The API roles do not hold what the tested database gives them:\n  ${problems.join('\n  ')}` };
      return { ok: true, message: `Nothing applied: all ${all.length} migrations are already recorded; anon and authenticated are refused about an account that is not the caller's and a caller is answered about itself; and anon and authenticated hold exactly the ${expected.privileges.length} privileges of the tested database.` };
    }
    if (!historyMatches(before.history, applied)) return { ok: false, message: `Not started: the hosted history is not exactly the ${applied.length} migrations expected (it records ${before.history.length}). The step before this one has to have run. Compare history and schema by hand; do not retry.` };
    if (!untouched(before, applied)) return { ok: false, message: `Not started: the database is not as this step expects before it runs (${counts(before.row)}; ${told(before.questions)}). Either somebody has made part of this change by hand, or the questions could not be asked as the two roles; compare the functions and the policy with the migration.` };
    log(`Hosted history is exactly the ${applied.length} expected; none of what the migration adds is there, and anon and authenticated are answered about an account that is not theirs; ${before.row.assignments} role assignments and ${before.row.pages} teacher pages.`);

    const trial = await rehearse(client, pending, readSql);
    if (!trial.ok) return { ok: false, message: `Not applied. ${trial.message}\nThe rehearsal's transaction was rolled back.` };
    const afterTrial = await inspect(client);
    if (!untouched(afterTrial, applied) || !sameRows(afterTrial.row, before.row)) return { ok: false, message: 'Not applied: after the rehearsal was rolled back the database is not as it was. Stop and inspect it.' };
    if (!inPlace(trial.row) || !shut(trial.questions)) return { ok: false, message: `Not applied. In rehearsal the migration left ${counts(trial.row)}; ${told(trial.questions)}. Nothing was changed.` };
    if (!sameRows(trial.row, before.row)) return { ok: false, message: `Not applied. In rehearsal the migration changed a row it is meant to leave alone: ${trial.row.assignments} role assignments and ${trial.row.pages} teacher pages where there were ${before.row.assignments} and ${before.row.pages}, or an assignment's holder, role or revocation. Nothing was changed.` };
    const trialProblems = privilegeProblems(expected, trial);
    if (trialProblems.length) return { ok: false, message: `Not applied. The migration ran in rehearsal, but would not leave the API roles as the tested database has them:\n  ${trialProblems.join('\n  ')}` };
    log(`Rehearsal on the hosted database: the migration ran inside one transaction and was rolled back; with it, anon and authenticated were refused about an account that is not the caller's and a caller was answered about itself, the five functions, the nine questions and the policy were in place, and all ${before.row.assignments} role assignments and ${before.row.pages} teacher pages were as before; anon and authenticated would hold exactly the ${expected.privileges.length} privileges of the tested database. Nothing was left behind.`);

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
    if (!inPlace(after.row) || !shut(after.questions)) return { ok: false, message: `All ${all.length} migrations are recorded, but what the last one adds is not all there (${counts(after.row)}; ${told(after.questions)}). Stop and investigate.` };
    if (!sameRows(after.row, before.row)) return { ok: false, message: `All ${all.length} migrations are recorded and the questions are refused, but the role assignments or teacher pages are not as they were before the apply (${after.row.assignments} and ${after.row.pages}, where there were ${before.row.assignments} and ${before.row.pages}, or an assignment's holder, role or revocation). The migration writes no row; somebody else may have. Look at who changed them.` };
    const problems = privilegeProblems(expected, await readPrivileges(client));
    if (problems.length) return { ok: false, message: `All ${all.length} migrations are recorded, but the API roles do not hold what the tested database gives them:\n  ${problems.join('\n  ')}` };
    return { ok: true, message: `Applied. The history records all ${all.length} migrations in order; asked as authenticated and as anon about an account that is not the caller's, the database refuses, and a signed-in caller is still answered about itself; the five functions, the nine questions and the policy are in place; ${after.row.assignments} role assignments and ${after.row.pages} teacher pages, as before; anon and authenticated hold exactly the ${expected.privileges.length} privileges of the tested database, with the same ${expected.defaults.length} defaults for new objects. This does not prove Auth, PostgREST or the application, it was not asked through a real session or the API, and it turns no switch on.` };
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
    const result = await plan372({ client, runCli: cli, target, applied, pending, expected,
      readSql: (name) => readFileSync(`${migrationsDir}/${name}`, 'utf8') });
    (result.ok ? console.log : console.error)(result.message);
    if (!result.ok) process.exitCode = 1;
  } catch {
    fail('Not applied: the database could not be reached, or a check could not be completed.');
  } finally { await client.end().catch(() => {}); }
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
