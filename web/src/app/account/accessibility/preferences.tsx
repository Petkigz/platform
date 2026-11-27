'use client';

import { useEffect, useState } from 'react';

import {
  CONTRASTS,
  DEFAULTS,
  LETTERS,
  MOTIONS,
  TEXT_SIZES,
  htmlAttributes,
  preferenceCookie,
  preferencesInCookie,
  samePreferences,
  type A11yPreferences,
  type Contrast,
  type Letters,
  type Motion,
  type TextSize,
} from '@/lib/a11y';

type Choice = { label: string; note: string };

/** The words the three controls say, in the language of the page that draws them. */
export type ReadingWords = {
  /** Under the summary before anything was changed on this visit. */
  now: string;
  /** Under the summary once a change was written and read back. */
  saved: string;
  /** The browser took the change and kept nothing. */
  notKept: string;
  reset: string;
  text: { legend: string; choices: Record<TextSize, Choice> };
  contrast: { legend: string; choices: Record<Contrast, Choice> };
  motion: { legend: string; choices: Record<Motion, Choice> };
  letters: { legend: string; choices: Record<Letters, Choice> };
};

/**
 * The control itself.
 *
 * Every change applies to the document immediately — no save button, because a
 * size you cannot see until you press something is a guess. The cookie is
 * written at the same time so the next page renders at the same size, and the
 * boot script reads the same cookie before the first paint.
 *
 * **"Saved" is said only after the cookie is read back.** A browser that
 * refuses cookies accepts the assignment and keeps nothing. The page still
 * changes, because the reader asked for it, and says in place of "saved" that
 * the change will be gone on the next page.
 *
 * It has no words of its own: the page hands them over.
 */
export function ReadingPreferences({ initial, words }: { initial: A11yPreferences; words: ReadingWords }) {
  const [prefs, setPrefs] = useState<A11yPreferences>(initial);
  const [said, setSaid] = useState<'now' | 'saved' | 'notKept'>('now');

  // The server rendered the page from the cookie; the boot script set the
  // attributes. Reading the cookie again here means a change made in another tab
  // is not silently overwritten by this component's first render.
  useEffect(() => {
    setPrefs(preferencesInCookie(document.cookie) ?? DEFAULTS);
  }, []);

  function apply(next: A11yPreferences) {
    setPrefs(next);
    let kept = false;
    try {
      document.cookie = preferenceCookie(next);
      const back = preferencesInCookie(document.cookie);
      kept = back !== null && samePreferences(back, next);
    } catch {
      kept = false;
    }
    const root = document.documentElement;
    for (const key of ['data-text', 'data-contrast', 'data-motion', 'data-letters']) root.removeAttribute(key);
    for (const [key, value] of Object.entries(htmlAttributes(next))) root.setAttribute(key, value);
    setSaid(kept ? 'saved' : 'notKept');
  }

  return (
    <div className="stack" style={{ gap: '1rem' }}>
      <div className="notice" role="status">
        <ul className="reading-now">
          <li>
            <span className="muted">{words.text.legend}</span>{' '}
            <strong>{words.text.choices[prefs.text].label}</strong>
          </li>
          <li>
            <span className="muted">{words.contrast.legend}</span>{' '}
            <strong>{words.contrast.choices[prefs.contrast].label}</strong>
          </li>
          <li>
            <span className="muted">{words.motion.legend}</span>{' '}
            <strong>{words.motion.choices[prefs.motion].label}</strong>
          </li>
          <li>
            <span className="muted">{words.letters.legend}</span>{' '}
            <strong>{words.letters.choices[prefs.letters].label}</strong>
          </li>
        </ul>
        {said !== 'notKept' && (
          <p style={{ margin: '0.5rem 0 0' }}>{said === 'saved' ? words.saved : words.now}</p>
        )}
      </div>
      {said === 'notKept' && (
        <p className="notice error" role="alert" style={{ margin: 0 }}>
          {words.notKept}
        </p>
      )}

      <fieldset className="card reading-choices">
        <legend>{words.text.legend}</legend>
        {TEXT_SIZES.map((value) => (
          <label key={value} className="radio">
            <input
              type="radio"
              name="text"
              value={value}
              checked={prefs.text === value}
              onChange={() => apply({ ...prefs, text: value })}
            />
            <span>
              <strong>{words.text.choices[value].label}</strong>
              <br />
              <span className="muted">{words.text.choices[value].note}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <fieldset className="card reading-choices">
        <legend>{words.contrast.legend}</legend>
        {CONTRASTS.map((value) => (
          <label key={value} className="radio">
            <input
              type="radio"
              name="contrast"
              value={value}
              checked={prefs.contrast === value}
              onChange={() => apply({ ...prefs, contrast: value })}
            />
            <span>
              <strong>{words.contrast.choices[value].label}</strong>
              <br />
              <span className="muted">{words.contrast.choices[value].note}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <fieldset className="card reading-choices">
        <legend>{words.motion.legend}</legend>
        {MOTIONS.map((value) => (
          <label key={value} className="radio">
            <input
              type="radio"
              name="motion"
              value={value}
              checked={prefs.motion === value}
              onChange={() => apply({ ...prefs, motion: value })}
            />
            <span>
              <strong>{words.motion.choices[value].label}</strong>
              <br />
              <span className="muted">{words.motion.choices[value].note}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <fieldset className="card reading-choices">
        <legend>{words.letters.legend}</legend>
        {LETTERS.map((value) => (
          <label key={value} className="radio">
            <input
              type="radio"
              name="letters"
              value={value}
              checked={prefs.letters === value}
              onChange={() => apply({ ...prefs, letters: value })}
            />
            <span>
              <strong>{words.letters.choices[value].label}</strong>
              <br />
              <span className="muted">{words.letters.choices[value].note}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <div className="page-actions">
        <button type="button" className="btn secondary" onClick={() => apply(DEFAULTS)}>
          {words.reset}
        </button>
      </div>
    </div>
  );
}
