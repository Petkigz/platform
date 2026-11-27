'use client';

import { useEffect, useRef, useState } from 'react';

import { pickVoice, speakable } from '@/lib/read-aloud';

/** The four things the button says, handed over by the page in the reader's language. */
export type ReadAloudWords = {
  read: string;
  stop: string;
  /** Whose voice it is, and that a verse is left out. Always shown under the button. */
  note: string;
  noVoice: string;
};

/**
 * Reads a lesson's words in the device's own voice.
 *
 * Built 2026-11-27 with what a browser already has (`speechSynthesis`): no
 * provider, and the words are sent nowhere. See `lib/read-aloud.ts` for what
 * is read and what is left out.
 *
 * It draws nothing on the server and nothing in a browser that cannot speak,
 * so a reader is never shown a button that does nothing. It draws nothing
 * when the course has no language either: without one there is no way to
 * choose a voice, and a voice of another language spells letters out.
 *
 * Two of these can be on a page (the description and the transcript). Starting
 * one stops the other, because a device has one voice; each learns that it
 * was stopped from the browser and goes quiet without stopping the new one.
 *
 * **Not yet heard in a browser by anybody.** The parts that decide what is
 * read are tested (`read-aloud.test.ts`); the speaking itself is the
 * browser's.
 */
export function ReadAloud({ text, language, words }: { text: string; language: string | null; words: ReadAloudWords }) {
  const [able, setAble] = useState(false);
  const [state, setState] = useState<'idle' | 'reading' | 'noVoice'>('idle');
  // Which press this is. A press that is no longer the latest does nothing more.
  const run = useRef(0);

  useEffect(() => {
    setAble(
      typeof window !== 'undefined' &&
        'speechSynthesis' in window &&
        typeof window.SpeechSynthesisUtterance === 'function',
    );
    const mine = run;
    return () => {
      mine.current += 1;
      try {
        window.speechSynthesis?.cancel();
      } catch {
        // A browser that cannot stop has nothing to stop.
      }
    };
  }, []);

  /** The device's voices. Some browsers have none until they have been asked once. */
  function deviceVoices(): Promise<SpeechSynthesisVoice[]> {
    const synth = window.speechSynthesis;
    const now = synth.getVoices();
    if (now.length > 0) return Promise.resolve(now);
    return new Promise((resolve) => {
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        synth.removeEventListener('voiceschanged', done);
        resolve(synth.getVoices());
      };
      synth.addEventListener('voiceschanged', done);
      window.setTimeout(done, 1500);
    });
  }

  async function start() {
    const mine = ++run.current;
    try {
      const synth = window.speechSynthesis;
      synth.cancel();
      const { parts } = speakable(text);
      const voices = await deviceVoices();
      if (mine !== run.current) return;
      const voice = voices[pickVoice(voices, language)];
      if (!voice) {
        setState('noVoice');
        return;
      }
      if (parts.length === 0) {
        // Nothing but verses: the note under the button already says why.
        setState('idle');
        return;
      }
      setState('reading');
      let left = parts.length;
      const finished = () => {
        if (mine !== run.current) return;
        left -= 1;
        if (left <= 0) setState('idle');
      };
      for (const part of parts) {
        const utterance = new window.SpeechSynthesisUtterance(part);
        utterance.voice = voice;
        utterance.lang = voice.lang;
        utterance.onend = finished;
        utterance.onerror = (event) => {
          if (mine !== run.current) return;
          if (event.error === 'interrupted' || event.error === 'canceled') {
            // Something else took the voice. Go quiet; do not stop the newcomer.
            run.current += 1;
            setState('idle');
            return;
          }
          finished();
        };
        synth.speak(utterance);
      }
    } catch {
      if (mine === run.current) setState('noVoice');
    }
  }

  function stop() {
    run.current += 1;
    try {
      window.speechSynthesis.cancel();
    } catch {
      // Nothing to stop.
    }
    setState('idle');
  }

  if (!able || !language) return null;

  return (
    <div className="read-aloud">
      <button
        type="button"
        className="btn ghost tiny"
        aria-pressed={state === 'reading'}
        onClick={state === 'reading' ? stop : () => void start()}
      >
        {state === 'reading' ? words.stop : words.read}
      </button>
      <p className="muted" style={{ margin: '0.35rem 0 0', fontSize: '0.875rem' }}>
        {words.note}
      </p>
      {state === 'noVoice' && (
        <p className="notice warn" role="status" style={{ margin: '0.5rem 0 0' }}>
          {words.noVoice}
        </p>
      )}
    </div>
  );
}
