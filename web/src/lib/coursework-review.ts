/** Coursework review display and form helpers. A review is an attestation;
 * it is not proof the file was opened or a record of every person who saw it.
 */

export type ReviewDecision = 'none' | 'clear' | 'concern';

export type ReviewQueueRow = {
  assetId: string;
  submissionId: string | null;
  courseTitle: string | null;
  learnerName: string | null;
  fileName: string | null;
  mimeType: string;
  byteSize: string;
  attachedAt: string;
  review: ReviewDecision;
  reviewedAt: string | null;
  reviewerName: string | null;
};

export type ReviewSummary = {
  files: number;
  reviewed: number;
  unreviewed: number;
  clear: number;
  concerns: number;
  oldestUnreviewed: string | null;
  oldestFile: string | null;
  reviewsOutlivingFiles: number;
  /** Always false. Stated by the database rather than assumed by this file. */
  gates: boolean;
};

export const EMPTY_SUMMARY: ReviewSummary = {
  files: 0,
  reviewed: 0,
  unreviewed: 0,
  clear: 0,
  concerns: 0,
  oldestUnreviewed: null,
  oldestFile: null,
  reviewsOutlivingFiles: 0,
  gates: false,
};

const decision = (value: unknown): ReviewDecision =>
  value === 'clear' || value === 'concern' ? value : 'none';

const text = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value : null;

const count = (value: unknown): number => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
};

/** The queue as `coursework_review_queue()` returns it, without trusting it. */
export function parseReviewQueue(value: unknown): ReviewQueueRow[] {
  if (!Array.isArray(value)) return [];
  const rows: ReviewQueueRow[] = [];
  for (const entry of value) {
    const raw = (entry ?? {}) as Record<string, unknown>;
    const assetId = text(raw.assetId);
    // A row with no file id cannot be opened or reviewed, so it is dropped rather
    // than rendered as a button that always fails.
    if (!assetId) continue;
    rows.push({
      assetId,
      submissionId: text(raw.submissionId),
      courseTitle: text(raw.courseTitle),
      learnerName: text(raw.learnerName),
      fileName: text(raw.fileName),
      mimeType: text(raw.mimeType) ?? 'application/octet-stream',
      byteSize: typeof raw.byteSize === 'string' ? raw.byteSize : String(raw.byteSize ?? ''),
      attachedAt: typeof raw.attachedAt === 'string' ? raw.attachedAt : '',
      review: decision(raw.review),
      reviewedAt: text(raw.reviewedAt),
      reviewerName: text(raw.reviewerName),
    });
  }
  return rows;
}

/** The counts, with `unreviewed` derived rather than trusted. */
export function parseReviewSummary(value: unknown): ReviewSummary {
  const raw = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  const files = count(raw.files);
  const reviewed = Math.min(count(raw.reviewed), files);
  return {
    files,
    reviewed,
    unreviewed: files - reviewed,
    clear: count(raw.clear),
    concerns: count(raw.concerns),
    oldestUnreviewed: text(raw.oldestUnreviewed),
    oldestFile: text(raw.oldestFile),
    reviewsOutlivingFiles: count(raw.reviewsOutlivingFiles),
    gates: raw.gates === true,
  };
}

/** One file's line on the marker's list. */
export function describeFileReview(file: {
  review?: ReviewDecision;
  reviewedAt?: string | null;
}): string {
  const when = file.reviewedAt ? ` on ${reviewDay(file.reviewedAt)}` : '';
  if (file.review === 'clear') return `review recorded${when}`;
  if (file.review === 'concern') return `a concern was noted${when}`;
  return 'no review recorded';
}

/** A day as a reader reads it, or nothing when there is no day to read. */
export function reviewDay(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** How long ago, in the units a person would use, or null when it is today. */
export function daysWaiting(iso: string | null | undefined, now = new Date()): number | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const days = Math.floor((now.getTime() - date.getTime()) / 86_400_000);
  return Math.max(days, 0);
}

/**
 * The headline distinguishes recorded reviews from unreviewed files, without
 * claiming to know whether anyone opened a file.
 */
export function reviewHeadline(summary: ReviewSummary, now = new Date()): string {
  if (summary.files === 0) {
    return 'No available handed-in files were returned. A review record does not prove whether anyone viewed a file.';
  }

  const lookedAt = summary.reviewed === 1
    ? '1 handed-in file has a recorded review'
    : `${summary.reviewed} of ${summary.files} handed-in files have a recorded review`;

  const parts = [`${lookedAt}.`];

  if (summary.unreviewed > 0) {
    const days = daysWaiting(summary.oldestUnreviewed, now);
    const oldest = summary.oldestUnreviewed && days !== null
      ? days === 0
        ? ', the oldest today'
        : `, the oldest ${days} day${days === 1 ? '' : 's'} ago`
      : '';
    parts.push(
      `${summary.unreviewed} ${summary.unreviewed === 1 ? 'has' : 'have'} no review recorded${oldest}.`,
    );
  }

  parts.push(
    'These review counts do not delay the teacher opening a handed-in file.',
  );

  if (summary.concerns > 0) {
    parts.push(
      `${summary.concerns} ${summary.concerns === 1 ? 'file carries' : 'files carry'} a recorded concern. `
      + 'A review is a prompt for a conversation, not a decision about a child.',
    );
  }

  return parts.join(' ');
}

/** What a reviewer is being asked when they open the form. */
export const REVIEW_FORM_HELP =
  'Two answers, and only one needs words. “No concern” is the ordinary case. '
  + '“Something to raise” needs a sentence, because a flag nobody explained is a file '
  + 'the next person has to open and guess about. Nothing here hides the file from the '
  + 'teacher marking it.';

/** The confirmation a reviewer reads after a review lands. */
export function reviewConfirmation(decisionValue: ReviewDecision): string {
  if (decisionValue === 'concern') {
    return 'Recorded in the audit trail and available in the safeguarding owner queue once it is set up. No alert was sent. Contact the safeguarding lead directly; recording is not proof they received it.';
  }
  return 'Recorded. A second look by the same person with the same answer is not a second review.';
}

export type ReviewPostResult =
  | { ok: true; decision: ReviewDecision; recorded: boolean }
  | { ok: false; error: string };

/** Plain-language failures, because a constraint name is not a sentence. */
export function reviewRefusal(message: string): string {
  if (/family that sent a file/i.test(message)) {
    return 'Only the teacher the work was handed to, or the safeguarding owner, can record a review — the family that sent the file cannot vouch for it.';
  }
  if (/only the teacher the work was handed to/i.test(message)) {
    return 'Only the teacher this work was handed to, or the safeguarding owner, can record a review of it.';
  }
  if (/not available for your review/i.test(message)) {
    return 'This file cannot be reviewed with your current access. Ask the safeguarding owner to check its assignment context.';
  }
  if (/needs a sentence/i.test(message)) {
    return 'Say what worried you in a sentence. “Something to raise” with no words is a flag somebody has to guess at.';
  }
  if (/has been deleted/i.test(message)) {
    return 'That file has been deleted, so there is nothing to review.';
  }
  if (/nothing to look at yet/i.test(message)) {
    return 'That file has not finished arriving yet. It can be reviewed once it is there.';
  }
  if (/sign in/i.test(message)) return 'Sign in first.';
  return 'That review was not recorded.';
}

/** Posts a review. The database decides who may, so this only reports. */
export async function postCourseworkReview(input: {
  assetId: string;
  decision: 'clear' | 'concern';
  note?: string | null;
}): Promise<ReviewPostResult> {
  const res = await fetch('/api/coursework/review', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      assetId: input.assetId,
      decision: input.decision,
      note: input.note?.trim() ? input.note.trim() : null,
    }),
  });

  const json = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    review?: { decision?: unknown; recorded?: unknown };
    error?: string;
  };

  if (!res.ok || json.ok !== true) {
    return { ok: false, error: reviewRefusal(json.error ?? '') };
  }

  return {
    ok: true,
    decision: json.review?.decision === 'concern' ? 'concern' : 'clear',
    recorded: json.review?.recorded === true,
  };
}
