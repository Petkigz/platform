/**
 * What a learner has memorised, and when to look at it again.
 *
 * The schedule lives in SQL (`hifz_ladder()`, `review_hifz_passage()`), because a
 * rule that decides when somebody revises has to hold whichever client asks. What
 * is here is everything the screen needs to say about it, and nothing that could
 * drift from the database: the ladder is read from the payload rather than
 * hard-coded, so a change in SQL shows up on the page instead of being described
 * wrongly by a copy.
 *
 * The one thing this file is careful about: **a lapse is not a failure.** The
 * words on the page say what happened to a date — "back to tomorrow" — and never
 * what it means about the person. There is no score to display because none is
 * computed, and nothing here compares one learner with another.
 */

export type HifzPassage = {
  id: string;
  label: string;
  status: 'learning' | 'memorised';
  rung: number;
  intervalDays: number;
  nextDueOn: string;
  lastReviewedOn: string | null;
  reviewCount: number;
  lapses: number;
  /** Negative means due in the past; 0 means today. */
  daysUntilDue: number;
};

export type HifzRecord = {
  enabled: boolean;
  learnerId: string | null;
  today?: string;
  ladder?: number[];
  counts?: { passages: number; due: number; memorised: number };
  passages?: HifzPassage[];
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

/**
 * Read `my_hifz()`'s answer.
 *
 * A passage that cannot be read is dropped rather than rendered as a blank row:
 * a list of dates with no names is worse than a shorter list, because the learner
 * cannot tell whether something is missing.
 */
export function parseHifzRecord(input: unknown): HifzRecord {
  const row = record(input);
  if (!row) return { enabled: false, learnerId: null };
  if (row.enabled !== true) return { enabled: false, learnerId: null };

  const passages: HifzPassage[] = [];
  for (const entry of Array.isArray(row.passages) ? row.passages : []) {
    const p = record(entry);
    if (!p) continue;
    const id = text(p.id);
    const label = text(p.label);
    if (!id || !label) continue;
    passages.push({
      id,
      label,
      status: p.status === 'memorised' ? 'memorised' : 'learning',
      rung: whole(p.rung),
      intervalDays: whole(p.intervalDays),
      nextDueOn: text(p.nextDueOn) ?? '',
      lastReviewedOn: text(p.lastReviewedOn),
      reviewCount: whole(p.reviewCount),
      lapses: whole(p.lapses),
      daysUntilDue: whole(p.daysUntilDue),
    });
  }

  const counts = record(row.counts);

  return {
    enabled: true,
    learnerId: text(row.learnerId),
    today: text(row.today) ?? undefined,
    ladder: Array.isArray(row.ladder) ? row.ladder.map(whole).filter((n) => n > 0) : undefined,
    counts: {
      passages: whole(counts?.passages),
      due: whole(counts?.due),
      memorised: whole(counts?.memorised),
    },
    passages,
  };
}

/** Everything the learner should look at today: due now or overdue. */
export function dueNow(passages: HifzPassage[]): HifzPassage[] {
  return passages.filter((p) => p.daysUntilDue <= 0);
}

/** What is coming, soonest first. */
export function comingUp(passages: HifzPassage[]): HifzPassage[] {
  return passages.filter((p) => p.daysUntilDue > 0).sort((a, b) => a.daysUntilDue - b.daysUntilDue);
}

/**
 * When a review is due, in words.
 *
 * "Due today" is the sentence a learner needs; "0" is a number they have to
 * translate. Overdue is stated as a plain fact about a date — three days late is
 * three days late, and the page does not attach a consequence to it.
 */
export function dueLabel(daysUntilDue: number): string {
  if (daysUntilDue === 0) return 'Due today';
  if (daysUntilDue === -1) return 'A day overdue';
  if (daysUntilDue < -1) return `${Math.abs(daysUntilDue)} days overdue`;
  if (daysUntilDue === 1) return 'Due tomorrow';
  return `Due in ${daysUntilDue} days`;
}

/**
 * The two verdicts, and what each one does to the date.
 *
 * Said as the consequence rather than as a judgement: "solid" and "shaky" are
 * the learner's own words about their own recall, and the only thing the platform
 * does with either is move a number.
 */
export const HIFZ_VERDICTS = [
  {
    value: 'solid' as const,
    label: 'Solid',
    note: 'I recalled it without trouble — wait longer next time.',
  },
  {
    value: 'shaky' as const,
    label: 'Shaky',
    note: 'I needed help — bring it back tomorrow.',
  },
];

/** The schedule, as a sentence with the real numbers from the database. */
export function ladderSentence(ladder: number[] | undefined): string {
  if (!ladder || ladder.length === 0) {
    return 'Each solid review moves a passage further away; each shaky one brings it back tomorrow.';
  }
  const list = ladder.map((days) => (days === 1 ? '1 day' : `${days} days`)).join(', ');
  return (
    `Every passage starts at 1 day. A review you call solid moves it one step along ` +
    `(${list}); a shaky one puts it back to 1 day. The steps stop at ${ladder[ladder.length - 1]} days.`
  );
}

/**
 * The header of the page, when there is something to say.
 *
 * Counts are facts: how many passages, how many due, how many the learner has
 * called memorised. Nothing here congratulates and nothing scolds — a learner who
 * has been away for a month needs the number, not a streak.
 */
export function hifzSentence(record: HifzRecord): string {
  const counts = record.counts;
  if (!counts || counts.passages === 0) {
    return 'Nothing is on your list yet. Add the first passage you are memorising.';
  }

  const passages = counts.passages === 1 ? '1 passage' : `${counts.passages} passages`;
  const memory = counts.memorised === 0 ? '' : `, ${counts.memorised} of them memorised`;

  if (counts.due === 0) {
    return `${passages}${memory}. Nothing is due today.`;
  }
  if (counts.due === 1) {
    return `${passages}${memory}. One is due today.`;
  }
  return `${passages}${memory}. ${counts.due} are due today.`;
}

/** A refusal from the database, written as an answer to "what do I do now?". */
export function hifzErrorMessage(raw: string): string {
  const text = raw ?? '';
  const known: Array<[RegExp, string]> = [
    [/hifz:not_enabled/, 'Memorisation tracking is not switched on for this platform yet.'],
    [/hifz:not_allowed/, 'You can only keep a list for yourself or for a learner in your family.'],
    [/hifz:label_required/, 'Write what the passage is — "Al-Fatihah 1–7" is enough.'],
    [/hifz:label_too_long/, 'That name is too long. Keep it under 200 characters.'],
    [/hifz:already_exists/, 'That is already on the list.'],
    [/hifz:bad_status/, 'That is not a state a passage can be in.'],
    [/hifz:bad_outcome/, 'Say whether the review was solid or shaky.'],
    [/hifz:passage_not_found/, 'That passage is no longer on the list.'],
  ];

  for (const [pattern, sentence] of known) {
    if (pattern.test(text)) return sentence;
  }
  return text === '' ? 'That did not reach the server.' : text;
}
