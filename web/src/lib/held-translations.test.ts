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
  playerMessagesFor,
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
import { SOURCE_TYPES } from './provenance.ts';
import { LEARN } from './i18n/messages/learn.ts';
import { COURSE } from './i18n/messages/course.ts';
import { ASSESS } from './i18n/messages/assess.ts';
import { ASSIGN } from './i18n/messages/assign.ts';
import { MISSING } from './i18n/messages/missing.ts';
import { BROKE } from './i18n/messages/broke.ts';
import { PLAYER } from './i18n/messages/player.ts';
import { LESSON } from './i18n/messages/lesson.ts';
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
  assert.deepEqual([...UNWRITTEN_WHILE_HELD], ['learn', 'course', 'lesson', 'assess', 'assign', 'missing', 'broke', 'player']);
  // Thirty-seven for the dashboard (the learner-profile prompt is seven of
  // them), twenty-eight for the course page (twelve are the list of dated
  // classes), ninety for the lesson page (its frame, the report form, the
  // notes about a recording, the practice questions, the study tools, the
  // sources card),
  // forty for the assessment page, its quiz and the assessment list on the
  // course page, and a hundred and seven for the assignment page and the
  // assignment list, of which forty-seven are the files part, seven for
  // the page for an address with nothing at it, ten for the page for a
  // page that broke, and eighty-six for the players on the lesson page and
  // what they say about a saved place.
  assert.equal(unwrittenKeys.length, 405);
  assert.equal(unwrittenKeys.filter((key) => key.startsWith('player.')).length, 86);
  assert.equal(unwrittenKeys.filter((key) => key.startsWith('broke.')).length, 10);
  assert.equal(unwrittenKeys.filter((key) => key.startsWith('missing.')).length, 7);
  assert.equal(unwrittenKeys.filter((key) => key.startsWith('assign.')).length, 107);
  assert.equal(unwrittenKeys.filter((key) => key.startsWith('learn.')).length, 37);
  assert.equal(unwrittenKeys.filter((key) => key.startsWith('course.')).length, 28);
  assert.equal(unwrittenKeys.filter((key) => key.startsWith('lesson.')).length, 90);
  assert.equal(unwrittenKeys.filter((key) => key.startsWith('assess.')).length, 40);

  // Eight files, one rule: the same languages in each.
  const written = Object.keys(LEARN).sort();
  assert.deepEqual(Object.keys(COURSE).sort(), written);
  assert.deepEqual(Object.keys(LESSON).sort(), written);
  assert.deepEqual(Object.keys(ASSESS).sort(), written);
  assert.deepEqual(Object.keys(ASSIGN).sort(), written);
  assert.deepEqual(Object.keys(MISSING).sort(), written);
  assert.deepEqual(Object.keys(BROKE).sort(), written);
  assert.deepEqual(Object.keys(PLAYER).sort(), written);
  const expected = LOCALES.map((l) => l.code)
    .filter((code) => code !== 'en' && !Object.hasOwn(HELD_FOR_REVIEW, code))
    .sort();
  assert.deepEqual(written, expected);
  assert.equal(written.length, 27);

  for (const code of expected) {
    const own: Partial<Record<string, string>> = {
      ...LEARN[code], ...COURSE[code], ...LESSON[code], ...ASSESS[code], ...ASSIGN[code], ...MISSING[code], ...BROKE[code],
      ...PLAYER[code],
    };
    assert.deepEqual(Object.keys(own).sort(), [...unwrittenKeys].sort(), `${code} is short a dashboard, course, lesson, assessment or assignment sentence`);
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
    assert.equal(languageShownFor(code, 'lesson').code, code);
    assert.equal(languageShownFor(code, 'assess').code, code);
    assert.equal(languageShownFor(code, 'assign').code, code);
    assert.equal(languageShownFor(code, 'missing').code, code);
    assert.equal(languageShownFor(code, 'broke').code, code);
    assert.equal(languageShownFor(code, 'player').code, code);
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
  // 192 of 677 sentences, which is 28%. Nothing holds a floor under
  // it any more: the owner chose on 2026-11-17 to keep these languages in the
  // picker and show the number. The count is pinned here so that it moves only
  // when somebody means it to, and is seen when it does. It moved from 55% to
  // 50% when the assessment page was written, and from 50% to 43% when the
  // assignment page was: sixty more sentences these readers see in English,
  // on a page they already saw in English. It moved from 43% to 39% when the
  // files part of that page and the assessment list were written, fifty
  // more, to 38% with the list of dated classes, twelve more, and to 36% with
  // the report form on the lesson page, twenty-one more. The page for a wrong
  // address added seven and the rounded number did not move (35.96%); the
  // notes about a recording that cannot play added ten and it is 35%; the
  // practice questions and the notes and bookmark on the lesson page added
  // twenty-three and it is 34%; the sources card added fourteen and it is
  // 33%; the page for a page that broke added ten and it is 32%; the
  // players on the lesson page and their saved-place messages added
  // eighty-six, the largest single step since the assignment page, and it is
  // 28%. What they are shown did not get smaller; what is counted got bigger.
  for (const [code] of partly) {
    assert.equal(coverageOf(code).translated, 192, code);
    assert.equal(coverageOf(code).total, 677);
    assert.equal(coverageOf(code).percent, 28, code);
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
    return /^\s*'use client'/u.test(text) && /'(?:learn|course|lesson)\.[a-zA-Z]+'/u.test(text);
  });
  assert.deepEqual(clients, [], 'a client component asks for a dashboard, course or lesson sentence the shell does not carry');

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

  // One thing on it is English for every reader, and says so: the reasons
  // the database gives for a course not being complete. Unmarked, they would
  // put English sentences into a right-to-left page with their full stops on
  // the left. The assignment list, the assessment list and the list of dated
  // classes were marked the same way until each was translated.
  assert.match(page, /const english = shown\.code === 'en' \? \{\} : \(\{ lang: 'en', dir: 'ltr' \} as const\);/u);
  assert.equal(page.match(/\{\.\.\.english\}/gu)?.length, 1);
  assert.match(page, /<ul style=\{\{[^}]+\}\} \{\.\.\.english\}>\s+\{completion\.blocking\.map/u);
  // The dated classes: a client component, handed its words, asking the
  // catalogue for none, and printing no moment with an unlabelled clock.
  const cohortList = read('../app/learn/[enrolmentId]/cohort-memberships.tsx');
  assert.match(page, /<CohortMemberships\s[\s\S]{0,200}?locale=\{shown\.code\}\s+words=\{cohortWords\}\s+\/>/u);
  assert.match(cohortList, /^'use client';/u);
  assert.doesNotMatch(cohortList, /useT\(|'course\.|@\/lib\/i18n'/u);
  assert.doesNotMatch(cohortList, /toLocaleString\(|Date\.now\(\)/u);
  assert.match(cohortList, /<LocalTime iso=\{iso\} locale=\{locale\} \/>/u);
  assert.match(cohortList, /<strong dir="auto">\{cohort\.title\}<\/strong>/u);
  for (const sentence of ['Dated classes', 'Leave class', 'Leaving…', 'Left the class', 'Could not leave', 'joining is paused', 'starts ', 'ends ']) {
    assert.ok(!cohortList.includes(`>${sentence}`) && !cohortList.includes(`'${sentence}`) && !cohortList.includes(`\`${sentence}`), `"${sentence}" is still typed into the class list`);
  }
  // What the server said in English when leaving failed is not printed.
  assert.doesNotMatch(cohortList, /result\.message|cause\.message/u);
  // The status is a word in the reader's language, never the database's.
  assert.doesNotMatch(cohortList, /\{cohort\.status\}/u);
  assert.match(page, /assessments\.length > 0 && \(\s+<div>\s+<div className="outline-h">\s+<h3>\{t\('assess\.heading'\)\}<\/h3>/u);
  assert.match(page, /t\(a\.type === 'practice' \? 'assess\.practise' : 'assess\.take'\)/u);
  for (const sentence of ['<h3>Assessments</h3>', "'Practise'", "'Take'", "'Final assessment'"]) {
    assert.ok(!page.includes(sentence), `"${sentence}" is still typed into the course page`);
  }
  assert.match(page, /visibleAssignments\.length > 0 && \(\s+<div>\s+<div className="outline-h">\s+<h3>\{t\('assign\.heading'\)\}<\/h3>/u);
  for (const sentence of ['No deadline', 'submitted late', 'Not started', 'View feedback', 'View submission', 'SUBMISSION_STATUS_LABEL']) {
    assert.ok(!page.includes(sentence), `"${sentence}" is still typed into the course page`);
  }
  // A deadline is a moment on somebody's clock. The server prints it in UTC
  // and says so; the browser then prints it in the reader's zone.
  assert.match(page, /<LocalTime iso=\{deadline\.toISOString\(\)\} locale=\{shown\.code\} \/>/u);
  assert.doesNotMatch(page, /deadline\.toLocaleString\(/u);

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
  // The lesson page uses the same control and hands it the same words.
  assert.match(read('../app/learn/[enrolmentId]/lesson/[lessonId]/page.tsx'), /initiallyDone=\{false\}\s+words=\{markWords\}/u);
});

test('the lesson page translates its frame and marks every English part inside it', () => {
  const page = read('../app/learn/[enrolmentId]/lesson/[lessonId]/page.tsx');

  assert.match(page, /const shown = languageShownFor\(locale, 'lesson'\);/u);
  assert.match(page, /const t = translator\(shown\.code\);/u);
  assert.match(page, /lang=\{mismatch \? shown\.code : undefined\}\s+dir=\{mismatch \? shown\.dir : undefined\}/u);
  assert.doesNotMatch(page, /^'use client'/u);

  // Every lesson sentence is on the page: the seven kinds through the table,
  // the nine about a recording that cannot play through the function that
  // chooses between them, and the rest by name.
  const standing = read('./playback-standing.ts');
  for (const key of unwrittenKeys.filter((k) => k.startsWith('lesson.'))) {
    const chosen = /^lesson\.rec(?!Tell)/u.test(key);
    assert.ok((chosen ? standing : page).includes(`'${key}'`), `${key} is translated and never shown`);
  }
  assert.equal(unwrittenKeys.filter((k) => /^lesson\.rec(?!Tell)/u.test(k)).length, 9);
  assert.match(page, /\{t\(summary\.headingKey\)\}<\/strong>\s+\{t\(summary\.sentenceKey\)\}/u);
  assert.match(page, /\{t\(note\.headingKey\)\}\s+<span style=\{\{ display: 'block' \}\}>\{t\(note\.sentenceKey\)\}<\/span>/u);
  // The English of those sentences is the catalogue's, not a second copy.
  assert.match(standing, /heading: en\[headingKey\], sentence: en\[sentenceKey\]/u);
  assert.doesNotMatch(page, /note\.heading\b|note\.sentence\b|summary\.heading\b|summary\.sentence\b|toLowerCase\(\)\}\./u);
  assert.match(page, /<span className="n">\{t\(RESOURCE_KEY\[r\.resourceType\]\)\}<\/span>/u);
  assert.doesNotMatch(page, /RESOURCE_LABEL/u);

  // The English that was typed into the frame is gone.
  for (const sentence of [
    '>Dashboard<', 'aria-label="Breadcrumb"', 'Preview lesson', '>Completed<', '>Not started<',
    '<h2>Transcript</h2>', '<h2>Materials</h2>', 'No materials have been attached',
    'You do not have access', 'Back to course', 'Marked complete.',
  ]) {
    assert.ok(!page.includes(sentence), `"${sentence}" is still typed into the lesson page`);
  }

  // One place holds a client component that is English for every reader,
  // and says so: the open discussion. A material that is a player was the
  // other and is the reader's now (see the test of the players below); so
  // are the note about a recording that cannot play, the practice questions,
  // the notes and bookmark, and the sources card.
  assert.match(page, /const english = shown\.code === 'en' \? \{\} : \(\{ lang: 'en', dir: 'ltr' \} as const\);/u);
  assert.equal(page.match(/\{\.\.\.english\}/gu)?.length, 1);
  assert.doesNotMatch(page, /speaksEnglish|englishMaterials/u);
  assert.match(page, /<div className="notice" style=\{\{ marginBottom: '1rem' \}\}>\s+<strong style=\{\{ display: 'block' \}\}>\{t\(summary\.headingKey\)\}/u);
  assert.doesNotMatch(page, /noteFor\(standing\.get\(r\.id\) \?\? null\) !== null/u);
  assert.match(page, /<PracticeCheck items=\{practiceItems\} words=\{practiceWords\} locale=\{shown\.code\} \/>/u);
  // The sources card is the page's own. Its frame is the reader's; the kind
  // of a source is named from the catalogue, one name for each value the
  // database accepts, and the column's own word is never printed.
  assert.match(page, /\{provenanceOn && \(\s+<section className="card">\s+<h2>\{t\('lesson\.sourcesHeading'\)\}<\/h2>/u);
  assert.match(page, /<span className="badge neutral">\{t\(SOURCE_KEY\[source\.sourceType\] \?\? 'lesson\.sourceOther'\)\}<\/span>/u);
  const sourceKeys = page.split('const SOURCE_KEY: Record<SourceType, MessageKey> = {')[1]?.split('};')[0] ?? '';
  for (const kind of SOURCE_TYPES) assert.match(sourceKeys, new RegExp(`\\b${kind}: 'lesson\\.source[A-Z][a-z]+',`, 'u'), kind);
  assert.equal(new Set(sourceKeys.match(/'lesson\.source[A-Za-z]+'/gu)).size, SOURCE_TYPES.length);
  assert.doesNotMatch(page, /sourceType\.replaceAll|Sources and references|No references are listed|Used at:|>Open source</u);
  // The place a source is used is the teacher's words, and comes last in
  // every language written, so nothing is typed after it.
  assert.match(page, /const \[usedBefore = '', usedAfter = ''\] = t\('lesson\.sourcesUsedAt'\)\.split\('\{place\}'\);/u);
  assert.match(page, /\{usedBefore\}<bdi>\{source\.anchor\}<\/bdi>\{usedAfter\}/u);
  for (const code of writtenLocales().map((l) => l.code)) {
    const value = (WRITTEN[code] as Record<string, string> | undefined)?.['lesson.sourcesUsedAt'];
    if (value !== undefined) assert.ok(value.endsWith('{place}') && value.length > '{place}'.length, `${code}: "${value}"`);
  }
  assert.ok(en['lesson.sourcesUsedAt'].endsWith('{place}'));
  // What the teacher wrote keeps its own direction, and each link, which
  // says the same words as every other, is tied to the title it opens.
  assert.equal(page.match(/ · <bdi>\{source\.(?:authorOrCompiler|editionOrVersion|referenceLocator)\}<\/bdi>/gu)?.length, 3);
  assert.match(page, /<strong id=\{`source-\$\{source\.id\}`\}><bdi>\{source\.title\}<\/bdi><\/strong>/u);
  assert.match(page, /<a href=\{source\.url\} target="_blank" rel="noreferrer" aria-describedby=\{`source-\$\{source\.id\}`\}>/u);
  assert.match(page, /<StudyTools\s[^>]*words=\{studyWords\}\s+locale=\{shown\.code\}\s+\/>/u);
  // Both are client components handed their words. Neither asks a catalogue
  // for any, neither has a sentence typed into what it draws, and neither
  // prints the server's English sentence on a page in another language.
  const practice = read('../app/learn/[enrolmentId]/lesson/[lessonId]/practice-check.tsx');
  const tools = read('../app/learn/[enrolmentId]/lesson/[lessonId]/study-tools.tsx');
  for (const [name, source, component] of [
    ['practice questions', practice, 'export function PracticeCheck'],
    ['study tools', tools, 'export function StudyTools'],
  ] as const) {
    assert.match(source, /^'use client';/u, name);
    assert.doesNotMatch(source, /useT\(|from '@\/lib\/i18n'|'lesson\./u, name);
    assert.match(source, /const say = words \?\? ENGLISH;/u, name);
    const drawn = source.split(component)[1] ?? '';
    for (const sentence of [
      'Check yourself', 'not marked', 'Untitled question', 'Your answer', "'True'", "'Checking…'",
      'rsquo', 'Not quite', 'Try again', 'study tools', 'Bookmark lesson', 'Remove bookmark', 'bookmarked.', 'Private lesson note',
      'Save a thought', 'Save note', 'Clear note', 'Note saved', 'Note removed', 'Saving…', '/4000', 'Could not',
    ]) {
      assert.ok(!drawn.includes(sentence), `"${sentence}" is still typed into the ${name}`);
    }
  }
  assert.match(practice, /setError\(locale === 'en' && typeof json\.message === 'string' \? json\.message : say\.failed\);/u);
  assert.match(tools, /const ours = response\.status === 401 \? say\.signIn : say\.failed;\s+setError\(locale === 'en' && typeof result\.error === 'string' \? result\.error : ours\);/u);
  // No reply at all is answered too, and does not leave a button busy for good.
  assert.match(practice, /\} catch \{[^}]*res = null;\s+\}/u);
  assert.match(tools, /\} catch \{[^}]*setError\(say\.failed\);/u);
  // What a teacher wrote, and what a learner types, keep their own direction.
  assert.match(practice, /<bdi>\{prompt\}<\/bdi>/u);
  assert.match(practice, /<span dir="auto">\{c\.text\}<\/span>/u);
  assert.equal(practice.match(/<bdi>\{outcome\.explanation\}<\/bdi>/gu)?.length, 2);
  assert.match(tools, /maxLength=\{MAX_LESSON_NOTE_LENGTH\}\s+dir="auto"/u);
  // The numbers are written the reader's way: which question, and the counter.
  assert.match(practice, /\{formatNumber\(locale, index \+ 1\)\}\./u);
  assert.match(tools, /\{formatNumber\(locale, note\.length\)\}\/\{formatNumber\(locale, MAX_LESSON_NOTE_LENGTH\)\}/u);
  // The report form at the foot is the reader's: the page hands it its words
  // and the language they are in, and so does the one beside a recording that
  // cannot play, which opens on the technical kind under its own link.
  assert.match(page, /<ReportForm lessonId=\{lesson\.id\} words=\{reportWords\} locale=\{shown\.code\} \/>/u);
  assert.equal(page.match(/words=\{reportWords\}/gu)?.length, 3);
  assert.equal(page.match(/label=\{t\('lesson\.recTell'\)\}\s+category="technical_fault"\s+words=\{reportWords\}\s+locale=\{shown\.code\}/gu)?.length, 2);
  assert.doesNotMatch(page, /Tell us about this recording/u);
  const form = read('../app/learn/[enrolmentId]/lesson/[lessonId]/report-form.tsx');
  assert.doesNotMatch(form, /useT\(/u);
  assert.doesNotMatch(form, /from '@\/lib\/i18n'/u);
  assert.match(form, /const say = words \?\? ENGLISH;/u);
  // A page in another language never prints the server's English sentence.
  assert.match(form, /setMessage\(words \? failure\(res\.status, json\.code\) : \(json\.error \?\? failure\(res\.status, json\.code\)\)\);/u);
  // What the reader types is theirs, and cannot be longer than the server takes.
  assert.match(form, /dir="auto"\s+maxLength=\{REPORT_DESCRIPTION_MAX\}/u);
  for (const sentence of ['>Report a problem<', '>Send report<', '>Cancel<', "'Sending…' :", 'What kind of problem?\n', "setMessage('Sent."]) {
    assert.ok(!form.split('const ENGLISH')[1]?.split('export function ReportForm')[1]?.includes(sentence), `"${sentence}" is still typed into the report form`);
  }
  assert.match(page, /<div \{\.\.\.english\}>\s+<Discussion/u);

  // Discussion ships switched off. The card that says so is the page's own,
  // in the reader's language, not the client component's English one.
  assert.match(page, /\{discussionOn \? \(/u);
  assert.match(page, /<h2>\{t\('lesson\.discussion'\)\}<\/h2>\s+<p className="muted">\{t\('lesson\.discussionClosed'\)\}<\/p>/u);

  // The row at the foot gets its words from the page, counter included, and
  // its arrows turn round only where the row is laid out right to left.
  const nav = read('../app/_shared/lesson-nav.tsx');
  assert.doesNotMatch(nav, /Course contents|Back to course|Lesson navigation|Lesson \$\{/u);
  assert.match(page, /t\('learn\.carryMeta', \{ index: num\(here\.index\), total: num\(here\.total\) \}\)/u);
  assert.match(page, /countLabel\(shown\.code, here\.total, \{ one: 'card\.lessonsOne', other: 'card\.lessonsOther' \}\)/u);
  assert.match(read('../app/globals.css'), /\.lesson-nav-dir:dir\(rtl\) \{ transform: scaleX\(-1\); \}/u);
});

test('the assessment page is translated whole, and opens an attempt only when somebody means it', () => {
  const dir = '../app/learn/[enrolmentId]/assessment/[assessmentId]';
  const page = read(`${dir}/page.tsx`);
  const quiz = read(`${dir}/quiz.tsx`);
  const action = read(`${dir}/actions.ts`);

  assert.match(page, /const shown = languageShownFor\(locale, 'assess'\);/u);
  assert.match(page, /const t = translator\(shown\.code\);/u);
  assert.match(page, /lang=\{mismatch \? shown\.code : undefined\}\s+dir=\{mismatch \? shown\.dir : undefined\}/u);
  assert.doesNotMatch(page, /^'use client'/u);

  // Every sentence written for it is shown somewhere, by name: on the page,
  // or in the assessment list on the course page.
  const courseList = read('../app/learn/[enrolmentId]/page.tsx');
  for (const key of unwrittenKeys.filter((k) => k.startsWith('assess.'))) {
    assert.ok(page.includes(`'${key}'`) || courseList.includes(`'${key}'`), `${key} is translated and never shown`);
  }
  for (const key of ['assess.heading', 'assess.practise', 'assess.take']) {
    assert.ok(courseList.includes(`'${key}'`), `${key} is not on the course page`);
  }
  // The quiz is a client component. It is handed its words and does not ask
  // the catalogue for any: these keys are not in what a browser is sent.
  assert.match(quiz, /^'use client';/u);
  assert.doesNotMatch(quiz, /useT\(|assess\./u);
  assert.match(page, /<Quiz\s+key=\{attempt\.id\}[^>]*words=\{quizWords\}/u);
  for (const sentence of [
    'Answer every question', '>Submit<', 'Submitting…', '>Saved<', "'Saved'", 'Your answer',
    '>True<', '>False<', 'could not be saved', 'Something went wrong',
  ]) {
    assert.ok(!quiz.includes(sentence), `the quiz still says "${sentence}" in English`);
  }
  // A refusal is told by its reason, and the sentence is the page's own. What
  // the server said is not printed.
  assert.doesNotMatch(quiz, /json\??\.message|\.message\)/u);

  // What a teacher wrote keeps its own direction inside a translated frame.
  assert.match(quiz, /<bdi>\{prompt\}<\/bdi>/u);
  assert.match(page, /<p className="lede" dir="auto">/u);

  // The page opened an attempt on every render: handing in the first of three
  // opened the second, and coming back to read the result opened the third.
  // It opens the first one only, and only where there is something to sit.
  const calls = [...page.matchAll(/startAttempt\(/gu)];
  assert.equal(calls.length, 1, 'the page starts attempts in more than one place');
  const before = page.slice(0, calls[0]?.index ?? 0);
  const guard = before.lastIndexOf('} else if (standing.used === 0) {');
  assert.ok(guard !== -1, 'the page no longer checks that no attempt has been used');
  assert.doesNotMatch(before.slice(guard + 1), /\}\s*else|\n {2}\}/u, 'the call has left the branch that guards it');
  assert.match(before, /\} else if \(questions\.length === 0\) \{[^}]*\} else if \(standing\.used === 0\) \{/u);

  // Every later attempt is a button and a server action.
  assert.match(page, /<form\s+action=\{startAnotherAttempt\.bind\(null, enrolment\.id, assessment\.id\)\}/u);
  assert.match(page, /\{mayStartAnother && \(/u);
  assert.match(action, /^'use server';/u);
  assert.match(action, /fetchAssessmentContext\(supabase, \{ enrolmentId, assessmentId \}\)/u);
  // The quiz no longer refreshes the page it is on, which is what opened the
  // next attempt; it goes to the same page told that something was handed in.
  assert.doesNotMatch(quiz, /router\.refresh\(\)/u);
  assert.match(quiz, /router\.replace\(/u);

  // A practice attempt has a score and no verdict: neither word is shown.
  assert.match(page, /passed === null \? null : t\(passed \? 'assess\.passed' : 'assess\.notPassed'\)/u);
  assert.match(quiz, /a\.passed === null \? null : a\.passed \? words\.passed : words\.notPassed/u);

  // Nothing else in the application starts one: the page, the button's action
  // and the route somebody has to post to on purpose.
  const starters: string[] = [];
  const walk = (folder: URL) => {
    for (const entry of readdirSync(folder, { withFileTypes: true })) {
      const child = new URL(`${entry.name}${entry.isDirectory() ? '/' : ''}`, folder);
      if (entry.isDirectory()) walk(child);
      else if (/\.tsx?$/u.test(entry.name) && !entry.name.endsWith('.test.ts')) {
        if (/\bstartAttempt\(/u.test(readFileSync(child, 'utf8'))) starters.push(decodeURIComponent(child.pathname).split('/web/src/')[1] ?? '');
      }
    }
  };
  walk(new URL('../', import.meta.url));
  assert.deepEqual(starters.sort(), [
    'app/api/assessment/route.ts',
    'app/learn/[enrolmentId]/assessment/[assessmentId]/actions.ts',
    'app/learn/[enrolmentId]/assessment/[assessmentId]/page.tsx',
    'lib/assessment.ts',
  ]);
});

test('the assignment page is translated, and a refusal is said in the reader\'s language', () => {
  const dir = '../app/learn/[enrolmentId]/assignment/[assignmentId]';
  const page = read(`${dir}/page.tsx`);
  const work = read(`${dir}/assignment-work.tsx`);
  const list = read('../app/learn/[enrolmentId]/page.tsx');

  assert.match(page, /const shown = languageShownFor\(locale, 'assign'\);/u);
  assert.match(page, /const t = translator\(shown\.code\);/u);
  assert.match(page, /lang=\{mismatch \? shown\.code : undefined\}\s+dir=\{mismatch \? shown\.dir : undefined\}/u);
  assert.doesNotMatch(page, /^'use client'/u);

  // Every sentence written is shown somewhere, by name: on the page or in the
  // list on the course page.
  for (const key of unwrittenKeys.filter((k) => k.startsWith('assign.'))) {
    assert.ok(page.includes(`'${key}'`) || list.includes(`'${key}'`), `${key} is translated and never shown`);
  }

  // The written-answer part is a client component. It is handed its words and
  // asks the catalogue for none: these keys are not in what a browser is sent.
  assert.match(work, /^'use client';/u);
  assert.doesNotMatch(work, /useT\(|'assign\.|@\/lib\/i18n'/u);
  assert.match(page, /<AssignmentWork[^>]*locale=\{shown\.code\}\s+words=\{words\}/u);
  for (const sentence of [
    'Your work', 'Draft saved', 'Save draft', 'Submit assignment', 'Submit revision', 'Revise this work',
    'Submitted and waiting', 'Written response', 'Write your answer', 'Earlier version', 'course author',
    'The deadline has passed', 'This assignment is closed', '>Marked<', 'Score:',
  ]) {
    assert.ok(!work.includes(sentence), `"${sentence}" is still typed into the assignment component`);
  }

  // A refusal is turned into a sentence from the reason code. What the server
  // said in English is not printed.
  assert.match(work, /setError\(sentenceFor\(result\.code\)\)/u);
  assert.doesNotMatch(work, /setError\(result\.message\)/u);
  for (const code of [
    'unavailable', 'not_signed_in', 'not_enrolled', 'not_allowed', 'not_found', 'deadline_passed',
    'already_submitted', 'closed', 'empty', 'file_unavailable', 'too_long', 'revision_limit',
    'no_revisions', 'unconfirmed',
  ]) {
    assert.ok(work.includes(`case '${code}':`), `the page has no sentence for "${code}"`);
  }

  // No moment is printed with the browser's or the server's unlabelled clock.
  assert.doesNotMatch(work, /toLocaleString\(|Date\.now\(\)/u);
  assert.match(work, /<LocalTime iso=\{iso\} locale=\{locale\} \/>/u);
  // Whether the deadline has passed is decided once, by the server, so the
  // HTML and the browser cannot disagree about it.
  assert.match(page, /pastDue=\{deadline !== null && deadline\.getTime\(\) < Date\.now\(\)\}/u);

  // What people wrote is printed as written, in its own direction.
  assert.match(page, /<h1 dir="auto">\{assignment\.title\}<\/h1>/u);
  assert.match(work, /dir="auto">\{mark\.feedback\}/u);
  assert.match(work, /dir="auto">\{bodyText\}/u);

  // The files part is the reader's language too, and no longer an English
  // block marked as one. It is a client component of its own: it is handed
  // its words and asks the catalogue for none.
  const files = read(`${dir}/assignment-files.tsx`);
  const revisions = read('../components/revision-files.tsx');
  assert.doesNotMatch(work, /lang: 'en'/u);
  assert.match(work, /<AssignmentFiles\s[\s\S]{0,200}?locale=\{locale\}\s+words=\{words\.files\}\s+\/>/u);
  assert.match(work, /<RevisionFiles assetIds=\{version\.assetIds\} words=\{words\.revisionFiles\} locale=\{locale\} \/>/u);
  assert.match(files, /^'use client';/u);
  for (const source of [files, revisions]) {
    assert.doesNotMatch(source, /useT\(|'assign\.|@\/lib\/i18n'/u);
  }
  for (const sentence of [
    'File count unavailable', 'Attached: {', 'Not attached', 'Check upload again', 'Resend same file',
    '>Remove<', 'Show more files', 'A photo of each page', 'No files were handed in', 'Handed-in file',
    'could not be confirmed', 'could not be checked', 'held for review', 'arrival not confirmed',
  ]) {
    assert.ok(!files.includes(sentence), `"${sentence}" is still typed into the files component`);
  }
  // What went wrong is a word from `lib/coursework.ts`, turned into a sentence
  // here. The English `message` beside it is the teacher's and is not printed.
  assert.match(files, /setError\(sentenceFor\(check\.code, chosen\.size\)\)/u);
  assert.match(files, /setError\(sentenceFor\(outcome\.code, chosen\.size\)\)/u);
  assert.doesNotMatch(files, /\.message\b/u);
  for (const code of ['no_name', 'empty', 'too_big', 'wrong_kind', 'too_many', 'unreadable', 'remove_uncertain']) {
    assert.ok(files.includes(`case '${code}':`), `the files part has no sentence for "${code}"`);
  }
  // A code the page does not know reads as "not known", never as "refused".
  assert.match(files, /default: return words\.errUncertain;/u);
  // A file's name is somebody's own text inside a sentence of another
  // direction; it is isolated so it cannot reorder what is around it.
  assert.match(files, /<bdi>/u);
  // The teacher's screens use the same component for earlier versions and
  // pass no words; it then says the English it always said.
  assert.match(revisions, /words = ENGLISH,/u);
});

test('the page for a wrong address is in the reader’s language, and English as a whole otherwise', () => {
  const page = read('../app/not-found.tsx');
  assert.match(page, /const shown = languageShownFor\(locale, 'missing'\);/u);
  assert.match(page, /translator\(shown\.code\)/u);
  // English inside another language's frame is marked, on the one wrapper.
  assert.match(page, /shown\.code === locale \? \{\} : \(\{ lang: shown\.code, dir: shown\.dir \} as const\)/u);
  assert.match(page, /<div className="container section" \{\.\.\.wrapper\}>/u);
  // Its title is the reader's too.
  assert.match(page, /export async function generateMetadata\(\)/u);
  assert.doesNotMatch(page, /export const metadata/u);

  // Every sentence of the part is on the page, and nothing is typed into it.
  const keys = allKeys.filter((key) => key.startsWith('missing.'));
  assert.equal(keys.length, 7);
  for (const key of keys) assert.ok(page.includes(`t('${key}')`), `${key} is not used by the page`);
  const body = page.slice(page.indexOf('export default async function NotFound'));
  for (const typed of body.matchAll(/>\s*([A-Z][a-z]+(?: [a-z]+)+)[^<{]*</gu)) assert.fail(`the page still types "${typed[1]}"`);

  // The two names it borrows are ones every offered language has, so the
  // learning page and the catalogue are not called by a second name.
  assert.ok(page.includes("t('nav.learn')") && page.includes("t('home.browse')"));
  for (const code of Object.keys(MISSING)) {
    const t = translator(code as LocaleCode);
    assert.notEqual(t('nav.learn'), en['nav.learn'], code);
    // The long sentence names the learning page exactly once, and not at its
    // very start: the page splits on it.
    const lede = t('missing.lede');
    assert.equal(lede.split('{learn}').length, 2, `${code}: {learn}`);
    assert.ok(lede.indexOf('{learn}') > 0, `${code}: the sentence starts with the link`);
    // The product's name is written the way it is everywhere.
    assert.ok(t('missing.fault').includes('AyahSpring'), code);
  }
  // A held language reads the whole page in English, borrowed names included.
  assert.equal(languageShownFor('ha', 'missing').code, 'en');
  assert.equal(languageShownFor('ps', 'missing').dir, 'ltr');
});

test('Uzbek writes oʻ and gʻ with the letter, not with a quotation mark', () => {
  // Half the Uzbek catalogue wrote "o‘" (a left quotation mark) and half
  // "oʻ" (the letter, U+02BB), so one page showed both. The same for the
  // tutuq belgisi in "maʼlum" (U+02BC), which is not a closing quote.
  const uz = WRITTEN.uz as Record<string, string>;
  const marked = Object.entries(uz).filter(([, value]) => /[\u2018\u2019`']/u.test(value));
  assert.deepEqual(marked.map(([key]) => key), []);
  assert.ok(Object.values(uz).some((value) => value.includes('\u02bb')));
});

test('the players on the lesson page say their sentences in the reader’s language', () => {
  const page = read('../app/learn/[enrolmentId]/lesson/[lessonId]/page.tsx');
  const sources = {
    resume: read('../app/_shared/media-resume.tsx'),
    status: read('../app/_shared/position-status.tsx'),
    rendition: read('../app/_shared/rendition-player.tsx'),
    hook: read('../app/_shared/use-media-position.ts'),
    labels: read('./resume.ts'),
  };
  const keys = allKeys.filter((key) => key.startsWith('player.'));
  assert.equal(keys.length, 86);

  // Every sentence is asked for by a player, the hook under it, or the page.
  const everything = [page, ...Object.values(sources)].join('\n');
  for (const key of keys) assert.ok(everything.includes(`'${key}'`), `${key} is translated and never shown`);

  // The sentences reach the players through a provider of the page's own,
  // around the materials and nothing else, in the language the frame is in,
  // and only when the lesson has something to play. An English page hands
  // over nothing.
  assert.match(page, /const playerWords = hasPlayer && shown\.code !== 'en' \? playerMessagesFor\(shown\.code\) : \{\};/u);
  assert.match(page, /<I18nProvider locale=\{shown\.code\} messages=\{playerWords\}>\s+<ul className="lessons">/u);
  assert.match(page, /<\/ul>\s+<\/I18nProvider>/u);
  assert.equal(page.match(/<I18nProvider/gu)?.length, 1);
  // They are not in what every page carries, and not kept from the browser.
  const index = read('./i18n/index.ts');
  assert.match(index, /!key\.startsWith\(PLAYER_PREFIX\) &&/u);
  const serverOnly = index.split('const SERVER_ONLY_PREFIXES')[1]?.split('];')[0] ?? '';
  assert.ok(serverOnly.includes("'lesson.'") && !serverOnly.includes("'player.'"));
  for (const code of ['ar', 'ta', 'sw'] as const) {
    assert.equal(Object.keys(shellMessagesFor(code)).some((key) => key.startsWith('player.')), false, code);
    assert.equal(Object.keys(playerMessagesFor(code)).length, 86, code);
  }
  // A held language's lesson page is English as a whole, players included.
  assert.equal(languageShownFor('ha', 'player').code, 'en');
  assert.equal(playerMessagesFor('ha')['player.recoveryNotice'], en['player.recoveryNotice']);

  // The players are browser code: they take the small client entry, never
  // the index that holds every catalogue.
  for (const [name, source] of Object.entries(sources)) {
    if (name === 'labels') continue;
    assert.match(source, /^'use client';/u, name);
    assert.doesNotMatch(source, /from '@\/lib\/i18n'/u, name);
    assert.match(source, /useT\(\)/u, name);
  }
  // Sentences that were typed into them are gone from what they draw.
  for (const sentence of [
    'Your browser cannot play', 'Repeat from here', 'Stop repeating', 'Checking your saved place',
    'Keep a temporary recovery place', 'Anyone with access to this browser profile', 'Not now',
    'Choose your saved place', 'Keep this player', 'Device recovery places', 'Save on this device', 'has no delivery copy',
    'On this device', 'Preparing the player', 'Playback links are short-lived', 'toLocaleString(',
  ]) {
    for (const [name, source] of Object.entries(sources)) {
      assert.ok(!source.includes(sentence), `"${sentence}" is still typed into ${name}`);
    }
  }
  // The server's own sentence is English. Only an English page prints it.
  assert.match(sources.rendition, /const speaksEnglish = useLocaleCode\(\) === 'en';/u);
  assert.match(page, /shown\.code === 'en'\s+\? saveStanding\.message\s+: t\('player\.plusNote'\)/u);

  for (const code of Object.keys(PLAYER) as (keyof typeof PLAYER)[]) {
    const own = PLAYER[code] ?? {};
    assert.equal(Object.keys(own).length, 86, code);
    // The notice consent rests on is its own sentence in every language, is
    // not shorter than a notice can honestly be, and still has five things to
    // say: who can see, what turning it off removes, the confirmation, the
    // expiry, and that storage can fail.
    const notice = own['player.recoveryNotice'] ?? '';
    assert.notEqual(notice, en['player.recoveryNotice'], code);
    // Thai closes a sentence with a space and no mark.
    const stops = notice.match(code === 'th' ? /\s/gu : /[.。।۔]/gu)?.length ?? 0;
    assert.ok(stops >= 5, `${code}: the recovery notice lost a sentence`);
    assert.doesNotMatch(notice, /[A-Za-z]{3,}\s\([A-Za-z]+\)|\(enrolment\)/u, `${code}: English in brackets`);
    // Names that are not translated.
    assert.ok((own['player.qualityStandard'] ?? '').startsWith('480p'), code);
    assert.ok((own['player.qualitySmall'] ?? '').startsWith('360p'), code);
    assert.ok((own['player.plusNote'] ?? '').includes('Plus'), code);
    assert.ok((own['player.seePlus'] ?? '').includes('Plus'), code);
    // The limit is said with a number a reader can find on the player.
    assert.match(own['player.limit'] ?? '', /24|۲۴|२४|২৪/u, code);
    // No sentence promises more than a save every ten seconds can keep.
    for (const key of keys) {
      const value = own[key] ?? '';
      assert.doesNotMatch(value, /[\u0027\u0060]/u, `${code}.${key} has a typewriter mark`);
      assert.equal(value.endsWith('…'), en[key].endsWith('…'), `${code}.${key}`);
    }
  }
});

test('the page for a page that broke is in the reader’s language, and English as a whole otherwise', () => {
  const page = read('../app/error.tsx');
  // Drawn in the browser: it reads what the layout handed over, and never the
  // server's catalogue file.
  assert.match(page, /^'use client';/u);
  assert.match(page, /from '@\/lib\/i18n\/client';/u);
  assert.doesNotMatch(page, /from '@\/lib\/i18n';/u);
  // A held language gets English for every sentence, the borrowed button
  // included, and the wrapper says that it is English.
  assert.match(page, /const english = isUnwritten\(locale, 'broke\.heading'\);/u);
  assert.match(page, /\? \(key: MessageKey, vars\?: Record<string, string \| number>\) => fill\(en\[key\], vars\)\s+: shell;/u);
  assert.match(page, /const wrapper = english \? \(\{ lang: 'en', dir: 'ltr' \} as const\) : \{\};/u);
  assert.match(page, /<div className="container section" \{\.\.\.wrapper\}>/u);
  assert.equal(isUnwritten('ha', 'broke.heading'), true);
  assert.equal(isUnwritten('ps', 'broke.heading'), true);
  assert.equal(isUnwritten('ar', 'broke.heading'), false);
  assert.equal(isUnwritten('en', 'broke.heading'), false);

  // Every sentence of the part is on the page, and nothing is typed into it.
  const keys = allKeys.filter((key) => key.startsWith('broke.'));
  assert.equal(keys.length, 10);
  for (const key of keys) assert.ok(page.includes(`t('${key}')`), `${key} is not used by the page`);
  const body = page.slice(page.indexOf('  return ('));
  for (const typed of body.matchAll(/>\s*([A-Z][a-z]+(?: [a-z]+)+)[^<{]*</gu)) assert.fail(`the page still types "${typed[1]}"`);
  // The link to the orders page is a line of its own, not inside a sentence.
  assert.match(body, /<Link href="\/orders">\{t\('broke\.orders'\)\}<\/Link>/u);
  // The id is not a word in any language, and is not mirrored.
  assert.match(body, /<code dir="ltr">\{error\.digest\}<\/code>/u);

  // The browser has these sentences: the part is not one of the server-only
  // ones, so the layout's provider carries it.
  const index = read('./i18n/index.ts');
  const serverOnly = /const SERVER_ONLY_PREFIXES: readonly string\[\] = \[([^\]]*)\];/u.exec(index)?.[1] ?? '';
  assert.ok(serverOnly.includes("'missing.'") && !serverOnly.includes("'broke.'"));

  assert.ok(page.includes("t('home.browse')"));
  for (const code of Object.keys(BROKE)) {
    const t = translator(code as LocaleCode);
    assert.notEqual(t('home.browse'), en['home.browse'], code);
    // The reference is last, once, so the page can print the id after it.
    const reference = t('broke.reference');
    assert.equal(reference.split('{code}').length, 2, `${code}: {code}`);
    assert.ok(reference.endsWith('{code}'), `${code}: the reference is not last`);
    // One name for asking for help, on this page and the wrong-address one.
    assert.equal(t('broke.help'), t('missing.help'), code);
  }

  // What the page says about a lesson is what the player does: a place is
  // saved when playback is ten seconds on from the last one, not "a few".
  const writer = read('./versioned-position-writer.ts');
  assert.match(writer, /Math\.abs\(seconds - lastScheduled\) < 10 /u);
  assert.ok(en['broke.lesson'].includes('about every ten seconds'));
  assert.doesNotMatch(page, /a few\s+seconds before the page broke/u);

  // The page for a failure above every page has no language to read: it stays
  // English and says so in its own `lang`.
  const last = read('../app/global-error.tsx');
  assert.match(last, /<html lang="en">/u);
  assert.doesNotMatch(last, /useT\(/u);
});
