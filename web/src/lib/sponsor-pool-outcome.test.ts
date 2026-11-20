import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { messagesFor } from './i18n/index.ts';
import type { LocaleCode } from './i18n/locales.ts';
import { en } from './i18n/messages/en.ts';
import { SPONSOR } from './i18n/messages/sponsor.ts';
import {
  ASK_REASON_MAX,
  ASK_SEAT_REASONS,
  PLEDGE_SEAT_REASONS,
  SEAT_NOTE_MAX,
  askSeatOutcomeOf,
  askSeatReasonOf,
  pledgeSeatOutcomeOf,
  pledgeSeatReasonOf,
  seatStatusOf,
} from './sponsor-pool-outcome.ts';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
const MIGRATION = read('../../../supabase/migrations/20261281001000_sponsorship.sql');
const ROUTE = read('../app/api/sponsorship/route.ts');
const POOL = read('../app/sponsor/page.tsx');
const POOL_FORM = read('../app/sponsor/sponsor-pool.tsx');
const ASK = read('../app/sponsor/apply/page.tsx');
const ASK_FORM = read('../app/sponsor/apply/apply-form.tsx');

/** The body of one function in the migration. */
function body(name: string): string {
  const start = MIGRATION.indexOf(`create or replace function public.${name}(`);
  assert.ok(start > 0, name);
  return MIGRATION.slice(start, MIGRATION.indexOf('\n$$;', start));
}
const raised = (name: string) => [...new Set([...body(name).matchAll(/raise exception 'sponsorship:([a-z_]+)'/gu)].map((m) => m[1]!))].sort();

test('every refusal the database raises for taking a seat has a name here, and none is "failed"', () => {
  const keys = raised('pledge_sponsorship');
  assert.deepEqual(keys, ['disabled', 'no_price_for_you', 'not_signed_in', 'note_too_long', 'own_seat', 'seat_not_found', 'seat_not_open', 'seat_taken']);
  const named = (key: string) => pledgeSeatReasonOf({ code: 'P0001', message: `sponsorship:${key}` });
  for (const key of keys) assert.notEqual(named(key), 'failed', key);
  // A seat somebody else took, one that closed, and a code that names none: one answer.
  assert.deepEqual(['seat_taken', 'seat_not_open', 'seat_not_found'].map(named), ['gone', 'gone', 'gone']);
  assert.equal(named('own_seat'), 'own_seat');
  assert.equal(named('no_price_for_you'), 'no_price');
  assert.equal(named('disabled'), 'off');
  assert.equal(named('note_too_long'), 'too_long');
  // The length this file names is the one the database checks.
  assert.match(body('pledge_sponsorship'), new RegExp(`length\\(v_note\\) > ${SEAT_NOTE_MAX} then`, 'u'));
});

test('every refusal the database raises for asking has a name here, and none is "failed"', () => {
  const keys = raised('apply_for_sponsorship');
  assert.deepEqual(keys, ['already_asked', 'already_has_access', 'course_not_available', 'disabled', 'learner_not_yours', 'learner_required', 'not_signed_in', 'reason_required', 'reason_too_long']);
  const named = (key: string) => askSeatReasonOf({ code: 'P0001', message: `sponsorship:${key}` });
  for (const key of keys) assert.notEqual(named(key), 'failed', key);
  assert.equal(named('already_has_access'), 'has_course');
  assert.equal(named('learner_required'), 'choose');
  assert.equal(named('reason_too_long'), 'too_long');
  assert.match(body('apply_for_sponsorship'), new RegExp(`length\\(v_reason\\) > ${ASK_REASON_MAX} then`, 'u'));
});

test('an error that is not the database\'s answer is "unconfirmed", and one nobody named is "failed"', () => {
  for (const reasonOf of [pledgeSeatReasonOf, askSeatReasonOf]) {
    // No SQLSTATE, or the connection's own class: something may have been written.
    assert.equal(reasonOf({ code: null, message: 'fetch failed' }), 'unconfirmed');
    assert.equal(reasonOf({ code: '', message: 'sponsorship:seat_taken' }), 'unconfirmed');
    assert.equal(reasonOf({ code: '08006', message: 'sponsorship:disabled' }), 'unconfirmed');
    assert.equal(reasonOf({ message: 'upstream connect error' }), 'unconfirmed');
    // Answered, and not in words anybody wrote a sentence for.
    assert.equal(reasonOf({ code: '23514', message: 'new row violates check constraint' }), 'failed');
    assert.equal(reasonOf({ code: 'P0001', message: 'sponsorship:something_new' }), 'failed');
    assert.equal(reasonOf({ code: '42501', message: 'sponsorship:not_signed_in' }), 'not_signed_in');
  }
});

test('each name has its own status, and a form believes a name only with it', () => {
  const statuses = Object.fromEntries([...new Set([...PLEDGE_SEAT_REASONS, ...ASK_SEAT_REASONS])].map((r) => [r, seatStatusOf(r)]));
  assert.deepEqual(statuses, {
    gone: 409, own_seat: 409, no_price: 409, off: 409, too_long: 400, not_signed_in: 401, malformed: 400, failed: 500, unconfirmed: 502,
    reason_required: 400, choose: 400, learner_not_yours: 403, no_course: 404, has_course: 409, already_asked: 409,
  });
  assert.equal(pledgeSeatOutcomeOf(409, 'gone'), 'gone');
  assert.equal(pledgeSeatOutcomeOf(200, 'gone'), 'unconfirmed');
  assert.equal(pledgeSeatOutcomeOf(502, 'bad gateway'), 'unconfirmed');
  assert.equal(pledgeSeatOutcomeOf(409, undefined), 'unconfirmed');
  // A name that belongs to asking is not one taking a seat can be answered with, and the other way round.
  assert.equal(pledgeSeatOutcomeOf(409, 'already_asked'), 'unconfirmed');
  assert.equal(askSeatOutcomeOf(409, 'gone'), 'unconfirmed');
  assert.equal(askSeatOutcomeOf(409, 'already_asked'), 'already_asked');
  assert.equal(askSeatOutcomeOf(404, 'no_course'), 'no_course');
  assert.equal(askSeatOutcomeOf(500, 'failed'), 'failed');
});

test('the route names its refusals of asking and taking, and never sends the database\'s sentence', () => {
  assert.match(ROUTE, /const why = askSeatReasonOf\(error\);/u);
  assert.match(ROUTE, /const why = pledgeSeatReasonOf\(error\);/u);
  // The reply carries the name and this route's own English; the database's goes to the log.
  assert.match(ROUTE, /\{ ok: false, reason, code: reason, message: SEAT_SENTENCES\[reason\] \},\s+\{ status: seatStatusOf\(reason\), headers: NO_STORE \},/u);
  assert.equal(ROUTE.match(/if \(why === 'failed'\) console\.error\(/gu)?.length, 2);
  // Both writers are inside a try: no answer at all is "unconfirmed", not a crash.
  assert.equal(ROUTE.match(/\} catch \{\s+\/\/ No answer at all[^\n]*\n\s+return refuseSeat\('unconfirmed'\);/gu)?.length, 2);
  // Every name has a sentence in the route, for a caller with no words of its own.
  for (const reason of new Set([...PLEDGE_SEAT_REASONS, ...ASK_SEAT_REASONS])) {
    assert.match(ROUTE, new RegExp(`^  ${reason}: '`, 'mu'), reason);
  }
  // No amount is ever taken from the browser.
  assert.doesNotMatch(ROUTE, /body\.amount|amountMinor/u);
});

test('the two pages say everything through the catalogue, and unread is not empty', () => {
  for (const [name, page] of [['pool', POOL], ['ask', ASK]] as const) {
    assert.doesNotMatch(page, /'use client'/u, name);
    assert.match(page, /languageShownFor\(locale, 'sponsor'\)/u, name);
    assert.match(page, /const frame = shown\.code !== locale \? \{ lang: shown\.code, dir: shown\.dir \} : \{\};/u, name);
    // Every key it asks for exists.
    for (const match of page.matchAll(/'((?:sponsor|account|buy|refer|family|audience|difficulty|action|auth)\.[A-Za-z0-9]+)'/gu)) {
      assert.ok(Object.hasOwn(en, match[1]!), `${name}: ${match[1]} is not a sentence`);
    }
    // No English text sits in the markup: every text node is an expression.
    assert.doesNotMatch(page, />\s*[A-Z][a-z]+ [a-z]+[^<{]*</u, name);
  }
  // The pool: an error is not read as an empty pool, and is said aloud.
  assert.match(POOL, /pool = error \? null : parsePool\(data\);/u);
  assert.match(POOL, /\{\(!supabase \|\| user\) && !pool && \(\s*<div className="notice error" role="alert" data-pool="unread">/u);
  // A price in major units, or the seat cannot be taken; the database's words for a course are never printed.
  assert.match(POOL, /const price = seat\.amountMinor && seat\.currencyCode \? amountOf\(seat\.amountMinor, seat\.currencyCode\) : null;/u);
  assert.doesNotMatch(POOL, /\{seat\.difficulty\}|\{seat\.audience\}|seatPrice\(|audienceWords\(|pledgeNextStep\(|ZAKAT_HONESTY/u);
  // Asking: a list that could not be read is said as that, before "there is nobody to ask for".
  assert.match(ASK, /const unread = Boolean\(learnersRead\.error \|\| coursesRead\.error\);/u);
  assert.match(ASK, /\{unread \? \(\s*<div className="notice error" role="alert" data-ask="unread">/u);

  // The forms: scripts, so no catalogue key and never the server's sentence.
  for (const [name, form, outcome] of [['pool', POOL_FORM, 'pledgeSeatOutcomeOf'], ['ask', ASK_FORM, 'askSeatOutcomeOf']] as const) {
    assert.match(form, /^'use client';/u, name);
    assert.doesNotMatch(form, /'(?:sponsor|buy|account|refer|family)\.[A-Za-z]+'|@\/lib\/i18n|@\/lib\/sponsorship'/u, name);
    assert.doesNotMatch(form, /out\??\.message|json\??\.message|\.error\b/u, name);
    assert.match(form, new RegExp(`${outcome}\\(res\\.status, out\\?\\.reason\\)`, 'u'), name);
    // A request that could not be made is caught, and said as "we could not confirm".
    assert.match(form, /\} catch \{\s+setSaid\(\{ tone: 'warn', text: words\.reasons\.unconfirmed, link: true \}\);/u, name);
    // What somebody types keeps its own direction.
    assert.match(form, /dir="auto"/u, name);
  }
  // The pool sends no amount, and the seat's code is set left to right.
  assert.match(POOL_FORM, /body: JSON\.stringify\(\{ action: 'pledge', seatCode: seat\.seatCode, country, note: note\[seat\.seatCode\] \?\? null \}\),/u);
  assert.match(POOL_FORM, /<bdi dir="ltr">\{seat\.seatCode\}<\/bdi>/u);
  // Two sentences are never joined with a full stop of this file's own.
  assert.doesNotMatch(POOL_FORM, /\{'\. '\}/u);
});

test('what the new sentences promise is what is true', () => {
  const CODES = Object.keys(SPONSOR) as LocaleCode[];
  // Taking a seat takes no money, with a payment service or without one.
  assert.match(en['sponsor.plPayBody'], /Taking a seat is a pledge and takes no money\./u);
  assert.doesNotMatch(en['sponsor.plPayBody'], /\b(card|mobile|provider|staff record)\b/iu);
  // The amount closes its sentence in every language, so nothing has to be inflected around it.
  for (const code of ['en' as LocaleCode, ...CODES]) {
    const said = messagesFor(code)['sponsor.plTaken'];
    assert.ok(said.endsWith('{amount}') && said.split('{amount}').length === 2, `${code}: "${said}"`);
  }
  // Nobody is named, and nobody is given a gender.
  for (const key of Object.keys(en).filter((k) => /^sponsor\.(pl|rq)/u.test(k)) as (keyof typeof en)[]) {
    assert.doesNotMatch(en[key], /\b(he|she|his|her|him|owner|finance)\b/iu, key);
  }
  assert.match(en['sponsor.plSeeBody'], /Not the learner’s name, age or family, and not a word of what they wrote\./u);
  assert.match(en['sponsor.rqPrivacy'], /Never your name, your family or what you wrote here\.$/u);
  assert.match(en['sponsor.rqReasonNote'], /Not shown to whoever pays for the seat\.$/u);
});
