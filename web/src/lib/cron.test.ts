import assert from 'node:assert/strict';
import test from 'node:test';
import { checkScheduler, NO_SECRET_MESSAGE } from './cron.ts';

const SECRET = 'a'.repeat(43);

test('no secret configured is a 503 that says what to do, not a 401', () => {
  // A 401 here sends somebody hunting for a wrong token that was never set.
  const refusal = checkScheduler(`Bearer ${SECRET}`, undefined);
  assert.equal(refusal.ok, false);
  if (refusal.ok) return;
  assert.equal(refusal.status, 503);
  assert.equal(refusal.body.code, 'no_secret');
  assert.equal(refusal.body.error, NO_SECRET_MESSAGE);

  const blank = checkScheduler(`Bearer ${SECRET}`, '   ');
  assert.equal(blank.ok, false);
  if (!blank.ok) assert.equal(blank.status, 503);
});

test('a wrong, missing or truncated token is refused', () => {
  const cases: (string | null)[] = [
    null,
    '',
    'Bearer ',
    'Bearer b'.repeat(1),
    `Bearer ${SECRET.slice(0, -1)}`,
    `Bearer ${SECRET}x`,
    SECRET.replace(/^/, 'Basic '),
  ];
  for (const header of cases) {
    const refusal = checkScheduler(header, SECRET);
    assert.equal(refusal.ok, false, `accepted ${JSON.stringify(header)}`);
    if (!refusal.ok) assert.equal(refusal.status, 401);
  }
});

test('the right token is accepted, with or without the scheme and in any case', () => {
  for (const header of [`Bearer ${SECRET}`, `bearer ${SECRET}`, `  Bearer   ${SECRET}  `]) {
    assert.equal(checkScheduler(header, SECRET).ok, true, `refused ${header}`);
  }
  // A secret stored with a trailing newline — which is what pasting one into a
  // dashboard does — still matches what the scheduler sends.
  assert.equal(checkScheduler(`Bearer ${SECRET}`, `${SECRET}\n`).ok, true);
});
