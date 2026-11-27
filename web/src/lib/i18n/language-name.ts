import { LOCALES, type LocaleCode } from './locales.ts';

/**
 * The name of a language, said in the language of the page.
 *
 * A course's language is stored as a code, and five pages showed the code:
 * a certificate read "ar", and so did the page an employer opens to check
 * one. Found by drawing the pages, 2026-11-26. A code is the register's
 * word; a reader is owed the name.
 *
 * The name comes from the runtime (`Intl.DisplayNames`), the way a course
 * page already says "Taught in Arabic". When the runtime has no name in the
 * page's language, the list of languages this platform offers supplies the
 * English one. A code that nothing can name is shown as it was written: that
 * is still what the register holds, and inventing a name would not be.
 */
export function languageName(reader: LocaleCode, code: string | null | undefined): string | null {
  const written = code?.trim() ?? '';
  if (written.length === 0) return null;

  for (const page of reader === 'en' ? ['en'] : [reader, 'en']) {
    try {
      const name = new Intl.DisplayNames([page], { type: 'language', fallback: 'none' }).of(written);
      if (name) return name;
    } catch {
      // Not a code the runtime can read at all; the list below, then the code.
    }
  }

  const known = LOCALES.find((locale) => locale.code.toLowerCase() === written.toLowerCase());
  return known ? known.englishName : written;
}
