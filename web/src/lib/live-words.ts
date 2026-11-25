/**
 * Live classes, said in the reader's language.
 *
 * The card on `/learn` and the page of one class (`/live/[sessionId]`) were
 * English for everybody until 2026-11-25. The sentences are the `live.` part;
 * three things are written by `Intl` instead, because they are numbers and a
 * clock and every language already has its own way with them:
 *
 * - **when a class is**: the weekday, the day and the hour as the teacher set
 *   them, with the zone named, and the reader's own hour beside it when that
 *   is a different zone. A class set in Kampala at 19:00 is 19:00 there; a
 *   learner in London needs both numbers.
 * - **how long it lasts**: "45 minutes", "2 hours, 30 minutes".
 * - **the hour somebody arrived**, on the teacher's roll.
 *
 * `lib/live.ts` keeps its English (`describeWhen`, `describeReason`,
 * `describeLength`) for the teacher's pages, which are staff pages.
 *
 * Server only: it reads the catalogues. The door and the roll's button are
 * client components and are handed their words (`DoorWords`, `RollWords` in `live-door.ts`).
 */
import { translator, type LocaleCode, type MessageKey } from './i18n/index.ts';
import type { DoorWords, RollWords } from './live-door.ts';

/** Why a door is shut, by the name the database gives the reason. */
const REASON_KEY: Record<string, MessageKey> = {
  not_open_yet: 'live.rNotOpenYet',
  closed: 'live.rFinished',
  ended: 'live.rFinished',
  cancelled: 'live.rCancelled',
  not_enrolled: 'live.rNotEnrolled',
  no_room_host: 'live.rNoHost',
  unknown_session: 'live.rGone',
};

export function liveWords(code: LocaleCode) {
  const t = translator(code);

  const stamp = (iso: string, zone: string): string | null => {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return null;
    const options: Intl.DateTimeFormatOptions = {
      timeZone: zone,
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    };
    try {
      return new Intl.DateTimeFormat(code, options).format(date);
    } catch {
      // A zone the runtime does not know. The caller falls back.
      return null;
    }
  };

  /** "Tue 3 Nov, 19:00 (Africa/Kampala) · Tue 3 Nov, 16:00 your time". */
  const when = (startsAt: string, zone: string, readerZone?: string | null): string => {
    const scheduled = stamp(startsAt, zone) ?? startsAt.slice(0, 16).replace('T', ' ');
    const local = readerZone && readerZone !== zone ? stamp(startsAt, readerZone) : null;
    const set = `${scheduled} (${zone})`;
    return local ? `${set} · ${t('live.yourTime', { time: local })}` : set;
  };

  const unit = (value: number, name: 'minute' | 'hour'): string => {
    try {
      return new Intl.NumberFormat(code, { style: 'unit', unit: name, unitDisplay: 'long' }).format(value);
    } catch {
      return `${value} ${name === 'minute' ? 'min' : 'h'}`;
    }
  };

  /** "45 minutes", "1 hour", "2 hours, 30 minutes". */
  const minutes = (total: number): string => {
    const whole = Math.max(0, Math.round(total));
    if (whole < 60) return unit(whole, 'minute');
    const hours = Math.floor(whole / 60);
    const rest = whole % 60;
    if (rest === 0) return unit(hours, 'hour');
    const parts = [unit(hours, 'hour'), unit(rest, 'minute')];
    try {
      return new Intl.ListFormat(code, { type: 'unit', style: 'long' }).format(parts);
    } catch {
      return parts.join(' ');
    }
  };

  const length = (startsAt: string, endsAt: string): string =>
    minutes((new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 60000);

  /** The hour alone, in a zone: when somebody arrived. */
  const clock = (iso: string, zone: string): string => {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    const options: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hour12: false };
    try {
      return new Intl.DateTimeFormat(code, { ...options, timeZone: zone }).format(date);
    } catch {
      return new Intl.DateTimeFormat(code, { ...options, timeZone: 'UTC' }).format(date);
    }
  };

  /** Why the door is shut, or null when the database gave no reason. */
  const reason = (name: string | null | undefined): string | null =>
    name ? t(REASON_KEY[name] ?? 'live.rShut') : null;

  const door: DoorWords = {
    enter: t('live.enter'),
    opening: t('live.opening'),
    failed: t('live.joinFailed'),
    shut: t('live.rShut'),
    reasons: Object.fromEntries(Object.entries(REASON_KEY).map(([name, key]) => [name, t(key)])),
  };

  const roll: RollWords = {
    mark: t('live.markLeft'),
    left: t('live.left'),
    failed: t('live.markFailed'),
  };

  return { t, when, minutes, length, clock, reason, door, roll };
}
