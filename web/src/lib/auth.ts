/** Accept only same-origin app paths for redirects. Fallback must be a trusted local path. */
export function safeNextPath(candidate: string | null | undefined, fallback = '/learn'): string {
  if (!candidate || !candidate.startsWith('/') || candidate.startsWith('//') ||
      candidate.includes('\\') || /[\u0000-\u001f\u007f]/.test(candidate)) return fallback;
  try {
    const base = new URL('https://ayahspring.invalid');
    const destination = new URL(candidate, base);
    // Dot-segment normalization can turn /a/..//host into //host. Returning
    // that pathname would turn it into an external URL when resolved again.
    if (destination.origin !== base.origin || destination.pathname.startsWith('//')) return fallback;
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
 *
 * A finance admin or a support agent used to fall all the way through to
 * `/learn`, which is a screen for a learner: the one staff member who most needs
 * a "what is waiting" list landed on a catalogue of somebody else's courses.
 * Both are staff, and `/admin` is where staff work starts — filtered to their own
 * queues and their own links, which is the whole point of the page.
 */
export type RoleFacts = {
  platformAdmin: boolean;
  governanceAdmin: boolean;
  /** Holds `finance_admin`. Staff, but not the owner. */
  financeAdmin: boolean;
  /** Holds `support_agent`. Staff, but not the owner. */
  supportAgent: boolean;
  boardMember: boolean;
  boardActive: boolean;
  instructor: boolean;
  reviewer: boolean;
};

/**
 * One role question, where a failed question is not a "no".
 *
 * `/dashboard` asked seven of these and read anything but `true` as false,
 * including a request that failed. So an owner whose questions were not
 * answered (a cold start, a dropped connection) was sent to `/learn`, the
 * screen of somebody with no role, with nothing to say why. On 2026-11-27
 * the owner signed in with Google and reported arriving as an ordinary user
 * while the database held the same account with its role intact; whether
 * this was the cause was not established, but it is the one path in the
 * code that does that.
 *
 * Asked twice. If neither is answered this throws, and the site's own error
 * page offers "try again", which is the truth: nobody knows yet where this
 * person belongs.
 */
export async function askRole(
  ask: () => PromiseLike<{ data: unknown; error: unknown }>,
  attempts = 2,
): Promise<boolean> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const { data, error } = await ask();
    if (!error) return data === true;
  }
  throw new Error('Your roles could not be read just now.');
}

export function homeFor(roles: RoleFacts): string {
  if (roles.platformAdmin || roles.governanceAdmin) return '/admin';
  // Every other staff member belongs in the console too: it opens with their own
  // queues and their own links, and the switches below are not shown to them.
  if (roles.financeAdmin || roles.supportAgent) return '/admin';
  if (roles.boardMember && roles.boardActive) return '/admin/reviewers';
  if (roles.instructor) return '/teach';
  if (roles.reviewer) return '/review';
  // A learner is the default rather than a failure: most accounts are one, and
  // `/learn` explains itself to somebody with no enrolments yet.
  return '/learn';
}
