import test from 'node:test';
import assert from 'node:assert/strict';
import { isTestDatabaseUrl, verifiedTlsUrl, trustedCaReady, extractMigrationNames, failureCategories } from './hosted-migration-dry-run.mjs';

test('only the explicitly named test project and session port are accepted', () => {
  const direct = 'postgresql://postgres:dummy@db.glhxtsgrhhvtbsnlxgxu.supabase.co:5432/postgres?sslmode=verify-full';
  const pool = 'postgresql://postgres.glhxtsgrhhvtbsnlxgxu:dummy@aws-1-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=verify-full';
  assert.ok(isTestDatabaseUrl(direct)); assert.ok(isTestDatabaseUrl(pool));
  for (const url of ['', direct.replace('glhxtsgrhhvtbsnlxgxu','other'), pool.replace('postgres.glhxtsgrhhvtbsnlxgxu','postgres.other'), pool.replace('pooler.supabase.com','pooler.supabase.com.evil.test'), pool.replace(':5432/',':6543/'), pool.replace('/postgres?', '/other?')]) assert.equal(isTestDatabaseUrl(url), false);
});

test('supplied URL options are discarded and TLS verification is always enforced', () => {
  const base = 'postgresql://postgres:dummy@db.glhxtsgrhhvtbsnlxgxu.supabase.co:5432/postgres';
  for (const suffix of ['', '?sslmode=disable', '?sslmode=require&sslmode=disable', '?other=untrusted']) {
    const target = new URL(verifiedTlsUrl(base + suffix, 'raw%:?#@/'));
    assert.equal(decodeURIComponent(target.password), 'raw%:?#@/');
    assert.equal(target.searchParams.get('sslmode'), 'verify-full');
    assert.match(target.searchParams.get('sslrootcert'), /supabase-prod-ca-2021\.crt$/);
    assert.deepEqual([...target.searchParams.keys()], ['sslmode', 'sslrootcert']);
  }
  assert.equal(verifiedTlsUrl(base.replace('glhxtsgrhhvtbsnlxgxu', 'other'), 'password'), null);
  assert.equal(verifiedTlsUrl(base, ''), null);
  assert.equal(trustedCaReady(), true);
});

test('only safe migration names are displayed, never arbitrary CLI output', () => {
  assert.deepEqual(extractMigrationNames('Would push these migrations:\n • 20261015000100_helpers.sql\nsecret@host\n • 20261281135000_calculated_prayer_times.sql\n • not_a_file\n'), ['20261015000100_helpers.sql', '20261281135000_calculated_prayer_times.sql']);
});

test('failure categories are fixed labels and never include raw provider output', () => {
  assert.deepEqual(failureCategories('FATAL: password authentication failed for secret-user'), ['Database authentication or pooler tenant']);
  assert.deepEqual(failureCategories('x509: certificate signed by unknown authority secret-value'), ['TLS certificate or handshake']);
  assert.deepEqual(failureCategories('dial error: connect ECONNREFUSED secret-value'), ['Network connection or timeout']);
  assert.deepEqual(failureCategories('unexpected error secret-value'), []);
});

test('runner passes only a dry-run to the CLI and suppresses provider errors and secrets', async () => {
  const { mkdtempSync, writeFileSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { spawnSync } = await import('node:child_process');
  const dir = mkdtempSync(join(tmpdir(), 'ayah-dry-run-'));
  const fake = join(dir, 'supabase');
  const url = 'postgresql://postgres:secret-value@db.glhxtsgrhhvtbsnlxgxu.supabase.co:5432/postgres?sslmode=verify-full';
  try {
    writeFileSync(fake, `#!/bin/sh\ncase "$*" in *"?sslmode=verify-full&sslrootcert="*"supabase-prod-ca-2021.crt --skip-vault --dry-run"*) ;; *) exit 2;; esac\nprintf ' • 20261015000100_helpers.sql\\n'\n`, { mode: 0o755 });
    const env = { ...process.env, SUPABASE_CLI_BIN: fake, AYAHSPRING_TEST_DATABASE_URL: `${url}&sslmode=disable`, AYAHSPRING_TEST_DATABASE_PASSWORD: 'secret-value', AYAHSPRING_TEST_DRY_RUN_READY: 'yes' };
    const ok = spawnSync(process.execPath, ['scripts/hosted-migration-dry-run.mjs'], { encoding: 'utf8', env });
    assert.equal(ok.status, 0); assert.match(ok.stdout, /20261015000100_helpers\.sql/);
    assert.ok(!(ok.stdout + ok.stderr).includes('secret-value'));
    writeFileSync(fake, '#!/bin/sh\necho "password authentication failed secret-value" >&2\nexit 1\n', { mode: 0o755 });
    const failed = spawnSync(process.execPath, ['scripts/hosted-migration-dry-run.mjs'], { encoding: 'utf8', env });
    assert.equal(failed.status, 1); assert.match(failed.stderr, /Database authentication or pooler tenant/); assert.ok(!(failed.stdout + failed.stderr).includes('secret-value'));
    const blocked = spawnSync(process.execPath, ['scripts/hosted-migration-dry-run.mjs'], { encoding: 'utf8', env: { ...env, AYAHSPRING_TEST_DRY_RUN_READY: '' } });
    assert.equal(blocked.status, 1); assert.match(blocked.stderr, /Readiness variable equals yes: FAIL/);
    assert.ok(!(blocked.stdout + blocked.stderr).includes('secret-value'));
    const missingPassword = spawnSync(process.execPath, ['scripts/hosted-migration-dry-run.mjs'], { encoding: 'utf8', env: { ...env, AYAHSPRING_TEST_DATABASE_PASSWORD: '' } });
    assert.equal(missingPassword.status, 1); assert.match(missingPassword.stderr, /Separate database password secret present: FAIL/);
    const missing = spawnSync(process.execPath, ['scripts/hosted-migration-dry-run.mjs'], { encoding: 'utf8', env: { ...env, AYAHSPRING_TEST_DATABASE_URL: '' } });
    assert.equal(missing.status, 1); assert.match(missing.stderr, /URL secret present: FAIL/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
