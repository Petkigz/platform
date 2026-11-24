/**
 * What the notification centre may show, as rules a test can hold.
 *
 * `/notifications` reads `my_notifications()`: the messages kept for the
 * caller and the reminders worked out for them. The page used to print both
 * as they came, in English for every reader, follow whatever address a row
 * carried, and answer with an error page when the reply did not arrive.
 *
 * This file is the part of the new page with a rule in it. Kept free of
 * queries and of the catalogue, so a test and a client island can import it.
 *
 * **A kept message, said from what it is made of.** Since the migration
 * `20261281148000_notification_facts.sql` a message arrives with `facts`:
 * the amount, the reference, the title, the moment, somebody's reason, the
 * answer to an application, each by name. `factsOf` reads them, and the page says the sentence in the
 * reader's language. A message written before that has none, and one whose
 * facts are not all there is treated the same way: it is shown as the
 * English it was written in, named in the reader's language above. Guessing
 * an amount out of a sentence would be inventing a record.
 *
 * A reason is what a person typed or what a program reported. It is shown
 * as written, in every language.
 */

import { describeKind, type NotificationKind } from './notification-prefs.ts';

export type CentreMessage = {
  id: string;
  /** The kind when this code has a name for it, or null: the stored word is never printed. */
  kind: NotificationKind | null;
  title: string;
  body: string;
  /** What the message is made of, or null: then `title` and `body`, which are English, are the message. */
  facts: MessageFacts | null;
  href: string | null;
  createdAt: string;
  read: boolean;
};

const text = (value: unknown): string | null => (typeof value === 'string' && value.trim() ? value : null);
const moment = (value: unknown): string | null => (typeof value === 'string' && !Number.isNaN(Date.parse(value)) ? value : null);

/** What each kind of kept message is made of. The names are the database's. */
export type MessageFacts =
  | { kind: 'payout_paid'; amountMinor: string; currency: string; reference: string }
  | { kind: 'payout_failed'; amountMinor: string; currency: string; reason: string }
  | { kind: 'payout_cancelled'; amountMinor: string; currency: string }
  | { kind: 'media_encode_failed'; part: 'uploader' | 'author'; name: string | null; reason: string }
  | { kind: 'live_cancelled'; title: string; startsAt: string; zone: string; reason: string }
  | { kind: 'live_recording_ready'; title: string; startsAt: string; zone: string }
  /** An answer to an application to teach. What the owner wrote is not in it: it is on the application. */
  | { kind: 'teaching_answered'; outcome: 'approved' | 'declined' };

const AMOUNT = /^(?:0|[1-9][0-9]{0,17})$/u;
const CURRENCY = /^[A-Z]{3}$/u;
/** Something a person or a program wrote: there, not only spaces, and not longer than the column that holds it. */
const written = (value: unknown, most: number): string | null =>
  typeof value === 'string' && value.trim() !== '' && value.length <= most ? value.trim() : null;
/** A time zone this runtime can say a moment in. */
function zoneOf(value: unknown): string | null {
  if (typeof value !== 'string' || !value || value.length > 64) return null;
  try {
    new Intl.DateTimeFormat('en', { timeZone: value });
    return value;
  } catch {
    return null;
  }
}

/**
 * What a kept message is made of, or null when it cannot be said from it.
 *
 * Null is not an error. It is every message written before facts were
 * kept, and any message whose facts are not whole: a kind this code has no
 * sentence for, an amount that is not a whole number of minor units, a
 * currency that is not three capital letters, a moment that is not one, a
 * zone the runtime does not know. The page then shows the stored English.
 * Half a set of facts is never said: "Amount:" with nothing after it tells
 * a teacher less than the sentence the database wrote.
 */
export function factsOf(kind: unknown, value: unknown): MessageFacts | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const f = value as Record<string, unknown>;
  const money = () => {
    const amountMinor = typeof f.amountMinor === 'string' && AMOUNT.test(f.amountMinor) ? f.amountMinor : null;
    const currency = typeof f.currency === 'string' && CURRENCY.test(f.currency) ? f.currency : null;
    return amountMinor !== null && currency !== null ? { amountMinor, currency } : null;
  };
  const session = () => {
    const title = written(f.title, 300);
    const startsAt = moment(f.startsAt);
    const zone = zoneOf(f.zone);
    return title !== null && startsAt !== null && zone !== null ? { title, startsAt, zone } : null;
  };
  switch (kind) {
    case 'payout_paid': {
      const m = money();
      const reference = written(f.reference, 300);
      return m && reference !== null ? { kind, ...m, reference } : null;
    }
    case 'payout_failed': {
      const m = money();
      const reason = written(f.reason, 1000);
      return m && reason !== null ? { kind, ...m, reason } : null;
    }
    case 'payout_cancelled': {
      const m = money();
      return m ? { kind, ...m } : null;
    }
    case 'media_encode_failed': {
      const reason = written(f.reason, 1000);
      if (f.part !== 'uploader' && f.part !== 'author') return null;
      // A file with no name is said without one; a name that is not text is not a name.
      if (f.name !== null && f.name !== undefined && written(f.name, 300) === null) return null;
      return reason !== null ? { kind, part: f.part, name: written(f.name, 300), reason } : null;
    }
    case 'live_cancelled': {
      const s = session();
      const reason = written(f.reason, 1000);
      return s && reason !== null ? { kind, ...s, reason } : null;
    }
    case 'live_recording_ready': {
      const s = session();
      return s ? { kind, ...s } : null;
    }
    case 'teaching_answered':
      // One of the two answers there are. Anything else is shown as the stored English.
      return f.outcome === 'approved' || f.outcome === 'declined' ? { kind, outcome: f.outcome } : null;
    default:
      return null;
  }
}

/** The two things `my_notifications()` works out rather than stores. */
export const REMINDER_KINDS = ['class_starting', 'plan_renewing'] as const;
export type ReminderKind = (typeof REMINDER_KINDS)[number];

export type CentreReminder = {
  kind: ReminderKind | null;
  title: string;
  body: string;
  href: string | null;
  happensAt: string;
};

export type Centre = {
  unreadCount: number;
  reminders: CentreReminder[];
  recent: CentreMessage[];
};

/**
 * An address inside this site, or null.
 *
 * The table's own check is `href ~ '^/'`, which also lets through `//host`
 * (another site, to a browser) and `/\host` (the same, to some). Every
 * writer today passes a path it built itself, so no such row exists; the
 * page still does not follow one, because the rule it relies on is the one
 * written here and not the one it hopes the table has.
 */
export function internalHrefOf(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return null;
  // A control character or a space has no place in a path a function built.
  if (/[\u0000-\u0020\u007f]/u.test(value)) return null;
  return value;
}


/**
 * The centre, or null when the reply cannot be trusted.
 *
 * Null is "not read". A list that left out a message it could not make
 * sense of would show a person fewer messages than they have and say
 * nothing about it, so one bad row makes the whole reply unread, and the
 * page says so.
 */
export function centreOf(value: unknown): Centre | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  if (!Array.isArray(raw.recent) || !Array.isArray(raw.reminders)) return null;
  if (typeof raw.unreadCount !== 'number' || !Number.isSafeInteger(raw.unreadCount) || raw.unreadCount < 0) return null;

  const recent: CentreMessage[] = [];
  for (const entry of raw.recent) {
    if (!entry || typeof entry !== 'object') return null;
    const m = entry as Record<string, unknown>;
    const title = text(m.title);
    const body = text(m.body);
    const createdAt = moment(m.createdAt);
    if (typeof m.id !== 'string' || !m.id || title === null || body === null || createdAt === null) return null;
    if (m.readAt !== null && m.readAt !== undefined && moment(m.readAt) === null) return null;
    recent.push({
      id: m.id,
      kind: describeKind(m.kind)?.kind ?? null,
      title,
      body,
      facts: factsOf(m.kind, m.facts),
      href: internalHrefOf(m.href),
      createdAt,
      read: typeof m.readAt === 'string',
    });
  }

  const reminders: CentreReminder[] = [];
  for (const entry of raw.reminders) {
    if (!entry || typeof entry !== 'object') return null;
    const r = entry as Record<string, unknown>;
    const title = text(r.title);
    const body = text(r.body);
    const happensAt = moment(r.happensAt);
    if (title === null || body === null || happensAt === null) return null;
    reminders.push({
      kind: (REMINDER_KINDS as readonly string[]).includes(r.kind as string) ? (r.kind as ReminderKind) : null,
      title,
      body,
      href: internalHrefOf(r.href),
      happensAt,
    });
  }

  return { unreadCount: raw.unreadCount, reminders, recent };
}

/**
 * A plan's name out of the title of its reminder, or null.
 *
 * `my_notifications()` writes `<plan> renews soon` and sends the name no
 * other way. The page says its own sentence about a renewal and needs only
 * the name, so it takes the title apart on the words the function puts
 * after it. A test reads those words out of the migration.
 */
export const PLAN_REMINDER_SUFFIX = ' renews soon';
export function planNameOf(title: string): string | null {
  if (!title.endsWith(PLAN_REMINDER_SUFFIX)) return null;
  const name = title.slice(0, -PLAN_REMINDER_SUFFIX.length).trim();
  return name || null;
}

/** The ids a "mark as read" request may name: some, all of them ids, and not more than a page holds. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
export const MARK_READ_MOST = 100;

/**
 * The ids in a request to mark messages read, or null when it is not one.
 *
 * `mark_notifications_read(null)` marks **every** message the caller has.
 * The route used to send null whenever the body named no usable ids, so a
 * request with `ids: "x"`, or with nothing in it, silently marked everything
 * read. Nothing on the site asks for that. A request now has to name what
 * it means, and one that does not is refused.
 */
export function markReadIdsOf(body: unknown): string[] | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const ids = (body as Record<string, unknown>).ids;
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > MARK_READ_MOST) return null;
  if (!ids.every((id) => typeof id === 'string' && UUID.test(id))) return null;
  return [...new Set(ids as string[])];
}
