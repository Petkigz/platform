import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About',
  description:
    'What AyahSpring teaches, how a course reaches a learner, why a child is a learner and not an account, and who is allowed to teach here.',
};

/**
 * About the platform — screen 2.
 *
 * The landing page says what you can study. This page answers the question a
 * parent asks before trusting a site with a child: *who decides what is
 * taught here, and what happens to my child's data?*
 *
 * Every claim on this page is checkable against the product rather than a
 * promise about the future. The review pipeline, the appointment of teachers,
 * the absence of a child login and the absence of a date of birth are all
 * enforced in the database, and each sentence below is a description of that
 * enforcement rather than a marketing position. Nothing here quotes a number,
 * a testimonial or a price, because none of those would be true today.
 *
 * It is a static page on purpose: no database read, no flag, so it renders even
 * when the catalogue is empty — which, on a new deployment, is the first thing
 * a visitor might otherwise mistake for a broken site.
 */
export default function AboutPage() {
  return (
    <div className="container section">
      <p className="eyebrow">About</p>
      <h1>Why AyahSpring</h1>
      <p className="lede">
        <strong>Ayah</strong> is a verse of the Qur&rsquo;an and, in the older
        sense of the word, a sign. <strong>Spring</strong> is renewal, and the
        growth that follows water. The name is the thing we are trying to build:
        the verse, and the person learning to carry it.
      </p>

      <div className="grid cols-2" style={{ marginTop: '1.5rem' }}>
        <section className="card">
          <h2 style={{ marginTop: 0, fontSize: '1.15rem' }}>
            Children and adults, genuinely both
          </h2>
          <p className="muted">
            Most Islamic learning online is written for one of the two and
            adapted for the other. Here they are two shelves from the start: a
            course says who it is for, and the young learners&rsquo; door and the
            adults&rsquo; door are separate pages rather than a filter on one
            list.
          </p>
          <p className="muted" style={{ marginBottom: 0 }}>
            A course can also say <em>which ages</em> inside that audience, so a
            six-year-old and a fifteen-year-old do not arrive at the same shelf.
          </p>
        </section>

        <section className="card">
          <h2 style={{ marginTop: 0, fontSize: '1.15rem' }}>
            Taught, not just hosted
          </h2>
          <p className="muted">
            Every course is written by a teacher, submitted for review, and
            approved by a reviewer before it can be published. An author cannot
            approve their own work, and a reviewer whose qualification has not
            been checked cannot approve anything.
          </p>
          <p className="muted" style={{ marginBottom: 0 }}>
            A published course is frozen. Corrections are a new version, so
            nobody&rsquo;s certificate is ever for a course that quietly changed
            underneath them.
          </p>
        </section>
      </div>

      <h2 style={{ marginTop: '2.5rem' }}>How a course reaches you</h2>
      <ol className="stack" style={{ marginTop: '0.75rem' }}>
        <li className="card">
          <strong>A teacher writes it.</strong>{' '}
          <span className="muted">
            A draft version, with sections, lessons, sources and — if the course
            is examined — a quiz. Sources are cited per lesson, because a lesson
            about the deen should be able to say where it came from.
          </span>
        </li>
        <li className="card">
          <strong>A reviewer checks it.</strong>{' '}
          <span className="muted">
            A reviewer is appointed only after their qualification has been
            recorded and checked, and only for the subjects they qualified in. A
            reviewer with a personal interest in a course stands aside from it.
          </span>
        </li>
        <li className="card">
          <strong>It is published, and then it is fixed.</strong>{' '}
          <span className="muted">
            The platform owner publishes. From that moment the version is
            frozen: lessons, quizzes and files cannot change. A correction is a
            new version, and a learner already enrolled stays on the version
            they started.
          </span>
        </li>
      </ol>

      <h2 style={{ marginTop: '2.5rem' }}>Children are learners, not accounts</h2>
      <div className="notice">
        A child does not sign up here. A parent or guardian holds the account,
        adds the child as a learner with a name and an age band, and sees their
        progress. The child never gets an email address, a password or a login of
        their own.
      </div>
      <p className="muted" style={{ marginTop: '0.75rem' }}>
        There is no date of birth anywhere in the system. An age band — five to
        seven, eight to ten, and so on — is enough to know what a child should
        be shown, and is far less to lose if something goes wrong. Where a
        country requires verifiable parental consent before a child uses an
        online service, the guardian machinery is there for it.
      </p>

      <h2 style={{ marginTop: '2.5rem' }}>Who teaches here</h2>
      <p className="muted">
        Teaching is by appointment. Nobody becomes a teacher by signing up: the
        owner or the governance staff grant it, with a written reason, and the
        same is true of removing it. Each teacher has a public page and a
        qualification record, and the courses they write still have to pass
        review like anybody else&rsquo;s.
      </p>

      <h2 style={{ marginTop: '2.5rem' }}>What we keep</h2>
      <p className="muted">
        Your progress belongs to you. A course you have paid for stays in your
        account; a certificate stays verifiable even if the course is later
        retired; and a payment record is never rewritten — a correction is a new
        entry beside the old one, not an edit to it. A learner&rsquo;s review of
        a course cannot be rewritten by staff: it is either published as they
        wrote it or withdrawn with a reason they can see.
      </p>

      <p style={{ marginTop: '2rem' }}>
        <Link className="btn" href="/catalogue">
          Browse the catalogue
        </Link>{' '}
        <Link className="btn secondary" href="/sign-up">
          Create a free account
        </Link>
      </p>
    </div>
  );
}
