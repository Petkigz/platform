import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Putting an export back.
 *
 * The document itself is built and read by `restore_my_data()` — what it will
 * and will not put back is a database decision, and a rule that existed only
 * here would be a rule a second client could skip. This file is the part that
 * has to happen in a browser before anything is sent: reading the file the
 * person chose, refusing the obvious wrong thing with a sentence rather than a
 * stack trace, and turning the reply into a paragraph somebody can read.
 *
 * The split matters because the two halves fail differently. A wrong file is a
 * mistake made at the file picker and should be caught there, before 8 MiB goes
 * up a phone connection in Kampala. A refusal from the database is a fact about
 * the person's record and is passed through in its own words.
 */

/** The same ceiling `restore_my_data()` applies. Checked here so a large file
 *  is refused at the picker rather than after the upload. */
export const RESTORE_MAX_BYTES = 8 * 1024 * 1024;

export type RestoreSkip = {
  lesson?: string;
  field?: string;
  reason: string;
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
  notRestored: Array<{ what: string; why: string }>;
};

export type RestoreOutcome =
  | { ok: true; report: RestoreReport }
  | { ok: false; message: string };

/**
 * Read the file the person picked.
 *
 * Every failure here is a sentence about what to do instead, because the person
 * choosing the file is doing something reasonable — they have a folder of
 * downloads and one of them is a video.
 */
export function parseRestoreFile(
  name: string,
  size: number,
  text: string,
): { ok: true; value: unknown } | { ok: false; message: string } {
  if (size > RESTORE_MAX_BYTES) {
    return {
      ok: false,
      message: `“${name}” is ${mib(size)}. An export of somebody's whole record is under ${mib(
        RESTORE_MAX_BYTES,
      )}, so this is probably not one.`,
    };
  }

  if (!text.trim()) {
    return { ok: false, message: `“${name}” is empty.` };
  }

  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return {
      ok: false,
      message: `“${name}” is not JSON. Choose the file ending in .json that the export page downloaded — the spreadsheet and the PDF cannot be put back.`,
    };
  }

  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return {
      ok: false,
      message: `“${name}” contains JSON, but not an export: an export is one JSON object with a formatVersion in it.`,
    };
  }

  const version = (value as { formatVersion?: unknown }).formatVersion;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    return {
      ok: false,
      message: `“${name}” has no formatVersion, so it was not written by this platform.`,
    };
  }

  return { ok: true, value };
}

/**
 * Ask the platform what the file would do, or do it.
 *
 * `apply: false` is the dry run and is the default all the way down — the
 * function in the database defaults to a dry run too, so a client that forgets
 * to pass the flag previews instead of writing.
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

  if (error) return { ok: false, message: error.message };

  const report = normaliseReport(data);
  if (!report) {
    return {
      ok: false,
      message: 'The platform did not answer with a report, so nothing should be assumed to have changed.',
    };
  }

  return { ok: true, report };
}

// A count is a non-negative whole number. Anything else — a string, a negative,
// a fraction — reads as nothing, because the alternative is a headline that
// promises a restore of minus two notes.
const number = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;

const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

function skips(value: unknown): RestoreSkip[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .map((item) => ({
      lesson: typeof item.lesson === 'string' ? item.lesson : undefined,
      field: typeof item.field === 'string' ? item.field : undefined,
      reason: typeof item.reason === 'string' ? item.reason : 'no reason was given',
    }));
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
 */
export function normaliseReport(data: unknown): RestoreReport | null {
  if (!data || typeof data !== 'object') return null;
  const raw = data as Record<string, unknown>;
  if (typeof raw.applied !== 'boolean') return null;

  const account = (raw.account ?? {}) as Record<string, unknown>;
  const notRestored = Array.isArray(raw.notRestored) ? raw.notRestored : [];

  return {
    applied: raw.applied,
    formatVersion: number(raw.formatVersion),
    account: { changed: strings(account.changed), skipped: skips(account.skipped) },
    notes: section(raw.notes),
    bookmarks: section(raw.bookmarks),
    notRestored: notRestored
      .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
      .map((item) => ({
        what: typeof item.what === 'string' ? item.what : 'Something',
        why: typeof item.why === 'string' ? item.why : '',
      })),
  };
}

/** What the database calls a column, in the words a person uses for it. */
export const ACCOUNT_FIELD_LABELS: Record<string, string> = {
  displayName: 'display name',
  preferredLanguage: 'language',
  timezone: 'time zone',
  countryCode: 'country',
};

function mib(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
}

function count(amount: number, one: string, many: string): string {
  return `${amount} ${amount === 1 ? one : many}`;
}

function list(parts: string[]): string {
  if (parts.length <= 1) return parts.join('');
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

/**
 * The sentence at the top of the result.
 *
 * Written in the past tense for a restore that happened and the conditional for
 * one that did not, because the difference between "two notes came back" and
 * "two notes would come back" is the whole reason the dry run exists.
 */
export function restoreHeadline(report: RestoreReport): string {
  const parts: string[] = [];
  if (report.notes.restored > 0) parts.push(count(report.notes.restored, 'note', 'notes'));
  if (report.bookmarks.restored > 0) parts.push(count(report.bookmarks.restored, 'bookmark', 'bookmarks'));
  if (report.account.changed.length > 0) {
    parts.push(
      report.account.changed.length === 1
        ? 'your profile'
        : 'your profile details',
    );
  }

  const existing = report.notes.alreadyThere + report.bookmarks.alreadyThere;
  const skipped = report.notes.skipped.length + report.bookmarks.skipped.length + report.account.skipped.length;

  if (parts.length === 0) {
    if (existing > 0) {
      return report.applied
        ? 'Everything in this file was already here, so nothing was changed.'
        : 'Everything in this file is already here. Running it would change nothing.';
    }
    return report.applied
      ? 'Nothing in this file could be put back as things stand.'
      : 'Nothing in this file can be put back as things stand.';
  }

  const verb = report.applied ? 'came back' : 'would come back';
  const tail = skipped > 0 ? ` ${count(skipped, 'entry needs', 'entries need')} attention — the reasons are below.` : '';
  return `${capitalise(list(parts))} ${verb}.${tail}`;
}

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** The account line, or null when nothing about the account changed. */
export function accountSentence(report: RestoreReport): string | null {
  const names = report.account.changed.map((field) => ACCOUNT_FIELD_LABELS[field] ?? field);
  if (names.length === 0) return null;
  return `${report.applied ? 'Updated' : 'Would update'} your ${list(names)}.`;
}

/** One line per skipped entry, ready to render. */
export function skipLines(report: RestoreReport): Array<{ where: string; reason: string }> {
  const lines: Array<{ where: string; reason: string }> = [];
  for (const skip of report.account.skipped) {
    lines.push({ where: ACCOUNT_FIELD_LABELS[skip.field ?? ''] ?? skip.field ?? 'Profile', reason: skip.reason });
  }
  for (const skip of [...report.notes.skipped, ...report.bookmarks.skipped]) {
    lines.push({ where: skip.lesson && skip.lesson !== '—' ? skip.lesson : 'A saved entry', reason: skip.reason });
  }
  return lines;
}
