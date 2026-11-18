/**
 * Merging two accounts, as a screen sees it.
 *
 * The database decides everything that matters: whether a merge may run, what
 * would move, and what happened. This file reads the reply defensively and
 * turns it into names and counts. It holds no sentence: the words are the
 * catalogue's (`merge.*`), and what the database says in English is told
 * apart in `merge-outcome.ts`.
 *
 * The rule that shapes all of it: **a merge is irreversible**, so nothing here
 * may make it look more available or more complete than it is. A count that
 * came back missing is not a line; it is not printed as zero.
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

/** The five states a request can be in. The table allows no other. */
export const MERGE_STATES = ['pending', 'completed', 'declined', 'cancelled', 'expired'] as const;

export type MergeState = (typeof MERGE_STATES)[number];

export type MergeRequest = {
  id: string;
  status: MergeState;
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
  // A state this file does not know cannot be said, so the row is not drawn.
  if (!id || !status || !(MERGE_STATES as readonly string[]).includes(status)) return null;
  return {
    id,
    status: status as MergeState,
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

/** The state to say for a request: one that ran out while waiting is said as that. */
export function mergeStateOf(request: Pick<MergeRequest, 'status' | 'expired'>): MergeState {
  return request.expired ? 'expired' : request.status;
}

/**
 * What a merge counts as moved, in the order it is said.
 *
 * The names are the database's (`merge_duplicate_account()`); the words for
 * each are the catalogue's (`merge.mv*`). `leftBehind` is deliberately not in
 * the list: it is reported separately, as what stayed, because a merge that
 * quietly dropped somebody's review is a merge nobody can trust.
 */
export const MERGE_MOVES = [
  'learnerRelinked',
  'enrolments',
  'certificates',
  'entitlementGrants',
  'reviews',
  'assessmentAttempts',
  'assignmentSubmissions',
  'cohortMemberships',
  'liveAttendances',
  'supportCases',
  'notifications',
  'roles',
  'notes',
  'bookmarks',
  'guardianships',
] as const;

export type MergeMove = (typeof MERGE_MOVES)[number];

export type MergeMoved = { kind: MergeMove; count: number };

/** What moved, as names and counts. A count of nothing is not a line. */
export function movesOf(summary: MergeSummary | null): MergeMoved[] {
  if (!summary) return [];
  const lines: MergeMoved[] = [];
  for (const kind of MERGE_MOVES) {
    const n = summary[kind];
    if (typeof n === 'number' && Number.isSafeInteger(n) && n > 0) lines.push({ kind, count: n });
  }
  return lines;
}

/** The rows that stayed with the archived record, or null when none did. */
export function leftBehind(summary: MergeSummary | null): number | null {
  const n = summary?.leftBehind;
  return typeof n === 'number' && Number.isSafeInteger(n) && n > 0 ? n : null;
}

/**
 * Whether what was typed is the name, as the database will compare it.
 *
 * `decide_account_merge()` trims both and compares them exactly, capitals
 * included. This used to ignore capitals and spacing, so the button lit for
 * "ama owusu" and the database then refused it. An account with no name
 * confirms nothing: the database would accept an empty box for it, and the
 * screen asks for a name first instead.
 */
export function confirmsMerge(typed: string, displayName: string | null): boolean {
  const name = (displayName ?? '').trim();
  return name.length > 0 && typed.trim() === name;
}
