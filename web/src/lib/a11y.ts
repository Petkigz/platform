/**
 * Reading preferences, as the browser applies them.
 *
 * Three settings, and no more: text size, contrast and motion. They are cookie
 * and local-storage values rather than database rows because they describe a
 * *screen*, not a person — a phone and a desktop want different sizes, and a
 * shared machine should not inherit somebody else's choice. The page says that
 * in as many words so nobody expects it to follow them to another device.
 *
 * The boot script in the root layout applies these before the first paint, so a
 * person who needs larger text does not see a flash of the small one.
 */

export const A11Y_COOKIE = 'ayahspring_a11y';

export type TextSize = 'normal' | 'large' | 'larger';
export type Contrast = 'normal' | 'high';
export type Motion = 'system' | 'reduce';

export type A11yPreferences = {
  text: TextSize;
  contrast: Contrast;
  motion: Motion;
};

export const DEFAULTS: A11yPreferences = { text: 'normal', contrast: 'normal', motion: 'system' };

export const TEXT_CHOICES: { value: TextSize; label: string; note: string }[] = [
  { value: 'normal', label: 'Normal', note: 'The size everything else on the platform uses.' },
  { value: 'large', label: 'Larger', note: 'About one step up — headings and body text together.' },
  {
    value: 'larger',
    label: 'Largest',
    note: 'Two steps up. Layouts stay one column, so nothing is pushed off the screen.',
  },
];

export const CONTRAST_CHOICES: { value: Contrast; label: string; note: string }[] = [
  {
    value: 'normal',
    label: 'Normal',
    note: 'White and green, at the contrast this platform was designed for.',
  },
  {
    value: 'high',
    label: 'Stronger outlines',
    note: 'Darker text, heavier borders and no pale grey. Useful in bright light and on cheap screens.',
  },
];

export const MOTION_CHOICES: { value: Motion; label: string; note: string }[] = [
  {
    value: 'system',
    label: 'Follow my device',
    note: 'If your device asks for less motion, the platform already listens to it.',
  },
  {
    value: 'reduce',
    label: 'Always reduce motion',
    note: 'Turns off transitions and smooth scrolling even when the device does not ask.',
  },
];

function textSize(value: unknown): TextSize {
  return value === 'large' || value === 'larger' ? value : 'normal';
}

function contrast(value: unknown): Contrast {
  return value === 'high' ? 'high' : 'normal';
}

function motion(value: unknown): Motion {
  return value === 'reduce' ? 'reduce' : 'system';
}

/** A cookie value is a compact, versioned string rather than JSON. */
export function encodePreferences(prefs: A11yPreferences): string {
  return `v1.${prefs.text}.${prefs.contrast}.${prefs.motion}`;
}

export function parsePreferences(raw: string | null | undefined): A11yPreferences {
  if (!raw) return DEFAULTS;
  const parts = raw.split('.');
  if (parts[0] !== 'v1') return DEFAULTS;
  return {
    text: textSize(parts[1]),
    contrast: contrast(parts[2]),
    motion: motion(parts[3]),
  };
}

/**
 * The attributes the `<html>` element carries. Kept as a plain map so the server
 * can render them and the boot script can set the same ones without a second
 * definition drifting away from the first.
 */
export function htmlAttributes(prefs: A11yPreferences): Record<string, string> {
  const attributes: Record<string, string> = {};
  if (prefs.text !== 'normal') attributes['data-text'] = prefs.text;
  if (prefs.contrast === 'high') attributes['data-contrast'] = 'high';
  if (prefs.motion === 'reduce') attributes['data-motion'] = 'reduce';
  return attributes;
}

/** Whether anything differs from the platform's own defaults. */
export function isDefault(prefs: A11yPreferences): boolean {
  return prefs.text === DEFAULTS.text
    && prefs.contrast === DEFAULTS.contrast
    && prefs.motion === DEFAULTS.motion;
}

/** A sentence for the account page: what is on right now. */
export function describePreferences(prefs: A11yPreferences): string {
  const bits: string[] = [];
  bits.push(prefs.text === 'normal' ? 'Normal text size' : prefs.text === 'large' ? 'Larger text' : 'Largest text');
  bits.push(prefs.contrast === 'high' ? 'stronger outlines' : 'normal contrast');
  bits.push(
    prefs.motion === 'reduce'
      ? 'motion always reduced'
      : 'motion follows your device',
  );
  return bits.join(', ');
}

/**
 * The boot script, as a string for an inline `<script>`.
 *
 * It reads the same cookie the server does and sets the same attributes, so a
 * page rendered before the cookie was set and a page rendered after it agree.
 * Nothing here trusts the value: each one is checked against its own list.
 */
export const A11Y_BOOT = `(function(){try{var m=document.cookie.match(/(?:^|; )${A11Y_COOKIE}=([^;]*)/);if(!m)return;var p=decodeURIComponent(m[1]).split('.');if(p[0]!=='v1')return;var h=document.documentElement;if(p[1]==='large'||p[1]==='larger')h.setAttribute('data-text',p[1]);if(p[2]==='high')h.setAttribute('data-contrast','high');if(p[3]==='reduce')h.setAttribute('data-motion','reduce');}catch(e){}})();`;

/** Writing the cookie from the browser: a year, path-wide, same site. */
export function preferenceCookie(prefs: A11yPreferences): string {
  const value = encodeURIComponent(encodePreferences(prefs));
  return `${A11Y_COOKIE}=${value}; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax`;
}
