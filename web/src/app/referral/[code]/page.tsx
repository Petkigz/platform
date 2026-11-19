import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies, headers } from 'next/headers';

import { Say } from '@/components/say';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import {
  LOCALE_COOKIE,
  chooseLocale,
  formatNumber,
  formatPercent,
  languageShownFor,
  translator,
} from '@/lib/i18n';
import { REFERRAL_COOKIE_DAYS } from '@/lib/referrals';
import { firstNameOf, percentOf, referralCodeFromPath } from '@/lib/referral-outcome';

export const dynamic = 'force-dynamic';

/** The language this page is written in for this reader, and whether that is the one they chose. */
async function readerLanguage() {
  const jar = await cookies();
  const hdrs = await headers();
  const { code: locale } = chooseLocale({
    chosen: jar.get(LOCALE_COOKIE)?.value ?? null,
    acceptLanguage: hdrs.get('accept-language'),
  });
  const shown = languageShownFor(locale, 'refer');
  return { locale, shown };
}

// One person's link: nothing a search engine should keep.
export async function generateMetadata(): Promise<Metadata> {
  const { shown } = await readerLanguage();
  return { title: translator(shown.code)('refer.lnEyebrow'), robots: { index: false, follow: false } };
}

/**
 * What a friend sees when they open an invitation, in their own language.
 *
 * Three facts, no more: who invited them (a first name), what the code takes
 * off, and that it applies to a first course. Nothing about the inviter's
 * purchases, nothing about how many people they have invited, and no email
 * address — the person holding this link is a visitor.
 *
 * **A first name, cut here.** The database sends the inviter's whole display
 * name; this page shows its first word.
 *
 * **Three ways it can fail, said apart.** A code that is no code, or that
 * nobody holds: "this link does not work". The switch off: "not open at the
 * moment". The database not answering: "could not be read just now". They
 * used to share one heading, which told a visitor invitations were closed
 * when the truth was a dropped connection.
 *
 * **Looking leaves nothing behind.** The button goes through
 * `/api/referral/<code>`, which leaves the code in a cookie and sends them to
 * the catalogue. It is a link the framework must not fetch ahead of a click
 * (`prefetch={false}`): fetched ahead, the cookie would be set by looking.
 *
 * **Twenty-seven languages have it** (`messages/refer.ts`), unreviewed; a
 * language held for review reads it in English, whole, under `lang="en"`.
 */
export default async function ReferralPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code: raw } = await params;
  const code = referralCodeFromPath(raw);

  const { locale, shown } = await readerLanguage();
  const t = translator(shown.code);
  const frame = shown.code !== locale ? { lang: shown.code, dir: shown.dir } : {};

  let outcome: 'found' | 'none' | 'off' | 'unread' = 'none';
  let inviter: string | null = null;
  let percent: number | null = null;
  let shownCode = code;

  if (code && isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase.rpc('resolve_referral_code', { p_code: code });
      const row = (data && typeof data === 'object' && !Array.isArray(data) ? data : null) as {
        found?: unknown;
        disabled?: unknown;
        code?: unknown;
        inviterName?: unknown;
        percentOff?: unknown;
      } | null;
      if (error || row === null) outcome = 'unread';
      else if (row.found === true) {
        outcome = 'found';
        inviter = firstNameOf(row.inviterName);
        percent = percentOf(row.percentOff);
        shownCode = referralCodeFromPath(row.code) ?? code;
      } else if (row.disabled === true) outcome = 'off';
    } catch {
      outcome = 'unread';
    }
  }

  if (outcome !== 'found' || !shownCode) {
    const title =
      outcome === 'off' ? t('refer.lnOffTitle') : outcome === 'unread' ? t('refer.lnUnreadTitle') : t('refer.lnBadTitle');
    return (
      <div className="page narrow" {...frame}>
        <p className="eyebrow">{t('refer.lnEyebrow')}</p>
        <h1>{title}</h1>
        <p className="lede">{outcome === 'none' ? t('refer.lnBadBody') : t('refer.lnStill')}</p>
        <p style={{ marginTop: '1.25rem' }}>
          <Link href="/catalogue" className="btn">
            {t('refer.lnBrowse')}
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="page narrow" {...frame}>
      <p className="eyebrow">{t('refer.lnEyebrow')}</p>
      <h1 style={{ overflowWrap: 'anywhere' }}>
        {inviter ? (
          <Say text={t('refer.lnTitleNamed')} parts={{ name: <bdi>{inviter}</bdi> }} />
        ) : (
          t('refer.lnTitlePlain')
        )}
      </h1>
      <p className="lede">
        {percent !== null && <>{t('refer.lnWorth', { percent: formatPercent(shown.code, percent) })} </>}
        {t('refer.lnNotMoney')}
      </p>

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h2 style={{ marginTop: 0 }}>{t('refer.lnCardHeading')}</h2>
        <p style={{ margin: '0.25rem 0 0' }}>
          <strong dir="ltr" data-referral-code style={{ fontSize: '1.25rem', letterSpacing: '0.04em' }}>
            {shownCode}
          </strong>
        </p>
        <p style={{ marginTop: '1rem' }}>
          <Link href={`/api/referral/${encodeURIComponent(shownCode)}`} prefetch={false} className="btn">
            {t('refer.lnKeep')}
          </Link>
        </p>
        <p className="muted" style={{ marginTop: '0.5rem' }}>
          {t('refer.lnKept', { days: formatNumber(shown.code, REFERRAL_COOKIE_DAYS) })}
        </p>
      </div>

      <p className="muted" style={{ marginTop: '1.25rem' }}>
        {t('refer.lnAbout')}
      </p>
    </div>
  );
}
