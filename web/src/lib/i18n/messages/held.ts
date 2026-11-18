import type { LocaleCode } from '../locales.ts';

/**
 * Written, but not shown: parts of a language held until a speaker has read them.
 *
 * Every translation here was written by the people who built the site, and the
 * settings page says so. For most of the interface a clumsy sentence costs a
 * reader a moment. The companion tools are different: they explain how a prayer
 * time was calculated and what the reader has to check for themselves, and in
 * the languages below the builder's text gets those sentences wrong — "a week
 * of the night" for one seventh of it, "a part of the night" with the fraction
 * gone, a calculate button that is not a word. Owner's decision, 2026-11-16: a
 * language the builder cannot write properly falls back to English on those
 * screens until a first-language speaker has reviewed it.
 *
 * **Held is not deleted.** The text stays in its file (`companion.ts`), is left
 * out of what readers are served (`CATALOGUES`), and is still what the
 * correction sheet at `/contribute` opens with (`WRITTEN`), so a reviewer starts
 * from a draft rather than an empty box. A reader in one of these languages
 * sees the rest of the interface in their language and these screens in
 * English, and the coverage number on `/language` drops to say so.
 *
 * **Releasing a part** is deleting its entry here, after a speaker's review of
 * that part has been applied to the file. It is deliberately a change somebody
 * makes and somebody else can read in a diff, not a switch.
 *
 * Each entry names sections by their key prefix, the same unit a reviewer
 * signs off (`SECTIONS` in `lib/translations.ts`).
 *
 * **A whole language can be withheld**, and four are. Wolof, Fulfulde, Bambara
 * and Dhivehi were asked about separately, because their companion text was
 * not a rough draft but a placeholder, and nobody here can say whether their
 * navigation and sign-in pages are any better. Owner's second answer,
 * 2026-11-16: the rest of the interface in those four falls back to English
 * too. A language with nothing left to show is not a language the site has, so
 * it is treated as one: it is not in the picker, a device or a stale cookie
 * that asks for it is given English (the owner's third answer: English every
 * time, not the next language on the device's list), and it is listed on
 * `/language` at 0%. It stays in the register and on the
 * correction sheet, which is the only place it can come back from.
 */

/** In place of a list of parts: every part, so the language is not offered. */
export const WHOLE_LANGUAGE = '*';

export const HELD_FOR_REVIEW: Partial<Record<LocaleCode, readonly string[]>> = {
  // Withheld whole: not drafts to correct, pages to write again.
  wo: [WHOLE_LANGUAGE],
  ff: [WHOLE_LANGUAGE],
  bm: [WHOLE_LANGUAGE],
  dv: [WHOLE_LANGUAGE],
  // Drafts with errors the builder can see and cannot reliably repair.
  am: ['companion'],
  ti: ['companion'],
  om: ['companion'],
  so: ['companion'],
  ha: ['companion'],
  yo: ['companion'],
  ig: ['companion'],
  rw: ['companion'],
  lg: ['companion'],
  ln: ['companion'],
  mg: ['companion'],
  ny: ['companion'],
  sn: ['companion'],
  st: ['companion'],
  zu: ['companion'],
  xh: ['companion'],
  ps: ['companion'],
  si: ['companion'],
  my: ['companion'],
};

/**
 * Parts that were never written for a language with anything held.
 *
 * Different from a hold. A held part is a draft in the file that readers are
 * not shown; these have no draft. They were written after the owner's decision
 * of 2026-11-16 — a language the builder cannot write properly falls back to
 * English until a speaker has reviewed it — so for the twenty-three languages
 * above, nothing was written at all rather than written and hidden.
 *
 * It follows the hold list on purpose: a language that leaves `HELD_FOR_REVIEW`
 * is one a speaker has read, and from that moment these parts are expected of
 * it like any other. The audit then reports them as missing, which is the
 * reminder to ask that speaker for them.
 */
export const UNWRITTEN_WHILE_HELD: readonly string[] = [
  'learn',
  'course',
  'lesson',
  'assess',
  'assign',
  'missing',
  'broke',
  'player',
  'account',
];

/** Whether this sentence is deliberately absent from this language's file. */
export function isUnwritten(code: string, key: string): boolean {
  return (
    Object.hasOwn(HELD_FOR_REVIEW, code) && UNWRITTEN_WHILE_HELD.includes(sectionOf(key))
  );
}

/** The part of a key a hold is written against: `companion.prayerTitle` → `companion`. */
export function sectionOf(key: string): string {
  return key.split('.')[0] ?? key;
}

/** Whether readers of this language are shown English for this key for now. */
export function isHeld(code: string, key: string): boolean {
  const held = (HELD_FOR_REVIEW as Record<string, readonly string[] | undefined>)[code];
  return held !== undefined && (held.includes(WHOLE_LANGUAGE) || held.includes(sectionOf(key)));
}

/**
 * Whether a whole language is withheld, and so not offered to readers at all.
 *
 * Different from a language with one part held: that one is still chosen,
 * still sets `<html lang>`, and still reads in its own words everywhere else.
 */
export function isWithheld(code: string): boolean {
  const held = (HELD_FOR_REVIEW as Record<string, readonly string[] | undefined>)[code];
  return held !== undefined && held.includes(WHOLE_LANGUAGE);
}
