import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { HANDOVER_EXPLAINER } from '@/lib/handover';
import { HandoverForm } from './handover-form';

export const metadata = { title: 'A record that becomes theirs' };
export const dynamic = 'force-dynamic';

/**
 * Where somebody says a learner is eighteen.
 *
 * The page exists because the platform records no date of birth and never will, so
 * there is no birthday to detect. What it can do is let the two people entitled to
 * decide — the learner on their own login, and the adult who has been holding the
 * record — decide, and record what they said.
 *
 * It lists every child profile the caller can reach, with both outcomes spelled
 * out. It is not a queue and nothing waits: the decision is acted on immediately,
 * because a young person taking their own record is not a request to be granted.
 */
export default async function HandoverPage() {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/handover');

  const { data } = await supabase
    .from('learner_profiles')
    .select('id, display_name, age_band, family_id, linked_user_id')
    .eq('learner_type', 'child')
    .is('deleted_at', null)
    .eq('status', 'active')
    .order('display_name');

  const learners = (data ?? []) as unknown as {
    id: string;
    display_name: string;
    age_band: string | null;
    family_id: string | null;
    linked_user_id: string | null;
  }[];

  return (
    <div className="page narrow">
      <nav className="crumbs">
        <Link href="/learn">Learning</Link>
        <span aria-hidden>›</span>
        <span>Turning eighteen</span>
      </nav>

      <div className="page-head">
        <p className="eyebrow">A record of your own</p>
        <h1>A record that becomes theirs</h1>
        <p className="muted">{HANDOVER_EXPLAINER}</p>
      </div>

      <div className="notice">
        <strong>What this decides.</strong> Whether a learner&rsquo;s record becomes
        their own account, or is not kept. Keeping it moves nothing: their progress,
        hand-ins and certificates were always theirs, and the account simply stops
        being something a guardian manages. Not keeping it deletes the record thirty
        days from today.
      </div>

      {learners.length === 0 ? (
        <p className="muted" style={{ marginTop: '1.25rem' }}>
          There is no child profile on this account, so there is nothing to hand over.
          A learner already holding their own adult record has nothing to do here.
        </p>
      ) : (
        learners.map((learner) => (
          <section className="card" key={learner.id} style={{ marginTop: '1.25rem' }}>
            <h2 style={{ marginTop: 0 }}>
              {learner.display_name}
              {learner.age_band ? <span className="muted"> · age {learner.age_band}</span> : null}
            </h2>
            <p className="muted">
              {learner.linked_user_id
                ? 'This learner has a login of their own. Handing the record over makes that account theirs.'
                : 'This learner is reached through the family account and has no login of their own.'}
            </p>
            <HandoverForm
              learnerId={learner.id}
              learnerName={learner.display_name}
              hasOwnAccount={learner.linked_user_id !== null}
            />
          </section>
        ))
      )}

      <p className="muted" style={{ marginTop: '1.5rem' }}>
        <Link href="/family">Family and children</Link>
        {' · '}
        <Link href="/learn">Back to learning</Link>
        {' · '}
        <Link href="/policies/children">The children’s policy</Link>
      </p>
    </div>
  );
}
