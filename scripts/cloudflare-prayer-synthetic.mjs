// Local Workers-only test with a synthetic loopback Supabase stand-in.
// Fixed fake credentials and data; never contacts a real Supabase project.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { resolve } from 'node:path';

const encode = (x) => Buffer.from(JSON.stringify(x)).toString('base64url');
const user = { id: '0ca318e2-8b44-4a64-9b58-2af31ab941c7', aud: 'authenticated', role: 'authenticated', email: 'probe@example.invalid', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
const exp = Math.floor(Date.now() / 1000) + 3600;
const token = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: user.id, role: 'authenticated', exp })}.fake`;
const session = { access_token: token, refresh_token: 'fake-refresh', token_type: 'bearer', expires_in: 3600, expires_at: exp, user };
const cookie = `sb-127-auth-token=base64-${encode(session)}`;
let flag = 'off';
let authRequests = 0;
let flagRequests = 0;
const fake = createServer((req, res) => {
  res.setHeader('content-type', 'application/json');
  if (req.url === '/auth/v1/user') {
    authRequests++;
    if (req.headers.authorization !== `Bearer ${token}`) { res.statusCode = 401; res.end('{"message":"not authenticated"}'); return; }
    res.end(JSON.stringify(user)); return;
  }
  if (req.url === '/rest/v1/rpc/setting_bool' && req.method === 'POST') {
    flagRequests++;
    if (req.headers.authorization !== `Bearer ${token}`) { res.statusCode = 401; res.end('{"message":"not authenticated"}'); return; }
    if (flag === 'error') { res.statusCode = 503; res.end('{"message":"simulated outage"}'); return; }
    let body = ''; req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try { res.end(JSON.stringify(JSON.parse(body).p_key === 'companion.calculated_prayer_times' && flag === 'on')); }
      catch { res.statusCode = 400; res.end('{}'); }
    });
    return;
  }
  res.statusCode = 404; res.end('{}');
});
await new Promise((r, reject) => { fake.once('error', reject); fake.listen(34567, '127.0.0.1', r); });
const worker = spawn(resolve('node_modules/.bin/wrangler'), [
  'dev', '--local', '--ip', '127.0.0.1', '--port', '8788',
  '--var', 'NEXT_PUBLIC_SUPABASE_URL:http://127.0.0.1:34567',
  '--var', 'NEXT_PUBLIC_SUPABASE_ANON_KEY:fake-anon',
], {
  cwd: resolve('web'), detached: true,
  env: { PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: process.env.TMPDIR, NEXT_TELEMETRY_DISABLED: '1', WRANGLER_SEND_METRICS: 'false', NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:34567', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'fake-anon' },
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
  const url = 'http://127.0.0.1:8788/companion/prayer-times';
  const request = (headers = {}) => fetch(url, { headers, redirect: 'manual', signal: AbortSignal.timeout(30000) });
  const anonymous = await request();
  assert.equal(anonymous.status, 307);
  const destination = new URL(anonymous.headers.get('location'), url);
  assert.equal(destination.pathname, '/sign-in');
  assert.equal(destination.searchParams.get('next'), '/companion/prayer-times');
  for (const [state, visible] of [['off', false], ['on', true], ['error', false], ['off', false]]) {
    flag = state;
    const response = await request({ cookie });
    const html = await response.text();
    assert.equal(response.status, 200, `flag ${state}`);
    assert.match(response.headers.get('cache-control') || '', /no-store/);
    assert.equal(html.includes('>Calculate today</button>'), visible, `flag ${state}`);
    if (!visible) assert.match(html, /Calculated prayer times are not switched on/);
  }
  assert.ok(authRequests > 0 && flagRequests >= 4, 'the synthetic backend must actually be reached');
  console.log('Synthetic prayer Workers smoke passed: anonymous redirect, setting off/on/outage/off, no-store. No real Auth, RLS, geolocation or hosted runtime was tested.');
} catch (error) { console.error(logs); throw error; }
finally {
  try { process.kill(-worker.pid, 'SIGTERM'); } catch { /* already exited */ }
  if (worker.exitCode === null) await Promise.race([once(worker, 'exit'), new Promise((r) => setTimeout(r, 5000))]);
  try { process.kill(-worker.pid, 'SIGKILL'); } catch { /* already exited */ }
  await new Promise((r) => fake.close(r));
}
