'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { Say } from '@/components/say';
import { subscriptionOutcomeOf, type SubscriptionOutcome } from '@/lib/subscription-outcome';

/**
 * The words these forms say. Chosen on the server, in the reader's language:
 * a script sent to a browser holds no catalogue.
 */
export type SubscriptionWords = {
  add: string;
  choose: string;
  /** `{name}` and the word for a child's profile. */
  learnerChild: string;
  addDo: string;
  adding: string;
  cancelOrder: string;
  cancelOrderNote: string;
  cancelPlan: string;
  /** With `{date}` in it: the end of what was paid for. */
  cancelPlanNote: string;
  reason: string;
  working: string;
  /** The request could not be made at all. */
  unreachable: string;
  reasons: Record<SubscriptionOutcome, string>;
};

/**
 * The two things a subscriber can do to one plan: put a learner on it, and
 * cancel.
 *
 * **Cancelling an order and cancelling a plan are two forms.** An order that
 * was never paid is cancelled with one press and no question: the plans page
 * sends people here to do exactly that. A plan that was paid for is behind a
 * disclosure, says what cancelling does and does not do, and asks why. The
 * old form asked everybody for a reason and offered "cancel" for five stored
 * words, three of which nothing ever writes.
 *
 * **What is said after a refusal is this page's sentence for its name.** The
 * old form printed the reply's `message`, which was the database's own.
 * A reason is believed only when it arrives with its own status
 * (`subscriptionOutcomeOf`); anything else is "we could not confirm".
 *
 * **A success says nothing here.** The page is read again, and the card
 * itself changes: the learner is in the list, or the plan says it was
 * cancelled. That part of the card is read out when it changes. Cancelling
 * something that was already cancelled is a success too.
 *
 * Both writers can be asked twice without harm, so the buttons come back
 * after every answer.
 */
export function SubscriptionManager({
  subscriptionId,
  addable,
  cancel,
  until,
  words,
}: {
  subscriptionId: string;
  /** Who the writer would take now. Empty when nobody, or when that was not read. */
  /** `note` is a child's ages or the word for an adult, already in the reader's language. */
  addable: { id: string; name: string; type: 'adult' | 'child'; note: string | null }[];
  cancel: 'order' | 'plan' | null;
  /** The end of the paid period, already said in the reader's language. */
  until: string | null;
  words: SubscriptionWords;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<'add' | 'cancel' | null>(null);
  const [learnerId, setLearnerId] = useState('');
  const [reason, setReason] = useState('');
  const [tone, setTone] = useState<'warn' | 'error'>('error');
  const [message, setMessage] = useState<string | null>(null);

  async function send(kind: 'add' | 'cancel', payload: Record<string, string>) {
    if (busy !== null) return;
    setBusy(kind);
    setMessage(null);

    let res: Response;
    try {
      res = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ subscriptionId, ...payload }),
      });
    } catch {
      setTone('warn');
      setMessage(words.unreachable);
      setBusy(null);
      return;
    }
    const json = (await res.json().catch(() => null)) as { ok?: unknown; reason?: unknown } | null;
    setBusy(null);

    if (res.ok && json?.ok === true) {
      setLearnerId('');
      setReason('');
      router.refresh();
      return;
    }
    const named = subscriptionOutcomeOf(res.status, json?.reason);
    setTone(named === 'refused' || named === 'unconfirmed' ? 'warn' : 'error');
    setMessage(words.reasons[named]);
    // The page may be behind what the database holds: read it again.
    if (named === 'no_slot' || named === 'not_running' || named === 'unconfirmed') router.refresh();
  }

  function add() {
    // Nobody chosen is said here; nothing is asked of the server.
    if (learnerId === '') {
      setTone('error');
      setMessage(words.choose);
      return;
    }
    void send('add', { action: 'allocate', learnerProfileId: learnerId });
  }

  function cancelPlan() {
    const written = reason.trim();
    if (written === '') {
      setTone('error');
      setMessage(words.reasons.reason_required);
      return;
    }
    void send('cancel', { action: 'cancel', reason: written });
  }

  return (
    <div className="sub-forms" data-sub-forms>
      {addable.length > 0 && (
        <div className="sub-form" data-sub-add>
          <label htmlFor={`sub-add-${subscriptionId}`} className="eyebrow">
            {words.add}
          </label>
          <select
            id={`sub-add-${subscriptionId}`}
            value={learnerId}
            onChange={(e) => {
              setLearnerId(e.target.value);
              setMessage(null);
            }}
            disabled={busy !== null}
          >
            <option value="">{words.choose}</option>
            {addable.map((learner) => (
              <option key={learner.id} value={learner.id}>
                {(learner.type === 'child'
                  ? words.learnerChild.replace('{name}', `\u2068${learner.name}\u2069`)
                  : learner.name) + (learner.note !== null ? ` · ${learner.note}` : '')}
              </option>
            ))}
          </select>
          <button type="button" className="btn secondary" onClick={add} disabled={busy !== null}>
            {busy === 'add' ? words.adding : words.addDo}
          </button>
        </div>
      )}

      {cancel === 'order' && (
        <div className="sub-form" data-sub-cancel="order">
          <p className="muted">{words.cancelOrderNote}</p>
          <button
            type="button"
            className="btn secondary"
            onClick={() => void send('cancel', { action: 'cancel' })}
            disabled={busy !== null}
          >
            {busy === 'cancel' ? words.working : words.cancelOrder}
          </button>
        </div>
      )}

      {cancel === 'plan' && (
        <details className="sub-cancel" data-sub-cancel="plan">
          <summary>{words.cancelPlan}</summary>
          <div className="sub-form">
            <p className="muted">
              <Say text={words.cancelPlanNote} parts={{ date: <bdi>{until ?? ''}</bdi> }} />
            </p>
            <label htmlFor={`sub-reason-${subscriptionId}`} className="eyebrow">
              {words.reason}
            </label>
            <textarea
              id={`sub-reason-${subscriptionId}`}
              rows={3}
              maxLength={500}
              dir="auto"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setMessage(null);
              }}
              disabled={busy !== null}
            />
            <button type="button" className="btn danger" onClick={cancelPlan} disabled={busy !== null}>
              {busy === 'cancel' ? words.working : words.cancelPlan}
            </button>
          </div>
        </details>
      )}

      {message && (
        <div className={`notice ${tone === 'error' ? 'error' : 'warn'}`} role="alert" data-sub-answer>
          {message}
        </div>
      )}
    </div>
  );
}
