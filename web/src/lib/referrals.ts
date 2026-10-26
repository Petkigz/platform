/**
 * Referrals, as a screen sees them.
 *
 * The database decides everything: who may invite, what a code is worth, when a
 * reward starts, and whether somebody has already been referred. This file does
 * the three things a server cannot — it reads the reply defensively, it turns a
 * status into a sentence, and it builds the two things a person actually needs:
 * an invite link they can send, and a message they can paste.
 *
 * The rule that shapes all of it: **nothing here pays anybody.** Both benefits
 * are discount codes, so a screen must never say money is coming, only that a
 * code exists and what it is worth.
 */

export type RewardStatus = 'pending' | 'rewarded' | 'capped' | 'reversed' | string;

export type ReferralReward = {
  code: string | null;
  status: RewardStatus;
  percent: number | null;
  startsAt: string | null;
  earnedAt: string | null;
  endsAt: string | null;
  campaignStatus: string | null;
};

export type ReferralPerson = {
  name: string;
  status: RewardStatus;
  joinedAt: string | null;
};

export type ReferralBoard = {
  enabled: boolean;
  refereePercent: number;
  rewardPercent: number;
  maxPerYear: number;
  expiryDays: number;
  code: string | null;
  joined: number;
  rewards: ReferralReward[];
  invited: ReferralPerson[];
};

/** The board a person sees when the programme is closed: no code, no claims. */
export function emptyReferralBoard(): ReferralBoard {
  return {
    enabled: false,
    refereePercent: 0,
    rewardPercent: 0,
    maxPerYear: 0,
    expiryDays: 0,
    code: null,
    joined: 0,
    rewards: [],
    invited: [],
  };
}

export type ReferralOverview = {
  enabled: boolean;
  terms: {
    refereePercent: number;
    rewardPercent: number;
    maxPerYear: number;
    expiryDays: number;
  };
  codes: number;
  conversions: number;
  rewardsMinted: number;
  rewardsCapped: number;
  rewardsReversed: number;
  recent: {
    referrer: string | null;
    referee: string | null;
    status: RewardStatus;
    code: string | null;
    at: string | null;
  }[];
};

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function whole(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
    return Math.trunc(Number(value));
  }
  return fallback;
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function reward(input: unknown): ReferralReward | null {
  const row = record(input);
  if (!row) return null;
  return {
    code: text(row.code),
    status: typeof row.status === 'string' ? row.status : 'pending',
    percent: typeof row.percent === 'number' ? row.percent : null,
    startsAt: text(row.startsAt),
    earnedAt: text(row.earnedAt),
    endsAt: text(row.endsAt),
    campaignStatus: text(row.campaignStatus),
  };
}

function person(input: unknown): ReferralPerson | null {
  const row = record(input);
  if (!row) return null;
  return {
    name: text(row.name) ?? 'A friend',
    status: typeof row.status === 'string' ? row.status : 'pending',
    joinedAt: text(row.joinedAt),
  };
}

/** What `my_referrals()` returns, read without trusting its shape. */
export function parseReferralBoard(input: unknown): ReferralBoard | null {
  const row = record(input);
  if (!row) return null;
  return {
    enabled: row.enabled === true,
    refereePercent: whole(row.refereePercent, 0),
    rewardPercent: whole(row.rewardPercent, 0),
    maxPerYear: whole(row.maxPerYear, 0),
    expiryDays: whole(row.expiryDays, 0),
    code: text(row.code),
    joined: whole(row.joined, 0),
    rewards: list(row.rewards).map(reward).filter((r): r is ReferralReward => r !== null),
    invited: list(row.invited).map(person).filter((p): p is ReferralPerson => p !== null),
  };
}

/** What `referral_overview()` returns. */
export function parseReferralOverview(input: unknown): ReferralOverview | null {
  const row = record(input);
  if (!row) return null;
  const terms = record(row.terms) ?? {};
  return {
    enabled: row.enabled === true,
    terms: {
      refereePercent: whole(terms.refereePercent, 0),
      rewardPercent: whole(terms.rewardPercent, 0),
      maxPerYear: whole(terms.maxPerYear, 0),
      expiryDays: whole(terms.expiryDays, 0),
    },
    codes: whole(row.codes, 0),
    conversions: whole(row.conversions, 0),
    rewardsMinted: whole(row.rewardsMinted, 0),
    rewardsCapped: whole(row.rewardsCapped, 0),
    rewardsReversed: whole(row.rewardsReversed, 0),
    recent: list(row.recent)
      .map((entry) => {
        const item = record(entry);
        if (!item) return null;
        return {
          referrer: text(item.referrer),
          referee: text(item.referee),
          status: typeof item.status === 'string' ? item.status : 'pending',
          code: text(item.code),
          at: text(item.at),
        };
      })
      .filter((r): r is ReferralOverview['recent'][number] => r !== null),
  };
}

/** The cookie a shared link leaves behind, so the code survives the browsing. */
export const REFERRAL_COOKIE = 'ayahspring_referral';

/** How long an invitation keeps its place on this browser. */
export const REFERRAL_COOKIE_DAYS = 30;

/**
 * A code as it is safe to send on: upper-cased and checked against the shape the
 * database mints. Anything else is `null`, because a cookie is user-editable and
 * a half-read code belongs in no request.
 */
export function cleanReferralCode(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const code = value.trim().toUpperCase();
  return /^[A-Z0-9-]{6,24}$/.test(code) ? code : null;
}

/** The code a person shares. Nothing else about them is in it. */
export function referralLink(code: string | null, origin = ''): string | null {
  if (!code) return null;
  const base = origin.replace(/\/+$/, '');
  return `${base}/referral/${encodeURIComponent(code)}`;
}

/**
 * A message somebody can paste into a chat without having to explain the
 * platform themselves. Deliberately short, deliberately no exclamation marks:
 * this is one person inviting another, not an advert.
 */
export function inviteMessage(args: {
  code: string | null;
  percent: number;
  link: string | null;
  inviterName?: string | null;
}): string {
  const { code, percent, link, inviterName } = args;
  if (!code || !link) return '';
  const who = inviterName?.trim() ? `${inviterName.trim()} invited you` : 'You are invited';
  const worth =
    percent > 0
      ? `${percent}% off your first course`
      : 'a place to learn, at your own pace';
  return `${who} to AyahSpring — ${worth}: ${link}`;
}

const REWARD_WORDS: Record<string, string> = {
  pending: 'Waiting for the payment to settle',
  rewarded: 'Earned',
  capped: 'Not earned — the yearly limit is reached',
  reversed: 'Withdrawn — the qualifying purchase was refunded',
};

const PERSON_WORDS: Record<string, string> = {
  pending: 'Started a purchase',
  rewarded: 'Bought a course',
  capped: 'Bought a course',
  reversed: 'Their purchase was refunded',
};

/** One reward, in a sentence rather than a status word. */
export function describeReward(reward: ReferralReward, now: Date = new Date()): string {
  if (reward.status === 'reversed') return REWARD_WORDS.reversed!;
  if (reward.status === 'capped') return REWARD_WORDS.capped!;

  const status = REWARD_WORDS[reward.status] ?? 'Recorded';
  const start = reward.startsAt ? new Date(reward.startsAt) : null;
  if (start && !Number.isNaN(start.getTime())) {
    if (start.getTime() > now.getTime()) {
      return `${status} — usable from ${day(start)}`;
    }
    if (reward.endsAt) {
      const end = new Date(reward.endsAt);
      if (!Number.isNaN(end.getTime())) return `${status} — use it by ${day(end)}`;
    }
  }
  return status;
}

/** One invited person, in a sentence. */
export function describePerson(person: ReferralPerson): string {
  return PERSON_WORDS[person.status] ?? 'Recorded';
}

/**
 * Whether a reward code is usable right now. The database is the authority and
 * refuses a code outside its window; this exists so a screen does not offer a
 * button that will only fail.
 */
export function rewardIsLive(reward: ReferralReward, now: Date = new Date()): boolean {
  if (reward.status === 'reversed' || reward.status === 'capped') return false;
  if (!reward.code || reward.campaignStatus !== 'active') return false;
  if (reward.startsAt) {
    const start = new Date(reward.startsAt);
    if (!Number.isNaN(start.getTime()) && start.getTime() > now.getTime()) return false;
  }
  if (reward.endsAt) {
    const end = new Date(reward.endsAt);
    if (!Number.isNaN(end.getTime()) && end.getTime() <= now.getTime()) return false;
  }
  return true;
}

function day(date: Date): string {
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * The one sentence a screen must always carry: this is a discount, not a
 * payment. There is no payout provider and none is implied.
 */
export const REFERRAL_HONESTY =
  'Both rewards are discounts on a course, not money. Nothing is paid out to anyone, ' +
  'which is why inviting a friend needs no bank details.';

/** What a code refusal from checkout means, for the referral landing page. */
export function referralLookupError(message: string): string {
  if (/not switched on/i.test(message)) {
    return 'Invitations are not open yet. The courses are still here.';
  }
  return 'That invitation link could not be read.';
}
