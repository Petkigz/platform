/**
 * What the invitation screens were answered with, as names, and what a reward
 * is at a given moment.
 *
 * `/account/referrals` and `/referral/<code>` used to be written in English
 * for every reader, with a reward's date in British English and no zone, and
 * `/api/account/referrals` answered a refusal with a sentence. Nothing here is
 * a sentence a reader sees: these are the names the screens say in their own
 * words (`messages/refer.ts`).
 *
 * Kept apart from `referrals.ts`, whose English is still read by the buy page
 * and the staff page, so these can be tested on their own.
 */
import type { ReferralPerson, ReferralReward } from './referrals.ts';

export type ReferralCode = 'signed_out' | 'off' | 'failed';

const STATUS: Record<ReferralCode, number> = { signed_out: 401, off: 409, failed: 502 };

/**
 * The English the route sends beside each code, for a caller with no words of
 * its own. None repeats the words the database raises.
 */
export const REFERRAL_SENTENCE: Record<ReferralCode, string> = {
  signed_out: 'You are signed out. Nothing was changed.',
  off: 'Invitations are closed at the moment: the switch for them is off. Nothing was changed.',
  failed: 'No answer that can be read came back. Nothing was charged.',
};

export function referralStatusOf(code: ReferralCode): number {
  return STATUS[code];
}

export function referralRefusal(code: ReferralCode) {
  return { ok: false as const, code, message: REFERRAL_SENTENCE[code] };
}

/**
 * What the database raises from `my_referral_code()` and `my_referrals()`,
 * told apart by the state it is raised under and its words. A sentence this
 * list does not know is `failed`: it is never passed on.
 */
export const REFERRAL_RAISES: { code: ReferralCode; sqlstate: string; pattern: RegExp }[] = [
  { code: 'signed_out', sqlstate: '42501', pattern: /^sign in to (invite somebody|see your invitations)$/u },
  { code: 'off', sqlstate: '0A000', pattern: /^inviting friends is not switched on for this platform yet$/u },
];

export function referralCodeOf(
  error: { code?: string | null; message?: string | null } | null | undefined,
): ReferralCode {
  const message = typeof error?.message === 'string' ? error.message : '';
  for (const raise of REFERRAL_RAISES) {
    if (error?.code === raise.sqlstate && raise.pattern.test(message)) return raise.code;
  }
  return 'failed';
}

/**
 * A code out of an address, or nothing.
 *
 * The part of the address arrives decoded once already; decoding it again can
 * throw on a stray `%`, and a thrown error on a public page is a 500 where a
 * sentence was owed. Anything that cannot be decoded is no code.
 */
export function referralCodeFromPath(raw: unknown): string | null {
  if (typeof raw !== 'string' || raw.length > 96) return null;
  let value = raw;
  try {
    value = decodeURIComponent(raw);
  } catch {
    return null;
  }
  const code = value.trim().toUpperCase();
  return /^[A-Z0-9-]{6,24}$/u.test(code) ? code : null;
}

/**
 * The first word of a name somebody typed.
 *
 * A visitor holding a link is told who invited them by a first name and no
 * more. `resolve_referral_code()` sends the whole display name; this is where
 * it is cut.
 */
export function firstNameOf(name: unknown): string | null {
  if (typeof name !== 'string') return null;
  const first = name.trim().split(/\s+/u)[0] ?? '';
  return first === '' ? null : first.slice(0, 60);
}

/**
 * The name of somebody who used the code, or nothing when none is known.
 *
 * `my_referrals()` cuts a name to its first word after putting "A friend" in
 * for a missing one, so a person with no name arrives as "A". A page that
 * printed that would be printing half an English phrase as a name; it is read
 * here as no name, and the screen says "a friend" in its own language. (A
 * person whose first name really is the single letter A is shown the same
 * way, which costs them nothing.)
 */
export function invitedNameOf(person: Pick<ReferralPerson, 'name'>): string | null {
  const name = firstNameOf(person.name);
  if (name === null || name === 'A') return null;
  return name;
}

export type RewardState = {
  /** What became of it. */
  status: 'earned' | 'reversed' | 'other';
  /** Whether the date below is when it starts or when it stops. */
  window: 'from' | 'by' | null;
  date: string | null;
  /** Whether typing it at checkout would work at this moment. */
  live: boolean;
};

function time(iso: string | null): number | null {
  if (!iso) return null;
  const at = new Date(iso).getTime();
  return Number.isNaN(at) ? null : at;
}

/**
 * One reward at one moment.
 *
 * A reward's code is made when the friend's payment arrives and does not work
 * until the refund window has passed, so "earned" alone would send somebody
 * to a checkout that refuses them. The state says which side of its window
 * the code is on. A refunded purchase withdraws it, and a withdrawn reward
 * carries no date: there is nothing left to wait for.
 */
export function rewardStateOf(reward: ReferralReward, now: Date = new Date()): RewardState {
  if (reward.status === 'reversed') return { status: 'reversed', window: null, date: null, live: false };
  const status = reward.status === 'rewarded' ? 'earned' : 'other';
  const at = now.getTime();
  const starts = time(reward.startsAt);
  const ends = time(reward.endsAt);
  const usable = reward.code !== null && reward.campaignStatus === 'active';

  if (starts !== null && starts > at) {
    return { status, window: 'from', date: reward.startsAt, live: false };
  }
  if (ends !== null) {
    if (ends <= at) return { status, window: null, date: null, live: false };
    return { status, window: 'by', date: reward.endsAt, live: usable && status === 'earned' };
  }
  return { status, window: null, date: null, live: usable && status === 'earned' };
}

/** What an invited person did, as a name. */
export function personStateOf(person: Pick<ReferralPerson, 'status'>): 'pending' | 'bought' | 'refunded' | 'other' {
  if (person.status === 'pending') return 'pending';
  if (person.status === 'rewarded' || person.status === 'capped') return 'bought';
  if (person.status === 'reversed') return 'refunded';
  return 'other';
}

/** A percentage a screen may print: a whole number from 1 to 100, or nothing. */
export function percentOf(value: unknown): number | null {
  const n = typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN;
  if (!Number.isFinite(n) || n < 1 || n > 100) return null;
  return Math.round(n * 100) / 100;
}
