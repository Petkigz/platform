'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  NOTICE_NOT_SENT,
  categoryLabels,
  impactSentence,
  nextStateProblem,
  nextStates,
  obligationLabel,
  obligationSentence,
  severityLabel,
  statusLabel,
  timeUntil,
  type IncidentDetail,
} from '@/lib/incidents';

/**
 * One incident, worked end to end.
 *
 * Every control here calls a function that takes no actor and checks the caller's
 * role itself, so nothing on this page is a boundary — it is a convenience over one.
 * The three things it makes visible, because the database makes them true:
 *
 *   * a notification that is overdue, in hours, in the row;
 *   * a decision **not** to tell somebody, with the reason, which stays on the
 *     record rather than removing it; and
 *   * the reason a state change is not available yet, printed beside the button
 *     instead of a click being refused.
 */
export function IncidentCase({ incidentId, onClose }: { incidentId: string; onClose: () => void }) {
  const [detail, setDetail] = useState<IncidentDetail | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [people, setPeople] = useState('0');
  const [children, setChildren] = useState('0');
  const [teachers, setTeachers] = useState('0');
  const [harm, setHarm] = useState('');

  const [audience, setAudience] = useState('');
  const [basis, setBasis] = useState('');
  const [dueAt, setDueAt] = useState('');

  const [entry, setEntry] = useState('');
  const [entryKind, setEntryKind] = useState('update');
  const [notice, setNotice] = useState('');
  const [lessons, setLessons] = useState('');
  const [reason, setReason] = useState('');

  const load = useCallback(async () => {
    const response = await fetch(`/api/admin/incidents?incident=${encodeURIComponent(incidentId)}`);
    const result = (await response.json().catch(() => null)) as
      | { ok?: boolean; message?: string; detail?: IncidentDetail }
      | null;
    if (!response.ok || result?.ok !== true || !result.detail) {
      setMessage(result?.message ?? 'The incident could not be read.');
      return;
    }
    setDetail(result.detail);
    setNotice(result.detail.incident.learnerNotice ?? '');
    setLessons(result.detail.incident.lessons ?? '');
    setPeople(String(result.detail.incident.people));
    setChildren(String(result.detail.incident.children));
    setTeachers(String(result.detail.incident.teachers));
    setHarm(result.detail.incident.harm ?? '');
  }, [incidentId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function send(payload: Record<string, unknown>, done?: string) {
    setBusy(true);
    setMessage(null);
    const response = await fetch('/api/admin/incidents', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...payload, incidentId }),
    });
    const result = (await response.json().catch(() => null)) as
      | { ok?: boolean; message?: string }
      | null;
    setBusy(false);
    if (!response.ok || result?.ok !== true) {
      setMessage(result?.message ?? 'That change was refused.');
      return false;
    }
    if (done) setMessage(done);
    await load();
    return true;
  }

  if (!detail) {
    return (
      <section className="card" style={{ marginTop: '1.5rem' }}>
        <p>{message ?? 'Reading the incident…'}</p>
        <button type="button" className="btn secondary" onClick={onClose}>
          Close
        </button>
      </section>
    );
  }

  const inc = detail.incident;
  const states = nextStates(detail);
  const open = inc.status !== 'closed';

  return (
    <section className="card" style={{ marginTop: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0 }}>
            {inc.reference} — {inc.title}
          </h2>
          <p className="muted" style={{ margin: '0.25rem 0 0' }}>
            {severityLabel(inc.severity)} · {statusLabel(inc.status)} · discovered{' '}
            {new Date(inc.discoveredAt).toLocaleString('en-GB')}
            {inc.openedBy ? ` · opened by ${inc.openedBy}` : ''}
          </p>
        </div>
        <button type="button" className="btn secondary" onClick={onClose}>
          Close the record
        </button>
      </div>

      <p style={{ marginTop: '0.75rem' }}>{inc.summary}</p>
      <p className="muted" style={{ marginTop: 0 }}>
        {categoryLabels(inc.categories).join(' · ')}
      </p>

      {/* ---------------------------------------------------------------- state */}
      <h3>Move it on</h3>
      <p className="muted" style={{ marginTop: 0, fontSize: '0.9rem' }}>
        One step at a time, with a written reason. Nothing resolves while a notification is
        neither told nor decided against, and nothing closes without a recorded lesson.
      </p>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {states.map((next) => {
          const problem = nextStateProblem(detail, next);
          return (
            <button
              key={next}
              type="button"
              className="btn secondary"
              disabled={busy || problem !== null}
              title={problem ?? ''}
              onClick={() => {
                if (next === 'open' && inc.status === 'closed') {
                  void send({ action: 'status', status: 'open', reason: reason || 'Reopened.' });
                  return;
                }
                void send({
                  action: 'status',
                  status: next,
                  reason: reason || `${statusLabel(inc.status)} → ${statusLabel(next)}.`,
                });
              }}
            >
              {next === 'open' ? 'Reopen' : `Mark ${statusLabel(next).toLowerCase()}`}
            </button>
          );
        })}
      </div>
      <label style={{ display: 'block', marginTop: '0.5rem', maxWidth: '40rem' }}>
        Why (used for the state change; five characters at least)
        <input type="text" value={reason} maxLength={200} onChange={(e) => setReason(e.target.value)} />
      </label>
      {states.map((next) => {
        const problem = nextStateProblem(detail, next);
        return problem ? (
          <p key={next} className="muted" style={{ margin: '0.25rem 0 0', fontSize: '0.85rem' }}>
            {statusLabel(next)}: {problem}
          </p>
        ) : null;
      })}

      {/* --------------------------------------------------------------- impact */}
      <h3>Who was affected</h3>
      <p style={{ marginTop: 0 }}>{impactSentence(inc)}</p>
      {open && (
        <div style={{ display: 'grid', gap: '0.4rem', maxWidth: '32rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <label>
              People
              <input
                type="number"
                min={0}
                value={people}
                onChange={(e) => setPeople(e.target.value)}
                style={{ width: '6rem' }}
              />
            </label>
            <label>
              Of whom children
              <input
                type="number"
                min={0}
                value={children}
                onChange={(e) => setChildren(e.target.value)}
                style={{ width: '6rem' }}
              />
            </label>
            <label>
              Of whom teachers
              <input
                type="number"
                min={0}
                value={teachers}
                onChange={(e) => setTeachers(e.target.value)}
                style={{ width: '6rem' }}
              />
            </label>
          </div>
          <label>
            What could go wrong for them
            <textarea
              value={harm}
              rows={2}
              onChange={(e) => setHarm(e.target.value)}
              placeholder="Names and email addresses were readable by anybody with the URL."
            />
          </label>
          <button
            type="button"
            className="btn secondary"
            disabled={busy}
            onClick={() =>
              void send({
                action: 'impact',
                people: Number(people),
                children: Number(children),
                teachers: Number(teachers),
                harm: harm.trim() || null,
              })
            }
          >
            Save the counts
          </button>
          <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
            Counts only. There is no field for a name here, and the database would not hold one.
          </p>
        </div>
      )}

      {/* --------------------------------------------------------- obligations */}
      <h3>Who has to be told</h3>
      {detail.notifications.length === 0 ? (
        <p className="notice warn" style={{ maxWidth: '44rem' }}>
          <strong>Nobody is recorded to tell.</strong> That is either true of this incident or it
          is an obligation nobody has thought of yet. The register cannot tell the difference, so
          it says so instead of assuming.
        </p>
      ) : (
        <div className="scroll-x">
          <table>
            <caption className="sr-only">Obligations to notify, and whether they were met</caption>
            <thead>
              <tr>
                <th scope="col">Who</th>
                <th scope="col">Basis</th>
                <th scope="col">Deadline</th>
                <th scope="col">State</th>
              </tr>
            </thead>
            <tbody>
              {detail.notifications.map((n) => (
                <tr key={n.id}>
                  <td>
                    <strong>{n.audience}</strong>
                    <div className="muted" style={{ fontSize: '0.85rem' }}>
                      {obligationSentence(n)}
                    </div>
                  </td>
                  <td style={{ maxWidth: '18rem' }}>{n.basis}</td>
                  <td>
                    {new Date(n.dueAt).toLocaleString('en-GB')}
                    <div className="muted" style={{ fontSize: '0.85rem' }}>
                      {n.toldAt === null && n.waivedAt === null ? timeUntil(n.dueAt) : ''}
                    </div>
                  </td>
                  <td>
                    {obligationLabel(n.state)}
                    {n.toldAt === null && n.waivedAt === null && open && (
                      <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="btn secondary"
                          disabled={busy}
                          onClick={() => {
                            const method = window.prompt('How were they told? A letter, an email, a call.');
                            if (!method || method.trim().length < 2) return;
                            void send({ action: 'notified', notificationId: n.id, method: method.trim() });
                          }}
                        >
                          Mark told
                        </button>
                        <button
                          type="button"
                          className="btn secondary"
                          disabled={busy}
                          onClick={() => {
                            const why = window.prompt(
                              'Why is this body not being told? The reason stays on the record.',
                            );
                            if (!why || why.trim().length < 10) return;
                            void send({ action: 'waive', notificationId: n.id, reason: why.trim() });
                          }}
                        >
                          Decide not to
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <div style={{ display: 'grid', gap: '0.4rem', maxWidth: '40rem', marginTop: '0.75rem' }}>
          <label>
            Add an obligation
            <input
              type="text"
              value={audience}
              maxLength={120}
              onChange={(e) => setAudience(e.target.value)}
              placeholder="The data protection authority"
            />
          </label>
          <label>
            On what basis
            <input
              type="text"
              value={basis}
              maxLength={200}
              onChange={(e) => setBasis(e.target.value)}
              placeholder="The 72-hour rule for personal data breaches"
            />
          </label>
          <label>
            By when — you decide this, nothing here computes it
            <input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
          </label>
          <button
            type="button"
            className="btn secondary"
            disabled={busy || !audience.trim() || !basis.trim() || !dueAt}
            onClick={async () => {
              const ok = await send({
                action: 'obligation',
                audience: audience.trim(),
                basis: basis.trim(),
                dueAt: new Date(dueAt).toISOString(),
              });
              if (ok) {
                setAudience('');
                setBasis('');
                setDueAt('');
              }
            }}
          >
            Record the obligation
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------- notice */}
      <h3>What a learner would be told</h3>
      <p className="muted" style={{ marginTop: 0 }}>
        {NOTICE_NOT_SENT}
      </p>
      {open && (
        <div style={{ display: 'grid', gap: '0.4rem', maxWidth: '44rem' }}>
          <label>
            The notice
            <textarea
              value={notice}
              rows={5}
              onChange={(e) => setNotice(e.target.value)}
              placeholder="What happened, what it means for you, and what to do."
            />
          </label>
          <button
            type="button"
            className="btn secondary"
            disabled={busy || notice.trim().length < 20}
            onClick={() => void send({ action: 'notice', notice: notice.trim() })}
          >
            Save the notice
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------ lessons */}
      <h3>What changed because of it</h3>
      <p className="muted" style={{ marginTop: 0 }}>
        Required before the record can be closed. An incident closed with no change recorded is a
        promise to have the same one again.
      </p>
      {open && (
        <div style={{ display: 'grid', gap: '0.4rem', maxWidth: '44rem' }}>
          <textarea
            aria-label="What changed because of it"
            value={lessons}
            rows={3}
            onChange={(e) => setLessons(e.target.value)}
            placeholder="Backup objects are private by default and the storage policy is checked in CI."
          />
          <button
            type="button"
            className="btn secondary"
            disabled={busy || lessons.trim().length < 20}
            onClick={() => void send({ action: 'lesson', lessons: lessons.trim() })}
          >
            Save the lesson
          </button>
        </div>
      )}

      {/* ---------------------------------------------------------------- log */}
      <h3>What was done, in order</h3>
      {open && (
        <div style={{ display: 'grid', gap: '0.4rem', maxWidth: '44rem' }}>
          <label>
            Add a line
            <textarea
              value={entry}
              rows={2}
              onChange={(e) => setEntry(e.target.value)}
              placeholder="Removed the public route and rotated the storage key."
            />
          </label>
          <label>
            Kind
            <select value={entryKind} onChange={(e) => setEntryKind(e.target.value)}>
              <option value="update">Update</option>
              <option value="containment">Containment</option>
              <option value="decision">Decision</option>
              <option value="lesson">Lesson</option>
            </select>
          </label>
          <button
            type="button"
            className="btn secondary"
            disabled={busy || entry.trim().length < 5}
            onClick={async () => {
              const ok = await send({ action: 'entry', body: entry.trim(), kind: entryKind });
              if (ok) setEntry('');
            }}
          >
            Add to the log
          </button>
        </div>
      )}

      <ol style={{ marginTop: '0.75rem', paddingLeft: '1.1rem' }}>
        {detail.entries.map((e) => (
          <li key={e.id} style={{ marginBottom: '0.4rem' }}>
            <span className="muted" style={{ fontSize: '0.85rem' }}>
              {new Date(e.at).toLocaleString('en-GB')}
              {e.actor ? ` · ${e.actor}` : ''} · {e.kind}
            </span>
            <div>{e.body}</div>
          </li>
        ))}
      </ol>
      <p className="muted" style={{ fontSize: '0.85rem' }}>
        The log cannot be edited or deleted. A correction is another line, which is what a record
        of an incident is supposed to look like.
      </p>

      {message && (
        <p className="success" role="status">
          {message}
        </p>
      )}
    </section>
  );
}
