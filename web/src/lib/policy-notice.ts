/**
 * Telling somebody that a document they agreed to has changed.
 *
 * The owner's rule (2026-11-23): a change of policy is told at the reader's
 * next opening of the application, or by a notification. Nothing is sprung
 * on a page they already have open.
 *
 * So there are three places, and this module is what they share:
 *
 *   * a notice under every page, asked for once each time the application is
 *     opened and never again until the next opening;
 *   * the notifications page, which lists each changed document;
 *   * the document's own page, which already asks for the agreement.
 *
 * **Changed is narrower than waiting.** `my_policy_standing()` counts every
 * document in force that the reader has not agreed to, which for a new
 * account is all of them. That is asked for where they sign up and on their
 * account page. What is told here is the other case: they agreed to a
 * version, and the version in force is no longer that one.
 *
 * Kept free of queries, of the catalogue and of the browser, so the notice,
 * the route and the notifications page read the same thing and it is tested
 * without any of them.
 */

/** One document whose version in force the reader has not agreed to, having agreed to an earlier one. */
export type ChangedPolicy = {
  slug: string;
  /** The owner's title, as written. */
  title: string;
  /** The version now in force. */
  version: number;
  /** The day it took effect, as the database holds it, or null. */
  effectiveAt: string | null;
};

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/u;
const isSlug = (value: unknown): value is string =>
  typeof value === 'string' && value.length <= 60 && SLUG.test(value);
const isVersion = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 1_000_000;

/**
 * The documents that changed since this reader agreed to them, read from
 * what `my_policy_standing()` answered without trusting its shape.
 *
 * Null when the answer is not one: the caller then says nothing, and does
 * not record that it asked.
 */
export function changedSince(standing: unknown): ChangedPolicy[] | null {
  if (!standing || typeof standing !== 'object' || Array.isArray(standing)) return null;
  const read = standing as Record<string, unknown>;
  if (!Array.isArray(read.acceptanceRequired) || !Array.isArray(read.history)) return null;

  const agreedBefore = new Set<string>();
  for (const entry of read.history) {
    if (entry && typeof entry === 'object' && isSlug((entry as Record<string, unknown>).slug)) {
      agreedBefore.add((entry as Record<string, unknown>).slug as string);
    }
  }

  const changed: ChangedPolicy[] = [];
  for (const entry of read.acceptanceRequired) {
    if (!entry || typeof entry !== 'object') continue;
    const row = entry as Record<string, unknown>;
    if (!isSlug(row.slug) || !isVersion(row.versionNumber)) continue;
    // Agreed to the version in force: nothing to tell.
    if (row.acceptedAt !== null && row.acceptedAt !== undefined) continue;
    // Never agreed to any version: waiting, not changed.
    if (!agreedBefore.has(row.slug)) continue;
    changed.push({
      slug: row.slug,
      title: typeof row.title === 'string' ? row.title : row.slug,
      version: row.versionNumber,
      effectiveAt: typeof row.effectiveAt === 'string' ? row.effectiveAt : null,
    });
  }
  return changed;
}

/** What the notice keeps about one document: which one, and which version. */
export type NoticeItem = { slug: string; version: number };

/**
 * What `GET /api/policies` answered, read without trusting its shape.
 *
 * Null for anything that is not a whole answer, a signed-out one included:
 * the notice then shows nothing and asks again on the next page.
 */
export function parseNoticeAnswer(value: unknown): NoticeItem[] | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const read = value as Record<string, unknown>;
  if (read.signedIn !== true || !Array.isArray(read.changed)) return null;
  const items: NoticeItem[] = [];
  for (const entry of read.changed) {
    if (!entry || typeof entry !== 'object') return null;
    const row = entry as Record<string, unknown>;
    if (!isSlug(row.slug) || !isVersion(row.version)) return null;
    items.push({ slug: row.slug, version: row.version });
  }
  return items;
}

/** Where this opening's answer is kept: gone when the tab is closed. */
export const OPENING_KEY = 'ayahspring.policy.opening';
/** Which versions this device has put the notice away for. */
export const DISMISSED_KEY = 'ayahspring.policy.dismissed';
/** Said to the notice by the agreement button, on the page that holds both. */
export const AGREED_EVENT = 'ayahspring:policy-agreed';

const mark = (item: NoticeItem): string => `${item.slug}:${item.version}`;

/** This opening's answer as it is stored. */
export function storeOpening(items: readonly NoticeItem[]): string {
  return JSON.stringify(items.map((item) => ({ slug: item.slug, version: item.version })));
}

/**
 * This opening's answer as it was stored, or null when there is none to
 * believe, which means: ask.
 */
export function readOpening(stored: string | null | undefined): NoticeItem[] | null {
  if (typeof stored !== 'string' || stored === '') return null;
  let value: unknown;
  try {
    value = JSON.parse(stored);
  } catch {
    return null;
  }
  return parseNoticeAnswer({ signedIn: true, changed: value });
}

/** The versions put away on this device, as they were stored. Anything unreadable is none. */
export function readDismissed(stored: string | null | undefined): string[] {
  if (typeof stored !== 'string' || stored === '') return [];
  try {
    const value: unknown = JSON.parse(stored);
    if (!Array.isArray(value)) return [];
    return value.filter((entry): entry is string => typeof entry === 'string' && entry.length <= 80).slice(-60);
  } catch {
    return [];
  }
}

/**
 * The versions put away, after putting these away too.
 *
 * A version, not a document: the next change to the same document is told
 * again. The list is short and the oldest fall off it.
 */
export function storeDismissed(already: readonly string[], items: readonly NoticeItem[]): string {
  const all = [...already];
  for (const item of items) if (!all.includes(mark(item))) all.push(mark(item));
  return JSON.stringify(all.slice(-60));
}

/** What the notice still has to tell: this opening's answer, less what was put away. */
export function stillToTell(items: readonly NoticeItem[], dismissed: readonly string[]): NoticeItem[] {
  return items.filter((item) => !dismissed.includes(mark(item)));
}

/** This opening's answer once one document has been agreed to. */
export function withoutSlug(items: readonly NoticeItem[], slug: string): NoticeItem[] {
  return items.filter((item) => item.slug !== slug);
}

/**
 * Where the notice's link goes: the document when there is one, and the
 * notifications page, which lists each of them, when there are several.
 */
export function noticeHref(items: readonly NoticeItem[]): string {
  return items.length === 1 ? `/policies/${items[0]!.slug}` : '/notifications';
}

/**
 * What somebody ticked on the sign-up page, kept on this device until they
 * are signed in and it can be recorded.
 *
 * `accept_policy()` needs an account, and at the moment the box is ticked
 * there is none yet: with Google the account is made on the way back, with
 * an email address it opens when the link in the message is followed. So the
 * documents and the versions the page named are kept here and recorded on
 * the first page opened signed in (`_shared/policy-notice.tsx`).
 *
 * **Kept for an hour and no longer.** A tick left behind on a shared
 * computer must not become the agreement of whoever signs in there next
 * week. Past the hour nothing is recorded, and the account page asks, as it
 * asks anybody who has not agreed.
 */
export const SIGNUP_KEY = 'ayahspring.policy.signup';
export const SIGNUP_KEPT_MS = 60 * 60 * 1000;

export function storeSignupAgreement(items: NoticeItem[], now: number): string {
  return JSON.stringify({ at: now, items: items.map((item) => ({ slug: item.slug, version: item.version })) });
}

/** What was ticked, or null: nothing kept, not readable, or older than the hour. */
export function readSignupAgreement(raw: string | null, now: number): NoticeItem[] | null {
  if (!raw) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  if (typeof row.at !== 'number' || !Number.isFinite(row.at)) return null;
  // A time in the future is a clock that moved, or not ours: not believed.
  if (row.at > now || now - row.at > SIGNUP_KEPT_MS) return null;
  if (!Array.isArray(row.items) || row.items.length === 0 || row.items.length > 10) return null;
  const items: NoticeItem[] = [];
  for (const entry of row.items) {
    if (!entry || typeof entry !== 'object') return null;
    const one = entry as Record<string, unknown>;
    if (!isSlug(one.slug) || !isVersion(one.version)) return null;
    items.push({ slug: one.slug, version: one.version });
  }
  return items;
}
