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

export type RetentionResult = { ok: true } | { ok: false; message: string };

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

export function parseHoldCount(data: unknown): HoldCount {
  const r = row(data);
  const n = (value: unknown) => (Number.isFinite(Number(value)) ? Number(value) : 0);
  return { held: n(r.held), holdingNothing: n(r.holdingNothing) };
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

/** The sentence above the holds list. */
export const HOLDS_NOTE =
  'A hold stops the deletion clock and needs a written reason, because the only '
  + 'reason to keep a child’s file past its date is one somebody can read later. '
  + 'Releasing one puts a fresh thirty days on the clock rather than deleting at once.';

/** The sentence above the storage queue. */
export const PURGE_NOTE =
  'These files are already unwatchable — the row is tombstoned and nobody, staff '
  + 'included, can open one. What is left is the object in the bucket, which this '
  + 'database cannot delete: the key is printed so a person can. Recording a deletion '
  + 'that has not happened is refused, and that refusal is the point.';

/** One line per held file, in the register. */
export function holdSentence(row: HoldRow): string {
  if (!row.stillReadable) {
    return 'The file it names has already gone, so this hold is holding nothing. Release it and the register stops claiming otherwise.';
  }
  return row.dueOn
    ? `Readable, and off the clock until this is released. It was due on ${row.dueOn}.`
    : 'Readable. It had not reached its date when the hold was placed.';
}

export function holdMeta(row: HoldRow): string {
  return `Held by ${row.openedByName}, ${row.openedAt.slice(0, 10)}`;
}

export function storageSentence(row: StorageRow): string {
  const due = row.purgeDueAt ? row.purgeDueAt.slice(0, 10) : 'no date recorded';
  return `Tombstoned ${row.tombstonedAt?.slice(0, 10) ?? 'at some point'}; bytes due ${due}.`;
}

/** What the form is doing, said before the round trip rather than after it. */
export function actionConfirmation(action: RetentionAction, name: string): string {
  if (action === 'hold') {
    return `${name} is held from deletion. The clock stops until somebody releases it.`;
  }
  if (action === 'release') {
    return `${name} is back on the clock: thirty days from today.`;
  }
  return `Recorded that the object for ${name} was deleted from storage.`;
}

export function describeRetentionError(message: string): string {
  if (/already held/.test(message)) {
    return 'That file is already held. Two holds on one file would be two reasons for one decision.';
  }
  if (/written reason/.test(message)) {
    return 'A hold needs a written reason — the next person to read it is the person deciding whether to release it.';
  }
  if (/still readable/.test(message)) {
    return 'Nothing has been deleted for this file yet, so there is no deletion to record.';
  }
  if (/not_allowed|insufficient/i.test(message)) {
    return 'Holding and releasing a file belongs to governance staff and the owner, and deleting the object to the owner.';
  }
  if (/no_data_found|does not exist/.test(message)) {
    return 'That file is no longer in the register. Reload the page.';
  }
  return 'That did not go through. Reload the page and try again — nothing was changed.';
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
    if (res.ok && json.ok) return { ok: true };
    return { ok: false, message: describeRetentionError(String(json.error ?? '')) };
  } catch {
    return {
      ok: false,
      message: 'The request did not reach the server. Nothing was changed.',
    };
  }
}
