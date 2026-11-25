import Link from 'next/link';
import type { Metadata } from 'next';
import { cookies, headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { verifyCertificate } from '@/lib/certificates';
import { normaliseCertificateNumber } from '@/lib/certificate-number';
import { LOCALE_COOKIE, chooseLocale, formatDay, formatNumber, languageShownFor, translator } from '@/lib/i18n';
import { WithSampleNumber } from '../sample-number';

export const dynamic = 'force-dynamic';

/** The language this page is written in for this reader, and whether that is the one they chose. */
async function readerLanguage() {
  const jar = await cookies();
  const hdrs = await headers();
  const { code: locale } = chooseLocale({
    chosen: jar.get(LOCALE_COOKIE)?.value ?? null,
    acceptLanguage: hdrs.get('accept-language'),
  });
  return { locale, shown: languageShownFor(locale, 'verify') };
}

/**
 * Not indexed, and not followed.
 *
 * This page prints the holder's name, the course and the date. It is public on
 * purpose — the certificate number is the capability, and an employer holding a
 * certificate must be able to check it without an account — but "anybody with
 * the number may look" is a different promise from "a search engine may keep a
 * copy". A learner's name does not belong in an index because a link to their
 * certificate was pasted into a group chat.
 *
 * `noindex` rather than a `Disallow` in robots.txt: a disallowed URL is never
 * fetched, so the directive would never be read, and an employer's link checker
 * would be blocked for no benefit. The number is unguessable, so nothing here
 * is exposed by being crawlable — it is exposed by being *kept*.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { shown } = await readerLanguage();
  return {
    title: translator(shown.code)('verify.heading'),
    robots: { index: false, follow: false },
  };
}

/**
 * Public certificate verification.
 *
 * This page has no session requirement, and that is not an oversight. The
 * person checking a certificate is usually an employer or a school who has
 * never heard of this platform. `verify_certificate()` is executable by the
 * `anon` role precisely so this is possible.
 *
 * The privacy trade is worth stating: `certificates_read` is
 * authenticated-only, so nobody can list certificates. A visitor can only ever
 * be told about a number they already hold. That is what makes it safe to
 * publish the result to an anonymous caller — the number is the capability.
 *
 * **In the reader's language** since 2026-11-25 (`messages/verify.ts`): the
 * answer, the labels and the note under them. Four things are not the page's
 * words and are set apart with `<bdi>`: the holder's name and the course
 * title, as their authors wrote them; the reason a certificate was revoked,
 * as a member of staff wrote it; and the number. The date is the day that
 * was recorded, written in the reader's calendar.
 */
export default async function VerifyPage({
  params,
}: {
  params: Promise<{ number: string }>;
}) {
  const { number } = await params;

  // The address is typed by hand as often as it is clicked, and a link from a
  // chat app may have been lower-cased on the way. Normalising here means
  // `/verify/as-2026-1` and `/verify/AS-2026-…` cannot disagree about what was
  // asked; the `/verify` page redirects to this canonical form.
  // Next hands this over already URL-decoded, so it is not decoded again — a
  // second pass would turn a literal `%25` into `%` and could throw on a
  // malformed escape the router let through.
  const canonical = normaliseCertificateNumber(number);
  if (!canonical) notFound();

  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const result = await verifyCertificate(supabase, canonical).catch(() => null);

  const missing = !result || !result.found;

  const { locale, shown } = await readerLanguage();
  const t = translator(shown.code);
  const frame = shown.code !== locale ? { lang: shown.code, dir: shown.dir } : {};
  const issued = missing ? '' : formatDay(shown.code, result.issuedOn);

  return (
    <div className="container section" style={{ maxWidth: '44rem' }} {...frame}>
      <p className="eyebrow">AyahSpring</p>
      <h1>{t('verify.heading')}</h1>

      {missing ? (
        <div className="notice warn">
          <strong>{t('verify.none')}</strong>
          <p style={{ marginBottom: 0, marginTop: '0.5rem' }}>
            <WithSampleNumber text={t('verify.noneBody')} />
          </p>
        </div>
      ) : result.valid ? (
        <div className="notice">
          <strong>{t('verify.valid')}</strong>
          <p style={{ marginBottom: 0, marginTop: '0.5rem' }}>{t('verify.validBody')}</p>
        </div>
      ) : (
        <div className="notice error">
          <strong>{t('verify.invalid')}</strong>
          <p style={{ marginBottom: 0, marginTop: '0.5rem' }}>
            {result.revokedReason ? (
              <>
                {t('cert.revokedWhy')} <bdi>{result.revokedReason}</bdi>
              </>
            ) : (
              t('verify.notIssued')
            )}
          </p>
        </div>
      )}

      {!missing && (
        <div className="card" style={{ marginTop: '1.5rem' }}>
          <dl className="facts">
            <div>
              <dt>{t('verify.holder')}</dt>
              <dd>{result.learnerName ? <bdi>{result.learnerName}</bdi> : '—'}</dd>
            </div>
            <div>
              <dt>{t('inst.colCourse')}</dt>
              <dd>
                {result.courseTitle ? <bdi>{result.courseTitle}</bdi> : '—'}
                {result.courseVersion != null && (
                  <span className="meta">
                    {' · '}
                    {t('assign.version', { number: formatNumber(shown.code, result.courseVersion) })}
                  </span>
                )}
              </dd>
            </div>
            <div>
              <dt>{t('language.title')}</dt>
              <dd>{result.language ?? '—'}</dd>
            </div>
            <div>
              <dt>{t('cert.issued')}</dt>
              <dd>{issued || '—'}</dd>
            </div>
            <div>
              <dt>{t('verify.number')}</dt>
              <dd style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' }}>
                <bdi>{canonical}</bdi>
              </dd>
            </div>
          </dl>

          <p className="meta" style={{ marginTop: '1rem', marginBottom: 0 }}>{t('verify.frozen')}</p>
        </div>
      )}

      <p style={{ marginTop: '1.5rem' }}>
        <Link href="/">{t('verify.home')}</Link>
      </p>
    </div>
  );
}
