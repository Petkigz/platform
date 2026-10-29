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

/** Every language that has a catalogue at all, English first. */
export function translatedLocales(): Locale[] {
  return LOCALES.filter((locale) => locale.code === DEFAULT_LOCALE || CATALOGUES[locale.code]);
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
