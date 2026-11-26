// The Resend probe against a stand-in for Resend, typed from its documentation
// (https://resend.com/docs/api-reference). What this cannot show is Resend
// itself: that is what the probe is for.
import test from 'node:test';
import assert from 'node:assert/strict';
import { maskAddress, maskText, senderDomain, readDmarc, probe } from './resend-probe.mjs';

const KEY = 're_test_key_never_printed';
const TO = 'owner.person@inbox.example';
const env = (over = {}) => ({ RESEND_API_KEY: KEY, EMAIL_FROM: 'no-reply@ayahspring.example', RESEND_PROBE_TO: TO, ...over });
const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const RECORDS = [
  { record: 'SPF', name: 'send', type: 'MX', status: 'verified', value: 'feedback-smtp.eu-west-1.amazonses.com', priority: 10 },
  { record: 'SPF', name: 'send', type: 'TXT', status: 'verified', value: '"v=spf1 include:amazonses.com ~all"' },
  { record: 'DKIM', name: 'resend._domainkey', type: 'TXT', status: 'verified', value: 'p=MIG...' },
];

// A Resend that answers as the documentation says. `calls` is every request it saw.
function resend({ domains = [{ id: 'd-1', name: 'ayahspring.example', status: 'verified', region: 'eu-west-1' }], records = RECORDS, restricted = false, send = () => json(200, { id: 'email-1' }), events = ['sent', 'delivered'], invalid = false } = {}) {
  const calls = [];
  let asked = 0;
  const fetchImpl = async (url, init) => {
    const path = new URL(url).pathname;
    calls.push({ method: init.method, path, auth: init.headers.authorization, body: init.body ?? null });
    assert.equal(new URL(url).origin, 'https://api.resend.com');
    assert.equal(init.headers.authorization, `Bearer ${KEY}`);
    if (invalid) return json(400, { statusCode: 400, name: 'validation_error', message: 'API key is invalid' });
    if (init.method === 'POST' && path === '/emails') return send(JSON.parse(init.body));
    if (restricted) return json(401, { statusCode: 401, name: 'restricted_api_key', message: 'This API key is restricted to only send emails.' });
    if (path === '/domains') return json(200, { object: 'list', data: domains });
    if (path.startsWith('/domains/')) return json(200, { object: 'domain', ...domains.find((d) => d.id === path.slice(9)), records });
    if (path === '/emails/email-1') { const event = events[Math.min(asked, events.length - 1)]; asked += 1; return json(200, { id: 'email-1', last_event: event }); }
    return json(404, { name: 'not_found', message: 'Not found' });
  };
  return { fetchImpl, calls };
}
const dmarc = async () => [['v=DMARC1; p=none; rua=mailto:dmarc@ayahspring.example']];
const run = (over, service) => probe({ env: env(over), fetchImpl: service.fetchImpl, resolve: dmarc, pause: async () => {}, waits: 3 });
const never = (result) => { const all = result.lines.join('\n'); assert.ok(!all.includes(KEY), 'the key was printed'); assert.ok(!all.includes(TO), 'the address was printed whole'); };

test('an address is said by its first letter and its domain, wherever it appears', () => {
  assert.equal(maskAddress('owner.person@inbox.example'), 'o***@inbox.example');
  assert.equal(maskAddress('nothing'), '***');
  assert.equal(maskText('You can only send testing emails to your own email address (owner.person@inbox.example). To send...'), 'You can only send testing emails to your own email address (o***@inbox.example). To send...');
  assert.equal(maskText('first line\nsecond line'), 'first line');
  assert.equal(maskText('x'.repeat(400)).length, 300);
  assert.equal(senderDomain('no-reply@AyahSpring.com'), 'ayahspring.com');
  assert.equal(senderDomain('AyahSpring <no-reply@mail.ayahspring.com>'), 'mail.ayahspring.com');
  assert.equal(senderDomain('not an address'), null);
});

test('a verified domain and one message that is delivered: ready', async () => {
  const service = resend();
  const result = await run({}, service);
  assert.equal(result.ok, true, result.lines.join('\n')); assert.equal(result.sent, true);
  const all = result.lines.join('\n');
  assert.match(all, /Sender: no-reply@ayahspring\.example\./);
  assert.match(all, /ayahspring\.example: Resend says "verified", region eu-west-1\./);
  assert.match(all, / {2}DKIM TXT resend\._domainkey: verified/);
  assert.match(all, /_dmarc\.ayahspring\.example: one DMARC record, policy "none"\./);
  assert.match(all, /Sent ONE message to o\*\*\*@inbox\.example\. Resend's reference: email-1\./);
  assert.match(all, /Resend says it was delivered to the receiving server/);
  never(result);
  // Exactly one message, to the one address, from the sender, as the application builds it.
  const sends = service.calls.filter((c) => c.method === 'POST');
  assert.equal(sends.length, 1);
  const sent = JSON.parse(sends[0].body);
  assert.deepEqual(sent.to, [TO]); assert.equal(sent.from, 'no-reply@ayahspring.example');
  assert.equal(sent.subject, 'AyahSpring: email is set up');
  assert.match(sent.text, /Nothing else was sent, to you or to anybody\./);
  assert.deepEqual(Object.keys(sent).sort(), ['from', 'subject', 'text', 'to']);
  // Nothing but reads apart from it.
  assert.deepEqual(service.calls.map((c) => `${c.method} ${c.path}`), ['GET /domains', 'GET /domains/d-1', 'POST /emails', 'GET /emails/email-1', 'GET /emails/email-1']);
});

test('without an address to write to, nothing is sent', async () => {
  const service = resend();
  const ready = await run({ RESEND_PROBE_TO: '' }, service);
  assert.equal(ready.ok, true); assert.equal(ready.sent, false);
  assert.match(ready.lines.join('\n'), /no message was sent\.\nReady as far as can be told without sending/);
  assert.ok(service.calls.every((c) => c.method === 'GET'));
  const bad = resend();
  const refused = await run({ RESEND_PROBE_TO: 'not an address' }, bad);
  assert.equal(refused.ok, false); assert.ok(bad.calls.every((c) => c.method === 'GET'));
  // With a key that may only send, and nothing sent, nothing is known, and that is what is said.
  const blind = resend({ restricted: true });
  const unknown = await run({ RESEND_PROBE_TO: '' }, blind);
  assert.equal(unknown.ok, false); assert.match(unknown.lines.join('\n'), /Not known: nothing was sent and the domain could not be read/);
});

test('a domain that is not verified is said record by record, and nothing is sent from it', async () => {
  const records = [{ ...RECORDS[0], status: 'pending' }, RECORDS[1], { ...RECORDS[2], status: 'not_started' }];
  for (const status of ['pending', 'not_started', 'failed', 'temporary_failure']) {
    const service = resend({ domains: [{ id: 'd-1', name: 'ayahspring.example', status }], records });
    const result = await run({}, service);
    assert.equal(result.ok, false); assert.equal(result.sent, false);
    const all = result.lines.join('\n');
    assert.match(all, new RegExp(`Resend says "${status}"`));
    assert.match(all, / {2}SPF MX send: pending/); assert.match(all, / {2}DKIM TXT resend\._domainkey: not_started/);
    assert.match(all, new RegExp(`Not sent: Resend would refuse a message from a domain that is "${status}"`));
    assert.ok(service.calls.every((c) => c.method === 'GET'), 'a message was sent from an unverified domain');
    never(result);
  }
  // A domain the account does not have: the ones it has are named.
  const other = resend({ domains: [{ id: 'd-2', name: 'elsewhere.example', status: 'verified' }] });
  const missing = await run({}, other);
  assert.equal(missing.ok, false);
  assert.match(missing.lines.join('\n'), /ayahspring\.example is not among this account's domains \(elsewhere\.example\)/);
  assert.ok(other.calls.every((c) => c.method === 'GET'));
  const none = await run({}, resend({ domains: [] }));
  assert.match(none.lines.join('\n'), /\(it has none\)/);
});

test('a key that may only send is the right key: the domain is judged by the send', async () => {
  const service = resend({ restricted: true });
  const result = await run({}, service);
  assert.equal(result.ok, true, result.lines.join('\n')); assert.equal(result.sent, true);
  const all = result.lines.join('\n');
  assert.match(all, /This key may only send/);
  assert.match(all, /Sent ONE message to o\*\*\*@inbox\.example/);
  assert.match(all, /This key may not ask what became of it\. Look in the inbox/);
  never(result);
  // …and when Resend refuses the send, its reason is said with the address masked.
  const refusing = resend({ restricted: true, send: () => json(403, { statusCode: 403, name: 'validation_error', message: 'The ayahspring.example domain is not verified. Please, add and verify your domain.' }) });
  const refused = await run({}, refusing);
  assert.equal(refused.ok, false); assert.equal(refused.sent, false);
  assert.match(refused.lines.join('\n'), /Not sent to o\*\*\*@inbox\.example\. Resend answered 403 validation_error: The ayahspring\.example domain is not verified/);
  assert.match(refused.lines.join('\n'), /would have recorded this as "retry", a fault in the set-up and not in the address/);
  assert.equal(refusing.calls.filter((c) => c.method === 'POST').length, 1, 'it was tried more than once');
});

test('a key Resend does not know stops everything before a message', async () => {
  const service = resend({ invalid: true });
  const result = await run({}, service);
  assert.equal(result.ok, false);
  assert.match(result.lines.join('\n'), /Resend refused the key \(400 validation_error\): API key is invalid/);
  assert.deepEqual(service.calls.map((c) => `${c.method} ${c.path}`), ['GET /domains']);
  never(result);
  // No key at all, or a sender that is not an address: the application's own refusal, and no request.
  for (const over of [{ RESEND_API_KEY: '' }, { EMAIL_FROM: 'not an address' }]) {
    const quiet = resend();
    const refused = await run(over, quiet);
    assert.equal(refused.ok, false); assert.match(refused.lines[0], /^Not ready: /); assert.deepEqual(quiet.calls, []);
  }
  // Resend cannot be reached: said without the error's own words.
  const down = await probe({ env: env(), fetchImpl: async () => { throw new Error('connect ECONNREFUSED proxy.internal:3128'); }, resolve: dmarc, pause: async () => {} });
  assert.equal(down.ok, false); assert.match(down.lines.join('\n'), /could not be reached/); assert.doesNotMatch(down.lines.join('\n'), /proxy\.internal/);
});

test('Resend\'s test sender proves the key and is not ready for the application', async () => {
  const service = resend();
  const result = await run({ EMAIL_FROM: 'onboarding@resend.dev' }, service);
  assert.equal(result.ok, false); assert.equal(result.sent, true);
  assert.match(result.lines.join('\n'), /Resend's own test sender/);
  assert.match(result.lines.join('\n'), /Not ready for the application: this proves the key and nothing about a sender domain/);
  assert.deepEqual(service.calls.map((c) => `${c.method} ${c.path}`), ['POST /emails']);
  // Sent to somebody who is not the account's own address: Resend's sentence names that address, and it is masked.
  const other = resend({ send: () => json(403, { statusCode: 403, name: 'validation_error', message: 'You can only send testing emails to your own email address (account.holder@inbox.example). To send emails to other recipients, please verify a domain.' }) });
  const refused = await run({ EMAIL_FROM: 'onboarding@resend.dev' }, other);
  assert.equal(refused.ok, false);
  assert.match(refused.lines.join('\n'), /your own email address \(a\*\*\*@inbox\.example\)/);
  assert.doesNotMatch(refused.lines.join('\n'), /account\.holder/);
});

test('what became of the message is said as Resend says it', async () => {
  const bounced = await run({}, resend({ events: ['sent', 'bounced'] }));
  assert.equal(bounced.ok, false); assert.equal(bounced.sent, true);
  assert.match(bounced.lines.join('\n'), /Resend says the message "bounced"\. The sender is set up; that address did not take it\./);
  const slow = await run({}, resend({ events: ['sent'] }));
  assert.equal(slow.ok, true);
  assert.match(slow.lines.join('\n'), /had not said "delivered" after .* \(last event: sent\)/);
  // A 2xx with no reference is not a delivery, as in the application.
  const empty = await run({}, resend({ send: () => json(200, {}) }));
  assert.equal(empty.ok, false); assert.equal(empty.sent, false);
  assert.match(empty.lines.join('\n'), /would have recorded this as "retry"/);
});

test('the DMARC record is read from public DNS and never decides the outcome', async () => {
  const code = (c) => async () => { throw Object.assign(new Error('x'), { code: c }); };
  assert.match(await readDmarc(code('ENOTFOUND'), 'a.example'), /no DMARC record\. Add a TXT record there starting "v=DMARC1; p=none"/);
  assert.match(await readDmarc(code('ENODATA'), 'a.example'), /no DMARC record/);
  assert.match(await readDmarc(code('ETIMEOUT'), 'a.example'), /could not be looked up from here \(ETIMEOUT\)/);
  assert.match(await readDmarc(async () => [['v=DMARC1; ', 'p=quarantine']], 'a.example'), /policy "quarantine"/);
  assert.match(await readDmarc(async () => [['v=DMARC1; p=none'], ['v=DMARC1; p=reject']], 'a.example'), /2 DMARC records/);
  assert.match(await readDmarc(async () => [['google-site-verification=abc']], 'a.example'), /none of it is a DMARC record/);
  const result = await probe({ env: env(), fetchImpl: resend().fetchImpl, resolve: code('ENOTFOUND'), pause: async () => {}, waits: 3 });
  assert.equal(result.ok, true);
});
