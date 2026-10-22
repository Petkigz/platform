import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { ownLearnerProfileId, resolveOffering } from '@/lib/enrolment';
import { countryFromHeaders, countryName } from '@/lib/geo';
import { format } from '@/lib/money';
import { availableProviders, configuredProviderId } from '@/lib/payments/registry';
import { isFlagEnabled } from '@/lib/flags';
import { BuyForm } from './buy-form';

export const dynamic = 'force-dynamic';

/**
 * Buy a course.
 *
 * The price is resolved here by `course_price_for_me()` — the same function the
 * order writer uses — so the sentence on this page and the amount on the order
 * cannot disagree. The form posts a course id, never a price and never an
 * amount. Before this, the page listed every market's price and posted a price
 * id, which made the cheapest market available to anybody who could edit a
 * request.
 */
export default async function BuyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  if (!isSupabaseConfigured()) redirect('/');

  const { slug } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/sign-in?next=/courses/${slug}/buy`);

  const { data: courseData } = await supabase
    .from('courses')
    .select('id, slug, title, status, deleted_at')
    .eq('slug', slug)
    .is('deleted_at', null)
    .maybeSingle();

  const course = courseData as unknown as
    | { id: string; slug: string; title: string; status: string }
    | null;
  if (!course || course.status !== 'active') notFound();

  const learnerProfileId = await ownLearnerProfileId(supabase, user.id);

  // One purchase covers one learner (decided 2026-10-22), so the form has to
  // say who it is for. RLS limits this list to the caller's own profile and the
  // learners in families they belong to, and the writer checks the same thing
  // again — this list is a convenience, not the control.
  const { data: learnerRows } = await supabase
    .from('learner_profiles')
    .select('id,display_name,learner_type')
    .eq('status', 'active')
    .is('deleted_at', null)
    .order('display_name');
  const learners = ((learnerRows ?? []) as
    { id: string; display_name: string; learner_type: string }[]).map((row) => ({
      id: row.id,
      name: row.display_name,
      type: row.learner_type,
    }));

  if (learners.length === 0) {
    return (
      <main className="page narrow">
        <nav className="crumbs">
          <Link href="/catalogue">Catalogue</Link>
          <span aria-hidden>›</span>
          <Link href={`/courses/${course.slug}`}>{course.title}</Link>
          <span aria-hidden>›</span>
          <span>Buy</span>
        </nav>

        <div className="page-head">
          <p className="eyebrow">Checkout</p>
          <h1>{course.title}</h1>
        </div>

        <div className="notice warn">
          <strong>There is nobody to buy this for yet.</strong> A course purchase
          covers one learner, so add a learner profile first — your own, or a
          child&apos;s in your family.
        </div>

        <p style={{ marginTop: '1.5rem' }}>
          <Link href="/family" className="btn">Add a learner</Link>{' '}
          <Link href={`/courses/${course.slug}`} className="btn secondary">
            Back to the course
          </Link>
        </p>
      </main>
    );
  }

  const defaultLearnerId = learners.some((l) => l.id === learnerProfileId)
    ? (learnerProfileId as string)
    : learners[0]!.id;
  // A display hint only: the database prefers the country recorded on the
  // buyer's account, and the writer does the same. This is what makes the page
  // right for somebody who has never bought anything.
  const country = countryFromHeaders(await headers());
  const offering = await resolveOffering(supabase, {
    courseId: course.id,
    learnerProfileId: defaultLearnerId,
    country,
  });

  // Someone who already owns it should not be looking at a price. resolveOffering
  // answers this, and it is the same function the enrol button uses, so the two
  // cannot disagree about who is entitled.
  // With one learner there is nowhere else to buy for, so send them to their
  // learning. With several, the picked learner may already have it while a
  // sibling does not — the form says so and lets them choose, rather than
  // sending the whole family away from a course one child still needs.
  if (offering.kind === 'entitled' && learners.length === 1) redirect('/learn');
  if (offering.kind === 'free') redirect(`/courses/${slug}`);

  // The course is sold, but not on terms this buyer can accept — no price for
  // their country, or two currencies and nothing to choose between them. Saying
  // so is better than a form that fails after the phone number is typed, and
  // much better than showing the cheapest market to everybody.
  if (offering.kind === 'not_sold_here') {
    const place = countryName(offering.country);
    return (
      <main className="page narrow">
        <nav className="crumbs">
          <Link href="/catalogue">Catalogue</Link>
          <span aria-hidden>›</span>
          <Link href={`/courses/${course.slug}`}>{course.title}</Link>
          <span aria-hidden>›</span>
          <span>Buy</span>
        </nav>

        <div className="page-head">
          <p className="eyebrow">Checkout</p>
          <h1>{course.title}</h1>
        </div>

        <div className="notice warn">
          <strong>
            {offering.reason === 'not_one_time'
              ? 'This course is sold as a subscription, not as a one-off purchase.'
              : offering.reason === 'price_ambiguous'
                ? 'This course has more than one price for your country.'
                : `This course is not priced for ${place ?? 'your country'} yet.`}
          </strong>{' '}
          {offering.reason === 'price_ambiguous'
            ? 'We will not choose a currency on your behalf. Contact us and we will set the right one, then you can buy it.'
            : offering.reason === 'not_one_time'
              ? 'Subscriptions are not on sale through this checkout yet. Nothing has been charged.'
              : 'Nothing has been charged. Contact us and we will open your market, then you can buy it.'}
        </div>

        <p style={{ marginTop: '1.5rem' }}>
          <Link href={`/courses/${course.slug}`} className="btn secondary">
            Back to the course
          </Link>
        </p>
      </main>
    );
  }

  // Checkout ships off and is opened from the admin dashboard. The order writer
  // refuses while it is closed, so a form that cannot work would only produce a
  // failure at the last step — after the payer has chosen a provider and typed a
  // phone number. Saying so up front is the difference between "not open yet"
  // and "the site is broken".
  const checkoutOpen = await isFlagEnabled(supabase, 'commerce.checkout');

  const providerId = configuredProviderId();
  // Every provider that is configured and usable, not just the first. A learner
  // in Kampala may well have both MTN and Airtel, and being made to use one
  // specific network is an unnecessary reason to abandon a purchase.
  const providers = availableProviders().map((p) => ({
    id: p.id,
    label: p.label,
    requiresMsisdn: p.requiresMsisdn,
  }));

  return (
    <main className="page narrow">
      <nav className="crumbs">
        <Link href="/catalogue">Catalogue</Link>
        <span aria-hidden>›</span>
        <Link href={`/courses/${course.slug}`}>{course.title}</Link>
        <span aria-hidden>›</span>
        <span>Buy</span>
      </nav>

      <div className="page-head">
        <p className="eyebrow">Checkout</p>
        <h1>{course.title}</h1>
      </div>

      {checkoutOpen && offering.kind === 'entitled' && learners.length > 1 && (
        <div className="notice warn">
          The learner selected by default already has this course. Choose
          another learner below if you are buying it for somebody else.
        </div>
      )}

      {checkoutOpen && providerId === null && (
        <div className="notice warn">
          <strong>No payment provider is connected yet.</strong> You can place
          this order and it will be saved, but it cannot be paid until a provider
          is configured. Nothing is charged and you keep no access until payment
          is confirmed.
        </div>
      )}

      {!checkoutOpen && (
        <div className="notice warn">
          <strong>Checkout is not open yet.</strong> This platform is not taking
          payment for courses at the moment, so no order can be placed and
          nothing has been charged. Free courses can still be joined from the
          course page.
        </div>
      )}

      {checkoutOpen && offering.kind !== 'paid' && (
        <div className="notice">
          This course is not on sale to you at the moment, so there is nothing
          to pay.
        </div>
      )}

      {checkoutOpen && offering.kind === 'paid' && (
        <section className="card">
          <h2>What you will pay</h2>
          {/* Rendered from Money, so what the payer reads is the same integer
              minor units the order will carry. */}
          <p style={{ fontSize: '1.5rem', margin: '0 0 0.25rem' }}>
            {format(offering.price.amount)}
          </p>
          <p className="meta">
            {offering.match === 'country' && offering.country
              ? `Priced for ${countryName(offering.country) ?? offering.country}.`
              : 'The standard price.'}{' '}
            One-off purchase, not a subscription.
          </p>

          <BuyForm
            courseId={course.id}
            learners={learners}
            defaultLearnerId={defaultLearnerId}
            providers={providers}
            providerConfigured={providerId !== null}
          />
        </section>
      )}

      <p className="muted">
        Access starts when payment is confirmed, not when you press the button.
        You will see the order in{' '}
        <Link href="/orders">your orders</Link> either way.
      </p>
    </main>
  );
}
