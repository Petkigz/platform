'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SAVED_NOTE_MAX, savedRefusalOf, type SavedWords } from '@/lib/wishlist-shared';
import type { SavedCourse } from '@/lib/wishlist';

/** As wide as what it says, in whatever language that is. */
const NATURAL = { width: 'auto' } as const;

/**
 * One row of the saved list.
 *
 * The note is editable in place and removal is immediate, because both are
 * reversible in the only sense that matters here: removing a saved course costs
 * nothing but a tap to undo, and a note is private. Neither asks for
 * confirmation, and neither should — a saved list that guards its own edits
 * teaches people not to use it.
 *
 * It carries no sentence of its own: the page hands it `words`, the badge and
 * the day in the reader's language. A refusal is said by its name
 * (`savedRefusalOf`); a reply that names nothing this row knows, or that never
 * arrived, is "could not be confirmed", and the route's English sentence is
 * never printed. The title and the note are shown as they were written.
 *
 * `canEditNote` is false while saving is switched off: the database refuses a
 * changed note then, so the button that would be refused is not drawn.
 */
export function SavedItem({
  saved,
  title,
  state,
  savedOn,
  canEditNote,
  words,
}: {
  saved: SavedCourse;
  /** The course's title, or the page's words for a course that is gone. */
  title: string;
  /** The badge: enrolled, available, not published or no longer offered. */
  state: string;
  /** "Saved" and the day, already one sentence. */
  savedOn: string;
  canEditNote: boolean;
  words: SavedWords;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState(saved.note ?? '');
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<'info' | 'error'>('info');

  const gone = saved.availability === 'retired';

  async function post(body: Record<string, unknown>, then: () => void) {
    setBusy(true);
    setMessage(null);
    let status = 0;
    let code: unknown;
    try {
      const res = await fetch('/api/wishlist', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      status = res.status;
      code = ((await res.json().catch(() => ({}))) as { code?: unknown }).code;
    } catch {
      // No reply at all: a status of zero, which is "could not be confirmed".
    }
    setBusy(false);
    if (status < 200 || status > 299) {
      setTone('error');
      setMessage(words[savedRefusalOf(status, code)]);
      return;
    }
    setTone('info');
    then();
  }

  return (
    <article className="card">
      <div className="row" style={{ justifyContent: 'space-between', gap: '0.75rem' }}>
        <div>
          {saved.courseSlug && !gone ? (
            <Link href={`/courses/${saved.courseSlug}`} className="course" style={{ display: 'block' }}>
              <span className="title" dir="auto">{title}</span>
            </Link>
          ) : (
            <span className="title" dir="auto">{title}</span>
          )}
          <div className="badges" style={{ marginTop: '0.5rem' }}>
            <span className={`badge ${gone ? 'neutral' : ''}`}>{state}</span>
            <span className="badge neutral">{savedOn}</span>
          </div>
        </div>

        <button
          type="button"
          className="btn ghost tiny"
          disabled={busy}
          onClick={() =>
            post({ action: 'remove', savedId: saved.id }, () => {
              setMessage(words.removedDone);
              router.refresh();
            })
          }
          style={NATURAL}
        >
          {words.remove}
        </button>
      </div>

      {editing ? (
        <div style={{ marginTop: '0.75rem' }}>
          <label className="eyebrow" htmlFor={`note-${saved.id}`}>
            {words.noteLabel}
          </label>
          <textarea
            id={`note-${saved.id}`}
            rows={2}
            dir="auto"
            value={note}
            maxLength={SAVED_NOTE_MAX}
            disabled={busy}
            onChange={(e) => setNote(e.target.value)}
            placeholder={words.notePlaceholder}
          />
          <div className="row" style={{ gap: '0.5rem' }}>
            <button
              type="button"
              className="btn tiny"
              style={NATURAL}
              disabled={busy}
              onClick={() =>
                post({ action: 'note', savedId: saved.id, note }, () => {
                  setEditing(false);
                  setMessage(words.noteSaved);
                  router.refresh();
                })
              }
            >
              {words.noteSave}
            </button>
            <button
              type="button"
              className="btn ghost tiny"
              style={NATURAL}
              disabled={busy}
              onClick={() => {
                setEditing(false);
                setNote(saved.note ?? '');
              }}
            >
              {words.cancel}
            </button>
          </div>
        </div>
      ) : (
        <div className="row" style={{ gap: '0.5rem', marginTop: '0.75rem', alignItems: 'baseline' }}>
          <p className="muted" style={{ margin: 0, fontSize: '.9rem' }} dir={saved.note ? 'auto' : undefined}>
            {saved.note ?? words.noNote}
          </p>
          {canEditNote && (
            <button
              type="button"
              className="btn ghost tiny"
              disabled={busy}
              onClick={() => setEditing(true)}
              style={NATURAL}
            >
              {saved.note ? words.noteEdit : words.noteAdd}
            </button>
          )}
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
