/**
 * Arabic text inside an English page — and why that is not a detail.
 *
 * A Qur'anic quotation on a lesson page is the one place on this platform where
 * text is in a different script, and it fails in three ways if nobody thinks
 * about it.
 *
 * **A screen reader pronounces it with an English voice.** Without a `lang`
 * attribute the speech engine reads Arabic letters as though they were Latin
 * ones, and the result is noise — the single most common accessibility failure
 * on Islamic websites, and it is invisible to anybody who can see the page. A
 * `lang="ar"` attribute is the whole fix, and it costs nothing.
 *
 * **The line reorders.** Arabic runs right-to-left and English left-to-right, so
 * a mixed line has to be laid out by the Unicode bidi algorithm. Left alone it
 * usually gets the words right and the punctuation wrong: the closing bracket
 * of `(الفاتحة)` drifts to the wrong end, and a full stop jumps to the front of
 * the sentence. `<bdi>` isolates a run from its surroundings, and in plain text —
 * a page description, an email, a CSV cell — U+2068 … U+2069 does the same job.
 *
 * **The letters come apart.** Arabic is cursive: a word is a joined shape, and
 * `letter-spacing` inserts gaps between letters that are supposed to touch. A
 * stylesheet that applies tracking for legibility in Latin destroys Arabic. The
 * fix is in CSS (see `globals.css`), and the reason it is stated here is that
 * the next person to add a heading style will not otherwise know.
 *
 * What this module deliberately does **not** do: it does not translate anything,
 * and it does not guess at a language from a country or a name. A person called
 * Yusuf may write in English, and a course about Arabic grammar may be written
 * in either. Script in the text is the only thing detected here.
 *
 * **Where it is used, and where `lib/language.ts` is used instead.** A course has
 * a stored language code, so a course page takes `textProps(code)` from there and
 * trusts the column. A learner's name, a lesson's title and a certificate's
 * dedication have no such column, so they come through `_shared/arabic-text.tsx`
 * and are read here. Detection fills a gap; it does not overrule a stored fact.
 */

/**
 * Arabic, in every block a text can arrive in: the main block, Supplement,
 * Extended-A, and the Presentation Forms that carry ligatures such as ﷺ
 * (U+FDFA). A quotation of the Prophet's name is Arabic even when the sentence
 * around it is not, so leaving the presentation forms out would miss exactly the
 * case that appears most often.
 *
 * `Script_Extensions` rather than `Script`, and that one word matters: the vowel
 * marks — fatha, kasra, shadda, the whole harakat set — are `Script=Inherited`
 * with `Script_Extensions=Arabic`. Testing `Script=Arabic` would treat each mark
 * as a foreign character and shatter `بِسْمِ` into five runs.
 */
const ARABIC = /[\p{Script_Extensions=Arabic}]/u;

/** Any strong right-to-left letter. Arabic and Hebrew share the direction. */
const STRONG_RTL = /[\p{Script_Extensions=Arabic}\p{Script=Hebrew}]/u;
/** Any strong left-to-right letter. */
const STRONG_LTR = /[\p{Script=Latin}\p{Script=Cyrillic}\p{Script=Greek}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u;

export type Direction = 'rtl' | 'ltr';

export type Run = { text: string; arabic: boolean };

/** Does this text contain Arabic at all? Cheap, and answers the common case. */
export function hasArabic(text: string | null | undefined): boolean {
  return typeof text === 'string' && ARABIC.test(text);
}

/**
 * Which way the *first strong character* faces — which is what `dir="auto"`
 * does in a browser, and what a block of text should be laid out by.
 *
 * Digits and punctuation are weak: they take their direction from the text
 * around them, so a description beginning "12 rules of tajweed" is left-to-right
 * even though it starts with a digit, and one beginning "الفاتحة 7 آيات" is
 * right-to-left.
 */
export function directionOf(text: string | null | undefined): Direction {
  if (typeof text !== 'string') return 'ltr';
  for (const character of text) {
    if (STRONG_RTL.test(character)) return 'rtl';
    if (STRONG_LTR.test(character)) return 'ltr';
  }
  return 'ltr';
}

/**
 * The text split into Arabic and non-Arabic runs, in order, losing nothing.
 *
 * Whitespace and punctuation between two Arabic words stay with the Arabic run:
 * splitting them out would create English runs of a single space, each of which
 * would need its own element. A run is as long as it can be.
 */
export function runs(text: string | null | undefined): Run[] {
  const out: Run[] = [];
  if (typeof text !== 'string' || text.length === 0) return out;

  let current = '';
  let currentIsArabic = false;
  let decided = false;

  const flush = () => {
    if (current.length > 0) out.push({ text: current, arabic: currentIsArabic });
    current = '';
  };

  for (const character of text) {
    const isArabicLetter = ARABIC.test(character);
    // A space, a punctuation mark or a combining mark takes the colour of the
    // run it is in, unless the run has not started — in which case it belongs to
    // whatever comes next. Marks are here for the harakat: a vowel mark is not a
    // letter and must never break a word apart.
    const isNeutral = /[\s\p{P}\p{S}\p{M}]/u.test(character) && !isArabicLetter;

    if (!decided) {
      current += character;
      if (!isNeutral) {
        currentIsArabic = isArabicLetter;
        decided = true;
      }
      continue;
    }

    if (isNeutral) {
      current += character;
      continue;
    }

    if (isArabicLetter === currentIsArabic) {
      current += character;
      continue;
    }

    flush();
    current = character;
    currentIsArabic = isArabicLetter;
  }
  flush();
  return out;
}

/**
 * The text with every Arabic run isolated, for contexts that render a plain
 * string: a `<meta>` description, an email body, a CSV cell, a certificate PDF.
 *
 * U+2068 (First Strong Isolate) … U+2069 (Pop Directional Isolate) tells the
 * bidi algorithm "lay this run out on its own, then continue" — so the
 * punctuation around it stays where the writer put it.
 */
export function isolateArabic(text: string | null | undefined): string {
  if (typeof text !== 'string' || text.length === 0) return '';
  return runs(text)
    .map((run) => (run.arabic ? `\u2068${run.text}\u2069` : run.text))
    .join('');
}

/**
 * Whether a block is *mostly* Arabic, which is the question a layout asks: an
 * English sentence quoting one Arabic word stays left-aligned, while an Arabic
 * paragraph with an English gloss should sit right-aligned.
 */
export function majorityDirection(text: string | null | undefined): Direction {
  if (typeof text !== 'string') return 'ltr';
  let arabic = 0;
  let latin = 0;
  for (const character of text) {
    if (ARABIC.test(character)) arabic += 1;
    else if (STRONG_LTR.test(character)) latin += 1;
  }
  if (arabic === 0) return 'ltr';
  if (latin === 0) return 'rtl';
  return arabic > latin ? 'rtl' : 'ltr';
}

/**
 * A short, honest description of what a string is, for a `lang` attribute.
 *
 * `ar` when the text is entirely Arabic, `en` when it has none, and `null` when
 * it is mixed — because a mixed string has no single language, and the runs are
 * marked individually by the component that renders them.
 */
export function languageOf(text: string | null | undefined): string | null {
  if (typeof text !== 'string' || text.trim() === '') return null;
  if (!hasArabic(text)) return 'en';
  const anyLatin = Array.from(text).some((character) => STRONG_LTR.test(character));
  return anyLatin ? null : 'ar';
}

/** Everything the display needs, in one call, so a page does not recompute it. */
export function describeText(text: string | null | undefined): {
  runs: Run[];
  blockDirection: Direction;
  language: string | null;
  hasArabic: boolean;
} {
  return {
    runs: runs(text),
    blockDirection: majorityDirection(text),
    language: languageOf(text),
    hasArabic: hasArabic(text),
  };
}
