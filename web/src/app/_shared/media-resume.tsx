'use client';

import { useEffect, useState, type RefObject } from 'react';

import {
  PLAYBACK_SPEEDS,
  loopLabel,
  shouldLoopBack,
  stepSpeed,
  type Loop,
} from '@/lib/resume';

import { useMediaPosition } from './use-media-position';

type PlayerProps = {
  name: string;
  src: string | null;
  enrolmentId: string | null;
  lessonId: string;
  resumeAt: number | null;
};

function SaveNote({ notice, error }: { notice: string | null; error: string | null }) {
  if (!notice && !error) return null;
  return (
    <p className="meta" role="status" style={{ margin: 0 }}>
      {error ? <span className="danger">{error}</span> : notice}
    </p>
  );
}

/**
 * A recorded lesson, resumed where it was left.
 *
 * The plain `<video>` this replaces started at zero every time. Nothing else
 * about it was wrong, so nothing else about it changed.
 */
export function VideoWithResume({ name, src, enrolmentId, lessonId, resumeAt }: PlayerProps) {
  const { ref, notice, saveError, handlers } = useMediaPosition({ enrolmentId, lessonId, resumeAt });

  return (
    <div style={{ display: 'grid', gap: '0.4rem' }}>
      <strong>{name}</strong>
      <video
        ref={ref as RefObject<HTMLVideoElement>}
        controls
        playsInline
        preload="metadata"
        src={src ?? undefined}
        aria-label={name}
        style={{ width: '100%', maxHeight: '70vh', borderRadius: '0.75rem', background: '#101510' }}
        {...handlers}
      >
        Your browser cannot play this video.
      </video>
      {src && (
        <p className="meta" style={{ margin: 0 }}>
          <a href={src} target="_blank" rel="noreferrer">
            Open the video directly
          </a>
        </p>
      )}
      <SaveNote notice={notice} error={saveError} />
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
export function AudioPlayer({ name, src, enrolmentId, lessonId, resumeAt }: PlayerProps) {
  const { ref, notice, saveError, handlers } = useMediaPosition({ enrolmentId, lessonId, resumeAt });
  const [speed, setSpeed] = useState(1);
  const [loop, setLoop] = useState<Loop>({ from: null, to: null });

  useEffect(() => {
    if (ref.current) ref.current.playbackRate = speed;
  }, [ref, speed]);

  const label = loopLabel(loop);
  const at = () => ref.current?.currentTime ?? 0;

  return (
    <div style={{ display: 'grid', gap: '0.5rem' }}>
      <strong>{name}</strong>

      <audio
        ref={ref as RefObject<HTMLAudioElement>}
        controls
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
        Your browser cannot play this audio.
      </audio>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
        <span className="muted" style={{ fontSize: '0.85rem' }}>
          Speed
        </span>
        <button
          type="button"
          className="btn ghost"
          onClick={() => setSpeed(stepSpeed(speed, -1))}
          disabled={speed === PLAYBACK_SPEEDS[0]}
          aria-label="Slower"
        >
          −
        </button>
        <strong style={{ minWidth: '3rem', textAlign: 'center' }}>{speed}×</strong>
        <button
          type="button"
          className="btn ghost"
          onClick={() => setSpeed(stepSpeed(speed, 1))}
          disabled={speed === PLAYBACK_SPEEDS[PLAYBACK_SPEEDS.length - 1]}
          aria-label="Faster"
        >
          +
        </button>

        <span aria-hidden style={{ width: '1px', height: '1.2rem', background: 'var(--border)' }} />

        <button
          type="button"
          className="btn secondary"
          onClick={() => setLoop((current) => ({ ...current, from: Math.floor(at()) }))}
        >
          Repeat from here
        </button>
        <button
          type="button"
          className="btn secondary"
          onClick={() => setLoop((current) => ({ ...current, to: Math.ceil(at()) }))}
        >
          to here
        </button>
        {label && (
          <button type="button" className="btn ghost" onClick={() => setLoop({ from: null, to: null })}>
            Stop repeating
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
            Open the audio directly
          </a>
        </p>
      )}

      <SaveNote notice={notice} error={saveError} />
    </div>
  );
}
