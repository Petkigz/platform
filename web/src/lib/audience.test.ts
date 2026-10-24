import assert from 'node:assert/strict';
import test from 'node:test';

import {
  AGE_BANDS,
  AUDIENCE_BANDS,
  audienceFits,
  audienceSummary,
  bandFits,
  parseBands,
  validateAudience,
} from './audience.ts';

test('the five bands are the five the database allows', () => {
  assert.deepEqual([...AGE_BANDS], ['5-7', '8-10', '11-13', '14-17', '18+']);
  assert.deepEqual(AUDIENCE_BANDS.child, ['5-7', '8-10', '11-13', '14-17']);
  assert.deepEqual(AUDIENCE_BANDS.adult, ['18+']);
});

test('a child door never shows an adult course, and both shows on both', () => {
  assert.equal(audienceFits('child', 'young'), true);
  assert.equal(audienceFits('child', 'adults'), false);
  assert.equal(audienceFits('adult', 'adults'), true);
  assert.equal(audienceFits('adult', 'young'), false);
  assert.equal(audienceFits('both', 'young'), true);
  assert.equal(audienceFits('both', 'adults'), true);
});

test('empty bands mean every band, not no bands', () => {
  // The back catalogue has no bands. Treating empty as "nothing suits" would
  // empty both doors on the day this shipped.
  assert.equal(bandFits([], '8-10'), true);
  assert.equal(bandFits(null, '8-10'), true);
  assert.equal(bandFits(undefined, '8-10'), true);
  assert.equal(bandFits(['8-10'], '8-10'), true);
  assert.equal(bandFits(['8-10'], '11-13'), false);
  // No band chosen means no narrowing.
  assert.equal(bandFits(['8-10'], null), true);
});

test('the bands a form sent are read in order, without duplicates', () => {
  const parsed = parseBands(['8-10', '5-7', '8-10']);
  assert.deepEqual(parsed.bands, ['5-7', '8-10']);
  assert.deepEqual(parsed.unknown, []);
  assert.deepEqual(parseBands('14-17, 5-7').bands, ['5-7', '14-17']);
});

test('a band the platform does not know is reported rather than dropped', () => {
  // A course that quietly loses a band looks fine on screen and is wrong in the
  // database.
  const parsed = parseBands(['9-11', '5-7']);
  assert.deepEqual(parsed.bands, ['5-7']);
  assert.deepEqual(parsed.unknown, ['9-11']);
});

test('the form refuses an audience and a band that disagree', () => {
  assert.equal(validateAudience('child', ['5-7', '14-17']), null);
  assert.equal(validateAudience('adult', ['18+']), null);
  assert.equal(validateAudience('both', ['5-7', '18+']), null);
  assert.match(validateAudience('child', ['18+']) ?? '', /Adults is not available/);
  assert.match(validateAudience('adult', ['5-7']) ?? '', /Ages 5–7 is not available/);
  assert.match(validateAudience('grownups', []) ?? '', /young learners, adults, or both/);
});

test('an empty band list is valid for any audience', () => {
  assert.equal(validateAudience('child', []), null);
  assert.equal(validateAudience('adult', []), null);
});

test('the course says who it is for in words', () => {
  assert.equal(
    audienceSummary('child', []),
    'Young learners · suited to every age in that group',
  );
  assert.equal(
    audienceSummary('child', ['11-13', '8-10']),
    'Young learners · Ages 8–10, Ages 11–13',
  );
  assert.equal(audienceSummary('adult', ['18+']), 'Adults · Adults');
  assert.equal(audienceSummary('both', []), 'All ages · suited to every age in that group');
});
