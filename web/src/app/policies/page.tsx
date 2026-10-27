import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import {
  audienceLabel,
  isInForce,
  statusNote,
  type PolicyDocumentRow,
  type PolicyInForce,
} from '@/lib/policies';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Policies',
  description:
    'The terms, privacy notice and other documents that apply here — and, plainly, which of them are not in force yet.',
};

type Card = PolicyDocumentRow & { live: PolicyInForce | null };

/**
 * The public register — screen 49.
 *
 * Two honest states, and the second one matters more.
 *
 * When a document has a version in force, it links to the text and says which
 * version, from when. When it does not, the card stays — because a platform with
 * seven drafted documents and none approved has *policies in preparation*, and
 * hiding them would suggest it has none at all. What it does not do is show the
 * draft: an unapproved draft can change, and an agreement read out of a text
 * that then changes is not an agreement.
 *
 * The list is anonymous: `policy_documents` is one of the few tables a signed-out
 * visitor may read, because a term you must accept before signing up has to be
 * readable before signing up.
 */
export default async function PoliciesPage() {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const [documentsResult, liveResult] = await Promise.all([
    supabase
      .from('policy_documents')
      .select('slug, title, summary, audience, acceptance_required, sort_order')
      .order('sort_order'),
    supabase.rpc('policies_in_force'),
  ]);
  if (documentsResult.error) throw new Error(documentsResult.error.message);
  if (liveResult.error) throw new Error(liveResult.error.message);

  const liveBySlug = new Map(
    ((liveResult.data ?? []) as unknown as PolicyInForce[]).map((row) => [row.slug, row]),
  );
  const cards: Card[] = ((documentsResult.data ?? []) as unknown as PolicyDocumentRow[])
    .map((doc) => ({ ...doc, live: liveBySlug.get(doc.slug) ?? null }));

  const inForce = cards.filter((card) => isInForce(card.live)).length;

  return (
    <div className="container section">
      <p className="eyebrow">Policies</p>
      <h1>Terms, privacy and the rest of it</h1>
      <p className="lede">
        What you agree to when you learn or teach here, what is done with your data, and
        what happens when something goes wrong. Each document is versioned: the version
        you read is the version you agreed to, and a change is a new version rather than
        an edit to the old one.
      </p>

      {inForce === 0 ? (
        <div className="notice" style={{ maxWidth: '46rem', marginTop: '1rem' }}>
          <strong>None of these is in force yet.</strong> The documents are written and
          versioned, but each still carries questions only the operator can answer — which
          law governs, who is named as responsible for your data, which authority a
          complaint goes to. The database refuses to publish a document while one of those
          is unanswered, so this page shows an honest gap rather than a draft that might
          read as settled.
        </div>
      ) : (
        <p className="muted" style={{ maxWidth: '46rem', marginTop: '1rem' }}>
          {inForce === 1
            ? 'One document is in force. The others are drafted and not yet approved.'
            : `${inForce} documents are in force. The others are drafted and not yet approved.`}
        </p>
      )}

      <ul className="stack" style={{ marginTop: '1.5rem' }}>
        {cards.map((card) => (
          <li key={card.slug} className="card" style={{ maxWidth: '46rem' }}>
            <h2 style={{ margin: '0 0 0.25rem' }}>
              <Link href={`/policies/${card.slug}`}>{card.title}</Link>
            </h2>
            <p className="muted" style={{ margin: '0 0 0.5rem' }}>
              {card.summary ?? 'No summary yet.'}
            </p>
            <p className="muted" style={{ margin: 0, fontSize: '0.9rem' }}>
              For {audienceLabel(card.audience).toLowerCase()}
              {' · '}
              <strong>{statusNote(card.live)}</strong>
              {card.acceptance_required
                ? ' · You will be asked to agree to it, and the time you did is kept.'
                : ' · Read it; there is nothing to sign.'}
            </p>
          </li>
        ))}
      </ul>

      <p className="muted" style={{ marginTop: '1.5rem', maxWidth: '46rem' }}>
        A concern about how somebody behaved, or about a child&rsquo;s safety, is not a
        policy question — it goes to a person.{' '}
        <Link href="/support">Open a support case</Link>.
      </p>
      <p style={{ marginTop: '1rem' }}><Link href="/">Back to AyahSpring</Link></p>
    </div>
  );
}
