import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import {
  EMPTY_SUMMARY,
  describeFileReview,
  parseReviewQueue,
  parseReviewPage,
  parseReviewSummary,
  reviewConfirmation,
  reviewDay,
  reviewHeadline,
  reviewRefusal,
  postCourseworkReview,
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
  assert.equal(describeFileReview({ review: 'none' }), 'no review recorded');
  assert.equal(
    describeFileReview({ review: 'clear', reviewedAt: '2026-11-01T09:00:00Z' }),
    'review recorded on 1 Nov 2026',
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

  assert.ok(line.startsWith('3 of 12 handed-in files have a recorded review.'), line);
  assert.ok(line.includes('9 have no review recorded, the oldest 5 days ago.'), line);
  assert.ok(/review counts do not delay/.test(line), line);
  assert.ok(/1 file carries a recorded concern/.test(line), line);
  assert.ok(!/blocked|held/i.test(line), `the copy implies a gate: ${line}`);
});

test('an empty platform says what will happen rather than zero of zero', () => {
  const line = reviewHeadline(EMPTY_SUMMARY, now);
  assert.ok(line.startsWith('No available handed-in files were returned.'), line);
  assert.ok(/does not prove/.test(line), line);
});

test('an unreviewed file with no date is described without inventing one', () => {
  const line = reviewHeadline(
    parseReviewSummary({ files: 2, reviewed: 0, unreviewed: 2, oldestUnreviewed: null }),
    now,
  );
  assert.ok(line.includes('2 have no review recorded.'), line);
  assert.ok(!/NaN|Invalid/.test(line), line);
  assert.equal(daysWaiting(null), null);
  assert.equal(reviewDay(''), null);
  assert.equal(reviewDay('not a date'), null);
});

test('a concern is confirmed as a conversation, not a decision about a child', () => {
  const concern = reviewConfirmation('concern');
  assert.ok(/audit trail/.test(concern), concern);
  assert.ok(/may be sent if configured/.test(concern) && /directly/.test(concern), concern);
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
  assert.ok(/unavailable/.test(
    reviewRefusal('that file has been deleted, so there is nothing to review')));
  assert.ok(/finished arriving/.test(
    reviewRefusal('that file is pending, so there is nothing to look at yet')));

  // An unknown failure is a refusal, never a silent success.
  assert.match(reviewRefusal(''), /could not be confirmed/);
  assert.match(reviewRefusal('some new constraint name'), /could not be confirmed/);
});


test('an interrupted or malformed review reply is uncertain, not a clear review', async () => {
  const original=globalThis.fetch;
  const input={assetId:'file',decision:'concern' as const,note:'Important concern'};
  try {
    globalThis.fetch=async()=>{throw new Error('response lost')};
    const lost=await postCourseworkReview(input);
    assert.equal(lost.ok,false);
    if (!lost.ok) { assert.equal(lost.uncertain,true); assert.match(lost.error,/owner to check/); }
    globalThis.fetch=async()=>new Response(JSON.stringify({ok:true,review:{decision:'clear',recorded:true}}),{status:200});
    const wrong=await postCourseworkReview(input);
    assert.equal(wrong.ok,false);
    if (!wrong.ok) assert.equal(wrong.uncertain,true);
    globalThis.fetch=async()=>new Response(JSON.stringify({ok:true,review:{decision:'concern',recorded:true}}),{status:200});
    assert.deepEqual(await postCourseworkReview(input),{ok:true,decision:'concern',recorded:true});
  } finally {globalThis.fetch=original;}
});


test('owner can open, review again and hold a previously reviewed file', () => {
  const page=readFileSync(new URL('../app/admin/coursework/page.tsx', import.meta.url),'utf8');
  const section=page.slice(page.indexOf('{reviewed.length > 0'),page.indexOf('<section id="coursework-holds"'));
  assert.match(section,/courseworkFileHref\(row\.assetId\)/);
  assert.match(section,/Record another review/);
  assert.match(section,/action="hold"/);
  const form=readFileSync(new URL('../app/admin/coursework/review-form.tsx', import.meta.url),'utf8');
  assert.match(form,/delivery is not guaranteed/);
  assert.doesNotMatch(form,/no alert is sent/i);
});


test('review pages preserve precise timestamps and reject invalid cursors', () => {
  const raw={assetId:'11111111-1111-4111-8111-111111111111',submissionId:'submission',attachedAt:'2026-11-01T10:00:00.123456+00:00',review:'none'};
  assert.equal(parseReviewPage([raw])?.[0]?.attachedAt, raw.attachedAt);
  assert.equal(parseReviewPage([{...raw, review:'unknown'}]), null);
  assert.equal(parseReviewPage(null), null);
  assert.deepEqual(parseReviewPage([]), []);
});
