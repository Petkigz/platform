import Link from 'next/link';
import { isSupabaseConfigured } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';
import { disciplines, fetchSubjectAreas } from '@/lib/catalogue';
import { isFlagEnabled } from '@/lib/flags';

export const dynamic = 'force-dynamic';

/**
 * The front door.
 *
 * It is the one page a stranger reads before deciding whether this is for them,
 * so it is the only page allowed a display face — see `.display` in globals.css.
 *
 * **It says only what is true.** No counters ("12,000 learners"), no
 * testimonials, no logos of institutions that have not endorsed anything. The
 * platform is young, and a front page that invents its own size is the first
 * lie a careful parent catches. Everything here is a claim the database already
 * enforces: a course cannot be published without an approval from somebody
 * authorised for the subject, a child cannot have a login, a certificate
 * carries a number that stays checkable after the course is withdrawn, and a
 * teacher's share is a recorded decision rather than a slogan.
 *
 * It also says the two limits out loud, because they are the ones a person
 * discovers too late otherwise: teaching is by appointment, and no provider
 * moves money yet.
 */

const ASSURANCES = [
  {
    title: 'Reviewed before it is listed',
    body:
      'Courses come from qualified teachers and are approved by someone authorised for ' +
      'the subject. An author cannot approve their own work, and every publication is ' +
      'recorded.',
  },
  {
    title: 'A child has no login of their own',
    body:
      'Children learn under a parent\u2019s account: no email address, no password, nothing ' +
      'to sign into. The parent sees the progress and decides who else may see it.',
  },
  {
    title: 'A certificate that can still be checked',
    body:
      'Each one carries a number anyone can look up, and it stays verifiable even if the ' +
      'course is later withdrawn.',
  },
];

const STEPS = [
  {
    title: 'Choose who is learning',
    body:
      'Yourself, or a child you are responsible for. A course is bought for one named ' +
      'learner, so a family buying together still knows whose progress is whose.',
  },
  {
    title: 'Study at your own pace',
    body:
      'Lessons, practice questions that check an answer without marking it, and a place ' +
      'that remembers where you stopped on every lesson you have opened.',
  },
  {
    title: 'Keep something afterwards',
    body:
      'Progress, a receipt that is never rewritten, and a certificate whose number can be ' +
      'checked years later.',
  },
];

const DOORS = [
  {
    href: '/young',
    label: 'For children',
    body:
      'Written for young learners and held by a parent or guardian\u2019s account. Progress, ' +
      'not passwords.',
  },
  {
    href: '/adults',
    label: 'For adults',
    body:
      'Study for yourself, at your own level, with certificates you can show to anyone who ' +
      'asks.',
  },
];

export default async function Home() {
  const configured = isSupabaseConfigured();
  const supabase = configured ? await createClient() : null;
  const [subjects, learningPathsEnabled] = supabase
    ? await Promise.all([
        fetchSubjectAreas(supabase).then(disciplines),
        isFlagEnabled(supabase, 'learning.paths'),
      ])
    : [[], false];

  return (
    <>
      <section className="hero">
        <div className="container">
          <div className="hero-grid">
            <div>
              <p className="eyebrow">Islamic learning, worldwide</p>
              <h1 className="display">Learn your deen, at the pace that suits you.</h1>
              <p className="lede wide">
                Qur&rsquo;an, Arabic, Fiqh, Hadith and more &mdash; taught by qualified
                teachers to children and adults, wherever you are.
              </p>

              <div className="hero-actions">
                <Link href="/catalogue" className="btn">Browse the catalogue</Link>
                <Link href="/sign-up" className="btn secondary">Create a free account</Link>
                {learningPathsEnabled && (
                  <Link href="/paths" className="btn secondary">Explore learning paths</Link>
                )}
              </div>

              <p className="hero-note">
                Looking costs nothing. You pay when you enrol, for one named learner, and a
                child is never asked for an email address.
              </p>
            </div>

            <aside className="panel" aria-label="What is different here">
              <p className="eyebrow" style={{ marginBottom: '0.15rem' }}>What that means</p>
              <h2>Three things the platform refuses to do</h2>
              <ul className="assurances">
                {ASSURANCES.map((a) => (
                  <li key={a.title}>
                    <strong>{a.title}</strong>
                    {a.body}
                  </li>
                ))}
              </ul>
            </aside>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2 style={{ marginTop: 0 }}>What you can study</h2>
          {subjects.length > 0 ? (
            <>
              <p className="lede" style={{ marginBottom: '1rem' }}>
                {subjects.length} {subjects.length === 1 ? 'subject' : 'subjects'}, each
                taught by a teacher reviewed for it.
              </p>
              <div className="chips" style={{ marginBottom: '1.75rem' }}>
                {subjects.map((s) => (
                  <Link
                    key={s.id}
                    href={`/catalogue?subject=${encodeURIComponent(s.code)}`}
                    className="chip"
                  >
                    {s.name}
                  </Link>
                ))}
              </div>
            </>
          ) : (
            <p className="muted" style={{ marginBottom: '1.75rem' }}>
              Subjects appear here as courses are added. The catalogue is always the full
              list.
            </p>
          )}

          <div className="grid cols-2">
            {DOORS.map((door) => (
              <div key={door.href} className="card">
                <h3 style={{ marginTop: 0 }}>{door.label}</h3>
                <p className="muted" style={{ margin: 0, fontSize: '0.93rem' }}>{door.body}</p>
                <p style={{ margin: '0.85rem 0 0', fontSize: '0.93rem' }}>
                  <Link href={door.href}>Look at what is there &rarr;</Link>
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <h2 style={{ marginTop: 0 }}>How it works</h2>
          <div className="steps">
            {STEPS.map((step, i) => (
              <div key={step.title} className="step">
                <div className="n">Step {i + 1}</div>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
            ))}
          </div>
          <p className="muted" style={{ marginTop: '1.5rem' }}>
            <Link href="/about">
              How a course gets here, and what happens to a child&rsquo;s data &rarr;
            </Link>
          </p>
        </div>
      </section>

      <section className="band">
        <div className="container band-inner">
          <div>
            <p className="eyebrow">For teachers</p>
            <h2>Bring your students with you.</h2>
            <p>
              If you already teach, the platform is the part you should not have to build:
              sections and lessons, review by someone who knows the subject, prices set with
              staff, and what you have earned shown per currency on one page.
            </p>
            <p>
              Teachers keep half of every sale. Teaching here is by appointment &mdash; the
              owner adds teachers one at a time &mdash; and no provider moves money yet, so
              the earnings page says what is owed rather than claiming it has been sent.
            </p>
          </div>
          <div className="band-actions">
            <Link href="/teach" className="btn">The teaching area</Link>
            <Link href="/about" className="btn ghost">How courses are reviewed</Link>
          </div>
        </div>
      </section>

      <section className="closing">
        <div className="container">
          <h2>Start with the catalogue.</h2>
          <p>
            Every published course is listed with what it contains and who teaches it. Create
            an account when you find one you want to keep.
          </p>
          <div className="actions">
            <Link href="/catalogue" className="btn">Browse the catalogue</Link>
            <Link href="/sign-up" className="btn secondary">Create a free account</Link>
          </div>
        </div>
      </section>

      {/* A setup note, not marketing. It appears only when this deployment has
          no database, and it sits at the bottom so it cannot be mistaken for
          the product. */}
      {!configured && (
        <div className="container" style={{ paddingBottom: '2rem' }}>
          <div className="notice warn">
            <strong>Supabase is not configured.</strong> Copy <code>web/.env.example</code> to{' '}
            <code>web/.env.local</code>, set your project URL and anon key, then restart the dev
            server. The catalogue is empty until then.
          </div>
        </div>
      )}
    </>
  );
}
