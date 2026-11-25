'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  HANDOVER_DECLARATION,
  confirmSentence,
  describeOutcome,
  requestHandover,
  type HandoverDecision,
  type HandoverWords,
} from '@/lib/handover';
import { formatDay } from '@/lib/i18n/format';

const DECISIONS: readonly HandoverDecision[] = ['keep', 'delete'];

/**
 * Two decisions, one statement, and no third option.
 *
 * The confirmation is deliberately not a modal: the sentence a person is agreeing
 * to sits above the button, in the same words the database will store, because a
 * record that says "they confirmed" while the screen said something else is how a
 * consent becomes a document nobody can rely on.
 *
 * **The words are handed in** by the page, in the reader's language
 * (`HandoverWords`), so this file carries one sentence of its own: the
 * statement that is ticked. That one is English on every page and is marked
 * `lang="en"`, with a line under it, in the reader's language, saying why.
 * A refusal arrives as a name and is said from the same words.
 */
export function HandoverForm({
  learnerId,
  learnerName,
  hasOwnAccount,
  code,
  words,
}: {
  learnerId: string;
  learnerName: string;
  hasOwnAccount: boolean;
  /** The language the words are in: the date a record goes is written in it. */
  code: string;
  words: HandoverWords;
}) {
  const router = useRouter();
  const [decision, setDecision] = useState<HandoverDecision | null>(null);
  const [declared, setDeclared] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<'info' | 'error'>('info');
  const [done, setDone] = useState(false);

  async function submit() {
    if (!decision) return;
    setBusy(true);
    setMessage(null);
    try {
      const result = await requestHandover({
        learnerId,
        decision,
        declaresAdult: declared,
      });
      if (!result.ok) {
        setTone('error');
        setMessage(words.refusals[result.code]);
        return;
      }
      setTone('info');
      setDone(true);
      setMessage(describeOutcome(result.outcome, words, (value) => formatDay(code, value)));
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <p className="notice info" role="status">
        {message}
      </p>
    );
  }

  return (
    <div style={{ marginTop: '0.75rem' }}>
      {DECISIONS.map((value) => (
        <label
          key={value}
          className="card"
          style={{ display: 'block', padding: '0.9rem 1rem', marginBlockEnd: '0.6rem', cursor: 'pointer' }}
        >
          <span style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
            <input
              type="radio"
              name={`handover-${learnerId}`}
              value={value}
              checked={decision === value}
              onChange={() => { setDecision(value); setMessage(null); }}
            />
            <span>
              <strong>{value === 'keep' ? words.keep : words.drop}</strong>
              <br />
              <span className="muted">{value === 'keep' ? words.keepMeans : words.dropMeans}</span>
            </span>
          </span>
          {value === 'keep' && !hasOwnAccount && (
            <span className="muted" style={{ display: 'block', marginBlockStart: '0.4rem' }}>
              {words.keepRefused}
            </span>
          )}
        </label>
      ))}

      {decision && (
        <>
          <label style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', marginBlock: '0.75rem' }}>
            <input
              type="checkbox"
              checked={declared}
              onChange={(e) => setDeclared(e.target.checked)}
            />
            <span lang="en" dir="ltr">{HANDOVER_DECLARATION}</span>
          </label>
          {words.declarationNote && (
            <p className="muted" style={{ fontSize: '0.9rem' }}>{words.declarationNote}</p>
          )}

          <p className="muted" style={{ fontSize: '0.9rem' }}>
            {confirmSentence(decision, learnerName, words)}
          </p>

          <div className="row">
            <button
              type="button"
              className="btn"
              onClick={submit}
              disabled={busy || !declared}
            >
              {busy ? words.working : decision === 'keep' ? words.doKeep : words.doDrop}
            </button>
          </div>
        </>
      )}

      {message && (
        <div className={tone === 'error' ? 'notice error' : 'notice info'} role="alert"
             style={{ marginBlockStart: '0.75rem' }}>
          {message}
        </div>
      )}
    </div>
  );
}
