'use client';

import { useState } from 'react';
import Link from 'next/link';
import { SAVED_MAX, SAVED_NOTE_MAX } from '@/lib/wishlist';

/**
 * Save this course for later.
 *
 * One button, and the second tap removes it. The note is behind a second step
 * rather than in a modal, because saving has to stay a single tap — the moment
 * it asks a question it stops being a bookmark and becomes a form.
 *
 * When the flag is off this component is not rendered at all, so there is no
 * disabled state to explain.
 */
export function SaveButton({
  courseId,
  signedIn,
  initiallySaved,
  initialId,
  initialNote,
}: {
  courseId: string;
  signedIn: boolean;
  initiallySaved: boolean;
  initialId: string | null;
  initialNote: string | null;
}) {
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(initiallySaved);
  const [savedId, setSavedId] = useState<string | null>(initialId);
  const [note, setNote] = useState(initialNote ?? '');
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<'info' | 'error'>('info');

  if (!signedIn) {
    return (
      <p className="muted" style={{ margin: 0 }}>
        <Link href={`/sign-in?next=/courses/${courseId}`}>Sign in</Link> to save
        this course for later.
      </p>
    );
  }

  async function save() {
    setMessage(null);
    setPending(true);
    const res = await fetch('/api/wishlist', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'save', courseId, note }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string; id?: string };
    setPending(false);
    if (!res.ok) {
      setTone('error');
      setMessage(json.error ?? 'The course was not saved.');
      return;
    }
    setSaved(true);
    setSavedId(json.id ?? savedId);
    setTone('info');
    setMessage('Saved. Find it under Saved courses in your learning dashboard.');
  }

  async function remove() {
    setMessage(null);
    if (!savedId) return;
    setPending(true);
    const res = await fetch('/api/wishlist', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'remove', savedId }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    setPending(false);
    if (!res.ok) {
      setTone('error');
      setMessage(json.error ?? 'It was not removed.');
      return;
    }
    setSaved(false);
    setSavedId(null);
    setNote('');
    setEditing(false);
    setTone('info');
    setMessage('Removed from your saved courses.');
  }

  async function saveNote() {
    setMessage(null);
    if (!savedId) return;
    setPending(true);
    const res = await fetch('/api/wishlist', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'note', savedId, note }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    setPending(false);
    if (!res.ok) {
      setTone('error');
      setMessage(json.error ?? 'The note was not saved.');
      return;
    }
    setEditing(false);
    setTone('info');
    setMessage('Note saved.');
  }

  return (
    <div style={{ display: 'grid', gap: '0.5rem' }}>
      <div className="row" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
        {saved ? (
          <>
            <button type="button" className="btn ghost" disabled={pending} onClick={remove}>
              Saved — remove
            </button>
            {!editing && (
              <button
                type="button"
                className="btn ghost"
                disabled={pending}
                onClick={() => setEditing(true)}
              >
                {note.trim() ? 'Edit note' : 'Add a note'}
              </button>
            )}
          </>
        ) : (
          <button type="button" className="btn ghost" disabled={pending} onClick={save}>
            {pending ? 'Saving…' : 'Save for later'}
          </button>
        )}
      </div>

      {editing && saved && (
        <div>
          <label className="eyebrow" htmlFor="saved-note">
            Why — only you can read this
          </label>
          <textarea
            id="saved-note"
            rows={2}
            value={note}
            maxLength={SAVED_NOTE_MAX}
            disabled={pending}
            onChange={(e) => setNote(e.target.value)}
            placeholder="For Amina, after she finishes Tajweed 1"
          />
          <div className="row" style={{ gap: '0.5rem' }}>
            <button type="button" className="btn tiny" disabled={pending} onClick={saveNote}>
              Save note
            </button>
            <button
              type="button"
              className="btn ghost tiny"
              disabled={pending}
              onClick={() => {
                setEditing(false);
                setNote(initialNote ?? '');
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <p className="muted" style={{ margin: 0, fontSize: '.85rem' }}>
        {saved
          ? note.trim()
            ? `Your note: ${note.trim()}`
            : 'Saved with no note.'
          : `Up to ${SAVED_MAX} saved courses.`}
      </p>

      {message && (
        <div className={`notice ${tone === 'error' ? 'error' : 'warn'}`} role="status">
          {message}
        </div>
      )}
    </div>
  );
}
