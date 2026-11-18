'use client';

import { useEffect, useState, type RefObject } from 'react';

import {
  PLAYBACK_SPEEDS,
  loopLabel,
  shouldLoopBack,
  stepSpeed,
  type Loop,
} from '@/lib/resume';

import { useT } from '@/lib/i18n/client';

import { useMediaPosition } from './use-media-position';
import { PositionStatus } from './position-status';

type PlayerProps = {
  name: string;
  src: string | null;
  enrolmentId: string | null;
  lessonId: string;
  resourceId?: string;
  legacyActorId?: string;
  resumeAt: number | null;
};

/**
 * A recorded lesson, resumed where it was left.
 *
 * The plain `<video>` this replaces started at zero every time. Nothing else
 * about it was wrong, so nothing else about it changed.
 *
 * Its words are the page's: the lesson page hands them to its players in the
 * reader's language, and anywhere else they are English. The name is the
 * teacher's and finds its own direction.
 */
export function VideoWithResume({ name, src, enrolmentId, lessonId, resourceId, legacyActorId, resumeAt }: PlayerProps) {
  const position = useMediaPosition({ enrolmentId, lessonId, resourceId, legacyActorId, resumeAt });
  const { ref, ready, handlers } = position;
  const t = useT();

  return (
    <div style={{ display: 'grid', gap: '0.4rem' }}>
      <strong dir="auto">{name}</strong>
      <video
        ref={ref as RefObject<HTMLVideoElement>}
        controls={ready}
        playsInline
        preload="metadata"
        src={src ?? undefined}
        aria-label={name}
        style={{ width: '100%', maxHeight: '70vh', borderRadius: '0.75rem', background: '#101510' }}
        {...handlers}
      >
        {t('player.videoUnsupported')}
      </video>
      {src && (
        <p className="meta" style={{ margin: 0 }}>
          <a href={src} target="_blank" rel="noreferrer">
            {t('player.openVideo')}
          </a>
        </p>
      )}
      <PositionStatus position={position} />
    </div>
  );
}

/**
 * The recitation player — screen 23.
 *
 * A recitation is not a podcast. The two things a learner does with one are
 * **repeat after it** and **go back to the same passage**, and neither works
 * with a bare `<audio controls>`: the passage is forty seconds in the middle of
 * nine minutes, and finding it again by dragging a scrubber is a skill nobody
 * has on a phone.
 *
 * So this adds exactly three things to the native player, and deliberately
 * nothing else. Slower speeds, because repeating after a reciter needs the
 * reciter to wait; two buttons that mark the passage being repeated; and the
 * saved place, so closing the tab does not lose it.
 *
 * Native controls stay. A custom transport bar would be prettier and would lose
 * the OS media keys, the lock-screen controls and the accessibility that comes
 * free — the platform does not need to reinvent the play button for a Qur'an
 * course to feel considered.
 */
export function AudioPlayer({ name, src, enrolmentId, lessonId, resourceId, legacyActorId, resumeAt }: PlayerProps) {
  const position = useMediaPosition({ enrolmentId, lessonId, resourceId, legacyActorId, resumeAt });
  const { ref, ready, handlers } = position;
  const [speed, setSpeed] = useState(1);
  const [loop, setLoop] = useState<Loop>({ from: null, to: null });
  const t = useT();

  useEffect(() => {
    if (ref.current) ref.current.playbackRate = speed;
  }, [ref, speed]);

  const label = loopLabel(loop, t);
  const at = () => ref.current?.currentTime ?? 0;

  return (
    <div style={{ display: 'grid', gap: '0.5rem' }}>
      <strong dir="auto">{name}</strong>

      <audio
        ref={ref as RefObject<HTMLAudioElement>}
        controls={ready}
        preload="metadata"
        src={src ?? undefined}
        aria-label={name}
        style={{ width: '100%' }}
        onTimeUpdate={() => {
          const element = ref.current;
          if (element && shouldLoopBack(loop, element.currentTime)) {
            element.currentTime = loop.from ?? 0;
          }
          handlers.onTimeUpdate();
        }}
        onPause={handlers.onPause}
        onEnded={handlers.onEnded}
        onLoadedMetadata={handlers.onLoadedMetadata}
      >
        {t('player.audioUnsupported')}
      </audio>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
        <span className="muted" style={{ fontSize: '0.85rem' }}>
          {t('player.speed')}
        </span>
        <button
          type="button"
          className="btn ghost"
          onClick={() => setSpeed(stepSpeed(speed, -1))}
          disabled={speed === PLAYBACK_SPEEDS[0]}
          aria-label={t('player.slower')}
        >
          −
        </button>
        <strong dir="ltr" style={{ minWidth: '3rem', textAlign: 'center' }}>{speed}×</strong>
        <button
          type="button"
          className="btn ghost"
          onClick={() => setSpeed(stepSpeed(speed, 1))}
          disabled={speed === PLAYBACK_SPEEDS[PLAYBACK_SPEEDS.length - 1]}
          aria-label={t('player.faster')}
        >
          +
        </button>

        <span aria-hidden style={{ width: '1px', height: '1.2rem', background: 'var(--border)' }} />

        <button
          type="button"
          className="btn secondary"
          onClick={() => setLoop((current) => ({ ...current, from: Math.floor(at()) }))}
        >
          {t('player.loopFrom')}
        </button>
        <button
          type="button"
          className="btn secondary"
          onClick={() => setLoop((current) => ({ ...current, to: Math.ceil(at()) }))}
        >
          {t('player.loopTo')}
        </button>
        {label && (
          <button type="button" className="btn ghost" onClick={() => setLoop({ from: null, to: null })}>
            {t('player.loopStop')}
          </button>
        )}
      </div>

      {label && (
        <p className="meta" style={{ margin: 0 }}>
          {label}
        </p>
      )}

      {src && (
        <p className="meta" style={{ margin: 0 }}>
          <a href={src} target="_blank" rel="noreferrer">
            {t('player.openAudio')}
          </a>
        </p>
      )}

      <PositionStatus position={position} />
    </div>
  );
}
