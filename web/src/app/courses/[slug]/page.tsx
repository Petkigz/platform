import Link from 'next/link';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { isSupabaseConfigured } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';
import {
  AUDIENCE_LABEL,
  DIFFICULTY_LABEL,
  displayVersion,
  languagesFor,
  subjectNames,
  type CatalogueCourse,
} from '@/lib/catalogue';
import {
  enrollableLearners,
  offeringLabel,
  ownLearnerProfileId,
  resolveOffering,
} from '@/lib/enrolment';
import { countryFromHeaders } from '@/lib/geo';
import { EnrolButton } from './enrol-button';
import { BAND_LABEL, isAgeBand } from '@/lib/audience';
import { isFlagEnabled } from '@/lib/flags';
import {
  canReviewCourse,
  fetchCourseReviews,
  fetchReviewSummary,
  type CourseReview,
  type ReviewSummary,
} from '@/lib/reviews';
import { ReviewPanel } from './review-panel';
import { SaveButton } from './save-button';
import { isCourseSaved } from '@/lib/wishlist';
import { fetchJoinableCohorts } from '@/lib/cohorts';
import { CohortBrowser } from './cohort-browser';
import { recordEvent } from '@/lib/analytics-server';
import { fetchCourseTeacher, teacherAttribution } from '@/lib/course-teacher';
import { breadcrumbJsonLd, courseJsonLd } from '@/lib/structured-data';
import { siteOrigin } from '@/lib/site';
import { parseLanguages, textProps, type Language } from '@/lib/language';
import { JsonLdScript } from '../../_shared/json-ld';
import { WhoTeaches } from '../../_shared/who-teaches';

export const dynamic = 'force-dynamic';

type Section = {
  id: string;
  title: string;
  position: number;
  lessons: {
    id: string;
    title: string;
    position: number;
    is_preview: boolean;
  }[] | null;
};

// `status` and `deleted_at` are selected here but not on the catalogue query,
// because the catalogue filters on them rather than displaying them.
/** "Ages 8–10 and 11–13", in age order, whatever order the author ticked. */
function describeBands(bands: string[]): string {
  return bands
    .filter(isAgeBand)
    .sort((a, b) => Number(a.split('-')[0]) - Number(b.split('-')[0]))
    .map((b) => BAND_LABEL[b])
    .join(' and ');
}

type CourseDetail = CatalogueCourse & {
  status: string;
  deleted_at: string | null;
  created_by: string;
};

type VersionWithStructure = NonNullable<CatalogueCourse['course_versions']>[number] & {
  course_sections?: Section[] | null;
};

/**
 * What a search result says about this course.
 *
 * It used to be the slug with its dashes turned into spaces — "the pillars of
 * islam" — which is the URL, not the course. A learner deciding whether to tap a
 * result reads the title and the description, and the page has both: the author
 * wrote a title and a summary, and they are what the page itself shows.
 *
 * The canonical URL removes the query string. A course page is reachable with
 * tracking parameters and with `?` noise from shared links, and telling a search
 * engine that those are separate pages splits the one page's standing across
 * copies of itself.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (!isSupabaseConfigured()) return { title: slug.replace(/-/g, ' ') };

  const supabase = await createClient();
  const { data } = await supabase
    .from('courses')
    .select('title, description')
    .eq('slug', slug)
    .is('deleted_at', null)
    .maybeSingle();

  // A missing course is the page's business: it calls notFound(). Returning the
  // slug here keeps the two paths from disagreeing about what exists.
  if (!data) return { title: slug.replace(/-/g, ' '), alternates: { canonical: `/courses/${slug}` } };

  const title = String(data.title ?? slug);
  const description = typeof data.description === 'string' ? data.description.trim() : '';

  return {
    title,
    ...(description ? { description, openGraph: { title, description } } : {}),
    alternates: { canonical: `/courses/${slug}` },
  };
}

/**
 * The public course page.
 *
 * Sections and lessons hang off the course *version*, so this walks the join
 * the same way the database models it: course -> version -> sections ->
 * lessons. Nothing here filters by viewer. RLS returns the published version
 * and its structure to anyone, and returns an unpublished one only to its
 * author, an assigned reviewer, or staff.
 */
export default async function CoursePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  if (!isSupabaseConfigured()) notFound();

  const { slug } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('courses')
    .select(
      'id, slug, title, description, audience, age_bands, difficulty, status, deleted_at, created_by, ' +
        'language_code, ' +
        'course_versions ( id, version_number, language, version_status, ' +
        'course_version_subjects ( subject_areas ( code, name ) ), ' +
        'course_sections ( id, title, position, ' +
        'lessons ( id, title, position, is_preview ) ) )',
    )
    .eq('slug', slug)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  const course = data as unknown as CourseDetail | null;
  if (!course || course.status !== 'active') notFound();

  const published = (course.course_versions ?? []).filter(
    (v) => v.version_status === 'published',
  );
  // Highest published version wins. A retired version still resolves for
  // anyone already enrolled (D6), but the public page shows the current one.
  const version = published.reduce<VersionWithStructure | null>(
    (best, v) => (best && best.version_number >= v.version_number ? best : v),
    null,
  );

  if (!version) notFound();

  // The language, read from the register so the name can be printed in words
  // rather than as a two-letter code. A missing row means English, which is
  // what the column defaults to.
  const languageRegister: Language[] = parseLanguages(
    (await supabase.rpc('course_languages')).data,
  );
  const taughtLanguage =
    languageRegister.find((entry) => entry.code === (course.language_code ?? 'en')) ?? null;
  const taughtIn =
    taughtLanguage && taughtLanguage.code !== 'en'
      ? `Taught in ${taughtLanguage.englishName}${
          taughtLanguage.nativeName !== taughtLanguage.englishName
            ? ` — ${taughtLanguage.nativeName}`
            : ''
        }.`
      : null;

  // A course page seen by a signed-in visitor. The subject is the *version*,
  // because a course can be republished and "which terms were they reading" is
  // the question a report will ask later.
  await recordEvent(supabase, 'course.viewed', { subjectId: version.id });

  const sections = (version.course_sections ?? [])
    .slice()
    .sort((a, b) => a.position - b.position);

  const subjects = subjectNames(version);
  const languages = languagesFor(course);

  // Who is looking, and what it would cost them. Both answers come from the
  // database rather than from a flag on the course, because "is this free" is
  // a question about products and prices, not about the course row.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const previewsEnabled = await isFlagEnabled(supabase, 'learning.previews').catch(() => false);
  const learnerProfileId = user ? await ownLearnerProfileId(supabase, user.id) : null;
  // Who this account can enrol: itself, plus any children in its families. A
  // child has no account of its own (D2), so this list is the only way a child
  // ever gets into a course.
  const learners = user ? await enrollableLearners(supabase, user.id) : [];
  const offering = await resolveOffering(supabase, {
    courseId: course.id,
    learnerProfileId,
    // Display only: the account's recorded country wins inside the database.
    country: countryFromHeaders(await headers()),
  });
  const lessonCount = sections.reduce(
    (n, s) => n + (s.lessons?.length ?? 0),
    0,
  );

  // Who wrote it. Row level security answers: a draft profile, a flag that is
  // off, or an author who is not a teacher all come back as no row, and
  // `teacherAttribution()` has an honest sentence for that case rather than a
  // blank line. A failure here must not take the course page down with it —
  // the course is readable whether or not its teacher can be named.
  const teacher = await fetchCourseTeacher(supabase, course.created_by).catch(() => null);
  const attribution = teacherAttribution(teacher);

  // Ratings and reviews. Read only when the flag is on: the tables exist either
  // way, but an empty review section on every course page is a promise the
  // platform is not keeping yet.
  const reviewsOn = await isFlagEnabled(supabase, 'learning.reviews').catch(() => false);
  const [reviewSummary, courseReviews, mayReview] = reviewsOn
    ? await Promise.all([
        fetchReviewSummary(supabase, course.id),
        fetchCourseReviews(supabase, { courseId: course.id, myUserId: user?.id ?? null }),
        canReviewCourse(supabase, { courseId: course.id, learnerProfileId }),
      ])
    : ([{ average: 0, count: 0, distribution: {} }, [], false] as [ReviewSummary, CourseReview[], boolean]);

  // Saved for later. Asked only when the flag is on and someone is signed in:
  // the row is private to an account, so there is nothing to look up otherwise.
  const savedOn = user
    ? await isFlagEnabled(supabase, 'learning.wishlist').catch(() => false)
    : false;
  const savedState = savedOn
    ? await isCourseSaved(supabase, course.id)
    : { saved: false, id: null, note: null };

  // RLS returns open cohorts while the flag is on, and still returns an
  // existing member's own class while it is off so they can leave rather than
  // being trapped by an admin toggle.
  const [cohortsOn, joinableCohorts] = user
    ? await Promise.all([
        isFlagEnabled(supabase, 'learning.cohorts').catch(() => false),
        fetchJoinableCohorts(supabase, { courseId: course.id, learners }),
      ])
    : [false, [] as Awaited<ReturnType<typeof fetchJoinableCohorts>>];

  // Structured data, from the same rows the page renders. The price is included
  // only when this reader was shown one — `offering.kind === 'paid'` is exactly
  // the case where the page puts a number in front of them.
  const origin = siteOrigin();
  const lessonTitles = sections.flatMap((s) =>
    (s.lessons ?? [])
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((l) => l.title),
  );

  const graph = courseJsonLd(
    {
      title: course.title,
      description: course.description?.trim() ?? null,
      path: `/courses/${course.slug}`,
      language: version.language,
      subjects,
      level: DIFFICULTY_LABEL[course.difficulty] ?? null,
      lessons: lessonTitles,
      offer:
        offering.kind === 'paid'
          ? {
              amountMinor: String(offering.price.amount.amountMinor),
              currency: offering.price.amount.currency,
            }
          : null,
      rating: reviewsOn ? { average: reviewSummary.average, count: reviewSummary.count } : null,
      teacherName: teacher?.displayName?.trim() ? teacher.displayName.trim() : null,
    },
    origin,
  );

  const crumbs = breadcrumbJsonLd(
    [
      { name: 'Home', path: '/' },
      { name: 'Catalogue', path: '/catalogue' },
      { name: course.title, path: `/courses/${course.slug}` },
    ],
    origin,
  );

  return (
    <div className="container section" style={{ display: 'grid', gap: '1.5rem' }}>
      <JsonLdScript data={graph} />
      <JsonLdScript data={crumbs} />
      <div>
        <p className="eyebrow">
          <Link href="/catalogue">Catalogue</Link>
          {subjects[0] ? ` · ${subjects[0]}` : ''}
        </p>
        {/* `dir="auto"` on the title and the description: a course may be named
            in Arabic and this page is English. Without it the browser lays an
            Arabic title out backwards, which reads as a layout fault rather
            than as a language. */}
        <h1 {...textProps(course.language_code)}>{course.title}</h1>

        <div className="badges" style={{ marginBottom: '1rem' }}>
          <span className="badge">{AUDIENCE_LABEL[course.audience] ?? course.audience}</span>
          <span className="badge">{DIFFICULTY_LABEL[course.difficulty] ?? course.difficulty}</span>
          {languages.map((l) => (
            <span key={l} className="badge neutral">{l.toUpperCase()}</span>
          ))}
          {subjects.map((s) => (
            <span key={s} className="badge neutral">{s}</span>
          ))}
        </div>

        {course.description && (
          <p className="lede" {...textProps(course.language_code)}>
            {course.description}
          </p>
        )}

        {taughtIn && (
          // The question a learner asks before they open anything. Only shown
          // when there is something to say: English is the default, and a line
          // declaring it on every page is noise.
          <p className="muted" style={{ marginTop: '-0.5rem' }}>
            {taughtIn}
          </p>
        )}

        {course.age_bands && course.age_bands.length > 0 && (
          <p className="muted" style={{ marginTop: '-0.5rem' }}>
            Written for {describeBands(course.age_bands)}.
          </p>
        )}

        <div className="stats">
          <div>
            <div className="n">{sections.length}</div>
            <div className="l">Sections</div>
          </div>
          <div>
            <div className="n">{lessonCount}</div>
            <div className="l">Lessons</div>
          </div>
          <div>
            <div className="n">v{version.version_number}</div>
            <div className="l">Current version</div>
          </div>
        </div>

        <EnrolButton
          courseId={course.id}
          state={offering.kind}
          bands={course.age_bands ?? []}
          learners={learners.map((l) => ({
            id: l.id,
            name: l.name,
            isSelf: l.isSelf,
            ageBand: l.ageBand,
          }))}
          signedIn={Boolean(user)}
          label={offeringLabel(offering)}
        />

        {user && (cohortsOn || joinableCohorts.length > 0) && (
          <CohortBrowser
            cohortsEnabled={cohortsOn}
            cohorts={joinableCohorts}
            learners={learners}
          />
        )}

        {savedOn && (
          <SaveButton
            courseId={course.id}
            signedIn
            initiallySaved={savedState.saved}
            initialId={savedState.id}
            initialNote={savedState.note}
          />
        )}
      </div>

      <div>
        <h2>Who teaches this</h2>
        <WhoTeaches attribution={attribution} />

        <h2>Course outline</h2>
        {sections.length === 0 ? (
          <p className="empty">The outline is not published yet.</p>
        ) : (
          sections.map((s, i) => (
            <div key={s.id} className="card" style={{ marginBottom: '0.75rem' }}>
              <h3 style={{ marginTop: 0 }}>
                {i + 1}. {s.title}
              </h3>
              <ul className="lesson-list">
                {(s.lessons ?? [])
                  .slice()
                  .sort((a, b) => a.position - b.position)
                  .map((l, j) => (
                    <li key={l.id}>
                      <span className="n">{j + 1}</span>
                      <span>{l.title}</span>
                      {l.is_preview && previewsEnabled && (
                        <Link className="badge" href={`/courses/${course.slug}/preview/${l.id}`}>
                          Preview
                        </Link>
                      )}
                    </li>
                  ))}
              </ul>
            </div>
          ))
        )}
      </div>

      {reviewsOn && (
        <ReviewPanel
          courseId={course.id}
          summary={reviewSummary}
          reviews={courseReviews}
          signedIn={Boolean(user)}
          canReview={mayReview}
        />
      )}
    </div>
  );
}
