import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies, headers } from 'next/headers';

import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { countryFromHeaders } from '@/lib/geo';
import { LOCALE_COOKIE, chooseLocale, languageShownFor, translator, type MessageKey } from '@/lib/i18n';
import { parsePool } from '@/lib/sponsorship';
import { amountOf } from '@/lib/sponsorship-outcome';
import { SponsorPool, type PoolWords, type SeatShown } from './sponsor-pool';

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
  return { locale, shown, hdrs };
}

export async function generateMetadata(): Promise<Metadata> {
  const { shown } = await readerLanguage();
  return { title: translator(shown.code)('sponsor.plTitle') };
}

const DIFFICULTY: Record<string, MessageKey> = {
  beginner: 'difficulty.beginner',
  intermediate: 'difficulty.intermediate',
  advanced: 'difficulty.advanced',
};

/**
 * Sponsoring a seat, in the reader's language.
 *
 * The page is reachable without an account (somebody may want to know what
 * this is before signing in), but the pool is read only for a signed-in
 * person, because `sponsorship_pool()` refuses a session with no user.
 *
 * **Nothing here is priced by the page.** Each seat arrives with the course
 * price resolved for this reader's market, the same function checkout uses,
 * and is said in major units (`amountOf`). A seat whose price cannot be read
 * as an amount is shown and cannot be taken.
 *
 * **Unread is not empty.** A pool that could not be read is said as that. It
 * used to be drawn as "no seats are waiting", which is a different fact.
 *
 * **A course's own words are the catalogue's.** Who a course is for and how
 * hard it is are said through the catalogue; a value this page has no word
 * for is left out, and the database's word is never printed.
 *
 * **What the page says about paying is true with a payment service and
 * without one**: taking a seat is a pledge and takes no money, and the
 * sponsored seats page says how the pledge is paid.
 *
 * Forty sentences in twenty-seven languages (`messages/sponsor.ts`),
 * unreviewed; a language held for review reads the page in English, whole,
 * under `lang="en"`.
 */
export default async function SponsorPage() {
  const { locale, shown, hdrs } = await readerLanguage();
  const t = translator(shown.code);
  const frame = shown.code !== locale ? { lang: shown.code, dir: shown.dir } : {};

  const supabase = isSupabaseConfigured() ? await createClient() : null;
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  const country = countryFromHeaders(hdrs);

  // null: not read (nobody signed in, or the database did not answer).
  let pool: ReturnType<typeof parsePool> = null;
  if (supabase && user) {
    const { data, error } = await supabase.rpc('sponsorship_pool', { p_country: country });
    pool = error ? null : parsePool(data);
  }

  const seats: SeatShown[] = (pool?.seats ?? []).map((seat) => {
    const price = seat.amountMinor && seat.currencyCode ? amountOf(seat.amountMinor, seat.currencyCode) : null;
    const audience =
      seat.audience === 'child' ? t('sponsor.plForChild')
      : seat.audience === 'adult' ? t('sponsor.plForAdult')
      : seat.audience === 'both' ? t('audience.both')
      : null;
    const difficultyKey = seat.difficulty ? DIFFICULTY[seat.difficulty] : undefined;
    return {
      seatCode: seat.seatCode,
      title: seat.courseTitle,
      about: [audience, difficultyKey ? t(difficultyKey) : null].filter((part): part is string => Boolean(part)),
      price,
      // Why it cannot be taken, when it cannot: no price in this market, or one that is not an amount.
      blocked: price ? null : !seat.amountMinor || !seat.currencyCode ? t('sponsor.plNoPrice') : t('sponsor.plPriceUnread'),
    };
  });

  const words: PoolWords = {
    aCourse: t('sponsor.aCourse'),
    seat: t('sponsor.seat'),
    priceNote: t('sponsor.plPriceNote'),
    noteLabel: t('sponsor.plNoteLabel'),
    optional: t('family.optional'),
    take: t('sponsor.plTake'),
    taking: t('buy.starting'),
    taken: t('sponsor.plTaken'),
    takenNext: t('sponsor.plTakenNext'),
    pledgeNote: t('sponsor.nextPay'),
    mine: t('account.sponsorMine'),
    reasons: {
      gone: t('sponsor.plWhyGone'),
      own_seat: t('sponsor.plWhyOwn'),
      no_price: t('sponsor.plNoPrice'),
      off: t('sponsor.plOff'),
      too_long: t('sponsor.tooLong'),
      not_signed_in: t('buy.signedOut'),
      malformed: t('sponsor.plWhyFailed'),
      failed: t('sponsor.plWhyFailed'),
      unconfirmed: t('sponsor.unconfirmed'),
    },
  };

  return (
    <div className="container section" {...frame}>
      <p className="eyebrow">{t('sponsor.plEyebrow')}</p>
      <h1>{t('sponsor.plTitle')}</h1>
      <p className="lede">{t('sponsor.plLede')}</p>

      <div className="grid" style={{ marginTop: '1.5rem' }}>
        <div className="card">
          <h2 style={{ marginTop: 0 }}>{t('sponsor.plSeeHeading')}</h2>
          <p className="meta">{t('sponsor.plSeeBody')}</p>
        </div>
        <div className="card">
          <h2 style={{ marginTop: 0 }}>{t('sponsor.plPayHeading')}</h2>
          <p className="meta">{t('sponsor.plPayBody')}</p>
        </div>
      </div>

      <h2 style={{ marginTop: '2.25rem' }}>{t('sponsor.plListHeading')}</h2>

      {supabase && !user && (
        <div className="notice" data-pool="signed-out">
          {t('sponsor.plSignIn')} <Link href="/sign-in?next=/sponsor">{t('action.signIn')}</Link>
        </div>
      )}

      {/* Signed in, or no database at all, and nothing could be read. */}
      {(!supabase || user) && !pool && (
        <div className="notice error" role="alert" data-pool="unread">
          {t('sponsor.plUnread')}
        </div>
      )}

      {pool && !pool.enabled && (
        <div className="notice warn" data-pool="off">
          {t('sponsor.plOff')}
        </div>
      )}

      {pool?.enabled && seats.length === 0 && (
        <p className="empty" data-pool="none">
          {t('sponsor.plNone')}
        </p>
      )}

      {pool?.enabled && seats.length > 0 && <SponsorPool seats={seats} country={country} words={words} />}

      <p className="muted" style={{ marginTop: '1.25rem' }}>
        {t('sponsor.zakat')}
      </p>

      <div className="card" style={{ marginTop: '2rem' }}>
        <h2 style={{ marginTop: 0 }}>{t('sponsor.plAskHeading')}</h2>
        <p className="meta">{t('sponsor.askedHow')}</p>
        <div className="page-actions" style={{ marginTop: '0.75rem' }}>
          <Link href="/sponsor/apply" className="btn secondary">
            {t('sponsor.askLink')}
          </Link>
          <Link href="/catalogue" className="btn ghost">
            {t('refer.lnBrowse')}
          </Link>
          <Link href="/account/sponsorship" className="btn ghost">
            {t('account.sponsorMine')}
          </Link>
        </div>
      </div>
    </div>
  );
}
