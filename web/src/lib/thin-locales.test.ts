import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { formatDateTime, formatDay, formatNumber, formatPercent } from './i18n/format.ts';
import { LOCALES } from './i18n/locales.ts';
import { THIN_LOCALES, THIN_SOURCE } from './i18n/thin-locales.ts';

/**
 * Numbers and dates in the languages a browser has no data for.
 *
 * Three kinds of test. The first kind holds on any Node: sentences written
 * out here by hand, which is what a page shows. The second compares the table
 * with the language data of the Node that is running, and only means something
 * when that data is the version the table was read from, so it says which it
 * found. The third keeps the list of languages honest.
 */

const THIN = Object.keys(THIN_LOCALES);
/** The languages a learner can actually read the site in, of the ones in the table. */
const WRITTEN = ['uz', 'kk', 'az', 'tg', 'ky', 'tk', 'ne'];
/**
 * Measured on 2026-11-25, Chromium 158 against Node 22 (ICU 78.2): the browser
 * writes these the same as the server, so they are left to the runtime.
 */
const WHOLE = [
  'en', 'ar', 'ur', 'fa', 'sw', 'am', 'af', 'ny', 'tr', 'id', 'ms', 'bn', 'hi', 'fa-af', 'ta', 'th', 'dv',
  'zh-hans', 'zh-hant', 'vi', 'fil', 'fr', 'es', 'pt',
];
const SAME_DATA = process.versions.icu === THIN_SOURCE.icu;

const MOMENT: Intl.DateTimeFormatOptions = {
  year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
};
/** Zones Node's data has no letters for in any of these languages. */
const PLAIN_ZONES = [
  'UTC', 'Etc/UTC', 'Etc/GMT', 'Africa/Kampala', 'Africa/Abidjan', 'Africa/Lagos', 'Asia/Almaty', 'Asia/Tashkent',
  'Asia/Baku', 'Asia/Dushanbe', 'Asia/Bishkek', 'Asia/Ashgabat', 'Asia/Kathmandu', 'Asia/Kolkata', 'Asia/Kabul',
  'Asia/Tehran', 'Asia/Tokyo', 'Australia/Lord_Howe', 'Pacific/Chatham', 'America/Caracas', 'America/St_Johns',
];

test('every listed language is either left to the runtime, by measurement, or written from the table', () => {
  const listed = LOCALES.map((l) => l.code as string).sort();
  assert.deepEqual([...WHOLE, ...THIN].sort(), listed);
  assert.equal(THIN.length, 27);
  assert.equal(WHOLE.length, 24);
  for (const code of WRITTEN) assert.ok(THIN.includes(code), code);
});

test('a moment in the seven written languages, as a page shows it', () => {
  const iso = '2026-03-05T07:04:00.000Z';
  const expected: Record<string, [string, string]> = {
    uz: ['5-mar, 2026, 07:04 (UTC)', '5-mar, 2026, 12:04 (GMT+5)'],
    kk: ['2026 ж. 5 нау., 07:04 UTC', '2026 ж. 5 нау., 12:04 GMT+5'],
    az: ['5 mar 2026, 07:04 UTC', '5 mar 2026, 12:04 GMT+5'],
    tg: ['5 Мар 2026, 07:04 UTC', '5 Мар 2026, 12:04 GMT+5'],
    ky: ['2026-ж. 5-мар. 07:04 UTC', '2026-ж. 5-мар. 12:04 GMT+5'],
    tk: ['5 mart 2026, 07:04 UTC', '5 mart 2026, 12:04 GMT+5'],
    ne: ['२०२६ मार्च ५, ०७:०४ UTC', '२०२६ मार्च ५, १२:०४ GMT+५'],
  };
  for (const [code, [utc, almaty]] of Object.entries(expected)) {
    assert.equal(formatDateTime(code, iso, 'UTC'), utc, code);
    assert.equal(formatDateTime(code, iso, 'Asia/Almaty'), almaty, code);
  }
  // What the fault looked like: no month, or English.
  for (const code of WRITTEN) {
    const said = formatDateTime(code, '2026-12-05T12:28:00.000Z', 'Asia/Almaty');
    assert.doesNotMatch(said, /M12|Dec|PM/, `${code}: ${said}`);
  }
});

test('the clock is the zone\'s own: the day turns, quarter hours, the west, the meridian', () => {
  // Five to midnight in UTC is tomorrow morning in Kathmandu, and still the afternoon in Caracas.
  const iso = '2026-12-31T23:55:00.000Z';
  assert.equal(formatDateTime('az', iso, 'Asia/Kathmandu'), '1 yan 2027, 05:40 GMT+5:45');
  assert.equal(formatDateTime('az', iso, 'America/Caracas'), '31 dek 2026, 19:55 GMT-4');
  assert.equal(formatDateTime('az', iso, 'America/St_Johns'), '31 dek 2026, 20:25 GMT-3:30');
  assert.equal(formatDateTime('az', iso, 'Africa/Abidjan'), '31 dek 2026, 23:55 GMT+0');
  assert.equal(formatDateTime('az', iso, 'Etc/UTC'), '31 dek 2026, 23:55 UTC');
  assert.equal(formatDateTime('ne', iso, 'Asia/Kathmandu'), '२०२७ जनवरी १, ०५:४० GMT+५:४५');
  // Midnight is 00, not 24.
  assert.equal(formatDateTime('uz', '2026-06-01T00:00:00.000Z', 'UTC'), '1-iyn, 2026, 00:00 (UTC)');
  // Summer time moves the distance, not the name.
  assert.equal(formatDateTime('tk', '2026-01-15T12:00:00.000Z', 'Europe/Berlin'), '15 ýan 2026, 13:00 GMT+1');
  assert.equal(formatDateTime('tk', '2026-07-15T12:00:00.000Z', 'Europe/Berlin'), '15 iýul 2026, 14:00 GMT+2');
  // No zone handed over is the runtime's own zone, which is what a browser passes.
  const own = new Intl.DateTimeFormat().resolvedOptions().timeZone;
  assert.equal(formatDateTime('kk', iso), formatDateTime('kk', iso, own));
  assert.equal(formatDateTime('uz', 'not a date'), '');
});

test('a twelve-hour clock, a name for UTC, and another calendar', () => {
  assert.equal(formatDateTime('om', '2026-03-05T00:04:00.000Z', 'UTC'), 'Bitootessa 5, 2026, 12:04 WD UTC');
  assert.equal(formatDateTime('om', '2026-03-05T12:04:00.000Z', 'UTC'), 'Bitootessa 5, 2026, 12:04 WB UTC');
  assert.equal(formatDateTime('so', '2026-03-05T19:04:00.000Z', 'UTC'), 'Mar 5, 2026 ee 7:04 GD Waqtiga UTC');
  assert.equal(formatDateTime('so', '2026-03-05T19:04:00.000Z', 'Africa/Mogadishu'), 'Mar 5, 2026 ee 10:04 GD GMT+3');
  // The first day of 1405 by the calendar Pashto counts in, on either side of it.
  assert.equal(formatDay('ps', '2026-03-20'), 'AP ۱۴۰۴ کب ۲۹');
  assert.equal(formatDay('ps', '2026-03-21'), 'AP ۱۴۰۵ وری ۱');
  assert.equal(formatDateTime('ps', '2026-03-20T19:30:00.000Z', 'Asia/Kabul'), 'AP ۱۴۰۵ وری ۱ ۰:۰۰ GMT+۴:۳۰');
  assert.equal(formatDateTime('si', '2026-03-05T07:04:00.000Z', 'Asia/Colombo'), '2026 මැදින් 5, ග්‍රිමවේ+5.30 12.34');
  assert.equal(formatDateTime('my', '2026-03-05T07:04:00.000Z', 'UTC'), '၂၀၂၆ မတ် ၅ UTC ၀၇:၀၄');
});

test('a day, a number and a percentage in the seven written languages', () => {
  assert.equal(formatDay('uz', '2026-11-20'), '20-noy, 2026');
  assert.equal(formatDay('kk', '2026-11-20'), '2026 ж. 20 қар.');
  assert.equal(formatDay('az', '2026-11-20'), '20 noy 2026');
  assert.equal(formatDay('tg', '2026-11-20'), '20 Ноя 2026');
  assert.equal(formatDay('ky', '2026-11-20'), '2026-ж. 20-ноя.');
  assert.equal(formatDay('tk', '2026-11-20'), '20 noý 2026');
  assert.equal(formatDay('ne', '2026-11-20'), '२०२६ नोभेम्बर २०');
  // A day that is not one is still nothing, and a timestamp is still its UTC day.
  assert.equal(formatDay('uz', '2026-02-31'), '');
  assert.equal(formatDay('uz', '2026-11-20T23:59:00+05:00'), '20-noy, 2026');

  const space = '\u00a0';
  assert.equal(formatNumber('uz', 1234567.5), `1${space}234${space}567,5`);
  assert.equal(formatNumber('kk', 12345), `12${space}345`);
  assert.equal(formatNumber('az', 1234567.5), '1.234.567,5');
  assert.equal(formatNumber('tg', -1234.5), `-1${space}234,5`);
  assert.equal(formatNumber('ky', 999), '999');
  assert.equal(formatNumber('tk', 0.125), '0,125');
  // Nepali counts in lakhs: three digits, then twos.
  assert.equal(formatNumber('ne', 1234567), '१२,३४,५६७');
  assert.equal(formatNumber('ne', 4.3), '४.३');
  // Three decimals at most, rounded by the runtime, as everywhere else.
  assert.equal(formatNumber('az', 1234.5678), '1.234,568');
  assert.equal(formatNumber('az', 4, { minimumFractionDigits: 1, maximumFractionDigits: 1 }), '4,0');
  assert.equal(formatNumber('ne', 4.25, { minimumFractionDigits: 1, maximumFractionDigits: 1 }), '४.३');
  assert.equal(formatNumber('ps', -1234.5), '\u200e-\u200e۱٬۲۳۴٫۵');

  assert.equal(formatPercent('uz', 70), '70%');
  assert.equal(formatPercent('tk', 70), `70${space}%`);
  assert.equal(formatPercent('az', 12.5), '12,5%');
  assert.equal(formatPercent('ne', 100), '१००%');
  assert.equal(formatPercent('ps', 12.5), '۱۲٫۵٪');
});

test('a language that is not in the table is still written by the runtime', () => {
  assert.equal(formatNumber('en', 1234567.5), '1,234,567.5');
  assert.equal(formatNumber('en', 4, { minimumFractionDigits: 1, maximumFractionDigits: 1 }), '4.0');
  assert.equal(formatPercent('en', 70), '70%');
  assert.equal(formatDay('en', '2026-11-20'), 'Nov 20, 2026');
  assert.equal(formatNumber('ar', 12), new Intl.NumberFormat('ar').format(12));
  // And a name an object happens to have is not a language.
  assert.equal(formatNumber('toString' as never, 1234), '1,234');
});

test(`the table is what Node says, when Node's data is the table's (ICU ${process.versions.icu} here, ${THIN_SOURCE.icu} there)`, async (t) => {
  if (!SAME_DATA) {
    t.skip(`this Node carries ICU ${process.versions.icu}; the table was read from ${THIN_SOURCE.icu}. Run node scripts/generate-thin-locales.mjs and read the difference.`);
    return;
  }
  const generator = (await import(new URL('../../../scripts/generate-thin-locales.mjs', import.meta.url).href)) as {
    render: () => string;
    THIN_CODES: string[];
  };
  assert.deepEqual(generator.THIN_CODES, THIN);
  assert.equal(readFileSync(new URL('./i18n/thin-locales.ts', import.meta.url), 'utf8'), generator.render());

  let compared = 0;
  for (const code of THIN) {
    for (const zone of PLAIN_ZONES) {
      const said = new Intl.DateTimeFormat(code, { ...MOMENT, timeZone: zone });
      for (let month = 0; month < 12; month += 1) {
        for (const [day, hour, minute] of [[1, 0, 0], [5, 7, 4], [15, 12, 30], [20, 19, 45], [28, 23, 59]] as const) {
          const when = new Date(Date.UTC(2026, month, day, hour, minute));
          assert.equal(formatDateTime(code, when.toISOString(), zone), said.format(when), `${code} ${zone}`);
          compared += 1;
        }
      }
    }
    const day = new Intl.DateTimeFormat(code, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
    // Every day of two years, so that every month of either calendar starts and ends.
    for (let n = 0; n < 731; n += 1) {
      const when = new Date(Date.UTC(2026, 0, 1 + n));
      assert.equal(formatDay(code, when.toISOString().slice(0, 10)), day.format(when), code);
      compared += 1;
    }
    const number = new Intl.NumberFormat(code);
    for (const value of [0, 7, 12, 999, 1000, 1234, 12345, 123456, 1234567, 12345678, 1234567890123, 4.3, -5, -1234.5, 0.125, 1234.5678, 2.5, 0.0004, -0.0001, 1e21, Number.NaN, Number.POSITIVE_INFINITY]) {
      assert.equal(formatNumber(code as never, value), number.format(value), `${code} ${value}`);
      compared += 1;
    }
    const one = new Intl.NumberFormat(code, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    for (const value of [0, 4, 4.25, 4.3, 4.35, 5]) {
      assert.equal(formatNumber(code as never, value, { minimumFractionDigits: 1, maximumFractionDigits: 1 }), one.format(value), `${code} ${value}`);
      compared += 1;
    }
    const percent = new Intl.NumberFormat(code, { style: 'percent', maximumFractionDigits: 2 });
    for (const value of [0, 0.004, 12.5, 33.333, 70, 99.999, 100, 1250, 123456, -4]) {
      assert.equal(formatPercent(code as never, value), percent.format(value / 100), `${code} ${value}`);
      compared += 1;
    }
  }
  t.diagnostic(`${compared} forms compared with Node`);
  assert.ok(compared > 50_000, String(compared));
});

test('a zone Node has letters for is written as its distance, on purpose', (t) => {
  // Kazakh in Cairo, in summer: three hours east, whatever it is called.
  const iso = '2026-07-15T22:40:00.000Z';
  assert.equal(formatDateTime('kk', iso, 'Africa/Cairo'), '2026 ж. 16 шіл., 01:40 GMT+3');
  assert.equal(formatDateTime('om', '2026-01-15T10:20:00.000Z', 'America/New_York'), 'Ama 15, 2026, 5:20 WD GMT-5');
  if (!SAME_DATA) {
    t.diagnostic('Node\'s own name for these zones was not compared: its data is not the table\'s.');
    return;
  }
  const node = (code: string, zone: string, at: string) => new Intl.DateTimeFormat(code, { ...MOMENT, timeZone: zone }).format(new Date(at));
  assert.equal(node('kk', 'Africa/Cairo', iso), '2026 ж. 16 шіл., 01:40 EEST');
  assert.equal(node('om', 'America/New_York', '2026-01-15T10:20:00.000Z'), 'Ama 15, 2026, 5:20 WD EST');
  // That is all the difference there is: the clock and the day agree in every zone Node knows.
  const strip = (said: string, code: string) => said.slice(0, said.lastIndexOf(code === 'si' || code === 'my' ? '\u0000' : ' '));
  let lettered = 0;
  for (const code of THIN) {
    if (code === 'si' || code === 'my' || code === 'uz') continue; // The zone is not the last word there.
    for (const zone of Intl.supportedValuesOf('timeZone')) {
      for (const at of ['2026-01-15T10:20:00.000Z', iso]) {
        const ours = formatDateTime(code, at, zone);
        const theirs = node(code, zone, at);
        if (ours === theirs) continue;
        lettered += 1;
        assert.equal(strip(ours, code), strip(theirs, code), `${code} ${zone}`);
      }
    }
  }
  assert.ok(lettered > 0);
});

test('nothing that writes a number or a date for a page asks the runtime in the reader\'s language first', () => {
  const source = readFileSync(new URL('./i18n/format.ts', import.meta.url), 'utf8');
  for (const name of ['formatNumber', 'formatPercent', 'formatDateTime', 'formatDay']) {
    const start = source.indexOf(`export function ${name}(`);
    assert.ok(start > 0, name);
    const body = source.slice(start, source.indexOf('\n}\n', start));
    const table = body.indexOf('thin(code)');
    const runtime = body.search(/new Intl\.\w+\(code/);
    assert.ok(table > 0 && runtime > table, `${name} looks in the table before it asks the runtime`);
  }
  // The component that writes the reader's own clock goes through it.
  const local = readFileSync(new URL('../components/local-time.tsx', import.meta.url), 'utf8');
  const code = local.split('\n').filter((line) => !/^\s*(\*|\/\/|\/\*)/.test(line)).join('\n');
  assert.match(code, /formatDateTime\(locale, iso\)/);
  assert.doesNotMatch(code, /Intl\.|toLocale/);
});
