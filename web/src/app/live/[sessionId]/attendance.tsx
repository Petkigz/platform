'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

/** Marks a learner gone. The minutes are computed by the database, not here. */
export function MarkLeft({
  sessionId,
  learnerProfileId,
  name,
}: {
  sessionId: string;
  learnerProfileId: string;
  name: string;
}) {
  const supabase = createClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function mark() {
    setBusy(true);
    setError(null);
    const { error: rpcError } = await supabase.rpc('record_live_attendance', {
      p_session_id: sessionId,
      p_learner_profile_id: learnerProfileId,
      p_left: true,
    });
    if (rpcError) {
      setError(rpcError.message);
      setBusy(false);
      return;
    }
    setDone(true);
    setBusy(false);
  }

  if (done) return <span className="badge neutral">Left</span>;

  return (
    <span>
      <button
        type="button"
        className="btn ghost tiny"
        onClick={mark}
        disabled={busy}
        title={`Mark ${name} as gone`}
      >
        {busy ? '…' : 'Mark left'}
      </button>
      {error && <span className="muted"> {error}</span>}
    </span>
  );
}
