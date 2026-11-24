'use client';

import { useState } from 'react';

import { Say } from '@/components/say';
import { claimOutcomeOf, type ClaimLearner, type ClaimOutcome } from '@/lib/seat-claim';
import { formatSeatCode } from '@/lib/seats';

/** What the form says, already in the reader's language. */
export type ClaimWords = {
  codeLabel: string;
  codeHelp: string;
  who: string;
  whoNote: string;
  choose: string;
  me: string;
  /** `{name} (child)` */
  child: string;
  forMe: string;
  submit: string;
  working: string;
  /** `… This course was added: {title}` */
  done: string;
  doneNoTitle: string;
  doneWhere: string;
  learning: string;
  another: string;
  reasons: Record<ClaimOutcome, string>;
};

/** The value of "myself" in the list. No learner's id is this. */
const MYSELF = 'self';

/**
 * The form a parent fills in from a school letter.
 *
 * **It reforms as you type.** `abcde fghjk` becomes `ABCDE-FGHJK` in the field,
 * because the code is copied off paper by somebody who has never seen one before
 * and the shape is the only hint that it went in right.
 *
 * **Nobody is chosen for the reader.** An account with a child on it is asked
 * who the course is for, and the button waits for an answer: a code works once,
 * and the first name in a list is not a decision. An account with nobody else
 * on it is told the course will be added for them, and is asked nothing.
 *
 * **It does not clear the field on a refusal.** Nine refusals in ten are "check
 * the code", and wiping what the person typed makes them start again from a
 * letter they are holding in their hand.
 *
 * **A refusal is a name.** The route answers `{ ok: false, code }` with that
 * name's own status, and `words.reasons` has the sentence. A name that arrives
 * with another status, or no name, or no answer at all after the request left,
 * is `unconfirmed`: the form says it does not know whether the code was used
 * and where to look, because the code may be spent.
 */
export function ClaimForm({ learners, words }: { learners: ClaimLearner[]; words: ClaimWords }) {
  const [code, setCode] = useState('');
  const [who, setWho] = useState(learners.length === 0 ? MYSELF : '');
  const [busy, setBusy] = useState(false);
  const [tone, setTone] = useState<'warn' | 'error'>('error');
  const [message, setMessage] = useState<string | null>(null);
  const [done, setDone] = useState<{ title: string | null } | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || who === '' || code.length < 11) return;
    setBusy(true);
    setMessage(null);

    let res: Response;
    try {
      res = await fetch('/api/institution/claim', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code, learnerProfileId: who === MYSELF ? null : who }),
      });
    } catch {
      // The request may have left before the connection dropped, so this is
      // not "nothing was used".
      setTone('warn');
      setMessage(words.reasons.unconfirmed);
      setBusy(false);
      return;
    }
    const json = (await res.json().catch(() => null)) as { ok?: unknown; code?: unknown; courseTitle?: unknown } | null;
    setBusy(false);

    if (res.ok && json?.ok === true) {
      setDone({ title: typeof json.courseTitle === 'string' && json.courseTitle !== '' ? json.courseTitle : null });
      setCode('');
      return;
    }
    const named = res.ok ? 'unconfirmed' : claimOutcomeOf(res.status, json?.code);
    setTone(named === 'refused' ? 'error' : 'warn');
    setMessage(words.reasons[named]);
  }

  if (done) {
    return (
      <div className="claim-done" data-claim-state="done">
        <p className="notice" role="status">
          <strong>
            {done.title ? <Say text={words.done} parts={{ title: <bdi>{done.title}</bdi> }} /> : words.doneNoTitle}
          </strong>
        </p>
        <p>
          {words.doneWhere} <a href="/learn">{words.learning}</a>
        </p>
        <button
          type="button"
          className="btn secondary"
          data-claim-another
          onClick={() => {
            setDone(null);
            setMessage(null);
            if (learners.length > 0) setWho('');
          }}
        >
          {words.another}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="claim-form" data-claim-state="form" noValidate>
      <label htmlFor="seat-code">{words.codeLabel}</label>
      <input
        id="seat-code"
        name="code"
        className="claim-code"
        value={code}
        onChange={(event) => setCode(formatSeatCode(event.target.value).slice(0, 11))}
        autoComplete="off"
        spellCheck={false}
        autoCapitalize="characters"
        placeholder="ABCDE-FGHJK"
        aria-describedby="seat-code-help"
        dir="ltr"
        lang="en"
        required
      />
      <p className="muted claim-help" id="seat-code-help">
        {words.codeHelp}
      </p>

      {learners.length > 0 ? (
        <>
          <label htmlFor="seat-learner">{words.who}</label>
          <select
            id="seat-learner"
            value={who}
            onChange={(event) => {
              setWho(event.target.value);
              setMessage(null);
            }}
            aria-describedby="seat-learner-help"
            disabled={busy}
          >
            <option value="">{words.choose}</option>
            <option value={MYSELF}>{words.me}</option>
            {learners.map((learner) => (
              <option key={learner.id} value={learner.id}>
                {learner.child ? words.child.replace('{name}', `\u2068${learner.name}\u2069`) : learner.name}
              </option>
            ))}
          </select>
          <p className="muted claim-help" id="seat-learner-help">
            {words.whoNote}
          </p>
        </>
      ) : (
        <p className="muted claim-help" data-claim-for="me">
          {words.forMe}
        </p>
      )}

      {message ? (
        <div className={`notice ${tone}`} role={tone === 'error' ? 'alert' : 'status'} data-claim-refusal>
          {message}
        </div>
      ) : null}

      <button
        type="submit"
        className="btn"
        disabled={busy || who === '' || code.length < 11}
        aria-busy={busy}
        data-claim-button
      >
        {busy ? words.working : words.submit}
      </button>
    </form>
  );
}
