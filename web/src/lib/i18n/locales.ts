/**
 * The languages the interface can be read in, and how one is chosen.
 *
 * The platform teaches children and adults worldwide, and until now it spoke
 * English to all of them. That is not a limitation anybody agreed to; it was the
 * shape of the first release. This is the frame that lets the interface follow
 * the person reading it.
 *
 * **How the language is chosen, in order.**
 *
 * 1. What the person chose, stored in a cookie on this browser. A deliberate
 *    choice outranks a guess — somebody who switched to English on a phone set to
 *    Arabic did not want Arabic.
 * 2. What the device asks for: `Accept-Language`, in the browser's own order of
 *    preference.
 * 3. English.
 *
 * There is no account column behind this. Language is a property of the person
 * reading, not of the record: a shared family tablet in Kampala and a laptop in
 * Cairo should each speak what they are set to, and a cookie says that without a
 * migration or a policy. The cost is honest and stated on the settings page —
 * another device asks its own device's language until it is told otherwise.
 *
 * **Only languages that exist are offered.** The picker is built from this list,
 * and a language joins it when its catalogue has been written, not when somebody
 * intends to write it. `coverageOf()` reports how much of the interface each one
 * actually translates, and the page shows that number rather than implying a
 * completeness that would be found out on the second screen.
 *
 * **In the register is not the same as offered.** Four languages below — Wolof,
 * Fulfulde, Bambara and Dhivehi — have a file and are withheld from readers
 * until a speaker has read them (`messages/held.ts`). They keep their rows so
 * the correction sheet can name them; `matchLocale()` does not return them, and
 * `chooseLocale()` answers a cookie or a device that asks for one in English.
 */

import { isWithheld } from './messages/held.ts';

export type Direction = 'ltr' | 'rtl';

export type LocaleCode =
  | 'en'
  | 'ar'
  | 'ur'
  | 'fa'
  | 'tr'
  | 'id'
  | 'ms'
  | 'bn'
  | 'hi'
  // Central Asia and Afghanistan — added 2026-10-30, after a reader asked why
  // the picker had no Asian language. These are the largest Muslim populations
  // the interface could not address at all.
  | 'uz'
  | 'kk'
  | 'az'
  | 'ps'
  | 'fa-af'
  // South and Southeast Asia, 2026-10-30.
  | 'ta'
  | 'ne'
  | 'si'
  | 'th'
  | 'dv'
  // The rest of Central Asia, closing the region a day later.
  | 'ky'
  | 'tg'
  | 'tk'
  // East and Southeast Asia, where a code carries a script subtag for the first
  // time: `zh-hans` and `zh-hant` are two catalogues, not one language.
  | 'zh-hans'
  | 'zh-hant'
  | 'vi'
  | 'fil'
  | 'my'
  | 'fr'
  | 'es'
  | 'pt'
  | 'sw'
  // East Africa and the Horn.
  | 'am'
  | 'om'
  | 'so'
  | 'ti'
  | 'rw'
  | 'lg'
  | 'mg'
  | 'ln'
  // West and Central Africa.
  | 'ha'
  | 'yo'
  | 'ig'
  | 'wo'
  | 'ff'
  | 'bm'
  // Southern Africa.
  | 'zu'
  | 'xh'
  | 'af'
  | 'sn'
  | 'st'
  | 'ny';

export type Locale = {
  code: LocaleCode;
  /** What the language calls itself. Never translated. */
  nativeName: string;
  /** What an English reader calls it, for a page written in English. */
  englishName: string;
  dir: Direction;
  /**
   * Which block of the picker this language belongs to.
   *
   * Not geography for its own sake: with thirty-three languages in one list, a
   * reader looking for Wolof should not have to read past Malay to find it.
   * `Africa` comes first, because a platform operated from Uganda that lists
   * Portuguese above Luganda has told its neighbours where they rank.
   */
  region: 'Africa' | 'Middle East' | 'Asia' | 'Europe and the Americas';
  /**
   * Has a first-language speaker read this catalogue?
   *
   * Not the same claim as "it is translated", and the settings page says both
   * separately rather than letting the coverage number imply the second. Every
   * translation here was written by the people who built the platform; until a
   * speaker has gone through it, this stays `false` and the page admits it. The
   * moment somebody reads one, flipping this flag is the whole change — the
   * sentence is generated from the register, not typed into a page.
   */
  reviewed: boolean;
};

/**
 * The register.
 *
 * Ordered so the picker is readable: English first, then the scripts and
 * languages of the audience this platform is built for, then the wider world.
 * Arabic, Urdu and Persian are right-to-left and say so — a page that renders
 * Arabic without `dir="rtl"` misplaces every full stop, and a page that flips
 * without the stylesheet knowing breaks its own layout.
 */
export const LOCALES: readonly Locale[] = [
  { code: 'en', nativeName: 'English', englishName: 'English', dir: 'ltr', reviewed: true, region: 'Europe and the Americas' },
  { code: 'ar', nativeName: 'العربية', englishName: 'Arabic', dir: 'rtl', reviewed: false, region: 'Middle East' },
  { code: 'ur', nativeName: 'اردو', englishName: 'Urdu', dir: 'rtl', reviewed: false, region: 'Asia' },
  { code: 'fa', nativeName: 'فارسی', englishName: 'Persian', dir: 'rtl', reviewed: false, region: 'Middle East' },
  { code: 'sw', nativeName: 'Kiswahili', englishName: 'Swahili', dir: 'ltr', reviewed: false, region: 'Africa' },

  // Africa first, after English and the three right-to-left languages, because
  // this is where the platform's own teaching is: an interface that lists
  // Zulu under Portuguese is telling a reader who is welcome and who is not.
  { code: 'am', nativeName: 'አማርኛ', englishName: 'Amharic', dir: 'ltr', reviewed: false, region: 'Africa' },
  { code: 'ha', nativeName: 'Hausa', englishName: 'Hausa', dir: 'ltr', reviewed: false, region: 'Africa' },
  { code: 'yo', nativeName: 'Yorùbá', englishName: 'Yoruba', dir: 'ltr', reviewed: false, region: 'Africa' },
  { code: 'ig', nativeName: 'Igbo', englishName: 'Igbo', dir: 'ltr', reviewed: false, region: 'Africa' },
  { code: 'om', nativeName: 'Afaan Oromoo', englishName: 'Oromo', dir: 'ltr', reviewed: false, region: 'Africa' },
  { code: 'so', nativeName: 'Soomaali', englishName: 'Somali', dir: 'ltr', reviewed: false, region: 'Africa' },
  { code: 'ti', nativeName: 'ትግርኛ', englishName: 'Tigrinya', dir: 'ltr', reviewed: false, region: 'Africa' },
  { code: 'wo', nativeName: 'Wolof', englishName: 'Wolof', dir: 'ltr', reviewed: false, region: 'Africa' },
  { code: 'ff', nativeName: 'Fulfulde', englishName: 'Fulfulde', dir: 'ltr', reviewed: false, region: 'Africa' },
  { code: 'bm', nativeName: 'Bamanankan', englishName: 'Bambara', dir: 'ltr', reviewed: false, region: 'Africa' },
  { code: 'rw', nativeName: 'Ikinyarwanda', englishName: 'Kinyarwanda', dir: 'ltr', reviewed: false, region: 'Africa' },
  { code: 'lg', nativeName: 'Luganda', englishName: 'Luganda', dir: 'ltr', reviewed: false, region: 'Africa' },
  { code: 'zu', nativeName: 'isiZulu', englishName: 'Zulu', dir: 'ltr', reviewed: false, region: 'Africa' },
  { code: 'xh', nativeName: 'isiXhosa', englishName: 'Xhosa', dir: 'ltr', reviewed: false, region: 'Africa' },
  { code: 'af', nativeName: 'Afrikaans', englishName: 'Afrikaans', dir: 'ltr', reviewed: false, region: 'Africa' },
  { code: 'sn', nativeName: 'chiShona', englishName: 'Shona', dir: 'ltr', reviewed: false, region: 'Africa' },
  { code: 'st', nativeName: 'Sesotho', englishName: 'Sesotho', dir: 'ltr', reviewed: false, region: 'Africa' },
  { code: 'ny', nativeName: 'Chichewa', englishName: 'Chichewa', dir: 'ltr', reviewed: false, region: 'Africa' },
  { code: 'ln', nativeName: 'Lingála', englishName: 'Lingala', dir: 'ltr', reviewed: false, region: 'Africa' },
  { code: 'mg', nativeName: 'Malagasy', englishName: 'Malagasy', dir: 'ltr', reviewed: false, region: 'Africa' },

  // The wider world, in the order a reader is likely to look for it.
  { code: 'tr', nativeName: 'Türkçe', englishName: 'Turkish', dir: 'ltr', reviewed: false, region: 'Middle East' },
  { code: 'id', nativeName: 'Bahasa Indonesia', englishName: 'Indonesian', dir: 'ltr', reviewed: false, region: 'Asia' },
  { code: 'ms', nativeName: 'Bahasa Melayu', englishName: 'Malay', dir: 'ltr', reviewed: false, region: 'Asia' },
  { code: 'bn', nativeName: 'বাংলা', englishName: 'Bengali', dir: 'ltr', reviewed: false, region: 'Asia' },
  { code: 'hi', nativeName: 'हिन्दी', englishName: 'Hindi', dir: 'ltr', reviewed: false, region: 'Asia' },
  { code: 'uz', nativeName: 'Oʻzbekcha', englishName: 'Uzbek', dir: 'ltr', reviewed: false, region: 'Asia' },
  { code: 'kk', nativeName: 'Қазақша', englishName: 'Kazakh', dir: 'ltr', reviewed: false, region: 'Asia' },
  { code: 'az', nativeName: 'Azərbaycanca', englishName: 'Azerbaijani', dir: 'ltr', reviewed: false, region: 'Asia' },
  { code: 'ps', nativeName: 'پښتو', englishName: 'Pashto', dir: 'rtl', reviewed: false, region: 'Asia' },
  { code: 'fa-af', nativeName: 'دری', englishName: 'Dari', dir: 'rtl', reviewed: false, region: 'Asia' },
  { code: 'ta', nativeName: 'தமிழ்', englishName: 'Tamil', dir: 'ltr', reviewed: false, region: 'Asia' },
  { code: 'ne', nativeName: 'नेपाली', englishName: 'Nepali', dir: 'ltr', reviewed: false, region: 'Asia' },
  { code: 'si', nativeName: 'සිංහල', englishName: 'Sinhala', dir: 'ltr', reviewed: false, region: 'Asia' },
  { code: 'th', nativeName: 'ไทย', englishName: 'Thai', dir: 'ltr', reviewed: false, region: 'Asia' },
  // Dhivehi is written in Thaana, which runs right to left — the first South
  // Asian script here to do so, and the first right-to-left language in the
  // register that is not written in the Arabic script.
  { code: 'dv', nativeName: 'ދިވެހި', englishName: 'Dhivehi', dir: 'rtl', reviewed: false, region: 'Asia' },
  // The rest of Central Asia. Kyrgyz and Tajik keep the Cyrillic their readers
  // learn at school; Turkmen is Latin, because that is what Turkmenistan uses.
  { code: 'ky', nativeName: 'Кыргызча', englishName: 'Kyrgyz', dir: 'ltr', reviewed: false, region: 'Asia' },
  { code: 'tg', nativeName: 'Тоҷикӣ', englishName: 'Tajik', dir: 'ltr', reviewed: false, region: 'Asia' },
  { code: 'tk', nativeName: 'Türkmençe', englishName: 'Turkmen', dir: 'ltr', reviewed: false, region: 'Asia' },
  // Two Chinese rows, deliberately: 软件 and 軟體 are the same word to a machine
  // and different words to the reader. Traditional carries Taiwan's vocabulary.
  { code: 'zh-hans', nativeName: '简体中文', englishName: 'Chinese, Simplified', dir: 'ltr', reviewed: false, region: 'Asia' },
  { code: 'zh-hant', nativeName: '繁體中文', englishName: 'Chinese, Traditional', dir: 'ltr', reviewed: false, region: 'Asia' },
  { code: 'vi', nativeName: 'Tiếng Việt', englishName: 'Vietnamese', dir: 'ltr', reviewed: false, region: 'Asia' },
  { code: 'fil', nativeName: 'Tagalog', englishName: 'Tagalog', dir: 'ltr', reviewed: false, region: 'Asia' },
  { code: 'my', nativeName: 'မြန်မာ', englishName: 'Burmese', dir: 'ltr', reviewed: false, region: 'Asia' },
  { code: 'fr', nativeName: 'Français', englishName: 'French', dir: 'ltr', reviewed: false, region: 'Europe and the Americas' },
  { code: 'es', nativeName: 'Español', englishName: 'Spanish', dir: 'ltr', reviewed: false, region: 'Europe and the Americas' },
  { code: 'pt', nativeName: 'Português', englishName: 'Portuguese', dir: 'ltr', reviewed: false, region: 'Europe and the Americas' },
];

export const DEFAULT_LOCALE: LocaleCode = 'en';

/** The cookie the choice is stored in. Lowercase, because a cookie is a name. */
export const LOCALE_COOKIE = 'ayahspring_locale';

const BY_CODE = new Map<string, Locale>(LOCALES.map((l) => [l.code, l]));

/**
 * Is this a language in the register?
 *
 * The register, not the picker: four languages are in it and withheld from
 * readers (`messages/held.ts`). This is the right question for the correction
 * sheet and the owner's queue, which have to be able to name a language in
 * order to fix it. For anything that decides what a reader is *shown*, ask
 * `isOfferedLocale()`.
 */
export function isLocaleCode(value: unknown): value is LocaleCode {
  return typeof value === 'string' && BY_CODE.has(value);
}

/**
 * Is this a language a reader can actually be given?
 *
 * In the register and not withheld. A withheld language has every sentence
 * held until a speaker has read it, so choosing it would set `<html lang>` to a
 * language the page is not in and print English underneath.
 */
export function isOfferedLocale(value: unknown): value is LocaleCode {
  return isLocaleCode(value) && !isWithheld(value);
}

export function localeByCode(code: LocaleCode): Locale {
  return BY_CODE.get(code) ?? BY_CODE.get(DEFAULT_LOCALE)!;
}

export function directionOf(code: LocaleCode): Direction {
  return localeByCode(code).dir;
}

/**
 * Read one tag and return the language we have, or nothing.
 *
 * `fr-CA` is French; `ar-EG` is Arabic; `zh-Hans-CN` is not anything this
 * interface speaks yet and returns null rather than guessing at a neighbour. The
 * region is dropped deliberately: the interface is translated, not localised per
 * country, and pretending an `en-GB` catalogue exists would be worse than
 * serving the English one.
 */
export function matchLocale(tag: string | null | undefined): LocaleCode | null {
  const code = matchRegistered(tag);
  // Offered, not merely registered: a language withheld until a speaker has
  // read it is not one a reader can be given, so the answer to "do you have
  // this?" is no. `chooseLocale()` asks the register directly, because it has
  // to tell "we do not know that language" from "we know it and withhold it".
  return code !== null && isOfferedLocale(code) ? code : null;
}

/**
 * Read one tag and return the language in the register, offered or withheld.
 *
 * Not exported: everything outside this file wants to know what a reader can
 * be given, which is `matchLocale()`.
 */
function matchRegistered(tag: string | null | undefined): LocaleCode | null {
  if (typeof tag !== 'string') return null;
  const cleaned = tag.trim().toLowerCase().replace('_', '-');
  if (cleaned === '') return null;

  // **The whole tag first, then one subtag shorter each time.** Two things made
  // this more than a two-step: `fa-AF` is Dari and `fa` is Persian, so the region
  // can be the difference between two catalogues; and Chinese is a *script* and a
  // region, so `zh-Hans-CN` has to become `zh-hans` before it can become `zh`.
  //
  // Dropping straight from the whole tag to the base — which is what this did
  // before Chinese arrived — threw the script away with the region, and returned
  // `null` for the largest group of readers on the platform.
  const parts = cleaned.split('-');
  for (let i = parts.length; i >= 1; i -= 1) {
    const candidate = parts.slice(0, i).join('-');
    if (isLocaleCode(candidate)) return candidate;
  }

  // **Chinese without a script, which is most Chinese devices.** A phone in Taipei
  // sends `zh-TW` and a phone in Shanghai sends `zh-CN`; neither says "Hans" or
  // "Hant", and both mean very different files here. The regions that mean
  // Traditional are named; everything else — including a bare `zh` — is
  // Simplified, which is what the majority of the world's Chinese readers use and
  // what CLDR's own default resolves to. It is a guess, it is a documented one,
  // and the reader can override it on `/language` in one tap.
  if (parts[0] === 'zh') {
    return TRADITIONAL_CHINESE_REGIONS.has(parts[1] ?? '') ? 'zh-hant' : 'zh-hans';
  }

  return null;
}

/** Taiwan, Hong Kong and Macau: the Chinese regions that write Traditional. */
const TRADITIONAL_CHINESE_REGIONS = new Set(['tw', 'hk', 'mo']);

export type LocaleSource = 'chosen' | 'device' | 'default';

/**
 * Which language to render in, and why.
 *
 * `source` is returned rather than inferred by the caller because the settings
 * page has to say *"you chose this"* or *"this is your device's language"* — and
 * a person who did not choose it should be able to tell that the platform is
 * guessing, and how to stop it guessing.
 */
export function chooseLocale(input: {
  chosen?: string | null;
  acceptLanguage?: string | null;
}): { code: LocaleCode; source: LocaleSource } {
  // **A withheld language is answered in English, wherever it was asked for.**
  // Owner's decision, 2026-11-16, in two steps: a language nobody here can
  // write falls back to English until a speaker has read it; and that means
  // English, not the next language on the device's list. So this walks the
  // preferences in order and stops at the first one the register *knows*:
  //
  // - offered: that language;
  // - withheld: English, and nothing further down the list is consulted;
  // - unknown (`ja`, `de`): skipped, as it always was.
  //
  // A phone set to Wolof then French is given English, not French. That was
  // argued the other way first — the reader did say they read French — and the
  // owner chose the simpler promise: ask for one of these four and you get
  // English, every time, with the sentence on `/language` that says why. A
  // device that lists French *first* still gets French; the rule is about
  // what was asked for first, not about a language appearing anywhere.
  //
  // `source` is `default` in the withheld case because that is the sentence
  // the settings page then prints: "a language this interface does not have
  // yet, so it is in English".
  const chosen = matchRegistered(input.chosen);
  if (chosen) {
    return isWithheld(chosen)
      ? { code: DEFAULT_LOCALE, source: 'default' }
      : { code: chosen, source: 'chosen' };
  }

  const header = input.acceptLanguage ?? '';

  // `Accept-Language: fr-CA,fr;q=0.9,en;q=0.8`. The header is *usually* sorted by
  // q already — every browser sorts it — but "usually" is how a wrong language
  // reaches one reader in a thousand and never shows up in a test. So the
  // weights are read, and a missing weight counts as 1. Ties keep the order they
  // arrived in, which is what `sort` is not required to do and modern engines do.
  const ranked = header
    .split(',')
    .map((part, index) => {
      const [tag, ...params] = part.split(';');
      const quality = params
        .map((param) => param.trim())
        .filter((param) => param.startsWith('q='))
        .map((param) => Number.parseFloat(param.slice(2)))
        .find((value) => Number.isFinite(value));
      return { tag: (tag ?? '').trim(), quality: quality ?? 1, index };
    })
    .filter((entry) => entry.tag !== '' && entry.quality > 0)
    .sort((a, b) => b.quality - a.quality || a.index - b.index);

  for (const entry of ranked) {
    const match = matchRegistered(entry.tag);
    if (match === null) continue;
    if (isWithheld(match)) return { code: DEFAULT_LOCALE, source: 'default' };
    return { code: match, source: 'device' };
  }

  return { code: DEFAULT_LOCALE, source: 'default' };
}
