import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { en } from './i18n/messages/en.ts';
import { COMPANION } from './i18n/messages/companion.ts';
import { CATALOGUES } from './i18n/messages/catalogues.ts';
import { LOCALES, companionMessagesFor, messagesFor, playerMessagesFor, shellMessagesFor } from './i18n/index.ts';

// The companion tools were the last English-only screens. These tests pin the
// two halves of the fix: the catalogue carries every sentence, and the
// components ask the catalogue for them instead of writing them inline.

const tool = readFileSync(new URL('../app/companion/prayer-times/tool.tsx', import.meta.url), 'utf8');
const hijriView = readFileSync(new URL('../app/companion/hijri/view.tsx', import.meta.url), 'utf8');
const counter = readFileSync(new URL('../app/companion/counter/counter.tsx', import.meta.url), 'utf8');
const prayerPage = readFileSync(new URL('../app/companion/prayer-times/page.tsx', import.meta.url), 'utf8');
const hijriPage = readFileSync(new URL('../app/companion/hijri/page.tsx', import.meta.url), 'utf8');
const counterPage = readFileSync(new URL('../app/companion/counter/page.tsx', import.meta.url), 'utf8');
const dashboard = readFileSync(new URL('../app/learn/page.tsx', import.meta.url), 'utf8');

// "Has a translation" is a statement about the file. Whether a reader is shown
// it is a separate decision, made in `held.ts` and pinned in
// `held-translations.test.ts`: twenty-three of these fifty are drafts kept back.
test('every companion key in English has a translation in all fifty languages', () => {
  const keys = Object.keys(en).filter((k) => k.startsWith('companion.'));
  assert.ok(keys.length > 0, 'no companion keys in en.ts');
  for (const [locale, catalogue] of Object.entries(COMPANION)) {
    for (const key of keys) {
      assert.ok((catalogue as Record<string, string>)[key], `${locale} is missing ${key}`);
    }
  }
});

test('the companion catalogue is registered in the merged catalogue', () => {
  assert.equal(CATALOGUES['ar']?.['companion.prayerTitle'], COMPANION['ar']?.['companion.prayerTitle']);
  assert.equal(CATALOGUES['sw']?.['companion.counterOne'], COMPANION['sw']?.['companion.counterOne']);
});

test('the prayer tool asks the catalogue for every sentence it shows', () => {
  assert.match(tool, /useT\(\)/);
  assert.match(tool, /useLocaleCode\(\)/);
  // No English sentence is left inline: the only string literals are keys,
  // ids, and the Moonsighting Committee method name from the calculation lib.
  const inline = tool.match(/>([A-Z][^<{]{8,})</g) ?? [];
  assert.deepEqual(inline, []);
  for (const key of ['companion.prayerHeading', 'companion.prayerCalculate', 'companion.prayerZoneConfirm', 'companion.prayerMsgIncomplete']) {
    assert.ok(tool.includes(`t('${key}'`), `tool never asks for ${key}`);
  }
});

test('the hijri view and counter ask the catalogue for their sentences', () => {
  assert.match(hijriView, /useT\(\)/);
  assert.match(hijriView, /t\('companion\.hijriHeading'\)/);
  assert.match(hijriView, /t\('companion\.hijriLoading'\)/);
  assert.match(counter, /useT\(\)/);
  assert.match(counter, /t\('companion\.counterOne'\)/);
  assert.match(counter, /t\('companion\.counterConfirmQuestion'\)/);
});

test('the three companion pages and the dashboard cards are translated', () => {
  for (const page of [prayerPage, hijriPage, counterPage]) {
    assert.match(page, /chooseLocale\(/);
    assert.match(page, /translator\(locale\)/);
    assert.match(page, /t\('companion\.eyebrow'\)/);
    assert.match(page, /t\('companion\.backToLearning'\)/);
  }
  assert.match(prayerPage, /t\('companion\.prayerTitle'\)/);
  assert.match(hijriPage, /t\('companion\.hijriTitle'\)/);
  assert.match(counterPage, /t\('companion\.counterTitle'\)/);
  assert.match(dashboard, /t\('companion\.cardPrayerBody'\)/);
  assert.match(dashboard, /t\('companion\.cardHijriBody'\)/);
  assert.match(dashboard, /t\('companion\.cardCounterBody'\)/);
});

test('the tab title is the page heading, in the same language', () => {
  for (const [page, key] of [
    [prayerPage, 'companion.prayerTitle'],
    [hijriPage, 'companion.hijriTitle'],
    [counterPage, 'companion.counterTitle'],
  ] as const) {
    assert.doesNotMatch(page, /export const metadata\s*=/u, `${key}: the title is a fixed string again`);
    assert.match(page, /export async function generateMetadata\(\): Promise<Metadata>/u);
    assert.ok(page.includes(`return { title: translator(code)('${key}') };`), `${key} is not the tab title`);
    assert.ok(page.includes(`<h1>{t('${key}')}</h1>`), `${key} is not the heading`);
  }
});

test('no English companion sentence is left inline in the components', () => {
  // A sentence that survives in a component is a sentence that never gets
  // translated. The catalogue is the one place English lives. The dashboard
  // carries other screens' English too, which is not this unit's scope, so
  // only its companion cards are checked here.
  for (const [name, source] of Object.entries({ tool, hijriView, counter, prayerPage, hijriPage, counterPage })) {
    const inline = source.match(/>([A-Z][^<{]{8,})</g) ?? [];
    assert.deepEqual(inline, [], `${name} still writes English inline: ${inline.join(' | ')}`);
  }
  const cards = dashboard.match(/\{prayerTimesOn && \([\s\S]*?\{counterOn && \([\s\S]*?\)\}/);
  assert.ok(cards, 'could not find the companion cards on the dashboard');
  const inline = cards[0].match(/>([A-Z][^<{]{8,})</g) ?? [];
  assert.deepEqual(inline, [], `dashboard companion cards still write English inline: ${inline.join(' | ')}`);
});

test('no other page pays for the companion sentences', () => {
  // The layout serialises its catalogue into every page. The companion tools
  // are a third of all the words and ship switched off, so the shell leaves
  // them out and the three companion pages hand them to their own tool.
  const layout = readFileSync(new URL('../app/layout.tsx', import.meta.url), 'utf8');
  assert.match(layout, /messages=\{shellMessagesFor\(code\)\}/);
  assert.doesNotMatch(layout, /messages=\{messagesFor\(code\)\}/);
  for (const locale of LOCALES) {
    const shell = shellMessagesFor(locale.code);
    const companion = companionMessagesFor(locale.code);
    assert.equal(Object.keys(shell).some((k) => k.startsWith('companion.')), false, `${locale.code} shell carries companion sentences`);
    assert.equal(Object.keys(companion).every((k) => k.startsWith('companion.')), true);
    // Nothing is lost between the halves. The third is the learner dashboard,
    // the course page, the lesson page's frame, the assessment page, the
    // assignment page, the page for a wrong address, the account page, the
    // family page, the buy page, the page for closing an account, the two
    // pages for a copy of your data, the reading settings, the page that
    // puts a copy back, the phone number card, the merge screen and the two
    // sharing screens and the two invitation screens, which are
    // rendered on the server and so are in neither (see
    // `SERVER_ONLY_PREFIXES`).
    const whole = messagesFor(locale.code);
    const onServer = (k: string) =>
      ['learn.', 'course.', 'lesson.', 'assess.', 'assign.', 'missing.', 'account.', 'family.', 'buy.', 'close.', 'export.', 'reading.', 'restore.', 'phone.', 'merge.', 'share.', 'refer.', 'sponsor.', 'orders.', 'billing.', 'receipt.', 'notify.', 'plans.', 'subs.', 'policy.', 'inst.', 'tapply.', 'board.', 'translate.', 'kid.', 'tq.', 'prog.', 'cert.', 'handover.', 'guard.', 'verify.'].some((prefix) => k.startsWith(prefix));
    const serverOnly = Object.fromEntries(Object.entries(whole).filter(([k]) => onServer(k)));
    assert.equal(Object.keys(serverOnly).length, 1955);
    // The page for a page that broke is drawn in the browser, so its ten
    // sentences are the one learner part the shell does carry.
    assert.equal(Object.keys(shell).filter((k) => k.startsWith('broke.')).length, 10, locale.code);
    assert.equal(Object.keys(shell).some(onServer), false, `${locale.code} shell carries dashboard, course, lesson or assessment sentences`);
    // The players' sentences are the fourth part: for the browser, so not
    // server-only, and too many for every page, so not in the shell either.
    // The lesson page hands them to a provider of its own.
    const player = playerMessagesFor(locale.code);
    assert.equal(Object.keys(player).length, 86, locale.code);
    assert.equal(Object.keys(player).every((k) => k.startsWith('player.')), true);
    assert.equal(Object.keys(shell).some((k) => k.startsWith('player.')), false, `${locale.code} shell carries the players' sentences`);
    assert.deepEqual({ ...shell, ...companion, ...serverOnly, ...player }, whole);
  }
  for (const [page, component] of [[prayerPage, 'PrayerTimesTool'], [hijriPage, 'HijriDate'], [counterPage, 'Counter']] as const) {
    assert.ok(
      page.includes(`<I18nProvider locale={locale} messages={companionMessagesFor(locale)}><${component} /></I18nProvider>`),
      `${component} is rendered without its sentences`,
    );
  }
  // A nested provider adds sentences and never takes one away.
  const client = readFileSync(new URL('./i18n/client.tsx', import.meta.url), 'utf8');
  assert.match(client, /return parent \? parent\.t\(key, vars\) : fill\(en\[key\], vars\);/);
});
