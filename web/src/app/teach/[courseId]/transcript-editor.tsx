'use client';

import { useId, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export function TranscriptEditor({ lessonId, lessonTitle, initial, editable }: {
  lessonId: string; lessonTitle: string; initial: string; editable: boolean;
}) {
  const [body, setBody] = useState(initial);
  const [message, setMessage] = useState('');
  const [pending, startTransition] = useTransition();
  const id = useId();
  const router = useRouter();

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setMessage('Saving…');
    try {
      const response = await fetch('/api/teach', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'save_transcript', lessonId, transcript: body }),
      });
      const data = await response.json() as { ok?: boolean; message?: string };
      if (!response.ok || !data.ok) {
        setMessage(data.message ?? 'Could not save the transcript.');
        return;
      }
      setMessage(body.trim() ? 'Transcript saved.' : 'Transcript removed.');
      startTransition(() => router.refresh());
    } catch {
      setMessage('Could not save the transcript. Check your connection and try again.');
    }
  }

  if (!editable && !initial) return null;
  return (
    <details style={{ width: '100%', marginBlock: '0.5rem' }}>
      <summary>{initial ? 'Lesson transcript' : 'Add optional transcript'}</summary>
      {editable ? (
        <form onSubmit={save}>
          <label htmlFor={id}>Transcript for {lessonTitle}</label>
          <p className="muted">Paste reviewed text you have permission to use. Leave blank to remove it. It is available to entitled learners, not public previews.</p>
          <textarea id={id} aria-label={`Transcript for ${lessonTitle}`} value={body} maxLength={100000} rows={8}
            onChange={(event) => setBody(event.target.value)} />
          <button className="btn secondary" type="submit" disabled={pending}>Save transcript</button>
          {message && <p role="status">{message}</p>}
        </form>
      ) : <p style={{ whiteSpace: 'pre-wrap' }} dir="auto">{initial}</p>}
    </details>
  );
}
