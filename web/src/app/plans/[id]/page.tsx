import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { ClaimLearner } from '@/components/claim-learner';
import { Say } from '@/components/say';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { countryNameIn } from '@/lib/geo';
import { isFlagEnabled } from '@/lib/flags';
import { formatDateTime, translator } from '@/lib/i18n';
import { availableProviders, providersForAmount } from '@/lib/payments/registry';
import { findCountry } from '@/lib/phone';
import { PERIOD_KEY, learnersFor, standingOf } from '@/lib/plans';
import { SUBSCRIPTIONS_FLAG, readStorefront, readerLanguage } from '../storefront';
import { PlanPayForm, type PlanPayOffer, type PlanPayWords } from './plan-pay-form';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

export async function generateMetadata(): Promise<Metadata> {
  const { shown } = await readerLanguage();
  return { title: translator(shown.code)('plans.title') };
}

/**
 * Pay for one plan.
 *
 * Addressed by the plan version: that is what is bought. The page reads the
 * plan through the same function as the list (`storefront.ts`), so the price
 * here is the price there, and a version that is not the one on sale is not
 * found here either.
 *
 * **It offers only what the writer would take.** The learners are the
 * buyer's own adult profile (when the plan has a place for an adult) and the
 * children they can see (when it has places for children). The prices are
 * the ones their billing account would be charged. The services are the ones
 * that collect that amount. Each of those was a refusal after pressing the
 * button before; now it is not offered.
 *
 * **A plan the account already has is said, not sold twice.** The writer
 * refuses a second subscription to a plan while one is pending or paid up.
 * The page reads the account's subscriptions and says which, with the way
 * out for a pending one: it is cancelled on the subscriptions page.
 *
 * **No order without a way to pay it.** With no service that can collect the
 * price there is no form: an unpaid plan order would stand in the way of
 * every later one. (A course order saved without a service is harmless, and
 * the buy page still allows it.)
 *
 * Not on this page: the 14-day withdrawal question the buy page asks a buyer
 * in the EU, EEA or UK. The old plans page did not ask it either; it is
 * listed in `docs/remaining.md`.
 */
export default async function PlanPayPage({ params }: { params: Promise<{ id: string }> }) {
  if (!isSupabaseConfigured()) redirect('/plans');
  const { id: raw } = await params;
  const id = raw.toLowerCase();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(UUID.test(id) ? `/sign-in?next=/plans/${id}` : '/plans');

  const { locale, shown } = await readerLanguage();
  const t = translator(shown.code);
  const frame = shown.code !== locale ? { lang: shown.code, dir: shown.dir } : {};

  const back = (
    <p style={{ marginTop: '1.25rem' }}>
      <Link href="/plans">{t('nav.plans')}</Link>
    </p>
  );
  const shell = (title: string | null, body: React.ReactNode) => (
    <div className="page narrow" {...frame}>
      <div className="page-head">
        <p className="eyebrow">
          <Link href="/plans">{t('nav.plans')}</Link>
        </p>
        {title === null ? <h1>{t('plans.title')}</h1> : <h1 dir="auto">{title}</h1>}
      </div>
      {body}
      {back}
    </div>
  );

  const unread = shell(null, <div className="notice error" role="alert" data-pay-state="unread">{t('plans.unread')}</div>);

  // The switch first: while plans are not on sale nothing about one is read.
  const open = await isFlagEnabled(supabase, SUBSCRIPTIONS_FLAG).catch(() => null);
  if (open === null) return unread;
  if (!open) {
    return shell(
      null,
      <div className="notice warn" data-pay-state="closed">
        <strong>{t('plans.closedLead')}</strong> {t('plans.closedBody')}
      </div>,
    );
  }

  // Which plan this version belongs to. A version that is not on sale is not
  // readable at all (row policy), so "no row" is "not here".
  let planId: string | null = null;
  if (UUID.test(id)) {
    const version = await supabase.from('plan_versions').select('plan_id').eq('id', id).eq('status', 'active').maybeSingle();
    if (version.error) return unread;
    const found = (version.data as { plan_id?: unknown } | null)?.plan_id;
    planId = typeof found === 'string' ? found : null;
  }
  const notHere = shell(null, <div className="notice warn" data-pay-state="not-here">{t('plans.notHere')}</div>);
  if (planId === null) return notHere;

  const store = await readStorefront(supabase, user.id, { planId });
  if (store.state === 'unread') return unread;
  const card = store.cards.find((c) => c.versionId === id);
  if (!card) return notHere;

  const summary = (
    <div className="card plan-card" data-plan={card.versionId}>
      {card.description && (
        <p className="muted" dir="auto">
          {card.description}
        </p>
      )}
      {card.offers.length > 0 && (
        <ul className="plan-lines plan-prices">
          {card.offers.map((offer) => (
            <li key={offer.priceId}>
              <Say
                text={t(PERIOD_KEY[card.period])}
                parts={{
                  amount: (
                    <strong>
                      <bdi dir="ltr">{offer.amount}</bdi>
                    </strong>
                  ),
                }}
              />
            </li>
          ))}
        </ul>
      )}
      <p className="muted" style={{ margin: 0 }}>
        {t('plans.noRenew')}
      </p>
    </div>
  );
  const mine = (
    <p>
      <Link href="/subscriptions">{t('nav.subscriptions')}</Link>
    </p>
  );

  // What the account already has of this plan. A read that fails is not a
  // reason to hide the form: the writer decides, and its refusal has a sentence.
  if (store.accountId) {
    const held = await supabase
      .from('subscriptions')
      .select('plan_id,status,current_period_end')
      .eq('billing_account_id', store.accountId)
      .eq('plan_id', card.planId);
    const standing = held.error ? null : standingOf(held.data, card.planId, Date.now());
    if (standing?.kind === 'waiting') {
      return shell(
        card.name,
        <>
          {summary}
          <div className="notice warn" data-pay-state="waiting" style={{ marginTop: '1rem' }}>
            {t('plans.waiting')}
          </div>
          {mine}
        </>,
      );
    }
    if (standing?.kind === 'live') {
      return shell(
        card.name,
        <>
          {summary}
          <div className="notice" data-pay-state="live" style={{ marginTop: '1rem' }}>
            <Say
              text={t('plans.haveLive')}
              parts={{ date: <bdi>{formatDateTime(locale, standing.until, 'UTC')}</bdi> }}
            />
          </div>
          {mine}
        </>,
      );
    }
  }

  if (card.offers.length === 0) {
    return shell(
      card.name,
      <>
        {summary}
        <div className="notice warn" data-pay-state="no-price" style={{ marginTop: '1rem' }}>
          {t('plans.noPrice')}
        </div>
      </>,
    );
  }

  // Who it can be for. The row policy limits the list to the buyer's own
  // profile and their family's; the writer checks again.
  const profiles = await supabase
    .from('learner_profiles')
    .select('id,display_name,learner_type,linked_user_id')
    .eq('status', 'active')
    .is('deleted_at', null)
    .order('display_name');
  const learners = profiles.error ? null : learnersFor(profiles.data, card, user.id);
  if (learners === null) {
    return shell(card.name, <div className="notice error" role="alert" data-pay-state="unread">{t('plans.unread')}</div>);
  }
  if (learners.length === 0) {
    return shell(
      card.name,
      <>
        {summary}
        <div className="notice warn" data-pay-state="nobody" style={{ marginTop: '1rem' }}>
          <strong>{t('plans.nobodyLead')}</strong> {t('plans.nobodyBody')}
        </div>
        {card.adults > 0 && (
          <div style={{ marginTop: '1rem' }}>
            <ClaimLearner
              label={t('learn.claim')}
              words={{
                busy: t('learn.claimBusy'),
                done: t('learn.claimDone'),
                ready: t('learn.claimReady'),
                failed: t('learn.claimFailed'),
              }}
            />
          </div>
        )}
        {card.children > 0 && (
          <p className="page-actions" style={{ marginTop: '1rem' }}>
            <Link href="/family" className="btn secondary">
              {t('nav.family')}
            </Link>
          </p>
        )}
      </>,
    );
  }

  // Which services can collect each price.
  const offers: PlanPayOffer[] = card.offers
    .map((offer) => ({
      priceId: offer.priceId,
      amount: offer.amount,
      providers: providersForAmount(offer.money).map((p) => ({
        id: p.id,
        label: p.label,
        requiresMsisdn: p.requiresMsisdn,
        country: p.market?.country ?? null,
        countryName: p.market ? (countryNameIn(p.market.country, shown.code) ?? p.market.country) : null,
        dial: p.market ? (findCountry(p.market.country)?.dial ?? null) : null,
      })),
    }))
    .filter((offer) => offer.providers.length > 0);

  if (offers.length === 0) {
    const connected = availableProviders().length > 0;
    return shell(
      card.name,
      <>
        {summary}
        <div className="notice warn" data-pay-state="no-service" style={{ marginTop: '1rem' }}>
          {connected ? (
            card.offers.map((offer) => (
              <span key={offer.priceId}>
                <Say
                  text={t('plans.noServiceHere')}
                  parts={{ currency: <bdi dir="ltr">{offer.money.currency}</bdi> }}
                />
                {'. '}
              </span>
            ))
          ) : (
            <strong>{t('buy.noProviderLead')} </strong>
          )}
          {t('plans.noService')}
        </div>
      </>,
    );
  }

  const words: PlanPayWords = {
    whoFor: t('plans.whoFor'),
    choose: t('buy.choose'),
    learnerChild: t('buy.learnerChild'),
    forOne: t('plans.forOne'),
    whichPrice: t('plans.whichPrice'),
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
    submit: t('buy.continue'),
    starting: t('buy.starting'),
    approve: t('plans.approve'),
    waiting: t('plans.waiting'),
    subscriptions: t('nav.subscriptions'),
    orders: t('broke.orders'),
    unreachable: t('auth.offline'),
    reasons: {
      plan_not_available: t('plans.whyGone'),
      price_not_available: t('plans.whyPrice'),
      no_slot: t('plans.whySlot'),
      already_subscribed: t('plans.whyAlready'),
      account_not_yours: t('plans.whyAccount'),
      learner_not_yours: t('plans.whyLearner'),
      not_signed_in: t('buy.signedOut'),
      disabled: t('plans.whyClosed'),
      malformed: t('buy.refused'),
      learner_required: t('plans.whyChoose'),
      phone_invalid: t('buy.whyPhone'),
      provider_unavailable: t('plans.whyNoService'),
      provider_failed: t('plans.whyFailed'),
      refused: t('buy.refused'),
      unconfirmed: t('buy.unconfirmed'),
    },
  };

  return shell(
    card.name,
    <>
      <p className="lede">{t('plans.payLede')}</p>
      {summary}
      <div className="card" style={{ marginTop: '1rem' }} data-pay-state="open">
        <PlanPayForm planVersionId={card.versionId} offers={offers} learners={learners} words={words} />
      </div>
    </>,
  );
}
