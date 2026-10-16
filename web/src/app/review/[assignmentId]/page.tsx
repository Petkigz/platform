import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { fetchSections } from '@/lib/authoring';
import { ASSIGNMENT_STATUS_LABEL, SCOPE_LABEL, fetchAssignment } from '@/lib/review';
import { ReviewActions } from './review-actions';

export const dynamic = 'force-dynamic';

/**
 * One assignment, with the content under review beside the controls.
 *
 * A reviewer is allowed to read what they were asked to review — that was a
 * real defect before `20261021000100_authz_fixes.sql`: `can_read_version()`
 * covers assigned reviewers, and `can_review_version()` is a SELECT-only
 * grant, so being asked to review something never lets you change it.
 *
 * `cra_read` decides whether this page renders at all. Someone who is neither
 * the assigned reviewer nor able to see the review gets a 404 rather than a
 * permission error, because the difference between "not yours" and "does not
 * exist" is not worth leaking.
 */
export default async function ReviewAssignmentPage({
  params,
}: {
  params: Promise<{ assignmentId: string }>;
}) {
  if (!isSupabaseConfigured()) redirect('/');

  const { assignmentId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/sign-in?next=/review/${assignmentId}`);

  const assignment = await fetchAssignment(supabase, assignmentId);
  if (!assignment) notFound();

  const sections = await fetchSections(supabase, assignment.courseVersionId).catch(() => []);
  const lessonCount = sections.reduce((n, s) => n + s.lessons.length, 0);

  return (
    <div className="container section">
      <p className="eyebrow">
        <Link href="/review">Review queue</Link>
      </p>
      <h1>{assignment.courseTitle}</h1>
      <p className="lede">
        {SCOPE_LABEL[assignment.scope]} review ·{' '}
        {ASSIGNMENT_STATUS_LABEL[assignment.status]}
      </p>

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
          <div className="n">{assignment.decisions.length}</div>
          <div className="l">Decisions</div>
        </div>
      </div>

      <div className="outline-h" style={{ marginTop: '1.75rem' }}>
        <h3>Outline</h3>
      </div>

      {sections.length === 0 ? (
        <div className="empty">
          This version has no sections. There is nothing to review, and it
          cannot be published.
        </div>
      ) : (
        sections.map((s) => (
          <div className="card" key={s.id} style={{ marginBottom: '1rem' }}>
            <h3 style={{ marginTop: 0 }}>
              {s.position}. {s.title}
            </h3>
            {s.lessons.length === 0 ? (
              <p className="empty" style={{ marginBottom: 0 }}>
                No lessons.
              </p>
            ) : (
              <ul className="lessons">
                {s.lessons.map((l) => (
                  <li key={l.id}>
                    <span className="t">
                      {l.position}. {l.title}
                    </span>
                    {l.isPreview && (
                      <span className="badge" style={{ flex: 'none' }}>
                        Free preview
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))
      )}

      <div className="outline-h" style={{ marginTop: '1.75rem' }}>
        <h3>Your decision</h3>
      </div>

      <ReviewActions assignment={assignment} />

      <p style={{ marginTop: '1.5rem' }}>
        <Link href="/review">Back to the queue</Link>
      </p>
    </div>
  );
}
