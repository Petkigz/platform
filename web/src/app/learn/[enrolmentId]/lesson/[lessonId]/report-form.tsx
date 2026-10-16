'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { REPORT_CATEGORIES, type ReportCategory } from '@/lib/governance';

/**
 * Flag a problem with a lesson, or with one answer in its discussion.
 *
 * Collapsed by default and deliberately small. A prominent "REPORT" button on
 * every lesson would train people to use it for disagreements, and the queue is
 * read by a person. But hiding it entirely would remove the only channel the
 * people who actually notice a doctrinal error have — and on a platform that
 * teaches faith to children, that is the safeguard most worth keeping.
 *
 * `postId` is set when reporting a specific discussion post, which is what makes
 * "this answer is wrong" actionable rather than ambiguous between the lesson and
 * something someone said about it.
 */
export function ReportForm({
  lessonId,
  postId,
  label,
}: {
  lessonId: string;
  postId?: string;
  label?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<ReportCategory>('doctrinal_error');
  const [description, setDescription] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<'info' | 'error'>('info');

  async function submit() {
    setMessage(null);

    const res = await fetch('/api/reports', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        lessonId,
        category,
        description,
        discussionPostId: postId ?? undefined,
      }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };

    if (!res.ok) {
      setTone('error');
      setMessage(json.error ?? 'Could not send that report.');
      return;
    }

    setTone('info');
    setOpen(false);
    setDescription('');
    setMessage('Sent. A person will look at it.');
    startTransition(() => router.refresh());
  }

  if (message && !open) {
    return (
      <p
        className="muted"
        role="status"
        style={tone === 'error' ? { color: 'var(--red-600, #b3261e)' } : undefined}
      >
        {message}
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        className="linklike"
        onClick={() => setOpen(true)}
        style={{
          background: 'none',
          border: 'none',
          padding: 0,
          font: 'inherit',
          fontSize: '0.85rem',
          color: 'var(--muted)',
          cursor: 'pointer',
          textDecoration: 'underline',
        }}
      >
        {label ?? 'Report a problem'}
      </button>
    );
  }

  return (
    <div className="card" style={{ marginTop: '0.75rem' }}>
      <h3 style={{ marginTop: 0 }}>Report a problem</h3>
      <p className="muted">
        A person reviews every report. Please say what is wrong, not only that
        you disagree.
      </p>

      <label className="eyebrow" htmlFor={`c-${lessonId}-${postId ?? 'lesson'}`}>
        What kind of problem?
      </label>
      <select
        id={`c-${lessonId}-${postId ?? 'lesson'}`}
        value={category}
        onChange={(e) => setCategory(e.target.value as ReportCategory)}
      >
        {REPORT_CATEGORIES.map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </select>

      <label className="eyebrow" htmlFor={`d-${lessonId}-${postId ?? 'lesson'}`}>
        What is wrong?
      </label>
      <textarea
        id={`d-${lessonId}-${postId ?? 'lesson'}`}
        rows={3}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Quote the part you mean, if you can"
      />

      <div className="row" style={{ gap: '0.5rem' }}>
        <button
          type="button"
          className="btn"
          disabled={pending || description.trim().length === 0}
          onClick={submit}
        >
          {pending ? 'Sending…' : 'Send report'}
        </button>
        <button
          type="button"
          className="btn ghost"
          disabled={pending}
          onClick={() => setOpen(false)}
        >
          Cancel
        </button>
      </div>

      {message && (
        <div className={`notice ${tone === 'error' ? 'error' : 'warn'}`} role="status">
          {message}
        </div>
      )}
    </div>
  );
}
