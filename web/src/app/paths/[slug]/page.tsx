import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { isFlagEnabled } from '@/lib/flags';
import { ownLearnerProfileId } from '@/lib/enrolment';
import { fetchSummary } from '@/lib/progress';
import { summarizeLearningPathProgress } from '@/lib/learning-paths';
import { one } from '@/lib/embed';
import { formatNumber, formatPercent, translator } from '@/lib/i18n';
import { audienceName, readerLanguage } from '../reader';

export const dynamic = 'force-dynamic';

type PathItem = {
  id: string;
  position: number;
  required: boolean;
  // One course per item: PostgREST sends an object. Read through one().
  courses: { id: string; title: string; slug: string; status: string } | { id: string; title: string; slug: string; status: string }[] | null;
};

type Enrolment = { id: string; course_id: string; status: string };

/**
 * One learning path, and the reader's way through it.
 *
 * **In the reader's language** since 2026-11-27 (`messages/paths.ts`). The
 * path's and the courses' titles are their authors' and are shown as written.
 * Numbers are in the reader's digits, a percentage is written the way the
 * language writes one, and no link sits inside a sentence.
 *
 * Every read here throws when it fails (the switch, the path, the learner,
 * the enrolments, each course's progress), so "not started" is only ever said
 * of a course whose progress was read.
 */
export default async function LearningPathPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  if (!isSupabaseConfigured()) notFound();
  const { slug } = await params;
  const { locale, shown } = await readerLanguage();
  const t = translator(shown.code);
  const frame = shown.code !== locale ? { lang: shown.code, dir: shown.dir } : {};
  const num = (value: number) => formatNumber(shown.code, value);
  const supabase = await createClient();
  const enabled = await isFlagEnabled(supabase, 'learning.paths');
  if (!enabled) {
    return (
      <div className="container section" {...frame}>
        <h1>{t('paths.eyebrow')}</h1>
        <p className="notice">{t('paths.off')}</p>
        <p>
          <Link href="/catalogue">{t('home.browse')}</Link>
        </p>
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
    .filter((item) => one(item.courses)?.status === 'active')
    .sort((a, b) => a.position - b.position);
  const courseIds = items.map((item) => one(item.courses)!.id);

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
    items.map((item) => ({ courseId: one(item.courses)!.id, required: item.required })),
    courseProgress,
  );

  return (
    <div className="container section" {...frame}>
      <p className="eyebrow">
        <Link href="/paths">{t('paths.title')}</Link> · {audienceName(t, path.audience)}
      </p>
      <h1 dir="auto">{path.title}</h1>
      {path.description && <p className="lede" dir="auto">{path.description}</p>}

      {!user ? (
        <p className="notice">
          {t('paths.signIn')}{' '}
          <Link href={`/sign-in?next=/paths/${encodeURIComponent(path.slug)}`}>{t('action.signIn')}</Link>
        </p>
      ) : !learnerId ? (
        <p className="notice">{t('paths.noLearner')}</p>
      ) : pathProgress.requiredCount > 0 ? (
        <section className="card" aria-label={t('paths.progressLabel')}>
          <strong>
            {t('paths.done', { done: num(pathProgress.completedRequired), total: num(pathProgress.requiredCount) })}
          </strong>
          <div
            className="progress"
            role="progressbar"
            aria-valuenow={pathProgress.percentComplete}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t('paths.progressLabel')}
          >
            <span style={{ width: `${pathProgress.percentComplete}%` }} />
          </div>
          <p className="meta">{t('paths.percent', { percent: formatPercent(shown.code, pathProgress.percentComplete) })}</p>
        </section>
      ) : (
        <p className="notice">{t('paths.noRequired')}</p>
      )}

      {items.length === 0 ? (
        <p className="empty">{t('paths.empty')}</p>
      ) : (
        <ol className="grid" style={{ paddingInlineStart: '1.5rem' }}>
          {items.map((item) => {
            const course = one(item.courses)!;
            const enrolment = enrolmentByCourse.get(course.id);
            const progress = courseProgress.get(course.id);
            const href = enrolment && ['active', 'completed'].includes(enrolment.status)
              ? `/learn/${enrolment.id}`
              : `/courses/${course.slug}`;
            const action = enrolment?.status === 'completed' ? t('paths.actReview')
              : enrolment?.status === 'active' && (progress?.percentComplete ?? 0) > 0 ? t('paths.actContinue')
                : enrolment?.status === 'active' ? t('paths.actStart')
                  : t('paths.actView');
            return (
              <li className="card" key={item.id}>
                <div className="row" style={{ justifyContent: 'space-between', alignItems: 'start' }}>
                  <div>
                    <p className="eyebrow">
                      {t('paths.position', { number: num(item.position) })} · {t(item.required ? 'paths.required' : 'paths.optional')}
                    </p>
                    <h2>
                      <Link href={href} dir="auto">{course.title}</Link>
                    </h2>
                    {progress && (
                      <p className="muted">
                        {progress.status === 'completed'
                          ? t('lesson.completed')
                          : progress.status === 'active' && progress.percentComplete > 0
                            ? t('paths.percent', { percent: formatPercent(shown.code, Math.round(progress.percentComplete)) })
                            : t('lesson.notStarted')}
                      </p>
                    )}
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
