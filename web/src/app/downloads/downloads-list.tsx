'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { removeSavedWithConfirmation } from '@/lib/offline-removal';
import { daysRemaining, listSaved, openSavedLesson, removeStored, type SavedLesson } from '@/lib/offline';
import { OfflineVaultError } from '@/lib/offline-vault';
import { fill, formatBytes, formatNumber } from '@/lib/i18n/format';
import type { LocaleCode } from '@/lib/i18n/locales';

/** Every sentence the list says, handed over by the page in the reader's language. */
export type DownloadsWords = {
  storageRefused: string;
  looking: string;
  empty: string;
  /** Has `{count}`. */
  count: string;
  /** Has `{size}`. */
  space: string;
  closePlayer: string;
  badgeLapsed: string;
  badgeSaved: string;
  lapsed: string;
  /** Has `{days}`. */
  daysLeft: string;
  play: string;
  opening: string;
  remove: string;
  removing: string;
  removeLocal: string;
  gone: string;
  openFailed: string;
  needConnection: string;
  notAllowed: string;
  removedCopy: string;
  signIn: string;
  removeUnconfirmed: string;
  removeLocalFailed: string;
  confirmLocal: string;
  localRemoved: string;
  localFailed: string;
};

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
 *
 * It has no sentence of its own (2026-11-27): the page hands it `words` and
 * the language to count in. A lesson that does not open is said by the name
 * of why (`OfflineVaultError.reason`); a refusal with no name, and anything
 * else that goes wrong, is "could not be opened". The server's English
 * sentence is never printed. Titles are shown as they were written.
 *
 * The page sends a signed-out reader to sign in before this is drawn, so
 * there is no signed-out branch: a session that ended since is a removal the
 * server did not confirm, and is said as that.
 */
export function DownloadsList({ locale, words }: { locale: LocaleCode; words: DownloadsWords }) {
  const [saved, setSaved] = useState<SavedLesson[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [playing, setPlaying] = useState<{ lessonId: string; url: string; type: string; title: string } | null>(
    null,
  );
  const [playError, setPlayError] = useState<string | null>(null);
  const objectUrl = useRef<string | null>(null);

  useEffect(() => {
    listSaved().then(setSaved).catch(() => setError(words.storageRefused));
  }, [words.storageRefused]);

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
        setPlayError(words.gone);
        return;
      }
      stopPlaying();
      objectUrl.current = opened.url;
      setPlaying({ lessonId: lesson.lessonId, url: opened.url, type: opened.type, title: lesson.title });
    } catch (cause) {
      const reason = cause instanceof OfflineVaultError ? cause.reason : null;
      setPlayError(reason ? words[reason] : words.openFailed);
    } finally {
      setBusy(null);
    }
  }

  async function forget(lesson: SavedLesson) {
    setBusy(lesson.lessonId);
    setPlayError(null);
    try {
      const supabase = createClient();
      const result = await removeSavedWithConfirmation(
        lesson.downloadId,
        () => supabase.rpc('forget_offline_lesson', { p_download_id: lesson.downloadId }),
        () => removeStored(lesson.lessonId),
      );
      if (!result.ok) { setPlayError(result.reason === 'local' ? words.removeLocalFailed : words.removeUnconfirmed); return; }
      if (playing?.lessonId === lesson.lessonId) stopPlaying();
      setSaved((current) => (current ?? []).filter((l) => l.lessonId !== lesson.lessonId));
    } finally {
      setBusy(null);
    }
  }

  async function removeLocalOnly(lesson: SavedLesson) {
    if (!window.confirm(words.confirmLocal)) return;
    setBusy(lesson.lessonId);
    setPlayError(null);
    try {
      await removeStored(lesson.lessonId);
      if (playing?.lessonId === lesson.lessonId) stopPlaying();
      setSaved((current) => (current ?? []).filter((l) => l.lessonId !== lesson.lessonId));
      setPlayError(words.localRemoved);
    } catch {
      setPlayError(words.localFailed);
    } finally {
      setBusy(null);
    }
  }

  if (error) return <p className="notice warn">{error}</p>;
  if (saved === null) return <p className="muted">{words.looking}</p>;
  if (saved.length === 0) return <p className="empty">{words.empty}</p>;

  const total = saved.reduce((sum, lesson) => sum + lesson.bytes, 0);

  return (
    <>
      <p className="muted">
        {fill(words.count, { count: formatNumber(locale, saved.length) })}
        {' · '}
        {fill(words.space, { size: formatBytes(locale, total) })}
      </p>

      {playing && (
        <div className="card" style={{ padding: '1rem', marginBottom: '1rem' }}>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
            <strong dir="auto">{playing.title}</strong>
            <button type="button" className="btn ghost tiny" onClick={stopPlaying}>
              {words.closePlayer}
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
              <bdi>{lesson.title}</bdi>
              <span className="muted">
                {' · '}
                <bdi>{lesson.courseTitle}</bdi>
                {/* A lapsed copy has no days left to count; it says what to do
                    instead, in words on the row, where a finger can read them
                    (they used to be a tooltip on a button that was off). */}
                {!lesson.lapsed && (
                  <>
                    {' · '}
                    {fill(words.daysLeft, { days: formatNumber(locale, Math.max(1, daysRemaining(lesson.expiresAt))) })}
                  </>
                )}
                {' · '}
                {formatBytes(locale, lesson.bytes)}
                {lesson.lapsed && (
                  <>
                    {' · '}
                    {words.lapsed}
                  </>
                )}
              </span>
            </span>
            <span>
              {lesson.lapsed ? (
                <span className="badge neutral">{words.badgeLapsed}</span>
              ) : (
                <span className="badge">{words.badgeSaved}</span>
              )}{' '}
              <button
                type="button"
                className="btn ghost tiny"
                disabled={busy === lesson.lessonId || lesson.lapsed}
                onClick={() => void play(lesson)}
              >
                {busy === lesson.lessonId ? words.opening : words.play}
              </button>{' '}
              <button
                type="button"
                className="btn ghost tiny"
                disabled={busy === lesson.lessonId}
                onClick={() => void forget(lesson)}
              >
                {busy === lesson.lessonId ? words.removing : words.remove}
              </button>{' '}
              <button type="button" className="btn ghost tiny" disabled={busy === lesson.lessonId} onClick={() => void removeLocalOnly(lesson)}>
                {words.removeLocal}
              </button>
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}
