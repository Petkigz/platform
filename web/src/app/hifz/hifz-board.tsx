'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import {
  HIFZ_VERDICTS,
  comingUp,
  dueLabel,
  dueNow,
  hifzErrorMessage,
  hifzSentence,
  ladderSentence,
  type HifzPassage,
  type HifzRecord,
} from '@/lib/hifz';
import { ArabicInline } from '@/app/_shared/arabic-text';

/**
 * The memorisation list.
 *
 * Two lists and one form. **Due today** is what the learner came for; **coming
 * up** is everything else with its date, because a schedule you cannot see is a
 * schedule you stop trusting. The verdict buttons sit on each due passage and do
 * exactly one thing — move a date — and the sentence beside them says which way.
 *
 * Nothing here counts a streak, awards anything or says a review went badly. A
 * lapse moves a number back to one day and the page says so in those words.
 */
export function HifzBoard({
  learnerId,
  record,
  isSelf,
}: {
  learnerId: string;
  record: HifzRecord;
  isSelf: boolean;
}) {
  const router = useRouter();
  const passages = record.passages ?? [];

  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmingArchive, setConfirmingArchive] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function post(payload: Record<string, unknown>, key: string) {
    setBusy(key);
    setError(null);
    setNotice(null);

    const res = await fetch('/api/hifz', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = (await res.json().catch(() => null)) as
      | { ok: boolean; message?: string; value?: { intervalDays?: number; nextDueOn?: string } }
      | null;

    setBusy(null);

    if (!body) {
      setError('That did not reach the server. Check the connection and try again.');
      return false;
    }
    if (!body.ok) {
      setError(hifzErrorMessage(body.message ?? ''));
      return false;
    }

    startTransition(() => router.refresh());
    return true;
  }

  async function add(event: React.FormEvent) {
    event.preventDefault();
    const ok = await post({ action: 'add', learnerId, label }, 'add');
    if (ok) {
      setLabel('');
      setNotice('Added. It comes back tomorrow unless you review it first.');
    }
  }

  async function review(passage: HifzPassage, outcome: 'solid' | 'shaky') {
    const ok = await post({ action: 'review', passageId: passage.id, outcome }, passage.id);
    if (!ok) return;

    const next = outcome === 'solid'
      ? 'Moved one step further along the schedule.'
      : 'Back to tomorrow.';
    setNotice(`“${passage.label}”: ${next}`);
  }

  async function setStatus(passage: HifzPassage, status: 'learning' | 'memorised') {
    await post({ action: 'status', passageId: passage.id, status }, `status-${passage.id}`);
  }

  async function archive(passage: HifzPassage) {
    const ok = await post({ action: 'archive', passageId: passage.id }, `archive-${passage.id}`);
    setConfirmingArchive(null);
    if (ok) setNotice(`“${passage.label}” is off the list. Its reviews are kept.`);
  }

  const due = dueNow(passages);
  const soon = comingUp(passages);

  const renderPassage = (passage: HifzPassage, dueToday: boolean) => (
    <li key={passage.id} style={{ marginBottom: '0.9rem' }}>
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'baseline', flexWrap: 'wrap' }}>
        <strong style={{ flex: '1 1 12rem' }}>
          <ArabicInline text={passage.label} />
        </strong>
        <span className="badge neutral">{dueLabel(passage.daysUntilDue)}</span>
        {passage.status === 'memorised' && <span className="badge">Memorised</span>}
      </div>

      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
        {HIFZ_VERDICTS.map((verdict) => (
          <button
            key={verdict.value}
            type="button"
            className={dueToday && verdict.value === 'solid' ? 'btn' : 'btn secondary'}
            disabled={busy === passage.id}
            onClick={() => review(passage, verdict.value)}
            title={verdict.note}
          >
            {verdict.label}
          </button>
        ))}

        <button
          type="button"
          className="btn secondary"
          disabled={busy === `status-${passage.id}`}
          onClick={() =>
            setStatus(passage, passage.status === 'memorised' ? 'learning' : 'memorised')
          }
        >
          {passage.status === 'memorised' ? 'Still learning it' : 'I have memorised it'}
        </button>

        {confirmingArchive === passage.id ? (
          <>
            <button
              type="button"
              className="btn secondary"
              disabled={busy === `archive-${passage.id}`}
              onClick={() => archive(passage)}
            >
              Take it off the list
            </button>
            <button type="button" className="linklike" onClick={() => setConfirmingArchive(null)}>
              Keep it
            </button>
          </>
        ) : (
          <button
            type="button"
            className="linklike"
            onClick={() => setConfirmingArchive(passage.id)}
          >
            Take it off the list
          </button>
        )}
      </div>

      <p className="muted" style={{ fontSize: '0.82rem', margin: '0.3rem 0 0' }}>
        {passage.reviewCount === 0
          ? 'Not reviewed yet.'
          : `Reviewed ${passage.reviewCount} ${passage.reviewCount === 1 ? 'time' : 'times'}.`}{' '}
        {passage.intervalDays === 1 ? 'Next in a day.' : `Next in ${passage.intervalDays} days.`}
        {passage.lapses > 0 && (
          <>
            {' '}
            {passage.lapses === 1 ? 'Once it needed' : `${passage.lapses} times it needed`}{' '}
            bringing back to the start.
          </>
        )}
      </p>
    </li>
  );

  return (
    <div className="container section">
      <p className="eyebrow">My learning</p>
      <h1>Memorisation</h1>
      <p className="lede">{hifzSentence(record)}</p>

      {error && (
        <p className="notice error" role="alert" style={{ marginBottom: '1rem' }}>
          {error}
        </p>
      )}
      {notice && (
        <p className="notice" role="status" style={{ marginBottom: '1rem' }}>
          {notice}
        </p>
      )}

      <section className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ marginTop: 0 }}>Due today</h2>
        {!isSelf && (
          <p className="muted" style={{ marginTop: 0, fontSize: '0.9rem' }}>
            You are reading a learner in your family. Anything you mark here is recorded against
            their list, with your account as the person who did it.
          </p>
        )}
        {due.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            Nothing is due today. Whatever is scheduled is under “coming up”.
          </p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {due.map((passage) => renderPassage(passage, true))}
          </ul>
        )}
      </section>

      {soon.length > 0 && (
        <section className="card" style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ marginTop: 0 }}>Coming up</h2>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {soon.map((passage) => renderPassage(passage, false))}
          </ul>
        </section>
      )}

      <section className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ marginTop: 0 }}>Add a passage</h2>
        <form onSubmit={add} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <label htmlFor="hifz-label" className="sr-only">
            What are you memorising?
          </label>
          <input
            id="hifz-label"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="Al-Fatihah 1–7"
            maxLength={200}
            style={{ flex: '1 1 16rem' }}
          />
          <button type="submit" className="btn" disabled={busy === 'add' || label.trim() === ''}>
            Add it
          </button>
        </form>
        <p className="muted" style={{ fontSize: '0.85rem', marginBottom: 0 }}>
          Your own words are enough — a surah and a range, a du‘a, a passage of a matn. The
          platform does not hold the text and does not check it; this is a date to come back to,
          not an assessment.
        </p>
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>How the schedule works</h2>
        <p style={{ marginTop: 0 }}>{ladderSentence(record.ladder)}</p>
        <ul style={{ marginBottom: 0 }}>
          {HIFZ_VERDICTS.map((verdict) => (
            <li key={verdict.value}>
              <strong>{verdict.label}</strong> — {verdict.note}
            </li>
          ))}
        </ul>
      </section>

      <p style={{ marginTop: '1.5rem' }}>
        <Link href="/learn" className="btn secondary">
          Back to my learning
        </Link>
      </p>
    </div>
  );
}
