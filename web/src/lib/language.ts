/**
 * The language a course is taught in.
 *
 * A language is a fact about a course, not a translation of it: a course is
 * taught in one language and a learner wants to know which before they open it.
 * Nothing here claims the *interface* has been translated — the screens are
 * English, and the flag and the accessibility page say so.
 *
 * Two jobs, both small and both easy to get wrong if they lived in a component:
 *
 * - **Direction.** A title written in Arabic inside an English page renders
 *   backwards unless the element says `dir="auto"`. This returns the props that
 *   make it say so, and never guesses from the language code alone: `auto` lets
 *   the browser read the first strong character, which is right for a mixed
 *   title like "Tajweed — التجويد".
 * - **Names.** A speaker reads `العربية`; an English reader reads `Arabic`. Both
 *   are stored, and the chip shows the one the person can read.
 */

export type LanguageDirection = 'ltr' | 'rtl';

export type Language = {
  code: string;
  nativeName: string;
  englishName: string;
  direction: LanguageDirection;
  courses: number;
};

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function whole(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
    return Math.trunc(Number(value));
  }
  return 0;
}

/** What `course_languages()` returns: the chips a catalogue may offer. */
export function parseLanguages(input: unknown): Language[] {
  if (!Array.isArray(input)) return [];
  const languages: Language[] = [];
  for (const entry of input) {
    const row = record(entry);
    if (!row) continue;
    const code = text(row.code);
    if (!code) continue;
    languages.push({
      code,
      nativeName: text(row.nativeName) ?? code,
      englishName: text(row.englishName) ?? code,
      direction: row.direction === 'rtl' ? 'rtl' : 'ltr',
      courses: whole(row.courses),
    });
  }
  return languages;
}

/**
 * Props for an element holding text whose direction is not known in advance.
 *
 * `dir="auto"` rather than `dir="rtl"` even for a course filed as Arabic: a
 * title may be transliterated, or mixed, and the browser's own rule is better
 * than ours. `lang` is only set when the code is a plausible tag, so a bad row
 * cannot put an attribute on the page that a screen reader will mispronounce.
 */
export function textProps(code: string | null | undefined): {
  dir: 'auto';
  lang?: string;
} {
  if (code && /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/.test(code)) {
    return { dir: 'auto', lang: code };
  }
  return { dir: 'auto' };
}

/**
 * The sentence a course page prints. "Taught in Arabic" is shorter and truer
 * than "Language: Arabic" — the reader's question is what they will hear, not
 * which column was filled in.
 */
export function describeCourseLanguage(language: Pick<Language, 'code' | 'nativeName' | 'englishName'> | null): string {
  if (!language) return 'Taught in a language this page could not read';
  return `Taught in ${language.englishName}`;
}

/** The chip row's first chip. `null` means every language, which is the default. */
export const ALL_LANGUAGES = 'all';

/**
 * Whether a filter value is one this page may send. A catalogue URL is typed by
 * anybody, and a nonsense value should show everything rather than an empty
 * shelf with no explanation.
 */
export function validLanguageFilter(value: string | null | undefined, languages: Language[]): string | null {
  if (!value) return null;
  if (value === ALL_LANGUAGES) return null;
  return languages.some((language) => language.code === value) ? value : null;
}

/**
 * What a course card says about language — and nothing when it is English,
 * because naming the default on every card is noise that makes the exception
 * harder to see.
 */
export function cardLanguageNote(language: Language | null): string | null {
  if (!language) return null;
  if (language.code === 'en') return null;
  return language.englishName;
}

/** The comparison a person might make: two courses, one language each. */
export function sameLanguage(
  a: Pick<Language, 'code'> | null,
  b: Pick<Language, 'code'> | null,
): boolean {
  return a?.code === b?.code;
}
