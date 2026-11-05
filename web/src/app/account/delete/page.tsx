import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { EraseAccount } from './erase-form';

export const dynamic = 'force-dynamic';

/**
 * Closing an account.
 *
 * The page exists so the decision is made with the facts in front of it: what
 * goes, what stays, and why the two lists are not the same. A person who reads
 * this and still wants it closed is taken at their word.
 *
 * The split is not a legal footnote. Everything in the first list is something
 * they wrote or a name attached to them. Everything in the second is a record the
 * platform made about a transaction or a qualification, and those are the rows a
 * refund, a chargeback or a certificate check would need afterwards.
 */
export default async function DeleteAccountPage() {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/account/delete');

  const { data } = await supabase
    .from('user_profiles')
    .select('display_name, account_status, deleted_at')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!data) redirect('/learn');
  const profile = data as unknown as {
    display_name: string;
    account_status: string;
    deleted_at: string | null;
  };
  const closed = profile.deleted_at !== null || profile.account_status === 'closed';

  return (
    <div className="container section" style={{ maxWidth: '46rem' }}>
      <p className="eyebrow">
        <Link href="/account">Account settings</Link>
      </p>
      <h1>Close this account</h1>

      {closed ? (
        <div className="card">
          <p className="empty" style={{ marginBottom: '0.5rem' }}>
            This account is already closed.
          </p>
          <p className="muted" style={{ margin: 0 }}>
            Its name and personal details have been removed. The sign-in itself lives with
            the sign-in provider, not here, so closing the account could not delete it —
            that one is on the platform owner&rsquo;s list now, and they remove it there.
          </p>
        </div>
      ) : (
        <>
          <p className="lede">
            Signed in as <strong>{user.email ?? user.phone ?? 'unknown'}</strong>. This
            closes the account and removes your name from everything it touched.
          </p>

          <div className="grid cols-2" style={{ marginTop: '1rem' }}>
            <section className="card">
              <h2 style={{ marginTop: 0 }}>Deleted</h2>
              <ul className="muted" style={{ paddingInlineStart: '1.1rem' }}>
                <li>Your name, photo, time zone and country</li>
                <li>Lesson notes and bookmarks</li>
                <li>Saved courses and the notes on them</li>
                <li>Course reviews and discussion posts you wrote</li>
                <li>The text of assignment work belonging to your own linked learner profile</li>
                <li>Live sharing links, invitations and guardian access</li>
                <li>Notifications sent to you, and mail the platform sent or queued for you</li>
                <li>If this account has a named safeguarding or refund-approval appointment, closing it needs individual review. Contact privacy@ayahspring.com.</li>
                <li>
                  A child profile in a family with no other active member may be closed.
                  If it has a separate login or coursework under a safeguarding hold, self-service closure is
                  paused for individual review: contact privacy@ayahspring.com. Other eligible
                  child learning records, including coursework, are scheduled for removal after thirty days. Stored files require a separate deletion step.
                </li>
              </ul>
            </section>
            <section className="card">
              <h2 style={{ marginTop: 0 }}>Kept, without your name</h2>
              <ul className="muted" style={{ paddingInlineStart: '1.1rem' }}>
                <li>Orders, payments and refunds — the ledger a refund depends on</li>
                <li>
                  Your own enrolments and lesson progress. Eligible child records are
                  scheduled for removal thirty days after closure.
                </li>
                <li>Certificates, under the number they were issued with</li>
                <li>
                  Your support case — the words you wrote are removed, your name becomes
                  &ldquo;the account holder&rdquo; in what support wrote back, and the case itself
                  is deleted three years after it closes
                </li>
                <li>The audit record that the account was closed</li>
                <li>
                  A fingerprint of your sign-in address — not the address — so that support
                  can answer &ldquo;was my account erased?&rdquo; once the sign-in itself is gone
                </li>
              </ul>
              <p className="muted" style={{ marginBottom: 0 }}>
                A certificate&rsquo;s holder is shown as &ldquo;Deleted learner&rdquo;, so a
                number that is checked later still resolves — to a record that no longer
                names anybody. A child&rsquo;s certificate keeps its number for the same
                reason, even after the thirty-day deletion above takes the evidence behind
                it.
              </p>
            </section>
          </div>

          <section className="card" style={{ marginTop: '1rem' }}>
            <h2 style={{ marginTop: 0 }}>This cannot be undone</h2>
            <p className="muted">
              You will be signed out, and signing in again will not bring any of it
              back. If you are a teacher with a course in review or published, the
              platform owner has to close the teaching account first — the page will say
              so if that applies to you.
            </p>
            <p className="muted">
              <strong>The sign-in is not deleted by this.</strong> It is held by the
              sign-in provider rather than by AyahSpring, so closing the account puts it on
              the platform owner&rsquo;s list and they delete it there. When it is gone the
              platform records the date against your closed account — so if you ask
              support later whether it was done, the answer is a fact rather than a
              memory.
            </p>
            <EraseAccount displayName={profile.display_name} />
          </section>
        </>
      )}
    </div>
  );
}
