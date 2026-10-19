import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { fetchCertificateForHolder } from '@/lib/certificates';
import { PrintCertificateButton } from './print-button';

export const dynamic = 'force-dynamic';

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

  return (
    <div className="container section certificate-page">
      <div className="row no-print" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <p className="eyebrow"><Link href="/certificates">My certificates</Link></p>
        {certificate.status === 'issued' && <PrintCertificateButton />}
      </div>
      {certificate.status === 'revoked' && (
        <div className="notice warn no-print" role="alert">
          This certificate has been revoked and must not be presented as valid.
          {certificate.revocationReason && ` Reason: ${certificate.revocationReason}`}
        </div>
      )}

      <article className={`certificate-sheet ${certificate.status === 'revoked' ? 'is-revoked' : ''}`}>
        <div className="certificate-inner">
          <div className="certificate-brand"><span className="certificate-mark" aria-hidden="true" /> AyahSpring</div>
          <p className="certificate-kicker">Certificate of completion</p>
          <h1>Certificate of Achievement</h1>
          <p className="certificate-intro">This is to recognise that</p>
          <p className="certificate-learner">{certificate.learnerDisplayName}</p>
          <p className="certificate-copy">
            has completed the learning requirements for
          </p>
          <h2>{certificate.courseTitle}</h2>
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
              <strong>{certificate.certificateNumber}</strong>
              <Link href={`/verify/${encodeURIComponent(certificate.certificateNumber)}`}>
                Verify this certificate
              </Link>
            </div>
          </div>
        </div>
      </article>
      {certificate.status === 'revoked' && certificate.revocationReason && (
        <p className="notice warn print-revocation">Revoked: {certificate.revocationReason}</p>
      )}
    </div>
  );
}
