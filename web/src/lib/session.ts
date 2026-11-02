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
/** The four words the masthead can say, so a page in another language can. */
export type MastheadLabels = {
  signIn: string;
  getStarted: string;
  signOut: string;
  area: string;
};

const ENGLISH_MASTHEAD: MastheadLabels = {
  signIn: 'Sign in',
  getStarted: 'Get started',
  signOut: 'Sign out',
  area: 'Your area',
};

export function mastheadActions(
  session: SessionSummary,
  labels: MastheadLabels = ENGLISH_MASTHEAD,
): MastheadAction[] {
  if (!session.signedIn) {
    return [
      { label: labels.signIn, href: '/sign-in', emphasis: 'ghost', method: 'get' },
      { label: labels.getStarted, href: '/sign-up', emphasis: 'primary', method: 'get' },
    ];
  }

  return [
    { label: labels.signOut, href: '/sign-out', emphasis: 'ghost', method: 'post' },
    { label: labels.area, href: '/dashboard', emphasis: 'primary', method: 'get' },
  ];
}

/**
 * What a screen reader hears on the "Your area" button.
 *
 * On a shared family device — the ordinary case here, since a parent's account
 * holds a child's learning — who is signed in is information the visible header
 * has no room for and the accessible name has plenty of.
 */
export function accountLabel(session: SessionSummary, area = 'Your area'): string {
  return session.name ? `${area} — signed in as ${session.name}` : area;
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
 * `/dashboard` rather than `/learn`, and that changed on 2026-11-02. It used to
 * point at the learner area, which was right for a learner and wrong for
 * everybody else: the owner signing in from the front page was shown a catalogue
 * of their own courses. `/dashboard` is the one place that knows the precedence
 * (`homeFor()`), so a teacher lands in `/teach` and the owner in `/admin` without
 * this module repeating the order of the questions.
 */
export function frontDoorCta(signedIn: boolean): CallToAction {
  return signedIn
    ? { label: 'Continue learning', href: '/dashboard' }
    : { label: 'Create a free account', href: '/sign-up' };
}

/**
 * What the front door does for the person standing at it.
 *
 * `null` means "show the page": a visitor reads the pitch, and anybody who asked
 * for it explicitly still can. A path means "you belong somewhere else", and the
 * somewhere is `/dashboard`, because the redirector is the only thing that knows
 * whether this person teaches, reviews or owns the platform.
 *
 * **Why a redirect rather than a banner.** The front page had already stopped
 * offering sign-up to a member and had begun saying "continue" instead — and it
 * was still the wrong page. A signed-in owner typing their own domain landed on
 * a brochure about the platform and had to find their console from a call to
 * action written for a stranger. A banner would still be a page to dismiss; the
 * recorded decision (2026-10-22) is that each role's first screen after arriving
 * is their own work.
 *
 * **`?public=1` is the way back.** There is a real need to see the marketing page
 * while signed in — the owner checking a change, a teacher looking for what a
 * prospective student reads — and a redirect with no way out is a door that locks
 * behind you. It is a query parameter rather than a second route because the page
 * it renders is this one, and two routes rendering one page is how they drift.
 */
export function frontDoorDestination(
  signedIn: boolean,
  search: { public?: string | string[] | undefined } = {},
): string | null {
  if (!signedIn) return null;
  const asked = Array.isArray(search.public) ? search.public[0] : search.public;
  if (asked === '1' || asked === 'true') return null;
  return '/dashboard';
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
