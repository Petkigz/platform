'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { availabilityLabel, SAVED_NOTE_MAX, type SavedCourse } from '@/lib/wishlist';

/**
 * One row of the saved list.
 *
 * The note is editable in place and removal is immediate, because both are
 * reversible in the only sense that matters here: removing a saved course costs
 * nothing but a tap to undo, and a note is private. Neither asks for
 * confirmation, and neither should — a saved list that guards its own edits
 * teaches people not to use it.
 */
export function SavedItem({ saved }: { saved: SavedCourse }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState(saved.note ?? '');
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<'info' | 'error'>('info');

  const gone = saved.availability === 'retired';

  async function post(body: Record<string, unknown>, then?: () => void) {
    setBusy(true);
    setMessage(null);
    const res = await fetch('/api/wishlist', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    if (!res.ok) {
      setTone('error');
      setMessage(json.error ?? 'That did not work.');
      return;
    }
    setTone('info');
    then?.();
  }

  return (
    <article className="card">
      <div className="row" style={{ justifyContent: 'space-between', gap: '0.75rem' }}>
        <div>
          {saved.courseSlug && !gone ? (
            <Link href={`/courses/${saved.courseSlug}`} className="course" style={{ display: 'block' }}>
              <span className="title">{saved.courseTitle}</span>
            </Link>
          ) : (
            <span className="title">{saved.courseTitle}</span>
          )}
          <div className="badges" style={{ marginTop: '0.5rem' }}>
            <span className={`badge ${gone ? 'neutral' : ''}`}>
              {availabilityLabel(saved)}
            </span>
            <span className="badge neutral">
              Saved {new Date(saved.savedAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        <button
          type="button"
          className="btn ghost tiny"
          disabled={busy}
          onClick={() =>
            post({ action: 'remove', savedId: saved.id }, () => {
              setMessage('Removed.');
              router.refresh();
            })
          }
          style={{ width: 'auto' }}
        >
          Remove
        </button>
      </div>

      {editing ? (
        <div style={{ marginTop: '0.75rem' }}>
          <label className="eyebrow" htmlFor={`note-${saved.id}`}>
            Why — only you can read this
          </label>
          <textarea
            id={`note-${saved.id}`}
            rows={2}
            value={note}
            maxLength={SAVED_NOTE_MAX}
            disabled={busy}
            onChange={(e) => setNote(e.target.value)}
            placeholder="For Amina, after she finishes Tajweed 1"
          />
          <div className="row" style={{ gap: '0.5rem' }}>
            <button
              type="button"
              className="btn tiny"
              disabled={busy}
              onClick={() =>
                post({ action: 'note', savedId: saved.id, note }, () => {
                  setEditing(false);
                  setMessage('Note saved.');
                  router.refresh();
                })
              }
            >
              Save note
            </button>
            <button
              type="button"
              className="btn ghost tiny"
              disabled={busy}
              onClick={() => {
                setEditing(false);
                setNote(saved.note ?? '');
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="row" style={{ gap: '0.5rem', marginTop: '0.75rem', alignItems: 'baseline' }}>
          <p className="muted" style={{ margin: 0, fontSize: '.9rem' }}>
            {saved.note ?? 'No note.'}
          </p>
          <button
            type="button"
            className="btn ghost tiny"
            disabled={busy}
            onClick={() => setEditing(true)}
            style={{ width: 'auto' }}
          >
            {saved.note ? 'Edit' : 'Add a note'}
          </button>
        </div>
      )}

      {message && (
        <div className={`notice ${tone === 'error' ? 'error' : 'warn'}`} role="status">
          {message}
        </div>
      )}
    </article>
  );
}
