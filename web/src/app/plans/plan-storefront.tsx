'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Price = { id: string; amountLabel: string; currency: string; interval: string; market: string | null };
type Version = { id: string; versionNumber: number; interval: string; adultAllowance: number; childAllowance: number; prices: Price[]; entitlements: string[] };
type Plan = { id: string; code: string; name: string; description: string | null; versions: Version[] };
type Learner = { id: string; name: string; type: string; ageBand: string | null };

export function PlanStorefront({ plans, learners }: { plans: Plan[]; learners: Learner[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function checkout(event: React.FormEvent<HTMLFormElement>, versionId: string) {
    event.preventDefault();
    setMessage(null);
    const form = event.currentTarget;
    const data = new FormData(form);
    const priceId = String(data.get('priceId') ?? '');
    const learnerProfileId = String(data.get('learnerProfileId') ?? '');
    setBusy(versionId);
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ planVersionId: versionId, priceId, learnerProfileId }),
      });
      const result = (await response.json().catch(() => null)) as {
        error?: string;
        code?: string;
        orderId?: string;
        kind?: string;
        url?: string;
        providerReference?: string;
      } | null;
      if (result?.kind === 'redirect' && result.url) {
        window.location.assign(result.url);
        return;
      }
      if (response.ok && result?.kind) {
        setMessage(result.providerReference
          ? `Payment started. Provider reference: ${result.providerReference}`
          : 'Payment started. We will confirm it when the provider reports the result.');
        router.refresh();
      } else if (result?.orderId) {
        setMessage(`${result.error ?? 'Payment is not available yet.'} Your unpaid order is saved. You can cancel it under My subscriptions. Order: ${result.orderId}`);
      } else {
        setMessage(result?.error ?? 'Could not start checkout.');
      }
    } catch {
      setMessage('Could not reach checkout. Please try again.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      {message && <div className="notice" role="status" style={{ marginBottom: '1rem' }}>{message}</div>}
      {plans.length === 0 ? <p className="empty">There are no active subscription plans yet.</p> : (
        <div className="grid cols-2">
          {plans.flatMap((plan) => plan.versions.map((version) => (
            <article className="card" key={version.id}>
              <p className="eyebrow">{version.interval} plan · version {version.versionNumber}</p>
              <h2>{plan.name}</h2>
              {plan.description && <p className="muted">{plan.description}</p>}
              <p>{version.adultAllowance} adult slot(s) · {version.childAllowance} child slot(s)</p>
              {version.entitlements.length > 0 && (
                <ul>{version.entitlements.map((entry) => <li key={entry}>{entry}</li>)}</ul>
              )}
              {learners.length === 0 ? (
                <div className="notice">
                  Sign in and create or join a family before starting a plan. The selected learner must be you or a child in your family.
                </div>
              ) : version.prices.length === 0 ? (
                <p className="muted">This plan is not priced in your market yet.</p>
              ) : (
                <form onSubmit={(event) => checkout(event, version.id)}>
                  <label>Choose a price
                    <select name="priceId" required defaultValue={version.prices[0]?.id}>
                      {version.prices.map((price) => <option key={price.id} value={price.id}>
                        {price.amountLabel} {price.currency}{price.market ? ` · ${price.market}` : ''}
                      </option>)}
                    </select>
                  </label>
                  <label>Who will learn?
                    <select name="learnerProfileId" required defaultValue="">
                      <option value="" disabled>Choose a learner</option>
                      {learners.map((learner) => <option key={learner.id} value={learner.id}>
                        {learner.name} · {learner.type === 'child' ? `Child, ${learner.ageBand}` : 'Adult'}
                      </option>)}
                    </select>
                  </label>
                  <button className="btn" type="submit" disabled={busy !== null}>
                    {busy === version.id ? 'Starting…' : 'Continue to payment'}
                  </button>
                  <p className="muted" style={{ fontSize: '0.85rem' }}>
                    Access starts only after verified payment. Choosing a price or returning from a provider does not activate it.
                  </p>
                </form>
              )}
            </article>
          )))}
        </div>
      )}
    </>
  );
}
