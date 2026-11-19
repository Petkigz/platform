import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { Say } from '@/components/say';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { LOCALE_COOKIE, chooseLocale, languageShownFor, translator } from '@/lib/i18n';
import { isFlagEnabled } from '@/lib/flags';
import { parseSponsorBoard } from '@/lib/sponsorship';
import { amountOf, pledgeMoneyOf, pledgeStateOf } from '@/lib/sponsorship-outcome';
import { availableProviders, providersForAmount } from '@/lib/payments/registry';
import { countryNameIn } from '@/lib/geo';
import { findCountry } from '@/lib/phone';
import { PayForm, type PayWords } from './pay-form';

export const dynamic = 'force-dynamic';

/** The language this page is written in for this reader, and whether that is the one they chose. */
async function readerLanguage() {
  const jar = await cookies();
  const hdrs = await headers();
  const { code: locale } = chooseLocale({
    chosen: jar.get(LOCALE_COOKIE)?.value ?? null,
    acceptLanguage: hdrs.get('accept-language'),
  });
  const shown = languageShownFor(locale, 'sponsor');
  return { locale, shown };
}

export async function generateMetadata(): Promise<Metadata> {
  const { shown } = await readerLanguage();
  // A page about one person's pledge is nobody else's to find.
  return { title: translator(shown.code)('sponsor.pay'), robots: { index: false, follow: false } };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

/**
 * Paying one pledge.
 *
 * The owner's decision (2026-11-19): a pledge is paid through the same
 * checkout as a course, by the same payment services. This page is the way
 * in. It reads the sponsor's own pledges and nothing else, shows the one
 * named in the address, and hands a form the services that can collect
 * exactly its amount.
 *
 * **It says the same thing about a pledge that is paid, called off, somebody
 * else's or made up.** One sentence. Saying which would tell a stranger that
 * a pledge with that id exists.
 *
 * **Nothing here names the learner**, because nothing this page reads does:
 * the sponsor's board has no learner field.
 *
 * **Nothing is offered that cannot work.** With either switch off, or with no
 * service that collects this amount in this currency (an operator that takes
 * whole amounts is not asked for cents), there is no form: a sentence says
 * why, and the amount is never rounded to fit.
 *
 * The form's words come from the buy page's catalogue wherever the sentence
 * is the same one (the number, the service, a refusal of the number), and
 * from this page's own where it is about a seat and not a course.
 */
export default async function PaySponsorshipPage({ params }: { params: Promise<{ id: string }> }) {
  if (!isSupabaseConfigured()) redirect('/');
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/account/sponsorship');

  const { locale, shown } = await readerLanguage();
  const t = translator(shown.code);
  const frame = shown.code !== locale ? { lang: shown.code, dir: shown.dir } : {};

  const gave = await supabase.rpc('my_sponsorships');
  const board = gave.error ? null : parseSponsorBoard(gave.data);
  const row = UUID.test(id) ? (board?.sponsorships.find((s) => s.id === id.toLowerCase()) ?? null) : null;
  const pledged = row !== null && pledgeStateOf(row.status) === 'pledged';
  const money = pledged ? pledgeMoneyOf(row.amountMinor, row.currencyCode) : null;
  const amount = pledged ? amountOf(row.amountMinor, row.currencyCode) : null;

  const open =
    board?.enabled === true && (await isFlagEnabled(supabase, 'commerce.checkout').catch(() => false));
  const providers = money && open ? providersForAmount(money) : [];

  const back = (
    <p style={{ marginTop: '1.25rem' }}>
      <Link href="/account/sponsorship">{t('account.sponsorMine')}</Link>
    </p>
  );
  const head = (
    <>
      <p className="eyebrow">
        <Link href="/account/sponsorship">{t('account.sponsorHeading')}</Link>
      </p>
      <h1>{t('sponsor.pay')}</h1>
    </>
  );

  // The board could not be read: said as that, and not as "no such pledge".
  if (!board) {
    return (
      <div className="container section narrow" {...frame}>
        {head}
        <div className="notice error" role="alert">
          {t('sponsor.gaveUnread')}
        </div>
        {back}
      </div>
    );
  }

  if (!pledged || !money || !amount) {
    return (
      <div className="container section narrow" {...frame}>
        {head}
        <div className="notice warn" data-pay-state="not-payable">
          {t('sponsor.payNot')}
        </div>
        {back}
      </div>
    );
  }

  const words: PayWords = {
    payWith: t('buy.payWith'),
    phoneLabel: t('buy.phoneLabel'),
    phoneNote: t('buy.phoneNote'),
    phoneCountry: t('buy.phoneCountry'),
    submit: t('buy.continue'),
    starting: t('buy.starting'),
    approve: t('sponsor.payApprove'),
    orderSaved: t('buy.orderSaved'),
    reasons: {
      pledge_not_payable: t('sponsor.payNot'),
      not_signed_in: t('buy.signedOut'),
      disabled: t('buy.whyClosed'),
      malformed: t('buy.refused'),
      phone_invalid: t('buy.whyPhone'),
      provider_unavailable: t('buy.whyNoProvider'),
      provider_failed: t('buy.whyProvider'),
      refused: t('buy.refused'),
      unconfirmed: t('buy.unconfirmed'),
    },
  };

  return (
    <div className="container section narrow" {...frame}>
      {head}
      <p className="lede">{t('sponsor.payLede')}</p>

      <div className="card" style={{ marginTop: '1rem' }}>
        <strong style={{ overflowWrap: 'anywhere' }}>
          {row.courseTitle ? <bdi>{row.courseTitle}</bdi> : t('sponsor.aCourse')}
        </strong>
        {row.seatCode && (
          <p className="meta" style={{ margin: '0.25rem 0 0' }}>
            <Say text={t('sponsor.seat')} parts={{ code: <bdi dir="ltr">{row.seatCode}</bdi> }} />
          </p>
        )}
        <p className="meta" style={{ margin: '0.25rem 0 0' }}>
          <Say text={t('sponsor.amount')} parts={{ amount: <bdi dir="ltr">{amount}</bdi> }} />
        </p>

        <div style={{ marginTop: '1rem' }}>
          {!open ? (
            <div className="notice warn" data-pay-state="closed">
              {t('buy.closedLead')}
            </div>
          ) : providers.length === 0 ? (
            <div className="notice warn" data-pay-state="no-service">
              {availableProviders().length > 0
                ? t('buy.noProviderHere', { currency: money.currency })
                : t('buy.noProviderLead')}
            </div>
          ) : (
            <PayForm
              sponsorshipId={row.id}
              providers={providers.map((p) => ({
                id: p.id,
                label: p.label,
                countryName: p.market ? (countryNameIn(p.market.country, shown.code) ?? p.market.country) : null,
                dial: p.market ? (findCountry(p.market.country)?.dial ?? null) : null,
              }))}
              words={words}
            />
          )}
        </div>
      </div>

      <p className="muted" style={{ marginTop: '1rem' }}>
        {t('sponsor.zakat')}
      </p>
      {back}
    </div>
  );
}
