import assert from 'node:assert/strict';
import test from 'node:test';
import { chooseQuizTranscript, MAX_SOURCE_LENGTH } from './quiz-material.ts';

const items = [{ lessonId: 'a', title: 'Lesson', body: 'A teacher-provided transcript.' }];
test('choosing a transcript returns the exact source text', () => {
  assert.deepEqual(chooseQuizTranscript(items, 'a'), { ok: true, source: items[0]?.body });
});
test('missing and overlong transcripts are refused rather than silently truncated', () => {
  assert.equal(chooseQuizTranscript(items, 'missing').ok, false);
  const result = chooseQuizTranscript([{ lessonId: 'b', title: 'Long', body: 'x'.repeat(MAX_SOURCE_LENGTH + 1) }], 'b');
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.message, /shorter passage/i);
});
