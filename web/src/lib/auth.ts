/** Accept only same-origin app paths for post-auth redirects. */
export function safeNextPath(candidate: string | null | undefined, fallback = '/learn'): string {
  if (!candidate || !candidate.startsWith('/') || candidate.startsWith('//')) return fallback;
  try {
    const base = new URL('https://ayahspring.invalid');
    const destination = new URL(candidate, base);
    if (destination.origin !== base.origin) return fallback;
    return `${destination.pathname}${destination.search}${destination.hash}`;
  } catch {
    return fallback;
  }
}

/**
 * Where a signed-in person belongs.
 *
 * Pure, so the order of the questions is testable without a database. The order
 * is the point: the platform owner usually holds `instructor` as well, and a
 * governance admin may also review, so the widest authority is asked first and
 * the narrowest last.
 *
 * A scholarly board member is sent to the reviewer register only while the owner
 * has the board convened. Otherwise the register refuses them, `/admin` refuses
 * them for the same reason, and sending them there would be a redirect loop that
 * ends on the marketing page — so they fall through to whatever else they are.
 */
export type RoleFacts = {
  platformAdmin: boolean;
  governanceAdmin: boolean;
  boardMember: boolean;
  boardActive: boolean;
  instructor: boolean;
  reviewer: boolean;
};

export function homeFor(roles: RoleFacts): string {
  if (roles.platformAdmin || roles.governanceAdmin) return '/admin';
  if (roles.boardMember && roles.boardActive) return '/admin/reviewers';
  if (roles.instructor) return '/teach';
  if (roles.reviewer) return '/review';
  // A learner is the default rather than a failure: most accounts are one, and
  // `/learn` explains itself to somebody with no enrolments yet.
  return '/learn';
}
