'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  CONSENT_METHODS,
  RELATIONSHIP_LABELS,
  type ConsentMethod,
  type RelationshipType,
} from '@/lib/guardian-consent';

type ChildOption = { id: string; name: string; state?: string };

/**
 * Ask for consent, or renew one that has lapsed.
 *
 * The statement is a required field with a required length, and the copy says
 * who reads it. That is not decoration: the statement is what the reviewer's
 * judgement rests on, because the evidence reference is write-only by design.
 */
export function ConsentForm({ options }: { options: ChildOption[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [learnerId, setLearnerId] = useState(options[0]?.id ?? '');
  const [relationship, setRelationship] = useState<RelationshipType>('parent');
  const [method, setMethod] = useState<ConsentMethod>('video_call');
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
      setMessage('Choose a child first.');
      return;
    }
    if (statement.trim().length < 20) {
      setTone('error');
      setMessage(
        'Write who this child is to you, in your own words — at least 20 characters.',
      );
      return;
    }

    const res = await fetch('/api/family/guardians', {
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
    const json = (await res.json().catch(() => ({}))) as { error?: string };

    if (!res.ok) {
      setTone('error');
      setMessage(json.error ?? 'The request was not recorded.');
      return;
    }

    setTone('info');
    setMessage(
      'Recorded. A person will read your statement and decide — you will see the outcome here.',
    );
    setStatement('');
    setEvidence('');
    startTransition(() => router.refresh());
  }

  return (
    <div className="stack">
      <div className="field">
        <label className="eyebrow" htmlFor="consent-child">
          Child
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
        <span className="eyebrow">You are this child&rsquo;s</span>
        <div className="row" style={{ gap: '1rem' }}>
          {(Object.keys(RELATIONSHIP_LABELS) as RelationshipType[]).map((key) => (
            <label key={key}>
              <input
                type="radio"
                name="consent-relationship"
                checked={relationship === key}
                onChange={() => setRelationship(key)}
              />{' '}
              {RELATIONSHIP_LABELS[key]}
            </label>
          ))}
        </div>
      </div>

      <div className="field">
        <label className="eyebrow" htmlFor="consent-method">
          How the reviewer can confirm it
        </label>
        <select
          id="consent-method"
          value={method}
          onChange={(e) => setMethod(e.target.value as ConsentMethod)}
        >
          {CONSENT_METHODS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
        <p className="muted">
          {CONSENT_METHODS.find((m) => m.value === method)?.hint}
        </p>
      </div>

      <div className="field">
        <label className="eyebrow" htmlFor="consent-statement">
          In your own words (required)
        </label>
        <textarea
          id="consent-statement"
          rows={4}
          value={statement}
          onChange={(e) => setStatement(e.target.value)}
          placeholder="Who this child is to you, and what you are consenting to."
        />
        <p className="muted">
          At least 20 characters. The reviewer reads this — it is what the
          decision rests on, alongside whatever they check outside the platform.
        </p>
      </div>

      <div className="field">
        <label className="eyebrow" htmlFor="consent-evidence">
          Where the evidence is kept (optional)
        </label>
        <input
          id="consent-evidence"
          value={evidence}
          onChange={(e) => setEvidence(e.target.value)}
          placeholder="A pointer, not the document itself"
        />
        <p className="muted">
          A reference the reviewer can find, in storage that is access-controlled
          outside this platform. It is written once and then unreadable — not to
          you, not to the reviewer, not to an administrator.
        </p>
      </div>

      <button type="button" className="btn" onClick={submit} disabled={pending}>
        {pending ? 'Sending…' : 'Ask for consent'}
      </button>

      {message && (
        <div className={`notice ${tone === 'error' ? 'error' : 'info'}`} role="status">
          {message}
        </div>
      )}

      <p className="muted">
        This asks. It does not grant — a reviewer decides, and can narrow what you
        are given. A verification has a lifetime and runs out on its own.
      </p>
    </div>
  );
}
