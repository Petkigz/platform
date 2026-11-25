'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { joinLiveSession } from '@/lib/live';
import { doorRefusal, type DoorWords } from '@/lib/live-door';
import { track } from '@/lib/analytics';

/**
 * The door.
 *
 * A full navigation rather than a new tab, because the room is where the class
 * is and leaving it should not leave a dashboard open behind it. The refusal is
 * said by the reason the database names — "live rooms are not connected yet" is
 * a true sentence and a generic error is not — in the reader's language: the
 * words are handed in by the page (`DoorWords`), and the database's English
 * sentence is not printed. No answer at all is "could not be opened just now",
 * which is not a claim about the room.
 */
export function JoinButton({
  sessionId,
  learnerProfileId,
  words,
}: {
  sessionId: string;
  learnerProfileId: string;
  words: DoorWords;
}) {
  const supabase = createClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function join() {
    setBusy(true);
    setError(null);
    const result = await joinLiveSession(supabase, sessionId, learnerProfileId).catch(() => null);
    if (!result || !result.joined) {
      setError(doorRefusal(words, result?.reason));
      setBusy(false);
      return;
    }
    // An entered class, recorded for the learner whose seat it was — the child
    // when a parent opened the door.
    void track({ code: 'live.joined', subjectId: sessionId, learnerProfileId });
    window.location.assign(result.roomUrl);
  }

  return (
    <div className="stack">
      {error && (
        <p className="notice warn" role="alert">
          {error}
        </p>
      )}
      <button
        type="button"
        className="btn"
        style={{ width: 'auto' }}
        onClick={join}
        disabled={busy}
      >
        {busy ? words.opening : words.enter}
      </button>
    </div>
  );
}
