/**
 * A child's login, as the screens need to talk about it.
 *
 * The database decides whether a login may exist and who may make one. This
 * module only turns a child's typing into the two values the account needs — a
 * username and a password — and turns a refusal into a sentence. Everything here
 * is pure so it can be tested without a browser.
 *
 * **The sign-in address.** Supabase signs in with an email address; a
 * seven-year-old does not have one. So a child's username becomes
 * `<username>@learners.ayahspring.com` at the moment they sign in. That subdomain
 * deliberately has no mailbox: nothing is ever sent to it, and password recovery
 * is the guardian setting a new password rather than an email to a child. The
 * address is an identifier, not a way to reach anybody.
 */

export const CHILD_LOGIN_DOMAIN = 'learners.ayahspring.com';

/** Lowercase, trimmed: a child typing "Amina.K" must reach "amina.k". */
export function normaliseUsername(input: string): string {
  return input.trim().toLowerCase();
}

/**
 * What is wrong with this username, or null.
 *
 * The same shape the database enforces, said in words a guardian can act on. It
 * is checked here so the form can answer before a round trip, and enforced there
 * because a browser is not a rule.
 */
export function usernameProblem(input: string): string | null {
  const username = normaliseUsername(input);
  if (username.length === 0) return 'Choose a username for your child.';
  if (username.length < 3) return 'A username needs at least three characters.';
  if (username.length > 30) return 'A username can be at most thirty characters.';
  if (!/^[a-z0-9]/.test(username)) {
    return 'A username starts with a letter or a number.';
  }
  if (!/^[a-z0-9._-]+$/.test(username)) {
    return 'Use only letters, numbers, dots, dashes and underscores — no spaces.';
  }
  return null;
}

/** Passwords are the platform's own rule, not a new one: eight characters. */
export function passwordProblem(input: string): string | null {
  if (input.length === 0) return 'Set a password for your child.';
  if (input.length < 8) return 'A password needs at least eight characters.';
  return null;
}

/**
 * The address a sign-in attempt should use.
 *
 * Anything with an `@` is left alone — that is an adult signing in with their own
 * address. A bare word is a child's username. Doing it this way means the sign-in
 * form never has to ask the database whether a username exists, so it cannot be
 * used to find out which children have accounts: a wrong username fails exactly
 * like a wrong password.
 */
export function signInAddress(input: string): string {
  const value = input.trim();
  if (value.includes('@')) return value;
  return `${normaliseUsername(value)}@${CHILD_LOGIN_DOMAIN}`;
}

/**
 * A refusal from the database, in a sentence.
 *
 * Every one of these is something a guardian did or can fix. A code that is not
 * recognised never leaks to the screen: an unknown refusal is treated as a
 * failure we do not understand, and that is said plainly rather than dressed up.
 */
export function childLoginSentence(code: string | null | undefined): string {
  const value = (code ?? '').toLowerCase();
  if (value.includes('child_login:disabled')) {
    return 'Child logins are not switched on for this platform yet, so no new login can be made. Anything already created keeps working.';
  }
  if (value.includes('child_login:not_your_child')) {
    return 'Only an adult in this child’s family can make their login.';
  }
  if (value.includes('child_login:already_has_one')) {
    return 'This child already has a login. Remove it first if you need to make a new one.';
  }
  if (value.includes('child_login:username_taken')) {
    return 'That username is already used by another child. Try a different one.';
  }
  if (value.includes('child_login:username_shape')) {
    return 'That username cannot be used. Start with a letter or number, and use only letters, numbers, dots, dashes and underscores.';
  }
  if (value.includes('child_login:account_already_linked')) {
    return 'That account already belongs to another learner, so it cannot be this child’s login.';
  }
  if (value.includes('child_login:no_login')) {
    return 'This child has no login to remove.';
  }
  if (value.includes('age:declare_before_creating_a_child_login')) {
    return 'Before making a login for a child, say on your own account that you are an adult. It takes one button on the family page.';
  }
  if (value.includes('service_role') || value.includes('child_login_unavailable')) {
    return 'Child logins cannot be created on this deployment yet: the server key that makes an account is not configured. Nothing was changed.';
  }
  return 'The login could not be created just now. Nothing was changed — please try again.';
}
