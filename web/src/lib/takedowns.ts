/**
 * Takedown notices, read.
 *
 * The mechanism is one clause in `can_read_version()`: a held version disappears
 * from the catalogue, from enrolment, from the player and from offline keys at the
 * same moment, and comes back the same way when the notice is rejected. That means
 * the console does not need to know how distribution works — it needs to say three
 * things clearly:
 *
 * 1. **a hold is not a deletion.** The material is withheld and kept, because the
 *    evidence a decision rests on cannot be deleted before the decision;
 * 2. **a hold is not a refund.** Nothing here touches money, and a screen that
 *    implied otherwise would create an expectation nobody can meet;
 * 3. **a hold is not a decision.** Uphold, reject and withdrawal all end the same
 *    way on this screen — as a written reason somebody else can read.
 *
 * Pure, so the sentences are testable without a browser or a database.
 */

export type TakedownStatus = 'held' | 'upheld' | 'rejected' | 'withdrawn';
export type TakedownOutcome = 'upheld' | 'rejected' | 'withdrawn';

export type TakedownNotice = {
  id: string;
  reference: string;
  courseTitle: string;
  courseCode: string;
  versionNumber: number;
  teacher: string | null;
  status: TakedownStatus;
  claimant: string;
  claimantRole: string;
  work: string;
  material: string;
  noticeText: string;
  receivedAt: string;
  reviewBy: string | null;
  overdueReview: boolean;
  daysHeld: number;
  answered: boolean;
  response: string | null;
  responseAt: string | null;
  outcome: TakedownOutcome | null;
  reason: string | null;
  openedByMe: boolean;
};

export type TakedownCandidate = {
  versionId: string;
  courseTitle: string;
  courseCode: string;
  versionNumber: number;
  teacher: string | null;
};

export type TakedownRegister = {
  notices: TakedownNotice[];
  candidates: TakedownCandidate[];
  counts: {
    held: number;
    upheld: number;
    released: number;
    unanswered: number;
    reviewOverdue: number;
  };
};

export type MyTakedown = {
  notices: {
    id: string;
    reference: string;
    courseTitle: string;
    versionNumber: number;
    status: TakedownStatus;
    claimant: string;
    claimantRole: string;
    work: string;
    material: string;
    noticeText: string;
    receivedAt: string;
    reviewBy: string | null;
    answered: boolean;
    response: string | null;
    outcome: TakedownOutcome | null;
    reason: string | null;
  }[];
  held: number;
};

export const TAKEDOWN_STATUS_LABEL: Record<TakedownStatus, string> = {
  held: 'Held',
  upheld: 'Upheld',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
};

export const TAKEDOWN_OUTCOME_LABEL: Record<TakedownOutcome, string> = {
  upheld: 'Uphold — the material stays out of distribution',
  rejected: 'Reject — the material returns to learners',
  withdrawn: 'The claimant withdrew — the material returns to learners',
};

export function takedownStatusLabel(status: string | null | undefined): string {
  return TAKEDOWN_STATUS_LABEL[status as TakedownStatus] ?? 'Held';
}

export function claimantRoleLabel(role: string | null | undefined): string {
  switch (role) {
    case 'agent':
      return 'an agent acting for the rights holder';
    case 'representative':
      return 'somebody reporting on the rights holder’s behalf';
    default:
      return 'the rights holder';
  }
}

export function moment(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function day(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** The line above the list, led by what is still held and what nobody answered. */
export function registerHeadline(register: TakedownRegister | null | undefined): string {
  if (!register) return 'The register could not be read.';
  const { held, unanswered, reviewOverdue, released, upheld } = register.counts;
  if (held === 0 && released === 0 && upheld === 0) {
    return 'No notice has ever been recorded.';
  }
  const parts: string[] = [];
  parts.push(held === 1 ? 'One version is held' : `${held} versions are held`);
  if (unanswered > 0) {
    parts.push(unanswered === 1
      ? 'and one notice has not been answered'
      : `and ${unanswered} notices have not been answered`);
  }
  const tail: string[] = [];
  if (reviewOverdue > 0) {
    tail.push(reviewOverdue === 1
      ? 'One review date has passed — nothing lifts a hold on a timer, so somebody has to look.'
      : `${reviewOverdue} review dates have passed — nothing lifts a hold on a timer, so somebody has to look.`);
  }
  if (upheld > 0) {
    tail.push(upheld === 1 ? 'One version was taken down for good.' : `${upheld} versions were taken down for good.`);
  }
  return [`${parts.join(' ')}.`, ...tail].join(' ');
}

/** What a learner loses while a hold is in place — said plainly, not buried. */
export const HOLD_EFFECT =
  'While a version is held, nobody can find it, enrol on it, play it or download it — including '
  + 'learners who already paid. The author, reviewers and staff still read it, because the person '
  + 'answering the claim has to see what is being claimed. Rejecting the notice reverses all of '
  + 'this in the same moment.';

/**
 * A hold is not a refund.
 *
 * The money question follows a takedown immediately — it is the first thing a
 * teacher asks and the first thing a learner asks — and answering it with silence
 * is what turns a content dispute into a billing dispute.
 */
export const NO_MONEY_MOVES =
  'A hold does not refund anybody and does not change what a teacher has earned. Nothing on this '
  + 'page touches an order. What a hold does to money already taken is a decision the owner has '
  + 'not made yet, and it is recorded as open in DECISIONS.md rather than guessed here.';

/** Why the decision buttons are the way they are. */
export function decisionProblem(notice: TakedownNotice, viewerOpenedIt: boolean): string | null {
  if (notice.status !== 'held') return 'This notice has already been decided.';
  if (viewerOpenedIt) return 'Somebody else decides a notice you took.';
  if (notice.reviewBy && new Date(notice.reviewBy).getTime() < Date.now()) {
    // Past the review date is a nudge, not a block: a hold that lifted itself on a
    // timer would put contested material back while everybody was asleep.
    return null;
  }
  return null;
}

/** "Held for 6 days, review date passed" — the line the staff member actually reads. */
export function holdingLine(notice: TakedownNotice): string {
  const held = `${notice.daysHeld} day${notice.daysHeld === 1 ? '' : 's'} held`;
  const review = day(notice.reviewBy);
  if (!review) return `${held}, with no review date set.`;
  return notice.overdueReview
    ? `${held}. The review date of ${review} has passed and nothing lifted it.`
    : `${held}. Review by ${review}.`;
}

/** The teacher's side: what they are being told, and what they may do about it. */
export function teacherSentence(notice: MyTakedown['notices'][number]): string {
  if (notice.status === 'held') {
    return notice.answered
      ? 'Your answer is on the record, and somebody reads it before the decision.'
      : 'Your version is held while this claim is looked at. You can answer it below, once.';
  }
  if (notice.status === 'upheld') {
    return 'The claim was upheld, and the version stays out of distribution.';
  }
  if (notice.status === 'withdrawn') {
    return 'The claimant withdrew, and your version is back in the catalogue.';
  }
  return 'The claim was rejected, and your version is back in the catalogue.';
}

/** What the teacher's page shows above everything else, when it shows anything. */
export function teacherHeadline(mine: MyTakedown | null | undefined): string | null {
  if (!mine || mine.notices.length === 0) return null;
  if (mine.held === 0) return 'A notice about one of your versions was decided.';
  return mine.held === 1
    ? 'One of your courses is held while a claim against it is looked at.'
    : `${mine.held} of your courses are held while claims against them are looked at.`;
}

const TAKEDOWN_ERROR: Record<string, string> = {
  'takedown:not_allowed': 'Only the owner or governance staff take a notice.',
  'takedown:not_signed_in': 'Sign in first.',
  'takedown:not_found': 'That notice does not exist.',
  'takedown:version_not_found': 'That version does not exist.',
  'takedown:not_published': 'That version is not published, so there is nothing to withhold.',
  'takedown:already_held': 'That version is already under a hold. Decide that one first.',
  'takedown:claimant_required': 'Say who is making the claim.',
  'takedown:email_invalid': 'That address does not look like an email address.',
  'takedown:work_required': 'Say what work is claimed — a title, an author, a registration number.',
  'takedown:material_required': 'Say where in the material it appears, so the teacher can look.',
  'takedown:notice_required': 'Paste the claim in the words it was sent, so an appeal reads the same words.',
  'takedown:role_invalid': 'Say whether the claimant is the rights holder, an agent, or a representative.',
  'takedown:review_in_the_past': 'The review date is when somebody will look at it, not when it lapsed.',
  'takedown:response_required': 'Say what the material is and why it may be used.',
  'takedown:already_answered': 'The first answer is kept as given. A further note goes through support.',
  'takedown:already_decided': 'That notice has already been decided.',
  'takedown:outcome_invalid': 'Choose uphold, reject or withdrawn.',
  'takedown:reason_required': 'Write the reason. The claimant and the teacher both read it.',
  'takedown:self_decision': 'Somebody else decides a notice you took.',
  'takedown:event_append_only': 'The history of a notice is not a document. Add another entry.',
};

export function describeTakedownError(message: string | null | undefined, hint?: string | null): string {
  const code = (message ?? '').trim();
  const known = TAKEDOWN_ERROR[code];
  if (known) return known;
  if (hint && hint.trim()) return hint.trim();
  if (!code) return 'That did not work, and the reason was not returned.';
  return code.startsWith('takedown:') ? code.slice('takedown:'.length).replace(/_/g, ' ') : code;
}

export const OUTCOMES: readonly TakedownOutcome[] = ['upheld', 'rejected', 'withdrawn'];

export const CLAIMANT_ROLES: readonly { value: string; label: string }[] = [
  { value: 'owner', label: 'The rights holder' },
  { value: 'agent', label: 'An agent acting for them' },
  { value: 'representative', label: 'Somebody reporting on their behalf' },
];
