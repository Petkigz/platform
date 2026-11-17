import {
  DEFAULT_LOCALE,
  LOCALES,
  LOCALE_COOKIE,
  chooseLocale,
  directionOf,
  isLocaleCode,
  isOfferedLocale,
  localeByCode,
  matchLocale,
  type Direction,
  type Locale,
  type LocaleCode,
  type LocaleSource,
} from './locales.ts';
import { safeNextPath as safeLocalPath } from '../auth.ts';
import { CATALOGUES, WRITTEN } from './messages/catalogues.ts';
import { HELD_FOR_REVIEW, isHeld, isUnwritten, isWithheld } from './messages/held.ts';
import { en, type MessageKey, type Messages } from './messages/en.ts';

export {
  DEFAULT_LOCALE,
  LOCALES,
  LOCALE_COOKIE,
  chooseLocale,
  directionOf,
  isLocaleCode,
  isOfferedLocale,
  localeByCode,
  matchLocale,
};
export type { Direction, Locale, LocaleCode, LocaleSource, MessageKey };

export type Translate = (key: MessageKey, vars?: Record<string, string | number>) => string;

/**
 * Fill `{name}` placeholders.
 *
 * A placeholder with no value is left as it is, deliberately: `{year}` appearing
 * on a page is an obvious bug somebody fixes, where a silently empty string is a
 * sentence that reads strangely and is never reported.
 */
export function fill(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{([a-zA-Z][a-zA-Z0-9]*)\}/g, (whole, name: string) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : whole,
  );
}

/** The catalogue for one language, with English behind every gap. */
export function messagesFor(code: LocaleCode): Messages {
  const own = code === DEFAULT_LOCALE ? undefined : CATALOGUES[code];
  if (!own) return en;
  return { ...en, ...own } as Messages;
}

/**
 * The sentences only the companion tools read.
 *
 * The layout serialises its catalogue into every page so client components can
 * translate. The prayer tool alone is eighty sentences — more than a third of
 * the whole catalogue — and it sits behind a switch that ships off, so sending
 * it with the front page would charge every reader for a screen most of them
 * cannot open. The shell carries everything else; the three companion pages
 * hand these to their own tool.
 */
const COMPANION_PREFIX = 'companion.';

/**
 * Sentences only a server-rendered page reads.
 *
 * The learner dashboard is a Server Component: its words are in the HTML by the
 * time a browser sees it, and no client component asks for one. Thirty
 * sentences in the catalogue every page carries would be paid for by every
 * reader of the front page and used by none of them. If a client component
 * ever needs one, it will render the key instead of the sentence — which is
 * loud — and the fix is to take its prefix out of this list.
 */
const SERVER_ONLY_PREFIXES: readonly string[] = ['learn.'];

/** Everything a client component outside the companion pages can ask for. */
export function shellMessagesFor(code: LocaleCode): Partial<Messages> {
  return Object.fromEntries(
    Object.entries(messagesFor(code)).filter(
      ([key]) =>
        !key.startsWith(COMPANION_PREFIX) &&
        !SERVER_ONLY_PREFIXES.some((prefix) => key.startsWith(prefix)),
    ),
  ) as Partial<Messages>;
}

/** The companion sentences alone, for the provider on a companion page. */
export function companionMessagesFor(code: LocaleCode): Partial<Messages> {
  return Object.fromEntries(
    Object.entries(messagesFor(code)).filter(([key]) => key.startsWith(COMPANION_PREFIX)),
  ) as Partial<Messages>;
}

/**
 * A `t()` for one language.
 *
 * Every lookup falls back to English, so a key that nobody has translated yet
 * renders the English sentence rather than a blank or `language.title`. That is
 * what makes a partly translated interface usable instead of broken — and it is
 * why the coverage number on the settings page matters: without it, a reader
 * cannot tell the difference between "this is English too" and "this was never
 * translated".
 */
export function translator(code: LocaleCode): Translate {
  const own = code === DEFAULT_LOCALE ? undefined : CATALOGUES[code];
  return (key, vars) => {
    const translated = own?.[key];
    const template = translated && translated.trim() !== '' ? translated : en[key];
    return fill(template, vars);
  };
}

/**
 * A `t()` over everything the files hold, held drafts included.
 *
 * For the people correcting a language, never for a page a reader sees: the
 * correction sheet opens each box with this, so a reviewer of a held part
 * starts from the builder's draft instead of from English. Outside a held part
 * it is the same as `translator()`.
 */
export function writtenTranslator(code: LocaleCode): Translate {
  const own = code === DEFAULT_LOCALE ? undefined : WRITTEN[code];
  return (key, vars) => {
    const translated = own?.[key];
    const template = translated && translated.trim() !== '' ? translated : en[key];
    return fill(template, vars);
  };
}

/** The sections of one language that readers are shown in English for now. */
export function heldSections(code: LocaleCode): readonly string[] {
  return HELD_FOR_REVIEW[code] ?? [];
}

export { isHeld, isUnwritten, isWithheld };

/**
 * The language one part of the interface is actually shown in.
 *
 * English when the part is held, the reader's own language otherwise. A page
 * whose sentences are all from one part puts this on its wrapper as `lang` and
 * `dir`, because the document says `lang="dv" dir="rtl"` and the sentences
 * inside are English: without it a screen reader pronounces English with a
 * Dhivehi voice and every full stop lands on the wrong side of its sentence.
 *
 * Dates and numbers inside such a page are still formatted for the reader's
 * own language. Those come from the browser's locale data, not from us, and
 * are not what the hold is about.
 *
 * **English, too, when the part was never written.** The learner dashboard is
 * written in the languages its writer can write and in no others (`learn.ts`),
 * so for the rest there is no hold to find — the sentences are simply not
 * there, and `translator()` is already answering in English. The wrapper has
 * to say so for the same reason.
 */
export function languageShownFor(code: LocaleCode, section: string): Locale {
  if (code === DEFAULT_LOCALE || isHeld(code, `${section}.`)) return localeByCode(DEFAULT_LOCALE);
  const prefix = `${section}.`;
  const written = Object.entries(CATALOGUES[code] ?? {}).some(
    ([key, value]) => key.startsWith(prefix) && typeof value === 'string' && value.trim() !== '',
  );
  return localeByCode(written ? code : DEFAULT_LOCALE);
}

export type Coverage = {
  /** Sentences a reader is shown in this language. */
  translated: number;
  total: number;
  percent: number;
  /** Sentences written but held back until a speaker has read them. */
  held: number;
};

const TOTAL = Object.keys(en).length;

/**
 * How much of the interface one language actually translates.
 *
 * Counted, never estimated: a language with twenty of thirty-five strings says
 * 57%, and the page prints that rather than "beta".
 */
export function coverageOf(code: LocaleCode): Coverage {
  if (code === DEFAULT_LOCALE) return { translated: TOTAL, total: TOTAL, percent: 100, held: 0 };
  const written = (value: unknown) => typeof value === 'string' && value.trim() !== '';
  const translated = Object.values(CATALOGUES[code] ?? {}).filter(written).length;
  // Held is counted from the files, not from the hold list: a part that is held
  // and was never written is simply missing, and must not look like a draft.
  const held = Object.entries(WRITTEN[code] ?? {}).filter(
    ([key, value]) => written(value) && isHeld(code, key),
  ).length;
  return {
    translated,
    total: TOTAL,
    // What a reader is shown, so a held part lowers it. The number on the
    // settings page is a description of the screen, not of the files.
    percent: Math.round((translated / TOTAL) * 100),
    held,
  };
}

export type LocaleGroup = { region: Locale['region']; locales: Locale[] };

/**
 * The picker, in blocks — Africa first.
 *
 * Thirty-three languages in one flat list is a list nobody reads to the end, and
 * the order of the blocks is itself a statement: a platform operated from Uganda
 * that puts Portuguese above Luganda has told its neighbours where they rank.
 * Only languages with a catalogue appear in a block; an empty block is not drawn.
 */
export function localeGroups(): LocaleGroup[] {
  const order: Array<Locale['region']> = [
    'Africa',
    'Middle East',
    'Asia',
    'Europe and the Americas',
  ];
  // English is not in a block: it is the source catalogue and the fallback, so it
  // is pinned above the blocks rather than filed under a continent. A reader who
  // wants English should not have to find Europe first.
  const available = translatedLocales().filter((l) => l.code !== DEFAULT_LOCALE);
  return order
    .map((region) => ({ region, locales: available.filter((l) => l.region === region) }))
    .filter((group) => group.locales.length > 0);
}

/** The translated name of a picker block, for the language being displayed. */
export function regionLabel(region: Locale['region']): MessageKey {
  switch (region) {
    case 'Africa':
      return 'region.africa';
    case 'Middle East':
      return 'region.middleEast';
    case 'Asia':
      return 'region.asia';
    default:
      return 'region.west';
  }
}

/**
 * Every language a reader can choose, English first.
 *
 * It has a catalogue and it is not withheld. This is the picker, and anything
 * else that tells a reader "we have this".
 */
export function translatedLocales(): Locale[] {
  return LOCALES.filter(
    (locale) =>
      locale.code === DEFAULT_LOCALE || (CATALOGUES[locale.code] && !isWithheld(locale.code)),
  );
}

/**
 * Every language somebody has written a file for, offered or not.
 *
 * For the correction sheet: a withheld language is exactly the one that most
 * needs a speaker, and it cannot be invited back from a list it is not on.
 */
export function writtenLocales(): Locale[] {
  return LOCALES.filter((locale) => locale.code === DEFAULT_LOCALE || WRITTEN[locale.code]);
}

/** The languages that are written, withheld whole, and waiting for a speaker. */
export function withheldLocales(): Locale[] {
  return LOCALES.filter((locale) => WRITTEN[locale.code] && isWithheld(locale.code));
}

/**
 * Which plural form a language wants for a count.
 *
 * `Intl.PluralRules` knows the rules; what this platform ships is **two forms**,
 * singular and plural. For English and most of the register that is the whole
 * system. For a language with a dual — Arabic says a different word for two
 * than for three — the count of two lands on the plural, which is why the shelf
 * also prints the number and never relies on the noun alone to say how many.
 * The limitation is written down in DECISIONS rather than discovered by an
 * Arabic reader counting two courses.
 */
export function pluralForm(code: LocaleCode, count: number): 'one' | 'other' {
  try {
    return new Intl.PluralRules(code).select(count) === 'one' ? 'one' : 'other';
  } catch {
    return count === 1 ? 'one' : 'other';
  }
}

/**
 * A number as this language writes it.
 *
 * Arabic writes ٢٤, Hindi २४, and a page that prints 24 in either is in English
 * with translated words around it. `Intl` is in the runtime, so there is no
 * table to maintain and no font that has to carry the digits.
 */
export function formatNumber(code: LocaleCode, value: number): string {
  try {
    return new Intl.NumberFormat(code).format(value);
  } catch {
    return String(value);
  }
}

/** A count with its noun, in the right number of forms. */
export function countLabel(
  code: LocaleCode,
  count: number,
  keys: { one: MessageKey; other: MessageKey },
): string {
  const t = translator(code);
  return t(pluralForm(code, count) === 'one' ? keys.one : keys.other, {
    count: formatNumber(code, count),
  });
}

/**
 * The label on a language in the picker.
 *
 * The name in its own script comes first because that is the name its readers
 * recognise; the English name follows for everybody else, and is the *only* name
 * a reader of another language can match to a menu they are looking at.
 */
export function localeLabel(locale: Locale): string {
  return locale.code === DEFAULT_LOCALE
    ? locale.nativeName
    : `${locale.nativeName} · ${locale.englishName}`;
}

/**
 * Where a form may send somebody after it is submitted.
 *
 * A `next` field is an open redirect unless it is checked, and the check is not
 * "starts with a slash": `//evil.example` is a protocol-relative address, and a
 * browser that normalises a backslash turns `/\evil.example` into the same
 * thing. Control characters and normalized dot segments also need validation.
 */
export function safeNextPath(next: string | null | undefined, fallback = '/language'): string {
  return safeLocalPath(next, fallback);
}

/** One sentence about where the current language came from. */
export function sourceSentence(source: LocaleSource, t: Translate): string {
  if (source === 'chosen') return t('language.chosen');
  if (source === 'device') return t('language.device');
  return t('language.default');
}
