import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';

import {
  LOCALES,
  companionMessagesFor,
  coverageOf,
  heldSections,
  isHeld,
  languageShownFor,
  localeByCode,
  messagesFor,
  shellMessagesFor,
  translator,
  writtenTranslator,
  type LocaleCode,
} from './i18n/index.ts';
import { CATALOGUES, WRITTEN } from './i18n/messages/catalogues.ts';
import { en } from './i18n/messages/en.ts';
import { HELD_FOR_REVIEW } from './i18n/messages/held.ts';
import { auditAll } from './translation-audit.ts';
import { SECTIONS } from './translations.ts';

// Owner's decision, 2026-11-16: a language the builder cannot write properly
// falls back to English until a first-language speaker has reviewed it. These
// tests pin what that means on a page, and what it must never mean.

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
const held = Object.entries(HELD_FOR_REVIEW) as [LocaleCode, readonly string[]][];
const companionKeys = (Object.keys(en) as (keyof typeof en)[]).filter((k) => k.startsWith('companion.'));

test('the hold list names real languages and real parts, once each', () => {
  const codes = new Set<string>(LOCALES.map((l) => l.code));
  const parts = new Set(SECTIONS.map((s) => s.prefix));
  assert.ok(held.length > 0, 'nothing is held, so this file tests nothing');
  for (const [code, sections] of held) {
    assert.ok(codes.has(code), `${code} is held but is not a language the site offers`);
    assert.notEqual(code, 'en', 'English is the source; there is nothing to fall back to');
    assert.ok(sections.length > 0, `${code} is listed with nothing held — delete the line`);
    assert.equal(new Set(sections).size, sections.length, `${code} holds a part twice`);
    for (const section of sections) {
      assert.ok(parts.has(section), `${code} holds "${section}", which is not a part of the interface`);
    }
    assert.deepEqual(heldSections(code), sections);
  }
  assert.deepEqual(heldSections('en'), []);
  assert.deepEqual(heldSections('ar'), []);
});

test('the frame can never be held', () => {
  // A reader has to be able to find the language page, read in their own
  // language that nobody has reviewed it, and leave for another language. A
  // hold that took the navigation or the language page with it would strand
  // the very reader it was meant to protect.
  const frame = ['skip', 'nav', 'footer', 'action', 'region', 'language', 'auth'];
  for (const [code, sections] of held) {
    for (const section of frame) {
      assert.ok(!sections.includes(section), `${code} holds "${section}", which a reader needs to find their way`);
    }
    const served = CATALOGUES[code] ?? {};
    for (const key of ['language.coverage', 'language.unreviewed', 'language.notTranslated'] as const) {
      assert.ok(served[key], `${code} cannot say ${key} in its own language`);
    }
    // The sentence that tells them how much is in English still carries its number.
    assert.ok(served['language.coverage']?.includes('{percent}'));
  }
});

test('a held sentence is shown in English, everywhere a reader can meet it', () => {
  for (const [code, sections] of held) {
    const t = translator(code);
    const all = messagesFor(code);
    const companion = companionMessagesFor(code);
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      if (!sections.includes(key.split('.')[0] ?? '')) continue;
      assert.equal(isHeld(code, key), true);
      assert.equal(CATALOGUES[code]?.[key], undefined, `${code}.${key} is held but still served`);
      assert.equal(t(key), en[key], `${code}.${key} is held but t() does not return English`);
      assert.equal(all[key], en[key]);
    }
    // What the three companion pages hand their tools: English, whole.
    if (sections.includes('companion')) {
      assert.equal(Object.keys(companion).length, companionKeys.length);
      for (const key of companionKeys) assert.equal(companion[key], en[key], `${code}.${key}`);
    }
    // And the frame around them is untouched: still the reader's language.
    assert.notEqual(shellMessagesFor(code)['language.title'], en['language.title'], `${code} lost its frame`);
  }
});

test('held is not deleted: the draft is kept for the person who will correct it', () => {
  for (const [code, sections] of held) {
    const draft = writtenTranslator(code);
    let differs = 0;
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      if (!sections.includes(key.split('.')[0] ?? '')) continue;
      const written = WRITTEN[code]?.[key];
      assert.ok(written && written.trim() !== '', `${code}.${key} is held, but there is no draft to review`);
      assert.equal(draft(key), written);
      if (written !== en[key]) differs += 1;
    }
    assert.ok(differs > 0, `${code}: the held draft is English, so there is nothing to hold`);
  }
  // Outside a hold the two translators are the same function.
  for (const code of ['sw', 'ar', 'ta'] as const) {
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      assert.equal(writtenTranslator(code)(key), translator(code)(key));
    }
  }
  assert.equal(writtenTranslator('en')('companion.prayerTitle'), en['companion.prayerTitle']);
});

test('a language that is not held is served exactly what was written', () => {
  for (const locale of LOCALES) {
    if (locale.code === 'en' || HELD_FOR_REVIEW[locale.code]) continue;
    assert.deepEqual(CATALOGUES[locale.code], WRITTEN[locale.code], `${locale.code} lost sentences it should be shown`);
    assert.equal(coverageOf(locale.code).held, 0);
  }
  // Twenty-seven languages still read the companion tools in their own words.
  const served = LOCALES.filter(
    (l) => l.code !== 'en' && CATALOGUES[l.code]?.['companion.prayerTitle'] !== undefined,
  );
  assert.equal(served.length, 27);
  assert.equal(held.length, 23);
});

test('the four placeholder languages are held, and none of the held is called reviewed', () => {
  // Wolof, Fulfulde, Bambara and Dhivehi were written to make a count pass.
  for (const code of ['wo', 'ff', 'bm', 'dv'] as const) {
    assert.ok(HELD_FOR_REVIEW[code]?.includes('companion'), `${code} companion text is being served`);
  }
  // "Reviewed" and "held until reviewed" cannot both be true of one language.
  for (const [code] of held) {
    assert.equal(localeByCode(code).reviewed, false, `${code} is marked reviewed and still held — release it or unmark it`);
  }
});

test('the number on the language page describes the screen, not the file', () => {
  for (const [code] of held) {
    const coverage = coverageOf(code);
    assert.equal(coverage.held, companionKeys.length);
    assert.equal(coverage.translated + coverage.held, coverage.total);
    assert.ok(coverage.percent < 100, `${code} hides sentences and still says 100%`);
    assert.equal(coverage.percent, Math.round((coverage.translated / coverage.total) * 100));
  }
  // The page builds its "not complete" list from that number, so a held
  // language appears in it without being told to.
  const page = read('../app/language/page.tsx');
  assert.match(page, /entry\.coverage\.percent < 100/u);
  assert.match(page, /t\('language\.coverage', \{/u);
});

test('a held page says it is English, and reads left to right', () => {
  // Dhivehi and Pashto are right-to-left. Their document says so; the held
  // companion pages inside it are English and must not inherit that.
  for (const code of ['dv', 'ps'] as const) {
    assert.equal(localeByCode(code).dir, 'rtl');
    const shown = languageShownFor(code, 'companion');
    assert.equal(shown.code, 'en');
    assert.equal(shown.dir, 'ltr');
    assert.equal(languageShownFor(code, 'nav').code, code);
  }
  assert.equal(languageShownFor('ar', 'companion').code, 'ar');
  assert.equal(languageShownFor('ar', 'companion').dir, 'rtl');
  assert.equal(languageShownFor('en', 'companion').code, 'en');
  for (const path of ['prayer-times', 'hijri', 'counter']) {
    const page = read(`../app/companion/${path}/page.tsx`);
    assert.match(page, /const shown = languageShownFor\(locale, 'companion'\);/u, path);
    assert.match(page, /companion-page" lang=\{shown\.code\} dir=\{shown\.dir\}/u, path);
  }
});

test('the reviewer is handed the draft, and told readers cannot see it', () => {
  const sheet = read('../app/contribute/page.tsx');
  assert.match(sheet, /const current = target \? writtenTranslator\(target\.code\) : null;/u);
  assert.match(sheet, /const held = target \? isHeld\(target\.code, `\$\{section\.prefix\}\.`\) : false;/u);
  assert.match(sheet, /\{held && \(/u);
  assert.match(sheet, /Readers do not see this part in \{target\.englishName\} yet\./u);
  // The route compares a submission with the same text the sheet prefilled, or
  // every untouched line of a held part would arrive as a proposed change.
  const route = read('../app/api/contribute/route.ts');
  assert.match(route, /const current = writtenTranslator\(locale\.code\);/u);
  assert.doesNotMatch(route, /[^n]translator\(locale\.code\)/u);
  // The companion tools are a part a reviewer can pick, under a name.
  const part = SECTIONS.find((s) => s.prefix === 'companion');
  assert.equal(part?.keys.length, companionKeys.length);
  assert.notEqual(part?.label, 'companion');
  // And the operator's audit reads the files, so a held draft with a problem
  // is still listed rather than reported as eighty missing sentences.
  const audit = read('./translation-audit.ts');
  assert.match(audit, /Object\.entries\(WRITTEN\)/u);
  for (const summary of auditAll({})) {
    const missingCompanion = summary.findings.filter(
      (f) => f.kind === 'missing' && f.key.startsWith('companion.'),
    );
    assert.deepEqual(missingCompanion, [], `${summary.locale}: the audit thinks held text does not exist`);
  }
});

test('no page reaches past the hold', () => {
  // `WRITTEN` and `writtenTranslator` are for correcting a language. A learner's
  // page that used them would show exactly the sentences that are being held.
  const allowed = new Set([
    'app/contribute/page.tsx',
    'app/api/contribute/route.ts',
    'app/admin/translations/page.tsx',
    'app/admin/translations/audit-panel.tsx',
    'lib/translation-audit.ts',
    'lib/i18n/index.ts',
    'lib/i18n/messages/catalogues.ts',
    'lib/i18n/messages/held.ts',
  ]);
  const root = new URL('../', import.meta.url);
  const walk = (dir: string): string[] =>
    readdirSync(new URL(dir, root), { withFileTypes: true }).flatMap((entry) =>
      entry.isDirectory()
        ? walk(`${dir}${entry.name}/`)
        : /\.(ts|tsx)$/u.test(entry.name) && !/\.test\.ts$/u.test(entry.name)
          ? [`${dir}${entry.name}`]
          : [],
    );
  const offenders = walk('').filter(
    (file) => !allowed.has(file) && /\bWRITTEN\b|writtenTranslator/u.test(readFileSync(new URL(file, root), 'utf8')),
  );
  assert.deepEqual(offenders, []);
});
