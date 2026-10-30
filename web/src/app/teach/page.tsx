import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { fetchMyCourses } from '@/lib/authoring';
import { myScreeningSentence, screeningStatusLabel, type MyScreening } from '@/lib/screening';
import { teacherHeadline, type MyTakedown } from '@/lib/takedowns';
import {
  needsSignature,
  parseTeacherTerms,
  termsSentence,
  type TeacherTerms,
} from '@/lib/licence';
import { AcceptPolicy } from '@/app/policies/[slug]/accept-policy';
import { TakedownAnswer } from './takedown-answer';
import { ConductCard } from './conduct-card';
import { NewCourse } from './new-course';

export const dynamic = 'force-dynamic';

/**
 * The teacher's dashboard: the courses you created.
 *
 * `courses_read` also admits courses you are enrolled in and published ones,
 * so this filters on `created_by` — otherwise "my courses" would quietly
 * include every course you had ever bought.
 */
export default async function TeachPage() {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/sign-in?next=/teach');

  // Teaching is an appointment (decided 2026-10-22): the database refuses a
  // course insert without the role, and this page says why rather than showing a
  // form that will fail. The owner holds every control and is a teacher besides.
  const [{ data: instructor }, { data: owner }] = await Promise.all([
    supabase.rpc('has_role', { p_user_id: user.id, p_role_code: 'instructor' }),
    supabase.rpc('has_role', { p_user_id: user.id, p_role_code: 'platform_admin' }),
  ]);
  if (instructor !== true && owner !== true) {
    return (
      <div className="container section">
        <p className="eyebrow">Teaching</p>
        <h1>This is the teaching area</h1>
        <p className="notice warn">
          <strong>Teaching here is by appointment.</strong> The platform owner appoints a
          teacher; until then your account is a learner&apos;s, and a learner&apos;s account
          cannot open a course.
        </p>
        <p>
          You may <strong>ask</strong> — send your qualifications and a sample lesson, and the
          owner reads it. Applying is not being appointed: nothing is granted until somebody
          decides, in writing.
        </p>
        <p style={{ marginTop: '1.5rem' }}>
          <Link href="/teach/apply" className="btn">Apply to teach</Link>{' '}
          <Link href="/learn" className="btn secondary">Go to my learning</Link>
        </p>
      </div>
    );
  }

  const [courses, screeningResult, takedownResult, termsResult, conductVersion] = await Promise.all([
    fetchMyCourses(supabase, user.id),
    supabase.rpc('my_screening_status'),
    supabase.rpc('my_takedown_notices'),
    supabase.rpc('my_teacher_terms'),
    // The version the acknowledgement would be made against, so the card can name
    // it rather than saying "the policy" and leaving the teacher to guess which.
    supabase
      .from('policy_versions')
      .select('version_number, policy_documents!inner(slug)')
      .eq('policy_documents.slug', 'safeguarding')
      .eq('status', 'in_force')
      .maybeSingle(),
  ]);
  if (screeningResult.error) throw new Error(screeningResult.error.message);
  if (takedownResult.error) throw new Error(takedownResult.error.message);
  if (termsResult.error) throw new Error(termsResult.error.message);
  const screening = (screeningResult.data ?? { recorded: false }) as unknown as MyScreening;
  const takedown = (takedownResult.data ?? { notices: [], held: 0 }) as unknown as MyTakedown;
  const terms: TeacherTerms = parseTeacherTerms(termsResult.data);
  const conductVersionNumber =
    typeof conductVersion.data?.version_number === 'number'
      ? conductVersion.data.version_number
      : null;

  return (
    <div className="container section">
      <p className="eyebrow">Teaching</p>
      <h1>My courses</h1>
      <p className="lede">
        You keep the copyright on everything here. Publishing stops nothing
        you have already sold — learners who enrolled keep their access even
        if you retire the course later.
      </p>

      {teacherHeadline(takedown) && (
        <p className="notice warn" style={{ maxWidth: '48rem' }}>
          <strong>{teacherHeadline(takedown)}</strong> The claim is below, in the words it was
          sent, and you can answer it there.
        </p>
      )}
      <TakedownAnswer mine={takedown} />

      {/* Both facts the publication gate checks, side by side. It renders nothing
          while the platform is not asking. */}
      <ConductCard
        screening={screening}
        policyHref="/policies/safeguarding"
        policyVersion={conductVersionNumber}
      />

      {/* The agreement itself, where the work is. `teaching.content_licence` may be
          off, and the card says so rather than hiding the terms: a teacher is
          entitled to know what the platform may do with their work whether or not
          anybody is currently refused for not agreeing. */}
      <section className="card" id="teacher-terms" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ marginTop: 0 }}>The agreement about your work</h2>
        <p style={{ marginBottom: '0.5rem' }}>
          You keep the copyright in everything you write. The licence you give the platform is in
          the <Link href="/policies/teaching">teacher terms</Link>, version{' '}
          {terms.versionNumber ?? '—'}: store your course, show it to learners entitled to it, and
          keep offering it to them. A retired course stays available to learners already enrolled
          in it.
        </p>
        <p style={{ marginBottom: needsSignature(terms) ? '0.75rem' : 0 }}>
          {termsSentence(terms)}
        </p>
        {needsSignature(terms) && (
          <AcceptPolicy
            slug={terms.slug}
            title={terms.title}
            versionNumber={terms.versionNumber as number}
            acceptedAt={terms.acceptedAt}
          />
        )}
      </section>

      <p>
        <Link href="/teach/promotions">Promotions</Link> — run an offer on your
        own courses, in the countries you choose, with a limit on how many times
        a family may use it.
      </p>

      {/* The teacher is told what is on file about them. Reading it is not asking
          permission: it is the one place a person can check a record that is held
          about them, and a record they cannot see is one they cannot correct. */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ marginTop: 0 }}>Screening</h2>
        <p style={{ marginBottom: '0.35rem' }}>
          <strong>
            {screening.recorded
              ? screening.outcome === 'failed'
                ? 'Did not pass'
                : screening.expired
                  ? 'Lapsed'
                  : screeningStatusLabel('checked')
              : screeningStatusLabel('none')}
          </strong>
        </p>
        <p style={{ marginBottom: 0 }}>{myScreeningSentence(screening)}</p>
        {!screening.recorded && (
          <p className="muted" style={{ marginBottom: 0, fontSize: '0.9rem' }}>
            Nothing here blocks your teaching. If the owner starts asking for a check before a
            course facing children can publish, they will say so here first — not in an email you
            did not read.
          </p>
        )}
      </div>

      {courses.length === 0 ? (
        <div className="empty" style={{ marginBottom: '1.5rem' }}>
          You have not created a course yet.
        </div>
      ) : (
        <div className="grid cols-2">
          {courses.map((c) => (
            <div className="card" key={c.id}>
              <h3 style={{ marginTop: 0 }}>{c.title}</h3>
              <div className="badges">
                <span className="badge neutral">{c.status}</span>
                {c.hasPublishedVersion && <span className="badge">Published</span>}
              </div>
              <p className="meta" style={{ marginTop: '0.75rem' }}>
                /{c.slug}
              </p>
              <Link href={`/teach/${c.id}`} className="btn secondary">
                Open curriculum
              </Link>
            </div>
          ))}
        </div>
      )}

      <p style={{ marginTop: '1.5rem' }}>
        <Link href="/teach/paths">Learning paths</Link> — curate a sequence of active courses.
        {' · '}
        <Link href="/teach/profile">Public teacher profile</Link> — introduce yourself and link your social channels.
        {' · '}
        <Link href="/teach/media">Media library</Link> — upload lesson recordings and see which ones are ready to use.
      </p>
      <p>
        <Link href="/teach/earnings">Earnings</Link> — what your courses have earned, per currency,
        and the sales behind it. Nothing is paid out yet: this is the record, not a balance.
      </p>
      <p>
        <Link href="/teach/payouts">Getting paid</Link> — ask for the money your courses have
        earned once it is out of its refund hold, and see what happened to every earlier request.
      </p>

      <div style={{ marginTop: '1.75rem' }}>
        <div className="outline-h">
          <h3>Create</h3>
        </div>
        <NewCourse />
      </div>

      <p style={{ marginTop: '1.5rem' }}>
        <Link href="/learn">Back to my learning</Link>
      </p>
    </div>
  );
}
