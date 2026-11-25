'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { comingUp, dueNow, type HifzPassage, type HifzRecord } from '@/lib/hifz';
import {
  HIFZ_EXAMPLE,
  aroundLabel,
  hifzOutcomeOf,
  type HifzBoardWords,
  type HifzRefusal,
} from '@/lib/hifz-board-words';
import { ArabicInline } from '@/app/_shared/arabic-text';

type Reply = { status: number; body: { ok?: unknown; code?: unknown } | null };

/** One write. A reply that never came is status 0 with no body: nothing is known. */
async function send(payload: Record<string, unknown>): Promise<Reply> {
  try {
    const res = await fetch('/api/hifz', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = (await res.json().catch(() => null)) as Reply['body'];
    return { status: res.status, body: body && typeof body === 'object' ? body : null };
  } catch {
    return { status: 0, body: null };
  }
}

/** Something that just happened, with the passage it happened to set apart. */
type Notice = { sentence: string; label: string | null };

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
 *
 * **It holds no sentence of its own.** Every word is handed to it by the page
 * (`words`), in the reader's language, with the counts and the days already
 * written; `/api/hifz` answers by a name and the sentence for that name is in
 * `words.refusals`. A reply that is not an answer — nothing came back, or a
 * five hundred — is said as "could not confirm", and the list is read again,
 * because the write may have happened.
 */
export function HifzBoard({
  learnerId,
  record,
  isSelf,
  words,
}: {
  learnerId: string;
  record: HifzRecord;
  isSelf: boolean;
  words: HifzBoardWords;
}) {
  const router = useRouter();
  const passages = record.passages ?? [];

  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<HifzRefusal | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [confirmingArchive, setConfirmingArchive] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function post(payload: Record<string, unknown>, key: string) {
    setBusy(key);
    setError(null);
    setNotice(null);

    const { status, body } = await send(payload);

    setBusy(null);

    if (body?.ok === true && status >= 200 && status < 300) {
      startTransition(() => router.refresh());
      return true;
    }

    const outcome = hifzOutcomeOf(status, body?.code);
    setError(outcome);
    // The list on the screen may be behind what was saved: read it again.
    if (outcome === 'unconfirmed') startTransition(() => router.refresh());
    return false;
  }

  async function add(event: React.FormEvent) {
    event.preventDefault();
    const ok = await post({ action: 'add', learnerId, label }, 'add');
    if (ok) {
      setLabel('');
      setNotice({ sentence: words.added, label: null });
    }
  }

  async function review(passage: HifzPassage, outcome: 'solid' | 'shaky') {
    const ok = await post({ action: 'review', passageId: passage.id, outcome }, passage.id);
    if (!ok) return;
    setNotice({
      sentence: outcome === 'solid' ? words.movedOn : words.backTomorrow,
      label: passage.label,
    });
  }

  async function setStatus(passage: HifzPassage, status: 'learning' | 'memorised') {
    await post({ action: 'status', passageId: passage.id, status }, `status-${passage.id}`);
  }

  async function archive(passage: HifzPassage) {
    const ok = await post({ action: 'archive', passageId: passage.id }, `archive-${passage.id}`);
    setConfirmingArchive(null);
    if (ok) setNotice({ sentence: words.archived, label: passage.label });
  }

  const due = dueNow(passages);
  const soon = comingUp(passages);
  const verdicts = [
    { value: 'solid' as const, ...words.solid },
    { value: 'shaky' as const, ...words.shaky },
  ];

  const renderPassage = (passage: HifzPassage, dueToday: boolean) => {
    const said = words.passages[passage.id];
    return (
      <li key={passage.id} style={{ marginBottom: '0.9rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'baseline', flexWrap: 'wrap' }}>
          <strong style={{ flex: '1 1 12rem' }}>
            <ArabicInline text={passage.label} />
          </strong>
          {said && <span className="badge neutral">{said.due}</span>}
          {passage.status === 'memorised' && <span className="badge">{words.badge}</span>}
        </div>

        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
          {verdicts.map((verdict) => (
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
            {passage.status === 'memorised' ? words.stillLearning : words.memorisedIt}
          </button>

          {confirmingArchive === passage.id ? (
            <>
              <button
                type="button"
                className="btn secondary"
                disabled={busy === `archive-${passage.id}`}
                onClick={() => archive(passage)}
              >
                {words.takeOff}
              </button>
              <button type="button" className="linklike" onClick={() => setConfirmingArchive(null)}>
                {words.keep}
              </button>
            </>
          ) : (
            <button
              type="button"
              className="linklike"
              onClick={() => setConfirmingArchive(passage.id)}
            >
              {words.takeOff}
            </button>
          )}
        </div>

        {said && (
          <p className="muted" style={{ fontSize: '0.82rem', margin: '0.3rem 0 0' }}>
            {said.line}
          </p>
        )}
      </li>
    );
  };

  const [noticeBefore, noticeAfter] = notice ? aroundLabel(notice.sentence) : ['', ''];

  return (
    <div className="container section">
      <p className="eyebrow">{words.eyebrow}</p>
      <h1>{words.title}</h1>
      <p className="lede">{words.summary}</p>

      {error && (
        <p className="notice error" role="alert" style={{ marginBottom: '1rem' }}>
          {words.refusals[error]}
        </p>
      )}
      {notice && (
        <p className="notice" role="status" style={{ marginBottom: '1rem' }}>
          {noticeBefore}
          {/* What the learner typed, as typed. */}
          {notice.label !== null && <bdi>{notice.label}</bdi>}
          {noticeAfter}
        </p>
      )}

      <section className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ marginTop: 0 }}>{words.dueToday}</h2>
        {!isSelf && (
          <p className="muted" style={{ marginTop: 0, fontSize: '0.9rem' }}>
            {words.forFamily}
          </p>
        )}
        {due.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            {words.nothingDue}
          </p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {due.map((passage) => renderPassage(passage, true))}
          </ul>
        )}
      </section>

      {soon.length > 0 && (
        <section className="card" style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ marginTop: 0 }}>{words.comingUp}</h2>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {soon.map((passage) => renderPassage(passage, false))}
          </ul>
        </section>
      )}

      <section className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ marginTop: 0 }}>{words.addTitle}</h2>
        <form onSubmit={add} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <label htmlFor="hifz-label" className="sr-only">
            {words.addLabel}
          </label>
          <input
            id="hifz-label"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder={HIFZ_EXAMPLE}
            dir="auto"
            maxLength={200}
            style={{ flex: '1 1 16rem' }}
          />
          <button type="submit" className="btn" disabled={busy === 'add' || label.trim() === ''}>
            {words.addIt}
          </button>
        </form>
        <p className="muted" style={{ fontSize: '0.85rem', marginBottom: 0 }}>
          {words.addHelp}
        </p>
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>{words.howTitle}</h2>
        <p style={{ marginTop: 0 }}>{words.ladder}</p>
        <ul style={{ marginBottom: 0 }}>
          {verdicts.map((verdict) => (
            <li key={verdict.value}>
              <strong>{verdict.label}</strong> — {verdict.note}
            </li>
          ))}
        </ul>
      </section>

      <p style={{ marginTop: '1.5rem' }}>
        <Link href="/learn" className="btn secondary">
          {words.back}
        </Link>
      </p>
    </div>
  );
}
