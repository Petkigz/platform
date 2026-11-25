// Does a real browser write a number, a day and a moment the way the server does?
//
// `web/src/lib/i18n/format.ts` is run twice, here in Node and inside the
// browser, on the same values in all fifty-one listed languages, and the two
// answers are compared. A page drawn on the server and then run in a browser
// shows a reader whichever of the two the browser wrote, and reports an error
// when they differ; this is the only check that sees both.
//
// Two verdicts. For the languages written from the table (`thin-locales.ts`)
// any difference fails: the table exists so that there is none, in any
// browser. For the languages left to the runtime a difference is printed and
// counted but does not fail, because it depends on which language data this
// browser and this Node happen to carry, and a newer Chrome on the build
// machine is not a fault in the repository. Read the count.
//
// Set RESPONSIVE_PLAYWRIGHT (playwright-core's index.mjs) and RESPONSIVE_CHROME.
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { pathToFileURL } from 'node:url';

const modulePath = process.env.RESPONSIVE_PLAYWRIGHT;
const chromePath = process.env.RESPONSIVE_CHROME;
if (!modulePath || !chromePath) throw new Error('Set RESPONSIVE_PLAYWRIGHT and RESPONSIVE_CHROME');

const root = new URL('../web/src/lib/i18n/', import.meta.url);
const plain = (name) => stripTypeScriptTypes(readFileSync(new URL(name, root), 'utf8'));
// The two files as one script: no imports, no exports, the functions in scope.
const source = [plain('thin-locales.ts'), plain('format.ts')].join('\n')
  .replace(/^import .*$/gm, '')
  .replace(/^export /gm, '');
for (const name of ['formatDateTime', 'formatDay', 'formatNumber', 'formatPercent', 'pluralForm', 'THIN_LOCALES']) {
  if (!new RegExp(`(function|const) ${name}\\b`).test(source)) throw new Error(`format.ts no longer has ${name}`);
}

const here = await import(new URL('format.ts', root).href);
const { THIN_LOCALES } = await import(new URL('thin-locales.ts', root).href);
const { LOCALES } = await import(new URL('locales.ts', root).href);
const codes = LOCALES.map((l) => l.code);
const thin = new Set(Object.keys(THIN_LOCALES));

/** Every value written every way, as [what it is, what was written]. Runs on both sides. */
function everything(f, codes, ownZone) {
  const out = {};
  for (const code of codes) {
    const rows = [];
    const moments = ['2026-01-01T00:00:00.000Z', '2026-03-05T07:04:00.000Z', '2026-03-20T19:30:00.000Z', '2026-07-15T12:00:00.000Z', '2026-11-20T19:45:00.000Z', '2026-12-31T23:59:00.000Z'];
    for (const zone of ['UTC', 'Africa/Kampala', 'Asia/Almaty', 'Asia/Kathmandu', 'Asia/Kabul', 'America/Caracas', 'Africa/Abidjan']) {
      for (const iso of moments) rows.push([`moment ${iso} in ${zone}`, f.formatDateTime(code, iso, zone)]);
    }
    // No zone named: the device's own, which is how a page shows a class time.
    for (const iso of moments) rows.push([`moment ${iso} on the device's clock (${ownZone})`, f.formatDateTime(code, iso)]);
    for (const day of ['2026-01-09', '2026-03-20', '2026-03-21', '2026-05-28', '2026-11-20']) rows.push([`day ${day}`, f.formatDay(code, day)]);
    for (const value of [0, 7, 12, 999, 1000, 1234, 12345, 1234567, 4.3, -5, -1234.5, 0.125, 1234.5678]) rows.push([`number ${value}`, f.formatNumber(code, value)]);
    for (const value of [4, 4.25, 4.3]) rows.push([`number ${value} to one place`, f.formatNumber(code, value, { minimumFractionDigits: 1, maximumFractionDigits: 1 })]);
    for (const value of [0, 12.5, 70, 100, 1250]) rows.push([`percent ${value}`, f.formatPercent(code, value)]);
    for (const value of [0, 1, 2, 3, 5, 11, 21, 100, 101]) rows.push([`plural ${value}`, f.pluralForm(code, value)]);
    out[code] = rows;
  }
  return out;
}

const { chromium } = await import(pathToFileURL(modulePath).href);
const browser = await chromium.launch({ executablePath: chromePath, headless: true, args: ['--no-sandbox'] });
let failed = 0;
let tolerated = 0;
let compared = 0;
const differing = new Set();
try {
  // A browser in UTC is what a build machine is; the other two are where readers are.
  for (const zone of ['UTC', 'Asia/Almaty', 'Asia/Kathmandu']) {
    const context = await browser.newContext({ timezoneId: zone });
    const page = await context.newPage();
    const there = await page.evaluate(
      `(() => { ${source}\n return (${everything.toString()})({ formatDateTime, formatDay, formatNumber, formatPercent, pluralForm }, ${JSON.stringify(codes)}, ${JSON.stringify(zone)}); })()`,
    );
    // Node is asked for the zone by name where the browser was left to find its own.
    const asked = everything({ ...here, formatDateTime: (code, iso, named) => here.formatDateTime(code, iso, named ?? zone) }, codes, zone);
    for (const code of codes) {
      const rows = asked[code];
      if (rows.length !== there[code].length) throw new Error(`${code}: the two sides were asked different questions`);
      for (let i = 0; i < rows.length; i += 1) {
        compared += 1;
        if (rows[i][1] === there[code][i][1]) continue;
        differing.add(code);
        const line = `${code}, browser in ${zone}, ${rows[i][0]}: server ${JSON.stringify(rows[i][1])}, browser ${JSON.stringify(there[code][i][1])}`;
        if (thin.has(code)) {
          failed += 1;
          console.error(`DIFFERENT ${line}`);
        } else {
          tolerated += 1;
          if (tolerated <= 40) console.log(`differs (left to the runtime) ${line}`);
        }
      }
    }
    await context.close();
  }
  const version = browser.version();
  const whole = codes.filter((code) => !thin.has(code));
  console.log(`${compared} answers compared in ${codes.length} languages: browser ${version}, Node ${process.version} (ICU ${process.versions.icu}).`);
  console.log(`From the table (${thin.size} languages): ${failed} different.`);
  console.log(`Left to the runtime (${whole.length} languages): ${tolerated} different${tolerated ? `, in ${whole.filter((c) => differing.has(c)).join(' ')}` : ''}.`);
  if (tolerated && process.env.GITHUB_ACTIONS) {
    console.log(`::warning title=Numbers and dates::This browser writes ${tolerated} of the compared numbers and dates differently from the server in ${whole.filter((c) => differing.has(c)).join(' ')}. Those languages are left to the runtime; see scripts/number-date-browser-check.mjs.`);
  }
} finally {
  await browser.close();
}
if (failed) {
  console.error('NUMBER AND DATE CHECK FAILED: a language written from the table came out differently in the browser.');
  process.exit(1);
}
console.log('NUMBER AND DATE CHECK PASSED');
