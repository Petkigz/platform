/**
 * Whether a payment a provider confirms is the payment for the order a
 * notification names.
 *
 * MTN MoMo and Airtel Money do not sign their notifications, so the webhook
 * asks the provider what happened to the reference a notification carries
 * (`webhook.ts`). That answer is authenticated. **The order id beside the
 * reference is not**: it is whatever the sender of the notification wrote.
 *
 * The webhook used to take the two together. So a person who had really paid
 * for a cheap order could post a notification carrying that payment's
 * reference and the id of an expensive order: the provider would truthfully
 * answer "succeeded", and the expensive order would be marked paid. Nothing
 * compared the answer with the order.
 *
 * This file is that comparison, kept apart so it can be tested without a
 * provider or a database. A payment settles an order only when:
 *
 *   1. the provider's own answer says which order the payment was started
 *      for (MTN echoes the id it was given; an Airtel transaction id is made
 *      from the order's id), and it is the order named;
 *   2. that order exists; and
 *   3. where the answer carries an amount, it is the order's total in the
 *      order's currency, exactly. Where it carries none, the order's own
 *      total is what is recorded, and the record says where it came from.
 *
 * Anything else settles nothing.
 */

import type { Money } from '../money';

export type PaymentBinding =
  | { ok: true; amount: Money; amountFrom: 'provider' | 'order' }
  | {
      ok: false;
      why:
        /** The provider's answer does not say which order the payment was for. */
        | 'no_order'
        /** It says, and it is another order. */
        | 'other_order'
        /** The order named does not exist. */
        | 'order_missing'
        /** The amount paid is not the order's total. */
        | 'amount'
        /** The currency paid in is not the order's. */
        | 'currency';
    };

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export function bindPayment(args: {
  /** From the notification. Unsigned: a claim. */
  claimedOrderId: string;
  /** From the provider's authenticated answer. */
  confirmedOrderId: string | null;
  confirmedAmount: Money | null;
  /** The order named, as this platform holds it, or null when there is none. */
  order: { totalMinor: bigint; currency: string } | null;
}): PaymentBinding {
  if (!args.confirmedOrderId || args.confirmedOrderId.trim() === '') return { ok: false, why: 'no_order' };
  if (!same(args.confirmedOrderId, args.claimedOrderId)) return { ok: false, why: 'other_order' };
  if (!args.order) return { ok: false, why: 'order_missing' };

  if (args.confirmedAmount === null) {
    return {
      ok: true,
      amount: { amountMinor: args.order.totalMinor, currency: args.order.currency },
      amountFrom: 'order',
    };
  }
  if (!same(args.confirmedAmount.currency, args.order.currency)) return { ok: false, why: 'currency' };
  if (args.confirmedAmount.amountMinor !== args.order.totalMinor) return { ok: false, why: 'amount' };
  return { ok: true, amount: args.confirmedAmount, amountFrom: 'provider' };
}

/**
 * Whether a failure a provider confirms is about the order a notification
 * names. A failed payment for one order must not close the attempts of
 * another. Where the provider does not say, the failure is not applied.
 */
export function failureIsFor(claimedOrderId: string, confirmedOrderId: string | null | undefined): boolean {
  return typeof confirmedOrderId === 'string' && confirmedOrderId.trim() !== '' && same(confirmedOrderId, claimedOrderId);
}
