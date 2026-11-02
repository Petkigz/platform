/**
 * The 14-day right, on the browser side.
 *
 * The database decides everything that matters here: whether the right applies,
 * whether a waiver may be offered, what the words are, and whether a waiver is
 * valid. This module exists for three narrower jobs, and each is deliberately the
 * smallest version of itself:
 *
 *   1. Decide whether to render a box at all — the same country list, because the
 *      checkout page has to know before it asks the database and a page that
 *      flashes a box and removes it is worse than one that never shows it.
 *   2. Read the offer the database returns, strictly, so a changed shape is a
 *      missing box rather than a box with no words under it.
 *   3. Send the buyer's answer once, to the function that records it.
 *
 * **The list is a copy, and both sides are tested.** The browser cannot call
 * `course_withdrawal_countries()`, so the 31 codes exist twice. `withdrawal.test.ts`
 * pins this copy, and `supabase/tests/withdrawal_waiver.test.mjs` pins the database
 * copy against the same 31. A list like this drifts silently, and the cost of drift
 * is a buyer told they have no right when they have one.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

/** The EU, the rest of the EEA (Iceland, Liechtenstein, Norway) and the UK. */
export const COURSE_WITHDRAWAL_COUNTRIES = [
  'AT', 'BE', 'BG', 'CY', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI', 'FR', 'GB', 'GR',
  'HR', 'HU', 'IE', 'IS', 'IT', 'LI', 'LT', 'LU', 'LV', 'MT', 'NL', 'NO', 'PL',
  'PT', 'RO', 'SE', 'SI', 'SK',
] as const;

const COUNTRY_RE = /^[A-Z]{2}$/;

/**
 * Does a buyer in this country have the 14-day right?
 *
 * A country nobody can name answers *true*. The platform cannot know where an
 * anonymous buyer is, and being wrong in that direction shows a box somebody may
 * not need; being wrong in the other direction denies a right somebody has.
 */
export function hasCourseWithdrawalRight(country: string | null | undefined): boolean {
  const code = typeof country === 'string' ? country.trim().toUpperCase() : '';
  if (!COUNTRY_RE.test(code)) return true;
  return (COURSE_WITHDRAWAL_COUNTRIES as readonly string[]).includes(code);
}

export type WithdrawalOfferReason =
  | 'offered'
  | 'no_statutory_right'
  | 'switched_off'
  | 'no_policy_in_force';

export type WithdrawalOffer = {
  country: string | null;
  countryKnown: boolean;
  /** The buyer is in a market where the 14 days apply. */
  statutory: boolean;
  /** A box may be shown: the right applies, the flag is on, and a policy is live. */
  canWaive: boolean;
  flagOn: boolean;
  policyVersionId: string | null;
  policyVersionNumber: number | null;
  policyInForceFrom: string | null;
  /** The paragraph to print. One source, shared with the published policy. */
  wording: string;
  reason: WithdrawalOfferReason;
  message: string;
};

const text = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value : null;

export function normaliseWithdrawalOffer(raw: unknown): WithdrawalOffer | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;

  const wording = text(row.wording);
  const message = text(row.message);
  if (!wording || !message) return null;
  if (row.canWaive !== true && row.canWaive !== false) return null;
  if (row.statutory !== true && row.statutory !== false) return null;
  if (row.countryKnown !== true && row.countryKnown !== false) return null;

  const reasons: WithdrawalOfferReason[] = [
    'offered', 'no_statutory_right', 'switched_off', 'no_policy_in_force',
  ];
  const reason = reasons.find((candidate) => candidate === row.reason);
  if (!reason) return null;

  // A box with no policy behind it would collect an agreement to nothing.
  if (row.canWaive === true && !text(row.policyVersionId)) return null;
  // And a box that cannot be waived, in a country where the right exists, must be
  // one of the two reasons that explain why — not a fourth state nobody wrote.
  if (row.statutory === true && row.canWaive === false
      && reason !== 'no_policy_in_force' && reason !== 'switched_off') return null;

  const versionNumber = row.policyVersionNumber;
  return {
    country: text(row.country),
    countryKnown: row.countryKnown,
    statutory: row.statutory,
    canWaive: row.canWaive,
    flagOn: row.flagOn === true,
    policyVersionId: text(row.policyVersionId),
    policyVersionNumber: typeof versionNumber === 'number' ? versionNumber : null,
    policyInForceFrom: text(row.policyInForceFrom),
    wording,
    reason,
    message,
  };
}

export async function fetchWithdrawalOffer(
  supabase: SupabaseClient,
  country: string | null,
): Promise<WithdrawalOffer | null> {
  const { data, error } = await supabase.rpc('withdrawal_offer', { p_country: country });
  // A checkout that cannot read the offer shows no box. The right still applies:
  // the clock reads the buyer's country, not the presence of a checkbox.
  if (error) return null;
  return normaliseWithdrawalOffer(data);
}

/** What the buyer did with the box. `retained` is a decision, not an absence. */
export type WithdrawalChoice = 'waived' | 'retained';

export type WithdrawalRecording = {
  orderId: string;
  decision: WithdrawalChoice;
  country: string | null;
  policyVersionId: string | null;
  statutory: boolean;
  message: string;
};

export type WithdrawalResult =
  | { ok: true; value: WithdrawalRecording }
  | { ok: false; message: string };

const REFUSALS: Record<string, string> = {
  not_signed_in: 'Sign in to check out.',
  no_choice: 'That request did not say what you chose.',
  order_not_found: 'That order does not exist.',
  not_your_order: 'Only the person paying for this order can make that choice.',
  already_paid: 'This order has already been paid, so the choice can no longer be recorded. Ask us for a refund instead.',
  already_decided:
    'A choice is already recorded on this order. A refund is how to change it now.',
  no_policy:
    'The withdrawal right cannot be waived here yet, because no published refunds policy is in force. Your 14 days still apply.',
  not_applicable: 'There is no 14-day right to waive on this order.',
};

/** `withdrawal:<key>` from the database, as a sentence a buyer can act on. */
export function mapWithdrawalRefusal(message: string): string {
  const key = /withdrawal:([a-z_]+)/i.exec(message)?.[1]?.toLowerCase();
  if (key && REFUSALS[key]) return REFUSALS[key];
  return 'Your choice about the 14-day right could not be recorded, so nothing has been charged.';
}

/**
 * Record what the buyer chose — once, before payment.
 *
 * The order is named and the answer is named; the country is a hint that the
 * database only uses when the account has none. Nothing else about the order is
 * sent, and the policy version is resolved in the database from what is actually
 * in force, so a stale page cannot have somebody waive under an old document.
 */
export async function recordWithdrawalChoice(
  supabase: SupabaseClient,
  args: { orderId: string; choice: WithdrawalChoice; country?: string | null },
): Promise<WithdrawalResult> {
  const { data, error } = await supabase.rpc('record_withdrawal_choice', {
    p_order_id: args.orderId,
    p_accepted: args.choice === 'waived',
    p_country: args.country ?? null,
  });

  if (error) return { ok: false, message: mapWithdrawalRefusal(error.message) };

  const row = (data ?? {}) as Record<string, unknown>;
  const decision = row.decision === 'waived' ? 'waived' : row.decision === 'retained' ? 'retained' : null;
  const message = text(row.message);
  if (!decision || !message) {
    return { ok: false, message: 'The choice was sent but not confirmed, so treat it as not recorded.' };
  }

  return {
    ok: true,
    value: {
      orderId: args.orderId,
      decision,
      country: text(row.country),
      policyVersionId: text(row.policyVersionId),
      statutory: row.statutory === true,
      message,
    },
  };
}

/** Which clock an order is on, in words. The code is the database's. */
export function describeWithdrawalRule(rule: string | null | undefined): string {
  switch (rule) {
    case 'statutory_14_days':
      return '14 days by law, because you have not waived it';
    case 'waived_policy_window':
      return "the 72-hour window, because you asked us to start immediately";
    case 'policy_window':
      return 'the 72-hour window';
    default:
      return '';
  }
}
