import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { isFlagEnabled } from '@/lib/flags';
import { fetchReviewQueue } from '@/lib/reviews';
import { ModerateForm } from './moderate-form';

export const metadata = { title: 'Review queue' };
export const dynamic = 'force-dynamic';

/**
 * Reviews waiting on a person.
 *
 * Only text arrives here. A rating with no words is counted the moment it is
 * written, because there is nothing to read — so this queue is a reading queue,
 * and its length is a function of how many learners chose to explain
 * themselves, not of how many rated a course.
 *
 * There is no edit. Publishing or withdrawing are the only two decisions
 * available, because rewriting a learner's words and leaving their name on them
 * would turn their review into staff-authored content presented as an opinion.
 */
export default async function AdminCourseReviewsPage() {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/admin/course-reviews');

  const { data: privileged } = await supabase.rpc('is_privileged', { p_user_id: user.id });
  if (privileged !== true) redirect('/');

  const [open, queue] = await Promise.all([
    isFlagEnabled(supabase, 'learning.reviews').catch(() => false),
    fetchReviewQueue(supabase),
  ]);

  return (
    <div className="page wide">
      <nav className="crumbs">
        <Link href="/admin">Admin</Link>
        <span aria-hidden>›</span>
        <span>Course reviews</span>
      </nav>

      <div className="page-head">
        <p className="eyebrow">Satisfaction, not scholarship</p>
        <h1>Review queue</h1>
        <p className="muted">
          Ratings from enrolled learners that include words. Publishing counts
          them; withdrawing needs a reason the author can see.
        </p>
      </div>

      {!open && (
        <div className="notice warn">
          <code>learning.reviews</code> is off, so no new reviews can be written.
          Anything already held here can still be decided.
        </div>
      )}

      {queue.length === 0 ? (
        <p className="muted">Nothing is waiting to be read.</p>
      ) : (
        queue.map((r) => (
          <section className="card" key={r.id}>
            <p className="eyebrow">
              {'★'.repeat(r.rating)}
              {' · '}
              {r.courseSlug ? (
                <Link href={`/courses/${r.courseSlug}`}>{r.courseTitle}</Link>
              ) : (
                r.courseTitle
              )}
              {' · '}
              {r.reviewerName ?? 'A learner'}
              {' · '}
              {new Date(r.createdAt).toLocaleString()}
            </p>
            <blockquote style={{ margin: '0.5rem 0 1rem' }}>
              <p>{r.body}</p>
            </blockquote>
            <ModerateForm reviewId={r.id} />
          </section>
        ))
      )}

      <p className="muted" style={{ fontSize: '.85rem' }}>
        A review never affects publication. Scholarly review stays in{' '}
        <Link href="/admin/reviews">Assign reviews</Link>, and nothing on this
        page can approve a course version.
      </p>
    </div>
  );
}
