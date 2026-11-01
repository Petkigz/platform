/**
 * The retention clocks, read.
 *
 * The privacy notice makes two promises with dates in them: a support case is
 * kept three years after it closes, and a screening record seven years after the
 * later of the check and the person's eighteenth birthday. Until
 * `20261281004700_retention_clock.sql` nothing implemented either, which meant
 * the notice was promising a deletion nobody would ever perform.
 *
 * This module is the reading half: it turns what the database says is due into
 * sentences somebody can act on, and it says the awkward part — a case nobody
 * closed has no clock at all — out loud rather than reporting a reassuring zero.
 *
 * Two rules the copy follows:
 *
 * 1. **A zero is only reassuring if it covers everything.** `0 due` next to
 *    "seven cases have never been closed" is the kind of screen that gets
 *    believed and is wrong. The sentence names both.
 * 2. **Nothing here deletes anything.** The plan is read-only; the run is a
 *    separate press, and its sentence repeats what the database said it removed
 *    rather than what the screen expected.
 *
 * Pure, so every sentence is testable without a browser or a database.
 */

export type RetentionPolicy = {
  years: number;
  clock: string;
  source: string;
};

export type RetentionWaiting = {
  count: number;
  oldestCreatedAt: string | null;
  note: string;
};

export type RetentionPlan = {
  asOf: string;
  policies: {
    supportCase: RetentionPolicy;
    screening: RetentionPolicy;
  };
  supportCases: {
    due: number;
    oldestDue: string | null;
    nextDue: string | null;
    waiting: RetentionWaiting;
  };
  screenings: {
    due: number;
    oldestDue: string | null;
    nextDue: string | null;
  };
};

export type RetentionRun = {
  asOf: string;
  deleted: {
    supportCases: number;
    supportCaseMessages: number;
    screenings: number;
  };
  remaining: {
    supportCases: number;
    screenings: number;
  };
  audited: boolean;
};

/** An empty plan, for the case where the function answered with nothing. */
export const EMPTY_PLAN: RetentionPlan = {
  asOf: '',
  policies: {
    supportCase: { years: 3, clock: 'three years after the case closed', source: '' },
    screening: {
      years: 7,
      clock: "seven years after the later of the check and the subject's eighteenth birthday",
      source: '',
    },
  },
  supportCases: {
    due: 0,
    oldestDue: null,
    nextDue: null,
    waiting: { count: 0, oldestCreatedAt: null, note: '' },
  },
  screenings: { due: 0, oldestDue: null, nextDue: null },
};

/** A day as a reader reads it; `null` when there is no day to read. */
export function retentionDay(iso: string | null | undefined): string | null {
  if (!iso) return null;
  // `due_on` arrives as `YYYY-MM-DD` and parses as UTC midnight; printing it
  // through a local formatter would move it a day back west of Greenwich.
  const dayOnly = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T12:00:00Z` : iso;
  const date = new Date(dayOnly);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** How many records the clocks say are due right now. */
export function dueTotal(plan: RetentionPlan): number {
  return plan.supportCases.due + plan.screenings.due;
}

/**
 * The headline: what has to be deleted, and what the number does not cover.
 *
 * The second half is the part that matters. A job that reports "nothing to do"
 * while cases sit unclosed for four years is technically right and practically
 * misleading, and this is the one screen where that distinction is the work.
 */
export function retentionHeadline(plan: RetentionPlan): string {
  const total = dueTotal(plan);
  const waiting = plan.supportCases.waiting.count;

  const due = total === 0
    ? 'Nothing is past its retention date today.'
    : `${total} record${total === 1 ? ' is' : 's are'} past the date the policy gives `
      + `${total === 1 ? 'it' : 'them'} and can be deleted.`;

  if (waiting === 0) return due;

  return `${due} ${waiting} support case${waiting === 1 ? ' has' : 's have'} never been closed, `
    + 'so the three years have not started for '
    + `${waiting === 1 ? 'it' : 'them'} — closing a case is what starts its clock.`;
}

/** What the two clocks are, in one sentence each, with the promise they come from. */
export function retentionPolicyLines(plan: RetentionPlan): string[] {
  const { supportCase, screening } = plan.policies;
  return [
    `A support case: ${supportCase.years} years, ${supportCase.clock}.`,
    `A screening record: ${screening.years} years, ${screening.clock}.`,
  ];
}

/** What is due next, so an empty screen still answers "when is the next one?". */
export function nextDueSentence(plan: RetentionPlan): string {
  const dates = [plan.supportCases.nextDue, plan.screenings.nextDue]
    .filter((d): d is string => Boolean(d))
    .sort();
  if (dates.length === 0) {
    return 'No record on the platform has a retention date yet: nothing has been closed or checked.';
  }
  const next = retentionDay(dates[0]);
  return `The next record falls due on ${next}.`;
}

/** What a run did, in the database's own numbers. */
export function describeRetentionRun(run: RetentionRun): string {
  const { supportCases, supportCaseMessages, screenings } = run.deleted;
  const total = supportCases + screenings;
  if (total === 0) {
    return 'Nothing was due, so nothing was deleted and no audit entry was written.';
  }
  const parts: string[] = [];
  if (supportCases > 0) {
    parts.push(`${supportCases} support case${supportCases === 1 ? '' : 's'}`);
  }
  if (supportCaseMessages > 0) {
    parts.push(`${supportCaseMessages} repl${supportCaseMessages === 1 ? 'y' : 'ies'} inside them`);
  }
  if (screenings > 0) {
    parts.push(`${screenings} screening record${screenings === 1 ? '' : 's'}`);
  }
  const left = run.remaining.supportCases + run.remaining.screenings;
  const tail = left > 0
    ? ` ${left} more ${left === 1 ? 'is' : 'are'} due and will go on the next run — each run takes a bounded batch so a backlog cannot hold a lock.`
    : ' Nothing else is due.';
  return `Deleted ${parts.join(', ')}.${tail} Recorded in the audit log against your name.`;
}

/**
 * The one refusal worth explaining before the press.
 *
 * Retention deletes records that are evidence — that a check happened, that a
 * conversation took place. Nobody outside the owner runs it, and the screen says
 * so rather than hiding the button, because a missing button reads as a bug.
 */
export function retentionGateSentence(canRun: boolean): string {
  return canRun
    ? 'Running the cleanup deletes what the policy says is due, permanently. The date on each record was set when it was closed or recorded, not here.'
    : 'Only the platform admin runs the cleanup. You can read what is due, and the deletion waits for the owner.';
}
