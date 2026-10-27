'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { createClient } from '@/lib/supabase/client';
import { describePanelError, quorumSentence } from '@/lib/panels';

/**
 * One vote, cast once.
 *
 * The reviewer is whoever is signed in — the function resolves the reviewer
 * profile from the session, so there is nothing here to spoof. A rationale is
 * optional because the owner has not required one; the vote itself is not.
 */
export function PanelVote({
  caseId,
  quorum,
  cast,
}: {
  caseId: string;
  quorum: number;
  cast: number;
}) {
  const router = useRouter();
  const [vote, setVote] = useState<'approve' | 'reject' | 'abstain'>('approve');
  const [rationale, setRationale] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const supabase = createClient();
      const { error: rpcError } = await supabase.rpc('cast_panel_vote', {
        p_case_id: caseId,
        p_vote: vote,
        p_rationale: rationale.trim() ? rationale : null,
      });
      if (rpcError) {
        setError(describePanelError(rpcError.message));
        return;
      }
      router.refresh();
    } catch {
      setError('Could not reach the server. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ display: 'grid', gap: '0.5rem' }}>
      <p className="muted" style={{ margin: 0, fontSize: '0.9rem' }}>
        {quorumSentence(cast, quorum)} Voting cannot be undone.
      </p>
      <fieldset style={{ border: 0, padding: 0, margin: 0, display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <legend style={{ fontWeight: 600 }}>Your vote</legend>
        {(['approve', 'reject', 'abstain'] as const).map((option) => (
          <label key={option} htmlFor={`vote-${caseId}-${option}`} style={{ display: 'flex', gap: '0.35rem' }}>
            <input
              id={`vote-${caseId}-${option}`}
              type="radio"
              name={`vote-${caseId}`}
              value={option}
              checked={vote === option}
              onChange={() => setVote(option)}
              disabled={busy}
            />
            {option === 'approve' ? 'Approve' : option === 'reject' ? 'Reject' : 'Abstain'}
          </label>
        ))}
      </fieldset>
      <label htmlFor={`rationale-${caseId}`}>
        Why, in a sentence <span className="muted">(optional, kept with the case)</span>
      </label>
      <textarea
        id={`rationale-${caseId}`}
        value={rationale}
        onChange={(event) => setRationale(event.target.value)}
        rows={2}
        style={{ width: '100%', fontFamily: 'inherit' }}
        disabled={busy}
      />
      {error && <div className="notice error" role="alert">{error}</div>}
      <div>
        <button type="submit" className="btn" disabled={busy}>
          {busy ? 'Recording…' : 'Cast my vote'}
        </button>
      </div>
    </form>
  );
}
