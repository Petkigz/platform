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

export type AccountProfileOutcome =
  | { ok: true; profile: AccountProfile }
  | { ok: false; message: string };

export function validateAccountProfile(input: AccountProfileInput): string | null {
  const name = input.displayName.trim();
  if (!name) return 'Add the name you want people to see.';
  if (name.length > 80) return 'Keep your display name under 80 characters.';
  const language = input.preferredLanguage.trim();
  if (!/^[a-z]{2}(-[A-Z]{2})?$/.test(language)) {
    return 'Use a language code such as en or en-GB.';
  }
  const timezone = input.timezone.trim();
  if (timezone.length > 100) return 'Keep the time zone under 100 characters.';
  if (timezone) {
    try { new Intl.DateTimeFormat('en', { timeZone: timezone }); }
    catch { return 'Use a valid IANA time zone, such as Africa/Kampala.'; }
  }
  return null;
}

/** Update only self-service profile fields; RLS remains the authority. */
export async function saveAccountProfile(
  supabase: SupabaseClient,
  userId: string,
  input: AccountProfileInput,
): Promise<AccountProfileOutcome> {
  if (!userId) return { ok: false, message: 'Sign in first.' };
  const invalid = validateAccountProfile(input);
  if (invalid) return { ok: false, message: invalid };

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

  if (error) return { ok: false, message: error.message };
  if (!data) return { ok: false, message: 'Your profile could not be found. Sign out and back in, then try again.' };
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
