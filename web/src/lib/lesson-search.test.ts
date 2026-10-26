import assert from 'node:assert/strict';
import test from 'node:test';

import { emptyShelfMessage, lessonResultsLede, matchLabel, snippetParts } from './lesson-search.ts';

test('a marked snippet splits into text and matches', () => {
  const parts = snippetParts('A careful look at what <mark>invalidates</mark> a fast.');

  assert.deepEqual(parts, [
    { text: 'A careful look at what ', mark: false },
    { text: 'invalidates', mark: true },
    { text: ' a fast.', mark: false },
  ]);
});

test('several matches in one snippet all survive', () => {
  const parts = snippetParts('<mark>fast</mark> and <mark>fasting</mark>');

  assert.equal(parts.filter((p) => p.mark).length, 2);
  assert.deepEqual(parts.filter((p) => p.mark).map((p) => p.text), ['fast', 'fasting']);
});

test('a snippet with no match is one plain piece', () => {
  assert.deepEqual(snippetParts('nothing marked here'), [
    { text: 'nothing marked here', mark: false },
  ]);
});

test('markup that is not a mark tag stays as text, which is the safe way to be wrong', () => {
  const parts = snippetParts('<img src=x onerror=alert(1)> <mark>fast</mark>');

  assert.equal(parts[0]!.text, '<img src=x onerror=alert(1)> ');
  assert.equal(parts[0]!.mark, false);
  assert.equal(parts[1]!.mark, true);
});

test('an unclosed mark tag is text, not an instruction', () => {
  const parts = snippetParts('a <mark>dangling match');

  assert.deepEqual(parts, [{ text: 'a <mark>dangling match', mark: false }]);
});

test('empty pieces are dropped so a keyed list has no blanks', () => {
  assert.deepEqual(snippetParts('<mark>fast</mark>'), [{ text: 'fast', mark: true }]);
});

test('the label says where the match was, in a place the reader can look', () => {
  assert.equal(matchLabel('title'), 'In the lesson title');
  assert.equal(matchLabel('description'), 'In the lesson introduction');
});

test('lesson results say they are lessons, and that they open inside a course', () => {
  assert.match(lessonResultsLede(3, 0), /No course matched, but 3 lessons did/);
  assert.match(lessonResultsLede(1, 0), /1 lesson did/);
  assert.match(lessonResultsLede(4, 2), /Also 4 lessons inside courses/);
  assert.match(lessonResultsLede(1, 1), /inside a course/);
});

test('an empty shelf past the first page blames the page, not the query', () => {
  assert.match(emptyShelfMessage({ page: 2, query: 'fiqh', lessonHits: 0 }), /past the end of the shelf/);
});

test('with lesson hits the message must not say nothing matched', () => {
  const line = emptyShelfMessage({ page: 1, query: 'conditions', lessonHits: 2 });

  assert.match(line, /No course matched/);
  assert.match(line, /lessons below did/);
  assert.doesNotMatch(line, /Nothing matched/);
});

test('with no hits the message suggests the new third thing to search', () => {
  assert.match(emptyShelfMessage({ page: 1, query: 'zzz', lessonHits: 0 }), /a word from a lesson/);
});

test('a query of only spaces is not a search', () => {
  assert.match(emptyShelfMessage({ page: 1, query: '   ', lessonHits: 0 }), /No courses yet/);
});
