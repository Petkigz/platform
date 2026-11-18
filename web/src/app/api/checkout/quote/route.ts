import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { quoteCourseOrder } from '@/lib/checkout';
import { countryFromHeaders } from '@/lib/geo';
import { QUOTE_FAILED_SENTENCE, checkoutStatusOf, type CheckoutReason } from '@/lib/checkout-outcome';

export const dynamic = 'force-dynamic';

/**
 * POST /api/checkout/quote — what would this cost?
 *
 * Reads and refuses; writes nothing. No order, no billing account, no redemption.
 * That is the whole point of it existing separately from `/api/checkout`: a family
 * should be able to see the total after a code before a payment screen, and asking
 * must not cost them anything, including the last use of a limited code.
 *
 * The body carries a course, a learner and a code — never an amount, never a price.
 * The country is read from the request headers here because it is the only layer that
 * can see them, exactly as the checkout does.
 *
 * **A refusal names its reason** (`lib/checkout-outcome.ts`), with the same
 * names and statuses as the checkout. `code` is the older, coarser name.
 */
const refuse = (reason: CheckoutReason, code: string, message: string) =>
  NextResponse.json({ ok: false, code, reason, message }, { status: checkoutStatusOf(reason) });

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return refuse('disabled', 'checkout_disabled', 'Payments are not configured on this deployment.');
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return refuse('not_signed_in', 'not_signed_in', 'Sign in to see the price.');
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return refuse('malformed', 'bad_request', 'Malformed request body.');
  }
  const body = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;

  const courseId = typeof body.courseId === 'string' ? body.courseId.trim() : '';
  const learnerProfileId = typeof body.learnerProfileId === 'string'
    ? body.learnerProfileId.trim()
    : '';
  // Same ceiling as the checkout: a code is a short string, and the writer upper-cases
  // it. Trimming here means the preview and the order see the same characters.
  const promotionCode = typeof body.promotionCode === 'string'
    ? body.promotionCode.trim().slice(0, 32)
    : '';

  if (!courseId || !learnerProfileId) {
    return refuse(courseId ? 'learner_required' : 'malformed', 'bad_request', 'Choose the course and who it is for.');
  }

  const result = await quoteCourseOrder(supabase, {
    courseId,
    learnerProfileId,
    country: countryFromHeaders(request.headers),
    promotionCode,
  });

  if (!result.ok) {
    // The same names and statuses as the checkout route, so a payer meets the
    // same answer whichever of the two they hit. Asking for a price writes
    // nothing, so an answer nobody can read is simply "could not be worked
    // out": trying again costs nothing. The database's own sentence stays here.
    const reason = result.reason ?? 'refused';
    if (reason === 'refused') console.error('checkout quote: a refusal with no name:', result.message);
    const message = reason === 'refused' || reason === 'unconfirmed' ? QUOTE_FAILED_SENTENCE : result.message;
    return refuse(reason, result.code, message);
  }

  const { quote } = result;
  return NextResponse.json({
    ok: true,
    quote: {
      title: quote.title,
      // Decimal strings, exactly as they came back from the database. A JavaScript
      // number is not used for money anywhere in this codebase, and the browser is
      // not where that rule starts bending.
      listMinor: quote.list.amountMinor.toString(),
      discountMinor: quote.discount.amountMinor.toString(),
      taxMinor: quote.tax.amountMinor.toString(),
      feeMinor: quote.fee.amountMinor.toString(),
      chargeLabels: { tax: quote.taxLabel, fee: quote.feeLabel },
      totalMinor: quote.total.amountMinor.toString(),
      currencyCode: quote.currencyCode,
      promotionCode: quote.promotionCode,
      promotionName: quote.promotionName,
      reserved: false,
    },
  });
}
