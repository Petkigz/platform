import type { LocaleCode } from './locales.ts';

/**
 * The parts of translation that need no catalogue.
 *
 * `index.ts` imports every language's sentences, which is right on the server
 * and wrong in a browser: a client component that imported `fill` from there
 * asked the bundler for fifty-one catalogues to replace one `{name}`. These
 * three functions depend on nothing but the runtime, so a client component can
 * import them from here and bring nothing with it. `index.ts` re-exports them,
 * so server code does not have to know the difference.
 */

/**
 * Fill `{name}` placeholders.
 *
 * A placeholder with no value is left as it is, deliberately: `{year}` appearing
 * on a page is an obvious bug somebody fixes, where a silently empty string is a
 * sentence that reads strangely and is never reported.
 */
export function fill(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{([a-zA-Z][a-zA-Z0-9]*)\}/g, (whole, name: string) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : whole,
  );
}

/**
 * Which plural form a language wants for a count.
 *
 * `Intl.PluralRules` knows the rules; what this platform ships is **two forms**,
 * singular and plural. For English and most of the register that is the whole
 * system. For a language with a dual — Arabic says a different word for two
 * than for three — the count of two lands on the plural, which is why the shelf
 * also prints the number and never relies on the noun alone to say how many.
 * The limitation is written down in DECISIONS rather than discovered by an
 * Arabic reader counting two courses.
 */
export function pluralForm(code: LocaleCode, count: number): 'one' | 'other' {
  try {
    return new Intl.PluralRules(code).select(count) === 'one' ? 'one' : 'other';
  } catch {
    return count === 1 ? 'one' : 'other';
  }
}

/**
 * A number as this language writes it.
 *
 * Arabic writes ٢٤, Hindi २४, and a page that prints 24 in either is in English
 * with translated words around it. `Intl` is in the runtime, so there is no
 * table to maintain and no font that has to carry the digits.
 */
export function formatNumber(code: LocaleCode, value: number): string {
  try {
    return new Intl.NumberFormat(code).format(value);
  } catch {
    return String(value);
  }
}

/**
 * A percentage as this language writes it: "70%", "٪٧٠", "%70".
 *
 * Where the sign goes, and which sign it is, is part of the language. The
 * catalogue therefore never types a "%"; it has a `{percent}` and this fills it.
 */
export function formatPercent(code: LocaleCode, value: number): string {
  try {
    return new Intl.NumberFormat(code, { style: 'percent', maximumFractionDigits: 2 }).format(value / 100);
  } catch {
    return `${value}%`;
  }
}

/**
 * A moment, with the time zone it is given in said out loud.
 *
 * A deadline printed as "20 Nov, 21:00" is a claim about somebody's clock, and
 * a server does not know the reader's. It runs in UTC; a learner in Kampala is
 * three hours ahead, so an unlabelled time from the server told them a
 * deadline was at nine in the evening when it was at midnight. This always
 * prints the zone ("UTC", "GMT+3", "EAT"), so the same instant can be shown on
 * the server in UTC and in the browser in the reader's own zone and be true in
 * both places.
 *
 * `timeZone` omitted means the zone of whatever is running this: the reader's
 * in a browser. Pass `'UTC'` on a server.
 */
export function formatDateTime(code: LocaleCode | string, iso: string, timeZone?: string): string {
  const when = new Date(iso);
  if (Number.isNaN(when.getTime())) return '';
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
    ...(timeZone ? { timeZone } : {}),
  };
  try {
    return new Intl.DateTimeFormat(code, options).format(when);
  } catch {
    return new Intl.DateTimeFormat('en', options).format(when);
  }
}

/**
 * A calendar day that was stored with no time: the day a policy took effect.
 *
 * `effective_at` is a `date`. Through `formatDateTime` it would be printed
 * with a midnight and a zone that nobody stored, and in a browser west of
 * Greenwich it would be the day before. This reads the year, the month and
 * the day as they were written and prints that day, in the language's own
 * calendar and digits, with no clock on it.
 *
 * A value that is not a day is the empty string, as it is for a moment.
 */
export function formatDay(code: LocaleCode | string, day: string | null | undefined): string {
  const parts = /^(\d{4})-(\d{2})-(\d{2})(?:$|[T ])/u.exec(day ?? '');
  if (!parts) return '';
  const [year, month, date] = [Number(parts[1]), Number(parts[2]), Number(parts[3])];
  const when = new Date(Date.UTC(year, month - 1, date));
  // 2026-02-31 is not a day; `Date` would quietly make it the third of March.
  if (when.getUTCFullYear() !== year || when.getUTCMonth() !== month - 1 || when.getUTCDate() !== date) return '';
  const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' };
  try {
    return new Intl.DateTimeFormat(code, options).format(when);
  } catch {
    return new Intl.DateTimeFormat('en', options).format(when);
  }
}
