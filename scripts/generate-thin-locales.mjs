// Writes web/src/lib/i18n/thin-locales.ts: how twenty-seven languages write a
// number, a day and a moment, read out of this Node's own language data.
//
// Why a table. Chromium carries less language data than Node. Measured on
// 2026-11-25 (Chromium 158 against Node 22, ICU 78.2), all fifty-one languages
// the site lists: twenty-four are written the same by both. For Uzbek, Kazakh
// and Azerbaijani the browser has no month names and writes "2026 M11 20"; for
// Tajik, Kyrgyz, Turkmen, Nepali and the rest of the list below it has nothing
// and writes English; and the decimal mark, the thousands mark and the digits
// (Nepali, Burmese, Pashto) are the root's. A page drawn on the server and
// then run in that browser therefore says two different things, and the
// browser's is the worse one. With the table both sides write from the same
// data, and ask their runtime only for what every runtime knows.
//
// Run: node scripts/generate-thin-locales.mjs          (writes the file)
//      node scripts/generate-thin-locales.mjs --check  (exits 1 if it would change)
//
// The table is only as new as the Node that wrote it; its header says which.
// `thin-locales.test.ts` compares every form with the running Node when their
// language data is the same version, and says so when it is not.
// `scripts/number-date-browser-check.mjs` compares both with a real browser.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// The first seven are among the languages the site is written in. The rest
// are listed and held: every sentence of theirs is still English, and their
// numbers and dates are already their own.
export const THIN_CODES = [
  'uz', 'kk', 'az', 'tg', 'ky', 'tk', 'ne',
  'ha', 'yo', 'ig', 'wo', 'ff', 'bm', 'rw', 'lg', 'zu', 'xh', 'sn', 'st', 'ln', 'mg', 'si', 'my',
  'om', 'so', 'ti', 'ps',
];

const DAY = { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' };
const MOMENT = { ...DAY, hour: 'numeric', minute: '2-digit', timeZoneName: 'short' };

function fail(message) {
  throw new Error(`generate-thin-locales: ${message}`);
}

/** The ten digits a language counts with, or null when they are 0 to 9. */
function digitsOf(code) {
  const said = new Intl.NumberFormat(code, { useGrouping: false }).format(1234567890);
  const digits = [...said];
  if (digits.length !== 10) fail(`${code}: ten digits came out as ${said}`);
  const ordered = [digits[9], ...digits.slice(0, 9)].join('');
  return ordered === '0123456789' ? null : ordered;
}

export function describeLocale(code) {
  const resolved = new Intl.DateTimeFormat(code, MOMENT).resolvedOptions();
  if (!resolved.locale.toLowerCase().startsWith(code)) fail(`${code}: this Node has no data for it (${resolved.locale})`);
  const calendar = resolved.calendar;
  if (calendar !== 'gregory' && calendar !== 'persian') fail(`${code}: a calendar this table does not carry: ${calendar}`);
  const twelve = resolved.hourCycle === 'h12';
  if (!twelve && resolved.hourCycle !== 'h23') fail(`${code}: a clock this table does not carry: ${resolved.hourCycle}`);

  const digits = digitsOf(code);
  const ascii = (value) => (digits ? [...value].map((ch) => (digits.includes(ch) ? String(digits.indexOf(ch)) : ch)).join('') : value);

  const dayFormat = new Intl.DateTimeFormat(code, DAY);
  const momentFormat = new Intl.DateTimeFormat(code, MOMENT);
  const part = (formatter, when, type) => formatter.formatToParts(when).find((p) => p.type === type)?.value ?? '';

  // The number of the month in the language's own calendar, asked of English.
  const monthNumber = new Intl.DateTimeFormat(`en-US-u-ca-${calendar}-nu-latn`, { month: 'numeric', timeZone: 'UTC' });
  const months = Array.from({ length: 12 }, () => '');
  for (let day = 0; day < 366; day += 1) {
    const when = new Date(Date.UTC(2026, 0, 1 + day));
    const index = Number(part(monthNumber, when, 'month')) - 1;
    const name = part(dayFormat, when, 'month');
    if (months[index] && months[index] !== name) fail(`${code}: month ${index + 1} has two names`);
    months[index] = name;
  }
  if (months.some((m) => !m) || new Set(months).size !== 12) fail(`${code}: the months are ${JSON.stringify(months)}`);

  // Which hole the hour is: two digits of twenty-four, plain twenty-four, or plain twelve.
  const hourHole = (() => {
    const said = [0, 7, 12, 19, 23].map((h) => ascii(part(momentFormat, new Date(Date.UTC(2026, 2, 5, h, 4)), 'hour')));
    const forms = {
      '{H}': (h) => String(h).padStart(2, '0'),
      '{k}': (h) => String(h),
      '{h}': (h) => String(h % 12 || 12),
    };
    const found = Object.keys(forms).filter((hole) => [0, 7, 12, 19, 23].every((h, i) => forms[hole](h) === said[i]));
    if (found.length !== 1 || (found[0] === '{h}') !== twelve) fail(`${code}: the hours are written ${said.join(' ')}`);
    return found[0];
  })();
  const HOLE = { year: '{y}', month: '{m}', day: '{d}', hour: hourHole, minute: '{M}', timeZoneName: '{z}', dayPeriod: '{a}' };
  const templateOf = (formatter, when) => formatter.formatToParts(when).map((p) => {
    // An era is the same word for every year a reader will meet ("AP").
    if (p.type === 'literal' || p.type === 'era') {
      if (/[{}]/.test(p.value)) fail(`${code}: a brace in the pattern`);
      // The language data has a narrow no-break space in places ("2026 ж.").
      // `format()` hands the page an ordinary space there and `formatToParts()`
      // does not; the table says what `format()` said, which is what the pages
      // have always shown.
      return p.value.replaceAll('\u202f', ' ');
    }
    const hole = HOLE[p.type];
    if (!hole) fail(`${code}: a part this table does not carry: ${p.type}`);
    return hole;
  }).join('');

  const sample = new Date(Date.UTC(2026, 2, 5, 7, 4));
  const day = templateOf(dayFormat, sample);
  const moment = templateOf(momentFormat, sample);
  const halves = new Set();
  const afternoons = new Set();
  // One pattern for every month, day and hour, or a table of one pattern is wrong.
  for (let m = 0; m < 12; m += 1) {
    for (const d of [1, 5, 20, 28]) {
      for (const h of [0, 7, 11, 12, 19, 23]) {
        const when = new Date(Date.UTC(2026, m, d, h, 4));
        if (templateOf(dayFormat, when) !== day) fail(`${code}: the day's pattern changes with the date`);
        if (templateOf(momentFormat, when) !== moment) fail(`${code}: the moment's pattern changes with the date`);
        if (ascii(part(momentFormat, when, 'minute')) !== '04') fail(`${code}: the minute is not two digits`);
        if (calendar === 'gregory') {
          if (ascii(part(dayFormat, when, 'day')) !== String(d)) fail(`${code}: the day is padded`);
          if (ascii(part(momentFormat, when, 'year')) !== '2026') fail(`${code}: the year is not written plainly`);
        }
        if (twelve) (h < 12 ? halves : afternoons).add(part(momentFormat, when, 'dayPeriod'));
      }
    }
  }
  if (twelve && (halves.size !== 1 || afternoons.size !== 1)) fail(`${code}: the halves of the day have several names`);

  // What the language calls a zone: "UTC", and "GMT+5" for everywhere else.
  const zoneName = (zone, when = sample) => ascii(part(new Intl.DateTimeFormat(code, { ...MOMENT, timeZone: zone }), when, 'timeZoneName'));
  const utc = zoneName('UTC');
  const five = zoneName('Etc/GMT-5');
  if (!five.endsWith('+5')) fail(`${code}: five hours east is written ${five}`);
  const gmt = five.slice(0, -2);
  if (zoneName('Etc/GMT+3') !== `${gmt}-3`) fail(`${code}: three hours west is written ${zoneName('Etc/GMT+3')}`);
  const quarter = zoneName('Asia/Kathmandu');
  if (!quarter.startsWith(`${gmt}+5`) || !quarter.endsWith('45') || quarter.length !== gmt.length + 5) fail(`${code}: a quarter-hour zone is written ${quarter}`);
  const gmtMinutes = quarter.slice(gmt.length + 2, -2);
  if (zoneName('America/St_Johns') !== `${gmt}-3${gmtMinutes}30`) fail(`${code}: a half-hour zone to the west is written ${zoneName('America/St_Johns')}`);
  if (zoneName('Africa/Abidjan') !== `${gmt}+0`) fail(`${code}: the meridian itself is written ${zoneName('Africa/Abidjan')}`);
  // Node's data has letters for a few zones in a few languages (Kazakh says
  // "EEST" in Cairo, Oromo "EST" in New York). The table does not carry them:
  // every zone but UTC is written as its distance, which is never wrong and is
  // the same on both sides. `thin-locales.test.ts` pins the difference.

  const number = new Intl.NumberFormat(code);
  const parts = number.formatToParts(-1234567890123.5);
  const only = (type) => {
    const found = [...new Set(parts.filter((p) => p.type === type).map((p) => p.value))];
    if (found.length !== 1) fail(`${code}: ${type} is ${JSON.stringify(found)}`);
    return found[0];
  };
  const integers = parts.filter((p) => p.type === 'integer').map((p) => p.value.length);
  if (integers.length < 3) fail(`${code}: a long number is not grouped`);
  const groups = [integers.at(-1), integers.at(-2)];
  if (number.formatToParts(1234).filter((p) => p.type === 'group').length !== 1) fail(`${code}: four digits are not grouped`);

  // Everything a negative number has in front of it: the sign, and for a
  // language written right to left the marks that keep the sign on its side.
  const first = parts.findIndex((p) => p.type === 'integer');
  const minus = parts.slice(0, first).map((p) => p.value).join('');
  if (!parts.slice(0, first).some((p) => p.type === 'minusSign')) fail(`${code}: the minus is not in front`);
  if (!['integer', 'fraction'].includes(parts.at(-1).type)) fail(`${code}: something follows a number`);
  if (number.formatToParts(5).length !== 1) fail(`${code}: something surrounds a plain number`);

  const percentParts = new Intl.NumberFormat(code, { style: 'percent', maximumFractionDigits: 2 }).formatToParts(0.7);
  let seen = false;
  const percent = percentParts.map((p) => {
    if (p.type === 'literal' || p.type === 'percentSign') return p.value;
    if (seen) fail(`${code}: the percentage has two numbers in it`);
    seen = true;
    return '{n}';
  }).join('');

  return {
    calendar,
    months,
    day,
    moment,
    halves: twelve ? [[...halves][0], [...afternoons][0]] : null,
    utc,
    gmt,
    gmtMinutes,
    decimal: only('decimal'),
    group: only('group'),
    groups,
    minus,
    percent,
    digits,
  };
}

/** A string as TypeScript source, with every character that would not show written as its number. */
function quote(value) {
  return `'${[...value].map((ch) => {
    const point = ch.codePointAt(0);
    if (ch === '\'' || ch === '\\') return `\\${ch}`;
    // A no-break space looks like a space in an editor and is not one; a
    // direction mark or a joiner does not look like anything.
    if (ch !== ' ' && /[\p{Cf}\p{Zs}\p{Cc}]/u.test(ch)) return `\\u${point.toString(16).padStart(4, '0')}`;
    return ch;
  }).join('')}'`;
}

export function render() {
  const lines = [
    '// GENERATED by scripts/generate-thin-locales.mjs. Do not edit: run the script.',
    '//',
    '// How twenty-seven languages write a number, a day and a moment, for the',
    '// runtimes that do not know. See `format.ts` for why, and the script for how.',
    '',
    '/** The Node whose language data this was read from. */',
    `export const THIN_SOURCE = { icu: '${process.versions.icu}', cldr: '${process.versions.cldr}' } as const;`,
    '',
    'export type ThinLocale = {',
    '  /** The calendar the language counts its years by. */',
    '  calendar: \'gregory\' | \'persian\';',
    '  /** The twelve months of that calendar, as the short date writes them. */',
    '  months: readonly string[];',
    '  /** A day: `{y}` `{m}` `{d}`. */',
    '  day: string;',
    '  /**',
    '   * A moment: the day\'s holes; the hour as `{H}` (00 to 23), `{k}` (0 to 23)',
    '   * or `{h}` (1 to 12) with `{a}` the half of the day; `{M}`; `{z}` the zone.',
    '   */',
    '  moment: string;',
    '  /** Before noon and after it, for a language that counts to twelve. */',
    '  halves: readonly [string, string] | null;',
    '  /** What UTC is called. */',
    '  utc: string;',
    '  /** What stands where English has "GMT" in "GMT+5". */',
    '  gmt: string;',
    '  /** What stands between the hours and the minutes in "GMT+5:45". */',
    '  gmtMinutes: string;',
    '  decimal: string;',
    '  group: string;',
    '  /** How many digits in the last group, and in each group before it. */',
    '  groups: readonly [number, number];',
    '  minus: string;',
    '  /** A percentage: `{n}`. */',
    '  percent: string;',
    '  /** Zero to nine, when they are not 0 to 9. */',
    '  digits: string | null;',
    '};',
    '',
    'export const THIN_LOCALES: Readonly<Record<string, ThinLocale>> = {',
  ];
  for (const code of THIN_CODES) {
    const l = describeLocale(code);
    lines.push(
      `  ${code}: {`,
      `    calendar: '${l.calendar}',`,
      `    months: [${l.months.map(quote).join(', ')}],`,
      `    day: ${quote(l.day)},`,
      `    moment: ${quote(l.moment)},`,
      `    halves: ${l.halves ? `[${l.halves.map(quote).join(', ')}]` : 'null'},`,
      `    utc: ${quote(l.utc)},`,
      `    gmt: ${quote(l.gmt)},`,
      `    gmtMinutes: ${quote(l.gmtMinutes)},`,
      `    decimal: ${quote(l.decimal)},`,
      `    group: ${quote(l.group)},`,
      `    groups: [${l.groups[0]}, ${l.groups[1]}],`,
      `    minus: ${quote(l.minus)},`,
      `    percent: ${quote(l.percent)},`,
      `    digits: ${l.digits === null ? 'null' : quote(l.digits)},`,
      '  },',
    );
  }
  lines.push('};', '');
  return lines.join('\n');
}

export const TARGET = fileURLToPath(new URL('../web/src/lib/i18n/thin-locales.ts', import.meta.url));

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const next = render();
  if (process.argv.includes('--check')) {
    let now = '';
    try { now = readFileSync(TARGET, 'utf8'); } catch { /* absent */ }
    if (now !== next) {
      console.error('thin-locales.ts is not what this Node would write. Run node scripts/generate-thin-locales.mjs and read the difference.');
      process.exit(1);
    }
    console.log('thin-locales.ts is what this Node would write.');
  } else {
    writeFileSync(TARGET, next);
    console.log(`wrote ${TARGET} from ICU ${process.versions.icu}, CLDR ${process.versions.cldr}`);
  }
}
