/**
 * Where the request came from.
 *
 * The platform charges in the buyer's currency at the buyer's country's price,
 * and the only signal it has before a payment provider is connected is the
 * network address the request arrived on. The hosting layer resolves that into
 * a country header — Vercel sets `x-vercel-ip-country`, Cloudflare sets
 * `cf-ipcountry` — and this module reads it.
 *
 * Three things it deliberately is not:
 *
 *   - **A security boundary.** The header is set by the platform the app runs
 *     on, not by the browser, but nothing here can verify that. It is a hint
 *     the order writer uses once, to establish a country on an account that has
 *     none; after that the account's recorded country is authoritative and only
 *     staff can change it.
 *   - **A geolocator.** No lookup service, no database, no latency and no cost.
 *     A request from a network the host cannot place has no country, which is a
 *     legitimate answer — the catalogue's default price applies.
 *   - **Trusted for placeholders.** Both CDNs use `XX` for "unknown", and
 *     Cloudflare uses `T1` for Tor and `A1`/`A2` for anonymising proxies. Those
 *     are not countries, and treating them as one would put a buyer on a price
 *     set for a market nobody chose.
 */

/** Headers known to carry a country, most specific first. */
export const COUNTRY_HEADERS = [
  'x-vercel-ip-country',
  'cf-ipcountry',
  'x-geo-country',
  'x-country-code',
] as const;

/**
 * Codes that mean "not a country". `XX` is the ISO user-assigned placeholder
 * both CDNs use; the others are the anonymous-network markers MaxMind-derived
 * geolocation emits.
 */
const NOT_A_COUNTRY = new Set(['XX', 'T1', 'A1', 'A2', 'O1']);

/**
 * The country a request arrived from, or `null`.
 *
 * Accepts anything with a `get` method, so this works with the web `Headers`,
 * a `Request`'s headers and a plain map in a test. Upper-cases and trims,
 * because a proxy is not required to be tidy.
 */
export function countryFromHeaders(
  headers: { get(name: string): string | null } | null | undefined,
): string | null {
  if (!headers) return null;

  for (const name of COUNTRY_HEADERS) {
    const raw = headers.get(name);
    if (!raw) continue;

    const code = raw.trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(code)) continue;
    if (NOT_A_COUNTRY.has(code)) continue;

    return code;
  }

  return null;
}

/**
 * A country, for display. The alpha-2 codes the platform stores are not names,
 * and "Priced for UG" is not a sentence a parent should have to decode. This is
 * deliberately a short list of the markets the platform is built for rather
 * than a bundled ISO table; an unknown code falls back to the code itself,
 * which is honest and costs nothing.
 */
const COUNTRY_NAMES: Record<string, string> = {
  AE: 'the United Arab Emirates',
  AU: 'Australia',
  BD: 'Bangladesh',
  CA: 'Canada',
  DE: 'Germany',
  EG: 'Egypt',
  FR: 'France',
  GB: 'the United Kingdom',
  ID: 'Indonesia',
  IN: 'India',
  KE: 'Kenya',
  MY: 'Malaysia',
  NG: 'Nigeria',
  NL: 'the Netherlands',
  PK: 'Pakistan',
  QA: 'Qatar',
  SA: 'Saudi Arabia',
  SG: 'Singapore',
  TZ: 'Tanzania',
  TR: 'Türkiye',
  UG: 'Uganda',
  US: 'the United States',
  ZA: 'South Africa',
};

export function countryName(code: string | null | undefined): string | null {
  if (!code) return null;
  const upper = code.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(upper)) return null;
  return COUNTRY_NAMES[upper] ?? upper;
}
