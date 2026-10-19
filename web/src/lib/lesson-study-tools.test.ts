import assert from 'node:assert/strict';
import test from 'node:test';
import { MAX_LESSON_NOTE_LENGTH, validateLessonNote } from './lesson-study-tools.ts';

test('lesson notes are trimmed and must contain useful text', () => {
  assert.deepEqual(validateLessonNote('  A key idea  '), { ok: true, body: 'A key idea' });
  assert.equal(validateLessonNote('  ').ok, false);
  assert.equal(validateLessonNote(null).ok, false);
});

test('lesson notes enforce the database length limit before a request', () => {
  assert.equal(validateLessonNote('x'.repeat(MAX_LESSON_NOTE_LENGTH)).ok, true);
  assert.equal(validateLessonNote('x'.repeat(MAX_LESSON_NOTE_LENGTH + 1)).ok, false);
});
