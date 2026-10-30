/**
 * The screening register, read.
 *
 * "Screening" here is one careful sentence long: *somebody recorded that a check on
 * this adult happened, what kind, when, and when it lapses.* It is not a background
 * check, not a verdict, and not a gate. The platform does not know what a check is
 * in the country a teacher lives in, and guessing would produce a badge that means
 * nothing — so the type is free text a staff member writes, and the expiry is their
 * number.
 *
 * Two consequences that the screens have to carry, not bury:
 *
 * 1. **Nothing is blocked by a missing record.** A child-facing course can publish
 *    today with no check on file, because that rule is the owner's and it is not
 *    set. The console says so above the list.
 * 2. **The evidence is write-only.** A reference records where the document is held;
 *    no screen reads it back, and neither does this module.
 *
 * Pure, so the sentences are testable without a browser or a database.
 */

export type ScreeningStatus = 'none' | 'checked' | 'expired' | 'failed';

export type ScreeningRow = {
  userId: string;
  name: string;
  status: ScreeningStatus;
  type: string | null;
  checkedAt: string | null;
  validUntil: string | null;
  checkedByName: string | null;
};

export type ScreeningRegister = {
  teachers: ScreeningRow[];
  counts: {
    teachers: number;
    none: number;
    checked: number;
    expired: number;
    failed: number;
  };
};

export type MyScreening = {
  recorded: boolean;
  outcome?: 'passed' | 'failed';
  type?: string | null;
  checkedAt?: string | null;
  validUntil?: string | null;
  expired?: boolean;
  /** Whether the live safeguarding and conduct policy has been read and agreed to. */
  conductAcknowledged?: boolean;
  /** Whether this teacher may publish a course a child may be shown today. */
  mayTeachChildren?: boolean;
  gateReason?: 'ok' | 'no_screening' | 'screening_expired' | 'conduct_not_acknowledged' | 'not_signed_in' | null;
  /** Who a concern goes to. An office and a monitored address, not a person's name. */
  lead?: string | null;
  /** Whether the platform is asking at all — the flag, not the answer. */
  required?: boolean;
};

export const SCREENING_STATUS_LABEL: Record<ScreeningStatus, string> = {
  none: 'No check on file',
  checked: 'Checked',
  expired: 'Lapsed',
  failed: 'Did not pass',
};

export function screeningStatusLabel(status: string | null | undefined): string {
  return SCREENING_STATUS_LABEL[status as ScreeningStatus] ?? 'No check on file';
}

/** A date as a reader reads it; `null` when there is no date to read. */
function day(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * One row, in a sentence.
 *
 * The failed case is spelled out rather than softened: "did not pass" with a date
 * is information somebody needs, and a row that merely looked empty would be a
 * misleading absence.
 */
export function screeningLine(row: ScreeningRow): string {
  const when = day(row.checkedAt);
  const until = day(row.validUntil);
  switch (row.status) {
    case 'checked':
      if (!when) return row.type ? `${row.type}, on file.` : 'A check is on file.';
      return until
        ? `${row.type ?? 'A check'} recorded ${when}, valid until ${until}.`
        : `${row.type ?? 'A check'} recorded ${when}, with no expiry stated.`;
    case 'expired':
      return until
        ? `${row.type ?? 'A check'} lapsed on ${until}.`
        : 'A check has lapsed.';
    case 'failed':
      return when
        ? `${row.type ?? 'A check'} recorded ${when} did not pass.`
        : 'A check did not pass.';
    default:
      return 'Nothing recorded. That is not a failure — it is an empty column.';
  }
}

/** Who has been checked, said as counts rather than as a wall of rows. */
export function screeningCountsSentence(counts: ScreeningRegister['counts']): string {
  const teachers = `${counts.teachers} teacher${counts.teachers === 1 ? '' : 's'}`;
  if (counts.teachers === 0) return 'Nobody holds the teacher role yet, so there is nothing to check.';
  const parts: string[] = [`${counts.checked} checked`];
  if (counts.expired > 0) parts.push(`${counts.expired} lapsed`);
  if (counts.failed > 0) parts.push(`${counts.failed} did not pass`);
  if (counts.none > 0) parts.push(`${counts.none} with nothing on file`);
  return `${teachers}: ${parts.join(', ')}.`;
}

/**
 * The line above the register — the honest one.
 *
 * It says out loud that a missing record blocks nothing today, because a console
 * that shows a column of "no check on file" invites the reader to assume it does.
 */
export const SCREENING_NOTHING_BLOCKED =
  'Nothing here is enforced yet: a course facing children can still publish with no check on '
  + 'file. Turning that into a rule needs a standard the owner has not set — what a check is, '
  + 'who performs it, and how long it lasts.';

/** What the teacher is told about their own record. */
export function myScreeningSentence(mine: MyScreening | null | undefined): string {
  if (!mine || !mine.recorded) {
    // The old sentence said the standard was still being decided. It is not: the
    // owner settled it on 2026-10-30, so the honest version now explains what is
    // missing rather than apologising for a gap that has closed.
    return 'No check is on file for you yet. Whoever appoints teachers records one — the '
      + 'kind of check, the date and whether it lapses — and until then a course you '
      + 'write for children cannot be published.';
  }
  const when = day(mine.checkedAt);
  const until = day(mine.validUntil);
  if (mine.outcome === 'failed') {
    return when
      ? `A ${mine.type ?? 'check'} recorded on ${when} did not pass. Whoever recorded it can tell you what happens next.`
      : 'A check recorded against your account did not pass. Whoever recorded it can tell you what happens next.';
  }
  if (mine.expired) {
    // It now stops something, and saying so is the point of the sentence.
    return until
      ? `Your last check lapsed on ${until}. A course written for children cannot be published until a current check is recorded.`
      : 'Your last check has lapsed. A course written for children cannot be published until a current check is recorded.';
  }
  if (until) return `A ${mine.type ?? 'check'} was recorded${when ? ` on ${when}` : ''} and holds until ${until}.`;
  return `A ${mine.type ?? 'check'} was recorded${when ? ` on ${when}` : ''}, with no expiry stated.`;
}

const SCREENING_ERROR: Record<string, string> = {
  'screening:not_allowed': 'Only the owner or governance staff record a check.',
  'screening:not_signed_in': 'Sign in first.',
  'screening:type_required': 'Say what kind of check it was, in a few words.',
  'screening:reference_required': 'Say where the document is held. It is recorded and never shown again.',
  'screening:outcome_invalid': 'Say whether the check passed or failed.',
  'screening:validity_in_the_past': 'An expiry in the past certifies nothing. Use a date still to come, or leave it blank.',
  'screening:user_not_found': 'That account does not exist.',
  'screening:not_a_teacher': 'Only an appointed teacher is screened. A learner is never screened.',
};

/**
 * A refusal, in a sentence — never a raw code and never a cheerful "something went
 * wrong".
 */
export function describeScreeningError(message: string | null | undefined, hint?: string | null): string {
  const code = (message ?? '').trim();
  const known = SCREENING_ERROR[code];
  if (known) return known;
  if (hint && hint.trim()) return hint.trim();
  if (!code) return 'That did not work, and the reason was not returned.';
  return code.startsWith('screening:') ? code.slice('screening:'.length).replace(/_/g, ' ') : code;
}

/** What the console offers in the outcome picker. Two values, both of them real. */
export const SCREENING_OUTCOMES: readonly { value: 'passed' | 'failed'; label: string }[] = [
  { value: 'passed', label: 'Passed' },
  { value: 'failed', label: 'Did not pass' },
];

/**
 * Why a publish is refused, in a sentence.
 *
 * The database refuses with a code (`safeguarding:author_not_cleared`) and the
 * reason in the hint. A teacher should never see either: they should see which of
 * the two things is missing and where to fix it.
 */
export function gateSentence(
  reason: string | null | undefined,
  lead?: string | null,
): string {
  switch (reason) {
    case 'no_screening':
      return 'No check is on file for you, so a course written for children cannot be published yet.';
    case 'screening_expired':
      return 'Your last check has lapsed, so a course written for children cannot be published until a current one is recorded.';
    case 'conduct_not_acknowledged':
      return 'You have not yet read and agreed to the safeguarding and conduct policy. Agreeing to it is one press, below.';
    case 'not_signed_in':
      return 'Sign in first.';
    case 'ok':
      return lead
        ? `You are clear to publish a course for children. A concern about a child goes to ${lead}.`
        : 'You are clear to publish a course for children.';
    default:
      return 'That could not be saved, and the reason was not returned.';
  }
}
