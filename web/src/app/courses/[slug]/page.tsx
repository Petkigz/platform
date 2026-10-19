import Link from 'next/link';
import type { Metadata } from 'next';
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
import { EnrolButton } from './enrol-button';
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
type CourseDetail = CatalogueCourse & {
  status: string;
  deleted_at: string | null;
};

type VersionWithStructure = NonNullable<CatalogueCourse['course_versions']>[number] & {
  course_sections?: Section[] | null;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return { title: slug.replace(/-/g, ' ') };
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
      'id, slug, title, description, audience, difficulty, status, deleted_at, ' +
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
  });
  const lessonCount = sections.reduce(
    (n, s) => n + (s.lessons?.length ?? 0),
    0,
  );

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

  return (
    <div className="container section" style={{ display: 'grid', gap: '1.5rem' }}>
      <div>
        <p className="eyebrow">
          <Link href="/catalogue">Catalogue</Link>
          {subjects[0] ? ` · ${subjects[0]}` : ''}
        </p>
        <h1>{course.title}</h1>

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

        {course.description && <p className="lede">{course.description}</p>}

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
          learners={learners.map((l) => ({
            id: l.id,
            name: l.name,
            isSelf: l.isSelf,
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
