import assert from 'node:assert/strict';
import test from 'node:test';

import {
  EMPTY_SUMMARY,
  describeFileReview,
  parseReviewQueue,
  parseReviewSummary,
  reviewConfirmation,
  reviewDay,
  reviewHeadline,
  reviewRefusal,
  daysWaiting,
} from './coursework-review.ts';

const now = new Date('2026-11-01T12:00:00Z');

test('a queue row with no file id is dropped, not rendered as a broken button', () => {
  const rows = parseReviewQueue([
    {
      assetId: 'a-1',
      submissionId: 's-1',
      courseTitle: 'Tajweed for beginners',
      learnerName: 'Yusuf',
      fileName: 'page-one.jpg',
      mimeType: 'image/jpeg',
      byteSize: '1800000',
      attachedAt: '2026-10-30T09:00:00Z',
      review: 'concern',
      reviewedAt: '2026-10-31T09:00:00Z',
      reviewerName: 'Ustadha Amina',
    },
    { fileName: 'no id.jpg', review: 'clear' },
    null,
  ]);

  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.review, 'concern');
  assert.equal(rows[0]?.reviewerName, 'Ustadha Amina');

  // An unknown decision is "not looked at", never quietly a clean bill of health.
  assert.equal(parseReviewQueue([{ assetId: 'b', review: 'approved' }])[0]?.review, 'none');
  assert.equal(parseReviewQueue([{ assetId: 'b' }])[0]?.reviewedAt, null);
  assert.deepEqual(parseReviewQueue(null), []);
});

test('the summary derives "unreviewed" rather than trusting it', () => {
  // A database that says 9 of 4 files were reviewed is wrong, and the screen must
  // not render a negative number of files nobody has looked at.
  const summary = parseReviewSummary({
    files: 4,
    reviewed: 9,
    unreviewed: 99,
    clear: 3,
    concerns: 1,
    gates: false,
  });
  assert.equal(summary.reviewed, 4);
  assert.equal(summary.unreviewed, 0);
  assert.equal(summary.gates, false);
  assert.equal(EMPTY_SUMMARY.files, 0);
});

test('a file says whether somebody looked at it, and never says "pending"', () => {
  assert.equal(describeFileReview({ review: 'none' }), 'not looked at yet');
  assert.equal(
    describeFileReview({ review: 'clear', reviewedAt: '2026-11-01T09:00:00Z' }),
    'looked at on 1 Nov 2026',
  );
  assert.equal(
    describeFileReview({ review: 'concern', reviewedAt: '2026-11-01T09:00:00Z' }),
    'a concern was noted on 1 Nov 2026',
  );
  // The word "pending" is what turns a record into a queue nobody trusts.
  for (const line of [
    describeFileReview({ review: 'none' }),
    describeFileReview({ review: 'clear', reviewedAt: '2026-11-01T09:00:00Z' }),
  ]) {
    assert.ok(!/pending/i.test(line), `"pending" in: ${line}`);
  }
});

test('the headline leads with what was looked at and says nothing is blocked', () => {
  const line = reviewHeadline(
    parseReviewSummary({
      files: 12,
      reviewed: 3,
      unreviewed: 9,
      concerns: 1,
      oldestUnreviewed: '2026-10-27T12:00:00Z',
      gates: false,
    }),
    now,
  );

  assert.ok(line.startsWith('3 of 12 handed-in files have been looked at.'), line);
  assert.ok(line.includes('9 have not been looked at, the oldest 5 days ago.'), line);
  assert.ok(/Nothing is waiting behind this number/.test(line), line);
  assert.ok(/1 file carries a concern/.test(line), line);
  assert.ok(!/blocked|held/i.test(line), `the copy implies a gate: ${line}`);
});

test('an empty platform says what will happen rather than zero of zero', () => {
  const line = reviewHeadline(EMPTY_SUMMARY, now);
  assert.ok(line.startsWith('Nobody has handed in a file yet.'), line);
  assert.ok(/straight away/.test(line), line);
});

test('an unreviewed file with no date is described without inventing one', () => {
  const line = reviewHeadline(
    parseReviewSummary({ files: 2, reviewed: 0, unreviewed: 2, oldestUnreviewed: null }),
    now,
  );
  assert.ok(line.includes('2 have not been looked at.'), line);
  assert.ok(!/NaN|Invalid/.test(line), line);
  assert.equal(daysWaiting(null), null);
  assert.equal(reviewDay(''), null);
  assert.equal(reviewDay('not a date'), null);
});

test('a concern is confirmed as a conversation, not a decision about a child', () => {
  const concern = reviewConfirmation('concern');
  assert.ok(/audit trail/.test(concern), concern);
  assert.ok(!/hidden|blocked/i.test(concern), concern);

  const clear = reviewConfirmation('clear');
  assert.ok(/not a second review/.test(clear), clear);
});

test('every refusal the database can send becomes a sentence a person can act on', () => {
  // Each message below is one the plpgsql raises, verbatim.
  assert.ok(/family that sent the file/.test(
    reviewRefusal('the family that sent a file cannot vouch for it')));
  assert.ok(/Only the teacher/.test(
    reviewRefusal('only the teacher the work was handed to, or staff, may review it')));
  assert.ok(/Say what worried you/.test(
    reviewRefusal('a concern needs a sentence saying what worried you')));
  assert.ok(/deleted/.test(
    reviewRefusal('that file has been deleted, so there is nothing to review')));
  assert.ok(/finished arriving/.test(
    reviewRefusal('that file is pending, so there is nothing to look at yet')));

  // An unknown failure is a refusal, never a silent success.
  assert.equal(reviewRefusal(''), 'That review was not recorded.');
  assert.equal(reviewRefusal('some new constraint name'), 'That review was not recorded.');
});
