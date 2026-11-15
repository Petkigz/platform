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
  const html = await home.text();
  assert.match(html, /AyahSpring/i);
  // Exercise an actual emitted Next asset through Workers' static binding.
  const assetPath = html.match(/(?:src|href)="(\/_next\/static\/[^"?#]+\.(?:js|css))[^" ]*"/)?.[1];
  assert.ok(assetPath, 'home should reference a Next static asset');
  const asset = await fetch(new URL(assetPath, origin), { signal: AbortSignal.timeout(30000) });
  assert.equal(asset.status, 200, 'referenced static asset should load');
  assert.ok((await asset.arrayBuffer()).byteLength > 0, 'static asset should not be empty');
  // With no Supabase configuration, private screens must not render their content.
  for (const path of ['/admin', '/learn', '/companion/prayer-times']) {
    const result = await fetch(`${origin}${path}`, { signal: AbortSignal.timeout(30000), redirect: 'manual' });
    assert.equal(result.status, 307, `${path} should redirect when unconfigured`);
    assert.equal(new URL(result.headers.get('location'), origin).pathname, '/', path);
  }
  const flags = await fetch(`${origin}/api/admin/flags`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ key: 'companion.calculated_prayer_times', enabled: true }),
    signal: AbortSignal.timeout(30000),
  });
  assert.equal(flags.status, 503, 'unconfigured admin flag write must fail closed');
  assert.equal((await flags.json()).ok, false);
  const response = await fetch(`${origin}/api/locale`, {
    method: 'POST', body: new URLSearchParams({ locale: 'en', next: '/\n/evil.example' }),
    redirect: 'manual', signal: AbortSignal.timeout(30000),
  });
  assert.equal(response.status, 303);
  const location = new URL(response.headers.get('location'), origin);
  // Wrangler may expose the loopback listener as localhost inside the Worker.
  assert.equal(location.protocol, 'http:');
  assert.ok(['127.0.0.1', 'localhost'].includes(location.hostname));
  assert.equal(location.port, String(port));
  assert.equal(location.pathname, '/language');
  console.log('Local Workers smoke passed: homepage, static asset, unconfigured private routes and flag write, and unsafe locale redirect. No Supabase, RLS or hosted runtime was tested.');
} catch (error) { console.error(logs); throw error; }
finally {
  try { process.kill(-worker.pid, 'SIGTERM'); } catch { /* already exited */ }
  if (worker.exitCode === null) await Promise.race([once(worker, 'exit'), new Promise((r) => setTimeout(r, 5000))]);
  try { process.kill(-worker.pid, 'SIGKILL'); } catch { /* already exited */ }
}
