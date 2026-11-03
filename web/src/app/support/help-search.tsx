'use client';

import { useState } from 'react';
import { findHelpArticles, type HelpArticle } from '@/lib/platform-help';

export function HelpSearch({ articles }: { articles: HelpArticle[] }) {
  const [query, setQuery] = useState('');
  const matches = findHelpArticles(articles, query);
  return <section className="section">
    <h2>Find platform help</h2>
    <p>Search instructions about using AyahSpring. This does not generate answers or give religious rulings.</p>
    <label htmlFor="help-search">Search help</label>
    <input id="help-search" type="search" maxLength={200} value={query}
      onChange={(event) => setQuery(event.target.value)} placeholder="For example: courses" />
    {matches.length === 0 ? <p>No matching help articles. Try different words or contact support when it is open.</p> :
      <ul className="lessons">{matches.map((article) => <li key={article.id}>
        <div className="t"><strong>{article.title}</strong>
          <p style={{ whiteSpace: 'pre-wrap' }}>{article.body}</p>
        </div>
      </li>)}</ul>}
  </section>;
}
