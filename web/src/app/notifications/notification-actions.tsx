'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { formatNumber } from '@/lib/i18n/format';
import type { LocaleCode } from '@/lib/i18n/locales';

/** The words this button says. A script sent to a browser holds no catalogue. */
export type MarkWords = {
  markAll: string;
  /** What was marked, ending in a colon; the count follows it. */
  marked: string;
  failed: string;
};

/**
 * One button, because the alternative is a checkbox per message nobody ticks.
 *
 * It names the messages it means: the ones this page showed as unread. The
 * route refuses a request that names none (see `markReadIdsOf`), so this can
 * never mark something the reader was not shown.
 *
 * Marking twice changes nothing the second time, so a press that got no
 * answer is said the same way as one that was refused: it did not happen as
 * far as this page knows, and pressing again is safe.
 *
 * The page keeps this in place when nothing is left unread, with no button,
 * so what it said about the press is still there after the list is redrawn.
 */
export function MarkAllRead({ ids, words, locale }: { ids: string[]; words: MarkWords; locale: LocaleCode }) {
  const router = useRouter();
  const [said, setSaid] = useState<{ kind: 'done'; count: number } | { kind: 'failed' } | null>(null);
  const [busy, setBusy] = useState(false);
  const [pending, startTransition] = useTransition();

  async function mark() {
    if (busy) return;
    setBusy(true);
    setSaid(null);
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      const result = (await response.json().catch(() => null)) as { ok?: unknown; marked?: unknown } | null;
      if (!response.ok || result?.ok !== true || typeof result.marked !== 'number') {
        setSaid({ kind: 'failed' });
        return;
      }
      setSaid({ kind: 'done', count: result.marked });
      startTransition(() => router.refresh());
    } catch {
      setSaid({ kind: 'failed' });
    } finally {
      setBusy(false);
    }
  }

  if (ids.length === 0 && said === null) return null;

  return (
    <div className="told-mark" data-mark-all>
      {ids.length > 0 && (
        <button className="btn secondary" type="button" onClick={() => void mark()} disabled={busy || pending}>
          {words.markAll}
        </button>
      )}
      {said?.kind === 'done' && (
        <p className="muted" role="status" data-marked={said.count}>
          {words.marked} <bdi>{formatNumber(locale, said.count)}</bdi>
        </p>
      )}
      {said?.kind === 'failed' && (
        <p className="notice error" role="alert" data-mark-failed>
          {words.failed}
        </p>
      )}
    </div>
  );
}
