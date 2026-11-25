'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RollWords } from '@/lib/live-door';

/**
 * Marks a learner gone. The minutes are computed by the database, not here.
 *
 * Its words are the page's, in the reader's language. When the database
 * refuses, the page says that it could not be saved; the database's own
 * sentence is English and is not printed.
 */
export function MarkLeft({
  sessionId,
  learnerProfileId,
  title,
  words,
}: {
  sessionId: string;
  learnerProfileId: string;
  /** "Mark Amina as gone", made by the page. */
  title: string;
  words: RollWords;
}) {
  const supabase = createClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [done, setDone] = useState(false);

  async function mark() {
    setBusy(true);
    setError(false);
    let failed = true;
    try {
      const { error: rpcError } = await supabase.rpc('record_live_attendance', {
        p_session_id: sessionId,
        p_learner_profile_id: learnerProfileId,
        p_left: true,
      });
      failed = Boolean(rpcError);
    } catch {
      // The request never got an answer.
    }
    if (failed) {
      setError(true);
      setBusy(false);
      return;
    }
    setDone(true);
    setBusy(false);
  }

  if (done) return <span className="badge neutral">{words.left}</span>;

  return (
    <span>
      <button
        type="button"
        className="btn ghost tiny"
        onClick={mark}
        disabled={busy}
        title={title}
      >
        {busy ? '…' : words.mark}
      </button>
      {error && (
        <span className="muted" role="alert">
          {' '}
          {words.failed}
        </span>
      )}
    </span>
  );
}
