/**
 * Creating an order.
 *
 * The rule this file exists to enforce: **the client never supplies an amount,
 * and since 20261230000100 it does not supply a price either.** It supplies a
 * course id. Everything else — which price applies, in which currency, for which
 * product, onto which billing account — follows from rows the platform already
 * owns and from where the request came from.
 *
 * Since 20261224000100_course_order_writer.sql that rule is enforced in the
 * database rather than here. `createOrder` used to re-derive the offer in
 * TypeScript and then write `orders` and `order_items` through two RLS insert
 * policies that asked only "is this person a member of the billing account?".
 * A payer is, so a payer could skip this file and write those rows themselves:
 * a total of their choosing, and a line naming any product in the catalogue at
 * unit price zero. Both CHECKs on the tables are satisfied by that, and
 * `record_payment_success()` fulfils from `order_items.product_id` — so paying
 * the real total delivered whatever course the payer had named.
 *
 * Validation in one of two paths is not validation. It now lives in
 * `create_course_order()`, which is the only thing that can create a course
 * order, and this file's job is the part that is genuinely presentation:
 * turning the writer's refusal keys into sentences a payer can act on.
 *
 * Provider-independent by design. Nothing here knows whether the payer is about
 * to be redirected or prompted on their handset — `startCheckout` in
 * `payments/provider.ts` decides that, and choosing a provider (P12) changes no
 * line of this file.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import { fromMinor, format, type Money } from './money.ts';

export type CheckoutErrorCode =
  | 'not_found'
  | 'not_paid_course'
  | 'price_not_available'
  | 'not_sold_here'
  | 'already_entitled'
  | 'conflict'
  | 'checkout_disabled'
  | 'error';

export type CreateOrderResult =
  | { ok: true; orderId: string; amount: Money; currencyCode: string }
  | { ok: false; code: CheckoutErrorCode; message: string };

type MembershipRow = { billing_account_id: string }[] | null;

/**
 * The billing account a plan order should hang off.
 *
 * Reuses the caller's existing account rather than opening a new one per
 * purchase: one account per person is what makes "my orders" a coherent list,
 * and what makes a refund findable. Creating one is safe because the creator is
 * made a member of it by trigger — before
 * 20261029000100_billing_account_creator_member.sql, an account created here
 * could never be read or ordered against, and this whole function was
 * unreachable in practice.
 *
 * Only `createPlanOrder` uses this. Course checkout resolves its account inside
 * `create_course_order()`, which can do two things this cannot: refuse an
 * account the caller may not pay from, and match the account's `billing_currency`
 * to the price's. The currency this function hardcodes for a *new* account is
 * therefore a known gap on the plan path — recorded in NEXT.md rather than
 * papered over here, because fixing it means knowing the price's currency, and
 * this function is deliberately not given the price.
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

  // Do not chain RETURNING here. `billing_accounts_read` requires an active
  // membership, and the creator-membership trigger runs after the INSERT. As
  // measured on families, INSERT ... RETURNING can be refused by the SELECT
  // policy before the AFTER trigger has made the row readable. A plain INSERT
  // succeeds; then the trigger has run and this separate SELECT is visible.
  const { error: createErr } = await supabase.from('billing_accounts').insert({
    display_name: 'My account',
    billing_currency: 'UGX',
    status: 'active',
    created_by: userId,
  });

  if (createErr) throw new Error(createErr.message);

  const { data: created, error: lookupErr } = await supabase
    .from('billing_accounts')
    .select('id')
    .eq('created_by', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (lookupErr) throw new Error(lookupErr.message);
  return (created as { id: string } | null)?.id ?? null;
}

/** What `create_course_order()` returns. Every field is the platform's own. */
type CourseOrderRow = {
  orderId?: string;
  orderItemId?: string;
  billingAccountId?: string;
  productId?: string;
  priceId?: string;
  courseVersionId?: string;
  /** A decimal integer string. Never a JSON number: money stays exact. */
  amountMinor?: string;
  currencyCode?: string;
  title?: string;
};

/**
 * The writer's refusal keys, and what a payer is told for each.
 *
 * The keys are the contract between this file and the SQL function. They are
 * matched exactly rather than by prose, because the prose version of this —
 * regexes over English sentences in `createPlanOrder` — breaks the moment
 * somebody rewords a `RAISE`. An unknown key degrades to `error`, which is a
 * 500: a refusal nobody thought about should be loud, not a friendly sentence
 * that happens to be wrong.
 */
const COURSE_ORDER_REFUSALS: Record<string, { code: CheckoutErrorCode; message: string }> = {
  not_signed_in: { code: 'error', message: 'Sign in to buy a course.' },
  // commerce.checkout ships off. This is not a failure of the payer's request;
  // it is the platform being closed, and it has its own status code so the UI
  // can say so instead of implying something is broken.
  disabled: {
    code: 'checkout_disabled',
    message: 'Checkout is not open on this platform yet.',
  },
  course_not_available: {
    code: 'not_found',
    message: 'That course has no published version to buy.',
  },
  price_not_available: {
    code: 'price_not_available',
    message: 'That price is not currently available. Pick another and try again.',
  },
  // A recurring price has its own writer, lifecycle and expiry. Accepting it
  // here would take subscription money and grant a one-off entitlement,
  // because record_payment_success() does not create subscriptions.
  not_one_time: {
    code: 'not_paid_course',
    message:
      'Subscriptions are not on sale through this checkout yet. One-off purchases are.',
  },
  // The course is on sale somewhere, just not on terms this buyer can accept.
  // Both are catalogue gaps a person can close, not errors the payer caused, so
  // both are said plainly and both ask them to come back.
  no_price_for_country: {
    code: 'not_sold_here',
    message:
      'This course has no price for your country yet, so we would rather not charge you ' +
      'than guess. Contact us and we will open your market.',
  },
  price_ambiguous: {
    code: 'not_sold_here',
    message:
      'This course is priced in more than one currency for your country. Contact us so ' +
      'we can set the right one before you pay.',
  },
  // A course purchase grants every learner profile on the account that pays, so
  // an account that already holds this version can only be charged for access it
  // has. Said as reassurance rather than a refusal, because the commonest way to
  // meet this is a guardian who does not know the family is already covered —
  // including the case that looks like a second child and is not.
  already_owned: {
    code: 'already_entitled',
    message:
      'Everyone on this account already has this course, so buying it again would add nothing.',
  },
};

/** Split `checkout:<key>` back out of a Postgres error message. */
export function mapCourseOrderRefusal(message: string): {
  code: CheckoutErrorCode;
  message: string;
} {
  const key = /checkout:([a-z_]+)/i.exec(message)?.[1]?.toLowerCase();
  const mapped = key ? COURSE_ORDER_REFUSALS[key] : undefined;
  if (mapped) return mapped;
  return { code: 'error', message };
}

/**
 * Create a pending order for one course.
 *
 * Returns a discriminated result rather than throwing, because every failure
 * mode here is an expected one that the caller has to tell the payer about in
 * different words: a course that is not on sale, a country with no price, a
 * course the family already owns. Those are not exceptions.
 *
 * There is no `userId` argument and no `priceId` argument. The writer takes the
 * actor from the session's own JWT claims and the price from the buyer's
 * country, so neither the payer nor the amount can be named by the request. The
 * country is passed because only the HTTP layer can see it; the writer consults
 * it once, for an account that has none, and never again.
 */
export async function createOrder(
  supabase: SupabaseClient,
  args: { courseId: string; country?: string | null },
): Promise<CreateOrderResult> {
  const { data, error } = await supabase.rpc('create_course_order', {
    p_course_id: args.courseId,
    p_buyer_country: args.country ?? null,
  });

  if (error) return { ok: false, ...mapCourseOrderRefusal(error.message) };

  const row = data as CourseOrderRow | null;
  // A row without an amount must never become an order of zero. `fromMinor`
  // would happily make 0n out of undefined-ish input, and the provider handoff
  // would then charge nothing and fulfil everything.
  if (!row?.orderId || row.amountMinor === undefined || !row.currencyCode) {
    return { ok: false, code: 'error', message: 'The order was not created.' };
  }

  return {
    ok: true,
    orderId: String(row.orderId),
    amount: fromMinor(row.amountMinor, row.currencyCode),
    currencyCode: row.currencyCode,
  };
}

export type CreatePlanOrderArgs = {
  planVersionId: string;
  priceId: string;
  learnerProfileId: string;
  userId: string;
};

/**
 * Start a subscription checkout from a selected plan version, price id and
 * learner profile. The SQL writer resolves the amount from `prices`, verifies
 * the learner belongs to the payer/family and creates only a pending order and
 * pending subscription. It grants no access until the verified payment writer
 * confirms the order.
 */
export async function createPlanOrder(
  supabase: SupabaseClient,
  args: CreatePlanOrderArgs,
): Promise<CreateOrderResult> {
  if (!args.planVersionId || !args.priceId || !args.learnerProfileId) {
    return { ok: false, code: 'error', message: 'Choose a plan, price and learner.' };
  }

  const billingAccountId = await resolveBillingAccount(supabase, args.userId);
  if (!billingAccountId) {
    return { ok: false, code: 'error', message: 'Could not open a billing account. Please try again.' };
  }

  const { data, error } = await supabase.rpc('create_plan_order', {
    p_billing_account_id: billingAccountId,
    p_plan_version_id: args.planVersionId,
    p_price_id: args.priceId,
    p_learner_profile_id: args.learnerProfileId,
  });

  if (error) {
    const message = error.message;
    const code: CheckoutErrorCode = /not currently available|not available for this plan/i.test(message)
      ? 'price_not_available'
      : /already has a pending or unexpired subscription/i.test(message)
        ? 'conflict'
        : /not found/i.test(message)
          ? 'not_found'
          : 'error';
    return { ok: false, code, message };
  }

  const row = (Array.isArray(data) ? data[0] : data) as {
    order_id?: string;
    subscription_id?: string;
    amount_minor?: string | number | bigint;
    currency_code?: string;
  } | null;
  if (!row?.order_id || row.amount_minor === undefined || !row.currency_code) {
    return { ok: false, code: 'error', message: 'The subscription order was not created.' };
  }

  return {
    ok: true,
    orderId: String(row.order_id),
    amount: fromMinor(String(row.amount_minor), row.currency_code),
    currencyCode: row.currency_code,
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

/** What an order's total is made of. Every field is a decimal integer string. */
export type OrderTotals = {
  currencyCode: string;
  subtotalMinor: string;
  discountMinor: string;
  taxMinor: string;
  feeMinor: string;
  totalMinor: string;
};

export type OrderAdjustmentRow = {
  id: string;
  adjustment_type: string;
  direction: 'debit' | 'credit';
  amount_minor: string;
  currency_code: string;
  description: string | null;
  voided_at: string | null;
  voided_reason: string | null;
};

export const ADJUSTMENT_LABEL: Record<string, string> = {
  manual_discount: 'Discount',
  promotion: 'Promotion',
  tax: 'Tax',
  fee: 'Fee',
  shipping: 'Shipping',
  rounding: 'Rounding',
};

const isZero = (minor: string) => {
  const n = minor.trim();
  return n === '0' || n === '' || /^-?0+$/.test(n);
};

/**
 * How the total is made up, or null when the total is the whole story.
 *
 * `orders_totals_agree` holds total = subtotal − discount + tax + fee, and
 * since 20261225000100 an order can actually have all four. Showing only the
 * total on an invoice that has a fee in it is how a payer learns the number is
 * arbitrary: the parts have to be visible for the total to be checkable.
 *
 * Returns null rather than "Subtotal X" when nothing moved the total, because
 * a breakdown that repeats the total is noise on every order that has no
 * discount, tax or fee — which is nearly all of them.
 */
export function describeOrderBreakdown(totals: OrderTotals): string | null {
  const { discountMinor, taxMinor, feeMinor } = totals;
  if (isZero(discountMinor) && isZero(taxMinor) && isZero(feeMinor)) return null;

  const parts: string[] = [
    `Subtotal ${format(fromMinor(totals.subtotalMinor, totals.currencyCode))}`,
  ];
  if (!isZero(discountMinor)) {
    parts.push(`− discount ${format(fromMinor(discountMinor, totals.currencyCode))}`);
  }
  if (!isZero(taxMinor)) {
    parts.push(`+ tax ${format(fromMinor(taxMinor, totals.currencyCode))}`);
  }
  if (!isZero(feeMinor)) {
    parts.push(`+ fee ${format(fromMinor(feeMinor, totals.currencyCode))}`);
  }
  return parts.join(' ');
}

/**
 * One adjustment as a payer reads it on their own order.
 *
 * A voided adjustment is still shown, marked as withdrawn with its reason.
 * Hiding it would leave a total that cannot be reconstructed from what is on
 * screen, and the row is still on the invoice for exactly that reason.
 */
export function describeOrderAdjustment(a: OrderAdjustmentRow): string {
  const label = ADJUSTMENT_LABEL[a.adjustment_type] ?? a.adjustment_type;
  const sign = a.direction === 'credit' ? '−' : '+';
  const amount = format(fromMinor(a.amount_minor, a.currency_code));
  const reason = a.description?.trim();
  const base = `${label} ${sign} ${amount}${reason ? ` · ${reason}` : ''}`;
  if (!a.voided_at) return base;
  const why = a.voided_reason?.trim();
  return `${base} · withdrawn${why ? `: ${why}` : ''}`;
}
