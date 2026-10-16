'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Create a course.
 *
 * One field. A course and its first version are created together, because a
 * course with no version has nowhere to put content and nothing to publish.
 * The slug is derived from the title rather than asked for — it is part of
 * the public URL, and a second question here is a second thing to get wrong.
 */
export function NewCourse() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const res = await fetch('/api/teach', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'create_course', title }),
    });
    const json = (await res.json().catch(() => null)) as {
      ok: boolean;
      message?: string;
      value?: { courseId: string };
    };

    setBusy(false);
    if (!json.ok || !json.value) {
      setError(json.message ?? 'Could not create that course.');
      return;
    }
    startTransition(() => router.push(`/teach/${json.value?.courseId}`));
  }

  return (
    <form onSubmit={submit} className="card">
      <h3 style={{ marginTop: 0 }}>New course</h3>

      <label htmlFor="course-title">Title</label>
      <input
        id="course-title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Introduction to Tajweed"
        required
        maxLength={120}
        autoFocus
      />

      {error && <div className="notice error">{error}</div>}

      <button type="submit" className="btn" disabled={busy} style={{ marginTop: '0.75rem' }}>
        {busy ? 'Creating…' : 'Create course'}
      </button>
    </form>
  );
}
