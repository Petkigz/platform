// One-time, explicitly approved initial migration of the empty AyahSpring test
// project. This is NOT a general migration runner or an automatic retry tool.
// Preflight checks and application use separate sessions: they do not prevent an
// outside actor changing the database in between. Stop other writers first.
import { Client } from 'pg';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { databaseUrlChecks, verifiedTlsUrl, trustedCaReady, extractMigrationNames, pendingMatchesLocal, failureCategories } from './hosted-migration-dry-run.mjs';

const migrationsDir = fileURLToPath(new URL('../supabase/migrations/', import.meta.url));
const caPath = fileURLToPath(new URL('../certs/supabase-prod-ca-2021.crt', import.meta.url));
const reviewedHash = 'ebde8bfc2ec7d2d27b5e9d6dc6969a0d076ef5cf65e8d2a9c9379babe395c2d2';
export function migrationInventory(dir = migrationsDir) {
  const names = readdirSync(dir).filter(name => name.endsWith('.sql')).sort();
  const hash = createHash('sha256');
  for (const name of names) {
    const data = readFileSync(`${dir}/${name}`);
    hash.update(`${name}\0${data.length}\0`); hash.update(data);
  }
  return { names, hash: hash.digest('hex') };
}
export function isPristine(row, historyCount) {
  return row.database === 'postgres' && row.actor === 'postgres' &&
    Number(row.auth_users) === 0 && Number(row.public_relations) === 0 &&
    Number(row.public_functions) === 0 && historyCount === 0;
}
export function historyMatches(rows, names) {
  return rows.length === names.length && rows.every((row, i) => `${row.version}_${row.name}.sql` === names[i]);
}
export async function inspect(client) {
  await client.query('begin read only');
  try {
    const { rows: [row] } = await client.query(`select current_database() as database, current_user as actor,
      (select count(*) from auth.users)::int as auth_users,
      (select count(*) from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
       where n.nspname='public' and c.relkind in ('r','p','v','m','S','f'))::int as public_relations,
      (select count(*) from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace
       where n.nspname='public')::int as public_functions,
      to_regclass('supabase_migrations.schema_migrations') is not null as history_exists`);
    const history = row.history_exists ? (await client.query('select version, name from supabase_migrations.schema_migrations order by version')).rows : [];
    return { row, history };
  } finally { await client.query('rollback'); }
}
function cli(args) {
  return new Promise(resolve => {
    const child = spawn(process.env.SUPABASE_CLI_BIN || 'supabase', args, { stdio: ['ignore','pipe','pipe'], env: process.env });
    let output = '';
    for (const stream of [child.stdout, child.stderr]) stream.on('data', chunk => { output += chunk.toString(); });
    child.on('error', () => resolve({ code: null, output }));
    child.on('close', code => resolve({ code, output }));
  });
}
// Inputs are injectable for isolated tests; production always uses the actual
// verified client and CLI above. No provider output is returned to the caller.
export async function executePlan(client, runCli, target, names) {
  let applyStarted = false;
  try {
    const before = await inspect(client);
    if (!isPristine(before.row, before.history.length)) {
      return { ok: false, message: 'Apply not started: database is not pristine. Inspect schema, Auth users and migration history; do not retry blindly.' };
    }
    const dry = await runCli(['db', 'push', `--remote=${target}`, '--skip-vault', '--dry-run']);
    if (dry.code !== 0 || !pendingMatchesLocal(extractMigrationNames(dry.output), names)) {
      return { ok: false, message: 'Apply not started: fresh dry-run failed or pending files differ from the complete reviewed chain.' };
    }
    // External writers can still race this check; the project must be quiet.
    const recheck = await inspect(client);
    if (!isPristine(recheck.row, recheck.history.length)) {
      return { ok: false, message: 'Apply not started: database changed during preflight.' };
    }
    console.log('Fresh dry-run and pristine checks passed. Starting the approved test-project migration.');
    applyStarted = true;
    const apply = await runCli(['db', 'push', `--remote=${target}`, '--skip-vault', '--yes']);
    if (apply.code !== 0) {
      const categories = failureCategories(apply.output);
      return { ok: false, message: `Apply failed or is uncertain. Possible categories: ${categories.join('; ') || 'Unclassified CLI failure'}. Stop; inspect history and schema before any retry.` };
    }
    const after = await inspect(client);
    if (!historyMatches(after.history, names)) {
      return { ok: false, message: 'CLI returned success, but migration history does not match the reviewed chain. Stop and investigate.' };
    }
    return { ok: true, message: `CLI completed; all ${names.length} migration history versions and names match. This does not prove real Auth, RLS or application correctness.` };
  } catch {
    return { ok: false, message: applyStarted ? 'Apply outcome or verification is uncertain. Stop; inspect history and schema before retrying.' : 'Apply not started: preflight could not be completed.' };
  }
}
async function main() {
  const value = process.env.AYAHSPRING_TEST_DATABASE_URL || '';
  const password = process.env.AYAHSPRING_TEST_DATABASE_PASSWORD || '';
  if (process.env.AYAHSPRING_TEST_APPLY_READY !== 'yes' || !password || !Object.values(databaseUrlChecks(value)).every(Boolean) || !trustedCaReady()) {
    console.error('Apply not started: approval readiness, test target, password or pinned CA check failed.'); process.exitCode = 1; return;
  }
  const { names, hash } = migrationInventory();
  if (names.length !== 342 || hash !== reviewedHash) {
    console.error('Apply not started: local migration chain differs from the reviewed chain.'); process.exitCode = 1; return;
  }
  const target = verifiedTlsUrl(value, password);
  const parsed = new URL(target);
  const client = new Client({ host: parsed.hostname, port: Number(parsed.port), database: 'postgres',
    user: decodeURIComponent(parsed.username), password, connectionTimeoutMillis: 10000,
    ssl: { ca: readFileSync(caPath, 'utf8'), rejectUnauthorized: true, servername: parsed.hostname } });
  try {
    await client.connect();
    const result = await executePlan(client, cli, target, names);
    console.log(result.message);
    if (!result.ok) process.exitCode = 1;
  } catch {
    console.error('Apply not started: preflight could not be completed.');
    process.exitCode = 1;
  } finally { await client.end().catch(() => {}); }

}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
