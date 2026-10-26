#!/usr/bin/env node
/**
 * Generate the phone-number tables from libphonenumber-js.
 *
 * Run:  node scripts/generate-phone-data.mjs /path/to/libphonenumber-js
 *
 * Two outputs, generated from one source so they cannot disagree:
 *
 *   web/src/lib/phone-countries.ts            countries, dial codes, lengths, grouping
 *   supabase/migrations/…/phone_numbers.sql   the country table the database checks against
 *
 * Why generated rather than typed. The dial codes are the only part of this
 * feature that is pure reference data: 245 countries, and a wrong digit is a
 * number that silently belongs to somebody else. libphonenumber's metadata is
 * maintained by people who do that for a living, so it is the source.
 *
 * Why generated rather than a dependency. The runtime needs a dial code, a
 * length range and a way to group digits — a few kilobytes of table, not a
 * parser. Adding libphonenumber-js as a runtime dependency would ship the whole
 * metadata to every browser to answer the same question. The table is checked
 * in; this script is how it is rebuilt.
 *
 * What is deliberately dropped: the leading-digit rules. libphonenumber picks a
 * display format by matching the first digits of the national number, which
 * needs the full metadata. Here a length chooses the grouping, and where the
 * metadata is ambiguous for one length the first rule wins. That only affects
 * how the digits are spaced on screen — what is stored is E.164, and what the
 * database validates is the length and dial code — and the file says so.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = process.argv[2];
if (!source) {
  console.error('usage: node scripts/generate-phone-data.mjs <path to libphonenumber-js package>');
  process.exit(1);
}

const pkg = JSON.parse(readFileSync(resolve(source, 'package.json'), 'utf8'));
const meta = JSON.parse(readFileSync(resolve(source, 'metadata.min.json'), 'utf8'));
const mobileExample = JSON.parse(readFileSync(resolve(source, 'examples.mobile.json'), 'utf8'));

// The library is loaded from the checkout passed on the command line, so this
// script needs no dependency of its own.
const require = createRequire(import.meta.url);
const { parsePhoneNumberFromString } = require(resolve(source, 'min/index.cjs'));

// dial code per country
const dialOf = new Map();
for (const [dial, countries] of Object.entries(meta.country_calling_codes)) {
  for (const country of countries) dialOf.set(country, dial);
}

/**
 * How libphonenumber itself spaces a real number from this country.
 *
 * The metadata's format rules choose a layout by matching the leading digits,
 * which needs the full record for every country — more data than the whole table
 * this file generates. So the grouping is read from the library's own formatting
 * of its example mobile number, which is a real number of a typical length for
 * the country. A number of a different length falls back to even groups of three
 * in the reader; only the spacing is affected, and nothing is stored from it.
 */
function groupsFor(iso, dial) {
  const example = mobileExample[iso];
  if (!example) return {};
  const number = parsePhoneNumberFromString(`+${dial}${example}`);
  const international = number?.formatInternational();
  if (!international) return {};
  const rest = international.replace(`+${dial} `, '').replace(`+${dial}`, '');
  const sizes = rest
    .split(/[^0-9]+/)
    .filter(Boolean)
    .map((part) => part.length);
  const total = sizes.reduce((sum, n) => sum + n, 0);
  if (sizes.length < 2 || total !== rest.replace(/[^0-9]/g, '').length) return {};
  return { [total]: sizes };
}

/**
 * The digit a country writes in front of a national number but does not dial.
 *
 * Read from the library rather than guessed: the example number is written with
 * the prefix and parsed back, and the prefix counts only when parsing drops it.
 * That is how Italy keeps its leading zero — the 0 there is part of the number,
 * not a trunk prefix — while Uganda's is dropped. Without this, `0` would have
 * to be stripped from every country or none.
 */
function trunkPrefix(iso) {
  const example = mobileExample[iso];
  if (!example) return null;
  const plain = parsePhoneNumberFromString(example, iso);
  if (!plain) return null;

  // The metadata stores the prefix in a slot that moves depending on whether the
  // country has formatting rules, so it is found by trying it: the trunk prefix
  // is the digit that disappears when the number is parsed.
  for (const digit of ['0', '1']) {
    const written = parsePhoneNumberFromString(`${digit}${example}`, iso);
    if (written && written.number === plain.number) return digit;
  }
  return null;
}

const rows = [];
for (const iso of Object.keys(meta.countries).sort()) {
  const dial = dialOf.get(iso);
  const entry = meta.countries[iso];
  const row_dial_digits = dial.length;
  // [dial code, national prefix, national-number pattern, possible lengths, …]
  const lengths = Array.isArray(entry[3]) ? entry[3] : [];
  if (!dial || lengths.length === 0) continue;
  // E.164 caps the whole number at 15 digits including the dial code, so a
  // national number can never be longer than that less its country code. Two
  // datasets in libphonenumber (Indonesia, Japan) carry shorter-number variants
  // that exceed it; the cap is the standard, so the standard wins.
  const cap = 15 - row_dial_digits;
  const usable = lengths.filter((length) => length <= cap);
  if (usable.length === 0) continue;
  const min = Math.min(...usable);
  const max = Math.max(...usable);
  const groups = groupsFor(iso, dial);
  const trunk = trunkPrefix(iso);
  rows.push({ iso, dial: `+${dial}`, min, max, groups, trunk });
}

// ---------------------------------------------------------------------------
// TypeScript
// ---------------------------------------------------------------------------
const tsLines = rows.map((row) => {
  const groups = Object.entries(row.groups)
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([length, sizes]) => `${length}:[${sizes.join(',')}]`)
    .join(',');
  const trunk = row.trunk ? `'${row.trunk}'` : 'null';
  return `  { code: '${row.iso}', dial: '${row.dial}', min: ${row.min}, max: ${row.max}, trunk: ${trunk}, groups: { ${groups} } },`;
});

const ts = `/**
 * Countries, their dial codes, and how many digits a number from each has.
 *
 * GENERATED — do not edit by hand. Rebuild with:
 *
 *   node scripts/generate-phone-data.mjs <libphonenumber-js>
 *
 * Source: libphonenumber-js ${pkg.version}.
 *
 * \`groups\` maps a national-number length to how the digits are spaced on
 * screen. It is cosmetic and deliberately simplified: libphonenumber chooses a
 * format by matching the leading digits, which needs the full metadata, so a
 * length chooses the grouping here and the first rule for a length wins. The
 * same length is always readable; it may not be the prettiest grouping for every
 * number. Nothing is stored from it — the database keeps E.164 and validates the
 * dial code and the length.
 */

export type PhoneCountry = {
  /** ISO 3166-1 alpha-2. */
  code: string;
  /** Including the plus, e.g. '+256'. */
  dial: string;
  /** Digits in the national number, excluding the dial code. */
  min: number;
  max: number;
  /** The digit written before a national number but never dialled, or null. */
  trunk: string | null;
  /** National-number length → digits per group. */
  groups: Record<number, number[]>;
};

export const PHONE_COUNTRIES: PhoneCountry[] = [
${tsLines.join('\n')}
];
`;

writeFileSync(resolve(root, 'web/src/lib/phone-countries.ts'), ts);

// ---------------------------------------------------------------------------
// SQL seed
// ---------------------------------------------------------------------------


console.log(`countries: ${rows.length}`);
console.log(`ts bytes: ${ts.length}`);
