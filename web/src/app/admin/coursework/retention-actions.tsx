'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import {
  actionConfirmation,
  postRetentionAction,
  type RetentionAction,
} from '@/lib/coursework-retention';

/**
 * The three things a person does to a handed-in file's clock.
 *
 * All three go through the same writer, and none of them takes an actor: the
 * database reads the session, so the audit row names who really did it. A release
 * needs a reason as well as a hold, because the next person to read the register
 * needs to know why it stopped — "released" with no sentence is a hole where an
 * explanation should be.
 */
export function RetentionActionForm({
  assetId,
  action,
  label,
  name,
}: {
  assetId: string;
  action: RetentionAction;
  label: string;
  name: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<'info' | 'error'>('info');

  const needsReason = action !== 'purge';

  async function submit() {
    if (needsReason && reason.trim().length < 3) {
      setTone('error');
      setMessage(
        action === 'hold'
          ? 'Say why this file is being kept past its date. A hold with no words is a file nobody can release.'
          : 'Say why the hold is being lifted. The next reader is the person deciding whether it comes back.',
      );
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      const result = await postRetentionAction({ action, assetId, reason });
      if (!result.ok) {
        setTone('error');
        setMessage(result.message);
        return;
      }
      setTone('info');
      setMessage(actionConfirmation(action, name));
      setReason('');
      setOpen(false);
      startTransition(() => router.refresh());
    } finally {
      setBusy(false);
    }
  }

  if (!open && !message) {
    return (
      <button type="button" className="btn ghost" onClick={() => setOpen(true)}>
        {label}
      </button>
    );
  }

  return (
    <div>
      {needsReason && !message && (
        <>
          <label className="eyebrow" htmlFor={`reason-${assetId}-${action}`}>
            Why
          </label>
          <textarea
            id={`reason-${assetId}-${action}`}
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={
              action === 'hold'
                ? 'A safeguarding concern is open about this file.'
                : 'The concern is closed and the record can go.'
            }
          />
        </>
      )}
      {!message && (
        <div className="row" style={{ marginTop: '0.5rem' }}>
          <button type="button" className="btn" onClick={submit}
                  disabled={busy || pending}>
            {busy ? 'Working…' : label}
          </button>
          <button type="button" className="btn ghost" onClick={() => setOpen(false)}
                  disabled={busy}>
            Cancel
          </button>
        </div>
      )}
      {message && (
        <p className={tone === 'error' ? 'notice error' : 'muted'} role="status"
           style={{ marginTop: '0.5rem' }}>
          {message}
        </p>
      )}
    </div>
  );
}
