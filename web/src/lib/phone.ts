/**
 * D3: phone numbers are stored in E.164.
 *
 * That is a storage decision with a boundary consequence: whatever the user
 * types, what reaches Supabase must already be E.164, because a provider
 * cannot route "0772 123456" and a duplicate stored two different ways is two
 * accounts.
 */

/** Strips everything that is not a digit or a leading +. */
export function stripFormatting(input: string): string {
  const trimmed = input.trim();
  const plus = trimmed.startsWith('+') ? '+' : '';
  return plus + trimmed.replace(/[^\d]/g, '');
}

/** True when the string is already a valid E.164 number. */
export function isE164(input: string): boolean {
  return /^\+[1-9]\d{6,14}$/.test(input);
}

/**
 * Best-effort normalisation to E.164.
 *
 * Returns null when the number cannot be made unambiguous. Deliberately
 * conservative: guessing a country code for a bare local number is how you
 * end up sending an OTP to the wrong country.
 */
export function toE164(input: string, defaultCountryCode?: string): string | null {
  const stripped = stripFormatting(input);
  if (stripped === '' || stripped === '+') return null;

  if (isE164(stripped)) return stripped;

  // A local number with a leading 0 ("0772 123456") only makes sense if the
  // caller told us which country it belongs to.
  if (defaultCountryCode) {
    const cc = stripFormatting(defaultCountryCode).replace(/^\+/, '');
    if (!/^\d{1,3}$/.test(cc)) return null;
    const national = stripped.replace(/^\+/, '').replace(/^0+/, '');
    const candidate = `+${cc}${national}`;
    return isE164(candidate) ? candidate : null;
  }

  // No country context: accept a bare international number without the +.
  if (/^[1-9]\d{6,14}$/.test(stripped)) return `+${stripped}`;

  return null;
}
