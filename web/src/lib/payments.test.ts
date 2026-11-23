import assert from 'node:assert/strict';
import test from 'node:test';

import { readFileSync } from 'node:fs';
import { MtnMomoProvider, mtnMomoConfigFromEnv } from './payments/mtn-momo.ts';
import {
  AirtelMoneyProvider,
  airtelConfigFromEnv,
  airtelTransactionId,
  orderOfAirtelTransaction,
} from './payments/airtel.ts';
import { UnconfiguredPaymentProvider } from './payments/provider.ts';
import {
  availableProviders,
  getPaymentProvider,
  knownProviderIds,
  providersForCurrency,
  providerNameOf,
} from './payments/registry.ts';
import { AIRTEL_MARKETS, MTN_MOMO_MARKETS, internationalDigits, isNumberOf, nationalDigits } from './payments/markets.ts';
import { bindPayment, failureIsFor } from './payments/binding.ts';
import { toMajorString } from './money.ts';
import { clearTokenCache } from './payments/oauth.ts';

// ---------------------------------------------------------------------------
// What these tests are for.
//
// Neither MTN MoMo nor Airtel Money signs its callbacks. That single fact
// drives most of what could go badly wrong here, and the failures are
// financial rather than cosmetic:
//
//   * trusting a callback body lets anyone who knows an order id mark it paid
//   * reading an unreachable provider as "failed" invites a retry on a payment
//     that already succeeded, and charges the customer twice
//   * sending minor units where the provider expects major units charges 100x
//     the order — or 1/100th of it
//
// So the assertions aim at those, not at whether a request was constructed.
// ---------------------------------------------------------------------------

type Call = { url: string; init: RequestInit };

/** Stub global fetch, returning canned responses per URL substring. */
function stubFetch(
  routes: { match: string; status?: number; body?: unknown; text?: string }[],
) {
  const calls: Call[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: unknown, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init: init ?? {} });
    const hit = routes.find((r) => url.includes(r.match));
    const status = hit?.status ?? 200;
    const text = hit?.text ?? (hit?.body === undefined ? '' : JSON.stringify(hit.body));
    return new Response(text, { status, headers: { 'content-type': 'application/json' } });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any;
  clearTokenCache();
  return {
    calls,
    restore: () => {
      globalThis.fetch = original;
      clearTokenCache();
    },
  };
}

/** An order's id: Airtel's transaction id is made from it, so it has to be one. */
const ORDER = '0b6f3d2e-5a41-4c7e-9d10-3e8f2a6b7c55';

const MTN_CFG = {
  country: 'UG',
  currency: 'UGX',
  baseUrl: 'https://sandbox.momodeveloper.mtn.com',
  targetEnvironment: 'sandbox',
  subscriptionKey: 'sub-key',
  apiUser: 'api-user',
  apiKey: 'api-key',
};

const AIRTEL_CFG = {
  baseUrl: 'https://openapiuat.airtel.africa',
  clientId: 'cid',
  clientSecret: 'csecret',
  country: 'UG',
  currency: 'UGX',
  refundPath: '/merchant/v1/payments/refund/',
};

const TOKEN = { body: { access_token: 'tok-1', expires_in: 3600 } };

const uganda = (minor: bigint) => ({ amountMinor: minor, currency: 'UGX' });

// ---------------------------------------------------------------------------
// Money on the wire
// ---------------------------------------------------------------------------

test('a zero-decimal currency is sent as a plain integer string', () => {
  // UGX has no subunit. The obvious bug is emitting "30000.00", which some
  // providers reject and others silently read as 3,000,000.
  assert.equal(toMajorString(uganda(30000n)), '30000');
  assert.equal(toMajorString(uganda(0n)), '0');
});

test('a two-decimal currency is sent with exactly two places', () => {
  assert.equal(toMajorString({ amountMinor: 10050n, currency: 'KES' }), '100.50');
  assert.equal(toMajorString({ amountMinor: 5n, currency: 'KES' }), '0.05');
  assert.equal(toMajorString({ amountMinor: 10000n, currency: 'KES' }), '100.00');
});

test('a negative amount keeps its sign', () => {
  assert.equal(toMajorString({ amountMinor: -10050n, currency: 'KES' }), '-100.50');
});

test('a large amount does not lose precision', () => {
  // Past Number.MAX_SAFE_INTEGER, so any float on this path would corrupt it.
  const big = 9007199254740993n;
  assert.equal(toMajorString(uganda(big)), '9007199254740993');
});

// ---------------------------------------------------------------------------
// Trust model
// ---------------------------------------------------------------------------

test('both mobile money providers declare that they cannot be trusted by signature', () => {
  // This is the fact the whole webhook design turns on. If it ever changes —
  // MTN ships a signature scheme, say — this test should fail and force a
  // deliberate decision rather than the change going unnoticed.
  assert.equal(new MtnMomoProvider(MTN_CFG).webhookTrust, 'requery');
  assert.equal(new AirtelMoneyProvider(AIRTEL_CFG).webhookTrust, 'requery');
});

test('MTN never verifies a signature, however plausible it looks', () => {
  const p = new MtnMomoProvider(MTN_CFG);
  assert.equal(p.verifyWebhookSignature('{"status":"SUCCESSFUL"}', 'anything'), false);
  assert.equal(p.verifyWebhookSignature('{}', null), false);
});

test('Airtel never verifies a signature', () => {
  const p = new AirtelMoneyProvider(AIRTEL_CFG);
  assert.equal(p.verifyWebhookSignature('{"transaction":{"status_code":"TS"}}', 'sig'), false);
});

test('the unconfigured provider claims signature trust so it rejects everything', () => {
  // webhookTrust 'requery' here would mean an unconfigured deployment tried to
  // re-query a provider it has no credentials for. 'signature' plus a verify
  // that always returns false is the combination that refuses every callback.
  const p = new UnconfiguredPaymentProvider();
  assert.equal(p.webhookTrust, 'signature');
  assert.equal(p.verifyWebhookSignature('{}', 'x'), false);
  assert.equal(p.available, false);
});

test('an unconfigured provider answers unknown rather than failed', async () => {
  const p = new UnconfiguredPaymentProvider();
  const status = await p.fetchPaymentStatus('ref-1');
  assert.equal(status.state, 'unknown');
});

// ---------------------------------------------------------------------------
// MTN MoMo
// ---------------------------------------------------------------------------

test('MTN sends the amount in major units, not minor', async () => {
  const net = stubFetch([
    { match: '/collection/token/', ...TOKEN },
    { match: '/collection/v1_0/requesttopay', status: 202 },
  ]);
  try {
    const p = new MtnMomoProvider(MTN_CFG);
    await p.createCheckout({
      orderId: 'order-1',
      amount: uganda(30000n),
      returnUrl: 'https://x.test/back',
      description: 'Tajweed basics',
      msisdn: '+256772123456',
    });

    const sent = net.calls.find((c) => c.url.includes('requesttopay'));
    assert.ok(sent, 'no requesttopay call was made');
    const body = JSON.parse(String(sent.init.body));
    assert.equal(body.amount, '30000', `sent ${body.amount}; must be major units`);
    assert.equal(body.currency, 'UGX');
    // The stored number has a plus; MTN's MSISDN does not.
    assert.equal(body.payer.partyId, '256772123456');
    assert.equal(body.payer.partyIdType, 'MSISDN');
    assert.equal(body.externalId, 'order-1');
  } finally {
    net.restore();
  }
});

test('MTN refuses to start a payment with no handset number', async () => {
  const net = stubFetch([{ match: '/collection/token/', ...TOKEN }]);
  try {
    const p = new MtnMomoProvider(MTN_CFG);
    await assert.rejects(
      () =>
        p.createCheckout({
          orderId: 'order-1',
          amount: uganda(30000n),
          returnUrl: 'https://x.test/back',
          description: 'x',
        }),
      /mobile money number/i,
    );
    assert.equal(
      net.calls.some((c) => c.url.includes('requesttopay')),
      false,
      'must not call the provider without a number to prompt',
    );
  } finally {
    net.restore();
  }
});

test('MTN treats 202 with an empty body as success', async () => {
  const net = stubFetch([
    { match: '/collection/token/', ...TOKEN },
    { match: '/collection/v1_0/requesttopay', status: 202, text: '' },
  ]);
  try {
    const p = new MtnMomoProvider(MTN_CFG);
    const result = await p.createCheckout({
      orderId: 'order-1',
      amount: uganda(30000n),
      returnUrl: 'https://x.test/back',
      description: 'x',
      msisdn: '+256772123456',
    });
    assert.equal(result.kind, 'pending');
    if (result.kind === 'pending') {
      assert.match(result.providerReference, /^[0-9a-f-]{36}$/, 'must return a UUID reference');
    }
  } finally {
    net.restore();
  }
});

test('MTN status SUCCESSFUL is parsed with the amount exactly', async () => {
  const net = stubFetch([
    { match: '/collection/token/', ...TOKEN },
    {
      match: '/collection/v1_0/requesttopay/',
      body: {
        status: 'SUCCESSFUL',
        amount: '30000',
        currency: 'UGX',
        financialTransactionId: 'ftid-1',
      },
    },
  ]);
  try {
    const status = await new MtnMomoProvider(MTN_CFG).fetchPaymentStatus('ref-1');
    assert.equal(status.state, 'succeeded');
    if (status.state === 'succeeded') {
      assert.equal(status.amount?.amountMinor, 30000n);
      assert.equal(status.amount?.currency, 'UGX');
      assert.equal(status.financialTransactionId, 'ftid-1');
    }
  } finally {
    net.restore();
  }
});

test('MTN reports unknown, not failed, when the provider cannot be reached', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async () => {
    throw new Error('network down');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any;
  clearTokenCache();
  try {
    const status = await new MtnMomoProvider(MTN_CFG).fetchPaymentStatus('ref-1');
    assert.equal(
      status.state,
      'unknown',
      'an unreachable provider must not be reported as a failed payment',
    );
  } finally {
    globalThis.fetch = original;
    clearTokenCache();
  }
});

test('MTN reports unknown when the amount cannot be read exactly', async () => {
  // Success with an unparseable amount must not become a recorded payment of
  // zero. Zero in the ledger is worse than a pending order.
  const net = stubFetch([
    { match: '/collection/token/', ...TOKEN },
    {
      match: '/collection/v1_0/requesttopay/',
      body: { status: 'SUCCESSFUL', amount: 'thirty thousand', currency: 'UGX' },
    },
  ]);
  try {
    const status = await new MtnMomoProvider(MTN_CFG).fetchPaymentStatus('ref-1');
    assert.equal(status.state, 'unknown');
  } finally {
    net.restore();
  }
});

test('MTN parses FAILED with the provider reason', async () => {
  const net = stubFetch([
    { match: '/collection/token/', ...TOKEN },
    {
      match: '/collection/v1_0/requesttopay/',
      body: { status: 'FAILED', reason: { code: 'PAYER_NOT_FOUND', message: 'No such subscriber' } },
    },
  ]);
  try {
    const status = await new MtnMomoProvider(MTN_CFG).fetchPaymentStatus('ref-1');
    assert.equal(status.state, 'failed');
    if (status.state === 'failed') assert.match(status.reason, /No such subscriber/);
  } finally {
    net.restore();
  }
});

test('MTN refuses to refund without disbursement credentials', async () => {
  // There is no refund on the Collections product. Refusing loudly is correct;
  // a refund recorded as sent but never despatched is the expensive mistake.
  const p = new MtnMomoProvider(MTN_CFG);
  await assert.rejects(
    () => p.requestRefund({ providerReference: 'ref-1', amount: uganda(1000n), reason: 'x' }),
    /Disbursements/i,
  );
});

test('an unconfigured MTN provider is not available', () => {
  assert.equal(new MtnMomoProvider(null).available, false);
});

// ---------------------------------------------------------------------------
// Airtel Money
// ---------------------------------------------------------------------------

test('Airtel sends country and currency headers and major-unit amount', async () => {
  const net = stubFetch([
    { match: '/auth/oauth2/token', ...TOKEN },
    { match: '/merchant/v1/payments/', body: { transaction: { id: 'txn-1' } } },
  ]);
  try {
    const p = new AirtelMoneyProvider(AIRTEL_CFG);
    await p.createCheckout({
      orderId: ORDER,
      amount: uganda(30000n),
      returnUrl: 'https://x.test/back',
      description: 'x',
      msisdn: '+256772123456',
    });

    const sent = net.calls.find((c) => c.url.includes('/merchant/v1/payments/'));
    assert.ok(sent, 'no payment call was made');
    const headers = sent.init.headers as Record<string, string>;
    assert.equal(headers['X-Country'], 'UG');
    assert.equal(headers['X-Currency'], 'UGX');
    const body = JSON.parse(String(sent.init.body));
    assert.equal(body.transaction.amount, '30000');
    // Airtel takes the number without the country's code: the country is in
    // the header. The whole stored number is not a number in Uganda.
    assert.equal(body.subscriber.msisdn, '772123456');
    assert.equal(body.reference, ORDER);
    // The transaction id carries the order, so its status is that order's.
    assert.match(body.transaction.id, /^0b6f3d2e5a414c7e9d103e8f2a6b7c55[0-9a-f]{4}$/);
  } finally {
    net.restore();
  }
});

test('Airtel refuses an order priced in a currency the account is not configured for', async () => {
  const net = stubFetch([{ match: '/auth/oauth2/token', ...TOKEN }]);
  try {
    const p = new AirtelMoneyProvider(AIRTEL_CFG);
    await assert.rejects(
      () =>
        p.createCheckout({
          orderId: ORDER,
          amount: { amountMinor: 1000n, currency: 'KES' },
          returnUrl: 'https://x.test/back',
          description: 'x',
          msisdn: '+256772123456',
        }),
      /configured for UGX/i,
    );
    assert.equal(
      net.calls.some((c) => c.url.includes('/merchant/v1/payments/')),
      false,
      'must not attempt a payment in the wrong currency',
    );
  } finally {
    net.restore();
  }
});

test('Airtel maps TS, TF and TIP correctly', async () => {
  for (const [code, expected] of [
    ['TS', 'succeeded'],
    ['TF', 'failed'],
    ['TIP', 'pending'],
  ] as const) {
    const net = stubFetch([
      { match: '/auth/oauth2/token', ...TOKEN },
      {
        match: '/standard/v1/payments/',
        body: {
          transaction: {
            status: code,
            amount: '30000',
            currency: 'UGX',
            airtel_money_id: 'AM-1',
            message: 'msg',
          },
        },
      },
    ]);
    try {
      const status = await new AirtelMoneyProvider(AIRTEL_CFG).fetchPaymentStatus('txn-1');
      assert.equal(status.state, expected, `status ${code} mapped to ${status.state}`);
    } finally {
      net.restore();
    }
  }
});

test('Airtel TIP is not an outcome', async () => {
  // In-progress must never be recorded as a failure, or the payer is told to
  // try again while the first payment is still settling.
  const net = stubFetch([
    { match: '/auth/oauth2/token', ...TOKEN },
    { match: '/standard/v1/payments/', body: { transaction: { status: 'TIP' } } },
  ]);
  try {
    const status = await new AirtelMoneyProvider(AIRTEL_CFG).fetchPaymentStatus('txn-1');
    assert.equal(status.state, 'pending');
  } finally {
    net.restore();
  }
});

test('an Airtel success with no amount is a success with no amount, never a zero-value payment', async () => {
  // Airtel's answer, as documented: wrapped in `data`, and with no amount in
  // it. This used to be read at the top level and called "unknown", so no
  // Airtel payment could have settled.
  const reference = '0b6f3d2e5a414c7e9d103e8f2a6b7c55ab12';
  const net = stubFetch([
    { match: '/auth/oauth2/token', ...TOKEN },
    {
      match: '/standard/v1/payments/',
      body: {
        data: { transaction: { airtel_money_id: 'AM-9', id: reference, message: 'success', status: 'TS' } },
        status: { code: '200', success: true },
      },
    },
  ]);
  try {
    const status = await new AirtelMoneyProvider(AIRTEL_CFG).fetchPaymentStatus(reference);
    assert.equal(status.state, 'succeeded');
    if (status.state === 'succeeded') {
      assert.equal(status.amount, null, 'an amount nobody reported was made up');
      assert.equal(status.financialTransactionId, 'AM-9');
      // The order is read out of the id the status was asked for by.
      assert.equal(status.orderId, ORDER);
    }
    // An id this platform did not make names no order, and so settles none.
    const foreign = await new AirtelMoneyProvider(AIRTEL_CFG).fetchPaymentStatus('txn-1');
    assert.equal(foreign.state, 'succeeded');
    if (foreign.state === 'succeeded') assert.equal(foreign.orderId, null);
  } finally {
    net.restore();
  }
});

test('MTN says which order a payment was for, from its own answer', async () => {
  const net = stubFetch([
    { match: '/collection/token/', ...TOKEN },
    {
      match: '/collection/v1_0/requesttopay/',
      body: { status: 'SUCCESSFUL', amount: '30000', currency: 'UGX', externalId: ORDER, financialTransactionId: 'f-1' },
    },
  ]);
  try {
    const status = await new MtnMomoProvider(MTN_CFG).fetchPaymentStatus('ref-1');
    assert.equal(status.state, 'succeeded');
    if (status.state === 'succeeded') assert.equal(status.orderId, ORDER);
  } finally {
    net.restore();
  }
  // An answer that does not say is not filled in from anywhere else.
  const silent = stubFetch([
    { match: '/collection/token/', ...TOKEN },
    { match: '/collection/v1_0/requesttopay/', body: { status: 'SUCCESSFUL', amount: '30000', currency: 'UGX' } },
  ]);
  try {
    const status = await new MtnMomoProvider(MTN_CFG).fetchPaymentStatus('ref-1');
    if (status.state === 'succeeded') assert.equal(status.orderId, null);
  } finally {
    silent.restore();
  }
});

// ---------------------------------------------------------------------------
// A number is a number of the market's country
// ---------------------------------------------------------------------------

test('each service refuses a number from another country, and an order in another currency', async () => {
  const net = stubFetch([
    { match: '/collection/token/', ...TOKEN },
    { match: '/auth/oauth2/token', ...TOKEN },
  ]);
  try {
    const order = { orderId: ORDER, returnUrl: 'https://x.test/back', description: 'x' };
    // A Kenyan number to Uganda's accounts.
    await assert.rejects(
      () => new MtnMomoProvider(MTN_CFG).createCheckout({ ...order, amount: uganda(1000n), msisdn: '+254712345678' }),
      /another country/i,
    );
    await assert.rejects(
      () => new AirtelMoneyProvider(AIRTEL_CFG).createCheckout({ ...order, amount: uganda(1000n), msisdn: '+254712345678' }),
      /another country/i,
    );
    // A number that was never made international.
    await assert.rejects(
      () => new MtnMomoProvider(MTN_CFG).createCheckout({ ...order, amount: uganda(1000n), msisdn: '0772123456' }),
      /another country/i,
    );
    // Shillings of the wrong country.
    await assert.rejects(
      () =>
        new MtnMomoProvider(MTN_CFG).createCheckout({
          ...order,
          amount: { amountMinor: 1000n, currency: 'KES' },
          msisdn: '+256772123456',
        }),
      /collects UGX/i,
    );
    assert.equal(
      net.calls.some((c) => c.url.includes('requesttopay') || c.url.includes('/merchant/v1/payments/')),
      false,
      'a payment was started for a number or a currency the account cannot take',
    );
  } finally {
    net.restore();
  }
});

test('a market in another country is paid with that country\'s number, header and currency', async () => {
  const net = stubFetch([
    { match: '/collection/token/', ...TOKEN },
    { match: '/collection/v1_0/requesttopay', status: 202 },
    { match: '/auth/oauth2/token', ...TOKEN },
    { match: '/merchant/v1/payments/', body: {} },
  ]);
  try {
    const ghana = new MtnMomoProvider(
      { ...MTN_CFG, country: 'GH', currency: 'GHS', baseUrl: 'https://proxy.momoapi.mtn.com', targetEnvironment: 'mtnghana' },
      'mtn_momo_gh',
    );
    assert.equal(ghana.id, 'mtn_momo_gh');
    assert.deepEqual(ghana.market, { country: 'GH', currency: 'GHS' });
    await ghana.createCheckout({
      orderId: ORDER,
      amount: { amountMinor: 5000n, currency: 'GHS' },
      returnUrl: 'https://x.test/back',
      description: 'x',
      msisdn: '+233241234567',
    });
    const momo = net.calls.find((c) => c.url.includes('requesttopay'));
    assert.ok(momo);
    assert.ok(momo.url.startsWith('https://proxy.momoapi.mtn.com/'));
    assert.equal((momo.init.headers as Record<string, string>)['X-Target-Environment'], 'mtnghana');
    const sent = JSON.parse(String(momo.init.body));
    assert.equal(sent.payer.partyId, '233241234567');
    assert.equal(sent.currency, 'GHS');
    // Cedis have pesewas: fifty cedis, in major units.
    assert.equal(sent.amount, '50.00');

    const kenya = new AirtelMoneyProvider(
      { ...AIRTEL_CFG, country: 'KE', currency: 'KES', baseUrl: 'https://openapi.airtel.africa' },
      'airtel_money_ke',
    );
    assert.deepEqual(kenya.market, { country: 'KE', currency: 'KES' });
    await kenya.createCheckout({
      orderId: ORDER,
      amount: { amountMinor: 150000n, currency: 'KES' },
      returnUrl: 'https://x.test/back',
      description: 'x',
      msisdn: '+254733123456',
    });
    const airtel = net.calls.find((c) => c.url.includes('/merchant/v1/payments/'));
    assert.ok(airtel);
    const headers = airtel.init.headers as Record<string, string>;
    assert.equal(headers['X-Country'], 'KE');
    assert.equal(headers['X-Currency'], 'KES');
    const body = JSON.parse(String(airtel.init.body));
    // Kenya's code is three digits and so is Uganda's; the number that is left is Kenya's.
    assert.equal(body.subscriber.msisdn, '733123456');
    assert.equal(body.subscriber.country, 'KE');
  } finally {
    net.restore();
  }
});

test('Airtel reports unknown when the provider cannot be reached', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async () => {
    throw new Error('network down');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any;
  clearTokenCache();
  try {
    const status = await new AirtelMoneyProvider(AIRTEL_CFG).fetchPaymentStatus('txn-1');
    assert.equal(status.state, 'unknown');
  } finally {
    globalThis.fetch = original;
    clearTokenCache();
  }
});

test('an unconfigured Airtel provider is not available', () => {
  assert.equal(new AirtelMoneyProvider(null).available, false);
});

// ---------------------------------------------------------------------------
// Notification parsing — pointers, never proof
// ---------------------------------------------------------------------------

test('an MTN success notification carries the order id but is only a pointer', () => {
  const event = new MtnMomoProvider(MTN_CFG).parseWebhookEvent({
    status: 'SUCCESSFUL',
    externalId: 'order-1',
    referenceId: 'ref-1',
    amount: '999999',
    currency: 'UGX',
  });
  assert.equal(event.kind, 'payment.succeeded');
  if (event.kind === 'payment.succeeded') {
    assert.equal(event.orderId, 'order-1');
    assert.equal(event.providerReference, 'ref-1');
    // The forged amount is parsed into the event, but the webhook handler
    // replaces it with the authenticated answer before recording anything.
    // This assertion documents that the event alone is not what gets stored.
    assert.equal(event.amount.amountMinor, 999999n);
  }
});

test('an MTN notification with no externalId cannot be matched and is ignored', () => {
  const event = new MtnMomoProvider(MTN_CFG).parseWebhookEvent({ status: 'SUCCESSFUL' });
  assert.equal(event.kind, 'ignored');
});

test('an Airtel notification maps TS to a succeeded pointer', () => {
  const event = new AirtelMoneyProvider(AIRTEL_CFG).parseWebhookEvent({
    reference: 'order-1',
    transaction: { status_code: 'TS', id: 'txn-1', amount: '30000', currency: 'UGX' },
  });
  assert.equal(event.kind, 'payment.succeeded');
  if (event.kind === 'payment.succeeded') {
    assert.equal(event.orderId, 'order-1');
    assert.equal(event.providerReference, 'txn-1');
  }
});

test('an Airtel TIP notification is ignored rather than treated as an outcome', () => {
  const event = new AirtelMoneyProvider(AIRTEL_CFG).parseWebhookEvent({
    reference: 'order-1',
    transaction: { status_code: 'TIP', id: 'txn-1' },
  });
  assert.equal(event.kind, 'ignored');
  if (event.kind === 'ignored') assert.match(event.reason, /in progress/);
});

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

test('the registry knows both providers even when neither is configured', () => {
  // Registered in code, available only with credentials. That is what lets a
  // provider ship before its merchant account is approved.
  const p = getPaymentProvider('mtn_momo');
  assert.equal(p.id, 'mtn_momo');
  assert.equal(p.available, false);
  assert.equal(getPaymentProvider('airtel_money').id, 'airtel_money');
});

test('an unknown provider id falls back to unconfigured rather than throwing', () => {
  const p = getPaymentProvider('not_a_provider');
  assert.equal(p.id, 'unconfigured');
  assert.equal(p.available, false);
  // A service in a country it does not operate in is not a provider either.
  for (const id of ['mtn_momo_ke', 'airtel_money_gh', 'airtel_money_ng', 'mtn_momo_', 'mtn_momo_GH', 'mpesa_tz', 'mpesa_KE', 'orange_sn']) {
    assert.equal(getPaymentProvider(id).id, 'unconfigured', id);
  }
});

test('a service is known in each country it can be configured for, and available in none without credentials', () => {
  assert.deepEqual(Object.keys(MTN_MOMO_MARKETS).sort(), ['BJ', 'CG', 'CI', 'CM', 'GH', 'GN', 'LR', 'SZ', 'UG', 'ZA', 'ZM']);
  assert.deepEqual(Object.keys(AIRTEL_MARKETS).sort(), ['CD', 'CG', 'GA', 'KE', 'MG', 'MW', 'NE', 'RW', 'SC', 'TD', 'TZ', 'UG', 'ZM']);
  const ids = knownProviderIds();
  // The two direct services, each with its countries; then pawaPay's callback
  // provider, its sixteen brands, and each brand's operators (`pawapay.test.ts`).
  // And Safaricom's M-Pesa: the service, and Kenya (`mpesa.test.ts`).
  assert.equal(ids.length, 2 + 11 + 13 + 1 + 16 + 44 + 2);
  for (const id of ['mtn_momo', 'mtn_momo_gh', 'mtn_momo_ug', 'airtel_money', 'airtel_money_ke', 'airtel_money_ug']) {
    assert.ok(ids.includes(id), id);
    const provider = getPaymentProvider(id);
    assert.equal(provider.id, id);
    assert.equal(provider.available, false);
    assert.equal(provider.market, null, 'an account with no credentials collects nothing anywhere');
  }
});

/** Runs with these variables set and puts the environment back afterwards. */
function withEnv(values: Record<string, string>, run: () => void) {
  const before = new Map(Object.keys(values).map((key) => [key, process.env[key]]));
  Object.assign(process.env, values);
  try {
    run();
  } finally {
    for (const [key, value] of before) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test('each country has its own credentials, host, header and currency', () => {
  withEnv(
    {
      MTN_MOMO_GH_SUBSCRIPTION_KEY: 'gh-sub',
      MTN_MOMO_GH_API_USER: 'gh-user',
      MTN_MOMO_GH_API_KEY: 'gh-key',
      AIRTEL_KE_CLIENT_ID: 'ke-id',
      AIRTEL_KE_CLIENT_SECRET: 'ke-secret',
      AIRTEL_CD_CLIENT_ID: 'cd-id',
      AIRTEL_CD_CLIENT_SECRET: 'cd-secret',
      AIRTEL_CD_CURRENCY: 'usd',
    },
    () => {
      assert.deepEqual(mtnMomoConfigFromEnv('GH'), {
        country: 'GH',
        currency: 'GHS',
        baseUrl: 'https://proxy.momoapi.mtn.com',
        targetEnvironment: 'mtnghana',
        subscriptionKey: 'gh-sub',
        apiUser: 'gh-user',
        apiKey: 'gh-key',
        callbackUrl: undefined,
        disbursement: undefined,
      });
      assert.equal(mtnMomoConfigFromEnv('UG'), null, 'Ghana\'s credentials configured Uganda');
      assert.equal(mtnMomoConfigFromEnv(), null);

      assert.deepEqual(
        availableProviders().map((p) => [p.id, p.label, p.market]),
        [
          ['mtn_momo_gh', 'MTN MoMo', { country: 'GH', currency: 'GHS' }],
          ['airtel_money_ke', 'Airtel Money', { country: 'KE', currency: 'KES' }],
          // The Congo's account is in dollars because it was said to be.
          ['airtel_money_cd', 'Airtel Money', { country: 'CD', currency: 'USD' }],
        ],
      );
      // An order is offered the accounts that collect its currency, and no other.
      assert.deepEqual(providersForCurrency('KES').map((p) => p.id), ['airtel_money_ke']);
      assert.deepEqual(providersForCurrency('ghs').map((p) => p.id), ['mtn_momo_gh']);
      assert.deepEqual(providersForCurrency('UGX'), []);
      assert.deepEqual(providersForCurrency(null), []);
    },
  );
});

test('the names without a country are one market: Uganda, or the country they name', () => {
  withEnv({ MTN_MOMO_SUBSCRIPTION_KEY: 's', MTN_MOMO_API_USER: 'u', MTN_MOMO_API_KEY: 'k' }, () => {
    const only = availableProviders();
    assert.deepEqual(only.map((p) => [p.id, p.market]), [['mtn_momo', { country: 'UG', currency: 'UGX' }]]);
    // They keep the sandbox they always defaulted to.
    assert.equal(mtnMomoConfigFromEnv()?.targetEnvironment, 'sandbox');
    assert.equal(mtnMomoConfigFromEnv()?.baseUrl, 'https://sandbox.momodeveloper.mtn.com');

    withEnv({ MTN_MOMO_COUNTRY: 'zm' }, () => {
      assert.deepEqual(availableProviders().map((p) => p.market), [{ country: 'ZM', currency: 'ZMW' }]);
    });
    // A country MTN's API does not serve configures nothing.
    withEnv({ MTN_MOMO_COUNTRY: 'KE' }, () => assert.deepEqual(availableProviders(), []));

    // Uganda configured both ways is offered once, under its own names.
    withEnv({ MTN_MOMO_UG_SUBSCRIPTION_KEY: 's2', MTN_MOMO_UG_API_USER: 'u2', MTN_MOMO_UG_API_KEY: 'k2' }, () => {
      assert.deepEqual(availableProviders().map((p) => p.id), ['mtn_momo_ug']);
      // The older id still answers: its callbacks may still be on their way.
      assert.equal(getPaymentProvider('mtn_momo').available, true);
    });
  });
  withEnv({ AIRTEL_CLIENT_ID: 'c', AIRTEL_CLIENT_SECRET: 's', AIRTEL_COUNTRY: 'TZ' }, () => {
    assert.deepEqual(availableProviders().map((p) => [p.id, p.market]), [['airtel_money', { country: 'TZ', currency: 'TZS' }]]);
    assert.equal(airtelConfigFromEnv()?.baseUrl, 'https://openapiuat.airtel.africa');
  });
});

test('a stored number is written each provider\'s way, and never cut to fit', () => {
  assert.equal(internationalDigits('+256772123456'), '256772123456');
  assert.equal(nationalDigits('+256772123456', 'UG'), '772123456');
  assert.equal(nationalDigits('+254733123456', 'KE'), '733123456');
  // One digit of code, and four.
  assert.equal(nationalDigits('+27821234567', 'ZA'), '821234567');
  assert.equal(nationalDigits('+2250701234567', 'CI'), '0701234567');
  // Another country's number has no national form here.
  assert.equal(nationalDigits('+254733123456', 'UG'), null);
  assert.equal(nationalDigits('256772123456', 'UG'), null);
  assert.equal(nationalDigits('+256', 'UG'), null);
  assert.equal(nationalDigits('+256772123456', 'XX'), null);
  assert.equal(isNumberOf('+233241234567', 'GH'), true);
  assert.equal(isNumberOf('+233241234567', 'UG'), false);
});

test('an Airtel transaction id carries its order, and only an id made that way names one', () => {
  const id = airtelTransactionId(ORDER);
  assert.match(id, /^[0-9a-f]{36}$/);
  assert.equal(orderOfAirtelTransaction(id), ORDER);
  assert.notEqual(airtelTransactionId(ORDER), id, 'a second attempt reused the first one\'s id');
  assert.equal(orderOfAirtelTransaction('txn-1'), null);
  assert.equal(orderOfAirtelTransaction(ORDER), null);
  assert.throws(() => airtelTransactionId('order-1'), /UUID/);
  // What Airtel posts carries the transaction and no reference of ours.
  const event = new AirtelMoneyProvider(AIRTEL_CFG).parseWebhookEvent({
    transaction: { id, message: 'Paid', status_code: 'TS', airtel_money_id: 'AM-1' },
  });
  assert.equal(event.kind, 'payment.succeeded');
  if (event.kind === 'payment.succeeded') {
    assert.equal(event.orderId, ORDER);
    assert.equal(event.providerReference, id);
  }
});

// ---------------------------------------------------------------------------
// One order's payment is not another order's
// ---------------------------------------------------------------------------

test('a confirmed payment settles only the order the provider says it was for, at that order\'s total', () => {
  const order = { totalMinor: 30000n, currency: 'UGX' };
  const paid = { amountMinor: 30000n, currency: 'UGX' };
  assert.deepEqual(
    bindPayment({ claimedOrderId: ORDER, confirmedOrderId: ORDER, confirmedAmount: paid, order }),
    { ok: true, amount: paid, amountFrom: 'provider' },
  );
  // Case and spaces are not a different order.
  assert.equal(bindPayment({ claimedOrderId: ORDER.toUpperCase(), confirmedOrderId: ` ${ORDER} `, confirmedAmount: paid, order }).ok, true);

  // The forgery this exists for: a cheap order's real payment, presented for a dear one.
  const dear = '9c1d7a55-0b2e-4f6a-8d3c-5e7f9a1b2c3d';
  assert.deepEqual(
    bindPayment({ claimedOrderId: dear, confirmedOrderId: ORDER, confirmedAmount: paid, order: { totalMinor: 900000n, currency: 'UGX' } }),
    { ok: false, why: 'other_order' },
  );
  // The provider does not say: nothing is settled on the notification's word.
  for (const silent of [null, '', '   ']) {
    assert.deepEqual(bindPayment({ claimedOrderId: ORDER, confirmedOrderId: silent, confirmedAmount: paid, order }), { ok: false, why: 'no_order' });
  }
  assert.deepEqual(bindPayment({ claimedOrderId: ORDER, confirmedOrderId: ORDER, confirmedAmount: paid, order: null }), { ok: false, why: 'order_missing' });
  // Less, more, and the same number in another currency.
  for (const amountMinor of [29999n, 30001n, 0n]) {
    assert.deepEqual(
      bindPayment({ claimedOrderId: ORDER, confirmedOrderId: ORDER, confirmedAmount: { amountMinor, currency: 'UGX' }, order }),
      { ok: false, why: 'amount' },
    );
  }
  assert.deepEqual(
    bindPayment({ claimedOrderId: ORDER, confirmedOrderId: ORDER, confirmedAmount: { amountMinor: 30000n, currency: 'KES' }, order }),
    { ok: false, why: 'currency' },
  );
  // No amount in the answer (Airtel): the order's own total, and said to be.
  assert.deepEqual(
    bindPayment({ claimedOrderId: ORDER, confirmedOrderId: ORDER, confirmedAmount: null, order }),
    { ok: true, amount: { amountMinor: 30000n, currency: 'UGX' }, amountFrom: 'order' },
  );

  assert.equal(failureIsFor(ORDER, ORDER), true);
  assert.equal(failureIsFor(ORDER, dear), false);
  assert.equal(failureIsFor(ORDER, null), false);
  assert.equal(failureIsFor(ORDER, undefined), false);
});

test('the webhook asks whose payment it is before it records anything', () => {
  const source = readFileSync(new URL('./payments/webhook.ts', import.meta.url), 'utf8');
  const bound = source.indexOf('bindPayment({');
  assert.ok(bound > 0, 'the webhook no longer binds a payment to its order');
  assert.ok(source.includes('confirmedOrderId: status.orderId'));
  assert.ok(source.includes('if (!failureIsFor(claimed, status.orderId))'));
  // What a notification says the order is, is compared and never believed;
  // one that says nothing leaves the provider's answer as the only word.
  assert.ok(source.includes("const claimed = event.orderId.trim() !== '' ? event.orderId : confirmedOrder ?? '';"));
  assert.ok(source.includes('claimedOrderId: claimed,'));
  assert.ok(source.includes('order: await orderNamed(admin, claimed),'));
  assert.equal(source.split('orderId: event.orderId').length - 1, 0, 'an order is recorded as a notification named it');
  // "Not yet" is answered so that a provider which redelivers does; "not this
  // order's" is not. Nothing else would look again.
  assert.ok(source.includes("const again = checked.status === 'still_pending' || checked.status === 'unverified';"));
  assert.ok(source.includes("again ? { status: 503, headers: { 'Retry-After': '60' } } : undefined,"));
  // What an adapter or the database said is logged, and not sent to whoever posted.
  assert.ok(source.includes(": 'the provider could not confirm this payment just now',"));
  assert.match(source, /could not be confirmed: \$\{status\.reason\}`\);/u);
  assert.equal(source.split('reason: error.message').length - 1, 0, 'the database\'s sentence is sent to the caller');
  // The order is read with the claimed id only after the id is checked to be one.
  assert.match(source, /if \(!\/\^\[0-9a-f\]\{8\}-/u);
  // A status holds a bigint; it is made writable before it is stored.
  assert.equal(source.split('statusResponse: status,').length - 1, 0);
  assert.ok(source.split('statusResponse: printable(status)').length - 1 >= 2);
});

test('with no credentials configured, nothing is available', () => {
  // Depends on the test environment having no MTN_*/AIRTEL_* variables, which
  // is the normal case. If this fails, real credentials are in the environment
  // and the assertion below is the one to read.
  const has = process.env.MTN_MOMO_API_KEY || process.env.AIRTEL_CLIENT_ID;
  if (!has) assert.equal(availableProviders().length, 0);
});

test('a receipt names a payment service by its own name, and names nobody it has never heard of', () => {
  // The same with and without credentials: a receipt outlives an account.
  assert.equal(providerNameOf('mtn_momo'), 'MTN MoMo');
  assert.equal(providerNameOf('mtn_momo_ug'), 'MTN MoMo');
  assert.equal(providerNameOf(' mtn_momo_ug '), 'MTN MoMo');
  assert.equal(providerNameOf('airtel_money_ug'), 'Airtel Money');
  assert.equal(providerNameOf('mpesa_ke'), 'M-Pesa');
  // Every id a provider could have been recorded under has a name with no underscore in it.
  for (const id of knownProviderIds()) {
    const name = providerNameOf(id);
    assert.ok(name && !name.includes('_') && name !== 'Payments not configured', `${id}: ${name}`);
  }
  // A country the service is not in, a service nobody wrote, and what is not an id.
  assert.equal(providerNameOf('mtn_momo_zz'), null);
  assert.equal(providerNameOf('stripe'), null);
  assert.equal(providerNameOf('unconfigured'), null);
  assert.equal(providerNameOf(''), null);
  assert.equal(providerNameOf(null), null);
  assert.equal(providerNameOf('__proto__'), null);
});

test('an id that is a name every object has is nobody, and does not throw', () => {
  // These reach the registry from a callback's address.
  for (const id of ['__proto__', 'constructor', 'toString', 'constructor_ug', 'hasOwnProperty_ke', '__proto___ug']) {
    assert.equal(getPaymentProvider(id).id, 'unconfigured', id);
    assert.equal(getPaymentProvider(id).available, false, id);
    assert.equal(providerNameOf(id), null, id);
  }
});
