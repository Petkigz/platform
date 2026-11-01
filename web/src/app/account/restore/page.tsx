import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { RestoreForm } from './restore-form';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Restore your data' };

/**
 * Putting an export back.
 *
 * The page is written for somebody holding a file and hoping: they left, or
 * they are on a new account, and the question is what of it can come back. The
 * honest answer is on the page before the button — their own words come back,
 * and the platform's record of them does not — because a person who finds that
 * out afterwards has been misled by a screen that stayed silent.
 *
 * The list below is the same list `restore_my_data()` returns, said here so it
 * can be read before a file is chosen. The function is still the authority; if
 * the two ever disagree, the file is right and this paragraph is the bug.
 */
export default async function RestorePage() {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/account/restore');

  return (
    <div className="page narrow">
      <nav className="crumbs">
        <Link href="/account">Account</Link>
        <span aria-hidden>›</span>
        <span>Restore</span>
      </nav>

      <div className="page-head">
        <p className="eyebrow">Your account</p>
        <h1>Put your data back</h1>
        <p className="muted">
          If you downloaded your data and want it back — on this account after a break, or on a new
          account — this reads that file and puts back the part of it you wrote.
        </p>
      </div>

      <div className="card" style={{ padding: '1.25rem' }}>
        <RestoreForm />
      </div>

      <div className="outline-h" style={{ marginTop: '2rem' }}>
        <h3>What can come back</h3>
      </div>
      <div className="card">
        <ul className="lessons">
          <li>
            <strong>Your profile</strong>
            <span className="muted" style={{ display: 'block', fontSize: '0.9rem' }}>
              Name, language, time zone and country. Only the fields that differ from what is here
              now, and only values this platform can actually hold.
            </span>
          </li>
          <li>
            <strong>Your notes and bookmarks</strong>
            <span className="muted" style={{ display: 'block', fontSize: '0.9rem' }}>
              Put back on the lessons they were written on — but only where you are enrolled now.
              A note belongs to an enrolment, so a course you have left has nowhere to put it.
            </span>
          </li>
        </ul>
      </div>

      <div className="outline-h" style={{ marginTop: '2rem' }}>
        <h3>What cannot, and why</h3>
      </div>
      <div className="card">
        <ul className="lessons">
          <li>
            <strong>Enrolments</strong>
            <span className="muted" style={{ display: 'block', fontSize: '0.9rem' }}>
              An enrolment is an entitlement, and sometimes a paid one. A file that could grant one
              would be a file that gives courses away. Enrol again, then run the file a second time:
              your notes will find their lessons.
            </span>
          </li>
          <li>
            <strong>Certificates</strong>
            <span className="muted" style={{ display: 'block', fontSize: '0.9rem' }}>
              Issued by the platform and signed by a person. One written from a file would be a
              forgery that verifies. The numbers in your file are still real, and{' '}
              <Link href="/verify">certificate verification</Link> still confirms them.
            </span>
          </li>
          <li>
            <strong>Orders, refunds and progress</strong>
            <span className="muted" style={{ display: 'block', fontSize: '0.9rem' }}>
              A ledger and a record of what happened here. Restoring either would be a claim rather
              than a copy. Your receipts stay in the file for your own records.
            </span>
          </li>
          <li>
            <strong>What you published, and what you were marked on</strong>
            <span className="muted" style={{ display: 'block', fontSize: '0.9rem' }}>
              Reviews, discussion posts and assignment submissions were each published and, where it
              was needed, moderated. Re-posting them would republish words nobody has re-read.
            </span>
          </li>
          <li>
            <strong>Children, roles and privileges</strong>
            <span className="muted" style={{ display: 'block', fontSize: '0.9rem' }}>
              A child&rsquo;s profile carries a guardian relationship somebody verified, and a staff
              role is granted by a person rather than carried in a file. Both are added through the
              screens that record who did it.
            </span>
          </li>
        </ul>
      </div>

      <p className="muted" style={{ marginTop: '1.5rem', fontSize: '0.9rem' }}>
        Nothing is written until you have seen what would be written, and the restore is recorded in
        the audit trail with what it put back. Receipts for the file itself:{' '}
        <Link href="/account/export">download your data</Link>.
      </p>
    </div>
  );
}
