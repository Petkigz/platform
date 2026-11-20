/**
 * Money that arrived for a pledge and bought no seat, as the staff desk says it.
 *
 * Since a pledge can be paid at checkout
 * (`20261281147000_sponsorship_checkout.sql`), a payment can be confirmed for
 * a pledge that can no longer be honoured: called off in the meantime,
 * already recorded by hand, the request no longer approved, the course
 * withdrawn. The database does not refuse that payment, because the money
 * has moved: the order is paid, nothing is granted, and one line goes to the
 * audit trail with the reason. Until this file nothing showed staff that
 * line, so somebody could have paid for a seat that never opened and nobody
 * would have been told.
 *
 * Nothing here is shown to a sponsor or a learner. It is English, like the
 * rest of the staff desk.
 *
 * **What this cannot say:** whether the order has since been refunded. The
 * desk reads the audit trail and the open pledges, and neither holds that.
 * The page says so, and points at the orders.
 */
import { amountOf } from './sponsorship-outcome.ts';

/** The audit action the trigger writes. Pinned against the migration by the test. */
export const UNAPPLIED_ACTION = 'sponsorship.payment_unapplied';

export type UnappliedPayment = {
  /** The pledge the order was for. */
  sponsorshipId: string;
  /** The order that was paid, or null when the line does not carry one. */
  orderId: string | null;
  /** The trigger's own reason: `pledge_withdrawn`, `request_declined`, `course_not_available`. */
  reason: string;
  /** `UGX 50000`, or null when the line's amount cannot be read as one. */
  amount: string | null;
  /** When the payment was confirmed. */
  at: string | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

/**
 * The audit lines as payments, newest first as they were read, or null when
 * what was read is not a list. A line that does not name a pledge is left
 * out: there is nothing to say about it.
 */
export function parseUnapplied(rows: unknown): UnappliedPayment[] | null {
  if (!Array.isArray(rows)) return null;
  const out: UnappliedPayment[] = [];
  for (const entry of rows) {
    if (!entry || typeof entry !== 'object') continue;
    const row = entry as { target_id?: unknown; detail?: unknown; occurred_at?: unknown };
    if (typeof row.target_id !== 'string' || !UUID.test(row.target_id)) continue;
    const detail = (row.detail && typeof row.detail === 'object' && !Array.isArray(row.detail) ? row.detail : {}) as Record<string, unknown>;
    const reason = typeof detail.reason === 'string' && /^[a-z_]{1,60}$/u.test(detail.reason) ? detail.reason : 'unknown';
    out.push({
      sponsorshipId: row.target_id.toLowerCase(),
      orderId: typeof detail.orderId === 'string' && UUID.test(detail.orderId) ? detail.orderId.toLowerCase() : null,
      reason,
      amount: amountOf(detail.amountMinor, detail.currency),
      at: typeof row.occurred_at === 'string' && row.occurred_at !== '' ? row.occurred_at : null,
    });
  }
  return out;
}

/**
 * Why nothing was granted, and what there is to do about it.
 *
 * `next` never says "refund it" as though that were the only course: for a
 * withdrawn course the money can still be applied by hand once the course is
 * back, which the database allows because the pledge is still waiting.
 */
export function describeUnapplied(reason: string): { why: string; next: string } {
  if (reason === 'pledge_withdrawn') {
    return {
      why: 'The sponsor had called the pledge off before the payment was confirmed.',
      next: 'No seat was opened. The money is the sponsor’s to have back: refund the order.',
    };
  }
  if (reason === 'pledge_paid') {
    return {
      why: 'This pledge had already been recorded as paid by hand, so this is a second payment for one seat.',
      next: 'The seat was opened once, by the first. Refund this order.',
    };
  }
  if (reason === 'course_not_available') {
    return {
      why: 'The course had no published version when the payment was confirmed.',
      next: 'No seat was opened, and the pledge is still waiting. When the course is back, record this payment against the pledge with the order as its reference; otherwise refund the order.',
    };
  }
  if (reason.startsWith('request_')) {
    const state = reason.slice('request_'.length);
    const said =
      state === 'withdrawn' ? 'had been taken back by the family'
      : state === 'declined' ? 'had been declined'
      : state === 'funded' ? 'had already been covered'
      : 'was no longer approved';
    return {
      why: `The request for this seat ${said} when the payment was confirmed.`,
      next: 'No seat was opened by this payment. Refund the order, unless the family and the sponsor agree otherwise.',
    };
  }
  return {
    why: 'The payment was confirmed and no seat was opened; the reason recorded is one this page has no sentence for.',
    next: 'Look at the pledge and the order before doing anything.',
  };
}

/**
 * What has happened to the pledge since, as far as the desk's own list shows.
 *
 * The desk lists pledges that are waiting or paid. One that is not there has
 * been called off.
 */
export function pledgeSince(
  payment: UnappliedPayment,
  seats: { id: string; status: string }[],
): 'applied_by_hand' | 'still_waiting' | 'paid_before' | 'called_off' {
  const seat = seats.find((s) => s.id.toLowerCase() === payment.sponsorshipId);
  if (!seat) return 'called_off';
  if (seat.status === 'paid') return payment.reason === 'pledge_paid' ? 'paid_before' : 'applied_by_hand';
  return 'still_waiting';
}

export const PLEDGE_SINCE_WORDS: Record<ReturnType<typeof pledgeSince>, string> = {
  applied_by_hand: 'Since then the pledge has been recorded as paid, so this money may already have been applied by hand. Check the reference on the pledge below.',
  still_waiting: 'The pledge is still waiting below.',
  paid_before: 'The pledge is recorded as paid, by the earlier payment.',
  called_off: 'The pledge is no longer open.',
};
