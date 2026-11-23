import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { messagesFor } from './i18n/index.ts';
import type { LocaleCode } from './i18n/locales.ts';
import { en } from './i18n/messages/en.ts';
import { ORDERS } from './i18n/messages/orders.ts';
import {
  CODE_REFUSALS,
  ORDER_CODE_REASONS,
  ORDER_STATES,
  REFUND_ASK_ENGLISH,
  REFUND_ASK_REASONS,
  REFUND_REASON_MAX,
  REFUND_REFUSAL_WORDS,
  adjustmentKindOf,
  isSettled,
  mayAskRefund,
  orderCodeOutcomeOf,
  orderCodeReasonOf,
  orderCodeStatusOf,
  orderLinesOf,
  orderStateOf,
  refundAskOutcomeOf,
  refundAskReasonOf,
  refundAskStatusOf,
  refundRuleOf,
  refundStandingShownOf,
} from './orders-outcome.ts';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
const MIGRATIONS = '../../../supabase/migrations/';
const WAIVER = read(`${MIGRATIONS}20261281013000_withdrawal_waiver.sql`);
const REFUNDS_SQL = read(`${MIGRATIONS}20261020000300_refunds_and_payouts.sql`);
const QUOTE_SQL = read(`${MIGRATIONS}20261240000100_course_order_quote.sql`);
const REMOVAL_SQL = read(`${MIGRATIONS}20261241000100_order_promotion_removal.sql`);
const REFERRALS_SQL = read(`${MIGRATIONS}20261281000900_referrals.sql`);
const COMMERCE_SQL = read(`${MIGRATIONS}20261020000100_orders.sql`);
const PAGE = read('../app/orders/page.tsx');
const REFUND_FORM = read('../app/orders/refund-form.tsx');
const CODE_FORM = read('../app/orders/promotion-actions.tsx');
const REFUND_ROUTE = read('../app/api/refunds/route.ts');
const CODE_ROUTE = read('../app/api/orders/promotion/route.ts');
const REFUNDS_LIB = read('./refunds.ts');

/** The body of one function in a migration. */
function body(sql: string, name: string): string {
  const start = sql.indexOf(`create or replace function public.${name}(`);
  assert.ok(start >= 0, name);
  return sql.slice(start, sql.indexOf('\n$$;', start));
}

test('every state an order can be in has a word, and a state nobody named has none', () => {
  // The states are the database's own list.
  const check = /check \(status in\s+\('draft', 'pending_payment', 'awaiting_confirmation', 'paid', 'partially_refunded',\s+'refunded', 'cancelled', 'failed', 'expired'\)\)/u;
  assert.match(COMMERCE_SQL, check);
  assert.deepEqual([...ORDER_STATES], ['draft', 'pending_payment', 'awaiting_confirmation', 'paid', 'partially_refunded', 'refunded', 'cancelled', 'failed', 'expired']);
  for (const state of ORDER_STATES) assert.equal(orderStateOf(state), state);
  for (const other of ['PAID', 'chargeback', '', null, undefined, 3]) assert.equal(orderStateOf(other), null);
  // Each has a sentence on the page.
  for (const state of ORDER_STATES) assert.match(PAGE, new RegExp(`^  ${state}: 'orders\\.st[A-Za-z]+',$`, 'mu'), state);

  // A receipt exists once money has moved; a refund can be asked for while some of it is still here.
  assert.deepEqual(ORDER_STATES.filter(isSettled), ['paid', 'partially_refunded', 'refunded']);
  assert.deepEqual(ORDER_STATES.filter(mayAskRefund), ['paid', 'partially_refunded']);
  assert.equal(isSettled(null), false);
  assert.equal(mayAskRefund(null), false);
});

test('a total is broken down only when something moved it, and each part has its sign', () => {
  assert.deepEqual(orderLinesOf({ subtotalMinor: '50000', discountMinor: '0', taxMinor: '0', feeMinor: '0' }), []);
  assert.deepEqual(orderLinesOf({ subtotalMinor: '50000', discountMinor: '', taxMinor: '00', feeMinor: '0' }), []);
  assert.deepEqual(orderLinesOf({ subtotalMinor: '50000', discountMinor: '5000', taxMinor: '8100', feeMinor: '500' }), [
    { kind: 'subtotal', minor: '50000', sign: '' },
    { kind: 'discount', minor: '5000', sign: '−' },
    { kind: 'tax', minor: '8100', sign: '+' },
    { kind: 'fee', minor: '500', sign: '+' },
  ]);
  assert.deepEqual(orderLinesOf({ subtotalMinor: '50000', discountMinor: '0', taxMinor: '0', feeMinor: '500' }).map((l) => l.kind), ['subtotal', 'fee']);

  assert.equal(adjustmentKindOf('promotion'), 'discount');
  assert.equal(adjustmentKindOf('manual_discount'), 'discount');
  assert.equal(adjustmentKindOf('tax'), 'tax');
  assert.equal(adjustmentKindOf('fee'), 'fee');
  // A kind with no word of its own is "an adjustment"; the database's word is not printed.
  for (const other of ['shipping', 'rounding', 'something_new', null]) assert.equal(adjustmentKindOf(other), 'other');
});

test('the standing of a refund is drawn from its name, and no answer is not a closed window', () => {
  const base = { reason: 'allowed', allowed: true, asStaff: false, closesAt: '2026-11-22T09:14:00Z', refundableMinor: '30000', currencyCode: 'UGX', withdrawalRule: 'policy_window' };
  assert.deepEqual(refundStandingShownOf(base), { kind: 'open', closesAt: '2026-11-22T09:14:00Z', rule: null, refundableMinor: '30000', currencyCode: 'UGX' });
  assert.equal(refundStandingShownOf(null).kind, 'unread');
  assert.deepEqual(refundStandingShownOf({ ...base, reason: 'window_closed', allowed: false, withdrawalRule: 'statutory_14_days' }), { kind: 'closed', closedAt: '2026-11-22T09:14:00Z', rule: 'law' });
  assert.deepEqual(refundStandingShownOf({ ...base, reason: 'nothing_left', allowed: false }), { kind: 'nothing_left' });
  // Everything the page cannot stand behind is unread: a reason it does not
  // know, "allowed" with no date or no amount, and staff (who have no clock).
  assert.equal(refundStandingShownOf({ ...base, reason: 'not_paid', allowed: false }).kind, 'unread');
  assert.equal(refundStandingShownOf({ ...base, reason: 'something_new' }).kind, 'unread');
  assert.equal(refundStandingShownOf({ ...base, allowed: false }).kind, 'unread');
  assert.equal(refundStandingShownOf({ ...base, closesAt: null }).kind, 'unread');
  assert.equal(refundStandingShownOf({ ...base, closesAt: 'soon' }).kind, 'unread');
  assert.equal(refundStandingShownOf({ ...base, refundableMinor: '0' }).kind, 'unread');
  assert.equal(refundStandingShownOf({ ...base, currencyCode: 'XX' }).kind, 'unread');
  assert.equal(refundStandingShownOf({ ...base, asStaff: true }).kind, 'unread');

  assert.equal(refundRuleOf('statutory_14_days'), 'law');
  assert.equal(refundRuleOf('waived_policy_window'), 'waived');
  assert.equal(refundRuleOf('policy_window'), null);
  assert.equal(refundRuleOf(null), null);

  // The names are the database's: its reasons and its rules.
  const standing = body(WAIVER, 'refund_standing');
  assert.deepEqual([...new Set([...standing.matchAll(/v_reason\s+:= '([a-z_]+)'/gu)].map((m) => m[1]))].sort(), ['allowed', 'not_paid', 'nothing_left', 'window_closed']);
  const window = body(WAIVER, 'order_withdrawal_window');
  for (const rule of ['statutory_14_days', 'waived_policy_window', 'policy_window']) assert.ok(window.includes(`'${rule}'`), rule);
});

test('every refusal of a refund request the database raises has a name here, and none is "failed"', () => {
  const writer = body(WAIVER, 'request_refund');
  // What it raises, with what is put in cut away.
  const raised = [...writer.matchAll(/raise exception\s+'([^']+)'/gu)].map((m) => m[1]!);
  assert.equal(raised.length, 6);
  for (const sentence of raised) {
    const said = sentence.replace(/%/gu, 'x');
    assert.notEqual(refundAskReasonOf({ code: '23514', message: said }), 'failed', sentence);
  }
  // And the trigger behind the insert.
  assert.match(REFUNDS_SQL, /'refund request of % exceeds the refundable balance of %'/u);
  // Every phrase this file matches on is one the database still says.
  for (const [words] of REFUND_REFUSAL_WORDS) assert.ok((writer + REFUNDS_SQL).includes(words), words);

  const named = (message: string, code = '23514') => refundAskReasonOf({ code, message });
  assert.equal(named('sign in to request a refund', '42501'), 'not_signed_in');
  // An order that is somebody else's and one that is not there: one answer.
  assert.equal(named('order not found', 'P0002'), 'not_yours');
  assert.equal(named('you are not on the billing account for this order', '42501'), 'not_yours');
  assert.equal(named('order is pending_payment, so there is nothing to refund'), 'not_paid');
  assert.equal(named('refund request of 99999 exceeds the refundable balance of 30000'), 'too_much');
  assert.equal(named('the refund window closed on 26 Oct 2026 at 09:14 UTC — a refund can be asked for within 72 hours of payment'), 'window_closed');
  assert.equal(named('say what the refund is for'), 'reason_required');
  // Answered, in words nobody wrote a sentence for.
  assert.equal(named('new row violates check constraint'), 'failed');
  // Not the database's answer: a request may have been recorded.
  assert.equal(refundAskReasonOf({ message: 'you are not on the billing account for this order' }), 'unconfirmed');
  assert.equal(refundAskReasonOf({ code: null, message: 'fetch failed' }), 'unconfirmed');
  assert.equal(refundAskReasonOf({ code: '08006', message: 'say what the refund is for' }), 'unconfirmed');
});

test('every refusal of a code on an order the database raises has a name here', () => {
  // The two writers, and the check on the code that the first one calls.
  const apply = body(QUOTE_SQL, 'apply_promotion_to_order');
  const remove = body(REMOVAL_SQL, 'remove_promotion_from_order');
  const keysOf = (sql: string) => [...new Set([...sql.matchAll(/raise exception 'promotion:([a-z_]+)'/gu)].map((m) => m[1]!))].sort();
  assert.deepEqual(keysOf(apply), ['already_applied', 'code_required', 'not_signed_in', 'not_your_order', 'order_not_found', 'order_not_pending']);
  assert.deepEqual(keysOf(remove), ['none_applied', 'not_signed_in', 'not_your_order', 'order_not_found', 'order_not_pending']);
  const named = (key: string) => orderCodeReasonOf({ code: 'P0001', message: `promotion:${key}` });
  for (const key of [...keysOf(apply), ...keysOf(remove)]) assert.notEqual(named(key), 'failed', key);
  assert.equal(named('order_not_found'), 'not_yours');
  assert.equal(named('not_your_order'), 'not_yours');
  assert.equal(named('code_required'), 'malformed');
  assert.equal(named('order_not_pending'), 'order_not_pending');

  // What a code itself is refused for, wherever it is checked. `no_benefit`
  // is a campaign set up with nothing in it: the buyer can do nothing about
  // it, so it is "failed" and is logged.
  const codeKeys = [...new Set([...keysOf(REMOVAL_SQL), ...keysOf(REFERRALS_SQL)])].filter(
    (key) => !['already_applied', 'code_required', 'none_applied', 'not_signed_in', 'not_your_order', 'order_not_found', 'order_not_pending'].includes(key),
  );
  assert.deepEqual(codeKeys.sort(), [...CODE_REFUSALS, 'no_benefit'].sort());
  for (const key of CODE_REFUSALS) assert.equal(named(key), key);
  assert.equal(named('no_benefit'), 'failed');
  assert.equal(named('something_new'), 'failed');
  assert.equal(orderCodeReasonOf({ message: 'promotion:unknown_code' }), 'unconfirmed');
  assert.equal(orderCodeReasonOf({ code: '08P01', message: 'promotion:unknown_code' }), 'unconfirmed');
});

test('each name has its own status, and a form believes a name only with it', () => {
  assert.deepEqual(Object.fromEntries(REFUND_ASK_REASONS.map((r) => [r, refundAskStatusOf(r)])), {
    reason_required: 400, too_long: 400, not_yours: 403, not_paid: 409, too_much: 409, window_closed: 409,
    not_signed_in: 401, malformed: 400, failed: 500, unconfirmed: 502,
  });
  assert.equal(refundAskOutcomeOf(409, 'window_closed'), 'window_closed');
  assert.equal(refundAskOutcomeOf(400, 'window_closed'), 'unconfirmed');
  assert.equal(refundAskOutcomeOf(502, 'bad gateway'), 'unconfirmed');
  assert.equal(refundAskOutcomeOf(403, undefined), 'unconfirmed');
  // A name that belongs to a code is not one a refund can be answered with.
  assert.equal(refundAskOutcomeOf(409, 'already_applied'), 'unconfirmed');

  for (const reason of ORDER_CODE_REASONS) {
    const expected = reason === 'not_signed_in' ? 401 : reason === 'malformed' ? 400 : reason === 'not_yours' ? 403 : reason === 'failed' ? 500 : reason === 'unconfirmed' ? 502 : 409;
    assert.equal(orderCodeStatusOf(reason), expected, reason);
    assert.equal(orderCodeOutcomeOf(expected, reason), reason);
    assert.equal(orderCodeOutcomeOf(expected === 409 ? 422 : 409, reason), 'unconfirmed', reason);
  }
  assert.equal(orderCodeOutcomeOf(409, 'too_much'), 'unconfirmed');
  // Every name has its English, for a caller with no words of its own.
  assert.deepEqual(Object.keys(REFUND_ASK_ENGLISH).sort(), [...REFUND_ASK_REASONS].sort());
});

test('the two routes name their refusals and never send the database\'s sentence', () => {
  // Asking for a refund.
  assert.match(REFUND_ROUTE, /NextResponse\.json\(\{ ok: false, reason, error \}, \{ status: refundAskStatusOf\(reason\), headers: NO_STORE \}\);/u);
  assert.match(REFUND_ROUTE, /if \(!result\.ok\) return refuse\(result\.reason, result\.error\);/u);
  assert.match(REFUND_ROUTE, /\} catch \{\s+\/\/ No answer at all[^\n]*\n\s+return refuse\('unconfirmed'\);/u);
  assert.doesNotMatch(REFUND_ROUTE, /error\.message/u);
  // The library behind it: the database's sentence is logged, and what goes back is this file's.
  const ask = REFUNDS_LIB.slice(REFUNDS_LIB.indexOf('export async function requestRefund('), REFUNDS_LIB.indexOf('export async function fetchRefundQueue('));
  assert.match(ask, /const why = refundAskReasonOf\(error\);\s+\/\/[^\n]*\n\s+if \(why === 'failed'\) console\.error\([^\n]*error\.message\);\s+return refuseAsk\(why\);/u);
  assert.equal(ask.match(/error\.message/gu)?.length, 1);
  assert.match(REFUNDS_LIB, /const REQUEST_REASON_MAX = REFUND_REASON_MAX;/u);
  assert.equal(REFUND_REASON_MAX, 1000);

  // A code on an order.
  assert.match(CODE_ROUTE, /NextResponse\.json\(\{ ok: false, reason, message \}, \{ status: orderCodeStatusOf\(reason\), headers: NO_STORE \}\);/u);
  assert.match(CODE_ROUTE, /if \(why === 'failed'\) console\.error\(/u);
  // Only a sentence written for a person about a code leaves; never one for an answer that was not the database's.
  assert.match(CODE_ROUTE, /if \(result\.code === 'promotion_refused' && why !== 'unconfirmed' && why !== 'failed'\) return refuse\(why, result\.message\);\s+return refuse\(why, FIXED\[why\] \?\? ORDER_CODE_ENGLISH\);/u);
  assert.match(CODE_ROUTE, /\} catch \{\s+\/\/ No answer at all[^\n]*\n\s+return refuse\('unconfirmed'\);/u);
  // Neither route takes an amount it would believe: a refund's is checked against the balance by the database, a code's is the writer's.
  assert.doesNotMatch(CODE_ROUTE, /body\.amount|body\.discount|body\.total/u);
});

test('the page says everything through the catalogue, and unread is not empty', () => {
  assert.doesNotMatch(PAGE, /'use client'/u);
  assert.match(PAGE, /languageShownFor\(locale, 'orders'\)/u);
  assert.match(PAGE, /const frame = shown\.code !== locale \? \{ lang: shown\.code, dir: shown\.dir \} : \{\};/u);
  // Every key it asks for exists.
  const asked = [...PAGE.matchAll(/'((?:orders|account|buy|refer|merge|sponsor|footer|action|auth)\.[A-Za-z0-9]+)'/gu)].map((m) => m[1]!);
  for (const key of asked) assert.ok(Object.hasOwn(en, key), `${key} is not a sentence`);
  // And every sentence written for this page is asked for by it.
  const own = Object.keys(en).filter((key) => key.startsWith('orders.'));
  assert.equal(own.length, 54);
  for (const key of own) assert.ok(asked.includes(key), `${key} is written and never said`);
  // No English text sits in the markup: every text node is an expression.
  assert.doesNotMatch(PAGE, />\s*[A-Z][a-z]+ [a-z]+[^<{]*</u);
  // The old describers, which wrote English, are gone from this page.
  assert.doesNotMatch(PAGE, /describeOrderBreakdown|describeOrderAdjustment|STATUS_LABEL|\.message\b|toLocaleString/u);

  // Orders that could not be read are null, and null is said aloud before "none".
  assert.match(PAGE, /let orders: OrderRow\[\] \| null = null;/u);
  assert.match(PAGE, /orders = read\.error \? null : \(\(read\.data \?\? \[\]\) as unknown as OrderRow\[\]\);/u);
  assert.match(PAGE, /\{orders === null && \(\s*<div className="notice error" role="alert" data-orders="unread">/u);
  assert.match(PAGE, /\{orders !== null && orders\.length === 0 && \(/u);
  // A standing that could not be read is said as that, not as a refusal.
  assert.match(PAGE, /standings\[o\.id\] = refundStandingShownOf\(await fetchRefundStanding\(supabase, o\.id\)\);/u);
  assert.match(PAGE, /data-refund=\{standing\?\.kind \?\? 'unread'\}/u);
  // "Paid" is said only for an order the database calls paid.
  assert.match(PAGE, /\{returned && orderStateOf\(returned\.status\) === 'paid' && \(/u);
  // What is asked for is what is left, as the database counts it; never the order's total.
  assert.match(PAGE, /amountMinor=\{standing\.refundableMinor\}/u);
  assert.doesNotMatch(PAGE, /amountMinor=\{o\.total_minor\}/u);
  // Amounts in major units, left to right; dates with their zone, in UTC.
  assert.match(PAGE, /const when = \(iso: string\) => formatDateTime\(shown\.code, iso, 'UTC'\);/u);
  assert.match(PAGE, /\{ltr \? <bdi dir="ltr">\{value\}<\/bdi> : <bdi>\{value\}<\/bdi>\}/u);
  assert.doesNotMatch(PAGE, /fromMinor|format\(/u);
  // A title somebody typed and a note somebody wrote keep their own direction.
  assert.match(PAGE, /<bdi>\{title\}<\/bdi>/u);
  assert.equal(PAGE.match(/<> <bdi dir="auto" className="order-note">/gu)?.length, 2);

  // The forms: scripts, so no catalogue key and never the server's sentence.
  for (const [name, form, outcome] of [['refund', REFUND_FORM, 'refundAskOutcomeOf'], ['code', CODE_FORM, 'orderCodeOutcomeOf']] as const) {
    assert.match(form, /^'use client';/u, name);
    assert.doesNotMatch(form, /'(?:orders|buy|account|sponsor|action)\.[A-Za-z]+'|@\/lib\/i18n|@\/lib\/refunds|@\/lib\/checkout'|@\/lib\/withdrawal/u, name);
    assert.doesNotMatch(form, /json\??\.message|json\??\.error|toLocaleString/u, name);
    assert.match(form, new RegExp(`${outcome}\\(res\\.status, json\\?\\.reason\\)`, 'u'), name);
    // A request that could not be made is caught, and said as "we could not confirm".
    assert.match(form, /\} catch \{\s+setSaid\(\{ tone: 'warn', text: words\.reasons\.unconfirmed \}\);/u, name);
    assert.doesNotMatch(form, /placeholder=/u, name);
  }
  // What somebody types keeps its own direction; a code is left to right.
  assert.match(REFUND_FORM, /dir="auto"/u);
  assert.match(CODE_FORM, /dir="ltr"/u);
  // Success is the status the route answers with, not "anything in the two hundreds".
  assert.match(REFUND_FORM, /if \(res\.status === 201 && json\?\.ok === true\) \{/u);
});

test('what the sentences promise is what is true, in every language', () => {
  const CODES = Object.keys(ORDERS) as LocaleCode[];
  assert.equal(CODES.length, 27);
  // What is put in closes its sentence, so nothing has to be inflected around it.
  const gapped = (Object.keys(en) as (keyof typeof en)[]).filter((key) => key.startsWith('orders.') && /\{[a-z]+\}/u.test(en[key]));
  assert.deepEqual(gapped.map((key) => key.slice(7)).sort(), ['adjOther', 'lnDiscount', 'lnFee', 'lnSubtotal', 'lnTax', 'placedOn', 'rfAmount', 'rfClosed', 'rfUntil', 'total']);
  for (const code of ['en' as LocaleCode, ...CODES]) {
    for (const key of gapped) {
      const said = messagesFor(code)[key];
      assert.match(said, /[:：]\s?\{(?:amount|date)\}$/u, `${code}.${key}: "${said}"`);
      assert.equal(said.split(/\{[a-z]+\}/u).length, 2, `${code}.${key}`);
    }
  }
  // Asking is not a refund, and coming back is not confirmation.
  assert.match(en['orders.rfSent'], /Nothing has been refunded yet\.$/u);
  assert.match(en['orders.rfNote'], /Access stays open until a refund is actually paid back\.$/u);
  assert.match(en['orders.footNote'], /Coming back from a payment screen is not confirmation\.$/u);
  assert.doesNotMatch(en['orders.waitBody'], /\bwill be confirmed\b|\bshortly\b|\bin a moment\b/iu);
  // The rule is said without a country or a statute, and the unread sentences say that nothing changed.
  for (const key of ['orders.rfRuleLaw', 'orders.rfRuleWaived'] as const) assert.doesNotMatch(en[key], /Uganda|EU|Europe|Act|Directive/u, key);
  assert.match(en['orders.unread'], /Nothing has changed/u);
  // Nobody is named, and nobody is given a gender.
  for (const key of Object.keys(en).filter((k) => k.startsWith('orders.')) as (keyof typeof en)[]) {
    assert.doesNotMatch(en[key], /\b(he|she|his|her|him|owner|finance|admin)\b/iu, key);
  }
});
