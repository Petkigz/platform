import Link from 'next/link';
import type { Metadata } from 'next';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { fetchCertificates } from '@/lib/certificates';
import { LOCALE_COOKIE, chooseLocale, formatDay, formatNumber, languageShownFor, translator } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

/** The language this page is written in for this reader, and whether that is the one they chose. */
async function readerLanguage() {
  const jar = await cookies();
  const hdrs = await headers();
  const { code: locale } = chooseLocale({
    chosen: jar.get(LOCALE_COOKIE)?.value ?? null,
    acceptLanguage: hdrs.get('accept-language'),
  });
  return { locale, shown: languageShownFor(locale, 'cert') };
}

export async function generateMetadata(): Promise<Metadata> {
  const { shown } = await readerLanguage();
  return { title: translator(shown.code)('nav.certificates') };
}

/**
 * My certificates.
 *
 * `certificates_read` is `can_access_learner(...)`, so this page is also a
 * parent's page: a parent sees their children's certificates and a billing-only
 * family member sees none. Nothing here filters by user.
 *
 * A revoked certificate stays on the list rather than disappearing. It was
 * issued, and the record of that — with the reason — is the honest answer to
 * "what happened to mine?".
 *
 * **In the reader's language** since 2026-11-25 (`messages/certificates.ts`);
 * a language held for review reads the page in English, whole, under
 * `lang="en"`. Three things on a card are not the page's words and are set
 * apart with `<bdi>`: the course title and the holder's name, which are as
 * their authors wrote them, and the reason a certificate was revoked, which is
 * as a member of staff wrote it. The number is a number in every language.
 */
export default async function CertificatesPage() {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/sign-in?next=/certificates');

  const certificates = await fetchCertificates(supabase);

  const { locale, shown } = await readerLanguage();
  const t = translator(shown.code);
  const frame = shown.code !== locale ? { lang: shown.code, dir: shown.dir } : {};

  return (
    <div className="container section" {...frame}>
      <p className="eyebrow">{t('nav.certificates')}</p>
      <h1>{t('nav.certificates')}</h1>
      <p className="lede">{t('cert.lede')}</p>

      {certificates.length === 0 ? (
        <div className="empty">{t('cert.none')}</div>
      ) : (
        <div className="grid cols-2">
          {certificates.map((c) => (
            <div className="card" key={c.id}>
              <div className="badges" style={{ marginBottom: '0.5rem' }}>
                <span className={`badge ${c.status === 'issued' ? '' : 'neutral'}`}>
                  {c.status === 'issued' ? t('cert.issued') : t('cert.revoked')}
                </span>
                {c.courseLanguage && (
                  <span className="badge neutral">{c.courseLanguage}</span>
                )}
              </div>

              <h3 style={{ marginTop: 0 }}>
                <bdi>{c.courseTitle}</bdi>
              </h3>

              <p className="meta" style={{ margin: '0.25rem 0' }}>
                <bdi>{c.learnerDisplayName}</bdi>
                {' · '}
                {t('assign.version', { number: formatNumber(shown.code, c.courseVersionNumber) })}
              </p>
              <p className="meta" style={{ margin: '0.25rem 0' }}>
                {c.issuedAt && formatDay(shown.code, c.issuedAt)
                  ? t('cert.issuedOn', { date: formatDay(shown.code, c.issuedAt) })
                  : t('cert.notIssued')}
              </p>

              <p
                style={{
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                  fontSize: '0.85rem',
                  marginTop: '0.75rem',
                  wordBreak: 'break-all',
                }}
              >
                <bdi>{c.certificateNumber}</bdi>
              </p>

              <p className="meta" style={{ marginTop: '0.5rem' }}>
                <Link href={`/certificates/${encodeURIComponent(c.certificateNumber)}`}>{t('cert.view')}</Link>
                {' · '}
                <Link href={`/verify/${encodeURIComponent(c.certificateNumber)}`}>{t('cert.verify')}</Link>
              </p>

              {c.status === 'revoked' && (
                <div className="notice warn" style={{ marginTop: '0.75rem' }}>
                  {c.revocationReason ? (
                    <>
                      {t('cert.revokedWhy')} <bdi>{c.revocationReason}</bdi>
                    </>
                  ) : (
                    t('cert.revokedPlain')
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <p style={{ marginTop: '1.5rem' }}>
        <Link href="/learn">{t('course.back')}</Link>
      </p>
    </div>
  );
}
