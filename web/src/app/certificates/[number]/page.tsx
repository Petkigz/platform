import { ArabicBlock } from '@/app/_shared/arabic-text';
import Link from 'next/link';
import type { Metadata } from 'next';
import { cookies, headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { verificationAddress } from '@/lib/site';
import { isSupabaseConfigured } from '@/lib/env';
import { fetchCertificateForHolder } from '@/lib/certificates';
import { PrintCertificateButton } from './print-button';
import { BrandMark } from '../../_shared/brand-mark';
import { LOCALE_COOKIE, chooseLocale, languageShownFor, translator } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

/** The language the words around the sheet are written in for this reader. */
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
  return { title: translator(shown.code)('cert.mine') };
}

/**
 * One certificate, as its holder sees it and prints it.
 *
 * Two things are on this page and they are in two languages on purpose. The
 * words *around* the sheet — the way back, the button, the warning that a
 * certificate has been revoked — are the reader's (`messages/certificates.ts`,
 * since 2026-11-25). The sheet is not: it is a document that is handed to
 * somebody else, an employer or a school, and it reads the same whoever
 * printed it. So does the one line that is printed under a revoked sheet,
 * which is for the person holding the paper and not for the person who
 * printed it. A sentence under the button says so, in the reader's language,
 * so that an English sheet on an Arabic page is not taken for something
 * unfinished.
 */
export default async function CertificatePage({
  params,
}: {
  params: Promise<{ number: string }>;
}) {
  if (!isSupabaseConfigured()) redirect('/');
  const { number } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/sign-in?next=${encodeURIComponent(`/certificates/${number}`)}`);

  const certificate = await fetchCertificateForHolder(supabase, number);
  if (!certificate) notFound();

  const issuedDate = certificate.issuedAt
    ? new Date(certificate.issuedAt).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
      })
    : 'Date not recorded';

  const verifyAddress = verificationAddress(certificate.certificateNumber);

  const { locale, shown } = await readerLanguage();
  const t = translator(shown.code);
  const frame = shown.code !== locale ? { lang: shown.code, dir: shown.dir } : {};

  return (
    <div className="container section certificate-page">
      <div className="no-print" {...frame}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <p className="eyebrow"><Link href="/certificates">{t('cert.mine')}</Link></p>
          {certificate.status === 'issued' && <PrintCertificateButton label={t('cert.print')} />}
        </div>
        {certificate.status === 'revoked' && (
          <div className="notice warn" role="alert">
            {t('cert.invalid')}
            {certificate.revocationReason && (
              <>
                {' '}
                {t('cert.reason')} <bdi>{certificate.revocationReason}</bdi>
              </>
            )}
          </div>
        )}
        {shown.code !== 'en' && <p className="meta">{t('cert.sheetNote')}</p>}
      </div>

      {/* The sheet declares its own direction. Everything printed on it — the
          kicker, the wording, the footer, the verification address — is English
          and untranslated, so an Arabic interface must not turn it around; the
          only non-Latin thing in the frame is the learner's name, which
          `ArabicBlock` isolates on its own. Inheriting `dir` from `<html>` would
          have made this page's direction a property of the reader rather than of
          the document. */}
      <article
        className={`certificate-sheet ${certificate.status === 'revoked' ? 'is-revoked' : ''}`}
        dir="ltr"
        lang="en"
      >
        <div className="certificate-inner">
          <div className="certificate-brand"><BrandMark className="certificate-mark" size={16} /> AyahSpring</div>
          <p className="certificate-kicker">Certificate of completion</p>
          <h1>Certificate of Achievement</h1>
          <p className="certificate-intro">This is to recognise that</p>
          {/* The learner's own name, in whatever script they wrote it. A
              certificate is the page that gets printed and framed, so an Arabic
              name set in a Latin face at negative tracking — which is what this
              heading inherits — is the difference between a document somebody
              shows an employer and one they apologise for. */}
          <ArabicBlock as="p" className="certificate-learner" text={certificate.learnerDisplayName} />
          <p className="certificate-copy">
            has completed the learning requirements for
          </p>
          <ArabicBlock as="h2" text={certificate.courseTitle} />
          <p className="certificate-copy">
            Version {certificate.courseVersionNumber}
            {certificate.courseLanguage ? ` · ${certificate.courseLanguage}` : ''}
          </p>
          <div className="certificate-footer">
            <div>
              <span className="certificate-rule" />
              <strong>AyahSpring</strong>
              <span className="certificate-meta">Issued {issuedDate}</span>
            </div>
            <div className="certificate-number-block">
              <span className="certificate-meta">Certificate number</span>
              {/* The sheet is `dir="ltr"`, so this isolates nothing today. It is
                  here because a number is the one string on a certificate that
                  must never be reordered: if these labels are ever translated,
                  the number stays a number without anybody remembering. */}
              <strong><bdi>{certificate.certificateNumber}</bdi></strong>
              {/* A printed certificate has no clickable link, so the address is
                  printed too. It is the configured origin when the deployment
                  has one, and the path alone otherwise — never the request's
                  Host header, which is the one part of the request a visitor
                  can choose. */}
              <span className="certificate-meta"><bdi>{verifyAddress}</bdi></span>
              <Link href={`/verify/${encodeURIComponent(certificate.certificateNumber)}`}>
                Verify this certificate
              </Link>
            </div>
          </div>
        </div>
      </article>
      {certificate.status === 'revoked' && certificate.revocationReason && (
        // Printed with the sheet, so it is in the sheet's language.
        <p className="notice warn print-revocation" lang="en" dir="ltr">
          Revoked: {certificate.revocationReason}
        </p>
      )}
    </div>
  );
}
