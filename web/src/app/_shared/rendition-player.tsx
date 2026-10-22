'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { createClient } from '@/lib/supabase/client';
import { deviceKey, storeLesson } from '@/lib/offline';
import { track } from '@/lib/analytics';

import {
  PROFILE_LABEL,
  formatByteSize,
  isVideoRendition,
  pickStreamRendition,
  renditionChoices,
  type PlayableRendition,
  type RenditionProfile,
} from '@/lib/playback';

type PlaybackResponse = {
  ok?: boolean;
  message?: string;
  data?: { url: string; expiresAt: string; profile: string };
};

/**
 * Plays a lesson's uploaded media from its delivery copies.
 *
 * The server has already decided what this learner may watch: `renditions` is
 * what a row-level-security-filtered select returned, so this component never
 * asks about entitlement and cannot widen it. What it decides is presentation —
 * which rung to start on, and what to do when the signed URL expires.
 *
 * The URL is fetched rather than embedded in the page for two reasons. A
 * presigned URL is a bearer token, so putting it in server-rendered HTML would
 * leave it in the browser's history, in any saved copy of the page, and in the
 * page source of a lesson somebody screen-shared. And it expires: a long lesson
 * watched slowly outlives a URL minted at page load, so the player has to be
 * able to ask again.
 */
/** What the learner would call this device, guessed from what it reports. */
function deviceLabel(): string {
  const agent = typeof navigator === 'undefined' ? '' : navigator.userAgent;
  if (/iPhone/i.test(agent)) return 'iPhone';
  if (/iPad/i.test(agent)) return 'iPad';
  if (/Android/i.test(agent)) return 'Android device';
  if (/Macintosh/i.test(agent)) return 'Mac';
  if (/Windows/i.test(agent)) return 'Windows PC';
  return 'This browser';
}

export function RenditionPlayer({
  displayName,
  lessonId,
  resourceId,
  renditions,
  posterRenditionId,
  canDownload,
  courseTitle = '',
  learnerProfileId = null,
  saveNote = null,
}: {
  displayName: string;
  lessonId: string;
  resourceId: string;
  renditions: PlayableRendition[];
  posterRenditionId: string | null;
  canDownload: boolean;
  courseTitle?: string;
  /** Whose save this is. A guardian saving a child's lesson records the child. */
  learnerProfileId?: string | null;
  /**
   * Why the save button is absent, when it is absent for a reason the learner
   * can act on. A missing button with no sentence sells nothing.
   */
  saveNote?: string | null;
}) {
  const choices = renditionChoices(renditions);
  const initial = pickStreamRendition(renditions, null);
  const [profile, setProfile] = useState<RenditionProfile>(
    initial?.profile ?? choices[0]?.profile ?? '480p',
  );
  const [url, setUrl] = useState<string | null>(null);
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedHere, setSavedHere] = useState(false);

  // Built once: the Supabase client is a plain object, but creating one per
  // render inside an async handler would be a new session lookup each press.
  const [supabase] = useState(() => createClient());

  const chosen = choices.find((r) => r.profile === profile) ?? choices[0] ?? null;

  const load = useCallback(
    async (renditionId: string) => {
      setLoading(true);
      setError('');
      try {
        const response = await fetch(
          `/api/media/playback?rendition=${encodeURIComponent(renditionId)}`,
          { cache: 'no-store' },
        );
        const result = (await response.json().catch(() => ({}))) as PlaybackResponse;
        if (!response.ok || !result.data?.url) {
          throw new Error(result.message ?? 'That lesson could not be played.');
        }
        setUrl(result.data.url);
      } catch (cause) {
        setUrl(null);
        setError(cause instanceof Error ? cause.message : 'That lesson could not be played.');
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (chosen) void load(chosen.id);
    // `chosen` is derived from props and state, so keying on its id is enough.
  }, [chosen?.id, load]);

  useEffect(() => {
    if (!posterRenditionId) return;
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch(
          `/api/media/playback?rendition=${encodeURIComponent(posterRenditionId)}`,
          { cache: 'no-store' },
        );
        const result = (await response.json().catch(() => ({}))) as PlaybackResponse;
        if (!cancelled && response.ok && result.data?.url) setPosterUrl(result.data.url);
      } catch {
        // A missing poster is cosmetic. Saying so would be noise.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [posterRenditionId]);

  if (!chosen) {
    return (
      <p className="muted">
        {displayName} has no delivery copy that can be played yet.
      </p>
    );
  }

  async function save() {
    setSaving(true);
    setError('');
    try {
      // Decided 2026-10-22: a saved lesson lives in the app, not in the device's
      // file manager. This books the save with the database, fetches the bytes
      // while the signed URL is briefly alive, and keeps them in this origin's own
      // storage. Nothing is written through a download attribute and no page
      // navigates to the file.
      const key = deviceKey();
      const booking = await supabase.rpc('save_offline_lesson', {
        p_lesson_id: lessonId,
        p_device_key: key,
        p_device_label: deviceLabel(),
      });

      if (booking.error) throw new Error(booking.error.message);

      const saved = booking.data as
        | {
            saved?: boolean;
            message?: string;
            downloadId?: string;
            expiresAt?: string;
          }
        | null;

      if (saved?.saved !== true) {
        throw new Error(saved?.message ?? 'This lesson cannot be saved on this plan.');
      }

      const query = new URLSearchParams({ lesson: lessonId, resource: resourceId });
      const response = await fetch(`/api/media/download?${query.toString()}`, {
        cache: 'no-store',
      });
      const result = (await response.json().catch(() => ({}))) as {
        data?: { url: string };
        message?: string;
      };
      if (!response.ok || !result.data?.url) {
        throw new Error(result.message ?? 'That lesson could not be fetched to save.');
      }

      const bytes = await fetch(result.data.url);
      if (!bytes.ok) throw new Error('That lesson could not be fetched to save.');
      const blob = await bytes.blob();

      await storeLesson(
        {
          downloadId: String(saved.downloadId ?? ''),
          lessonId,
          title: displayName,
          courseTitle,
          savedAt: new Date().toISOString(),
          expiresAt: saved.expiresAt ?? new Date().toISOString(),
          bytes: blob.size,
        },
        blob,
      );

      setSavedHere(true);
      void track({ code: 'download.saved', subjectId: lessonId, learnerProfileId });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'That lesson could not be saved.');
    } finally {
      setSaving(false);
    }
  }

  const video = isVideoRendition(chosen);

  return (
    <div style={{ display: 'grid', gap: '0.5rem' }}>
      <strong>{displayName}</strong>

      {video ? (
        <video
          controls
          playsInline
          preload="metadata"
          src={url ?? undefined}
          poster={posterUrl ?? undefined}
          aria-label={displayName}
          style={{
            width: '100%',
            maxHeight: '70vh',
            borderRadius: '0.75rem',
            background: '#101510',
          }}
        >
          Your browser cannot play this video.
        </video>
      ) : (
        <audio
          controls
          preload="metadata"
          src={url ?? undefined}
          aria-label={displayName}
          style={{ width: '100%' }}
        >
          Your browser cannot play this audio.
        </audio>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
        <label className="muted" htmlFor={`quality-${chosen.id}`}>
          Quality
        </label>
        <select
          id={`quality-${chosen.id}`}
          value={profile}
          onChange={(event) => setProfile(event.target.value as RenditionProfile)}
          disabled={loading}
        >
          {choices.map((option) => (
            <option key={option.id} value={option.profile}>
              {PROFILE_LABEL[option.profile]} · {formatByteSize(option.byteSize)}
            </option>
          ))}
        </select>

        {canDownload && !savedHere && (
          <button type="button" className="secondary" onClick={() => void save()} disabled={saving}>
            {saving ? 'Saving…' : 'Save on this device'}
          </button>
        )}
        {savedHere && <a className="secondary" href="/downloads">On this device</a>}

        {saveNote && (
          <p className="muted" style={{ fontSize: '0.9rem', margin: 0 }}>
            {saveNote}{' '}
            <Link href="/plans">See what Plus includes</Link>
          </p>
        )}

        {error && (
          <button type="button" className="secondary" onClick={() => void load(chosen.id)}>
            Try again
          </button>
        )}
      </div>

      {loading && <p className="muted">Preparing the player…</p>}
      {error && <p className="muted">{error}</p>}
      <p className="muted" style={{ fontSize: '0.85rem' }}>
        Playback links are short-lived and are tied to your access to this lesson.
        {canDownload
          ? ' A saved lesson stays inside the app rather than in your file manager, and stops working when the plan or the date says so.'
          : ''}
      </p>
    </div>
  );
}
