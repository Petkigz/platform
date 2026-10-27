'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import {
  INSTITUTION_TYPES,
  describeDomainStatus,
  dnsRecord,
  type InstitutionDirectory,
} from '@/lib/institution';

/**
 * The owner's desk for institutions.
 *
 * Three acts: open an institution and name its first administrator by address,
 * check a domain claim somebody has published, and hand the administrator badge
 * to another member or take it back. Each needs a written reason, because each
 * is a decision somebody else will live with.
 *
 * Checking a domain is a person's judgement, not a network call: the screen
 * prints the exact record to look for and records who said they found it.
 */
export function InstitutionsDesk({ directory }: { directory: InstitutionDirectory }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState('madrasah');
  const [adminEmail, setAdminEmail] = useState('');
  const [reason, setReason] = useState('');

  const [reasons, setReasons] = useState<Record<string, string>>({});

  async function call(body: Record<string, unknown>, key: string) {
    setBusy(key);
    setError(null);
    setDone(null);
    try {
      const res = await fetch('/api/institution', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const out = (await res.json()) as { ok?: boolean; message?: string };
      if (!out.ok) {
        setError(out.message ?? 'That did not work.');
        return false;
      }
      startTransition(() => router.refresh());
      return true;
    } catch {
      setError('The request could not be sent. Nothing changed.');
      return false;
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="stack">
      {error && (
        <div className="notice error" role="alert">
          {error}
        </div>
      )}
      {done && (
        <div className="notice" role="status">
          {done}
        </div>
      )}

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Open an institution</h2>
        <p className="muted">
          Only the platform owner can do this. Naming the first administrator makes that account
          able to brand the institution, claim its domain and create keys — and nothing more: an
          institution administrator cannot publish a course, publish a teacher or see a learner's
          name.
        </p>

        <div className="stack" style={{ gap: '0.5rem' }}>
          <label htmlFor="inst-code">Short code</label>
          <input
            id="inst-code"
            value={code}
            maxLength={40}
            onChange={(event) => setCode(event.target.value)}
            placeholder="alnoor-madrasah"
            disabled={busy === 'create' || pending}
          />

          <label htmlFor="inst-name">Name</label>
          <input
            id="inst-name"
            value={name}
            maxLength={160}
            onChange={(event) => setName(event.target.value)}
            placeholder="Alnoor Madrasah"
            disabled={busy === 'create' || pending}
          />

          <label htmlFor="inst-type">Kind</label>
          <select
            id="inst-type"
            value={type}
            onChange={(event) => setType(event.target.value)}
            disabled={busy === 'create' || pending}
          >
            {INSTITUTION_TYPES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <label htmlFor="inst-admin">First administrator’s email address</label>
          <input
            id="inst-admin"
            type="email"
            value={adminEmail}
            onChange={(event) => setAdminEmail(event.target.value)}
            placeholder="head@school.example"
            disabled={busy === 'create' || pending}
          />
          <p className="muted" style={{ margin: '-0.3rem 0 0' }}>
            The account has to exist already. They sign in, and the institution appears for them.
          </p>

          <label htmlFor="inst-reason">Why is this institution being opened?</label>
          <input
            id="inst-reason"
            value={reason}
            maxLength={500}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Asked by the head teacher; their board approved it."
            disabled={busy === 'create' || pending}
          />

          <button
            type="button"
            className="btn"
            disabled={
              busy === 'create' || pending || !code || !name || !adminEmail || !reason
            }
            onClick={async () => {
              const ok = await call(
                { action: 'create', code, name, type, adminEmail, reason },
                'create',
              );
              if (ok) {
                setDone('Opened. Its administrator can now sign in and set it up.');
                setCode('');
                setName('');
                setAdminEmail('');
                setReason('');
              }
            }}
          >
            {busy === 'create' ? 'Opening…' : 'Open it'}
          </button>
        </div>
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Domains waiting to be checked</h2>
        <p className="muted">
          The administrator published a TXT record. Look it up at their domain, then record what you
          found. Nothing joins by a domain until somebody here has checked it.
        </p>

        {directory.waitingDomains.length === 0 ? (
          <p className="empty">Nothing is waiting.</p>
        ) : (
          directory.waitingDomains.map((row) => (
            <div key={row.id} className="card" style={{ margin: '0.75rem 0 0' }}>
              <div className="outline-h" style={{ marginTop: 0 }}>
                <strong>{row.domain}</strong>
                <span className="badge neutral">{row.institution}</span>
              </div>
              <p className="muted" style={{ marginBottom: '0.25rem' }}>
                Look for this record:
              </p>
              <pre style={{ overflowX: 'auto', margin: 0 }}>{dnsRecord(row.claimToken)}</pre>

              <label htmlFor={`verify-${row.id}`} style={{ marginTop: '0.5rem' }}>
                What did you find?
              </label>
              <input
                id={`verify-${row.id}`}
                value={reasons[row.id] ?? ''}
                maxLength={1000}
                onChange={(event) =>
                  setReasons((current) => ({ ...current, [row.id]: event.target.value }))
                }
                disabled={busy?.endsWith(row.id) || pending}
                placeholder="TXT record present and matches."
              />

              <p style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn"
                  disabled={busy?.endsWith(row.id) || pending}
                  onClick={async () => {
                    const ok = await call(
                      {
                        action: 'verifyDomain',
                        domainId: row.id,
                        verified: true,
                        reason: reasons[row.id] ?? '',
                      },
                      `verify:${row.id}`,
                    );
                    if (ok) setDone('Verified. Accounts at that domain may now join.');
                  }}
                >
                  Verified — let them join
                </button>
                <button
                  type="button"
                  className="btn secondary"
                  disabled={busy?.endsWith(row.id) || pending}
                  onClick={async () => {
                    const ok = await call(
                      {
                        action: 'verifyDomain',
                        domainId: row.id,
                        verified: false,
                        reason: reasons[row.id] ?? '',
                      },
                      `reject:${row.id}`,
                    );
                    if (ok) setDone('Rejected, with your reason on the claim.');
                  }}
                >
                  Not there — reject it
                </button>
              </p>
            </div>
          ))
        )}
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Institutions</h2>
        {directory.institutions.length === 0 ? (
          <p className="empty">None yet.</p>
        ) : (
          <div className="scroll-x">
            <table>
              <thead>
                <tr>
                  <th>Institution</th>
                  <th>Kind</th>
                  <th>Members</th>
                  <th>Administrators</th>
                  <th>Verified domains</th>
                  <th>Change an administrator</th>
                </tr>
              </thead>
              <tbody>
                {directory.institutions.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <strong>{row.name}</strong>
                      <div className="meta">{row.code}</div>
                    </td>
                    <td>{row.type}</td>
                    <td>{row.members}</td>
                    <td>{row.admins}</td>
                    <td>{row.domains}</td>
                    <td>
                      <AdminChange
                        institutionId={row.id}
                        disabled={busy?.startsWith(row.id) || pending}
                        onSet={async (email, makeAdmin, why) => {
                          const ok = await call(
                            {
                              action: 'setAdmin',
                              institutionId: row.id,
                              email,
                              makeAdmin,
                              reason: why,
                            },
                            `${row.id}:${makeAdmin ? 'up' : 'down'}`,
                          );
                          if (ok) {
                            setDone(
                              makeAdmin
                                ? 'That account is now an administrator.'
                                : 'That account is an ordinary member now.',
                            );
                          }
                          return ok;
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="muted">
        An institution administrator manages their own page at <code>/institution</code>. They can
        never appoint a teacher, publish a course, see a learner’s name or move money — those live
        with the platform’s own staff roles.
      </p>
    </div>
  );
}

/** One row's worth of "make them an administrator / take it back". */
function AdminChange({
  institutionId,
  disabled,
  onSet,
}: {
  institutionId: string;
  disabled: boolean;
  onSet: (email: string, makeAdmin: boolean, reason: string) => Promise<boolean>;
}) {
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');

  return (
    <div style={{ display: 'grid', gap: '0.35rem', minWidth: '15rem' }}>
      <label htmlFor={`admin-email-${institutionId}`} className="eyebrow">
        Member’s email
      </label>
      <input
        id={`admin-email-${institutionId}`}
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="member@school.example"
        disabled={disabled}
      />
      <label htmlFor={`admin-reason-${institutionId}`} className="eyebrow">
        Reason
      </label>
      <input
        id={`admin-reason-${institutionId}`}
        value={reason}
        maxLength={500}
        onChange={(event) => setReason(event.target.value)}
        disabled={disabled}
      />
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          className="btn tiny"
          disabled={disabled || !email || !reason}
          onClick={async () => {
            if (await onSet(email, true, reason)) {
              setEmail('');
              setReason('');
            }
          }}
        >
          Make administrator
        </button>
        <button
          type="button"
          className="btn tiny secondary"
          disabled={disabled || !email || !reason}
          onClick={async () => {
            if (await onSet(email, false, reason)) {
              setEmail('');
              setReason('');
            }
          }}
        >
          Make a member
        </button>
      </div>
    </div>
  );
}
