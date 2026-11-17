import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';

import {
  LOCALES,
  chooseLocale,
  companionMessagesFor,
  coverageOf,
  heldSections,
  isHeld,
  isLocaleCode,
  isOfferedLocale,
  isWithheld,
  languageShownFor,
  localeByCode,
  localeGroups,
  matchLocale,
  messagesFor,
  shellMessagesFor,
  translatedLocales,
  translator,
  withheldLocales,
  writtenLocales,
  writtenTranslator,
  type LocaleCode,
} from './i18n/index.ts';
import { CATALOGUES, WRITTEN } from './i18n/messages/catalogues.ts';
import { en } from './i18n/messages/en.ts';
import { HELD_FOR_REVIEW, UNWRITTEN_WHILE_HELD, WHOLE_LANGUAGE, isUnwritten } from './i18n/messages/held.ts';
import { LEARN } from './i18n/messages/learn.ts';
import { COURSE } from './i18n/messages/course.ts';
import { auditAll } from './translation-audit.ts';
import { SECTIONS } from './translations.ts';

// Owner's decision, 2026-11-16: a language the builder cannot write properly
// falls back to English until a first-language speaker has reviewed it. These
// tests pin what that means on a page, and what it must never mean.
//
// There are two sizes of hold. Nineteen languages have one part held (the
// companion tools) and are otherwise shown in their own words. Four — Wolof,
// Fulfulde, Bambara and Dhivehi — are withheld whole, by the owner's second
// answer the same day, and are not offered to readers at all.

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
const held = Object.entries(HELD_FOR_REVIEW) as [LocaleCode, readonly string[]][];
const companionKeys = (Object.keys(en) as (keyof typeof en)[]).filter((k) => k.startsWith('companion.'));
const allKeys = Object.keys(en) as (keyof typeof en)[];
const unwrittenKeys = allKeys.filter((k) => UNWRITTEN_WHILE_HELD.includes(k.split('.')[0] ?? k));
const partly = held.filter(([code]) => !isWithheld(code));
const whole = held.filter(([code]) => isWithheld(code));

test('the hold list names real languages and real parts, once each', () => {
  const codes = new Set<string>(LOCALES.map((l) => l.code));
  const parts = new Set(SECTIONS.map((s) => s.prefix));
  assert.ok(held.length > 0, 'nothing is held, so this file tests nothing');
  for (const [code, sections] of held) {
    assert.ok(codes.has(code), `${code} is held but is not a language the site offers`);
    assert.notEqual(code, 'en', 'English is the source; there is nothing to fall back to');
    assert.ok(sections.length > 0, `${code} is listed with nothing held — delete the line`);
    assert.equal(new Set(sections).size, sections.length, `${code} holds a part twice`);
    if (sections.includes(WHOLE_LANGUAGE)) {
      // Whole means whole. "Everything, and also the footer" is a line somebody
      // half-edited, and the half that wins should not be a guess.
      assert.deepEqual(sections, [WHOLE_LANGUAGE], `${code} is withheld whole and also lists parts`);
    } else {
      for (const section of sections) {
        assert.ok(parts.has(section), `${code} holds "${section}", which is not a part of the interface`);
      }
    }
    assert.deepEqual(heldSections(code), sections);
  }
  assert.equal(partly.length + whole.length, held.length);
  assert.deepEqual(heldSections('en'), []);
  assert.deepEqual(heldSections('ar'), []);
});

test('a part can be held or a whole language withheld, and never the frame alone', () => {
  // A reader has to be able to find the language page, read in their own
  // language that nobody has reviewed it, and leave for another language. A
  // hold that took the navigation or the language page with it, and left the
  // language on offer, would strand the very reader it was meant to protect.
  // So there is nothing in between: either the frame is shown, or the language
  // is not offered at all (the test after next).
  const frame = ['skip', 'nav', 'footer', 'action', 'region', 'language', 'auth'];
  for (const [code, sections] of partly) {
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
    for (const key of allKeys) {
      const expected = isWithheld(code) || sections.includes(key.split('.')[0] ?? '');
      assert.equal(isHeld(code, key), expected, `${code}.${key}`);
      if (!expected) continue;
      assert.equal(CATALOGUES[code]?.[key], undefined, `${code}.${key} is held but still served`);
      assert.equal(t(key), en[key], `${code}.${key} is held but t() does not return English`);
      assert.equal(all[key], en[key]);
    }
    // What the three companion pages hand their tools: English, whole.
    assert.equal(Object.keys(companion).length, companionKeys.length);
    for (const key of companionKeys) assert.equal(companion[key], en[key], `${code}.${key}`);
  }
  // Where one part is held, the frame around it is untouched: still the
  // reader's language.
  for (const [code] of partly) {
    assert.notEqual(shellMessagesFor(code)['language.title'], en['language.title'], `${code} lost its frame`);
  }
  // Where the whole language is withheld, there is nothing of it left to serve:
  // not one sentence, by any of the three ways a page gets its words.
  for (const [code] of whole) {
    assert.deepEqual(CATALOGUES[code], {}, `${code} is withheld and still serves sentences`);
    assert.deepEqual(messagesFor(code), en);
    assert.deepEqual(shellMessagesFor(code), shellMessagesFor('en'));
  }
});

test('held is not deleted: the draft is kept for the person who will correct it', () => {
  for (const [code] of held) {
    const draft = writtenTranslator(code);
    let differs = 0;
    for (const key of allKeys) {
      if (!isHeld(code, key)) continue;
      const written = WRITTEN[code]?.[key];
      // A part that was never written has no draft to keep, and says so.
      if (isUnwritten(code, key)) {
        assert.equal(written, undefined, `${code}.${key} is listed as unwritten and has a sentence`);
        continue;
      }
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

test('the four placeholder languages are withheld whole, and none of the held is called reviewed', () => {
  // Wolof, Fulfulde, Bambara and Dhivehi were written to make a count pass.
  assert.deepEqual(whole.map(([code]) => code).sort(), ['bm', 'dv', 'ff', 'wo']);
  for (const code of ['wo', 'ff', 'bm', 'dv'] as const) {
    assert.equal(isWithheld(code), true, `${code} is being served`);
  }
  assert.equal(partly.length, 19);
  for (const [code, sections] of partly) assert.deepEqual(sections, ['companion'], code);
  // "Reviewed" and "held until reviewed" cannot both be true of one language.
  for (const [code] of held) {
    assert.equal(localeByCode(code).reviewed, false, `${code} is marked reviewed and still held — release it or unmark it`);
  }
});

test('the number on the language page describes the screen, not the file', () => {
  for (const [code] of partly) {
    const coverage = coverageOf(code);
    assert.equal(coverage.held, companionKeys.length);
    // Shown, held, or never written: every sentence is one of the three, and
    // only the first counts towards the number a reader is given.
    assert.equal(coverage.translated + coverage.held + unwrittenKeys.length, coverage.total);
    assert.ok(coverage.percent < 100, `${code} hides sentences and still says 100%`);
    assert.equal(coverage.percent, Math.round((coverage.translated / coverage.total) * 100));
  }
  // A withheld language is every sentence written and none shown, and the page
  // lists it at the 0% that is.
  for (const [code] of whole) {
    assert.deepEqual(coverageOf(code), {
      translated: 0,
      total: allKeys.length,
      percent: 0,
      held: allKeys.length - unwrittenKeys.length,
    });
  }
  // The page builds its "not complete" list from that number, so a held
  // language appears in it without being told to.
  const page = read('../app/language/page.tsx');
  assert.match(page, /entry\.coverage\.percent < 100/u);
  assert.match(page, /const incomplete = \[\.\.\.locales, \.\.\.withheldLocales\(\)\]/u);
  assert.match(page, /t\('language\.coverage', \{/u);
});

test('a held page says it is English, and reads left to right', () => {
  // Pashto is right-to-left with its companion text held. The document says
  // right-to-left; the held companion pages inside it are English and must not
  // inherit that.
  assert.equal(localeByCode('ps').dir, 'rtl');
  assert.equal(isWithheld('ps'), false);
  assert.equal(languageShownFor('ps', 'companion').code, 'en');
  assert.equal(languageShownFor('ps', 'companion').dir, 'ltr');
  assert.equal(languageShownFor('ps', 'nav').code, 'ps');
  assert.equal(languageShownFor('ps', 'nav').dir, 'rtl');
  // Dhivehi is withheld whole: no part of it is shown in Dhivehi.
  for (const section of SECTIONS) {
    assert.equal(languageShownFor('dv', section.prefix).code, 'en', section.prefix);
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
  assert.match(sheet, /\{held && !withheld && \(/u);
  assert.match(sheet, /Readers do not see this part in \{target\.englishName\} yet\./u);
  // A withheld language gets the other sentence, on every part of it.
  assert.match(sheet, /const withheld = target \? isWithheld\(target\.code\) : false;/u);
  assert.match(sheet, /\{withheld && \(/u);
  assert.match(sheet, /\{target\.englishName\} is not offered to readers yet\./u);
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

test('a withheld language is not offered anywhere a reader is given a language', () => {
  const codes = whole.map(([code]) => code);
  const offered = translatedLocales().map((l) => l.code);
  const inPicker = localeGroups().flatMap((g) => g.locales.map((l) => l.code));

  for (const code of codes) {
    // Still a language the project knows, so it can be named, corrected and
    // one day released...
    assert.equal(isLocaleCode(code), true);
    assert.ok(writtenLocales().some((l) => l.code === code), `${code} cannot be corrected: it is not on the sheet`);
    assert.equal(
      Object.keys(WRITTEN[code] ?? {}).length,
      allKeys.length - unwrittenKeys.length,
      `${code} lost its draft`,
    );
    // ...and not one a reader can have.
    assert.equal(isOfferedLocale(code), false);
    assert.ok(!offered.includes(code), `${code} is withheld and offered`);
    assert.ok(!inPicker.includes(code), `${code} is withheld and in the picker`);
    // Not by asking for it, with or without a region...
    assert.equal(matchLocale(code), null);
    assert.equal(matchLocale(`${code}-XX`), null);
    // ...not from a cookie set before it was withheld...
    assert.deepEqual(chooseLocale({ chosen: code, acceptLanguage: null }), { code: 'en', source: 'default' });
    // ...and not from the device. **English, every time** — the owner's
    // decision, against the first implementation, which gave a Wolof-then-French
    // phone French. Asking for one of these four first is answered in English
    // whatever is listed after it, and whatever the weights say about the rest.
    const english = { code: 'en', source: 'default' } as const;
    assert.deepEqual(chooseLocale({ chosen: null, acceptLanguage: code }), english);
    assert.deepEqual(chooseLocale({ chosen: null, acceptLanguage: `${code},fr;q=0.9,en;q=0.8` }), english);
    assert.deepEqual(chooseLocale({ chosen: null, acceptLanguage: `${code}-XX,${code};q=0.9,ar;q=0.7` }), english);
    // A stale cookie is the same question asked by the browser instead of the
    // device, and gets the same answer — it does not hand the decision to the
    // device's list, which might well be French.
    assert.deepEqual(chooseLocale({ chosen: code, acceptLanguage: 'fr-FR,fr;q=0.9' }), english);
    assert.deepEqual(chooseLocale({ chosen: code, acceptLanguage: `${code},sw;q=0.9` }), english);
    // A language the register does not know at all is still skipped, so it
    // does not shield the withheld one behind it...
    assert.deepEqual(chooseLocale({ chosen: null, acceptLanguage: `ja,${code};q=0.9,fr;q=0.8` }), english);
    // ...and the rule is about what was asked for *first*: a device that puts
    // French ahead of it reads French, by position or by weight.
    assert.deepEqual(
      chooseLocale({ chosen: null, acceptLanguage: `fr,${code};q=0.9` }),
      { code: 'fr', source: 'device' },
    );
    assert.deepEqual(
      chooseLocale({ chosen: null, acceptLanguage: `${code};q=0.5,fr;q=0.9` }),
      { code: 'fr', source: 'device' },
    );
    // And a browser that chose an offered language keeps it, whatever the device asks.
    assert.deepEqual(
      chooseLocale({ chosen: 'sw', acceptLanguage: `${code},fr;q=0.9` }),
      { code: 'sw', source: 'chosen' },
    );
  }
  // The sentence the settings page prints for `default` is the true one here:
  // a language this interface does not have yet, so it is in English.
  assert.match(en['language.default'], /does not have yet, so it is in English/u);
  assert.match(read('../app/language/page.tsx'), /: t\('language\.default'\)/u);
  assert.deepEqual(withheldLocales().map((l) => l.code).sort(), [...codes].sort());

  // Whatever is asked for, what comes back is something a reader can be shown.
  for (const locale of LOCALES) {
    for (const input of [{ chosen: locale.code }, { acceptLanguage: locale.code }, { acceptLanguage: `${locale.code}-ZZ` }]) {
      const { code } = chooseLocale(input);
      assert.equal(isOfferedLocale(code), true, `${locale.code} resolves to ${code}, which is withheld`);
    }
  }
  // The nineteen with one part held are still offered: that is the difference.
  for (const [code] of partly) {
    assert.equal(isOfferedLocale(code), true);
    assert.equal(matchLocale(code), code);
    assert.ok(inPicker.includes(code), `${code} fell out of the picker`);
  }
  // Fifty-one in the register, forty-seven on offer.
  assert.equal(LOCALES.length, 51);
  assert.equal(offered.length, 47);
  assert.equal(writtenLocales().length, 51);

  // The route that stores a choice refuses one of these by hand as well.
  const route = read('../app/api/locale/route.ts');
  assert.match(route, /if \(!clears && !isOfferedLocale\(chosen\)\)/u);
});

test('what the site says about itself matches what it offers', () => {
  const words = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
    'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  const tens: Record<number, string> = { 2: 'twenty', 3: 'thirty', 4: 'forty', 5: 'fifty' };
  const spell = (n: number) => (n < 20 ? words[n]! : `${tens[Math.floor(n / 10)]}${n % 10 ? `-${words[n % 10]}` : ''}`);

  // The about page counts the languages on offer and names the ones that are not.
  const about = read('../app/about/page.tsx');
  assert.match(about, new RegExp(`The interface is offered in ${spell(translatedLocales().length)} languages\\.`, 'u'));
  assert.doesNotMatch(about, /speaks fifty-one languages/u);
  assert.match(about, new RegExp(`true of ${spell(whole.length)} whole\\s+languages`, 'u'));
  for (const locale of withheldLocales()) {
    assert.ok(about.includes(locale.englishName), `the about page does not say ${locale.englishName} is withheld`);
  }
  assert.match(about, new RegExp(`screens in ${spell(partly.length)}\\s+more`, 'u'));
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

test('the learner dashboard is written for the languages with nothing held, and for no other', () => {
  // Owner's decision, 2026-11-16: a language the builder cannot write properly
  // falls back to English until a speaker has reviewed it. For a new screen
  // that means not writing it — a held draft would be the same guess, kept.
  assert.deepEqual([...UNWRITTEN_WHILE_HELD], ['learn', 'course']);
  // Thirty-seven for the dashboard (the learner-profile prompt is seven of
  // them) and sixteen for the course page.
  assert.equal(unwrittenKeys.length, 53);
  assert.equal(unwrittenKeys.filter((key) => key.startsWith('learn.')).length, 37);
  assert.equal(unwrittenKeys.filter((key) => key.startsWith('course.')).length, 16);

  // Two files, one rule: the same languages in both.
  const written = Object.keys(LEARN).sort();
  assert.deepEqual(Object.keys(COURSE).sort(), written);
  const expected = LOCALES.map((l) => l.code)
    .filter((code) => code !== 'en' && !Object.hasOwn(HELD_FOR_REVIEW, code))
    .sort();
  assert.deepEqual(written, expected);
  assert.equal(written.length, 27);

  for (const code of expected) {
    const own: Partial<Record<string, string>> = { ...LEARN[code], ...COURSE[code] };
    assert.deepEqual(Object.keys(own).sort(), [...unwrittenKeys].sort(), `${code} is short a dashboard or course sentence`);
    for (const key of unwrittenKeys) {
      const value = own[key] ?? '';
      assert.ok(value.trim() !== '' && value === value.trim(), `${code}.${key}`);
      // The reader is served it, and the page calls itself that language.
      assert.equal(translator(code)(key), value);
      assert.equal(isUnwritten(code, key), false);
      // Placeholders travel: a sentence that loses `{done}` prints a gap.
      const names = (text: string) => [...text.matchAll(/\{([a-zA-Z]+)\}/gu)].map((m) => m[1]).sort();
      assert.deepEqual(names(value), names(en[key]), `${code}.${key} changed its placeholders`);
    }
    assert.equal(languageShownFor(code, 'learn').code, code);
    assert.equal(languageShownFor(code, 'course').code, code);
    assert.equal(coverageOf(code).percent, 100);
  }

  // Everybody else: nothing in the file, English on the page, and a wrapper
  // that says English — including Pashto, whose frame is right-to-left.
  for (const [code] of held) {
    for (const key of unwrittenKeys) {
      assert.equal(WRITTEN[code]?.[key], undefined, `${code}.${key} was written for a held language`);
      assert.equal(isUnwritten(code, key), true);
      if (!isWithheld(code)) assert.equal(translator(code)(key), en[key]);
    }
    for (const part of UNWRITTEN_WHILE_HELD) {
      assert.equal(languageShownFor(code, part).code, 'en');
      assert.equal(languageShownFor(code, part).dir, 'ltr');
    }
  }
  // What that costs the nineteen that are still in the picker, said out loud:
  // 192 of 325 sentences. `i18n.test.ts` holds the floor under it.
  for (const [code] of partly) {
    assert.equal(coverageOf(code).translated, 192, code);
    assert.equal(coverageOf(code).total, 325);
    assert.equal(coverageOf(code).percent, 59, code);
  }
  assert.equal(languageShownFor('ps', 'nav').dir, 'rtl');
  assert.equal(languageShownFor('en', 'learn').code, 'en');
  // A part that does not exist is English too, rather than a claim.
  assert.equal(languageShownFor('ar', 'nosuchpart').code, 'en');
});

test('the dashboard page reads its words from the catalogue, in one language', () => {
  const page = read('../app/learn/page.tsx');

  // One language for the whole screen, on the wrapper when it is not the
  // frame's, and the same language for its numbers.
  assert.match(page, /const shown = languageShownFor\(locale, 'learn'\);/u);
  assert.match(page, /const t = translator\(shown\.code\);/u);
  assert.match(page, /formatNumber\(shown\.code, value\)/u);
  assert.match(page, /mismatch \? \{ lang: shown\.code, dir: shown\.dir \} : \{\}/u);

  // Every sentence the file holds is used by the page or by the card it leads
  // with: a key nobody reads is a translation somebody wrote for nothing.
  const sources = page + read('./continue-point.ts');
  for (const key of unwrittenKeys.filter((k) => k.startsWith('learn.'))) {
    assert.ok(sources.includes(`'${key}'`), `${key} is translated and never shown`);
  }

  // The English that used to be typed into the page is gone from it.
  for (const sentence of [
    'Your courses', 'Signed in as', 'Account settings', 'Saved courses', 'On this device',
    'Ask about a lesson', 'Could not load', 'No enrolments yet', 'Untitled course',
    'In progress', 'Start course', 'Browse the catalogue', 'Sign out', 'My learning',
  ]) {
    assert.ok(!page.includes(sentence), `"${sentence}" is still typed into the dashboard`);
  }

  // What is still English is marked as English rather than left to inherit a
  // right-to-left frame: live classes, the streak strip and memorisation.
  assert.match(page, /const english = shown\.code === 'en' \? \{\} : \(\{ lang: 'en', dir: 'ltr' \} as const\);/u);
  assert.equal(page.match(/\{\.\.\.english\}/gu)?.length, 3);

  // The learner-profile prompt is no longer one of them. Its words go to the
  // client button as props, every one of them, so a French page cannot show
  // "Setting up…" for the second the request takes.
  assert.ok(!page.includes('Enrolling needs a learner profile'));
  assert.match(
    page,
    /<ClaimLearner\s+label=\{t\('learn\.claim'\)\}\s+note=\{t\('learn\.claimNote'\)\}\s+words=\{\{\s+busy: t\('learn\.claimBusy'\),\s+done: t\('learn\.claimDone'\),\s+ready: t\('learn\.claimReady'\),\s+failed: t\('learn\.claimFailed'\),\s+\}\}\s+\/>/u,
  );
  const claim = read('../components/claim-learner.tsx');
  assert.doesNotMatch(claim, /useT\(/u);
  assert.match(claim, /const say = words \?\? ENGLISH;/u);
  // The server's reason is English; a translated page says its own sentence.
  assert.match(claim, /setError\(words \? words\.failed : \(json\?\.message \?\? say\.failed\)\);/u);
  // The other three screens that show the prompt are not translated and pass
  // no words, so they read exactly as before.
  for (const caller of ['../app/account/page.tsx', '../app/courses/[slug]/buy/page.tsx', '../app/family/page.tsx']) {
    assert.doesNotMatch(read(caller), /<ClaimLearner[^>]*words=/u, caller);
  }

  // The dashboard's sentences are left out of the catalogue every page
  // carries, which is only safe while no client component asks for one.
  assert.doesNotMatch(page, /^'use client'/u);
  const src = new URL('../', import.meta.url);
  const files = (dir: string): string[] =>
    readdirSync(new URL(dir, src), { withFileTypes: true }).flatMap((entry) =>
      entry.isDirectory() ? files(`${dir}${entry.name}/`) : /\.tsx?$/u.test(entry.name) ? [`${dir}${entry.name}`] : [],
    );
  const clients = files('').filter((file) => {
    const text = readFileSync(new URL(file, src), 'utf8');
    return /^\s*'use client'/u.test(text) && /'(?:learn|course)\.[a-zA-Z]+'/u.test(text);
  });
  assert.deepEqual(clients, [], 'a client component asks for a dashboard or course sentence the shell does not carry');

  // The carry-on card is given the same words and digits.
  assert.match(page, /fetchCarryOn\(supabase, enrolments, \{ t, number: num \}\)/u);
  assert.match(read('../app/_shared/carry-on.tsx'), /copy\.meta \?\? `Lesson \$\{point\.index\} of \$\{point\.total\}`/u);
});

test('the course page reads its words from the catalogue, and marks what it cannot', () => {
  const page = read('../app/learn/[enrolmentId]/page.tsx');

  assert.match(page, /const shown = languageShownFor\(locale, 'course'\);/u);
  assert.match(page, /const t = translator\(shown\.code\);/u);
  assert.match(page, /formatNumber\(shown\.code, value\)/u);
  assert.match(page, /lang=\{mismatch \? shown\.code : undefined\}\s+dir=\{mismatch \? shown\.dir : undefined\}/u);
  assert.doesNotMatch(page, /^'use client'/u);

  // Every course sentence is on the page.
  for (const key of unwrittenKeys.filter((k) => k.startsWith('course.'))) {
    assert.ok(page.includes(`'${key}'`), `${key} is translated and never shown`);
  }
  // The carry-on card gets the dashboard's words and digits rather than the
  // English it had here before.
  assert.match(page, /carryOnHeading\(carryOn, progressRows\.length > 0, \{ t, number: num \}\)/u);

  // The English that was typed into the translated part is gone.
  for (const sentence of [
    'My learning', 'Progress tracking is not enabled', 'Course progress', 'lessons complete',
    'Course complete.', 'Certificates are issued', 'Still to do:', 'no published outline',
    'Back to my learning', 'Version {',
  ]) {
    assert.ok(!page.includes(sentence), `"${sentence}" is still typed into the course page`);
  }

  // Four things on it are English for every reader, and say so: the reasons
  // the database gives for a course not being complete, and the cohort,
  // assessment and assignment lists. A fifth unmarked one would put English
  // sentences into a right-to-left page with their full stops on the left.
  assert.match(page, /const english = shown\.code === 'en' \? \{\} : \(\{ lang: 'en', dir: 'ltr' \} as const\);/u);
  assert.equal(page.match(/\{\.\.\.english\}/gu)?.length, 4);
  assert.match(page, /<ul style=\{\{[^}]+\}\} \{\.\.\.english\}>\s+\{completion\.blocking\.map/u);
  assert.match(page, /<div \{\.\.\.english\}>\s+<CohortMemberships/u);
  assert.match(page, /assessments\.length > 0 && \(\s+<div \{\.\.\.english\}>/u);
  assert.match(page, /visibleAssignments\.length > 0 && \(\s+<div \{\.\.\.english\}>/u);

  // The mark-complete control is a client component. It is handed its five
  // strings; it does not go looking for them in a catalogue it was not sent.
  assert.match(
    page,
    /const markWords: MarkCompleteWords = \{\s+mark: t\('course\.markComplete'\),\s+undo: t\('course\.undo'\),\s+saving: t\('course\.saving'\),\s+unconfirmed: t\('course\.unconfirmed'\),\s+reload: t\('course\.reload'\),\s+\};/u,
  );
  assert.match(page, /initiallyDone=\{done\}\s+words=\{markWords\}/u);
  const control = read('../app/learn/[enrolmentId]/mark-complete.tsx');
  assert.doesNotMatch(control, /useT\(/u);
  assert.match(control, /const say = words \?\? ENGLISH;/u);
  // The lesson page uses the same control and is not translated: no words, so
  // the English it always had.
  assert.doesNotMatch(read('../app/learn/[enrolmentId]/lesson/[lessonId]/page.tsx'), /<MarkComplete[^>]*words=/u);
});
