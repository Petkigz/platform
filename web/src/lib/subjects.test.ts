import assert from 'node:assert/strict';
import test from 'node:test';

import {
  descendantIds,
  normaliseCode,
  orderSubjects,
  parentOptions,
  retirement,
  validateSubject,
  vocabularyLede,
  type SubjectRow,
} from './subjects.ts';

const row = (
  id: string,
  name: string,
  parentId: string | null = null,
  extra: Partial<SubjectRow> = {},
): SubjectRow => ({ id, code: id, name, parentId, status: 'active', uses: 0, liveUses: 0, ...extra });

test('a code typed with capitals or spaces is corrected, not refused', () => {
  assert.equal(normaliseCode('  Quran Tajweed '), 'quran-tajweed');

  const out = validateSubject({ code: 'Quran.Tajweed', name: 'Tajweed' });
  assert.equal(out.ok, true);
  assert.equal(out.ok && out.value.code, 'quran.tajweed');
});

test('a name is required, and the refusal says what a name is for', () => {
  const out = validateSubject({ code: 'quran', name: '   ' });

  assert.equal(out.ok, false);
  assert.match(out.ok === false ? out.message : '', /what a learner sees on the badge/);
});

test('a code that cannot be fixed is refused with the shape written out', () => {
  const out = validateSubject({ code: '.quran', name: 'Quran' });

  assert.equal(out.ok, false);
  assert.match(out.ok === false ? out.message : '', /lowercase letters, digits, dots/);
});

test('a long name is refused before the database truncates nothing', () => {
  const out = validateSubject({ code: 'quran', name: 'x'.repeat(121) });
  assert.equal(out.ok, false);
});

test('an empty parent is no parent', () => {
  const out = validateSubject({ code: 'quran', name: 'Quran', parentId: '  ' });

  assert.equal(out.ok, true);
  assert.equal(out.ok && out.value.parentId, null);
});

test('children follow their parent, and levels are sorted by name', () => {
  const rows = [
    row('quran', 'Qur’an'),
    row('quran.tajweed', 'Tajweed', 'quran'),
    row('quran.hifz', 'Hifz', 'quran'),
    row('arabic', 'Arabic'),
  ];

  assert.deepEqual(
    orderSubjects(rows).map((r) => `${r.id}:${r.depth}`),
    ['arabic:0', 'quran:0', 'quran.hifz:1', 'quran.tajweed:1'],
  );
});

test('a child whose parent is missing is shown at the top, not dropped', () => {
  const rows = [row('orphan', 'Orphan', 'gone'), row('real', 'Real')];

  assert.deepEqual(orderSubjects(rows).map((r) => r.id), ['orphan', 'real']);
});

test('a cycle in the data does not hang the page', () => {
  const rows = [row('a', 'A', 'b'), row('b', 'B', 'a')];

  const out = orderSubjects(rows);
  assert.equal(out.length, 2, 'a cycle must not lose rows');
});

test('descendants are found at any depth', () => {
  const rows = [
    row('quran', 'Qur’an'),
    row('quran.tajweed', 'Tajweed', 'quran'),
    row('quran.tajweed.rules', 'Rules', 'quran.tajweed'),
    row('arabic', 'Arabic'),
  ];

  assert.deepEqual(descendantIds(rows, 'quran').sort(), ['quran.tajweed', 'quran.tajweed.rules']);
  assert.deepEqual(descendantIds(rows, 'arabic'), []);
});

test('a subject cannot be made its own ancestor, and is not offered a choice it would be refused', () => {
  const rows = [
    row('quran', 'Qur’an'),
    row('quran.tajweed', 'Tajweed', 'quran'),
    row('arabic', 'Arabic'),
  ];

  const options = parentOptions(rows, 'quran').map((o) => o.id);

  assert.deepEqual(options, ['arabic'], 'the subject and its descendants must not be offered');
});

test('retired subjects are not offered as parents', () => {
  const rows = [row('quran', 'Qur’an', null, { status: 'retired' }), row('arabic', 'Arabic')];

  assert.deepEqual(parentOptions(rows, null).map((o) => o.id), ['arabic']);
});

test('parent choices are indented so a deep child is not ambiguous', () => {
  const rows = [row('quran', 'Qur’an'), row('quran.tajweed', 'Tajweed', 'quran')];

  assert.deepEqual(parentOptions(rows, null).map((o) => o.label), ['Qur’an', '— Tajweed']);
});

test('a subject a live course is filed under cannot be retired, and the reason says why', () => {
  const out = retirement({ liveUses: 2, totalUses: 5 });

  assert.equal(out.canRetire, false);
  assert.match(out.reason, /blank those badges/);
  assert.match(out.reason, /cannot be changed/);
});

test('a subject only retired courses use can be retired, and the reason says what is lost', () => {
  const out = retirement({ liveUses: 0, totalUses: 2 });

  assert.equal(out.canRetire, true);
  assert.match(out.reason, /already hidden from readers/);
});

test('an unused subject says so in four words rather than a paragraph', () => {
  assert.deepEqual(retirement({ liveUses: 0, totalUses: 0 }), { canRetire: true, reason: 'No course uses it.' });
});

test('the lede counts active and retired separately, and says what retired means', () => {
  assert.match(vocabularyLede(6, 6), /^6 active subject areas\. Every course/);
  assert.match(vocabularyLede(1, 1), /^1 active subject area\./);
  assert.match(vocabularyLede(6, 7), /1 retired subject\./);
  assert.match(vocabularyLede(6, 13), /7 retired subjects/);
});
