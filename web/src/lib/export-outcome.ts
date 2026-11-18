/**
 * What asking for a copy of your data was answered with, as names.
 *
 * `/api/account/export` used to answer a refusal with whatever sentence
 * `export_my_data()` raised, as JSON, and the two downloads were plain links:
 * the eleventh press in an hour replaced the page with
 * `{"error":"ten exports in the last hour is the limit; …"}`. The print page
 * threw the same sentence and landed on the page for a page that broke.
 *
 * So the route names the reason, the buttons ask for the file themselves and
 * say the reason in the reader's language, and the print page says it in
 * place of the tables.
 *
 * Asking again is harmless here in a way it is not for an order or a closure:
 * a copy that was made and lost on the way costs one of ten an hour and one
 * line in the audit trail. So there is no "could not confirm" for this, only
 * `failed`, and its sentence says to ask again.
 *
 * Kept apart from `account.ts` so a browser can import it without the queries.
 */

/**
 * The longest a top-level list in the copy can be.
 *
 * It is `v_cap` in `export_my_data()`; a test reads the migration so the two
 * cannot drift. The copy itself says which lists were cut (`meta.truncated`).
 */
export const EXPORT_ROW_LIMIT = 1000;

export type ExportCode = 'signed_out' | 'limit' | 'format' | 'failed';

/** The English the route sends beside each code, for a caller with no words of its own. */
export const EXPORT_SENTENCE: Record<ExportCode, string> = {
  signed_out: 'You are signed out. Sign in again to get a copy.',
  limit: 'Ten copies have been made in the last hour, which is the limit. Wait a little, then ask again.',
  format: 'A copy can be asked for as json or as csv.',
  failed: 'The copy could not be made just now. Ask again in a moment.',
};

const isExportCode = (value: unknown): value is ExportCode =>
  typeof value === 'string' && Object.hasOwn(EXPORT_SENTENCE, value);

/** The status the route answers a code with. Only `failed` is not a refusal. */
export function exportStatusOf(code: ExportCode): number {
  if (code === 'signed_out') return 401;
  if (code === 'limit') return 429;
  if (code === 'format') return 400;
  return 502;
}

/** A refusal as the route sends it. */
export function exportRefusal(code: ExportCode): { ok: false; code: ExportCode; message: string } {
  return { ok: false, code, message: EXPORT_SENTENCE[code] };
}

/** What a button says about a reply that was not the file. */
export function exportOutcomeOf(status: number, code: unknown): ExportCode {
  if (status < 400 || status > 499 || !isExportCode(code)) return 'failed';
  return code;
}

type DatabaseError = { code?: string | null; message?: string | null };

/**
 * `export_my_data()` raises two things, both under `insufficient_privilege`
 * (`20261281141000_export_eligible_learners_once.sql`). They are told apart by
 * their words, and a test reads those words out of the migration.
 */
export function exportCodeOf(error: DatabaseError): ExportCode {
  if ((error.code ?? '') !== '42501') return 'failed';
  const message = error.message ?? '';
  if (/exports in the last hour is the limit/iu.test(message)) return 'limit';
  if (/sign in to download your data/iu.test(message)) return 'signed_out';
  return 'failed';
}

/**
 * The lists the copy says were cut at the limit, by the names they have in it.
 *
 * Read defensively: the document is the database's, and a page that prints it
 * should not fall over on a shape it did not expect.
 */
export function exportListsCut(document: unknown): string[] {
  if (typeof document !== 'object' || document === null) return [];
  const meta = (document as Record<string, unknown>).meta;
  if (typeof meta !== 'object' || meta === null) return [];
  const cut = (meta as Record<string, unknown>).truncated;
  return Array.isArray(cut) ? cut.filter((name): name is string => typeof name === 'string') : [];
}
