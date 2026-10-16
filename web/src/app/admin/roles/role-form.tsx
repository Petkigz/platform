'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { RoleRow } from '@/lib/roles';

/**
 * Grant or revoke one person's role.
 *
 * The reason field is not optional decoration. Granting a privileged role and
 * revoking any role both require one, and it lands on the audit trail — which
 * is the only record of who decided that this person could administer the
 * platform.
 */
export function RoleForm({
  userId,
  userName,
  roles,
  held,
}: {
  userId: string;
  userName: string;
  roles: RoleRow[];
  held: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [roleCode, setRoleCode] = useState<string>(roles[0]?.code ?? '');
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selected = roles.find((r) => r.code === roleCode);
  const alreadyHeld = held.includes(roleCode);
  const action = alreadyHeld ? 'revoke' : 'assign';
  const needsReason = alreadyHeld || Boolean(selected?.is_privileged);

  async function submit() {
    setMessage(null);
    setError(null);

    if (needsReason && reason.trim().length === 0) {
      setError(
        alreadyHeld
          ? 'Taking a role away needs a written reason.'
          : 'Granting a privileged role needs a written reason.',
      );
      return;
    }

    const res = await fetch('/api/admin/roles', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action, userId, roleCode, reason: reason || undefined }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };

    if (!res.ok) {
      setError(json.error ?? 'Could not change that role.');
      return;
    }

    setMessage(alreadyHeld ? 'Role revoked.' : 'Role granted.');
    setReason('');
    startTransition(() => router.refresh());
  }

  return (
    <div className="card" style={{ display: 'grid', gap: '0.5rem' }}>
      <p className="eyebrow" style={{ margin: 0 }}>
        {userName}
      </p>
      {held.length > 0 && (
        <p className="muted" style={{ margin: 0 }}>
          Holds: {held.join(', ')}
        </p>
      )}

      <label className="eyebrow" htmlFor={`role-${userId}`}>
        Role
      </label>
      <select
        id={`role-${userId}`}
        value={roleCode}
        onChange={(e) => setRoleCode(e.target.value)}
      >
        {roles.map((r) => (
          <option key={r.code} value={r.code}>
            {r.name}
            {r.is_privileged ? ' (privileged)' : ''}
            {held.includes(r.code) ? ' — held' : ''}
          </option>
        ))}
      </select>

      {selected?.description && (
        <p className="muted" style={{ margin: 0 }}>
          {selected.description}
        </p>
      )}

      <label className="eyebrow" htmlFor={`reason-${userId}`}>
        Reason{needsReason ? ' (required)' : ''}
      </label>
      <textarea
        id={`reason-${userId}`}
        rows={2}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder={
          alreadyHeld
            ? 'Why is this being taken away?'
            : selected?.is_privileged
              ? 'Why does this person need administrative power?'
              : 'Optional'
        }
      />

      <div>
        <button
          type="button"
          className={alreadyHeld ? 'btn ghost' : 'btn'}
          disabled={pending || (needsReason && reason.trim().length === 0)}
          onClick={submit}
        >
          {pending
            ? 'Saving…'
            : alreadyHeld
              ? 'Revoke this role'
              : 'Grant this role'}
        </button>
      </div>

      {message && <div className="notice info" role="status">{message}</div>}
      {error && <div className="notice error" role="alert">{error}</div>}
    </div>
  );
}
