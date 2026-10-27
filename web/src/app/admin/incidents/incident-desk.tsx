'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  CATEGORIES,
  SEVERITIES,
  impactSentence,
  obligationSentence,
  registerHeadline,
  severityLabel,
  statusLabel,
  type IncidentRegister,
  type IncidentSummary,
} from '@/lib/incidents';
import { IncidentCase } from './incident-case';

/**
 * The queue, and opening a new incident.
 *
 * The list is ordered by the database — open first, then severity, then newest —
 * so the page never re-sorts it into something calmer than the real order.
 */
export function IncidentDesk({ register }: { register: IncidentRegister }) {
  const router = useRouter();
  const [opening, setOpening] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [severity, setSeverity] = useState('major');
  const [discoveredAt, setDiscoveredAt] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function submit() {
    setMessage(null);
    if (title.trim().length < 3) {
      setMessage('Give the incident a title somebody can find it by.');
      return;
    }
    if (summary.trim().length < 20) {
      setMessage('Say what happened, in a sentence somebody else could act on.');
      return;
    }
    const response = await fetch('/api/admin/incidents', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        action: 'open',
        title: title.trim(),
        summary: summary.trim(),
        severity,
        discoveredAt: discoveredAt || null,
        categories,
      }),
    });
    const result = (await response.json().catch(() => null)) as
      | { ok?: boolean; message?: string; reference?: string }
      | null;
    if (!response.ok || result?.ok !== true) {
      setMessage(result?.message ?? 'The incident could not be opened.');
      return;
    }
    setTitle('');
    setSummary('');
    setSeverity('major');
    setDiscoveredAt('');
    setCategories([]);
    setOpening(false);
    startTransition(() => router.refresh());
  }

  return (
    <>
      <p className="notice" style={{ maxWidth: '56rem' }}>
        <strong>Nothing here detects a breach.</strong> The register is a place to write one
        down, work out who must be told and by when, and keep the timeline as it happens. It does
        not watch for anything, and it does not send the notifications it records.
      </p>

      <p style={{ marginTop: '1rem' }}>{registerHeadline(register)}</p>

      {register.counts.open === 0 && register.incidents.length === 0 ? (
        <div className="empty" style={{ marginTop: '1rem' }}>
          No incident has been recorded. Opening one costs nothing and is not an admission of
          anything — an empty register after two years is more likely a habit than a record.
        </div>
      ) : null}

      <div className="scroll-x" style={{ marginTop: '1rem' }}>
        <table>
          <caption className="sr-only">Incidents, open first, then by severity</caption>
          <thead>
            <tr>
              <th scope="col">Reference</th>
              <th scope="col">What happened</th>
              <th scope="col">State</th>
              <th scope="col">Affected</th>
              <th scope="col">Notifications</th>
              <th scope="col">Open</th>
            </tr>
          </thead>
          <tbody>
            {register.incidents.map((incident: IncidentSummary) => (
              <tr key={incident.id}>
                <td>
                  <strong>{incident.reference}</strong>
                  <div className="muted" style={{ fontSize: '0.85rem' }}>
                    {severityLabel(incident.severity)}
                  </div>
                </td>
                <td style={{ maxWidth: '26rem' }}>
                  {incident.title}
                  <div className="muted" style={{ fontSize: '0.85rem' }}>
                    {incident.summary}
                  </div>
                </td>
                <td>{statusLabel(incident.status)}</td>
                <td>{impactSentence(incident)}</td>
                <td>
                  {incident.obligations === 0 ? (
                    <span className="muted">Nobody recorded to tell</span>
                  ) : (
                    <>
                      {incident.told} told
                      {incident.waived > 0 ? `, ${incident.waived} decided against` : ''}
                      {incident.overdue > 0 ? (
                        <strong style={{ display: 'block' }}>
                          {incident.overdue} past the deadline
                        </strong>
                      ) : null}
                    </>
                  )}
                </td>
                <td>
                  <button type="button" className="btn secondary" onClick={() => setSelected(incident.id)}>
                    Open the record
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <IncidentCase incidentId={selected} onClose={() => setSelected(null)} />
      )}

      <section className="card" style={{ marginTop: '1.5rem' }}>
        <h2 style={{ marginTop: 0 }}>Record an incident</h2>
        {opening ? (
          <div style={{ display: 'grid', gap: '0.6rem', maxWidth: '40rem' }}>
            <label>
              What happened, in a few words
              <input
                type="text"
                value={title}
                maxLength={120}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="A backup was exposed"
              />
            </label>
            <label>
              What happened, for somebody who was not there
              <textarea
                value={summary}
                rows={3}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="A nightly backup was served without authentication for 40 minutes."
              />
            </label>
            <label>
              Severity
              <select value={severity} onChange={(e) => setSeverity(e.target.value)}>
                {SEVERITIES.map((s) => (
                  <option key={s} value={s}>
                    {severityLabel(s)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              When was it discovered (leave blank for now)
              <input
                type="datetime-local"
                value={discoveredAt}
                onChange={(e) => setDiscoveredAt(e.target.value)}
              />
            </label>
            <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
              <legend style={{ padding: 0, marginBottom: '0.3rem' }}>
                What kinds of data were involved
              </legend>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                {CATEGORIES.map((c) => (
                  <label key={c} style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                    <input
                      type="checkbox"
                      checked={categories.includes(c)}
                      onChange={(e) =>
                        setCategories(
                          e.target.checked ? [...categories, c] : categories.filter((x) => x !== c),
                        )
                      }
                    />
                    {c.replace(/_/g, ' ')}
                  </label>
                ))}
              </div>
            </fieldset>
            <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
              The reference is generated. Who has to be told, and by when, is added on the record
              afterwards — nothing here will guess a deadline for you.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" className="btn" disabled={pending} onClick={() => void submit()}>
                {pending ? 'Saving…' : 'Open the incident'}
              </button>
              <button type="button" className="btn secondary" onClick={() => setOpening(false)}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className="btn" onClick={() => setOpening(true)}>
            Open an incident
          </button>
        )}
      </section>

      {message && (
        <p className="danger" role="alert">
          {message}
        </p>
      )}

      <p className="muted" style={{ marginTop: '1.5rem', maxWidth: '56rem' }}>
        Everything on this page is a count. There is no field for a list of names and no export
        that produces one — a register that could name every affected child would be the most
        dangerous table on the platform. A learner who has to be told is reached through the
        notice text on their incident, delivered by hand until a provider exists.
      </p>
    </>
  );
}

export { obligationSentence };
