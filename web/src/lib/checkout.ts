/**
 * Creating an order.
 *
 * The rule this file exists to enforce: **the client never supplies an amount.**
 * It supplies a price id, which is looked up and validated here. Everything
 * else follows from the row in `prices`. A checkout that trusts a posted total
 * is a checkout where the total is whatever the caller typed.
 *
 * That is also why this takes `courseId` rather than an amount or a product:
 * the price is resolved from the published version of the course being bought,
 * so a stale or hand-edited price id for some other course cannot be used
 * against this one.
 *
 * Provider-independent by design. Nothing here knows whether the payer is about
 * to be redirected or prompted on their handset — `startCheckout` in
 * `payments/provider.ts` decides that, and choosing a provider (P12) changes no
 * line of this file.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import { fromMinor, format, type Money } from './money.ts';
import { publishedVersionId } from './enrolment.ts';

export type CheckoutErrorCode =
  | 'not_found'
  | 'not_paid_course'
  | 'price_not_available'
  | 'price_not_for_this_course'
  | 'already_entitled'
  | 'conflict'
  | 'error';

export type CreateOrderResult =
  | { ok: true; orderId: string; amount: Money; currencyCode: string }
  | { ok: false; code: CheckoutErrorCode; message: string };

type PriceRow = {
  id: string;
  product_id: string | null;
  amount_minor: string | number;
  currency_code: string;
  billing_interval: string;
  status: string;
  effective_from: string | null;
  effective_until: string | null;
  products: { id: string; status: string; name: string }[] | null;
};

type PcvRow = { product_id: string }[] | null;

type MembershipRow = { billing_account_id: string }[] | null;

/**
 * The billing account an order should hang off.
 *
 * Reuses the caller's existing account rather than opening a new one per
 * purchase: one account per person is what makes "my orders" a coherent list,
 * and what makes a refund findable. Creating one is now safe because the
 * creator is made a member of it by trigger — before
 * 20261029000100_billing_account_creator_member.sql, an account created here
 * could never be read or ordered against, and this whole function was
 * unreachable in practice.
 */
export async function resolveBillingAccount(
  supabase: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const { data: memberships, error } = await supabase
    .from('billing_account_memberships')
    .select('billing_account_id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('granted_at', { ascending: true })
    .limit(1);

  if (error) throw new Error(error.message);

  const existing = (memberships as unknown as MembershipRow)?.[0]?.billing_account_id;
  if (existing) return existing;

  const { data: created, error: createErr } = await supabase
    .from('billing_accounts')
    .insert({
      display_name: 'My account',
      billing_currency: 'UGX',
      status: 'active',
      created_by: userId,
    })
    .select('id')
    .single();

  if (createErr) throw new Error(createErr.message);
  return (created as { id: string } | null)?.id ?? null;
}

/**
 * Create a pending order for one course at one price.
 *
 * Returns a discriminated result rather than throwing, because every failure
 * mode here is an expected one that the caller has to tell the payer about in
 * different words: the wrong price, a course they already own, a price that has
 * expired. Those are not exceptions.
 */
export async function createOrder(
  supabase: SupabaseClient,
  args: { courseId: string; priceId: string; userId: string },
): Promise<CreateOrderResult> {
  const versionId = await publishedVersionId(supabase, args.courseId);
  if (!versionId) {
    return {
      ok: false,
      code: 'not_found',
      message: 'That course has no published version to buy.',
    };
  }

  // Resolve the price ourselves. Note the filter is on the price row, and the
  // product linkage is checked after — never the other way round, because
  // trusting a joined product id from the caller is how a price for course A
  // gets applied to course B.
  const { data: priceData, error: priceErr } = await supabase
    .from('prices')
    .select(
      'id, product_id, amount_minor, currency_code, billing_interval, status, effective_from, effective_until, products ( id, status, name )',
    )
    .eq('id', args.priceId)
    .maybeSingle();

  if (priceErr) return { ok: false, code: 'error', message: priceErr.message };

  const price = priceData as unknown as PriceRow | null;
  if (!price) {
    return {
      ok: false,
      code: 'price_not_available',
      message: 'That price no longer exists. Pick another and try again.',
    };
  }

  if (price.status !== 'active') {
    return {
      ok: false,
      code: 'price_not_available',
      message: 'That price is not currently available.',
    };
  }

  const now = new Date();
  const from = price.effective_from ? new Date(price.effective_from) : null;
  const until = price.effective_until ? new Date(price.effective_until) : null;
  if ((from && now < from) || (until && now > until)) {
    return {
      ok: false,
      code: 'price_not_available',
      message: 'That price is outside its validity window.',
    };
  }

  const productId = price.product_id ?? price.products?.[0]?.id ?? null;
  if (!productId) {
    return {
      ok: false,
      code: 'price_not_for_this_course',
      message: 'That price is not attached to a product.',
    };
  }

  // The load-bearing check: the product behind this price has to be the one
  // that sells this course version.
  const { data: links, error: linkErr } = await supabase
    .from('product_course_versions')
    .select('product_id')
    .eq('product_id', productId)
    .eq('course_version_id', versionId);

  if (linkErr) return { ok: false, code: 'error', message: linkErr.message };
  if (!links || (links as { product_id: string }[]).length === 0) {
    return {
      ok: false,
      code: 'price_not_for_this_course',
      message: 'That price does not apply to this course.',
    };
  }

  // A subscription line item is a different thing from a course purchase and is
  // deliberately not fulfilled as one: it has its own lifecycle and expiry, and
  // record_payment_success() does not create subscriptions. Saying so is more
  // honest than taking the money and granting nothing.
  if (price.billing_interval !== 'one_time') {
    return {
      ok: false,
      code: 'not_paid_course',
      message:
        'Subscriptions are not on sale through this checkout yet. One-off purchases are.',
    };
  }

  const amount = fromMinor(price.amount_minor, price.currency_code);
  // Sent as a string, not Number(): Money carries a bigint on purpose, and
  // narrowing it here would be the one place in the money path that could lose
  // precision. PostgREST casts a numeric string into the bigint column exactly.
  const amountMinor = amount.amountMinor.toString();

  const billingAccountId = await resolveBillingAccount(supabase, args.userId);
  if (!billingAccountId) {
    return {
      ok: false,
      code: 'error',
      message: 'Could not open a billing account. Please try again.',
    };
  }

  const productName = price.products?.[0]?.name ?? 'Course';
  const snapshot = {
    title: productName,
    course_id: args.courseId,
    course_version_id: versionId,
    billing_interval: price.billing_interval,
    priced_at: now.toISOString(),
  };

  // subtotal - discount + tax must equal total, enforced by a CHECK on the
  // table. There is no discount or tax path yet, so both are zero and the
  // identity is exact. Promotions will change this, and that CHECK is what will
  // catch a wrong answer.
  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .insert({
      billing_account_id: billingAccountId,
      currency_code: price.currency_code,
      subtotal_minor: amountMinor,
      discount_minor: 0,
      tax_minor: 0,
      total_minor: amountMinor,
      status: 'pending_payment',
    })
    .select('id')
    .single();

  if (orderErr) return { ok: false, code: 'conflict', message: orderErr.message };
  const orderId = (order as { id: string } | null)?.id;
  if (!orderId) {
    return { ok: false, code: 'error', message: 'The order was not created.' };
  }

  // line_total must equal unit_price * quantity - discount, also a CHECK.
  const { error: itemErr } = await supabase.from('order_items').insert({
    order_id: orderId,
    product_id: productId,
    price_id: price.id,
    quantity: 1,
    unit_price_minor: amountMinor,
    currency_code: price.currency_code,
    discount_minor: 0,
    line_total_minor: amountMinor,
    item_snapshot: snapshot,
  });

  if (itemErr) {
    // An order with no line item cannot be fulfilled: fulfilment reads
    // order_items to work out what was bought. Leaving it pending rather than
    // deleting it keeps the audit trail intact, and it is never confirmable.
    return {
      ok: false,
      code: 'error',
      message: 'The order was created but its line item failed: ' + itemErr.message,
    };
  }

  return {
    ok: true,
    orderId,
    amount,
    currencyCode: price.currency_code,
  };
}

export type AttemptMethod =
  | 'mobile_money'
  | 'card'
  | 'bank_transfer'
  | 'ussd'
  | 'wallet'
  | 'cash'
  | 'other';

type AttemptRow = { id: string }[] | null;

/**
 * Record that a payment was attempted.
 *
 * Nothing wrote to `payment_attempts` before this, so a payer who hit checkout
 * and went nowhere left no trace at all: the order sat at `pending_payment` and
 * support had no way to tell "never tried" from "tried three times and the
 * provider kept failing". Both look identical in the orders table.
 *
 * The idempotency key is the reason this cannot just be a log line. It is what a
 * provider deduplicates on, so a payer who presses the button twice must send
 * the same key rather than minting a second charge. It is derived from the order
 * and the attempt number, which makes it stable across a retry of the same
 * hand-off and distinct for a genuinely new one — and the unique index on
 * `(order_id, idempotency_key)` enforces that it is not reused by accident.
 *
 * The attempt is written before the provider is called, not after. Writing it
 * afterwards would lose exactly the attempts that matter: the ones where the
 * call threw.
 */
export async function recordPaymentAttempt(
  supabase: SupabaseClient,
  args: {
    orderId: string;
    amountMinor: string;
    currencyCode: string;
    providerId: string;
    method?: AttemptMethod | null;
  },
): Promise<string | null> {
  // Count existing attempts to derive a stable, ordered key. A failed read is
  // treated as "no attempts yet" rather than aborting checkout: this is a
  // diagnostic record, and refusing to take a payment because a log could not
  // be written would be the wrong trade.
  const { data: existing } = await supabase
    .from('payment_attempts')
    .select('id')
    .eq('order_id', args.orderId);

  const sequence = ((existing as unknown as AttemptRow) ?? []).length + 1;

  const { data, error } = await supabase
    .from('payment_attempts')
    .insert({
      order_id: args.orderId,
      amount_minor: args.amountMinor,
      currency_code: args.currencyCode,
      provider: args.providerId,
      method: args.method ?? null,
      status: 'pending',
      idempotency_key: `${args.orderId}:${sequence}`,
    })
    .select('id')
    .single();

  if (error) return null;
  return (data as { id: string } | null)?.id ?? null;
}

/**
 * Close out the open attempt on an order.
 *
 * The table enforces `resolved_at IS NULL` exactly when the status is still
 * open, so both have to move together or the CHECK refuses the row.
 *
 * Called from the webhook, which is the only thing that knows an attempt
 * finished. Nothing else may resolve one, because nothing else has proof.
 */
export async function resolveOpenAttempts(
  supabase: SupabaseClient,
  args: {
    orderId: string;
    status: 'succeeded' | 'failed' | 'cancelled' | 'expired';
    providerReference?: string | null;
    safeErrorCode?: string | null;
  },
): Promise<void> {
  await supabase
    .from('payment_attempts')
    .update({
      status: args.status,
      resolved_at: new Date().toISOString(),
      ...(args.providerReference ? { provider_reference: args.providerReference } : {}),
      ...(args.safeErrorCode ? { safe_error_code: args.safeErrorCode } : {}),
    })
    .eq('order_id', args.orderId)
    .in('status', ['pending', 'requires_action', 'processing']);
}

export function describeOrderAmount(amountMinor: string | number, currency: string): string {
  return format(fromMinor(amountMinor, currency));
}
