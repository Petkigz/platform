import Link from 'next/link';
import type { Metadata } from 'next';
import { ClaimLearner } from '@/components/claim-learner';
import { cookies, headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { ownLearnerProfileId, resolveOffering } from '@/lib/enrolment';
import { countryFromHeaders, countryNameIn } from '@/lib/geo';
import { format } from '@/lib/money';
import { availableProviders, providersForAmount } from '@/lib/payments/registry';
import { findCountry } from '@/lib/phone';
import { isFlagEnabled } from '@/lib/flags';
import { REFERRAL_COOKIE, cleanReferralCode } from '@/lib/referrals';
import { fetchWithdrawalOffer } from '@/lib/withdrawal';
import { LOCALE_COOKIE, chooseLocale, languageShownFor, translator } from '@/lib/i18n';
import { BuyForm, type BuyWords } from './buy-form';

export const dynamic = 'force-dynamic';

/** The language this page is written in for this reader, and whether that is the one they chose. */
async function readerLanguage() {
  const jar = await cookies();
  const hdrs = await headers();
  const { code: locale } = chooseLocale({
    chosen: jar.get(LOCALE_COOKIE)?.value ?? null,
    acceptLanguage: hdrs.get('accept-language'),
  });
  const shown = languageShownFor(locale, 'buy');
  return { locale, shown };
}

export async function generateMetadata(): Promise<Metadata> {
  const { shown } = await readerLanguage();
  return { title: translator(shown.code)('buy.eyebrow') };
}

/** A name inside a sentence keeps its own direction. */
const isolate = (text: string) => `\u2068${text}\u2069`;

/**
 * Buy a course.
 *
 * The price is resolved here by `course_price_for_me()` — the same function the
 * order writer uses — so the sentence on this page and the amount on the order
 * cannot disagree. The form posts a course id, never a price and never an
 * amount. Before this, the page listed every market's price and posted a price
 * id, which made the cheapest market available to anybody who could edit a
 * request.
 *
 * **In the reader's language** (`messages/buy.ts`): twenty-seven languages
 * have it, and a language held for review reads it in English, whole. The
 * form is handed its words; so is the learner-profile button. The 14-day
 * withdrawal box inside the form is English on every page and marked as
 * English where the page is not: see the head of `buy-form.tsx`.
 *
 * **The amount is not translated.** It is a currency code and Latin digits
 * from the same formatter the order uses, kept left to right.
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

  const { data: courseData, error: courseError } = await supabase
    .from('courses')
    .select('id, slug, title, status, deleted_at')
    .eq('slug', slug)
    .is('deleted_at', null)
    .maybeSingle();
  // A read that failed is not a thing that does not exist: the site's error
  // page, not "not found" and not an empty list.
  if (courseError) throw new Error(courseError.message);

  const course = courseData as unknown as
    | { id: string; slug: string; title: string; status: string }
    | null;
  if (!course || course.status !== 'active') notFound();

  const { locale, shown } = await readerLanguage();
  const t = translator(shown.code);
  const frame = shown.code !== locale ? { lang: shown.code, dir: shown.dir } : {};

  const learnerProfileId = await ownLearnerProfileId(supabase, user.id);

  // One purchase covers one learner (decided 2026-10-22), so the form has to
  // say who it is for. RLS limits this list to the caller's own profile and the
  // learners in families they belong to, and the writer checks the same thing
  // again — this list is a convenience, not the control.
  const { data: learnerRows, error: learnersError } = await supabase
    .from('learner_profiles')
    .select('id,display_name,learner_type')
    .eq('status', 'active')
    .is('deleted_at', null)
    .order('display_name');
  // Unread is not "nobody to buy for": the form would offer no learner at all.
  if (learnersError) throw new Error(learnersError.message);
  const learners = ((learnerRows ?? []) as
    { id: string; display_name: string; learner_type: string }[]).map((row) => ({
      id: row.id,
      name: row.display_name,
      type: row.learner_type,
    }));

  // The top of every branch: where this is, and what is being bought. The
  // title is the teacher's and is in whatever language they wrote it.
  const head = (
    <>
      <nav className="crumbs">
        <Link href="/catalogue">{t('nav.catalogue')}</Link>
        <span aria-hidden>›</span>
        <Link href={`/courses/${course.slug}`} dir="auto">{course.title}</Link>
        <span aria-hidden>›</span>
        <span>{t('buy.crumb')}</span>
      </nav>

      <div className="page-head">
        <p className="eyebrow">{t('buy.eyebrow')}</p>
        <h1 dir="auto">{course.title}</h1>
      </div>
    </>
  );

  if (learners.length === 0) {
    return (
      <div className="page narrow" {...frame}>
        {head}

        <div className="notice warn">
          <strong>{t('buy.nobodyLead')}</strong> {t('buy.nobodyBody')}
        </div>

        <div style={{ marginTop: '1rem' }}>
          <ClaimLearner
            label={t('buy.claim')}
            note={t('buy.claimNote')}
            words={{
              busy: t('learn.claimBusy'),
              done: t('learn.claimDone'),
              ready: t('learn.claimReady'),
              failed: t('learn.claimFailed'),
            }}
          />
        </div>

        <p className="page-actions" style={{ marginTop: '1rem' }}>
          <Link href="/family" className="btn secondary">{t('buy.addChild')}</Link>{' '}
          <Link href={`/courses/${course.slug}`} className="btn ghost">
            {t('buy.backCourse')}
          </Link>
        </p>
      </div>
    );
  }

  const defaultLearnerId = learners.some((l) => l.id === learnerProfileId)
    ? (learnerProfileId as string)
    : learners[0]!.id;
  // A display hint only: the database prefers the country recorded on the
  // buyer's account, and the writer does the same. This is what makes the page
  // right for somebody who has never bought anything.
  const country = countryFromHeaders(await headers());

  // A code somebody arrived with. It is only a starting value for the box: the
  // discount is decided by `apply_promotion_to_order()` when the order is
  // written, and a code that is wrong or stale is refused there with a sentence
  // rather than silently charged.
  const referralCode = cleanReferralCode((await cookies()).get(REFERRAL_COOKIE)?.value);
  const first = await resolveOffering(supabase, {
    courseId: course.id,
    learnerProfileId: defaultLearnerId,
    country,
  });

  // Someone who already owns it should not be looking at a price. resolveOffering
  // answers this, and it is the same function the enrol button uses, so the two
  // cannot disagree about who is entitled.
  // With one learner there is nowhere else to buy for, so send them to their
  // learning.
  if (first.kind === 'entitled' && learners.length === 1) redirect('/learn');

  // With several, the first learner may already have it while a sibling does
  // not. The page used to say "choose another learner below" and then draw no
  // form at all, because the form was only drawn for a price and the answer
  // for this learner was "already has it": a family could not buy a second
  // child the course the first one owned. So the price is asked for again
  // without a learner, which is the question for everybody else, and the
  // learner who has it is left out of the list. Whether each of the others
  // has it is the writer's to refuse; it does, by name.
  const owner = first.kind === 'entitled' ? learners.find((l) => l.id === defaultLearnerId) : undefined;
  const offering = owner
    ? await resolveOffering(supabase, { courseId: course.id, learnerProfileId: null, country })
    : first;
  const buyable = owner ? learners.filter((l) => l.id !== owner.id) : learners;

  if (offering.kind === 'free') redirect(`/courses/${slug}`);

  // The course is sold, but not on terms this buyer can accept — no price for
  // their country, or two currencies and nothing to choose between them. Saying
  // so is better than a form that fails after the phone number is typed, and
  // much better than showing the cheapest market to everybody.
  if (offering.kind === 'not_sold_here') {
    const place = countryNameIn(offering.country, shown.code);
    return (
      <div className="page narrow" {...frame}>
        {head}

        <div className="notice warn">
          <strong>
            {offering.reason === 'not_one_time'
              ? t('buy.subLead')
              : offering.reason === 'price_ambiguous'
                ? t('buy.ambiguousLead')
                : place
                  ? t('buy.noPriceLead', { country: isolate(place) })
                  : t('buy.noPriceAny')}
          </strong>{' '}
          {offering.reason === 'price_ambiguous'
            ? t('buy.ambiguousBody')
            : offering.reason === 'not_one_time'
              ? t('buy.subBody')
              : t('buy.noPriceBody')}
        </div>

        <p className="page-actions" style={{ marginTop: '1.5rem' }}>
          <Link href={`/courses/${course.slug}`} className="btn secondary">
            {t('buy.backCourse')}
          </Link>
        </p>
      </div>
    );
  }

  // Checkout ships off and is opened from the admin dashboard. The order writer
  // refuses while it is closed, so a form that cannot work would only produce a
  // failure at the last step — after the payer has chosen a provider and typed a
  // phone number. Saying so up front is the difference between "not open yet"
  // and "the site is broken".
  const checkoutOpen = await isFlagEnabled(supabase, 'commerce.checkout');

  // The 14-day question, from the database: whether the right applies here,
  // whether a waiver may be offered, and the paragraph itself. A page that shows a
  // box the database would refuse to record is worse than one with no box, so the
  // offer is read rather than assumed from the country.
  const withdrawal = await fetchWithdrawalOffer(supabase, country);

  // Every provider that can take this order, not just the first. A learner
  // in Kampala may well have both MTN and Airtel, and being made to use one
  // specific network is an unnecessary reason to abandon a purchase.
  //
  // "Can take this order" is a question of currency. A mobile-money account
  // is one service in one country and collects that country's currency
  // (`lib/payments/markets.ts`), so a course priced in Kenyan shillings is
  // offered Kenya's accounts and no other. Each is shown with its country,
  // because that is also how a number typed without a country code is read.
  const priceCurrency = offering.kind === 'paid' ? offering.price.amount.currency : null;
  const anyProvider = availableProviders().length > 0;
  // And of amount: some operators collect whole amounts only, and a price
  // with a fraction is not offered one it would have to be rounded for.
  const providers = providersForAmount(offering.kind === 'paid' ? offering.price.amount : null).map((p) => ({
    id: p.id,
    label: p.label,
    requiresMsisdn: p.requiresMsisdn,
    country: p.market?.country ?? null,
    countryName: p.market ? (countryNameIn(p.market.country, shown.code) ?? p.market.country) : null,
    dial: p.market ? (findCountry(p.market.country)?.dial ?? null) : null,
  }));

  const noPrice = `${t('buy.noPriceAny')} ${t('buy.noPriceBody')}`;
  const words: BuyWords = {
    whoFor: t('buy.whoFor'),
    choose: t('buy.choose'),
    learnerChild: t('buy.learnerChild'),
    whoNote: t('buy.whoNote'),
    forOne: t('buy.forOne'),
    codeLabel: t('buy.codeLabel'),
    optional: t('family.optional'),
    checkPrice: t('buy.checkPrice'),
    checking: t('buy.checking'),
    codeNote: t('buy.codeNote'),
    quoteFailed: t('buy.quoteFailed'),
    quoteSimple: t('buy.quoteSimple'),
    quoteList: t('buy.quoteList'),
    quoteOffCode: t('buy.quoteOffCode'),
    quoteOff: t('buy.quoteOff'),
    quoteTax: t('buy.quoteTax'),
    quoteFee: t('buy.quoteFee'),
    quotePay: t('buy.quotePay'),
    quoteTaxNote: t('buy.quoteTaxNote'),
    quoteHolds: t('buy.quoteHolds'),
    payWith: t('buy.payWith'),
    phoneLabel: t('buy.phoneLabel'),
    phoneNote: t('buy.phoneNote'),
    phoneCountry: t('buy.phoneCountry'),
    // The phone card's own sentences for a number that cannot be read.
    phoneWhy: {
      locale: shown.code,
      why: {
        country: t('phone.whyCountry'),
        empty: t('phone.whyEmpty'),
        letters: t('phone.whyLetters'),
        punctuation: t('phone.whyPunctuation'),
        plus: t('phone.whyPlus'),
        other_country: t('phone.whyOtherCountry'),
        length_one: t('phone.whyLength'),
        length_range: t('phone.whyLengthRange'),
      },
      whyTrunk: t('phone.whyTrunk'),
    },
    continue: t('buy.continue'),
    starting: t('buy.starting'),
    noProviderNote: t('buy.noProviderNote'),
    approve: t('buy.approve'),
    orderSaved: t('buy.orderSaved'),
    unreachable: t('auth.offline'),
    // One sentence for each reason in `lib/checkout-outcome.ts`. The record
    // type makes a reason without a sentence a compile error.
    reasons: {
      not_signed_in: t('buy.signedOut'),
      disabled: t('buy.whyClosed'),
      course_not_available: t('buy.whyNoCourse'),
      price_not_available: t('buy.whyNoPrice'),
      not_one_time: `${t('buy.subLead')} ${t('buy.subBody')}`,
      no_price_for_country: noPrice,
      price_ambiguous: `${t('buy.ambiguousLead')} ${t('buy.ambiguousBody')}`,
      already_owned: t('buy.whyOwned'),
      learner_required: t('buy.whyChoose'),
      learner_not_yours: t('buy.whyNotYours'),
      unknown_code: t('buy.codeUnknown'),
      // "Switched off" and "outside its dates" are one thing to a buyer.
      not_active: t('buy.codeNotNow'),
      not_running: t('buy.codeNotNow'),
      not_in_market: t('buy.codeNotHere'),
      not_for_this_course: t('buy.codeNotCourse'),
      self_referral: t('buy.codeOwn'),
      new_customers_only: t('buy.codeNewOnly'),
      limit_reached_total: t('buy.codeUsedUp'),
      limit_reached_person: t('buy.codeUsedYou'),
      limit_reached_family: t('buy.codeUsedFamily'),
      would_be_free: t('buy.codeFree'),
      currency_mismatch: t('buy.codeCurrency'),
      nothing_off: t('buy.codeNothing'),
      // A request this form cannot have sent. Nothing was written.
      malformed: t('buy.refused'),
      free_course: t('buy.whyFree'),
      withdrawal_not_recorded: t('buy.whyWithdrawal'),
      provider_unavailable: t('buy.whyNoProvider'),
      phone_invalid: t('buy.whyPhone'),
      provider_failed: t('buy.whyProvider'),
      refused: t('buy.refused'),
      unconfirmed: t('buy.unconfirmed'),
    },
  };

  const place = offering.kind === 'paid' && offering.match === 'country'
    ? countryNameIn(offering.country, shown.code)
    : null;

  return (
    <div className="page narrow" {...frame}>
      {head}

      {checkoutOpen && owner && offering.kind === 'paid' && (
        <div className="notice warn">
          {t('buy.hasAlready', { name: isolate(owner.name) })}
        </div>
      )}

      {checkoutOpen && providers.length === 0 && (
        <div className="notice warn">
          {/* None connected at all, or none that collects this course's currency. */}
          <strong>
            {anyProvider && priceCurrency
              ? t('buy.noProviderHere', { currency: priceCurrency })
              : t('buy.noProviderLead')}
          </strong>{' '}
          {t('buy.noProviderBody')}
        </div>
      )}

      {!checkoutOpen && (
        <div className="notice warn">
          <strong>{t('buy.closedLead')}</strong> {t('buy.closedBody')}
        </div>
      )}

      {checkoutOpen && offering.kind !== 'paid' && (
        <div className="notice">{t('buy.notOnSale')}</div>
      )}

      {checkoutOpen && offering.kind === 'paid' && (
        <section className="card">
          <h2 style={{ marginTop: 0 }}>{t('buy.payHeading')}</h2>
          {/* Rendered from Money, so what the payer reads is the same integer
              minor units the order will carry. */}
          <p style={{ fontSize: '1.5rem', margin: '0 0 0.25rem' }}>
            <bdi dir="ltr">{format(offering.price.amount)}</bdi>
          </p>
          <p className="meta">
            {place ? t('buy.pricedFor', { country: isolate(place) }) : t('buy.standardPrice')}{' '}
            {t('buy.oneOff')}
          </p>

          <BuyForm
            courseId={course.id}
            learners={buyable}
            // Somebody already has it and more than one other could be meant:
            // nobody is chosen for the buyer, because the wrong child is a
            // purchase that cannot be moved.
            defaultLearnerId={owner ? (buyable.length === 1 ? buyable[0]!.id : '') : defaultLearnerId}
            providers={providers}
            providerConfigured={providers.length > 0}
            defaultCode={referralCode}
            withdrawal={withdrawal}
            words={words}
            markEnglish={shown.code !== 'en'}
          />
        </section>
      )}

      <p className="muted" style={{ marginTop: '1rem' }}>
        {t('buy.accessNote')} <Link href="/orders">{t('broke.orders')}</Link>
      </p>
    </div>
  );
}
