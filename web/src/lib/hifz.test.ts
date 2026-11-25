import assert from 'node:assert/strict';
import test from 'node:test';

import {
  comingUp,
  dueNow,
  hifzRefusalName,
  hifzRefusalOf,
  parseHifzRecord,
  type HifzPassage,
} from './hifz.ts';

// The screen's half of the memorisation tracker. What is tested here is the part
// a database test cannot reach: a payload that arrives half-formed, which list
// a passage belongs in, and the name a refusal leaves the server by. The words
// themselves — a date as a sentence, the counts at the head of the page, the
// schedule — are said in the reader's language and tested in
// `hifz-words.test.ts`.

const passage = (over: Partial<HifzPassage> = {}): HifzPassage => ({
  id: 'p1',
  label: 'Al-Fatihah 1–7',
  status: 'learning',
  rung: 0,
  intervalDays: 1,
  nextDueOn: '2026-10-29',
  lastReviewedOn: null,
  reviewCount: 0,
  lapses: 0,
  daysUntilDue: 0,
  ...over,
});

test('a switched-off record is one fact and no invented list', () => {
  const off = parseHifzRecord({ enabled: false });
  assert.equal(off.enabled, false);
  assert.equal(off.passages, undefined);
  assert.equal(off.counts, undefined);
});

test('a malformed passage is dropped rather than rendered blank', () => {
  const parsed = parseHifzRecord({
    enabled: true,
    learnerId: 'l1',
    counts: { passages: 2, due: 1, memorised: 0 },
    ladder: [1, 3, 7],
    passages: [passage(), { id: 'p2' }, { label: 'No id' }, passage({ id: 'p3', label: 'Ayat al-Kursi' })],
  });
  assert.equal(parsed.passages?.length, 2);
  assert.deepEqual(parsed.passages?.map((p) => p.id), ['p1', 'p3']);
  assert.deepEqual(parsed.ladder, [1, 3, 7]);
});

test('what is due and what is coming are two lists, in the right order', () => {
  const list = [
    passage({ id: 'a', daysUntilDue: 5 }),
    passage({ id: 'b', daysUntilDue: -2 }),
    passage({ id: 'c', daysUntilDue: 1 }),
    passage({ id: 'd', daysUntilDue: 0 }),
  ];
  assert.deepEqual(dueNow(list).map((p) => p.id), ['b', 'd']);
  assert.deepEqual(comingUp(list).map((p) => p.id), ['c', 'a']);
});

test('a refusal leaves the server as a name, and never as the database wrote it', () => {
  assert.equal(hifzRefusalName('hifz:already_exists'), 'already_exists');
  assert.equal(hifzRefusalName('P0001: hifz:not_allowed (context)'), 'not_allowed');
  assert.equal(hifzRefusalName('hifz:not_enabled'), 'not_enabled');
  assert.equal(hifzRefusalName('hifz:passage_not_found'), 'passage_not_found');
  // Until 2026-11-25 an answer this file did not know was passed through as
  // written. A constraint's name is not a sentence for a learner.
  assert.equal(
    hifzRefusalName('duplicate key value violates unique constraint "hifz_passages_pkey"'),
    'refused',
  );
  assert.equal(hifzRefusalName('hifz:something_new'), 'refused');
  assert.equal(hifzRefusalName(''), 'refused');
  assert.equal(hifzRefusalName(null), 'refused');
});

test('a write the database refused is a refusal; one that never got an answer is not', () => {
  assert.deepEqual(hifzRefusalOf({ message: 'hifz:label_too_long', code: 'P0001' }), {
    code: 'label_too_long',
    status: 400,
  });
  // The database said no, in words this build does not know.
  assert.deepEqual(hifzRefusalOf({ message: 'permission denied for function', code: '42501' }), {
    code: 'refused',
    status: 400,
  });
  // The request failed on the way: whether it was written is not known.
  assert.deepEqual(hifzRefusalOf({ message: 'TypeError: fetch failed', code: '' }), {
    code: 'unconfirmed',
    status: 502,
  });
  assert.deepEqual(hifzRefusalOf({ message: 'network timeout' }), { code: 'unconfirmed', status: 502 });
  assert.deepEqual(hifzRefusalOf(null), { code: 'unconfirmed', status: 502 });
});
