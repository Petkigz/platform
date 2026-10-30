import { IJAZAH_CAVEAT, authorisationLine, type Authorisation } from '@/lib/ijazah';

/**
 * What the platform has recorded about this teacher's authorisations.
 *
 * It renders **nothing at all** when there is nothing recorded, and that is
 * deliberate: a card that says "no ijazah on file" would read as a shortcoming,
 * and this platform has no business telling a scholar their standing is missing
 * from a database it made up. Silence, then, and the owner's register holds the
 * rest.
 *
 * The caveat travels with every row. A teacher who reads "recorded" and takes it
 * for "the platform vouches for me" would be right about the first and wrong
 * about the second, and this is the screen where that confusion would start.
 */
export function IjazahCard({ authorisations }: { authorisations: Authorisation[] }) {
  if (authorisations.length === 0) return null;

  const live = authorisations.filter((a) => a.status === 'recorded');
  const withdrawn = authorisations.filter((a) => a.status === 'withdrawn');

  return (
    <section className="card" id="ijazah" style={{ marginBottom: '1.5rem' }}>
      <h2 style={{ marginTop: 0 }}>Authorisations on record</h2>
      <p className="muted" style={{ fontSize: '0.85rem', marginTop: 0 }}>
        {IJAZAH_CAVEAT}
      </p>

      {live.length > 0 && (
        <ul style={{ paddingLeft: '1.1rem' }}>
          {live.map((a) => (
            <li key={a.id} style={{ marginBottom: '0.4rem' }}>
              {authorisationLine(a)}
            </li>
          ))}
        </ul>
      )}

      {withdrawn.length > 0 && (
        <details style={{ marginTop: '0.5rem' }}>
          <summary className="muted" style={{ fontSize: '0.85rem' }}>
            {withdrawn.length} withdrawn
          </summary>
          <ul style={{ paddingLeft: '1.1rem' }}>
            {withdrawn.map((a) => (
              <li key={a.id} style={{ marginBottom: '0.4rem' }}>
                {authorisationLine(a)}
                {a.withdrawnReason ? ` — withdrawn: ${a.withdrawnReason}` : ' — withdrawn.'}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
