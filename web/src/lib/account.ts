import type { SupabaseClient } from '@supabase/supabase-js';

export type AccountProfileInput = {
  displayName: string;
  preferredLanguage: string;
  timezone: string;
};

export type AccountProfile = {
  display_name: string;
  preferred_language: string;
  timezone: string | null;
};

/**
 * Why a profile was not saved, as a name rather than a sentence.
 *
 * The form on `/account` is written in the reader's language and says its own
 * sentence for each of these; the English beside the code is for a caller that
 * has no words of its own. The database's own sentence is never passed on: a
 * failed update answers `failed`, and saving again is safe because the save
 * sets three fields to what was typed.
 */
export type AccountProfileProblem =
  | 'name_missing'
  | 'name_long'
  | 'language_code'
  | 'zone_long'
  | 'zone_invalid'
  | 'signed_out'
  | 'not_found'
  | 'malformed'
  | 'failed';

export const ACCOUNT_NAME_MAX = 80;
export const ACCOUNT_ZONE_MAX = 100;

export const ACCOUNT_PROFILE_SENTENCES: Record<AccountProfileProblem, string> = {
  name_missing: 'Add the name you want people to see.',
  name_long: `Keep your display name to ${ACCOUNT_NAME_MAX} characters or fewer.`,
  language_code: 'Use a language code such as en or en-GB.',
  zone_long: `Keep the time zone to ${ACCOUNT_ZONE_MAX} characters or fewer.`,
  zone_invalid: 'Use a valid IANA time zone, such as Africa/Kampala.',
  signed_out: 'You are signed out. Sign in again, then save.',
  not_found: 'Your profile could not be found. Sign out and back in, then try again.',
  malformed: 'Check the profile fields and try again.',
  failed: 'Your profile could not be saved. Try again.',
};

export type AccountProfileOutcome =
  | { ok: true; profile: AccountProfile }
  | { ok: false; code: AccountProfileProblem; message: string };

const refused = (code: AccountProfileProblem): AccountProfileOutcome =>
  ({ ok: false, code, message: ACCOUNT_PROFILE_SENTENCES[code] });

/** What is wrong with what was typed, or null. Runs in the browser and on the server. */
export function accountProfileProblem(input: AccountProfileInput): AccountProfileProblem | null {
  const name = input.displayName.trim();
  if (!name) return 'name_missing';
  if (name.length > ACCOUNT_NAME_MAX) return 'name_long';
  const language = input.preferredLanguage.trim();
  if (!/^[a-z]{2}(-[A-Z]{2})?$/.test(language)) return 'language_code';
  const timezone = input.timezone.trim();
  if (timezone.length > ACCOUNT_ZONE_MAX) return 'zone_long';
  if (timezone) {
    try { new Intl.DateTimeFormat('en', { timeZone: timezone }); }
    catch { return 'zone_invalid'; }
  }
  return null;
}

export function validateAccountProfile(input: AccountProfileInput): string | null {
  const problem = accountProfileProblem(input);
  return problem ? ACCOUNT_PROFILE_SENTENCES[problem] : null;
}

/** Update only self-service profile fields; RLS remains the authority. */
export async function saveAccountProfile(
  supabase: SupabaseClient,
  userId: string,
  input: AccountProfileInput,
): Promise<AccountProfileOutcome> {
  if (!userId) return refused('signed_out');
  const problem = accountProfileProblem(input);
  if (problem) return refused(problem);

  const { data, error } = await supabase
    .from('user_profiles')
    .update({
      display_name: input.displayName.trim(),
      preferred_language: input.preferredLanguage.trim(),
      timezone: input.timezone.trim() || null,
    })
    .eq('user_id', userId)
    .select('display_name, preferred_language, timezone')
    .maybeSingle();

  if (error) return refused('failed');
  if (!data) return refused('not_found');
  return { ok: true, profile: data as AccountProfile };
}

/**
 * The filename a data export downloads as.
 *
 * Dated so that two downloads do not silently overwrite each other in a downloads
 * folder, and ASCII-only so no browser has to guess about encoding.
 */
export function exportFileName(now: Date): string {
  return `ayahspring-data-${now.toISOString().slice(0, 10)}.json`;
}

export type EraseOutcome =
  | { ok: true; alreadyClosed: boolean; learnersErased: number }
  | { ok: false; message: string };

/**
 * Close the signed-in person's account.
 *
 * The decision about what survives is in `erase_my_account()` and nowhere else:
 * this function sends the confirmation and reports what happened. The database
 * writes its refusals for a person to read ("you still have a course in review"),
 * so they are passed through rather than replaced with a code.
 *
 * A reply that does not say `closed: true` is treated as a failure. An erasure is
 * the one operation where believing an ambiguous answer would be worse than
 * doing nothing.
 */
export const UNCERTAIN_CLOSURE = 'We could not confirm whether your account closed. Check your account status or contact privacy@ayahspring.com before trying again.';

export async function eraseMyAccount(
  supabase: SupabaseClient,
  confirm: string,
): Promise<EraseOutcome> {
  const typed = confirm.trim();
  if (!typed) return { ok: false, message: 'Type your name to confirm.' };

  const { data, error } = await supabase.rpc('erase_my_account', { p_confirm: typed });
  if (error) return { ok: false, message: error.message };

  const reply = data as {
    closed?: unknown;
    alreadyClosed?: unknown;
    learnersErased?: unknown;
  } | null;

  if (!reply || reply.closed !== true) {
    return { ok: false, message: UNCERTAIN_CLOSURE };
  }

  return {
    ok: true,
    alreadyClosed: reply.alreadyClosed === true,
    learnersErased:
      typeof reply.learnersErased === 'number' ? reply.learnersErased : 0,
  };
}
