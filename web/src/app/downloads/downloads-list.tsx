'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  describeBytes,
  describeRemaining,
  listSaved,
  openSavedLesson,
  removeStored,
  type SavedLesson,
} from '@/lib/offline';

/**
 * What is on this device, and the only place it can be played.
 *
 * Read from the app's own storage, not from the server: these lessons exist here
 * or they do not exist, and the server's book is only what *should* be here. When
 * the two disagree the local list wins, because it is what will actually play.
 *
 * Until now this page listed saves and could not open one. The bytes were there
 * and unreachable, which made "saved for offline" a promise the product did not
 * keep. Playing goes through `openSavedLesson()`, which asks the server for the
 * key each time — so a lapsed save fails here with the server's sentence rather
 * than playing from a stale file.
 *
 * The player is inside the page, not a new tab and not a download: the decrypted
 * blob exists in memory for as long as the player is open and is revoked when it
 * closes.
 */
export function DownloadsList({ signedIn }: { signedIn: boolean }) {
  const [saved, setSaved] = useState<SavedLesson[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [playing, setPlaying] = useState<{ lessonId: string; url: string; type: string; title: string } | null>(
    null,
  );
  const [playError, setPlayError] = useState<string | null>(null);
  const objectUrl = useRef<string | null>(null);

  useEffect(() => {
    listSaved().then(setSaved).catch(() => setError('This browser would not open its app storage.'));
  }, []);

  // A decrypted lesson must not outlive the player. Every unmount path revokes.
  useEffect(
    () => () => {
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    },
    [],
  );

  function stopPlaying() {
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = null;
    setPlaying(null);
  }

  async function play(lesson: SavedLesson) {
    setBusy(lesson.lessonId);
    setPlayError(null);
    try {
      const opened = await openSavedLesson(lesson.lessonId);
      if (!opened) {
        setPlayError('That lesson is no longer on this device.');
        return;
      }
      stopPlaying();
      objectUrl.current = opened.url;
      setPlaying({ lessonId: lesson.lessonId, url: opened.url, type: opened.type, title: lesson.title });
    } catch (cause) {
      setPlayError(
        cause instanceof Error ? cause.message : 'That saved lesson could not be opened.',
      );
    } finally {
      setBusy(null);
    }
  }

  async function forget(lesson: SavedLesson) {
    setBusy(lesson.lessonId);
    try {
      if (signedIn) {
        // Tell the server first: the record is what makes the device slot
        // countable, and a local removal that leaves it behind would quietly
        // consume the cap.
        const supabase = createClient();
        await supabase.rpc('forget_offline_lesson', { p_download_id: lesson.downloadId });
      }
      if (playing?.lessonId === lesson.lessonId) stopPlaying();
      await removeStored(lesson.lessonId);
      setSaved((current) => (current ?? []).filter((l) => l.lessonId !== lesson.lessonId));
    } finally {
      setBusy(null);
    }
  }

  if (error) return <p className="notice warn">{error}</p>;
  if (saved === null) return <p className="muted">Looking at what is on this device…</p>;
  if (saved.length === 0) {
    return (
      <p className="empty">
        Nothing is saved on this device. A lesson you save appears here and nowhere
        else — it is not in your phone&apos;s downloads folder.
      </p>
    );
  }

  const total = saved.reduce((sum, lesson) => sum + lesson.bytes, 0);

  return (
    <>
      <p className="muted">
        {saved.length} lesson{saved.length === 1 ? '' : 's'} · {describeBytes(total)} on this
        device
      </p>

      {playing && (
        <div className="card" style={{ padding: '1rem', marginBottom: '1rem' }}>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
            <strong>{playing.title}</strong>
            <button type="button" className="btn ghost tiny" onClick={stopPlaying}>
              Close player
            </button>
          </div>
          {playing.type.startsWith('audio/') ? (
            <audio src={playing.url} controls autoPlay style={{ width: '100%', marginTop: '0.75rem' }} />
          ) : (
            <video
              src={playing.url}
              controls
              autoPlay
              playsInline
              style={{ width: '100%', marginTop: '0.75rem', borderRadius: 'var(--radius-sm)' }}
            />
          )}
        </div>
      )}

      {playError && <p className="notice warn" role="alert">{playError}</p>}

      <ul className="lessons">
        {saved.map((lesson) => (
          <li key={lesson.lessonId}>
            <span className="t">
              {lesson.title}
              <span className="muted">
                {' · '}
                {lesson.courseTitle}
                {' · '}
                {describeRemaining(lesson.expiresAt)}
                {' · '}
                {describeBytes(lesson.bytes)}
              </span>
            </span>
            <span>
              {lesson.lapsed ? (
                <span className="badge neutral">Needs a refresh</span>
              ) : (
                <span className="badge">Ready offline</span>
              )}{' '}
              <button
                type="button"
                className="btn ghost tiny"
                disabled={busy === lesson.lessonId || lesson.lapsed}
                onClick={() => void play(lesson)}
                title={
                  lesson.lapsed
                    ? 'This copy has lapsed. Open the lesson while online to save it again.'
                    : undefined
                }
              >
                {busy === lesson.lessonId ? 'Opening…' : 'Play'}
              </button>{' '}
              <button
                type="button"
                className="btn ghost tiny"
                disabled={busy === lesson.lessonId}
                onClick={() => void forget(lesson)}
              >
                {busy === lesson.lessonId ? 'Removing…' : 'Remove'}
              </button>
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}
