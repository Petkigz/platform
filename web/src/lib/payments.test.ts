import assert from 'node:assert/strict';
import test from 'node:test';

import { MtnMomoProvider } from './payments/mtn-momo.ts';
import { AirtelMoneyProvider } from './payments/airtel.ts';
import { UnconfiguredPaymentProvider } from './payments/provider.ts';
import { availableProviders, getPaymentProvider } from './payments/registry.ts';
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

const MTN_CFG = {
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
      msisdn: '256772123456',
    });

    const sent = net.calls.find((c) => c.url.includes('requesttopay'));
    assert.ok(sent, 'no requesttopay call was made');
    const body = JSON.parse(String(sent.init.body));
    assert.equal(body.amount, '30000', `sent ${body.amount}; must be major units`);
    assert.equal(body.currency, 'UGX');
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
      msisdn: '256772123456',
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
      assert.equal(status.amount.amountMinor, 30000n);
      assert.equal(status.amount.currency, 'UGX');
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
      orderId: 'order-1',
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
    // The stored E.164 number must not reach Airtel with a leading '+'.
    assert.equal(body.subscriber.msisdn, '256772123456');
    assert.equal(body.reference, 'order-1');
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
          orderId: 'order-1',
          amount: { amountMinor: 1000n, currency: 'KES' },
          returnUrl: 'https://x.test/back',
          description: 'x',
          msisdn: '+254700000000',
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

test('Airtel refuses to record a success with no usable amount', async () => {
  const net = stubFetch([
    { match: '/auth/oauth2/token', ...TOKEN },
    { match: '/standard/v1/payments/', body: { transaction: { status: 'TS' } } },
  ]);
  try {
    const status = await new AirtelMoneyProvider(AIRTEL_CFG).fetchPaymentStatus('txn-1');
    assert.equal(
      status.state,
      'unknown',
      'a success with no amount must not become a zero-value payment',
    );
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
});

test('with no credentials configured, nothing is available', () => {
  // Depends on the test environment having no MTN_*/AIRTEL_* variables, which
  // is the normal case. If this fails, real credentials are in the environment
  // and the assertion below is the one to read.
  const has = process.env.MTN_MOMO_API_KEY || process.env.AIRTEL_CLIENT_ID;
  if (!has) assert.equal(availableProviders().length, 0);
});
