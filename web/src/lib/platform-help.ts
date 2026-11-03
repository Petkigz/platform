export type HelpArticle = {
  id: string;
  title: string;
  body: string;
  keywords: string;
  status: 'draft' | 'published' | 'archived';
  updated_at: string;
};

/** Match literal words, not generated answers. Empty searches show all articles. */
export function findHelpArticles(articles: HelpArticle[], query: string): HelpArticle[] {
  const words = query.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  const common = new Set(['a', 'an', 'and', 'are', 'can', 'do', 'for', 'how', 'i', 'is', 'my', 'of', 'on', 'the', 'to', 'what', 'where']);
  const terms = words.filter((word) => !common.has(word));
  if (!words.length) return articles;
  if (!terms.length) return [];
  return articles.map((article) => {
    const text = `${article.title} ${article.keywords} ${article.body}`.toLocaleLowerCase();
    const score = terms.reduce((total, term) => total + (text.includes(term) ? 1 : 0), 0);
    return { article, score };
  }).filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score || a.article.title.localeCompare(b.article.title))
    .map((result) => result.article);
}
