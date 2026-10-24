import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { describeProvider, type SignInMethods } from '@/lib/oauth';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Export your data' };

/**
 * Getting your own data out.
 *
 * The page is written for the person who is about to download it, which means
 * it says what is inside, what is deliberately outside, and why — before the
 * button, not in a FAQ nobody opens.
 */
export default async function ExportPage() {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/account/export');

  const { data: methodsData } = await supabase.rpc('my_sign_in_methods');
  const methods = (methodsData ?? null) as SignInMethods | null;

  return (
    <div className="page narrow">
      <nav className="crumbs">
        <Link href="/account">Account</Link>
        <span aria-hidden>›</span>
        <span>Export</span>
      </nav>

      <div className="page-head">
        <p className="eyebrow">Your account</p>
        <h1>Get a copy of your data</h1>
        <p className="muted">
          One file containing what this platform holds about you: your account, the courses you are
          enrolled in, what you have written, what you have been marked on, what you have bought, and
          the messages you have been sent.
        </p>
      </div>

      <div className="card" style={{ padding: '1.25rem' }}>
        <p className="muted" style={{ marginTop: 0 }}>
          The file is JSON — readable in any text editor, and importable by anything that reads JSON.
          It is generated when you ask for it, so it is current at that moment. Ten copies an hour is
          the limit, which protects the platform rather than restricting you.
        </p>
        <p style={{ marginTop: '1rem' }}>
          <a className="btn" href="/api/account/export" download>
            Download my data
          </a>
        </p>
        <p className="muted" style={{ fontSize: '0.85rem', marginBottom: 0 }}>
          Every download is recorded in the audit trail, with the date and how many rows each section
          held. That record is how a surprise copy of somebody&rsquo;s data becomes traceable.
        </p>
      </div>

      <div className="outline-h" style={{ marginTop: '2rem' }}>
        <h3>What is in it</h3>
      </div>
      <div className="card">
        <ul className="lessons">
          <li>
            <strong>Your account</strong>
            <span className="muted" style={{ display: 'block', fontSize: '0.9rem' }}>
              Display name, language, time zone, country, status, and the roles you hold (teacher,
              reviewer, staff — if any).
            </span>
          </li>
          <li>
            <strong>Learner profiles</strong>
            <span className="muted" style={{ display: 'block', fontSize: '0.9rem' }}>
              Your own, and any child you are an active guardian of. It also carries that child&rsquo;s
              enrolments, progress, attempts and certificates.
            </span>
          </li>
          <li>
            <strong>What you wrote</strong>
            <span className="muted" style={{ display: 'block', fontSize: '0.9rem' }}>
              Lesson notes, bookmarks, saved courses, reviews, discussion posts, assignment
              submissions and quiz answers.
            </span>
          </li>
          <li>
            <strong>Money</strong>
            <span className="muted" style={{ display: 'block', fontSize: '0.9rem' }}>
              Orders on any account you belong to, what was bought, and — if you teach — your earnings
              and payouts. Amounts appear exactly as recorded, in their own currency.
            </span>
          </li>
          <li>
            <strong>Support and messages</strong>
            <span className="muted" style={{ display: 'block', fontSize: '0.9rem' }}>
              Cases you opened, the replies you can already see, and every notification sent to you.
            </span>
          </li>
          <li>
            <strong>Activity the platform recorded</strong>
            <span className="muted" style={{ display: 'block', fontSize: '0.9rem' }}>
              The operational events about your use of the product. Nobody but you can read these
              today.
            </span>
          </li>
        </ul>
      </div>

      <div className="outline-h" style={{ marginTop: '2rem' }}>
        <h3>What is not in it, and why</h3>
      </div>
      <div className="card">
        <ul className="lessons">
          <li>
            <strong>Other people&rsquo;s words</strong>
            <span className="muted" style={{ display: 'block', fontSize: '0.9rem' }}>
              A reply under your post, a classmate&rsquo;s message, a teacher&rsquo;s note about a
              different learner — that is their data, not yours, even where it concerns you.
            </span>
          </li>
          <li>
            <strong>Your sign-in address and password</strong>
            <span className="muted" style={{ display: 'block', fontSize: '0.9rem' }}>
              Both live with the authentication provider, outside this database. You sign in with{' '}
              {(methods?.providers ?? []).map(describeProvider).join(' and ') || 'a method this page could not read'}.
            </span>
          </li>
          <li>
            <strong>Internal staff notes</strong>
            <span className="muted" style={{ display: 'block', fontSize: '0.9rem' }}>
              How the team talks to itself about a support case or a review. Publishing it would make
              those notes useless, and they are not a record about you.
            </span>
          </li>
          <li>
            <strong>Uploaded files themselves</strong>
            <span className="muted" style={{ display: 'block', fontSize: '0.9rem' }}>
              Attachments are listed by reference. Copying every stored video into one document is a
              different feature with its own size limits.
            </span>
          </li>
          <li>
            <strong>Credential tokens</strong>
            <span className="muted" style={{ display: 'block', fontSize: '0.9rem' }}>
              Certificate verification tokens and sharing links are what let other people in. Printing
              them in an export is how they stop being secret.
            </span>
          </li>
        </ul>
      </div>

      <p className="muted" style={{ marginTop: '1.5rem', fontSize: '0.9rem' }}>
        Closing your account is separate and irreversible: <Link href="/account/delete">close my account</Link>.
        {' '}What happens to each kind of record is written on that page.
      </p>

      <p style={{ marginTop: '1rem' }}>
        <Link href="/account">Back to account settings</Link>
      </p>
    </div>
  );
}
