// One-off AyahSpring test-project migration preview. No migrations are applied.
// Never print the connection string or raw CLI output, even on failure.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const projectRef = 'glhxtsgrhhvtbsnlxgxu';
export function databaseUrlChecks(value) {
  if (!value) return { 'URL secret present': false };
  try {
    const url = new URL(value);
    const username = decodeURIComponent(url.username);
    const direct = url.hostname === `db.${projectRef}.supabase.co` && username === 'postgres';
    const pooler = url.hostname.endsWith('.pooler.supabase.com') && username === `postgres.${projectRef}`;
    return {
      'URL secret present': true,
      'URL can be parsed': true,
      'PostgreSQL scheme': ['postgres:', 'postgresql:'].includes(url.protocol),
      'Test-project host and username': direct || pooler,
      'Session port 5432': url.port === '5432',
      'Database is postgres': url.pathname === '/postgres',
      'Password is present': !!url.password,
      'No URL fragment': !url.hash,
    };
  } catch { return { 'URL secret present': true, 'URL can be parsed': false }; }
}
export function isTestDatabaseUrl(value) {
  return Object.values(databaseUrlChecks(value)).every(Boolean);
}
// Discard supplied options, including duplicate or weaker sslmode values. Only
// the verified-TLS option reaches the CLI; target identity is checked first.
export function verifiedTlsUrl(value) {
  if (!isTestDatabaseUrl(value)) return null;
  const url = new URL(value);
  url.search = '?sslmode=verify-full';
  return url.toString();
}
export function extractMigrationNames(output) {
  return output.split(/\r?\n/).map(line => line.trim())
    .map(line => line.match(/^•\s+(\d{14}_[a-z0-9_]+\.sql)$/)?.[1])
    .filter(Boolean);
}
// Return fixed labels only, never fragments of the untrusted CLI response.
export function failureCategories(output) {
  const checks = [
    ['Database authentication or pooler tenant', /password authentication failed|authentication failed|authentication error|invalid (?:password|credentials)|wrong password|tenant or user not found|tenant not found|invalid login|sasl authentication/i],
    ['TLS certificate or handshake', /certificate|x509|tls handshake|ssl handshake|hostname mismatch/i],
    ['DNS lookup', /no such host|enotfound|dns lookup|name or service not known|temporary failure in name resolution/i],
    ['Network connection or timeout', /econnrefused|connection refused|econnreset|connection reset|network is unreachable|timed? ?out|i\/o timeout|etimedout|connection terminated/i],
    ['Database permissions or migration history', /permission denied|insufficient privilege|sqlstate 42501|remote migration versions not found|migration history/i],
    ['Connection string or CLI argument', /invalid connection string|cannot parse|failed to parse|invalid url|unknown flag|invalid value/i],
  ];
  return checks.filter(([, pattern]) => pattern.test(output)).map(([label]) => label);
}
async function main() {
  const ready = process.env.AYAHSPRING_TEST_DRY_RUN_READY === 'yes';
  const checks = databaseUrlChecks(process.env.AYAHSPRING_TEST_DATABASE_URL || '');
  if (!ready || !Object.values(checks).every(Boolean)) {
    console.error('Dry-run not started. Only pass/fail checks are shown; no connection values are printed.');
    console.error(`Readiness variable equals yes: ${ready ? 'PASS' : 'FAIL'}`);
    for (const [label, ok] of Object.entries(checks)) console.error(`${label}: ${ok ? 'PASS' : 'FAIL'}`);
    process.exitCode = 1; return;
  }
  const target = verifiedTlsUrl(process.env.AYAHSPRING_TEST_DATABASE_URL || '');
  console.log('URL options are replaced with sslmode=verify-full for this preview.');
  const child = spawn(process.env.SUPABASE_CLI_BIN || 'supabase', ['db', 'push', `--remote=${target}`, '--skip-vault', '--dry-run'], {
    stdio: ['ignore', 'pipe', 'pipe'], env: process.env,
  });
  let output = '';
  for (const stream of [child.stdout, child.stderr]) stream.on('data', chunk => { output += chunk.toString(); });
  const status = await new Promise(resolve => {
    child.on('error', () => resolve(null));
    child.on('close', code => resolve(code));
  });
  if (status !== 0) {
    const categories = failureCategories(output);
    console.error('Dry-run failed. No raw provider output is shown to avoid exposing connection details.');
    console.error(categories.length ? `Possible cause categories: ${categories.join('; ')}` : 'Possible cause category: Unclassified CLI failure');
    console.error('These are pattern matches, not a diagnosis. Do not apply migrations.');
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
