import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  handleResendWebhook,
  isResendWebhookConfigured,
  readResendEvent,
  RESEND_WEBHOOK_MAX_BYTES,
  signSvix,
  verifySvix,
  type ProviderEvent,
} from './email/provider-events.ts';

// The example Svix publishes for checking an implementation by hand
// (docs.svix.com, "Verifying Webhooks Manually", read 2026-11-26).
const PUBLISHED = {
  secret: 'whsec_plJ3nmyCDGBKInavdOK15jsl',
  body: '{"event_type":"ping","data":{"success":true}}',
  id: 'msg_loFOjxBNrRLzqYUf',
  timestamp: '1731705121',
  signature: 'v1,rAvfW3dJ/X/qxhsaXPOyyCGmRKsaKWcsNccKXlIktD0=',
};
const AT = Number(PUBLISHED.timestamp);

const SECRET = 'whsec_' + Buffer.from('a test signing secret, 32 bytes!').toString('base64');
const NOW = 1_795_000_000;
function signed(body: string, over: Partial<{ id: string; timestamp: string; secret: string }> = {}) {
  const id = over.id ?? 'msg_test_1';
  const timestamp = over.timestamp ?? String(NOW);
  return { id, timestamp, signature: `v1,${signSvix(over.secret ?? SECRET, id, timestamp, body)}` };
}
const bounced = (type = 'Permanent') => JSON.stringify({
  type: 'email.bounced',
  created_at: '2026-11-22T23:41:12.126Z',
  data: {
    email_id: '56761188-7520-42d8-8898-ff6fc54ce618',
    to: ['somebody@example.com'],
    subject: 'A subject',
    bounce: { message: 'mailbox unavailable', subType: 'General', type },
  },
});

test('the published example verifies, so the signature is computed the way the provider computes it', () => {
  assert.equal(`v1,${signSvix(PUBLISHED.secret, PUBLISHED.id, PUBLISHED.timestamp, PUBLISHED.body)}`, PUBLISHED.signature);
  assert.equal(verifySvix({ ...PUBLISHED, nowSeconds: AT }), 'ok');
  assert.equal(verifySvix({ ...PUBLISHED, nowSeconds: AT + 299 }), 'ok');
});

test('a changed body, id, timestamp or secret does not verify', () => {
  assert.equal(verifySvix({ ...PUBLISHED, body: PUBLISHED.body + ' ', nowSeconds: AT }), 'bad_signature');
  assert.equal(verifySvix({ ...PUBLISHED, id: 'msg_another', nowSeconds: AT }), 'bad_signature');
  assert.equal(verifySvix({ ...PUBLISHED, timestamp: String(AT + 1), nowSeconds: AT }), 'bad_signature');
  assert.equal(verifySvix({ ...PUBLISHED, secret: SECRET, nowSeconds: AT }), 'bad_signature');
  // A parsed and re-written body is not the body that was signed.
  assert.equal(verifySvix({ ...PUBLISHED, body: JSON.stringify(JSON.parse(PUBLISHED.body), null, 1), nowSeconds: AT }), 'bad_signature');
});

test('an old or a future call is refused even with a true signature', () => {
  assert.equal(verifySvix({ ...PUBLISHED, nowSeconds: AT + 301 }), 'stale');
  assert.equal(verifySvix({ ...PUBLISHED, nowSeconds: AT - 301 }), 'stale');
  assert.equal(verifySvix({ ...PUBLISHED, nowSeconds: Number.NaN }), 'stale');
});

test('one true signature among several is enough; another version or none is not', () => {
  const other = 'v1,bm9ldHUjKzFob2VudXRob2VodWUzMjRvdWVvdW9ldQo=';
  assert.equal(verifySvix({ ...PUBLISHED, signature: `${other} ${PUBLISHED.signature}`, nowSeconds: AT }), 'ok');
  assert.equal(verifySvix({ ...PUBLISHED, signature: other, nowSeconds: AT }), 'bad_signature');
  assert.equal(verifySvix({ ...PUBLISHED, signature: PUBLISHED.signature.replace('v1,', 'v2,'), nowSeconds: AT }), 'bad_signature');
  assert.equal(verifySvix({ ...PUBLISHED, signature: PUBLISHED.signature.slice(3), nowSeconds: AT }), 'bad_signature');
});

test('missing or shapeless headers are malformed, and no secret is not configured', () => {
  for (const patch of [{ id: null }, { id: '  ' }, { timestamp: null }, { timestamp: 'yesterday' }, { timestamp: '-5' }, { signature: null }, { signature: '' }, { id: 'x'.repeat(201) }]) {
    assert.equal(verifySvix({ ...PUBLISHED, ...patch, nowSeconds: AT }), 'malformed', JSON.stringify(patch));
  }
  for (const secret of [undefined, '', '   ', 'plJ3nmyCDGBKInavdOK15jsl', 'whsec_', 'whsec_short', 'whsec_not base64!!!!!!!!!!!!!!!!!']) {
    assert.equal(isResendWebhookConfigured(secret), false, String(secret));
    assert.equal(verifySvix({ ...PUBLISHED, secret, nowSeconds: AT }), 'not_configured');
    assert.equal(signSvix(secret ?? '', 'a', '1', 'b'), null);
  }
  assert.equal(isResendWebhookConfigured(` ${PUBLISHED.secret} `), true);
});

test('the events that say what became of a message are read; the address in them is not', () => {
  assert.deepEqual(readResendEvent(bounced()), {
    kind: 'bounced', reference: '56761188-7520-42d8-8898-ff6fc54ce618', permanent: true, occurredAt: '2026-11-22T23:41:12.126Z',
  });
  assert.equal(readResendEvent(bounced('Temporary'))?.permanent, false);
  assert.equal(readResendEvent(bounced('Transient'))?.permanent, false);
  assert.equal(readResendEvent(bounced(' permanent '))?.permanent, true);
  const kinds: Array<[string, ProviderEvent['kind']]> = [
    ['email.delivered', 'delivered'], ['email.delivery_delayed', 'delayed'], ['email.complained', 'complained'],
    ['email.failed', 'failed'], ['email.suppressed', 'failed'],
  ];
  for (const [type, kind] of kinds) {
    // "Permanent" on anything but a bounce means nothing.
    const event = readResendEvent(JSON.stringify({ type, data: { email_id: 'ref-1', bounce: { type: 'Permanent' } } }));
    assert.deepEqual(event, { kind, reference: 'ref-1', permanent: false, occurredAt: null }, type);
  }
  assert.ok(!JSON.stringify(readResendEvent(bounced())).includes('somebody@example.com'));
});

test('everything else the provider can send says nothing the platform keeps', () => {
  for (const type of ['email.sent', 'email.opened', 'email.clicked', 'email.scheduled', 'email.received', 'domain.updated', 'contact.created', 'suppression.added', 'EMAIL.BOUNCED', '']) {
    assert.equal(readResendEvent(JSON.stringify({ type, data: { email_id: 'ref-1' } })), null, type);
  }
  for (const body of ['', 'not json', 'null', '[]', '"email.bounced"', '{"type":"email.bounced"}', '{"type":"email.bounced","data":[]}',
    '{"type":"email.bounced","data":{"email_id":7}}', '{"type":"email.bounced","data":{"email_id":"  "}}',
    JSON.stringify({ type: 'email.bounced', data: { email_id: 'x'.repeat(201) } })]) {
    assert.equal(readResendEvent(body), null, body.slice(0, 60));
  }
  assert.equal(readResendEvent(JSON.stringify({ type: 'email.delivered', created_at: 'some day', data: { email_id: 'r' } }))?.occurredAt, null);
});

test('a verified event is written once with the provider\'s identifier for the event, and the answer says nothing about it', async () => {
  const body = bounced();
  const written: Array<[string, ProviderEvent]> = [];
  const answer = await handleResendWebhook({
    secret: SECRET, headers: signed(body, { id: 'msg_abc' }), body, nowSeconds: NOW,
    record: async (id, event) => { written.push([id, event]); },
  });
  assert.deepEqual(answer, { status: 200, body: { ok: true } });
  assert.equal(written.length, 1);
  assert.equal(written[0]?.[0], 'msg_abc');
  assert.deepEqual(written[0]?.[1], { kind: 'bounced', reference: '56761188-7520-42d8-8898-ff6fc54ce618', permanent: true, occurredAt: '2026-11-22T23:41:12.126Z' });
});

test('nothing is written for a call that is unsigned, forged, stale, too large or not kept', async () => {
  const body = bounced();
  let writes = 0;
  const record = async () => { writes += 1; };
  const good = signed(body);
  const cases: Array<[string, Parameters<typeof handleResendWebhook>[0], number, string | undefined]> = [
    ['no secret', { secret: undefined, headers: good, body, nowSeconds: NOW, record }, 503, 'not_configured'],
    ['no headers', { secret: SECRET, headers: { id: null, timestamp: null, signature: null }, body, nowSeconds: NOW, record }, 401, 'malformed'],
    ['another secret', { secret: SECRET, headers: signed(body, { secret: PUBLISHED.secret }), body, nowSeconds: NOW, record }, 401, 'bad_signature'],
    ['body changed after signing', { secret: SECRET, headers: good, body: body.replace('Permanent', 'Temporary'), nowSeconds: NOW, record }, 401, 'bad_signature'],
    ['replayed an hour later', { secret: SECRET, headers: good, body, nowSeconds: NOW + 3600, record }, 401, 'stale'],
    ['too large', { secret: SECRET, headers: good, body: 'x'.repeat(RESEND_WEBHOOK_MAX_BYTES + 1), nowSeconds: NOW, record }, 413, 'too_large'],
  ];
  for (const [name, call, status, code] of cases) {
    const answer = await handleResendWebhook(call);
    assert.equal(answer.status, status, name);
    assert.equal(answer.body.code, code, name);
    assert.equal(answer.body.ok, false, name);
  }
  // Verified, and not an event the platform keeps: acknowledged so it is not sent again.
  for (const other of [JSON.stringify({ type: 'email.opened', data: { email_id: 'r' } }), 'not json']) {
    const answer = await handleResendWebhook({ secret: SECRET, headers: signed(other), body: other, nowSeconds: NOW, record });
    assert.deepEqual(answer, { status: 200, body: { ok: true } });
  }
  assert.equal(writes, 0);
});

test('a verified event that could not be written is answered 500, so the provider sends it again', async () => {
  const body = bounced();
  const answer = await handleResendWebhook({
    secret: SECRET, headers: signed(body), body, nowSeconds: NOW,
    record: async () => { throw new Error('database away: somebody@example.com'); },
  });
  assert.deepEqual(answer, { status: 500, body: { ok: false, code: 'not_recorded' } });
});

test('the route reads the raw body, verifies before it writes, and never passes an address to the database', () => {
  const route = readFileSync(new URL('../app/api/email/webhook/route.ts', import.meta.url), 'utf8');
  assert.match(route, /await request\.text\(\)/);
  assert.doesNotMatch(route, /request\.json\(/);
  assert.match(route, /handleResendWebhook\(/);
  assert.match(route, /process\.env\.RESEND_WEBHOOK_SECRET/);
  assert.match(route, /rpc\('record_provider_event'/);
  // The service role is reached only inside `record`, which runs after verification.
  assert.ok(route.indexOf('createAdminClient()') > route.indexOf('async record('));
  const args = route.slice(route.indexOf("rpc('record_provider_event'"), route.indexOf('if (error)'));
  assert.deepEqual([...args.matchAll(/\b(p_[a-z_]+):/g)].map((m) => m[1]).sort(),
    ['p_event_id', 'p_kind', 'p_occurred_at', 'p_permanent', 'p_provider', 'p_reference']);
  assert.doesNotMatch(route, /\bto\b\s*:|address|console\./);
  const migration = readFileSync(new URL('../../../supabase/migrations/20261281162000_provider_events.sql', import.meta.url), 'utf8');
  assert.match(migration, /grant execute on function public\.record_provider_event\(text, text, text, text, boolean, timestamptz\) to service_role;/);
  assert.match(migration, /revoke all on function public\.record_provider_event\([^)]*\) from public, anon, authenticated;/);
});
