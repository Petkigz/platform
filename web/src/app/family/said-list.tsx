import { Fragment, type ReactNode } from 'react';

/**
 * A list of things, joined the way the reader's language joins a list.
 *
 * "Aisha, Bilal and Maryam" in English; a different comma and a different
 * "and" elsewhere. The joining words come from the platform's own list
 * formatter rather than from a `', '` in the page, and each item is whatever
 * the caller made it — usually a name inside `<bdi>`, so a Latin name keeps
 * its direction inside a right-to-left sentence.
 */
export function SaidList({ code, items }: { code: string; items: ReactNode[] }) {
  const stand = items.map((_, index) => String(index));
  let parts: Array<{ type: string; value: string }>;
  try {
    parts = new Intl.ListFormat(code, { style: 'long', type: 'conjunction' }).formatToParts(stand);
  } catch {
    parts = stand.flatMap((value, index) =>
      index === 0
        ? [{ type: 'element', value }]
        : [{ type: 'literal', value: ', ' }, { type: 'element', value }],
    );
  }
  // Each element is the index it stood for, so nothing is counted in order.
  return (
    <>
      {parts.map((part, index) => (
        <Fragment key={index}>
          {part.type === 'element' ? items[Number(part.value)] : part.value}
        </Fragment>
      ))}
    </>
  );
}
