import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { fetchCertificates } from '@/lib/certificates';

export const dynamic = 'force-dynamic';

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
 */
export default async function CertificatesPage() {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/sign-in?next=/certificates');

  const certificates = await fetchCertificates(supabase);

  return (
    <div className="container section">
      <p className="eyebrow">Certificates</p>
      <h1>Certificates</h1>
      <p className="lede">
        Each certificate records the course, its version, and what was required
        of you at the time. Renaming a course afterwards does not change what
        you were awarded.
      </p>

      {certificates.length === 0 ? (
        <div className="empty">
          No certificates yet. They are issued for completed courses whose
          author has enabled them.
        </div>
      ) : (
        <div className="grid cols-2">
          {certificates.map((c) => (
            <div className="card" key={c.id}>
              <div className="badges" style={{ marginBottom: '0.5rem' }}>
                <span className={`badge ${c.status === 'issued' ? '' : 'neutral'}`}>
                  {c.status === 'issued' ? 'Issued' : 'Revoked'}
                </span>
                {c.courseLanguage && (
                  <span className="badge neutral">{c.courseLanguage}</span>
                )}
              </div>

              <h3 style={{ marginTop: 0 }}>{c.courseTitle}</h3>

              <p className="meta" style={{ margin: '0.25rem 0' }}>
                {c.learnerDisplayName} · version {c.courseVersionNumber}
              </p>
              <p className="meta" style={{ margin: '0.25rem 0' }}>
                {c.issuedAt
                  ? `Issued ${new Date(c.issuedAt).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}`
                  : 'Not yet issued'}
              </p>

              <p
                style={{
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                  fontSize: '0.85rem',
                  marginTop: '0.75rem',
                  wordBreak: 'break-all',
                }}
              >
                {c.certificateNumber}
              </p>

              <p className="meta" style={{ marginTop: '0.5rem' }}>
                <Link href={`/verify/${c.certificateNumber}`}>Verify this certificate</Link>
              </p>

              {c.status === 'revoked' && (
                <div className="notice warn" style={{ marginTop: '0.75rem' }}>
                  Revoked{c.revocationReason ? `: ${c.revocationReason}` : '.'}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <p style={{ marginTop: '1.5rem' }}>
        <Link href="/learn">Back to my learning</Link>
      </p>
    </div>
  );
}
