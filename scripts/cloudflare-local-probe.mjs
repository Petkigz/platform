// Executed only inside an isolated, credential-free copy in the GitHub probe.
// This never deploys; it starts Wrangler's local Workers runtime on loopback.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { resolve } from 'node:path';

const port = 8788;
const worker = spawn(resolve('node_modules/.bin/wrangler'), ['dev', '--local', '--ip', '127.0.0.1', '--port', String(port)], {
  cwd: resolve('web'), detached: true,
  env: { PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: process.env.TMPDIR, NEXT_TELEMETRY_DISABLED: '1', WRANGLER_SEND_METRICS: 'false', NEXT_PUBLIC_ALLOW_MISSING_SUPABASE: '1', NEXT_PUBLIC_SUPABASE_URL: '', NEXT_PUBLIC_SUPABASE_ANON_KEY: '' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let logs = '';
try {
  await new Promise((ready, reject) => {
    const timer = setTimeout(() => reject(new Error(`Local Workers startup timed out\n${logs}`)), 120000);
    const receive = (chunk) => { logs += chunk.toString(); if (/Ready on/i.test(logs)) { clearTimeout(timer); ready(); } };
    worker.stdout.on('data', receive); worker.stderr.on('data', receive);
    worker.once('error', (error) => { clearTimeout(timer); reject(error); });
    worker.once('exit', (code) => { clearTimeout(timer); reject(new Error(`Local Workers exited ${code}\n${logs}`)); });
  });
  const origin = `http://127.0.0.1:${port}`;
  const home = await fetch(origin, { signal: AbortSignal.timeout(30000), redirect: 'manual' });
  assert.equal(home.status, 200, 'home should respond');
  assert.match(await home.text(), /AyahSpring/i);
  const response = await fetch(`${origin}/api/locale`, {
    method: 'POST', body: new URLSearchParams({ locale: 'en', next: '/\n/evil.example' }),
    redirect: 'manual', signal: AbortSignal.timeout(30000),
  });
  assert.equal(response.status, 303);
  const location = new URL(response.headers.get('location'), origin);
  assert.equal(location.origin, origin);
  assert.equal(location.pathname, '/language');
  console.log('Local Workers smoke passed: homepage and unsafe locale redirect. No Supabase, RLS or hosted runtime was tested.');
} catch (error) { console.error(logs); throw error; }
finally {
  try { process.kill(-worker.pid, 'SIGTERM'); } catch { /* already exited */ }
  if (worker.exitCode === null) await Promise.race([once(worker, 'exit'), new Promise((r) => setTimeout(r, 5000))]);
  try { process.kill(-worker.pid, 'SIGKILL'); } catch { /* already exited */ }
}
