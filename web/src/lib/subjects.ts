/**
 * The subject vocabulary, as a person edits it.
 *
 * `subject_areas` is what the catalogue filter, the subject badges and every
 * course card read. Until this screen existed the only way to add, rename or
 * retire one was SQL against production, which meant the platform owner could
 * not maintain the vocabulary of their own catalogue.
 *
 * The rules here are the ones a form can check before it asks the database, and
 * the ones the screen has to state plainly even when the database is the
 * authority:
 *
 *   * A **code** is an identifier, not a label. It is what migrations, subject
 *     tagging and any future import refer to, so it is lowercase, dot-separated
 *     and never changed to fix a typo in the display name. Renaming the display
 *     name is free; recoding is a different act.
 *   * A subject cannot be its own ancestor. The database refuses a cycle at any
 *     depth; the form must not offer a choice it knows will be refused.
 *   * Retirement is refused while anything live is filed under it, because a
 *     retired subject is hidden from readers and its badge would vanish from a
 *     course whose tags are frozen. That is a fact to show before the button is
 *     pressed, not an error to discover after.
 */

export type SubjectRow = {
  id: string;
  code: string;
  name: string;
  parentId: string | null;
  status: 'active' | 'retired';
  /** Course versions tagged with it, and of those, the ones that are live or in flight. */
  uses: number;
  liveUses: number;
};

/** The shape the database enforces, and the only shape a new code may take. */
export const SUBJECT_CODE_PATTERN = /^[a-z0-9][a-z0-9_.-]*$/;

export const SUBJECT_CODE_MAX = 64;
export const SUBJECT_NAME_MAX = 120;

export type SubjectInput = {
  code: string;
  name: string;
  parentId: string | null;
};

export type Validated =
  | { ok: true; value: SubjectInput }
  | { ok: false; message: string };

/** Codes are typed by people, so a typed capital is corrected rather than refused. */
export function normaliseCode(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, '-');
}

/**
 * What the form hands to the writer.
 *
 * A code that a person typed with capitals or spaces is fixed here rather than
 * refused: the constraint is about the identifier's shape, not about the typist.
 * A code that is wrong in a way fixing cannot help — empty, or starting with a
 * separator — is refused with the shape written out, because "invalid" tells the
 * reader nothing about what to type instead.
 */
export function validateSubject(raw: { code: unknown; name: unknown; parentId?: unknown }): Validated {
  const code = normaliseCode(typeof raw.code === 'string' ? raw.code : '');
  const name = (typeof raw.name === 'string' ? raw.name : '').trim();
  const parentId =
    typeof raw.parentId === 'string' && raw.parentId.trim() !== '' ? raw.parentId.trim() : null;

  if (name === '') {
    return { ok: false, message: 'A subject needs a name — that is what a learner sees on the badge.' };
  }
  if (name.length > SUBJECT_NAME_MAX) {
    return { ok: false, message: `Keep the name under ${SUBJECT_NAME_MAX} characters.` };
  }
  if (code === '') {
    return { ok: false, message: 'A subject needs a code, such as “quran” or “quran.tajweed”.' };
  }
  if (code.length > SUBJECT_CODE_MAX) {
    return { ok: false, message: `Keep the code under ${SUBJECT_CODE_MAX} characters.` };
  }
  if (!SUBJECT_CODE_PATTERN.test(code)) {
    return {
      ok: false,
      message: 'A code is lowercase letters, digits, dots, dashes and underscores, and starts with a letter or digit.',
    };
  }

  return { ok: true, value: { code, name, parentId } };
}

/**
 * The rows in the order a reader browses them: a parent followed by its
 * children, each level named once.
 *
 * Ordering by code would put `quran.tajweed` before `quran` among the children
 * of another subject, which reads as a bug. Sorting by name inside a level is
 * the catalogue's own ordering, and it is what the filter shows.
 */
export function orderSubjects<T extends { id: string; name: string; parentId: string | null }>(
  rows: T[],
): Array<T & { depth: number }> {
  const byParent = new Map<string | null, T[]>();
  const known = new Set(rows.map((row) => row.id));

  for (const row of rows) {
    // A row whose parent is missing from the set is shown at the top level
    // rather than dropped: a broken parent link must not hide a subject from
    // the screen that exists to fix it.
    const parent = row.parentId !== null && known.has(row.parentId) ? row.parentId : null;
    const bucket = byParent.get(parent);
    if (bucket) bucket.push(row);
    else byParent.set(parent, [row]);
  }

  const out: Array<T & { depth: number }> = [];
  const seen = new Set<string>();

  const walk = (parent: string | null, depth: number) => {
    const bucket = [...(byParent.get(parent) ?? [])].sort((a, b) =>
      a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }),
    );
    for (const row of bucket) {
      if (seen.has(row.id)) continue; // a cycle in the data must not hang the page
      seen.add(row.id);
      out.push({ ...row, depth });
      walk(row.id, depth + 1);
    }
  };

  walk(null, 0);

  // Anything still unvisited is inside a cycle. Show it at the top rather than
  // silently losing it — the screen is where a bad row gets noticed.
  for (const row of rows) {
    if (!seen.has(row.id)) out.push({ ...row, depth: 0 });
  }

  return out;
}

/** Every subject below this one, however deep. */
export function descendantIds(
  rows: Array<{ id: string; parentId: string | null }>,
  id: string,
): string[] {
  const children = new Map<string, string[]>();
  for (const row of rows) {
    if (row.parentId === null) continue;
    const bucket = children.get(row.parentId);
    if (bucket) bucket.push(row.id);
    else children.set(row.parentId, [row.id]);
  }

  const found: string[] = [];
  const stack = [...(children.get(id) ?? [])];
  const seen = new Set<string>();

  while (stack.length > 0) {
    const next = stack.pop()!;
    if (next === id || seen.has(next)) continue;
    seen.add(next);
    found.push(next);
    stack.push(...(children.get(next) ?? []));
  }

  return found;
}

/**
 * The parents that can be chosen for this subject.
 *
 * Never itself and never one of its own descendants: the database refuses the
 * cycle, and offering a choice whose only outcome is a refusal teaches the
 * reader that the form cannot be trusted.
 */
export function parentOptions(
  rows: SubjectRow[],
  editingId: string | null,
): Array<{ id: string; label: string }> {
  const blocked = editingId ? new Set([editingId, ...descendantIds(rows, editingId)]) : new Set<string>();

  return orderSubjects(rows.filter((row) => row.status === 'active' && !blocked.has(row.id))).map((row) => ({
    id: row.id,
    label: `${'— '.repeat(row.depth)}${row.name}`,
  }));
}

/**
 * Whether this subject may be retired, and what to say when it may not.
 *
 * The database is the authority — `guard_subject_retirement()` refuses the
 * update — but a refusal that arrives after the button is pressed is a worse
 * experience than a sentence and a disabled button, and the counts are already
 * on the screen.
 */
export function retirement(uses: { liveUses: number; totalUses: number }): {
  canRetire: boolean;
  reason: string;
} {
  if (uses.liveUses > 0) {
    return {
      canRetire: false,
      reason:
        `Filed under ${uses.liveUses} live or in-progress course ${uses.liveUses === 1 ? 'version' : 'versions'}. `
        + 'Retiring it would hide the subject from readers and blank those badges, and a published '
        + 'course’s tags cannot be changed.',
    };
  }
  if (uses.totalUses > 0) {
    return {
      canRetire: true,
      reason:
        `Only retired or rejected course ${uses.totalUses === 1 ? 'version uses' : 'versions use'} it. `
        + 'Those are already hidden from readers, so nothing loses a badge.',
    };
  }
  return { canRetire: true, reason: 'No course uses it.' };
}

/**
 * The one sentence at the top of the screen.
 *
 * It says what the vocabulary is for rather than what the page is, because the
 * person reading it may have arrived from the setup checklist without knowing
 * why a subject is not just a tag.
 */
export function vocabularyLede(active: number, total: number): string {
  const retired = total - active;
  const subjects = `${active} active subject ${active === 1 ? 'area' : 'areas'}`;
  if (retired <= 0) return `${subjects}. Every course is filed under at least one of them.`;
  return `${subjects}, and ${retired} retired ${retired === 1 ? 'subject' : 'subjects'}. A retired subject is hidden from readers, so it disappears from the filter and from the badges.`;
}
