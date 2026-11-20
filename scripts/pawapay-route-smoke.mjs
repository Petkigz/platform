// The real Next checkout route, buy page and payment webhook with pawaPay's
// adapter switched on, against an entirely synthetic loopback server that
// plays Auth, the database's REST API and pawaPay at once.
//
// **Nothing here is pawaPay.** (The adapter has met pawaPay's sandbox, through
// scripts/pawapay-sandbox-probe.mjs; this script has not, and no callback
// from pawaPay has ever been received.) The stand-in answers the way pawaPay's published documentation
// (https://docs.pawapay.io/v2, read 2026-11-19) says pawaPay answers, typed
// here by hand. So this shows that the routes do what that documentation
// asks, and what they do when an answer is not what they expect. It does not
// show that pawaPay behaves as documented, that a handset is prompted, or
// that any money moves. It is not evidence about hosted Supabase, JWT
// validation, RLS or the order rules either: the stand-in writes nothing.
//
// What it does show:
//
//   - the buy page offers an operator by its own name in its own country, and
//     only for a price it can collect;
//   - checkout sends pawaPay the order's amount, the number as dialled from
//     abroad, the operator's code and the order (twice), records the attempt
//     under the operator the payer chose, and gives the payer the id pawaPay
//     holds;
//   - a refusal reaches the payer as this platform's sentence, with none of
//     pawaPay's words and no phone number, and an answer that never came is
//     asked about once instead of being called a failure;
//   - a total with a fraction is not sent to an operator that takes none;
//   - where an operator has an account of its own and pawaPay reaches it
//     too, the payer sees one button, the direct account is tried first, and
//     pawaPay is tried only when the direct account is certain it started
//     nothing. After an answer that leaves that in doubt, nobody is prompted
//     a second time;
//   - M-Pesa in Kenya has a road of its own, Safaricom's (a stand-in here
//     too: nothing has ever been sent to Safaricom). Its status answer names
//     no order and no amount, so the order travels in the address Safaricom
//     is told to call, under a code only this server can make. A callback at
//     any other address is ignored without Safaricom being asked anything;
//   - a sponsor's pledge is paid through the same route: the page of pledges
//     links to a pay page only for a pledge that can be paid for exactly its
//     amount, the pay page says one thing about any pledge it cannot pay, and
//     the route sends the database the pledge's id and nothing else;
//   - the webhook believes no notification: it asks pawaPay with the token,
//     and settles an order only when pawaPay's own record names that order
//     and the amount is the order's total. A forged success, a real payment
//     presented for another order, a wrong amount, a payment still in
//     progress and pawaPay being down each settle nothing.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
const user = { id: '0ca318e2-8b44-4a64-9b58-2af31ab941c7', aud: 'authenticated', role: 'authenticated', email: 'probe@example.invalid', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
const exp = Math.floor(Date.now() / 1000) + 3600;
const token = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: user.id, role: 'authenticated', exp })}.fake`;
const session = { access_token: token, refresh_token: 'fake-refresh', token_type: 'bearer', expires_in: 3600, expires_at: exp, user };
const cookie = `sb-127-auth-token=base64-${encode(session)}`;
const SERVICE = 'synthetic-service-role-key';
const PAWAPAY_TOKEN = 'synthetic-pawapay-token';

const COURSE = '11111111-1111-4111-8111-111111111111';
const VERSION = '55555555-5555-4555-8555-555555555555';
const OWN = '66666666-6666-4666-8666-666666666666';
const ORDER = '77777777-7777-4777-8777-777777777777';
const OTHER_ORDER = '99999999-9999-4999-8999-999999999999';
const PHONE = '254712345678';
// What pawaPay says beside a refusal. It quotes the number, and must reach no reader and no reply.
const PAWAPAY_SENTENCE = `SYNTHETIC-PAWAPAY The phone number '${PHONE}' seems to be invalid for the provider 'MPESA_KEN'.`;

const own = { id: OWN, display_name: 'Synthetic learner', learner_type: 'adult' };
const kenya = { hasLivePrice: true, resolved: true, priceId: 'price-ke', amountMinor: '125000', currencyCode: 'KES', billingInterval: 'one_time', market: 'KE', matched: 'country', country: 'KE', countrySource: 'request' };
const uganda = { hasLivePrice: true, resolved: true, priceId: 'price-ug', amountMinor: '50000', currencyCode: 'UGX', billingInterval: 'one_time', market: 'UG', matched: 'country', country: 'UG', countrySource: 'request' };

const fresh = () => ({
  price: kenya,
  orderRow: { orderId: ORDER, amountMinor: '125000', currencyCode: 'KES' },
  // The orders the database holds, by id.
  orders: new Map([[ORDER, { total_minor: '125000', currency_code: 'KES' }], [OTHER_ORDER, { total_minor: '900000', currency_code: 'KES' }]]),
  // The events the webhook has written.
  events: [],
  // What pawaPay answers to a new deposit: 'accept', 'reject', 'forbid', or 'drop'
  // (500 with the deposit taken all the same), 'lose' (500 and nothing taken).
  initiate: 'accept',
  // What pawaPay holds, by deposit id; and whether it answers at all.
  deposits: new Map(),
  pawapayDown: false,
  // The synthetic MTN, addressed the way MTN's API is: what it answers to a
  // sign-in and to a request to pay.
  mtnToken: 200, mtn: 202,
  // The synthetic Safaricom: what it answers to a sign-in and to a request
  // for a prompt, and how each prompt it issued ended ('paid', 'processing',
  // or a result code).
  darajaToken: 200, stk: 'accept', prompts: new Map(),
  // Sponsoring: the two switches, what the sponsor's board holds, and what
  // the database answers to "let me pay this pledge" ('ok' or [status, body]).
  checkout: true, sponsoring: true, pledges: [], pledgeOrder: 'ok', boardBroken: false,
  // The staff desk: whether the caller is finance, what the desk lists, and
  // the audit lines for payments that opened no seat (or that they cannot be read).
  staff: false, desk: { enabled: true, waiting: [], seats: [], counts: { waiting: 0, approved: 0, funded: 0, declined: 0, pledged: 0, paid: 0 } }, late: [], lateBroken: false,
  // The attempts the database holds.
  attempts: [],
});
let state = fresh();

/** A deposit as pawaPay's status endpoint writes one back. */
const held = (depositId, over = {}) => ({
  depositId, status: 'COMPLETED', amount: '1250.00', currency: 'KES', country: 'KEN',
  payer: { type: 'MMO', accountDetails: { phoneNumber: PHONE, provider: 'MPESA_KEN' } },
  customerMessage: 'AyahSpring course', clientReferenceId: ORDER, created: '2026-11-19T08:17:01Z',
  providerTransactionId: 'SLK4X9P2QA', metadata: { orderId: ORDER }, ...over,
});

const calls = [];
const pawapay = [];
const mtn = [];
const daraja = [];
let prompts = 0;
const fake = createServer(async (req, res) => {
  res.setHeader('content-type', 'application/json');
  let body = ''; for await (const chunk of req) body += chunk;
  const send = (value, status = 200) => { res.writeHead(status); res.end(JSON.stringify(value)); };

  // ---------------------------------------------------- the synthetic MTN
  if (req.url === '/collection/token/') {
    mtn.push({ path: 'token' });
    if (state.mtnToken === 200) send({ access_token: 'synthetic-mtn-token', expires_in: 1 }); else send({ message: 'SYNTHETIC-MTN access denied' }, state.mtnToken);
    return;
  }
  if (req.url === '/collection/v1_0/requesttopay') {
    mtn.push({ path: 'requesttopay', reference: req.headers['x-reference-id'], payload: JSON.parse(body) });
    res.writeHead(state.mtn); res.end(state.mtn === 202 ? '' : JSON.stringify({ message: `SYNTHETIC-MTN fault for ${PHONE}` })); return;
  }

  // ----------------------------------------------- the synthetic Safaricom
  if (req.url?.startsWith('/oauth/v1/generate')) {
    daraja.push({ path: 'token', basic: req.headers.authorization });
    if (state.darajaToken === 200) send({ access_token: 'synthetic-daraja-token', expires_in: '1' }); else send({ errorCode: '400.008.01', errorMessage: 'SYNTHETIC-DARAJA invalid credentials' }, state.darajaToken);
    return;
  }
  if (req.url === '/mpesa/stkpush/v1/processrequest') {
    daraja.push({ path: 'push', raw: body, payload: JSON.parse(body), bearer: req.headers.authorization });
    if (state.stk === 'accept') { prompts += 1; const id = `ws_CO_SYNTHETIC_${prompts}`; state.prompts.set(id, 'processing'); send({ MerchantRequestID: `29115-${prompts}`, CheckoutRequestID: id, ResponseCode: '0', ResponseDescription: 'Success. Request accepted for processing', CustomerMessage: 'Success. Request accepted for processing' }); }
    else send({ requestId: 'x', errorCode: `${state.stk}.002.02`, errorMessage: `SYNTHETIC-DARAJA fault for ${PHONE}` }, state.stk);
    return;
  }
  if (req.url === '/mpesa/stkpushquery/v1/query') {
    const asked = JSON.parse(body);
    daraja.push({ path: 'query', payload: asked });
    const ended = state.prompts.get(asked.CheckoutRequestID);
    if (ended === undefined) send({ requestId: 'x', errorCode: '404.001.04', errorMessage: 'SYNTHETIC-DARAJA no such request' }, 404);
    else if (ended === 'processing') send({ requestId: asked.CheckoutRequestID, errorCode: '500.001.1001', errorMessage: 'The transaction is being processed' }, 500);
    else send({ ResponseCode: '0', ResponseDescription: 'The service request has been accepted successsfully', MerchantRequestID: '29115-1', CheckoutRequestID: asked.CheckoutRequestID, ResultCode: ended === 'paid' ? '0' : ended, ResultDesc: `SYNTHETIC-DARAJA ${PHONE}` });
    return;
  }

  // ------------------------------------------------ the synthetic pawaPay
  if (req.url?.startsWith('/v2/')) {
    const authorised = req.headers.authorization === `Bearer ${PAWAPAY_TOKEN}`;
    pawapay.push({ method: req.method, path: req.url, authorised, payload: body ? JSON.parse(body) : null });
    if (!authorised) { send({ status: 'REJECTED', failureReason: { failureCode: 'AUTHENTICATION_ERROR', failureMessage: PAWAPAY_SENTENCE } }, 403); return; }
    if (state.pawapayDown) { send({ failureReason: { failureCode: 'UNKNOWN_ERROR', failureMessage: PAWAPAY_SENTENCE } }, 500); return; }
    if (req.method === 'POST' && req.url === '/v2/deposits') {
      const sent = JSON.parse(body);
      const take = () => state.deposits.set(sent.depositId, held(sent.depositId, { status: 'ACCEPTED', amount: sent.amount, currency: sent.currency, clientReferenceId: sent.clientReferenceId, metadata: Object.assign({}, ...sent.metadata), providerTransactionId: undefined }));
      if (state.initiate === 'accept') { take(); send({ depositId: sent.depositId, status: 'ACCEPTED', created: '2026-11-19T08:17:01Z', nextStep: 'FINAL_STATUS' }); }
      else if (state.initiate === 'reject') send({ depositId: sent.depositId, status: 'REJECTED', failureReason: { failureCode: 'INVALID_PHONE_NUMBER', failureMessage: PAWAPAY_SENTENCE } });
      else if (state.initiate === 'forbid') send({ failureReason: { failureCode: 'DEPOSITS_NOT_ALLOWED', failureMessage: PAWAPAY_SENTENCE } }, 403);
      else if (state.initiate === 'drop') { take(); send({ failureReason: { failureCode: 'UNKNOWN_ERROR', failureMessage: PAWAPAY_SENTENCE } }, 500); }
      else send({ failureReason: { failureCode: 'UNKNOWN_ERROR', failureMessage: PAWAPAY_SENTENCE } }, 500);
      return;
    }
    const match = /^\/v2\/deposits\/([0-9a-f-]{36})$/.exec(req.url ?? '');
    if (req.method === 'GET' && match) {
      const deposit = state.deposits.get(match[1]);
      send(deposit ? { status: 'FOUND', data: deposit } : { status: 'NOT_FOUND' });
      return;
    }
    send({ failureReason: { failureCode: 'INVALID_INPUT' } }, 400); return;
  }

  // ---------------------------------------------------------------- Auth
  if (req.url === '/auth/v1/user') {
    if (req.headers.authorization !== `Bearer ${token}`) { res.writeHead(401); res.end('{"message":"not authenticated"}'); return; }
    res.end(JSON.stringify(user)); return;
  }

  // ------------------------------------------------------------ the database
  const role = req.headers.authorization === `Bearer ${SERVICE}` ? 'service' : req.headers.authorization === `Bearer ${token}` ? 'user' : null;
  if (!req.url?.startsWith('/rest/v1/') || !role) { res.writeHead(401); res.end('{}'); return; }
  const url = new URL(req.url, 'http://localhost');
  const path = url.pathname;
  const payload = body ? JSON.parse(body) : null;
  calls.push({ method: req.method, path, payload, query: url.search, role });
  const one = String(req.headers.accept ?? '').includes('vnd.pgrst.object');
  const q = (name) => url.searchParams.get(name);
  // The tables only the service role may touch: a signed-in payer must never be the one writing them.
  const serviceOnly = ['/rest/v1/orders', '/rest/v1/payment_provider_events', '/rest/v1/rpc/record_payment_success'];
  if (serviceOnly.includes(path) && role !== 'service') { send({ code: '42501', message: 'permission denied' }, 403); return; }

  if (path === '/rest/v1/rpc/setting_bool') send(payload.p_key === 'commerce.checkout' && state.checkout);
  else if (path === '/rest/v1/rpc/my_sponsorships') { if (state.boardBroken) send({ code: '57014', message: 'SYNTHETIC-DATABASE canceling statement' }, 500); else send({ enabled: state.sponsoring, sponsorships: state.pledges }); }
  else if (path === '/rest/v1/rpc/my_sponsorship_applications') send({ enabled: state.sponsoring, applications: [] });
  else if (path === '/rest/v1/rpc/create_sponsorship_order') {
    if (state.pledgeOrder === 'ok') { const pledge = state.pledges.find((x) => x.id === payload.p_sponsorship); send({ orderId: ORDER, amountMinor: pledge.amountMinor, currencyCode: pledge.currencyCode, changed: true }); }
    else send(state.pledgeOrder[1], state.pledgeOrder[0]);
  }
  else if (path === '/rest/v1/courses') send(q('slug') === 'eq.reading' ? [{ id: COURSE, slug: 'reading', title: 'Synthetic reading course', status: 'active', deleted_at: null }] : []);
  else if (path === '/rest/v1/course_versions') send([{ id: VERSION, version_number: 1 }]);
  else if (path === '/rest/v1/learner_profiles') send(q('linked_user_id') ? [{ id: OWN }] : [own]);
  else if (path === '/rest/v1/rpc/can_access_course_version') send(false);
  else if (path === '/rest/v1/rpc/course_price_for_me') send(state.price);
  else if (path === '/rest/v1/rpc/withdrawal_offer') send(null);
  else if (path === '/rest/v1/rpc/create_course_order') send(state.orderRow);
  else if (path === '/rest/v1/billing_account_memberships') send([{ billing_account_id: 'billing-1' }]);
  else if (path === '/rest/v1/rpc/notification_badge') send(0);
  else if (path === '/rest/v1/rpc/has_role') send(state.staff && payload.p_role_code === 'finance_admin');
  else if (path === '/rest/v1/rpc/sponsorship_overview') send(state.desk);
  else if (path === '/rest/v1/governance_audit_events') {
    if (state.lateBroken) send({ code: '57014', message: 'SYNTHETIC-DATABASE canceling statement due to statement timeout' }, 500);
    else send(state.late);
  }
  else if (path === '/rest/v1/payment_attempts') {
    if (req.method === 'GET') send(state.attempts.map((a) => ({ id: a.id })));
    else if (req.method === 'POST') { const row = { id: `attempt-${state.attempts.length + 1}`, ...payload }; state.attempts.push(row); send(one ? { id: row.id } : [{ id: row.id }], 201); }
    else send([]);
  } else if (path === '/rest/v1/orders') {
    const row = state.orders.get((q('id') ?? '').replace(/^eq\./, ''));
    if (one) { if (row) send(row); else send({ code: 'PGRST116', message: 'no rows' }, 406); } else send(row ? [row] : []);
  } else if (path === '/rest/v1/payment_provider_events') {
    if (req.method === 'GET') {
      const provider = (q('provider') ?? '').replace(/^eq\./, ''); const id = (q('provider_event_id') ?? '').replace(/^eq\./, '');
      send(state.events.filter((e) => e.provider === provider && e.provider_event_id === id).map((e) => ({ id: e.id, processing_status: e.processing_status })));
    } else if (req.method === 'POST') {
      const row = { id: randomUUID(), ...payload };
      state.events.push(row);
      send(one ? { id: row.id } : [{ id: row.id }], 201);
    } else send([]);
  } else if (path === '/rest/v1/rpc/record_payment_success') {
    const event = state.events.find((e) => e.id === payload.p_event_id);
    if (event) event.processing_status = 'processed';
    send({ id: payload.p_order_id, status: 'paid' });
  } else { res.writeHead(404); res.end('{}'); }
});
await new Promise((r) => fake.listen(0, '127.0.0.1', r));
const reservation = createServer(); await new Promise((r) => reservation.listen(0, '127.0.0.1', r));
const port = reservation.address().port; await new Promise((r) => reservation.close(r));
const root = resolve(import.meta.dirname, '..');
const here = `http://127.0.0.1:${fake.address().port}`;
const next = spawn(process.execPath, [resolve(root, 'node_modules/next/dist/bin/next'), 'dev', '-H', '0.0.0.0', '-p', String(port)], {
  cwd: resolve(root, 'web'), detached: true,
  env: {
    PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: process.env.TMPDIR, NEXT_TELEMETRY_DISABLED: '1',
    NEXT_PUBLIC_SUPABASE_URL: here, NEXT_PUBLIC_SUPABASE_ANON_KEY: 'fake-anon', SUPABASE_SERVICE_ROLE_KEY: SERVICE,
    // pawaPay's address is this script. Three operators are said to be enabled on the account.
    PAWAPAY_API_TOKEN: PAWAPAY_TOKEN, PAWAPAY_BASE_URL: here, PAWAPAY_PROVIDERS: 'MPESA_KEN, MTN_MOMO_UGA, AIRTEL_OAPI_UGA',
    // And MTN has an account of its own in Uganda, whose address is this script too.
    MTN_MOMO_UG_SUBSCRIPTION_KEY: 'synthetic-mtn', MTN_MOMO_UG_API_USER: 'synthetic-mtn', MTN_MOMO_UG_API_KEY: 'synthetic-mtn', MTN_MOMO_UG_BASE_URL: here,
    // And M-Pesa has a road of its own in Kenya, whose address is this script as well.
    MPESA_KE_CONSUMER_KEY: 'synthetic-daraja-key', MPESA_KE_CONSUMER_SECRET: 'synthetic-daraja-secret', MPESA_KE_SHORTCODE: '174379', MPESA_KE_PASSKEY: 'synthetic-daraja-passkey',
    MPESA_KE_BASE_URL: here, MPESA_KE_CALLBACK_URL: `http://127.0.0.1:${port}/api/payments/webhook/mpesa_ke`,
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let logs = '';
try {
  await new Promise((resolveReady, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Next startup timed out\n${logs}`)), 60000);
    const receive = (chunk) => { logs += chunk.toString(); if (logs.includes('Ready in')) { clearTimeout(timeout); resolveReady(); } };
    next.stdout.on('data', receive); next.stderr.on('data', receive);
    next.once('error', (e) => { clearTimeout(timeout); reject(e); });
    next.once('exit', (code) => { clearTimeout(timeout); reject(new Error(`Next exited ${code}\n${logs}`)); });
  });
  const origin = `http://localhost:${port}`;
  const inner = (html) => html.slice(html.indexOf('<main'), html.indexOf('</main>')).replace(/<script[\s\S]*?<\/script>/g, '').replaceAll('<!-- -->', '');
  const page = async (country) => {
    const response = await fetch(`${origin}/courses/reading/buy`, { headers: { cookie, 'accept-language': 'en', 'x-vercel-ip-country': country }, redirect: 'manual', signal: AbortSignal.timeout(90000) });
    assert.equal(response.status, 200, logs.slice(-2000));
    return inner(await response.text());
  };
  // No reply may carry pawaPay's own words or the payer's number.
  const clean = (text, label) => { for (const word of ['SYNTHETIC-PAWAPAY', 'SYNTHETIC-MTN', 'SYNTHETIC-DARAJA', 'SYNTHETIC-DATABASE', 'synthetic-daraja', PHONE, 'seems to be invalid', PAWAPAY_TOKEN, SERVICE]) assert.ok(!text.includes(word), `${label} says "${word}"`); };
  const checkout = async (body, country = 'KE') => {
    const response = await fetch(`${origin}/api/checkout`, { method: 'POST', headers: { 'content-type': 'application/json', cookie, 'x-vercel-ip-country': country }, body: JSON.stringify(body), signal: AbortSignal.timeout(90000) });
    const text = await response.text();
    clean(text, 'a checkout reply');
    return { status: response.status, json: JSON.parse(text) };
  };
  const hook = async (body, id = 'pawapay') => {
    // `id` is a provider's id, or a whole path and query (M-Pesa's callbacks have one each).
    const response = await fetch(id.startsWith('/') ? `${origin}${id}` : `${origin}/api/payments/webhook/${id}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: typeof body === 'string' ? body : JSON.stringify(body), signal: AbortSignal.timeout(90000) });
    const text = await response.text();
    clean(text, 'a webhook reply');
    return { status: response.status, json: JSON.parse(text), retry: response.headers.get('retry-after') };
  };
  const written = (path, method) => calls.filter((c) => c.path === path && (!method || c.method === method));
  const settled = () => written('/rest/v1/rpc/record_payment_success');
  const order = { courseId: COURSE, learnerProfileId: OWN, provider: 'pawapay_mpesa_ke' };

  // ============================================================ the buy page
  {
    // A course priced in Kenyan shillings, for a buyer in Kenya: one operator, named as Kenya's.
    const ke = await page('KE');
    assert.ok(ke.includes('<label for="msisdn" class="eyebrow">Mobile money number</label>'), 'the page asks for no number');
    assert.match(ke, /A number written without a country code is read as a number of this country: <bdi>Kenya<\/bdi>\. Its code: <bdi dir="ltr">\+254<\/bdi>\./);
    for (const word of ['pawaPay', 'pawapay', 'No payment provider', 'No payment service', 'Uganda', '+256']) assert.ok(!ke.includes(word), `the Kenyan page says "${word}"`);
    // In Ugandan shillings: two operators to choose between, each by its own
    // name. MTN has an account of its own in Uganda and pawaPay reaches MTN
    // there too: one button, the direct account's.
    state.price = uganda;
    const ug = await page('UG');
    for (const piece of ['value="mtn_momo_ug"', 'value="pawapay_airtel_ug"', 'MTN MoMo', 'Airtel Money', '<bdi>Uganda</bdi>']) assert.ok(ug.includes(piece), `the Ugandan page lacks ${piece}`);
    for (const word of ['pawaPay', 'M-Pesa', 'Kenya', 'value="pawapay_mtn_ug"']) assert.ok(!ug.includes(word), `the Ugandan page says "${word}"`);
    assert.equal(ug.split('MTN MoMo').length - 1, 1, 'MTN is offered twice');
    // A price with cents: M-Pesa in Kenya collects whole shillings, so it is not offered, and no number is asked for.
    state.price = { ...kenya, amountMinor: '125050' };
    const cents = await page('KE');
    assert.ok(!cents.includes('id="msisdn"'), 'an operator is offered a price it would have to round');
    assert.ok(cents.includes('No payment service connected to this platform collects the currency this course is priced in here'), 'the page with nothing to pay through says nothing');
    state = fresh();
  }
  console.log('Buy page with a synthetic pawaPay: M-Pesa is offered for a price in Kenyan shillings as Kenya’s (+254); MTN MoMo and Airtel Money for Ugandan shillings, to choose between, MTN once although it can be reached two ways; the word pawaPay is on neither; a price with cents is not offered an operator that collects whole shillings.');

  // =============================================================== checkout
  {
    calls.length = 0; pawapay.length = 0;
    // A number typed the way Kenya writes one.
    let answer = await checkout({ ...order, msisdn: '0712 345678' });
    assert.equal(answer.status, 200, JSON.stringify(answer.json));
    assert.deepEqual(Object.keys(answer.json).sort(), ['kind', 'orderId', 'providerReference']);
    assert.equal(answer.json.kind, 'pending'); assert.equal(answer.json.orderId, ORDER);
    assert.equal(pawapay.length, 1);
    const sent = pawapay[0];
    assert.equal(sent.method, 'POST'); assert.equal(sent.path, '/v2/deposits'); assert.equal(sent.authorised, true, 'pawaPay was not sent the token');
    // The id the payer is given is the one pawaPay holds, and it is a UUIDv4.
    assert.match(sent.payload.depositId, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    assert.equal(answer.json.providerReference, sent.payload.depositId);
    assert.deepEqual(sent.payload, {
      depositId: sent.payload.depositId,
      payer: { type: 'MMO', accountDetails: { phoneNumber: PHONE, provider: 'MPESA_KEN' } },
      amount: '1250', currency: 'KES',
      clientReferenceId: ORDER, customerMessage: 'AyahSpring course', metadata: [{ orderId: ORDER }],
    });
    // The attempt is recorded under the operator the payer chose, before pawaPay is called.
    const attempts = written('/rest/v1/payment_attempts', 'POST');
    assert.equal(attempts.length, 1);
    assert.deepEqual(attempts[0].payload, { order_id: ORDER, amount_minor: '125000', currency_code: 'KES', provider: 'pawapay_mpesa_ke', method: 'mobile_money', status: 'pending', idempotency_key: `${ORDER}:1` });
    assert.equal(attempts[0].role, 'user');

    // A number that is not Kenya's is refused before anything is written or sent.
    calls.length = 0; pawapay.length = 0;
    for (const [typed, why] of [['+256772123456', 'other_country'], ['12', 'length'], ['', 'empty']]) {
      const refused = await checkout({ ...order, msisdn: typed });
      assert.equal(refused.status, 400, typed); assert.equal(refused.json.reason, 'phone_invalid', typed); assert.equal(refused.json.phone.why, why, typed);
    }
    assert.equal(written('/rest/v1/rpc/create_course_order').length, 0, 'a refused number wrote an order');
    assert.equal(pawapay.length, 0, 'a refused number reached pawaPay');

    // The callback's provider is not one anybody can pay through, and neither is an operator the account was not given.
    for (const provider of ['pawapay', 'pawapay_mpesa_tz', 'pawapay_orange_sn']) {
      const refused = await checkout({ ...order, provider, msisdn: '+254712345678' });
      assert.equal(refused.status, 503, provider); assert.equal(refused.json.reason, 'provider_unavailable', provider);
    }
    assert.equal(pawapay.length, 0);

    // pawaPay says no, three ways: the payer is told in this platform's words, with the order named.
    for (const how of ['reject', 'forbid', 'lose']) {
      state.initiate = how; pawapay.length = 0;
      const refused = await checkout({ ...order, msisdn: '+254712345678' });
      assert.equal(refused.status, 502, how); assert.equal(refused.json.reason, 'provider_failed', how); assert.equal(refused.json.orderId, ORDER, how);
      assert.equal(refused.json.error, 'The payment provider could not start this payment. Try again.', how);
      // A definite no is not asked about; an answer that never came is, once.
      assert.deepEqual(pawapay.map((c) => c.method), how === 'lose' ? ['POST', 'GET'] : ['POST'], how);
    }
    // No answer, and pawaPay took it all the same: the payer may be looking at a prompt, so this is not "try again".
    state.initiate = 'drop'; pawapay.length = 0;
    answer = await checkout({ ...order, msisdn: '+254712345678' });
    assert.equal(answer.status, 200, JSON.stringify(answer.json)); assert.equal(answer.json.kind, 'pending');
    assert.deepEqual(pawapay.map((c) => c.method), ['POST', 'GET']);
    assert.equal(pawapay[1].path, `/v2/deposits/${answer.json.providerReference}`);
    state.initiate = 'accept';

    // A discount left a fraction: whole shillings only, so the order is saved and nobody is prompted for a rounded amount.
    state.orderRow = { orderId: ORDER, amountMinor: '112550', currencyCode: 'KES' }; pawapay.length = 0;
    answer = await checkout({ ...order, msisdn: '+254712345678' });
    assert.equal(answer.status, 503); assert.equal(answer.json.reason, 'provider_unavailable'); assert.equal(answer.json.orderId, ORDER);
    assert.equal(pawapay.length, 0, 'an amount with a fraction was sent to an operator that takes none');
    // An order in another currency than the operator's.
    state.orderRow = { orderId: ORDER, amountMinor: '50000', currencyCode: 'UGX' };
    answer = await checkout({ ...order, msisdn: '+254712345678' });
    assert.equal(answer.status, 503); assert.equal(pawapay.length, 0);
    state = fresh();
  }
  console.log('Checkout with a synthetic pawaPay: a number typed Kenya’s way is sent as 254…, with the operator’s code, 1250 for 1,250.00 shillings and the order twice; the attempt is recorded under pawapay_mpesa_ke; three numbers that are not Kenya’s and three providers nobody can pay through refused with nothing sent; three refusals by pawaPay said in this platform’s words with none of pawaPay’s and no number; an answer that never came asked about once and, where pawaPay holds the deposit, treated as started; a total with a fraction and an order in another currency not sent at all.');

  // ====================================================== both roads to MTN
  // MTN in Uganda has an account of its own, and pawaPay reaches MTN in
  // Uganda too. The owner keeps both, "in case one fails".
  {
    const ugandan = () => { state = fresh(); state.price = uganda; state.orderRow = { orderId: ORDER, amountMinor: '50000', currencyCode: 'UGX' }; state.orders.set(ORDER, { total_minor: '50000', currency_code: 'UGX' }); calls.length = 0; pawapay.length = 0; mtn.length = 0; };
    const pay = () => checkout({ courseId: COURSE, learnerProfileId: OWN, provider: 'mtn_momo_ug', msisdn: '0772 123456' }, 'UG');
    const attempted = () => state.attempts.map((a) => [a.provider, a.idempotency_key]);
    const UG_PHONE = '256772123456';

    // MTN's own account cannot be signed in to: nothing was asked of MTN about
    // this payment, so pawaPay is asked instead, for the same wallet.
    ugandan(); state.mtnToken = 401;
    let answer = await pay();
    assert.equal(answer.status, 200, JSON.stringify(answer.json)); assert.equal(answer.json.kind, 'pending');
    assert.deepEqual(mtn.map((c) => c.path), ['token'], 'a payment was asked of MTN without signing in');
    assert.equal(pawapay.length, 1);
    assert.deepEqual(pawapay[0].payload.payer, { type: 'MMO', accountDetails: { phoneNumber: UG_PHONE, provider: 'MTN_MOMO_UGA' } });
    assert.equal(pawapay[0].payload.amount, '50000'); assert.equal(pawapay[0].payload.currency, 'UGX'); assert.equal(pawapay[0].payload.clientReferenceId, ORDER);
    // The payer is given the id pawaPay holds, and both attempts are on record, in order.
    assert.equal(answer.json.providerReference, pawapay[0].payload.depositId);
    assert.deepEqual(attempted(), [['mtn_momo_ug', `${ORDER}:1`], ['pawapay_mtn_ug', `${ORDER}:2`]]);
    // ...and when pawaPay says that deposit completed, the order is settled by it.
    const through = pawapay[0].payload.depositId;
    state.deposits.set(through, { ...state.deposits.get(through), status: 'COMPLETED', amount: '50000.00', providerTransactionId: 'MTNUG1' });
    const settledBy = await hook({ depositId: through, status: 'COMPLETED', amount: '50000', currency: 'UGX', metadata: { orderId: ORDER } });
    assert.deepEqual(settledBy.json, { status: 'processed', orderId: ORDER });
    assert.deepEqual(settled().map((c) => [c.payload.p_order_id, c.payload.p_provider, c.payload.p_reference]), [[ORDER, 'pawapay', through]]);

    // MTN signs in and refuses the request outright: the same.
    ugandan(); state.mtn = 403;
    answer = await pay();
    assert.equal(answer.status, 200, JSON.stringify(answer.json));
    assert.deepEqual(mtn.map((c) => c.path).filter((path) => path === 'requesttopay').length, 1);
    assert.equal(pawapay.length, 1); assert.equal(pawapay[0].payload.payer.accountDetails.provider, 'MTN_MOMO_UGA');
    assert.deepEqual(attempted().map((a) => a[0]), ['mtn_momo_ug', 'pawapay_mtn_ug']);

    // MTN took the request and answered 500, or says it already has one: the
    // handset may have been prompted. Nobody is prompted a second time; the
    // payer is told it could not be started and decides for themselves.
    for (const status of [500, 503, 409]) {
      ugandan(); state.mtn = status;
      answer = await pay();
      assert.equal(answer.status, 502, String(status)); assert.equal(answer.json.reason, 'provider_failed', String(status)); assert.equal(answer.json.orderId, ORDER);
      assert.equal(pawapay.length, 0, `after ${status} from MTN a second prompt was asked for`);
      assert.deepEqual(attempted().map((a) => a[0]), ['mtn_momo_ug'], String(status));
    }

    // MTN works: it is the one used, and pawaPay hears nothing.
    ugandan();
    answer = await pay();
    assert.equal(answer.status, 200); assert.equal(answer.json.kind, 'pending');
    const asked = mtn.filter((c) => c.path === 'requesttopay');
    assert.equal(asked.length, 1); assert.equal(answer.json.providerReference, asked[0].reference);
    assert.deepEqual(asked[0].payload.payer, { partyIdType: 'MSISDN', partyId: UG_PHONE });
    assert.equal(pawapay.length, 0, 'pawaPay was asked although MTN started the payment');
    assert.deepEqual(attempted().map((a) => a[0]), ['mtn_momo_ug']);

    // Both say no: the payer is told once, in this platform's words.
    ugandan(); state.mtn = 403; state.initiate = 'reject';
    answer = await pay();
    assert.equal(answer.status, 502); assert.equal(answer.json.reason, 'provider_failed'); assert.equal(answer.json.orderId, ORDER);
    assert.equal(answer.json.error, 'The payment provider could not start this payment. Try again.');
    assert.deepEqual(attempted().map((a) => a[0]), ['mtn_momo_ug', 'pawapay_mtn_ug']);

    // Airtel in Uganda is reached through pawaPay alone here: it has nothing behind it.
    ugandan(); state.initiate = 'forbid';
    answer = await checkout({ courseId: COURSE, learnerProfileId: OWN, provider: 'pawapay_airtel_ug', msisdn: '0752 123456' }, 'UG');
    assert.equal(answer.status, 502);
    assert.equal(mtn.length, 0); assert.deepEqual(attempted().map((a) => a[0]), ['pawapay_airtel_ug']);
    state = fresh();
  }
  console.log('Both roads to one wallet, synthetic MTN and synthetic pawaPay: when MTN’s own account cannot be signed in to, or refuses outright, the same wallet is asked through pawaPay, both attempts are recorded in order, and pawaPay’s confirmation settles the order; after 500, 503 or 409 from MTN, which leave it in doubt whether the handset was prompted, nobody is prompted a second time; when MTN works pawaPay hears nothing; when both refuse the payer is told once; an operator reached through pawaPay alone has nothing behind it.');

  // ======================================================== M-Pesa, direct
  // Safaricom's own road to M-Pesa in Kenya. Nothing here is Safaricom.
  {
    const kenyan = () => { state = fresh(); calls.length = 0; pawapay.length = 0; daraja.length = 0; };
    const pay = () => checkout({ courseId: COURSE, learnerProfileId: OWN, provider: 'mpesa_ke', msisdn: '0712 345678' });
    const pushes = () => daraja.filter((c) => c.path === 'push');
    const queries = () => daraja.filter((c) => c.path === 'query');
    // The callback Safaricom sends, to the address it was given: the path and query, on this script's Next.
    const callbackTo = (address, result = 0, id) => hook({ Body: { stkCallback: { MerchantRequestID: '29115-1', CheckoutRequestID: id, ResultCode: result, ResultDesc: 'SYNTHETIC-DARAJA', CallbackMetadata: { Item: [{ Name: 'Amount', Value: 1 }, { Name: 'MpesaReceiptNumber', Value: 'SLK4X9P2QA' }, { Name: 'PhoneNumber', Value: Number(PHONE) }] } } } }, address);
    const pathOf = (address) => { const u = new URL(address); return `${u.pathname}${u.search}`; };

    // The buy page offers M-Pesa once in Kenya, although it can now be reached two ways.
    const ke = await page('KE');
    assert.ok(ke.includes('id="msisdn"') && !ke.includes('pawapay') && !ke.includes('Pay with'), 'M-Pesa in Kenya is offered twice, or not at all');

    // Starting: a prompt for whole shillings, to the number as 2547…, with an address of its own.
    kenyan();
    let answer = await pay();
    assert.equal(answer.status, 200, JSON.stringify(answer.json)); assert.equal(answer.json.kind, 'pending');
    assert.equal(pushes().length, 1);
    const push = pushes()[0];
    assert.equal(daraja[0].basic, `Basic ${Buffer.from('synthetic-daraja-key:synthetic-daraja-secret').toString('base64')}`);
    assert.equal(push.bearer, 'Bearer synthetic-daraja-token');
    assert.match(push.raw, /"Amount":1250,/);
    assert.match(push.payload.Timestamp, /^\d{14}$/);
    assert.equal(push.payload.Password, Buffer.from(`174379synthetic-daraja-passkey${push.payload.Timestamp}`).toString('base64'));
    const { CallBackURL, Password: _password, Timestamp: _timestamp, ...asked } = push.payload;
    assert.deepEqual(asked, { BusinessShortCode: '174379', TransactionType: 'CustomerPayBillOnline', Amount: 1250, PartyA: PHONE, PartyB: '174379', PhoneNumber: PHONE, AccountReference: 'AyahSpring', TransactionDesc: 'Course' });
    assert.match(CallBackURL, new RegExp(`^http://127\\.0\\.0\\.1:${port}/api/payments/webhook/mpesa_ke\\?o=${ORDER}&n=[0-9a-f]{32}&s=[A-Za-z0-9_-]{43}$`));
    // The payer is given Safaricom's id for the prompt, and nothing of the address.
    const prompt = answer.json.providerReference;
    assert.match(prompt, /^ws_CO_SYNTHETIC_\d+$/);
    assert.ok(!JSON.stringify(answer.json).includes('&s='), 'the callback address was sent to the payer');
    assert.deepEqual(state.attempts.map((a) => a.provider), ['mpesa_ke']);
    assert.equal(pawapay.length, 0);

    // A callback anywhere but the address Safaricom was given is ignored, and Safaricom is not asked.
    daraja.length = 0;
    const forged = new URL(CallBackURL); forged.searchParams.set('o', OTHER_ORDER);
    const shortened = new URL(CallBackURL); shortened.searchParams.set('s', shortened.searchParams.get('s').slice(0, -2));
    for (const [label, address] of [['the bare address', 'mpesa_ke'], ['the address with another order in it', pathOf(forged.toString())], ['a code cut short', pathOf(shortened.toString())], ['the pawaPay address', 'pawapay']]) {
      answer = await callbackTo(address, 0, prompt);
      assert.equal(answer.status, 200, label); assert.equal(answer.json.status, 'ignored', label);
    }
    assert.equal(daraja.length, 0, 'Safaricom was asked about a callback at an address this platform did not make');
    assert.equal(state.events.length, 0); assert.equal(settled().length, 0);

    // At the right address, and the payer has not answered yet: nothing is settled and nothing is closed.
    answer = await callbackTo(pathOf(CallBackURL), 0, prompt);
    assert.equal(answer.status, 503); assert.equal(answer.json.status, 'still_pending');
    assert.deepEqual(queries().map((c) => c.payload.CheckoutRequestID), [prompt]);
    assert.equal(state.events.length, 0); assert.equal(settled().length, 0);

    // At the right address, saying "paid", for a prompt Safaricom never issued: nothing.
    answer = await callbackTo(pathOf(CallBackURL), 0, 'ws_CO_NEVER_ISSUED');
    assert.equal(answer.status, 503); assert.equal(answer.json.status, 'unverified');
    assert.equal(settled().length, 0);

    // Paid. The order is settled once, under Safaricom's own id, at the order's own total.
    state.prompts.set(prompt, 'paid'); calls.length = 0;
    answer = await callbackTo(pathOf(CallBackURL), 0, prompt);
    assert.deepEqual(answer.json, { status: 'processed', orderId: ORDER });
    assert.equal(state.events.length, 1);
    const event = state.events[0];
    assert.equal(event.provider, 'mpesa_ke'); assert.equal(event.provider_event_id, prompt); assert.equal(event.signature_verified, true);
    assert.equal(event.payload.confirmed_by, 'authenticated status query');
    // Safaricom's answer has no amount, and the record says the total came from the order.
    assert.equal(event.payload.amount_from, 'order');
    assert.deepEqual(event.payload.status_query, { state: 'succeeded', providerReference: prompt, amount: null, financialTransactionId: null, orderId: ORDER });
    assert.deepEqual(settled().map((c) => c.payload), [{ p_actor_id: null, p_order_id: ORDER, p_provider: 'mpesa_ke', p_reference: prompt, p_event_id: event.id, p_evidence: null }]);
    const closed = written('/rest/v1/payment_attempts', 'PATCH');
    assert.equal(closed.length, 1); assert.equal(closed[0].payload.status, 'succeeded'); assert.equal(closed[0].payload.provider_reference, prompt);
    // Sent again: applied once.
    answer = await callbackTo(pathOf(CallBackURL), 0, prompt);
    assert.deepEqual(answer.json, { status: 'duplicate' }); assert.equal(settled().length, 1);

    // A callback that says "paid" for a prompt the payer cancelled is corrected by Safaricom's answer.
    kenyan();
    answer = await pay();
    const second = pushes()[0].payload.CallBackURL; const cancelled = answer.json.providerReference;
    state.prompts.set(cancelled, '1032'); calls.length = 0;
    answer = await callbackTo(pathOf(second), 0, cancelled);
    assert.deepEqual(answer.json, { status: 'recorded', kind: 'payment.failed' });
    assert.equal(settled().length, 0, 'a cancelled prompt settled an order');
    const failed = written('/rest/v1/payment_attempts', 'PATCH');
    assert.equal(failed.length, 1); assert.equal(failed[0].payload.status, 'failed'); assert.equal(failed[0].payload.safe_error_code, 'mpesa_1032');
    // A result code nobody here knows is not a failure: left alone.
    kenyan();
    answer = await pay();
    const third = pushes()[0].payload.CallBackURL; const odd = answer.json.providerReference;
    state.prompts.set(odd, '7777'); calls.length = 0;
    answer = await callbackTo(pathOf(third), 7777, odd);
    assert.equal(answer.status, 503); assert.equal(answer.json.status, 'unverified');
    assert.equal(written('/rest/v1/payment_attempts', 'PATCH').length, 0); assert.equal(state.events.length, 0);

    // Refused outright by Safaricom, or no sign-in: the same wallet is asked through pawaPay.
    for (const [label, set] of [['Safaricom cannot be signed in to', () => { state.darajaToken = 401; }], ['Safaricom refuses the request', () => { state.stk = 400; }]]) {
      kenyan(); set();
      answer = await pay();
      assert.equal(answer.status, 200, `${label}: ${JSON.stringify(answer.json)}`);
      assert.equal(pawapay.length, 1, label); assert.equal(pawapay[0].payload.payer.accountDetails.provider, 'MPESA_KEN', label);
      assert.equal(answer.json.providerReference, pawapay[0].payload.depositId, label);
      assert.deepEqual(state.attempts.map((a) => a.provider), ['mpesa_ke', 'pawapay_mpesa_ke'], label);
    }
    // After 500 a prompt may be on the handset: nobody is prompted again through another road.
    kenyan(); state.stk = 500;
    answer = await pay();
    assert.equal(answer.status, 502); assert.equal(answer.json.reason, 'provider_failed');
    assert.equal(pawapay.length, 0, 'after 500 from Safaricom a second prompt was asked for');
    // A total with cents is not asked for at all.
    kenyan(); state.orderRow = { orderId: ORDER, amountMinor: '125050', currencyCode: 'KES' };
    answer = await pay();
    assert.equal(answer.status, 503); assert.equal(answer.json.reason, 'provider_unavailable');
    assert.equal(pushes().length, 0); assert.equal(pawapay.length, 0);
    state = fresh();
  }
  console.log('M-Pesa direct, with a synthetic Safaricom: offered once in Kenya; a prompt is asked for in whole shillings, to the number as 254…, with a callback address of its own that carries the order under a code and is never sent to the payer; four callbacks at addresses this platform did not make are ignored without Safaricom being asked; at the right address, "not answered yet" and a prompt Safaricom never issued settle nothing; a paid prompt settles the order once, under Safaricom’s id, at the order’s own total, recorded as such; a callback saying "paid" for a cancelled prompt is corrected to a failure; an unknown result code closes nothing; when Safaricom cannot be signed in to or refuses outright the same wallet is asked through pawaPay, and after 500 nobody is prompted again; a total with cents is not asked for.');

  // ========================================================= paying a pledge
  // A sponsor pays a pledge through the same checkout. The stand-in database
  // holds the sponsor's board; it has no learner in it, as the real one has not.
  {
    const PLEDGE = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
    const PAID = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb';
    const CENTS = 'cccccccc-3333-4333-8333-cccccccccccc';
    const NOBODYS = 'dddddddd-4444-4444-8444-dddddddddddd';
    const board = () => [
      { id: PLEDGE, seatCode: 'SPN-AB12CD', courseTitle: 'Synthetic <sponsored> course', courseSlug: 'reading', status: 'pledged', amountMinor: '50000', currencyCode: 'UGX', reference: null, recordedAt: null, pledgedAt: '2026-11-17T10:00:00Z' },
      { id: PAID, seatCode: 'SPN-EF34GH', courseTitle: 'Paid course', courseSlug: null, status: 'paid', amountMinor: '50000', currencyCode: 'UGX', reference: 'pawapay:DEP-1', recordedAt: '2026-11-02T08:15:00Z', pledgedAt: '2026-11-01T10:00:00Z' },
      // Kenyan shillings with cents: M-Pesa collects whole shillings, so nobody here can collect this.
      { id: CENTS, seatCode: 'SPN-IJ56KL', courseTitle: 'Cents course', courseSlug: null, status: 'pledged', amountMinor: '125050', currencyCode: 'KES', reference: null, recordedAt: null, pledgedAt: '2026-11-18T10:00:00Z' },
    ];
    const sponsor = () => { state = fresh(); state.pledges = board(); calls.length = 0; pawapay.length = 0; mtn.length = 0; };
    const get = async (path, language = 'en') => {
      const response = await fetch(`${origin}${path}`, { headers: { cookie, 'accept-language': language, 'x-vercel-ip-country': 'UG' }, redirect: 'manual', signal: AbortSignal.timeout(90000) });
      const html = await response.text();
      return { status: response.status, html, main: response.status === 200 ? inner(html) : '', location: response.headers.get('location') };
    };
    const rowOf = (main, id) => { const at = main.indexOf(`/account/sponsorship/pay/${id}`); return at; };

    // The page of pledges: a pay link only where the pledge can be paid for exactly its amount.
    sponsor();
    let seen = await get('/account/sponsorship');
    assert.equal(seen.status, 200, logs.slice(-2000));
    assert.equal(seen.main.split('data-pay').length - 1, 1, 'the number of pledges offered a way to pay');
    assert.ok(seen.main.includes(`<a class="btn" data-pay="true" href="/account/sponsorship/pay/${PLEDGE}">Pay this pledge</a>`), 'the pledge that can be paid has no link');
    assert.ok(seen.main.includes('Nothing is taken until you pay. The seat opens when the payment is confirmed.'));
    // The pledge with cents, which nobody here can collect, says what the page always said, and has no link.
    assert.equal(rowOf(seen.main, CENTS), -1); assert.equal(rowOf(seen.main, PAID), -1);
    assert.equal(seen.main.split('Nothing is taken automatically: this page collects no payment.').length - 1, 1);
    // Either switch off: no link at all, and the old sentence for both waiting pledges.
    for (const off of ['checkout', 'sponsoring']) {
      sponsor(); state[off] = false;
      seen = await get('/account/sponsorship');
      assert.equal(seen.main.includes('data-pay'), false, `${off} is off and a pledge is offered a way to pay`);
      assert.equal(seen.main.split('Nothing is taken automatically: this page collects no payment.').length - 1, 2, off);
    }

    // The pay page: the pledge, its amount in major units, and the two services that collect Ugandan shillings.
    sponsor();
    seen = await get(`/account/sponsorship/pay/${PLEDGE}`);
    assert.equal(seen.status, 200, logs.slice(-2000));
    for (const piece of ['<h1>Pay this pledge</h1>', 'The seat opens for the learner as soon as the payment is confirmed. Neither side learns who the other is.', '<bdi>Synthetic &lt;sponsored&gt; course</bdi>', '<bdi dir="ltr">SPN-AB12CD</bdi>', '<bdi dir="ltr">UGX 50000</bdi>', 'value="mtn_momo_ug"', 'value="pawapay_airtel_ug"', '<label for="pledge-msisdn" class="eyebrow">Mobile money number</label>', 'Continue to payment', '<bdi>Uganda</bdi>', '<bdi dir="ltr">+256</bdi>', 'zakat, sadaqah or neither']) {
      assert.ok(seen.main.includes(piece), `the pay page lacks ${piece}`);
    }
    for (const word of ['pawaPay', 'pawapay_mtn_ug', 'M-Pesa', '5000000', 'This pledge cannot be paid here', 'learner_profile']) assert.ok(!seen.main.includes(word), `the pay page says "${word}"`);
    assert.match(seen.html, /<meta name="robots" content="noindex, nofollow"/);
    // In Arabic, right to left, with the amount still left to right.
    seen = await get(`/account/sponsorship/pay/${PLEDGE}`, 'ar');
    for (const piece of ['<h1>ادفع هذا التعهّد</h1>', 'يُفتح المقعد للمتعلّم فور تأكّد الدفع.', '<bdi dir="ltr">UGX 50000</bdi>', 'رقم محفظة الهاتف المحمول']) assert.ok(seen.main.includes(piece), `the Arabic pay page lacks ${piece}`);
    assert.ok(!seen.main.includes('Pay this pledge') && !seen.main.includes('Mobile money number'));
    // A held language reads it in English, whole, marked.
    seen = await get(`/account/sponsorship/pay/${PLEDGE}`, 'ha');
    assert.ok(seen.main.includes('<h1>Pay this pledge</h1>') && /<div class="container section narrow" lang="en" dir="ltr">/.test(seen.main), 'Hausa is not given the English page, marked');

    // Paid, somebody else's, made up, not an id: one sentence, no form, and nothing that says which.
    const answers = [];
    for (const id of [PAID, NOBODYS, '00000000-0000-4000-8000-000000000000', 'not-an-id', `${PLEDGE}x`]) {
      sponsor();
      seen = await get(`/account/sponsorship/pay/${id}`);
      assert.equal(seen.status, 200, id);
      assert.ok(seen.main.includes('<div class="notice warn" data-pay-state="not-payable">This pledge cannot be paid here: it has been paid or called off, or it is not one of yours.</div>'), id);
      assert.ok(!seen.main.includes('pledge-msisdn') && !seen.main.includes('Paid course') && !seen.main.includes('UGX'), `${id}: something of the pledge is shown`);
      answers.push(seen.main.replace(/pay\/[^"]*/g, ''));
    }
    assert.equal(new Set(answers).size, 1, 'the page answers differently for a pledge that is paid, somebody else’s or made up');
    // Nobody here can collect Kenyan shillings with cents: said, with no form, and the amount not rounded.
    sponsor();
    seen = await get(`/account/sponsorship/pay/${CENTS}`);
    assert.ok(seen.main.includes('data-pay-state="no-service"') && seen.main.includes('<bdi dir="ltr">KES 1250.50</bdi>') && !seen.main.includes('pledge-msisdn'), 'a pledge nobody can collect is offered a form');
    // Checkout switched off: said, and no form.
    sponsor(); state.checkout = false;
    seen = await get(`/account/sponsorship/pay/${PLEDGE}`);
    assert.ok(seen.main.includes('<div class="notice warn" data-pay-state="closed">Checkout is not open yet.</div>') && !seen.main.includes('pledge-msisdn'));
    // The board cannot be read: said as that, aloud, and not as "no such pledge".
    sponsor(); state.boardBroken = true;
    seen = await get(`/account/sponsorship/pay/${PLEDGE}`);
    assert.ok(seen.main.includes('<div class="notice error" role="alert">') && !seen.main.includes('This pledge cannot be paid here') && !seen.main.includes('SYNTHETIC-DATABASE'));
    // Signed out: to sign in.
    const out = await fetch(`${origin}/account/sponsorship/pay/${PLEDGE}`, { redirect: 'manual', signal: AbortSignal.timeout(90000) });
    assert.equal(out.status, 307); assert.match(out.headers.get('location') ?? '', /\/sign-in\?next=/);

    // Paying: the database is sent the pledge's id and nothing else, and MTN is asked for the pledge's amount.
    sponsor();
    let answer = await checkout({ sponsorshipId: PLEDGE, provider: 'mtn_momo_ug', msisdn: '0772 123456', amount: '1', amountMinor: '1', learnerProfileId: OWN, withdrawalChoice: 'waived' }, 'UG');
    assert.equal(answer.status, 200, JSON.stringify(answer.json)); assert.equal(answer.json.kind, 'pending'); assert.equal(answer.json.orderId, ORDER);
    assert.deepEqual(written('/rest/v1/rpc/create_sponsorship_order').map((c) => c.payload), [{ p_sponsorship: PLEDGE }]);
    // No course order, and no withdrawal box recorded for money given away.
    assert.equal(written('/rest/v1/rpc/create_course_order').length, 0); assert.equal(written('/rest/v1/rpc/record_withdrawal_choice').length, 0);
    const asked = mtn.filter((c) => c.path === 'requesttopay');
    assert.equal(asked.length, 1); assert.equal(asked[0].payload.amount, '50000'); assert.equal(asked[0].payload.currency, 'UGX'); assert.equal(asked[0].payload.externalId, ORDER);
    assert.match(asked[0].payload.payerMessage, /^Sponsored seat /);
    assert.deepEqual(state.attempts.map((a) => [a.provider, a.amount_minor, a.currency_code]), [['mtn_momo_ug', '50000', 'UGX']]);

    // The database's refusals, each under its own name and status, in this platform's words.
    const refusal = (status, code, message) => [status, { code, message, details: null, hint: null }];
    for (const [label, body, status, reason] of [
      ['somebody else’s, or none', refusal(400, 'P0002', 'sponsorship:not_found'), 409, 'pledge_not_payable'],
      ['paid or called off', refusal(400, '23514', 'sponsorship:not_pledged'), 409, 'pledge_not_payable'],
      ['sponsoring switched off', refusal(400, '0A000', 'sponsorship:disabled'), 503, 'disabled'],
      ['checkout switched off', refusal(403, '42501', 'checkout:disabled'), 503, 'disabled'],
      ['a refusal nobody named', refusal(400, '23514', 'SYNTHETIC-DATABASE new row violates check constraint "sp_paid_agrees"'), 500, 'refused'],
      ['no answer', [503, { message: 'SYNTHETIC-DATABASE upstream connect error' }], 502, 'unconfirmed'],
    ]) {
      sponsor(); state.pledgeOrder = body;
      answer = await checkout({ sponsorshipId: PLEDGE, provider: 'mtn_momo_ug', msisdn: '0772 123456' }, 'UG');
      assert.equal(answer.status, status, label); assert.equal(answer.json.reason, reason, label);
      assert.deepEqual(Object.keys(answer.json).sort(), ['error', 'reason'], label);
      assert.equal(mtn.filter((c) => c.path === 'requesttopay').length, 0, `${label}: a payment was asked for`);
    }
    // An id that is not one is answered without the database; a pledge and a course together are malformed.
    sponsor();
    answer = await checkout({ sponsorshipId: 'not-an-id', provider: 'mtn_momo_ug', msisdn: '0772 123456' }, 'UG');
    assert.equal(answer.status, 409); assert.equal(answer.json.reason, 'pledge_not_payable');
    answer = await checkout({ sponsorshipId: PLEDGE, courseId: COURSE, learnerProfileId: OWN, provider: 'mtn_momo_ug', msisdn: '0772 123456' }, 'UG');
    assert.equal(answer.status, 400); assert.equal(answer.json.reason, 'malformed');
    assert.equal(written('/rest/v1/rpc/create_sponsorship_order').length, 0);
    // A number that is not Uganda's is refused before the database is asked for an order.
    answer = await checkout({ sponsorshipId: PLEDGE, provider: 'mtn_momo_ug', msisdn: '+254712345678' }, 'UG');
    assert.equal(answer.status, 400); assert.equal(answer.json.reason, 'phone_invalid');
    assert.equal(written('/rest/v1/rpc/create_sponsorship_order').length, 0);
    // A pledge with cents, paid through an operator that takes none: the order is written and nobody is prompted.
    sponsor();
    answer = await checkout({ sponsorshipId: CENTS, provider: 'mpesa_ke', msisdn: '0712 345678' });
    assert.equal(answer.status, 503); assert.equal(answer.json.reason, 'provider_unavailable');
    assert.equal(daraja.filter((c) => c.path === 'push').length, 0, 'a prompt was asked for an amount with cents');

    // In a browser, when one is given: the pay page fits a phone in four
    // languages, and the form does what it says.
    if (process.env.RESPONSIVE_PLAYWRIGHT && process.env.RESPONSIVE_CHROME) {
      const { chromium } = await import(pathToFileURL(process.env.RESPONSIVE_PLAYWRIGHT).href);
      const browser = await chromium.launch({ executablePath: process.env.RESPONSIVE_CHROME, headless: true, args: ['--no-sandbox'] });
      const shots = process.env.RESPONSIVE_SCREENSHOTS;
      if (shots) mkdirSync(shots, { recursive: true });
      try {
        for (const [code, width] of [['en', 320], ['en', 390], ['en', 1440], ['ar', 320], ['ar', 390], ['ta', 320], ['fil', 320], ['fr', 320]]) {
          sponsor();
          const context = await browser.newContext({ viewport: { width, height: 900 }, locale: 'en', extraHTTPHeaders: { 'x-vercel-ip-country': 'UG' } });
          await context.addCookies([{ name: 'sb-127-auth-token', value: `base64-${encode(session)}`, url: origin }, { name: 'ayahspring_locale', value: code, url: origin }]);
          const tab = await context.newPage();
          const errors = []; tab.on('pageerror', (e) => errors.push(String(e)));
          tab.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text().slice(0, 400)); });
          await tab.goto(`${origin}/account/sponsorship/pay/${PLEDGE}`, { waitUntil: 'networkidle' });
          await tab.locator('#pledge-msisdn').waitFor();
          const wide = await tab.evaluate(() => {
            const limit = window.innerWidth;
            const over = [...document.querySelectorAll('main *')].filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && (r.right > limit + 0.5 || r.left < -0.5); });
            return { page: document.documentElement.scrollWidth, limit, over: over.slice(0, 3).map((el) => `${el.tagName.toLowerCase()}.${el.className}`) };
          });
          assert.ok(wide.page <= wide.limit && wide.over.length === 0, `the pay page in ${code} at ${width}px is wider than the screen: ${JSON.stringify(wide)}`);
          assert.equal(await tab.evaluate(() => document.documentElement.dir || 'ltr'), code === 'ar' ? 'rtl' : 'ltr', code);
          // The number is typed left to right in every language, and the amount reads left to right.
          assert.equal(await tab.locator('#pledge-msisdn').getAttribute('dir'), 'ltr');
          if (shots) await tab.screenshot({ path: `${shots}/pledge-pay-${code}-${width}.png`, fullPage: true });

          if (code === 'en' && width === 390) {
            mtn.length = 0;
            // A number that is not one: said, and the button stays.
            await tab.locator('#pledge-msisdn').fill('12');
            await tab.getByRole('button', { name: 'Continue to payment', exact: true }).click();
            await tab.getByRole('alert').filter({ hasText: 'That phone number is not valid. Check it and try again.' }).waitFor();
            assert.equal(await tab.getByRole('button', { name: 'Continue to payment', exact: true }).count(), 1);
            assert.equal(mtn.filter((c) => c.path === 'requesttopay').length, 0);
            // A good one: the prompt is asked for once, the page says what happens next, and the button is gone.
            await tab.locator('#pledge-msisdn').fill('0772 123456');
            await tab.getByRole('button', { name: 'Continue to payment', exact: true }).click();
            await tab.getByRole('status').filter({ hasText: 'Approve the payment on your phone. The seat opens for the learner once the payment is confirmed. This can take a moment.' }).waitFor();
            assert.equal(await tab.locator('main button').count(), 0, 'a second press is offered after a prompt is on its way');
            assert.equal(await tab.locator('#pledge-msisdn').isDisabled(), true);
            assert.equal(mtn.filter((c) => c.path === 'requesttopay').length, 1);
            const text = await tab.locator('main').textContent();
            for (const word of ['SYNTHETIC', 'pawaPay', 'Malformed', 'provider']) assert.equal(text.includes(word), false, `the page says "${word}"`);
            if (shots) await tab.screenshot({ path: `${shots}/pledge-pay-en-390-started.png`, fullPage: true });
          }
          if (code === 'ar' && width === 390) {
            // A refusal by the database, said in Arabic, with none of the server's English.
            state.pledgeOrder = [400, { code: '23514', message: 'sponsorship:not_pledged', details: null, hint: null }];
            await tab.locator('#pledge-msisdn').fill('0772 123456');
            await tab.getByRole('button', { name: 'المتابعة إلى الدفع', exact: true }).click();
            await tab.getByRole('alert').filter({ hasText: 'لا يمكن دفع هذا التعهّد هنا: إمّا أنه دُفع أو أُلغي، أو أنه ليس من تعهّداتك.' }).waitFor();
            const text = await tab.locator('main').textContent();
            assert.equal(text.includes('This pledge cannot be paid here'), false, 'the Arabic page says the refusal in the server’s English');
          }
          assert.deepEqual(errors, [], `${code} ${width}`);
          await context.close();
          console.log(`Synthetic pay page in ${code} at ${width}px: fits; the number is typed left to right; no page error`);
        }
      } finally { await browser.close(); }
    }
    state = fresh();
  }
  console.log('Paying a pledge, synthetic database, MTN and pawaPay: the page of pledges links to a pay page only for the pledge that can be paid for exactly its amount, and for none with either switch off; the pay page shows the pledge, its amount in major units and the services that collect it, in English, Arabic and (as English, marked) Hausa; a pledge that is paid, somebody else’s, made up or not an id is answered with one sentence and the same page; a pledge nobody can collect, checkout switched off and a board that cannot be read are each said as that with no form; signed out goes to sign in; paying sends the database the pledge’s id and nothing else, asks MTN for the pledge’s amount, and records no withdrawal box; six refusals by the database each under its own name and status with none of its words; a pledge and a course together are malformed.');

  // ==================================================== the staff desk
  // Money that arrived for a pledge and opened no seat: staff are shown it.
  {
    const WAITING = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
    const TWICE = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb';
    const GONE = 'cccccccc-3333-4333-8333-cccccccccccc';
    const desk = () => {
      state = fresh(); state.staff = true; calls.length = 0;
      state.desk = { enabled: true, waiting: [], counts: { waiting: 0, approved: 0, funded: 1, declined: 0, pledged: 1, paid: 1 }, seats: [
        { id: WAITING, seatCode: 'SPN-AB12CD', courseTitle: 'Synthetic course', donor: 'Synthetic sponsor', status: 'pledged', amountMinor: '50000', currencyCode: 'UGX', reference: null, pledgedAt: '2026-11-17T10:00:00Z' },
        { id: TWICE, seatCode: 'SPN-EF34GH', courseTitle: 'Paid course', donor: 'Another sponsor', status: 'paid', amountMinor: '1999', currencyCode: 'USD', reference: 'BANK-7', pledgedAt: '2026-11-01T10:00:00Z' },
      ] };
      state.late = [
        { target_id: GONE, detail: { orderId: '11111111-1111-4111-8111-111111111111', reason: 'pledge_withdrawn', amountMinor: '33000', currency: 'UGX' }, occurred_at: '2026-11-19T08:17:01Z' },
        { target_id: WAITING, detail: { orderId: ORDER, reason: 'course_not_available', amountMinor: '50000', currency: 'UGX' }, occurred_at: '2026-11-18T08:17:01Z' },
        { target_id: TWICE, detail: { orderId: OTHER_ORDER, reason: 'pledge_paid', amountMinor: '1999', currency: 'USD' }, occurred_at: '2026-11-17T08:17:01Z' },
        // A line somebody mangled: no pledge it could be about, so it is not drawn.
        { target_id: 'not-an-id', detail: { reason: '<b>refund now</b>' }, occurred_at: 'yesterday' },
      ];
    };
    const open = async () => {
      const response = await fetch(`${origin}/admin/sponsorships`, { headers: { cookie, 'accept-language': 'en' }, redirect: 'manual', signal: AbortSignal.timeout(90000) });
      const html = await response.text();
      return { status: response.status, main: response.status === 200 ? inner(html) : '', location: response.headers.get('location') };
    };

    // Not finance and not the owner: sent away, and nothing is read.
    desk(); state.staff = false;
    let seen = await open();
    assert.equal(seen.status, 307); assert.match(seen.location ?? '', /\/admin$/);
    assert.equal(written('/rest/v1/governance_audit_events').length, 0, 'the audit trail was read for somebody who is not staff');

    desk();
    seen = await open();
    assert.equal(seen.status, 200, logs.slice(-2000));
    // The page asks for exactly these lines, newest first.
    const asked = written('/rest/v1/governance_audit_events');
    assert.equal(asked.length, 1);
    for (const piece of ['action=eq.sponsorship.payment_unapplied', 'target_type=eq.sponsorship', 'order=occurred_at.desc', 'limit=50']) assert.ok(asked[0].query.includes(piece), `the page asks without ${piece}`);
    assert.ok(seen.main.includes('data-unapplied="3"'), 'three payments are not drawn as three');
    for (const piece of [
      '<h2 style="margin-top:0">Money that arrived and opened no seat</h2>',
      // Called off: in major units, the reason, what to do, and that the pledge is gone.
      '<bdi dir="ltr">UGX 33000</bdi>', 'The sponsor had called the pledge off before the payment was confirmed.', 'refund the order.', 'The pledge is no longer open.', 'Order <bdi dir="ltr">11111111-1111-4111-8111-111111111111</bdi>.',
      // The course was withdrawn: the money can still buy the seat, and the pledge is still below.
      'The course had no published version when the payment was confirmed.', 'record this payment against the pledge with the order as its reference; otherwise refund the order.', 'The pledge is still waiting below.', '<bdi dir="ltr">SPN-AB12CD</bdi>',
      // Paid twice: 19.99, not 1999.
      '<bdi dir="ltr">USD 19.99</bdi>', 'so this is a second payment for one seat.', 'The pledge is recorded as paid, by the earlier payment.',
      'This page cannot tell whether an order has since been refunded',
      'A pledge paid at checkout has an order',
    ]) assert.ok(seen.main.includes(piece), `the staff desk lacks: ${piece}`);
    for (const word of ['refund now', 'yesterday', 'USD 1999', 'creates <strong>no order</strong>, charges', 'SYNTHETIC']) assert.ok(!seen.main.includes(word), `the staff desk says "${word}"`);
    assert.equal(seen.main.split('data-reason=').length - 1, 3);

    // None: no section, and no alarm.
    desk(); state.late = [];
    seen = await open();
    assert.ok(!seen.main.includes('Money that arrived and opened no seat') && !seen.main.includes('could not be read just now'));
    // They cannot be read: said aloud, as that, and without the database's sentence.
    desk(); state.lateBroken = true;
    seen = await open();
    assert.ok(seen.main.includes('role="alert"') && seen.main.includes('Payments that arrived and opened no seat could not be read just now. That is not the same as there being none'), 'an unread audit trail is not said as unread');
    assert.ok(!seen.main.includes('SYNTHETIC-DATABASE') && !seen.main.includes('Money that arrived and opened no seat'));
    state = fresh();
  }
  console.log('Staff desk for sponsored seats, synthetic database: somebody who is not finance is sent away and the audit trail is not read; three payments that opened no seat are each drawn with the amount in major units, why nothing was granted, what there is to do and what has happened to the pledge since, and a mangled line is not drawn; the page says it cannot tell whether an order was refunded; none is no section; an audit trail that cannot be read is said as that, aloud, without the database’s words.');

  // ============================================================ the webhook
  const DEPOSIT = 'f4401bd2-1568-4140-bf2d-eb77d2b2b639';
  const notice = (over = {}) => ({ depositId: DEPOSIT, status: 'COMPLETED', amount: '1250', currency: 'KES', country: 'KEN', payer: { type: 'MMO', accountDetails: { phoneNumber: PHONE, provider: 'MPESA_KEN' } }, created: '2026-11-19T08:17:01Z', providerTransactionId: 'SLK4X9P2QA', metadata: { orderId: ORDER }, ...over });
  const reset = (deposit) => { state = fresh(); if (deposit) state.deposits.set(DEPOSIT, deposit); calls.length = 0; pawapay.length = 0; };
  const nothingRecorded = (label) => {
    assert.equal(state.events.length, 0, `${label}: an event was recorded`);
    assert.equal(settled().length, 0, `${label}: an order was settled`);
    assert.equal(written('/rest/v1/payment_attempts', 'PATCH').length, 0, `${label}: an attempt was closed`);
  };
  {
    // Addresses that are nobody's, and a body that is not JSON.
    reset(held(DEPOSIT));
    for (const id of ['pawapay_ke', 'pawapay_wave_sn', 'not_a_provider']) {
      const answer = await hook(notice(), id);
      assert.equal(answer.status, 404, id); assert.deepEqual(answer.json, { error: 'unknown provider' });
    }
    assert.equal((await hook('{not json')).status, 400);
    assert.equal(pawapay.length, 0); nothingRecorded('an address that is nobody’s');

    // A success pawaPay has never heard of: somebody who knows an order id and can post.
    reset(null);
    let answer = await hook(notice());
    assert.equal(answer.status, 503); assert.equal(answer.json.status, 'unverified');
    // What pawaPay said about a reference a stranger chose is not passed back to the stranger.
    assert.deepEqual(answer.json, { status: 'unverified', reason: 'the provider could not confirm this payment just now' });
    assert.deepEqual(pawapay.map((c) => [c.method, c.path, c.authorised]), [['GET', `/v2/deposits/${DEPOSIT}`, true]]);
    nothingRecorded('a forged success');

    // Notifications that are not about a finished deposit ask pawaPay nothing.
    reset(held(DEPOSIT));
    for (const [label, body] of [['in progress', notice({ status: 'PROCESSING' })], ['a refund', { refundId: DEPOSIT, status: 'COMPLETED', amount: '1250', currency: 'KES' }], ['no id', { status: 'COMPLETED' }], ['an id that is not one', notice({ depositId: '../../v2/payouts/x' })]]) {
      answer = await hook(body);
      assert.equal(answer.status, 200, label); assert.equal(answer.json.status, 'ignored', label);
    }
    assert.equal(pawapay.length, 0); nothingRecorded('a notification that is not an outcome');

    // The real thing: pawaPay holds the deposit, completed, for this order, at this order's total.
    reset(held(DEPOSIT));
    answer = await hook(notice());
    assert.equal(answer.status, 200, JSON.stringify(answer.json)); assert.deepEqual(answer.json, { status: 'processed', orderId: ORDER });
    assert.deepEqual(pawapay.map((c) => [c.method, c.path, c.authorised]), [['GET', `/v2/deposits/${DEPOSIT}`, true]]);
    assert.equal(state.events.length, 1);
    const event = state.events[0];
    assert.equal(event.provider, 'pawapay'); assert.equal(event.provider_event_id, DEPOSIT); assert.equal(event.event_type, 'payment.succeeded'); assert.equal(event.signature_verified, true);
    // The record says what confirmed it, and the amount is pawaPay's own, in whole minor units.
    assert.equal(event.payload.confirmed_by, 'authenticated status query'); assert.equal(event.payload.amount_from, 'provider');
    assert.deepEqual(event.payload.status_query, { state: 'succeeded', providerReference: DEPOSIT, amount: { amountMinor: '125000', currency: 'KES' }, financialTransactionId: 'SLK4X9P2QA', orderId: ORDER });
    assert.deepEqual(settled().map((c) => [c.payload, c.role]), [[{ p_actor_id: null, p_order_id: ORDER, p_provider: 'pawapay', p_reference: DEPOSIT, p_event_id: event.id, p_evidence: null }, 'service']]);
    const closed = written('/rest/v1/payment_attempts', 'PATCH');
    assert.equal(closed.length, 1); assert.equal(closed[0].payload.status, 'succeeded'); assert.equal(closed[0].payload.provider_reference, DEPOSIT);
    assert.ok(closed[0].query.includes(`order_id=eq.${ORDER}`));
    // Delivered again, as pawaPay does until it is answered: nothing is applied twice.
    answer = await hook(notice());
    assert.deepEqual(answer.json, { status: 'duplicate' });
    assert.equal(settled().length, 1); assert.equal(state.events.length, 1);

    // A notification that names no order at all: pawaPay's record is the only word, and it is enough.
    reset(held(DEPOSIT));
    answer = await hook(notice({ metadata: undefined }));
    assert.deepEqual(answer.json, { status: 'processed', orderId: ORDER });
    assert.equal(settled()[0].payload.p_order_id, ORDER);
    // And one that lies about the outcome is corrected by it.
    reset(held(DEPOSIT));
    answer = await hook(notice({ status: 'FAILED', failureReason: { failureCode: 'PAYMENT_NOT_APPROVED' } }));
    assert.deepEqual(answer.json, { status: 'processed', orderId: ORDER });
    // The operator's own address answers the same way, under its own name.
    reset(held(DEPOSIT));
    answer = await hook(notice(), 'pawapay_mpesa_ke');
    assert.deepEqual(answer.json, { status: 'processed', orderId: ORDER });
    assert.equal(state.events[0].provider, 'pawapay_mpesa_ke');

    // A real, completed payment that is not this order's payment settles nothing.
    for (const [label, deposit, body] of [
      ['presented for a dearer order', held(DEPOSIT), notice({ metadata: { orderId: OTHER_ORDER } })],
      ['less than the order costs', held(DEPOSIT, { amount: '12.50' }), notice()],
      ['in another currency', held(DEPOSIT, { currency: 'UGX', amount: '125000' }), notice()],
      ['for an order pawaPay does not name', held(DEPOSIT, { clientReferenceId: undefined, metadata: undefined }), notice()],
      ['for two orders at once', held(DEPOSIT, { metadata: { orderId: OTHER_ORDER } }), notice()],
      ['for an order that does not exist', held(DEPOSIT, { clientReferenceId: '12121212-1212-4212-8212-121212121212', metadata: { orderId: '12121212-1212-4212-8212-121212121212' } }), notice({ metadata: undefined })],
    ]) {
      reset(deposit);
      answer = await hook(body);
      assert.equal(answer.status, 200, label); assert.equal(answer.json.status, 'not_applied', `${label}: ${JSON.stringify(answer.json)}`); assert.equal(answer.retry, null, label);
      nothingRecorded(label);
    }

    // Not finished, or not answerable: left alone, and answered 503 so that
    // pawaPay, which stops redelivering at the first 200, sends it again.
    // Nothing else here would ever look. Never "failed".
    for (const [label, deposit, down, status] of [
      ['still with the payer', held(DEPOSIT, { status: 'PROCESSING' }), false, 'still_pending'],
      ['accepted and not yet sent', held(DEPOSIT, { status: 'ACCEPTED' }), false, 'still_pending'],
      ['being reconciled', held(DEPOSIT, { status: 'IN_RECONCILIATION' }), false, 'still_pending'],
      ['pawaPay is down', held(DEPOSIT), true, 'unverified'],
      ['completed with an amount nobody can read', held(DEPOSIT, { amount: 'lots' }), false, 'unverified'],
    ]) {
      reset(deposit); state.pawapayDown = down;
      answer = await hook(notice());
      assert.equal(answer.status, 503, label); assert.equal(answer.json.status, status, label); assert.equal(answer.retry, '60', label);
      nothingRecorded(label);
    }
    // ...and when pawaPay answers again, the same notification settles it.
    reset(held(DEPOSIT)); state.pawapayDown = true;
    assert.equal((await hook(notice())).status, 503);
    state.pawapayDown = false;
    answer = await hook(notice());
    assert.deepEqual(answer.json, { status: 'processed', orderId: ORDER });
    assert.equal(settled().length, 1);

    // A failure pawaPay confirms, for this order: the attempt is closed with pawaPay's code and the order stays open.
    reset(held(DEPOSIT, { status: 'FAILED', failureReason: { failureCode: 'PAYMENT_NOT_APPROVED', failureMessage: PAWAPAY_SENTENCE }, providerTransactionId: undefined }));
    answer = await hook(notice({ status: 'FAILED', failureReason: { failureCode: 'PAYMENT_NOT_APPROVED', failureMessage: PAWAPAY_SENTENCE } }));
    assert.deepEqual(answer.json, { status: 'recorded', kind: 'payment.failed' });
    assert.equal(settled().length, 0, 'a failed payment settled an order');
    assert.equal(state.events[0].event_type, 'payment.failed');
    const failed = written('/rest/v1/payment_attempts', 'PATCH');
    assert.equal(failed.length, 1); assert.equal(failed[0].payload.status, 'failed'); assert.equal(failed[0].payload.safe_error_code, 'PAYMENT_NOT_APPROVED');
    // Its sentence, with the number in it, is in no column this route wrote itself.
    assert.ok(!JSON.stringify(failed[0].payload).includes(PHONE));
    assert.ok(!JSON.stringify(state.events[0].payload.status_query).includes(PHONE));
    // A failure for another order closes nothing of this one.
    reset(held(DEPOSIT, { status: 'FAILED', failureReason: { failureCode: 'INSUFFICIENT_BALANCE' } }));
    answer = await hook(notice({ status: 'FAILED', metadata: { orderId: OTHER_ORDER } }));
    assert.equal(answer.json.status, 'not_applied'); nothingRecorded('a failure for another order');
  }
  console.log('Payment webhook with a synthetic pawaPay: three addresses that are nobody’s 404 and a body that is not JSON 400; a success pawaPay never heard of settles nothing; four notifications that are not an outcome ask pawaPay nothing; a completed deposit for this order at this order’s total is recorded with what confirmed it and settles the order once, however often it is delivered; a notification that names no order, or lies about the outcome, is corrected by pawaPay’s own record; six real payments that are not this order’s payment settle nothing and are answered 200; five that are unfinished or unanswerable are left alone, never called failed, and answered 503 so that they are sent again, and the next delivery settles the order; a confirmed failure closes the attempt with pawaPay’s code and leaves the order open.');
  console.log('pawaPay HTTP smoke passed. Not pawaPay: every answer was typed from its documentation. Not real Auth, RLS or order rules; no handset, no money.');
} catch (e) { console.error(logs.slice(-4000)); throw e; }
finally {
  try { process.kill(-next.pid, 'SIGTERM'); } catch { /* already exited */ }
  if (next.exitCode === null) await Promise.race([once(next, 'exit'), new Promise((r) => setTimeout(r, 5000))]);
  try { process.kill(-next.pid, 'SIGKILL'); } catch { /* already exited */ }
  await new Promise((r) => fake.close(r));
}
