// Local-only Workers gate test. No real secrets or external services.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { resolve } from 'node:path';

const password = 'a'.repeat(44); // synthetic, never use this for deployment
const authorization = `Basic ${btoa(`preview:${password}`)}`;
const origin = 'http://127.0.0.1:8788';
async function run(configured) {
  const args = ['dev', '--local', '--ip', '127.0.0.1', '--port', '8788'];
  if (configured) args.push('--var', `PREVIEW_PASSWORD:${password}`);
  const child = spawn(resolve('node_modules/.bin/wrangler'), args, {
    cwd: resolve('web'), detached: true,
    env: { PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: process.env.TMPDIR, WRANGLER_SEND_METRICS: 'false', NEXT_TELEMETRY_DISABLED: '1', NEXT_PUBLIC_ALLOW_MISSING_SUPABASE: '1', NEXT_PUBLIC_SUPABASE_URL: '', NEXT_PUBLIC_SUPABASE_ANON_KEY: '' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let logs = '';
  try {
    await new Promise((ready, reject) => {
      const timer = setTimeout(() => reject(new Error(`Preview Worker startup timed out\n${logs}`)), 120000);
      const receive = (chunk) => { logs += chunk.toString(); if (/Ready on/i.test(logs)) { clearTimeout(timer); ready(); } };
      child.stdout.on('data', receive); child.stderr.on('data', receive);
      child.once('error', (e) => { clearTimeout(timer); reject(e); });
      child.once('exit', (code) => { clearTimeout(timer); reject(new Error(`Preview Worker exited ${code}\n${logs}`)); });
    });
    const get = (path, headers = {}) => fetch(`${origin}${path}`, { headers, redirect: 'manual', signal: AbortSignal.timeout(30000) });
    if (!configured) {
      const r = await get('/', { authorization });
      assert.equal(r.status, 503, 'missing password must fail closed');
      assert.match(r.headers.get('cache-control') || '', /no-store/);
      return;
    }
    for (const path of ['/', '/_next/static/not-a-real-file.js']) {
      const r = await get(path);
      assert.equal(r.status, 401, `unauthenticated ${path}`);
      assert.match(r.headers.get('www-authenticate') || '', /^Basic /);
      assert.match(r.headers.get('cache-control') || '', /no-store/);
    }
    const invalid = await get('/', { authorization: `Basic ${btoa(`preview:${'b'.repeat(44)}`)}` });
    assert.equal(invalid.status, 401);
    const home = await get('/', { authorization });
    assert.equal(home.status, 200); assert.match(home.headers.get('cache-control') || '', /no-store/);
    const html = await home.text(); assert.match(html, /AyahSpring/i);
    assert.match(html, /PRIVATE TEST PREVIEW/);
    assert.match(html, /no real accounts or data/);
    const asset = html.match(/(?:src|href)="(\/_next\/static\/[^"?#]+\.(?:js|css))[^" ]*"/)?.[1];
    assert.ok(asset, 'home must reference a built asset');
    assert.equal((await get(asset)).status, 401, 'actual asset must not bypass gate');
    const allowedAsset = await get(asset, { authorization });
    assert.equal(allowedAsset.status, 200); assert.ok((await allowedAsset.arrayBuffer()).byteLength > 0);
    assert.match(allowedAsset.headers.get('cache-control') || '', /no-store/);
  } catch (error) { console.error(logs); throw error; }
  finally {
    try { process.kill(-child.pid, 'SIGTERM'); } catch { /* already exited */ }
    if (child.exitCode === null) await Promise.race([once(child, 'exit'), new Promise((r) => setTimeout(r, 5000))]);
    try { process.kill(-child.pid, 'SIGKILL'); } catch { /* already exited */ }
  }
}
await run(false);
await run(true);
console.log('Data-free local Workers gate smoke passed. This is not production Auth or Cloudflare Access.');
