import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { AGE_BAND_LABEL, fetchChildCourses, learnerCoursesInOrder } from '@/lib/family';

export const metadata: Metadata = { title: 'Learning' };
export const dynamic = 'force-dynamic';

type Learner = {
  id: string;
  display_name: string;
  age_band: string | null;
  learner_type: string;
  family_id: string | null;
};

/**
 * One learner's own page — screen 11, the child's home.
 *
 * There is no child login and there never has been (D2): a child is a
 * `learner_profiles` row inside a family, and the guardian's account is the
 * account. So a "child home" cannot be a separate site with its own session. It
 * is this: the same session, narrowed to one learner, with a big name at the
 * top and nothing on the page that is not theirs.
 *
 * That is the case it is for — a parent hands the device over. The guardian
 * reaches it from `/family`; what the child then sees is their own courses and
 * their own progress, with no billing, no family administration and no way to
 * wander into another child's learning. The courtesies of the wider site (the
 * masthead, the catalogue) remain, because the account is still the parent's
 * and hiding the way out of a page is not a feature.
 *
 * **Who may see it is decided by row level security, not here.** The learner
 * row is fetched with the request-scoped client, so a guardian, a family member
 * and nobody else gets a row back; everyone else gets a 404 rather than a
 * refusal that would confirm the child exists.
 */
export default async function ChildHomePage({
  params,
}: {
  params: Promise<{ childId: string }>;
}) {
  if (!isSupabaseConfigured()) redirect('/');

  const { childId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/sign-in?next=/family/${childId}`);

  const { data } = await supabase
    .from('learner_profiles')
    .select('id, display_name, age_band, learner_type, family_id')
    .eq('id', childId)
    .is('deleted_at', null)
    .maybeSingle();

  const learner = data as unknown as Learner | null;
  if (!learner) notFound();

  const courses = await fetchChildCourses(supabase, learner.id).catch(() => []);
  const { active, finished } = learnerCoursesInOrder(courses);

  return (
    <div className="container section">
      <p className="eyebrow">
        <Link href="/family">My family</Link>
      </p>

      <h1 style={{ fontSize: '2.2rem' }}>{learner.display_name}</h1>
      <p className="muted">
        {learner.age_band ? AGE_BAND_LABEL[learner.age_band] ?? learner.age_band : 'No age band'}
        {' · '}
        {active.length === 0
          ? 'nothing in progress'
          : `${active.length} course${active.length === 1 ? '' : 's'} in progress`}
        {finished.length > 0
          ? ` · ${finished.length} finished`
          : ''}
      </p>

      {active.length + finished.length === 0 ? (
        <div className="card" style={{ marginTop: '1.5rem' }}>
          <p className="empty" style={{ marginTop: 0 }}>
            Nothing here yet.
          </p>
          <p className="muted" style={{ marginBottom: 0 }}>
            A guardian can add a course from the{' '}
            <Link href="/catalogue">catalogue</Link>, choosing this learner when
            it asks who is learning.
          </p>
        </div>
      ) : (
        <div className="grid cols-2" style={{ marginTop: '1.5rem' }}>
          {[...active, ...finished].map((c) => {
            const percent = Math.max(0, Math.min(100, c.percentComplete));
            const done = c.status === 'completed';
            return (
              <article className="card" key={c.enrolmentId}>
                <h2 style={{ margin: 0, fontSize: '1.15rem' }}>{c.courseTitle}</h2>
                <p className="muted" style={{ margin: '0.35rem 0 0.6rem', fontSize: '0.9rem' }}>
                  {c.lessonsDone} of {c.lessonsTotal} lessons · {Math.round(percent)}%
                  {done ? ' · finished' : ''}
                </p>

                <div
                  className="progress"
                  role="progressbar"
                  aria-valuenow={Math.round(percent)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${c.courseTitle} progress`}
                >
                  <span style={{ width: `${percent}%` }} />
                </div>

                <p style={{ marginTop: '0.9rem', marginBottom: 0 }}>
                  <Link className="btn" href={`/learn/${c.enrolmentId}`}>
                    {done ? 'Look again' : c.lessonsDone > 0 ? 'Carry on' : 'Start'}
                  </Link>
                </p>
              </article>
            );
          })}
        </div>
      )}

      <p className="muted" style={{ marginTop: '2rem' }}>
        <Link href="/family">Back to your family</Link>
      </p>
    </div>
  );
}
