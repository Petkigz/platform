import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { verifyCertificate } from '@/lib/certificates';

export const dynamic = 'force-dynamic';

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
 */
export default async function VerifyPage({
  params,
}: {
  params: Promise<{ number: string }>;
}) {
  if (!isSupabaseConfigured()) redirect('/');

  const { number } = await params;
  const supabase = await createClient();
  const result = await verifyCertificate(supabase, number).catch(() => null);

  const notFound = !result || !result.found;

  return (
    <div className="container section" style={{ maxWidth: '44rem' }}>
      <p className="eyebrow">AyahSpring</p>
      <h1>Verify a certificate</h1>

      {notFound ? (
        <div className="notice warn">
          <strong>No certificate matches that number.</strong>
          <p style={{ marginBottom: 0, marginTop: '0.5rem' }}>
            Check for a transcription error. Certificate numbers look like{' '}
            <code>AS-2026-00000001</code>.
          </p>
        </div>
      ) : result.valid ? (
        <div className="notice">
          <strong>This certificate is valid.</strong>
          <p style={{ marginBottom: 0, marginTop: '0.5rem' }}>
            It was issued by AyahSpring and has not been revoked.
          </p>
        </div>
      ) : (
        <div className="notice error">
          <strong>This certificate is not valid.</strong>
          <p style={{ marginBottom: 0, marginTop: '0.5rem' }}>
            {result.revokedReason
              ? `It was revoked: ${result.revokedReason}`
              : 'Its status is not "issued".'}
          </p>
        </div>
      )}

      {!notFound && (
        <div className="card" style={{ marginTop: '1.5rem' }}>
          <dl className="facts">
            <div>
              <dt>Holder</dt>
              <dd>{result.learnerName ?? '—'}</dd>
            </div>
            <div>
              <dt>Course</dt>
              <dd>
                {result.courseTitle ?? '—'}
                {result.courseVersion != null && (
                  <span className="meta"> · version {result.courseVersion}</span>
                )}
              </dd>
            </div>
            <div>
              <dt>Language</dt>
              <dd>{result.language ?? '—'}</dd>
            </div>
            <div>
              <dt>Issued</dt>
              <dd>
                {result.issuedOn
                  ? new Date(result.issuedOn).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : '—'}
              </dd>
            </div>
            <div>
              <dt>Number</dt>
              <dd style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' }}>
                {number}
              </dd>
            </div>
          </dl>

          <p className="meta" style={{ marginTop: '1rem', marginBottom: 0 }}>
            The course title and version shown here are what they were when the
            certificate was issued. They are recorded on the certificate itself
            and cannot be changed afterwards.
          </p>
        </div>
      )}

      <p style={{ marginTop: '1.5rem' }}>
        <Link href="/">AyahSpring home</Link>
      </p>
    </div>
  );
}
