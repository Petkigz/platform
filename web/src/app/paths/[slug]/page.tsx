import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { isFlagEnabled } from '@/lib/flags';
import { ownLearnerProfileId } from '@/lib/enrolment';
import { fetchSummary } from '@/lib/progress';
import { summarizeLearningPathProgress } from '@/lib/learning-paths';

export const dynamic = 'force-dynamic';

type PathItem = {
  id: string;
  position: number;
  required: boolean;
  courses: { id: string; title: string; slug: string; status: string }[] | null;
};

type Enrolment = { id: string; course_id: string; status: string };

export default async function LearningPathPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  if (!isSupabaseConfigured()) notFound();
  const { slug } = await params;
  const supabase = await createClient();
  const enabled = await isFlagEnabled(supabase, 'learning.paths');
  if (!enabled) {
    return (
      <div className="container section">
        <h1>Guided learning</h1>
        <p className="notice">Guided paths are being prepared. <Link href="/catalogue">Browse courses</Link>.</p>
      </div>
    );
  }

  const { data, error } = await supabase
    .from('learning_paths')
    .select('id,title,slug,description,audience,learning_path_items(id,position,required,courses(id,title,slug,status))')
    .eq('slug', slug)
    .eq('status', 'active')
    .is('deleted_at', null)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) notFound();

  const path = data as unknown as {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    audience: 'child' | 'adult' | 'both';
    learning_path_items: PathItem[] | null;
  };
  const items = (path.learning_path_items ?? [])
    .filter((item) => item.courses?.[0]?.status === 'active')
    .sort((a, b) => a.position - b.position);
  const courseIds = items.map((item) => item.courses![0]!.id);

  const { data: { user } } = await supabase.auth.getUser();
  const learnerId = user ? await ownLearnerProfileId(supabase, user.id) : null;
  let enrolments: Enrolment[] = [];
  if (learnerId && courseIds.length > 0) {
    const { data: rows, error: enrolmentError } = await supabase
      .from('course_enrolments')
      .select('id,course_id,status')
      .eq('learner_profile_id', learnerId)
      .in('course_id', courseIds)
      .is('deleted_at', null);
    if (enrolmentError) throw new Error(enrolmentError.message);
    enrolments = (rows ?? []) as unknown as Enrolment[];
  }

  const enrolmentByCourse = new Map(enrolments.map((enrolment) => [enrolment.course_id, enrolment]));
  const courseProgress = new Map<string, { status: string; percentComplete: number }>();
  await Promise.all(enrolments.map(async (enrolment) => {
    if (enrolment.status === 'completed') {
      courseProgress.set(enrolment.course_id, { status: enrolment.status, percentComplete: 100 });
    } else if (enrolment.status === 'active') {
      const summary = await fetchSummary(supabase, enrolment.id);
      courseProgress.set(enrolment.course_id, {
        status: enrolment.status,
        percentComplete: summary.percentComplete,
      });
    } else {
      courseProgress.set(enrolment.course_id, { status: enrolment.status, percentComplete: 0 });
    }
  }));

  const pathProgress = summarizeLearningPathProgress(
    items.map((item) => ({ courseId: item.courses![0]!.id, required: item.required })),
    courseProgress,
  );

  return (
    <div className="container section">
      <p className="eyebrow"><Link href="/paths">Learning paths</Link> · {path.audience === 'both' ? 'Children and adults' : path.audience === 'child' ? 'For children' : 'For adults'}</p>
      <h1>{path.title}</h1>
      {path.description && <p className="lede">{path.description}</p>}

      {!user ? (
        <p className="notice">
          Sign in to track your progress through this path.{' '}
          <Link href={`/sign-in?next=/paths/${encodeURIComponent(path.slug)}`}>Sign in</Link>
        </p>
      ) : !learnerId ? (
        <p className="notice">Your learner profile is not available yet. You can still open any course below.</p>
      ) : pathProgress.requiredCount > 0 ? (
        <section className="card" aria-label="Your learning path progress">
          <strong>{pathProgress.completedRequired} of {pathProgress.requiredCount} required courses complete</strong>
          <div
            className="progress"
            role="progressbar"
            aria-valuenow={pathProgress.percentComplete}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Learning path progress"
          >
            <span style={{ width: `${pathProgress.percentComplete}%` }} />
          </div>
          <p className="meta">{pathProgress.percentComplete}% complete</p>
        </section>
      ) : <p className="notice">This path has no required courses to track.</p>}

      {items.length === 0 ? <p className="empty">There are no published courses in this path yet.</p> : (
        <ol className="grid" style={{ paddingLeft: '1.5rem' }}>
          {items.map((item) => {
            const course = item.courses![0]!;
            const enrolment = enrolmentByCourse.get(course.id);
            const progress = courseProgress.get(course.id);
            const href = enrolment && ['active', 'completed'].includes(enrolment.status)
              ? `/learn/${enrolment.id}`
              : `/courses/${course.slug}`;
            const action = enrolment?.status === 'completed' ? 'Review course'
              : enrolment?.status === 'active' && (progress?.percentComplete ?? 0) > 0 ? 'Continue course'
                : enrolment?.status === 'active' ? 'Start course'
                  : 'View course';
            return (
              <li className="card" key={item.id}>
                <div className="row" style={{ justifyContent: 'space-between', alignItems: 'start' }}>
                  <div>
                    <p className="eyebrow">Course {item.position} · {item.required ? 'Required' : 'Optional'}</p>
                    <h2><Link href={href}>{course.title}</Link></h2>
                    {progress && <p className="muted">{progress.status === 'completed' ? 'Completed' : progress.status === 'active' && progress.percentComplete > 0 ? `${Math.round(progress.percentComplete)}% complete` : 'Not started'}</p>}
                  </div>
                  <Link className="btn secondary" href={href}>{action}</Link>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
