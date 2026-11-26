// The real Next route /api/email/webhook and the page /admin/connections,
// against a stand-in for Supabase's HTTP surface. It shows that the route, as
// Next serves it, reads the raw body, refuses what is not signed, and calls
// record_provider_event with the service role and exactly six arguments, none
// of them an address. It is not real Resend, not real PostgREST and not the
// database function's own rules (supabase/tests/provider_events.test.mjs).
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHmac } from 'node:crypto';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { resolve } from 'node:path';

const SERVICE = 'synthetic-service-role-key';
const SECRET = 'whsec_' + Buffer.from('a synthetic signing secret 32 b!').toString('base64');
const sign = (id, ts, body) => 'v1,' + createHmac('sha256', Buffer.from(SECRET.slice(6), 'base64')).update(`${id}.${ts}.${body}`).digest('base64');

const calls = [];
let answer = () => [200, { state: 'recorded', kind: 'bounced' }];
const fake = createServer(async (req, res) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const call = { method: req.method, path: req.url.split('?')[0], key: req.headers.apikey, authorization: req.headers.authorization, body: Buffer.concat(chunks).toString('utf8') };
  calls.push(call);
  if (call.path === '/rest/v1/rpc/record_provider_event') {
    const [status, body] = answer();
    res.writeHead(status, { 'content-type': 'application/json' });
    res.end(JSON.stringify(body));
    return;
  }
  res.writeHead(401, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ message: 'no session' }));
});
await new Promise((r) => fake.listen(0, '127.0.0.1', r));
const root = resolve(import.meta.dirname, '..');

async function boot(extra) {
  const reservation = createServer(); await new Promise((r) => reservation.listen(0, '127.0.0.1', r));
  const port = reservation.address().port; await new Promise((r) => reservation.close(r));
  const next = spawn(process.execPath, [resolve(root, 'node_modules/next/dist/bin/next'), 'dev', '-H', '127.0.0.1', '-p', String(port)], {
    cwd: resolve(root, 'web'), detached: true,
    env: { PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: process.env.TMPDIR, NEXT_TELEMETRY_DISABLED: '1',
      NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${fake.address().port}`, NEXT_PUBLIC_SUPABASE_ANON_KEY: 'fake-anon', ...extra },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const seen = { logs: '' };
  next.stdout.on('data', (d) => { seen.logs += d; });
  next.stderr.on('data', (d) => { seen.logs += d; });
  const origin = `http://127.0.0.1:${port}`;
  const started = Date.now();
  for (;;) {
    if (next.exitCode !== null) throw new Error('next exited\n' + seen.logs.slice(-2000));
    try { await fetch(origin + '/api/health', { signal: AbortSignal.timeout(2000) }); break; } catch { /* not up yet */ }
    if (Date.now() - started > 120_000) throw new Error('next did not start\n' + seen.logs.slice(-2000));
    await new Promise((r) => setTimeout(r, 500));
  }
  return {
    origin, seen,
    async stop() {
      try { process.kill(-next.pid, 'SIGTERM'); } catch { /* already exited */ }
      if (next.exitCode === null) await Promise.race([once(next, 'exit'), new Promise((r) => setTimeout(r, 5000))]);
      try { process.kill(-next.pid, 'SIGKILL'); } catch { /* already exited */ }
    },
  };
}

const post = (origin, body, headers = {}) => fetch(origin + '/api/email/webhook', { method: 'POST', body, headers: { 'content-type': 'application/json', ...headers }, signal: AbortSignal.timeout(120_000) });
const recorded = () => calls.filter((c) => c.path === '/rest/v1/rpc/record_provider_event');
// Deliberately not canonical JSON: the spacing must survive to the signature check.
const BODY = '{ "type":"email.bounced",\n  "created_at":"2026-11-22T23:41:12.126Z", "data":{"email_id":"56761188-7520-42d8-8898-ff6fc54ce618","to":["synthetic-reader@example.com"],"bounce":{"type":"Permanent","message":"mailbox unavailable"}} }';
const now = () => String(Math.floor(Date.now() / 1000));

let site = await boot({});
try {
  // 1. No signing secret: the route exists and reads nothing.
  const ts = now();
  const unset = await post(site.origin, BODY, { 'svix-id': 'msg_1', 'svix-timestamp': ts, 'svix-signature': sign('msg_1', ts, BODY) });
  assert.equal(unset.status, 503);
  assert.deepEqual(await unset.json(), { ok: false, code: 'not_configured' });
  assert.equal(unset.headers.get('cache-control'), 'no-store');
  assert.equal(recorded().length, 0);
  // The owner's page sends a visitor with no session to sign in, and shows nothing.
  const page = await fetch(site.origin + '/admin/connections', { redirect: 'manual', signal: AbortSignal.timeout(120_000) });
  assert.ok([302, 303, 307].includes(page.status), `status ${page.status}`);
  assert.match(page.headers.get('location') ?? '', /\/sign-in\?next=(\/|%2F)admin(\/|%2F)connections/);
  const html = await page.text();
  assert.ok(!html.includes('RESEND_API_KEY') && !html.includes('Still to set'));
} catch (e) { console.error(site.seen.logs.slice(-3000)); throw e; } finally { await site.stop(); }

site = await boot({ RESEND_WEBHOOK_SECRET: SECRET, SUPABASE_SERVICE_ROLE_KEY: SERVICE });
try {
  // 2. Unsigned, forged, changed after signing, and replayed: refused, nothing recorded.
  const ts = now();
  const good = { 'svix-id': 'msg_2', 'svix-timestamp': ts, 'svix-signature': sign('msg_2', ts, BODY) };
  for (const [what, body, headers, code] of [
    ['no headers', BODY, {}, 'malformed'],
    ['a made-up signature', BODY, { ...good, 'svix-signature': 'v1,' + Buffer.alloc(32, 7).toString('base64') }, 'bad_signature'],
    ['the body re-written as canonical JSON', JSON.stringify(JSON.parse(BODY)), good, 'bad_signature'],
    ['an hour old', BODY, { 'svix-id': 'msg_2', 'svix-timestamp': String(Number(ts) - 3600), 'svix-signature': sign('msg_2', String(Number(ts) - 3600), BODY) }, 'stale'],
  ]) {
    const refused = await post(site.origin, body, headers);
    assert.equal(refused.status, 401, what);
    assert.deepEqual(await refused.json(), { ok: false, code }, what);
  }
  assert.equal(recorded().length, 0, 'a refused call reached the database');

  // 3. A true call: recorded once, by the service role, with six arguments and no address.
  const taken = await post(site.origin, BODY, good);
  assert.equal(taken.status, 200);
  assert.deepEqual(await taken.json(), { ok: true });
  assert.equal(recorded().length, 1);
  const call = recorded()[0];
  assert.equal(call.method, 'POST');
  assert.equal(call.key, SERVICE);
  assert.equal(call.authorization, `Bearer ${SERVICE}`);
  assert.deepEqual(JSON.parse(call.body), {
    p_provider: 'resend', p_event_id: 'msg_2', p_kind: 'bounced', p_reference: '56761188-7520-42d8-8898-ff6fc54ce618',
    p_permanent: true, p_occurred_at: '2026-11-22T23:41:12.126Z',
  });
  assert.ok(!call.body.includes('synthetic-reader@example.com') && !call.body.includes('mailbox unavailable'));

  // 4. A verified event the platform does not keep: acknowledged, not recorded.
  const opened = '{"type":"email.opened","data":{"email_id":"56761188-7520-42d8-8898-ff6fc54ce618"}}';
  const ts2 = now();
  const ignored = await post(site.origin, opened, { 'svix-id': 'msg_3', 'svix-timestamp': ts2, 'svix-signature': sign('msg_3', ts2, opened) });
  assert.equal(ignored.status, 200);
  assert.equal(recorded().length, 1);

  // 5. The database refuses: 500, so the provider sends it again; the database's words are not passed on.
  answer = () => [500, { code: 'XX000', message: 'SYNTHETIC-DATABASE words', details: null, hint: null }];
  const ts3 = now();
  const failed = await post(site.origin, BODY, { 'svix-id': 'msg_4', 'svix-timestamp': ts3, 'svix-signature': sign('msg_4', ts3, BODY) });
  assert.equal(failed.status, 500);
  const text = await failed.text();
  assert.deepEqual(JSON.parse(text), { ok: false, code: 'not_recorded' });
  assert.ok(!text.includes('SYNTHETIC'));

  // 6. Only POST.
  const get = await fetch(site.origin + '/api/email/webhook', { signal: AbortSignal.timeout(60_000) });
  assert.equal(get.status, 405);
  // Nothing in the server's log names the reader or the secret.
  assert.ok(!site.seen.logs.includes('synthetic-reader@example.com') && !site.seen.logs.includes(SECRET) && !site.seen.logs.includes(SERVICE));
  console.log('Email webhook HTTP smoke passed. Not real Resend, PostgREST or the database function; every identifier and address in it is invented.');
} catch (e) { console.error(site.seen.logs.slice(-3000)); throw e; } finally {
  await site.stop();
  await new Promise((r) => fake.close(r));
}
