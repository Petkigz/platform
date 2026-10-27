'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import {
  ACCENTS,
  REPORT_NOTICE,
  SSO_NOTICE,
  describeDomainStatus,
  dnsRecord,
  reportCsv,
  safeLogoUrl,
  type InstitutionReport,
  type MyInstitution,
} from '@/lib/institution';

/**
 * The institution console.
 *
 * One page, four cards, each behind its own switch — and each card says what it
 * cannot do. The branding card says there is no colour picker and no upload. The
 * domain card says a claim is not a verified domain and that staff check the
 * record. The key card shows the secret once and then cannot show it again. The
 * report card says it is counts, not records.
 */
export function InstitutionConsole({
  board,
  report,
  window,
}: {
  board: MyInstitution;
  report: InstitutionReport | null;
  window: { from: string; to: string };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState(board.branding?.displayName ?? '');
  const [tagline, setTagline] = useState(board.branding?.tagline ?? '');
  const [accent, setAccent] = useState(board.branding?.accent ?? 'green');
  const [logoUrl, setLogoUrl] = useState(board.branding?.logoUrl ?? '');

  const [domain, setDomain] = useState('');
  const [keyName, setKeyName] = useState('');
  const [newKey, setNewKey] = useState<string | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});

  const isAdmin = board.role === 'admin';
  const logo = safeLogoUrl(board.branding?.logoUrl ?? null);

  async function call(body: Record<string, unknown>, key: string): Promise<Record<string, unknown> | null> {
    setBusy(key);
    setError(null);
    setDone(null);
    try {
      const res = await fetch('/api/institution', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const out = (await res.json()) as Record<string, unknown> & { ok?: boolean; message?: string };
      if (!out.ok) {
        setError(out.message ?? 'That did not work.');
        return null;
      }
      startTransition(() => router.refresh());
      return out;
    } catch {
      setError('The request could not be sent. Nothing changed.');
      return null;
    } finally {
      setBusy(null);
    }
  }

  function downloadCsv() {
    if (!report) return;
    const blob = new Blob([reportCsv(report)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `institution-report-${window.from}-to-${window.to}.csv`;
    link.click();
    URL.revokeObjectURL(url);
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

      {board.flags.branding && isAdmin && (
        <section className="card">
          <h2 style={{ marginTop: 0 }}>How it looks</h2>
          <p className="muted">
            Your name, a line about you, a tone and a logo. The tone is one of five because this
            platform is white and green on purpose — there is no colour picker, and no upload: the
            logo is a link to a file you already host.
          </p>

          {logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt="The institution’s logo" style={{ maxHeight: '64px', marginBottom: '0.75rem' }} />
          )}

          <div className="stack" style={{ gap: '0.5rem' }}>
            <label htmlFor="brand-name">Display name</label>
            <input
              id="brand-name"
              value={displayName}
              maxLength={120}
              onChange={(event) => setDisplayName(event.target.value)}
              disabled={busy === 'branding' || pending}
            />

            <label htmlFor="brand-tagline">One line about the institution</label>
            <input
              id="brand-tagline"
              value={tagline}
              maxLength={200}
              onChange={(event) => setTagline(event.target.value)}
              disabled={busy === 'branding' || pending}
              placeholder="Quran and Arabic, every evening"
            />

            <label htmlFor="brand-accent">Tone</label>
            <select
              id="brand-accent"
              value={accent}
              onChange={(event) => setAccent(event.target.value)}
              disabled={busy === 'branding' || pending}
            >
              {ACCENTS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <label htmlFor="brand-logo">Logo address (https)</label>
            <input
              id="brand-logo"
              type="url"
              value={logoUrl}
              maxLength={500}
              onChange={(event) => setLogoUrl(event.target.value)}
              disabled={busy === 'branding' || pending}
              placeholder="https://"
            />

            <button
              type="button"
              className="btn"
              disabled={busy === 'branding' || pending}
              onClick={async () => {
                const out = await call(
                  { action: 'branding', displayName, tagline, accent, logoUrl },
                  'branding',
                );
                if (out) setDone('Saved.');
              }}
            >
              {busy === 'branding' ? 'Saving…' : 'Save'}
            </button>
          </div>
        </section>
      )}

      {board.flags.sso && (
        <section className="card">
          <h2 style={{ marginTop: 0 }}>Your domain</h2>
          <p className="muted">{SSO_NOTICE}</p>

          {isAdmin && (
            <div className="row" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
              <label htmlFor="claim-domain" className="eyebrow" style={{ alignSelf: 'center' }}>
                Domain
              </label>
              <input
                id="claim-domain"
                value={domain}
                onChange={(event) => setDomain(event.target.value)}
                placeholder="school.example"
                disabled={busy === 'claim' || pending}
                style={{ flex: '1 1 16rem' }}
              />
              <button
                type="button"
                className="btn secondary"
                disabled={busy === 'claim' || pending || domain.trim() === ''}
                onClick={async () => {
                  const out = await call({ action: 'claim', domain }, 'claim');
                  if (out) {
                    setDone(
                      'Claimed. Publish the TXT record below, and a staff member will check it. ' +
                        'Until they do, nobody can join by this domain.',
                    );
                    setDomain('');
                  }
                }}
              >
                {busy === 'claim' ? 'Claiming…' : 'Claim this domain'}
              </button>
            </div>
          )}

          {board.domains.length === 0 ? (
            <p className="muted">No domain has been claimed.</p>
          ) : (
            <div className="stack" style={{ marginTop: '0.75rem' }}>
              {board.domains.map((row) => (
                <div key={row.id} className="card" style={{ margin: 0 }}>
                  <div className="outline-h" style={{ marginTop: 0 }}>
                    <strong>{row.domain}</strong>
                    <span className={row.status === 'verified' ? 'badge ok' : 'badge neutral'}>
                      {describeDomainStatus(row.status)}
                    </span>
                  </div>
                  {row.claimToken && (
                    <>
                      <p className="muted" style={{ marginBottom: '0.25rem' }}>
                        Add this as a TXT record at your domain, then ask the owner to check it:
                      </p>
                      <pre style={{ overflowX: 'auto', margin: 0 }}>{dnsRecord(row.claimToken)}</pre>
                    </>
                  )}
                  {row.note && <p className="muted">Staff note: {row.note}</p>}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {board.flags.reporting && (
        <section className="card">
          <h2 style={{ marginTop: 0 }}>What your people studied</h2>
          <p className="muted">{REPORT_NOTICE}</p>

          <form method="get" className="row" style={{ gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <label htmlFor="from" className="eyebrow" style={{ alignSelf: 'center' }}>
              From
            </label>
            <input id="from" name="from" type="date" defaultValue={window.from} />
            <label htmlFor="to" className="eyebrow" style={{ alignSelf: 'center' }}>
              To
            </label>
            <input id="to" name="to" type="date" defaultValue={window.to} />
            <button type="submit" className="btn secondary">
              Read this window
            </button>
            {report && (
              <button type="button" className="btn ghost" onClick={downloadCsv}>
                Download as CSV
              </button>
            )}
          </form>

          {report ? (
            <>
              <div className="stats">
                <div>
                  <div className="n">{report.totals.members}</div>
                  <div className="l">accounts joined</div>
                </div>
                <div>
                  <div className="n">{report.totals.learners}</div>
                  <div className="l">learner profiles</div>
                </div>
                <div>
                  <div className="n">{report.totals.enrolments}</div>
                  <div className="l">enrolments</div>
                </div>
                <div>
                  <div className="n">{report.totals.completions}</div>
                  <div className="l">completed</div>
                </div>
                <div>
                  <div className="n">{report.totals.certificates}</div>
                  <div className="l">certificates</div>
                </div>
              </div>

              {report.courses.length === 0 ? (
                <p className="empty">Nothing was enrolled in this window.</p>
              ) : (
                <div className="scroll-x">
                  <table>
                    <thead>
                      <tr>
                        <th>Course</th>
                        <th>Learner profiles</th>
                        <th>Enrolments</th>
                        <th>Completed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.courses.map((row) => (
                        <tr key={row.course}>
                          <td>{row.course}</td>
                          <td>{row.learnerProfiles}</td>
                          <td>{row.enrolments}</td>
                          <td>{row.completions}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            <p className="muted">The report could not be read. Nothing was changed.</p>
          )}
        </section>
      )}

      {board.flags.api && isAdmin && (
        <section className="card">
          <h2 style={{ marginTop: 0 }}>Keys for your own systems</h2>
          <p className="muted">
            One endpoint: <code>GET /api/institution/v1/report?from=&amp;to=</code> with{' '}
            <code>Authorization: Bearer ayi_…</code>. It returns exactly the counts on this page. A
            key is shown once — only its hash is stored, so it cannot be shown again — and it stops
            working the moment you revoke it. There are no webhooks: nothing here can call you.
          </p>

          <div className="row" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
            <label htmlFor="key-name" className="eyebrow" style={{ alignSelf: 'center' }}>
              Name
            </label>
            <input
              id="key-name"
              value={keyName}
              maxLength={80}
              onChange={(event) => setKeyName(event.target.value)}
              placeholder="Nightly export"
              disabled={busy === 'createKey' || pending}
              style={{ flex: '1 1 16rem' }}
            />
            <button
              type="button"
              className="btn secondary"
              disabled={busy === 'createKey' || pending || keyName.trim() === ''}
              onClick={async () => {
                const out = await call({ action: 'createKey', name: keyName }, 'createKey');
                if (out && typeof out.key === 'string') {
                  setNewKey(out.key);
                  setKeyName('');
                  setDone('Key created. Copy it now — it will not be shown again.');
                }
              }}
            >
              {busy === 'createKey' ? 'Creating…' : 'Create a key'}
            </button>
          </div>

          {newKey && (
            <div className="notice warn" style={{ marginTop: '0.75rem' }}>
              <strong>This is the only time the key is shown.</strong>
              <pre style={{ overflowX: 'auto', margin: '0.5rem 0 0' }}>{newKey}</pre>
            </div>
          )}

          {board.keys.length === 0 ? (
            <p className="muted">No keys yet.</p>
          ) : (
            <div className="stack" style={{ marginTop: '0.75rem' }}>
              {board.keys.map((key) => (
                <div key={key.id} className="card" style={{ margin: 0 }}>
                  <div className="outline-h" style={{ marginTop: 0 }}>
                    <strong>{key.name}</strong>
                    <span className={key.revokedAt ? 'badge neutral' : 'badge ok'}>
                      {key.revokedAt ? 'Revoked' : 'Working'}
                    </span>
                  </div>
                  <p className="meta">
                    <code>ayi_{key.prefix}_…</code> · last used{' '}
                    {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString('en-GB') : 'never'}
                  </p>
                  {key.revokedAt ? (
                    <p className="muted">Revoked: {key.revokedReason ?? 'no reason recorded'}</p>
                  ) : (
                    <>
                      <label htmlFor={`revoke-${key.id}`}>Why is this key being revoked?</label>
                      <input
                        id={`revoke-${key.id}`}
                        value={reasons[key.id] ?? ''}
                        maxLength={500}
                        onChange={(event) =>
                          setReasons((current) => ({ ...current, [key.id]: event.target.value }))
                        }
                        disabled={busy === `revoke:${key.id}` || pending}
                        placeholder="Laptop lost"
                      />
                      <button
                        type="button"
                        className="btn secondary"
                        style={{ marginTop: '0.5rem' }}
                        disabled={busy === `revoke:${key.id}` || pending}
                        onClick={async () => {
                          const out = await call(
                            { action: 'revokeKey', keyId: key.id, reason: reasons[key.id] ?? '' },
                            `revoke:${key.id}`,
                          );
                          if (out) setDone('Revoked. It stops working now.');
                        }}
                      >
                        Revoke this key
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {!isAdmin && (
        <p className="muted">
          You are a member of this institution. Its administrators manage the branding, the domain
          and the keys; you can read where you belong and leave at any time.
        </p>
      )}

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Leaving</h2>
        <p className="muted">
          Leaving ends your membership. It does not delete your account or anything you have
          learned — your courses stay in your own account.
        </p>
        <button
          type="button"
          className="btn secondary"
          disabled={busy === 'leave' || pending}
          onClick={async () => {
            const out = await call({ action: 'leave' }, 'leave');
            if (out) setDone('You have left. Your learning is untouched.');
          }}
        >
          {busy === 'leave' ? 'Leaving…' : 'Leave this institution'}
        </button>
      </section>
    </div>
  );
}
