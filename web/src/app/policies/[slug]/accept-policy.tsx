'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { Say } from '@/components/say';
import { formatDateTime } from '@/lib/i18n/format';
import { AGREED_EVENT } from '@/lib/policy-notice';
import { policyOutcomeOf, type PolicyOutcome } from '@/lib/policy-outcome';

/**
 * The words this button says. Chosen on the server, in the reader's
 * language: a script sent to a browser holds no catalogue.
 */
export type AcceptWords = {
  note: string;
  agree: string;
  working: string;
  /** With `{date}` in it: when this reader agreed. */
  agreed: string;
  /** The agreement was recorded for a newer version than the page showed. */
  agreedNewer: string;
  /** The request could not be made at all. */
  unreachable: string;
  reasons: Record<PolicyOutcome, string>;
};

/**
 * The agreement button.
 *
 * **It asks `/api/policies`, with the version the page showed.** It used to
 * call `accept_policy()` from the browser by slug alone, so somebody who
 * left the page open while a new version was published agreed to a text they
 * had not been shown. The writer now refuses that itself and the route
 * answers `changed`; this button reads the page again so the new text is in
 * front of them. That is the one time a new version reaches an open page:
 * because its reader pressed the button under the old one.
 *
 * **What it says after a refusal is this page's sentence for its name.** The
 * old button printed the database's own text when it did not recognise it.
 * A reason is believed only when it arrives with its own status
 * (`policyOutcomeOf`); anything else is "we could not confirm".
 *
 * **Agreed is said here, with the time**, and stays said when the page is
 * read again: the same component is drawn, now with the time the server
 * read. A second press that the writer answered with the first time is a
 * success like any other.
 *
 * The time is printed in UTC and says so, as the server prints it, so it
 * does not change when the page is read again.
 */
export function AcceptPolicy({
  slug,
  version,
  agreedAt,
  locale,
  words,
}: {
  slug: string;
  /** The version number the page is showing. */
  version: number;
  /** When this reader agreed to that version, already said in their language. Null when they have not, or when that was not read. */
  agreedAt: string | null;
  locale: string;
  words: AcceptWords;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [tone, setTone] = useState<'warn' | 'error'>('error');
  const [message, setMessage] = useState<string | null>(null);
  /** What this button was told when it asked: the time, for which version, and which one the page showed then. */
  const [told, setTold] = useState<{ at: string; version: number; shown: number } | null>(null);

  async function agree() {
    if (busy) return;
    setBusy(true);
    setMessage(null);

    let res: Response;
    try {
      res = await fetch('/api/policies', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ slug, version }),
      });
    } catch {
      setTone('warn');
      setMessage(words.unreachable);
      setBusy(false);
      return;
    }
    const json = (await res.json().catch(() => null)) as {
      ok?: unknown;
      reason?: unknown;
      version?: unknown;
      acceptedAt?: unknown;
    } | null;
    setBusy(false);

    if (res.ok && json?.ok === true && typeof json.version === 'number' && typeof json.acceptedAt === 'string') {
      setTold({ at: formatDateTime(locale, json.acceptedAt, 'UTC'), version: json.version, shown: version });
      // The notice under the page stops telling about a document that has
      // just been agreed to.
      window.dispatchEvent(new CustomEvent(AGREED_EVENT, { detail: slug }));
      router.refresh();
      return;
    }
    const named = res.ok ? 'unconfirmed' : policyOutcomeOf(res.status, json?.reason);
    setTone(named === 'refused' || named === 'unconfirmed' ? 'warn' : 'error');
    setMessage(words.reasons[named]);
    // The page may be behind what the database holds: read it again.
    if (named === 'changed' || named === 'not_in_force' || named === 'not_found' || named === 'unconfirmed') {
      router.refresh();
    }
  }

  // Recorded for a version this page was not showing when the button was
  // pressed. The writer compares the two and the route does not pass on an
  // answer for another version, so this is not expected to be drawn. It is
  // kept so that if either stops, the reader is told rather than not.
  const newer = told !== null && told.version !== told.shown;
  const when = agreedAt ?? told?.at ?? null;

  return (
    <div className="policy-accept" data-policy-accept={when ? 'agreed' : 'asked'}>
      {when ? (
        <p className="policy-agreed" role="status">
          <Say text={words.agreed} parts={{ date: <bdi>{when}</bdi> }} />
        </p>
      ) : (
        <>
          <p className="muted">{words.note}</p>
          <button type="button" className="btn" onClick={agree} disabled={busy} aria-busy={busy} data-policy-agree-button>
            {busy ? words.working : words.agree}
          </button>
        </>
      )}
      {newer ? (
        <div className="notice warn" role="alert" data-policy-newer>
          {words.agreedNewer}
        </div>
      ) : null}
      {message ? (
        <div className={`notice ${tone}`} role={tone === 'error' ? 'alert' : 'status'} data-policy-refusal>
          {message}
        </div>
      ) : null}
    </div>
  );
}
