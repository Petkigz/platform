import { Fragment, type ReactNode } from 'react';

/**
 * A translated sentence with something other than text in its gaps.
 *
 * A sentence arrives whole, `{name}` and all, because where the name sits is
 * the translator's decision: in Turkish it comes before the verb, in Arabic
 * after it. This splits the sentence at its gaps and puts markup into them, so
 * an address stays a `<bdi>` and a name stays bold without the sentence being
 * cut into English-shaped pieces first.
 *
 * A gap with no part is printed as it was written, braces included: a missing
 * part should be seen by whoever is looking at the page, not swallowed.
 *
 * No hooks and no `'use client'`: a server page and a form in the browser both
 * draw with it.
 */
export function Say({ text, parts }: { text: string; parts: Record<string, ReactNode> }) {
  return (
    <>
      {text.split(/(\{[a-zA-Z]+\})/u).map((piece, index) => {
        const name = /^\{([a-zA-Z]+)\}$/u.exec(piece)?.[1];
        return (
          <Fragment key={index}>{name && Object.hasOwn(parts, name) ? parts[name] : piece}</Fragment>
        );
      })}
    </>
  );
}
