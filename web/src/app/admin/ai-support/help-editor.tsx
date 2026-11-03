'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { HelpArticle } from '@/lib/platform-help';

export function HelpEditor({ articles }: { articles: HelpArticle[] }) {
  const router = useRouter();
  const [id, setId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [keywords, setKeywords] = useState('');
  const [status, setStatus] = useState<HelpArticle['status']>('draft');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  function choose(article: HelpArticle | null) {
    setId(article?.id ?? null);
    setTitle(article?.title ?? ''); setBody(article?.body ?? '');
    setKeywords(article?.keywords ?? ''); setStatus(article?.status ?? 'draft'); setMessage('');
  }
  async function save() {
    setBusy(true); setMessage('');
    try {
      const response = await fetch('/api/admin/platform-help', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id, title, body, keywords, status }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) setMessage(data.error ?? 'Could not save.');
      else { choose(null); setMessage('Saved.'); router.refresh(); }
    } catch { setMessage('Could not reach the platform. Nothing was saved.'); }
    finally { setBusy(false); }
  }
  return <section className="section">
    <h2>Platform help articles</h2>
    <p>Write reviewed instructions for teachers and learners about using AyahSpring. Published articles are visible to every signed-in user. Never put private learner information or religious rulings here.</p>
    <ul className="lessons">{articles.map((article) => <li key={article.id}>
      <span className="t">{article.title} · {article.status}</span>
      <button type="button" className="btn secondary" onClick={() => choose(article)}>Edit</button>
    </li>)}</ul>
    <button type="button" className="btn secondary" onClick={() => choose(null)}>New article</button>
    <div className="card" style={{ padding: '1rem', marginTop: '1rem' }}>
      <h3>{id ? 'Edit article' : 'New article'}</h3>
      <label htmlFor="help-title">Title</label>
      <input id="help-title" value={title} maxLength={160} onChange={(event) => setTitle(event.target.value)} />
      <label htmlFor="help-body">Answer</label>
      <textarea id="help-body" value={body} maxLength={5000} rows={6} onChange={(event) => setBody(event.target.value)} />
      <label htmlFor="help-keywords">Search words (optional)</label>
      <input id="help-keywords" value={keywords} maxLength={500} onChange={(event) => setKeywords(event.target.value)} />
      <label htmlFor="help-status">Status</label>
      <select id="help-status" value={status} onChange={(event) => setStatus(event.target.value as HelpArticle['status'])}>
        <option value="draft">Draft — only platform admins can see it</option>
        <option value="published">Published — visible to signed-in users</option>
        <option value="archived">Archived — hidden from users</option>
      </select>
      <button type="button" className="btn" disabled={busy || title.trim().length < 3 || body.trim().length < 10} onClick={save}>
        {busy ? 'Saving…' : 'Save article'}
      </button>
      {message && <p role="status">{message}</p>}
    </div>
  </section>;
}
