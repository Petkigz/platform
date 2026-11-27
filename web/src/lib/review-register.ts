import type { MessageKey } from './i18n/messages/en.ts';
import {
  BIO_MAX,
  CONFLICT_DESCRIPTION_MAX,
  CONFLICT_TYPES,
  INSTITUTION_MAX,
  QUALIFICATION_TITLE_MAX,
  QUALIFICATION_TYPES,
  type AssignmentStatus,
  type ConflictStatus,
  type ConflictType,
  type Decision,
  type QualificationStatus,
  type QualificationType,
  type ReviewScope,
  type ReviewerStatus,
} from './review.ts';

/**
 * The review queue and a reviewer's own place on the register, said in the
 * reader's language (2026-11-27).
 *
 * `review.ts` keeps its English tables and sentences: the staff screens under
 * `/admin` print them. This file is what `/review` uses instead: the
 * catalogue key for each state the database can send, a name for each
 * refusal, and the same checks as `validate…Input()` answering with a name
 * rather than an English sentence. Nothing here asks the database anything.
 */

export const ASSIGNMENT_STATUS_KEY = {
  offered: 'review.stOffered',
  accepted: 'review.stAccepted',
  declined: 'review.stDeclined',
  in_progress: 'review.stInProgress',
  completed: 'review.stCompleted',
  cancelled: 'review.stCancelled',
} as const satisfies Record<AssignmentStatus, MessageKey>;

export const SCOPE_KEY = {
  technical: 'review.scopeTechnical',
  scholarly: 'review.scopeScholarly',
} as const satisfies Record<ReviewScope, MessageKey>;

/** A decision already made, so "Approved", where the button that makes it says "Approve". */
export const DECISION_MADE_KEY = {
  approved: 'review.decApproved',
  revision_requested: 'review.decRevision',
  rejected: 'review.decRejected',
} as const satisfies Record<Decision, MessageKey>;

export const REVIEWER_STATUS_KEY = {
  applicant: 'review.rsApplicant',
  pending_verification: 'review.waitingCheck',
  active: 'review.rsActive',
  suspended: 'review.rsSuspended',
  inactive: 'review.rsInactive',
} as const satisfies Record<ReviewerStatus, MessageKey>;

export const QUALIFICATION_TYPE_KEY = {
  certificate: 'review.qtCertificate',
  degree: 'review.qtDegree',
  ijazah: 'review.qtIjazah',
  experience: 'review.qtExperience',
  institutional_affiliation: 'review.qtAffiliation',
} as const satisfies Record<QualificationType, MessageKey>;

export const QUALIFICATION_STATUS_KEY = {
  pending: 'review.waitingCheck',
  verified: 'review.checked',
  rejected: 'review.qsRejected',
  expired: 'review.qsExpired',
} as const satisfies Record<QualificationStatus, MessageKey>;

export const CONFLICT_TYPE_KEY = {
  authorship: 'review.ctAuthorship',
  financial: 'review.ctFinancial',
  family: 'review.ctFamily',
  teacher_student: 'review.ctTeacher',
  institutional: 'review.ctInstitution',
  personal: 'review.ctPersonal',
  other: 'review.ctOther',
} as const satisfies Record<ConflictType, MessageKey>;

export const CONFLICT_STATUS_KEY = {
  declared: 'review.csDeclared',
  under_assessment: 'review.csAssessing',
  accepted: 'review.csAccepted',
  disqualifying: 'review.csBars',
  resolved: 'review.csResolved',
} as const satisfies Record<ConflictStatus, MessageKey>;

/**
 * Why something was not recorded, by name.
 *
 * `unsure` is not a refusal: an answer with no state (a gateway's page, a
 * connection that went) leaves nobody able to say whether the application,
 * the qualification or the declaration was written. A declaration bars an
 * assignment the moment it exists, so "nothing was recorded" must not be
 * said by guess.
 */
export const REGISTER_REFUSALS = [
  'signedOut', 'long', 'closed', 'notRegistered', 'notYours', 'kind', 'title',
  'subject', 'subjectGone', 'describe', 'refused', 'unsure',
] as const;
export type RegisterRefusal = (typeof REGISTER_REFUSALS)[number];

export const REGISTER_REFUSAL_KEY = {
  signedOut: 'review.eSignedOut',
  long: 'review.eLong',
  closed: 'review.eClosed',
  notRegistered: 'review.eNotRegistered',
  notYours: 'review.eNotYours',
  kind: 'review.eKind',
  title: 'review.eTitle',
  subject: 'review.eSubject',
  subjectGone: 'review.eSubjectGone',
  describe: 'review.eDescribe',
  refused: 'review.eRefused',
  unsure: 'review.eUnsure',
} as const satisfies Record<RegisterRefusal, MessageKey>;

export function isRegisterRefusal(value: unknown): value is RegisterRefusal {
  return typeof value === 'string' && (REGISTER_REFUSALS as readonly string[]).includes(value);
}

/** The lengths a "too long" refusal can name; the page writes each in the reader's digits. */
export const REGISTER_LIMITS = [QUALIFICATION_TITLE_MAX, BIO_MAX] as const;

export type RegisterFailure = { ok: false; code: RegisterRefusal; max?: number };
export type RegisterCheck<T> = { ok: true; value: T } | RegisterFailure;

/** What the database said, as a name. The sentences are those of the register's migrations. */
export function registerRefusalOf(error: { message?: string | null; state?: string | null; code?: string | null } | null | undefined): RegisterFailure {
  const state = String(error?.state ?? '');
  // No state, or a connection that failed: not an answer from the database at all.
  if (state === '' || state.startsWith('08')) return { ok: false, code: 'unsure' };
  const text = String(error?.message ?? '');
  const long = /must be (\d+) characters or fewer/u.exec(text);
  if (long) return { ok: false, code: 'long', max: Number(long[1]) };
  if (/^sign in to /u.test(text)) return { ok: false, code: 'signedOut' };
  if (text.includes('registration was closed')) return { ok: false, code: 'closed' };
  if (text.includes('not registered as a reviewer')) return { ok: false, code: 'notRegistered' };
  if (/may only record qualifications for your own|^no reviewer profile |policy|permission denied/u.test(text)) return { ok: false, code: 'notYours' };
  if (/^a qualification is a certificate|^a conflict is authorship/u.test(text)) return { ok: false, code: 'kind' };
  if (text.includes('a qualification needs a title')) return { ok: false, code: 'title' };
  if (text.includes('has to name the subject')) return { ok: false, code: 'subject' };
  if (/^no subject area /u.test(text)) return { ok: false, code: 'subjectGone' };
  if (/^describe the conflict/u.test(text)) return { ok: false, code: 'describe' };
  // `mapReviewerError()` puts its own sentence in place of a policy's, and marks it.
  if (error?.code === 'forbidden') return { ok: false, code: 'notYours' };
  return { ok: false, code: 'refused' };
}

/** The HTTP status that goes with a name. */
export function registerStatusOf(code: RegisterRefusal): number {
  if (code === 'signedOut') return 401;
  if (code === 'notYours') return 403;
  if (code === 'unsure') return 502;
  return 422;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Text or nothing, trimmed, within a length. Anything that is not text is refused without a name of its own. */
function within(value: unknown, max: number): RegisterCheck<string | null> {
  if (value === null || value === undefined) return { ok: true, value: null };
  if (typeof value !== 'string') return { ok: false, code: 'refused' };
  const trimmed = value.trim();
  if (trimmed.length === 0) return { ok: true, value: null };
  if (trimmed.length > max) return { ok: false, code: 'long', max };
  return { ok: true, value: trimmed };
}

export function checkReviewerBio(value: unknown): RegisterCheck<string | null> {
  return within(value, BIO_MAX);
}

export function checkQualification(input: {
  qualificationType?: unknown;
  title?: unknown;
  institution?: unknown;
  subjectAreaId?: unknown;
}): RegisterCheck<{ qualificationType: QualificationType; title: string; institution: string | null; subjectAreaId: string }> {
  const type = typeof input.qualificationType === 'string' ? input.qualificationType : '';
  if (!(QUALIFICATION_TYPES as readonly string[]).includes(type)) return { ok: false, code: 'kind' };
  const title = within(input.title, QUALIFICATION_TITLE_MAX);
  if (!title.ok) return title;
  if (!title.value) return { ok: false, code: 'title' };
  const institution = within(input.institution, INSTITUTION_MAX);
  if (!institution.ok) return institution;
  const subject = input.subjectAreaId;
  if (typeof subject !== 'string' || !UUID.test(subject)) return { ok: false, code: 'subject' };
  return { ok: true, value: { qualificationType: type as QualificationType, title: title.value, institution: institution.value, subjectAreaId: subject } };
}

export function checkConflict(input: {
  conflictType?: unknown;
  description?: unknown;
  courseVersionId?: unknown;
}): RegisterCheck<{ conflictType: ConflictType; description: string; courseVersionId: string | null }> {
  const type = typeof input.conflictType === 'string' ? input.conflictType : '';
  if (!(CONFLICT_TYPES as readonly string[]).includes(type)) return { ok: false, code: 'kind' };
  const description = within(input.description, CONFLICT_DESCRIPTION_MAX);
  if (!description.ok) return description;
  if (!description.value) return { ok: false, code: 'describe' };
  const version = input.courseVersionId;
  if (version === null || version === undefined || version === '') return { ok: true, value: { conflictType: type as ConflictType, description: description.value, courseVersionId: null } };
  if (typeof version !== 'string' || !UUID.test(version)) return { ok: false, code: 'refused' };
  return { ok: true, value: { conflictType: type as ConflictType, description: description.value, courseVersionId: version } };
}

/** Every sentence the register says, handed over by the page; it reads no catalogue itself. */
export type RegisterWords = {
  applyHead: string; notOn: string; applyWhy: string; bioLabel: string; apply: string; working: string;
  placeHead: string; applied: string; checked: string; checkedBy: string; notChecked: string; notActive: string;
  qualHead: string; qualNone: string; untitled: string; qualRule: string; qualRecord: string; qualKind: string;
  qualSubject: string; noSubjects: string; qualTitle: string; qualTitleHint: string; qualBy: string; qualByHint: string; qualSave: string;
  standHead: string; standNone: string; assessedBy: string; declare: string; declareWhy: string; conflictKind: string;
  describe: string; describeHint: string; declareIt: string;
  reviewerStatus: Record<ReviewerStatus, string>;
  qualificationType: Record<QualificationType, string>;
  qualificationStatus: Record<QualificationStatus, string>;
  conflictType: Record<ConflictType, string>;
  conflictStatus: Record<ConflictStatus, string>;
  refusals: Record<RegisterRefusal, string>;
  /** Each length a refusal can name, in the reader's digits. */
  limits: Record<string, string>;
  /** Already written by the page: how many of each, and the two days. */
  counts: { qualifications: string; conflicts: string };
  days: { applied: string; checked: string };
};

/** A refusal as its sentence, with the length written in if it names one. */
export function registerRefusalSentence(words: Pick<RegisterWords, 'refusals' | 'limits'>, failure: { code: RegisterRefusal; max?: number }): string {
  if (failure.code !== 'long') return words.refusals[failure.code];
  const max = failure.max === undefined ? undefined : words.limits[String(failure.max)];
  // A length the page was not given is not printed in the wrong digits: the plainer refusal is said.
  return max === undefined ? words.refusals.refused : words.refusals.long.replace('{max}', max);
}
