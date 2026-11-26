/**
 * The two discussion boards (`20261281153000_discussion_boards.sql`): what
 * the database answers, read into shapes a page can draw, and what a refusal
 * is called.
 *
 * Nothing in this file knows an account. The database gives a member a
 * username, a kind and whether a post is their own, and that is all that is
 * read here. The one reply that carries an account (`board_author()`) is read
 * by `parseAuthor`, which only the staff desk calls.
 */

export const BOARDS = ['students', 'teachers'] as const;
export type Board = (typeof BOARDS)[number];

export function boardOf(value: unknown): Board | null {
  return typeof value === 'string' && (BOARDS as readonly string[]).includes(value) ? (value as Board) : null;
}

export const AUTHOR_KINDS = ['student', 'teacher', 'staff'] as const;
export type AuthorKind = (typeof AUTHOR_KINDS)[number];

const kindOf = (value: unknown): AuthorKind | null =>
  typeof value === 'string' && (AUTHOR_KINDS as readonly string[]).includes(value) ? (value as AuthorKind) : null;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
export const isId = (value: unknown): value is string => typeof value === 'string' && UUID.test(value);

const text = (value: unknown): string | null => (typeof value === 'string' && value !== '' ? value : null);
const moment = (value: unknown): string | null =>
  typeof value === 'string' && !Number.isNaN(Date.parse(value)) ? value : null;
const record = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

// ---------------------------------------------------------------------------
// What was typed
// ---------------------------------------------------------------------------
export const HANDLE_MIN = 3;
export const HANDLE_MAX = 24;
export const TITLE_MIN = 4;
export const TITLE_MAX = 140;
export const BODY_MAX = 6000;
export const REASON_MIN = 4;
export const REASON_MAX = 1000;
/** A reason for opening the account behind a post has to be one somebody can read later. */
export const LOOK_REASON_MIN = 10;

const characters = (value: string): number => [...value].length;

/** The same two patterns the table holds a username to. */
const HANDLE_SPACE = /[\s\u00A0\u200B-\u200F\u202A-\u202E\u2060-\u2069\uFEFF\u3000]/u;
const HANDLE_MARK = /[\][!"#$%&'()*+,./:;<=>?@\\^`{|}~-]/u;
const HANDLE_RESERVED = /(admin|moderator|staff|support|official|ayahspring|system)/iu;

export const BOARD_OUTCOMES = [
  'not_signed_in',
  'closed',
  'not_allowed',
  'agree_first',
  'not_found',
  'no_handle',
  'blocked',
  'handle_shape',
  'handle_taken',
  'handle_reserved',
  'handle_fixed',
  'title_length',
  'body_length',
  'reason_length',
  'reason_required',
  'too_many',
  'own_post',
  'already_reported',
  'refused',
  'unconfirmed',
] as const;
export type BoardOutcome = (typeof BOARD_OUTCOMES)[number];

/** What is wrong with a username as typed, before the database is asked. */
export function handleFaultOf(handle: string): Extract<BoardOutcome, 'handle_shape' | 'handle_reserved'> | null {
  const length = characters(handle);
  if (length < HANDLE_MIN || length > HANDLE_MAX) return 'handle_shape';
  if (HANDLE_SPACE.test(handle) || HANDLE_MARK.test(handle)) return 'handle_shape';
  if (HANDLE_RESERVED.test(handle)) return 'handle_reserved';
  return null;
}

export function threadFaultOf(title: string, body: string): Extract<BoardOutcome, 'title_length' | 'body_length'> | null {
  const length = characters(title.trim());
  if (length < TITLE_MIN || length > TITLE_MAX) return 'title_length';
  return bodyFaultOf(body);
}

export function bodyFaultOf(body: string): 'body_length' | null {
  const length = characters(body.trim());
  return length < 1 || length > BODY_MAX ? 'body_length' : null;
}

export function reasonFaultOf(reason: string): 'reason_length' | null {
  const length = characters(reason.trim());
  return length < REASON_MIN || length > REASON_MAX ? 'reason_length' : null;
}

// ---------------------------------------------------------------------------
// What a refusal is called
// ---------------------------------------------------------------------------
/**
 * Each name has one status, and a name that arrives with another is not
 * believed (`boardOutcomeOf`).
 */
export function boardStatusOf(reason: BoardOutcome): number {
  switch (reason) {
    case 'not_signed_in': return 401;
    case 'closed':
    case 'not_allowed':
    case 'agree_first':
    case 'blocked': return 403;
    case 'not_found': return 404;
    case 'handle_shape':
    case 'handle_reserved':
    case 'title_length':
    case 'body_length':
    case 'reason_length':
    case 'reason_required': return 400;
    case 'no_handle':
    case 'handle_taken':
    case 'handle_fixed':
    case 'own_post':
    case 'already_reported': return 409;
    case 'too_many': return 429;
    case 'refused': return 500;
    case 'unconfirmed': return 502;
  }
}

type DatabaseError = { code?: string | null; message?: string | null };

/**
 * The name of what the database refused. Its functions raise `board:<name>`
 * and nothing else on purpose; anything that is not one of those is
 * `refused`, and a reply with no SQLSTATE (the request never arrived, or the
 * connection dropped) is `unconfirmed`: it may have been done.
 */
export function boardReasonOf(error: DatabaseError): BoardOutcome {
  const state = error.code ?? '';
  if (!/^[0-9A-Z]{5}$/u.test(state) || state.startsWith('08')) return 'unconfirmed';
  const said = /^board:([a-z_]+)$/u.exec((error.message ?? '').trim())?.[1];
  if (said && said !== 'refused' && said !== 'unconfirmed' && (BOARD_OUTCOMES as readonly string[]).includes(said)) {
    return said as BoardOutcome;
  }
  return 'refused';
}

/** What a form believes of a reply: a known name, with that name's own status. */
export function boardOutcomeOf(status: number, reason: unknown): BoardOutcome {
  const known = typeof reason === 'string' && (BOARD_OUTCOMES as readonly string[]).includes(reason);
  if (!known || boardStatusOf(reason as BoardOutcome) !== status) return 'unconfirmed';
  return reason as BoardOutcome;
}

/** For a caller with no words of its own, and for the staff desk, which is in English. */
export const BOARD_ENGLISH: Record<BoardOutcome, string> = {
  not_signed_in: 'Sign in first.',
  closed: 'This discussion is not open.',
  not_allowed: 'This discussion is not open to this account.',
  agree_first: 'Agree to the terms of use and the privacy notice before writing here.',
  not_found: 'That post is no longer here.',
  no_handle: 'Choose a username before you write.',
  blocked: 'Staff have stopped this username from writing. It can still read.',
  handle_shape: 'A username is 3 to 24 letters or digits, with no spaces and no marks other than the underscore.',
  handle_taken: 'Somebody already has that username.',
  handle_reserved: 'That username could be taken for staff.',
  handle_fixed: 'A username cannot be changed after something has been written under it.',
  title_length: 'A title is 4 to 140 characters.',
  body_length: 'Write something, and no more than 6000 characters.',
  reason_length: 'Say what is wrong with the post, in 4 to 1000 characters.',
  reason_required: 'Write a reason. It is kept in the audit log.',
  too_many: 'That is more than one account may write in a day.',
  own_post: 'That is your own post.',
  already_reported: 'You have already reported this post.',
  refused: 'That could not be done. Nothing was changed.',
  unconfirmed: 'It could not be confirmed that this was done.',
};

// ---------------------------------------------------------------------------
// What the database answers
// ---------------------------------------------------------------------------
export type Standing = {
  board: Board;
  /** Whether the board's switch is on. */
  open: boolean;
  /** What this account is on the board now; null when it is not let in. */
  kind: AuthorKind | null;
  /** When a student's access ends, if it has an end. */
  until: string | null;
  handle: string | null;
  /** Something has been written under the username, so it stays. */
  handleFixed: boolean;
  blocked: boolean;
  moderator: boolean;
  /**
   * The documents this account has still to agree to before it may choose a
   * username or write (`20261281157000`). Empty when there is nothing to ask.
   */
  agreements: BoardAgreement[];
};

/** One document to agree to: which, what the owner called it, and the version in force. */
export type BoardAgreement = { slug: string; title: string; version: number };

const POLICY_SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/u;

/**
 * What is still to be agreed to, read from `my_board()`.
 *
 * A reply with no list at all is a database from before the boards asked:
 * it refuses nothing either, so there is nothing to draw. A list that is
 * there and cannot be read is not guessed at: null, and the page says it
 * could not read the board.
 */
function agreementsOf(raw: unknown): BoardAgreement[] | null {
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) return null;
  const owed: BoardAgreement[] = [];
  for (const item of raw) {
    const one = record(item);
    const slug = text(one?.slug);
    const title = text(one?.title);
    const version = one?.versionNumber;
    if (!slug || slug.length > 60 || !POLICY_SLUG.test(slug) || !title) return null;
    if (typeof version !== 'number' || !Number.isInteger(version) || version < 1 || version > 1_000_000) return null;
    owed.push({ slug, title, version });
  }
  return owed;
}

export function parseStanding(raw: unknown): Standing | null {
  const row = record(raw);
  const board = boardOf(row?.board);
  if (!row || !board || typeof row.open !== 'boolean') return null;
  if (row.kind !== null && kindOf(row.kind) === null) return null;
  const agreements = agreementsOf(row.agreements);
  if (!agreements) return null;
  return {
    board,
    open: row.open,
    kind: kindOf(row.kind),
    until: moment(row.until),
    handle: text(row.handle),
    handleFixed: row.handleFixed === true,
    blocked: row.blocked === true,
    moderator: row.moderator === true,
    agreements,
  };
}

/** Whether this account may read and write on the board: let in, and the board open (staff read a closed one). */
export function mayEnter(standing: Standing): boolean {
  return standing.kind !== null && (standing.open || standing.kind === 'staff');
}

export type ThreadRow = {
  id: string;
  title: string;
  handle: string;
  kind: AuthorKind;
  createdAt: string;
  lastActivityAt: string;
  replies: number;
  mine: boolean;
};

export type ThreadPage = { threads: ThreadRow[]; more: boolean };

export function parseThreadPage(raw: unknown): ThreadPage | null {
  const row = record(raw);
  if (!row || !Array.isArray(row.threads) || typeof row.more !== 'boolean') return null;
  const threads: ThreadRow[] = [];
  for (const item of row.threads) {
    const one = record(item);
    const kind = kindOf(one?.kind);
    const title = text(one?.title);
    const handle = text(one?.handle);
    const createdAt = moment(one?.createdAt);
    const lastActivityAt = moment(one?.lastActivityAt);
    // A row that cannot be read is not drawn as a blank one: the page says it could not read the board.
    if (!one || !isId(one.id) || !kind || !title || !handle || !createdAt || !lastActivityAt) return null;
    const replies = typeof one.replies === 'number' && Number.isInteger(one.replies) && one.replies >= 0 ? one.replies : 0;
    threads.push({ id: one.id, title, handle, kind, createdAt, lastActivityAt, replies, mine: one.mine === true });
  }
  return { threads, more: row.more };
}

export const POST_STATES = ['visible', 'withdrawn', 'removed'] as const;
export type PostState = (typeof POST_STATES)[number];
const stateOf = (value: unknown): PostState | null =>
  typeof value === 'string' && (POST_STATES as readonly string[]).includes(value) ? (value as PostState) : null;

export type Reply = {
  id: string;
  state: PostState;
  createdAt: string;
  mine: boolean;
  /** Absent when the reply is gone and this reader is neither its author nor staff. */
  handle: string | null;
  kind: AuthorKind | null;
  body: string | null;
};

export type Thread = {
  id: string;
  board: Board;
  state: PostState;
  title: string;
  body: string;
  handle: string;
  kind: AuthorKind;
  createdAt: string;
  mine: boolean;
  replies: Reply[];
};

export function parseThread(raw: unknown): Thread | null {
  const outer = record(raw);
  const row = record(outer?.thread);
  if (!outer || !row || !Array.isArray(outer.replies)) return null;
  const board = boardOf(row.board);
  const state = stateOf(row.state);
  const kind = kindOf(row.kind);
  const title = text(row.title);
  const body = text(row.body);
  const handle = text(row.handle);
  const createdAt = moment(row.createdAt);
  if (!isId(row.id) || !board || !state || !kind || !title || !body || !handle || !createdAt) return null;

  const replies: Reply[] = [];
  for (const item of outer.replies) {
    const one = record(item);
    const replyState = stateOf(one?.state);
    const at = moment(one?.createdAt);
    if (!one || !isId(one.id) || !replyState || !at) return null;
    const replyBody = text(one.body);
    const replyHandle = text(one.handle);
    const replyKind = kindOf(one.kind);
    // A reply that is shown has to say something and be somebody's.
    if (replyState === 'visible' && (!replyBody || !replyHandle || !replyKind)) return null;
    replies.push({
      id: one.id,
      state: replyState,
      createdAt: at,
      mine: one.mine === true,
      handle: replyHandle,
      kind: replyKind,
      body: replyBody,
    });
  }
  return { id: row.id, board, state, title, body, handle, kind, createdAt, mine: row.mine === true, replies };
}

// ---------------------------------------------------------------------------
// The staff desk
// ---------------------------------------------------------------------------
export type ReportedPost = {
  threadId: string;
  replyId: string | null;
  board: Board;
  title: string;
  body: string;
  handleId: string;
  handle: string;
  kind: AuthorKind;
  blocked: boolean;
  postedAt: string;
  reports: number;
  firstReportedAt: string;
  reasons: string[];
};

export type ReportQueue = { students: boolean; teachers: boolean; reports: ReportedPost[] };

export function parseReportQueue(raw: unknown): ReportQueue | null {
  const row = record(raw);
  if (!row || typeof row.students !== 'boolean' || typeof row.teachers !== 'boolean' || !Array.isArray(row.reports)) {
    return null;
  }
  const reports: ReportedPost[] = [];
  for (const item of row.reports) {
    const one = record(item);
    const board = boardOf(one?.board);
    const kind = kindOf(one?.kind);
    const title = text(one?.title);
    const body = text(one?.body);
    const handle = text(one?.handle);
    const postedAt = moment(one?.postedAt);
    const firstReportedAt = moment(one?.firstReportedAt);
    if (!one || !isId(one.threadId) || !isId(one.handleId) || !board || !kind || !title || !body || !handle || !postedAt || !firstReportedAt) {
      return null;
    }
    if (one.replyId !== null && !isId(one.replyId)) return null;
    reports.push({
      threadId: one.threadId,
      replyId: (one.replyId as string | null) ?? null,
      board,
      title,
      body,
      handleId: one.handleId,
      handle,
      kind,
      blocked: one.blocked === true,
      postedAt,
      reports: typeof one.reports === 'number' ? one.reports : 1,
      firstReportedAt,
      reasons: Array.isArray(one.reasons) ? one.reasons.filter((r): r is string => typeof r === 'string') : [],
    });
  }
  return { students: row.students, teachers: row.teachers, reports };
}

/** The account behind a post. Read by the staff desk only, after the database has written the look down. */
export type PostAuthor = { handle: string; userId: string | null; name: string | null };

export function parseAuthor(raw: unknown): PostAuthor | null {
  const row = record(raw);
  const handle = text(row?.handle);
  if (!row || !handle) return null;
  if (row.userId !== null && !isId(row.userId)) return null;
  return { handle, userId: (row.userId as string | null) ?? null, name: text(row.name) };
}
