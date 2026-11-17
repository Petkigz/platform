'use client';

import { useState } from 'react';
import { formatNumber } from '@/lib/i18n/format';
import type { LocaleCode } from '@/lib/i18n/locales';
import { MAX_LESSON_NOTE_LENGTH } from '@/lib/lesson-study-tools';

/**
 * A learner's own note on a lesson, and the bookmark.
 *
 * **The words can be handed in.** The lesson page passes `words` in the
 * reader's language and `locale` for the two numbers in the counter. The note
 * itself is whatever the learner typed, in whatever language, so the box finds
 * its own direction.
 *
 * **When a change does not go through.** The server's sentences are English,
 * so only an English page prints them. Any other page has two: sign in again
 * (the session ended), and "we could not confirm that change, try again" for
 * everything else, including no reply at all. Trying again is safe: saving a
 * note twice leaves one note, and a bookmark set twice is one bookmark.
 */
export type StudyToolsWords = {
  label: string;
  heading: string;
  bookmark: string;
  unbookmark: string;
  noteLabel: string;
  placeholder: string;
  save: string;
  saving: string;
  clear: string;
  saved: string;
  cleared: string;
  bookmarked: string;
  unbookmarked: string;
  privateNote: string;
  failed: string;
  signIn: string;
};

const ENGLISH: StudyToolsWords = {
  label: 'Your private study tools',
  heading: 'Your study tools',
  bookmark: 'Bookmark lesson',
  unbookmark: 'Remove bookmark',
  noteLabel: 'Private lesson note',
  placeholder: 'Save a thought or reminder for yourself…',
  save: 'Save note',
  saving: 'Saving…',
  clear: 'Clear note',
  saved: 'Note saved privately.',
  cleared: 'Note removed.',
  bookmarked: 'Lesson bookmarked.',
  unbookmarked: 'Bookmark removed.',
  privateNote: 'Notes and bookmarks are private to your account.',
  failed: 'We could not confirm that change. Try again.',
  signIn: 'Sign in again to save notes and bookmarks.',
};

export function StudyTools({
  enrolmentId,
  lessonId,
  initialNote,
  initiallyBookmarked,
  words,
  locale = 'en',
}: {
  enrolmentId: string;
  lessonId: string;
  initialNote: string;
  initiallyBookmarked: boolean;
  words?: StudyToolsWords;
  /** The language `words` is in. */
  locale?: LocaleCode;
}) {
  const say = words ?? ENGLISH;
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
      if (response.ok) return true;
      const result = (await response.json().catch(() => ({}))) as { error?: unknown };
      const ours = response.status === 401 ? say.signIn : say.failed;
      setError(locale === 'en' && typeof result.error === 'string' ? result.error : ours);
      return false;
    } catch {
      // No reply at all.
      setError(say.failed);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function saveNote() {
    if (await send({ action: 'save_note', body: note })) {
      setSavedNote(note.trim());
      setNote(note.trim());
      setMessage(say.saved);
    }
  }

  async function clearNote() {
    if (await send({ action: 'clear_note' })) {
      setSavedNote('');
      setNote('');
      setMessage(say.cleared);
    }
  }

  async function toggleBookmark() {
    const next = !bookmarked;
    if (await send({ action: 'set_bookmark', saved: next })) {
      setBookmarked(next);
      setMessage(next ? say.bookmarked : say.unbookmarked);
    }
  }

  return (
    <section className="card" aria-label={say.label}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>{say.heading}</h2>
        <button type="button" className="btn secondary" onClick={toggleBookmark} disabled={busy}>
          {bookmarked ? say.unbookmark : say.bookmark}
        </button>
      </div>
      <label htmlFor="lesson-note">{say.noteLabel}</label>
      <textarea
        id="lesson-note"
        rows={4}
        maxLength={MAX_LESSON_NOTE_LENGTH}
        dir="auto"
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder={say.placeholder}
        disabled={busy}
      />
      <div className="row">
        <button type="button" className="btn" onClick={saveNote} disabled={busy || note.trim() === savedNote}>
          {busy ? say.saving : say.save}
        </button>
        {savedNote && (
          <button type="button" className="btn ghost" onClick={clearNote} disabled={busy}>
            {say.clear}
          </button>
        )}
        <span className="muted" aria-live="polite">
          {formatNumber(locale, note.length)}/{formatNumber(locale, MAX_LESSON_NOTE_LENGTH)}
        </span>
      </div>
      {error && <p className="danger" role="alert">{error}</p>}
      {message && <p className="notice" role="status">{message}</p>}
      <p className="muted" style={{ marginBottom: 0, fontSize: '.85rem' }}>
        {say.privateNote}
      </p>
    </section>
  );
}
