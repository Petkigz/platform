import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { quoteCourseOrder } from '@/lib/checkout';
import { countryFromHeaders } from '@/lib/geo';

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
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, code: 'checkout_disabled', message: 'Payments are not configured on this deployment.' },
      { status: 503 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, code: 'not_signed_in', message: 'Sign in to see the price.' },
      { status: 401 },
    );
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, code: 'bad_request', message: 'Malformed request body.' },
      { status: 400 },
    );
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
    return NextResponse.json(
      { ok: false, code: 'bad_request', message: 'Choose the course and who it is for.' },
      { status: 400 },
    );
  }

  const result = await quoteCourseOrder(supabase, {
    courseId,
    learnerProfileId,
    country: countryFromHeaders(request.headers),
    promotionCode,
  });

  if (!result.ok) {
    // The same status convention as the checkout route, so a payer meets the same
    // answer whichever of the two they hit: 503 for a closed platform, 403 for "not
    // yours", 404 for "nothing to buy", 500 for anything nobody anticipated, 409 for
    // the expected conflicts, and 400 for a request that is wrong.
    const status =
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
    return NextResponse.json(
      { ok: false, code: result.code, message: result.message },
      { status },
    );
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
