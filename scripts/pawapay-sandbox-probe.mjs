// The pawaPay adapter against pawaPay's own sandbox: the one run that can
// say where `web/src/lib/payments/pawapay.ts` is wrong.
//
// Everything else that touches that adapter is a stand-in typed from
// pawaPay's documentation. This is not. It needs a sandbox API token
// (`PAWAPAY_SANDBOX_TOKEN`), which only the owner can make: sign up at
// https://dashboard.sandbox.pawapay.io, generate a token there, and either
//
//     PAWAPAY_SANDBOX_TOKEN=... node --experimental-strip-types scripts/pawapay-sandbox-probe.mjs
//
// or save it as the repository secret PAWAPAY_SANDBOX_TOKEN; the workflow
// "pawaPay sandbox probe" then runs on a commit whose message begins
// "test: pawapay sandbox probe".
//
// To generate a token pawaPay's dashboard first wants callback URLs. This
// probe needs none: it asks for each status itself. In the dashboard's
// callback settings, turn on the switch that says the final status will be
// polled for, and leave the addresses empty. (When the application has an
// address of its own, the deposit callback URL becomes
// https://<that address>/api/payments/webhook/pawapay.)
//
// **Sandbox only, and it cannot be pointed anywhere else.** The address is
// written here, not read from the environment. No real wallet, no real
// money, no real person: the numbers are the test numbers pawaPay publishes
// (https://docs.pawapay.io/v2/docs/test_numbers), each of which decides its
// own outcome. A sandbox token is refused by production, and a live token by
// the sandbox.
//
// What it does: through the adapter itself, for six operators, start a
// deposit for a number documented to complete and one documented to fail,
// ask what happened until there is an outcome, and compare with what the
// adapter is written to expect: accepted; then succeeded for the order it was
// started for, at the amount that was sent; or failed with pawaPay's code.
// Then ask about a deposit pawaPay has never seen.
//
// What it cannot show: a callback (the sandbox would have to reach a public
// address of this platform), a PIN prompt (the sandbox has none), a refund's
// outcome, production, or which operators a live account would be given.
//
// The token is never printed. Exit code 0 only if nothing disagreed.
import { randomUUID } from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';

const token = process.env.PAWAPAY_SANDBOX_TOKEN?.trim();
if (!token) {
  console.error('PAWAPAY_SANDBOX_TOKEN is not set. Nothing was sent. See the top of this file for how to make one.');
  process.exit(2);
}
// The adapter's own default, written out so that nothing in the environment can move it.
const SANDBOX = 'https://api.sandbox.pawapay.io';

const { PawaPayProvider } = await import('../web/src/lib/payments/pawapay.ts');
const { PAWAPAY_BRANDS } = await import('../web/src/lib/payments/markets.ts');

// [brand, country, minor units, a number documented to complete, a number documented to fail and its code]
const CASES = [
  ['mpesa', 'KE', 10000n, '+254703456789', ['+254703456039', 'PAYMENT_NOT_APPROVED']],
  ['mtn', 'RW', 1000n, '+250783456789', ['+250783456039', 'PAYMENT_NOT_APPROVED']],
  ['orange', 'SN', 1000n, '+221773456789', ['+221773456049', 'INSUFFICIENT_BALANCE']],
  // An amount with a fraction, to an operator documented to take one: sent as "10.5".
  ['mtn', 'GH', 1050n, '+233593456789', ['+233593456039', 'PAYMENT_NOT_APPROVED']],
  ['airtel', 'TZ', 500000n, '+255683456789', ['+255683456039', 'PAYMENT_NOT_APPROVED']],
  ['mtn', 'ZM', 1550n, '+260763456789', null],
];

const problems = [];
const note = (line) => console.log(line);
const wrong = (line) => { problems.push(line); console.log(`  DISAGREES: ${line}`); };

function providerFor(brand, country) {
  const known = PAWAPAY_BRANDS[brand];
  const operator = known.countries[country];
  return new PawaPayProvider(
    { baseUrl: SANDBOX, token, customerMessage: 'AyahSpring probe', operator: { ...operator, country, label: operator.label ?? known.label } },
    `pawapay_${brand}_${country.toLowerCase()}`,
  );
}

/** Ask until pawaPay says how it ended, or ninety seconds have passed. */
async function outcome(provider, reference) {
  let status = { state: 'unknown', reason: 'never asked' };
  for (let asked = 0; asked < 30; asked += 1) {
    await sleep(3000);
    status = await provider.fetchPaymentStatus(reference);
    if (status.state === 'succeeded' || status.state === 'failed') return status;
  }
  return status;
}

async function attempt(provider, label, amount, msisdn, expect) {
  const orderId = randomUUID();
  let started;
  try {
    started = await provider.createCheckout({ orderId, amount, returnUrl: 'https://example.invalid/', description: 'sandbox probe', msisdn });
  } catch (error) {
    wrong(`${label}: the deposit was not accepted (${error instanceof Error ? error.message : 'no reason'})`);
    return;
  }
  if (started.kind !== 'pending') { wrong(`${label}: accepted as "${started.kind}", not as pending`); return; }
  const status = await outcome(provider, started.providerReference);
  if (expect === 'COMPLETED') {
    if (status.state !== 'succeeded') { wrong(`${label}: expected to complete, and the adapter reads "${status.state}"${'reason' in status ? ` (${status.reason})` : ''}`); return; }
    if (status.orderId !== orderId) wrong(`${label}: completed, and the order it names is ${status.orderId ?? 'none'} instead of the one it was started for`);
    if (!status.amount || status.amount.amountMinor !== amount.amountMinor || status.amount.currency !== amount.currency) {
      wrong(`${label}: completed, and the amount read back is ${status.amount ? `${status.amount.currency} ${status.amount.amountMinor} minor units` : 'unreadable'} instead of ${amount.currency} ${amount.amountMinor}`);
    }
    note(`  ${label}: completed; names its order; amount read back exactly; operator's id ${status.financialTransactionId ? 'present' : 'absent'}`);
  } else {
    if (status.state !== 'failed') { wrong(`${label}: expected to fail with ${expect}, and the adapter reads "${status.state}"${'reason' in status ? ` (${status.reason})` : ''}`); return; }
    if (status.reason !== expect) wrong(`${label}: failed with ${status.reason}, where pawaPay documents ${expect}`);
    if (status.orderId !== orderId) wrong(`${label}: failed, and the order it names is ${status.orderId ?? 'none'}`);
    note(`  ${label}: failed with ${status.reason}; names its order`);
  }
}

note(`pawaPay sandbox probe, ${SANDBOX}. Test numbers only: no wallet, no money, nobody prompted.`);
for (const [brand, country, minor, good, bad] of CASES) {
  const provider = providerFor(brand, country);
  const currency = provider.market.currency;
  const amount = { amountMinor: minor, currency };
  const name = `${provider.label} ${country} (${PAWAPAY_BRANDS[brand].countries[country].code})`;
  note(`${name}, ${currency} ${minor} minor units:`);
  if (!provider.accepts(amount)) { wrong(`${name}: this script asks for an amount the adapter says the operator cannot take`); continue; }
  await attempt(provider, 'a number documented to complete', amount, good, 'COMPLETED');
  if (bad) await attempt(provider, `a number documented to fail`, amount, bad[0], bad[1]);
}

note('A deposit pawaPay has never seen:');
{
  const unseen = await providerFor('mpesa', 'KE').fetchPaymentStatus(randomUUID());
  if (unseen.state !== 'unknown' || unseen.reason !== 'pawaPay holds no deposit with this id') {
    wrong(`an id pawaPay does not hold is read as "${unseen.state}"${'reason' in unseen ? ` (${unseen.reason})` : ''}`);
  } else note('  unknown, as "holds no deposit with this id": settles nothing and closes nothing');
}

if (problems.length > 0) {
  console.error(`\n${problems.length} thing(s) disagreed with what the adapter expects. The adapter, or the documentation it was written from, is wrong about each:`);
  for (const line of problems) console.error(`- ${line}`);
  process.exit(1);
}
note('\nNothing disagreed: in the sandbox, pawaPay took every request the adapter made and answered in the shapes it reads. That is the sandbox, with test numbers. It is not production, a callback, a PIN prompt or a refund.');
