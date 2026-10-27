'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  CLAIMANT_ROLES,
  HOLD_EFFECT,
  NO_MONEY_MOVES,
  OUTCOMES,
  TAKEDOWN_OUTCOME_LABEL,
  claimantRoleLabel,
  decisionProblem,
  holdingLine,
  moment,
  registerHeadline,
  takedownStatusLabel,
  type TakedownNotice,
  type TakedownRegister,
} from '@/lib/takedowns';

/**
 * Taking a notice, and deciding one.
 *
 * The form asks for the claim **in the words it was sent**, because an appeal reads
 * the same words as the original notice — a paraphrase entered today is a different
 * claim by the time somebody argues about it.
 */
export function TakedownDesk({
  register,
  canTake,
  canDecide,
  viewerId,
}: {
  register: TakedownRegister;
  canTake: boolean;
  canDecide: boolean;
  viewerId: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [versionId, setVersionId] = useState('');
  const [claimant, setClaimant] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('owner');
  const [work, setWork] = useState('');
  const [material, setMaterial] = useState('');
  const [noticeText, setNoticeText] = useState('');
  const [reviewBy, setReviewBy] = useState('');

  async function post(payload: Record<string, unknown>, done: string) {
    setMessage(null);
    setSaved(null);
    const response = await fetch('/api/admin/takedowns', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = (await response.json().catch(() => null)) as
      | { ok?: boolean; message?: string }
      | null;
    if (!response.ok || result?.ok !== true) {
      setMessage(result?.message ?? 'That was refused.');
      return false;
    }
    setSaved(done);
    startTransition(() => router.refresh());
    return true;
  }

  async function take() {
    if (!versionId) {
      setMessage('Choose the version the claim is about.');
      return;
    }
    const ok = await post(
      {
        action: 'open',
        versionId,
        claimantName: claimant.trim(),
        claimantEmail: email.trim() || null,
        claimantRole: role,
        workDescription: work.trim(),
        materialDescription: material.trim(),
        noticeText: noticeText.trim(),
        reviewBy: reviewBy || null,
      },
      'Held. Learners can no longer reach it, and the teacher has been told on their own page.',
    );
    if (ok) {
      setVersionId('');
      setClaimant('');
      setEmail('');
      setWork('');
      setMaterial('');
      setNoticeText('');
      setReviewBy('');
    }
  }

  return (
    <>
      <p className="notice" style={{ maxWidth: '56rem' }}>
        <strong>A hold stops distribution; it does not decide the claim.</strong> {HOLD_EFFECT}
      </p>
      <p className="muted" style={{ maxWidth: '56rem' }}>
        {NO_MONEY_MOVES}
      </p>

      <p style={{ marginTop: '1rem' }}>{registerHeadline(register)}</p>

      {register.notices.length === 0 ? (
        <div className="empty" style={{ marginTop: '1rem' }}>
          No notice has been recorded. When one arrives — to whatever address the owner publishes —
          enter it here rather than deleting the course: a deletion cannot be answered and cannot be
          appealed.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '0.9rem', marginTop: '1rem' }}>
          {register.notices.map((notice) => (
            <NoticeCard
              key={notice.id}
              notice={notice}
              canDecide={canDecide}
              viewerOpenedIt={notice.openedByMe}
              viewerIsOwner={viewerId.length > 0 && notice.openedByMe}
              onDecide={(outcome, reason) =>
                post({ action: 'decide', noticeId: notice.id, outcome, reason }, 'Decided.')
              }
              busy={pending}
              onMessage={setMessage}
            />
          ))}
        </div>
      )}

      {canTake && (
        <section className="card" style={{ marginTop: '1.5rem' }}>
          <h2 style={{ marginTop: 0 }}>Take a notice</h2>
          <div style={{ display: 'grid', gap: '0.6rem', maxWidth: '44rem' }}>
            <label>
              Which published version
              <select value={versionId} onChange={(e) => setVersionId(e.target.value)}>
                <option value="">Choose a version</option>
                {register.candidates.map((c) => (
                  <option key={c.versionId} value={c.versionId}>
                    {c.courseTitle} — version {c.versionNumber}
                    {c.teacher ? ` (${c.teacher})` : ''}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Who is claiming
              <input type="text" value={claimant} maxLength={120} onChange={(e) => setClaimant(e.target.value)} />
            </label>
            <label>
              How to reach them (optional)
              <input type="email" value={email} maxLength={160} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label>
              In what capacity
              <select value={role} onChange={(e) => setRole(e.target.value)}>
                {CLAIMANT_ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              What work is claimed
              <input
                type="text"
                value={work}
                maxLength={200}
                onChange={(e) => setWork(e.target.value)}
                placeholder="The Sealed Nectar, 1976 edition"
              />
            </label>
            <label>
              Where in the material it appears
              <input
                type="text"
                value={material}
                maxLength={200}
                onChange={(e) => setMaterial(e.target.value)}
                placeholder="Lesson 3, the narration from 4:10 to 9:30"
              />
            </label>
            <label>
              The claim, in the words it was sent
              <textarea
                value={noticeText}
                rows={4}
                onChange={(e) => setNoticeText(e.target.value)}
                placeholder="Paste the notice. An appeal reads these words."
              />
            </label>
            <label>
              Look at it again by (optional, and nothing lifts on a timer)
              <input type="date" value={reviewBy} onChange={(e) => setReviewBy(e.target.value)} />
            </label>
            <button
              type="button"
              className="btn"
              disabled={pending}
              onClick={() => void take()}
            >
              Hold it and record the notice
            </button>
            <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
              The hold takes effect with this click. The teacher sees the claim on their teaching
              page and can answer it once; you do not decide your own notice.
            </p>
          </div>
        </section>
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
    </>
  );
}

function NoticeCard({
  notice,
  canDecide,
  viewerOpenedIt,
  busy,
  onDecide,
  onMessage,
}: {
  notice: TakedownNotice;
  canDecide: boolean;
  viewerOpenedIt: boolean;
  viewerIsOwner: boolean;
  busy: boolean;
  onDecide: (outcome: string, reason: string) => void;
  onMessage: (message: string | null) => void;
}) {
  const [reason, setReason] = useState('');
  const [outcome, setOutcome] = useState('upheld');
  const problem = decisionProblem(notice, viewerOpenedIt);
  void onMessage;

  return (
    <section className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0 }}>
            {notice.reference} — {notice.courseTitle} v{notice.versionNumber}
          </h2>
          <p className="muted" style={{ margin: '0.2rem 0 0' }}>
            {takedownStatusLabel(notice.status)} · received {moment(notice.receivedAt)}
            {notice.teacher ? ` · by ${notice.teacher}` : ''}
          </p>
        </div>
        <div className="muted" style={{ fontSize: '0.9rem', maxWidth: '22rem' }}>
          {notice.status === 'held' ? holdingLine(notice) : notice.reason ?? ''}
        </div>
      </div>

      <p style={{ marginBottom: '0.25rem' }}>
        <strong>{notice.claimant}</strong>, {claimantRoleLabel(notice.claimantRole)}, claims{' '}
        <em>{notice.work}</em>.
      </p>
      <p style={{ marginTop: 0 }}>{notice.material}</p>
      <blockquote
        style={{
          margin: '0.5rem 0',
          padding: '0.5rem 0.9rem',
          borderLeft: '3px solid var(--border)',
          whiteSpace: 'pre-wrap',
        }}
      >
        {notice.noticeText}
      </blockquote>

      {notice.answered ? (
        <div style={{ marginTop: '0.5rem' }}>
          <strong>The teacher’s answer</strong>
          <p style={{ whiteSpace: 'pre-wrap', margin: '0.25rem 0 0' }}>{notice.response}</p>
        </div>
      ) : (
        <p className="muted">Not answered yet. The teacher sees it on their teaching page.</p>
      )}

      {notice.status === 'held' && canDecide && (
        <div style={{ marginTop: '0.75rem', display: 'grid', gap: '0.5rem', maxWidth: '40rem' }}>
          <label>
            Decision
            <select value={outcome} onChange={(e) => setOutcome(e.target.value)}>
              {OUTCOMES.map((o) => (
                <option key={o} value={o}>
                  {TAKEDOWN_OUTCOME_LABEL[o]}
                </option>
              ))}
            </select>
          </label>
          <label>
            The reason, which the claimant and the teacher both read
            <textarea value={reason} rows={3} onChange={(e) => setReason(e.target.value)} />
          </label>
          <button
            type="button"
            className="btn"
            disabled={busy || problem !== null || reason.trim().length < 10}
            title={problem ?? ''}
            onClick={() => onDecide(outcome, reason.trim())}
          >
            Decide it
          </button>
          {problem && (
            <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
              {problem}
            </p>
          )}
        </div>
      )}

      {notice.status === 'held' && !canDecide && (
        <p className="muted">The owner or governance staff decide this one.</p>
      )}
    </section>
  );
}
