// Every static route, signed in, at a phone's width and a desk's: does the page
// scroll sideways, and does any text or control touch the edge of the screen?
//
// This exists because `.section { padding: 2.5rem 0 }` silently removed the
// side padding of every `container section` page for the life of the project,
// and five separate browser checks passed over it: each asked whether the page
// was as wide as the window, and none asked where the words were.
//
// The backend is synthetic and knows nothing: every table is empty and every
// switch is on. So this sees each page's frame and its empty state — not a
// page full of real rows, not a dynamic route (`[id]`), and not any page that
// redirects away for a signed-in account with no role. Those are counted and
// printed rather than passed off as covered. Chromium only, `next dev`.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

if (!process.env.RESPONSIVE_PLAYWRIGHT || !process.env.RESPONSIVE_CHROME) {
  console.error('edge-sweep needs RESPONSIVE_PLAYWRIGHT and RESPONSIVE_CHROME; it has no browserless mode.');
  process.exit(2);
}
const root = resolve(import.meta.dirname, '..');
const routes = [];
(function walk(dir, url) {
  for (const name of readdirSync(dir).sort()) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      if (name.startsWith('[') || name.startsWith('_') || name === 'api') continue;
      walk(path, name.startsWith('(') ? url : `${url}/${name}`);
    } else if (name === 'page.tsx') routes.push(url || '/');
  }
})(resolve(root, 'web/src/app'), '');
const only = process.argv[2] ? process.argv[2].split(',') : routes;
const widths = (process.env.EDGE_SWEEP_WIDTHS || '320,1440').split(',').map(Number);
// The closest any text or control may come to the side of the screen.
const MIN_GUTTER = 12;
// A dev server that has compiled a hundred routes grows until it is killed, so
// each batch gets a fresh one.
const BATCH = 26;

const encode = (x) => Buffer.from(JSON.stringify(x)).toString('base64url');
const user = { id: '0ca318e2-8b44-4a64-9b58-2af31ab941c7', aud: 'authenticated', role: 'authenticated', email: 'probe@example.invalid', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
const exp = Math.floor(Date.now() / 1000) + 3600;
const token = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: user.id, role: 'authenticated', exp })}.fake`;
const session = { access_token: token, refresh_token: 'fake-refresh', token_type: 'bearer', expires_in: 3600, expires_at: exp, user };
const fake = createServer((req, res) => {
  res.setHeader('content-type', 'application/json');
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-headers', '*');
  if (req.url === '/auth/v1/user') { res.end(JSON.stringify(user)); return; }
  if (req.url.startsWith('/rest/v1/rpc/setting_bool')) { res.end('true'); return; }
  if (req.url.startsWith('/rest/v1/rpc/')) { res.end('[]'); return; }
  if (req.url.startsWith('/rest/v1/')) { res.setHeader('content-range', '*/0'); res.end('[]'); return; }
  res.statusCode = 404; res.end('{}');
});
await new Promise((r) => fake.listen(0, '127.0.0.1', r));
const { chromium } = await import(pathToFileURL(process.env.RESPONSIVE_PLAYWRIGHT).href);

async function startNext() {
  const reservation = createServer(); await new Promise((r) => reservation.listen(0, '127.0.0.1', r));
  const port = reservation.address().port; await new Promise((r) => reservation.close(r));
  const next = spawn(process.execPath, [resolve(root, 'node_modules/next/dist/bin/next'), 'dev', '-H', '0.0.0.0', '-p', String(port)], {
    cwd: resolve(root, 'web'), detached: true,
    env: { PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: process.env.TMPDIR, NEXT_TELEMETRY_DISABLED: '1', NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${fake.address().port}`, NEXT_PUBLIC_SUPABASE_ANON_KEY: 'fake-anon' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let logs = '';
  await new Promise((ready, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Next startup timed out\n${logs}`)), 60000);
    const receive = (chunk) => { logs += chunk.toString(); if (logs.includes('Ready in')) { clearTimeout(timeout); ready(); } };
    next.stdout.on('data', receive); next.stderr.on('data', receive);
    next.once('error', (e) => { clearTimeout(timeout); reject(e); });
    next.once('exit', (code) => { clearTimeout(timeout); reject(new Error(`Next exited ${code}\n${logs}`)); });
  });
  const stop = async () => {
    try { process.kill(-next.pid, 'SIGTERM'); } catch { /* already exited */ }
    if (next.exitCode === null) await Promise.race([once(next, 'exit'), new Promise((r) => setTimeout(r, 5000))]);
    try { process.kill(-next.pid, 'SIGKILL'); } catch { /* already exited */ }
  };
  return { origin: `http://localhost:${port}`, stop };
}

const measure = (page, minGutter) => page.evaluate((least) => {
  const main = document.querySelector('#main');
  if (!main) return { missing: true };
  const width = document.documentElement.clientWidth;
  const name = (el) => `${el.tagName.toLowerCase()}${el.className ? `.${String(el.className).trim().split(/\s+/).join('.')}` : ''} "${(el.textContent || '').trim().slice(0, 30)}"`;
  let widest = null; let nearest = null;
  for (const el of main.querySelectorAll('*')) {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height || getComputedStyle(el).position === 'fixed') continue;
    if (r.right > width + 1 && (!widest || r.right > widest.right)) widest = { right: Math.round(r.right), el: name(el) };
    if (['H1', 'H2', 'H3', 'P', 'A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'LABEL', 'LI', 'TD', 'TH'].includes(el.tagName)) {
      const gap = Math.min(r.left, width - r.right);
      if (gap >= -1 && gap < least && (!nearest || gap < nearest.gap)) nearest = { gap: Math.round(gap), el: name(el) };
    }
  }
  return { width, scroll: document.documentElement.scrollWidth, widest, nearest };
}, minGutter);

const problems = []; const redirected = new Set(); let checked = 0;
const browser = await chromium.launch({ executablePath: process.env.RESPONSIVE_CHROME, headless: true, args: ['--no-sandbox'] });
try {
  for (let start = 0; start < only.length; start += BATCH) {
    const server = await startNext();
    try {
      for (const width of widths) {
        const context = await browser.newContext({ viewport: { width, height: 900 }, locale: 'en' });
        await context.addCookies([{ name: 'sb-127-auth-token', value: `base64-${encode(session)}`, url: server.origin }]);
        const page = await context.newPage();
        for (const route of only.slice(start, start + BATCH)) {
          const response = await page.goto(`${server.origin}${route}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
          await page.waitForTimeout(150);
          const landed = new URL(page.url()).pathname;
          if (landed !== route) redirected.add(`${route} -> ${landed}`);
          const m = await measure(page, MIN_GUTTER);
          checked++;
          const where = `${width}px ${route}${landed !== route ? ` (-> ${landed})` : ''} [${response?.status()}]`;
          if (m.missing) { problems.push(`${where}: no #main`); continue; }
          if (m.scroll > m.width + 1) problems.push(`${where}: scrolls sideways, ${m.scroll} > ${m.width}, widest ${m.widest?.el}`);
          if (m.nearest) problems.push(`${where}: ${m.nearest.gap}px from the edge: ${m.nearest.el}`);
        }
        await context.close();
      }
    } finally { await server.stop(); }
    console.log(`Swept ${Math.min(start + BATCH, only.length)} of ${only.length} routes at ${widths.join('/')}px`);
  }
} finally {
  await browser.close();
  await new Promise((r) => fake.close(r));
}
if (redirected.size) console.log(`${redirected.size} route(s) redirected for this account, so the page measured was the destination:\n  ${[...redirected].join('\n  ')}`);
assert.deepEqual(problems, [], `${problems.length} layout problem(s)`);
console.log(`Edge sweep passed: ${only.length} static routes, ${checked} page loads at ${widths.join('/')}px, none scrolling sideways and nothing within ${MIN_GUTTER}px of the edge. Empty synthetic backend, static routes only, Chromium, next dev.`);
