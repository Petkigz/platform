import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { LOCALES } from './i18n/index.ts';
import { CATALOGUES } from './i18n/messages/catalogues.ts';
import { en } from './i18n/messages/en.ts';
import { HELD_FOR_REVIEW } from './i18n/messages/held.ts';
import { REVIEW } from './i18n/messages/review.ts';
import {
  ASSIGNMENT_STATUS_LABEL,
  BIO_MAX,
  CONFLICT_STATUS_LABEL,
  CONFLICT_TYPE_LABEL,
  DECISION_LABEL,
  QUALIFICATION_STATUS_LABEL,
  QUALIFICATION_TYPE_LABEL,
  REVIEWER_STATUS_LABEL,
  SCOPE_LABEL,
  mapReviewerError,
} from './review.ts';
import {
  ASSIGNMENT_STATUS_KEY,
  CONFLICT_STATUS_KEY,
  CONFLICT_TYPE_KEY,
  DECISION_MADE_KEY,
  QUALIFICATION_STATUS_KEY,
  QUALIFICATION_TYPE_KEY,
  REGISTER_LIMITS,
  REGISTER_REFUSALS,
  REGISTER_REFUSAL_KEY,
  REVIEWER_STATUS_KEY,
  SCOPE_KEY,
  checkConflict,
  checkQualification,
  checkReviewerBio,
  isRegisterRefusal,
  registerRefusalOf,
  registerRefusalSentence,
  registerStatusOf,
} from './review-register.ts';

// The review queue and a reviewer's place on the register, put into the
// reader's language on 2026-11-27.

const read = (path: string): string => readFileSync(new URL(path, import.meta.url), 'utf8');
const LANGUAGES = LOCALES.map((l) => l.code).filter((code) => code !== 'en' && !Object.hasOwn(HELD_FOR_REVIEW, code));
const blanks = (text: string) => [...text.matchAll(/\{([a-zA-Z]+)\}/gu)].map((m) => m[1]).sort().join(',');
const strip = (source: string) => source.replace(/\/\*[\s\S]*?\*\//gu, '').replace(/^\s*\/\/.*$/gmu, '');

const PAGE = read('../app/review/page.tsx');
const REGISTER = read('../app/review/my-register.tsx');
const ROUTE = read('../app/api/review/profile/route.ts');
const HELPERS = read('./review-register.ts');
const KEYS = (Object.keys(en) as (keyof typeof en)[]).filter((key) => key.startsWith('review.'));
const SUBJECT = '11111111-1111-4111-8111-111111111111';

// A word that is the same word in that language. Anything else that equals
// the English sentence was not translated.
const SAME_WORD = new Set(['es review.ctPersonal', 'fil review.ctPersonal', 'vi review.qtIjazah', 'fil review.qtIjazah']);

test('review. is written in every language the dashboard is', () => {
  assert.equal(KEYS.length, 96);
  assert.deepEqual(Object.keys(REVIEW).sort(), [...LANGUAGES].sort());
  for (const code of LANGUAGES) {
    const own = REVIEW[code];
    assert.ok(own, code);
    assert.deepEqual(Object.keys(own).sort(), [...KEYS].sort(), code);
    for (const key of KEYS) {
      const value: string = own[key]!;
      assert.ok(value.trim() !== '' && value === value.trim(), `${code} ${key}`);
      assert.equal(blanks(value), blanks(en[key]), `${code} ${key} changed its gaps`);
      assert.equal(CATALOGUES[code]?.[key], value, `${code} ${key} is served`);
      if (!SAME_WORD.has(`${code} ${key}`)) assert.notEqual(value, en[key], `${code} ${key} is the English sentence`);
    }
    if (code.startsWith('zh')) assert.ok(!Object.values(own).join('').includes('您'), code);
    if (code === 'th') assert.ok(!Object.values(own).some((value) => value.endsWith('.')), 'Thai does not close a sentence with a full stop');
    if (code === 'fr') assert.ok(!/[^\u00a0]:/u.test(Object.values(own).join('\n')), 'French has a no-break space before a colon');
    if (code === 'uz') assert.ok(!/['\u2018\u2019]/u.test(Object.values(own).join('')), 'Uzbek uses U+02BB and U+02BC');
  }
});

test('one thing has one name, and states that differ are told apart', () => {
  const told = (all: Record<string, string | undefined>, keys: Record<string, keyof typeof en>, code: string) => {
    const values = Object.values(keys).map((key) => all[key]);
    assert.equal(new Set(values).size, new Set(Object.values(keys)).size, `${code}: ${Object.values(keys).join(' ')}`);
  };
  for (const code of LANGUAGES) {
    const all = CATALOGUES[code]! as Record<string, string | undefined>;
    assert.equal(all['review.back'], all['panel.back'], code);
    // The register is called what `/panel` calls it.
    const register = all['panel.register']!.split(/\s+/u).at(-1)!.toLowerCase().slice(0, 4);
    assert.ok(all['review.applyWhy']!.toLowerCase().includes(register), `${code}: the register is named as on /panel`);
    told(all, ASSIGNMENT_STATUS_KEY, code);
    told(all, SCOPE_KEY, code);
    told(all, DECISION_MADE_KEY, code);
    told(all, REVIEWER_STATUS_KEY, code);
    told(all, QUALIFICATION_TYPE_KEY, code);
    told(all, QUALIFICATION_STATUS_KEY, code);
    told(all, CONFLICT_TYPE_KEY, code);
    told(all, CONFLICT_STATUS_KEY, code);
    told(all, REGISTER_REFUSAL_KEY, code);
    // A reviewer who turned the work down is not a course that was rejected.
    assert.notEqual(all['review.stDeclined'], all['review.decRejected'], code);
    // "It was not recorded" and "nobody can say" are two sentences.
    assert.notEqual(all['review.eRefused'], all['review.eUnsure'], code);
  }
});

test('every state the database can send has a key, and the staff screens keep their English', () => {
  const same = (keys: Record<string, string>, labels: Record<string, string>) => assert.deepEqual(Object.keys(keys).sort(), Object.keys(labels).sort());
  same(ASSIGNMENT_STATUS_KEY, ASSIGNMENT_STATUS_LABEL);
  same(SCOPE_KEY, SCOPE_LABEL);
  same(DECISION_MADE_KEY, DECISION_LABEL);
  same(REVIEWER_STATUS_KEY, REVIEWER_STATUS_LABEL);
  same(QUALIFICATION_TYPE_KEY, QUALIFICATION_TYPE_LABEL);
  same(QUALIFICATION_STATUS_KEY, QUALIFICATION_STATUS_LABEL);
  same(CONFLICT_TYPE_KEY, CONFLICT_TYPE_LABEL);
  same(CONFLICT_STATUS_KEY, CONFLICT_STATUS_LABEL);
  assert.deepEqual(Object.keys(REGISTER_REFUSAL_KEY), [...REGISTER_REFUSALS]);
  // The English of each key is what the staff screen's table says, so the two cannot drift.
  for (const [value, key] of Object.entries(REVIEWER_STATUS_KEY)) assert.equal(en[key], REVIEWER_STATUS_LABEL[value as keyof typeof REVIEWER_STATUS_LABEL], key);
  for (const [value, key] of Object.entries(CONFLICT_TYPE_KEY)) assert.equal(en[key], CONFLICT_TYPE_LABEL[value as keyof typeof CONFLICT_TYPE_LABEL], key);
  for (const [value, key] of Object.entries(CONFLICT_STATUS_KEY)) assert.equal(en[key], CONFLICT_STATUS_LABEL[value as keyof typeof CONFLICT_STATUS_LABEL], key);
  for (const [value, key] of Object.entries(ASSIGNMENT_STATUS_KEY)) assert.equal(en[key], ASSIGNMENT_STATUS_LABEL[value as keyof typeof ASSIGNMENT_STATUS_LABEL], key);
  for (const [value, key] of Object.entries(SCOPE_KEY)) assert.equal(en[key], SCOPE_LABEL[value as keyof typeof SCOPE_LABEL], key);
  assert.ok(REGISTER_LIMITS.includes(BIO_MAX));
});

test('the page, the register and the route say nothing that is not in the catalogue', () => {
  for (const [name, source] of [['page', PAGE], ['register', REGISTER]] as const) {
    const bare = strip(source);
    assert.doesNotMatch(bare, />\s*[A-Z][a-z]+ [a-z]+[^<{]*</u, `a sentence is written in the ${name}`);
    assert.doesNotMatch(bare, /(?:placeholder|aria-label|title)="[A-Z]/u, name);
    // The staff screens' English tables are not used here, and no date is left to the server's own habits.
    assert.doesNotMatch(bare, /_LABEL\b|toLocaleDateString|toLocaleString|\.toLowerCase\(\)/u, name);
  }
  const used = `${PAGE}\n${HELPERS}`;
  for (const key of KEYS) assert.ok(used.includes(`'${key}'`), `${key} is not used`);
  assert.match(PAGE, /languageShownFor\(locale, 'review'\)/u);
  assert.match(PAGE, /shown\.code !== locale \? \{ lang: shown\.code, dir: shown\.dir \} : \{\}/u);
  assert.equal(PAGE.match(/<div className="container section review-page" \{\.\.\.frame\}>/gu)?.length, 2);

  // A failed read is said, not thrown to the page that says the site broke.
  const page = strip(PAGE);
  assert.match(page, /try \{\s*const \[assignments, entry, subjects\] = await Promise\.all\(/u);
  assert.match(page, /role="alert" data-review-state="unread">\{t\('review\.unread'\)\}/u);
  // A profile that could not be read is not "no profile", which the page would call an empty queue.
  assert.match(read('./review.ts'), /if \(profileError\) throw new Error\(profileError\.message\);/u);
  // What somebody else wrote sets its own direction; the link to the board is the app's own link.
  assert.match(page, /a\.courseSlug === '' \? <h3>\{t\('review\.untitled'\)\}<\/h3> : <h3 dir="auto">\{a\.courseTitle\}<\/h3>/u);
  assert.match(page, /<Link href="\/panel">\{t\('review\.panelLink'\)\}<\/Link>/u);
  // A day as stored, a deadline with its zone, a count in the reader's digits.
  assert.match(page, /formatDateTime\(shown\.code, a\.dueAt, 'UTC'\)/u);
  assert.match(page, /t\('review\.assigned', \{ date: formatDay\(shown\.code, a\.assignedAt\) \}\)/u);
  assert.match(page, /<div className="n">\{n\(pending\.length\)\}<\/div>/u);
  assert.match(page, /counts: \{ qualifications: n\(/u);

  // The register is handed its words and reads no catalogue; the database's sentence is not printed.
  assert.match(REGISTER, /^'use client';/u);
  const register = strip(REGISTER);
  assert.doesNotMatch(register, /@\/lib\/i18n|useT\(/u);
  assert.doesNotMatch(register, /json\??\.message|\.message\b/u);
  assert.match(register, /refuse\(form, isRegisterRefusal\(json\?\.code\)/u);
  assert.match(register, /: \{ code: 'unsure' \}\);/u);
  assert.match(register, /catch \{\s*refuse\(form, \{ code: 'unsure' \}\);/u);
  // A refusal is shown under the form it answers, and there is one at a time.
  for (const form of ['apply', 'qualification', 'conflict']) assert.ok(register.includes(`{notice('${form}')}`), form);
  assert.equal(register.match(/role="alert"/gu)?.length, 1);
  // A request that never came back does not leave the buttons disabled.
  assert.match(register, /finally \{\s*setBusy\(false\);/u);
  // What was typed is kept unless it was recorded.
  assert.match(register, /if \(!recorded\) return;\s*setTitle\(''\);/u);
  assert.match(register, /if \(!recorded\) return;\s*setDescription\(''\);/u);
  // Names and titles other people wrote are isolated.
  for (const field of ['reviewer.verifiedByName', 'q.institution', 'q.subjectName', 'c.description', 'c.assessedByName', 'c.resolutionNotes']) {
    assert.ok(register.includes(`<bdi>{${field}}</bdi>`), field);
  }

  // The route names a refusal, checks before asking, and does not pass a gateway's page on.
  const route = strip(ROUTE);
  assert.doesNotMatch(route, /validateReviewerBio|validateQualificationInput|validateConflictInput/u);
  assert.match(route, /const failure = registerRefusalOf\(outcome\);/u);
  // The library's own check (no state at all) sent nothing, so it is a refusal and not "nobody can say".
  assert.match(route, /if \(outcome\.state === undefined\) return fail\(\{ ok: false, code: 'refused' \}, outcome\.message\);/u);
  assert.match(route, /failure\.code === 'unsure' \? 'The answer could not be read\.' : outcome\.message/u);
  assert.equal(route.match(/if \(!outcome\.ok\) return refused\(outcome\);/gu)?.length, 3);
  assert.equal(route.match(/if \(!checked\.ok\) return fail\(checked, /gu)?.length, 3);
});

test('a refusal is told by its name, and no answer is not a refusal', () => {
  const of = (message: string, state: string | null = 'P0001') => registerRefusalOf({ message, state });
  // The sentences of `register_as_reviewer`, `record_reviewer_qualification` and `declare_reviewer_conflict`.
  assert.deepEqual(of('sign in to offer yourself as a reviewer', '42501'), { ok: false, code: 'signedOut' });
  assert.deepEqual(of('sign in to declare a conflict', '42501'), { ok: false, code: 'signedOut' });
  assert.deepEqual(of('a biography must be 2000 characters or fewer', '23514'), { ok: false, code: 'long', max: 2000 });
  assert.deepEqual(of('a qualification title must be 200 characters or fewer', '23514'), { ok: false, code: 'long', max: 200 });
  assert.deepEqual(of('your reviewer registration was closed; ask platform staff to reopen it', '55000'), { ok: false, code: 'closed' });
  assert.deepEqual(of('you are not registered as a reviewer, so there is no review to stand aside from', '55000'), { ok: false, code: 'notRegistered' });
  assert.deepEqual(of('you may only record qualifications for your own reviewer profile', '42501'), { ok: false, code: 'notYours' });
  assert.deepEqual(of(`no reviewer profile ${SUBJECT}`, 'P0002'), { ok: false, code: 'notYours' });
  assert.deepEqual(of('new row violates row-level security policy for table "reviewer_qualifications"', '42501'), { ok: false, code: 'notYours' });
  assert.deepEqual(of('a qualification needs a title', '23514'), { ok: false, code: 'title' });
  assert.deepEqual(of('a qualification has to name the subject it is in, or it can never authorise anything', '23514'), { ok: false, code: 'subject' });
  assert.deepEqual(of(`no subject area ${SUBJECT}`, 'P0002'), { ok: false, code: 'subjectGone' });
  assert.deepEqual(of('describe the conflict, so that the person assessing it does not have to guess', '23514'), { ok: false, code: 'describe' });
  // Refused, for a reason this page has no sentence of its own for.
  assert.deepEqual(of(`no course version ${SUBJECT}`, 'P0002'), { ok: false, code: 'refused' });
  assert.deepEqual(of('canceling statement due to statement timeout', '57014'), { ok: false, code: 'refused' });
  // Nobody knows: a gateway's page, a connection that went, nothing at all.
  assert.deepEqual(of('<html>502 Bad Gateway</html>', null), { ok: false, code: 'unsure' });
  assert.deepEqual(of('TypeError: fetch failed', ''), { ok: false, code: 'unsure' });
  assert.deepEqual(of('connection failure', '08006'), { ok: false, code: 'unsure' });
  // Even when it reads like a refusal: with no state nobody vouches that the database said it.
  assert.deepEqual(of('you are not registered as a reviewer', null), { ok: false, code: 'unsure' });
  assert.deepEqual(registerRefusalOf(null), { ok: false, code: 'unsure' });
  assert.deepEqual(registerRefusalOf({}), { ok: false, code: 'unsure' });

  // The state reaches this from the library: `mapReviewerError()` carries it.
  const carried = mapReviewerError({ message: 'a qualification needs a title', code: '23514' });
  assert.equal(carried.ok, false);
  assert.deepEqual(registerRefusalOf(carried.ok ? null : carried), { ok: false, code: 'title' });
  // A policy's refusal has its sentence replaced by the library, and is still told as "not yours".
  const policy = mapReviewerError({ message: 'permission denied for function record_reviewer_qualification', code: '42501' });
  assert.deepEqual(registerRefusalOf(policy.ok ? null : policy), { ok: false, code: 'notYours' });
  const none = mapReviewerError({ message: '<html>502</html>' });
  assert.deepEqual(registerRefusalOf(none.ok ? null : none), { ok: false, code: 'unsure' });

  assert.equal(registerStatusOf('signedOut'), 401);
  assert.equal(registerStatusOf('notYours'), 403);
  assert.equal(registerStatusOf('unsure'), 502);
  for (const code of REGISTER_REFUSALS) {
    if (!['signedOut', 'notYours', 'unsure'].includes(code)) assert.equal(registerStatusOf(code), 422, code);
    assert.ok(isRegisterRefusal(code));
  }
  assert.ok(!isRegisterRefusal('rejected'));
  assert.ok(!isRegisterRefusal(undefined));
});

test('what was typed is checked by name, on the same rules as the staff console', () => {
  assert.deepEqual(checkReviewerBio('  a teacher of tajwid  '), { ok: true, value: 'a teacher of tajwid' });
  assert.deepEqual(checkReviewerBio(''), { ok: true, value: null });
  assert.deepEqual(checkReviewerBio(undefined), { ok: true, value: null });
  assert.deepEqual(checkReviewerBio('x'.repeat(BIO_MAX + 1)), { ok: false, code: 'long', max: BIO_MAX });
  assert.deepEqual(checkReviewerBio(7), { ok: false, code: 'refused' });

  const good = { qualificationType: 'ijazah', title: ' Hafs ', institution: '', subjectAreaId: SUBJECT };
  assert.deepEqual(checkQualification(good), { ok: true, value: { qualificationType: 'ijazah', title: 'Hafs', institution: null, subjectAreaId: SUBJECT } });
  assert.deepEqual(checkQualification({ ...good, qualificationType: 'medal' }), { ok: false, code: 'kind' });
  assert.deepEqual(checkQualification({ ...good, title: '   ' }), { ok: false, code: 'title' });
  assert.deepEqual(checkQualification({ ...good, title: 'x'.repeat(201) }), { ok: false, code: 'long', max: 200 });
  assert.deepEqual(checkQualification({ ...good, institution: 'x'.repeat(201) }), { ok: false, code: 'long', max: 200 });
  assert.deepEqual(checkQualification({ ...good, subjectAreaId: '' }), { ok: false, code: 'subject' });
  assert.deepEqual(checkQualification({ ...good, subjectAreaId: 'tajwid' }), { ok: false, code: 'subject' });

  assert.deepEqual(checkConflict({ conflictType: 'family', description: ' my brother ' }), { ok: true, value: { conflictType: 'family', description: 'my brother', courseVersionId: null } });
  assert.deepEqual(checkConflict({ conflictType: 'family', description: 'x', courseVersionId: SUBJECT }), { ok: true, value: { conflictType: 'family', description: 'x', courseVersionId: SUBJECT } });
  assert.deepEqual(checkConflict({ conflictType: 'rivalry', description: 'x' }), { ok: false, code: 'kind' });
  assert.deepEqual(checkConflict({ conflictType: 'family', description: '' }), { ok: false, code: 'describe' });
  assert.deepEqual(checkConflict({ conflictType: 'family', description: 'x'.repeat(2001) }), { ok: false, code: 'long', max: 2000 });
  assert.deepEqual(checkConflict({ conflictType: 'family', description: 'x', courseVersionId: 'nine' }), { ok: false, code: 'refused' });
});

test('a length is printed in the digits the page was given, or not at all', () => {
  const words = {
    refusals: Object.fromEntries(REGISTER_REFUSALS.map((code) => [code, code === 'long' ? 'Too long: {max}' : code])) as Record<(typeof REGISTER_REFUSALS)[number], string>,
    limits: { '200': '۲۰۰', '2000': '۲۰۰۰' },
  };
  assert.equal(registerRefusalSentence(words, { code: 'long', max: 2000 }), 'Too long: ۲۰۰۰');
  assert.equal(registerRefusalSentence(words, { code: 'long', max: 200 }), 'Too long: ۲۰۰');
  // A length the page was not told about is not printed in the wrong digits.
  assert.equal(registerRefusalSentence(words, { code: 'long', max: 500 }), 'refused');
  assert.equal(registerRefusalSentence(words, { code: 'long' }), 'refused');
  assert.equal(registerRefusalSentence(words, { code: 'unsure' }), 'unsure');
  // Every length the checks can name is one the page writes out.
  for (const max of [200, 2000]) assert.ok((REGISTER_LIMITS as readonly number[]).includes(max), String(max));
});

test('an answer to an offer that says neither yes nor no declines nothing', () => {
  const route = readFileSync(new URL('../app/api/review/route.ts', import.meta.url), 'utf8');
  const respond = route.slice(route.indexOf("b.action === 'respond'"), route.indexOf("b.action === 'decide'"));
  assert.match(respond, /typeof b\.accept !== 'boolean'[\s\S]*status: 400[\s\S]*respondToAssignment/u, 'the answer is checked before the database is asked');
  assert.doesNotMatch(respond, /accept: b\.accept === true/u, 'anything but true must not be read as declining');
});

