/**
 * The words the memorisation board is handed, what `/api/hifz` answered as a
 * name, and the sentence for it.
 *
 * Pure, with no import, because the board (`app/hifz/hifz-board.tsx`) is a
 * client component and a browser may not carry the catalogues. The words are
 * made on the server by `hifzWords` in `hifz-words.ts`; the names are the
 * ones the route sends (`hifzRefusalName` in `hifz.ts`).
 *
 * The rule is the one in `enrol-outcome.ts` and `guardian-outcome.ts`:
 * **only a reply in the four hundreds that names a reason this file knows is
 * a refusal.** Anything else — a lost reply, a five hundred, a page from
 * something in front of the site — is `unconfirmed`, and the sentence for
 * that sends the reader to look at the list before pressing again, because
 * the passage may well have been added.
 */

/**
 * The example in the box a passage is typed in, and in the sentence that asks
 * for one. The same in every language: it is an example of what a learner
 * might type, and a learner may type in any script.
 */
export const HIFZ_EXAMPLE = 'Al-Fatihah 1–7';

export type HifzRefusal =
  | 'not_enabled'
  | 'not_allowed'
  | 'label_required'
  | 'label_too_long'
  | 'already_exists'
  | 'bad_status'
  | 'bad_outcome'
  | 'passage_not_found'
  | 'not_signed_in'
  /** The database said no and this build has no sentence for why. */
  | 'refused'
  | 'unconfirmed';

export const HIFZ_REFUSALS: readonly HifzRefusal[] = [
  'not_enabled', 'not_allowed', 'label_required', 'label_too_long', 'already_exists',
  'bad_status', 'bad_outcome', 'passage_not_found', 'not_signed_in', 'refused',
];

/** What the route answered, as the name the board says it by. */
export function hifzOutcomeOf(status: number, code: unknown): HifzRefusal {
  if (status < 400 || status > 499) return 'unconfirmed';
  return typeof code === 'string' && HIFZ_REFUSALS.includes(code as HifzRefusal)
    ? (code as HifzRefusal)
    : 'unconfirmed';
}

/** One verdict a learner gives on their own recall, and what it does to the date. */
export type VerdictWords = { label: string; note: string };

/** What is said under one passage: both are whole sentences, already counted. */
export type PassageWords = {
  /** "Due today", "Due in 3 days", "2 days overdue". */
  due: string;
  /** "Reviewed 4 times. Next in 7 days. Once it needed bringing back to the start." */
  line: string;
};

/** Every sentence the board says, in the reader's language. */
export type HifzBoardWords = {
  eyebrow: string;
  title: string;
  /** "4 passages. 2 of them memorised. Nothing is due today." */
  summary: string;
  dueToday: string;
  forFamily: string;
  nothingDue: string;
  comingUp: string;
  addTitle: string;
  addLabel: string;
  addIt: string;
  addHelp: string;
  howTitle: string;
  /** The schedule, with the numbers the database gave. */
  ladder: string;
  back: string;
  badge: string;
  stillLearning: string;
  memorisedIt: string;
  takeOff: string;
  keep: string;
  solid: VerdictWords;
  shaky: VerdictWords;
  added: string;
  /** These three carry `{label}`, the name the learner typed. */
  movedOn: string;
  backTomorrow: string;
  archived: string;
  refusals: Record<HifzRefusal, string>;
  /** By the id of the passage. */
  passages: Record<string, PassageWords>;
};

/**
 * A sentence with a passage's name in it, cut where the name goes, so the
 * board can set the name apart: it is what the learner typed, often Arabic,
 * and keeps its own direction inside a sentence that runs the other way.
 */
export function aroundLabel(sentence: string): [before: string, after: string] {
  const at = sentence.indexOf('{label}');
  if (at < 0) return [sentence, ''];
  return [sentence.slice(0, at), sentence.slice(at + '{label}'.length)];
}
