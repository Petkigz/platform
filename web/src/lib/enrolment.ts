/**
 * What it takes to enrol in a course, and doing it when it is free.
 *
 * The distinction this module exists to hold: **enrolment is not entitlement**.
 * A free course can be enrolled in directly. A paid one cannot — the learner
 * needs an entitlement grant first, which only appears once a payment has
 * been recorded by `record_payment_success()`.
 *
 * Payment eligibility is enforced in `can_enrol_in_version`. When the guardian
 * consent flag is enabled, that same function and a BEFORE INSERT/UPDATE trigger
 * require an active verified guardian for child enrolments, including internal
 * SECURITY DEFINER writers. This module only translates the refusal for the UI;
 * it cannot authorize an enrolment.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { fromMinor, format, type Money } from './money.ts';

export type OfferingCountrySource = 'account' | 'request' | 'none';

export type OfferingPrice = {
  id: string;
  amount: Money;
  billingInterval: string;
  market: string | null;
};

export type Offering =
  | { kind: 'free' }
  /** The learner already holds a live entitlement. */
  | { kind: 'entitled' }
  | {
      kind: 'paid';
      price: OfferingPrice;
      /** `country` when a market matched, `default` when no market was declared. */
      match: 'country' | 'default';
      country: string | null;
      countrySource: OfferingCountrySource;
    }
  /**
   * The course is on sale, but not on terms this buyer can accept: no price for
   * their country, or more than one currency and nothing to choose between
   * them. It is deliberately not `free` — a sold course can never be enrolled
   * in for free, and saying "Free" here would be a promise the enrolment gate
   * refuses a moment later.
   */
  | { kind: 'not_sold_here'; reason: string; country: string | null };

/** What `course_price_for_me()` answers. Money is a decimal string. */
export type CoursePriceAnswer = {
  resolved?: boolean;
  reason?: string | null;
  hasLivePrice?: boolean;
  country?: string | null;
  countrySource?: string;
  priceId?: string;
  amountMinor?: string;
  currencyCode?: string;
  billingInterval?: string;
  market?: string | null;
  matched?: string;
};

/**
 * Turn the reader's answer into an offering.
 *
 * Pure and exported because the branching is the part worth testing: a course
 * with no live price anywhere is free, a course with a live price the buyer
 * cannot have is *not* free, and a paid answer without an amount must never be
 * treated as zero.
 */
export function offeringFromAnswer(answer: CoursePriceAnswer | null | undefined): Offering {
  const country = typeof answer?.country === 'string' ? answer.country : null;
  const source: OfferingCountrySource =
    answer?.countrySource === 'account' || answer?.countrySource === 'request'
      ? answer.countrySource
      : 'none';

  // Nothing live anywhere: the course is genuinely free, which is the
  // catalogue question rather than the buyer's.
  if (!answer || answer.hasLivePrice !== true) return { kind: 'free' };

  if (
    answer.resolved === true &&
    typeof answer.priceId === 'string' &&
    typeof answer.amountMinor === 'string' &&
    typeof answer.currencyCode === 'string'
  ) {
    return {
      kind: 'paid',
      price: {
        id: answer.priceId,
        amount: fromMinor(answer.amountMinor, answer.currencyCode),
        billingInterval: answer.billingInterval ?? 'one_time',
        market: answer.market ?? null,
      },
      match: answer.matched === 'country' ? 'country' : 'default',
      country,
      countrySource: source,
    };
  }

  return {
    kind: 'not_sold_here',
    reason: answer.reason ?? 'no_price_for_country',
    country,
  };
}

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
  args: {
    courseId: string;
    learnerProfileId: string | null;
    /**
     * The country the request arrived from, as a display hint. The database
     * prefers the account's recorded country and ignores this when there is
     * one, so a tampered value cannot change what a signed-in buyer is charged
     * — it can only change what a signed-out visitor is shown.
     */
    country?: string | null;
  },
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

  // The price is resolved by the same function `create_course_order()` uses, so
  // what the page shows and what the order charges cannot disagree. Before this,
  // the page listed every market's price and the writer accepted any of them.
  const { data, error } = await supabase.rpc('course_price_for_me', {
    p_course_id: args.courseId,
    p_country: args.country ?? null,
  });
  if (error) throw new Error(error.message);

  return offeringFromAnswer(data as CoursePriceAnswer | null);
}

export function offeringLabel(o: Offering): string {
  if (o.kind === 'free') return 'Free';
  if (o.kind === 'entitled') return 'Included in your access';
  if (o.kind === 'not_sold_here') {
    if (o.reason === 'not_one_time') return 'Not sold as a one-off course';
    if (o.reason === 'price_ambiguous') return 'Price needs a correct currency';
    return 'Not available in your country yet';
  }
  return format(o.price.amount);
}

export type EnrolOutcome =
  | { ok: true; enrolmentId: string }
  | { ok: false; code: EnrolErrorCode; message: string };

export type EnrolErrorCode =
  | 'not_signed_in'
  | 'no_learner_profile'
  | 'no_published_version'
  | 'payment_required'
  | 'not_sold_here'
  | 'guardian_verification_required'
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
export type EnrollableLearner = {
  id: string;
  name: string;
  isSelf: boolean;
  /** Present for a child, so the UI can say whose learning this is. */
  ageBand: string | null;
};

/**
 * Who this account can enrol.
 *
 * A child is a `learner_profile` under a `family`, never a `user` (D2) — so a
 * child cannot sign in, and cannot enrol themselves. If the parent cannot enrol
 * them either, the child has no route into a course at all. That was the
 * situation: the database allowed it (`course_enrolments_insert` is gated on
 * `can_access_learner`, which already covers family members), and the
 * application never asked.
 *
 * This returns the caller's own profile plus the child profiles they may act
 * for. It does not decide who is permitted — RLS narrows what comes back, so
 * the list is a consequence of the policies rather than a second opinion about
 * them.
 */
export async function enrollableLearners(
  supabase: SupabaseClient,
  userId: string,
): Promise<EnrollableLearner[]> {
  const out: EnrollableLearner[] = [];

  const { data: own } = await supabase
    .from('learner_profiles')
    .select('id, display_name')
    .eq('linked_user_id', userId)
    .is('deleted_at', null)
    .maybeSingle();

  const ownRow = own as unknown as { id: string; display_name: string } | null;
  if (ownRow) {
    out.push({
      id: ownRow.id,
      name: ownRow.display_name,
      isSelf: true,
      ageBand: null,
    });
  }

  const { data: memberships } = await supabase
    .from('family_memberships')
    .select(
      'families ( learner_profiles ( id, display_name, age_band, learner_type, linked_user_id ) )',
    )
    .eq('user_id', userId)
    .eq('status', 'active');

  type ChildRow = {
    id: string;
    display_name: string;
    age_band: string | null;
    learner_type: string;
    linked_user_id: string | null;
  };
  const children = ((memberships ?? []) as {
    families: { learner_profiles: ChildRow[] | null }[] | null;
  }[])
    .flatMap((m) => m.families ?? [])
    .flatMap((f) => f.learner_profiles ?? [])
    // A child only. An adult profile in the family enrols for themselves; doing
    // it for them would put one adult's decisions on another's record.
    .filter((c) => c.learner_type === 'child' && !c.linked_user_id);

  for (const c of children) {
    if (out.some((o) => o.id === c.id)) continue;
    out.push({
      id: c.id,
      name: c.display_name,
      isSelf: false,
      ageBand: c.age_band,
    });
  }

  return out;
}

export async function enrolInFreeCourse(
  supabase: SupabaseClient,
  args: {
    userId: string;
    courseId: string;
    learnerProfileId?: string | null;
    country?: string | null;
  },
): Promise<EnrolOutcome> {
  // Who is learning. Defaults to the caller. When a parent enrols a child the
  // id is supplied by the client — and that is safe only because
  // course_enrolments_insert is gated on can_access_learner(learner_profile_id),
  // so the database decides whether this caller may act for that learner. This
  // function does not re-implement that check; a second, weaker copy of an
  // authorisation rule is how the two drift apart.
  const learnerProfileId =
    args.learnerProfileId ?? (await ownLearnerProfileId(supabase, args.userId));
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
    country: args.country ?? null,
  });

  if (offering.kind === 'not_sold_here') {
    // Sold, but not on terms this buyer can accept. The enrolment gate refuses a
    // sold course as a free enrolment on its own, so this is the sentence rather
    // than the decision.
    return {
      ok: false,
      code: 'not_sold_here',
      message:
        "This course is on sale, but not for your country yet. We are opening " +
        "markets one at a time and would rather tell you than take a payment we " +
        "cannot price. Contact us and we will let you know when it opens.",
    };
  }

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
    // The database trigger is authoritative and its specific reason is safe to
    // translate into the parent's next step; no client-side check can authorize
    // the enrolment.
    if (/verified guardian consent is required/i.test(error.message)) {
      return {
        ok: false,
        code: 'guardian_verification_required',
        message: 'A verified parent or guardian must complete the consent review before this child can enrol.',
      };
    }
    // A refused insert under RLS otherwise stays intentionally generic rather
    // than leaking the policy name to the browser.
    return {
      ok: false,
      code: 'not_available',
      message: 'This course is not available for enrolment right now.',
    };
  }

  return { ok: true, enrolmentId: (data as { id: string }).id };
}
