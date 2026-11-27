import type { LocaleCode } from './locales.ts';
import { THIN_LOCALES, type ThinLocale } from './thin-locales.ts';

/**
 * The parts of translation that need no catalogue.
 *
 * `index.ts` imports every language's sentences, which is right on the server
 * and wrong in a browser: a client component that imported `fill` from there
 * asked the bundler for fifty-one catalogues to replace one `{name}`. These
 * three functions depend on nothing but the runtime, so a client component can
 * import them from here and bring nothing with it. `index.ts` re-exports them,
 * so server code does not have to know the difference.
 *
 * **Twenty-seven languages are written from a table, not by the runtime.** A
 * server and a browser each carry their own copy of how a language writes a
 * number and a date, and Chromium's copy is thinner than Node's: for Uzbek,
 * Kazakh and Azerbaijani it has no month names ("2026 M11 20"); for Tajik,
 * Kyrgyz, Turkmen, Nepali and twenty more it has nothing and writes English;
 * and the decimal mark, the thousands mark and the digits go with them. A page
 * drawn on the server and then run in that browser said two different things,
 * and kept the browser's. For those languages (`thin-locales.ts`, read out of
 * Node's data by `scripts/generate-thin-locales.mjs`) every function below
 * writes from the table on both sides, and asks the runtime only for what
 * every runtime knows: the rounding of a number, the clock of a zone, and the
 * arithmetic of a calendar, each asked of English.
 */

/** The table for a language whose data a browser may not have, if it is one. */
function thin(code: string): ThinLocale | undefined {
  return Object.prototype.hasOwnProperty.call(THIN_LOCALES, code) ? THIN_LOCALES[code] : undefined;
}

/** 0 to 9 as the language counts, wherever they stand in a finished string. */
function inDigits(table: ThinLocale, text: string): string {
  const digits = table.digits;
  return digits ? text.replace(/[0-9]/g, (d) => [...digits][Number(d)] ?? d) : text;
}

/**
 * A number the runtime has already rounded and written plainly ("-1234.568"),
 * given the language's marks, groups and digits. The plain form comes from
 * English, which every runtime has whole, so the rounding is the runtime's
 * own and the same everywhere.
 */
function dressed(table: ThinLocale, plain: string): string {
  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(plain);
  // Not a plain number ("NaN", "∞"): say what the runtime said.
  if (!match) return plain;
  const [, sign, whole = '', fraction] = match;
  const [last, before] = table.groups;
  let grouped = whole;
  if (whole.length > last) {
    const tail = whole.slice(-last);
    let head = whole.slice(0, -last);
    const pieces: string[] = [];
    while (head.length > before) {
      pieces.unshift(head.slice(-before));
      head = head.slice(0, -before);
    }
    grouped = [head, ...pieces, tail].join(table.group);
  }
  const said = `${sign ? table.minus : ''}${grouped}${fraction ? `${table.decimal}${fraction}` : ''}`;
  return inDigits(table, said);
}

const DAY_PARTS: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'numeric', day: 'numeric' };
const CLOCK_PARTS: Intl.DateTimeFormatOptions = { ...DAY_PARTS, hourCycle: 'h23', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' };

/**
 * A formatter of English that answers in plain digits, in a zone and a
 * calendar. Making one is the slow part of writing a date, and a list of
 * forty rows asks for the same one forty times, so they are kept. There are
 * only as many as there are zones a process is asked about; the cap is for a
 * server that is asked about all of them.
 */
const englishFormatters = new Map<string, Intl.DateTimeFormat>();
function english(calendar: string, clock: boolean, timeZone?: string): Intl.DateTimeFormat {
  const tag = `en-US-u-ca-${calendar}-nu-latn`;
  const parts = clock ? CLOCK_PARTS : DAY_PARTS;
  // No zone named is the device's own, which a traveller's device changes
  // without telling anyone; that one is asked afresh every time.
  if (!timeZone) return new Intl.DateTimeFormat(tag, parts);
  const key = `${calendar}|${clock ? 'clock' : 'day'}|${timeZone}`;
  let formatter = englishFormatters.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(tag, { ...parts, timeZone });
    if (englishFormatters.size >= 256) englishFormatters.clear();
    englishFormatters.set(key, formatter);
  }
  return formatter;
}

function partsOf(formatter: Intl.DateTimeFormat, when: Date): Record<string, string> {
  const parts: Record<string, string> = {};
  for (const part of formatter.formatToParts(when)) parts[part.type] = part.value;
  return parts;
}

/** The year, month and day of an instant in a zone, by the language's calendar. */
function calendarDay(table: ThinLocale, when: Date, timeZone?: string) {
  const parts = partsOf(english(table.calendar, false, timeZone), when);
  return { y: String(Number(parts.year)), m: table.months[Number(parts.month) - 1] ?? '', d: String(Number(parts.day)) };
}

/**
 * What a clock on the wall says in a zone, and what the zone is called.
 *
 * Asked of English, which every runtime has whole. The zone's distance from
 * UTC is worked out from the clock rather than read from the runtime's name
 * for it, because runtimes do not agree on the name: one writes "GMT" for the
 * meridian and another "GMT+0", and an older one has no such form at all.
 */
function wallClock(table: ThinLocale, when: Date, timeZone?: string) {
  const parts = partsOf(english('gregory', true, timeZone), when);
  // Midnight is "24" in a few old runtimes even when asked for 0 to 23.
  const hour = Number(parts.hour) % 24;
  const minute = Number(parts.minute);
  const wall = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), hour, minute);
  const offset = Math.round(wall / 60_000) - Math.floor(when.getTime() / 60_000);
  let zone: string;
  if (parts.timeZoneName === 'UTC') {
    // UTC itself has a name.
    zone = table.utc;
  } else {
    // Every other zone is its distance from the meridian: "GMT+5", "GMT-3",
    // "GMT+5:45", "GMT+0". Node's data has letters for a few zones in a few of
    // these languages ("EEST"); the distance is never wrong, and it is the
    // same on both sides.
    const size = Math.abs(offset);
    const minutes = size % 60;
    zone = `${table.gmt}${offset < 0 ? '-' : '+'}${Math.floor(size / 60)}${minutes ? `${table.gmtMinutes}${String(minutes).padStart(2, '0')}` : ''}`;
  }
  return {
    H: String(hour).padStart(2, '0'),
    k: String(hour),
    h: String(hour % 12 || 12),
    a: table.halves ? table.halves[hour < 12 ? 0 : 1] : '',
    M: String(minute).padStart(2, '0'),
    z: zone,
  };
}

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
 * table to maintain and no font that has to carry the digits. (Seven
 * languages are the exception; see the head of this file.)
 *
 * `options` is for the few numbers with a fixed number of decimals, such as an
 * average rating: "4.3", "4,3", "४.३".
 */
export function formatNumber(code: LocaleCode, value: number, options?: { minimumFractionDigits?: number; maximumFractionDigits?: number }): string {
  try {
    // Not a number, or no end to it: the table has no word for either.
    const table = Number.isFinite(value) ? thin(code) : undefined;
    if (table) return dressed(table, new Intl.NumberFormat('en', { ...options, useGrouping: false }).format(value));
    return new Intl.NumberFormat(code, options).format(value);
  } catch {
    return String(value);
  }
}

/**
 * A size on a device: "900 KB", "5.0 MB", "٢٫٥٠ GB".
 *
 * The number is the language's own; the unit is the three Latin letters every
 * phone's storage screen prints, because that is what the reader will compare
 * it with. (Asking the runtime for the unit gave a different word in Node and
 * in a browser for several languages, and no word at all in others.) The
 * rounding is `describeBytes`'s in `offline.ts`: never "0 KB" for a file that
 * exists, one decimal for megabytes, two for gigabytes.
 */
export function formatBytes(code: LocaleCode, bytes: number): string {
  const MB = 1024 * 1024;
  if (bytes < MB) return `${formatNumber(code, Math.max(1, Math.round(bytes / 1024)))} KB`;
  if (bytes < MB * 1024) return `${formatNumber(code, bytes / MB, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} MB`;
  return `${formatNumber(code, bytes / (MB * 1024), { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GB`;
}

/**
 * A percentage as this language writes it: "70%", "٪٧٠", "%70".
 *
 * Where the sign goes, and which sign it is, is part of the language. The
 * catalogue therefore never types a "%"; it has a `{percent}` and this fills it.
 */
export function formatPercent(code: LocaleCode, value: number): string {
  try {
    const table = Number.isFinite(value) ? thin(code) : undefined;
    if (table) {
      const plain = new Intl.NumberFormat('en', { style: 'percent', maximumFractionDigits: 2, useGrouping: false }).format(value / 100);
      return inDigits(table, table.percent.replace('{n}', dressed({ ...table, digits: null }, plain.replace('%', ''))));
    }
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
  const table = thin(code);
  if (table) {
    try {
      return inDigits(table, fill(table.moment, { ...calendarDay(table, when, timeZone), ...wallClock(table, when, timeZone) }));
    } catch {
      // A zone the runtime does not know: fall through to what it would have said.
    }
  }
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
  const table = thin(code);
  if (table) {
    return inDigits(table, fill(table.day, calendarDay(table, when, 'UTC')));
  }
  const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' };
  try {
    return new Intl.DateTimeFormat(code, options).format(when);
  } catch {
    return new Intl.DateTimeFormat('en', options).format(when);
  }
}
