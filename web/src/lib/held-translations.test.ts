import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';

import {
  LOCALES,
  chooseLocale,
  companionMessagesFor,
  countLabel,
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
import { FAMILY } from './i18n/messages/family.ts';
import { BUY } from './i18n/messages/buy.ts';
import { CLOSE } from './i18n/messages/close.ts';
import { EXPORT } from './i18n/messages/export.ts';
import { READING } from './i18n/messages/reading.ts';
import { RESTORE } from './i18n/messages/restore.ts';
import { PHONE } from './i18n/messages/phone.ts';
import { MERGE } from './i18n/messages/merge.ts';
import { SHARE } from './i18n/messages/share.ts';
import { REFER } from './i18n/messages/refer.ts';
import { SPONSOR } from './i18n/messages/sponsor.ts';
import { ORDERS } from './i18n/messages/orders.ts';
import { BILLING } from './i18n/messages/billing.ts';
import { RECEIPT } from './i18n/messages/receipt.ts';
import { NOTIFY } from './i18n/messages/notify.ts';
import { PLANS } from './i18n/messages/plans.ts';
import { SUBS } from './i18n/messages/subs.ts';
import { POLICY } from './i18n/messages/policy.ts';
import { INST } from './i18n/messages/inst.ts';
import { TAPPLY } from './i18n/messages/tapply.ts';
import { BOARD } from './i18n/messages/board.ts';
import { TRANSLATE } from './i18n/messages/translate.ts';
import { CHILD_LOGIN } from './i18n/messages/child-login.ts';
import { PROGRESS } from './i18n/messages/progress.ts';
import { CERTIFICATES } from './i18n/messages/certificates.ts';
import { HANDOVER } from './i18n/messages/handover.ts';
import { GUARDIANS } from './i18n/messages/guardians.ts';
import { VERIFY } from './i18n/messages/verify.ts';
import { COURSE_PAGE } from './i18n/messages/course-page.ts';
import { LIVE } from './i18n/messages/live.ts';
import { HIFZ } from './i18n/messages/hifz.ts';
import { COURSE_PARTS } from './i18n/messages/course-parts.ts';
import { ABOUT } from './i18n/messages/about.ts';
import { SAVED } from './i18n/messages/saved.ts';
import { PATHS } from './i18n/messages/paths.ts';
import { DOWNLOADS } from './i18n/messages/downloads.ts';
import { SUPPORT } from './i18n/messages/support.ts';
import { ASK } from './i18n/messages/ask.ts';
import { TPUB } from './i18n/messages/teacher-page.ts';
import { PANEL } from './i18n/messages/panel.ts';
import { REVIEW } from './i18n/messages/review.ts';
import { REVIEW_ASSIGNMENT } from './i18n/messages/review-assignment.ts';
import { CONSOLE } from './i18n/messages/console.ts';
import { STAFF } from './i18n/messages/staff.ts';
import { EASE } from './i18n/messages/ease.ts';
import { countryNameIn } from './geo.ts';
import { ACCOUNT } from './i18n/messages/account.ts';
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
  // The about page used to spell the numbers of languages in its sentences,
  // and this test spelled them again to catch them going stale. Since
  // 2026-11-27 the page counts them from the register each time it is drawn
  // and names the withheld languages from the same list, so there is no
  // sentence left to go stale: what is checked is that it still counts.
  const about = read('../app/about/page.tsx');
  assert.match(about, /const offered = translatedLocales\(\)\.length;/u);
  assert.match(about, /withheldLocales\(\)\.map\(\(held\) => languageName\(shown\.code, held\.code\) \?\? held\.englishName\)/u);
  assert.match(about, /Object\.values\(HELD_FOR_REVIEW\)\.filter\(\(parts\) => parts && !parts\.includes\(WHOLE_LANGUAGE\)\)\.length/u);
  // The same three numbers, counted here the way this file counts them.
  assert.equal(Object.values(HELD_FOR_REVIEW).filter((parts) => parts && !parts.includes(WHOLE_LANGUAGE)).length, partly.length);
  assert.equal(withheldLocales().length, whole.length);
  // No number of languages is written in a sentence, in English or in words.
  const sentences = Object.entries(en).filter(([key]) => key.startsWith('about.')).map(([, value]) => value).join('\n');
  assert.doesNotMatch(sentences, /\b(?:\d+|forty|fifty|twenty|nineteen|four) (?:whole )?languages\b/iu);
  for (const locale of withheldLocales()) {
    assert.ok(!sentences.includes(locale.englishName), `${locale.englishName} is named in a sentence instead of counted`);
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

test('the learner dashboard is written for the languages with nothing held, and for no other', () => {
  // Owner's decision, 2026-11-16: a language the builder cannot write properly
  // falls back to English until a speaker has reviewed it. For a new screen
  // that means not writing it — a held draft would be the same guess, kept.
  assert.deepEqual([...UNWRITTEN_WHILE_HELD], ['learn', 'course', 'lesson', 'assess', 'assign', 'missing', 'broke', 'player', 'account', 'family', 'buy', 'close', 'export', 'reading', 'restore', 'phone', 'merge', 'share', 'refer', 'sponsor', 'orders', 'billing', 'receipt', 'notify', 'plans', 'subs', 'policy', 'inst', 'tapply', 'board', 'translate', 'kid', 'tq', 'prog', 'cert', 'handover', 'guard', 'verify', 'cpage', 'live', 'hifz', 'cparts', 'about', 'saved', 'paths', 'downloads', 'ease', 'support', 'ask', 'tpub', 'panel', 'review', 'ra', 'staff', 'console']);
  // Thirty-seven for the dashboard (the learner-profile prompt is seven of
  // them), twenty-eight for the course page (twelve are the list of dated
  // classes), a hundred and thirteen for the lesson page (its frame, the
  // report form, the notes about a recording, the practice questions, the
  // study tools, the sources card, the discussion),
  // forty for the assessment page, its quiz and the assessment list on the
  // course page, and a hundred and seven for the assignment page and the
  // assignment list, of which forty-seven are the files part, seven for
  // the page for an address with nothing at it, ten for the page for a
  // page that broke, eighty-six for the players on the lesson page and
  // what they say about a saved place, ninety-eight for the account
  // page and its profile form, a hundred for the family page, its
  // three forms and one learner's page, seventy-nine for the buy page
  // and its form, forty-three for closing an account, fifty-eight for
  // a copy of your data and the page that prints it, fifty-two for the
  // reading settings, sixty-nine for putting a copy back, twenty-nine
  // for the phone number card, eighty-four for the merge screen,
  // sixty-eight for sharing your own learning and opening an invitation,
  // fifty-one for inviting a friend and the page a friend opens, and
  // thirty-five for the page of sponsored seats, fifty-four for my
  // orders and its two forms, thirty-seven for what you have paid, and
  // eighteen for the receipt, and forty-two for the notification centre,
  // and thirty-three for the policy register and one document's page,
  // and forty-five for the institution page a member opens (seventy-five
  // since 2026-11-24: the page a school's code is used on, and what a
  // member reads on the page of what an institution bought),
  // and thirty-five for the page that asks to teach.
  // (Eighty-five and eighty-one since 2026-11-18: one sentence for asking
  // too often, and two on the buy page about which country a number is read
  // as one of and which currency a service collects.)
  // (Fifty-four and thirty-six since 2026-11-24: telling a reader that a
  // document they agreed to has changed.)
  // (Fifty-seven and thirty-six since 2026-11-24, later the same day: an
  // answer to an application to teach, said in the notification centre and
  // promised on the page that asks.)
  // (Fifty-two more on 2026-11-24, later again: the two discussion boards,
  // a part of their own.)
  // (Seventy more on 2026-11-24, last: thirteen for the Translate button,
  // two for a child's first password and fifty-five for the staff page for
  // teachers, three parts of their own.)
  // (A hundred and fifty-one for the family page since 2026-11-25: fifty-one
  // for a child's own login, the card that makes, resets and detaches it.)
  // (Eighty-nine more on 2026-11-25, later: progress and achievements and
  // the streak strip, a part of their own.)
  // (A hundred and thirty-five more the same day: a learner's certificates,
  // fifteen; turning eighteen, thirty-four; a guardian's consent, eighty-six.
  // The certificate sheet and the statement that is ticked stay English and
  // are in none of them. Twenty-one more for the two pages where a
  // certificate is checked, which an employer reads without an account.)
  // (Thirty-four more on 2026-11-25, later still: the public course page, its enrol button
  // and the card about who teaches.)
  // (Twenty-eight more the same day: live classes, on the dashboard and on
  // the page of one class.)
  // (Eighty-six more the same day: the parts of the course page behind
  // switches — dated classes, save for later, ratings — and the sample lesson.)
  // (Two more on 2026-11-27: what the certificate check says when the check
  // itself could not be made.)
  // (Thirty-five more on 2026-11-27: the about page.)
  // (Eighteen more on 2026-11-27: the saved-courses list.)
  // (Twenty-five more on 2026-11-27: the two learning-path pages.)
  // (Forty-five more on 2026-11-27: the lessons kept on this device.)
  // (Fourteen more on 2026-11-27: the letters and reading a lesson aloud;
  // four fewer, the sentences that said neither was built.)
  // (Seventy-two more on 2026-11-27: asking for help.)
  // (Twenty-nine more on 2026-11-27: asking about a lesson.)
  // (Seven more on 2026-11-27: a teacher's public page.)
  // (Forty-five sentences more on 2026-11-27: a board member's own page (`/panel`).)
  // (Ninety-six sentences more on 2026-11-27: the review queue and a reviewer's place on the register (`/review`).)
  // (Fifty-three more on 2026-11-28: one assignment on the review queue.)
  // (Eighty-nine more on 2026-11-28: the staff console (`/admin`).)
  // (Forty-four more on 2026-11-28: the staff console's navigation word and the sentence beside each of its links.)
  assert.equal(unwrittenKeys.length, 2835);
  assert.equal(unwrittenKeys.filter((key) => key.startsWith('console.')).length, 44);
  assert.equal(unwrittenKeys.filter((key) => key.startsWith('staff.')).length, 89);
  assert.equal(unwrittenKeys.filter((key) => key.startsWith('ra.')).length, 53);
  assert.equal(unwrittenKeys.filter((key) => key.startsWith('review.')).length, 96);
  assert.equal(unwrittenKeys.filter((key) => key.startsWith('panel.')).length, 45);
  assert.equal(unwrittenKeys.filter((key) => key.startsWith('tpub.')).length, 7);
  assert.equal(unwrittenKeys.filter((key) => key.startsWith('ask.')).length, 29);
  assert.equal(unwrittenKeys.filter((key) => key.startsWith('support.')).length, 72);
  assert.equal(unwrittenKeys.filter((key) => key.startsWith('ease.')).length, 14);
  assert.equal(unwrittenKeys.filter((key) => key.startsWith('downloads.')).length, 45);
  assert.equal(unwrittenKeys.filter((key) => key.startsWith('paths.')).length, 25);
  assert.equal(unwrittenKeys.filter((key) => key.startsWith('saved.')).length, 18);
  assert.equal(unwrittenKeys.filter((key) => key.startsWith('about.')).length, 35);
  assert.equal(unwrittenKeys.filter((key) => key.startsWith('cparts.')).length, 86);
  assert.equal(unwrittenKeys.filter((key) => key.startsWith('live.')).length, 28);
  assert.equal(unwrittenKeys.filter((key) => key.startsWith('cpage.')).length, 34);
  assert.equal(unwrittenKeys.filter((key) => key.startsWith('verify.')).length, 23);
  assert.equal(unwrittenKeys.filter((key) => key.startsWith('prog.')).length, 89);
  assert.equal(unwrittenKeys.filter((key) => key.startsWith('cert.')).length, 15);
  assert.equal(unwrittenKeys.filter((key) => key.startsWith('handover.')).length, 34);
  assert.equal(unwrittenKeys.filter((key) => key.startsWith('guard.')).length, 86);
  assert.equal(unwrittenKeys.filter((key) => key.startsWith('board.')).length, 58);
  assert.equal(unwrittenKeys.filter((key) => key.startsWith('translate.')).length, 13);
  assert.equal(unwrittenKeys.filter((key) => key.startsWith('kid.')).length, 2);
  assert.equal(unwrittenKeys.filter((key) => key.startsWith('tq.')).length, 55);
  assert.equal(unwrittenKeys.filter((key) => key.startsWith('receipt.')).length, 18);
  assert.equal(unwrittenKeys.filter((key) => key.startsWith('notify.')).length, 57);
  assert.equal(unwrittenKeys.filter((key) => key.startsWith('plans.')).length, 43);
  assert.equal(unwrittenKeys.filter((key) => key.startsWith('subs.')).length, 35);
  assert.equal(unwrittenKeys.filter((key) => key.startsWith('policy.')).length, 36);
  assert.equal(unwrittenKeys.filter((key) => key.startsWith('inst.')).length, 75);
  assert.equal(unwrittenKeys.filter((key) => key.startsWith('tapply.')).length, 36);
  assert.equal(unwrittenKeys.filter((key) => key.startsWith('billing.')).length, 37);
  assert.equal(unwrittenKeys.filter((key) => key.startsWith('orders.')).length, 54);
  assert.equal(unwrittenKeys.filter((key) => key.startsWith('sponsor.')).length, 80);
  assert.equal(unwrittenKeys.filter((key) => key.startsWith('refer.')).length, 51);
  assert.equal(unwrittenKeys.filter((key) => key.startsWith('share.')).length, 68);
  assert.equal(unwrittenKeys.filter((key) => key.startsWith('merge.')).length, 85);
  assert.equal(unwrittenKeys.filter((key) => key.startsWith('phone.')).length, 29);
  assert.equal(unwrittenKeys.filter((key) => key.startsWith('restore.')).length, 69);
  assert.equal(unwrittenKeys.filter((key) => key.startsWith('reading.')).length, 48);
  assert.equal(unwrittenKeys.filter((key) => key.startsWith('export.')).length, 60);
  assert.equal(unwrittenKeys.filter((key) => key.startsWith('close.')).length, 43);
  assert.equal(unwrittenKeys.filter((key) => key.startsWith('buy.')).length, 81);
  assert.equal(unwrittenKeys.filter((key) => key.startsWith('family.')).length, 151);
  assert.equal(unwrittenKeys.filter((key) => key.startsWith('family.login')).length, 51);
  assert.equal(unwrittenKeys.filter((key) => key.startsWith('account.')).length, 98);
  assert.equal(unwrittenKeys.filter((key) => key.startsWith('player.')).length, 86);
  assert.equal(unwrittenKeys.filter((key) => key.startsWith('broke.')).length, 10);
  assert.equal(unwrittenKeys.filter((key) => key.startsWith('missing.')).length, 7);
  assert.equal(unwrittenKeys.filter((key) => key.startsWith('assign.')).length, 107);
  assert.equal(unwrittenKeys.filter((key) => key.startsWith('learn.')).length, 37);
  assert.equal(unwrittenKeys.filter((key) => key.startsWith('course.')).length, 28);
  assert.equal(unwrittenKeys.filter((key) => key.startsWith('lesson.')).length, 113);
  assert.equal(unwrittenKeys.filter((key) => key.startsWith('assess.')).length, 40);

  // Fifteen files, one rule: the same languages in each.
  const written = Object.keys(LEARN).sort();
  assert.deepEqual(Object.keys(COURSE).sort(), written);
  assert.deepEqual(Object.keys(LESSON).sort(), written);
  assert.deepEqual(Object.keys(ASSESS).sort(), written);
  assert.deepEqual(Object.keys(ASSIGN).sort(), written);
  assert.deepEqual(Object.keys(MISSING).sort(), written);
  assert.deepEqual(Object.keys(BROKE).sort(), written);
  assert.deepEqual(Object.keys(PLAYER).sort(), written);
  assert.deepEqual(Object.keys(ACCOUNT).sort(), written);
  assert.deepEqual(Object.keys(FAMILY).sort(), written);
  assert.deepEqual(Object.keys(BUY).sort(), written);
  assert.deepEqual(Object.keys(CLOSE).sort(), written);
  assert.deepEqual(Object.keys(EXPORT).sort(), written);
  assert.deepEqual(Object.keys(READING).sort(), written);
  assert.deepEqual(Object.keys(RESTORE).sort(), written);
  assert.deepEqual(Object.keys(PHONE).sort(), written);
  assert.deepEqual(Object.keys(MERGE).sort(), written);
  assert.deepEqual(Object.keys(SHARE).sort(), written);
  assert.deepEqual(Object.keys(REFER).sort(), written);
  assert.deepEqual(Object.keys(SPONSOR).sort(), written);
  assert.deepEqual(Object.keys(ORDERS).sort(), written);
  assert.deepEqual(Object.keys(BILLING).sort(), written);
  assert.deepEqual(Object.keys(RECEIPT).sort(), written);
  assert.deepEqual(Object.keys(NOTIFY).sort(), written);
  assert.deepEqual(Object.keys(PLANS).sort(), written);
  assert.deepEqual(Object.keys(SUBS).sort(), written);
  assert.deepEqual(Object.keys(POLICY).sort(), written);
  assert.deepEqual(Object.keys(INST).sort(), written);
  assert.deepEqual(Object.keys(TAPPLY).sort(), written);
  assert.deepEqual(Object.keys(BOARD).sort(), written);
  assert.deepEqual(Object.keys(TRANSLATE).sort(), written);
  assert.deepEqual(Object.keys(CHILD_LOGIN).sort(), written);
  assert.deepEqual(Object.keys(PROGRESS).sort(), written);
  assert.deepEqual(Object.keys(CERTIFICATES).sort(), written);
  assert.deepEqual(Object.keys(HANDOVER).sort(), written);
  assert.deepEqual(Object.keys(GUARDIANS).sort(), written);
  assert.deepEqual(Object.keys(VERIFY).sort(), written);
  assert.deepEqual(Object.keys(COURSE_PAGE).sort(), written);
  assert.deepEqual(Object.keys(LIVE).sort(), written);
  assert.deepEqual(Object.keys(HIFZ).sort(), written);
  assert.deepEqual(Object.keys(COURSE_PARTS).sort(), written);
  assert.deepEqual(Object.keys(ABOUT).sort(), written);
  assert.deepEqual(Object.keys(SAVED).sort(), written);
  assert.deepEqual(Object.keys(PATHS).sort(), written);
  assert.deepEqual(Object.keys(DOWNLOADS).sort(), written);
  assert.deepEqual(Object.keys(EASE).sort(), written);
  assert.deepEqual(Object.keys(SUPPORT).sort(), written);
  assert.deepEqual(Object.keys(ASK).sort(), written);
  assert.deepEqual(Object.keys(TPUB).sort(), written);
  assert.deepEqual(Object.keys(PANEL).sort(), written);
  assert.deepEqual(Object.keys(REVIEW).sort(), written);
  assert.deepEqual(Object.keys(REVIEW_ASSIGNMENT).sort(), written);
  assert.deepEqual(Object.keys(STAFF).sort(), written);
  assert.deepEqual(Object.keys(CONSOLE).sort(), written);
  const expected = LOCALES.map((l) => l.code)
    .filter((code) => code !== 'en' && !Object.hasOwn(HELD_FOR_REVIEW, code))
    .sort();
  assert.deepEqual(written, expected);
  assert.equal(written.length, 27);

  for (const code of expected) {
    const own: Partial<Record<string, string>> = {
      ...LEARN[code], ...COURSE[code], ...LESSON[code], ...ASSESS[code], ...ASSIGN[code], ...MISSING[code], ...BROKE[code],
      ...PLAYER[code], ...ACCOUNT[code], ...FAMILY[code], ...BUY[code], ...CLOSE[code],
      ...EXPORT[code], ...READING[code], ...RESTORE[code], ...PHONE[code], ...MERGE[code],
      ...SHARE[code],
      ...REFER[code],
      ...SPONSOR[code],
      ...ORDERS[code],
      ...BILLING[code],
      ...RECEIPT[code],
      ...NOTIFY[code],
      ...PLANS[code],
      ...SUBS[code],
      ...POLICY[code],
      ...INST[code],
      ...TAPPLY[code],
      ...BOARD[code],
      ...TRANSLATE[code],
      ...CHILD_LOGIN[code],
      ...PROGRESS[code],
      ...CERTIFICATES[code],
      ...HANDOVER[code],
      ...GUARDIANS[code],
      ...VERIFY[code],
      ...COURSE_PAGE[code],
      ...LIVE[code],
      ...HIFZ[code],
      ...COURSE_PARTS[code],
      ...ABOUT[code],
      ...SAVED[code],
      ...PATHS[code],
      ...DOWNLOADS[code],
      ...EASE[code],
      ...SUPPORT[code],
      ...ASK[code],
      ...TPUB[code],
      ...PANEL[code],
      ...REVIEW[code],
      ...REVIEW_ASSIGNMENT[code],
      ...STAFF[code],
      ...CONSOLE[code],
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
  // 192 of 3107 sentences, which is 6%. Nothing holds a floor under
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
  // 28%; the discussion on the lesson page added twenty-three and it is
  // 27%; the account page and its profile form added ninety-eight and it is
  // 24%; the family page, its forms and one learner's page added a hundred
  // and it is 21%; the buy page and its form added seventy-nine and it is
  // 20%; closing an account added forty-three and it is 19%; a copy of
  // your data and the page that prints it added fifty-eight and it is 18%;
  // the reading settings added fifty-two and it is 17%; putting a copy
  // back added sixty-nine and it is 16%; the phone number card added
  // twenty-nine and the rounded number did not move (15.64%); the merge
  // screen added eighty-four and it is 15%; sharing your own learning and
  // opening an invitation added sixty-eight and it is 14%; inviting a
  // friend and the page a friend opens added fifty-one and it is 13%; the
  // page of sponsored seats added thirty-five and the rounded number did
  // not move (13.07%); paying a pledge added five more (13.03%); the
  // sponsors' pool and asking for a seat added forty (12.68%, still 13%);
  // my orders and its two forms added fifty-four and it is 12%; what you
  // have paid added thirty-seven (11.96%, still 12%); the receipt added
  // eighteen (11.83%, still 12%); the notification centre added forty-two
  // (11.53%, still 12%); the plans page and the page a plan is paid for
  // on added forty-two and it is 11%; the page an account's plans are kept
  // on added twenty-nine (11.06%, still 11%); the policy register and a
  // document's page added thirty-three (10.85%, still 11%); the
  // institution page a member opens added forty-five (10.58%, still 11%);
  // the page that asks to teach added thirty-five and it is 10% (10.38%);
  // five sentences put back on the page an account's plans are kept on
  // (10.36%, still 10%); ten more for a notification said from what it is
  // made of (10.30%, still 10%); five for a policy that changed (10.27%)
  // two for a plan given back (10.26%, still 10%); and thirty for the
  // page a school's code is used on and the page of what an institution
  // bought (10.10%, still 10%), then four for an answer to an application
  // to teach (10.08%, still 10%), then fifty-two for the two discussion
  // boards (9.81%, still 10%), then seventy for the Translate button, a
  // child's first password and the staff page for teachers (9.47%, now 9%),
  // then fifty-one for a child's own login on the family page (9.24%),
  // then eighty-nine for progress and achievements (8.86%, still 9%), then a
  // hundred and thirty-five for certificates, turning eighteen and a
  // guardian's consent (8.34%, which is 8%), then twenty-one for checking a
  // certificate (8.27%), then sixty-two for the public course page and live
  // classes (8.05%), then fifty-eight for memorisation (7.86%, still 8%), then eighty-six
  // for the switched parts of the course page (7.59%, still 8%), then
  // thirty-five for the about page (7.46%, now 7%), then
  // eighteen for the saved-courses list (7.41%, still 7%), then
  // twenty-five for the two learning-path pages (7.34%, still 7%), then
  // forty-five for the lessons kept on this device (7.21%, still 7%), then
  // thirteen for the letters and reading a lesson aloud, less the four
  // sentences that said neither was built (2672 in all with the sentence for a page the font has no letters for: 7.19%, still 7%), then
  // seventy-two for asking for help (7.00%, still 7%), then
  // twenty-nine for asking about a lesson (6.92%, still 7%), then
  // seven for a teacher's public page (6.91%, still 7%), then
  // forty-five sentences for a board member's own page (`/panel`) (6.80%, still 7%), then
  // ninety-six sentences for the review queue and a reviewer's place on the register (`/review`) (6.57%, still 7%), then
  // fifty-three for one assignment on the review queue (6.46%, now 6%), then
  // eighty-nine for the staff console (`/admin`) (6.27%, still 6%), then
  // forty-four for the staff console's navigation word and the sentence beside each of its links (6.18%, still 6%).
  // What they are shown did not get smaller; what is counted got bigger.
  for (const [code] of partly) {
    assert.equal(coverageOf(code).translated, 192, code);
    assert.equal(coverageOf(code).total, 3107);
    assert.equal(coverageOf(code).percent, 6, code);
  }
  // The browser check of the language page types this number, and twice
  // (2026-11-27 and 2026-11-28) it went stale and failed in CI after a push
  // that this file had passed. It is read here so that it fails here first.
  const browserCheck = readFileSync(new URL('../../../scripts/companion-browser-smoke.mjs', import.meta.url), 'utf8');
  const hausa = coverageOf('ha').percent;
  assert.ok(browserCheck.includes(`assert.ok(settings.includes('${hausa}%'),`), `scripts/companion-browser-smoke.mjs does not look for ${hausa}%`);
  assert.ok(browserCheck.includes(`assert.ok(!settings.includes('${hausa}% of these interface strings'),`));
  assert.ok(browserCheck.includes(`/language shows a Hausa reader ${hausa}% in Hausa.`));
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

  // Nothing on the dashboard is English for a reader of another language any
  // more, so nothing on it is marked as English. Three parts were: the streak
  // strip and the live classes card until 2026-11-25, and memorisation, the
  // last, until later the same day.
  assert.doesNotMatch(page, /const english = /u);
  assert.equal(page.match(/\{\.\.\.english\}/gu), null);
  assert.doesNotMatch(page.replace(/\/\*[\s\S]*?\*\//gu, '').replace(/^\s*\/\/.*$/gmu, ''), /lang: 'en'/u);
  assert.match(page, /<Link href="\/hifz">\{t\('hifz\.cardLink'\)\}<\/Link>/u);
  assert.match(page, /<EngagementStrip engagement=\{engagement\} code=\{shown\.code\} \/>/u);
  assert.match(page, /<Link href="\/progress">\{t\('prog\.wholeRecord'\)\}<\/Link>/u);

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
  // Every screen that shows the prompt is translated and passes the
  // dashboard's words: the account page, the family page and, last, the buy
  // page. Nothing calls it without words any more.
  for (const caller of ['../app/account/page.tsx', '../app/family/page.tsx', '../app/courses/[slug]/buy/page.tsx']) {
    assert.match(read(caller), /<ClaimLearner[^>]*words=/u, caller);
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

  // No part of this page is English for a reader whose language is written.
  // The open discussion was the last (see its own test below); before it the
  // players, the note about a recording that cannot play, the practice
  // questions, the notes and bookmark, and the sources card.
  assert.doesNotMatch(page, /const english =|\{\.\.\.english\}|lang: 'en'/u);
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
  assert.match(page, /\{discussionOn \? \(\s+<Discussion\s+lessonId=\{lesson\.id\}/u);

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

test('the open discussion on the lesson page is in the reader’s language', () => {
  const page = read('../app/learn/[enrolmentId]/lesson/[lessonId]/page.tsx');
  const source = read('../app/learn/[enrolmentId]/lesson/[lessonId]/discussion.tsx');
  // The heading and the closed card were there already; twenty-three more.
  const keys = allKeys.filter((key) => key.startsWith('lesson.discussion'));
  assert.equal(keys.length, 25);
  for (const key of keys) assert.ok(page.includes(`t('${key}')`), `${key} is translated and never shown`);

  // The page hands the component its words, the report form's words for the
  // forms under each post, and the language they are in.
  assert.match(page, /words=\{discussionWords\}\s+reportWords=\{reportWords\}\s+locale=\{shown\.code\}/u);
  assert.match(source, /const say = words \?\? ENGLISH;/u);
  assert.equal(source.match(/words=\{reportWords\} locale=\{locale\}/gu)?.length, 2);
  // Its own English is the catalogue's English, word for word, so a caller
  // that hands it nothing reads what an English page reads.
  const english = source.split('const ENGLISH')[1]?.split('export function Discussion')[0] ?? '';
  for (const key of keys) assert.ok(english.includes(`'${en[key]}'`), `${key} differs from the component's English`);
  // Nothing is typed into what it draws.
  const drawn = source.split('export function Discussion')[1] ?? '';
  for (const sentence of [
    'Discussion<', 'Awaiting review', 'Withdrawn', '>Reply<', 'Report this', 'Reply to', 'Cancel reply', 'Ask a question',
    'No questions yet', "'Posted.'", "'Sent.", 'Could not post', '· teacher', "'Send'", 'Sending…',
  ]) {
    assert.ok(!drawn.includes(sentence), `"${sentence}" is still typed into the discussion`);
  }

  // A post that did not go through. The server's sentence is English and is
  // printed only by a caller with no words; no reply at all is "could not
  // confirm", never "try again"; and what was sent is read back, not assumed.
  assert.match(source, /refuse\(words \|\| typeof json\.error !== 'string' \? ours : json\.error\);/u);
  assert.match(source, /\} catch \{\s+\/\/ No reply at all: it may have arrived\.\s+refuse\(say\.uncertain\);/u);
  assert.match(source, /setMessage\(json\.held \? say\.held : say\.posted\);/u);
  assert.match(source, /const outcome = discussionOutcomeOf\(status, code\);/u);
  // The sentence for that tells the learner to look before sending again, in
  // English at least: nothing stops the same question being held twice.
  assert.match(en['lesson.discussionUncertain'], /Reload the page to check before sending it again\.$/u);

  // A question in one box is not sent as a reply from the other.
  assert.match(source, /const body = parentId === null \? question : reply;/u);
  // The writer of a post a moderator took down is told, on a reply as well.
  assert.match(source, /post\.visibilityState === 'hidden' \|\| post\.visibilityState === 'removed'/u);
  assert.equal(source.match(/\{standing\((?:p|r)\)\}/gu)?.length, 2);

  // What people wrote, and their names, keep their own direction; a name the
  // profile does not have is said in the reader's language.
  assert.equal(source.match(/<span className="t" dir="auto" style=\{written\}>/gu)?.length, 2);
  assert.match(source, /<bdi>\{nameOf\(post\)\}<\/bdi>/u);
  assert.match(source, /post\.authorIsNamed \? post\.authorName : say\.someone/u);
  assert.equal(source.match(/dir="auto"\s+maxLength=\{DISCUSSION_BODY_MAX\}/gu)?.length, 2);

  // In every language: the name stays in the sentence that carries it, and
  // the sentence for a held post is not the sentence for a published one.
  for (const [code, messages] of Object.entries(LESSON)) {
    assert.ok(messages?.['lesson.discussionReplyTo']?.includes('{name}'), `${code}: the reply sentence lost its name`);
    assert.notEqual(messages?.['lesson.discussionHeld'], messages?.['lesson.discussionPosted'], code);
    assert.notEqual(messages?.['lesson.discussionRefused'], messages?.['lesson.discussionUncertain'], code);
    assert.notEqual(messages?.['lesson.discussionEmpty'], messages?.['lesson.discussionEmptyAsk'], code);
    assert.notEqual(messages?.['lesson.discussionAwaiting'], messages?.['lesson.discussionWithdrawn'], code);
    assert.notEqual(messages?.['lesson.discussionClosed'], messages?.['lesson.discussionClosedNow'], code);
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

test('the account page is in the reader’s language, and its form says a refusal by name', () => {
  const page = read('../app/account/page.tsx');
  const form = read('../app/account/profile-form.tsx');
  const route = read('../app/api/account/route.ts');
  const lib = read('./account.ts');

  // One language under one `lang`, on the rule the dashboard set.
  assert.match(page, /const shown = languageShownFor\(locale, 'account'\);/u);
  assert.match(page, /const t = translator\(shown\.code\);/u);
  assert.match(page, /\{\.\.\.\(mismatch \? \{ lang: shown\.code, dir: shown\.dir \} : \{\}\)\}/u);
  assert.doesNotMatch(page, /^'use client'/u);

  // Every account sentence is on the page: none is translated and never shown.
  for (const key of unwrittenKeys.filter((k) => k.startsWith('account.'))) {
    assert.ok(page.includes(`'${key}'`), `${key} is translated and never shown`);
  }

  // No English sentence is left written into the page. What remains in
  // quotes is an address, a class name, a key or a provider's name.
  const sentences = [...page.matchAll(/>\s*([A-Z][a-z]+(?: [a-z’']+){2,}[^<{]*)</gu)].map((m) => m[1]);
  assert.deepEqual(sentences, [], `the account page still writes English inline: ${sentences.join(' | ')}`);
  for (const phrase of ['Account settings', 'Signed in as', 'How you sign in', 'Download my data', 'Close this account']) {
    assert.equal(page.includes(phrase), false, phrase);
  }

  // How the account signs in is said from the list of methods. The sentence
  // the database writes beside it is English and is not read.
  assert.doesNotMatch(page, /methods\?*\.summary/u);
  // A name, an address and a provider's name keep their own direction.
  assert.match(page, /<strong><bdi dir="ltr">\{identity\}<\/bdi><\/strong>/u);
  assert.match(page, /<strong><bdi>\{ownLearner\.display_name\}<\/bdi><\/strong>/u);
  assert.match(page, /<bdi dir="ltr">\{otherMethods\.join\(', '\)\}<\/bdi>/u);
  // The owner's document title is English, and marked.
  assert.match(page, /<bdi \{\.\.\.english\}>\{row\.title\}<\/bdi>/u);
  // Counts take the form their language wants, and its digits.
  assert.match(page, /countLabel\(shown\.code, outstanding, \{ one: 'account\.owedOne', other: 'account\.owedOther' \}\)/u);
  assert.match(page, /countLabel\(shown\.code, unread, \{ one: 'account\.toldUnreadOne', other: 'account\.toldUnreadOther' \}\)/u);
  // The phone card is handed its words and the name of every country in the
  // language of the page; nothing on it is marked as English any more. It is
  // drawn while numbers are collected, and also for a number already stored,
  // which its owner must be able to see and remove.
  assert.doesNotMatch(page, /<div \{\.\.\.english\}>\s*<PhoneForm/u);
  assert.match(page, /\{\(phone\?\.enabled === true \|\| storedPhone\) && \(\s*<PhoneForm/u);
  assert.match(page, /collecting=\{phone\?\.enabled === true\}/u);
  assert.match(page, /countries=\{phoneCountryNames\(shown\.code\)\}/u);
  assert.match(page, /<PhoneForm[\s\S]*?words=\{\{\s*locale: shown\.code,/u);
  // Three downloads are three buttons side by side on a desk, not three bars.
  assert.match(page, /<div className="page-actions" style=\{\{ marginTop: 0 \}\}>/u);

  // The form is handed its words, and asks the catalogue for none: the
  // account sentences are not in what every page carries.
  assert.match(form, /^'use client';/u);
  assert.doesNotMatch(form, /useT\(|@\/lib\/i18n/u);
  assert.match(form, /const say = words \?\? ENGLISH;/u);
  assert.match(page, /<ProfileForm[\s\S]*?words=\{\{/u);
  const src = new URL('../', import.meta.url);
  const files = (dir: string): string[] =>
    readdirSync(new URL(dir, src), { withFileTypes: true }).flatMap((entry) =>
      entry.isDirectory() ? files(`${dir}${entry.name}/`) : /\.tsx?$/u.test(entry.name) ? [`${dir}${entry.name}`] : [],
    );
  const clients = files('').filter((file) => {
    const text = readFileSync(new URL(file, src), 'utf8');
    return /^\s*'use client'/u.test(text) && /'account\.[a-zA-Z]+'/u.test(text);
  });
  assert.deepEqual(clients, [], 'a client component asks for an account sentence the shell does not carry');

  // A refusal reaches the form as a name. The form says its own sentence for
  // it and never prints the server's; the database's sentence never leaves.
  assert.match(form, /setError\(sentenceFor\(isProblem\(result\?\.code\) \? result\.code : 'failed'\)\);/u);
  assert.doesNotMatch(form, /result\?*\.message/u);
  assert.doesNotMatch(lib.slice(0, lib.indexOf('export function exportFileName')), /error\.message/u);
  assert.match(lib, /if \(error\) return refused\('failed'\);/u);
  assert.match(route, /result\.code === 'failed' \? 502 : result\.code === 'not_found' \? 409 : 400/u);
  // The same check runs in the browser before anything is sent.
  assert.match(form, /const problem = accountProfileProblem\(\{ displayName, preferredLanguage, timezone \}\);/u);
  // A code and a zone name are Latin whatever the page is; a name is not.
  assert.equal((form.match(/dir="ltr"/gu) ?? []).length, 2);
  assert.match(form, /id="account-display-name"\s+autoComplete="name"\s+dir="auto"/u);

  // Every problem the library can name has a sentence on the page.
  for (const code of ['name_missing', 'name_long', 'language_code', 'zone_long', 'zone_invalid', 'signed_out', 'not_found', 'malformed', 'failed']) {
    assert.match(page, new RegExp(`${code}: t\\('account\\.form[A-Za-z]+'\\)`, 'u'), code);
    assert.ok(lib.includes(`| '${code}'`), code);
  }
  // The two limits are the library's, written in the reader's digits.
  assert.match(page, /maxima=\{\{ name: num\(ACCOUNT_NAME_MAX\), zone: num\(ACCOUNT_ZONE_MAX\) \}\}/u);
  for (const code of ['ar', 'fr', 'zh-hans'] as const) {
    const t = translator(code);
    assert.match(t('account.formNameLong'), /\{count\}/u);
    assert.notEqual(t('account.closeBody'), en['account.closeBody']);
  }
  // The count of documents owed, which used to be a sentence of its own in
  // `lib/policies.ts`: one and many in English, the reader's form elsewhere.
  const owed = { one: 'account.owedOne', other: 'account.owedOther' } as const;
  assert.equal(countLabel('en', 1, owed), '1 document is waiting for your agreement.');
  assert.equal(countLabel('en', 4, owed), '4 documents are waiting for your agreement.');
  assert.equal(countLabel('fr', 1, owed), '1 document attend votre accord.');
  assert.equal(countLabel('fr', 4, owed), '4 documents attendent votre accord.');
  assert.equal(en['account.termsNone'], 'Nothing is waiting for your agreement.');
  // A held language reads the page in English, whole.
  assert.equal(languageShownFor('so', 'account').code, 'en');
  assert.equal(translator('so')('account.closeBody'), en['account.closeBody']);
});

test('the family pages are in the reader’s language, and their forms say a refusal by name', () => {
  const page = read('../app/family/page.tsx');
  const child = read('../app/family/[childId]/page.tsx');
  const create = read('../app/family/create-family.tsx');
  const add = read('../app/family/add-child.tsx');
  const adult = read('../app/family/family-adult.tsx');
  const declaration = read('../app/family/age-declaration.tsx');
  const lib = read('./family.ts');
  const names = read('./family-adult.ts');
  const courses = read('./learner-courses.ts');

  // One language under one `lang`, on the rule the dashboard set, on both pages.
  for (const [name, source] of [['family', page], ['child', child]] as const) {
    assert.match(source, /const shown = languageShownFor\(locale, 'family'\);/u, name);
    assert.match(source, /const t = translator\(shown\.code\);/u, name);
    assert.match(source, /const frame = shown\.code !== locale \? \{ lang: shown\.code, dir: shown\.dir \} : \{\};/u, name);
    assert.match(source, /<div className="container section" \{\.\.\.frame\}>/u, name);
    assert.doesNotMatch(source, /^'use client'/u, name);
    // No English sentence is left written into either page.
    const sentences = [...source.matchAll(/>\s*([A-Z][a-z]+(?: [a-z’']+){2,}[^<{]*)</gu)].map((m) => m[1]);
    assert.deepEqual(sentences, [], `the ${name} page still writes English inline: ${sentences.join(' | ')}`);
  }
  for (const phrase of ['No family yet', 'Children and progress', 'Also learning here', 'Not enrolled', 'Back to my learning']) {
    assert.equal(page.includes(phrase), false, phrase);
  }
  for (const phrase of ['Nothing here yet', 'in progress', 'Look again', 'Carry on', 'Back to your family', 'No age band']) {
    assert.equal(child.includes(phrase), false, phrase);
  }

  // Every family sentence is said somewhere: on a page, or by the module that
  // chooses between sentences for a page.
  const said = page + child + names + courses;
  for (const key of unwrittenKeys.filter((k) => k.startsWith('family.'))) {
    assert.ok(said.includes(`'${key}'`), `${key} is translated and never shown`);
  }

  // The three forms are handed their words and have no English of their own:
  // nothing to fall back to, so nothing to drift from the catalogue.
  for (const [name, source] of [['create', create], ['add', add], ['adult', adult]] as const) {
    assert.match(source, /^'use client';/u, name);
    assert.doesNotMatch(source, /useT\(|@\/lib\/i18n/u, name);
    assert.doesNotMatch(source, /const ENGLISH/u, name);
    assert.match(source, /words: [A-Za-z]+Words/u, name);
    // A refusal reaches the form as a name, and the server's sentence is not shown.
    assert.match(source, /setError\(sentenceFor\(familyOutcomeOf\((?:res|response)\.status, (?:json|result)\?\.code\)\)\);/u, name);
    assert.doesNotMatch(source, /\.message\b/u, name);
    // A request that could not be made is caught and said. Two of these three
    // had no catch: the button stayed on "Adding…" for good.
    assert.match(source, /\} catch \{[\s\S]*?setError\(words\.unreachable\);/u, name);
    // An error is announced as one.
    assert.match(source, /role="alert"/u, name);
  }
  assert.match(page, /<CreateFamily\s+words=\{\{/u);
  assert.match(page, /<AddChild familyId=\{family\.id\} words=\{childWords\} \/>/u);
  assert.match(page, /<FamilyAdultCard familyId=\{family\.id\} state=\{state\} words=\{adultWords\} \/>/u);
  const src = new URL('../', import.meta.url);
  const files = (dir: string): string[] =>
    readdirSync(new URL(dir, src), { withFileTypes: true }).flatMap((entry) =>
      entry.isDirectory() ? files(`${dir}${entry.name}/`) : /\.tsx?$/u.test(entry.name) ? [`${dir}${entry.name}`] : [],
    );
  const clients = files('').filter((file) => {
    const text = readFileSync(new URL(file, src), 'utf8');
    return /^\s*'use client'/u.test(text) && /'family\.[a-zA-Z]+'/u.test(text);
  });
  assert.deepEqual(clients, [], 'a client component asks for a family sentence the shell does not carry');

  // The database's own sentence never leaves the four writers.
  const writers = lib.slice(lib.indexOf('export type AddChildOutcome'));
  for (const fn of ['addChildCodeOf', 'createFamilyCodeOf', 'joinFamilyCodeOf', 'leaveFamilyCodeOf']) {
    assert.match(writers, new RegExp(`if \\(error\\) return familyRefusal\\(${fn}\\(error\\)\\);`, 'u'), fn);
  }
  for (const fn of ['addChild', 'createFamily', 'joinFamilyAsLearner', 'leaveFamilyAsLearner']) {
    const start = lib.indexOf(`export async function ${fn}(`);
    const body = lib.slice(start, lib.indexOf('\n}\n', start));
    assert.ok(start > 0, fn);
    assert.doesNotMatch(body, /error\.message/u, `${fn} passes the database's sentence on`);
  }
  for (const route of ['create', 'children', 'learner']) {
    const source = read(`../app/api/family/${route}/route.ts`);
    assert.match(source, /NextResponse\.json\(familyRefusal\(code\), \{ status: familyStatusOf\(code\) \}\)/u, route);
    assert.doesNotMatch(source, /code: 'rejected'/u, route);
  }

  // Counts take the form their language wants, and its digits.
  assert.match(page, /countLabel\(shown\.code, active\.length, \{ one: 'family\.adultsOne', other: 'family\.adultsOther' \}\)/u);
  assert.match(child, /countLabel\(shown\.code, active\.length, \{ one: 'family\.goingOne', other: 'family\.goingOther' \}\)/u);
  const adults = { one: 'family.adultsOne', other: 'family.adultsOther' } as const;
  assert.equal(countLabel('en', 1, adults), '1 adult');
  assert.equal(countLabel('en', 3, adults), '3 adults');
  assert.equal(countLabel('fr', 0, adults), '0 adulte');
  assert.equal(countLabel('fr', 3, adults), '3 adultes');
  assert.equal(countLabel('fa', 3, { one: 'family.childrenOne', other: 'family.childrenOther' }), '۳ کودک');
  // The limits and the age are the library's, written in the reader's digits.
  assert.match(page, /t\('family\.createNameLong', \{ count: num\(FAMILY_NAME_MAX\) \}\)/u);
  assert.match(page, /t\('family\.childDeclaration', \{ age: num\(DECLARATION_AGE\) \}\)/u);

  // A name keeps its own direction wherever it is put.
  assert.match(page, /<h3><bdi>\{family\.name \?\? t\('nav\.family'\)\}<\/bdi><\/h3>/u);
  assert.match(page, /<h3 style=\{\{ marginTop: 0 \}\}><bdi>\{child\.displayName\}<\/bdi><\/h3>/u);
  assert.match(page, /<bdi>\{m\.displayName \?\? t\('family\.unnamed'\)\}<\/bdi>/u);
  assert.match(child, /<h1 style=\{\{ fontSize: '2\.2rem' \}\}><bdi>\{learner\.display_name\}<\/bdi><\/h1>/u);
  // A list is joined by the reader's language, not by a comma in the page.
  assert.equal((page.match(/<SaidList/gu) ?? []).length, 2);
  assert.doesNotMatch(page, /\.join\(', '\)/u);
  // A membership that is not active, and a profile that is not, are said in
  // words; the database's own word used to be printed.
  assert.match(page, /t\(MEMBER_KEYS\[m\.status\] \?\? 'family\.member'/u);
  assert.match(page, /<span className="badge neutral">\{t\('family\.archived'\)\}<\/span>/u);
  assert.doesNotMatch(page, /\{child\.status\}/u);

  // What is still English is the declaration, which marks itself: a
  // declaration keeps one wording for legal reasons (owner, 2026-11-25). The
  // streak strip was the other thing; it is in the page's language now, and
  // the page marks nothing as English any more.
  assert.doesNotMatch(page, /const english =|\{\.\.\.english\}/u);
  assert.match(page, /<EngagementStrip engagement=\{engagement\} subject=\{child\.displayName\} code=\{shown\.code\} \/>/u);

  // A child's own login is the fourth form (2026-11-25). It was the one card
  // on this page still in English, wrapped as English by the page.
  const login = read('../app/family/child-login-card.tsx');
  assert.doesNotMatch(page, /<div \{\.\.\.english\}>\s*<ChildLoginCard/u);
  assert.match(page, /<ChildLoginCard[\s\S]*?words=\{loginWords\}\s+madeOn=\{formatDay\(shown\.code, login\.createdAt\)\}/u);
  assert.match(login, /^'use client';/u);
  assert.doesNotMatch(login, /useT\(|@\/lib\/i18n/u);
  assert.match(login, /words: ChildLoginWords;/u);
  // No English of its own: nothing between tags, and no sentence in quotes.
  const inline = [...login.matchAll(/>\s*([A-Z][a-z]+(?: [a-z’']+){1,}[^<{]*)</gu)].map((m) => m[1]);
  assert.deepEqual(inline, [], `the login card still writes English inline: ${inline.join(' | ')}`);
  const quoted = [...login.slice(login.indexOf('export function ChildLoginCard')).matchAll(/'([A-Z][a-z]+(?: [a-z]+){2,}[^']*)'/gu)].map((m) => m[1]);
  assert.deepEqual(quoted, [], `the login card still holds an English sentence: ${quoted.join(' | ')}`);
  // A refusal reaches it as a name, three times, and the server's sentence is
  // never shown. The helpers that return English are not asked.
  assert.equal((login.match(/setError\(sentenceFor\(childLoginOutcomeOf\(res\.status, json\?\.code\), '(?:make|reset|detach)'\)\);|const code = childLoginOutcomeOf\(res\.status, json\?\.code\);/gu) ?? []).length, 3);
  assert.doesNotMatch(login, /\.message\b/u);
  assert.doesNotMatch(login, /childLoginSentence|usernameProblem|passwordProblem/u);
  // An answer that is lost is not a failure: each of the three says to look first.
  for (const doing of ['make', 'reset', 'detach']) {
    assert.match(login, new RegExp(`\\} catch \\{[\\s\\S]*?setError\\(words\\.unconfirmed\\.${doing}\\);`, 'u'), doing);
  }
  assert.match(login, /role="alert"/u);
  // The day is written by the page in the reader's language, and a name and
  // a username keep their own direction inside the sentence.
  assert.doesNotMatch(login, /toLocaleDateString/u);
  assert.match(login, /const name = <bdi>\{childName\}<\/bdi>;/u);
  assert.match(login, /username: <strong><bdi>\{shownUsername \?\? ''\}<\/bdi><\/strong>,/u);
  // Every name the route can send has a sentence, and each is its own.
  const refusals = page.slice(page.indexOf('    refusals: {'), page.indexOf('    unconfirmed: {'));
  const named = [...refusals.matchAll(/^      ([a-z_]+): t\('([a-zA-Z.]+)'/gmu)].map((m) => [m[1], m[2]] as const);
  assert.equal(named.length, 17);
  assert.equal(new Set(named.map(([, key]) => en[key as keyof typeof en])).size, 17);
  assert.match(page, /const email = \{ email: `\\u2066\$\{PRIVACY_CONTACT\}\\u2069` \};/u);
  assert.match(declaration, /const ENGLISH = \{ lang: 'en', dir: 'ltr' \} as const;/u);
  assert.equal(declaration.match(/\{\.\.\.ENGLISH\}/gu)?.length, 2);
  // Its date is said with a zone, the same on the server and in the browser.
  assert.match(declaration, /formatDateTime\('en', declaration\.declaredAt, 'UTC'\)/u);
  assert.doesNotMatch(declaration, /toLocaleDateString/u);
  assert.match(declaration, /\} catch \{[\s\S]*?setBusy\(false\);/u);

  // The declaration and the form under it are offered once per family. A
  // family with no children used to be given both twice.
  assert.equal((page.match(/<AgeDeclarationCard /gu) ?? []).length, 1);
  assert.equal((page.match(/<AddChild /gu) ?? []).length, 1);

  // The learner-profile button is the dashboard's, with the dashboard's words.
  assert.match(page, /<ClaimLearner\s+label=\{t\('learn\.claim'\)\}\s+words=\{\{/u);
  // One course's sentences are chosen by the library and said with the page's words.
  assert.match(child, /const copy: LearnerCourseCopy = \{/u);
  assert.match(child, /plural: \(count\) => pluralForm\(shown\.code, count\)/u);
  assert.match(child, /dateStyle: 'medium', timeZone: 'UTC'/u);
  assert.doesNotMatch(child + page, /AGE_BAND_LABEL/u);

  for (const code of ['ar', 'fr', 'zh-hans', 'uz'] as const) {
    const t = translator(code);
    assert.notEqual(t('family.leaveNote'), en['family.leaveNote'], code);
    assert.match(t('family.childDeclaration'), /\{age\}/u, code);
    assert.equal(languageShownFor(code, 'family').code, code);
  }
  // A held language reads both pages in English, whole.
  assert.equal(languageShownFor('so', 'family').code, 'en');
  assert.equal(translator('so')('family.leaveNote'), en['family.leaveNote']);
});

test('the buy page is in the reader’s language, and its form says a refusal by its reason', () => {
  const page = read('../app/courses/[slug]/buy/page.tsx');
  const form = read('../app/courses/[slug]/buy/buy-form.tsx');
  const outcome = read('./checkout-outcome.ts');

  assert.match(page, /const shown = languageShownFor\(locale, 'buy'\);/u);
  assert.match(page, /const frame = shown\.code !== locale \? \{ lang: shown\.code, dir: shown\.dir \} : \{\};/u);
  assert.equal(page.match(/<div className="page narrow" \{\.\.\.frame\}>/gu)?.length, 3, 'a branch of the page has no frame');
  for (const phrase of ['>Checkout<', '<strong>Checkout', 'What you will pay', 'Buy it for myself', 'Back to the course', 'Priced for', 'Nothing has been charged', 'One-off purchase']) {
    assert.ok(!page.includes(phrase), `the buy page still says "${phrase}" itself`);
  }

  // Every buy sentence is said by the page: its own, or one it hands the form.
  for (const key of unwrittenKeys.filter((k) => k.startsWith('buy.'))) {
    assert.ok(page.includes(`'${key}'`), `${key} is translated and never shown`);
  }

  // The form is handed its words and has no English of its own, with one
  // exception that is marked: the 14-day withdrawal box.
  assert.match(form, /^'use client';/u);
  assert.doesNotMatch(form, /useT\(|@\/lib\/i18n/u);
  assert.match(form, /words: BuyWords;/u);
  assert.match(page, /words=\{words\}\s+markEnglish=\{shown\.code !== 'en'\}/u);
  assert.match(form, /const english = markEnglish \? \(\{ lang: 'en', dir: 'ltr' \} as const\) : \{\};/u);
  assert.match(form, /\{withdrawal\?\.statutory && \(\s+\/\/ English, and marked as English on a page that is not\.[^\n]*\n[^\n]*\n\s+<div \{\.\.\.english\}>/u);
  for (const phrase of ['Who is this for', 'Check the price', 'Continue to payment', 'Starting', 'Pay with', 'Mobile money number', 'Your order was saved', 'could not be started', 'takes off']) {
    assert.ok(!form.includes(phrase), `the form still says "${phrase}" itself`);
  }
  const src = new URL('../', import.meta.url);
  const files = (dir: string): string[] =>
    readdirSync(new URL(dir, src), { withFileTypes: true }).flatMap((entry) =>
      entry.isDirectory() ? files(`${dir}${entry.name}/`) : /\.tsx?$/u.test(entry.name) ? [`${dir}${entry.name}`] : [],
    );
  const clients = files('').filter((file) => {
    const text = readFileSync(new URL(file, src), 'utf8');
    return /^\s*'use client'/u.test(text) && /'buy\.[a-zA-Z]+'/u.test(text);
  });
  assert.deepEqual(clients, [], 'a client component asks for a buy sentence the shell does not carry');

  // The server's sentence is never shown: not `error`, not `message`.
  assert.doesNotMatch(form, /json\??\.error|json\??\.message|\.message \?\?/u);
  assert.match(form, /const reason = checkoutOutcomeOf\(res\.status, json\?\.reason\);/u);
  assert.equal(form.match(/checkoutOutcomeOf\(res\.status, json\?\.reason\)/gu)?.length, 2, 'the price check and the order do not both read the reason');
  // One sentence for every reason, and the type makes a missing one a
  // compile error; this checks the page names them all.
  const reasons = [...outcome.matchAll(/^ {2}'([a-z_]+)',$/gmu)].map((m) => m[1]);
  assert.equal(reasons.length, 31);
  for (const reason of reasons) {
    assert.match(page, new RegExp(`^\\s+${reason}: `, 'mu'), `${reason} has no sentence on the buy page`);
  }
  assert.match(form, /reasons: Record<CheckoutReason, string>;/u);

  // Both requests used to fail silently when they could not be made.
  assert.equal(form.match(/\} catch \{/gu)?.length, 2, 'a request that cannot be made is not caught');
  // With no connection the request never left; otherwise an order may exist.
  assert.match(form, /setMessage\(offline \? words\.unreachable : words\.reasons\.unconfirmed\);/u);
  // Pressing twice sent two checkouts: the button was disabled only while the
  // page was read again, not while the request was out.
  assert.match(form, /if \(busy\) return;/u);
  assert.match(form, /<button type="button" className="btn" onClick=\{buy\} disabled=\{busy\}>/u);
  assert.doesNotMatch(form, /disabled=\{pending\}/u);
  // "Your order was saved" is said only when the reply names an order and
  // the reply itself can be believed.
  assert.match(form, /const saved = typeof json\?\.orderId === 'string' && json\.orderId !== '' && reason !== 'unconfirmed';/u);

  // An amount is a currency code and Latin digits whatever the page is.
  assert.match(page, /<bdi dir="ltr">\{format\(offering\.price\.amount\)\}<\/bdi>/u);
  assert.match(form, /<bdi dir="ltr">\{value\}<\/bdi>/u);
  // A learner's name and a country's name keep their own direction.
  assert.match(page, /t\('buy\.hasAlready', \{ name: isolate\(owner\.name\) \}\)/u);
  assert.match(page, /t\('buy\.pricedFor', \{ country: isolate\(place\) \}\)/u);
  assert.match(form, /<Say text=\{words\.forOne\} parts=\{\{ name: <bdi>\{only\}<\/bdi> \}\} \/>/u);
  assert.match(page, /<h1 dir="auto">\{course\.title\}<\/h1>/u);

  // A family whose first learner had the course was told to "choose another
  // learner below" above a page with no form on it. The price is asked for
  // again without a learner, and nobody is chosen on the buyer's behalf.
  assert.match(page, /const owner = first\.kind === 'entitled' \? learners\.find\(\(l\) => l\.id === defaultLearnerId\) : undefined;/u);
  assert.match(page, /resolveOffering\(supabase, \{ courseId: course\.id, learnerProfileId: null, country \}\)/u);
  assert.match(page, /defaultLearnerId=\{owner \? \(buyable\.length === 1 \? buyable\[0\]!\.id : ''\) : defaultLearnerId\}/u);
  assert.match(form, /\{defaultLearnerId === '' && <option value="">\{words\.choose\}<\/option>\}/u);
  assert.match(form, /if \(learnerId === ''\) \{\s+setTone\('error'\);\s+setMessage\(words\.reasons\.learner_required\);\s+return;/u);

  // The learner-profile button is handed the dashboard's words here too.
  assert.match(page, /<ClaimLearner\s+label=\{t\('buy\.claim'\)\}\s+note=\{t\('buy\.claimNote'\)\}\s+words=\{\{/u);

  // A country's name comes from the runtime's tables in the nominative, so
  // outside English the sentence puts it after a colon rather than inside a
  // phrase that would need another case.
  for (const code of ['ar', 'fr', 'tr', 'kk', 'zh-hans', 'uz', 'ta'] as const) {
    const t = translator(code);
    assert.equal(languageShownFor(code, 'buy').code, code);
    assert.notEqual(t('buy.unconfirmed'), en['buy.unconfirmed'], code);
    for (const key of ['buy.pricedFor', 'buy.noPriceLead'] as const) {
      assert.match(t(key), /[:：][\s\u00a0]*\{country\}[.。]?$/u, `${code} ${key}`);
    }
  }
  assert.equal(countryNameIn('UG', 'en'), 'Uganda');
  assert.equal(countryNameIn('US', 'en'), 'the United States');
  assert.equal(countryNameIn('UG', 'fr'), 'Ouganda');
  assert.equal(countryNameIn('UG', 'ar'), 'أوغندا');
  assert.equal(countryNameIn('zz9', 'fr'), null);
  assert.equal(countryNameIn(null, 'fr'), null);

  // A held language reads the page in English, whole.
  assert.equal(languageShownFor('so', 'buy').code, 'en');
  assert.equal(translator('so')('buy.unconfirmed'), en['buy.unconfirmed']);
});

test('closing an account is in the reader’s language, and its form says a refusal by name', () => {
  const page = read('../app/account/delete/page.tsx');
  const form = read('../app/account/delete/erase-form.tsx');
  const outcome = read('./erase-outcome.ts');

  assert.match(page, /const shown = languageShownFor\(locale, 'close'\);/u);
  assert.match(page, /const frame = shown\.code !== locale \? \{ lang: shown\.code, dir: shown\.dir \} : \{\};/u);
  assert.match(page, /<div className="container section" style=\{\{ maxWidth: '46rem' \}\} \{\.\.\.frame\}>/u);
  for (const phrase of ['Close this account', 'already closed', 'Removed or changed', 'Records that remain', 'cannot be undone', 'Signed in as', 'Lesson notes', 'Account settings']) {
    assert.ok(!page.includes(phrase), `the closing page still says "${phrase}" itself`);
  }

  // Every sentence is said by the page: its own, or one it hands the form.
  for (const key of unwrittenKeys.filter((k) => k.startsWith('close.'))) {
    assert.ok(page.includes(`'${key}'`), `${key} is translated and never shown`);
  }

  // The form is handed its words and has no English of its own.
  assert.match(form, /^'use client';/u);
  assert.doesNotMatch(form, /useT\(|@\/lib\/i18n/u);
  assert.match(form, /words: EraseWords \}/u);
  for (const phrase of ['to confirm', 'Close my account', 'Closing…', 'Keep my account', 'becomes available', 'cooling-off']) {
    assert.ok(!form.includes(phrase), `the form still says "${phrase}" itself`);
  }
  const src = new URL('../', import.meta.url);
  const files = (dir: string): string[] =>
    readdirSync(new URL(dir, src), { withFileTypes: true }).flatMap((entry) =>
      entry.isDirectory() ? files(`${dir}${entry.name}/`) : /\.tsx?$/u.test(entry.name) ? [`${dir}${entry.name}`] : [],
    );
  const clients = files('').filter((file) => {
    const text = readFileSync(new URL(file, src), 'utf8');
    return /^\s*'use client'/u.test(text) && /'close\.[a-zA-Z]+'/u.test(text);
  });
  assert.deepEqual(clients, [], 'a client component asks for a closing sentence the shell does not carry');

  // One sentence for every answer the route can give; the type makes a
  // missing one a compile error, and this checks the page names them all.
  const codes = [...outcome.matchAll(/^ {2}\| '([a-z_]+)'/gmu)].map((m) => m[1]);
  assert.equal(codes.length, 10);
  for (const code of codes) {
    assert.match(page, new RegExp(`^\\s+${code}: t\\('close\\.`, 'mu'), `${code} has no sentence on the closing page`);
  }
  assert.match(form, /reasons: Record<EraseCode, string>;/u);

  // What is said afterwards is announced, and the button cannot be pressed twice.
  assert.match(form, /<p className="notice error" role="alert">/u);
  assert.match(form, /if \(busy\) return;/u);
  assert.match(form, /disabled=\{!matches \|\| busy\}/u);
  // A profile with no name can never match, so the form says that instead of
  // showing a button no typing will enable.
  assert.match(form, /if \(name\.length === 0\) \{/u);

  // The address signed in with, the name to type and the address to write to
  // keep their own direction; the certificate label is the database's English.
  assert.match(page, /parts=\{\{ who: <strong><bdi dir="ltr">\{who\}<\/bdi><\/strong> \}\}/u);
  assert.match(form, /parts=\{\{ name: <strong><bdi>\{name\}<\/bdi><\/strong> \}\}/u);
  assert.match(page, /const contact = <bdi dir="ltr">\{PRIVACY_CONTACT\}<\/bdi>;/u);
  assert.match(form, /const contact = <bdi dir="ltr">\{PRIVACY_CONTACT\}<\/bdi>;/u);
  assert.match(page, /<bdi lang="en" dir="ltr">\s+“Deleted learner”\s+<\/bdi>/u);
  // Nobody is "signed in as unknown".
  assert.match(page, /const who = user\.email \?\? user\.phone \?\? null;/u);

  const gaps = (text: string) => [...text.matchAll(/\{[a-zA-Z]+\}/gu)].map((m) => m[0]).sort();
  for (const code of ['ar', 'fr', 'tr', 'kk', 'zh-hans', 'uz', 'ta', 'th'] as const) {
    const t = translator(code);
    assert.equal(languageShownFor(code, 'close').code, code);
    assert.notEqual(t('close.unconfirmed'), en['close.unconfirmed'], code);
    // Each thing put into a sentence sits after a colon, so no language has
    // to inflect an address or a name.
    assert.match(t('close.lede'), /[:：][\s\u00a0]*\{who\}/u, `${code} close.lede`);
    assert.match(t('close.confirmLabel'), /[:：][\s\u00a0]*\{name\}$/u, `${code} close.confirmLabel`);
    for (const key of ['close.goesAppointment', 'close.goesChildren', 'close.held', 'close.appointment', 'close.refused', 'close.unconfirmed'] as const) {
      assert.match(t(key), /[:：][\s\u00a0]*\{contact\}/u, `${code} ${key}`);
    }
    assert.match(t('close.staysHolder'), /[:：][\s\u00a0]*\{label\}/u, `${code} close.staysHolder`);
  }
  // Every gap the English has, every language has, and no other.
  for (const key of unwrittenKeys.filter((k) => k.startsWith('close.')) as (keyof typeof en)[]) {
    for (const code of ['ar', 'ur', 'fa', 'tr', 'bn', 'fr', 'sw', 'zh-hant', 'vi', 'fil', 'az', 'tg', 'ky', 'tk', 'ne'] as const) {
      assert.deepEqual(gaps(translator(code)(key)), gaps(en[key]), `${code} ${key}`);
    }
  }
  // "Nothing was changed" is never said about an answer nobody could read.
  assert.doesNotMatch(en['close.unconfirmed'], /nothing was changed|was not closed|still open/iu);
  assert.match(en['close.refused'], /nothing was changed/u);

  // A held language reads the page in English, whole.
  assert.equal(languageShownFor('so', 'close').code, 'en');
  assert.equal(translator('so')('close.unconfirmed'), en['close.unconfirmed']);
});

test('a copy of your data is in the reader’s language, and a refusal is said where the button is', () => {
  const page = read('../app/account/export/page.tsx');
  const print = read('../app/account/export/print/page.tsx');
  const link = read('../app/account/export/download-copy.tsx');
  const account = read('../app/account/page.tsx');
  const route = read('../app/api/account/export/route.ts');

  for (const [name, text] of [['the export page', page], ['the print page', print]] as const) {
    assert.match(text, /const shown = languageShownFor\(locale, 'export'\);/u, name);
    assert.match(text, /const frame = shown\.code !== locale \? \{ lang: shown\.code, dir: shown\.dir \} : \{\};/u, name);
    assert.match(text, /export async function generateMetadata\(\): Promise<Metadata>/u, name);
    assert.doesNotMatch(text, /export const metadata/u, name);
  }
  assert.match(page, /<div className="page narrow" \{\.\.\.frame\}>/u);
  assert.match(print, /<div className="page narrow export-print-page" \{\.\.\.frame\}>/u);
  for (const phrase of ['Get a copy', 'Download my data', 'Read it here', 'What is in it', 'What is not', 'Other people', 'To print', 'Print this page', 'Nothing is recorded', 'Back to the export']) {
    assert.ok(!page.includes(phrase), `the export page still says "${phrase}" itself`);
    assert.ok(!print.includes(phrase), `the print page still says "${phrase}" itself`);
  }

  // Every sentence is said by one of the two pages.
  for (const key of unwrittenKeys.filter((k) => k.startsWith('export.'))) {
    assert.ok(page.includes(`'${key}'`) || print.includes(`'${key}'`), `${key} is translated and never shown`);
  }

  // The link is handed its words and has no English of its own.
  assert.match(link, /^'use client';/u);
  assert.doesNotMatch(link, /useT\(|@\/lib\/i18n/u);
  assert.match(link, /words: CopyWords;/u);
  assert.match(link, /reasons: Record<ExportCode, string>;/u);
  // With no script it is still a link to the file.
  assert.match(link, /<a className=\{className\} href=\{href\} download onClick=\{ask\}/u);
  // A press that asks for a new tab is the browser's, and a second press waits.
  assert.match(link, /if \(event\.button !== 0 \|\| event\.metaKey \|\| event\.ctrlKey \|\| event\.shiftKey \|\| event\.altKey\) return;/u);
  assert.match(link, /if \(busy\) return;/u);
  // Only a reply that says it is a file is saved as one.
  assert.match(link, /if \(res\.ok && disposition\?\.startsWith\('attachment'\)\) \{/u);
  const src = new URL('../', import.meta.url);
  const files = (dir: string): string[] =>
    readdirSync(new URL(dir, src), { withFileTypes: true }).flatMap((entry) =>
      entry.isDirectory() ? files(`${dir}${entry.name}/`) : /\.tsx?$/u.test(entry.name) ? [`${dir}${entry.name}`] : [],
    );
  const clients = files('').filter((file) => {
    const text = readFileSync(new URL(file, src), 'utf8');
    return /^\s*'use client'/u.test(text) && /'export\.[a-zA-Z]+'/u.test(text);
  });
  assert.deepEqual(clients, [], 'a client component asks for an export sentence the shell does not carry');

  // One sentence for every answer the route can give, on each page that
  // draws the link: the two export pages and the account page.
  for (const [name, text] of [['the export page', page], ['the print page', print], ['the account page', account]] as const) {
    for (const code of ['signed_out', 'limit', 'format', 'failed']) {
      assert.match(text, new RegExp(`^\\s+${code}: t\\('export\\.`, 'mu'), `${code} has no sentence on ${name}`);
    }
    assert.match(text, /unreachable: t\('auth\.offline'\),/u, name);
  }
  // The account page's two downloads are the same link, so the eleventh press
  // there is answered in place too.
  assert.equal(account.match(/<DownloadCopy\b/gu)?.length, 2);
  assert.doesNotMatch(account, /href="\/api\/account\/export[^"]*"\s+download\b/u);

  // Opening the page that prints a copy makes one, so nothing fetches it
  // ahead of a press.
  assert.match(page, /<Link className="btn secondary" href="\/account\/export\/print" prefetch=\{false\}>/u);
  assert.match(account, /href="\/account\/export\/print" prefetch=\{false\}/u);
  assert.doesNotMatch(page, /\.rpc\(/u);

  // The print page says a refusal in place of the tables and never throws
  // the database's sentence.
  assert.match(print, /if \(answer\.error\) refused = exportCodeOf\(answer\.error\);/u);
  assert.match(print, /<p className="notice error" role="alert">\s+\{t\(refused === 'limit' \? 'export\.limit' : 'export\.failed'\)\}/u);
  assert.doesNotMatch(print, /throw /u);
  assert.match(route, /return refuse\(exportCodeOf\(answer\.error\)\);/u);
  assert.doesNotMatch(route, /error\.message/u);

  // The names inside the copy are the stored ones: English, marked as such
  // on a page that is not, and a cell reads in its own direction.
  assert.match(print, /const english = shown\.code !== 'en' \? \(\{ lang: 'en' \} as const\) : \{\};/u);
  assert.match(print, /<bdi \{\.\.\.english\}>\{section\.title\}<\/bdi>/u);
  assert.match(print, /<bdi \{\.\.\.english\}>\{column\}<\/bdi>/u);
  assert.match(print, /<bdi>\{cell\}<\/bdi>/u);
  assert.match(print, /parts=\{\{ lists: <bdi \{\.\.\.english\}>\{cut\.join\(', '\)\}<\/bdi> \}\}/u);
  // The moment the copy was made is printed with its zone: the server does
  // not know the reader's clock.
  assert.match(print, /formatDateTime\(shown\.code, stamp, 'UTC'\)/u);
  // The limit is the database's number in the reader's digits.
  assert.match(page, /t\('export\.cap', \{ count: formatNumber\(shown\.code, EXPORT_ROW_LIMIT\) \}\)/u);

  const gaps = (text: string) => [...text.matchAll(/\{[a-zA-Z]+\}/gu)].map((m) => m[0]).sort();
  for (const code of ['ar', 'fr', 'tr', 'kk', 'zh-hans', 'uz', 'ta', 'th'] as const) {
    const t = translator(code);
    assert.equal(languageShownFor(code, 'export').code, code);
    assert.notEqual(t('export.limit'), en['export.limit'], code);
    // What is put in sits after a colon, so no language inflects it.
    assert.match(t('export.printMade'), /[:：][\s\u00a0]*\{when\}$/u, `${code} export.printMade`);
    assert.match(t('export.printCut'), /[:：][\s\u00a0]*\{lists\}$/u, `${code} export.printCut`);
  }
  for (const key of unwrittenKeys.filter((k) => k.startsWith('export.')) as (keyof typeof en)[]) {
    for (const code of ['ar', 'ur', 'fa', 'tr', 'bn', 'fr', 'sw', 'zh-hant', 'vi', 'fil', 'az', 'tg', 'ky', 'tk', 'ne'] as const) {
      assert.deepEqual(gaps(translator(code)(key)), gaps(en[key]), `${code} ${key}`);
    }
  }

  // "A copy", never "everything": the export leaves things out on purpose.
  assert.doesNotMatch(en['account.dataBody'], /everything/iu);
  assert.match(en['account.dataBody'], /^Download a copy of what we hold/u);
  for (const key of unwrittenKeys.filter((k) => k.startsWith('export.')) as (keyof typeof en)[]) {
    assert.doesNotMatch(en[key], /\beverything\b/iu, key);
  }
  // The sentence for a failure never says a copy was made.
  assert.doesNotMatch(en['export.failed'], /was made|saved/iu);
  assert.match(en['export.failed'], /ask again/iu);

  // A held language reads both pages in English, whole.
  assert.equal(languageShownFor('so', 'export').code, 'en');
  assert.equal(translator('so')('export.limit'), en['export.limit']);
});

test('the reading settings are in the reader’s language, and the controls have no words of their own', () => {
  const page = read('../app/account/accessibility/page.tsx');
  const controls = read('../app/account/accessibility/preferences.tsx');
  const layout = read('../app/layout.tsx');

  assert.match(page, /const shown = languageShownFor\(locale, 'reading'\);/u);
  assert.match(page, /const frame = shown\.code !== locale \? \{ lang: shown\.code, dir: shown\.dir \} : \{\};/u);
  assert.match(page, /<div className="page narrow" \{\.\.\.frame\}>/u);
  assert.match(page, /export async function generateMetadata\(\): Promise<Metadata>/u);
  assert.doesNotMatch(page, /export const metadata/u);
  assert.match(page, /<ReadingPreferences initial=\{prefs\} words=\{words\} \/>/u);
  for (const phrase of ['How this reads', 'Three settings', 'Text size', 'Stronger outlines', 'Follow my device', 'Back to the defaults', 'What is already true', 'The keyboard works', 'What is not here yet', 'Back to my account', 'Saved for this browser']) {
    assert.ok(!page.includes(phrase), `the reading page still says "${phrase}" itself`);
    assert.ok(!controls.includes(phrase), `the reading controls still say "${phrase}" themselves`);
  }
  // The file the controls import carries no sentence either: it used to hold
  // the name and the note of every choice, in English, for every reader.
  const shared = read('./a11y.ts');
  for (const phrase of ['Stronger outlines', 'Follow my device', 'Always reduce motion', 'One step up']) {
    assert.ok(!shared.includes(phrase), `lib/a11y.ts still says "${phrase}"`);
  }

  // The link in the footer is a shell sentence, so a held language keeps the
  // English it would see on the account page, marked as English.
  assert.match(layout, /const readingLabel = languageShownFor\(code, 'account'\);/u);
  assert.match(layout, /translator\(readingLabel\.code\)\('account\.readLink'\)/u);

  const gaps = (text: string) => [...text.matchAll(/\{[a-zA-Z]+\}/gu)].map((m) => m[0]).sort();
  for (const code of ['ar', 'fr', 'tr', 'kk', 'zh-hans', 'uz', 'ta', 'th'] as const) {
    const t = translator(code);
    assert.equal(languageShownFor(code, 'reading').code, code);
    assert.notEqual(t('reading.lede'), en['reading.lede'], code);
    // What is put in sits after a colon, so no language inflects it.
    assert.match(t('reading.rtlNote'), /[:：][\s\u00a0]*\{languages\}[.。]?$/u, `${code} reading.rtlNote`);
    assert.match(t('reading.offeredNote'), /[:：][\s\u00a0]*\{count\}[.。 ]/u, `${code} reading.offeredNote`);
  }
  for (const key of unwrittenKeys.filter((k) => k.startsWith('reading.')) as (keyof typeof en)[]) {
    for (const code of ['ar', 'ur', 'fa', 'tr', 'bn', 'fr', 'sw', 'zh-hant', 'vi', 'fil', 'az', 'tg', 'ky', 'tk', 'ne'] as const) {
      assert.deepEqual(gaps(translator(code)(key)), gaps(en[key]), `${code} ${key}`);
    }
  }

  // The name of each choice is short and is not the English: a reader chooses
  // by it. (French, Indonesian and Filipino once kept "Normal" and "Contrast".)
  for (const code of ['fr', 'es', 'pt', 'tr', 'id', 'fil', 'ms', 'sw', 'vi', 'az'] as const) {
    const t = translator(code);
    for (const key of ['reading.textNormal', 'reading.contrastNormal', 'reading.contrastLegend', 'reading.motionSystem'] as const) {
      assert.notEqual(t(key), en[key], `${code} ${key}`);
    }
  }

  // A held language reads the page in English, whole.
  assert.equal(languageShownFor('so', 'reading').code, 'en');
  assert.equal(translator('so')('reading.lede'), en['reading.lede']);
});

test('two sentences on the language page say what the English says', () => {
  // Found while writing the reading settings, corrected on the owner's word
  // (2026-11-18). Afrikaans said another device "asks its own device", with
  // the language left out; Swahili said a word that looks "small" where the
  // English says "wrong". Neither was caught by anything automatic: both
  // were fluent. A speaker's review is still what these need.
  const af = translator('af')('language.browser');
  assert.doesNotMatch(af, /vra sy eie toestel/u);
  assert.match(af, /\btaal\b/u);
  const sw = translator('sw')('language.unreviewed');
  assert.doesNotMatch(sw, /\bdogo\b/u);
  assert.match(sw, /si sahihi/u);
});
