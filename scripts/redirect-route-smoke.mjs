// Local HTTP regression against the actual Next locale route. No hosted services.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { resolve } from 'node:path';

const reservation = createServer();
await new Promise((r) => reservation.listen(0, '127.0.0.1', r));
const port = reservation.address().port;
await new Promise((r) => reservation.close(r));
const root = resolve(import.meta.dirname, '..');
const next = spawn(process.execPath, [resolve(root, 'node_modules/next/dist/bin/next'), 'dev', '-H', '0.0.0.0', '-p', String(port)], {
  cwd: resolve(root, 'web'), detached: true,
  env: { PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: process.env.TMPDIR, NEXT_TELEMETRY_DISABLED: '1', NEXT_PUBLIC_SUPABASE_URL: '', NEXT_PUBLIC_SUPABASE_ANON_KEY: '' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let logs = '';
try {
  await new Promise((ready, reject) => {
    const timer = setTimeout(() => reject(new Error(`Next startup timed out\n${logs}`)), 60000);
    const receive = (chunk) => { logs += chunk.toString(); if (logs.includes('Ready in')) { clearTimeout(timer); ready(); } };
    next.stdout.on('data', receive); next.stderr.on('data', receive);
    next.once('error', (error) => { clearTimeout(timer); reject(error); });
    next.once('exit', (code) => { clearTimeout(timer); reject(new Error(`Next exited ${code}\n${logs}`)); });
  });
  const origin = `http://localhost:${port}`;
  const post = (target) => fetch(`${origin}/api/locale`, {
    method: 'POST', body: new URLSearchParams({ locale: 'en', next: target }),
    redirect: 'manual', signal: AbortSignal.timeout(30000),
  });
  for (const target of ['/\n/evil.example', '/\t/evil.example', '/a/..//evil.example', '/%2e%2e//evil.example', '/\\evil.example', '//evil.example']) {
    const response = await post(target);
    assert.equal(response.status, 303);
    const location = new URL(response.headers.get('location'));
    assert.ok(['localhost', '0.0.0.0'].includes(location.hostname), JSON.stringify(target));
    assert.equal(location.port, String(port));
    assert.equal(`${location.pathname}${location.search}${location.hash}`, '/language');
  }
  const valid = await post('/courses/quran?from=sign-in#lesson');
  assert.equal(valid.status, 303);
  const validLocation = new URL(valid.headers.get('location'));
  assert.ok(['localhost', '0.0.0.0'].includes(validLocation.hostname));
  assert.equal(validLocation.port, String(port));
  assert.equal(`${validLocation.pathname}${validLocation.search}${validLocation.hash}`, '/courses/quran?from=sign-in#lesson');
  assert.match(valid.headers.get('set-cookie') ?? '', /locale/i);
  console.log('Locale redirect HTTP smoke passed: unsafe targets rejected; local path and language cookie preserved.');
} catch (error) { console.error(logs); throw error; }
finally {
  try { process.kill(-next.pid, 'SIGTERM'); } catch { /* already exited */ }
  if (next.exitCode === null) await Promise.race([once(next, 'exit'), new Promise((r) => setTimeout(r, 5000))]);
  try { process.kill(-next.pid, 'SIGKILL'); } catch { /* already exited */ }
}
