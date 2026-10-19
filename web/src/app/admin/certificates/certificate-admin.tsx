'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { CertificateAdminRecord, CertificateCandidate } from '@/lib/certificates';

export function CertificateAdmin({
  candidates,
  records,
}: {
  candidates: CertificateCandidate[];
  records: CertificateAdminRecord[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [issuedNumber, setIssuedNumber] = useState<string | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});

  async function submit(payload: Record<string, unknown>, key: string) {
    setBusy(key);
    setError(null);
    setIssuedNumber(null);
    try {
      const response = await fetch('/api/admin/certificates', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = (await response.json().catch(() => null)) as {
        ok?: boolean;
        message?: string;
        certificateNumber?: string;
      } | null;
      if (!response.ok || result?.ok !== true) {
        setError(result?.message ?? 'That certificate action did not work.');
        return;
      }
      if (typeof result.certificateNumber === 'string') setIssuedNumber(result.certificateNumber);
      startTransition(() => router.refresh());
    } catch {
      setError('Could not reach the server. Check your connection and try again.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="section">
      {error && <div className="notice error" role="alert">{error}</div>}
      {issuedNumber && (
        <div className="notice" role="status">
          Certificate issued: <strong>{issuedNumber}</strong>{' · '}
          <a href={`/verify/${encodeURIComponent(issuedNumber)}`}>Open verification record</a>
        </div>
      )}

      <section aria-labelledby="eligible-title">
        <div className="outline-h">
          <h2 id="eligible-title">Ready to issue</h2>
          <span className="badge neutral">{candidates.length}</span>
        </div>
        <p className="muted">Only completed enrolments with certificates enabled appear here. Issuance is recorded once and cannot be duplicated.</p>
        {candidates.length === 0 ? (
          <p className="empty">No eligible learners are waiting for a certificate.</p>
        ) : (
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {candidates.map((candidate) => (
              <article className="card row" key={candidate.enrolment_id} style={{ justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                <div>
                  <h3 style={{ margin: 0 }}>{candidate.course_title}</h3>
                  <p className="muted" style={{ margin: '0.25rem 0 0' }}>
                    {candidate.learner_display_name} · version {candidate.course_version_number}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn secondary"
                  disabled={busy !== null || pending}
                  onClick={() => void submit({ action: 'issue', enrolmentId: candidate.enrolment_id }, `issue-${candidate.enrolment_id}`)}
                >
                  {busy === `issue-${candidate.enrolment_id}` ? 'Issuing…' : 'Issue certificate'}
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="section" aria-labelledby="issued-title">
        <div className="outline-h">
          <h2 id="issued-title">Certificate records</h2>
          <span className="badge neutral">{records.length}</span>
        </div>
        <p className="muted">Revocation is permanent and requires a written reason. The verification record remains public and shows that reason.</p>
        {records.length === 0 ? (
          <p className="empty">No certificates have been issued yet.</p>
        ) : (
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {records.map((record) => (
              <article className="card" key={record.certificate_id}>
                <div className="row" style={{ justifyContent: 'space-between', alignItems: 'start', gap: '1rem' }}>
                  <div>
                    <span className={`badge ${record.status === 'issued' ? '' : 'neutral'}`}>
                      {record.status === 'issued' ? 'Issued' : 'Revoked'}
                    </span>
                    <h3 style={{ margin: '0.4rem 0 0' }}>{record.course_title}</h3>
                    <p className="muted" style={{ margin: '0.25rem 0' }}>
                      {record.learner_display_name} · version {record.course_version_number} · {record.certificate_number}
                    </p>
                    <p className="meta" style={{ margin: 0 }}>
                      Issued {new Date(record.issued_at).toLocaleDateString()}{' · '}
                      <a href={`/verify/${encodeURIComponent(record.certificate_number)}`}>Verify</a>
                    </p>
                    {record.revocation_reason && <p className="notice warn">Reason: {record.revocation_reason}</p>}
                  </div>
                  {record.status === 'issued' && (
                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        if (!window.confirm('Revoke this certificate permanently? The public verification record will remain.')) return;
                        void submit({
                          action: 'revoke',
                          certificateId: record.certificate_id,
                          reason: reasons[record.certificate_id] ?? '',
                        }, `revoke-${record.certificate_id}`);
                      }}
                      style={{ display: 'grid', gap: '0.5rem', minWidth: 'min(100%, 18rem)' }}
                    >
                      <label htmlFor={`reason-${record.certificate_id}`}>Reason to revoke</label>
                      <textarea
                        id={`reason-${record.certificate_id}`}
                        value={reasons[record.certificate_id] ?? ''}
                        onChange={(event) => setReasons({ ...reasons, [record.certificate_id]: event.target.value })}
                        maxLength={500}
                        rows={2}
                        required
                        disabled={busy !== null}
                      />
                      <button type="submit" className="btn ghost" disabled={busy !== null || pending}>
                        {busy === `revoke-${record.certificate_id}` ? 'Revoking…' : 'Revoke certificate'}
                      </button>
                    </form>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
