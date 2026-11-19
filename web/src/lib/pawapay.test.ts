import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  PAWAPAY_CALLBACK_ID,
  PawaPayProvider,
  pawaPayAmount,
  pawaPayConfigFromEnv,
  pawaPayEnabledCodes,
  parsePawaPayAmount,
  type PawaPayConfig,
} from './payments/pawapay.ts';
import { PAWAPAY_BRANDS } from './payments/markets.ts';
import {
  availableProviders,
  getPaymentProvider,
  knownProviderIds,
  providersForAmount,
  providersForCurrency,
} from './payments/registry.ts';
import { bindPayment } from './payments/binding.ts';
import { findCountry } from './phone.ts';

// ---------------------------------------------------------------------------
// What these tests are, and are not.
//
// Every answer "pawaPay" gives below is typed here from pawaPay's published
// documentation (https://docs.pawapay.io/v2, read 2026-11-19). Nothing in
// this file has been sent to pawaPay: this platform has no account there.
// They show that the adapter does what the documentation asks and fails in
// the safe direction when an answer is not what it expects. They do not show
// that the documentation is what pawaPay does.
//
// The failures aimed at are the expensive ones:
//
//   * a payment for one order settling another
//   * "no answer" read as "failed", so a payer is told to pay again
//   * an amount rounded to fit an operator that takes no fraction
//   * a payer's phone number written into a log
// ---------------------------------------------------------------------------

type Call = { url: string; init: RequestInit };
type Reply = { status?: number; body?: unknown; text?: string } | 'network';

/** Stub global fetch: the first route whose `match` is in the URL answers; a list answers in turn. */
function stubFetch(routes: { match: string; method?: string; reply: Reply | Reply[] }[]) {
  const calls: Call[] = [];
  const original = globalThis.fetch;
  const turns = new Map<number, number>();
  globalThis.fetch = (async (input: unknown, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init: init ?? {} });
    const method = (init?.method ?? 'GET').toUpperCase();
    const index = routes.findIndex((r) => url.includes(r.match) && (r.method ?? method) === method);
    if (index < 0) throw new Error(`no stub for ${method} ${url}`);
    const route = routes[index]!;
    let reply: Reply;
    if (Array.isArray(route.reply)) {
      const turn = turns.get(index) ?? 0;
      turns.set(index, turn + 1);
      reply = route.reply[Math.min(turn, route.reply.length - 1)]!;
    } else reply = route.reply;
    if (reply === 'network') throw new TypeError('fetch failed');
    const text = reply.text ?? (reply.body === undefined ? '' : JSON.stringify(reply.body));
    return new Response(text, { status: reply.status ?? 200, headers: { 'content-type': 'application/json' } });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any;
  return { calls, restore: () => { globalThis.fetch = original; } };
}

/** Runs with console.error collected instead of printed, and gives back what was said. */
async function quietly<T>(run: () => Promise<T>): Promise<{ value?: T; error?: unknown; said: string[] }> {
  const said: string[] = [];
  const original = console.error;
  console.error = (...parts: unknown[]) => { said.push(parts.map(String).join(' ')); };
  try {
    return { value: await run(), said };
  } catch (error) {
    return { error, said };
  } finally {
    console.error = original;
  }
}

/** Runs with these variables set (undefined: unset) and puts the environment back afterwards. */
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

const NONE = {
  PAWAPAY_API_TOKEN: undefined,
  PAWAPAY_PROVIDERS: undefined,
  PAWAPAY_BASE_URL: undefined,
  PAWAPAY_CUSTOMER_MESSAGE: undefined,
};

const ORDER = '0b6f3d2e-5a41-4c7e-9d10-3e8f2a6b7c55';
const OTHER_ORDER = '11111111-2222-4333-8444-555555555555';
const DEPOSIT = 'f4401bd2-1568-4140-bf2d-eb77d2b2b639';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const BASE = 'https://api.sandbox.pawapay.io';

const config = (brand: string, country: string): PawaPayConfig => {
  const known = PAWAPAY_BRANDS[brand]!;
  const operator = known.countries[country]!;
  return {
    baseUrl: BASE,
    token: 'synthetic-token',
    customerMessage: 'AyahSpring course',
    operator: { ...operator, country, label: operator.label ?? known.label },
  };
};
const mpesaKenya = () => new PawaPayProvider(config('mpesa', 'KE'), 'pawapay_mpesa_ke');
const mtnZambia = () => new PawaPayProvider(config('mtn', 'ZM'), 'pawapay_mtn_zm');
const callback = () =>
  new PawaPayProvider({ baseUrl: BASE, token: 'synthetic-token', customerMessage: 'AyahSpring course', operator: null });

const kes = (minor: bigint) => ({ amountMinor: minor, currency: 'KES' });
const zmw = (minor: bigint) => ({ amountMinor: minor, currency: 'ZMW' });

/** A deposit as the status endpoint writes one back. */
const found = (over: Record<string, unknown> = {}) => ({
  status: 'FOUND',
  data: {
    depositId: DEPOSIT,
    status: 'COMPLETED',
    amount: '1250.00',
    currency: 'KES',
    country: 'KEN',
    payer: { type: 'MMO', accountDetails: { phoneNumber: '254712345678', provider: 'MPESA_KEN' } },
    customerMessage: 'AyahSpring course',
    clientReferenceId: ORDER,
    created: '2026-11-19T08:17:01Z',
    providerTransactionId: 'SLK4X9P2QA',
    metadata: { orderId: ORDER },
    ...over,
  },
});

// ---------------------------------------------------------------------------
// The table
// ---------------------------------------------------------------------------

/** ISO 3166-1 alpha-2 to alpha-3, for the countries in the table. pawaPay's codes end in the second. */
const ALPHA3: Record<string, string> = {
  BJ: 'BEN', BF: 'BFA', CM: 'CMR', CI: 'CIV', CD: 'COD', ET: 'ETH', GA: 'GAB', GH: 'GHA', KE: 'KEN', LS: 'LSO', MW: 'MWI',
  MZ: 'MOZ', NG: 'NGA', CG: 'COG', RW: 'RWA', SN: 'SEN', SL: 'SLE', TZ: 'TZA', UG: 'UGA', ZM: 'ZMB', ZW: 'ZWE',
};

test('every operator is one code in one country this platform can read a number of', () => {
  const codes: string[] = [];
  for (const [brand, known] of Object.entries(PAWAPAY_BRANDS)) {
    // The short name is part of an id and of an address.
    assert.match(brand, /^[a-z]{3,12}$/u, brand);
    assert.ok(known.label.trim() !== '', brand);
    for (const [country, operator] of Object.entries(known.countries)) {
      const where = `${brand} ${country}`;
      assert.ok(ALPHA3[country], `${where}: a country this test does not know`);
      assert.ok(findCountry(country), `${where}: no way to read a number of this country`);
      // A code written against the wrong country would prompt nobody, or somebody else.
      assert.ok(operator.code.endsWith(`_${ALPHA3[country]}`), `${where}: ${operator.code}`);
      assert.match(operator.code, /^[A-Z][A-Z_]+$/u, where);
      assert.match(operator.currency, /^[A-Z]{3}$/u, where);
      assert.equal(typeof operator.decimals, 'boolean', where);
      codes.push(operator.code);
    }
  }
  assert.equal(new Set(codes).size, codes.length, 'one code is in the table twice');
  assert.equal(codes.length, 44);
  assert.equal(Object.keys(ALPHA3).length, 21);
  assert.deepEqual([...new Set(Object.values(PAWAPAY_BRANDS).flatMap((b) => Object.keys(b.countries)))].sort(), Object.keys(ALPHA3).sort());
  // The ones the adapter cannot carry out: a page of the operator's own, or a code typed first.
  for (const absent of ['WAVE_CIV', 'WAVE_SEN', 'ORANGE_BFA']) assert.ok(!codes.includes(absent), absent);
  // The two with an adapter of their own say so, and nobody else does.
  assert.deepEqual(
    Object.entries(PAWAPAY_BRANDS).filter(([, b]) => b.direct).map(([name, b]) => [name, b.direct]),
    [['mtn', 'mtn_momo'], ['airtel', 'airtel_money']],
  );
  // A few read off the documentation by hand, so a slip in copying is seen.
  assert.deepEqual(PAWAPAY_BRANDS.mpesa!.countries.KE, { code: 'MPESA_KEN', currency: 'KES', decimals: false });
  assert.deepEqual(PAWAPAY_BRANDS.mtn!.countries.UG, { code: 'MTN_MOMO_UGA', currency: 'UGX', decimals: true });
  assert.deepEqual(PAWAPAY_BRANDS.airtel!.countries.UG, { code: 'AIRTEL_OAPI_UGA', currency: 'UGX', decimals: false });
  assert.deepEqual(PAWAPAY_BRANDS.orange!.countries.SN, { code: 'ORANGE_SEN', currency: 'XOF', decimals: false });
  assert.deepEqual(PAWAPAY_BRANDS.ecocash!.countries.ZW, { code: 'ECOCASH_ZWE', currency: 'USD', decimals: true });
});

// ---------------------------------------------------------------------------
// Money on the wire
// ---------------------------------------------------------------------------

test('an amount is written the one way pawaPay accepts: major units, no trailing zero', () => {
  // pawaPay's own pattern for an amount, from its API reference.
  const PATTERN = /^([0]|([1-9][0-9]{0,17}))([.][0-9]{0,3}[1-9])?$/u;
  for (const [amount, written] of [
    [zmw(1500n), '15'],
    [zmw(1550n), '15.5'],
    [zmw(1505n), '15.05'],
    [zmw(5n), '0.05'],
    [zmw(100n), '1'],
    [{ amountMinor: 50000n, currency: 'UGX' }, '50000'],
    [{ amountMinor: 5000n, currency: 'KWD' }, '5'],
    [{ amountMinor: 5001n, currency: 'KWD' }, '5.001'],
    [{ amountMinor: 900719925474099312n, currency: 'UGX' }, '900719925474099312'],
  ] as const) {
    assert.equal(pawaPayAmount(amount), written);
    assert.match(pawaPayAmount(amount), PATTERN);
  }
  // Nobody is prompted for nothing, or for less.
  assert.throws(() => pawaPayAmount(zmw(0n)));
  assert.throws(() => pawaPayAmount(zmw(-100n)));
});

test('an amount pawaPay writes back is read exactly or not at all', () => {
  assert.deepEqual(parsePawaPayAmount('123.00', 'ZMW'), zmw(12300n));
  assert.deepEqual(parsePawaPayAmount('15', 'ZMW'), zmw(1500n));
  assert.deepEqual(parsePawaPayAmount('15.5', 'ZMW'), zmw(1550n));
  assert.deepEqual(parsePawaPayAmount(15, 'ZMW'), zmw(1500n));
  // pawaPay writes cents for a currency that has none. Zeros are dropped; anything else is not rounded.
  assert.deepEqual(parsePawaPayAmount('100.00', 'RWF'), { amountMinor: 100n, currency: 'RWF' });
  assert.equal(parsePawaPayAmount('100.10', 'RWF'), null);
  assert.equal(parsePawaPayAmount('15.505', 'ZMW'), null);
  assert.deepEqual(parsePawaPayAmount('15.500', 'ZMW'), zmw(1550n));
  for (const [amount, currency] of [
    ['', 'ZMW'], ['-15', 'ZMW'], ['1e3', 'ZMW'], ['15,5', 'ZMW'], ['١٥', 'ZMW'], [null, 'ZMW'], [undefined, 'ZMW'], [{}, 'ZMW'],
    ['15', 'zmw'], ['15', ''], ['15', null], ['15', 'ZMWK'], ['1'.repeat(19), 'UGX'],
  ] as [unknown, unknown][]) {
    assert.equal(parsePawaPayAmount(amount, currency), null, `${String(amount)} ${String(currency)}`);
  }
});

// ---------------------------------------------------------------------------
// Configuration and the registry
// ---------------------------------------------------------------------------

test('with no token there is nothing; with a token and no list, nothing is offered', () => {
  withEnv(NONE, () => {
    assert.equal(pawaPayConfigFromEnv(), null);
    assert.equal(pawaPayConfigFromEnv('mpesa', 'KE'), null);
    assert.equal(getPaymentProvider('pawapay_mpesa_ke').available, false);
    assert.deepEqual(availableProviders().filter((p) => p.id.startsWith('pawapay')), []);
  });
  withEnv({ ...NONE, PAWAPAY_API_TOKEN: 'synthetic' }, () => {
    // The account exists, so its callback can be answered...
    assert.equal(pawaPayConfigFromEnv()?.operator, null);
    assert.equal(pawaPayConfigFromEnv()?.baseUrl, BASE, 'the test host unless told otherwise');
    // ...and no operator has been said to be enabled on it, so nobody is offered one.
    assert.equal(pawaPayConfigFromEnv('mpesa', 'KE'), null);
    assert.deepEqual(availableProviders(), []);
  });
});

test('an operator is offered only when the account is said to have it, in its country and currency', () => {
  withEnv({ ...NONE, PAWAPAY_API_TOKEN: 'synthetic', PAWAPAY_PROVIDERS: ' mpesa_ken, ORANGE_SEN\nMOOV_BEN ,NOT_A_CODE' }, () => {
    assert.deepEqual([...pawaPayEnabledCodes()].sort(), ['MOOV_BEN', 'MPESA_KEN', 'NOT_A_CODE', 'ORANGE_SEN']);
    assert.deepEqual(
      availableProviders().map((p) => [p.id, p.label, p.market]),
      [
        ['pawapay_mpesa_ke', 'M-Pesa', { country: 'KE', currency: 'KES' }],
        ['pawapay_orange_sn', 'Orange Money', { country: 'SN', currency: 'XOF' }],
        ['pawapay_moov_bj', 'Moov Money', { country: 'BJ', currency: 'XOF' }],
      ],
    );
    assert.deepEqual(providersForCurrency('KES').map((p) => p.id), ['pawapay_mpesa_ke']);
    assert.deepEqual(providersForCurrency('XOF').map((p) => p.id), ['pawapay_orange_sn', 'pawapay_moov_bj']);
    assert.deepEqual(providersForCurrency('TZS'), []);
    // M-Pesa in Tanzania is another operator with another code, and is not in the list.
    assert.equal(getPaymentProvider('pawapay_mpesa_tz').available, false);
    // Every one asks for a number and is confirmed by asking, never by signature.
    for (const provider of availableProviders()) {
      assert.equal(provider.requiresMsisdn, true);
      assert.equal(provider.webhookTrust, 'requery');
      assert.equal(provider.verifyWebhookSignature('{"depositId":"x"}', 'sig-pp=:anything:'), false);
    }
  });
  // A name that is another operator's wallet in that country.
  withEnv({ ...NONE, PAWAPAY_API_TOKEN: 'synthetic', PAWAPAY_PROVIDERS: 'AIRTEL_NGA' }, () => {
    assert.deepEqual(availableProviders().map((p) => [p.id, p.label]), [['pawapay_airtel_ng', 'Airtel SmartCash']]);
  });
  // Production, and a note of the owner's own; a note pawaPay would refuse is not sent.
  withEnv({ ...NONE, PAWAPAY_API_TOKEN: 'synthetic', PAWAPAY_BASE_URL: 'https://api.pawapay.io/', PAWAPAY_CUSTOMER_MESSAGE: 'Ayah Spring 2026' }, () => {
    assert.equal(pawaPayConfigFromEnv()?.baseUrl, 'https://api.pawapay.io');
    assert.equal(pawaPayConfigFromEnv()?.customerMessage, 'Ayah Spring 2026');
  });
  for (const bad of ['abc', 'A note that is far too long to send', 'Cours: été', 'pay@here']) {
    withEnv({ ...NONE, PAWAPAY_API_TOKEN: 'synthetic', PAWAPAY_CUSTOMER_MESSAGE: bad }, () => {
      assert.equal(pawaPayConfigFromEnv()?.customerMessage, 'AyahSpring course', bad);
    });
  }
});

test('the callback has a provider of its own, which can ask and can start nothing', async () => {
  const ids = knownProviderIds();
  assert.ok(ids.includes(PAWAPAY_CALLBACK_ID));
  for (const id of ['pawapay_mpesa_ke', 'pawapay_mtn_ug', 'pawapay_orange_sn', 'pawapay_ecocash_zw']) assert.ok(ids.includes(id), id);
  // Not an id: a country an operator is not in, pawaPay with a country and no operator, a wrong case.
  for (const id of ['pawapay_mpesa_ug', 'pawapay_ke', 'pawapay_wave_sn', 'pawapay_orange_bf', 'pawapay_mpesa_KE', 'pawapay_']) {
    assert.equal(getPaymentProvider(id).id, 'unconfigured', id);
  }
  withEnv({ ...NONE, PAWAPAY_API_TOKEN: 'synthetic', PAWAPAY_PROVIDERS: 'MPESA_KEN' }, () => {
    const provider = getPaymentProvider(PAWAPAY_CALLBACK_ID);
    assert.equal(provider.id, 'pawapay');
    assert.equal(provider.available, false, 'the callback provider is offered at checkout');
    assert.equal(provider.market, null);
    assert.ok(!availableProviders().some((p) => p.id === 'pawapay'));
    // And a brand with no country is nobody's operator.
    assert.equal(getPaymentProvider('pawapay_mpesa').available, false);
  });
  // With no operator it starts nothing, and asks pawaPay nothing to find that out.
  const stub = stubFetch([]);
  try {
    await assert.rejects(callback().createCheckout({ orderId: ORDER, amount: kes(125000n), returnUrl: 'https://x.invalid', description: 'x', msisdn: '+254712345678' }));
    assert.equal(stub.calls.length, 0);
    assert.equal(callback().accepts(kes(125000n)), false);
  } finally {
    stub.restore();
  }
});

test('where an operator has an account of its own in a country, that one is offered and the aggregator is not', () => {
  const pawa = { ...NONE, PAWAPAY_API_TOKEN: 'synthetic', PAWAPAY_PROVIDERS: 'MTN_MOMO_UGA,AIRTEL_OAPI_UGA,MTN_MOMO_RWA' };
  const noDirect = {
    MTN_MOMO_SUBSCRIPTION_KEY: undefined, MTN_MOMO_API_USER: undefined, MTN_MOMO_API_KEY: undefined, MTN_MOMO_COUNTRY: undefined,
    MTN_MOMO_UG_SUBSCRIPTION_KEY: undefined, MTN_MOMO_UG_API_USER: undefined, MTN_MOMO_UG_API_KEY: undefined,
    AIRTEL_CLIENT_ID: undefined, AIRTEL_CLIENT_SECRET: undefined, AIRTEL_COUNTRY: undefined,
  };
  withEnv({ ...noDirect, ...pawa }, () => {
    assert.deepEqual(availableProviders().map((p) => p.id), ['pawapay_mtn_rw', 'pawapay_mtn_ug', 'pawapay_airtel_ug']);
  });
  // MTN Uganda under its own names: pawaPay's MTN Uganda goes, its Airtel Uganda and MTN Rwanda stay.
  withEnv({ ...noDirect, ...pawa, MTN_MOMO_UG_SUBSCRIPTION_KEY: 's', MTN_MOMO_UG_API_USER: 'u', MTN_MOMO_UG_API_KEY: 'k' }, () => {
    assert.deepEqual(availableProviders().map((p) => p.id), ['mtn_momo_ug', 'pawapay_mtn_rw', 'pawapay_airtel_ug']);
  });
  // The same account under the names without a country, which mean Uganda.
  withEnv({ ...noDirect, ...pawa, MTN_MOMO_SUBSCRIPTION_KEY: 's', MTN_MOMO_API_USER: 'u', MTN_MOMO_API_KEY: 'k' }, () => {
    assert.deepEqual(availableProviders().map((p) => p.id), ['mtn_momo', 'pawapay_mtn_rw', 'pawapay_airtel_ug']);
  });
  // A direct Airtel account in another country takes nothing away in Uganda.
  withEnv({ ...noDirect, ...pawa, AIRTEL_CLIENT_ID: 'c', AIRTEL_CLIENT_SECRET: 's', AIRTEL_COUNTRY: 'TZ' }, () => {
    assert.deepEqual(availableProviders().map((p) => p.id), ['airtel_money', 'pawapay_mtn_rw', 'pawapay_mtn_ug', 'pawapay_airtel_ug']);
  });
  withEnv({ ...noDirect, ...pawa, AIRTEL_CLIENT_ID: 'c', AIRTEL_CLIENT_SECRET: 's' }, () => {
    assert.deepEqual(availableProviders().map((p) => p.id), ['airtel_money', 'pawapay_mtn_rw', 'pawapay_mtn_ug']);
  });
});

test('an operator that takes whole amounts is not offered a price with a fraction, which is never rounded', () => {
  withEnv({ ...NONE, PAWAPAY_API_TOKEN: 'synthetic', PAWAPAY_PROVIDERS: 'MPESA_KEN,MTN_MOMO_ZMB,VODACOM_TZA,AIRTEL_TZA' }, () => {
    assert.deepEqual(providersForAmount(kes(125000n)).map((p) => p.id), ['pawapay_mpesa_ke']);
    assert.deepEqual(providersForAmount(kes(125050n)), []);
    assert.deepEqual(providersForAmount(zmw(1550n)).map((p) => p.id), ['pawapay_mtn_zm']);
    // Two operators in one country and one currency: one takes cents and one does not.
    assert.deepEqual(providersForAmount({ amountMinor: 250050n, currency: 'TZS' }).map((p) => p.id), ['pawapay_airtel_tz']);
    assert.deepEqual(providersForAmount({ amountMinor: 250000n, currency: 'TZS' }).map((p) => p.id), ['pawapay_airtel_tz', 'pawapay_mpesa_tz']);
    assert.deepEqual(providersForAmount(null), []);
    assert.deepEqual(providersForAmount(kes(0n)), []);
  });
  assert.equal(mpesaKenya().accepts(kes(125000n)), true);
  assert.equal(mpesaKenya().accepts(kes(125001n)), false);
  assert.equal(mpesaKenya().accepts(zmw(125000n)), false);
  assert.equal(mtnZambia().accepts(zmw(1n)), true);
});

// ---------------------------------------------------------------------------
// Starting a payment
// ---------------------------------------------------------------------------

const request = (over: Record<string, unknown> = {}) => ({
  orderId: ORDER,
  amount: kes(125000n),
  returnUrl: 'https://example.invalid/orders',
  description: `Course purchase ${ORDER}`,
  msisdn: '+254712345678',
  ...over,
});

test('a deposit is sent as pawaPay documents it, with the order in it twice and nothing personal beside it', async () => {
  const stub = stubFetch([{ match: '/v2/deposits', method: 'POST', reply: { body: { depositId: 'ignored', status: 'ACCEPTED', created: '2026-11-19T08:17:01Z', nextStep: 'FINAL_STATUS' } } }]);
  try {
    const result = await mpesaKenya().createCheckout(request());
    assert.equal(result.kind, 'pending');
    assert.equal(stub.calls.length, 1);
    const call = stub.calls[0]!;
    assert.equal(call.url, `${BASE}/v2/deposits`);
    assert.equal(call.init.method, 'POST');
    const headers = call.init.headers as Record<string, string>;
    assert.equal(headers.Authorization, 'Bearer synthetic-token');
    assert.equal(headers['Content-Type'], 'application/json');
    const sent = JSON.parse(String(call.init.body));
    // The reference kept on the attempt is the id pawaPay was given: made here, a UUIDv4.
    assert.match(sent.depositId, UUID);
    assert.equal(result.kind === 'pending' && result.providerReference, sent.depositId);
    assert.deepEqual(sent, {
      depositId: sent.depositId,
      // The number with its country's code and no plus; the operator by pawaPay's code.
      payer: { type: 'MMO', accountDetails: { phoneNumber: '254712345678', provider: 'MPESA_KEN' } },
      // 1,250 shillings: major units, a string, no ".00".
      amount: '1250',
      currency: 'KES',
      clientReferenceId: ORDER,
      customerMessage: 'AyahSpring course',
      metadata: [{ orderId: ORDER }],
    });
    // A second attempt at the same order is another deposit.
    const again = await mpesaKenya().createCheckout(request());
    assert.notEqual(again.kind === 'pending' && again.providerReference, sent.depositId);
  } finally {
    stub.restore();
  }
  // An operator that takes cents is sent them, without a trailing zero.
  const cents = stubFetch([{ match: '/v2/deposits', method: 'POST', reply: { body: { status: 'ACCEPTED' } } }]);
  try {
    await mtnZambia().createCheckout(request({ amount: zmw(1550n), msisdn: '+260763456789' }));
    const sent = JSON.parse(String(cents.calls[0]!.init.body));
    assert.equal(sent.amount, '15.5');
    assert.deepEqual(sent.payer.accountDetails, { phoneNumber: '260763456789', provider: 'MTN_MOMO_ZMB' });
  } finally {
    cents.restore();
  }
});

test('nobody is prompted for the wrong amount, in the wrong currency, or on another country\'s network', async () => {
  const stub = stubFetch([]);
  try {
    for (const [label, over] of [
      ['a total with a fraction, through an operator that takes none', { amount: kes(125050n) }],
      ['another currency', { amount: zmw(125000n) }],
      ['nothing', { amount: kes(0n) }],
      ['a number in Uganda', { msisdn: '+256772123456' }],
      ['a number with no country code', { msisdn: '0712345678' }],
      ['no number', { msisdn: undefined }],
      ['an order id that is not one', { orderId: 'ORD-1' }],
    ] as [string, Record<string, unknown>][]) {
      await assert.rejects(mpesaKenya().createCheckout(request(over)), Error, label);
    }
    assert.equal(stub.calls.length, 0, 'a request was sent for a payment that should never have started');
  } finally {
    stub.restore();
  }
});

test('a refusal is its code: pawaPay\'s sentence quotes the number, and is not kept or logged', async () => {
  const MESSAGE = "The phone number '254712345678' seems to be invalid for the provider 'MPESA_KEN'.";
  for (const [label, reply, code] of [
    ['rejected with 200', { body: { depositId: DEPOSIT, status: 'REJECTED', failureReason: { failureCode: 'INVALID_PHONE_NUMBER', failureMessage: MESSAGE } } }, 'INVALID_PHONE_NUMBER'],
    ['an outage', { body: { status: 'REJECTED', failureReason: { failureCode: 'PROVIDER_TEMPORARILY_UNAVAILABLE', failureMessage: MESSAGE } } }, 'PROVIDER_TEMPORARILY_UNAVAILABLE'],
    ['outside the limits', { body: { depositId: null, status: 'REJECTED', failureReason: { failureCode: 'AMOUNT_OUT_OF_BOUNDS', failureMessage: MESSAGE } } }, 'AMOUNT_OUT_OF_BOUNDS'],
    ['a token that is wrong', { status: 403, body: { status: 'REJECTED', failureReason: { failureCode: 'AUTHENTICATION_ERROR', failureMessage: MESSAGE } } }, 'AUTHENTICATION_ERROR'],
    ['the operator not enabled', { status: 403, body: { failureReason: { failureCode: 'DEPOSITS_NOT_ALLOWED', failureMessage: MESSAGE } } }, 'DEPOSITS_NOT_ALLOWED'],
    ['a body it cannot parse', { status: 400, body: { status: 'REJECTED', failureReason: { failureCode: 'INVALID_INPUT', failureMessage: MESSAGE } } }, 'INVALID_INPUT'],
    ['a code that is a sentence', { body: { status: 'REJECTED', failureReason: { failureCode: MESSAGE } } }, 'REJECTED'],
    ['no reason at all', { status: 400, text: '<html>no</html>' }, 'HTTP_400'],
    ['a status nobody documented', { body: { status: 'QUEUED' } }, 'UNREADABLE_ANSWER'],
    ['an empty answer', { text: '' }, 'UNREADABLE_ANSWER'],
  ] as [string, Reply, string][]) {
    const stub = stubFetch([{ match: '/v2/deposits', method: 'POST', reply }]);
    try {
      const { error, said } = await quietly(() => mpesaKenya().createCheckout(request()));
      assert.ok(error instanceof Error, label);
      assert.equal((error as Error).message, `M-Pesa could not start this payment: ${code}`, label);
      assert.equal(said.length, 1, label);
      assert.ok(said[0]!.includes(code) && said[0]!.includes(ORDER) && said[0]!.includes('pawapay_mpesa_ke'), label);
      for (const text of [(error as Error).message, ...said]) assert.ok(!text.includes('254712345678') && !text.includes('seems to be'), `${label}: the number was kept`);
      // A definite no is not asked about again.
      assert.equal(stub.calls.length, 1, label);
    } finally {
      stub.restore();
    }
  }
});

test('no answer is not "try again": pawaPay is asked once whether it holds the deposit', async () => {
  // Nothing came back, and pawaPay has it: the payer may be looking at a prompt.
  for (const [label, first, held] of [
    ['the connection dropped, and it was accepted', 'network', { body: found({ status: 'ACCEPTED' }) }],
    ['pawaPay said 500, and it is processing', { status: 500, body: { failureReason: { failureCode: 'UNKNOWN_ERROR' } } }, { body: found({ status: 'PROCESSING' }) }],
    ['a gateway said 502, and it has already completed', { status: 502, text: '<html>bad gateway</html>' }, { body: found({ status: 'COMPLETED' }) }],
  ] as [string, Reply, Reply][]) {
    let sent = '';
    const stub = stubFetch([
      { match: '/v2/deposits/', method: 'GET', reply: held },
      { match: '/v2/deposits', method: 'POST', reply: first },
    ]);
    // The status answer has to be about the id that was sent, so it is filled in as it is asked for.
    const original = globalThis.fetch;
    globalThis.fetch = (async (input: unknown, init?: RequestInit) => {
      if ((init?.method ?? 'GET') === 'POST') sent = JSON.parse(String(init?.body)).depositId;
      const response = await original(input as never, init);
      if ((init?.method ?? 'GET') !== 'GET' || !response.ok) return response;
      const body = await response.json();
      body.data.depositId = sent;
      return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any;
    try {
      const { value, error, said } = await quietly(() => mpesaKenya().createCheckout(request()));
      assert.equal(error, undefined, label);
      assert.deepEqual(value, { kind: 'pending', providerReference: sent }, label);
      assert.deepEqual(said, [], label);
      assert.deepEqual(stub.calls.map((c) => (c.init.method ?? 'GET')), ['POST', 'GET'], label);
      assert.equal(stub.calls[1]!.url, `${BASE}/v2/deposits/${sent}`, label);
    } finally {
      globalThis.fetch = original;
      stub.restore();
    }
  }
  // Nothing came back and pawaPay has never heard of it, or cannot be asked either: it did not start.
  for (const [label, first, held, code] of [
    ['never arrived', 'network', { body: { status: 'NOT_FOUND' } }, 'NOT_RECEIVED'],
    ['nobody answers at all', 'network', 'network', 'NO_ANSWER'],
    ['500 twice', { status: 500, text: '' }, { status: 500, text: '' }, 'NO_ANSWER'],
  ] as [string, Reply, Reply, string][]) {
    const stub = stubFetch([
      { match: '/v2/deposits/', method: 'GET', reply: held },
      { match: '/v2/deposits', method: 'POST', reply: first },
    ]);
    try {
      const { error, said } = await quietly(() => mpesaKenya().createCheckout(request()));
      assert.equal((error as Error | undefined)?.message, `M-Pesa could not start this payment: ${code}`, label);
      assert.equal(said.length, 1, label);
      // Asked once, not in a loop.
      assert.equal(stub.calls.length, 2, label);
    } finally {
      stub.restore();
    }
  }
});

// ---------------------------------------------------------------------------
// What happened to a payment
// ---------------------------------------------------------------------------

async function statusWith(reply: Reply, reference = DEPOSIT, provider = callback()) {
  const stub = stubFetch([{ match: '/v2/deposits/', method: 'GET', reply }]);
  try {
    const status = await provider.fetchPaymentStatus(reference);
    return { status, calls: stub.calls };
  } finally {
    stub.restore();
  }
}

test('a completed deposit is a success with its amount exactly, its order, and the operator\'s own id', async () => {
  const { status, calls } = await statusWith({ body: found() });
  assert.deepEqual(status, {
    state: 'succeeded',
    providerReference: DEPOSIT,
    amount: kes(125000n),
    financialTransactionId: 'SLK4X9P2QA',
    orderId: ORDER,
  });
  assert.equal(calls[0]!.url, `${BASE}/v2/deposits/${DEPOSIT}`);
  assert.equal((calls[0]!.init.headers as Record<string, string>).Authorization, 'Bearer synthetic-token');
  // The provider a payer chose answers the same way as the callback's.
  assert.equal((await statusWith({ body: found() }, DEPOSIT, mpesaKenya())).status.state, 'succeeded');
  // Cents written for a currency with none.
  const rwf = await statusWith({ body: found({ amount: '100.00', currency: 'RWF' }) });
  assert.deepEqual(rwf.status.state === 'succeeded' && rwf.status.amount, { amountMinor: 100n, currency: 'RWF' });
  // The order from either place it was written; no operator's id is no id.
  const metaOnly = await statusWith({ body: found({ clientReferenceId: undefined, providerTransactionId: undefined }) });
  assert.equal(metaOnly.status.state === 'succeeded' && metaOnly.status.orderId, ORDER);
  assert.equal(metaOnly.status.state === 'succeeded' && metaOnly.status.financialTransactionId, null);
  const referenceOnly = await statusWith({ body: found({ metadata: undefined, clientReferenceId: ORDER.toUpperCase() }) });
  assert.equal(referenceOnly.status.state === 'succeeded' && referenceOnly.status.orderId, ORDER);
});

test('a deposit that names no order, or two, names none: it is a success that settles nothing', async () => {
  for (const [label, over] of [
    ['two different orders', { clientReferenceId: ORDER, metadata: { orderId: OTHER_ORDER } }],
    ['neither', { clientReferenceId: undefined, metadata: undefined }],
    ['a reference that is not an order id', { clientReferenceId: 'INV-123456', metadata: undefined }],
    ['metadata as it was sent, a list', { clientReferenceId: undefined, metadata: [{ orderId: ORDER }] }],
    ['an order that is a number', { clientReferenceId: 7, metadata: { orderId: 7 } }],
  ] as [string, Record<string, unknown>][]) {
    const { status } = await statusWith({ body: found(over) });
    assert.equal(status.state, 'succeeded', label);
    assert.equal(status.state === 'succeeded' && status.orderId, null, label);
    // And the webhook's rule turns that into nothing settled.
    if (status.state !== 'succeeded') continue;
    assert.deepEqual(
      bindPayment({ claimedOrderId: ORDER, confirmedOrderId: status.orderId, confirmedAmount: status.amount, order: { totalMinor: 125000n, currency: 'KES' } }),
      { ok: false, why: 'no_order' },
      label,
    );
  }
});

test('a payment settles the order pawaPay says it was for, at that order\'s total, and no other', async () => {
  const { status } = await statusWith({ body: found() });
  assert.equal(status.state, 'succeeded');
  if (status.state !== 'succeeded') return;
  const bind = (claimed: string, total: bigint, currency = 'KES') =>
    bindPayment({ claimedOrderId: claimed, confirmedOrderId: status.orderId, confirmedAmount: status.amount, order: { totalMinor: total, currency } });
  assert.deepEqual(bind(ORDER, 125000n), { ok: true, amount: kes(125000n), amountFrom: 'provider' });
  // A real payment for a cheap order, presented as the payment for a dear one.
  assert.deepEqual(bind(OTHER_ORDER, 125000n), { ok: false, why: 'other_order' });
  assert.deepEqual(bind(ORDER, 900000n), { ok: false, why: 'amount' });
  assert.deepEqual(bind(ORDER, 125000n, 'UGX'), { ok: false, why: 'currency' });
});

test('failed is failed with pawaPay\'s code; in progress is pending; everything else is unknown, never failed', async () => {
  const failed = await statusWith({ body: found({ status: 'FAILED', failureReason: { failureCode: 'PAYMENT_NOT_APPROVED', failureMessage: 'The customer 254712345678 did not approve' } }) });
  assert.deepEqual(failed.status, { state: 'failed', providerReference: DEPOSIT, reason: 'PAYMENT_NOT_APPROVED', orderId: ORDER });
  const bare = await statusWith({ body: found({ status: 'FAILED' }) });
  assert.equal(bare.status.state === 'failed' && bare.status.reason, 'FAILED');

  for (const state of ['ACCEPTED', 'PROCESSING', 'IN_RECONCILIATION']) {
    assert.deepEqual((await statusWith({ body: found({ status: state }) })).status, { state: 'pending', providerReference: DEPOSIT }, state);
  }

  for (const [label, reply] of [
    ['an id pawaPay does not hold', { body: { status: 'NOT_FOUND' } }],
    ['the connection dropped', 'network'],
    ['500', { status: 500, body: { failureReason: { failureCode: 'UNKNOWN_ERROR' } } }],
    ['a token that is wrong', { status: 403, body: { status: 'REJECTED', failureReason: { failureCode: 'AUTHENTICATION_ERROR' } } }],
    ['not JSON', { text: '<html>maintenance</html>' }],
    ['an empty answer', { text: '' }],
    ['found, with nothing in it', { body: { status: 'FOUND' } }],
    ['an answer about another deposit', { body: found({ depositId: '99999999-9999-4999-8999-999999999999' }) }],
    ['a status nobody documented', { body: found({ status: 'SETTLED' }) }],
    ['completed, with an amount that cannot be read', { body: found({ amount: 'lots' }) }],
    ['completed, with an amount of nothing', { body: found({ amount: '0' }) }],
    ['completed, with a fraction the currency does not have', { body: found({ amount: '1250.005' }) }],
    ['completed, with no currency', { body: found({ currency: undefined }) }],
  ] as [string, Reply][]) {
    const { status } = await statusWith(reply);
    assert.equal(status.state, 'unknown', label);
    if (status.state === 'unknown') assert.ok(!status.reason.includes('254712345678'), label);
  }
});

test('a reference that is not a deposit id is never put in an address, and no token asks nothing', async () => {
  for (const reference of ['', 'abc', '../v2/payouts/x', `${DEPOSIT}?x=1`, `${DEPOSIT} `, 'SLK4X9P2QA']) {
    const { status, calls } = await statusWith({ body: found() }, reference);
    assert.equal(status.state, 'unknown', reference);
    assert.equal(calls.length, 0, reference);
  }
  const { status, calls } = await statusWith({ body: found() }, DEPOSIT, new PawaPayProvider(null));
  assert.deepEqual(status, { state: 'unknown', providerReference: DEPOSIT, reason: 'pawaPay is not configured' });
  assert.equal(calls.length, 0);
});

// ---------------------------------------------------------------------------
// The notification
// ---------------------------------------------------------------------------

test('a notification is a pointer to a deposit: its order is a claim and its amount is never used', () => {
  const provider = callback();
  // The body pawaPay documents for a callback: the metadata is there, the client reference is not.
  const body = { depositId: DEPOSIT.toUpperCase(), status: 'COMPLETED', amount: '999999', currency: 'KES', country: 'KEN', payer: { type: 'MMO', accountDetails: { phoneNumber: '254712345678', provider: 'MPESA_KEN' } }, created: '2026-11-19T08:17:01Z', providerTransactionId: 'ABC123', metadata: { orderId: ORDER } };
  const event = provider.parseWebhookEvent(body);
  assert.equal(event.kind, 'payment.succeeded');
  if (event.kind !== 'payment.succeeded') return;
  // One deposit is one event, however often it is delivered.
  assert.equal(event.eventId, DEPOSIT);
  assert.equal(event.providerReference, DEPOSIT);
  assert.equal(event.orderId, ORDER);

  // No order in it: the claim is empty, and the webhook takes the status answer's word alone.
  const silent = provider.parseWebhookEvent({ depositId: DEPOSIT, status: 'COMPLETED', amount: '15', currency: 'ZMW' });
  assert.equal(silent.kind === 'payment.succeeded' && silent.orderId, '');
  // An amount that cannot be read does not stop it being a pointer.
  const odd = provider.parseWebhookEvent({ depositId: DEPOSIT, status: 'completed', amount: 'lots', currency: 7, metadata: { orderId: ORDER } });
  assert.equal(odd.kind, 'payment.succeeded');

  const failed = provider.parseWebhookEvent({ depositId: DEPOSIT, status: 'FAILED', failureReason: { failureCode: 'INSUFFICIENT_BALANCE', failureMessage: 'x 254712345678' }, metadata: { orderId: ORDER } });
  assert.deepEqual(
    failed.kind === 'payment.failed' && [failed.eventId, failed.providerReference, failed.orderId, failed.reason],
    [DEPOSIT, DEPOSIT, ORDER, 'INSUFFICIENT_BALANCE'],
  );

  for (const [label, payload] of [
    ['processing is not an outcome', { depositId: DEPOSIT, status: 'PROCESSING' }],
    ['no status', { depositId: DEPOSIT }],
    ['a refund', { refundId: DEPOSIT, status: 'COMPLETED', amount: '15', currency: 'ZMW' }],
    ['a payout', { payoutId: DEPOSIT, status: 'COMPLETED' }],
    ['a deposit id that is not one', { depositId: 'ORD-1', status: 'COMPLETED' }],
    ['a list', [{ depositId: DEPOSIT, status: 'COMPLETED' }]],
    ['nothing', null],
    ['a word', 'COMPLETED'],
  ] as [string, unknown][]) {
    assert.equal(provider.parseWebhookEvent(payload).kind, 'ignored', label);
  }
  // Signed or not, a notification is never believed for itself.
  assert.equal(provider.verifyWebhookSignature(JSON.stringify(body), 'sig-pp=:MEUCIQ==:'), false);
  assert.equal(provider.verifyWebhookSignature(JSON.stringify(body), null), false);
});

// ---------------------------------------------------------------------------
// Refunds
// ---------------------------------------------------------------------------

test('a refund names the deposit and the amount, and an unanswered one is said as unknown with its id', async () => {
  const ok = stubFetch([{ match: '/v2/refunds', method: 'POST', reply: { body: { refundId: 'ignored', status: 'ACCEPTED', created: '2026-11-19T08:17:01Z' } } }]);
  try {
    const { providerRefundReference } = await callback().requestRefund({ providerReference: DEPOSIT.toUpperCase(), amount: kes(125000n), reason: 'changed their mind' });
    assert.match(providerRefundReference, UUID);
    const call = ok.calls[0]!;
    assert.equal(call.url, `${BASE}/v2/refunds`);
    // What was asked for and why stays here: pawaPay is sent the deposit and how much.
    assert.deepEqual(JSON.parse(String(call.init.body)), { refundId: providerRefundReference, depositId: DEPOSIT, amount: '1250', currency: 'KES' });
  } finally {
    ok.restore();
  }

  for (const [label, reply, code] of [
    ['already refunded', { body: { refundId: DEPOSIT, status: 'REJECTED', rejectionReason: { rejectionCode: 'DEPOSIT_ALREADY_REFUNDED', rejectionMessage: 'x' } } }, 'DEPOSIT_ALREADY_REFUNDED'],
    ['too much', { body: { status: 'REJECTED', failureReason: { failureCode: 'AMOUNT_TOO_LARGE' } } }, 'AMOUNT_TOO_LARGE'],
    ['refunds not enabled', { status: 403, body: { failureReason: { failureCode: 'REFUNDS_NOT_ALLOWED' } } }, 'REFUNDS_NOT_ALLOWED'],
    ['a duplicate, which a new id cannot be', { body: { status: 'DUPLICATE_IGNORED' } }, 'REJECTED'],
  ] as [string, Reply, string][]) {
    const stub = stubFetch([{ match: '/v2/refunds', method: 'POST', reply }]);
    try {
      await assert.rejects(callback().requestRefund({ providerReference: DEPOSIT, amount: kes(125000n), reason: 'x' }), new RegExp(`did not take this refund: ${code}$`, 'u'), label);
    } finally {
      stub.restore();
    }
  }

  // Not answered: nobody knows, and the message carries the id to ask about.
  for (const reply of ['network', { status: 500, text: '' }, { status: 502, text: '<html></html>' }] as Reply[]) {
    const stub = stubFetch([{ match: '/v2/refunds', method: 'POST', reply }]);
    try {
      let sent = '';
      const error = await callback().requestRefund({ providerReference: DEPOSIT, amount: kes(125000n), reason: 'x' }).then(() => null, (e: Error) => e);
      sent = JSON.parse(String(stub.calls[0]!.init.body)).refundId;
      assert.ok(error instanceof Error);
      assert.ok(error.message.includes(sent), 'the id that could be asked about is not in the message');
      assert.match(error.message, /Whether it was taken is not known/u);
      assert.doesNotMatch(error.message, /did not take this refund/u);
    } finally {
      stub.restore();
    }
  }

  // A reference that is not a deposit id asks nothing.
  const none = stubFetch([]);
  try {
    await assert.rejects(callback().requestRefund({ providerReference: 'SLK4X9P2QA', amount: kes(125000n), reason: 'x' }));
    await assert.rejects(callback().requestRefund({ providerReference: DEPOSIT, amount: kes(0n), reason: 'x' }));
    assert.equal(none.calls.length, 0);
  } finally {
    none.restore();
  }
});

// ---------------------------------------------------------------------------
// The source
// ---------------------------------------------------------------------------

test('the adapter keeps pawaPay\'s codes and none of its sentences, and says what it has not been run against', () => {
  const source = readFileSync(new URL('./payments/pawapay.ts', import.meta.url), 'utf8');
  const code = source.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/gu, '');
  // pawaPay's sentences quote the payer's number.
  assert.doesNotMatch(code, /failureMessage|rejectionMessage/u);
  // Every request has a limit on how long it may take.
  assert.equal(code.split('await fetch(').length - 1, 3);
  assert.equal(code.split('signal: AbortSignal.timeout(TIMEOUT_MS)').length - 1, 3);
  // Money is never a Number.
  assert.doesNotMatch(code, /Number\(|parseFloat|parseInt|toFixed/u);
  // And the file says, where a reader starts, that none of it has met pawaPay.
  assert.match(source, /\*\*Written from pawaPay's published documentation and run against nothing\.\*\*/u);
  assert.match(source, /verifyWebhookSignature\(_payload: string, _signature: string \| null\): boolean \{\n    return false;/u);

  const checkout = readFileSync(new URL('../app/api/checkout/route.ts', import.meta.url), 'utf8');
  assert.match(checkout, /if \(provider\.accepts && !provider\.accepts\(result\.amount\)\) \{/u);
  const page = readFileSync(new URL('../app/courses/[slug]/buy/page.tsx', import.meta.url), 'utf8');
  assert.match(page, /providersForAmount\(offering\.kind === 'paid' \? offering\.price\.amount : null\)/u);
});
