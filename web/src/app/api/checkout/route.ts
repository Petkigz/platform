import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { resolveOffering } from '@/lib/enrolment';
import {
  createOrder,
  createPlanOrder,
  recordPaymentAttempt,
  resolveOpenAttempts,
  type AttemptMethod,
} from '@/lib/checkout';
import { getPaymentProvider, standInFor } from '@/lib/payments/registry';
import { PaymentNotStartedError, PaymentProviderUnavailableError, type PaymentProvider } from '@/lib/payments/provider';
import { parsePhone, toE164 } from '@/lib/phone';
import { countryFromHeaders } from '@/lib/geo';
import { recordWithdrawalChoice, type WithdrawalChoice } from '@/lib/withdrawal';
import {
  CHECKOUT_REFUSED_SENTENCE,
  CHECKOUT_UNCONFIRMED_SENTENCE,
  checkoutStatusOf,
  type CheckoutReason,
} from '@/lib/checkout-outcome';

export const dynamic = 'force-dynamic';

type Body = {
  courseId?: unknown;
  planVersionId?: unknown;
  learnerProfileId?: unknown;
  priceId?: unknown;
  /** E.164, for mobile-money providers. Optional; card providers ignore it. */
  msisdn?: unknown;
  /**
   * Which provider to pay with. Optional: with one provider live it is implied.
   * Validated against the registry, so a caller cannot name a provider that is
   * not configured and get a confusing failure from the adapter.
   */
  provider?: unknown;
  /** A promotion code the buyer typed. Never a discount — the writer decides. */
  promotionCode?: unknown;
  /**
   * What the buyer did with the 14-day withdrawal box. `retained` and absent are
   * different things: absent means the box was never shown (the buyer is outside
   * the EU/EEA/UK, or no policy is in force), and `retained` means it was shown and
   * left unticked. Sending `true/false` would make those two indistinguishable,
   * and only one of them is a decision worth recording.
   */
  withdrawalChoice?: unknown;
};

/**
 * POST /api/checkout — open a pending order and hand the payer to the provider.
 *
 * The actor is taken from the session only. For a course, `courseId` is the
 * only thing the body contributes: the price follows from the buyer's country,
 * which is read from the request headers here because the database cannot see
 * them. For a plan, `priceId` is still posted and still validated inside
 * `createPlanOrder`. No amount is accepted here or anywhere else in the
 * request.
 *
 * Two things this route deliberately does not do:
 *
 *   - It does not grant anything. A pending order confers no access; only
 *     `record_payment_success()` does that, and it needs a verified provider
 *     event or a finance admin with written evidence.
 *   - It does not treat a provider redirect as payment. The payer comes back to
 *     `returnUrl` with nothing settled, and the entitlement arrives when the
 *     webhook lands. The UI has to be built to wait rather than to assume.
 *
 * **A refusal names its reason** (`lib/checkout-outcome.ts`). `error` is still
 * an English sentence, for the plan checkout and for any caller with no words
 * of its own; the buy page's form reads `reason` and says its own sentence in
 * the reader's language. A course refusal is answered with the status that
 * belongs to its reason, and the form trusts a reason only when it arrives
 * with that status. The database's own sentence is not sent for a course.
 * (For a plan it still can be: `createPlanOrder` has no keys to match.)
 */
const NO_PROVIDER_SENTENCE =
  'No payment provider is configured yet, so this order cannot be paid. ' +
  'It has been saved and will appear in your orders.';

const refuse = (reason: CheckoutReason, error: string, extra: Record<string, unknown> = {}) =>
  NextResponse.json({ error, reason, ...extra }, { status: checkoutStatusOf(reason) });

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return refuse('disabled', 'Payments are not configured on this deployment.');
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return refuse('not_signed_in', 'Sign in to check out.');
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return refuse('malformed', 'Malformed request body.');
  }

  const courseId = typeof body.courseId === 'string' ? body.courseId.trim() : '';
  const planVersionId = typeof body.planVersionId === 'string' ? body.planVersionId.trim() : '';
  const learnerProfileId = typeof body.learnerProfileId === 'string' ? body.learnerProfileId.trim() : '';
  const priceId = typeof body.priceId === 'string' ? body.priceId.trim() : '';
  const promotionCode = typeof body.promotionCode === 'string'
    ? body.promotionCode.trim().slice(0, 32)
    : '';
  const withdrawalChoice: WithdrawalChoice | null =
    body.withdrawalChoice === 'waived' || body.withdrawalChoice === 'retained'
      ? body.withdrawalChoice
      : null;

  if (Boolean(courseId) === Boolean(planVersionId)) {
    return refuse('malformed', 'Choose exactly one course or plan version.');
  }
  // A price is still part of a plan checkout. A course has no price to post:
  // which one applies is decided by the buyer's country, in the writer.
  if (planVersionId && !priceId) {
    return refuse('malformed', 'Choose a price for the plan.');
  }
  if (planVersionId && !learnerProfileId) {
    return refuse('learner_required', 'Choose the learner who will use this subscription.');
  }
  // One purchase covers one learner, so a course order names them too.
  if (!planVersionId && !learnerProfileId) {
    return refuse('learner_required', 'Choose the learner this course is for.');
  }

  // Which provider, before anything else: it decides how the number is read.
  const requestedProvider =
    typeof body.provider === 'string' && body.provider.trim()
      ? body.provider.trim()
      : undefined;
  const provider = getPaymentProvider(requestedProvider);

  // Normalise the handset number before anything is written, so the attempt
  // below records the method that was actually implied rather than whatever
  // the caller typed, and so a mistyped number leaves no pending order behind.
  //
  // **A number written without a country code is a number of the country the
  // chosen service collects in.** A mobile-money account is one operator in
  // one country (`lib/payments/markets.ts`): MTN in Ghana prompts Ghanaian
  // handsets and nobody else's. This route used to read every such number as
  // Ugandan, whoever was paying and whichever service they had chosen, so
  // "024 123 4567" typed by somebody in Accra was either refused or became a
  // number in Uganda. Now it is read the way that country writes its numbers
  // (its code, the digit it writes in front and does not dial, how many
  // digits it has), by the same function the phone card uses.
  //
  // A number typed in full, with its plus, has to be one of that country's
  // too: a service cannot prompt a handset on another country's network.
  // With no provider configured there is nobody to send a number to, so it is
  // not read at all.
  let msisdn: string | undefined;
  if (provider.available && provider.requiresMsisdn) {
    const typed = typeof body.msisdn === 'string' ? body.msisdn : '';
    if (provider.market) {
      const parsed = parsePhone(typed, provider.market.country);
      if (!parsed.ok) {
        const { ok: _ok, ...why } = parsed;
        return refuse('phone_invalid', 'That phone number is not valid.', { phone: why });
      }
      msisdn = parsed.e164;
    } else {
      // A provider tied to no country cannot say whose a local number is.
      const normalised = toE164(typed);
      if (!normalised) return refuse('phone_invalid', 'That phone number is not valid.');
      msisdn = normalised;
    }
  }

  const isPlanCheckout = Boolean(planVersionId);
  // The only place the country exists. It is a hint from the hosting layer, and
  // the writer uses it once — to establish a country on an account that has
  // none. An account that has one is never re-priced by it.
  const country = countryFromHeaders(request.headers);
  let result;
  if (isPlanCheckout) {
    result = await createPlanOrder(supabase, {
      planVersionId,
      priceId,
      learnerProfileId,
      userId: user.id,
    });
  } else {
    // The learner this purchase is for. A learner who already holds a live
    // entitlement should not be charged again; resolveOffering is the same
    // decision the enrol button uses.
    const offering = await resolveOffering(supabase, {
      courseId,
      learnerProfileId,
      country,
    });
    if (offering.kind === 'entitled') {
      return refuse('already_owned', 'That learner already has this course, so buying it again would add nothing.');
    }
    if (offering.kind === 'free') {
      return refuse('free_course', 'This course is free. Use enrolment rather than checkout.', {
        redirect: '/api/enrol',
      });
    }
    if (offering.kind === 'not_sold_here') {
      // Let the writer say why: it holds the reason and the country, and it is
      // the only place allowed to decide that a sale cannot happen.
      result = await createOrder(supabase, { courseId, learnerProfileId, country, promotionCode });
    } else {
      // The writer takes the payer from the session's own claims; there is no
      // user id to hand it, and no amount, product, price or billing account
      // either. A plan has no promotion path yet, so a code is not forwarded.
      result = await createOrder(supabase, { courseId, learnerProfileId, country, promotionCode });
    }
  }
  if (!result.ok && result.reason) {
    // A course. The reason has its own status, and a refusal nobody wrote a
    // sentence for is answered in this route's words: the database's stay here.
    // Kept for whoever runs the site: it was the only copy, and it used to be
    // sent to the payer.
    if (result.reason === 'refused') console.error('checkout: a refusal with no name:', result.message);
    const error =
      result.reason === 'refused'
        ? CHECKOUT_REFUSED_SENTENCE
        : result.reason === 'unconfirmed'
          ? CHECKOUT_UNCONFIRMED_SENTENCE
          : result.message;
    return refuse(result.reason, error, { code: result.code });
  }
  if (!result.ok) {
    // A plan. 409 for the expected conflicts, 404 when there is nothing to buy, and 503
    // when the platform itself is closed: `commerce.checkout` ships off and the
    // order writer refuses while it is. A payer who meets that deserves "not
    // open yet" rather than "your request was wrong" (400) or "something broke"
    // (500). 500 is the fallback, so a refusal nobody thought about stays loud.
    const status: number =
      result.code === 'checkout_disabled'
        ? 503
        : result.code === 'forbidden'
          ? 403
          : result.code === 'not_found'
            ? 404
          : result.code === 'error'
            ? 500
            : result.code === 'price_not_available' ||
                result.code === 'not_paid_course' ||
                result.code === 'not_sold_here' ||
                result.code === 'already_entitled' ||
                result.code === 'promotion_refused' ||
                result.code === 'conflict'
              ? 409
              : 400;
    return NextResponse.json({ error: result.message, code: result.code }, { status });
  }

  // The buyer's answer about the 14-day right, recorded before any money moves.
  //
  // It is deliberately not folded into `create_course_order()`: the writer's job
  // is what is being sold and for how much, and this is a separate act by a
  // separate person-shaped decision. Recording it here also means a failure is
  // loud and the payment never starts, rather than a waiver that quietly did not
  // happen and a buyer who thinks it did.
  if (withdrawalChoice) {
    const recorded = await recordWithdrawalChoice(supabase, {
      orderId: result.orderId,
      choice: withdrawalChoice,
      country,
    });
    if (!recorded.ok) {
      return refuse('withdrawal_not_recorded', recorded.message, {
        code: 'withdrawal_not_recorded',
        orderId: result.orderId,
      });
    }
  }

  // The order exists and is pending. Now hand off. If no provider is
  // configured the order is left pending on purpose: it is a real record of an
  // attempt, it is harmless because it confers nothing, and the payer sees a
  // clear sentence instead of a broken redirect.
  if (!provider.available) {
    return refuse('provider_unavailable', NO_PROVIDER_SENTENCE, {
      code: 'provider_unavailable',
      orderId: result.orderId,
    });
  }
  // A mobile-money account collects one currency. The buy page offers a
  // service only for an order priced in it, so this is a page that was open
  // while something changed, or a request made by hand. Nobody is prompted
  // for an amount in a currency their account does not hold.
  if (provider.market && provider.market.currency !== result.currencyCode) {
    return refuse('provider_unavailable', NO_PROVIDER_SENTENCE, {
      code: 'provider_unavailable',
      orderId: result.orderId,
    });
  }
  // Some operators collect whole amounts only. The buy page offers one only
  // for a price it can take, so this is a discount that left a fraction, or a
  // request made by hand. The total is never rounded to fit: nobody is
  // prompted for an amount that is not the order's.
  if (provider.accepts && !provider.accepts(result.amount)) {
    console.error(
      `checkout: ${provider.id} cannot collect the total of order ${result.orderId} (${result.currencyCode}, with a fraction it does not take)`,
    );
    return refuse('provider_unavailable', NO_PROVIDER_SENTENCE, {
      code: 'provider_unavailable',
      orderId: result.orderId,
    });
  }

  const origin = new URL(request.url).origin;

  // The method is recorded honestly: we know it is mobile money only because a
  // handset number was supplied. Until a provider is chosen there is no way to
  // know what the payer will end up using, and guessing 'card' would put a
  // falsehood in a support-facing record.
  const method: AttemptMethod | null = msisdn ? 'mobile_money' : null;

  // One attempt through one provider: recorded, then started.
  //
  // Written before the provider is called, so an attempt that throws still
  // leaves a trace. Nothing recorded this before, so "never tried" and "tried
  // three times, provider failed every time" were indistinguishable.
  const startThrough = async (through: PaymentProvider) => {
    await recordPaymentAttempt(supabase, {
      orderId: result.orderId,
      amountMinor: result.amount.amountMinor.toString(),
      currencyCode: result.currencyCode,
      providerId: through.id,
      method,
    });
    const checkout = await through.createCheckout({
      orderId: result.orderId,
      amount: result.amount,
      returnUrl: `${origin}/orders?pending=${result.orderId}`,
      description: `${isPlanCheckout ? 'Subscription' : 'Course purchase'} ${result.orderId}`,
      msisdn,
    });
    return NextResponse.json({
      orderId: result.orderId,
      kind: checkout.kind,
      ...(checkout.kind === 'redirect'
        ? { url: checkout.url }
        : { providerReference: checkout.providerReference }),
    });
  };

  try {
    try {
      return await startThrough(provider);
    } catch (first) {
      // Both roads to one wallet are kept "in case one fails" (the owner,
      // 2026-11-19): the operator's own account, and the aggregator behind
      // it. The second is tried only when the first is **certain it started
      // nothing**. After a lost connection or a 5xx the first may have
      // prompted the handset, and a second prompt would be a second payment;
      // that payer is told to try again and decides for themselves.
      const second = first instanceof PaymentNotStartedError ? standInFor(provider) : null;
      if (
        !(first instanceof PaymentNotStartedError) ||
        !second ||
        second.market?.currency !== result.currencyCode ||
        second.accepts?.(result.amount) === false
      ) {
        throw first;
      }
      console.error(
        `checkout: ${provider.id} started nothing for order ${result.orderId} (${first.code}); trying ${second.id}`,
      );
      return await startThrough(second);
    }
  } catch (err) {
    if (err instanceof PaymentProviderUnavailableError) {
      // The error's own sentence is written for whoever runs the site: it
      // names an environment variable and a section of DECISIONS.md, and it
      // used to be sent to the payer. The order exists here too, and the
      // reply used to leave it out.
      return refuse('provider_unavailable', NO_PROVIDER_SENTENCE, {
        code: 'provider_unavailable',
        orderId: result.orderId,
      });
    }
    // Never leak a provider's internal error to the payer, and never pretend
    // the order failed: it exists, it is pending, and it can be retried.
    return refuse('provider_failed', 'The payment provider could not start this payment. Try again.', {
      orderId: result.orderId,
    });
  }
}
