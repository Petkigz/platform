import assert from 'node:assert/strict';
import test from 'node:test';

import {
  IJAZAH_CAVEAT, authorisationLine, grantedOnSentence, ijazahSentence, parseAuthorisations,
} from './ijazah.ts';

// ---------------------------------------------------------------------------
// An ijazah is a record, not a verification.
//
// The only thing this layer can get wrong that matters is the vocabulary. A
// sentence that reads "verified" would be a claim the platform cannot support,
// and it would be read by exactly the people least able to check it.
// ---------------------------------------------------------------------------

const row = {
  id: 'a-1',
  grantedBy: 'Shaykh Abdallāh al-Yūsufī',
  grantedOn: '2019-04-12',
  scope: 'Ḥafṣ ʿan ʿĀṣim, full recitation',
  chain: 'al-Yūsufī ← ʿAbd al-Raḥmān',
  status: 'recorded',
  recordedAt: '2026-10-30T10:00:00Z',
  withdrawnAt: null,
  withdrawnReason: null,
};

test('a row is read defensively, and a malformed one is dropped rather than drawn', () => {
  const parsed = parseAuthorisations([
    row,
    null,
    'nonsense',
    { ...row, id: undefined },
    { ...row, scope: '   ' },
  ]);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0]!.grantedBy, row.grantedBy);
  assert.equal(parsed[0]!.status, 'recorded');
  assert.equal(parseAuthorisations(null).length, 0);
  assert.equal(parseAuthorisations({}).length, 0);
});

test('a withdrawal is read as one, with its reason', () => {
  const parsed = parseAuthorisations([{
    ...row, status: 'withdrawn', withdrawnAt: '2026-10-31T09:00:00Z',
    withdrawnReason: 'The grantor wrote to say the page was not his',
  }]);
  assert.equal(parsed[0]!.status, 'withdrawn');
  assert.match(parsed[0]!.withdrawnReason ?? '', /not his/);
});

test('a date is said the way a person says it, and an absent one is not invented', () => {
  assert.equal(grantedOnSentence('2019-04-12'), '12 April 2019');
  assert.equal(grantedOnSentence(null), null);
  assert.equal(grantedOnSentence('not a date'), null);
});

test('an authorisation is quoted, never paraphrased', () => {
  const parsed = parseAuthorisations([row])[0]!;
  const line = authorisationLine(parsed);
  assert.ok(line.includes(row.scope), 'the scope was rewritten');
  assert.ok(line.includes(row.grantedBy), 'the grantor was rewritten');
  assert.ok(line.includes('12 April 2019'), 'the date is missing');
  assert.doesNotMatch(line, /verified|checked|confirmed/i,
    'a record described itself as a check');

  const undated = authorisationLine({ ...parsed, grantedOn: null });
  assert.doesNotMatch(undated, /\b(null|undefined|NaN)\b/);
});

test('the caveat says record, not verification, and does not promise a panel', () => {
  assert.match(IJAZAH_CAVEAT, /record, not a verification/);
  assert.match(IJAZAH_CAVEAT, /nobody here has checked/);
  assert.match(IJAZAH_CAVEAT, /no learner can see it/);

  // "may" and "one day": a panel that is announced as coming is a promise the
  // platform has not made anywhere else, and this sentence must not make it.
  assert.match(IJAZAH_CAVEAT, /may review/);
  assert.doesNotMatch(IJAZAH_CAVEAT, /will be reviewed|is being reviewed|panel has/i);
});

test('every refusal is a sentence, and none of them leak a code', () => {
  const codes = [
    'ijazah:disabled', 'ijazah:owner_only', 'ijazah:staff_only',
    'ijazah:needs_grantor', 'ijazah:needs_scope', 'ijazah:needs_evidence',
    'ijazah:needs_reason', 'ijazah:future_date', 'ijazah:already_recorded',
    'ijazah:not_found', 'ijazah:no_such_person',
  ];
  for (const code of codes) {
    const sentence = ijazahSentence(code);
    assert.ok(sentence.length > 15, `${code} produced "${sentence}"`);
    assert.doesNotMatch(sentence, /ijazah:/, `${code} leaked its code`);
  }
  assert.equal(new Set(codes.map(ijazahSentence)).size, codes.length);

  assert.match(ijazahSentence('something_else'), /please try again/);
  assert.match(ijazahSentence(null), /please try again/);
});
