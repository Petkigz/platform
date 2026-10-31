import Link from 'next/link';

import type { ClaimBoard, ClaimRow } from '@/lib/translations';

/**
 * Where the reading actually stands, across every language at once.
 *
 * The cards below this panel answer "how near is **this** language"; this answers
 * "what do I do next", which is a different question and the one an owner with
 * twenty spare minutes needs. Two facts come out of it that no single card can
 * show: **which read would finish a language**, and **which part nobody anywhere
 * has read** — the second being the trap, because if every volunteer starts with
 * the navigation then fifty languages sit at 1 of 16 forever.
 *
 * It is a server component on purpose: the section list is the English catalogue,
 * and a client component importing it would ship a hundred and ninety-two strings
 * to the browser to draw a table of counts.
 */

const number = (value: number) => value.toLocaleString('en');

function SheetFor({ locale, section }: { locale: string; section?: string }) {
  const href = section
    ? `/contribute?locale=${locale}&section=${section}`
    : `/contribute?locale=${locale}`;
  return (
    <Link href={href} style={{ fontSize: '0.85rem' }}>
      {section ? `ask for ${section}` : 'ask for the whole thing'}
    </Link>
  );
}

function Row({ row, name }: { row: ClaimRow; name: string }) {
  const done = row.claim.kind === 'reviewed';
  return (
    <tr style={{ borderTop: '1px solid var(--border, #e4e4e0)' }}>
      <td style={{ padding: '0.4rem 0' }}>
        {name} <span className="muted" style={{ fontSize: '0.8rem' }}>{row.locale}</span>
      </td>
      <td style={{ textAlign: 'end', padding: '0.4rem 0' }}>
        <strong>{done ? 'done' : `${row.read} of ${row.total}`}</strong>
      </td>
      <td style={{ padding: '0.4rem 0 0.4rem 0.9rem', fontSize: '0.88rem' }}>
        {done ? (
          <span className="muted">{row.names.join(', ')} read the whole catalogue</span>
        ) : row.next ? (
          <>
            <span className="muted">next: </span>
            <strong>{row.next.label.toLowerCase()}</strong>{' '}
            <SheetFor locale={row.locale} section={row.next.prefix} />
          </>
        ) : null}
      </td>
      <td style={{ padding: '0.4rem 0', fontSize: '0.85rem' }} className="muted">
        {row.names.join(', ')}
      </td>
    </tr>
  );
}

export function ClaimBoardPanel({
  board,
  names,
}: {
  board: ClaimBoard;
  names: Record<string, string>;
}) {
  const done = board.progressed.filter((row) => row.claim.kind === 'reviewed');
  const started = board.progressed.filter((row) => row.claim.kind !== 'reviewed');

  // The part that is furthest behind, which is the one worth pointing a volunteer
  // at. `byPart` is in catalogue order, so the tie is broken the way the site is
  // read rather than arbitrarily — but the skip link is excluded, because it is
  // one line nobody has ever looked at and pointing a volunteer at it would be a
  // recommendation this page does not believe.
  const candidates = board.byPart.filter((part) => part.section.prefix !== 'skip');
  const coldest = [...(candidates.length > 0 ? candidates : board.byPart)].sort(
    (a, b) => a.languages - b.languages,
  )[0];
  const everyPart = board.byPart.every((part) => part.languages === board.total);

  return (
    <section className="card" style={{ marginBottom: '1.5rem' }}>
      <h2 style={{ marginTop: 0, marginBottom: '0.4rem' }}>What is still blocking the claim</h2>

      {board.progressed.length === 0 ? (
        <p style={{ marginTop: 0 }}>
          <strong>Nothing is blocking it yet, because nobody has started.</strong> All{' '}
          {number(board.total)} languages stand at no parts read, and the sentence on{' '}
          <Link href="/language">the language page</Link> says so on every one of them. One
          part read is the first move, and it is ten lines of the navigation.
        </p>
      ) : (
        <>
          <p style={{ marginTop: 0 }}>
            {done.length > 0 ? (
              <>
                <strong>{number(done.length)}</strong> language
                {done.length === 1 ? ' is' : 's are'} read end to end.{' '}
              </>
            ) : null}
            <strong>{number(started.length)}</strong> {started.length === 1 ? 'has' : 'have'}{' '}
            started — closest to done first, with the part to ask for next.{' '}
            {board.untouched > 0 ? (
              <>
                The other <strong>{number(board.untouched)}</strong>{' '}
                {board.untouched === 1 ? 'has' : 'have'} nobody&rsquo;s name against any part.
              </>
            ) : null}
          </p>

          <div className="scroll-x">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'start', padding: '0.3rem 0', fontWeight: 600 }}>
                    Language
                  </th>
                  <th style={{ textAlign: 'end', padding: '0.3rem 0', fontWeight: 600 }}>
                    Parts read
                  </th>
                  <th style={{ textAlign: 'start', padding: '0.3rem 0 0.3rem 0.9rem', fontWeight: 600 }}>
                    What would move it
                  </th>
                  <th style={{ textAlign: 'start', padding: '0.3rem 0', fontWeight: 600 }}>
                    Whose name
                  </th>
                </tr>
              </thead>
              <tbody>
                {board.progressed.map((row) => (
                  <Row key={row.locale} row={row} name={names[row.locale] ?? row.locale} />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* The trap this panel exists to catch: if everybody starts in the same
          place, every language sits at 1 of 16 and no claim is ever made. */}
      {!everyPart && coldest && coldest.languages < board.total && (
        <div className="notice" style={{ marginTop: '1rem' }}>
          <strong>{coldest.section.label}</strong> is the part nobody has read in{' '}
          {number(board.total - coldest.languages)} of {number(board.total)} languages
          {coldest.languages > 0
            ? ` (${number(coldest.languages)} have somebody's name against it)`
            : ''}
          . If every volunteer starts at the navigation, every language stays at one part
          forever — so the next person you ask is worth asking for this one.
        </div>
      )}

      <p className="muted" style={{ marginTop: '0.9rem', fontSize: '0.85rem' }}>
        Only published reviews count here. Accepted corrections do not move a language until
        the read is published <em>and</em> the lines have reached the catalogue, because a
        language called read while its corrections sit in a queue is a claim made early.
      </p>
    </section>
  );
}
