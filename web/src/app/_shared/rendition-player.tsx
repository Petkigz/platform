'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

import { createClient } from '@/lib/supabase/client';
import { deviceKey, storeLesson } from '@/lib/offline';
import { track } from '@/lib/analytics';
import { LatestRequest } from '@/lib/latest-request';
import { useLocaleCode, useT } from '@/lib/i18n/client';
import type { MessageKey } from '@/lib/i18n/messages/en';
import { useMediaPosition } from './use-media-position';
import { PositionStatus } from './position-status';

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
/**
 * The three choices of quality that have a word in them. "1080p — full HD"
 * and "720p — HD" are the same in every language and are left as they are.
 */
/**
 * A failure this player has already put into words. Anything else that is
 * thrown (a dropped connection, a storage error) carries the browser's own
 * English and is answered with the player's sentence instead.
 */
class Refusal extends Error {}

type Words = { t: (key: MessageKey) => string; speaksEnglish: boolean };

/** The server's sentence on an English page; the player's own otherwise. */
function refusal(words: Words, server: string | null | undefined, key: MessageKey): string {
  return words.speaksEnglish && server ? server : words.t(key);
}

const QUALITY_KEY: Partial<Record<RenditionProfile, MessageKey>> = {
  '480p': 'player.qualityStandard',
  '360p': 'player.qualitySmall',
  audio: 'player.qualityAudio',
};

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
  enrolmentId = null,
  resumeAt = null,
  legacyActorId,
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
  /** The enrolment a saved place belongs to. Null means the player does not keep one. */
  enrolmentId?: string | null;
  /** Where the database says this learner stopped, read on the server. */
  resumeAt?: number | null;
  legacyActorId?: string;
}) {
  const position = useMediaPosition({ enrolmentId, lessonId, resourceId, legacyActorId, resumeAt });
  const { ref: mediaRef, ready, handlers } = position;
  const t = useT();
  // A refusal comes from the server as an English sentence. An English page
  // prints it, because it says more than ours; a page in another language
  // says its own sentence instead of English in the middle of it. Through a
  // ref, so asking for a word is never a reason to fetch a recording again.
  const speaksEnglish = useLocaleCode() === 'en';
  const words = useRef({ t, speaksEnglish });
  words.current = { t, speaksEnglish };

  const choices = renditionChoices(renditions);
  const initial = pickStreamRendition(renditions, null);
  const [profile, setProfile] = useState<RenditionProfile>(
    initial?.profile ?? choices[0]?.profile ?? '480p',
  );
  const [playback, setPlayback] = useState<{ id: string; url: string } | null>(null);
  const [playbackRequests] = useState(() => new LatestRequest());
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
      const request = playbackRequests.start();
      setLoading(true);
      setError('');
      setPlayback(null);
      try {
        const response = await fetch(
          `/api/media/playback?rendition=${encodeURIComponent(renditionId)}`,
          { cache: 'no-store', signal: request.signal },
        );
        const result = (await response.json().catch(() => ({}))) as PlaybackResponse;
        if (!request.isCurrent()) return;
        if (!response.ok || !result.data?.url) {
          throw new Refusal(refusal(words.current, result.message, 'player.playFailed'));
        }
        setPlayback({ id: renditionId, url: result.data.url });
      } catch (cause) {
        if (!request.isCurrent()) return;
        setPlayback(null);
        setError(cause instanceof Refusal ? cause.message : words.current.t('player.playFailed'));
      } finally {
        if (request.isCurrent()) setLoading(false);
      }
    },
    [playbackRequests],
  );

  const chosenId = chosen?.id ?? null;
  useEffect(() => {
    if (chosenId) void load(chosenId);
    else {
      playbackRequests.cancel();
      setPlayback(null);
      setLoading(false);
    }
    // Prop changes and unmount invalidate even a fetch that ignores abort.
    return () => playbackRequests.cancel();
  }, [chosenId, load, playbackRequests]);

  useEffect(() => {
    setPosterUrl(null);
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
        <bdi>{displayName}</bdi>
        <br />
        {t('player.noCopy')}
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
      const booking = await supabase.rpc('save_offline_lesson_for_resource', {
        p_lesson_id: lessonId,
        p_resource_id: resourceId,
        p_device_key: key,
        p_device_label: deviceLabel(),
      });

      if (booking.error) throw new Refusal(refusal(words.current, booking.error.message, 'player.saveFailed'));

      const saved = booking.data as
        | {
            saved?: boolean;
            message?: string;
            downloadId?: string;
            expiresAt?: string;
          }
        | null;

      if (saved?.saved !== true) {
        throw new Refusal(refusal(words.current, saved?.message, 'player.saveRefused'));
      }

      const query = new URLSearchParams({ lesson: lessonId, resource: resourceId, save: String(saved.downloadId ?? '') });
      const response = await fetch(`/api/media/download?${query.toString()}`, {
        cache: 'no-store',
      });
      const result = (await response.json().catch(() => ({}))) as {
        data?: { url: string };
        message?: string;
      };
      if (!response.ok || !result.data?.url) {
        throw new Refusal(refusal(words.current, result.message, 'player.fetchFailed'));
      }

      const bytes = await fetch(result.data.url);
      if (!bytes.ok) throw new Refusal(words.current.t('player.fetchFailed'));
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
          mimeType: blob.type || bytes.headers.get('content-type') || 'video/mp4',
        },
        blob,
      );

      setSavedHere(true);
      void track({ code: 'download.saved', subjectId: lessonId, learnerProfileId });
    } catch (cause) {
      setError(cause instanceof Refusal ? cause.message : words.current.t('player.saveFailed'));
    } finally {
      setSaving(false);
    }
  }

  const video = isVideoRendition(chosen);

  return (
    <div style={{ display: 'grid', gap: '0.5rem' }}>
      <strong dir="auto">{displayName}</strong>

      {video ? (
        <video
          ref={mediaRef as RefObject<HTMLVideoElement>}
          controls={ready}
          playsInline
          preload="metadata"
          src={playback?.id === chosen.id ? playback.url : undefined}
          poster={posterUrl ?? undefined}
          aria-label={displayName}
          style={{
            width: '100%',
            maxHeight: '70vh',
            borderRadius: '0.75rem',
            background: '#101510',
          }}
          {...handlers}
        >
          {t('player.videoUnsupported')}
        </video>
      ) : (
        <audio
          ref={mediaRef as RefObject<HTMLAudioElement>}
          controls={ready}
          preload="metadata"
          src={playback?.id === chosen.id ? playback.url : undefined}
          aria-label={displayName}
          style={{ width: '100%' }}
          {...handlers}
        >
          {t('player.audioUnsupported')}
        </audio>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
        <label className="muted" htmlFor={`quality-${chosen.id}`}>
          {t('player.quality')}
        </label>
        <select
          id={`quality-${chosen.id}`}
          value={profile}
          onChange={(event) => setProfile(event.target.value as RenditionProfile)}
          disabled={loading}
        >
          {choices.map((option) => (
            <option key={option.id} value={option.profile}>
              {QUALITY_KEY[option.profile] ? t(QUALITY_KEY[option.profile] as MessageKey) : PROFILE_LABEL[option.profile]} · {formatByteSize(option.byteSize)}
            </option>
          ))}
        </select>

        {canDownload && !savedHere && (
          <button type="button" className="secondary" onClick={() => void save()} disabled={saving}>
            {saving ? t('player.saving') : t('player.saveDevice')}
          </button>
        )}
        {savedHere && <a className="secondary" href="/downloads">{t('player.onDevice')}</a>}

        {saveNote && (
          <p className="muted" style={{ fontSize: '0.9rem', margin: 0 }}>
            {saveNote}{' '}
            <Link href="/plans">{t('player.seePlus')}</Link>
          </p>
        )}

        {error && (
          <button type="button" className="secondary" onClick={() => void load(chosen.id)}>
            {t('player.tryAgain')}
          </button>
        )}
      </div>

      <PositionStatus position={position} />
      {loading && <p className="muted">{t('player.preparing')}</p>}
      {error && <p className="muted">{error}</p>}
      <p className="muted" style={{ fontSize: '0.85rem' }}>
        {t('player.linksNote')}
        {canDownload ? ` ${t('player.savedNote')}` : ''}
      </p>
    </div>
  );
}
