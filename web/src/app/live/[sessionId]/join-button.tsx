'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { joinLiveSession } from '@/lib/live';

/**
 * The door.
 *
 * A full navigation rather than a new tab, because the room is where the class
 * is and leaving it should not leave a dashboard open behind it. The refusal is
 * shown in the database's own words — "live rooms are not connected yet" is a
 * true sentence and a generic error is not.
 */
export function JoinButton({
  sessionId,
  learnerProfileId,
  label = 'Enter the room',
}: {
  sessionId: string;
  learnerProfileId: string;
  label?: string;
}) {
  const supabase = createClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function join() {
    setBusy(true);
    setError(null);
    const result = await joinLiveSession(supabase, sessionId, learnerProfileId);
    if (!result.joined) {
      setError(result.message ?? 'This room is not open.');
      setBusy(false);
      return;
    }
    window.location.assign(result.roomUrl);
  }

  return (
    <div className="stack">
      {error && <p className="notice warn">{error}</p>}
      <button
        type="button"
        className="btn"
        style={{ width: 'auto' }}
        onClick={join}
        disabled={busy}
      >
        {busy ? 'Opening…' : label}
      </button>
    </div>
  );
}
