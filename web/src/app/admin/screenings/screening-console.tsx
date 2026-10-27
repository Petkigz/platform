'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  SCREENING_NOTHING_BLOCKED,
  SCREENING_OUTCOMES,
  screeningCountsSentence,
  screeningLine,
  screeningStatusLabel,
  type ScreeningRegister,
  type ScreeningRow,
} from '@/lib/screening';

/**
 * Recording a check, and reading the register.
 *
 * One form, opened against one teacher, because a form that is always on the page
 * invites a click before the evidence has been read. The evidence reference is
 * typed once and never rendered back: the field is cleared on save and prints
 * nothing, which is the only way a "where is the document" column can be honest.
 */
export function ScreeningConsole({
  register,
  canRecord,
}: {
  register: ScreeningRegister;
  canRecord: boolean;
}) {
  const router = useRouter();
  const [openFor, setOpenFor] = useState<string | null>(null);
  const [type, setType] = useState('');
  const [reference, setReference] = useState('');
  const [outcome, setOutcome] = useState<'passed' | 'failed'>('passed');
  const [validUntil, setValidUntil] = useState('');
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setType('');
    setReference('');
    setOutcome('passed');
    setValidUntil('');
    setNotes('');
  }

  async function submit(row: ScreeningRow) {
    setMessage(null);
    setSaved(null);
    if (type.trim().length < 2) {
      setMessage('Say what kind of check it was, in a few words.');
      return;
    }
    if (reference.trim().length < 2) {
      setMessage('Say where the document is held. It is stored and never shown again.');
      return;
    }
    const response = await fetch('/api/admin/screenings', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        action: 'record',
        userId: row.userId,
        screeningType: type.trim(),
        evidenceReference: reference.trim(),
        outcome,
        validUntil: validUntil || null,
        notes: notes.trim() || null,
      }),
    });
    const result = (await response.json().catch(() => null)) as
      | { ok?: boolean; message?: string }
      | null;
    if (!response.ok || result?.ok !== true) {
      setMessage(result?.message ?? 'The check could not be recorded.');
      return;
    }
    reset();
    setOpenFor(null);
    setSaved(`${row.name} — recorded.`);
    startTransition(() => router.refresh());
  }

  return (
    <>
      <p className="notice" style={{ maxWidth: '52rem' }}>
        <strong>Nothing here blocks a course yet.</strong> {SCREENING_NOTHING_BLOCKED}
      </p>

      <p style={{ marginTop: '1rem' }}>{screeningCountsSentence(register.counts)}</p>

      {register.teachers.length === 0 ? (
        <div className="empty" style={{ marginTop: '1rem' }}>
          No one holds the teacher role yet. Appoint a teacher on the{' '}
          <a href="/admin/teachers">teachers page</a> and they appear here.
        </div>
      ) : (
        <div className="scroll-x" style={{ marginTop: '1rem' }}>
          <table>
            <caption className="sr-only">Teachers and their latest screening record</caption>
            <thead>
              <tr>
                <th scope="col">Teacher</th>
                <th scope="col">Status</th>
                <th scope="col">Latest record</th>
                {canRecord && <th scope="col">Record a check</th>}
              </tr>
            </thead>
            <tbody>
              {register.teachers.map((row) => (
                <tr key={row.userId}>
                  <td>
                    <strong>{row.name}</strong>
                  </td>
                  <td>{screeningStatusLabel(row.status)}</td>
                  <td>
                    {screeningLine(row)}
                    {row.checkedByName && (
                      <span className="muted"> Recorded by {row.checkedByName}.</span>
                    )}
                  </td>
                  {canRecord && (
                    <td>
                      {openFor === row.userId ? (
                        <div style={{ display: 'grid', gap: '0.4rem', minWidth: '18rem' }}>
                          <label>
                            What kind of check
                            <input
                              type="text"
                              value={type}
                              maxLength={80}
                              onChange={(e) => setType(e.target.value)}
                              placeholder="Enhanced disclosure"
                            />
                          </label>
                          <label>
                            Where the document is held
                            <input
                              type="text"
                              value={reference}
                              maxLength={200}
                              onChange={(e) => setReference(e.target.value)}
                              placeholder="vault/2026/teacher-name.pdf"
                            />
                          </label>
                          <label>
                            Outcome
                            <select
                              value={outcome}
                              onChange={(e) => setOutcome(e.target.value === 'failed' ? 'failed' : 'passed')}
                            >
                              {SCREENING_OUTCOMES.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label>
                            Holds until (optional)
                            <input
                              type="date"
                              value={validUntil}
                              onChange={(e) => setValidUntil(e.target.value)}
                            />
                          </label>
                          <label>
                            Note for staff (optional)
                            <textarea
                              value={notes}
                              rows={2}
                              onChange={(e) => setNotes(e.target.value)}
                            />
                          </label>
                          <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
                            The reference is stored and never shown again — not to this page, not
                            to the teacher, not to support. A record cannot be edited or deleted
                            afterwards; a new check supersedes it.
                          </p>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              type="button"
                              className="btn"
                              disabled={pending}
                              onClick={() => void submit(row)}
                            >
                              {pending ? 'Saving…' : 'Record'}
                            </button>
                            <button
                              type="button"
                              className="btn secondary"
                              onClick={() => {
                                setOpenFor(null);
                                setMessage(null);
                                reset();
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="btn secondary"
                          onClick={() => {
                            setOpenFor(row.userId);
                            setMessage(null);
                            setSaved(null);
                            reset();
                          }}
                        >
                          Record a check
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {saved && (
        <p className="success" role="status">
          {saved}
        </p>
      )}
      {message && (
        <p className="danger" role="alert">
          {message}
        </p>
      )}

      <p className="muted" style={{ marginTop: '1.5rem', maxWidth: '52rem' }}>
        A teacher reads their own status on <a href="/teach">their teaching page</a>, and can ask
        you about it. The register never shows a learner here, and a learner is never screened.
        {canRecord ? '' : ' You can read this register but not record a check.'}
      </p>
    </>
  );
}
