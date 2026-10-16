'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { REPORT_CATEGORIES } from '@/lib/governance';

/**
 * Triage one report.
 *
 * Closing needs a written note, and the database says so too. That is not
 * bureaucracy: a queue of silently dismissed reports teaches readers that
 * reporting does nothing, which is worse than not having offered the button.
 */
export function ResolveForm({
  reportId,
  category,
}: {
  reportId: string;
  category: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<'triaged' | 'under_review' | 'resolved' | 'dismissed'>(
    'triaged',
  );
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const closing = status === 'resolved' || status === 'dismissed';
  const label = REPORT_CATEGORIES.find((c) => c.value === category)?.label ?? category;

  async function submit() {
    setMessage(null);
    setError(null);

    if (closing && notes.trim().length === 0) {
      setError('Closing a report needs a written note. The database requires one.');
      return;
    }

    const res = await fetch('/api/admin/reports', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ reportId, status, notes: notes || undefined }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };

    if (!res.ok) {
      setError(json.error ?? 'Could not update that report.');
      return;
    }

    setMessage('Updated.');
    setNotes('');
    startTransition(() => router.refresh());
  }

  return (
    <div className="card" style={{ display: 'grid', gap: '0.5rem' }}>
      <p className="eyebrow" style={{ margin: 0 }}>
        {label}
      </p>

      <div className="row" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
        {(
          [
            ['triaged', 'Acknowledged'],
            ['under_review', 'Under review'],
            ['resolved', 'Resolved'],
            ['dismissed', 'Dismissed'],
          ] as const
        ).map(([value, text]) => (
          <label key={value} className="row" style={{ gap: '0.35rem' }}>
            <input
              type="radio"
              name={`status-${reportId}`}
              checked={status === value}
              onChange={() => setStatus(value)}
            />
            {text}
          </label>
        ))}
      </div>

      <label className="eyebrow" htmlFor={`notes-${reportId}`}>
        Note{closing ? ' (required)' : ''}
      </label>
      <textarea
        id={`notes-${reportId}`}
        rows={2}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder={
          closing
            ? 'What did you find, and what happened as a result?'
            : 'Optional while it is still open'
        }
      />

      <div>
        <button
          type="button"
          className="btn"
          disabled={pending || (closing && notes.trim().length === 0)}
          onClick={submit}
        >
          {pending ? 'Saving…' : 'Update'}
        </button>
      </div>

      {message && <div className="notice info" role="status">{message}</div>}
      {error && <div className="notice error" role="alert">{error}</div>}
    </div>
  );
}
