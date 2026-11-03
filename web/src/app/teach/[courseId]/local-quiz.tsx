'use client';

import { useState } from 'react';

type Draft = { question: string; answer: string };

export function LocalQuiz({ courseId, enabled }: { courseId: string; enabled: boolean }) {
  const [source, setSource] = useState('');
  const [draft, setDraft] = useState<Draft[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function generate() {
    setBusy(true);
    setError('');
    setDraft([]);
    try {
      const response = await fetch('/api/teach/local-quiz', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ courseId, source }),
      });
      const data = await response.json() as { questions?: Draft[]; error?: string };
      if (!response.ok || !Array.isArray(data.questions)) {
        setError(data.error ?? 'Could not draft questions.');
      } else {
        setDraft(data.questions);
      }
    } catch {
      setError('Could not reach the platform. Nothing was saved.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card" style={{ padding: '1.25rem', marginTop: '1rem' }}>
      <h2>Draft quiz questions</h2>
      <p>Paste teaching material you have permission to use. The local model suggests up to three questions; check every question and answer against the source before using it. Do not paste learner information.</p>
      <p>Drafts are not saved or published. Copy any you approve into your assessment below.</p>
      {!enabled ? <p className="notice">Quiz drafting is off. The owner can enable it in the feature dashboard after setting up the local model.</p> : <>
        <label htmlFor="quiz-source">Teaching material</label>
        <textarea id="quiz-source" rows={7} maxLength={8000} value={source}
          onChange={(event) => setSource(event.target.value)} />
        <button type="button" className="btn" disabled={busy || source.trim().length < 50} onClick={generate}>
          {busy ? 'Drafting…' : 'Draft questions'}
        </button>
        {error && <p className="notice error" role="alert">{error}</p>}
        {draft.length > 0 && <div aria-live="polite">
          <h3>Unreviewed AI draft</h3>
          <ol>{draft.map((item, index) => <li key={index}>
            <p><strong>Question:</strong> {item.question}</p>
            <p><strong>Suggested answer:</strong> {item.answer}</p>
          </li>)}</ol>
        </div>}
      </>}
    </section>
  );
}
