/**
 * Merging two accounts, as a screen sees it.
 *
 * The database decides everything that matters: whether a merge may run, what
 * would move, and what happened. This file does the two things a server cannot —
 * it reads the reply defensively, and it turns a summary of counts into a
 * sentence a person can check against what they expected.
 *
 * The rule that shapes all of it: **a merge is irreversible**, so nothing here
 * may make it look more available or more complete than it is. A refusal is
 * shown with its reason, not hidden; a count that came back missing is said to
 * be missing rather than printed as zero.
 */

export type MergePreview = {
  ok: boolean;
  blocks: string[];
  notes: string[];
};

export type MergeSummary = {
  enrolments?: number;
  certificates?: number;
  entitlementGrants?: number;
  reviews?: number;
  assessmentAttempts?: number;
  assignmentSubmissions?: number;
  cohortMemberships?: number;
  liveAttendances?: number;
  supportCases?: number;
  notifications?: number;
  roles?: number;
  notes?: number;
  bookmarks?: number;
  guardianships?: number;
  learnerRelinked?: number;
  leftBehind?: number;
  [key: string]: number | undefined;
};

export type MergeRequest = {
  id: string;
  status: 'pending' | 'completed' | 'declined' | 'cancelled' | 'expired' | string;
  requestedAt: string | null;
  expiresAt: string | null;
  expired: boolean;
  otherName: string | null;
  otherUserId: string | null;
  preview: MergePreview | null;
  summary: MergeSummary | null;
};

export type MergeBoard = {
  enabled: boolean;
  incoming: MergeRequest[];
  outgoing: MergeRequest[];
};

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function count(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : undefined;
}

function texts(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0);
}

export function parsePreview(value: unknown): MergePreview | null {
  const row = record(value);
  if (!row) return null;
  return {
    // A preview that does not say it is fine is not fine. The merge would refuse
    // anyway; the screen must not promise otherwise.
    ok: row.ok === true,
    blocks: texts(row.blocks),
    notes: texts(row.notes),
  };
}

export function parseSummary(value: unknown): MergeSummary | null {
  const row = record(value);
  if (!row) return null;
  const out: MergeSummary = {};
  for (const [key, raw] of Object.entries(row)) {
    const n = count(raw);
    if (n !== undefined) out[key] = n;
  }
  return out;
}

function parseRequest(value: unknown): MergeRequest | null {
  const row = record(value);
  if (!row) return null;
  const id = text(row.id);
  const status = text(row.status);
  if (!id || !status) return null;
  return {
    id,
    status,
    requestedAt: text(row.requestedAt),
    expiresAt: text(row.expiresAt),
    expired: row.expired === true,
    otherName: text(row.otherName),
    otherUserId: text(row.otherUserId),
    preview: parsePreview(row.preview),
    summary: parseSummary(row.summary),
  };
}

function parseList(value: unknown): MergeRequest[] {
  if (!Array.isArray(value)) return [];
  return value.map(parseRequest).filter((entry): entry is MergeRequest => entry !== null);
}

/** The board, or null when the reply is not one this page can read. */
export function parseMergeBoard(value: unknown): MergeBoard | null {
  const row = record(value);
  if (!row) return null;
  if (typeof row.enabled !== 'boolean') return null;
  return {
    enabled: row.enabled,
    incoming: parseList(row.incoming),
    outgoing: parseList(row.outgoing),
  };
}

/** The label to print for a request's state. */
export function describeMergeStatus(status: string, expired = false): string {
  if (expired || status === 'expired') return 'Expired';
  switch (status) {
    case 'pending':
      return 'Waiting';
    case 'completed':
      return 'Merged';
    case 'declined':
      return 'Declined';
    case 'cancelled':
      return 'Withdrawn';
    default:
      return status;
  }
}

const MOVE_LABELS: Record<string, (n: number) => string> = {
  enrolments: (n) => (n === 1 ? '1 enrolment' : `${n} enrolments`),
  certificates: (n) => (n === 1 ? '1 certificate' : `${n} certificates`),
  entitlementGrants: (n) => (n === 1 ? '1 access grant' : `${n} access grants`),
  reviews: (n) => (n === 1 ? '1 review' : `${n} reviews`),
  assessmentAttempts: (n) => (n === 1 ? '1 assessment attempt' : `${n} assessment attempts`),
  assignmentSubmissions: (n) => (n === 1 ? '1 assignment' : `${n} assignments`),
  cohortMemberships: (n) => (n === 1 ? '1 cohort' : `${n} cohorts`),
  liveAttendances: (n) => (n === 1 ? '1 live class attended' : `${n} live classes attended`),
  supportCases: (n) => (n === 1 ? '1 support case' : `${n} support cases`),
  notifications: (n) => (n === 1 ? '1 message' : `${n} messages`),
  roles: (n) => (n === 1 ? '1 role' : `${n} roles`),
  notes: (n) => (n === 1 ? '1 lesson note' : `${n} lesson notes`),
  bookmarks: (n) => (n === 1 ? '1 bookmark' : `${n} bookmarks`),
  guardianships: (n) => (n === 1 ? '1 guardianship' : `${n} guardianships`),
  learnerRelinked: (n) => (n === 1 ? 'the learning record' : `${n} learning records`),
};

/**
 * What moved, in words.
 *
 * `leftBehind` is deliberately not in that list: it is reported separately, as
 * what stayed, because a merge that quietly dropped somebody's review is a merge
 * nobody can trust.
 */
export function describeMoves(summary: MergeSummary | null): string[] {
  if (!summary) return [];
  const lines: string[] = [];
  for (const [key, label] of Object.entries(MOVE_LABELS)) {
    const n = summary[key];
    if (typeof n === 'number' && n > 0) lines.push(label(n));
  }
  return lines;
}

/** The rows that stayed with the archived record, or null when none did. */
export function leftBehind(summary: MergeSummary | null): number | null {
  const n = summary?.leftBehind;
  return typeof n === 'number' && n > 0 ? n : null;
}

/** Why the merge cannot run, as one sentence a person can act on. */
export function describeBlocks(preview: MergePreview | null): string | null {
  if (!preview || preview.ok) return null;
  if (preview.blocks.length === 0) {
    return 'This merge cannot run, and the platform did not say why. Ask us before trying again.';
  }
  return preview.blocks.join(' ');
}

/** The date a request stops waiting, in words. */
export function describeExpiry(expiresAt: string | null): string | null {
  if (!expiresAt) return null;
  const date = new Date(expiresAt);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** Whether the confirmation the person typed matches, ignoring case and spacing. */
export function confirmsMerge(typed: string, displayName: string | null): boolean {
  const a = typed.trim().replace(/\s+/g, ' ').toLowerCase();
  const b = (displayName ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
  return a.length > 0 && a === b;
}
