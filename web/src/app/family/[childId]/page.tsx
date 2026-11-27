import Link from 'next/link';
import type { Metadata } from 'next';
import { cookies, headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { throwUnlessWrongAddress } from '@/lib/read-failed';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { ageBandLabel } from '@/lib/age-band';
import {
  certificateLine,
  groupLearnerCourses,
  lastActivityLabel,
  parseLearnerCourses,
  progressSentence,
  statusLabel,
  type LearnerCourseCopy,
} from '@/lib/learner-courses';
import {
  LOCALE_COOKIE,
  chooseLocale,
  countLabel,
  formatNumber,
  languageShownFor,
  pluralForm,
  translator,
} from '@/lib/i18n';

export const dynamic = 'force-dynamic';

/** The language this page is written in for this reader, and whether that is the one they chose. */
async function readerLanguage() {
  const jar = await cookies();
  const hdrs = await headers();
  const { code: locale } = chooseLocale({
    chosen: jar.get(LOCALE_COOKIE)?.value ?? null,
    acceptLanguage: hdrs.get('accept-language'),
  });
  const shown = languageShownFor(locale, 'family');
  return { locale, shown };
}

// The tab says where this is, not whose it is: a child's name in a tab title
// is a name in a browser's history.
export async function generateMetadata(): Promise<Metadata> {
  const { shown } = await readerLanguage();
  return { title: translator(shown.code)('nav.family') };
}

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
 *
 * **In the reader's language**, on the same rule as `/family`
 * (`messages/family.ts`): twenty-seven languages have it, and a language held
 * for review reads it in English, whole. The sentences about one course are
 * chosen by `lib/learner-courses.ts` and said with this page's words.
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

  const { data, error: learnerError } = await supabase
    .from('learner_profiles')
    .select('id, display_name, age_band, learner_type, family_id')
    .eq('id', childId)
    .is('deleted_at', null)
    .maybeSingle();
  // A read that failed is not a thing that does not exist: the site's error
  // page, not "not found" and not an empty list.
  throwUnlessWrongAddress(learnerError);

  const learner = data as unknown as Learner | null;
  if (!learner) notFound();

  const { locale, shown } = await readerLanguage();
  const t = translator(shown.code);
  const num = (value: number) => formatNumber(shown.code, value);
  const frame = shown.code !== locale ? { lang: shown.code, dir: shown.dir } : {};

  // A day and nothing finer, in UTC: the page is drawn on a server that does
  // not know the reader's zone, and the sentence it goes into is about a month
  // or more ago.
  const day = (when: Date) => {
    const options = { dateStyle: 'medium', timeZone: 'UTC' } as const;
    try { return new Intl.DateTimeFormat(shown.code, options).format(when); }
    catch { return new Intl.DateTimeFormat('en', options).format(when); }
  };
  const copy: LearnerCourseCopy = {
    say: (key, vars) => t(key, vars),
    number: num,
    day,
    plural: (count) => pluralForm(shown.code, count),
  };

  // One definition, in the database: `learner_across_courses()` refuses any caller
  // `can_access_learner()` does not admit, so the boundary does not depend on this
  // page remembering to check it. It is also the only place that knows a learner's
  // certificate and when they last opened a lesson, which are the two facts a
  // guardian actually wants beside the progress bar.
  const { data: courseData, error: coursesError } = await supabase.rpc('learner_across_courses', {
    p_learner_profile_id: learner.id,
  });
  // Unread is not "no courses": a parent would be told their child has none.
  if (coursesError) throw new Error(coursesError.message);
  const courses = parseLearnerCourses(courseData);
  const { active, finished, stopped } = groupLearnerCourses(courses);
  const everything = [...active, ...finished, ...stopped];

  const band = learner.age_band
    ? ageBandLabel(learner.age_band, {
        ages: (from, to) => t('family.ages', { from: num(from), to: num(to) }),
        adult: t('family.bandAdult'),
      })
    : t('family.noBand');

  return (
    <div className="container section" {...frame}>
      <p className="eyebrow">
        <Link href="/family">{t('nav.family')}</Link>
      </p>

      <h1 style={{ fontSize: '2.2rem' }}><bdi>{learner.display_name}</bdi></h1>
      <p className="muted">
        {band}
        {' · '}
        {active.length === 0
          ? t('family.goingNone')
          : countLabel(shown.code, active.length, { one: 'family.goingOne', other: 'family.goingOther' })}
        {finished.length > 0 ? ` · ${t('family.finishedCount', { count: num(finished.length) })}` : ''}
        {stopped.length > 0 ? ` · ${t('family.stoppedCount', { count: num(stopped.length) })}` : ''}
      </p>

      {everything.length === 0 ? (
        <div className="card" style={{ marginTop: '1.5rem' }}>
          <p className="empty" style={{ marginTop: 0 }}>{t('family.nothing')}</p>
          <p className="muted" style={{ marginBottom: 0 }}>
            {t('family.guardianAdd')}{' '}
            <Link href="/catalogue">{t('nav.catalogue')}</Link>
          </p>
        </div>
      ) : (
        <div className="grid cols-2" style={{ marginTop: '1.5rem' }}>
          {everything.map((c) => {
            const percent = Math.max(0, Math.min(100, c.percentComplete));
            const done = c.status === 'completed';
            const badge = statusLabel(c, copy);
            const certificate = certificateLine(c, copy);
            return (
              <article className="card" key={c.enrolmentId}>
                <h2 style={{ margin: 0, fontSize: '1.15rem' }} dir="auto">{c.courseTitle}</h2>
                {badge && (
                  <p style={{ margin: '0.35rem 0 0' }}>
                    <span className="badge neutral">{badge}</span>
                  </p>
                )}
                <p className="muted" style={{ margin: '0.35rem 0 0.6rem', fontSize: '0.9rem' }}>
                  {progressSentence(c, copy)} · {lastActivityLabel(c.lastActivityAt, copy)}
                </p>

                <div
                  className="progress"
                  role="progressbar"
                  aria-valuenow={Math.round(percent)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={t('learn.progressLabel', { course: `\u2068${c.courseTitle}\u2069` })}
                >
                  <span style={{ width: `${percent}%` }} />
                </div>

                {certificate && (
                  <p className="muted" style={{ margin: '0.6rem 0 0', fontSize: '0.9rem' }}>
                    {c.certificateStatus === 'issued' ? (
                      <Link href={`/certificates/${c.certificateNumber}`}>{certificate}</Link>
                    ) : (
                      certificate
                    )}
                  </p>
                )}

                <p style={{ marginTop: '0.9rem', marginBottom: 0 }}>
                  <Link className="btn" href={`/learn/${c.enrolmentId}`}>
                    {done ? t('family.again') : c.lessonsDone > 0 ? t('learn.continue') : t('learn.start')}
                  </Link>
                </p>
              </article>
            );
          })}
        </div>
      )}

      <p className="muted" style={{ marginTop: '2rem' }}>
        <Link href="/family">{t('family.backFamily')}</Link>
      </p>
    </div>
  );
}
