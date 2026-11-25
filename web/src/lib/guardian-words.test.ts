import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import {
  consentSentence,
  consentStateLabel,
  expiryWarning,
  relationshipLabel,
  type MyConsent,
} from './guardian-consent.ts';
import { guardianWords } from './guardian-words.ts';
import { translator } from './i18n/index.ts';
import { CATALOGUES } from './i18n/messages/catalogues.ts';
import { en } from './i18n/messages/en.ts';
import { GUARDIANS } from './i18n/messages/guardians.ts';

const NOW = new Date('2026-11-25T09:00:00Z');

const consent = (over: Partial<MyConsent> = {}): MyConsent => ({
  relationshipId: 'a1',
  learnerProfileId: 'b2',
  learnerName: 'Maryam',
  relationshipType: 'parent',
  status: 'active',
  method: 'video_call',
  verifiedAt: '2026-06-01T10:00:00Z',
  expiresAt: '2027-06-01T10:00:00Z',
  revokedAt: null,
  revokedReason: null,
  canViewProgress: true,
  canManageLearning: false,
  canManageProfile: false,
  policyChanged: false,
  openCase: null,
  lastDecision: null,
  ...over,
});

const KEYS = (Object.keys(en) as (keyof typeof en)[]).filter((key) => key.startsWith('guard.'));
const LANGUAGES = [
  'ar', 'ur', 'fa', 'fa-af', 'tr', 'id', 'ms', 'bn', 'hi', 'fr', 'es', 'pt', 'sw', 'af',
  'zh-hans', 'zh-hant', 'vi', 'th', 'fil', 'uz', 'kk', 'az', 'tg', 'ky', 'tk', 'ta', 'ne',
] as const;

test('the state and the relationship are the words staff read, in English', () => {
  const words = guardianWords('en');
  const states: Pick<MyConsent, 'status' | 'lastDecision'>[] = [
    { status: 'active', lastDecision: null },
    { status: 'lapsed', lastDecision: null },
    { status: 'pending_verification', lastDecision: null },
    { status: 'revoked', lastDecision: null },
    { status: 'revoked', lastDecision: { status: 'rejected', at: null, reason: null } },
  ];
  for (const state of states) assert.equal(words.state(state), consentStateLabel(state));
  for (const type of ['parent', 'guardian', 'other']) {
    assert.equal(words.relationship(type), relationshipLabel(type), type);
  }
  // A type nobody has heard of is the third choice on the form, not a fourth word.
  assert.equal(words.relationship(null), 'Other adult');
});

test('a consent is told in sentences, each whole, and the method has a line of its own', () => {
  const words = guardianWords('en');
  assert.deepEqual(words.sentences(consent(), NOW), [
    'Verified on Jun 1, 2026.',
    'How it is confirmed: A video call',
    'It lapses on Jun 1, 2027, in 188 days.',
  ]);
  assert.deepEqual(words.sentences(consent({ expiresAt: '2026-11-26T10:00:00Z' }), NOW).at(-1),
    'It lapses on Nov 26, 2026, in 1 day.');
  // The last day: the date and no count. "In 0 days" is not a sentence.
  assert.deepEqual(words.sentences(consent({ expiresAt: '2026-11-25T20:00:00Z' }), NOW).at(-1),
    'It lapses on Nov 25, 2026.');
  // No date is never given a date.
  const undated = words.sentences(consent({ verifiedAt: null, expiresAt: null, method: null }), NOW);
  assert.equal(undated[0], 'Verified.');
  assert.equal(undated.length, 2);
  assert.ok(!undated.join(' ').includes('{'), undated.join(' '));
  assert.equal(undated[1], en['guard.sNoExpiry']);

  assert.deepEqual(
    words.sentences(consent({ status: 'pending_verification', verifiedAt: null, expiresAt: null }), NOW),
    ['Submitted; waiting for a reviewer.', 'How it is confirmed: A video call'],
  );
  const asked = words.sentences(consent({
    status: 'pending_verification',
    openCase: { id: 'c', status: 'needs_information', submittedAt: '2026-11-20T00:00:00Z', note: null },
  }), NOW);
  assert.equal(asked[1], 'The reviewer has asked for more information.');
});

test('it never says "verified" of something that has lapsed or was withdrawn', () => {
  for (const code of ['en', 'ar', 'fr', 'zh-hans', 'ta'] as const) {
    const words = guardianWords(code);
    const t = translator(code);
    const lapsed = words.sentences(consent({ status: 'lapsed', expiresAt: '2026-10-01T00:00:00Z' }), NOW);
    assert.equal(lapsed[0], t('guard.sLapsed'));
    assert.equal(lapsed.length, 2);
    assert.ok(!lapsed.includes(t('guard.sVerified')), code);
    assert.deepEqual(words.sentences(consent({ status: 'revoked' }), NOW), [t('guard.sWithdrew')]);
    assert.deepEqual(
      words.sentences(consent({ status: 'revoked', lastDecision: { status: 'rejected', at: null, reason: 'x' } }), NOW),
      [t('guard.sNotGranted')],
    );
  }
  // The English original agrees about which of the two a revoked consent is.
  assert.ok(consentSentence(consent({ status: 'revoked' }), NOW).includes('withdrew'));
});

test('the warning is shown when the English one is, and says the same in English', () => {
  const words = guardianWords('en');
  const cases: Partial<MyConsent>[] = [
    {},
    { expiresAt: null },
    { expiresAt: '2026-11-25T20:00:00Z' },
    { expiresAt: '2026-11-26T10:00:00Z' },
    { expiresAt: '2026-12-20T10:00:00Z' },
    { expiresAt: '2026-12-26T10:00:00Z' },
    { expiresAt: '2026-11-01T10:00:00Z' },
    { status: 'lapsed' },
    { status: 'pending_verification' },
    { status: 'revoked' },
  ];
  for (const over of cases) {
    const mine = words.warning(consent(over), NOW);
    const theirs = expiryWarning(consent(over), NOW);
    assert.equal(mine === null, theirs === null, JSON.stringify(over));
    if (mine !== null && over.expiresAt) assert.equal(mine, theirs, JSON.stringify(over));
  }
  assert.equal(words.warning(consent({ expiresAt: '2026-11-26T10:00:00Z' }), NOW), 'This verification lapses in 1 day.');
  assert.equal(words.warning(consent({ expiresAt: '2026-12-20T10:00:00Z' }), NOW), 'This verification lapses in 25 days.');
});

test('a permission is a sentence, and none is said as none', () => {
  const words = guardianWords('en');
  assert.deepEqual(words.permissions(consent()), ['You may see the child’s progress.']);
  assert.equal(
    words.permissions(consent({ canManageLearning: true, canManageProfile: true })).length,
    3,
  );
  assert.deepEqual(
    words.permissions(consent({ canViewProgress: false })),
    [en['guard.pNone']],
  );
});

test('the policy line never claims a policy, and the note is said only while enforcement is off', () => {
  const words = guardianWords('fr');
  assert.equal(words.policyLine(true), GUARDIANS.fr!['guard.policyYes']);
  assert.equal(words.policyLine(false), GUARDIANS.fr!['guard.policyNo']);
  assert.equal(words.enforcementNote(true), null);
  assert.equal(words.enforcementNote(false), GUARDIANS.fr!['guard.enforcementOff']);
});

test('another language is given its digits, its plural and its calendar', () => {
  const fa = guardianWords('fa').sentences(consent(), NOW);
  assert.ok(fa[2]!.includes('۱۸۸'), fa[2]);
  assert.ok(!/\{[a-z]+\}/u.test(fa.join(' ')), fa.join(' '));
  const ar = guardianWords('ar');
  assert.ok(ar.warning(consent({ expiresAt: '2026-11-28T10:00:00Z' }), NOW)!.includes('3'));
  for (const code of LANGUAGES) {
    const words = guardianWords(code);
    for (const days of [1, 2, 3, 5, 11, 21, 30]) {
      const expiresAt = new Date(NOW.getTime() + days * 86_400_000 + 3_600_000).toISOString();
      const said = [...words.sentences(consent({ expiresAt }), NOW), words.warning(consent({ expiresAt }), NOW) ?? ''];
      assert.ok(!/\{[a-zA-Z]+\}/u.test(said.join(' ')), `${code} ${days}: ${said.join(' ')}`);
      assert.equal(said.length, 4, `${code} ${days}`);
    }
  }
});

test('the two forms are handed every word, and a refusal for every name', () => {
  for (const code of ['en', ...LANGUAGES] as const) {
    const words = guardianWords(code);
    const flat = (value: unknown): string[] =>
      typeof value === 'string' ? [value] : Object.values(value as Record<string, unknown>).flatMap(flat);
    for (const said of [...flat(words.formWords), ...flat(words.actionWords)]) {
      assert.ok(said.length > 0, code);
      assert.ok(!/\{[a-zA-Z]+\}/u.test(said), `${code}: ${said}`);
    }
    assert.equal(Object.keys(words.formWords.refusals).length, 16);
    assert.equal(words.formWords.refusals, words.actionWords.refusals);
    // What cannot be confirmed is never said in the words of a plain refusal.
    assert.notEqual(words.formWords.refusals.unconfirmed, words.formWords.refusals.refused);
  }
  // The shortest lengths in the sentences are the ones the route checks.
  assert.ok(en['guard.fStatementHelp'].includes('20'));
  assert.ok(en['guard.eStatement'].includes('20'));
  assert.ok(en['guard.eReason'].includes('10'));
});

test('all twenty-seven languages have every sentence, with the same blanks', () => {
  assert.equal(KEYS.length, 86);
  const blanks = (text: string) => (text.match(/\{[a-zA-Z]+\}/gu) ?? []).sort().join(' ');
  for (const code of LANGUAGES) {
    const part = GUARDIANS[code];
    assert.ok(part, code);
    assert.deepEqual(Object.keys(part).sort(), [...KEYS].sort(), code);
    for (const key of KEYS) {
      assert.equal(blanks(part[key]!), blanks(en[key]), `${code} ${key}`);
      assert.equal(CATALOGUES[code]?.[key], part[key], `${code} ${key} is served`);
    }
    assert.equal(translator(code)('guard.title'), part['guard.title']);
    // Chinese addresses the reader as 你 in every new part.
    if (code.startsWith('zh')) assert.ok(!Object.values(part).join('').includes('您'), code);
  }
  assert.equal(Object.keys(GUARDIANS).length, 27);
});

test('the page draws with these words and has no sentence of its own', () => {
  const page = readFileSync(new URL('../app/family/guardians/page.tsx', import.meta.url), 'utf8');
  assert.ok(page.includes('guardianWords('));
  assert.ok(page.includes('generateMetadata'));
  assert.ok(page.includes("languageShownFor("));
  // What a person wrote is shown as written, in its own direction.
  assert.ok(page.includes('<bdi'));
  for (const gone of ['consentSentence(', 'expiryWarning(', 'permissionSentence(', 'CONSENT_METHODS', 'WITHDRAWAL_EFFECT']) {
    assert.ok(!page.includes(gone), `the page still reads the English ${gone}`);
  }
  const body = page.slice(page.indexOf('export default'));
  const sentence = />\s*[A-Z][a-z]+ [a-z]+ [a-z]+[^<{]*</u.exec(body);
  assert.equal(sentence, null, sentence?.[0]);
});
