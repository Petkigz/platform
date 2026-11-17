import assert from 'node:assert/strict';
import test from 'node:test';

import {
  durationLabel,
  LOCALES,
  LOCALE_COOKIE,
  chooseLocale,
  coverageOf,
  directionOf,
  fill,
  isHeld,
  isUnwritten,
  localeByCode,
  localeGroups,
  localeLabel,
  matchLocale,
  messagesFor,
  regionLabel,
  safeNextPath,
  translatedLocales,
  translator,
} from './i18n/index.ts';
import { CATALOGUES, WRITTEN } from './i18n/messages/catalogues.ts';
import { en } from './i18n/messages/en.ts';

const REGION_HEADINGS = [
  'region.africa',
  'region.middleEast',
  'region.asia',
  'region.west',
] as const;

// The interface's own language. What is tested here is the part that decides
// *which* language a page is rendered in, and the part that decides what a
// half-translated catalogue is allowed to claim.

test('a choice beats the device, and the device beats English', () => {
  assert.deepEqual(
    chooseLocale({ chosen: 'fr', acceptLanguage: 'ar-EG,ar;q=0.9' }),
    { code: 'fr', source: 'chosen' },
  );
  assert.deepEqual(
    chooseLocale({ chosen: null, acceptLanguage: 'ar-EG,ar;q=0.9' }),
    { code: 'ar', source: 'device' },
  );
  // Chinese used to be the example of "a language we do not have". It is not any
  // more, and a device in Shanghai should get the catalogue for Shanghai.
  assert.deepEqual(
    chooseLocale({ chosen: null, acceptLanguage: 'zh-CN,ja;q=0.8' }),
    { code: 'zh-hans', source: 'device' },
  );
  assert.deepEqual(
    chooseLocale({ chosen: null, acceptLanguage: 'ja,ko;q=0.8' }),
    { code: 'en', source: 'default' },
  );
});

test('a region is dropped, and an unknown language is not guessed at', () => {
  assert.equal(matchLocale('fr-CA'), 'fr');
  assert.equal(matchLocale('pt_BR'), 'pt');
  assert.equal(matchLocale('AR'), 'ar');
  assert.equal(matchLocale(''), null);
  assert.equal(matchLocale(null), null);
  // A language the register does not have is still not guessed at.
  assert.equal(matchLocale('ja-JP'), null);
});

test('Chinese resolves by script, and by region when the script is missing', () => {
  // The reason `matchLocale` now drops one subtag at a time rather than jumping
  // from the whole tag to the base: `zh-Hans-CN` has to become `zh-hans` on the
  // way past, and it used to come back `null` — the largest group of readers on
  // the platform getting English because the script was thrown away with the
  // region.
  assert.equal(matchLocale('zh-Hans'), 'zh-hans');
  assert.equal(matchLocale('zh-Hans-CN'), 'zh-hans');
  assert.equal(matchLocale('zh-Hans-SG'), 'zh-hans');
  assert.equal(matchLocale('zh-Hant'), 'zh-hant');
  assert.equal(matchLocale('zh-Hant-TW'), 'zh-hant');
  // Devices send the region, not the script.
  assert.equal(matchLocale('zh-CN'), 'zh-hans');
  assert.equal(matchLocale('zh-TW'), 'zh-hant');
  assert.equal(matchLocale('zh-HK'), 'zh-hant');
  assert.equal(matchLocale('zh-MO'), 'zh-hant');
  assert.equal(matchLocale('zh'), 'zh-hans');
  // And they are genuinely two different catalogues.
  assert.notEqual(translator('zh-hans')('home.title'), translator('zh-hant')('home.title'));
});

test('Dari is not Persian, and a device that asks for one gets it', () => {
  // The one catalogue that is a language *and* a place. `fa-AF` is Dari, `fa`
  // and `fa-IR` are Persian, and an Afghan reader must not be handed Tehran's
  // vocabulary — nor lose Dari because the region was dropped on the way in.
  assert.equal(matchLocale('fa-AF'), 'fa-af');
  assert.equal(matchLocale('fa_af'), 'fa-af');
  assert.equal(matchLocale('fa'), 'fa');
  assert.equal(matchLocale('fa-IR'), 'fa');
  assert.equal(matchLocale('ps-AF'), 'ps');
  assert.notEqual(translator('fa-af')('home.title'), translator('fa')('home.title'));
});

test('the device preference is honoured in its own order', () => {
  // German is not a language this interface has, so the first one we do have
  // wins — the header's order, not its q-values re-sorted by hand.
  assert.equal(chooseLocale({ acceptLanguage: 'de-DE,ur;q=0.6' }).code, 'ur');
  assert.equal(
    chooseLocale({ acceptLanguage: 'de-DE,de;q=0.9,ms;q=0.2' }).code,
    'ms',
  );
});

test('a weight in the header outranks the order it arrived in', () => {
  // Browsers sort the header by weight, so this should never matter — and a
  // reader who gets the wrong language because it did is not a hypothetical.
  assert.equal(chooseLocale({ acceptLanguage: 'en;q=0.2,ar;q=0.9' }).code, 'ar');
  assert.equal(chooseLocale({ acceptLanguage: 'de;q=0.9,fr;q=0.4' }).code, 'fr');
  // `q=0` is the header's way of saying "do not use this".
  assert.equal(chooseLocale({ acceptLanguage: 'ar;q=0,ms;q=0.3' }).code, 'ms');
  // A tie keeps the order the header listed.
  assert.equal(chooseLocale({ acceptLanguage: 'sw;q=0.5,ur;q=0.5' }).code, 'sw');
  // `*` is any language, and it is not one this interface has.
  assert.equal(chooseLocale({ acceptLanguage: '*' }).code, 'en');
});

test('every right-to-left language says so, and nothing else does', () => {
  // Five since 2026-10-30: Pashto and Dari joined Arabic, Persian and Urdu. This
  // is not a tidiness check — `dir` is what turns the shell around, so a
  // right-to-left language marked `ltr` renders mirrored text in a left-to-right
  // page, and a left-to-right language marked `rtl` breaks its own layout.
  const rtl = LOCALES.filter((l) => l.dir === 'rtl').map((l) => l.code);
  assert.deepEqual(rtl.sort(), ['ar', 'dv', 'fa', 'fa-af', 'ps', 'ur']);
  assert.equal(directionOf('fr'), 'ltr');
  assert.equal(directionOf('ar'), 'rtl');
  assert.equal(directionOf('ps'), 'rtl');
  assert.equal(directionOf('fa-af'), 'rtl');
  // Dhivehi is the first right-to-left language in the register that is not
  // written in the Arabic script, and the first from South Asia.
  assert.equal(directionOf('dv'), 'rtl');
  assert.equal(directionOf('uz'), 'ltr');
});

test('every catalogue is inside the English key set, and none is empty', () => {
  const known = new Set(Object.keys(en));
  // `WRITTEN`, not `CATALOGUES`: a part held for review is still a file somebody
  // will be handed to correct, and it is held to the same rules as the rest.
  for (const [code, catalogue] of Object.entries(WRITTEN)) {
    for (const [key, value] of Object.entries(catalogue ?? {})) {
      assert(known.has(key), `${code} has a key English does not: ${key}`);
      assert(typeof value === 'string' && value.trim() !== '', `${code}.${key} is empty`);
    }
  }
});

test('every placeholder survives translation', () => {
  // A translation that drops `{year}` is a sentence that quietly lost a number,
  // and it would never be reported by a reader. Held drafts included: the
  // correction sheet refuses a line whose placeholders differ from the draft's.
  for (const [code, catalogue] of Object.entries(WRITTEN)) {
    for (const [key, value] of Object.entries(catalogue ?? {})) {
      const source = en[key as keyof typeof en] ?? '';
      const expected = [...source.matchAll(/\{([a-zA-Z][a-zA-Z0-9]*)\}/g)].map((m) => m[1]).sort();
      const actual = [...String(value).matchAll(/\{([a-zA-Z][a-zA-Z0-9]*)\}/g)].map((m) => m[1]).sort();
      assert.deepEqual(actual, expected, `${code}.${key} changed its placeholders`);
    }
  }
});

test('every offered language actually translates something', () => {
  for (const locale of translatedLocales()) {
    const coverage = coverageOf(locale.code);
    assert.equal(coverage.total, Object.keys(en).length, `${locale.code} counts the wrong total`);
    // The floor is on what has been *written*, of what was meant to be. It is
    // there to catch a language that is simply unfinished. A part held until a
    // speaker has read it lowers what a reader is shown, on purpose, and must
    // not be what gets a language taken out of the picker; nor must a screen
    // that, by the owner's rule, is not written at all for a language with
    // anything held (`UNWRITTEN_WHILE_HELD`). Both are decisions, and how
    // much English they add up to is no longer capped (see below).
    //
    // Before the lesson page this counted the unwritten screens as gaps and
    // still passed (84%); the lesson page took it to 78%. Leaving them out of
    // "meant to be written" is a change to what this check measures, made by
    // the builder to keep it meaning what its comment said.
    const deliberate = (Object.keys(en) as (keyof typeof en)[]).filter((key) => isUnwritten(locale.code, key)).length;
    const written = Math.round(((coverage.translated + coverage.held) / (coverage.total - deliberate)) * 100);
    assert(
      written >= 80,
      `${locale.code} is offered with ${written}% written — too little to be useful`,
    );
    // There was a second limit here: a language showing a reader less than
    // half was refused. The owner removed it on 2026-11-17 ("keep them, show
    // the number"): a language with a part held stays in the picker however
    // many of the newer screens are English, and the language page tells its
    // reader how much, in that language. Nothing below caps the English.
    //
    // What replaces the cap is the promise that choice was made on. A reader
    // who picks such a language gets every sentence that is neither held nor
    // deliberately unwritten — the navigation, sign-in, the catalogue, the
    // front page — and is told the number in their own words, not in English.
    const keys = Object.keys(en) as (keyof typeof en)[];
    const withheldFromThem = keys.filter((key) => isHeld(locale.code, key) || isUnwritten(locale.code, key));
    assert.equal(
      coverage.translated,
      keys.length - withheldFromThem.length,
      `${locale.code} is missing a sentence outside the parts held or left unwritten on purpose`,
    );
    assert.ok(coverage.percent > 0, `${locale.code} is offered and shows a reader nothing`);
    for (const key of locale.code === 'en' ? [] : (['language.coverage', 'language.coverageAll'] as const)) {
      const said = CATALOGUES[locale.code]?.[key];
      assert.ok(said && said !== en[key], `${locale.code} tells its reader how much is translated in English`);
    }
  }
});

test('every language in the register has a catalogue, and says so about itself', () => {
  // The register is the offer; the catalogues are the goods. A row here with no
  // file behind it is a language the picker promises and the page cannot deliver.
  //
  // The files (`WRITTEN`), because the register also lists four languages that
  // are written and withheld from readers; what a reader is *served* is asked
  // of the offered languages just below.
  for (const locale of LOCALES) {
    assert.ok(
      locale.code === 'en' || WRITTEN[locale.code],
      `${locale.code} is in the register but has no catalogue`,
    );
    assert.equal(typeof locale.reviewed, 'boolean', `${locale.code} does not say whether it was reviewed`);
    // Every catalogue carries both halves of the review sentence, translated.
    const messages = WRITTEN[locale.code];
    if (messages) {
      assert.ok(messages['language.unreviewed'], `${locale.code} has no unreviewed sentence`);
      assert.ok(messages['language.reviewed'], `${locale.code} has no reviewed sentence`);
    }
  }

  // English is the source and is not a translation, so it is reviewed by
  // definition — and nothing else may claim a speaker has read it yet.
  assert.equal(localeByCode('en').reviewed, true);
  const claimed = LOCALES.filter((l) => l.reviewed && l.code !== 'en').map((l) => l.code);
  assert.deepEqual(claimed, [], 'a catalogue claims a native reviewer that nobody recorded');
});

test('the African languages are in the register, and Africa is the first block', () => {
  // The instruction was not "add a few languages": it was that the interface
  // should be in the language of the region the customer is in. Africa is the
  // region this platform is operated from, so it is the block a reader meets
  // first — after English, which is the source.
  const african = ['am', 'om', 'so', 'ti', 'rw', 'lg', 'mg', 'ln', 'ha', 'yo', 'ig',
                   'wo', 'ff', 'bm', 'zu', 'xh', 'af', 'sn', 'st', 'ny', 'sw'];
  const codes = LOCALES.map((l) => l.code);
  for (const code of african) {
    assert.ok(codes.includes(code as never), `${code} is missing from the register`);
    assert.ok(
      CATALOGUES[code as keyof typeof CATALOGUES],
      `${code} is in the register but has no catalogue`,
    );
  }
  assert.equal(LOCALES.filter((l) => l.region === 'Africa').length, african.length);

  const groups = localeGroups();
  assert.equal(groups[0]?.region, 'Africa');
  // English is pinned above the blocks rather than filed under a continent.
  assert.ok(!groups.some((g) => g.locales.some((l) => l.code === 'en')));
  // And every block a reader sees has a translated heading to put over it.
  for (const group of groups) {
    assert.ok(REGION_HEADINGS.includes(regionLabel(group.region) as never));
  }
});

test('an African catalogue is short only where a speaker is being waited for', () => {
  // A picker built on hope is worse than a short list: a language at 40% looks
  // translated in the menu and reads as English on the page.
  //
  // This rule has been loosened twice, both times by the owner's decision of
  // 2026-11-16 that a language the builder cannot write properly falls back to
  // English until a speaker has reviewed it.
  //
  // First it demanded that a reader be *shown* 100%. That is what put sentences
  // nobody could vouch for on the prayer-times page, so it became: every
  // sentence exists in the file, and the only ones a reader does not see are
  // held by name in `held.ts`.
  //
  // Then it still demanded that every sentence be *written*, which for a new
  // screen meant writing the same guesses in order to hide them. Now a language
  // with something held may also lack the parts named in `UNWRITTEN_WHILE_HELD`
  // and nothing else. A language with nothing held is still whole, and a gap
  // anywhere else in any of them still fails here.
  for (const locale of LOCALES.filter((l) => l.region === 'Africa')) {
    const coverage = coverageOf(locale.code);
    const unwritten = (Object.keys(en) as (keyof typeof en)[]).filter((key) => isUnwritten(locale.code, key));
    assert.equal(
      coverage.translated + coverage.held + unwritten.length,
      coverage.total,
      `${locale.code} has ${coverage.total - coverage.translated - coverage.held - unwritten.length} sentences nobody wrote and nobody decided to leave — finish it or take it out`,
    );
    for (const key of unwritten) {
      assert.equal(WRITTEN[locale.code]?.[key], undefined, `${locale.code}.${key} is written and listed as unwritten`);
    }
    if (coverage.held === 0) {
      assert.equal(unwritten.length, 0);
      assert.equal(coverage.percent, 100);
    }
  }
});

test('English is complete, and a language with no catalogue is not offered', () => {
  assert.deepEqual(coverageOf('en'), { translated: Object.keys(en).length, total: Object.keys(en).length, percent: 100, held: 0 });
  const offered = translatedLocales().map((l) => l.code);
  assert(offered.includes('en'));
  assert.equal(new Set(offered).size, offered.length, 'a language is offered twice');
  assert.equal(LOCALES.length >= offered.length, true);
});

test('a missing string falls back to English rather than to a blank', () => {
  // The catalogue is a partial by construction; `messagesFor` is what makes the
  // fallback total rather than per-call.
  const messages = messagesFor('en');
  for (const key of Object.keys(en)) {
    assert.equal(typeof messages[key as keyof typeof messages], 'string');
  }
});

test('placeholders are filled, and an unknown one is left visible', () => {
  assert.equal(fill('© {year} AyahSpring', { year: 2026 }), '© 2026 AyahSpring');
  assert.equal(fill('{greeting}, {name}', { name: 'Fatima' }), '{greeting}, Fatima');
  assert.equal(fill('no placeholders'), 'no placeholders');
});

test('the translator renders a real sentence in a real language', () => {
  const ar = translator('ar');
  assert.match(ar('nav.catalogue'), /الدورات/);
  assert.match(ar('footer.rights', { year: 2026 }), /2026/);
  // And English is the fallback for a language that has the key.
  assert.equal(translator('fr')('action.save'), 'Enregistrer');
  assert.equal(translator('en')('action.save'), 'Save');
});

test('the picker label carries the language in its own script', () => {
  const arabic = LOCALES.find((l) => l.code === 'ar')!;
  assert.equal(localeLabel(arabic), 'العربية · Arabic');
  assert.equal(localeLabel(LOCALES[0]!), 'English');
});

test('a form can only send somebody to a page on this site', () => {
  assert.equal(safeNextPath('/account'), '/account');
  assert.equal(safeNextPath('/courses/tajweed?x=1'), '/courses/tajweed?x=1');
  assert.equal(safeNextPath('//evil.example'), '/language');
  assert.equal(safeNextPath('/\\evil.example'), '/language');
  for (const path of ['/\n/evil.example', '/\t/evil.example', '/a/..//evil.example', '/%2e%2e//evil.example']) {
    const safe = safeNextPath(path);
    assert.equal(safe, '/language');
    assert.equal(new URL(safe, 'https://ayahspring.example/api/locale').origin, 'https://ayahspring.example');
  }
  assert.equal(safeNextPath('https://evil.example'), '/language');
  assert.equal(safeNextPath('javascript:alert(1)'), '/language');
  assert.equal(safeNextPath(''), '/language');
  assert.equal(safeNextPath(null), '/language');
  assert.equal(safeNextPath('/account', '/fallback'), '/account');
});

test('the picker is grouped, and no block is empty', () => {
  const groups = localeGroups();
  assert.ok(groups.length >= 3);
  for (const group of groups) {
    assert.ok(group.locales.length > 0, `${group.region} is drawn with nothing in it`);
    for (const locale of group.locales) {
      assert.equal(locale.region, group.region);
    }
  }
  // Every offered language is in exactly one block — plus English, which is
  // pinned above them — and none is lost between the blocks.
  const shown = [...groups.flatMap((g) => g.locales.map((l) => l.code)), 'en'];
  assert.deepEqual(shown.sort(), translatedLocales().map((l) => l.code).sort());
  assert.equal(new Set(shown).size, shown.length);
});

test('the cookie name is a cookie name', () => {
  assert.match(LOCALE_COOKIE, /^[a-z0-9_]+$/);
});

test('a length of time is said in the language of the page, and nothing is said for none', () => {
  assert.equal(durationLabel('en', null), null);
  assert.equal(durationLabel('en', 0), null);
  assert.equal(durationLabel('en', Number.NaN), null);
  assert.equal(durationLabel('en', 120), '2 min');
  assert.equal(durationLabel('en', 45), '45 sec');
  assert.equal(durationLabel('en', 125), '2 min 5 sec');
  // 119.6 seconds is two minutes, not "1 min 60 sec".
  assert.equal(durationLabel('en', 119.6), '2 min');
  // The digits and the unit both belong to the language: these come from the
  // runtime's locale data, not from a sentence written for this project.
  assert.equal(durationLabel('fa', 120), '۲ دقیقه');
  assert.equal(durationLabel('kk', 120), '2 мин');
  assert.notEqual(durationLabel('ar', 120), durationLabel('en', 120));
  // Every language on offer gets something, and never the bare English "min 5s".
  for (const locale of LOCALES) {
    const said = durationLabel(locale.code, 125);
    assert.ok(said && said.length > 0, `${locale.code} says nothing for a length of time`);
  }
});
