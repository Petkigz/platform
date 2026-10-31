'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { CertificatePolicy } from '@/lib/certificates';

/**
 * Whether finishing this version earns a certificate.
 *
 * This is the switch that made the certificate shelf reachable. Until it
 * existed, `certificate_enabled` had a writer function (`set_course_certificate_policy`)
 * and no button anywhere: staff could issue a certificate, but no author could
 * ever ask for one, so `/admin/certificates` could only ever be empty. A
 * feature that is fully built and cannot be turned on is not shipped.
 *
 * Two fields, because the decision has exactly two parts: whether, and what
 * design it is printed on. The design name is kept when the switch goes off —
 * turning it back on should not make the author remember what they chose last
 * term.
 *
 * A published version is frozen (D5), so this is disabled there with a
 * sentence saying why, rather than failing when pressed.
 */
export function CertificatePolicyCard({
  versionId,
  versionNumber,
  versionStatus,
  policy,
}: {
  versionId: string;
  versionNumber: number;
  versionStatus: string;
  policy: CertificatePolicy;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [enabled, setEnabled] = useState(policy.enabled);
  const [templateVersion, setTemplateVersion] = useState(policy.templateVersion ?? '');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const frozen = versionStatus !== 'draft' && versionStatus !== 'rejected';
  const dirty =
    enabled !== policy.enabled ||
    (enabled && templateVersion.trim() !== (policy.templateVersion ?? ''));

  async function save(next: boolean) {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch('/api/teach', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'set_certificate_policy',
          versionId,
          enabled: next,
          templateVersion: templateVersion.trim() || undefined,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
        enabled?: boolean;
        templateVersion?: string | null;
        changed?: boolean;
      };
      if (!res.ok || json.ok !== true) {
        setError(json.message ?? 'Could not save that. Nothing changed.');
        return;
      }
      setEnabled(json.enabled === true);
      if (json.templateVersion) setTemplateVersion(json.templateVersion);
      setMessage(
        json.changed === false
          ? 'Nothing changed — this version already said that.'
          : json.enabled
            ? 'Saved. Learners who finish this version can be given a certificate.'
            : 'Saved. This version no longer promises a certificate.',
      );
      startTransition(() => router.refresh());
    } catch {
      setError('The request could not be sent. Nothing changed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card" style={{ display: 'grid', gap: '0.5rem', maxWidth: '40rem' }}>
      <p className="eyebrow" style={{ margin: 0 }}>
        What finishing this means
      </p>
      <p className="muted" style={{ margin: 0 }}>
        Version {versionNumber}. A certificate is a record that a named learner finished this
        version of this course. It is issued by staff once, cannot be edited afterwards, and
        anyone holding its number can check it without signing in.
      </p>

      <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <input
          type="checkbox"
          checked={enabled}
          disabled={busy || pending || frozen}
          onChange={(event) => {
            setEnabled(event.target.checked);
            setMessage(null);
            setError(null);
          }}
        />
        <span>Learners who finish this version earn a certificate</span>
      </label>

      {enabled && (
        <div style={{ display: 'grid', gap: '0.25rem' }}>
          <label htmlFor="certificate-design">Design it is printed on</label>
          <input
            id="certificate-design"
            value={templateVersion}
            maxLength={80}
            placeholder="standard-v1"
            disabled={busy || pending || frozen}
            onChange={(event) => {
              setTemplateVersion(event.target.value);
              setMessage(null);
            }}
          />
          <p className="meta" style={{ margin: 0 }}>
            A name, kept with the certificate. It says which design was used, so a change of
            design later does not rewrite certificates already given.
          </p>
        </div>
      )}

      {frozen && (
        <p className="muted" style={{ margin: 0 }}>
          {versionStatus === 'published'
            ? 'This version is published and frozen. A new version is how you change what a course promises.'
            : 'This version is in review. What it promises is part of what is being reviewed.'}
        </p>
      )}

      {error && (
        <div className="notice error" role="alert">
          {error}
        </div>
      )}
      {message && (
        <div className="notice" role="status">
          {message}
        </div>
      )}

      {!frozen && (
        <button
          type="button"
          className="btn"
          disabled={busy || pending || !dirty}
          onClick={() => void save(enabled)}
        >
          {busy ? 'Saving…' : 'Save'}
        </button>
      )}
    </div>
  );
}
