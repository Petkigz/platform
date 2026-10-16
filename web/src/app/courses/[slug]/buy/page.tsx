import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { ownLearnerProfileId, resolveOffering } from '@/lib/enrolment';
import { format } from '@/lib/money';
import { availableProviders, configuredProviderId } from '@/lib/payments/registry';
import { BuyForm } from './buy-form';

export const dynamic = 'force-dynamic';

/**
 * Buy a course.
 *
 * Prices are rendered here from the database, and the client posts back a price
 * **id** — never an amount. The amount is resolved again server-side in
 * `createOrder`, so tampering with this form cannot change what is charged.
 * That is worth stating plainly because it is the whole reason the form is
 * shaped this way: a checkout that accepts a posted total is a checkout where
 * the total is whatever the caller typed.
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
  const offering = await resolveOffering(supabase, {
    courseId: course.id,
    learnerProfileId,
  });

  // Someone who already owns it should not be looking at a price. resolveOffering
  // answers this, and it is the same function the enrol button uses, so the two
  // cannot disagree about who is entitled.
  if (offering.kind === 'entitled') redirect('/learn');
  if (offering.kind === 'free') redirect(`/courses/${slug}`);

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

      {providerId === null && (
        <div className="notice warn">
          <strong>No payment provider is connected yet.</strong> You can place
          this order and it will be saved, but it cannot be paid until a provider
          is configured. Nothing is charged and you keep no access until payment
          is confirmed.
        </div>
      )}

      <section className="card">
        <h2>Choose an option</h2>
        <BuyForm
          courseId={course.id}
          prices={offering.prices.map((p) => ({
            id: p.id,
            // Rendered from Money, so what the payer sees is the same integer
            // minor units that will be charged.
            label: format(p.amount),
            interval: p.billingInterval,
          }))}
          providers={providers}
          providerConfigured={providerId !== null}
        />
      </section>

      <p className="muted">
        Access starts when payment is confirmed, not when you press the button.
        You will see the order in{' '}
        <Link href="/orders">your orders</Link> either way.
      </p>
    </main>
  );
}
