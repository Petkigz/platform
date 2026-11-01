import assert from 'node:assert/strict';
import test from 'node:test';

import { describeRecordingAttach, recordingLinkProblem } from './live.ts';

/**
 * The two decisions a teacher makes about a recording, and the sentence each one
 * produces.
 *
 * Who may *watch* is decided in SQL and tested against a real Postgres in
 * `supabase/tests/live_recording.test.mjs`. What is tested here is the last inch:
 * that a link a browser would execute never reaches the network, and that a
 * receipt saying nobody was told is not printed as though somebody was.
 */

test('a link has to be an https address, and the refusal says what to do', () => {
  assert.equal(recordingLinkProblem('   '), 'Paste the address of the recording.');
  assert.match(String(recordingLinkProblem('javascript:alert(1)')), /https:\/\//);
  assert.match(String(recordingLinkProblem('data:text/html,<script>x</script>')), /https:\/\//);
  assert.match(String(recordingLinkProblem('http://drive.example.com/a.mp4')), /https:\/\//);
  assert.match(String(recordingLinkProblem('https://drive.example.com/a b.mp4')), /no spaces/);
  assert.match(
    String(recordingLinkProblem(`https://x.example/${'a'.repeat(2100)}`)),
    /too long/,
  );
});

test('an ordinary recording link passes, including a query string', () => {
  assert.equal(recordingLinkProblem('https://drive.example.com/tafsir.mp4'), null);
  assert.equal(recordingLinkProblem('  https://zoom.us/rec/play/abc?pwd=x  '), null);
});

test('a receipt that told nobody does not read as though it did', () => {
  const quiet = describeRecordingAttach({
    announced: false,
    notified: 0,
    people: 6,
    capped: false,
    replaced: false,
  });
  assert.match(quiet, /Recording attached/);
  assert.match(quiet, /Nobody was messaged/);

  const told = describeRecordingAttach({
    announced: true,
    notified: 1,
    people: 1,
    capped: false,
    replaced: false,
  });
  assert.match(told, /the one person/);

  const many = describeRecordingAttach({
    announced: true,
    notified: 6,
    people: 6,
    capped: false,
    replaced: true,
  });
  assert.match(many, /Replaced the recording/);
  assert.match(many, /all 6 people/);

  const partial = describeRecordingAttach({
    announced: true,
    notified: 200,
    people: 240,
    capped: true,
    replaced: false,
  });
  assert.match(partial, /200 of 240/);
  assert.match(partial, /not messaged/);
});

test('a class with nobody in it is not described as telling anybody', () => {
  const empty = describeRecordingAttach({
    announced: true,
    notified: 0,
    people: 0,
    capped: false,
    replaced: false,
  });
  assert.match(empty, /nobody to tell/i);
});
