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
// What it does. First it asks pawaPay which operators this account may
// collect through (`GET /v2/active-conf`) and compares that with the table
// the adapter is built on (`PAWAPAY_BRANDS`): the code, the currency, whether
// an amount may have a fraction, and that the payer approves on their own
// handset. Then, through the adapter itself, for eight operators, it starts a
// deposit for a number documented to complete and one documented to fail,
// asks what happened until there is an outcome, and compares with what the
// adapter is written to expect: accepted; then succeeded for the order it was
// started for, at the amount that was sent; or failed with pawaPay's code.
// Then it asks about a deposit pawaPay has never seen.
//
// An operator the account was not given is not a fault of the adapter and is
// not counted as one. It is listed apart, because it is the owner's to ask
// pawaPay about.
//
// What it cannot show: a callback (the sandbox would have to reach a public
// address of this platform), a PIN prompt (the sandbox has none), a refund's
// outcome, production, or which operators a live account would be given.
//
// The token is never printed. Exit code 0 only if nothing disagreed.
import { randomUUID } from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';

// On a runner the log cannot always be fetched afterwards, so what was found
// is also left as an annotation on the run. Nothing secret is in it: the
// lines below name operators, outcomes and pawaPay's codes.
const annotate = (level, title, text) => {
  if (process.env.GITHUB_ACTIONS !== 'true') return;
  const escaped = text.replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A');
  console.log(`::${level} title=${title}::${escaped}`);
};

const token = process.env.PAWAPAY_SANDBOX_TOKEN?.trim();
if (!token) {
  console.error('PAWAPAY_SANDBOX_TOKEN is not set. Nothing was sent. See the top of this file for how to make one.');
  annotate('error', 'pawaPay sandbox probe', 'PAWAPAY_SANDBOX_TOKEN is not set (or is empty) in this run. Nothing was sent.');
  process.exit(2);
}
// The adapter's own default, written out so that nothing in the environment can move it.
const SANDBOX = 'https://api.sandbox.pawapay.io';

const { PawaPayProvider } = await import('../web/src/lib/payments/pawapay.ts');
const { PAWAPAY_BRANDS } = await import('../web/src/lib/payments/markets.ts');

// [brand, country, minor units, a number documented to complete, a number documented to fail and its code]
const CASES = [
  ['mtn', 'UG', 5000n, '+256783456789', ['+256783456029', 'PAYER_NOT_FOUND']],
  ['airtel', 'UG', 5000n, '+256753456789', ['+256753456069', 'UNSPECIFIED_FAILURE']],
  ['mpesa', 'KE', 10000n, '+254703456789', ['+254703456039', 'PAYMENT_NOT_APPROVED']],
  ['mtn', 'RW', 1000n, '+250783456789', ['+250783456039', 'PAYMENT_NOT_APPROVED']],
  ['orange', 'SN', 1000n, '+221773456789', ['+221773456049', 'INSUFFICIENT_BALANCE']],
  // An amount with a fraction, to an operator documented to take one: sent as "10.5".
  ['mtn', 'GH', 1050n, '+233593456789', ['+233593456039', 'PAYMENT_NOT_APPROVED']],
  ['airtel', 'TZ', 500000n, '+255683456789', ['+255683456039', 'PAYMENT_NOT_APPROVED']],
  ['mtn', 'ZM', 1550n, '+260763456789', null],
];

const problems = [];
const said = [];
// Operators the adapter knows and this account was not given.
const notGiven = [];
const note = (line) => { said.push(line); console.log(line); };
const wrong = (line) => { problems.push(line); console.log(`  DISAGREES: ${line}`); };

/** The deposit settings in one currency's `operationTypes`, in either shape pawaPay documents. */
function depositOf(operationTypes) {
  if (!operationTypes || typeof operationTypes !== 'object') return null;
  if (!Array.isArray(operationTypes)) return operationTypes.DEPOSIT ?? null;
  for (const entry of operationTypes) {
    if (entry?.DEPOSIT) return entry.DEPOSIT;
    if (entry?.operationType === 'DEPOSIT') return entry;
  }
  return null;
}

/**
 * What this account may collect through, by pawaPay's code:
 * `{ country, currencies: { KES: { decimals, authType, status } } }`.
 * Null when pawaPay could not be asked or answered in a shape this does not know.
 */
async function accountOperators() {
  let res;
  try {
    res = await fetch(`${SANDBOX}/v2/active-conf?operationType=DEPOSIT`, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }, signal: AbortSignal.timeout(20000) });
  } catch { note('  pawaPay could not be reached for the account\'s configuration.'); return null; }
  let body = null;
  try { body = await res.json(); } catch { /* not JSON */ }
  if (!res.ok || !Array.isArray(body?.countries)) {
    const code = body?.failureReason?.failureCode;
    note(`  the configuration was answered with HTTP ${res.status}${typeof code === 'string' ? ` (${code})` : ''}${body && !Array.isArray(body.countries) ? `; top-level names: ${Object.keys(body).join(', ').slice(0, 200)}` : ''}`);
    return null;
  }
  const found = new Map();
  let unread = 0;
  for (const country of body.countries) {
    for (const provider of country?.providers ?? []) {
      if (typeof provider?.provider !== 'string') { unread += 1; continue; }
      const currencies = {};
      for (const currency of provider.currencies ?? []) {
        const deposit = depositOf(currency?.operationTypes);
        if (typeof currency?.currency !== 'string' || !deposit) continue;
        currencies[currency.currency] = { decimals: deposit.decimalsInAmount, authType: deposit.authType, status: deposit.status };
      }
      if (Object.keys(currencies).length === 0) unread += 1;
      else found.set(provider.provider, { country: country.country, currencies });
    }
  }
  if (unread > 0) note(`  ${unread} operator(s) in the answer could not be read for deposits (a shape this script does not know).`);
  return found;
}

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

note('What this account may collect through, and whether the adapter\'s table agrees:');
const account = await accountOperators();
if (account) {
  const known = new Map();
  for (const [brand, entry] of Object.entries(PAWAPAY_BRANDS)) {
    for (const [country, operator] of Object.entries(entry.countries)) known.set(operator.code, { brand, country, ...operator });
  }
  let agreed = 0;
  for (const [code, ours] of known) {
    const theirs = account.get(code);
    if (!theirs) { notGiven.push(`${code} (${ours.label ?? PAWAPAY_BRANDS[ours.brand].label}, ${ours.country})`); continue; }
    const settings = theirs.currencies[ours.currency];
    if (!settings) { wrong(`${code}: the table says it collects ${ours.currency}; the account lists ${Object.keys(theirs.currencies).join(', ')}`); continue; }
    const fraction = settings.decimals !== 'NONE';
    let fine = true;
    if (typeof settings.decimals !== 'string') { fine = false; wrong(`${code}: the account does not say whether ${ours.currency} may have a fraction`); }
    else if (fraction !== ours.decimals) { fine = false; wrong(`${code}: the table says an amount ${ours.decimals ? 'may' : 'may not'} have a fraction; the account says decimalsInAmount is ${settings.decimals}`); }
    if (settings.authType !== 'PROVIDER_AUTH') { fine = false; wrong(`${code}: the payer does not simply approve on their handset here (authType ${String(settings.authType).slice(0, 30)}), and the adapter does nothing else`); }
    if (fine) agreed += 1;
  }
  const extra = [...account.keys()].filter((code) => !known.has(code));
  note(`  the account lists ${account.size} operator(s) for deposits; ${agreed} are in the adapter's table and agree with it on currency, fractions and how the payer approves.`);
  if (notGiven.length > 0) note(`  in the table and NOT on this account (${notGiven.length}): ${notGiven.join('; ')}`);
  if (extra.length > 0) note(`  on this account and not in the table (${extra.length}): ${extra.map((code) => `${code} [${Object.entries(account.get(code).currencies).map(([c, v]) => `${c} ${v.authType}`).join(', ')}]`).join('; ')}`);
  const closed = [...account.entries()].flatMap(([code, v]) => Object.entries(v.currencies).filter(([, c]) => typeof c.status === 'string' && c.status !== 'OPERATIONAL').map(([c, x]) => `${code} ${c} ${x.status}`));
  if (closed.length > 0) note(`  not operational just now: ${closed.join('; ')}`);
} else {
  note('  not compared: every operator below is tried all the same.');
}

for (const [brand, country, minor, good, bad] of CASES) {
  const provider = providerFor(brand, country);
  const currency = provider.market.currency;
  const amount = { amountMinor: minor, currency };
  const code = PAWAPAY_BRANDS[brand].countries[country].code;
  const name = `${provider.label} ${country} (${code})`;
  if (account && !account.has(code)) { note(`${name}: not on this account, so not tried.`); continue; }
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
  annotate('error', 'pawaPay sandbox probe: disagreements', problems.map((line) => `- ${line}`).join('\n'));
  if (notGiven.length > 0) annotate('warning', 'pawaPay sandbox probe: operators this account was not given', notGiven.join('\n'));
  annotate('notice', 'pawaPay sandbox probe: what was seen', said.join('\n'));
  process.exit(1);
}
note('\nNothing disagreed: in the sandbox, pawaPay took every request the adapter made and answered in the shapes it reads. That is the sandbox, with test numbers. It is not production, a callback, a PIN prompt or a refund.');
if (notGiven.length > 0) annotate('warning', 'pawaPay sandbox probe: operators this account was not given', notGiven.join('\n'));
annotate('notice', 'pawaPay sandbox probe: what was seen', said.join('\n'));
