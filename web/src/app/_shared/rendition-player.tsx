'use client';

import { useCallback, useEffect, useState } from 'react';

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
export function RenditionPlayer({
  displayName,
  lessonId,
  resourceId,
  renditions,
  posterRenditionId,
  canDownload,
}: {
  displayName: string;
  lessonId: string;
  resourceId: string;
  renditions: PlayableRendition[];
  posterRenditionId: string | null;
  canDownload: boolean;
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
      const query = new URLSearchParams({ lesson: lessonId, resource: resourceId });
      const response = await fetch(`/api/media/download?${query.toString()}`, {
        cache: 'no-store',
      });
      const result = (await response.json().catch(() => ({}))) as PlaybackResponse & {
        data?: { url: string; filename: string };
      };
      if (!response.ok || !result.data?.url) {
        throw new Error(result.message ?? 'That lesson could not be saved.');
      }
      // The signed URL carries `response-content-disposition: attachment`, so
      // this saves rather than navigates. The `download` attribute is what a
      // same-origin file would need; a cross-origin one ignores it, which is why
      // the header is signed instead.
      const anchor = document.createElement('a');
      anchor.href = result.data.url;
      anchor.download = result.data.filename;
      anchor.rel = 'noopener';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
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

        {canDownload && (
          <button type="button" className="secondary" onClick={() => void save()} disabled={saving}>
            {saving ? 'Preparing…' : 'Save for offline'}
          </button>
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
      </p>
    </div>
  );
}
