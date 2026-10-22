'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Allocation = { id: string; learner_profile_id: string; slot_type: string; status: string; learner_profiles: { display_name: string; learner_type: string } | null };
type Subscription = {
  id: string;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  cancelled_at: string | null;
  plans: { name: string; code: string } | null;
  plan_versions: { billing_interval: string; adult_allowance: number; child_allowance: number } | null;
  family_plan_allocations: Allocation[];
};
type Learner = { id: string; display_name: string; learner_type: string; age_band: string | null };

/** What a plan gives, as `my_plan_summary()` reports it. */
export type PlanContents = {
  tier: string;
  features: Array<{ code: string; label: string }>;
  subjects: string[];
};

function date(value: string | null): string {
  if (!value) return 'Not started';
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(value));
}

export function SubscriptionManager({
  subscriptions,
  learners,
  contents = {},
}: {
  subscriptions: Subscription[];
  learners: Learner[];
  contents?: Record<string, PlanContents>;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function action(payload: Record<string, string>, key: string) {
    setBusy(key);
    setMessage(null);
    try {
      const response = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = (await response.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
      if (!response.ok || result?.ok !== true) {
        setMessage(result?.message ?? 'Could not update the subscription.');
        return;
      }
      router.refresh();
    } catch {
      setMessage('Could not reach the subscription service. Please try again.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      {message && <div className="notice" role="alert">{message}</div>}
      {subscriptions.length === 0 ? <p className="empty">No subscriptions yet. <a href="/plans">Browse plans</a>.</p> : (
        <div className="grid cols-2">
          {subscriptions.map((subscription) => {
            const version = subscription.plan_versions;
            const allocated = new Set(subscription.family_plan_allocations.filter((a) => a.status === 'active').map((a) => a.learner_profile_id));
            const availableLearners = learners.filter((l) => !allocated.has(l.id));
            const canAllocate = subscription.status === 'active';
            const canCancel = ['pending','trialing','active','past_due','paused'].includes(subscription.status);
            const plan = contents[subscription.id];
            return (
              <article className="card" key={subscription.id}>
                <p className="eyebrow">{version?.billing_interval ?? 'subscription'} · {subscription.status}</p>
                <h2>
                  {subscription.plans?.name ?? 'Learning plan'}{' '}
                  {plan && (
                    <span className={`badge ${plan.tier === 'plus' ? 'ok' : 'neutral'}`}>
                      {plan.tier === 'plus' ? 'Plus' : 'Basic'}
                    </span>
                  )}
                </h2>
                <p>Current paid period: {date(subscription.current_period_start)} – {date(subscription.current_period_end)}</p>
                {plan && (
                  <div>
                    <h3>What this plan includes</h3>
                    {plan.features.length === 0
                      && plan.subjects.length === 0
                      ? <p className="muted">The course itself.</p>
                      : (
                        <ul>
                          {plan.features.map((feature) => (
                            <li key={feature.code}>{feature.label}</li>
                          ))}
                          {plan.subjects.length > 0 && (
                            <li>Every course in {plan.subjects.join(', ')}</li>
                          )}
                        </ul>
                      )}
                    {plan.tier !== 'plus' && (
                      <p className="muted" style={{ fontSize: '0.9rem' }}>
                        Plus adds watching lessons inside the app with no connection.{' '}
                        <a href="/plans">Compare the plans</a>
                      </p>
                    )}
                  </div>
                )}
                {subscription.cancelled_at && <p className="notice">Cancelled. Access already paid for continues until {date(subscription.current_period_end)}.</p>}
                <h3>Allocated learners</h3>
                {subscription.family_plan_allocations.filter((a) => a.status === 'active').length === 0
                  ? <p className="muted">No learner is allocated yet.</p>
                  : <ul>{subscription.family_plan_allocations.filter((a) => a.status === 'active').map((allocation) => (
                    <li key={allocation.id}>{allocation.learner_profiles?.display_name ?? 'Learner'} · {allocation.slot_type}</li>
                  ))}</ul>}
                {canAllocate && availableLearners.length > 0 && (
                  <form onSubmit={(event) => {
                    event.preventDefault();
                    const learnerProfileId = String(new FormData(event.currentTarget).get('learnerProfileId') ?? '');
                    if (learnerProfileId) void action({ action: 'allocate', subscriptionId: subscription.id, learnerProfileId }, `allocate:${subscription.id}`);
                  }}>
                    <label>Add a learner
                      <select name="learnerProfileId" required defaultValue="">
                        <option value="" disabled>Choose a learner</option>
                        {availableLearners.map((learner) => <option key={learner.id} value={learner.id}>
                          {learner.display_name} · {learner.learner_type === 'child' ? `Child, ${learner.age_band}` : 'Adult'}
                        </option>)}
                      </select>
                    </label>
                    <button className="btn secondary" disabled={busy !== null}>{busy === `allocate:${subscription.id}` ? 'Adding…' : 'Add learner'}</button>
                  </form>
                )}
                {canCancel && (
                  <form onSubmit={(event) => {
                    event.preventDefault();
                    const reason = String(new FormData(event.currentTarget).get('reason') ?? '');
                    void action({ action: 'cancel', subscriptionId: subscription.id, reason }, `cancel:${subscription.id}`);
                  }}>
                    <label>Reason for cancellation
                      <textarea name="reason" required maxLength={500} rows={2} placeholder="Tell us why you are cancelling" />
                    </label>
                    <button className="btn secondary" disabled={busy !== null}>{busy === `cancel:${subscription.id}` ? 'Cancelling…' : 'Cancel subscription'}</button>
                    {subscription.current_period_end && <p className="muted" style={{ fontSize: '0.85rem' }}>Cancelling does not remove access already paid for; it remains until {date(subscription.current_period_end)}.</p>}
                  </form>
                )}
                {version && <p className="muted" style={{ fontSize: '0.85rem' }}>Allowances: {version.adult_allowance} adult, {version.child_allowance} child.</p>}
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
