/**
 * A search snippet, split for drawing.
 *
 * On its own, with no imports, because a client component draws it: taking it
 * from `lesson-search.ts` brought every language's catalogue to the browser
 * (see `client-bundle.test.ts`).
 */

/** One piece of a snippet: text, or text that matched. */
export type SnippetPart = { text: string; mark: boolean };

/**
 * `<mark>…</mark>` split into parts.
 *
 * Only the two tags the function itself emits are recognised. Any other angle
 * bracket stays as text, which is the safe direction to be wrong in: a title
 * containing `<b>` renders the characters rather than bold.
 */
export function snippetParts(snippet: string): SnippetPart[] {
  const parts: SnippetPart[] = [];
  const pattern = /<mark>([\s\S]*?)<\/mark>/g;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(snippet)) !== null) {
    if (match.index > last) {
      parts.push({ text: snippet.slice(last, match.index), mark: false });
    }
    parts.push({ text: match[1] ?? '', mark: true });
    last = match.index + match[0].length;
  }

  if (last < snippet.length) parts.push({ text: snippet.slice(last), mark: false });

  // Empty pieces are noise in a keyed list and can only come from an empty tag.
  return parts.filter((part) => part.text !== '');
}
