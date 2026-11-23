/**
 * Applying to teach, as a screen sees it.
 *
 * The rule this file is written around: **submitting is not becoming.** Nothing
 * here can produce a teacher. It reads a status, and every status that is not
 * `approved` says, in words, that the person cannot teach yet.
 *
 * The applicant's reader and the staff queue are separate parsers on purpose.
 * The queue carries an address staff can reply to; the applicant's own reader
 * never does, and there is no field here that could accidentally join them.
 */

export type ApplicationStatus = 'submitted' | 'approved' | 'declined' | 'withdrawn' | string;

export type OwnApplication = {
  id: string;
  headline: string;
  qualifications: string;
  sampleUrl: string;
  note: string | null;
  status: ApplicationStatus;
  decisionReason: string | null;
  submittedAt: string | null;
  decidedAt: string | null;
};

export type OwnApplicationBoard = {
  open: boolean;
  isInstructor: boolean;
  application: OwnApplication | null;
};

export type QueuedApplication = {
  id: string;
  name: string | null;
  email: string | null;
  headline: string;
  qualifications: string;
  sampleUrl: string | null;
  note: string | null;
  submittedAt: string | null;
};

export type TeachingQueue = {
  open: boolean;
  waiting: QueuedApplication[];
  decided: {
    id: string;
    name: string | null;
    headline: string;
    status: ApplicationStatus;
    reason: string | null;
    decidedAt: string | null;
  }[];
  counts: { waiting: number; approved: number; declined: number };
};

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function whole(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
    return Math.trunc(Number(value));
  }
  return fallback;
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

/** What `my_teaching_application()` returns. */
export function parseOwnApplication(input: unknown): OwnApplicationBoard | null {
  const row = record(input);
  if (!row) return null;

  const application = record(row.application);

  return {
    open: row.open === true,
    isInstructor: row.isInstructor === true,
    application: application
      ? {
          id: typeof application.id === 'string' ? application.id : '',
          headline: text(application.headline) ?? '',
          qualifications: text(application.qualifications) ?? '',
          sampleUrl: text(application.sampleUrl) ?? '',
          note: text(application.note),
          status:
            typeof application.status === 'string' ? application.status : 'submitted',
          decisionReason: text(application.decisionReason),
          submittedAt: text(application.submittedAt),
          decidedAt: text(application.decidedAt),
        }
      : null,
  };
}

/** What `teaching_application_queue()` returns. Staff only. */
export function parseQueue(input: unknown): TeachingQueue | null {
  const row = record(input);
  if (!row) return null;

  const counts = record(row.counts) ?? {};
  const waiting: QueuedApplication[] = [];

  for (const entry of list(row.waiting)) {
    const item = record(entry);
    if (!item) continue;
    const id = typeof item.id === 'string' ? item.id : '';
    if (!id) continue;
    waiting.push({
      id,
      name: text(item.name),
      email: text(item.email),
      headline: text(item.headline) ?? '',
      qualifications: text(item.qualifications) ?? '',
      sampleUrl: text(item.sampleUrl),
      note: text(item.note),
      submittedAt: text(item.submittedAt),
    });
  }

  const decided: TeachingQueue['decided'] = [];
  for (const entry of list(row.decided)) {
    const item = record(entry);
    if (!item) continue;
    decided.push({
      id: typeof item.id === 'string' ? item.id : '',
      name: text(item.name),
      headline: text(item.headline) ?? '',
      status: typeof item.status === 'string' ? item.status : 'approved',
      reason: text(item.reason),
      decidedAt: text(item.decidedAt),
    });
  }

  return {
    open: row.open === true,
    waiting,
    decided,
    counts: {
      waiting: whole(counts.waiting),
      approved: whole(counts.approved),
      declined: whole(counts.declined),
    },
  };
}

/**
 * Whether this person can start teaching. Only an approved application, or a
 * role somebody already held, gets a yes — and the screen says so rather than
 * showing a course form that the database would refuse.
 */
export function canTeach(board: OwnApplicationBoard | null): boolean {
  return board?.isInstructor === true;
}

/**
 * What a refusal from the database means, in an English sentence.
 *
 * For the staff desk's `decide`. Sending and taking back, which the
 * applicant's page calls in the reader's language, are answered by name from
 * `teaching-outcome.ts`.
 */
export function teachingRefusal(message: string): { code: string; message: string } {
  const key = /teaching:([a-z_]+)/i.exec(message)?.[1]?.toLowerCase();
  const sentences: Record<string, string> = {
    applications_closed:
      'Applications to teach are closed at the moment. Nothing was sent — if you would like ' +
      'to teach here, ask the owner directly.',
    not_signed_in: 'Sign in first — an application belongs to an account.',
    already_teaching: 'You already teach here. There is nothing to apply for.',
    already_applied: 'You already have an application with the owner. Wait for the answer.',
    nothing_to_withdraw: 'There is no open application to take back.',
    not_allowed: 'Only platform staff can decide an application.',
    not_found: 'That application could not be found.',
    already_decided: 'That application has already been decided.',
    reason_required: 'Write a reason. The applicant reads it, so it has to say something.',
    role_missing: 'The teaching role is missing from this deployment, which is a fault — tell the owner.',
    learner_required: 'That did not work, and nothing was sent.',
  };
  if (key && sentences[key]) return { code: key, message: sentences[key]! };
  return { code: 'unknown', message: 'That did not send, and nothing was created.' };
}

/** A link is only shown if it is one. Anything else is text, not a button. */
export function safeSampleUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    return url.toString();
  } catch {
    return null;
  }
}
