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
import { fill, formatDateTime, formatNumber, formatPercent, pluralForm } from './format.ts';

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
// No catalogue behind these: see `format.ts` for why they live apart.
export { fill, formatDateTime, formatNumber, formatPercent, pluralForm };
export type { Direction, Locale, LocaleCode, LocaleSource, MessageKey };

export type Translate = (key: MessageKey, vars?: Record<string, string | number>) => string;

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
 * The players on the lesson page are client components with eighty-six
 * sentences of their own, most of them about a saved place. Like the
 * companion tools they are left out of what every page carries and handed
 * over by the one page that shows them (`playerMessagesFor`).
 */
const PLAYER_PREFIX = 'player.';

/**
 * Sentences only a server-rendered page reads.
 *
 * The learner dashboard, the course page, the lesson page's frame, the
 * assessment page, the assignment page, the page for a wrong address, the
 * account page, the family pages, the buy page, the page for closing an
 * account, the two pages for a copy of your data, the reading settings and
 * the page that puts a copy back are Server Components:
 * their words are in the HTML by the time a browser sees it, and no client
 * component asks for one. Several hundred sentences in the catalogue every
 * page carries would be paid for by every reader of the front page and used
 * by none of them (the number is pinned in `companion-i18n.test.ts`, where it
 * cannot go stale the way it did here). The client controls on those pages
 * (mark complete, the learner-profile prompt, the quiz, the written answer,
 * the profile form, the family forms, the buy form, the closing form, the
 * download link, the three reading settings, the form that puts a copy
 * back, the phone number card, the merge panel, the sharing panel and the
 * button that accepts an invitation) are handed their strings as props instead. If a client component ever asks
 * for one of these keys it gets English — the sentence is not in what it was
 * sent — so a test forbids it; the other fix is to take the prefix out of this
 * list.
 *
 * `broke.` is not in the list, and that is the second fix used on purpose:
 * the page for a page that broke (`app/error.tsx`) is drawn in the browser,
 * so its ten sentences have to be in what every page carries.
 */
const SERVER_ONLY_PREFIXES: readonly string[] = [
  'learn.', 'course.', 'lesson.', 'assess.', 'assign.', 'missing.', 'account.',
  'family.', 'buy.', 'close.', 'export.', 'reading.', 'restore.', 'phone.',
  'merge.', 'share.', 'refer.', 'sponsor.',
];

/** Everything a client component outside the companion pages can ask for. */
export function shellMessagesFor(code: LocaleCode): Partial<Messages> {
  return Object.fromEntries(
    Object.entries(messagesFor(code)).filter(
      ([key]) =>
        !key.startsWith(COMPANION_PREFIX) &&
        !key.startsWith(PLAYER_PREFIX) &&
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

/** The players' sentences alone, for the provider round a lesson's players. */
export function playerMessagesFor(code: LocaleCode): Partial<Messages> {
  return Object.fromEntries(
    Object.entries(messagesFor(code)).filter(([key]) => key.startsWith(PLAYER_PREFIX)),
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
 * How long something lasts — "2 min", "٢ دقیقه", "2 мин".
 *
 * The unit is not a sentence in the catalogue. It comes from the same locale
 * data as the digits, which is maintained by people who write these languages
 * rather than by this project; where that data has no abbreviation of its own
 * (Tajik, at the time of writing) it gives the international "min" and "s".
 * Nothing is returned for a missing or zero length, so the caller prints
 * nothing rather than "0 s".
 */
export function durationLabel(code: LocaleCode, seconds: number | null): string | null {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) return null;
  let m = Math.floor(seconds / 60);
  let s = Math.round(seconds % 60);
  if (s === 60) { m += 1; s = 0; }
  const parts: Array<[number, 'minute' | 'second']> = [];
  if (m > 0) parts.push([m, 'minute']);
  if (s > 0 || m === 0) parts.push([s, 'second']);
  try {
    const said = parts.map(([value, unit]) =>
      new Intl.NumberFormat(code, { style: 'unit', unit, unitDisplay: 'short' }).format(value));
    return said.length === 1
      ? said[0]!
      : new Intl.ListFormat(code, { style: 'narrow', type: 'unit' }).format(said);
  } catch {
    return parts.map(([value, unit]) => `${value} ${unit === 'minute' ? 'min' : 's'}`).join(' ');
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
