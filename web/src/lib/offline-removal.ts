/**
 * Remove the server booking first; a lost response is not a confirmed removal.
 *
 * `reason` names which of the two things went wrong, for a screen that says
 * it in the reader's language; `message` is the English sentence, for a log.
 */
export async function removeSavedWithConfirmation(
  downloadId: string,
  removeBooking: () => PromiseLike<{ data: unknown; error: unknown }>,
  removeLocal: () => Promise<void>,
): Promise<{ ok: true } | { ok: false; reason: 'unconfirmed' | 'local'; message: string }> {
  let result: { data: unknown; error: unknown };
  try {
    result = await removeBooking();
  } catch {
    return { ok: false, reason: 'unconfirmed', message: 'The server removal could not be confirmed. Reconnect and retry; the local copy is still here.' };
  }
  const row = result.data && typeof result.data === 'object' && !Array.isArray(result.data)
    ? result.data as Record<string, unknown> : null;
  if (result.error || row?.removed !== true || row.downloadId !== downloadId) {
    return { ok: false, reason: 'unconfirmed', message: 'The server removal could not be confirmed. Reconnect and retry; the local copy is still here.' };
  }
  try {
    await removeLocal();
  } catch {
    return { ok: false, reason: 'local', message: 'The server recorded the removal, but this browser could not remove its local copy. Retry or remove it from this device.' };
  }
  return { ok: true };
}
