'use client';

import { useState } from 'react';
import { findHelpArticles, type HelpArticle } from '@/lib/platform-help';

/** The five things the search says, handed over by the page in the reader's language. */
export type HelpSearchWords = { heading: string; note: string; label: string; example: string; none: string };

/**
 * Search the help articles staff have published.
 *
 * It matches words; it writes nothing. An article is shown as its author wrote
 * it, in whatever language that was, so each one sets its own direction.
 */
export function HelpSearch({ articles, words }: { articles: HelpArticle[]; words: HelpSearchWords }) {
  const [query, setQuery] = useState('');
  const matches = findHelpArticles(articles, query);
  return <section className="section" data-support-help="search">
    <h2>{words.heading}</h2>
    <p>{words.note}</p>
    <label htmlFor="help-search">{words.label}</label>
    <input id="help-search" type="search" maxLength={200} value={query} dir="auto"
      onChange={(event) => setQuery(event.target.value)} placeholder={words.example} />
    {matches.length === 0 ? <p role="status">{words.none}</p> :
      <ul className="lessons support-list">{matches.map((article) => <li key={article.id}>
        <div className="t"><strong dir="auto">{article.title}</strong>
          <p className="support-article" dir="auto">{article.body}</p>
        </div>
      </li>)}</ul>}
  </section>;
}
