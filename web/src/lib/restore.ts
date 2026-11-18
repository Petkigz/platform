import type { SupabaseClient } from '@supabase/supabase-js';

import {
  RESTORE_FORMAT_NEWEST,
  RESTORE_MAX_BYTES,
  RESTORE_WHYS,
  restoreCodeOf,
  restoreQuoted,
  restoreReasonOf,
  type RestoreCode,
  type RestoreReason,
} from './restore-outcome.ts';

/**
 * Putting an export back.
 *
 * The document itself is built and read by `restore_my_data()`: what it will
 * and will not put back is a database decision, and a rule that existed only
 * here would be a rule a second client could skip. This file is the part that
 * has to happen before and after: reading the file the person chose, refusing
 * the obvious wrong thing by name rather than with a stack trace, and turning
 * the reply into counts and names a screen can say in any language.
 *
 * The split matters because the two halves fail differently. A wrong file is a
 * mistake made at the file picker and should be caught there, before 8 MiB goes
 * up a phone connection. A refusal from the database is a fact about the
 * person's record; it is named (`restore-outcome.ts`) and the database's own
 * sentence is not passed on.
 *
 * Nothing here is a sentence. The words are `restore.*` in the catalogue.
 */

export { RESTORE_MAX_BYTES };

/** One entry that stayed in the file: where it belonged, and why it stayed. */
export type RestoreSkip = RestoreReason & {
  /** The lesson the entry names, as the reader's file wrote it. */
  lesson?: string;
  /** The profile field, by the name the report gives it. */
  field?: string;
};

export type RestoreSection = {
  restored: number;
  alreadyThere: number;
  skipped: RestoreSkip[];
};

export type RestoreReport = {
  applied: boolean;
  formatVersion: number;
  account: { changed: string[]; skipped: RestoreSkip[] };
  notes: RestoreSection;
  bookmarks: RestoreSection;
};

export type RestoreOutcome =
  | { ok: true; report: RestoreReport }
  | { ok: false; code: RestoreCode };

/** The four reasons a file is refused before it is sent anywhere. */
export type RestoreFileCode = Extract<RestoreCode, 'too_large' | 'not_json' | 'not_export' | 'newer'>;

/**
 * Read the file the person picked.
 *
 * Every refusal has a name, and the screen's sentence for each says what to
 * choose instead, because the person choosing the file is doing something
 * reasonable: they have a folder of downloads and one of them is a video.
 */
export function parseRestoreFile(
  size: number,
  text: string,
): { ok: true; value: unknown } | { ok: false; code: RestoreFileCode } {
  if (size > RESTORE_MAX_BYTES) return { ok: false, code: 'too_large' };
  if (!text.trim()) return { ok: false, code: 'not_json' };

  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return { ok: false, code: 'not_json' };
  }

  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return { ok: false, code: 'not_export' };
  }

  const version = (value as { formatVersion?: unknown }).formatVersion;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    return { ok: false, code: 'not_export' };
  }
  // Said here as well as by the database, so a copy from a newer platform
  // costs a sentence rather than an upload.
  if (version > RESTORE_FORMAT_NEWEST) return { ok: false, code: 'newer' };

  return { ok: true, value };
}

/**
 * Ask the platform what the file would do, or do it.
 *
 * `apply: false` is the dry run and is the default all the way down: the
 * function in the database defaults to a dry run too, so a client that forgets
 * to pass the flag previews instead of writing.
 *
 * A reply that is not a report is `failed`, not a refusal: nothing is known
 * about what it did.
 */
export async function restoreMyData(
  supabase: SupabaseClient,
  document: unknown,
  apply: boolean,
): Promise<RestoreOutcome> {
  const { data, error } = await supabase.rpc('restore_my_data', {
    p_document: document,
    p_apply: apply,
  });

  if (error) return { ok: false, code: restoreCodeOf(error) };

  const report = normaliseReport(data);
  if (!report) return { ok: false, code: 'failed' };

  return { ok: true, report };
}

// A count is a non-negative whole number. Anything else (a string, a negative,
// a fraction) reads as nothing, because the alternative is a line that
// promises a restore of minus two notes.
const number = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;

const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

function skips(value: unknown): RestoreSkip[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .map((item) => {
      // `—` is what the function writes when a reason is about a whole
      // section rather than one lesson.
      const lesson = typeof item.lesson === 'string' ? restoreQuoted(item.lesson) : '';
      return {
        ...restoreReasonOf(item.reason),
        ...(lesson && lesson !== '—' ? { lesson } : {}),
        ...(typeof item.field === 'string' ? { field: item.field } : {}),
      };
    });
}

function section(value: unknown): RestoreSection {
  const raw = (value ?? {}) as Record<string, unknown>;
  return {
    restored: number(raw.restored),
    alreadyThere: number(raw.alreadyThere),
    skipped: skips(raw.skipped),
  };
}

/**
 * Shape the reply, or nothing.
 *
 * A reply that does not say whether it applied is not treated as success.
 * Restoring is a write; an ambiguous answer about a write is the one case where
 * believing it would be worse than doing nothing.
 *
 * What comes out holds none of the database's sentences. Each reason is a name
 * (`restoreReasonOf`), and the function's own list of what it never puts back
 * (`notRestored`) is left out: the page says that list itself, in the reader's
 * language, and a test holds the two together.
 */
export function normaliseReport(data: unknown): RestoreReport | null {
  if (!data || typeof data !== 'object') return null;
  const raw = data as Record<string, unknown>;
  if (typeof raw.applied !== 'boolean') return null;

  const account = (raw.account ?? {}) as Record<string, unknown>;

  return {
    applied: raw.applied,
    formatVersion: number(raw.formatVersion),
    account: { changed: strings(account.changed), skipped: skips(account.skipped) },
    notes: section(raw.notes),
    bookmarks: section(raw.bookmarks),
  };
}

const wholeOrNothing = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : undefined;

function namedSkips(value: unknown): RestoreSkip[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .map((item) => {
      const why = RESTORE_WHYS.find((name) => name === item.why) ?? 'other';
      const lesson = typeof item.lesson === 'string' ? restoreQuoted(item.lesson) : '';
      const count = wholeOrNothing(item.count);
      const read = wholeOrNothing(item.read);
      const held = wholeOrNothing(item.held);
      return {
        why,
        ...(typeof item.value === 'string' ? { value: restoreQuoted(item.value) } : {}),
        ...(count === undefined ? {} : { count }),
        ...(read === undefined ? {} : { read }),
        ...(held === undefined ? {} : { held }),
        ...(lesson ? { lesson } : {}),
        ...(typeof item.field === 'string' ? { field: item.field } : {}),
      };
    });
}

function namedSection(value: unknown): RestoreSection {
  const raw = (value ?? {}) as Record<string, unknown>;
  return {
    restored: number(raw.restored),
    alreadyThere: number(raw.alreadyThere),
    skipped: namedSkips(raw.skipped),
  };
}

/**
 * Read a report as the route sends it: reasons already named.
 *
 * The browser's half of `normaliseReport`. It trusts the shape no more than
 * that does: a reply that does not say whether it applied is nothing, a count
 * that is not a count is none, and a reason with a name this file does not
 * know is `other`.
 */
export function readRestoreReport(data: unknown): RestoreReport | null {
  if (!data || typeof data !== 'object') return null;
  const raw = data as Record<string, unknown>;
  if (typeof raw.applied !== 'boolean') return null;

  const account = (raw.account ?? {}) as Record<string, unknown>;

  return {
    applied: raw.applied,
    formatVersion: number(raw.formatVersion),
    account: { changed: strings(account.changed), skipped: namedSkips(account.skipped) },
    notes: namedSection(raw.notes),
    bookmarks: namedSection(raw.bookmarks),
  };
}

/** The four profile fields a file can change, by the names the report gives them. */
export const RESTORE_FIELDS = ['displayName', 'preferredLanguage', 'timezone', 'countryCode'] as const;

export type RestoreField = (typeof RESTORE_FIELDS)[number];

const isRestoreField = (value: unknown): value is RestoreField =>
  typeof value === 'string' && (RESTORE_FIELDS as readonly string[]).includes(value);

export type RestoreSummary = {
  /**
   * `check` and `applied` head a list of what would come back and what did.
   * The difference between the two is the whole reason the dry run exists.
   * `all_here` and `nothing` are the two ways a file puts nothing back, and
   * they are not the same: a person using last month's file again is in the
   * first.
   */
  kind: 'check' | 'applied' | 'all_here' | 'nothing';
  notes: number;
  bookmarks: number;
  /** The profile fields that change, known ones only, in the report's order. */
  fields: RestoreField[];
  /** Whether the profile changes at all, including by a field this file cannot name. */
  profile: boolean;
  /** Entries that were already here and were left as they are. */
  here: number;
};

/** What the file puts back, as counts and names. */
export function restoreSummary(report: RestoreReport): RestoreSummary {
  const notes = report.notes.restored;
  const bookmarks = report.bookmarks.restored;
  const profile = report.account.changed.length > 0;
  const here = report.notes.alreadyThere + report.bookmarks.alreadyThere;
  const something = notes > 0 || bookmarks > 0 || profile;

  return {
    kind: something ? (report.applied ? 'applied' : 'check') : here > 0 ? 'all_here' : 'nothing',
    notes,
    bookmarks,
    fields: report.account.changed.filter(isRestoreField),
    profile,
    here,
  };
}

export type RestoreLine = RestoreReason & {
  /** A profile field, a lesson by the name the file gave it, or an entry that names nothing. */
  where: { field: RestoreField | null } | { lesson: string } | { entry: true };
};

/** One line per entry that stayed in the file, profile first, ready to be said. */
export function skipLines(report: RestoreReport): RestoreLine[] {
  const lines: RestoreLine[] = [];
  const reasonOf = ({ why, value, count, read, held }: RestoreSkip): RestoreReason => ({
    why,
    ...(value === undefined ? {} : { value }),
    ...(count === undefined ? {} : { count }),
    ...(read === undefined ? {} : { read }),
    ...(held === undefined ? {} : { held }),
  });
  for (const skip of report.account.skipped) {
    // A field this file cannot name is still a line: it is said as the profile.
    lines.push({ where: { field: isRestoreField(skip.field) ? skip.field : null }, ...reasonOf(skip) });
  }
  for (const skip of [...report.notes.skipped, ...report.bookmarks.skipped]) {
    lines.push({ where: skip.lesson ? { lesson: skip.lesson } : { entry: true }, ...reasonOf(skip) });
  }
  return lines;
}

/**
 * The sentence for a reason, or the general one.
 *
 * A reason's sentence may have a gap for what the file held or for a limit. If
 * the report did not bring what goes in it, the reader is told the general
 * sentence rather than shown one with a hole.
 */
export function sentenceWithParts(sentence: string, general: string, parts: readonly string[]): string {
  const gaps = [...sentence.matchAll(/\{([a-zA-Z]+)\}/gu)].map((match) => match[1] ?? '');
  return gaps.every((gap) => parts.includes(gap)) ? sentence : general;
}
