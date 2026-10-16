/**
 * What it takes to enrol in a course, and doing it when it is free.
 *
 * The distinction this module exists to hold: **enrolment is not entitlement**.
 * A free course can be enrolled in directly. A paid one cannot — the learner
 * needs an entitlement grant first, which only appears once a payment has
 * been recorded by `record_payment_success()`.
 *
 * That rule is enforced in the database (`can_enrol_in_version`, migration
 * 20261023000100). This module reflects it in the UI so we show the right
 * button, but the database is what actually holds the line. If this file were
 * deleted, a paid course would still be impossible to take for free; if the
 * migration were deleted, this file would be the only thing standing between
 * a learner and someone else's paid content.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { fromMinor, format, type Money } from './money.ts';

export type Offering =
  | { kind: 'free' }
  | { kind: 'paid'; prices: OfferingPrice[] }
  /** The learner already holds a live entitlement. */
  | { kind: 'entitled' };

export type OfferingPrice = {
  id: string;
  amount: Money;
  billingInterval: string;
  market: string | null;
};

type PriceRow = {
  id: string;
  amount_minor: string | number;
  currency_code: string;
  billing_interval: string;
  market: string | null;
  status: string;
  effective_from: string;
  effective_until: string | null;
};

type ProductRow = {
  id: string;
  status: string;
  prices: PriceRow[] | null;
};

type PcvRow = { product_id: string; products: ProductRow[] | null };

/** The version the learner would actually enrol into: the published one. */
export async function publishedVersionId(
  supabase: SupabaseClient,
  courseId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('course_versions')
    .select('id, version_number')
    .eq('course_id', courseId)
    .eq('version_status', 'published')
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as { id: string } | null)?.id ?? null;
}

/** Is a live price attached to any product carrying this version? */
async function pricesForVersion(
  supabase: SupabaseClient,
  versionId: string,
): Promise<OfferingPrice[]> {
  const { data, error } = await supabase
    .from('product_course_versions')
    .select('product_id, products ( id, status, prices ( id, amount_minor, currency_code, billing_interval, market, status, effective_from, effective_until ) )')
    .eq('course_version_id', versionId);

  if (error) throw new Error(error.message);
  const rows = (data ?? []) as unknown as PcvRow[];

  const now = new Date().toISOString();
  const out: OfferingPrice[] = [];

  for (const pcv of rows) {
    const product = pcv.products?.[0];
    // A draft or retired product cannot be bought, so it does not make the
    // course paid. This mirrors the note on products.status in the schema.
    if (!product || product.status !== 'active') continue;

    for (const p of product.prices ?? []) {
      if (p.status !== 'active') continue;
      if (p.effective_from > now) continue;
      if (p.effective_until && p.effective_until <= now) continue;
      out.push({
        id: p.id,
        amount: fromMinor(p.amount_minor, p.currency_code),
        billingInterval: p.billing_interval,
        market: p.market,
      });
    }
  }
  return out;
}

/** The learner profile owned by the signed-in user, if they have one. */
export async function ownLearnerProfileId(
  supabase: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('learner_profiles')
    .select('id')
    .eq('linked_user_id', userId)
    .eq('deleted_at', null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as { id: string } | null)?.id ?? null;
}

export async function resolveOffering(
  supabase: SupabaseClient,
  args: { courseId: string; learnerProfileId: string | null },
): Promise<Offering> {
  const versionId = await publishedVersionId(supabase, args.courseId);
  if (!versionId) return { kind: 'free' };

  // Already entitled beats everything: a learner who bought a course, or was
  // granted it by a family plan, enrols without seeing a price.
  if (args.learnerProfileId) {
    const { data: entitled, error } = await supabase.rpc(
      'can_access_course_version',
      { p_learner_id: args.learnerProfileId, p_version_id: versionId },
    );
    if (error) throw new Error(error.message);
    if (entitled === true) return { kind: 'entitled' };
  }

  const prices = await pricesForVersion(supabase, versionId);
  return prices.length > 0 ? { kind: 'paid', prices } : { kind: 'free' };
}

export function offeringLabel(o: Offering): string {
  if (o.kind === 'free') return 'Free';
  if (o.kind === 'entitled') return 'Included in your access';
  const first = o.prices[0];
  if (!first) return 'Price coming soon';
  return format(first.amount);
}

export type EnrolOutcome =
  | { ok: true; enrolmentId: string }
  | { ok: false; code: EnrolErrorCode; message: string };

export type EnrolErrorCode =
  | 'not_signed_in'
  | 'no_learner_profile'
  | 'no_published_version'
  | 'payment_required'
  | 'not_available'
  | 'already_enrolled';

/**
 * Enrol in a free course.
 *
 * Returns a typed outcome rather than throwing, because every failure here is
 * a thing the UI has to explain — not a 500.
 *
 * There is no `source` parameter. A free enrolment is `source = 'free'` and
 * nothing else; a paid one never reaches this function.
 */
export async function enrolInFreeCourse(
  supabase: SupabaseClient,
  args: { userId: string; courseId: string },
): Promise<EnrolOutcome> {
  const learnerProfileId = await ownLearnerProfileId(supabase, args.userId);
  if (!learnerProfileId) {
    return {
      ok: false,
      code: 'no_learner_profile',
      message:
        'Your account has no learner profile yet. Finish setting up your ' +
        'profile, then try again.',
    };
  }

  const offering = await resolveOffering(supabase, {
    courseId: args.courseId,
    learnerProfileId,
  });

  if (offering.kind === 'paid') {
    return {
      ok: false,
      code: 'payment_required',
      message:
        'This course is paid. Checkout is not open yet — no payment provider ' +
        'has been connected. You will be able to buy it when that lands.',
    };
  }

  const versionId = await publishedVersionId(supabase, args.courseId);
  if (!versionId) {
    return {
      ok: false,
      code: 'no_published_version',
      message: 'This course is not open for enrolment yet.',
    };
  }

  const { data: existing } = await supabase
    .from('course_enrolments')
    .select('id')
    .eq('learner_profile_id', learnerProfileId)
    .eq('course_id', args.courseId)
    .eq('deleted_at', null)
    .limit(1);

  if (existing && existing.length > 0) {
    return { ok: false, code: 'already_enrolled', message: 'You are already enrolled.' };
  }

  // No client-side check that we are allowed to enrol. The insert either
  // succeeds or RLS refuses it — `can_enrol_in_version` is the authority.
  const { data, error } = await supabase
    .from('course_enrolments')
    .insert({
      learner_profile_id: learnerProfileId,
      course_id: args.courseId,
      course_version_id: versionId,
      source: 'free',
      status: 'active',
    })
    .select('id')
    .single();

  if (error) {
    // A refused insert under RLS surfaces as a policy error. Treat it as
    // "not available" rather than leaking the policy name to the browser.
    return {
      ok: false,
      code: 'not_available',
      message: 'This course is not available for enrolment right now.',
    };
  }

  return { ok: true, enrolmentId: (data as { id: string }).id };
}
