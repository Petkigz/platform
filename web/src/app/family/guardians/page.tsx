import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { isFlagEnabled } from '@/lib/flags';
import { myGuardianRequests, RELATIONSHIP_LABEL } from '@/lib/guardians';
import { RequestForm } from './request-form';

export const dynamic = 'force-dynamic';

const STATUS_LABEL: Record<string, string> = {
  pending_verification: 'Waiting for review',
  active: 'Verified',
  revoked: 'Not granted',
};

/**
 * My guardian requests.
 *
 * The point of this page is that a request has somewhere to go. Before it
 * existed, asking to be recognised as a child's guardian wrote a row that
 * nobody could see and nothing could act on — the parent had no way to tell
 * whether they had been ignored or whether it had worked.
 *
 * It shows the state plainly, including "waiting for review", because that is
 * an honest answer and the alternative is silence.
 */
export default async function FamilyGuardiansPage() {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/family/guardians');

  const requests = await myGuardianRequests(supabase, user.id);
  const enabled = await isFlagEnabled(supabase, 'family.guardian_verification');

  // Children this person could plausibly ask about: learner profiles in a
  // family they belong to. RLS narrows this to what they may see.
  const { data: memberships } = await supabase
    .from('family_memberships')
    .select('families ( id, name, learner_profiles ( id, display_name, learner_type ) )')
    .eq('user_id', user.id)
    .eq('status', 'active');

  type ChildRow = { id: string; display_name: string; learner_type: string };
  const children: ChildRow[] = ((memberships ?? []) as {
    families: { id: string; learner_profiles: ChildRow[] | null }[] | null;
  }[])
    .flatMap((m) => m.families ?? [])
    .flatMap((f) => f.learner_profiles ?? [])
    .filter((c) => c.learner_type === 'child');

  const alreadyRequested = new Set(requests.map((r) => r.learnerProfileId));

  return (
    <main className="page narrow">
      <nav className="crumbs">
        <Link href="/family">Family</Link>
        <span aria-hidden>›</span>
        <span>Guardian access</span>
      </nav>

      <div className="page-head">
        <p className="eyebrow">Family</p>
        <h1>Guardian access</h1>
        <p className="muted">
          Ask to be verified as a child&rsquo;s parent or guardian. Verified
          guardians can see that child&rsquo;s progress. A person reviews every
          request — it is not instant, and it is not a formality.
        </p>
      </div>

      {!enabled && (
        <div className="notice warn">
          Guardian verification is not open yet, so new requests are not being
          accepted. Anything you have already asked for is listed below.
        </div>
      )}

      {requests.length === 0 ? (
        <p className="muted">You have not asked to be anyone&rsquo;s guardian.</p>
      ) : (
        <section className="card">
          <h2>Your requests</h2>
          <ul className="lessons">
            {requests.map((r) => (
              <li key={r.id}>
                <span className="t">
                  {r.learnerName}
                  <span className="muted">
                    {' · '}
                    {RELATIONSHIP_LABEL[r.relationshipType] ?? r.relationshipType}
                  </span>
                </span>
                <span
                  className={`badge ${r.status === 'active' ? 'ok' : 'neutral'}`}
                >
                  {STATUS_LABEL[r.status] ?? r.status}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {enabled && (
        <section className="card">
          <h2>Ask for access</h2>
          {children.length === 0 ? (
            <p className="muted">
              There is no child profile in your family to ask about yet.{' '}
              <Link href="/family">Add a child first</Link>.
            </p>
          ) : (
            <RequestForm
              options={children
                .filter((c) => !alreadyRequested.has(c.id))
                .map((c) => ({ id: c.id, name: c.display_name }))}
            />
          )}
        </section>
      )}

      <p className="muted">
        Being verified does not give you the child&rsquo;s account. It gives you
        a view of their progress, and it can be revoked.
      </p>
    </main>
  );
}
