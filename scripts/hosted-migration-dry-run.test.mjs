import test from 'node:test';
import assert from 'node:assert/strict';
import { isTestDatabaseUrl, extractMigrationNames } from './hosted-migration-dry-run.mjs';

test('only the explicitly named test project, port and verified TLS are accepted', () => {
  const direct = 'postgresql://postgres:dummy@db.glhxtsgrhhvtbsnlxgxu.supabase.co:5432/postgres?sslmode=verify-full';
  const pool = 'postgresql://postgres.glhxtsgrhhvtbsnlxgxu:dummy@aws-1-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=verify-full';
  assert.ok(isTestDatabaseUrl(direct)); assert.ok(isTestDatabaseUrl(pool));
  for (const url of ['', direct.replace('glhxtsgrhhvtbsnlxgxu','other'), pool.replace('postgres.glhxtsgrhhvtbsnlxgxu','postgres.other'), pool.replace('pooler.supabase.com','pooler.supabase.com.evil.test'), pool.replace(':5432/',':6543/'), pool.replace('verify-full','disable'), pool.replace('verify-full','require'), pool + '&sslmode=disable', pool.replace('/postgres?', '/other?'), pool.replace(':dummy@','@')]) assert.equal(isTestDatabaseUrl(url), false);
});

test('only safe migration names are displayed, never arbitrary CLI output', () => {
  assert.deepEqual(extractMigrationNames('Would push these migrations:\n • 20261015000100_helpers.sql\nsecret@host\n • 20261281135000_calculated_prayer_times.sql\n • not_a_file\n'), ['20261015000100_helpers.sql', '20261281135000_calculated_prayer_times.sql']);
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
    writeFileSync(fake, `#!/bin/sh\ncase "$*" in *"--skip-vault --dry-run"*) ;; *) exit 2;; esac\nprintf ' • 20261015000100_helpers.sql\\n'\n`, { mode: 0o755 });
    const env = { ...process.env, SUPABASE_CLI_BIN: fake, AYAHSPRING_TEST_DATABASE_URL: url, AYAHSPRING_TEST_DRY_RUN_READY: 'yes' };
    const ok = spawnSync(process.execPath, ['scripts/hosted-migration-dry-run.mjs'], { encoding: 'utf8', env });
    assert.equal(ok.status, 0); assert.match(ok.stdout, /20261015000100_helpers\.sql/);
    assert.ok(!(ok.stdout + ok.stderr).includes('secret-value'));
    writeFileSync(fake, '#!/bin/sh\necho "secret-value" >&2\nexit 1\n', { mode: 0o755 });
    const failed = spawnSync(process.execPath, ['scripts/hosted-migration-dry-run.mjs'], { encoding: 'utf8', env });
    assert.equal(failed.status, 1); assert.ok(!(failed.stdout + failed.stderr).includes('secret-value'));
    const blocked = spawnSync(process.execPath, ['scripts/hosted-migration-dry-run.mjs'], { encoding: 'utf8', env: { ...env, AYAHSPRING_TEST_DRY_RUN_READY: '' } });
    assert.equal(blocked.status, 1); assert.match(blocked.stderr, /Readiness variable equals yes: FAIL/);
    assert.ok(!(blocked.stdout + blocked.stderr).includes('secret-value'));
    const badUrl = spawnSync(process.execPath, ['scripts/hosted-migration-dry-run.mjs'], { encoding: 'utf8', env: { ...env, AYAHSPRING_TEST_DATABASE_URL: url.replace('verify-full', 'require') } });
    assert.equal(badUrl.status, 1); assert.match(badUrl.stderr, /Only option is sslmode=verify-full: FAIL/);
    assert.ok(!(badUrl.stdout + badUrl.stderr).includes('secret-value'));
    const missing = spawnSync(process.execPath, ['scripts/hosted-migration-dry-run.mjs'], { encoding: 'utf8', env: { ...env, AYAHSPRING_TEST_DATABASE_URL: '' } });
    assert.equal(missing.status, 1); assert.match(missing.stderr, /URL secret present: FAIL/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
