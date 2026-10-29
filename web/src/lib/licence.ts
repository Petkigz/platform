/**
 * The teacher licence, as the screens read it.
 *
 * The database holds the agreement; this turns the answer into sentences. That
 * split is the same one used for policies and screening, and it exists for one
 * reason: the words matter more than the JSON, so the words get tests.
 *
 * Two gaps have to read differently, because a person closes them differently.
 *
 *   * **`not_accepted`** — the terms are published and this teacher has not
 *     agreed. One button on the teaching page fixes it, so the sentence says
 *     where the button is.
 *   * **`not_published`** — the owner has switched enforcement on but no version
 *     is in force, so there is nothing to agree to. No teacher can fix this by
 *     clicking, and telling them to "accept the terms" would send them looking
 *     for a button that does not exist. The sentence names the owner's screen.
 *
 * And the third state, which is the one most deployments are in: enforcement off.
 * The terms exist and are readable, nobody is being asked, and the screen says
 * that rather than pretending the question has been settled.
 */

export type TeacherTerms = {
  slug: string;
  title: string;
  documentFound: boolean;
  enforced: boolean;
  versionNumber: number | null;
  effectiveAt: string | null;
  accepted: boolean;
  acceptedAt: string | null;
  blockedBy: 'not_accepted' | 'not_published' | null;
  canUpload: boolean;
};

export type LicenceCoverage = {
  enforced: boolean;
  versionNumber: number | null;
  teachers: number;
  accepted: number;
  outstanding: Array<{ userId: string; name: string | null }>;
};

/** The one document whose agreement this gate is about. */
export const TEACHER_TERMS_SLUG = 'teaching';

const EMPTY: TeacherTerms = {
  slug: TEACHER_TERMS_SLUG,
  title: 'Terms for teachers',
  documentFound: false,
  enforced: false,
  versionNumber: null,
  effectiveAt: null,
  accepted: false,
  acceptedAt: null,
  blockedBy: null,
  canUpload: true,
};

function asNumberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function asStringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

/**
 * Read whatever the RPC returned.
 *
 * Total, never throws, and defaults to "allowed" — the same direction the
 * database defaults in (the flag ships off). A malformed answer must not lock a
 * teacher out of their own media library; the gate lives in the database, where
 * a missing answer is impossible.
 */
export function parseTeacherTerms(raw: unknown): TeacherTerms {
  if (!raw || typeof raw !== 'object') return { ...EMPTY };
  const row = raw as Record<string, unknown>;
  const blocked = row.blockedBy;
  return {
    slug: asStringOrNull(row.slug) ?? EMPTY.slug,
    title: asStringOrNull(row.title) ?? EMPTY.title,
    documentFound: row.documentFound === true,
    enforced: row.enforced === true,
    versionNumber: asNumberOrNull(row.versionNumber),
    effectiveAt: asStringOrNull(row.effectiveAt),
    accepted: row.accepted === true,
    acceptedAt: asStringOrNull(row.acceptedAt),
    blockedBy: blocked === 'not_accepted' || blocked === 'not_published' ? blocked : null,
    canUpload: row.canUpload !== false,
  };
}

export function parseCoverage(raw: unknown): LicenceCoverage | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const outstanding = Array.isArray(row.outstanding)
    ? row.outstanding
        .filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === 'object')
        .map((entry) => ({
          userId: String(entry.userId ?? ''),
          name: asStringOrNull(entry.name),
        }))
        .filter((entry) => entry.userId !== '')
    : [];
  return {
    enforced: row.enforced === true,
    versionNumber: asNumberOrNull(row.versionNumber),
    teachers: typeof row.teachers === 'number' ? row.teachers : outstanding.length,
    accepted: typeof row.accepted === 'number' ? row.accepted : 0,
    outstanding,
  };
}

/** `2026-10-28` → `28 October 2026`. A date only; no time is claimed. */
export function readableDate(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/**
 * The line a teacher sees about their own agreement.
 *
 * Returns null when there is nothing worth saying — which is the common case
 * with the flag off and the terms already agreed.
 */
export function termsSentence(terms: TeacherTerms): string | null {
  const when = readableDate(terms.acceptedAt);

  if (!terms.enforced) {
    if (terms.accepted) {
      return `You agreed to version ${String(terms.versionNumber ?? 1)} of the ${terms.title.toLowerCase()}${
        when ? ` on ${when}` : ''
      }. Agreeing is not yet required to upload, but the record is kept either way.`;
    }
    if (!terms.documentFound || terms.versionNumber === null) {
      return 'The teacher terms are not published yet, so there is nothing to agree to.';
    }
    return `You have not agreed to the ${terms.title.toLowerCase()} yet, and agreeing is not currently required to upload. It is worth reading before you publish anything.`;
  }

  if (terms.blockedBy === 'not_published') {
    return 'Uploading is switched off for want of an agreement: enforcement is on, but no version of the teacher terms is in force, so there is nothing to agree to. The owner publishes them on /admin/policies.';
  }

  if (terms.blockedBy === 'not_accepted') {
    return `Agree to version ${String(terms.versionNumber ?? 1)} of the ${terms.title.toLowerCase()} below and you can upload straight away.`;
  }

  return when
    ? `You agreed to version ${String(terms.versionNumber ?? 1)} of the ${terms.title.toLowerCase()} on ${when}.`
    : `You have agreed to version ${String(terms.versionNumber ?? 1)} of the ${terms.title.toLowerCase()}.`;
}

/** True when the screen should show the agreement button rather than a sentence. */
export function needsSignature(terms: TeacherTerms): boolean {
  return terms.blockedBy === 'not_accepted' && terms.versionNumber !== null;
}

/**
 * What to say next to a disabled upload form, or null when nothing is wrong.
 * Deliberately the same words the database would refuse with, so a person who
 * sees this and a person who gets the error read one explanation.
 */
export function uploadBlockedSentence(terms: TeacherTerms): string | null {
  if (terms.canUpload) return null;
  if (terms.blockedBy === 'not_published') {
    return 'Uploads are paused until the teacher terms are published. Nothing you have uploaded is affected.';
  }
  return 'Uploads are paused until you agree to the teacher terms. It takes one click, on your teaching page.';
}

/** The owner's line on `/admin/policies`. */
export function coverageSentence(coverage: LicenceCoverage): string {
  if (coverage.teachers === 0) {
    return 'No teacher has been appointed yet, so there is nobody to ask.';
  }
  const agreement = coverage.enforced ? 'must agree before uploading' : 'are being asked, but nothing is refused yet';
  const outstanding = coverage.teachers - coverage.accepted;
  const base = `${String(coverage.accepted)} of ${String(coverage.teachers)} appointed ${
    coverage.teachers === 1 ? 'teacher has' : 'teachers have'
  } agreed to ${coverage.versionNumber ? `version ${String(coverage.versionNumber)}` : 'the current terms'}. They ${agreement}.`;
  if (outstanding <= 0) return base;
  return `${base} ${String(outstanding)} still to agree.`;
}

/** Names the outstanding teachers, for the person who has to chase them. */
export function outstandingNames(coverage: LicenceCoverage): string {
  const names = coverage.outstanding.map((row) => row.name?.trim() || 'An unnamed account');
  if (names.length === 0) return '';
  if (names.length === 1) return names[0]!;
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/**
 * The database's refusal, in words.
 *
 * The SQL raises `licence:not_accepted` and `licence:not_published` with errcodes
 * PostgREST hands back in `message` or `details`. Matching on the code prefix
 * rather than the whole message keeps this working if the hint is reworded.
 */
export function describeLicenceError(message: string | null | undefined): string {
  const text = (message ?? '').toLowerCase();
  if (text.includes('licence:not_published')) {
    return 'Uploads are switched off because the teacher terms are not published. The owner can publish them from the policy register.';
  }
  if (text.includes('licence:not_accepted')) {
    return 'Agree to the teacher terms first — the agreement is at the top of your teaching page.';
  }
  if (text.includes('licence:not_signed_in')) {
    return 'Sign in again — your session has ended.';
  }
  return 'The upload was refused. Nothing has been saved; try again, and if it keeps happening, contact support.';
}
