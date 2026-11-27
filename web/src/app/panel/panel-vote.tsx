'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { createClient } from '@/lib/supabase/client';
import { panelVoteRefusalOf, type PanelVoteChoice, type PanelVoteWords } from '@/lib/panels';

/**
 * One vote, cast once.
 *
 * The reviewer is whoever is signed in — the function resolves the reviewer
 * profile from the session, so there is nothing here to spoof. A rationale is
 * optional because the owner has not required one; the vote itself is not.
 *
 * Since 2026-11-27 every sentence here is handed over by the page, in the
 * reader's language, and the database's own sentence is not printed. A vote
 * is cast once, so an answer nobody could read is not called a refusal: the
 * form says nobody can tell whether the vote was recorded and to look at
 * the case before voting again.
 */
export function PanelVote({ caseId, words }: { caseId: string; words: PanelVoteWords }) {
  const router = useRouter();
  const [vote, setVote] = useState<PanelVoteChoice>('approve');
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
        setError(words.refusals[panelVoteRefusalOf(rpcError)]);
        return;
      }
      router.refresh();
    } catch {
      setError(words.refusals.unsure);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="panel-vote" data-panel-vote>
      <p className="muted">{words.cannotUndo}</p>
      <fieldset>
        <legend>{words.yourVote}</legend>
        {(['approve', 'reject', 'abstain'] as const).map((option) => (
          <label key={option} htmlFor={`vote-${caseId}-${option}`}>
            <input
              id={`vote-${caseId}-${option}`}
              type="radio"
              name={`vote-${caseId}`}
              value={option}
              checked={vote === option}
              onChange={() => setVote(option)}
              disabled={busy}
            />
            <span>{words.choices[option]}</span>
          </label>
        ))}
      </fieldset>
      <label htmlFor={`rationale-${caseId}`}>{words.why}</label>
      <textarea
        id={`rationale-${caseId}`}
        value={rationale}
        onChange={(event) => setRationale(event.target.value)}
        rows={2}
        dir="auto"
        disabled={busy}
      />
      {error && <div className="notice error" role="alert">{error}</div>}
      <div>
        <button type="submit" className="btn" disabled={busy}>
          {busy ? words.recording : words.cast}
        </button>
      </div>
    </form>
  );
}
