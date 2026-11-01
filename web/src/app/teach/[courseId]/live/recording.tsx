'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  attachLiveRecording,
  describeRecordingAttach,
  recordingLinkProblem,
  removeLiveRecording,
} from '@/lib/live';

/**
 * The recording of a class that has already happened.
 *
 * The teacher made it somewhere else — a phone, a laptop, the school's Zoom —
 * and this is where its address comes back to. The platform does not host the
 * video and does not pretend to: it holds the link, decides who may follow it,
 * and says on the record that a copy exists.
 *
 * Two things are deliberate about the form. **Announcing is a checkbox that
 * starts unticked**, because a person attaching a link to a class that ended
 * last term should not message forty households by forgetting something. And
 * **removing needs a reason**, because the next person to ask why a class has
 * lost its recording is answered by it.
 */
export function RecordingForm({
  sessionId,
  hasRecording,
}: {
  sessionId: string;
  hasRecording: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<'closed' | 'attach' | 'remove'>('closed');
  const [url, setUrl] = useState('');
  const [announce, setAnnounce] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  function close() {
    setMode('closed');
    setUrl('');
    setReason('');
    setAnnounce(false);
    setError(null);
  }

  async function submitAttach() {
    const problem = recordingLinkProblem(url);
    if (problem) {
      setError(problem);
      return;
    }

    setBusy(true);
    setError(null);
    const result = await attachLiveRecording(supabase, sessionId, url, announce);
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }

    setDone(describeRecordingAttach(result.receipt));
    close();
    router.refresh();
  }

  async function submitRemove() {
    setBusy(true);
    setError(null);
    const result = await removeLiveRecording(supabase, sessionId, reason);
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }

    setDone('Recording removed. The class stays, and so does the record that one existed.');
    close();
    router.refresh();
  }

  if (done) {
    return (
      <p className="muted" role="status" style={{ flexBasis: '100%', margin: '0.5rem 0 0' }}>
        {done}
      </p>
    );
  }

  if (mode === 'closed') {
    return (
      <span style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          className="btn ghost tiny"
          onClick={() => { setMode('attach'); setError(null); }}
          aria-label={hasRecording ? 'Replace this class recording' : 'Attach a recording to this class'}
        >
          {hasRecording ? 'Replace recording' : 'Add recording'}
        </button>
        {hasRecording && (
          <button
            type="button"
            className="btn ghost tiny"
            onClick={() => { setMode('remove'); setError(null); }}
            aria-label="Remove this class recording"
          >
            Remove
          </button>
        )}
      </span>
    );
  }

  if (mode === 'remove') {
    return (
      <div style={{ flexBasis: '100%', marginTop: '0.5rem' }}>
        <div className="stack">
          <p className="notice warn" style={{ margin: 0 }}>
            Taking the recording down stops everybody watching it — learners included —
            and keeps the fact that it existed. The class is not affected.
          </p>
          <label>
            Why is it coming down?
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="The wrong class was uploaded"
              maxLength={2000}
            />
          </label>
          {error && <p className="notice error" style={{ margin: 0 }}>{error}</p>}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn tiny"
              onClick={submitRemove}
              disabled={busy || reason.trim().length < 3}
            >
              {busy ? 'Removing…' : 'Remove the recording'}
            </button>
            <button type="button" className="btn ghost tiny" onClick={close} disabled={busy}>
              Keep it
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ flexBasis: '100%', marginTop: '0.5rem' }}>
      <div className="stack">
        <label>
          Where is the recording?
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://…"
            inputMode="url"
            maxLength={2048}
          />
        </label>
        <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
          An https address. Only you and the people entitled to the course can follow it; the
          link is kept by the platform and handed out one person at a time, so it never appears
          on the page itself. If it is a Zoom or Drive link, remember that anybody who copies
          the address can open it — the platform can only control who is given it.
        </p>
        <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input
            type="checkbox"
            checked={announce}
            onChange={(e) => setAnnounce(e.target.checked)}
            style={{ width: 'auto' }}
          />
          Tell the class it is ready (once per class; nobody is told twice)
        </label>
        {error && <p className="notice error" style={{ margin: 0 }}>{error}</p>}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn tiny"
            onClick={submitAttach}
            disabled={busy || url.trim() === ''}
          >
            {busy ? 'Saving…' : hasRecording ? 'Replace it' : 'Attach it'}
          </button>
          <button type="button" className="btn ghost tiny" onClick={close} disabled={busy}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
