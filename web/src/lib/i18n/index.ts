import {
  DEFAULT_LOCALE,
  LOCALES,
  LOCALE_COOKIE,
  chooseLocale,
  directionOf,
  isLocaleCode,
  localeByCode,
  matchLocale,
  type Direction,
  type Locale,
  type LocaleCode,
  type LocaleSource,
} from './locales.ts';
import { CATALOGUES } from './messages/catalogues.ts';
import { en, type MessageKey, type Messages } from './messages/en.ts';

export {
  DEFAULT_LOCALE,
  LOCALES,
  LOCALE_COOKIE,
  chooseLocale,
  directionOf,
  isLocaleCode,
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

export type Coverage = { translated: number; total: number; percent: number };

const TOTAL = Object.keys(en).length;

/**
 * How much of the interface one language actually translates.
 *
 * Counted, never estimated: a language with twenty of thirty-five strings says
 * 57%, and the page prints that rather than "beta".
 */
export function coverageOf(code: LocaleCode): Coverage {
  if (code === DEFAULT_LOCALE) return { translated: TOTAL, total: TOTAL, percent: 100 };
  const own = CATALOGUES[code] ?? {};
  const translated = Object.entries(own).filter(
    ([, value]) => typeof value === 'string' && value.trim() !== '',
  ).length;
  return {
    translated,
    total: TOTAL,
    percent: Math.round((translated / TOTAL) * 100),
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

/** Every language that has a catalogue at all, English first. */
export function translatedLocales(): Locale[] {
  return LOCALES.filter((locale) => locale.code === DEFAULT_LOCALE || CATALOGUES[locale.code]);
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
 * thing. Only a path that begins with one slash and contains no backslash is a
 * path on this site.
 */
export function safeNextPath(next: string | null | undefined, fallback = '/language'): string {
  if (!next) return fallback;
  if (!next.startsWith('/')) return fallback;
  if (next.startsWith('//')) return fallback;
  if (next.includes('\\')) return fallback;
  return next;
}

/** One sentence about where the current language came from. */
export function sourceSentence(source: LocaleSource, t: Translate): string {
  if (source === 'chosen') return t('language.chosen');
  if (source === 'device') return t('language.device');
  return t('language.default');
}
