'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type ChildOption = { id: string; name: string };

/**
 * Ask to be verified as a child's guardian.
 *
 * The prop is `options` rather than `children` on purpose: `children` is
 * React's own prop, and shadowing it on a component that takes no nested
 * content is the kind of thing that reads fine and then confuses the next
 * person who tries to nest something in it.
 */
export function RequestForm({ options }: { options: ChildOption[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [learnerId, setLearnerId] = useState(options[0]?.id ?? '');
  const [relationship, setRelationship] = useState<'parent' | 'guardian' | 'other'>(
    'parent',
  );
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<'info' | 'error'>('info');

  if (options.length === 0) {
    return (
      <p className="muted">
        You have already asked about every child in your family.
      </p>
    );
  }

  async function submit() {
    setMessage(null);
    if (!learnerId) {
      setTone('error');
      setMessage('Choose a child first.');
      return;
    }

    const res = await fetch('/api/family/guardians', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        learnerProfileId: learnerId,
        relationshipType: relationship,
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
      'Request recorded. A person will review it — you will see the outcome here.',
    );
    startTransition(() => router.refresh());
  }

  return (
    <div style={{ display: 'grid', gap: '0.75rem' }}>
      <div>
        <label className="eyebrow" htmlFor="guardian-child">
          Child
        </label>
        <select
          id="guardian-child"
          value={learnerId}
          onChange={(e) => setLearnerId(e.target.value)}
        >
          {options.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <fieldset className="row" style={{ gap: '1rem' }}>
        <label>
          <input
            type="radio"
            name="guardian-type"
            checked={relationship === 'parent'}
            onChange={() => setRelationship('parent')}
          />{' '}
          Parent
        </label>
        <label>
          <input
            type="radio"
            name="guardian-type"
            checked={relationship === 'guardian'}
            onChange={() => setRelationship('guardian')}
          />{' '}
          Guardian
        </label>
        <label>
          <input
            type="radio"
            name="guardian-type"
            checked={relationship === 'other'}
            onChange={() => setRelationship('other')}
          />{' '}
          Other
        </label>
      </fieldset>

      <button type="button" className="btn" onClick={submit} disabled={pending}>
        {pending ? 'Sending…' : 'Request guardian access'}
      </button>

      {message && (
        <div className={`notice ${tone === 'error' ? 'error' : 'warn'}`} role="status">
          {message}
        </div>
      )}

      <p className="muted">
        This asks for access. It does not grant it — a reviewer decides, and can
        narrow what you are given.
      </p>
    </div>
  );
}
