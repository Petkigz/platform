import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  MpesaProvider,
  mpesaCallbackUrl,
  mpesaConfigFromEnv,
  mpesaPassword,
  mpesaTimestamp,
  orderOfMpesaCallback,
  type MpesaConfig,
} from './payments/mpesa.ts';
import { PaymentNotStartedError } from './payments/provider.ts';
import { availableProviders, getPaymentProvider, knownProviderIds, providersForAmount, standInFor } from './payments/registry.ts';
import { bindPayment } from './payments/binding.ts';
import { clearTokenCache } from './payments/oauth.ts';

// ---------------------------------------------------------------------------
// What these tests are, and are not.
//
// Every answer "Safaricom" gives below is typed here from public descriptions
// of its Daraja API. Nothing in this file is sent to Safaricom, and nothing
// in this adapter ever has been: there is no Daraja app, test or live.
//
// The failures aimed at:
//
//   * one prompt's payment settling another order (Safaricom's status answer
//     names no order and no amount, so the order travels in the callback's
//     own address, under a code only this server can make)
//   * "the payer has not answered yet" read as a failure
//   * an amount rounded to whole shillings
//   * a second prompt after an answer that left the first in doubt
// ---------------------------------------------------------------------------

type Call = { url: string; init: RequestInit };
type Reply = { status?: number; body?: unknown; text?: string } | 'network';

function stubFetch(routes: { match: string; reply: Reply }[]) {
  const calls: Call[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: unknown, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init: init ?? {} });
    const route = routes.find((r) => url.includes(r.match));
    if (!route) throw new Error(`no stub for ${url}`);
    if (route.reply === 'network') throw new TypeError('fetch failed');
    const text = route.reply.text ?? (route.reply.body === undefined ? '' : JSON.stringify(route.reply.body));
    return new Response(text, { status: route.reply.status ?? 200, headers: { 'content-type': 'application/json' } });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any;
  clearTokenCache();
  return { calls, restore: () => { globalThis.fetch = original; clearTokenCache(); } };
}

function withEnv(values: Record<string, string | undefined>, run: () => void) {
  const before = new Map(Object.keys(values).map((key) => [key, process.env[key]]));
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    run();
  } finally {
    for (const [key, value] of before) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

const ORDER = '0b6f3d2e-5a41-4c7e-9d10-3e8f2a6b7c55';
const OTHER_ORDER = '11111111-2222-4333-8444-555555555555';
const CHECKOUT = 'ws_CO_19112026093015363925';
const NONCE = '00112233445566778899aabbccddeeff';
const BASE = 'https://sandbox.safaricom.co.ke';
const CALLBACK = 'https://learn.example/api/payments/webhook/mpesa_ke';

const CFG: MpesaConfig = {
  baseUrl: BASE,
  consumerKey: 'synthetic-key',
  consumerSecret: 'synthetic-secret',
  shortCode: '174379',
  passkey: 'synthetic-passkey',
  till: null,
  callbackUrl: CALLBACK,
  country: 'KE',
  currency: 'KES',
};
const provider = (over: Partial<MpesaConfig> = {}) => new MpesaProvider({ ...CFG, ...over }, 'mpesa_ke');
const kes = (minor: bigint) => ({ amountMinor: minor, currency: 'KES' });
const TOKEN = { match: '/oauth/v1/generate', reply: { body: { access_token: 'tok', expires_in: '3599' } } as Reply };
const request = (over: Record<string, unknown> = {}) => ({
  orderId: ORDER,
  amount: kes(125000n),
  returnUrl: 'https://learn.example/orders',
  description: 'Course purchase',
  msisdn: '+254712345678',
  ...over,
});
const ENV = {
  MPESA_KE_CONSUMER_KEY: 'k', MPESA_KE_CONSUMER_SECRET: 's', MPESA_KE_SHORTCODE: '174379', MPESA_KE_PASSKEY: 'p',
  MPESA_KE_CALLBACK_URL: CALLBACK, MPESA_KE_TILL: undefined, MPESA_KE_BASE_URL: undefined,
};
const NO_PAWAPAY = { PAWAPAY_API_TOKEN: undefined, PAWAPAY_PROVIDERS: undefined, PAWAPAY_BASE_URL: undefined };

/** The callback Safaricom sends for a prompt. */
const callback = (over: Record<string, unknown> = {}) => ({
  Body: {
    stkCallback: {
      MerchantRequestID: '29115-34620561-1',
      CheckoutRequestID: CHECKOUT,
      ResultCode: 0,
      ResultDesc: 'The service request is processed successfully.',
      CallbackMetadata: { Item: [{ Name: 'Amount', Value: 999999 }, { Name: 'MpesaReceiptNumber', Value: 'SLK4X9P2QA' }, { Name: 'PhoneNumber', Value: 254712345678 }] },
      ...over,
    },
  },
});
const goodUrl = (order = ORDER) => mpesaCallbackUrl(CFG, order, NONCE);

// ---------------------------------------------------------------------------
// Configuration and the registry
// ---------------------------------------------------------------------------

test('M-Pesa is Kenya, needs all five settings, and is on the test host unless told otherwise', () => {
  const ids = knownProviderIds();
  assert.ok(ids.includes('mpesa_ke') && ids.includes('mpesa'));
  // No other country: M-Pesa elsewhere is another company's system.
  for (const id of ['mpesa_tz', 'mpesa_ug', 'mpesa_et']) assert.equal(getPaymentProvider(id).id, 'unconfigured', id);

  withEnv({ ...ENV, ...NO_PAWAPAY }, () => {
    const config = mpesaConfigFromEnv('KE');
    assert.deepEqual(config, { baseUrl: BASE, consumerKey: 'k', consumerSecret: 's', shortCode: '174379', passkey: 'p', till: null, callbackUrl: CALLBACK, country: 'KE', currency: 'KES' });
    assert.deepEqual(availableProviders().filter((p) => p.id.startsWith('mpesa')).map((p) => [p.id, p.label, p.market, p.requiresMsisdn, p.webhookTrust]), [['mpesa_ke', 'M-Pesa', { country: 'KE', currency: 'KES' }, true, 'requery']]);
    // The service with no country is nobody's account.
    assert.equal(getPaymentProvider('mpesa').available, false);
    assert.equal(mpesaConfigFromEnv('TZ'), null);
  });
  withEnv({ ...ENV, MPESA_KE_BASE_URL: 'https://api.safaricom.co.ke/', MPESA_KE_TILL: '5551234' }, () => {
    assert.equal(mpesaConfigFromEnv('KE')?.baseUrl, 'https://api.safaricom.co.ke');
    assert.equal(mpesaConfigFromEnv('KE')?.till, '5551234');
  });
  // Each of the five missing, or not what it has to be, is no account at all.
  for (const [label, over] of [
    ['no key', { MPESA_KE_CONSUMER_KEY: undefined }],
    ['no secret', { MPESA_KE_CONSUMER_SECRET: undefined }],
    ['no shortcode', { MPESA_KE_SHORTCODE: undefined }],
    ['a shortcode that is not digits', { MPESA_KE_SHORTCODE: 'PAYBILL' }],
    ['no passkey', { MPESA_KE_PASSKEY: undefined }],
    ['no callback address', { MPESA_KE_CALLBACK_URL: undefined }],
    ['a callback address that is not one', { MPESA_KE_CALLBACK_URL: 'learn.example/hook' }],
    ['a callback address Safaricom will not call', { MPESA_KE_CALLBACK_URL: 'http://learn.example/api/payments/webhook/mpesa_ke' }],
    ['a callback address with a query of its own', { MPESA_KE_CALLBACK_URL: `${CALLBACK}?x=1` }],
    ['a till that is not digits', { MPESA_KE_TILL: 'TILL' }],
  ] as [string, Record<string, string | undefined>][]) {
    withEnv({ ...ENV, ...over }, () => {
      assert.equal(mpesaConfigFromEnv('KE'), null, label);
      assert.equal(getPaymentProvider('mpesa_ke').available, false, label);
    });
  }
  // A stand-in on the same machine may be plain http; nothing else may.
  withEnv({ ...ENV, MPESA_KE_CALLBACK_URL: 'http://127.0.0.1:4000/api/payments/webhook/mpesa_ke' }, () => assert.ok(mpesaConfigFromEnv('KE')));
});

test('where both exist the payer sees M-Pesa once, the direct one, and the aggregator stands behind it', () => {
  withEnv({ ...ENV, PAWAPAY_API_TOKEN: 'synthetic', PAWAPAY_PROVIDERS: 'MPESA_KEN,VODACOM_TZA', PAWAPAY_BASE_URL: undefined }, () => {
    assert.deepEqual(availableProviders().map((p) => p.id), ['mpesa_ke', 'pawapay_mpesa_tz']);
    assert.equal(standInFor(getPaymentProvider('mpesa_ke'))?.id, 'pawapay_mpesa_ke');
    // Whole shillings only, both ways: a price with cents is offered neither.
    assert.deepEqual(providersForAmount(kes(125000n)).map((p) => p.id), ['mpesa_ke']);
    assert.deepEqual(providersForAmount(kes(125050n)), []);
  });
  // The aggregator alone, as before; and M-Pesa alone, with nothing behind it.
  withEnv({ ...ENV, MPESA_KE_PASSKEY: undefined, PAWAPAY_API_TOKEN: 'synthetic', PAWAPAY_PROVIDERS: 'MPESA_KEN', PAWAPAY_BASE_URL: undefined }, () => {
    assert.deepEqual(availableProviders().map((p) => p.id), ['pawapay_mpesa_ke']);
  });
  withEnv({ ...ENV, ...NO_PAWAPAY }, () => assert.equal(standInFor(getPaymentProvider('mpesa_ke')), null));
});

// ---------------------------------------------------------------------------
// The password, the timestamp and the address
// ---------------------------------------------------------------------------

test('the timestamp is Nairobi\'s clock and the password is what Daraja computes', () => {
  // 21:30:15 UTC on the 19th is 00:30:15 on the 20th in Nairobi.
  assert.equal(mpesaTimestamp(new Date('2026-11-19T21:30:15.900Z')), '20261120003015');
  assert.equal(mpesaTimestamp(new Date('2026-01-01T00:00:00Z')), '20260101030000');
  assert.equal(mpesaPassword('174379', 'pass', '20261120003015'), Buffer.from('174379pass20261120003015').toString('base64'));
});

test('a callback address names its order only under a code this server made', () => {
  const url = goodUrl();
  assert.ok(url.startsWith(`${CALLBACK}?o=${ORDER}&n=${NONCE}&s=`));
  assert.equal(orderOfMpesaCallback(CFG, url), ORDER);
  // Served behind another host or scheme, the query is what counts.
  assert.equal(orderOfMpesaCallback(CFG, url.replace('https://learn.example', 'http://localhost:3000')), ORDER);

  const parsed = new URL(url);
  const swap = (name: string, value: string) => { const u = new URL(url); u.searchParams.set(name, value); return u.toString(); };
  for (const [label, forged] of [
    ['no query at all', CALLBACK],
    ['another order under the same code', swap('o', OTHER_ORDER)],
    ['another random number under the same code', swap('n', 'ffeeddccbbaa99887766554433221100')],
    ['a code one character off', swap('s', `${parsed.searchParams.get('s')!.slice(0, -1)}${parsed.searchParams.get('s')!.endsWith('A') ? 'B' : 'A'}`)],
    ['an empty code', swap('s', '')],
    ['the order in capitals', swap('o', ORDER.toUpperCase())],
    ['an order that is not one', swap('o', 'ORD-1')],
    ['a random number that is not one', swap('n', 'short')],
    ['not an address', 'not a url'],
    ['nothing', undefined],
  ] as [string, string | undefined][]) {
    assert.equal(orderOfMpesaCallback(CFG, forged), null, label);
  }
  // A code made with another account's passkey fits nothing here.
  assert.equal(orderOfMpesaCallback(CFG, mpesaCallbackUrl({ ...CFG, passkey: 'another' }, ORDER, NONCE)), null);
  // Each payment's address is its own.
  assert.notEqual(mpesaCallbackUrl(CFG, ORDER, NONCE), mpesaCallbackUrl(CFG, ORDER, 'ffeeddccbbaa99887766554433221100'));
});

// ---------------------------------------------------------------------------
// Starting a payment
// ---------------------------------------------------------------------------

test('a prompt is asked for as Daraja describes it: whole shillings, the number as 2547…, an address of its own', async () => {
  const stub = stubFetch([TOKEN, { match: '/mpesa/stkpush/v1/processrequest', reply: { body: { MerchantRequestID: '29115-34620561-1', CheckoutRequestID: CHECKOUT, ResponseCode: '0', ResponseDescription: 'Success. Request accepted for processing', CustomerMessage: 'Success. Request accepted for processing' } } }]);
  try {
    const result = await provider().createCheckout(request());
    // The payer is given Safaricom's own id, and nothing that names the callback's address.
    assert.deepEqual(result, { kind: 'pending', providerReference: CHECKOUT });
    const [signin, push] = stub.calls;
    assert.equal(signin!.url, `${BASE}/oauth/v1/generate?grant_type=client_credentials`);
    assert.equal((signin!.init.headers as Record<string, string>).Authorization, `Basic ${Buffer.from('synthetic-key:synthetic-secret').toString('base64')}`);
    assert.equal(push!.url, `${BASE}/mpesa/stkpush/v1/processrequest`);
    assert.equal((push!.init.headers as Record<string, string>).Authorization, 'Bearer tok');
    const raw = String(push!.init.body);
    // The amount is a number in the JSON, written as its own digits.
    assert.match(raw, /"Amount":1250,/u);
    const sent = JSON.parse(raw);
    assert.match(sent.Timestamp, /^\d{14}$/u);
    assert.equal(sent.Password, mpesaPassword('174379', 'synthetic-passkey', sent.Timestamp));
    const { CallBackURL, ...rest } = sent;
    assert.deepEqual(rest, {
      BusinessShortCode: '174379',
      Password: sent.Password,
      Timestamp: sent.Timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: 1250,
      PartyA: '254712345678',
      PartyB: '174379',
      PhoneNumber: '254712345678',
      AccountReference: 'AyahSpring',
      TransactionDesc: 'Course',
    });
    // What the payer is shown fits Safaricom's limits.
    assert.ok(sent.AccountReference.length <= 12 && sent.TransactionDesc.length <= 13);
    // The address is this provider's, and names this order under a code that fits.
    assert.ok(CallBackURL.startsWith(`${CALLBACK}?o=${ORDER}&n=`));
    assert.equal(orderOfMpesaCallback(CFG, CallBackURL), ORDER);
    // A second attempt has another address.
    await provider().createCheckout(request());
    assert.notEqual(JSON.parse(String(stub.calls.at(-1)!.init.body)).CallBackURL, CallBackURL);
  } finally {
    stub.restore();
  }
  // To a till: "Buy Goods", paid to the till, under the store's shortcode.
  const till = stubFetch([TOKEN, { match: '/processrequest', reply: { body: { CheckoutRequestID: CHECKOUT, ResponseCode: '0' } } }]);
  try {
    await provider({ till: '5551234' }).createCheckout(request({ amount: kes(100n) }));
    const sent = JSON.parse(String(till.calls[1]!.init.body));
    assert.deepEqual([sent.TransactionType, sent.BusinessShortCode, sent.PartyB, sent.Amount], ['CustomerBuyGoodsOnline', '174379', '5551234', 1]);
  } finally {
    till.restore();
  }
  // A large amount keeps every digit.
  const large = stubFetch([TOKEN, { match: '/processrequest', reply: { body: { CheckoutRequestID: CHECKOUT, ResponseCode: '0' } } }]);
  try {
    await provider().createCheckout(request({ amount: kes(9007199254740993_00n) }));
    assert.match(String(large.calls[1]!.init.body), /"Amount":9007199254740993,/u);
  } finally {
    large.restore();
  }
});

test('nobody is prompted for cents, another currency, nothing, or on another country\'s network', async () => {
  const stub = stubFetch([]);
  try {
    for (const [label, over] of [
      ['a total with cents', { amount: kes(125050n) }],
      ['another currency', { amount: { amountMinor: 125000n, currency: 'UGX' } }],
      ['nothing', { amount: kes(0n) }],
      ['a number in Uganda', { msisdn: '+256772123456' }],
      ['no number', { msisdn: undefined }],
      ['an order id that is not one', { orderId: 'ORD-1' }],
    ] as [string, Record<string, unknown>][]) {
      await assert.rejects(provider().createCheckout(request(over)), Error, label);
    }
    assert.equal(stub.calls.length, 0, 'Safaricom was asked about a payment that should never have started');
    await assert.rejects(new MpesaProvider(null).createCheckout(request()), /not configured/u);
  } finally {
    stub.restore();
  }
  assert.equal(provider().accepts(kes(125000n)), true);
  assert.equal(provider().accepts(kes(125001n)), false);
  assert.equal(new MpesaProvider(null).accepts(kes(125000n)), false);
});

test('"started nothing" is said only when it is certain, and Daraja\'s sentences are not kept', async () => {
  const attempt = async (token: Reply, push: Reply) => {
    const stub = stubFetch([{ match: '/oauth/v1/generate', reply: token }, { match: '/processrequest', reply: push }]);
    try {
      const error = await provider().createCheckout(request()).then(() => null, (e: unknown) => e);
      return { error, pushes: stub.calls.filter((c) => c.url.includes('/processrequest')).length };
    } finally {
      stub.restore();
    }
  };
  const SENTENCE = 'SYNTHETIC Invalid PhoneNumber 254712345678';
  // It could not sign in: no prompt was asked for.
  for (const token of [{ status: 401, text: '' }, { status: 400, body: { errorCode: '400.008.01' } }, 'network', { body: { expires_in: '3599' } }] as Reply[]) {
    const { error, pushes } = await attempt(token, { body: { CheckoutRequestID: CHECKOUT, ResponseCode: '0' } });
    assert.ok(error instanceof PaymentNotStartedError);
    assert.equal(error.code, 'signin');
    assert.equal(pushes, 0);
  }
  // Refused outright.
  for (const status of [400, 401, 403, 404]) {
    const { error } = await attempt(TOKEN.reply, { status, body: { requestId: 'x', errorCode: `${status}.002.02`, errorMessage: SENTENCE } });
    assert.ok(error instanceof PaymentNotStartedError, String(status));
    assert.equal(error.code, `http_${status}`);
    assert.ok(!error.message.includes('SYNTHETIC') && !error.message.includes('254712345678'));
  }
  // The request went out and the answer leaves it in doubt: never "started nothing".
  for (const [label, push, message] of [
    ['500, a subscriber already in a transaction', { status: 500, body: { errorCode: '500.001.1001', errorMessage: SENTENCE } }, 'M-Pesa could not start this payment (500): 500.001.1001'],
    ['503', { status: 503, text: '<html>busy</html>' }, 'M-Pesa could not start this payment (503): no code'],
    ['409', { status: 409, body: {} }, 'M-Pesa could not start this payment (409): no code'],
    ['200 with another response code', { body: { ResponseCode: '1', errorMessage: SENTENCE } }, 'M-Pesa could not start this payment (200): no code'],
    ['200 with no id', { body: { ResponseCode: '0' } }, 'M-Pesa could not start this payment (200): no code'],
    ['200 with an id that is not one', { body: { ResponseCode: '0', CheckoutRequestID: 'ws CO/../x' } }, 'M-Pesa could not start this payment (200): no code'],
  ] as [string, Reply, string][]) {
    const { error, pushes } = await attempt(TOKEN.reply, push);
    assert.ok(error instanceof Error && !(error instanceof PaymentNotStartedError), label);
    assert.equal(error.message, message, label);
    assert.equal(pushes, 1, label);
  }
  const lost = await attempt(TOKEN.reply, 'network');
  assert.ok(lost.error instanceof Error && !(lost.error instanceof PaymentNotStartedError), 'a lost connection was called "started nothing"');
});

// ---------------------------------------------------------------------------
// The callback
// ---------------------------------------------------------------------------

test('a callback is believed about nothing, and is not even looked up unless its address was made here', () => {
  const p = provider();
  const event = p.parseWebhookEvent(callback(), { url: goodUrl() });
  assert.equal(event.kind, 'payment.succeeded');
  if (event.kind !== 'payment.succeeded') return;
  assert.equal(event.eventId, CHECKOUT);
  assert.equal(event.orderId, ORDER);
  // The reference carries the order beside Safaricom's id, under a code; the amount in the body is not taken.
  assert.ok(event.providerReference.startsWith(`${CHECKOUT}~${ORDER}~`));
  assert.deepEqual(event.amount, kes(0n));

  const failed = p.parseWebhookEvent(callback({ ResultCode: 1032, ResultDesc: 'Request cancelled by user', CallbackMetadata: undefined }), { url: goodUrl() });
  assert.deepEqual(failed.kind === 'payment.failed' && [failed.eventId, failed.orderId, failed.reason], [CHECKOUT, ORDER, 'mpesa_1032']);
  // Written as a string, as the status query writes it.
  assert.equal(p.parseWebhookEvent(callback({ ResultCode: '0' }), { url: goodUrl() }).kind, 'payment.succeeded');

  // The same body anywhere else is ignored: no order, and nothing to ask Safaricom about.
  for (const [label, url] of [
    ['the bare address', CALLBACK],
    ['an address for another order with this order\'s code', (() => { const u = new URL(goodUrl()); u.searchParams.set('o', OTHER_ORDER); return u.toString(); })()],
    ['no address', undefined],
  ] as [string, string | undefined][]) {
    const ignored = p.parseWebhookEvent(callback(), url === undefined ? undefined : { url });
    assert.equal(ignored.kind, 'ignored', label);
    if (ignored.kind === 'ignored') assert.match(ignored.reason, /not made by this platform/u, label);
  }
  // With no account there is no key, and so no good address.
  assert.equal(new MpesaProvider(null).parseWebhookEvent(callback(), { url: goodUrl() }).kind, 'ignored');

  for (const [label, payload] of [
    ['no result code', callback({ ResultCode: undefined })],
    ['a result that is a sentence', callback({ ResultCode: 'paid in full' })],
    ['an id that is not one', callback({ CheckoutRequestID: '../../x y' })],
    ['a paybill confirmation', { TransactionType: 'Pay Bill', TransID: 'SLK4X9P2QA', TransAmount: '1250.00' }],
    ['nothing', null],
    ['a word', 'paid'],
  ] as [string, unknown][]) {
    assert.equal(p.parseWebhookEvent(payload, { url: goodUrl() }).kind, 'ignored', label);
  }
  assert.equal(p.verifyWebhookSignature(JSON.stringify(callback()), 'anything'), false);
});

// ---------------------------------------------------------------------------
// What happened to a prompt
// ---------------------------------------------------------------------------

const boundReference = () => {
  const event = provider().parseWebhookEvent(callback(), { url: goodUrl() });
  assert.equal(event.kind, 'payment.succeeded');
  return event.kind === 'payment.succeeded' ? event.providerReference : '';
};

async function statusWith(reply: Reply, reference: string, token: Reply = TOKEN.reply) {
  const stub = stubFetch([{ match: '/oauth/v1/generate', reply: token }, { match: '/mpesa/stkpushquery/v1/query', reply }]);
  try {
    const status = await provider().fetchPaymentStatus(reference);
    return { status, queries: stub.calls.filter((c) => c.url.includes('/stkpushquery/')) };
  } finally {
    stub.restore();
  }
}
const answered = (over: Record<string, unknown> = {}) => ({ ResponseCode: '0', ResponseDescription: 'The service request has been accepted successsfully', MerchantRequestID: '29115-34620561-1', CheckoutRequestID: CHECKOUT, ResultCode: '0', ResultDesc: 'The service request is processed successfully.', ...over });

test('a paid prompt is a success for the order its callback address named, at no amount of Safaricom\'s', async () => {
  const { status, queries } = await statusWith({ body: answered() }, boundReference());
  // Safaricom's own id is what is recorded; the order comes from the address; there is no amount to compare.
  assert.deepEqual(status, { state: 'succeeded', providerReference: CHECKOUT, amount: null, financialTransactionId: null, orderId: ORDER });
  assert.equal(queries.length, 1);
  const sent = JSON.parse(String(queries[0]!.init.body));
  assert.deepEqual(sent, { BusinessShortCode: '174379', Password: mpesaPassword('174379', 'synthetic-passkey', sent.Timestamp), Timestamp: sent.Timestamp, CheckoutRequestID: CHECKOUT });
  // The webhook's rule then records the order's own total, and settles no other order.
  if (status.state !== 'succeeded') return;
  const bind = (claimed: string) => bindPayment({ claimedOrderId: claimed, confirmedOrderId: status.orderId, confirmedAmount: status.amount, order: { totalMinor: 125000n, currency: 'KES' } });
  assert.deepEqual(bind(ORDER), { ok: true, amount: kes(125000n), amountFrom: 'order' });
  assert.deepEqual(bind(OTHER_ORDER), { ok: false, why: 'other_order' });
  // The code as a number, as the callback writes it.
  assert.equal((await statusWith({ body: answered({ ResultCode: 0, ResponseCode: 0 }) }, boundReference())).status.state, 'succeeded');
});

test('Safaricom\'s bare id names no order: a success for it settles nothing', async () => {
  const { status } = await statusWith({ body: answered() }, CHECKOUT);
  assert.deepEqual(status, { state: 'succeeded', providerReference: CHECKOUT, amount: null, financialTransactionId: null, orderId: null });
  if (status.state !== 'succeeded') return;
  assert.deepEqual(
    bindPayment({ claimedOrderId: ORDER, confirmedOrderId: status.orderId, confirmedAmount: status.amount, order: { totalMinor: 125000n, currency: 'KES' } }),
    { ok: false, why: 'no_order' },
  );
});

test('a reference this server did not make is never sent to Safaricom', async () => {
  const good = boundReference();
  const [id, order, code] = good.split('~') as [string, string, string];
  for (const [label, reference] of [
    ['another order beside the same code', `${id}~${OTHER_ORDER}~${code}`],
    ['another prompt beside the same code', `ws_CO_another~${order}~${code}`],
    ['a code one character off', `${id}~${order}~${code.slice(0, -1)}${code.endsWith('A') ? 'B' : 'A'}`],
    ['no code', `${id}~${order}~`],
    ['two parts', `${id}~${order}`],
    ['four parts', `${good}~x`],
    ['an id with a path in it', '../v1/query'],
    ['an empty reference', ''],
  ] as [string, string][]) {
    const { status, queries } = await statusWith({ body: answered() }, reference);
    assert.equal(status.state, 'unknown', label);
    assert.equal(queries.length, 0, label);
  }
  const none = await new MpesaProvider(null).fetchPaymentStatus(good);
  assert.deepEqual(none, { state: 'unknown', providerReference: good, reason: 'M-Pesa is not configured' });
});

test('not answered yet is pending; a known ending is failed; anything else is unknown, never failed', async () => {
  const reference = boundReference();
  // The payer has not typed their PIN. Safaricom says so with HTTP 500.
  for (const reply of [
    { status: 500, body: { requestId: 'ws_CO_x', errorCode: '500.001.1001', errorMessage: 'The transaction is being processed' } },
    { body: answered({ ResultCode: '4999', ResultDesc: 'The transaction is still under processing' }) },
  ] as Reply[]) {
    assert.deepEqual((await statusWith(reply, reference)).status, { state: 'pending', providerReference: CHECKOUT });
  }
  for (const code of ['1', '1001', '1019', '1025', '1032', '1037', '2001']) {
    assert.deepEqual((await statusWith({ body: answered({ ResultCode: code, ResultDesc: 'x 254712345678' }) }, reference)).status, { state: 'failed', providerReference: CHECKOUT, reason: `mpesa_${code}`, orderId: ORDER }, code);
  }
  for (const [label, reply, token] of [
    ['a result code nobody here knows', { body: answered({ ResultCode: '7777' }) }, undefined],
    ['no result code', { body: answered({ ResultCode: undefined }) }, undefined],
    ['an answer about another prompt', { body: answered({ CheckoutRequestID: 'ws_CO_another' }) }, undefined],
    ['a response code that is not 0', { body: answered({ ResponseCode: '1' }) }, undefined],
    ['another 500', { status: 500, body: { errorCode: '500.001.1000', errorMessage: 'x 254712345678' } }, undefined],
    ['a token Safaricom refuses', { status: 404, body: { errorCode: '404.001.03', errorMessage: 'Invalid Access Token' } }, undefined],
    ['not JSON', { status: 502, text: '<html>bad gateway</html>' }, undefined],
    ['an empty answer', { text: '' }, undefined],
    ['the connection dropped', 'network', undefined],
    ['it could not sign in', { body: answered() }, { status: 401, text: '' }],
  ] as [string, Reply, Reply | undefined][]) {
    const { status } = await statusWith(reply, reference, token);
    assert.equal(status.state, 'unknown', label);
    if (status.state === 'unknown') assert.ok(!status.reason.includes('254712345678'), label);
  }
});

test('a refund says it is not built, and asks Safaricom nothing', async () => {
  const stub = stubFetch([]);
  try {
    await assert.rejects(provider().requestRefund({ providerReference: CHECKOUT, amount: kes(125000n), reason: 'x' }), /not built into this platform/u);
    assert.equal(stub.calls.length, 0);
  } finally {
    stub.restore();
  }
});

// ---------------------------------------------------------------------------
// The source
// ---------------------------------------------------------------------------

test('the adapter keeps codes and no sentences, limits every request, and says what it has not met', () => {
  const source = readFileSync(new URL('./payments/mpesa.ts', import.meta.url), 'utf8');
  const code = source.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/gu, '');
  assert.doesNotMatch(code, /errorMessage|ResultDesc|ResponseDescription|CustomerMessage/u);
  assert.equal(code.split('await fetch(').length - 1, 3);
  assert.equal(code.split('signal: AbortSignal.timeout(TIMEOUT_MS)').length - 1, 3);
  // The amount never passes through a float.
  assert.doesNotMatch(code, /Number\(|parseFloat|toFixed/u);
  assert.match(source, /\*\*Written from descriptions of Daraja and run against nothing\.\*\*/u);
  assert.match(source, /\*\*No request has been sent\n \* to Safaricom\.\*\*/u);
  assert.match(source, /\*\*What it does not prove, said plainly:\*\*/u);

  // The webhook hands the adapter the address a callback came to, and records the reference the provider's answer gives.
  const webhook = readFileSync(new URL('./payments/webhook.ts', import.meta.url), 'utf8');
  assert.ok(webhook.includes('provider.parseWebhookEvent(payload, { url: request.url })'));
  assert.equal(webhook.split('providerReference: status.providerReference,').length - 1, 2);
  assert.equal(webhook.split('providerReference: event.providerReference').length - 1, 0);
});
