import Link from 'next/link';
import type { Metadata } from 'next';

import { Say } from '@/components/say';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { isFlagEnabled } from '@/lib/flags';
import { formatNumber, translator } from '@/lib/i18n';
import { PERIOD_KEY } from '@/lib/plans';
import { hasCourseWithdrawalRight } from '@/lib/withdrawal';
import { PlanSeen } from './plan-seen';
import { SUBSCRIPTIONS_FLAG, readStorefront, readerLanguage, type Storefront } from './storefront';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const { shown } = await readerLanguage();
  return { title: translator(shown.code)('plans.title') };
}

/**
 * The plans on sale.
 *
 * In the reader's language, for the twenty-seven it is written in
 * (`messages/plans.ts`); English, marked as English, for the rest.
 *
 * **What a card says, and what it does not.** A plan's name and description
 * as whoever made the plan wrote them. The price with the period it pays
 * for, and only a price this visitor's account would be charged: the page
 * used to list every market's price for everybody, as a number beside a
 * country code. How many adults and children it has places for. What it
 * opens, in sentences: the page used to print "Feature: offline_downloads"
 * and "version 3". Nothing here says a plan renews, because nothing renews
 * one; `plans.noRenew` says so.
 *
 * **Money back is said** (2026-11-24, at the owner's word): a buyer in the
 * European Union, the rest of the European Economic Area or the United
 * Kingdom may ask for the money back within fourteen days of paying, and the
 * plan ends when all of it has gone back. One sentence, `plans.refundLaw`,
 * under the list and on the page a plan is paid for on; left out for an
 * account whose country is recorded and is not one of those.
 *
 * **Paying is another page** (`/plans/[id]`), one plan at a time, like a
 * course and a pledge. This page used to carry a form in every card that
 * sent no payment service and no phone number.
 *
 * **Not read is said as not read.** See `storefront.ts`.
 */
export default async function PlansPage() {
  const { locale, shown } = await readerLanguage();
  const t = translator(shown.code);
  const frame = shown.code !== locale ? { lang: shown.code, dir: shown.dir } : {};

  let store: Storefront = { state: 'closed' };
  let signedIn = false;
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    signedIn = user !== null;
    // commerce.subscriptions ships off, and the writer refuses while it is
    // off. The catalogue is not read at all then: a price shown is a price
    // somebody expects to be able to pay. A switch that cannot be read is
    // not treated as off or as on.
    const open = await isFlagEnabled(supabase, SUBSCRIPTIONS_FLAG).catch(() => null);
    store =
      open === null
        ? { state: 'unread' }
        : open
          ? await readStorefront(supabase, user?.id ?? null)
          : { state: 'closed' };
  }

  const head = (
    <div className="page-head">
      <p className="eyebrow">{t('nav.plans')}</p>
      <h1>{t('plans.title')}</h1>
    </div>
  );

  if (store.state === 'closed') {
    return (
      <div className="page" {...frame}>
        {head}
        <div className="notice warn" data-plans-state="closed">
          <strong>{t('plans.closedLead')}</strong> {t('plans.closedBody')}
        </div>
      </div>
    );
  }

  if (store.state === 'unread') {
    return (
      <div className="page" {...frame}>
        {head}
        <div className="notice error" role="alert" data-plans-state="unread">
          {t('plans.unread')}
        </div>
      </div>
    );
  }

  const seen = new Set<string>();

  return (
    <div className="page" {...frame}>
      {head}
      <p className="lede">{t('plans.lede')}</p>

      {store.cards.length === 0 ? (
        <div className="notice" data-plans-state="none">
          {t('plans.none')}
        </div>
      ) : (
        <>
          {/* What the two shelves are. Their names are names, the same on every screen. */}
          <p className="muted">
            <Say
              text={t('plans.shelves')}
              parts={{
                basic: <bdi lang="en" dir="ltr">Basic</bdi>,
                plus: <bdi lang="en" dir="ltr">Plus</bdi>,
              }}
            />
          </p>
          <div className="plan-list" data-plans-state="open">
          {store.cards.map((card) => {
            const first = !seen.has(card.planId);
            seen.add(card.planId);
            const href = signedIn ? `/plans/${card.versionId}` : `/sign-in?next=/plans/${card.versionId}`;
            return (
              <article key={card.versionId} className="card plan-card" data-plan={card.versionId}>
                {first && signedIn && <PlanSeen planId={card.planId} />}
                {/* The shelf's name is a name, the same on every screen. */}
                {card.tier && (
                  <p className="eyebrow">
                    <bdi lang="en" dir="ltr">
                      {card.tier === 'plus' ? 'Plus' : 'Basic'}
                    </bdi>
                  </p>
                )}
                {/* The plan's own words, in whatever language they were written in. */}
                <h2 dir="auto">{card.name}</h2>
                {card.description && (
                  <p className="muted" dir="auto">
                    {card.description}
                  </p>
                )}

                {card.offers.length === 0 ? (
                  <p className="notice warn">{t('plans.noPrice')}</p>
                ) : (
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

                <ul className="plan-lines">
                  {card.adults > 0 && (
                    <li>
                      <Say text={t('plans.adults')} parts={{ count: formatNumber(locale, card.adults) }} />
                    </li>
                  )}
                  {card.children > 0 && (
                    <li>
                      <Say text={t('plans.children')} parts={{ count: formatNumber(locale, card.children) }} />
                    </li>
                  )}
                </ul>

                {card.includes.length > 0 && (
                  <>
                    <p className="eyebrow">{t('plans.opens')}</p>
                    <ul className="plan-lines">
                      {card.includes.map((item, index) => (
                        <li key={index}>
                          {item.kind === 'subject' ? (
                            <Say text={t('plans.subject')} parts={{ name: <bdi>{item.name}</bdi> }} />
                          ) : item.kind === 'product' ? (
                            <bdi>{item.name}</bdi>
                          ) : (
                            t('plans.offline')
                          )}
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                {card.offers.length > 0 && (
                  <p className="plan-action">
                    <Link href={href} className="btn">
                      {t('plans.choose')}
                    </Link>
                  </p>
                )}
              </article>
            );
          })}
          </div>
        </>
      )}

      <p className="muted" style={{ marginTop: '1.5rem' }}>
        {t('plans.noRenew')}
      </p>
      {/* The fourteen days the law gives in some countries. Left out only for
          an account known to be somewhere else: a visitor, and an account
          with no country, may be one of the people it is for. */}
      {hasCourseWithdrawalRight(store.country) && (
        <p className="muted" data-plans-refund>
          {t('plans.refundLaw')}
        </p>
      )}
      {signedIn && (
        <p>
          <Link href="/subscriptions">{t('nav.subscriptions')}</Link>
        </p>
      )}
    </div>
  );
}
