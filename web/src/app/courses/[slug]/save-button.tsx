'use client';

import { useState } from 'react';
import Link from 'next/link';
import { saveOutcomeOf, type SaveWords } from '@/lib/course-parts';
import { fill } from '@/lib/i18n/format';
import { SAVED_NOTE_MAX } from '@/lib/wishlist-shared';

/**
 * `.row` pins its first child to a label's width, and `.btn` asks for the whole
 * line. Neither suits a button whose words are a different length in every
 * language: this lets each be as wide as what it says.
 */
const NATURAL = { flex: '0 1 auto', width: 'auto', margin: 0 } as const;

/**
 * Save this course for later.
 *
 * One button, and the second tap removes it. The note is behind a second step
 * rather than in a modal, because saving has to stay a single tap — the moment
 * it asks a question it stops being a bookmark and becomes a form.
 *
 * When the flag is off this component is not rendered at all, so there is no
 * disabled state to explain.
 *
 * It carries no sentence of its own: the course page hands it `words` in the
 * reader's language. A refusal is said by its name (`saveOutcomeOf`); a reply
 * that names nothing this button knows is "could not be confirmed, reload",
 * and the route's English sentence is never printed. The note is the reader's
 * own and is shown as they wrote it.
 */
export function SaveButton({
  courseId,
  signedIn,
  initiallySaved,
  initialId,
  initialNote,
  words,
}: {
  courseId: string;
  signedIn: boolean;
  initiallySaved: boolean;
  initialId: string | null;
  initialNote: string | null;
  words: SaveWords;
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
        <Link href={`/sign-in?next=/courses/${courseId}`}>{words.signIn}</Link>
      </p>
    );
  }

  /** One request. A reply that did not arrive is a status of zero. */
  async function send(body: Record<string, unknown>): Promise<{ status: number; json: { code?: unknown; id?: unknown } }> {
    try {
      const res = await fetch('/api/wishlist', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = (await res.json().catch(() => ({}))) as { code?: unknown; id?: unknown };
      return { status: res.status, json };
    } catch {
      return { status: 0, json: {} };
    }
  }

  function refuse(status: number, code: unknown) {
    const outcome = saveOutcomeOf(status, code);
    setTone('error');
    setMessage(outcome === 'unconfirmed' ? words.unconfirmed : words.refusals[outcome]);
  }

  async function save() {
    setMessage(null);
    setPending(true);
    const { status, json } = await send({ action: 'save', courseId, note });
    setPending(false);
    if (status < 200 || status > 299) return refuse(status, json.code);
    setSaved(true);
    setSavedId(typeof json.id === 'string' ? json.id : savedId);
    setTone('info');
    setMessage(words.savedDone);
  }

  async function remove() {
    setMessage(null);
    if (!savedId) return;
    setPending(true);
    const { status, json } = await send({ action: 'remove', savedId });
    setPending(false);
    if (status < 200 || status > 299) return refuse(status, json.code);
    setSaved(false);
    setSavedId(null);
    setNote('');
    setEditing(false);
    setTone('info');
    setMessage(words.removedDone);
  }

  async function saveNote() {
    setMessage(null);
    if (!savedId) return;
    setPending(true);
    const { status, json } = await send({ action: 'note', savedId, note });
    setPending(false);
    if (status < 200 || status > 299) return refuse(status, json.code);
    setEditing(false);
    setTone('info');
    setMessage(words.noteSaved);
  }

  return (
    <div style={{ display: 'grid', gap: '0.5rem' }}>
      <div className="row" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
        {saved ? (
          <>
            <button type="button" className="btn ghost" style={NATURAL} disabled={pending} onClick={remove}>
              {words.savedRemove}
            </button>
            {!editing && (
              <button
                type="button"
                className="btn ghost"
                style={NATURAL}
                disabled={pending}
                onClick={() => setEditing(true)}
              >
                {note.trim() ? words.noteEdit : words.noteAdd}
              </button>
            )}
          </>
        ) : (
          <button type="button" className="btn ghost" style={NATURAL} disabled={pending} onClick={save}>
            {pending ? words.saving : words.save}
          </button>
        )}
      </div>

      {editing && saved && (
        <div>
          <label className="eyebrow" htmlFor="saved-note">
            {words.noteLabel}
          </label>
          <textarea
            id="saved-note"
            rows={2}
            dir="auto"
            value={note}
            maxLength={SAVED_NOTE_MAX}
            disabled={pending}
            onChange={(e) => setNote(e.target.value)}
            placeholder={words.notePlaceholder}
          />
          <div className="row" style={{ gap: '0.5rem' }}>
            <button type="button" className="btn tiny" disabled={pending} onClick={saveNote}>
              {words.noteSave}
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
              {words.cancel}
            </button>
          </div>
        </div>
      )}

      <p className="muted" style={{ margin: 0, fontSize: '.85rem' }}>
        {saved
          ? note.trim()
            ? fill(words.yourNote, { note: note.trim() })
            : words.noNote
          : words.max}
      </p>

      {message && (
        <div className={`notice ${tone === 'error' ? 'error' : 'warn'}`} role="status">
          {message}
        </div>
      )}
    </div>
  );
}
