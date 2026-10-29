import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import {
  coverageSentence,
  describeLicenceError,
  needsSignature,
  outstandingNames,
  parseCoverage,
  parseTeacherTerms,
  readableDate,
  termsSentence,
  uploadBlockedSentence,
  type TeacherTerms,
} from './licence.ts';

function terms(over: Partial<TeacherTerms> = {}): TeacherTerms {
  return {
    slug: 'teaching',
    title: 'Terms for teachers',
    documentFound: true,
    enforced: false,
    versionNumber: 1,
    effectiveAt: '2026-10-28',
    accepted: false,
    acceptedAt: null,
    blockedBy: null,
    canUpload: true,
    ...over,
  };
}

test('a status that did not arrive allows, because the gate is in the database', () => {
  const parsed = parseTeacherTerms(null);
  assert.equal(parsed.canUpload, true);
  assert.equal(parsed.enforced, false);
  assert.equal(parsed.blockedBy, null);

  // An unreadable answer must not lock a teacher out of their own library.
  const junk = parseTeacherTerms({ canUpload: 'no', blockedBy: 'something else' });
  assert.equal(junk.canUpload, true);
  assert.equal(junk.blockedBy, null);
});

test('a refusal is carried through, and an unknown one is not', () => {
  assert.equal(parseTeacherTerms({ blockedBy: 'not_accepted' }).blockedBy, 'not_accepted');
  assert.equal(parseTeacherTerms({ blockedBy: 'not_published' }).blockedBy, 'not_published');
  assert.equal(parseTeacherTerms({ blockedBy: 'missing' }).blockedBy, null);
  assert.equal(parseTeacherTerms({ canUpload: false }).canUpload, false);
});

test('dates are read as dates, not as instants', () => {
  assert.equal(readableDate('2026-10-28'), '28 October 2026');
  assert.equal(readableDate('2026-10-28T00:00:00+00:00'), '28 October 2026');
  assert.equal(readableDate(null), null);
  assert.equal(readableDate('not a date'), null);
});

test('with enforcement off, nothing is claimed to be required', () => {
  const sentence = termsSentence(terms());
  assert.match(sentence ?? '', /not currently required/i);
  assert.match(sentence ?? '', /not agreed/i);
  assert.doesNotMatch(sentence ?? '', /paused|refused/i);
});

test('with enforcement off and an agreement on file, the record is still named', () => {
  const sentence = termsSentence(terms({ accepted: true, acceptedAt: '2026-10-28T09:12:00Z' }));
  assert.match(sentence ?? '', /agreed to version 1/i);
  assert.match(sentence ?? '', /28 October 2026/);
  assert.match(sentence ?? '', /not yet required/i);
});

test('an accepted teacher under enforcement is told plainly', () => {
  const sentence = termsSentence(
    terms({ enforced: true, accepted: true, acceptedAt: '2026-10-28T09:12:00Z' }),
  );
  assert.match(sentence ?? '', /agreed to version 1/i);
  assert.doesNotMatch(sentence ?? '', /paused|required/i);
  assert.equal(uploadBlockedSentence(terms({ enforced: true, accepted: true })), null);
  assert.equal(needsSignature(terms({ enforced: true, accepted: true })), false);
});

test('a teacher who has not agreed is offered the button, not a dead end', () => {
  const blocked = terms({ enforced: true, blockedBy: 'not_accepted', canUpload: false });
  assert.equal(needsSignature(blocked), true);
  assert.match(termsSentence(blocked) ?? '', /agree to version 1/i);
  assert.match(uploadBlockedSentence(blocked) ?? '', /paused until you agree/i);
});

test('nothing published and enforcement on is the owner’s problem, and says so', () => {
  const blocked = terms({
    enforced: true,
    documentFound: true,
    versionNumber: null,
    effectiveAt: null,
    blockedBy: 'not_published',
    canUpload: false,
  });
  // No button: there is no version to agree to, and a button would be a lie.
  assert.equal(needsSignature(blocked), false);
  assert.match(termsSentence(blocked) ?? '', /admin\/policies/);
  assert.match(uploadBlockedSentence(blocked) ?? '', /until the teacher terms are published/i);
});

test('a document that does not exist is said to be missing rather than agreed', () => {
  const none = terms({ documentFound: false, versionNumber: null, blockedBy: null });
  assert.match(termsSentence(none) ?? '', /not published yet/i);
});

test('coverage counts the gap and names who is in it', () => {
  assert.match(
    coverageSentence({ enforced: true, versionNumber: 1, teachers: 0, accepted: 0, outstanding: [] }),
    /nobody to ask/i,
  );

  const one = { enforced: true, versionNumber: 1, teachers: 1, accepted: 0, outstanding: [] };
  assert.match(coverageSentence(one), /0 of 1 appointed teacher has agreed/i);
  assert.match(coverageSentence(one), /1 still to agree/i);

  const partial = { enforced: false, versionNumber: 1, teachers: 3, accepted: 2, outstanding: [] };
  assert.match(coverageSentence(partial), /2 of 3 appointed teachers have agreed/i);
  assert.match(coverageSentence(partial), /nothing is refused yet/i);

  const done = { enforced: true, versionNumber: 2, teachers: 2, accepted: 2, outstanding: [] };
  assert.doesNotMatch(coverageSentence(done), /still to agree/i);
  assert.match(coverageSentence(done), /version 2/);
});

test('names read as a list rather than an array', () => {
  const one = parseCoverage({ outstanding: [{ userId: 'a', name: 'Amina' }] })!;
  assert.equal(outstandingNames(one), 'Amina');
  const two = parseCoverage({ outstanding: [{ userId: 'a', name: 'Amina' }, { userId: 'b', name: 'Yusuf' }] })!;
  assert.equal(outstandingNames(two), 'Amina and Yusuf');
  const three = parseCoverage({
    outstanding: [
      { userId: 'a', name: 'Amina' },
      { userId: 'b', name: 'Yusuf' },
      { userId: 'c', name: null },
    ],
  })!;
  assert.equal(outstandingNames(three), 'Amina, Yusuf and An unnamed account');
  assert.equal(outstandingNames(parseCoverage({ outstanding: [] })!), '');
});

test('coverage tolerates an answer with nothing in it', () => {
  assert.equal(parseCoverage(null), null);
  const empty = parseCoverage({})!;
  assert.equal(empty.teachers, 0);
  assert.equal(empty.accepted, 0);
  assert.deepEqual(empty.outstanding, []);
});

test('the refusals are turned into sentences, and an unknown one is not guessed at', () => {
  assert.match(describeLicenceError('licence:not_accepted'), /agree to the teacher terms first/i);
  assert.match(describeLicenceError('licence:not_published'), /not published/i);
  assert.match(describeLicenceError('new row violates check constraint'), /refused/i);
  assert.match(describeLicenceError(null), /refused/i);
  assert.doesNotMatch(describeLicenceError(null), /agree/i);
});
