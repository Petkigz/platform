import assert from 'node:assert/strict';
import test from 'node:test';

import { lessonNote, noteFor, parseStanding } from './playback-standing.ts';

/**
 * What a learner is told when the recording is not there.
 *
 * The old copy was one sentence for six situations and it was written in the voice
 * of a database column. These tests pin the three words, the two sentences that
 * matter, and the four things this copy must never do: blame the learner, name
 * the machinery, promise a time, or sound like a stack trace.
 */

test('a playing resource says nothing at all', () => {
  // The page prints the player. A note beside a working video is noise.
  assert.equal(noteFor('plays'), null);
  assert.equal(noteFor(null), null);
  assert.equal(noteFor(undefined), null);
});

test('a resource still being prepared is not the learner’s problem to solve', () => {
  const note = noteFor('preparing');
  assert.ok(note);
  assert.equal(note.heading, 'Not ready yet');
  assert.equal(note.tellSomeone, false, 'there is nothing to report; it is on its way through a queue');
  assert.match(note.sentence, /still being prepared/);
  // And it offers the learner something to do that is actually available.
  assert.match(note.sentence, /read the rest of the lesson/);
});

test('an unavailable resource says waiting will not fix it, and points at a person', () => {
  const note = noteFor('unavailable');
  assert.ok(note);
  assert.equal(note.heading, 'Not available');
  assert.equal(note.tellSomeone, true, 'this is the one case where telling somebody helps');
  assert.match(note.sentence, /waiting will not fix it/);
  assert.match(note.sentence, /tell us/);
});

test('the copy never promises a time it cannot keep', () => {
  // There is no transcode worker in this deployment. "Shortly", "soon", "in a few
  // minutes" would all be promises the platform cannot stand behind, and this is
  // the sentence a learner remembers.
  for (const state of ['preparing', 'unavailable'] as const) {
    const sentence = noteFor(state)?.sentence ?? '';
    assert.doesNotMatch(sentence, /shortly|soon|in a few|momentarily|within \d|minutes|hours/i,
      `"${state}" must not promise a time: ${sentence}`);
  }
});

test('the copy does not speak in the platform’s own vocabulary', () => {
  // The sentence it replaced was "uploaded, not yet encoded for playback".
  const forbidden = /encod(e|ing)|rendition|transcod|ffmpeg|profile|worker|quarantin|moderat|jsonb|supabase/i;
  for (const state of ['preparing', 'unavailable'] as const) {
    const note = noteFor(state);
    assert.doesNotMatch(note?.heading ?? '', forbidden);
    assert.doesNotMatch(note?.sentence ?? '', forbidden);
  }
});

test('the copy never blames the learner', () => {
  const blaming = /you (must|should) have|your fault|you failed|you did not|invalid|denied/i;
  for (const state of ['preparing', 'unavailable'] as const) {
    assert.doesNotMatch(noteFor(state)?.sentence ?? '', blaming);
  }
});

test('one unavailable recording outranks any number of ones still coming', () => {
  // The two need different things from the learner: one needs a report, the other
  // needs patience. Leading with patience when something is broken wastes it.
  const mixed = lessonNote(['preparing', 'unavailable', 'plays']);
  assert.ok(mixed);
  assert.equal(mixed.tellSomeone, true);
  assert.equal(mixed.heading, 'One recording cannot be played');

  const twoBroken = lessonNote(['unavailable', 'unavailable']);
  assert.equal(twoBroken?.heading, 'Some recordings cannot be played');
});

test('a lesson that is only still coming says so without alarm', () => {
  const note = lessonNote(['preparing', 'plays']);
  assert.ok(note);
  assert.equal(note.tellSomeone, false);
  assert.match(note.heading, /still being prepared/);
  // The one piece of advice that saves a learner who would otherwise reload a
  // page ten times.
  assert.match(note.sentence, /will not appear by refreshing/);
});

test('a lesson where everything plays, or where nothing was asked, says nothing', () => {
  assert.equal(lessonNote(['plays', 'plays']), null);
  assert.equal(lessonNote([]), null);
  assert.equal(lessonNote([null, undefined]), null);
});

test('the lesson note and the resource note never contradict each other', () => {
  // If the summary says "somebody has to look at it", at least one row must be
  // the one that says it too — otherwise a learner scrolls down and finds a
  // recording marked "not ready yet" with no way to tell which one is meant.
  const states = ['unavailable', 'preparing', 'plays'] as const;
  const summary = lessonNote(states);
  const rows = states.map((state) => noteFor(state)).filter((note) => note !== null);
  if (summary?.tellSomeone) {
    assert.ok(rows.some((note) => note.tellSomeone), 'the summary points at a person, so a row must too');
  }
});

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

test('a standing is read from the row the function returns', () => {
  const map = parseStanding([
    { resource_id: 'r-1', state: 'plays' },
    { resource_id: 'r-2', state: 'preparing' },
  ]);
  assert.equal(map.get('r-1'), 'plays');
  assert.equal(map.get('r-2'), 'preparing');
});

test('a state the page does not know is dropped, not guessed', () => {
  // A word this module cannot describe is a sentence the page cannot stand
  // behind, so the resource renders with no note — exactly what it did before.
  const map = parseStanding([
    { resource_id: 'r-1', state: 'something_new' },
    { resource_id: 'r-2', state: null },
    { resource_id: 'r-3' },
    { resource_id: 'r-4', state: 'unavailable' },
  ]);
  assert.deepEqual([...map.keys()], ['r-4']);
});

test('a response that is not a list is no standings, not a crash', () => {
  assert.equal(parseStanding(null).size, 0);
  assert.equal(parseStanding(undefined).size, 0);
  assert.equal(parseStanding({ data: [] }).size, 0);
  assert.equal(parseStanding('nope').size, 0);
});

test('rows without a resource id are skipped', () => {
  const map = parseStanding([{ state: 'plays' }, null, { resource_id: 'r-1', state: 'plays' }]);
  assert.deepEqual([...map.keys()], ['r-1']);
});
