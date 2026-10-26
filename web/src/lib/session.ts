/**
 * What the masthead is allowed to say about the person reading it.
 *
 * The root layout is deliberately auth-agnostic so pages stay statically
 * renderable — which is why the header said "Sign in" to everyone, including a
 * learner who had just signed in, on every page of the product. The fix is a
 * client component that asks once after hydration and swaps the two buttons;
 * everything it renders starts from the signed-out state, so the HTML a stranger
 * gets is the HTML a crawler gets and hydration never disagrees with the server.
 *
 * This module is the part that can be tested without a browser: what a session
 * response is allowed to mean, and which two actions each state offers.
 */

export type SessionSummary = { signedIn: boolean; name: string | null };

export type MastheadAction = {
  label: string;
  href: string;
  emphasis: 'primary' | 'ghost';
  /** `post` because `/sign-out` only accepts POST; a link would be a 405. */
  method: 'get' | 'post';
};

export const NOBODY: SessionSummary = { signedIn: false, name: null };

/**
 * Read the session endpoint's answer defensively.
 *
 * The header is on every page, so a malformed response must degrade to "not
 * signed in" rather than throw, and `signedIn` must be exactly `true` — a
 * string "false" from a proxy that stringified JSON is not a session.
 */
export function parseSession(value: unknown): SessionSummary {
  if (!value || typeof value !== 'object') return NOBODY;
  const record = value as Record<string, unknown>;
  if (record.signedIn !== true) return NOBODY;

  return { signedIn: true, name: firstName(record.name) };
}

/**
 * A first name, or nothing.
 *
 * The same rule the course page uses for a teacher's name: whitespace is not a
 * name, and a header that greets somebody with a space is worse than one that
 * does not greet them at all.
 */
export function firstName(name: unknown): string | null {
  if (typeof name !== 'string') return null;
  const first = name.trim().split(/\s+/)[0] ?? '';
  return first.length > 0 ? first : null;
}

/**
 * The two buttons, and nothing else.
 *
 * Signed out, the pair is the way in. Signed in, neither button may offer to
 * sign in or to create an account — that is the defect this module exists to
 * prevent — and signing out is a form POST rather than a link, because the
 * route refuses GET.
 */
export function mastheadActions(session: SessionSummary): MastheadAction[] {
  if (!session.signedIn) {
    return [
      { label: 'Sign in', href: '/sign-in', emphasis: 'ghost', method: 'get' },
      { label: 'Get started', href: '/sign-up', emphasis: 'primary', method: 'get' },
    ];
  }

  return [
    { label: 'Sign out', href: '/sign-out', emphasis: 'ghost', method: 'post' },
    { label: 'Your area', href: '/dashboard', emphasis: 'primary', method: 'get' },
  ];
}

/**
 * What a screen reader hears on the "Your area" button.
 *
 * On a shared family device — the ordinary case here, since a parent's account
 * holds a child's learning — who is signed in is information the visible header
 * has no room for and the accessible name has plenty of.
 */
export function accountLabel(session: SessionSummary): string {
  return session.name ? `Your area — signed in as ${session.name}` : 'Your area';
}

export type CallToAction = { label: string; href: string };

/**
 * The second button on the front door.
 *
 * The landing page offered "Create a free account" to everybody, including
 * somebody who had just signed in — the same defect the masthead had, on the
 * busier surface. The hero is not the masthead: it is a page that already reads
 * the database, so it can read the session while it is there rather than asking
 * afterwards, and a signed-in reader gets the door to their own work.
 *
 * `/learn` rather than `/dashboard`: the dashboard is a redirector that chooses
 * a destination, and a button that goes through a redirect to reach a known
 * place is one hop more than it needs to be.
 */
export function frontDoorCta(signedIn: boolean): CallToAction {
  return signedIn
    ? { label: 'Continue learning', href: '/learn' }
    : { label: 'Create a free account', href: '/sign-up' };
}

/**
 * The sentence above the closing button, which was also written for a stranger.
 *
 * "Create an account when you find one you want to keep" is an instruction to
 * somebody who has already done it. The signed-in version says what is actually
 * true for them — their enrolments, progress and certificates are already in
 * one place — and it is a different sentence rather than the same one with a
 * word changed, because a front door that greets a member like a visitor is
 * how a product feels like a brochure.
 */
export function closingCopy(signedIn: boolean): string {
  return signedIn
    ? 'Every published course is listed with what it contains and who teaches it. ' +
        'Your enrolments, progress and certificates are in one place.'
    : 'Every published course is listed with what it contains and who teaches it. ' +
        'Create an account when you find one you want to keep.';
}
