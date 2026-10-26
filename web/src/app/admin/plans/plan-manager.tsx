'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import {
  featureLabel,
  TIER_CHOICES,
  tierChangeBlocked,
  tierRuleExplanation,
  tierSavedMessage,
  type PlanTier,
} from '@/lib/plan-features';

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
  /** Which shelf the plan is on. A Plus plan is what a VIP package means here. */
  tier: string;
  description: string | null;
  plan_versions: VersionView[];
};
export type SubjectView = { id: string; code: string; name: string };
/** Which shelf a feature needs, with the Basic plans that would block a raise. */
export type FeatureRuleView = {
  featureCode: string;
  minTier: 'basic' | 'plus';
  blockingPlans: string | null;
};

type PlanAction =
  | 'create_plan'
  | 'create_version'
  | 'add_entitlement'
  | 'set_price'
  | 'set_plan_tier'
  | 'set_feature_requirement'
  | 'remove_entitlement'
  | 'activate_version';

function value(data: FormData, key: string): string {
  const v = data.get(key);
  return typeof v === 'string' ? v.trim() : '';
}

export function PlanManager({
  plans,
  featureCodes,
  subjects,
  featureRules,
}: {
  plans: PlanView[];
  featureCodes: string[];
  subjects: SubjectView[];
  featureRules: FeatureRuleView[];
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
      payload = {
        ...payload,
        code: value(data, 'code'),
        name: value(data, 'name'),
        description: value(data, 'description'),
        tier: value(data, 'tier') || 'basic',
      };
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
    } else if (action === 'remove_entitlement') {
      payload = { ...payload, entitlementId: value(data, 'entitlementId') };
    } else if (action === 'set_plan_tier') {
      payload = { ...payload, planId: value(data, 'planId'), tier: value(data, 'tier') };
    } else if (action === 'set_feature_requirement') {
      payload = {
        ...payload,
        featureCode: value(data, 'featureCode'),
        minTier: value(data, 'minTier'),
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
    const result = (await response.json().catch(() => null)) as
      | { ok?: boolean; message?: string; data?: { changed?: boolean } }
      | null;
    if (!response.ok || result?.ok !== true) {
      setMessage(result?.message ?? 'The plan change could not be saved.');
      return;
    }
    if (action === 'set_feature_requirement') {
      // The shelf change has its own sentence, because "Saved" does not tell
      // anybody which way the rule moved — and for the feature that gates
      // downloads, that is the whole point of the change.
      setMessage(
        tierSavedMessage({
          featureCode: String(payload.featureCode ?? ''),
          minTier: (payload.minTier === 'plus' ? 'plus' : 'basic') as PlanTier,
          changed: result?.data?.changed !== false,
        }),
      );
    }
    setSaved(true);
    form.reset();
    startTransition(() => router.refresh());
  }

  return (
    <>
      {/*
        Which shelf each feature needs. This used to be a CASE statement in SQL,
        so the answer to "what is in the VIP package?" needed a developer. It is
        the owner's decision, so it is a form.
      */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <h2 style={{ marginTop: 0 }}>Which features need Plus</h2>
        <p className="muted">
          The shelf is a real gate: a Basic plan cannot be given a feature that
          needs Plus. Moving one <em>down</em> is always allowed; moving one
          <em> up</em> is refused while a Basic plan still grants it, because the
          catalogue would say Plus-only while that plan kept handing it out.
        </p>

        {featureRules.length === 0 ? (
          <p className="empty">No sellable features yet.</p>
        ) : featureRules.map((rule) => {
          const blocked = tierChangeBlocked(rule, 'plus');
          return (
            <form
              key={rule.featureCode}
              onSubmit={(event) => submit(event, 'set_feature_requirement')}
              className="row"
              style={{ alignItems: 'end', flexWrap: 'wrap', gap: '0.75rem' }}
            >
              <input type="hidden" name="featureCode" value={rule.featureCode} />
              <div style={{ minWidth: '14rem' }}>
                <strong>{featureLabel(rule.featureCode)}</strong>
                <div className="muted" style={{ fontSize: '0.85rem' }}>
                  {tierRuleExplanation(rule)}
                </div>
                {blocked && (
                  <div className="notice" style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
                    {blocked}
                  </div>
                )}
              </div>
              <label>
                Needs at least
                <select name="minTier" defaultValue={rule.minTier}>
                  {TIER_CHOICES.map((choice) => (
                    <option key={choice.value} value={choice.value}>{choice.label}</option>
                  ))}
                </select>
              </label>
              <button className="btn ghost" disabled={pending}>Save shelf</button>
            </form>
          );
        })}
      </div>

      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <h2>Create a plan</h2>
        <p className="muted">A plan is a stable public identity. Terms and prices belong to versioned terms below.</p>
        <form onSubmit={(event) => submit(event, 'create_plan')} className="stack">
          <label>Plan code<input name="code" required pattern="[a-z0-9][a-z0-9_-]*" maxLength={80} placeholder="family-monthly" /></label>
          <label>Name<input name="name" required maxLength={160} placeholder="Family monthly" /></label>
          <label>Description<textarea name="description" rows={2} /></label>
          <label>
            Which shelf
            <select name="tier" defaultValue="basic">
              <option value="basic">Basic — the course, and learning itself</option>
              <option value="plus">Plus — the VIP package, with more features</option>
            </select>
          </label>
          <p className="muted" style={{ fontSize: '0.85rem' }}>
            Downloads need a Plus plan today, and a Basic plan cannot be given them. Which
            shelf a feature needs is the panel above, so that rule can move without a deploy.
          </p>
          <button className="btn" disabled={pending}>Create draft plan</button>
        </form>
      </div>

      {plans.length === 0 ? <p className="empty">No plans yet. Create the first one above.</p> : plans.map((plan) => (
        <section key={plan.id} className="card" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
          <div className="outline-h">
            <h2>{plan.name}</h2>
            <span>
              <span className={`badge ${plan.tier === 'plus' ? 'ok' : 'neutral'}`}>
                {plan.tier === 'plus' ? 'Plus' : 'Basic'}
              </span>{' '}
              <span className="badge neutral">{plan.status}</span>
            </span>
          </div>
          <p><code>{plan.code}</code>{plan.description ? ` · ${plan.description}` : ''}</p>
          <form onSubmit={(event) => submit(event, 'set_plan_tier')} className="row" style={{ alignItems: 'end', flexWrap: 'wrap' }}>
            <label>
              Shelf
              <select name="tier" defaultValue={plan.tier}>
                <option value="basic">Basic</option>
                <option value="plus">Plus</option>
              </select>
            </label>
            <button className="btn ghost" disabled={pending}>Change shelf</button>
            <input type="hidden" name="planId" value={plan.id} />
          </form>
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
                    {version.status === 'draft' && (
                      <button
                        type="button"
                        className="btn ghost tiny"
                        style={{ marginLeft: '0.5rem' }}
                        disabled={pending}
                        onClick={() => {
                          void (async () => {
                            setMessage(null); setSaved(false);
                            const response = await fetch('/api/admin/plans', {
                              method: 'POST',
                              headers: { 'content-type': 'application/json' },
                              body: JSON.stringify({ action: 'remove_entitlement', entitlementId: entitlement.id }),
                            });
                            const result = (await response.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
                            if (!response.ok || result?.ok !== true) setMessage(result?.message ?? 'Could not remove this entitlement.');
                            else { setSaved(true); startTransition(() => router.refresh()); }
                          })();
                        }}
                      >
                        Remove
                      </button>
                    )}
                  </li>)}</ul>
                )}
              </div>
              <form onSubmit={(event) => submit(event, 'add_entitlement')} className="stack">
                <input type="hidden" name="versionId" value={version.id} />
                <label>Entitlement type<select name="scopeType" defaultValue="catalogue"><option value="catalogue">Subject catalogue</option><option value="feature">Platform feature</option></select></label>
                <label>Subject area<select name="subjectAreaId" defaultValue=""><option value="">Choose a subject</option>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></label>
                <label>Feature code
                  <select name="featureCode" defaultValue="">
                    <option value="">Choose a feature</option>
                    {featureCodes.map((code) => (
                      <option key={code} value={code}>{code === 'offline_downloads' ? 'Offline downloads (Plus plans)' : code}</option>
                    ))}
                  </select>
                </label>
                <p className="muted" style={{ fontSize: '0.85rem' }}>
                  A closed list, not free text: selling a code no rule reads would take money and grant
                  nothing. <code>offline_downloads</code> is what <code>may_download_lesson()</code> honours.
                </p>
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
