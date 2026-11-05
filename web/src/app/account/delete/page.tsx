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
 * Some records are changed immediately while others remain, and neither a
 * scheduled job nor a manual storage step is proof of physical deletion.
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
            The profile has been changed, but some records and files may remain. The sign-in
            lives with the provider; if still present it needs a separate removal step.
            The queue is not proof the sign-in has been removed.
          </p>
        </div>
      ) : (
        <>
          <p className="lede">
            Signed in as <strong>{user.email ?? user.phone ?? 'unknown'}</strong>. This
            closes the account, changes your profile and removes some personal information.
            Some records and stored files remain, as explained below.
          </p>

          <div className="grid cols-2" style={{ marginTop: '1rem' }}>
            <section className="card">
              <h2 style={{ marginTop: 0 }}>Removed or changed at closure</h2>
              <ul className="muted" style={{ paddingInlineStart: '1.1rem' }}>
                <li>Your name, photo, time zone and country</li>
                <li>Lesson notes and bookmarks</li>
                <li>Saved courses and the notes on them</li>
                <li>Your course-review rows are removed. Discussion posts remain as threads with their body replaced.</li>
                <li>The current answer text on your own linked learner profile is cleared. Earlier revision snapshots and attached files can remain under separate retention rules.</li>
                <li>Live sharing links, invitations and guardian access</li>
                <li>Platform notification and outbound-message records associated with you. Email already delivered cannot be recalled.</li>
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
              <h2 style={{ marginTop: 0 }}>Records that remain</h2>
              <ul className="muted" style={{ paddingInlineStart: '1.1rem' }}>
                <li>Orders, payments and refunds — the ledger a refund depends on</li>
                <li>
                  Your own enrolments and lesson progress. Eligible child records are
                  scheduled for removal thirty days after closure.
                </li>
                <li>Certificates, under the number they were issued with</li>
                <li>
                  Your support case — the case text is replaced and messages you wrote are removed.
                  The platform attempts to replace your profile display name in staff replies and
                  resolution notes, but other names or identifiers may remain. The case is due for
                  deletion three years after it closes.
                </li>
                <li>The audit record that the account was closed</li>
                <li>
                  A fingerprint of your sign-in address — not the address — so that support
                  can answer &ldquo;was my account erased?&rdquo; once the sign-in itself is gone
                </li>
              </ul>
              <p className="muted" style={{ marginBottom: 0 }}>
                A certificate&rsquo;s holder field is replaced with &ldquo;Deleted learner&rdquo;,
                and its number and other snapshot details remain. A child&rsquo;s certificate
                also keeps its number after the learning record is removed.
              </p>
            </section>
          </div>

          <section className="card" style={{ marginTop: '1rem' }}>
            <h2 style={{ marginTop: 0 }}>This cannot be undone</h2>
            <p className="muted">
              The app attempts to sign you out, but other sessions and the provider sign-in
              may remain until separately revoked or removed. If you are a teacher with a
              course in review or published, the
              platform owner has to close the teaching account first — the page will say
              so if that applies to you.
            </p>
            <p className="muted">
              <strong>The sign-in is not deleted by this.</strong> It is held by the
              sign-in provider rather than by AyahSpring, so closing the account puts it on
              the platform owner&rsquo;s list for a separate removal step if it is still
              present. Before recording removal, the database checks that the identity is
              absent from its authentication table; that is not proof about all provider copies.
            </p>
            <EraseAccount displayName={profile.display_name} />
          </section>
        </>
      )}
    </div>
  );
}
