import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { isFlagEnabled } from '@/lib/flags';
import { ClaimLearner } from '@/components/claim-learner';
import { ProfileForm } from './profile-form';
import { PhoneForm } from './phone-form';
import { MergeLink } from './merge/merge-panel';
import { outstandingSentence, type PolicyStanding } from '@/lib/policies';

export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  if (!isSupabaseConfigured()) redirect('/');
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/account');

  const [referralsOn, sponsorshipOn, { data, error }, { data: learnerRows }, { data: methodsData },
         { data: badgeData }, { data: phoneData }, { data: mergeData },
         applicationsOn, { data: teachesHere }, { data: standingData }] = await Promise.all([
    // Inviting a friend is a link, not a form, so the card is only worth showing
    // when there is something at the other end of it.
    isFlagEnabled(supabase, 'commerce.referrals').catch(() => false),
    // Sponsoring is two-sided: a person may be asking for a seat or paying for
    // one, and the card leads to whichever is theirs.
    isFlagEnabled(supabase, 'commerce.sponsorship').catch(() => false),
    supabase
      .from('user_profiles')
      .select('display_name, preferred_language, timezone, account_status')
      .eq('user_id', user.id)
      .maybeSingle(),
    // Whether this account is a learner of its own. Every learner flow needs one, and
    // until the writer behind the button below existed there was no way to get one.
    supabase
      .from('learner_profiles')
      .select('id, display_name, family_id')
      .eq('linked_user_id', user.id)
      .is('deleted_at', null),
    // How this account actually signs in. A person who arrived through Google
    // has no password, and a password-reset form would be a dead end for them.
    supabase.rpc('my_sign_in_methods'),
    // The unread count, so the centre is discoverable from the one page a person
    // already opens when they want to change something about their account self.
    // A failure here must not take the settings page down with it.
    supabase.rpc('notification_badge'),
    // Whether the platform collects phone numbers at all, and the one it has.
    // A flag that is off means no card: an empty field for a feature nobody
    // switched on is an invitation to type into a dead form.
    supabase.rpc('my_phone'),
    // A merge request waiting on this account is the one thing on this page
    // somebody has to act on, so the count comes with it.
    supabase.rpc('my_merge_requests'),
    // Applying to teach. The card is only shown while the owner has the door
    // open, and it is not shown to somebody who already teaches — an invitation
    // to apply for a role you hold is a screen that has not read its own data.
    isFlagEnabled(supabase, 'teaching.applications').catch(() => false),
    supabase.rpc('has_role', { p_user_id: user.id, p_role_code: 'instructor' }),
    // What this account still owes in agreements. A failure here must not take
    // the settings page down with it, so it is read last and read leniently.
    supabase.rpc('my_policy_standing'),
  ]);
  if (error) throw new Error(error.message);
  if (!data) redirect('/learn');
  const profile = data as unknown as {
    display_name: string;
    preferred_language: string;
    timezone: string | null;
    account_status: string;
  };
  const ownLearner =
    ((learnerRows ?? []) as { id: string; display_name: string; family_id: string | null }[])[0] ?? null;
  const unread = typeof badgeData === 'number' ? badgeData : 0;
  const standing = (standingData ?? null) as PolicyStanding | null;
  const outstanding = Number(standing?.outstanding ?? 0);
  const owed = outstanding > 0 ? (standing?.acceptanceRequired ?? []).filter((r) => !r.acceptedAt) : [];
  const merge = (mergeData ?? null) as { enabled?: boolean; incoming?: unknown[] } | null;
  const mergeWaiting = merge?.enabled === true && Array.isArray(merge.incoming)
    ? merge.incoming.length
    : 0;
  const phone = (phoneData ?? null) as {
    enabled?: boolean;
    phoneE164?: string | null;
    phoneCountry?: string | null;
  } | null;
  const methods = (methodsData ?? null) as {
    providers: string[];
    hasPassword: boolean;
    summary: string;
  } | null;

  return (
    <div className="container section">
      <p className="eyebrow"><Link href="/learn">My learning</Link></p>
      <h1>Account settings</h1>
      <p className="lede">Manage how your account appears. Your sign-in address is shown for reference and is not changed here.</p>
      <div className="notice" style={{ maxWidth: '42rem', marginBottom: '1rem' }}>
        Signed in as <strong>{user.email ?? user.phone ?? 'unknown'}</strong>
        {' · '}account status: {profile.account_status}
      </div>
      {outstanding > 0 && (
        <section className="card" style={{ maxWidth: '42rem', marginTop: '1rem', borderColor: 'var(--accent)' }}>
          <h2 style={{ marginTop: 0 }}>Before you carry on</h2>
          <p className="muted">
            {outstandingSentence(outstanding)} Read and agree, and the time you did is kept
            against your account. Nothing else on this page is held back meanwhile.
          </p>
          <ul className="stack" style={{ margin: '0.5rem 0' }}>
            {owed.map((row) => (
              <li key={row.slug}>
                <Link href={`/policies/${row.slug}`}>
                  {row.title} — version {row.versionNumber}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card" style={{ maxWidth: '42rem', marginTop: '1rem' }}>
        <h2 style={{ marginTop: 0 }}>Learning as yourself</h2>
        {ownLearner ? (
          <>
            <p className="muted">
              This account learns as <strong>{ownLearner.display_name}</strong>. Courses you
              enrol in or buy belong to that learner, and nobody else&apos;s progress is
              mixed into it.
            </p>
            <p className="muted">
              {ownLearner.family_id
                ? 'Your learning is inside a family account, so one family plan can cover you alongside its children. You manage that on the family page.'
                : 'Your learning sits on its own. If you run a family account, you can move it in beside the children so one plan covers everybody — same profile, same progress.'}
            </p>
            <p>
              <Link href="/learn">Go to my learning</Link>
              {' · '}
              <Link href="/family">
                {ownLearner.family_id ? 'My family' : 'Learn inside my family'}
              </Link>
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
            <p className="muted">
              If you run a family account, you can become a learner there instead, and be part
              of the family from the start — <Link href="/family">My family</Link>.
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
      {phone?.enabled === true && (
        <PhoneForm
          initialPhone={phone.phoneE164 ?? null}
          initialCountry={phone.phoneCountry ?? null}
        />
      )}

      <section className="card" style={{ maxWidth: '42rem', marginTop: '1rem' }}>
        <h2 style={{ marginTop: 0 }}>How you sign in</h2>
        <p className="muted">
          {methods?.summary ?? 'Your sign-in methods could not be read just now.'}
        </p>
        {methods?.hasPassword ? (
          <p className="muted">
            Send a secure password reset link to your sign-in email. The link expires according to your
            authentication provider&rsquo;s settings.{' '}
            <Link href="/forgot-password">Send reset link</Link>
          </p>
        ) : (
          <p className="muted">
            {methods && methods.providers.includes('google')
              ? 'There is no password on this account, so there is nothing to reset — keep using Google to sign in.'
              : 'This account signs in with a phone code, so there is no password to reset.'}
          </p>
        )}
      </section>
      {merge?.enabled === true && (
        <section className="card" style={{ maxWidth: '42rem', marginTop: '1rem' }}>
          <h2 style={{ marginTop: 0 }}>Two accounts, one person</h2>
          <p className="muted">
            If you signed up twice, the accounts can be folded together. The one you
            keep survives; the other is closed, and both have to agree before
            anything moves.{' '}
            {mergeWaiting > 0
              ? `Someone is asking to merge an account into this one.`
              : 'Nothing is waiting on this account.'}
          </p>
          <p>
            <MergeLink waiting={mergeWaiting} />
          </p>
        </section>
      )}

      {sponsorshipOn && (
        <section className="card" style={{ maxWidth: '42rem', marginTop: '1rem' }}>
          <h2 style={{ marginTop: 0 }}>Sponsored seats</h2>
          <p className="muted">
            A course can be paid for by somebody else. Ask for one if it is out of reach, or pay
            for a seat that is waiting — the two sides never learn who the other is.{' '}
            <Link href="/account/sponsorship">What I have asked for and sponsored</Link>{' '}
            · <Link href="/sponsor">Seats waiting</Link>
          </p>
        </section>
      )}

      {applicationsOn && teachesHere !== true && (
        <section className="card" style={{ maxWidth: '42rem', marginTop: '1rem' }}>
          <h2 style={{ marginTop: 0 }}>Teaching here</h2>
          <p className="muted">
            Teaching is by appointment — nobody becomes a teacher by signing up. If you would like
            to teach, you can send your qualifications and a link to a lesson you have given, and
            the owner reads it. <Link href="/teach/apply">Apply to teach</Link>.
          </p>
        </section>
      )}

      {referralsOn && (
        <section className="card" style={{ maxWidth: '42rem', marginTop: '1rem' }}>
          <h2 style={{ marginTop: 0 }}>Invite a friend</h2>
          <p className="muted">
            A friend who is new here gets a discount on their first course, and you get one
            on your next once their payment has stayed past the refund window. Both are
            discounts, not money, so there is nothing to pay out.{' '}
            <Link href="/account/referrals">Your invitation code</Link>
          </p>
        </section>
      )}

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
        <h2 style={{ marginTop: 0 }}>How this reads</h2>
        <p className="muted">
          Text size, contrast and motion — applied the moment you choose one, for this browser.
          Nothing here needs saving, and nothing else changes about the page.{' '}
          <Link href="/account/accessibility">Reading preferences</Link>
        </p>
      </section>

      {outstanding === 0 && (
        <section className="card" style={{ maxWidth: '42rem', marginTop: '1rem' }}>
          <h2 style={{ marginTop: 0 }}>Terms and privacy</h2>
          <p className="muted">
            The terms, the privacy notice and the terms for teachers, each versioned.
            {standing && standing.history.length > 0
              ? ' The versions you have agreed to are listed with the time you agreed.'
              : ' Nothing is waiting for your agreement.'}{' '}
            <Link href="/policies">Read them</Link>
          </p>
        </section>
      )}

      <section className="card" style={{ maxWidth: '42rem', marginTop: '1rem' }}>
        <h2 style={{ marginTop: 0 }}>My institution</h2>
        <p className="muted">
          A madrasah, school or organisation you belong to. If your email address is at a domain
          one of them has verified, you can join it; once you are in, it sees counts of its people
          and never your name or what you studied.{' '}
          <Link href="/institution">Where I belong</Link>
        </p>
      </section>

      <section className="card" style={{ maxWidth: '42rem', marginTop: '1rem' }}>
        <h2 style={{ marginTop: 0 }}>What I have paid</h2>
        <p className="muted">
          Every payment that has moved on your billing account, and every refund that
          has come back, with a running total per currency. A refund you have asked for
          is listed separately until it actually moves, because asking is not receiving.
        </p>
        <p>
          <Link href="/billing">See what I have paid</Link>
        </p>
      </section>

      <section className="card" style={{ maxWidth: '42rem', marginTop: '1rem' }}>
        <h2 style={{ marginTop: 0 }}>What I am told</h2>
        <p className="muted">
          Messages from the platform appear in your notification centre, not in an inbox or
          a text message — no delivery provider is configured yet. {unread > 0
            ? `You have ${unread} unread.`
            : 'Nothing is waiting for you.'}{' '}
          You choose which kinds you want, except for notices that money owed to you did not
          arrive: those always come.
        </p>
        <p>
          <Link href="/notifications">
            {unread > 0 ? `Notifications (${unread} unread)` : 'Notifications'}
          </Link>
          {' · '}
          <Link href="/notifications#preferences">Choose what you are told</Link>
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
        <p className="muted" style={{ fontSize: '0.9rem' }}>
          It now carries more than it did: the discussion posts, reviews and marked work, the
          support cases, the messages sent to you, and — if you teach — your earnings and payouts.
          {' '}<Link href="/account/export">What is in it, and what is left out</Link>
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
