import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { fetchOwnLearner } from '@/lib/family';
import { fetchProgressRecord } from '@/lib/progress-record-query';
import { ProgressRecordView } from './progress-record-view';

export const metadata: Metadata = { title: 'Progress and achievements' };
export const dynamic = 'force-dynamic';

/**
 * Screen 18 — progress and achievements.
 *
 * This was the last numbered screen marked BLOCKED, on the honest grounds that
 * the engagement mechanics had never been designed: there was a streak strip on
 * the dashboard and no page, and no badge a learner had not already earned.
 *
 * **Nothing here is stored.** Every number comes from `lesson_progress`, the
 * enrolments, the certificates — rows the platform was already writing — so the
 * page cannot drift from the learning it describes, and turning the feature off
 * takes away a view rather than a record.
 *
 * `?learner=<id>` opens a child's record. Who may read which learner is decided
 * by `can_access_learner()` inside the function; this page only decides what to
 * say when the answer is no.
 */
export default async function ProgressPage({
  searchParams,
}: {
  searchParams: Promise<{ learner?: string }>;
}) {
  if (!isSupabaseConfigured()) redirect('/');

  const { learner: requested } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/progress');

  const own = await fetchOwnLearner(supabase, user.id).catch(() => null);
  const learnerId = requested && /^[0-9a-f-]{36}$/i.test(requested) ? requested : own?.id ?? null;

  if (!learnerId) {
    return (
      <div className="container section">
        <p className="eyebrow">My learning</p>
        <h1>Progress and achievements</h1>
        <p className="lede">
          A progress record belongs to a learner, and this account is not one yet. Becoming a
          learner takes one button and does not create a second account.
        </p>
        <p>
          <Link className="btn" href="/account">Become a learner</Link>
        </p>
        <p className="muted" style={{ marginTop: '1rem' }}>
          <Link href="/learn">Back to my learning</Link>
        </p>
      </div>
    );
  }

  const outcome = await fetchProgressRecord(supabase, learnerId);

  if (!outcome.ok && outcome.reason === 'disabled') {
    return (
      <div className="container section">
        <p className="eyebrow">My learning</p>
        <h1>Progress and achievements</h1>
        <div className="notice">
          Streaks and badges are not switched on for this platform yet. Your progress is still
          being recorded — this page only adds the streak, the calendar and the badges on top of
          it — so turning the feature on will show everything you have already done.
        </div>
        <p style={{ marginTop: '1rem' }}>
          <Link href="/learn">Back to my learning</Link>
        </p>
      </div>
    );
  }

  if (!outcome.ok && outcome.reason === 'forbidden') {
    return (
      <div className="container section">
        <p className="eyebrow">My learning</p>
        <h1>Not your record</h1>
        <p className="lede">
          That learning belongs to somebody else. A record can be read by the learner themselves
          and by the adults in their family.
        </p>
        <p>
          <Link href="/progress">See my own progress</Link>
          {' · '}
          <Link href="/learn">Back to my learning</Link>
        </p>
      </div>
    );
  }

  if (!outcome.ok) {
    return (
      <div className="container section">
        <p className="eyebrow">My learning</p>
        <h1>Progress and achievements</h1>
        <div className="notice">
          The record could not be read just now. Your learning is unaffected — this is a page
          that reads it.
        </div>
        <p className="muted" style={{ marginTop: '1rem' }}>
          <Link href="/learn">Back to my learning</Link>
        </p>
      </div>
    );
  }

  return (
    <ProgressRecordView
      record={outcome.record}
      isSelf={!own || own.id === learnerId}
    />
  );
}
