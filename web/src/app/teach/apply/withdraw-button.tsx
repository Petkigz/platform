'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { applyOutcomeOf, type ApplyOutcome } from '@/lib/teaching-outcome';

/** What the button says, already in the reader's language. */
export type WithdrawWords = {
  label: string;
  working: string;
  /** The request could not be made at all. */
  unreachable: string;
  reasons: Record<ApplyOutcome, string>;
};

/**
 * Taking an application back.
 *
 * One button and no form: withdrawing is not a decision anybody needs to
 * explain, and asking for a reason would be asking the applicant to justify
 * changing their mind. The page says so above it.
 *
 * **A refusal is a name.** The route answers `{ ok: false, code }` with that
 * name's own status, and `words.reasons` has the sentence. A name that arrives
 * with another status, or no name, is `unconfirmed`: the button says it does
 * not know, and the page is read again so the reader can see.
 */
export function WithdrawApplication({ words }: { words: WithdrawWords }) {
  const router = useRouter();
  const asking = useRef(false);
  const [busy, setBusy] = useState(false);
  const [tone, setTone] = useState<'warn' | 'error'>('error');
  const [message, setMessage] = useState<string | null>(null);

  async function withdraw() {
    // Two presses in one moment are one request.
    if (asking.current) return;
    asking.current = true;
    setBusy(true);
    setMessage(null);

    let res: Response;
    try {
      res = await fetch('/api/teaching/apply', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'withdraw' }),
      });
    } catch {
      setTone('warn');
      setMessage(words.unreachable);
      asking.current = false;
      setBusy(false);
      return;
    }
    const json = (await res.json().catch(() => null)) as { ok?: unknown; code?: unknown } | null;
    asking.current = false;
    setBusy(false);

    if (res.ok && json?.ok === true) {
      // The page draws the form again now.
      router.refresh();
      return;
    }
    const named = res.ok ? 'unconfirmed' : applyOutcomeOf(res.status, json?.code);
    setTone(named === 'refused' || named === 'unconfirmed' ? 'warn' : 'error');
    setMessage(words.reasons[named]);
    // It may have been answered while this page was open: read it again.
    if (named === 'nothing_to_withdraw' || named === 'unconfirmed') router.refresh();
  }

  return (
    <div className="tapply-ask" data-tapply-ask="withdraw">
      <button
        type="button"
        className="btn secondary"
        onClick={withdraw}
        disabled={busy}
        aria-busy={busy}
        data-tapply-button="withdraw"
      >
        {busy ? words.working : words.label}
      </button>
      {message ? (
        <div className={`notice ${tone}`} role={tone === 'error' ? 'alert' : 'status'} data-tapply-refusal>
          {message}
        </div>
      ) : null}
    </div>
  );
}
