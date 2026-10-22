'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  describeBytes,
  describeRemaining,
  listSaved,
  removeStored,
  type SavedLesson,
} from '@/lib/offline';

/**
 * What is on this device.
 *
 * Read from the app's own storage, not from the server: these lessons exist here
 * or they do not exist, and the server's book is only what *should* be here. When
 * the two disagree the local list wins, because it is what will actually play.
 */
export function DownloadsList({ signedIn }: { signedIn: boolean }) {
  const [saved, setSaved] = useState<SavedLesson[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    listSaved().then(setSaved).catch(() => setError('This browser would not open its app storage.'));
  }, []);

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
                disabled={busy === lesson.lessonId}
                onClick={() => forget(lesson)}
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
