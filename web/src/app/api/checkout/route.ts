import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { ownLearnerProfileId, resolveOffering } from '@/lib/enrolment';
import {
  createOrder,
  createPlanOrder,
  recordPaymentAttempt,
  resolveOpenAttempts,
  type AttemptMethod,
} from '@/lib/checkout';
import { getPaymentProvider } from '@/lib/payments/registry';
import { PaymentProviderUnavailableError } from '@/lib/payments/provider';
import { toE164 } from '@/lib/phone';
import { countryFromHeaders } from '@/lib/geo';

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
 *     event or a privileged actor with written evidence.
 *   - It does not treat a provider redirect as payment. The payer comes back to
 *     `returnUrl` with nothing settled, and the entitlement arrives when the
 *     webhook lands. The UI has to be built to wait rather than to assume.
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: 'Payments are not configured on this deployment.' },
      { status: 503 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Sign in to check out.' }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Malformed request body.' }, { status: 400 });
  }

  const courseId = typeof body.courseId === 'string' ? body.courseId.trim() : '';
  const planVersionId = typeof body.planVersionId === 'string' ? body.planVersionId.trim() : '';
  const learnerProfileId = typeof body.learnerProfileId === 'string' ? body.learnerProfileId.trim() : '';
  const priceId = typeof body.priceId === 'string' ? body.priceId.trim() : '';

  if (Boolean(courseId) === Boolean(planVersionId)) {
    return NextResponse.json(
      { error: 'Choose exactly one course or plan version.' },
      { status: 400 },
    );
  }
  // A price is still part of a plan checkout. A course has no price to post:
  // which one applies is decided by the buyer's country, in the writer.
  if (planVersionId && !priceId) {
    return NextResponse.json(
      { error: 'Choose a price for the plan.' },
      { status: 400 },
    );
  }
  if (planVersionId && !learnerProfileId) {
    return NextResponse.json(
      { error: 'Choose the learner who will use this subscription.' },
      { status: 400 },
    );
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
    // A learner who already holds a live entitlement should not be charged
    // again. resolveOffering is the same decision the enrol button uses.
    const ownLearnerId = await ownLearnerProfileId(supabase, user.id);
    const offering = await resolveOffering(supabase, {
      courseId,
      learnerProfileId: ownLearnerId,
      country,
    });
    if (offering.kind === 'entitled') {
      return NextResponse.json({ error: 'You already have access to this course.' }, { status: 409 });
    }
    if (offering.kind === 'free') {
      return NextResponse.json({
        error: 'This course is free. Use enrolment rather than checkout.',
        redirect: '/api/enrol',
      }, { status: 409 });
    }
    if (offering.kind === 'not_sold_here') {
      // Let the writer say why: it holds the reason and the country, and it is
      // the only place allowed to decide that a sale cannot happen.
      result = await createOrder(supabase, { courseId, country });
    } else {
      // The writer takes the payer from the session's own claims; there is no
      // user id to hand it, and no amount, product, price or billing account
      // either.
      result = await createOrder(supabase, { courseId, country });
    }
  }
  if (!result.ok) {
    // 409 for the expected conflicts, 404 when there is nothing to buy, and 503
    // when the platform itself is closed: `commerce.checkout` ships off and the
    // order writer refuses while it is. A payer who meets that deserves "not
    // open yet" rather than "your request was wrong" (400) or "something broke"
    // (500). 500 is the fallback, so a refusal nobody thought about stays loud.
    const status: number =
      result.code === 'checkout_disabled'
        ? 503
        : result.code === 'not_found'
          ? 404
          : result.code === 'error'
            ? 500
            : result.code === 'price_not_available' ||
                result.code === 'not_paid_course' ||
                result.code === 'not_sold_here' ||
                result.code === 'already_entitled' ||
                result.code === 'conflict'
              ? 409
              : 400;
    return NextResponse.json({ error: result.message, code: result.code }, { status });
  }

  // The order exists and is pending. Now hand off. If no provider is
  // configured the order is left pending on purpose: it is a real record of an
  // attempt, it is harmless because it confers nothing, and the payer sees a
  // clear sentence instead of a broken redirect.
  const requestedProvider =
    typeof body.provider === 'string' && body.provider.trim()
      ? body.provider.trim()
      : undefined;
  const provider = getPaymentProvider(requestedProvider);
  if (!provider.available) {
    return NextResponse.json(
      {
        error:
          'No payment provider is configured yet, so this order cannot be paid. ' +
          'It has been saved and will appear in your orders.',
        code: 'provider_unavailable',
        orderId: result.orderId,
      },
      { status: 503 },
    );
  }

  const origin = new URL(request.url).origin;

  // Normalise the handset number first, so the attempt below records the
  // method that was actually implied rather than whatever the caller typed.
  // toE164 reports an unusable number by returning null, not by throwing. The
  // order already exists at this point, so this is a 400 on the request rather
  // than a rollback — the payer can retry with a correct number.
  let msisdn: string | undefined;
  if (typeof body.msisdn === 'string' && body.msisdn.trim()) {
    const normalised = toE164(body.msisdn, 'UG');
    if (!normalised) {
      return NextResponse.json(
        {
          error: 'That phone number is not valid.',
          orderId: result.orderId,
        },
        { status: 400 },
      );
    }
    msisdn = normalised;
  }

  // The method is recorded honestly: we know it is mobile money only because a
  // handset number was supplied. Until a provider is chosen there is no way to
  // know what the payer will end up using, and guessing 'card' would put a
  // falsehood in a support-facing record.
  const method: AttemptMethod | null = msisdn ? 'mobile_money' : null;

  // Written before the provider is called, so an attempt that throws still
  // leaves a trace. Nothing recorded this before, so "never tried" and "tried
  // three times, provider failed every time" were indistinguishable.
  await recordPaymentAttempt(supabase, {
    orderId: result.orderId,
    amountMinor: result.amount.amountMinor.toString(),
    currencyCode: result.currencyCode,
    providerId: provider.id,
    method,
  });

  try {
    const checkout = await provider.createCheckout({
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
  } catch (err) {
    if (err instanceof PaymentProviderUnavailableError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    // Never leak a provider's internal error to the payer, and never pretend
    // the order failed: it exists, it is pending, and it can be retried.
    return NextResponse.json(
      {
        error: 'The payment provider could not start this payment. Try again.',
        orderId: result.orderId,
      },
      { status: 502 },
    );
  }
}
