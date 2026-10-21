'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  SHARE_EXPIRY_OPTIONS,
  SHARE_SCOPES,
  SHARE_SCOPE_LABEL,
  SHARE_STATUS_LABEL,
  validateEmailInput,
  validateShareInput,
  type MyShare,
} from '@/lib/sharing';

/**
 * Who can see this adult's learning.
 *
 * The form finds the person before it shares, and shows the name it found, because
 * granting access to an account is not something to do from a text field alone. What it
 * cannot promise is that the name it shows is the person intended: two people can be
 * called the same thing, and this platform has no way to prove which account is whose.
 * That is why the length of the share is offered as well as its scope — a week is a
 * cheaper mistake than forever.
 *
 * Revoking is the whole of the control once granted. There is no editing a share, and
 * that is deliberate: changing the terms means ending it and granting a new one, so the
 * record of what was granted, to whom and when is never rewritten.
 */
export function SharingPanel({
  learnerProfileId,
  shares,
  enabled,
}: {
  learnerProfileId: string | null;
  shares: MyShare[];
  enabled: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [found, setFound] = useState<{ userId: string; displayName: string | null } | null>(null);
  const [scope, setScope] = useState<string>(SHARE_SCOPES[0] ?? 'progress');
  const [days, setDays] = useState<number>(SHARE_EXPIRY_OPTIONS[0]?.days ?? 0);

  async function post(payload: Record<string, unknown>, fallback: string) {
    setBusy(true);
    setError(null);
    setNotice(null);
    const res = await fetch('/api/account/sharing', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = (await res.json().catch(() => null)) as
      | { ok: boolean; message?: string; note?: string | null; account?: unknown }
      | null;
    setBusy(false);

    if (!json?.ok) {
      setError(json?.message ?? fallback);
      return null;
    }
    if (json.note) setNotice(json.note);
    startTransition(() => router.refresh());
    return json;
  }

  async function find() {
    const checked = validateEmailInput({ email });
    if (!checked.ok) {
      setError(checked.message);
      return;
    }
    const reply = await post({ action: 'resolve', email: checked.value },
      'That account could not be looked up.');
    if (!reply) return;

    const account = reply.account as { userId?: string; displayName?: string | null } | null;
    if (!account || typeof account.userId !== 'string') {
      setFound(null);
      setNotice('No account has that email address, so there is nobody to share with.');
      return;
    }
    setFound({ userId: account.userId, displayName: account.displayName ?? null });
  }

  async function grant() {
    if (!learnerProfileId) return;
    const checked = validateShareInput({ granteeUserId: found?.userId ?? '', scope, days });
    if (!checked.ok) {
      setError(checked.message);
      return;
    }
    const reply = await post({
      action: 'share',
      learnerProfileId,
      granteeUserId: checked.value.granteeUserId,
      scope: checked.value.scope,
      days,
    }, 'That share could not be granted.');
    if (reply) {
      setFound(null);
      setEmail('');
    }
  }

  async function end(shareId: string) {
    await post({ action: 'revoke', shareId }, 'That share could not be ended.');
  }

  if (!enabled) {
    return (
      <div className="notice warn">
        Sharing your learning with somebody is not enabled on this platform yet. Nothing
        here can be granted while <code>family.adult_shares</code> is off, and the
        database refuses the attempt as well as the form.
      </div>
    );
  }

  if (!learnerProfileId) {
    return (
      <div className="notice">
        You have no learner profile yet, so there is nothing to share. You get one when
        you enrol in your first course.
      </div>
    );
  }

  const live = shares.filter((s) => s.status === 'active');

  return (
    <div className="stack">
      <div className="card">
        <div className="outline-h" style={{ marginTop: 0 }}>
          <h3 style={{ margin: 0 }}>Who can see my learning</h3>
          <span className={`badge ${live.length > 0 ? 'warn' : 'ok'}`}>{live.length} live</span>
        </div>

        <p className="meta" style={{ marginTop: '0.25rem' }}>
          Your learning is private by default, including to your family. A share is
          something you grant to one account, for one of these scopes, and you can end
          it at any time.
        </p>

        {shares.length === 0 ? (
          <p className="empty">Nobody can see your learning.</p>
        ) : (
          <ul className="lessons">
            {shares.map((s) => (
              <li key={s.shareId}>
                <span>
                  {s.granteeName ?? 'Somebody'} · {SHARE_SCOPE_LABEL[s.scope]}
                  {s.grantedAt ? ` · granted ${new Date(s.grantedAt).toLocaleDateString()}` : ''}
                  {s.expiresAt ? ` · until ${new Date(s.expiresAt).toLocaleDateString()}` : ' · no end date'}
                  {s.revokedAt ? ` · ended ${new Date(s.revokedAt).toLocaleDateString()}` : ''}
                </span>
                <span className={`badge ${s.status === 'active' ? 'warn' : 'neutral'}`}>
                  {SHARE_STATUS_LABEL[s.status]}
                </span>
                {s.status === 'active' && (
                  <button type="button" className="btn tiny ghost" disabled={busy}
                    onClick={() => end(s.shareId)}>
                    End it
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card">
        <div className="outline-h" style={{ marginTop: 0 }}>
          <h3 style={{ margin: 0 }}>Share with somebody</h3>
        </div>

        <div className="stack" style={{ marginTop: '0.5rem' }}>
          <div className="row" style={{ flexWrap: 'wrap' }}>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setFound(null); }}
              placeholder="Their account email address"
              aria-label="Their account email address"
              maxLength={320}
            />
            <button type="button" className="btn secondary" disabled={busy} onClick={find}>
              {busy ? 'Looking…' : 'Find them'}
            </button>
          </div>

          {found && (
            <p className="meta" style={{ marginTop: 0 }}>
              Sharing with <strong>{found.displayName ?? 'that account'}</strong>. Check
              this is the right person: the name is whatever they set, and this platform
              cannot prove which account is whose.
            </p>
          )}

          <div className="row" style={{ flexWrap: 'wrap' }}>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              aria-label="What they may see"
            >
              {SHARE_SCOPES.map((s) => (
                <option key={s} value={s}>{SHARE_SCOPE_LABEL[s]}</option>
              ))}
            </select>
            <select
              value={String(days)}
              onChange={(e) => setDays(Number(e.target.value))}
              aria-label="How long for"
            >
              {SHARE_EXPIRY_OPTIONS.map((option) => (
                <option key={option.days} value={String(option.days)}>{option.label}</option>
              ))}
            </select>
            <button type="button" className="btn" disabled={busy || !found} onClick={grant}>
              {busy ? 'Sharing…' : 'Share it'}
            </button>
          </div>

          <p className="meta">
            Ending a share and granting a new one is how the terms change. A share is
            never edited, so the record of what was granted, to whom and when stays
            true.
          </p>
        </div>
      </div>

      {error && <p className="danger" style={{ fontSize: '0.9rem' }} role="alert">{error}</p>}
      {notice && <p className="muted" style={{ fontSize: '0.9rem' }}>{notice}</p>}
    </div>
  );
}
