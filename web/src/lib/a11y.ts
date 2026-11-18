/**
 * Reading preferences, as the browser applies them.
 *
 * Three settings, and no more: text size, contrast and motion. They are a
 * cookie rather than database rows because they describe a
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

/**
 * The choices, in the order the page lists them.
 *
 * Only the values live here. What each one is called, and the sentence under
 * it, come from the catalogue in the reader's language and are handed to the
 * control by the page: this file is imported by a client component, which
 * must not carry sentences of its own.
 */
export const TEXT_SIZES: readonly TextSize[] = ['normal', 'large', 'larger'];
export const CONTRASTS: readonly Contrast[] = ['normal', 'high'];
export const MOTIONS: readonly Motion[] = ['system', 'reduce'];

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

/**
 * The boot script, as a string for an inline `<script>`.
 *
 * It reads the same cookie the server does and sets the same attributes, so a
 * page rendered before the cookie was set and a page rendered after it agree.
 * Nothing here trusts the value: each one is checked against its own list.
 */
export const A11Y_BOOT = `(function(){try{var m=document.cookie.match(/(?:^|; )${A11Y_COOKIE}=([^;]*)/);if(!m)return;var p=decodeURIComponent(m[1]).split('.');if(p[0]!=='v1')return;var h=document.documentElement;if(p[1]==='large'||p[1]==='larger')h.setAttribute('data-text',p[1]);if(p[2]==='high')h.setAttribute('data-contrast','high');if(p[3]==='reduce')h.setAttribute('data-motion','reduce');}catch(e){}})();`;

/**
 * What a browser's cookie string says the settings are, or `null` when the
 * cookie is not there.
 *
 * `null` matters: a browser that refuses cookies accepts the assignment and
 * keeps nothing, and the page must not say "saved" to a reader whose choice
 * will be gone on the next page.
 */
export function preferencesInCookie(cookie: string | null | undefined): A11yPreferences | null {
  const raw = new RegExp(`(?:^|; )${A11Y_COOKIE}=([^;]*)`).exec(cookie ?? '')?.[1];
  if (raw === undefined) return null;
  try {
    return parsePreferences(decodeURIComponent(raw));
  } catch {
    return null;
  }
}

/** Whether two sets of settings are the same three choices. */
export function samePreferences(a: A11yPreferences, b: A11yPreferences): boolean {
  return a.text === b.text && a.contrast === b.contrast && a.motion === b.motion;
}

/**
 * Whether this reader asked for less motion: on the reading page, or through
 * their device.
 *
 * The stylesheet turns transitions off for both. A script that scrolls
 * (`scrollIntoView({ behavior: 'smooth' })`) is not reached by a stylesheet,
 * so it asks here first.
 */
export function wantsLessMotion(): boolean {
  if (typeof document === 'undefined') return false;
  if (document.documentElement.getAttribute('data-motion') === 'reduce') return true;
  return typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Writing the cookie from the browser: a year, path-wide, same site. */
export function preferenceCookie(prefs: A11yPreferences): string {
  const value = encodeURIComponent(encodePreferences(prefs));
  return `${A11Y_COOKIE}=${value}; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax`;
}
