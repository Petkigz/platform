'use client';

import { useEffect, useState } from 'react';

import {
  CONTRAST_CHOICES,
  DEFAULTS,
  MOTION_CHOICES,
  TEXT_CHOICES,
  describePreferences,
  htmlAttributes,
  parsePreferences,
  preferenceCookie,
  type A11yPreferences,
  type Contrast,
  type Motion,
  type TextSize,
} from '@/lib/a11y';

/**
 * The control itself.
 *
 * Every change applies to the document immediately — no save button, because a
 * size you cannot see until you press something is a guess. The cookie is
 * written at the same time so the next page renders at the same size, and the
 * boot script reads the same cookie before the first paint.
 *
 * It says, in the page's own words, that this is this browser and not the
 * account: size is a property of the screen a person is sitting at.
 */
export function ReadingPreferences({ initial }: { initial: A11yPreferences }) {
  const [prefs, setPrefs] = useState<A11yPreferences>(initial);
  const [saved, setSaved] = useState(false);

  // The server rendered the page from the cookie; the boot script set the
  // attributes. Reading the cookie again here means a change made in another tab
  // is not silently overwritten by this component's first render.
  useEffect(() => {
    setPrefs(parsePreferences(document.cookie.match(/ayahspring_a11y=([^;]*)/)?.[1] ?? null));
  }, []);

  function apply(next: A11yPreferences) {
    setPrefs(next);
    document.cookie = preferenceCookie(next);
    const root = document.documentElement;
    for (const key of ['data-text', 'data-contrast', 'data-motion']) root.removeAttribute(key);
    for (const [key, value] of Object.entries(htmlAttributes(next))) root.setAttribute(key, value);
    setSaved(true);
  }

  return (
    <div className="stack">
      <div className="notice" role="status">
        <strong>{describePreferences(prefs)}.</strong>{' '}
        {saved ? 'Saved for this browser.' : 'These are your settings in this browser.'}
      </div>

      <fieldset className="card" style={{ margin: 0 }}>
        <legend>
          <strong>Text size</strong>
        </legend>
        {TEXT_CHOICES.map((choice) => (
          <label key={choice.value} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
            <input
              type="radio"
              name="text"
              value={choice.value}
              checked={prefs.text === choice.value}
              onChange={() => apply({ ...prefs, text: choice.value as TextSize })}
            />
            <span>
              <strong>{choice.label}</strong>
              <br />
              <span className="muted">{choice.note}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <fieldset className="card" style={{ margin: 0 }}>
        <legend>
          <strong>Contrast</strong>
        </legend>
        {CONTRAST_CHOICES.map((choice) => (
          <label key={choice.value} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
            <input
              type="radio"
              name="contrast"
              value={choice.value}
              checked={prefs.contrast === choice.value}
              onChange={() => apply({ ...prefs, contrast: choice.value as Contrast })}
            />
            <span>
              <strong>{choice.label}</strong>
              <br />
              <span className="muted">{choice.note}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <fieldset className="card" style={{ margin: 0 }}>
        <legend>
          <strong>Motion</strong>
        </legend>
        {MOTION_CHOICES.map((choice) => (
          <label key={choice.value} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
            <input
              type="radio"
              name="motion"
              value={choice.value}
              checked={prefs.motion === choice.value}
              onChange={() => apply({ ...prefs, motion: choice.value as Motion })}
            />
            <span>
              <strong>{choice.label}</strong>
              <br />
              <span className="muted">{choice.note}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <p>
        <button type="button" className="btn secondary" onClick={() => apply(DEFAULTS)}>
          Back to the defaults
        </button>
      </p>
    </div>
  );
}
