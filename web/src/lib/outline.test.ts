import assert from 'node:assert/strict';
import test from 'node:test';

import { flattenOutline, lessonNeighbours, type OutlineSectionRow } from './outline.ts';

const course: OutlineSectionRow[] = [
  {
    id: 's2',
    title: 'Prayer',
    position: 2,
    lessons: [
      { id: 'l4', title: 'Wudu in practice', position: 2 },
      { id: 'l3', title: 'The conditions of prayer', position: 1 },
    ],
  },
  {
    id: 's1',
    title: 'Foundations',
    position: 1,
    lessons: [
      { id: 'l2', title: 'Who is a Muslim?', position: 2 },
      { id: 'l1', title: 'The pillars', position: 1 },
    ],
  },
];

test('sections and lessons are flattened into one reading order', () => {
  assert.deepEqual(
    flattenOutline(course).map((s) => s.id),
    ['l1', 'l2', 'l3', 'l4'],
  );
});

test('a section arrives out of order and is sorted by its own position', () => {
  const shuffled = [course[0]!, course[1]!];
  assert.equal(flattenOutline(shuffled)[0]!.id, 'l1');
  assert.equal(flattenOutline([course[0]!, course[1]!])[0]!.sectionTitle, 'Foundations');
});

test('the next lesson crosses a section boundary', () => {
  const steps = flattenOutline(course);
  const at = lessonNeighbours(steps, 'l2');

  assert.equal(at.next?.id, 'l3', 'the last lesson of a section has no next inside it');
  assert.equal(at.previous?.id, 'l1');
});

test('the first lesson has no previous and the last has no next', () => {
  const steps = flattenOutline(course);

  const first = lessonNeighbours(steps, 'l1');
  assert.equal(first.previous, null);
  assert.equal(first.index, 1);
  assert.equal(first.next?.id, 'l2');

  const last = lessonNeighbours(steps, 'l4');
  assert.equal(last.next, null);
  assert.equal(last.index, 4);
  assert.equal(last.total, 4);
  assert.equal(last.previous?.id, 'l3');
});

test('a one-lesson course has neither neighbour', () => {
  const steps = flattenOutline([{ id: 's', title: 'Only', position: 1, lessons: [{ id: 'x', title: 'One', position: 1 }] }]);
  const at = lessonNeighbours(steps, 'x');

  assert.equal(at.previous, null);
  assert.equal(at.next, null);
  assert.deepEqual([at.index, at.total], [1, 1]);
});

test('a lesson that is not in the outline gets no neighbours', () => {
  const at = lessonNeighbours(flattenOutline(course), 'not-in-this-course');

  assert.equal(at.previous, null);
  assert.equal(at.next, null);
  assert.equal(at.index, 0, 'an unknown lesson was numbered');
  assert.equal(at.total, 4);
});

test('an untitled lesson keeps its place and is labelled', () => {
  const steps = flattenOutline([
    { id: 's', title: null, position: 1, lessons: [
      { id: 'a', title: '   ', position: 1 },
      { id: 'b', title: 'Second', position: 2 },
    ] },
  ]);

  assert.equal(steps.length, 2, 'an untitled lesson was dropped from the order');
  assert.equal(steps[0]!.title, 'Untitled lesson');
  assert.equal(lessonNeighbours(steps, 'a').next?.id, 'b');
});

test('a tie in position is broken the same way every time', () => {
  const rows: OutlineSectionRow[] = [
    { id: 's', title: 'S', position: 1, lessons: [
      { id: 'zzz', title: 'Later id', position: 1 },
      { id: 'aaa', title: 'Earlier id', position: 1 },
    ] },
  ];

  const once = flattenOutline(rows).map((s) => s.id);
  const twice = flattenOutline([...rows].reverse()).map((s) => s.id);

  assert.deepEqual(once, ['aaa', 'zzz']);
  assert.deepEqual(once, twice, 'the order depended on how the rows arrived');
});

test('no sections is an empty outline rather than an error', () => {
  assert.deepEqual(flattenOutline(null), []);
  assert.deepEqual(flattenOutline([]), []);
  assert.deepEqual(lessonNeighbours([], 'x'), { previous: null, next: null, index: 0, total: 0 });
});

test('a section with no lessons still contributes nothing but does not break the order', () => {
  const steps = flattenOutline([
    { id: 'empty', title: 'Empty', position: 1, lessons: [] },
    { id: 's2', title: 'Filled', position: 2, lessons: [{ id: 'l', title: 'One', position: 1 }] },
  ]);

  assert.deepEqual(steps.map((s) => s.id), ['l']);
});
