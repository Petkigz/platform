'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  METHODS,
  RELATIONSHIPS,
  STATEMENT_MIN,
  guardianOutcomeOf,
  type ConsentFormWords,
  type Method,
  type Relationship,
} from '@/lib/guardian-outcome';

type ChildOption = { id: string; name: string; state?: string };

/**
 * Ask for consent, or renew one that has lapsed.
 *
 * The statement is a required field with a required length, and the copy says
 * who reads it. That is not decoration: the statement is what the reviewer's
 * judgement rests on, because the evidence reference is write-only by design.
 *
 * **The words are handed in** by the page, in the reader's language
 * (`ConsentFormWords`): this file carries no sentence of its own. A refusal
 * arrives as a name and is said from the same words; a reply that names
 * nothing is said as "we could not confirm", because the request may have
 * been recorded.
 */
export function ConsentForm({ options, words }: { options: ChildOption[]; words: ConsentFormWords }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [learnerId, setLearnerId] = useState(options[0]?.id ?? '');
  const [relationship, setRelationship] = useState<Relationship>('parent');
  const [method, setMethod] = useState<Method>('video_call');
  const [statement, setStatement] = useState('');
  const [evidence, setEvidence] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<'info' | 'error'>('info');

  if (options.length === 0) {
    return null;
  }

  async function submit() {
    setMessage(null);
    if (!learnerId) {
      setTone('error');
      setMessage(words.refusals.choose_child);
      return;
    }
    if (statement.trim().length < STATEMENT_MIN) {
      setTone('error');
      setMessage(words.refusals.statement_short);
      return;
    }

    let res: Response;
    try {
      res = await fetch('/api/family/guardians', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          learnerProfileId: learnerId,
          relationshipType: relationship,
          method,
          statement,
          evidenceReference: evidence || undefined,
        }),
      });
    } catch {
      // The reply was lost; the request may not have been.
      setTone('error');
      setMessage(words.refusals.unconfirmed);
      return;
    }
    const json = (await res.json().catch(() => ({}))) as { ok?: unknown; code?: unknown };

    // A reply that does not say `ok` is not this route's yes, whatever its status.
    if (!res.ok || json.ok !== true) {
      setTone('error');
      setMessage(words.refusals[guardianOutcomeOf(res.status, json.code)]);
      return;
    }

    setTone('info');
    setMessage(words.recorded);
    setStatement('');
    setEvidence('');
    startTransition(() => router.refresh());
  }

  return (
    <div className="stack">
      <div className="field">
        <label className="eyebrow" htmlFor="consent-child">
          {words.child}
        </label>
        <select
          id="consent-child"
          value={learnerId}
          onChange={(e) => setLearnerId(e.target.value)}
        >
          {options.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.state ? ` — ${c.state}` : ''}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <span className="eyebrow">{words.youAre}</span>
        <div className="row" style={{ gap: '1rem' }}>
          {RELATIONSHIPS.map((key) => (
            <label key={key}>
              <input
                type="radio"
                name="consent-relationship"
                checked={relationship === key}
                onChange={() => setRelationship(key)}
              />{' '}
              {words.relationships[key]}
            </label>
          ))}
        </div>
      </div>

      <div className="field">
        <label className="eyebrow" htmlFor="consent-method">
          {words.how}
        </label>
        <select
          id="consent-method"
          value={method}
          onChange={(e) => {
            const chosen = METHODS.find((m) => m === e.target.value);
            if (chosen) setMethod(chosen);
          }}
        >
          {METHODS.map((m) => (
            <option key={m} value={m}>
              {words.methods[m].label}
            </option>
          ))}
        </select>
        <p className="muted">{words.methods[method].hint}</p>
      </div>

      <div className="field">
        <label className="eyebrow" htmlFor="consent-statement">
          {words.statement}
        </label>
        <textarea
          id="consent-statement"
          rows={4}
          value={statement}
          onChange={(e) => setStatement(e.target.value)}
          placeholder={words.statementPlaceholder}
        />
        <p className="muted">{words.statementHelp}</p>
      </div>

      <div className="field">
        <label className="eyebrow" htmlFor="consent-evidence">
          {words.evidence}
        </label>
        <input
          id="consent-evidence"
          value={evidence}
          onChange={(e) => setEvidence(e.target.value)}
          placeholder={words.evidencePlaceholder}
        />
        <p className="muted">{words.evidenceHelp}</p>
      </div>

      <button type="button" className="btn" onClick={submit} disabled={pending}>
        {pending ? words.sending : words.ask}
      </button>

      {message && (
        <div className={`notice ${tone === 'error' ? 'error' : 'info'}`} role="status">
          {message}
        </div>
      )}

      <p className="muted">{words.foot}</p>
    </div>
  );
}
