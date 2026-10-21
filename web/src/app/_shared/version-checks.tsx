'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  CHANGE_CLASSES,
  CHANGE_CLASS_LABEL,
  MATERIAL_CHANGE_CLASSES,
  RISK_LEVELS,
  RISK_LEVEL_LABEL,
  TECHNICAL_CHECK_LABEL,
  TECHNICAL_CHECK_TYPES,
  validateChangeAssessmentInput,
  validateTechnicalCheckInput,
  type ChangeAssessment,
  type TechnicalCheck,
} from '@/lib/review-requirements';

/**
 * The checks an author or a reviewer performs, and the classification of what changed.
 *
 * Neither of these gates publication, and both panels say so. A technical check is a
 * record that somebody looked — `record_technical_check()` never touches the
 * publication gate, and the table's own comment is that it is never a substitute for
 * scholarly approval. A change assessment is what tells the next reader whether this
 * version is a typo fix or a restatement of a ruling, which is exactly the difference
 * a reviewer needs and the gate does not measure.
 *
 * Both are append-only. A re-check is a second row and a reclassification sits beside
 * the first one, so the panel shows the latest of each kind and keeps the history
 * behind a fold rather than pretending the earlier answer did not happen.
 */
export function VersionChecks({
  versionId,
  latestChecks,
  checks,
  assessments,
  versions,
  canCheck,
  canAssess,
}: {
  versionId: string;
  latestChecks: TechnicalCheck[];
  checks: TechnicalCheck[];
  assessments: ChangeAssessment[];
  versions: Array<{ id: string; versionNumber: number }>;
  canCheck: boolean;
  canAssess: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [checkType, setCheckType] = useState<string>(TECHNICAL_CHECK_TYPES[0] ?? '');
  const [passed, setPassed] = useState(true);
  const [evidence, setEvidence] = useState('');

  const [changeClass, setChangeClass] = useState<string>(CHANGE_CLASSES[0] ?? '');
  const [riskLevel, setRiskLevel] = useState<string>('low');
  const [requiresReReview, setRequiresReReview] = useState(true);
  const [rationale, setRationale] = useState('');
  const [fromVersionId, setFromVersionId] = useState('');

  // A material change cannot be low risk and cannot skip re-review, so the form stops
  // offering the combination rather than letting it be refused.
  const material = MATERIAL_CHANGE_CLASSES.includes(changeClass as never);

  async function post(payload: Record<string, unknown>, fallback: string) {
    setBusy(true);
    setError(null);
    const res = await fetch('/api/review/requirements', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = (await res.json().catch(() => null)) as
      | { ok: boolean; message?: string }
      | null;
    setBusy(false);

    if (!json?.ok) {
      setError(json?.message ?? fallback);
      return;
    }
    startTransition(() => router.refresh());
  }

  async function submitCheck() {
    const checked = validateTechnicalCheckInput({ checkType, passed, evidence });
    if (!checked.ok) {
      setError(checked.message);
      return;
    }
    await post({ action: 'check', courseVersionId: versionId, ...checked.value },
      'Could not record that check.');
    setEvidence('');
  }

  async function submitAssessment() {
    const checked = validateChangeAssessmentInput({
      changeClass, riskLevel, requiresReReview, rationale, fromVersionId,
    });
    if (!checked.ok) {
      setError(checked.message);
      return;
    }
    await post({ action: 'assess', courseVersionId: versionId, ...checked.value },
      'Could not record that assessment.');
    setRationale('');
  }

  const earlier = versions.filter((v) => v.id !== versionId);

  return (
    <div className="stack">
      <div className="card">
        <div className="outline-h" style={{ marginTop: 0 }}>
          <h3 style={{ margin: 0 }}>Checks on this version</h3>
          <span className={`badge ${latestChecks.some((c) => !c.passed) ? 'warn' : 'neutral'}`}>
            {latestChecks.filter((c) => c.passed).length}/{latestChecks.length} passed
          </span>
        </div>

        {latestChecks.length === 0 ? (
          <p className="empty">Nothing checked yet.</p>
        ) : (
          <ul className="lessons">
            {latestChecks.map((c) => (
              <li key={c.id}>
                <span>
                  {TECHNICAL_CHECK_LABEL[c.checkType as keyof typeof TECHNICAL_CHECK_LABEL] ?? c.checkType}
                  {c.performedByName ? ` · ${c.performedByName}` : ''}
                  {c.performedAt ? ` · ${new Date(c.performedAt).toLocaleDateString()}` : ''}
                  {c.evidence ? ` · ${c.evidence}` : ''}
                </span>
                <span className={`badge ${c.passed ? 'ok' : 'warn'}`}>
                  {c.passed ? 'Passed' : 'Failed'}
                </span>
              </li>
            ))}
          </ul>
        )}

        <p className="meta">
          A failed check does not stop this version publishing and is not a review. It
          is what a reviewer reads before deciding, and the record that somebody looked.
        </p>

        {canCheck && (
          <details>
            <summary style={{ cursor: 'pointer', color: 'var(--green-700, #176b45)' }}>
              Record a check
            </summary>
            <div className="stack" style={{ marginTop: '0.75rem' }}>
              <div className="row" style={{ flexWrap: 'wrap' }}>
                <select
                  value={checkType}
                  onChange={(e) => setCheckType(e.target.value)}
                  aria-label="Which check"
                >
                  {TECHNICAL_CHECK_TYPES.map((t) => (
                    <option key={t} value={t}>{TECHNICAL_CHECK_LABEL[t]}</option>
                  ))}
                </select>
                <select
                  value={passed ? 'passed' : 'failed'}
                  onChange={(e) => setPassed(e.target.value === 'passed')}
                  aria-label="Did it pass"
                >
                  <option value="passed">Passed</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
              <textarea
                value={evidence}
                onChange={(e) => setEvidence(e.target.value)}
                rows={2}
                placeholder="What you looked at, and what you saw (optional)"
                aria-label="Evidence for the check"
                maxLength={2000}
                style={{ width: '100%' }}
              />
              <div>
                <button type="button" className="btn secondary" disabled={busy} onClick={submitCheck}>
                  {busy ? 'Recording…' : 'Record the check'}
                </button>
              </div>
            </div>
          </details>
        )}

        {checks.length > latestChecks.length && (
          <details>
            <summary style={{ cursor: 'pointer', color: 'var(--green-700, #176b45)' }}>
              All {checks.length} checks, including the ones a later check replaced
            </summary>
            <ul className="lessons" style={{ marginTop: '0.5rem' }}>
              {checks.map((c) => (
                <li key={c.id}>
                  <span>
                    {TECHNICAL_CHECK_LABEL[c.checkType as keyof typeof TECHNICAL_CHECK_LABEL] ?? c.checkType}
                    {c.performedByName ? ` · ${c.performedByName}` : ''}
                    {c.performedAt ? ` · ${new Date(c.performedAt).toLocaleString()}` : ''}
                    {c.evidence ? ` · ${c.evidence}` : ''}
                  </span>
                  <span className={`badge ${c.passed ? 'ok' : 'warn'}`}>
                    {c.passed ? 'Passed' : 'Failed'}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>

      <div className="card">
        <div className="outline-h" style={{ marginTop: 0 }}>
          <h3 style={{ margin: 0 }}>What changed in this version</h3>
          <span className="badge neutral">{assessments.length}</span>
        </div>

        {assessments.length === 0 ? (
          <p className="empty">
            No classification yet. {canAssess
              ? 'Say what changed and whether it needs a fresh review — it is what the next reviewer reads first.'
              : 'The author or governance staff classifies a change.'}
          </p>
        ) : (
          <ul className="lessons">
            {assessments.map((a) => (
              <li key={a.id}>
                <span>
                  {CHANGE_CLASS_LABEL[a.changeClass as keyof typeof CHANGE_CLASS_LABEL] ?? a.changeClass}
                  {' · '}{RISK_LEVEL_LABEL[a.riskLevel as keyof typeof RISK_LEVEL_LABEL] ?? a.riskLevel} risk
                  {' · '}{a.requiresReReview ? 'needs a fresh review' : 'does not need a fresh review'}
                  {a.assessedByName ? ` · ${a.assessedByName}` : ''}
                  {a.assessedAt ? ` · ${new Date(a.assessedAt).toLocaleDateString()}` : ''}
                  {` · ${a.rationale}`}
                </span>
                <span className={`badge ${a.riskLevel === 'critical' || a.riskLevel === 'high' ? 'warn' : 'neutral'}`}>
                  {a.requiresReReview ? 'Re-review' : 'No re-review'}
                </span>
              </li>
            ))}
          </ul>
        )}

        {canAssess && (
          <details>
            <summary style={{ cursor: 'pointer', color: 'var(--green-700, #176b45)' }}>
              Classify what changed
            </summary>
            <div className="stack" style={{ marginTop: '0.75rem' }}>
              <div className="row" style={{ flexWrap: 'wrap' }}>
                <select
                  value={changeClass}
                  onChange={(e) => {
                    setChangeClass(e.target.value);
                    if (MATERIAL_CHANGE_CLASSES.includes(e.target.value as never)) {
                      setRiskLevel('high');
                      setRequiresReReview(true);
                    }
                  }}
                  aria-label="What kind of change"
                >
                  {CHANGE_CLASSES.map((c) => (
                    <option key={c} value={c}>{CHANGE_CLASS_LABEL[c]}</option>
                  ))}
                </select>
                <select
                  value={riskLevel}
                  onChange={(e) => setRiskLevel(e.target.value)}
                  aria-label="How risky"
                  disabled={material}
                >
                  {RISK_LEVELS.map((r) => (
                    <option key={r} value={r}>{RISK_LEVEL_LABEL[r]}</option>
                  ))}
                </select>
                <label className="row" style={{ gap: '0.35rem' }}>
                  <input
                    type="checkbox"
                    checked={requiresReReview}
                    disabled={material}
                    onChange={(e) => setRequiresReReview(e.target.checked)}
                  />
                  <span className="meta">Needs a fresh review</span>
                </label>
                {earlier.length > 0 && (
                  <select
                    value={fromVersionId}
                    onChange={(e) => setFromVersionId(e.target.value)}
                    aria-label="The version this came from"
                  >
                    <option value="">Not copied from another version</option>
                    {earlier.map((v) => (
                      <option key={v.id} value={v.id}>Version {v.versionNumber}</option>
                    ))}
                  </select>
                )}
              </div>

              {material && (
                <p className="meta" style={{ marginTop: 0 }}>
                  A {CHANGE_CLASS_LABEL[changeClass as keyof typeof CHANGE_CLASS_LABEL].toLowerCase()} is
                  never low risk and always needs a fresh review, so those two are set
                  and locked. The database refuses the combination as well; the form
                  simply does not offer it.
                </p>
              )}

              <textarea
                value={rationale}
                onChange={(e) => setRationale(e.target.value)}
                rows={3}
                placeholder="What changed, in your own words"
                aria-label="Why it is classified this way"
                maxLength={2000}
                style={{ width: '100%' }}
              />
              <div>
                <button type="button" className="btn secondary" disabled={busy} onClick={submitAssessment}>
                  {busy ? 'Recording…' : 'Record the classification'}
                </button>
              </div>
            </div>
          </details>
        )}
      </div>

      {error && <p className="danger" style={{ fontSize: '0.9rem' }} role="alert">{error}</p>}
    </div>
  );
}
