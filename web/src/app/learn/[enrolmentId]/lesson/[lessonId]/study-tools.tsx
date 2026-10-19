'use client';

import { useState } from 'react';

export function StudyTools({
  enrolmentId,
  lessonId,
  initialNote,
  initiallyBookmarked,
}: {
  enrolmentId: string;
  lessonId: string;
  initialNote: string;
  initiallyBookmarked: boolean;
}) {
  const [note, setNote] = useState(initialNote);
  const [savedNote, setSavedNote] = useState(initialNote);
  const [bookmarked, setBookmarked] = useState(initiallyBookmarked);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function send(payload: Record<string, unknown>) {
    setBusy(true);
    setMessage('');
    setError('');
    try {
      const response = await fetch('/api/lesson-study-tools', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ enrolmentId, lessonId, ...payload }),
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? 'Could not save that change.');
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save that change.');
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function saveNote() {
    if (await send({ action: 'save_note', body: note })) {
      setSavedNote(note.trim());
      setNote(note.trim());
      setMessage('Note saved privately.');
    }
  }

  async function clearNote() {
    if (await send({ action: 'clear_note' })) {
      setSavedNote('');
      setNote('');
      setMessage('Note removed.');
    }
  }

  async function toggleBookmark() {
    const next = !bookmarked;
    if (await send({ action: 'set_bookmark', saved: next })) {
      setBookmarked(next);
      setMessage(next ? 'Lesson bookmarked.' : 'Bookmark removed.');
    }
  }

  return (
    <section className="card" aria-label="Your private study tools">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>Your study tools</h2>
        <button type="button" className="btn secondary" onClick={toggleBookmark} disabled={busy}>
          {bookmarked ? 'Remove bookmark' : 'Bookmark lesson'}
        </button>
      </div>
      <label htmlFor="lesson-note">Private lesson note</label>
      <textarea
        id="lesson-note"
        rows={4}
        maxLength={4000}
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder="Save a thought or reminder for yourself…"
        disabled={busy}
      />
      <div className="row">
        <button type="button" className="btn" onClick={saveNote} disabled={busy || note.trim() === savedNote}>
          {busy ? 'Saving…' : 'Save note'}
        </button>
        {savedNote && (
          <button type="button" className="btn ghost" onClick={clearNote} disabled={busy}>
            Clear note
          </button>
        )}
        <span className="muted" aria-live="polite">{note.length}/4000</span>
      </div>
      {error && <p className="danger" role="alert">{error}</p>}
      {message && <p className="notice" role="status">{message}</p>}
      <p className="muted" style={{ marginBottom: 0, fontSize: '.85rem' }}>
        Notes and bookmarks are private to your account.
      </p>
    </section>
  );
}
