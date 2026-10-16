'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type PriceView = {
  id: string;
  amount_minor: number;
  currency_code: string;
  status: string;
  market: string | null;
  effective_until: string | null;
};
type EntitlementView = {
  id: string;
  scope_type: string;
  feature_code: string | null;
  subject_area_id: string | null;
  product_id: string | null;
};
type VersionView = {
  id: string;
  version_number: number;
  status: string;
  billing_interval: string;
  child_allowance: number;
  adult_allowance: number;
  plan_entitlements: EntitlementView[];
  prices: PriceView[];
};
export type PlanView = {
  id: string;
  code: string;
  name: string;
  status: string;
  description: string | null;
  plan_versions: VersionView[];
};
export type SubjectView = { id: string; code: string; name: string };

type PlanAction =
  | 'create_plan'
  | 'create_version'
  | 'add_entitlement'
  | 'set_price'
  | 'activate_version';

function value(data: FormData, key: string): string {
  const v = data.get(key);
  return typeof v === 'string' ? v.trim() : '';
}

export function PlanManager({
  plans,
  subjects,
}: {
  plans: PlanView[];
  subjects: SubjectView[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>, action: PlanAction, extra: Record<string, unknown> = {}) {
    event.preventDefault();
    setMessage(null);
    setSaved(false);
    const form = event.currentTarget;
    const data = new FormData(form);
    let payload: Record<string, unknown> = { action, ...extra };

    if (action === 'create_plan') {
      payload = { ...payload, code: value(data, 'code'), name: value(data, 'name'), description: value(data, 'description') };
    } else if (action === 'create_version') {
      payload = {
        ...payload,
        planId: value(data, 'planId'),
        childAllowance: Number(value(data, 'childAllowance')),
        adultAllowance: Number(value(data, 'adultAllowance')),
        billingInterval: value(data, 'billingInterval'),
        changeSummary: value(data, 'changeSummary'),
      };
    } else if (action === 'add_entitlement') {
      payload = {
        ...payload,
        versionId: value(data, 'versionId'),
        scopeType: value(data, 'scopeType'),
        subjectAreaId: value(data, 'subjectAreaId') || null,
        featureCode: value(data, 'featureCode') || null,
      };
    } else if (action === 'set_price') {
      payload = {
        ...payload,
        versionId: value(data, 'versionId'),
        // Money is an integer minor-unit string, never a floating-point JS number.
        amountMinor: value(data, 'amountMinor'),
        currencyCode: value(data, 'currencyCode').toUpperCase(),
        market: value(data, 'market').toUpperCase() || null,
      };
    }

    const response = await fetch('/api/admin/plans', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = (await response.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
    if (!response.ok || result?.ok !== true) {
      setMessage(result?.message ?? 'The plan change could not be saved.');
      return;
    }
    setSaved(true);
    form.reset();
    startTransition(() => router.refresh());
  }

  return (
    <>
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <h2>Create a plan</h2>
        <p className="muted">A plan is a stable public identity. Terms and prices belong to versioned terms below.</p>
        <form onSubmit={(event) => submit(event, 'create_plan')} className="stack">
          <label>Plan code<input name="code" required pattern="[a-z0-9][a-z0-9_-]*" maxLength={80} placeholder="family-monthly" /></label>
          <label>Name<input name="name" required maxLength={160} placeholder="Family monthly" /></label>
          <label>Description<textarea name="description" rows={2} /></label>
          <button className="btn" disabled={pending}>Create draft plan</button>
        </form>
      </div>

      {plans.length === 0 ? <p className="empty">No plans yet. Create the first one above.</p> : plans.map((plan) => (
        <section key={plan.id} className="card" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
          <div className="outline-h"><h2>{plan.name}</h2><span className="badge neutral">{plan.status}</span></div>
          <p><code>{plan.code}</code>{plan.description ? ` · ${plan.description}` : ''}</p>
          <h3>New terms version</h3>
          <form onSubmit={(event) => submit(event, 'create_version')} className="stack">
            <input type="hidden" name="planId" value={plan.id} />
            <label>Billing interval<select name="billingInterval" defaultValue="month"><option value="week">Weekly</option><option value="month">Monthly</option><option value="quarter">Quarterly</option><option value="year">Yearly</option></select></label>
            <label>Child learner slots<input name="childAllowance" type="number" min={0} step={1} required defaultValue={0} /></label>
            <label>Adult learner slots<input name="adultAllowance" type="number" min={0} step={1} required defaultValue={1} /></label>
            <label>Change summary<input name="changeSummary" maxLength={500} /></label>
            <button className="btn secondary" disabled={pending}>Create draft terms</button>
          </form>

          {plan.plan_versions.map((version) => (
            <div key={version.id} className="outline" style={{ marginTop: '1.5rem', padding: '1rem' }}>
              <div className="outline-h"><h3>Version {version.version_number}</h3><span className="badge neutral">{version.status}</span></div>
              <p>{version.billing_interval} · {version.adult_allowance} adult slot(s) · {version.child_allowance} child slot(s)</p>

              <div>
                <strong>Entitlements</strong>
                {version.plan_entitlements.length === 0 ? <p className="muted">None configured.</p> : (
                  <ul>{version.plan_entitlements.map((entitlement) => <li key={entitlement.id}>
                    {entitlement.scope_type === 'catalogue'
                      ? `Catalogue subject: ${subjects.find((s) => s.id === entitlement.subject_area_id)?.name ?? entitlement.subject_area_id}`
                      : entitlement.scope_type === 'feature' ? `Feature: ${entitlement.feature_code}` : `Product: ${entitlement.product_id}`}
                  </li>)}</ul>
                )}
              </div>
              <form onSubmit={(event) => submit(event, 'add_entitlement')} className="stack">
                <input type="hidden" name="versionId" value={version.id} />
                <label>Entitlement type<select name="scopeType" defaultValue="catalogue"><option value="catalogue">Subject catalogue</option><option value="feature">Platform feature</option></select></label>
                <label>Subject area<select name="subjectAreaId" defaultValue=""><option value="">Choose a subject</option>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></label>
                <label>Feature code<input name="featureCode" maxLength={100} placeholder="offline_downloads" /></label>
                <button className="btn secondary" disabled={pending}>Add entitlement</button>
              </form>

              <div style={{ marginTop: '1rem' }}><strong>Prices</strong>
                {version.prices.length === 0 ? <p className="muted">No price configured.</p> : (
                  <ul>{version.prices.map((price) => <li key={price.id}>
                    {price.amount_minor} {price.currency_code} · {price.status}{price.market ? ` · ${price.market}` : ''}
                  </li>)}</ul>
                )}
              </div>
              <form onSubmit={(event) => submit(event, 'set_price')} className="stack">
                <input type="hidden" name="versionId" value={version.id} />
                <label>Amount in minor units<input name="amountMinor" type="number" min={0} step={1} required /></label>
                <label>Currency<input name="currencyCode" required minLength={3} maxLength={3} defaultValue="UGX" /></label>
                <label>Market (optional two-letter code)<input name="market" minLength={2} maxLength={2} placeholder="UG" /></label>
                <button className="btn secondary" disabled={pending}>Set recurring price</button>
              </form>
              {version.status === 'draft' && <button className="btn" disabled={pending} onClick={() => {
                void (async () => {
                  setMessage(null); setSaved(false);
                  const response = await fetch('/api/admin/plans', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'activate_version', versionId: version.id }) });
                  const result = (await response.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
                  if (!response.ok || result?.ok !== true) setMessage(result?.message ?? 'Could not activate this version.');
                  else { setSaved(true); startTransition(() => router.refresh()); }
                })();
              }}>Activate version</button>}
            </div>
          ))}
        </section>
      ))}
      {saved && <p className="success" role="status">Saved.</p>}
      {message && <p className="danger" role="alert">{message}</p>}
    </>
  );
}
