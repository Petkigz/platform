'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import {
  authorisationLine, grantedOnSentence, ijazahSentence, parseAuthorisations,
  type Register,
} from '@/lib/ijazah';

/**
 * The register and the form, on one page.
 *
 * Two things this deliberately does not have: a dropdown of ijazah types (the
 * scope is free text, because a taxonomy invented here would be a claim about
 * somebody else's tradition), and an edit button. A correction is a withdrawal
 * with a reason and a new entry, so the record keeps both.
 */
export function IjazahConsole({ register, enabled }: { register: Register; enabled: boolean }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [granteeUserId, setGranteeUserId] = useState('');
  const [grantedBy, setGrantedBy] = useState('');
  const [scope, setScope] = useState('');
  const [grantedOn, setGrantedOn] = useState('');
  const [chain, setChain] = useState('');
  const [evidence, setEvidence] = useState('');

  const [withdrawing, setWithdrawing] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  const rows = useMemo(
    () => parseAuthorisations(
      (register.authorisations ?? []).map((r) => ({ ...r, chain: r.chain })),
    ),
    [register.authorisations],
  );

  // Group by person while keeping the register's own order: a person with three
  // authorisations should read as one entry, not three unrelated lines.
  const grouped = useMemo(() => {
    const order: { userId: string; name: string; rows: typeof rows }[] = [];
    for (const source of register.authorisations ?? []) {
      const parsed = rows.find((r) => r.id === source.id);
      if (!parsed) continue;
      let group = order.find((g) => g.userId === source.granteeUserId);
      if (!group) {
        group = { userId: source.granteeUserId, name: source.displayName ?? 'Unnamed', rows: [] };
        order.push(group);
      }
      group.rows.push(parsed);
    }
    return order;
  }, [register.authorisations, rows]);

  async function submit() {
    setError(null);
    setNotice(null);
    if (!granteeUserId) {
      setError(ijazahSentence('ijazah:no_such_person'));
      return;
    }
    if (!grantedBy.trim()) {
      setError(ijazahSentence('ijazah:needs_grantor'));
      return;
    }
    if (!scope.trim()) {
      setError(ijazahSentence('ijazah:needs_scope'));
      return;
    }
    if (!evidence.trim()) {
      setError(ijazahSentence('ijazah:needs_evidence'));
      return;
    }

    setBusy(true);
    const res = await fetch('/api/admin/ijazah', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ granteeUserId, grantedBy, scope, grantedOn, chain, evidence }),
    });
    const json = (await res.json().catch(() => null)) as { ok?: boolean; code?: string } | null;
    setBusy(false);

    if (!res.ok || !json?.ok) {
      setError(ijazahSentence(json?.code));
      return;
    }

    setGranteeUserId('');
    setGrantedBy('');
    setScope('');
    setGrantedOn('');
    setChain('');
    setEvidence('');
    setNotice('Recorded. It is not visible to any learner, and it is not a verification.');
    startTransition(() => router.refresh());
  }

  async function withdraw(id: string) {
    setError(null);
    setNotice(null);
    if (!reason.trim()) {
      setError(ijazahSentence('ijazah:needs_reason'));
      return;
    }
    setBusy(true);
    const res = await fetch('/api/admin/ijazah', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id, reason }),
    });
    const json = (await res.json().catch(() => null)) as { ok?: boolean; code?: string } | null;
    setBusy(false);
    if (!res.ok || !json?.ok) {
      setError(ijazahSentence(json?.code));
      return;
    }
    setWithdrawing(null);
    setReason('');
    startTransition(() => router.refresh());
  }

  return (
    <>
      <section className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ marginTop: 0 }}>Record one</h2>
        {!enabled && (
          <div className="notice warn">
            Recording is switched off for this platform just now — `learning.ijazah` is off on{' '}
            <a href="/admin/settings">the settings page</a>. The register below is still readable,
            and an authorisation already recorded keeps its place.
          </div>
        )}

        <div className="grid cols-2">
          <div>
            <label htmlFor="grantee">Who holds it</label>
            <select
              id="grantee"
              value={granteeUserId}
              onChange={(e) => setGranteeUserId(e.target.value)}
              disabled={!enabled}
            >
              <option value="">Choose a teacher…</option>
              {(register.candidates ?? []).map((c) => (
                <option key={c.userId} value={c.userId}>
                  {c.displayName ?? c.userId}
                </option>
              ))}
            </select>

            <label htmlFor="grantor">Who granted it</label>
            <input
              id="grantor"
              value={grantedBy}
              onChange={(e) => setGrantedBy(e.target.value)}
              placeholder="A scholar's name, as they write it"
              disabled={!enabled}
            />

            <label htmlFor="scope">What it authorises</label>
            <input
              id="scope"
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              placeholder="Ḥafṣ ʿan ʿĀṣim, full recitation"
              disabled={!enabled}
            />

            <label htmlFor="granted-on">Granted on (optional)</label>
            <input
              id="granted-on"
              type="date"
              value={grantedOn}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setGrantedOn(e.target.value)}
              disabled={!enabled}
            />
          </div>

          <div>
            <label htmlFor="chain">The chain, if it was written down (optional)</label>
            <textarea
              id="chain"
              value={chain}
              onChange={(e) => setChain(e.target.value)}
              rows={3}
              disabled={!enabled}
            />

            <label htmlFor="evidence">What you were shown</label>
            <textarea
              id="evidence"
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
              rows={4}
              placeholder="The document, the sitting, who else was there."
              disabled={!enabled}
            />
            <p className="muted" style={{ fontSize: '0.82rem', marginTop: 0 }}>
              Kept in one column the holder can never read back, and never shown to a learner.
              Write what you actually saw.
            </p>
          </div>
        </div>

        <button type="button" className="btn" onClick={submit} disabled={busy || !enabled}>
          {busy ? 'Saving…' : 'Record it'}
        </button>

        {error && <p className="notice error" style={{ marginTop: '0.75rem' }}>{error}</p>}
        {notice && <p className="notice" style={{ marginTop: '0.75rem' }}>{notice}</p>}
      </section>

      <h2>Recorded</h2>
      {grouped.length === 0 ? (
        <p className="empty">Nothing recorded yet.</p>
      ) : (
        grouped.map((group) => (
          <section className="card" key={group.userId} style={{ marginBottom: '1rem' }}>
            <h3 style={{ marginTop: 0 }}>{group.name}</h3>
            <ul style={{ paddingLeft: '1.1rem' }}>
              {group.rows.map((a) => (
                <li key={a.id} style={{ marginBottom: '0.6rem' }}>
                  <span>{authorisationLine(a)}</span>{' '}
                  {a.status === 'withdrawn' ? (
                    <span className="badge neutral">
                      withdrawn {grantedOnSentence(a.withdrawnAt?.slice(0, 10) ?? null) ?? ''}
                    </span>
                  ) : (
                    <span className="badge">recorded</span>
                  )}
                  {a.status === 'withdrawn' && a.withdrawnReason && (
                    <div className="muted" style={{ fontSize: '0.85rem' }}>
                      Reason kept: {a.withdrawnReason}
                    </div>
                  )}
                  {a.status === 'recorded' && withdrawing !== a.id && (
                    <button
                      type="button"
                      className="btn ghost"
                      style={{ marginLeft: '0.5rem' }}
                      onClick={() => {
                        setWithdrawing(a.id);
                        setReason('');
                      }}
                    >
                      Withdraw
                    </button>
                  )}
                  {withdrawing === a.id && (
                    <div style={{ marginTop: '0.4rem' }}>
                      <label htmlFor={`reason-${a.id}`}>Why (kept with the record)</label>
                      <input
                        id={`reason-${a.id}`}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                      />
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem' }}>
                        <button type="button" className="btn" onClick={() => withdraw(a.id)} disabled={busy}>
                          Withdraw it
                        </button>
                        <button
                          type="button"
                          className="btn ghost"
                          onClick={() => setWithdrawing(null)}
                          disabled={busy}
                        >
                          Keep it
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </>
  );
}
