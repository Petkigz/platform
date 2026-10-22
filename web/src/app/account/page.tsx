import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { ClaimLearner } from '@/components/claim-learner';
import { ProfileForm } from './profile-form';

export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  if (!isSupabaseConfigured()) redirect('/');
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/account');

  const [{ data, error }, { data: learnerRows }] = await Promise.all([
    supabase
      .from('user_profiles')
      .select('display_name, preferred_language, timezone, account_status')
      .eq('user_id', user.id)
      .maybeSingle(),
    // Whether this account is a learner of its own. Every learner flow needs one, and
    // until the writer behind the button below existed there was no way to get one.
    supabase
      .from('learner_profiles')
      .select('id, display_name')
      .eq('linked_user_id', user.id)
      .is('deleted_at', null),
  ]);
  if (error) throw new Error(error.message);
  if (!data) redirect('/learn');
  const profile = data as unknown as {
    display_name: string;
    preferred_language: string;
    timezone: string | null;
    account_status: string;
  };
  const ownLearner = ((learnerRows ?? []) as { id: string; display_name: string }[])[0] ?? null;

  return (
    <div className="container section">
      <p className="eyebrow"><Link href="/learn">My learning</Link></p>
      <h1>Account settings</h1>
      <p className="lede">Manage how your account appears. Your sign-in address is shown for reference and is not changed here.</p>
      <div className="notice" style={{ maxWidth: '42rem', marginBottom: '1rem' }}>
        Signed in as <strong>{user.email ?? user.phone ?? 'unknown'}</strong>
        {' · '}account status: {profile.account_status}
      </div>
      <section className="card" style={{ maxWidth: '42rem', marginTop: '1rem' }}>
        <h2 style={{ marginTop: 0 }}>Learning as yourself</h2>
        {ownLearner ? (
          <>
            <p className="muted">
              This account learns as <strong>{ownLearner.display_name}</strong>. Courses you
              enrol in or buy belong to that learner, and nobody else&apos;s progress is
              mixed into it.
            </p>
            <p>
              <Link href="/learn">Go to my learning</Link>
              {' · '}
              <Link href="/account/sharing">Who can see my progress</Link>
            </p>
          </>
        ) : (
          <>
            <p className="muted">
              You do not have a learner profile yet. One is needed before you can enrol in
              a course, buy one, or share your progress — a course is always for a named
              learner, and this is how you become one.
            </p>
            <ClaimLearner note="This does not create a second account. It adds you as a learner to this one." />
          </>
        )}
      </section>

      <ProfileForm initial={{
        displayName: profile.display_name,
        preferredLanguage: profile.preferred_language,
        timezone: profile.timezone,
      }} />
      <section className="card" style={{ maxWidth: '42rem', marginTop: '1rem' }}>
        <h2 style={{ marginTop: 0 }}>Password</h2>
        {user.email ? (
          <p className="muted">
            Send a secure password reset link to your sign-in email. The link expires according to your authentication provider&rsquo;s settings.
            {' '}<Link href="/forgot-password">Send reset link</Link>
          </p>
        ) : (
          <p className="muted">This account signs in with a phone code, so there is no password to reset.</p>
        )}
      </section>
      <section className="card" style={{ maxWidth: '42rem', marginTop: '1rem' }}>
        <h2 style={{ marginTop: 0 }}>Sharing my learning</h2>
        <p className="muted">
          Your progress and certificates are private, including to your family. Invite
          somebody by email and they accept it themselves; you choose what they see and
          how long it lasts, and you can end it whenever you like.{' '}
          <Link href="/account/sharing">Who can see my learning</Link>
        </p>
      </section>

      <section className="card" style={{ maxWidth: '42rem', marginTop: '1rem' }}>
        <h2 style={{ marginTop: 0 }}>My data</h2>
        <p className="muted">
          Download everything we hold about this account as one file: your profile, the
          learners you are responsible for, what they have studied and finished, your
          certificates, orders and receipts, your notes, and who you have shared your
          learning with.
        </p>
        <p>
          <a className="btn secondary" href="/api/account/export" download>
            Download my data
          </a>
        </p>
      </section>

      <section className="card" style={{ maxWidth: '42rem', marginTop: '1rem' }}>
        <h2 style={{ marginTop: 0 }}>Closing this account</h2>
        <p className="muted">
          Closing removes your name from everything it touched and signs you out for
          good. Orders, payments, enrolments and certificates are kept without your
          name on them, because a refund or a checked certificate still needs them. The
          page lists both sides before anything happens.{' '}
          <Link href="/account/delete">Close this account</Link>
        </p>
      </section>

      <p style={{ marginTop: '1.5rem' }}><Link href="/learn">Back to my learning</Link></p>
    </div>
  );
}
