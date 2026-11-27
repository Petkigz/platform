/**
 * What a device's own voice is given to read, and which voice reads it.
 *
 * **This file imports nothing**: a client component uses it.
 *
 * Reading aloud is the browser's (the Web Speech API): the words go to the
 * voice the device already has and to nobody else, so there is no provider,
 * no key and no bill. That is also its limit. A device has the voices it has;
 * one with no voice for a lesson's language cannot read that lesson, and the
 * screen says so instead of letting an English voice spell out Urdu.
 *
 * **A verse is not for a machine's voice.** A synthetic voice has no tajwid
 * and will read the Qur'an wrongly. Nothing in a lesson marks which words are
 * a verse, so this goes by how a verse is written: with its vowel marks, in
 * the ornate brackets, or with the signs a mushaf carries. A sentence that
 * holds any of those is left out whole. Ordinary Arabic, Urdu or Persian
 * prose carries a mark here and there and is read. A verse somebody typed
 * with no marks at all is not recognised and will be read: that is the limit
 * of the rule, and it is the same thing a screen reader already does.
 */

/** Fathatan to sukun, the dagger alif, and the small signs written above and below a mushaf's letters. */
const VOWEL_MARK = /[\u064B-\u0652\u0670]/gu;
const ARABIC_LETTER = /[\u0621-\u063A\u0641-\u064A\u0671-\u06D3]/gu;
/** Ornate brackets, the end-of-ayah sign, a mushaf's annotation signs, and the basmala as one character. */
const VERSE_SIGN = /[\uFD3E\uFD3F\u06DD\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED\uFDFD]/u;

/** Whether a sentence is written the way a verse is written. */
export function looksLikeVerse(sentence: string): boolean {
  if (VERSE_SIGN.test(sentence)) return true;
  const marks = sentence.match(VOWEL_MARK)?.length ?? 0;
  if (marks < 3) return false;
  const letters = sentence.match(ARABIC_LETTER)?.length ?? 0;
  // Fully vowelled Arabic carries a mark on most letters; prose with a mark
  // for clarity carries one in twenty or fewer.
  return letters > 0 && marks / letters >= 0.15;
}

/** The longest piece handed over at once: some browsers stop a long utterance part-way. */
const LONGEST = 220;

function pieces(sentence: string): string[] {
  const out: string[] = [];
  let rest = sentence;
  while (rest.length > LONGEST) {
    // The last comma or space before the limit; a word is never cut.
    const window = rest.slice(0, LONGEST);
    const at = Math.max(window.lastIndexOf('، '), window.lastIndexOf(', '), window.lastIndexOf('，'), window.lastIndexOf(' '));
    const cut = at > 40 ? at + 1 : LONGEST;
    out.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) out.push(rest);
  return out.filter(Boolean);
}

/**
 * A text as the pieces a voice is given, in order, and how many sentences
 * were left out because they are written as a verse is.
 */
export function speakable(text: string | null | undefined): { parts: string[]; skipped: number } {
  const parts: string[] = [];
  let skipped = 0;
  for (const line of (text ?? '').split(/\n+/u)) {
    // A sentence ends at its own full stop, in whatever script it is written.
    const sentences = line.match(/[^.!?؟۔。！？।]+[.!?؟۔。！？।]*\s*/gu) ?? [];
    for (const raw of sentences) {
      const sentence = raw.trim();
      if (!sentence || !/[\p{L}\p{N}]/u.test(sentence)) continue;
      if (looksLikeVerse(sentence)) {
        skipped += 1;
        continue;
      }
      parts.push(...pieces(sentence));
    }
  }
  return { parts, skipped };
}

type VoiceLike = { lang: string; default?: boolean; localService?: boolean };

/**
 * Which of the device's voices reads a text in `language`, as its place in
 * the list, or -1 when the device has none for that language.
 *
 * A voice says its language as `ar-SA`, `ar_SA` or `ar`; a course says `ar`,
 * or `zh-hans`. Only the language itself is compared. Among several, a voice
 * that lives on the device comes before one that needs the network, and the
 * device's own default before the rest.
 */
export function pickVoice(voices: readonly VoiceLike[], language: string | null | undefined): number {
  const wanted = (language ?? '').toLowerCase().split(/[-_]/u)[0];
  if (!wanted) return -1;
  let best = -1;
  let bestScore = -1;
  voices.forEach((voice, index) => {
    if ((voice.lang ?? '').toLowerCase().split(/[-_]/u)[0] !== wanted) return;
    const score = (voice.localService ? 2 : 0) + (voice.default ? 1 : 0);
    if (score > bestScore) {
      best = index;
      bestScore = score;
    }
  });
  return best;
}
