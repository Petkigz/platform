// One-off AyahSpring test-project migration preview. No migrations are applied.
// Never print the connection string or raw CLI output, even on failure.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const projectRef = 'glhxtsgrhhvtbsnlxgxu';
export function isTestDatabaseUrl(value) {
  try {
    const url = new URL(value);
    const direct = url.hostname === `db.${projectRef}.supabase.co` && decodeURIComponent(url.username) === 'postgres';
    const pooler = url.hostname.endsWith('.pooler.supabase.com') && decodeURIComponent(url.username) === `postgres.${projectRef}`;
    const options = [...url.searchParams.entries()];
    return ['postgres:', 'postgresql:'].includes(url.protocol) && (direct || pooler) &&
      url.port === '5432' && url.pathname === '/postgres' && !!url.password && !url.hash &&
      options.length === 1 && options[0][0] === 'sslmode' && options[0][1] === 'verify-full';
  } catch { return false; }
}
export function extractMigrationNames(output) {
  return output.split(/\r?\n/).map(line => line.trim())
    .map(line => line.match(/^•\s+(\d{14}_[a-z0-9_]+\.sql)$/)?.[1])
    .filter(Boolean);
}
async function main() {
  if (process.env.AYAHSPRING_TEST_DRY_RUN_READY !== 'yes' || !isTestDatabaseUrl(process.env.AYAHSPRING_TEST_DATABASE_URL || '')) {
    console.error('Dry-run not started: check the environment approval, readiness variable and test-project session-pooler URL.');
    process.exitCode = 1; return;
  }
  const child = spawn(process.env.SUPABASE_CLI_BIN || 'supabase', ['db', 'push', `--remote=${process.env.AYAHSPRING_TEST_DATABASE_URL}`, '--skip-vault', '--dry-run'], {
    stdio: ['ignore', 'pipe', 'pipe'], env: process.env,
  });
  let output = '';
  for (const stream of [child.stdout, child.stderr]) stream.on('data', chunk => { output += chunk.toString(); });
  const status = await new Promise(resolve => {
    child.on('error', () => resolve(null));
    child.on('close', code => resolve(code));
  });
  if (status !== 0) {
    console.error('Dry-run failed. No raw provider output is shown to avoid exposing connection details. Check project access, TLS, the session-pooler URL and runner connectivity; do not apply migrations.');
    process.exitCode = 1; return;
  }
  const names = extractMigrationNames(output);
  if (names.length) {
    console.log(`Pending migration files reported by the CLI: ${names.length}`);
    for (const name of names) console.log(name);
  } else if (output.includes('Remote database is up to date.')) {
    console.log('CLI reports no pending migrations. Compare remote history and schema separately.');
  } else {
    console.error('Dry-run returned an unrecognised result; no provider output shown. Do not apply migrations.');
    process.exitCode = 1;
  }
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
