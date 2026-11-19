import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  CHECKOUT_REASONS,
  checkoutOutcomeOf,
  checkoutReasonOf,
  checkoutStatusOf,
  writerReasonOf,
} from './checkout-outcome.ts';
import { createOrder, quoteCourseOrder } from './checkout.ts';
import { parsePhone } from './phone.ts';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('a reply is a refusal only when its reason and its status belong together', () => {
  // The route answers 503 for a closed checkout and 502 for a provider that
  // would not start, on purpose. So "in the four hundreds" cannot be the rule
  // here, and a status alone cannot tell this route's answer from a page sent
  // by something in front of the site. The pair can.
  for (const reason of CHECKOUT_REASONS) {
    assert.equal(checkoutOutcomeOf(checkoutStatusOf(reason), reason), reason, reason);
  }
  assert.equal(checkoutOutcomeOf(503, 'disabled'), 'disabled');
  assert.equal(checkoutOutcomeOf(502, 'provider_failed'), 'provider_failed');

  // A gateway's 503, or a 503 that happens to carry JSON, is not "closed".
  assert.equal(checkoutOutcomeOf(503, undefined), 'unconfirmed');
  assert.equal(checkoutOutcomeOf(503, 'already_owned'), 'unconfirmed');
  // A known reason with the wrong status is not believed either.
  assert.equal(checkoutOutcomeOf(500, 'already_owned'), 'unconfirmed');
  assert.equal(checkoutOutcomeOf(200, 'already_owned'), 'unconfirmed');
  // A reason nobody has heard of, and things that are not reasons.
  assert.equal(checkoutOutcomeOf(409, 'some_new_reason'), 'unconfirmed');
  assert.equal(checkoutOutcomeOf(409, null), 'unconfirmed');
  assert.equal(checkoutOutcomeOf(409, 'toString'), 'unconfirmed');
  assert.equal(checkoutOutcomeOf(409, { reason: 'already_owned' }), 'unconfirmed');
});

test('each reason has the status the routes always used, and two that were wrong are corrected', () => {
  assert.equal(checkoutStatusOf('disabled'), 503);
  assert.equal(checkoutStatusOf('provider_unavailable'), 503);
  assert.equal(checkoutStatusOf('provider_failed'), 502);
  assert.equal(checkoutStatusOf('course_not_available'), 404);
  assert.equal(checkoutStatusOf('learner_not_yours'), 403);
  assert.equal(checkoutStatusOf('phone_invalid'), 400);
  assert.equal(checkoutStatusOf('malformed'), 400);
  for (const reason of ['already_owned', 'price_not_available', 'not_one_time', 'no_price_for_country', 'price_ambiguous', 'unknown_code', 'would_be_free', 'free_course', 'withdrawal_not_recorded'] as const) {
    assert.equal(checkoutStatusOf(reason), 409, reason);
  }
  // A refusal nobody anticipated stays loud.
  assert.equal(checkoutStatusOf('refused'), 500);
  // The writer's own "nobody is signed in" and "no learner named" were both
  // answered 500, as though the site had broken.
  assert.equal(checkoutStatusOf('not_signed_in'), 401);
  assert.equal(checkoutStatusOf('learner_required'), 400);
  // Not a refusal at all, and never in the four hundreds.
  assert.equal(checkoutStatusOf('unconfirmed'), 502);
});

test('a database error is a named refusal only when the database answered', () => {
  // A refusal carries a SQLSTATE and was rolled back with it.
  assert.equal(checkoutReasonOf({ code: 'P0001', message: 'checkout:already_owned' }), 'already_owned');
  assert.equal(checkoutReasonOf({ code: 'P0001', message: 'promotion:limit_reached_family' }), 'limit_reached_family');
  assert.equal(checkoutReasonOf({ code: 'P0001', message: 'ERROR: promotion:unknown_code (SQLSTATE P0001)' }), 'unknown_code');
  // Answered, and with a key the form has no sentence for.
  assert.equal(checkoutReasonOf({ code: 'P0001', message: 'checkout:some_new_reason' }), 'refused');
  assert.equal(checkoutReasonOf({ code: '42501', message: 'permission denied for function create_course_order' }), 'refused');
  // Keys that are about an existing order belong to another screen.
  assert.equal(checkoutReasonOf({ code: 'P0001', message: 'promotion:order_not_pending' }), 'refused');
  // No SQLSTATE, or the connection's class: the order may exist.
  assert.equal(checkoutReasonOf({ message: 'checkout:already_owned' }), 'unconfirmed');
  assert.equal(checkoutReasonOf({ code: '', message: 'TypeError: fetch failed' }), 'unconfirmed');
  assert.equal(checkoutReasonOf({ code: '08006', message: 'connection failure' }), 'unconfirmed');
  assert.equal(checkoutReasonOf({ code: 'PGRST301', message: 'JWT expired' }), 'unconfirmed');

  assert.equal(writerReasonOf('unconfirmed'), null, 'a route reason is not something the database can name');
  assert.equal(writerReasonOf('constructor'), null);
});

/** A Supabase client whose one rpc answers with what it is given. */
const clientAnswering = (answer: { data: unknown; error: unknown }) =>
  ({ rpc: async () => answer }) as never;

test('the order writer and the price check keep the reason they used to throw away', async () => {
  const refused = await createOrder(
    clientAnswering({ data: null, error: { code: 'P0001', message: 'promotion:not_in_market' } }),
    { learnerProfileId: 'l', courseId: 'c', country: 'UG' },
  );
  assert.equal(refused.ok, false);
  if (refused.ok) return;
  // The coarse code is what the browser used to get, and it was the same for
  // every promotion refusal.
  assert.equal(refused.code, 'promotion_refused');
  assert.equal(refused.reason, 'not_in_market');

  const quoted = await quoteCourseOrder(
    clientAnswering({ data: null, error: { code: 'P0001', message: 'checkout:price_ambiguous' } }),
    { learnerProfileId: 'l', courseId: 'c', country: 'UG' },
  );
  assert.equal(quoted.ok, false);
  if (quoted.ok) return;
  assert.equal(quoted.reason, 'price_ambiguous');

  // Nobody named, before any request.
  const nobody = await createOrder(clientAnswering({ data: null, error: null }), {
    learnerProfileId: '', courseId: 'c', country: 'UG',
  });
  assert.equal(nobody.ok === false && nobody.reason, 'learner_required');

  // Answered without an order in the answer: nobody can say whether one exists.
  const empty = await createOrder(clientAnswering({ data: null, error: null }), {
    learnerProfileId: 'l', courseId: 'c', country: 'UG',
  });
  assert.equal(empty.ok === false && empty.reason, 'unconfirmed');

  // An unknown key still carries the database's sentence in `message`, for
  // the log, and is named `refused` so the route knows not to send it.
  const unknown = await createOrder(
    clientAnswering({ data: null, error: { code: 'P0001', message: 'checkout:some_new_reason' } }),
    { learnerProfileId: 'l', courseId: 'c', country: 'UG' },
  );
  assert.equal(unknown.ok === false && unknown.reason, 'refused');
  assert.equal(unknown.ok === false && unknown.code, 'error');
});

test('the two routes send the reason with its own status and keep the database’s sentence', () => {
  const checkout = read('../app/api/checkout/route.ts');
  const quote = read('../app/api/checkout/quote/route.ts');

  assert.match(checkout, /NextResponse\.json\(\{ error, reason, \.\.\.extra \}, \{ status: checkoutStatusOf\(reason\) \}\)/u);
  assert.match(quote, /NextResponse\.json\(\{ ok: false, code, reason, message \}, \{ status: checkoutStatusOf\(reason\) \}\)/u);

  // A course refusal nobody wrote a sentence for is answered in the route's
  // words, and the database's are logged rather than sent.
  assert.match(checkout, /result\.reason === 'refused'\s+\? CHECKOUT_REFUSED_SENTENCE/u);
  assert.match(checkout, /if \(result\.reason === 'refused'\) console\.error\(/u);
  assert.match(quote, /reason === 'refused' \|\| reason === 'unconfirmed' \? QUOTE_FAILED_SENTENCE : result\.message/u);

  // The provider's "not configured" error names an environment variable and a
  // section of DECISIONS.md. It was sent to the payer.
  assert.doesNotMatch(checkout, /err\.message/u);
  // Four now: none configured, one that collects another currency, one that
  // takes whole amounts and is asked for a fraction, and one whose adapter
  // says it has no credentials.
  assert.equal(checkout.match(/refuse\('provider_unavailable', NO_PROVIDER_SENTENCE, \{\s+code: 'provider_unavailable',\s+orderId: result\.orderId,\s+\}\)/gu)?.length, 4);
  assert.match(checkout, /if \(provider\.accepts && !provider\.accepts\(result\.amount\)\) \{/u);
  assert.match(checkout, /if \(provider\.market && provider\.market\.currency !== result\.currencyCode\) \{/u);

  // A mistyped number is refused before the order is written, so it no
  // longer leaves a pending order behind each time.
  const phone = checkout.indexOf("refuse('phone_invalid'");
  const written = checkout.indexOf('result = await createOrder(');
  assert.ok(phone > 0 && written > phone, 'the phone number is checked after the order is written');
  assert.doesNotMatch(checkout, /refuse\('phone_invalid'[^)]*orderId/u);

  // A number written without a country code is read as a number of the
  // country the chosen service collects in. It was read as Ugandan whoever
  // was paying: first with 'UG', which `toE164` does not take, so every local
  // number was refused; then with '+256', so every local number was Uganda's.
  assert.doesNotMatch(checkout, /LOCAL_DIAL_CODE|'\+256'/u);
  assert.match(checkout, /const parsed = parsePhone\(typed, provider\.market\.country\);/u);
  // The provider is chosen before the number is read, and both before the order.
  const chosen = checkout.indexOf('const provider = getPaymentProvider(requestedProvider);');
  assert.ok(chosen > 0 && chosen < phone, 'the number is read before the service is known');
  // With nobody to send it to, a number is not read at all.
  assert.match(checkout, /if \(provider\.available && provider\.requiresMsisdn\) \{/u);
  // The same typed digits are a different number in each country, and the
  // country's own way of writing a number is what reads them.
  const number = (typed: string, country: string) => {
    const parsed = parsePhone(typed, country);
    return parsed.ok ? parsed.e164 : parsed.why;
  };
  assert.equal(number('0772 123456', 'UG'), '+256772123456');
  assert.equal(number('0712 345678', 'KE'), '+254712345678');
  assert.equal(number('024 123 4567', 'GH'), '+233241234567');
  assert.equal(number('0961 234567', 'ZM'), '+260961234567');
  // Typed in full, with or without its plus.
  assert.equal(number('+233 24 123 4567', 'GH'), '+233241234567');
  assert.equal(number('233241234567', 'GH'), '+233241234567');
  // Another country's number is not this service's to prompt.
  assert.equal(number('+254712345678', 'UG'), 'other_country');
  assert.equal(number('12', 'UG'), 'length');
  assert.equal(number('', 'UG'), 'empty');
  // The reader's own digits are digits.
  assert.equal(number('٠٧٧٢ ١٢٣ ٤٥٦', 'UG'), '+256772123456');

  // Every refusal in the checkout route goes through `refuse`, except the
  // plan checkout's, which has no keys to match and keeps its old shape.
  const bare = checkout.match(/NextResponse\.json\(\s*\{ error:/gu) ?? [];
  assert.equal(bare.length, 1, 'a refusal is sent without a reason');
  assert.match(checkout, /return NextResponse\.json\(\{ error: result\.message, code: result\.code \}, \{ status \}\);/u);
});
