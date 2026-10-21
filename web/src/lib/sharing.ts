/**
 * An adult sharing their own learning with somebody else.
 *
 * Adult learning is private by default, including inside a family — that is the rule
 * `adult_learning_shares` was built for, and it is why this module has no "share with
 * your family" shortcut. A share is explicit (a person, chosen), scoped (progress,
 * achievements, or both) and revocable (by the person who granted it), and it can
 * carry an expiry.
 *
 * Two things make this more than a settings screen. The grant changes what another
 * account may read — `may_read_shared_learning()` is what `shared_learning_overview()`
 * asks before returning anything — and the terms are shown to the reader as well as to
 * the owner, because a person reading somebody's progress should be able to see what
 * they are reading under and until when.
 *
 * The flag is `family.adult_shares`, ADMIN, and it ships off. Every writer here is
 * refused by the database while it is off, so the panel says so rather than offering a
 * form that cannot work.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export type ShareScope = 'progress' | 'achievements' | 'progress_and_achievements';
export type ShareStatus = 'active' | 'revoked' | 'expired';

export const SHARE_SCOPES: readonly ShareScope[] = [
  'progress', 'achievements', 'progress_and_achievements',
];

export const SHARE_SCOPE_LABEL: Record<ShareScope, string> = {
  progress: 'My progress',
  achievements: 'My certificates',
  progress_and_achievements: 'My progress and certificates',
};

export const SHARE_STATUS_LABEL: Record<ShareStatus, string> = {
  active: 'Can see it',
  revoked: 'Ended by a person',
  expired: 'Ran out',
};

/**
 * The choices the form offers for how long a share lasts. "Until I revoke it" is the
 * default because a share with no end is the one a person means when they say "my
 * brother can see how I am doing", and an expiry they did not ask for would quietly
 * stop it.
 */
export const SHARE_EXPIRY_OPTIONS: readonly { days: number; label: string }[] = [
  { days: 0, label: 'Until I end it' },
  { days: 7, label: 'For a week' },
  { days: 30, label: 'For a month' },
  { days: 90, label: 'For three months' },
  { days: 365, label: 'For a year' },
];

export const EMAIL_MAX = 320;

export type MyShare = {
  shareId: string;
  granteeUserId: string;
  granteeName: string | null;
  scope: ShareScope;
  status: ShareStatus;
  grantedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
};

export type SharedProgressRow = {
  enrolmentId: string;
  courseTitle: string;
  courseSlug: string | null;
  status: string;
  enrolledAt: string | null;
  completedAt: string | null;
  lessonsCompleted: number;
  lessonsTotal: number;
  lastActivityAt: string | null;
};

export type SharedAchievementRow = {
  certificateId: string;
  certificateNumber: string;
  courseTitle: string;
  status: string;
  issuedAt: string | null;
  revokedAt: string | null;
};

export type SharedOverview = {
  learnerId: string;
  learnerName: string | null;
  seesProgress: boolean;
  seesAchievements: boolean;
  terms: Array<{ scope: string; grantedAt: string | null; expiresAt: string | null }>;
  progress: { total: number; rows: SharedProgressRow[] };
  achievements: { total: number; rows: SharedAchievementRow[] };
};

export type SharingOutcome<T> =
  | { ok: true; value: T }
  | { ok: false; code: 'rejected' | 'forbidden'; message: string };

function isScope(value: unknown): value is ShareScope {
  return SHARE_SCOPES.includes(value as ShareScope);
}

function isStatus(value: unknown): value is ShareStatus {
  return value === 'active' || value === 'revoked' || value === 'expired';
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value !== '' ? value : null;
}

function whole(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.trunc(value) : 0;
}

/**
 * A refusal, as a code and a sentence.
 *
 * The messages come from the database and are written for a person, so they are passed
 * through; all that is added is which of them mean "not yours to do".
 */
export function mapSharingError(error: { message: string }): SharingOutcome<never> {
  const message = error.message;
  if (/only the learner whose progress this is|sign in first|not enabled on this platform/i.test(message)) {
    return { ok: false, code: 'forbidden', message };
  }
  if (/has not shared their learning with you|may list who can see it|may revoke it/i.test(message)) {
    return { ok: false, code: 'forbidden', message };
  }
  if (/policy|permission denied/i.test(message)) {
    return { ok: false, code: 'forbidden', message: 'That is not yours to decide.' };
  }
  return { ok: false, code: 'rejected', message };
}

export function validateEmailInput(input: {
  email?: unknown;
}): { ok: true; value: string } | { ok: false; message: string } {
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  if (email.length === 0) return { ok: false, message: 'Whose account should see it?' };
  if (email.length > EMAIL_MAX) {
    return { ok: false, message: `That is longer than ${EMAIL_MAX} characters.` };
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false, message: 'That is not an email address.' };
  }
  return { ok: true, value: email };
}

/**
 * Days from now, or null for no end.
 *
 * The database refuses an expiry that has already passed, and so does this: a form
 * that could produce one would be offering a share that cannot be granted.
 */
export function validateExpiryInput(input: {
  days?: unknown;
}): { ok: true; value: string | null } | { ok: false; message: string } {
  const raw = input.days;
  const days = typeof raw === 'number' ? raw : typeof raw === 'string' && raw !== '' ? Number(raw) : NaN;
  if (!Number.isFinite(days) || days < 0) {
    return { ok: false, message: 'Choose how long this should last.' };
  }
  if (!SHARE_EXPIRY_OPTIONS.some((option) => option.days === days)) {
    return { ok: false, message: 'That is not one of the lengths offered.' };
  }
  if (days === 0) return { ok: true, value: null };

  const when = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  if (when.getTime() <= Date.now()) {
    return { ok: false, message: 'A share that has already ended is not a share.' };
  }
  return { ok: true, value: when.toISOString() };
}

export function validateShareInput(input: {
  granteeUserId?: unknown;
  scope?: unknown;
  days?: unknown;
}): { ok: true; value: { granteeUserId: string; scope: ShareScope; expiresAt: string | null } }
  | { ok: false; message: string } {
  const grantee = typeof input.granteeUserId === 'string' ? input.granteeUserId : '';
  if (grantee === '') return { ok: false, message: 'Find whose account should see it first.' };
  if (!isScope(input.scope)) return { ok: false, message: 'Choose what they may see.' };

  const expiry = validateExpiryInput({ days: input.days });
  if (!expiry.ok) return expiry;

  return { ok: true, value: { granteeUserId: grantee, scope: input.scope, expiresAt: expiry.value } };
}

export async function resolveShareGrantee(
  supabase: SupabaseClient,
  email: unknown,
): Promise<SharingOutcome<{ userId: string; displayName: string | null; note: string | null } | null>> {
  const checked = validateEmailInput({ email });
  if (!checked.ok) return { ok: false, code: 'rejected', message: checked.message };

  const { data, error } = await supabase.rpc('resolve_share_grantee', { p_email: checked.value });
  if (error) return mapSharingError(error);

  const reply = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  const note = text(reply.note);
  if (reply.found !== true) return { ok: true, value: null };
  const userId = typeof reply.userId === 'string' ? reply.userId : '';
  if (userId === '') {
    return { ok: false, code: 'rejected', message: note ?? 'That account came back without an id.' };
  }
  return { ok: true, value: { userId, displayName: text(reply.displayName), note } };
}

export async function shareMyLearning(
  supabase: SupabaseClient,
  args: { learnerProfileId: string; granteeUserId: unknown; scope: unknown; days: unknown },
): Promise<SharingOutcome<{ shareId: string; granted: boolean; note: string | null }>> {
  const checked = validateShareInput(args);
  if (!checked.ok) return { ok: false, code: 'rejected', message: checked.message };

  const { data, error } = await supabase.rpc('share_adult_learning', {
    p_learner_profile_id: args.learnerProfileId,
    p_grantee_user_id: checked.value.granteeUserId,
    p_scope: checked.value.scope,
    p_expires_at: checked.value.expiresAt,
  });
  if (error) return mapSharingError(error);

  const reply = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  return {
    ok: true,
    value: {
      shareId: typeof reply.shareId === 'string' && reply.shareId !== '' ? reply.shareId : 'unknown',
      granted: reply.granted === true,
      note: text(reply.note),
    },
  };
}

export async function revokeLearningShare(
  supabase: SupabaseClient,
  shareId: string,
): Promise<SharingOutcome<{ shareId: string; changed: boolean; note: string | null }>> {
  if (!shareId) return { ok: false, code: 'rejected', message: 'That share is missing.' };

  const { data, error } = await supabase.rpc('revoke_adult_learning_share', { p_share_id: shareId });
  if (error) return mapSharingError(error);

  const reply = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  return {
    ok: true,
    value: {
      shareId: typeof reply.shareId === 'string' && reply.shareId !== '' ? reply.shareId : shareId,
      changed: reply.changed === true,
      note: text(reply.note),
    },
  };
}

/**
 * Who can see this adult's learning.
 *
 * Strict: a payload with a share in it that does not parse is refused naming the field,
 * rather than shown as a half-formed row. This is a privacy panel — a row that silently
 * lost its scope would tell somebody they had shared less than they had.
 */
export async function fetchMyLearningShares(
  supabase: SupabaseClient,
  learnerProfileId: string,
): Promise<SharingOutcome<MyShare[]>> {
  if (!learnerProfileId) {
    return { ok: false, code: 'rejected', message: 'You have no learner profile yet.' };
  }

  const { data, error } = await supabase.rpc('my_learning_shares', {
    p_learner_profile_id: learnerProfileId,
  });
  if (error) return mapSharingError(error);

  const reply = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  if (!Array.isArray(reply.shares)) {
    return { ok: false, code: 'rejected', message: 'The list of shares came back unreadable.' };
  }

  const shares: MyShare[] = [];
  for (const entry of reply.shares as unknown[]) {
    const row = (entry && typeof entry === 'object' ? entry : {}) as Record<string, unknown>;
    const shareId = text(row.shareId);
    const granteeUserId = text(row.granteeUserId);
    if (!shareId || !granteeUserId || !isScope(row.scope) || !isStatus(row.status)) {
      return {
        ok: false,
        code: 'rejected',
        message: 'A share came back without an id, a person, a scope or a status.',
      };
    }
    shares.push({
      shareId,
      granteeUserId,
      granteeName: text(row.granteeName),
      scope: row.scope,
      status: row.status,
      grantedAt: text(row.grantedAt),
      expiresAt: text(row.expiresAt),
      revokedAt: text(row.revokedAt),
    });
  }

  return { ok: true, value: shares };
}

/**
 * The learners who have shared with the signed-in person.
 *
 * Read from the share rows the caller is allowed to see, then each learner's overview
 * is fetched — which is what turns a row into something to look at, and refuses on its
 * own if the share has lapsed in the meantime. A lapsed row is dropped rather than
 * shown as an error: the honest answer is that it is no longer shared.
 */
export async function fetchSharedWithMe(
  supabase: SupabaseClient,
  userId: string,
): Promise<SharingOutcome<SharedOverview[]>> {
  const { data, error } = await supabase
    .from('adult_learning_shares')
    .select('learner_profile_id, scope, granted_at, expires_at')
    .eq('grantee_user_id', userId)
    .eq('status', 'active');

  if (error) return mapSharingError(error);

  type Row = { learner_profile_id: string; expires_at: string | null };
  const now = Date.now();
  const learnerIds = [...new Set(
    ((data ?? []) as unknown as Row[])
      .filter((row) => {
        if (!row.expires_at) return true;
        const until = new Date(row.expires_at).getTime();
        return Number.isNaN(until) || until > now;
      })
      .map((row) => row.learner_profile_id)
      .filter((id): id is string => typeof id === 'string' && id !== ''),
  )].slice(0, 10);

  const overviews: SharedOverview[] = [];
  for (const learnerId of learnerIds) {
    const outcome = await fetchSharedLearningOverview(supabase, learnerId);
    // A share that ended between the list and the read is not an error to show.
    if (outcome.ok) overviews.push(outcome.value);
  }

  return { ok: true, value: overviews };
}

/** What a person shared with may see, with the terms they are seeing it under. */
export async function fetchSharedLearningOverview(
  supabase: SupabaseClient,
  learnerProfileId: string,
): Promise<SharingOutcome<SharedOverview>> {
  if (!learnerProfileId) {
    return { ok: false, code: 'rejected', message: 'That learner is missing.' };
  }

  const { data, error } = await supabase.rpc('shared_learning_overview', {
    p_learner_profile_id: learnerProfileId,
  });
  if (error) return mapSharingError(error);

  const reply = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  const learner = (reply.learner && typeof reply.learner === 'object'
    ? reply.learner
    : {}) as Record<string, unknown>;
  const learnerId = text(learner.id);
  if (!learnerId) {
    return { ok: false, code: 'rejected', message: 'The learner came back without an id.' };
  }

  const progressSection = (reply.progress && typeof reply.progress === 'object'
    ? reply.progress : null) as { total?: unknown; rows?: unknown } | null;
  const achievementsSection = (reply.achievements && typeof reply.achievements === 'object'
    ? reply.achievements : null) as { total?: unknown; rows?: unknown } | null;
  if (!progressSection || !achievementsSection) {
    return {
      ok: false,
      code: 'rejected',
      message: 'The overview came back without a progress or achievements section.',
    };
  }

  const progressRows: SharedProgressRow[] = [];
  for (const entry of (Array.isArray(progressSection.rows) ? progressSection.rows : []) as unknown[]) {
    const row = (entry && typeof entry === 'object' ? entry : {}) as Record<string, unknown>;
    const enrolmentId = text(row.enrolmentId);
    const courseTitle = text(row.courseTitle);
    if (!enrolmentId || !courseTitle) {
      return {
        ok: false,
        code: 'rejected',
        message: 'A progress row came back without an enrolment or a course.',
      };
    }
    progressRows.push({
      enrolmentId,
      courseTitle,
      courseSlug: text(row.courseSlug),
      status: text(row.status) ?? 'unknown',
      enrolledAt: text(row.enrolledAt),
      completedAt: text(row.completedAt),
      lessonsCompleted: whole(row.lessonsCompleted),
      lessonsTotal: whole(row.lessonsTotal),
      lastActivityAt: text(row.lastActivityAt),
    });
  }

  const achievementRows: SharedAchievementRow[] = [];
  for (const entry of (Array.isArray(achievementsSection.rows) ? achievementsSection.rows : []) as unknown[]) {
    const row = (entry && typeof entry === 'object' ? entry : {}) as Record<string, unknown>;
    const certificateId = text(row.certificateId);
    const certificateNumber = text(row.certificateNumber);
    if (!certificateId || !certificateNumber) {
      return {
        ok: false,
        code: 'rejected',
        message: 'A certificate came back without an id or a number.',
      };
    }
    achievementRows.push({
      certificateId,
      certificateNumber,
      courseTitle: text(row.courseTitle) ?? 'A course',
      status: text(row.status) ?? 'issued',
      issuedAt: text(row.issuedAt),
      revokedAt: text(row.revokedAt),
    });
  }

  const terms: Array<{ scope: string; grantedAt: string | null; expiresAt: string | null }> = [];
  for (const entry of (Array.isArray(reply.shares) ? reply.shares : []) as unknown[]) {
    const row = (entry && typeof entry === 'object' ? entry : {}) as Record<string, unknown>;
    terms.push({
      scope: text(row.scope) ?? 'unknown',
      grantedAt: text(row.grantedAt),
      expiresAt: text(row.expiresAt),
    });
  }

  return {
    ok: true,
    value: {
      learnerId,
      learnerName: text(learner.displayName),
      seesProgress: reply.seesProgress === true,
      seesAchievements: reply.seesAchievements === true,
      terms,
      progress: { total: whole(progressSection.total), rows: progressRows },
      achievements: { total: whole(achievementsSection.total), rows: achievementRows },
    },
  };
}
