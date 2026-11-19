'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { shareDoneOf, shareOutcomeOf, type ShareCode } from '@/lib/sharing-outcome';

/** Everything this button says, in the language of the page that draws it. */
export type AcceptWords = {
  accept: string;
  accepting: string;
  /** What is said for each refusal accepting can be answered with. */
  errors: Record<
    'signed_out' | 'off' | 'link' | 'no_invitation' | 'used' | 'withdrawn' | 'expired' | 'other_address' | 'have_it' | 'refused',
    string
  >;
  /** Something was asked for and no answer came back. */
  unconfirmed: string;
};

/**
 * Accepting an invitation, once.
 *
 * The token goes to the server and the server decides. This component has no
 * opinion about who is signed in or whether the link is theirs.
 *
 * **It has no words of its own.** What the route answers is read as a name
 * (`lib/sharing-outcome.ts`) and said in the sentence the page handed over
 * for it. Nothing the database wrote is shown.
 *
 * **An answer that never came is unknown.** The share may have been made, so
 * a request that failed on the way, or a reply nobody can read, is not said
 * as "not accepted": the reader is asked to reload and see.
 *
 * When it works the person is sent to their sharing page rather than told
 * "done", because that page is where the thing they just accepted is visible.
 */
export function AcceptInvitationForm({ token, words }: { token: string; words: AcceptWords }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const said = (code: ShareCode): string => {
    if (code === 'failed') return words.unconfirmed;
    if (
      code === 'signed_out' ||
      code === 'off' ||
      code === 'link' ||
      code === 'no_invitation' ||
      code === 'used' ||
      code === 'withdrawn' ||
      code === 'expired' ||
      code === 'other_address' ||
      code === 'have_it'
    ) {
      return words.errors[code];
    }
    return words.errors.refused;
  };

  async function accept() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/account/sharing', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'accept', token }),
      });
      const result: unknown = await response.json().catch(() => null);
      const finished = response.ok ? shareDoneOf(result) : null;
      if (finished?.did !== 'accepted') {
        setBusy(false);
        setError(said(response.ok ? 'failed' : shareOutcomeOf(response.status, result)));
        return;
      }
      startTransition(() => {
        router.push('/account/sharing');
        router.refresh();
      });
    } catch {
      setBusy(false);
      setError(words.unconfirmed);
    }
  }

  return (
    <div style={{ maxWidth: '42rem' }}>
      <div className="page-actions">
        <button type="button" className="btn" disabled={busy} onClick={accept}>
          {busy ? words.accepting : words.accept}
        </button>
      </div>
      {error && (
        <p className="notice error" role="alert" style={{ marginTop: '0.75rem' }}>
          {error}
        </p>
      )}
    </div>
  );
}
