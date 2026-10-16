'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { SCOPE_LABEL, type ReviewScope, type Reviewer } from '@/lib/review';

/**
 * Assign a reviewer to one submitted version.
 *
 * The reviewer list is whatever `fetchAssignableReviewers` returned, which is
 * active profiles only. If it is empty the reason is shown rather than a dead
 * dropdown: a reviewer has to create their own profile before they can be
 * assigned one, because `reviewer_profiles_insert` only admits
 * `user_id = current_user_id()`.
 */
export function AssignForm({
  versionId,
  courseTitle,
  reviewers,
}: {
  versionId: string;
  courseTitle: string;
  reviewers: Reviewer[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reviewerProfileId, setReviewerProfileId] = useState(reviewers[0]?.reviewerProfileId ?? '');
  const [scope, setScope] = useState<ReviewScope>('scholarly');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [, startTransition] = useTransition();

  if (done) {
    return (
      <p className="meta" style={{ marginBottom: 0 }}>
        Assigned · {SCOPE_LABEL[scope]}
      </p>
    );
  }

  if (!open) {
    return (
      <button type="button" className="btn secondary" onClick={() => setOpen(true)}>
        Assign a reviewer
      </button>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const res = await fetch('/api/admin/reviews', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ versionId, reviewerProfileId, scope }),
    });
    const json = (await res.json().catch(() => null)) as { ok: boolean; message?: string };

    setBusy(false);
    if (!json.ok) {
      setError(json.message ?? 'Could not assign that reviewer.');
      return;
    }
    setDone(true);
    startTransition(() => router.refresh());
  }

  if (reviewers.length === 0) {
    return (
      <div className="notice warn" style={{ marginBottom: 0 }}>
        No active reviewers. A reviewer has to create their own profile before
        they can be assigned — staff cannot create one for them.
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="row" style={{ flexWrap: 'wrap' }}>
      <select
        value={reviewerProfileId}
        onChange={(e) => setReviewerProfileId(e.target.value)}
        aria-label={`Reviewer for ${courseTitle}`}
        required
      >
        {reviewers.map((r) => (
          <option key={r.reviewerProfileId} value={r.reviewerProfileId}>
            {r.displayName ?? 'Unnamed reviewer'}
          </option>
        ))}
      </select>

      <select
        value={scope}
        onChange={(e) => setScope(e.target.value as ReviewScope)}
        aria-label="Review scope"
      >
        {(Object.keys(SCOPE_LABEL) as ReviewScope[]).map((s) => (
          <option key={s} value={s}>
            {SCOPE_LABEL[s]}
          </option>
        ))}
      </select>

      <button type="submit" className="btn" disabled={busy}>
        {busy ? 'Assigning…' : 'Assign'}
      </button>

      {error && (
        <span className="danger" style={{ flexBasis: '100%', fontSize: '0.85rem' }} role="alert">
          {error}
        </span>
      )}
    </form>
  );
}
