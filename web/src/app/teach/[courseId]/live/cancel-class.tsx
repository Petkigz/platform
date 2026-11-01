'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  cancelLiveSession,
  describeAudience,
  liveSessionAudience,
  type LiveAudience,
} from '@/lib/live';

/**
 * Cancelling a class, which is also the act of telling the people coming to it.
 *
 * Two steps, because the second one cannot be undone and because it is the only
 * place in the product that sends a message to a whole course at once. The first
 * step asks the database who would be told and prints the number; the second
 * asks for the reason learners will read. A teacher who opens this and finds out
 * it reaches forty people can close it again without having done anything.
 *
 * The receipt is not held in client state. After the cancellation the page is
 * replaced with the same screen plus a line saying how many people were told, so
 * the number survives a refresh and describes what happened rather than what
 * this component remembers happening.
 */
export function CancelClass({ courseId, sessionId }: { courseId: string; sessionId: string }) {
  const router = useRouter();
  const supabase = createClient();

  const [open, setOpen] = useState(false);
  const [audience, setAudience] = useState<LiveAudience | null>(null);
  const [reading, setReading] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openForm() {
    setOpen(true);
    setError(null);
    setReading(true);
    const read = await liveSessionAudience(supabase, sessionId);
    setReading(false);
    if (!read.ok) {
      setError(read.message);
      return;
    }
    setAudience(read.audience);
  }

  function close() {
    setOpen(false);
    setReason('');
    setError(null);
  }

  async function confirm() {
    if (!audience || !audience.cancellable) return;
    setBusy(true);
    setError(null);

    const done = await cancelLiveSession(supabase, sessionId, reason);
    setBusy(false);
    if (!done.ok) {
      setError(done.message);
      return;
    }

    const { notified, people, capped } = done.receipt;
    const query = new URLSearchParams({
      cancelled: sessionId,
      notified: String(notified),
      people: String(people),
    });
    if (capped) query.set('capped', '1');
    router.replace(`/teach/${courseId}/live?${query.toString()}`);
  }

  if (!open) {
    return (
      <button
        type="button"
        className="btn ghost tiny"
        onClick={openForm}
        aria-label="Cancel this class"
      >
        Cancel
      </button>
    );
  }

  return (
    <div style={{ flexBasis: '100%', marginTop: '0.5rem' }}>
      <div className="stack">
        {reading && <p className="muted" style={{ margin: 0 }}>Checking who is coming…</p>}

        {audience && <p className="notice warn" style={{ margin: 0 }}>{describeAudience(audience)}</p>}

        {audience?.cancellable !== false && (
          <label>
            Why is it cancelled? Learners will see this.
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="I am unwell and will reschedule for Thursday"
              maxLength={2000}
            />
          </label>
        )}

        {error && <p className="notice error" style={{ margin: 0 }}>{error}</p>}

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {audience?.cancellable === false ? (
            <button type="button" className="btn ghost tiny" onClick={close}>
              Close
            </button>
          ) : (
            <>
              <button
                type="button"
                className="btn tiny"
                onClick={confirm}
                disabled={busy || reading || !audience || !reason.trim()}
              >
                {busy
                  ? 'Cancelling…'
                  : audience && audience.people > 0
                    ? 'Cancel the class and tell them'
                    : 'Cancel the class'}
              </button>
              <button type="button" className="btn ghost tiny" onClick={close} disabled={busy}>
                Keep the class
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
