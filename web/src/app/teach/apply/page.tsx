import Link from 'next/link';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import {
  APPOINTMENT_NOTICE,
  describeStatus,
  parseOwnApplication,
  safeSampleUrl,
} from '@/lib/teaching';
import { TeachingApplyForm } from './apply-form';
import { WithdrawApplication } from './withdraw-button';

export const dynamic = 'force-dynamic';

function when(iso: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Applying to teach.
 *
 * Reachable by anybody signed in — this is the one page under `/teach` that a
 * person without the role may open, and that is the point of it. `/teach` itself
 * still turns a learner away, and this page says why in the same breath as it
 * offers the form: the appointment is made by a person, and applying is how you
 * ask for one.
 *
 * The form disappears once somebody holds an application or the role, and what
 * replaces it is the answer rather than a disabled button.
 */
export default async function TeachApplyPage() {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/teach/apply');

  const { data } = await supabase.rpc('my_teaching_application');
  const board = parseOwnApplication(data);

  if (!board) {
    return (
      <div className="container section">
        <p className="eyebrow">Teaching</p>
        <h1>Apply to teach</h1>
        <div className="notice error">
          Your application could not be read. Nothing has been sent or changed by this page.
        </div>
      </div>
    );
  }

  const application = board.application;
  const openApplication = application && application.status === 'submitted';

  return (
    <div className="container section">
      <p className="eyebrow">
        <Link href="/about">About</Link>
      </p>
      <h1>Apply to teach</h1>
      <p className="lede">{APPOINTMENT_NOTICE}</p>

      {board.isInstructor && (
        <div className="notice" style={{ marginTop: '1rem' }}>
          <strong>You already teach here.</strong> There is nothing to apply for.{' '}
          <Link href="/teach">Go to your courses</Link>.
        </div>
      )}

      {!board.isInstructor && openApplication && application && (
        <section className="card" style={{ marginTop: '1rem' }}>
          <div className="outline-h" style={{ marginTop: 0 }}>
            <h2 style={{ margin: 0 }}>Your application</h2>
            <span className="badge neutral">{describeStatus(application.status)}</span>
          </div>
          <p className="meta" style={{ marginTop: '0.5rem' }}>
            <strong>{application.headline}</strong> · sent {when(application.submittedAt)}
          </p>
          <p className="muted">{application.qualifications}</p>
          {safeSampleUrl(application.sampleUrl) && (
            <p>
              <a href={safeSampleUrl(application.sampleUrl)!} rel="noreferrer noopener" target="_blank">
                The sample lesson you sent
              </a>
            </p>
          )}
          <WithdrawApplication />
        </section>
      )}

      {!board.isInstructor && application?.status === 'declined' && (
        <div className="notice warn" style={{ marginTop: '1rem' }}>
          <strong>Not approved this time.</strong>
          {application.decisionReason && <> The note left for you: “{application.decisionReason}”</>}{' '}
          You can send another application — people improve, and a second look costs nothing.
        </div>
      )}

      {!board.isInstructor && application?.status === 'withdrawn' && (
        <div className="notice" style={{ marginTop: '1rem' }}>
          You took your application back. You can send a new one below.
        </div>
      )}

      {!board.isInstructor && board.open && !openApplication && (
        <div style={{ marginTop: '1.5rem' }}>
          <h2>What the owner reads</h2>
          <TeachingApplyForm />
        </div>
      )}

      {!board.isInstructor && !board.open && (
        <div className="notice" style={{ marginTop: '1rem' }}>
          <strong>Applications are closed at the moment.</strong> Nothing can be sent from this
          page, and nothing has been lost — if you would like to teach here, ask the owner
          directly. The courses are still open to learn from.
        </div>
      )}

      <p style={{ marginTop: '1.5rem' }}>
        <Link href="/catalogue" className="btn secondary">
          Browse the courses
        </Link>{' '}
        <Link href="/learn" className="btn ghost">
          My learning
        </Link>
      </p>
    </div>
  );
}
