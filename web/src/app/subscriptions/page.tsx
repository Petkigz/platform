import Link from 'next/link';
import type { Metadata } from 'next';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { Say } from '@/components/say';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { isFlagEnabled } from '@/lib/flags';
import { LOCALE_COOKIE, chooseLocale, formatDateTime, formatNumber, languageShownFor, translator } from '@/lib/i18n';
import { addableLearners, subscriptionCards, type SubCard } from '@/lib/subscriptions';
import { SubscriptionManager, type SubscriptionWords } from './subscription-manager';

export const dynamic = 'force-dynamic';

/** The language this page is written in for this reader, and whether that is the one they chose. */
async function readerLanguage() {
  const jar = await cookies();
  const hdrs = await headers();
  const { code: locale } = chooseLocale({
    chosen: jar.get(LOCALE_COOKIE)?.value ?? null,
    acceptLanguage: hdrs.get('accept-language'),
  });
  return { locale, shown: languageShownFor(locale, 'subs') };
}

export async function generateMetadata(): Promise<Metadata> {
  const { shown } = await readerLanguage();
  return { title: translator(shown.code)('subs.title') };
}

/**
 * The plans an account has: what each opens, who is learning on it, when it
 * ends, and the two things that can be done to one.
 *
 * In the reader's language, for the twenty-seven it is written in
 * (`messages/subs.ts`); English, marked as English, for the rest.
 *
 * **It reads no switch.** `commerce.subscriptions` decides whether a plan
 * can be bought. Somebody who has one keeps this page whatever that switch
 * says: what they paid for is still theirs to see and to cancel.
 *
 * **Not read is said as not read.** The page used to throw when either of
 * its first two reads failed, which showed the "this page broke" screen, and
 * drew a plan with nothing inside when the third did. Now the list itself
 * unread is one sentence that says it does not mean there is no plan, at
 * status 200; anything else unread leaves the cards drawn without it, under
 * one sentence saying part of the page is missing. No form is offered for
 * something the page could not read.
 *
 * **What is said about a plan is a sentence.** The page used to print the
 * stored status word and the stored period word beside a pair of dates. A
 * plan whose period is over is still `active` in its row, so the word was
 * wrong as well as English. See `lib/subscriptions.ts`.
 *
 * **Who can be added is only who the writer would take**: the reader's own
 * adult profile for an adult place and a child for a child's, while a place
 * of that kind is free. The old list offered every learner the reader could
 * see, so most choices were refused.
 */
export default async function SubscriptionsPage() {
  if (!isSupabaseConfigured()) redirect('/');
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/subscriptions');

  const { locale, shown } = await readerLanguage();
  const t = translator(shown.code);
  const frame = shown.code !== locale ? { lang: shown.code, dir: shown.dir } : {};

  // No filter by user. The row policy on subscriptions decides which billing
  // accounts this session sees, and the one on learner profiles decides
  // which learners. A read that throws is a read that failed.
  const failed = { data: null, error: { message: 'the request could not be made' } };
  const [subs, profiles, summary, offline] = await Promise.all([
    supabase
      .from('subscriptions')
      .select(
        'id,status,plan_version_id,current_period_end,plans(name,tier),plan_versions(adult_allowance,child_allowance),family_plan_allocations(status,learner_profile_id,slot_type,learner_profiles(display_name))',
      )
      .order('created_at', { ascending: false })
      .then((r) => r, () => failed),
    supabase
      .from('learner_profiles')
      .select('id,display_name,learner_type,linked_user_id')
      .eq('status', 'active')
      .is('deleted_at', null)
      .order('display_name')
      .then((r) => r, () => failed),
    // Knows the name, shelf and places of a plan that is no longer on sale.
    supabase.rpc('my_plan_summary').then((r) => r, () => failed),
    // Not knowing is treated as off: the page then does not promise it.
    isFlagEnabled(supabase, 'learning.offline').catch(() => false),
  ]);

  const head = (
    <div className="page-head">
      <p className="eyebrow">{t('nav.subscriptions')}</p>
      <h1>{t('subs.title')}</h1>
    </div>
  );
  const ways = (
    <p className="sub-ways">
      <Link href="/plans">{t('nav.plans')}</Link>
      {' · '}
      <Link href="/family">{t('nav.family')}</Link>
    </p>
  );

  const versionIds = subs.error || !Array.isArray(subs.data)
    ? []
    : [
        ...new Set(
          (subs.data as { plan_version_id?: unknown }[])
            .map((row) => row.plan_version_id)
            .filter((id): id is string => typeof id === 'string'),
        ),
      ];
  // What each plan opens. Nothing to ask when there is no plan.
  const entitlements =
    versionIds.length === 0
      ? { data: [], error: null }
      : await supabase
          .from('plan_entitlements')
          .select('plan_version_id,scope_type,feature_code,subject_areas(name),products(name)')
          .in('plan_version_id', versionIds)
          .then((r) => r, () => failed);

  const cards: SubCard[] | null = subs.error
    ? null
    : subscriptionCards(
        {
          subscriptions: subs.data,
          summary: summary.error ? null : summary.data,
          entitlements: entitlements.error ? null : entitlements.data,
        },
        { offlineOn: offline, now: Date.now() },
      );

  if (cards === null) {
    return (
      <div className="page" {...frame}>
        {head}
        <div className="notice error" role="alert" data-subs-state="unread">
          {t('subs.unread')}
        </div>
        {ways}
      </div>
    );
  }

  const words: SubscriptionWords = {
    add: t('subs.add'),
    choose: t('buy.choose'),
    learnerChild: t('buy.learnerChild'),
    addDo: t('subs.addDo'),
    adding: t('family.adding'),
    cancelOrder: t('subs.cancelOrder'),
    cancelOrderNote: t('subs.cancelOrderNote'),
    cancelPlan: t('subs.cancelPlan'),
    cancelPlanNote: t('subs.cancelPlanNote'),
    reason: t('subs.reason'),
    working: t('auth.working'),
    unreachable: t('auth.offline'),
    reasons: {
      not_signed_in: t('buy.signedOut'),
      malformed: t('subs.failed'),
      reason_required: t('subs.whyReason'),
      not_yours: t('subs.whyNotYours'),
      learner_not_yours: t('subs.whyLearner'),
      not_running: t('subs.whyNotRunning'),
      no_slot: t('subs.whySlot'),
      refused: t('subs.failed'),
      unconfirmed: t('subs.unsure'),
    },
  };

  const said = (iso: string) => <bdi>{formatDateTime(locale, iso, 'UTC')}</bdi>;
  // Something a card would have shown was not read: said once, above them.
  // The summary is only missed by a card the plain read could not fill in.
  let partial =
    cards.length > 0 &&
    (entitlements.error !== null ||
      (summary.error !== null && cards.some((card) => card.name === null || card.places === null)));

  const drawn = cards.map((card) => {
    const addable = profiles.error ? null : addableLearners(card, profiles.data, user.id);
    // A plan that takes learners, and the page cannot say who: part is missing.
    if (card.takesLearners && addable === null) partial = true;
    const listed = card.standing !== 'ended' && card.standing !== 'withdrawn';
    const full = card.takesLearners && card.left !== null && card.left.adult === 0 && card.left.child === 0;

    return (
      <article key={card.id} className="card plan-card sub-card" data-sub={card.id} data-standing={card.standing}>
        {/* The shelf's name is a name, the same on every screen. */}
        {card.tier && (
          <p className="eyebrow">
            <bdi lang="en" dir="ltr">
              {card.tier === 'plus' ? 'Plus' : 'Basic'}
            </bdi>
          </p>
        )}
        {/* The plan's own name, in whatever language it was written in. */}
        {card.name !== null ? <h2 dir="auto">{card.name}</h2> : <h2>{t('subs.unnamed')}</h2>}

        {/* Read out when it changes: after a form here is answered, this is the answer. */}
        <div className="sub-now" aria-live="polite">
          {card.standing === 'waiting' && <p className="sub-standing">{t('subs.waiting')}</p>}
          {card.standing === 'withdrawn' && <p className="sub-standing">{t('subs.withdrawn')}</p>}
          {card.standing === 'running' && card.until && (
            <p className="sub-standing">
              <Say text={t('subs.until')} parts={{ date: said(card.until) }} />
            </p>
          )}
          {card.standing === 'stopped' && card.until && (
            <p className="sub-standing">
              <Say text={t('subs.stopped')} parts={{ date: said(card.until) }} />
            </p>
          )}
          {card.standing === 'ended' && card.until && (
            <p className="sub-standing">
              <Say text={t('subs.ended')} parts={{ date: said(card.until) }} />
            </p>
          )}

          {listed && (
            <>
              <h3 className="eyebrow">{t('subs.learners')}</h3>
              {card.learners.length === 0 ? (
                <p className="muted">{t('subs.noLearner')}</p>
              ) : (
                <ul className="plan-lines" data-sub-learners>
                  {card.learners.map((learner) => (
                    <li key={learner.id}>{learner.name !== null ? <bdi>{learner.name}</bdi> : t('subs.someone')}</li>
                  ))}
                </ul>
              )}
              {full && <p className="muted">{t('subs.full')}</p>}
            </>
          )}
        </div>

        {card.places && (
          <ul className="plan-lines">
            {card.places.adult > 0 && (
              <li>
                <Say text={t('plans.adults')} parts={{ count: formatNumber(locale, card.places.adult) }} />
              </li>
            )}
            {card.places.child > 0 && (
              <li>
                <Say text={t('plans.children')} parts={{ count: formatNumber(locale, card.places.child) }} />
              </li>
            )}
          </ul>
        )}

        {card.includes && card.includes.length > 0 && (
          <>
            <h3 className="eyebrow">{t('plans.opens')}</h3>
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

        {((addable !== null && addable.length > 0) || card.cancel !== null) && (
          <SubscriptionManager
            subscriptionId={card.id}
            addable={addable ?? []}
            cancel={card.cancel}
            until={card.until ? formatDateTime(locale, card.until, 'UTC') : null}
            words={words}
          />
        )}
      </article>
    );
  });

  return (
    <div className="page" {...frame}>
      {head}
      <p className="lede">{t('subs.lede')}</p>

      {partial && (
        <div className="notice warn" role="status" data-subs-state="partial">
          {t('subs.partUnread')}
        </div>
      )}

      {cards.length === 0 ? (
        <div className="notice" data-subs-state="none">
          {t('subs.none')}
        </div>
      ) : (
        <>
          {/* What the two shelves are, as the plans page says it: a card here carries one of the names. */}
          {cards.some((card) => card.tier !== null) && (
            <p className="muted">
              <Say
                text={t('plans.shelves')}
                parts={{
                  basic: <bdi lang="en" dir="ltr">Basic</bdi>,
                  plus: <bdi lang="en" dir="ltr">Plus</bdi>,
                }}
              />
            </p>
          )}
          <div className="plan-list" data-subs-state="open">
            {drawn}
          </div>
        </>
      )}

      {ways}
    </div>
  );
}
