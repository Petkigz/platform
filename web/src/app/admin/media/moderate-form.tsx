'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Hold or withdraw one uploaded master.
 *
 * A reason is required for both, and the wording says why: these are the actions
 * somebody asks about months later, when the person who took them has forgotten
 * and the file is gone from every screen. The database now refuses a withdrawal
 * without one too, so this is not a formality the API would waive.
 */
export function ModerateForm({ assetId }: { assetId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<'info' | 'error'>('info');

  async function act(action: 'quarantine' | 'withdraw') {
    setMessage(null);

    if (reason.trim().length === 0) {
      setTone('error');
      setMessage('Say why in writing. A takedown with no reason cannot be defended later.');
      return;
    }

    const res = await fetch('/api/admin/media', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action, assetId, reason }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };

    if (!res.ok) {
      setTone('error');
      setMessage(json.error ?? 'That was not recorded.');
      return;
    }

    setTone('info');
    setReason('');
    setMessage(
      action === 'quarantine'
        ? 'Quarantined. It stops being servable now, and every rendition derived from it stops with it.'
        : 'Withdrawn. The row is tombstoned and the object survives, because a rights request may have to be matched to it later.',
    );
    startTransition(() => router.refresh());
  }

  return (
    <div style={{ display: 'grid', gap: '0.75rem' }}>
      <div>
        <label className="eyebrow" htmlFor={`reason-${assetId}`}>
          Reason (required for both)
        </label>
        <input
          id={`reason-${assetId}`}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          maxLength={2000}
          placeholder="Rights complaint reference, report number, what was found"
          style={{ width: '100%' }}
        />
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          className="button secondary"
          disabled={pending}
          onClick={() => act('quarantine')}
        >
          Quarantine — hold it for review
        </button>
        <button
          type="button"
          className="button danger"
          disabled={pending}
          onClick={() => act('withdraw')}
        >
          Withdraw — end its use
        </button>
      </div>

      {message && (
        <p className={tone === 'error' ? 'error' : 'muted'} role="status">
          {message}
        </p>
      )}
    </div>
  );
}
