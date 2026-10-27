'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  DEFAULT_VALIDITY_MONTHS,
  VALIDITY_MONTHS,
  decisionEffect,
  type ConsentDecision,
} from '@/lib/guardian-consent';

/**
 * Decide one consent case.
 *
 * Three things the form must not let a reviewer do by accident: verify without
 * saying how long for, decide without writing a reason the parent will read, or
 * grant a permission they did not mean to grant. All three are visible fields
 * with defaults that are deliberately the narrowest sensible ones — profile
 * editing is off unless somebody ticks it.
 *
 * The reviewer is not a field. It is taken from the session on the server,
 * because a consent record that lets the caller name the decider is not a record.
 */
export function DecideForm({ caseId }: { caseId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [decision, setDecision] = useState<ConsentDecision>('verified');
  const [months, setMonths] = useState(DEFAULT_VALIDITY_MONTHS);
  const [viewProgress, setViewProgress] = useState(true);
  const [manageLearning, setManageLearning] = useState(true);
  const [manageProfile, setManageProfile] = useState(false);
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<'info' | 'error'>('info');

  async function submit() {
    setMessage(null);
    if (reason.trim().length < 5) {
      setTone('error');
      setMessage('Write what you checked. The parent reads this.');
      return;
    }

    const res = await fetch('/api/admin/guardians', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        caseId,
        decision,
        reason,
        months,
        canViewProgress: viewProgress,
        canManageLearning: manageLearning,
        canManageProfile: manageProfile,
      }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };

    if (!res.ok) {
      setTone('error');
      setMessage(json.error ?? 'The decision was not recorded.');
      return;
    }

    setTone('info');
    setMessage('Recorded.');
    startTransition(() => router.refresh());
  }

  return (
    <div className="stack">
      <fieldset className="row" style={{ gap: '1rem' }}>
        <legend className="eyebrow">Decision</legend>
        <label>
          <input
            type="radio"
            name={`d-${caseId}`}
            checked={decision === 'verified'}
            onChange={() => setDecision('verified')}
          />{' '}
          Verify
        </label>
        <label>
          <input
            type="radio"
            name={`d-${caseId}`}
            checked={decision === 'needs_information'}
            onChange={() => setDecision('needs_information')}
          />{' '}
          Need more information
        </label>
        <label>
          <input
            type="radio"
            name={`d-${caseId}`}
            checked={decision === 'rejected'}
            onChange={() => setDecision('rejected')}
          />{' '}
          Reject
        </label>
      </fieldset>

      {decision === 'verified' && (
        <>
          <div className="field">
            <label className="eyebrow" htmlFor={`m-${caseId}`}>
              Valid for
            </label>
            <select
              id={`m-${caseId}`}
              value={months}
              onChange={(e) => setMonths(Number(e.target.value))}
            >
              {VALIDITY_MONTHS.map((m) => (
                <option key={m} value={m}>
                  {m} months
                </option>
              ))}
            </select>
          </div>

          <fieldset className="stack">
            <legend className="eyebrow">Granted permissions</legend>
            <label>
              <input
                type="checkbox"
                checked={viewProgress}
                onChange={(e) => setViewProgress(e.target.checked)}
              />{' '}
              See the child&rsquo;s progress
            </label>
            <label>
              <input
                type="checkbox"
                checked={manageLearning}
                onChange={(e) => setManageLearning(e.target.checked)}
              />{' '}
              Change what the child is learning
            </label>
            <label>
              <input
                type="checkbox"
                checked={manageProfile}
                onChange={(e) => setManageProfile(e.target.checked)}
              />{' '}
              Change the child&rsquo;s profile
            </label>
          </fieldset>
        </>
      )}

      <div className="field">
        <label className="eyebrow" htmlFor={`r-${caseId}`}>
          What you checked (required)
        </label>
        <textarea
          id={`r-${caseId}`}
          rows={2}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="The video call, the document, what matched."
        />
        <p className="muted">{decisionEffect(decision, months)}</p>
      </div>

      <button type="button" className="btn" onClick={submit} disabled={pending}>
        {pending ? 'Recording…' : 'Record decision'}
      </button>

      {message && (
        <div className={`notice ${tone === 'error' ? 'error' : 'info'}`} role="status">
          {message}
        </div>
      )}
    </div>
  );
}
