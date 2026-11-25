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
 * A refusal from the database, as a name.
 *
 * `/api/hifz` sends the name and the board says it in the reader's language
 * (`hifz-board-words.ts`, `hifz-words.ts`). Until 2026-11-25 this file wrote
 * an English sentence for the eight refusals it knew and **passed anything
 * else through as the database wrote it**, so a constraint's name or a
 * driver's message could end up on a learner's screen. Now an answer this
 * file does not know is `refused`, and that has one plain sentence.
 */
export function hifzRefusalName(raw: string | null | undefined): string {
  const found = /hifz:([a-z_]+)/.exec(raw ?? '');
  const name = found ? String(found[1]) : '';
  return KNOWN.includes(name) ? name : 'refused';
}

/**
 * What to answer when a write came back with an error: the name, and the
 * status that tells the board whether it is an answer at all.
 *
 * An error the database raised carries its code (`P0001`, a constraint's
 * `23505`, PostgREST's `PGRST…`): the database said no and nothing was
 * written, so it is a refusal in the four hundreds. An error with no code is
 * the request itself failing on the way — a timeout, a dropped connection —
 * and then **whether it was written is not known**. That leaves as a 502, and
 * the board says "could not confirm" and reads the list again rather than
 * telling a learner to press a second time.
 */
export function hifzRefusalOf(
  error: { message?: string | null; code?: string | null } | null | undefined,
): { code: string; status: number } {
  const name = hifzRefusalName(error?.message);
  if (name !== 'refused') return { code: name, status: 400 };
  const answered = typeof error?.code === 'string' && error.code.trim() !== '';
  return answered ? { code: 'refused', status: 400 } : { code: 'unconfirmed', status: 502 };
}

const KNOWN: readonly string[] = [
  'not_enabled', 'not_allowed', 'label_required', 'label_too_long', 'already_exists',
  'bad_status', 'bad_outcome', 'passage_not_found',
];
