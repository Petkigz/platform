import assert from 'node:assert/strict';
import test from 'node:test';

import {
  comingUp,
  dueLabel,
  dueNow,
  hifzErrorMessage,
  hifzSentence,
  ladderSentence,
  parseHifzRecord,
  type HifzPassage,
} from './hifz.ts';

// The screen's half of the memorisation tracker. What is tested here is the part
// that decides what a learner reads — a date turned into words, a payload that
// arrives half-formed, and a refusal that has to say what to do next — because
// those are what a database test cannot reach.

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

test('dates read as dates, including the overdue ones', () => {
  assert.equal(dueLabel(0), 'Due today');
  assert.equal(dueLabel(-1), 'A day overdue');
  assert.equal(dueLabel(-9), '9 days overdue');
  assert.equal(dueLabel(1), 'Due tomorrow');
  assert.equal(dueLabel(12), 'Due in 12 days');
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

test('the schedule sentence uses the numbers from the database', () => {
  const sentence = ladderSentence([1, 3, 7, 16, 35, 75, 160]);
  assert.match(sentence, /1 day, 3 days, 7 days, 16 days, 35 days, 75 days, 160 days/);
  assert.match(sentence, /stop at 160 days/);
  // Without a ladder the sentence still says something true rather than nothing.
  assert.match(ladderSentence(undefined), /back tomorrow/);
});

test('the header counts passages instead of praising or scolding', () => {
  assert.match(
    hifzSentence({ enabled: true, learnerId: 'l', counts: { passages: 0, due: 0, memorised: 0 } }),
    /Nothing is on your list yet/,
  );
  assert.equal(
    hifzSentence({ enabled: true, learnerId: 'l', counts: { passages: 4, due: 0, memorised: 2 } }),
    '4 passages, 2 of them memorised. Nothing is due today.',
  );
  assert.equal(
    hifzSentence({ enabled: true, learnerId: 'l', counts: { passages: 1, due: 1, memorised: 0 } }),
    '1 passage. One is due today.',
  );
  assert.equal(
    hifzSentence({ enabled: true, learnerId: 'l', counts: { passages: 3, due: 3, memorised: 0 } }),
    '3 passages. 3 are due today.',
  );
});

test('a refusal says what to do next, and an unknown one keeps its own words', () => {
  assert.match(hifzErrorMessage('hifz:already_exists'), /already on the list/);
  assert.match(hifzErrorMessage('hifz:not_allowed'), /yourself or for a learner in your family/);
  assert.match(hifzErrorMessage('hifz:not_enabled'), /not switched on/);
  assert.equal(hifzErrorMessage('something else'), 'something else');
  assert.equal(hifzErrorMessage(''), 'That did not reach the server.');
});
