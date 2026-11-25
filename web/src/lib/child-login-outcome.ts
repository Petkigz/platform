/**
 * What `/api/family/child-login` answered, as a name.
 *
 * The card that makes, resets and detaches a child's login is written in the
 * reader's language and is handed its sentences by the family page. It used
 * to print the English sentence the route sent. The route now names the
 * reason beside that sentence, and this turns the name into the one the card
 * has words for.
 *
 * The decision that is easy to get wrong is the same as in
 * `family-outcome.ts`: **only a reply that names a reason this file knows is
 * a refusal.** A login is made in two places, the database and the sign-in
 * service, and a request can finish after its reply was lost. So a reply
 * without a name, a name nobody has heard of, a five hundred, or a page from
 * something in front of the site is `unconfirmed`, and the card's sentence
 * for that sends the guardian to look before pressing again.
 *
 * Two names are answered with 503 and are still certain: the server has no
 * key for the sign-in service, so it never tried.
 *
 * Kept apart from `child-login.ts` only so the list is in one place; both
 * are pure and a browser may import either.
 */
import type { PasswordCode, UsernameCode } from './child-login.ts';

export type ChildLoginCode =
  | 'signed_out'
  | 'malformed'
  | 'no_child'
  | UsernameCode
  | PasswordCode
  | 'under_twelve'
  | 'confirm_twelve'
  | 'unavailable'
  | 'reset_unavailable'
  | 'guardian_required'
  | 'not_your_child'
  | 'no_login'
  | 'unconfirmed';

/** The names the routes send, and the name the card says each by. */
const NAMES: Record<string, Exclude<ChildLoginCode, 'unconfirmed'>> = {
  signed_out: 'signed_out',
  malformed: 'malformed',
  no_child: 'no_child',
  username_missing: 'username_missing',
  username_short: 'username_short',
  username_long: 'username_long',
  username_start: 'username_start',
  username_chars: 'username_chars',
  password_missing: 'password_missing',
  password_short: 'password_short',
  under_twelve: 'under_twelve',
  confirm_twelve: 'confirm_twelve',
  // The older names, kept as the database and the first route wrote them.
  child_login_unavailable: 'unavailable',
  reset_unavailable: 'reset_unavailable',
  'child_login:verified_guardian_required': 'guardian_required',
  'child_login:not_your_child': 'not_your_child',
  'child_login:no_login': 'no_login',
};

const NEVER_TRIED: readonly ChildLoginCode[] = ['unavailable', 'reset_unavailable'];

export function childLoginOutcomeOf(status: number, code: unknown): ChildLoginCode {
  if (typeof code !== 'string' || !Object.hasOwn(NAMES, code)) return 'unconfirmed';
  const name = NAMES[code]!;
  if (NEVER_TRIED.includes(name)) return status === 503 ? name : 'unconfirmed';
  return status >= 400 && status <= 499 ? name : 'unconfirmed';
}
