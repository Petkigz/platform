import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import {
  panelMemberRole,
  panelStatusLabel,
  quorumSentence,
  tallySentence,
  voteLabel,
  type MyPanelWork,
} from '@/lib/panels';
import { PanelVote } from './panel-vote';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Scholarly panel',
  description: 'The cases waiting for a decision from the panel you sit on, and your vote.',
};

/**
 * The board's own screen.
 *
 * A panel member is not staff: they cannot read another panel's cases, the
 * register, or the direction of anybody else's vote before they have voted
 * themselves. Everything here comes from `my_panel_work()`, which is scoped to
 * the caller's own reviewer profile — and a person who does not sit on a panel
 * gets an explanation rather than an empty page, because "you are not on a
 * panel" is information, and an empty list is not.
 */
export default async function PanelPage() {
  if (!isSupabaseConfigured()) redirect('/');
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/panel');

  const { data, error } = await supabase.rpc('my_panel_work');
  if (error) throw new Error(error.message);
  const work = (data ?? null) as MyPanelWork | null;

  if (!work?.panelMember) {
    return (
      <div className="container section">
        <p className="eyebrow"><Link href="/learn">My learning</Link></p>
        <h1>Scholarly panel</h1>
        <div className="notice" style={{ maxWidth: '46rem' }}>
          <strong>You do not sit on a scholarly panel.</strong> Panels decide questions about a
          course that a single reviewer should not settle alone — how a ruling is presented, what
          a course claims, whether something is taught at all.
        </div>
        <p className="muted" style={{ maxWidth: '46rem' }}>
          Two things have to be true before a seat means anything: the owner appoints you to the
          board, and a governance admin checks your qualifications. Applying to review is the way
          in — the register is where scholars are checked.
        </p>
        <p>
          <Link href="/review">The reviewer register</Link>
          {' · '}
          <Link href="/learn">Back to my learning</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="container section">
      <p className="eyebrow"><Link href="/learn">My learning</Link></p>
      <h1>Scholarly panel</h1>
      <p className="lede" style={{ maxWidth: '46rem' }}>
        The cases waiting for a decision from a panel you sit on. One vote each, and a vote is
        not edited afterwards; the direction of other members&rsquo; votes appears once you have
        voted, so nobody is anchored by the first name in the list.
      </p>

      <section style={{ maxWidth: '46rem', marginTop: '1.5rem' }}>
        <h2>Your panels</h2>
        <ul className="stack" style={{ listStyle: 'none', padding: 0 }}>
          {work.panels.map((panel) => (
            <li key={panel.id} className="card">
              <strong>{panel.name}</strong>
              <span className="muted">
                {' · '}{panelMemberRole(panel.memberRole)}
                {' · '}{panelStatusLabel(panel.status)}
                {' · '}quorum {panel.quorum}
              </span>
              {panel.status !== 'active' && (
                <p className="muted" style={{ margin: '0.4rem 0 0' }}>
                  This panel is not convened, so nothing can be decided here until the owner
                  convenes it. That is the rule, not a fault.
                </p>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section style={{ maxWidth: '46rem', marginTop: '2rem' }}>
        <h2>Waiting for you</h2>
        {work.cases.length === 0 ? (
          <p className="muted">
            Nothing is waiting. You will see a case here when a panel you sit on opens one.
          </p>
        ) : (
          <ul className="stack" style={{ listStyle: 'none', padding: 0 }}>
            {work.cases.map((row) => (
              <li key={row.id} className="card">
                <h3 style={{ margin: '0 0 0.25rem' }}>
                  {row.courseTitle} — version {row.versionNumber}
                </h3>
                <p className="muted" style={{ margin: '0 0 0.5rem', fontSize: '0.9rem' }}>
                  {row.panelName}
                  {' · '}{quorumSentence(row.cast, row.quorum)}
                </p>

                {row.myVote ? (
                  <>
                    <p className="muted" style={{ margin: '0 0 0.25rem' }}>
                      You voted <strong>{voteLabel(row.myVote)}</strong>. The tally so far:{' '}
                      {tallySentence(row.tally)}
                    </p>
                    <p className="muted" style={{ margin: 0, fontSize: '0.9rem' }}>
                      The chair, governance or the owner records the decision once the panel has
                      finished.
                    </p>
                  </>
                ) : (
                  <PanelVote caseId={row.id} quorum={row.quorum} cast={row.cast} />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {work.decided.length > 0 && (
        <section style={{ maxWidth: '46rem', marginTop: '2rem' }}>
          <h2>Decided, and how you voted</h2>
          <ul className="stack" style={{ listStyle: 'none', padding: 0 }}>
            {work.decided.map((row) => (
              <li key={row.id} className="card">
                <strong>{row.courseTitle}</strong>
                <span className="muted">
                  {' · '}{row.outcome}
                  {' · '}you voted {voteLabel(row.myVote).toLowerCase()}
                </span>
                <p className="muted" style={{ margin: '0.4rem 0 0' }}>{row.outcomeSummary}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p style={{ marginTop: '2rem' }}>
        <Link href="/review">Reviews assigned to you</Link>
        {' · '}
        <Link href="/learn">Back to my learning</Link>
      </p>
    </div>
  );
}
