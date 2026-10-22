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
            Its name and personal details have been removed. Sign in is still held by
            the sign-in provider; ask the platform owner to remove the address itself.
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
              <ul className="muted" style={{ paddingLeft: '1.1rem' }}>
                <li>Your name, photo, time zone and country</li>
                <li>Lesson notes and bookmarks</li>
                <li>Saved courses and the notes on them</li>
                <li>Course reviews and discussion posts you wrote</li>
                <li>The text of assignment work you sent</li>
                <li>Live sharing links, invitations and guardian access</li>
                <li>
                  Any child profile that would be left without an adult — a child with
                  another active guardian stays with them
                </li>
              </ul>
            </section>
            <section className="card">
              <h2 style={{ marginTop: 0 }}>Kept, without your name</h2>
              <ul className="muted" style={{ paddingLeft: '1.1rem' }}>
                <li>Orders, payments and refunds — the ledger a refund depends on</li>
                <li>Enrolments and lesson progress</li>
                <li>Certificates, under the number they were issued with</li>
                <li>The audit record that the account was closed</li>
              </ul>
              <p className="muted" style={{ marginBottom: 0 }}>
                A certificate&rsquo;s holder is shown as &ldquo;Deleted learner&rdquo;, so a
                number that is checked later still resolves — to a record that no longer
                names anybody.
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
            <EraseAccount displayName={profile.display_name} />
          </section>
        </>
      )}
    </div>
  );
}
