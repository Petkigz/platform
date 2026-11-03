import test from 'node:test';
import assert from 'node:assert/strict';
import { findHelpArticles, type HelpArticle } from './platform-help.ts';
const article = (id: string, title: string, body: string, keywords = ''): HelpArticle => ({
  id, title, body, keywords, status: 'published', updated_at: '2026-11-03',
});
const articles = [article('1', 'Find courses', 'Open Learning to see your courses.', 'lessons'),
  article('2', 'Teaching', 'Edit your course.', 'teacher')];
test('search returns reviewed text and ranks actual matches', () => {
  assert.equal(findHelpArticles(articles, 'how do I find courses')[0]?.id, '1');
  assert.deepEqual(findHelpArticles(articles, 'teacher').map((a) => a.id), ['2']);
  assert.deepEqual(findHelpArticles(articles, 'nonexistent'), []);
  assert.deepEqual(findHelpArticles(articles, 'how do I'), []);
  assert.equal(findHelpArticles(articles, '').length, 2);
});
test('search supports non-Latin text and does not execute markup', () => {
  const data = [article('3', 'العربية', '<script>untrusted</script>')];
  assert.equal(findHelpArticles(data, 'العربية')[0]?.id, '3');
  assert.equal(findHelpArticles(data, 'script')[0]?.body, '<script>untrusted</script>');
});
