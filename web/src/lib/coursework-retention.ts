/**
 * The other half of the coursework clock: the holds, and the bucket.
 *
 * The retention clock gave a handed-in file an end date and exactly one way to
 * stop it — a written hold. It shipped the writer (`hold_coursework_file`), the
 * refusal (`release_coursework_hold`), and a storage queue with a key a person can
 * act on (`coursework_bytes_awaiting`). What it did not ship was a way to *see*
 * either one, and the permission split made that visible: holds are governance
 * work or the owner's, the plan is the owner's alone. A governance admin could
 * place a hold and never read it back.
 *
 * Two rules the copy follows, because both are places where a screen can mislead:
 *
 * 1. **A hold is not an archive.** It suspends a deletion that has a reason and a
 *    date. A hold on a file that is already gone is holding nothing, and the row
 *    says so rather than looking like care.
 * 2. **A tombstone is not a deletion.** This database makes a file unwatchable and
 *    queues the bytes; it cannot reach the bucket. A queue that reported "done"
 *    when the row was marked would be the exact failure it exists to prevent.
 */

export type HoldRow = {
  assetId: string;
  displayName: string;
  masterBucket: string;
  masterKey: string;
  reason: string;
  openedByName: string;
  openedAt: string;
  stillReadable: boolean;
  dueOn: string | null;
};

export type HoldCount = { held: number; holdingNothing: number };

export type StorageRow = {
  assetId: string;
  bucket: string;
  key: string;
  displayName: string;
  tombstonedAt: string | null;
  purgeDueAt: string | null;
};

export type RetentionAction = 'hold' | 'release' | 'purge';

export type RetentionResult = { ok: true } | { ok: false; message: string; uncertain?: boolean };

const row = (raw: unknown): Record<string, unknown> =>
  (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;

const text = (value: unknown): string =>
  typeof value === 'string' ? value : value == null ? '' : String(value);

const orNull = (value: unknown): string | null =>
  typeof value === 'string' && value.length > 0 ? value : null;

/** The holds the database returns, or an empty list rather than a crash. */
export function parseHolds(data: unknown): HoldRow[] {
  if (!Array.isArray(data)) return [];
  return data.map((raw) => {
    const r = row(raw);
    return {
      assetId: text(r.asset_id),
      displayName: text(r.display_name) || 'a file with no name',
      masterBucket: text(r.master_bucket),
      masterKey: text(r.master_key),
      reason: text(r.reason),
      openedByName: text(r.opened_by_name) || 'an account that has since closed',
      openedAt: text(r.opened_at),
      stillReadable: r.still_readable === true,
      dueOn: orNull(r.due_on),
    };
  });
}

export function parseHoldPage(data: unknown): HoldRow[] | null {
  if (!Array.isArray(data)) return null;
  for (const item of data) {
    if (!item || typeof item !== 'object') return null;
    const r = item as Record<string, unknown>;
    if (typeof r.asset_id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(r.asset_id) ||
        typeof r.display_name !== 'string' || typeof r.master_bucket !== 'string' || typeof r.master_key !== 'string' ||
        typeof r.reason !== 'string' || typeof r.opened_by_name !== 'string' || typeof r.opened_at !== 'string' ||
        !Number.isFinite(Date.parse(r.opened_at)) || typeof r.still_readable !== 'boolean' ||
        !(r.due_on === null || (typeof r.due_on === 'string' && Number.isFinite(Date.parse(r.due_on))))) return null;
  }
  return parseHolds(data);
}

export function parseHoldCount(data: unknown): HoldCount {
  const r = row(data);
  const n = (value: unknown) => (Number.isFinite(Number(value)) ? Number(value) : 0);
  return { held: n(r.held), holdingNothing: n(r.holdingNothing) };
}

/** A missing or contradictory summary is unknown, not zero. */
export function parseHoldCountStrict(data: unknown): HoldCount | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const r = data as Record<string, unknown>;
  if (typeof r.held !== 'number' || !Number.isSafeInteger(r.held) || r.held < 0 ||
      typeof r.holdingNothing !== 'number' || !Number.isSafeInteger(r.holdingNothing) ||
      r.holdingNothing < 0 || r.holdingNothing > r.held) return null;
  return { held: r.held, holdingNothing: r.holdingNothing };
}

export function parseStorageQueue(data: unknown): StorageRow[] {
  if (!Array.isArray(data)) return [];
  return data.map((raw) => {
    const r = row(raw);
    return {
      assetId: text(r.asset_id),
      bucket: text(r.master_bucket),
      key: text(r.master_key),
      displayName: text(r.display_name) || text(r.master_key),
      tombstonedAt: orNull(r.tombstoned_at),
      purgeDueAt: orNull(r.purge_due_at),
    };
  });
}

export type StoragePageRow = StorageRow & { sortAt: string; held: boolean; storageReviewNeeded: boolean; backend: string };
export function parseStoragePage(data: unknown): StoragePageRow[] | null {
  if (!Array.isArray(data)) return null;
  const result: StoragePageRow[] = [];
  for (const item of data) {
    if (!item || typeof item !== 'object') return null;
    const r = item as Record<string, unknown>;
    if (typeof r.asset_id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(r.asset_id) ||
        typeof r.master_bucket !== 'string' || typeof r.master_key !== 'string' || typeof r.display_name !== 'string' ||
        typeof r.tombstoned_at !== 'string' || !Number.isFinite(Date.parse(r.tombstoned_at)) ||
        typeof r.sort_at !== 'string' || !Number.isFinite(Date.parse(r.sort_at)) || typeof r.held !== 'boolean' || typeof r.storage_review_needed !== 'boolean' ||
        typeof r.storage_backend !== 'string' || !['r2', 's3', 'supabase', 'local'].includes(r.storage_backend) ||
        !(r.purge_due_at === null || (typeof r.purge_due_at === 'string' && Number.isFinite(Date.parse(r.purge_due_at))))) return null;
    result.push({ assetId:r.asset_id, bucket:r.master_bucket, key:r.master_key, displayName:r.display_name,
      tombstonedAt:r.tombstoned_at, purgeDueAt:r.purge_due_at, sortAt:r.sort_at, held:r.held, storageReviewNeeded:r.storage_review_needed, backend:r.storage_backend });
  }
  return result;
}

/** The sentence above the holds list. */
export const HOLDS_NOTE =
  'A hold needs a written reason. Scheduled cleanup locks and rechecks the hold, '
  + 'but other deletion paths still need review, so it is not a preservation guarantee. '
  + 'After release, a readable file returns to its original schedule and may be due immediately. '
  + 'For a tombstoned file, release restores a known byte deadline, which may already have passed. '
  + 'If no earlier deadline was captured, the system sets one thirty days after release; review older or unclear cases individually.';

/** The database cannot verify a manual storage deletion. */
export const PURGE_NOTE =
  'These files are tombstoned and cannot be opened through the platform. Their '
  + 'objects may still be in storage. Delete an object independently before recording '
  + 'your statement here. The database cannot delete or verify the object; it refuses '
  + 'a statement for a readable or held file. Do not delete held objects or objects not yet due; review missing dates individually. '
  + 'Hold and storage-key status can change: check again before deletion. This screen cannot prevent changes or deletion in storage.';

/** A queue entry is not necessarily due. This is display guidance, not a lock. */
export function storageDeadlineStatus(row: Pick<StorageRow, 'purgeDueAt'>, now: number): 'unknown' | 'future' | 'due' {
  if (!row.purgeDueAt || !Number.isFinite(now)) return 'unknown';
  const deadline = Date.parse(row.purgeDueAt);
  if (!Number.isFinite(deadline)) return 'unknown';
  // JavaScript truncates PostgreSQL's fractional microseconds. Err on the side
  // of waiting through the entire millisecond at the boundary.
  return deadline >= now ? 'future' : 'due';
}

/** One line per held file, in the register. */
export function holdSentence(row: HoldRow): string {
  if (!row.stillReadable) {
    return 'The file is no longer readable. The hold may still protect its stored bytes; check the case before releasing it.';
  }
  return row.dueOn
    ? `Readable with a hold recorded. It was due on ${row.dueOn}; other deletion paths still need review.`
    : 'Readable with a hold recorded. It had not reached its date when the hold was placed.';
}

export function holdMeta(row: HoldRow): string {
  return `Held by ${row.openedByName}, ${row.openedAt.slice(0, 10)}`;
}

export function storageSentence(row: StorageRow): string {
  const due = row.purgeDueAt && Number.isFinite(Date.parse(row.purgeDueAt))
    ? row.purgeDueAt : 'no valid date recorded';
  return `Tombstoned ${row.tombstonedAt?.slice(0, 10) ?? 'at some point'}; bytes due ${due}.`;
}

/** What the form is doing, said before the round trip rather than after it. */
export function actionConfirmation(action: RetentionAction, name: string): string {
  if (action === 'hold') {
    return `A hold was recorded for ${name}. Other deletion paths still need review; it is not a preservation guarantee.`;
  }
  if (action === 'release') {
    return `The hold on ${name} was released. Check its retention schedule; it may already be due.`;
  }
  return `Your statement that ${name} was deleted from storage was recorded. The platform did not verify the deletion.`;
}

export function describeRetentionError(message: string): string {
  if (/already held/.test(message)) {
    return 'That file is already held. Two holds on one file would be two reasons for one decision.';
  }
  if (/written reason/.test(message)) {
    return 'A hold needs a written reason — the next person to read it is the person deciding whether to release it.';
  }
  if (/held file/.test(message)) {
    return 'A held file cannot be recorded as deleted. Review the hold first.';
  }
  if (/storage location or its extra objects need individual review/i.test(message)) {
    return 'This storage location or its extra objects need individual review. Do not delete it as routine cleanup; if it was already deleted, report the incident.';
  }
  if (/already recorded/.test(message)) {
    return 'A deletion statement was already recorded for this file.';
  }
  if (/still readable/.test(message)) {
    return 'The file is still readable in the platform; a deletion statement cannot be recorded yet.';
  }
  if (/not_allowed|insufficient/i.test(message)) {
    return 'Only the configured safeguarding owner can manage these records.';
  }
  if (/no_data_found|does not exist/.test(message)) {
    return 'That file is no longer in the register. Reload the page.';
  }
  return 'The result could not be confirmed. Refresh and check the register before trying again.';
}

/** Post one action. The actor comes from the session; nothing here names a person. */
export async function postRetentionAction(input: {
  action: RetentionAction;
  assetId: string;
  reason?: string;
}): Promise<RetentionResult> {
  try {
    const res = await fetch('/api/admin/coursework/retention', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    });
    const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    if (res.ok && json.ok === true) return { ok: true };
    if (res.status >= 500 || res.ok || typeof json.error !== 'string') {
      return { ok: false, uncertain: true, message: 'The result could not be confirmed. Refresh and check the register before trying again.' };
    }
    const message = describeRetentionError(json.error);
    return { ok: false, message, uncertain: message.startsWith('The result could not be confirmed') };
  } catch {
    return {
      ok: false,
      uncertain: true,
      message: 'The connection was interrupted. The action may have been recorded; refresh and check the register before trying again.',
    };
  }
}

/** Missing is unknown, not zero: an older schema cannot report this risk. */
export function missingClassEndCount(data: unknown): number | null {
  const value = row(row(data).files).missingClassEnd;
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

export type MissingClassEnd = {
  cohortId: string; cohortTitle: string; courseTitle: string; files: number;
  status: string; startsAt: string; joinClosesAt: string;
};
export function parseMissingClassEnds(data: unknown): MissingClassEnd[] | null {
  if (!Array.isArray(data)) return null;
  const out: MissingClassEnd[] = [];
  for (const value of data) {
    const r = row(value);
    const files = typeof r.files === 'number' ? r.files : typeof r.files === 'string' && /^\d+$/.test(r.files) ? Number(r.files) : NaN;
    if (typeof r.cohort_id !== 'string' || typeof r.cohort_title !== 'string' ||
        typeof r.course_title !== 'string' || typeof r.cohort_status !== 'string' ||
        typeof r.starts_at !== 'string' || typeof r.join_closes_at !== 'string' ||
        !Number.isFinite(Date.parse(r.starts_at)) || !Number.isFinite(Date.parse(r.join_closes_at)) ||
        !Number.isSafeInteger(files) || files < 1) return null;
    out.push({ cohortId: r.cohort_id, cohortTitle: r.cohort_title, courseTitle: r.course_title, files,
      status: r.cohort_status, startsAt: r.starts_at, joinClosesAt: r.join_closes_at });
  }
  return out;
}
