'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  INVITE_EXPIRY_OPTIONS,
  SHARE_SCOPES,
  SHARE_SCOPE_LABEL,
  SHARE_STATUS_LABEL,
  validateInviteInput,
  type MyShare,
} from '@/lib/sharing';

/**
 * Who can see this adult's learning.
 *
 * The form asks for an address and then invites it. It does not look the address up
 * first, because a lookup that says "no account found" tells whoever asked that the
 * address is not registered here — and that is a fact about a stranger, not a feature.
 * The invitation is created either way and the reply is the same either way, so there
 * is nothing on this screen to compare.
 *
 * An invitation is a link in a mailbox, so it always has an end: a week, a month or
 * three months. The person who receives it signs in as that address, accepts once, and
 * from then on the share appears on both sides of this page — theirs to read, yours to
 * end. Ending it is the whole of the control afterwards, because changing the terms
 * means ending a share and granting a new one, and the record of who saw what and when
 * is never rewritten.
 */
export function SharingPanel({
  shares,
  enabled,
  emailEnabled,
}: {
  shares: MyShare[];
  enabled: boolean;
  emailEnabled: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [scope, setScope] = useState<string>(SHARE_SCOPES[0] ?? 'progress');
  const [days, setDays] = useState<number>(INVITE_EXPIRY_OPTIONS[0]?.days ?? 7);

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
      | { ok: boolean; message?: string; expiresAt?: string | null }
      | null;
    setBusy(false);

    if (!json?.ok) {
      setError(json?.message ?? fallback);
      return null;
    }
    startTransition(() => router.refresh());
    return json;
  }

  async function invite() {
    const checked = validateInviteInput({ email, scope, days });
    if (!checked.ok) {
      setError(checked.message);
      return;
    }
    const reply = await post({
      action: 'invite',
      email: checked.value.email,
      scope: checked.value.scope,
      days: checked.value.days,
    }, 'That invitation could not be sent.');
    if (reply) {
      // Never "we found them" or "we did not": the answer is the same for both.
      setNotice(
        `Invitation recorded for ${checked.value.email}`
        + (reply.expiresAt
          ? `, open until ${new Date(reply.expiresAt).toLocaleDateString()}.`
          : '.')
        + ' Whoever signs in as that address can accept it once.',
      );
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
          <h3 style={{ margin: 0 }}>Invite somebody</h3>
        </div>

        <p className="meta" style={{ marginTop: '0.25rem' }}>
          Enter their email address and they get a link to accept. They do not have to
          have an account already: if they do, they sign in; if they do not, they make
          one and the same link works. Nothing is shared until they accept, and you can
          end it here at any time.
        </p>

        <div className="stack" style={{ marginTop: '0.5rem' }}>
          <div className="row" style={{ flexWrap: 'wrap' }}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Their email address"
              aria-label="Their email address"
              maxLength={320}
            />
            <button type="button" className="btn" disabled={busy} onClick={invite}>
              {busy ? 'Inviting…' : 'Invite them'}
            </button>
          </div>

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
              aria-label="How long the invitation stays open"
            >
              {INVITE_EXPIRY_OPTIONS.map((option) => (
                <option key={option.days} value={String(option.days)}>{option.label}</option>
              ))}
            </select>
          </div>

          <p className="meta">
            The length above is how long the link stays open, and also how long the share
            lasts once accepted — so a week is a cheaper mistake than three months. When
            it runs out, invite them again.
          </p>

          {!emailEnabled && (
            <p className="meta">
              Email delivery is switched off, so nothing is emailed yet: the invitation is
              recorded and waits in the outbox until it is on. The link works as soon as
              it reaches them.
            </p>
          )}

          <p className="meta">
            An invitation is never answered with whether that address has an account.
            Every address gets the same reply, which is why nothing here says
            &ldquo;found&rdquo; or &ldquo;not found&rdquo;.
          </p>
        </div>
      </div>

      {error && <p className="danger" style={{ fontSize: '0.9rem' }} role="alert">{error}</p>}
      {notice && <p className="muted" style={{ fontSize: '0.9rem' }}>{notice}</p>}
    </div>
  );
}
