'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { membershipOutcomeOf, type MembershipOutcome } from '@/lib/institution-outcome';

/** What one of the two buttons says, already in the reader's language. */
export type MembershipWords = {
  label: string;
  working: string;
  /** The request could not be made at all. */
  unreachable: string;
  reasons: Record<MembershipOutcome, string>;
};

/**
 * Joining and leaving: one button each, and a sentence when it is refused.
 *
 * No confirmation step, because the database decides both: `join_institution()`
 * reads the verified domain and refuses if there is none, and
 * `leave_institution()` refuses the only administrator. The page has already
 * said what each button does, in the reader's language, before it is pressed.
 *
 * **A refusal is a name.** The route answers `{ ok: false, code }` with that
 * name's own status, and `words.reasons` has the sentence. A name that arrives
 * with another status, or no name, is `unconfirmed`: the button says it does
 * not know, and the page is read again so the reader can see.
 */
function MembershipButton({
  action,
  secondary,
  words,
}: {
  action: 'join' | 'leave';
  secondary: boolean;
  words: MembershipWords;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [tone, setTone] = useState<'warn' | 'error'>('error');
  const [message, setMessage] = useState<string | null>(null);

  async function ask() {
    if (busy) return;
    setBusy(true);
    setMessage(null);

    let res: Response;
    try {
      res = await fetch('/api/institution', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action }),
      });
    } catch {
      setTone('warn');
      setMessage(words.unreachable);
      setBusy(false);
      return;
    }
    const json = (await res.json().catch(() => null)) as { ok?: unknown; code?: unknown } | null;
    setBusy(false);

    if (res.ok && json?.ok === true) {
      // The page draws the other half of the relationship now.
      router.refresh();
      return;
    }
    const named = res.ok ? 'unconfirmed' : membershipOutcomeOf(res.status, json?.code);
    setTone(named === 'refused' || named === 'unconfirmed' ? 'warn' : 'error');
    setMessage(words.reasons[named]);
    // The page may be behind what the database holds: read it again.
    if (named === 'already_joined' || named === 'not_a_member' || named === 'unconfirmed') router.refresh();
  }

  return (
    <div className="inst-ask" data-inst-ask={action}>
      <button
        type="button"
        className={secondary ? 'btn secondary' : 'btn'}
        onClick={ask}
        disabled={busy}
        aria-busy={busy}
        data-inst-button={action}
      >
        {busy ? words.working : words.label}
      </button>
      {message ? (
        <div className={`notice ${tone}`} role={tone === 'error' ? 'alert' : 'status'} data-inst-refusal>
          {message}
        </div>
      ) : null}
    </div>
  );
}

export function JoinInstitution({ words }: { words: MembershipWords }) {
  return <MembershipButton action="join" secondary={false} words={words} />;
}

export function LeaveInstitution({ words }: { words: MembershipWords }) {
  return <MembershipButton action="leave" secondary words={words} />;
}
