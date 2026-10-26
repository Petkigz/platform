/**
 * D3: phone numbers are stored in E.164.
 *
 * That is a storage decision with a boundary consequence: whatever the user
 * types, what reaches Supabase must already be E.164, because a provider cannot
 * route "0772 123456" and a duplicate stored two different ways is two accounts.
 *
 * This file has two halves. The three functions at the top are the original
 * boundary helpers — the sign-up, sign-in and checkout paths call them with a
 * dial code and no more. Below them is the country-aware half the account screen
 * uses, which knows a country's digit range and trunk prefix and can say what is
 * wrong in a sentence. The helpers are implemented on top of it rather than
 * beside it, so there is one set of rules and one table.
 */

import { PHONE_COUNTRIES, type PhoneCountry } from './phone-countries.ts';

export type { PhoneCountry };

const BY_CODE = new Map(PHONE_COUNTRIES.map((country) => [country.code, country]));

/** Shared dial codes, and which country a number under one usually belongs to. */
const PREFERRED: Record<string, string[]> = {
  '+1': ['US', 'CA'],
  '+7': ['RU', 'KZ'],
  '+44': ['GB', 'GG', 'IM', 'JE'],
  '+61': ['AU', 'CC', 'CX'],
  '+212': ['MA', 'EH'],
  '+262': ['RE', 'YT'],
  '+590': ['GP', 'BL', 'MF'],
  '+599': ['CW', 'BQ'],
};


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

/** Countries that share a dial code, in the order a bare number is attributed. */
function countriesWithDial(dial: string): PhoneCountry[] {
  const code = `+${dial.replace(/^\+/, '')}`;
  const matching = PHONE_COUNTRIES.filter((country) => country.dial === code);
  const preferred = PREFERRED[code] ?? [];
  return [
    ...preferred.map((iso) => matching.find((country) => country.code === iso)).filter(Boolean),
    ...matching.filter((country) => !preferred.includes(country.code)),
  ] as PhoneCountry[];
}

/**
 * Best-effort normalisation to E.164, for the sign-in and checkout paths.
 *
 * Returns null when the number cannot be made unambiguous. Deliberately
 * conservative: guessing a country code for a bare local number is how you end
 * up sending an OTP to the wrong country.
 *
 * `defaultDialCode` is a dial code — '+256', '256' — not an ISO country code,
 * because that is what the forms hold. Where a dial code is shared, the number
 * is read under each country that uses it and the first reading that fits is
 * the answer.
 */
export function toE164(input: string, defaultDialCode?: string): string | null {
  const stripped = stripFormatting(input);
  if (stripped === '' || stripped === '+') return null;

  // Already international: the shape is the only check that can be made without
  // knowing which country the number belongs to.
  if (isE164(stripped)) return stripped;

  if (defaultDialCode) {
    const cc = stripFormatting(defaultDialCode).replace(/^\+/, '');
    if (!/^\d{1,3}$/.test(cc)) return null;

    for (const country of countriesWithDial(cc)) {
      const parsed = parsePhone(stripped, country.code);
      if (parsed.ok) return parsed.e164;
    }
    return null;
  }

  // No country context: accept a bare international number without the +.
  if (/^[1-9]\d{6,14}$/.test(stripped)) return `+${stripped}`;

  return null;
}


/**
 * Countries a person can pick, in the order they are shown.
 *
 * Sorted by the name the country is shown under, not by its code: a picker
 * sorted by 'AE, AF, AG' is a picker nobody can find Uganda in.
 */
let sorted: PhoneCountry[] | null = null;
export function phoneCountries(): PhoneCountry[] {
  if (!sorted) {
    sorted = [...PHONE_COUNTRIES].sort(
      (a, b) => describeCountry(a.code).localeCompare(describeCountry(b.code)),
    );
  }
  return sorted;
}

export function findCountry(code: string | null | undefined): PhoneCountry | null {
  if (!code) return null;
  return BY_CODE.get(code.trim().toUpperCase()) ?? null;
}

/**
 * The name to show for a country.
 *
 * `Intl.DisplayNames` is in every browser this platform supports and in Node;
 * where it is missing or refuses the code, the code itself is shown rather than
 * a guess at an English name.
 */
export function describeCountry(code: string | null | undefined): string {
  const country = findCountry(code);
  if (!country) return code?.trim().toUpperCase() || '';
  try {
    const names = new Intl.DisplayNames(['en'], { type: 'region' });
    return names.of(country.code) ?? country.code;
  } catch {
    return country.code;
  }
}

export type PhoneParse =
  | { ok: true; e164: string; national: string; country: PhoneCountry }
  | { ok: false; message: string };

/**
 * A number as the platform would store it, or why it will not.
 *
 * The same steps as the database: strip notation, read a leading + or 00 as
 * international, drop the trunk prefix, check the length against the country.
 */
export function parsePhone(input: string, countryCode: string): PhoneParse {
  const country = findCountry(countryCode);
  if (!country) {
    return { ok: false, message: 'Choose the country the number is registered in.' };
  }

  const raw = (input ?? '').trim();
  if (!raw) return { ok: false, message: 'Type a phone number.' };
  if (/[A-Za-z]/.test(raw)) {
    return { ok: false, message: 'A phone number cannot contain letters.' };
  }

  const digits = raw.replace(/[^0-9+]/g, '');
  if (!digits || digits === '+') {
    return { ok: false, message: 'Type a phone number, not just punctuation.' };
  }
  if ((digits.match(/\+/g) ?? []).length > 1) {
    return { ok: false, message: 'A phone number has at most one +, and only at the start.' };
  }
  if (digits.indexOf('+') > 0) {
    return { ok: false, message: 'A phone number has at most one +, and only at the start.' };
  }

  const code = country.dial.slice(1);
  let national: string;

  // A number pasted without its + ('256772123456') is the same number. It is
  // read as international only when that reading gives a length the country
  // actually has, so it can never turn a valid national number into another.
  const body = digits;
  const looksInternational = !body.startsWith('+')
    && !body.startsWith('00')
    && body.startsWith(code)
    && body.length - code.length >= country.min
    && body.length - code.length <= country.max;

  if (digits.startsWith('+') || digits.startsWith('00') || looksInternational) {
    const withPlus = looksInternational ? `+${digits}` : digits;
    const withoutPrefix = withPlus.startsWith('+') ? withPlus.slice(1) : withPlus.slice(2);
    if (!withoutPrefix.startsWith(code)) {
      const shown = withoutPrefix.length > 0 ? `+${withoutPrefix.slice(0, code.length + 1)}` : 'nothing';
      return {
        ok: false,
        message: `That number is not a ${country.code} number: it begins ${shown}, and a number from there begins ${country.dial}.`,
      };
    }
    national = withoutPrefix.slice(code.length);
  } else {
    national = digits;
  }

  if (country.trunk && national.startsWith(country.trunk)) {
    national = national.slice(1);
  }

  if (national.length < country.min || national.length > country.max) {
    const range = country.min === country.max ? `${country.min}` : `${country.min} to ${country.max}`;
    return {
      ok: false,
      message: `A number from ${country.code} has ${range} digits, and this one has ${national.length}.`,
    };
  }

  return {
    ok: true,
    e164: `${country.dial}${national}`,
    national,
    country,
  };
}

/** Would the database store this string exactly as it is? */
export function isStoredPhone(value: string, countryCode: string): boolean {
  const parsed = parsePhone(value, countryCode);
  return parsed.ok && parsed.e164 === value;
}

export type PhoneFormat = { national: string; international: string };

/**
 * A stored number, written the way a person reads it.
 *
 * The grouping comes from the country's table and is cosmetic: where the
 * metadata had no unambiguous rule for a length, the digits are grouped in
 * threes. The stored value never changes, so a wrong-looking space is never a
 * wrong number.
 */
export function formatPhone(e164: string, countryCode?: string | null): PhoneFormat {
  const country = findCountry(countryCode) ?? inferCountry(e164);
  if (!country || !e164.startsWith(country.dial)) {
    return { national: e164, international: e164 };
  }

  const national = e164.slice(country.dial.length);
  return {
    national: group(national, country),
    international: `${country.dial} ${group(national, country)}`,
  };
}

/** The national part of a stored number, grouped, without the dial code. */
function group(national: string, country: PhoneCountry): string {
  const sizes = country.groups[national.length] ?? null;
  if (!sizes || sizes.reduce((sum, n) => sum + n, 0) !== national.length) {
    // Even groups of three, with the remainder last: readable, and honest about
    // being a fallback rather than a pretence of the country's real formatting.
    const parts: string[] = [];
    for (let i = 0; i < national.length; i += 3) parts.push(national.slice(i, i + 3));
    return parts.join(' ');
  }
  let index = 0;
  const parts: string[] = [];
  for (const size of sizes) {
    parts.push(national.slice(index, index + size));
    index += size;
  }
  return parts.join(' ');
}

/**
 * Which country a stored number most likely belongs to, for display only.
 *
 * Dial codes are shared (+1 is twenty-odd countries), so this tries the longest
 * dial code first and then prefers the country the number's length fits. It is a
 * hint for rendering — what a person chose is stored beside the number and is
 * never inferred.
 */
export function inferCountry(e164: string): PhoneCountry | null {
  if (!/^\+[0-9]+$/.test(e164)) return null;
  const digits = e164.slice(1);

  const candidates = PHONE_COUNTRIES.filter((country) => digits.startsWith(country.dial.slice(1)));
  if (candidates.length === 0) return null;

  const longest = Math.max(...candidates.map((country) => country.dial.length));
  const byLongest = candidates.filter((country) => country.dial.length === longest);
  if (byLongest.length === 1) return byLongest[0]!;

  const length = digits.length - longest + 1;
  const fits = byLongest.filter(
    (country) => length >= country.min && length <= country.max,
  );
  const pool = fits.length > 0 ? fits : byLongest;

  // Some codes are shared by countries of very different size, and "+1 201…"
  // is a US number far more often than anything else. The preference list is
  // short on purpose: it exists so the common case reads right, not so the
  // uncommon one is claimed to be impossible.
  for (const preferred of PREFERRED[e164.slice(0, longest)] ?? []) {
    const match = pool.find((country) => country.code === preferred);
    if (match) return match;
  }

  // Otherwise stable and unsurprising: the alphabetically first plausible one.
  return [...pool].sort((a, b) => a.code.localeCompare(b.code))[0] ?? null;
}

/** A number as it would be dialled from outside the country. */
export function internationalPhone(e164: string, countryCode?: string | null): string {
  return formatPhone(e164, countryCode).international;
}
