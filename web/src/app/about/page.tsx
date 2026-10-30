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
 * **It describes rules, not switches.** The page reads no database, no flag and
 * no session, which is why it renders on a deployment where the catalogue is
 * still empty — the state a first visitor could otherwise mistake for a broken
 * site. But a page that cannot see a switch must not describe one: an earlier
 * version of this page said the young learners' and adults' doors "are separate
 * pages rather than a filter on one list", which was true only while
 * `learning.audience_sections` was on. With the flag off those doors redirect to
 * `?audience=`, so the sentence a parent read was the opposite of what the
 * product did.
 *
 * The rule that replaced it: **every sentence here is either enforced for
 * everybody, or written in the conditional** — "when a teacher publishes a page",
 * "when a course is reviewed". Nothing on this page asserts the current state of
 * an optional surface, because nothing here can know it. If a claim cannot be
 * written that way, it does not go on the page.
 *
 * Each claim is a description of an enforcement rather than a marketing
 * position, and the ones worth checking are one click from the claim: the
 * catalogue, an account, and `/verify`, where a certificate number can be looked
 * up by anyone without signing in.
 */
export default function AboutPage() {
  return (
    <div className="page">
      <p className="eyebrow">About</p>
      <h1>Why AyahSpring</h1>
      <p className="lede">
        <strong>Ayah</strong> is a verse of the Qur&rsquo;an and, in the older
        sense of the word, a sign. <strong>Spring</strong> is renewal — the growth
        that follows water. The name is the thing this is trying to be: the verse,
        and the person learning to carry it.
      </p>

      <p className="muted" style={{ marginTop: '1rem' }}>
        Everything below describes something the platform does, not something it
        intends to. That is a higher bar than it sounds: this page is written to
        stay true as features are switched on and off, so it tells you the rule
        rather than today&rsquo;s setting &mdash; and it would rather say less than
        say something that is only true this week.
      </p>

      <h2 style={{ marginTop: '2.5rem' }}>One catalogue, two kinds of learner</h2>
      <p className="muted">
        Children and adults are different readers, so a course declares who it is
        for — children, adults, or both. That is a column on the course, not a
        setting chosen for it elsewhere: the catalogue can be narrowed to one
        audience, the front page offers a door for each of the two, and a course
        only appears under an audience it claimed.
      </p>
      <p className="muted">
        A course can also say <em>which ages</em> it was written for, inside the
        young learners&rsquo; audience, so a six-year-old and a fifteen-year-old do
        not arrive at the same shelf. A course that states no ages is open to
        every age — silence is not a restriction, and it is never read as one.
      </p>

      <h2 style={{ marginTop: '2.5rem' }}>How a course gets here</h2>
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
          <strong>Someone authorised checks it.</strong>{' '}
          <span className="muted">
            A reviewer can only be given a course in a subject they hold a live
            authorisation for, and the database refuses the assignment otherwise.
            A declared conflict of interest blocks it too. The author cannot give
            their own course the scholarly approval that lets it be published,
            even if they hold that authorisation — the limited technical checks
            they may run on their own work are not an approval.
          </span>
        </li>
        <li className="card">
          <strong>It is published, and then it is fixed.</strong>{' '}
          <span className="muted">
            The platform owner publishes. From that moment the version is frozen:
            lessons, quizzes and files cannot change. A correction is a new
            version, and a learner already enrolled stays on the version they
            started — so a certificate is never for a course that quietly changed
            underneath it.
          </span>
        </li>
      </ol>

      <h2 style={{ marginTop: '2.5rem' }}>Children are learners, not accounts</h2>
      <div className="notice">
        A child does not sign up here. A parent or guardian holds the account,
        adds the child as a learner with a name and an age band, and sees their
        progress. The child never gets an email address, a password or a login of
        their own — there is nothing for a child to sign into.
      </div>
      <p className="muted" style={{ marginTop: '0.75rem' }}>
        There is no date of birth anywhere in the system. An age band — five to
        seven, eight to ten, and so on — is enough to know what a child should be
        shown, and is far less to lose if something goes wrong.
      </p>
      <p className="muted">
        Where the law requires verifiable parental consent before a child uses an
        online service, the gate is a guardian relationship, a verification step
        and a record of who consented. The platform can hold all three. Turning
        that requirement on for a country is the owner&rsquo;s decision, taken with
        legal advice — and until it is on, a child is added by the adult who holds
        the account, never by themselves.
      </p>

      <h2 style={{ marginTop: '2.5rem' }}>The interface, and who has read it</h2>
      <p>
        The interface speaks fifty-one languages. Every one of them was written by the
        people who built this platform, and <strong>not one has been read by somebody who
        speaks it</strong>. The language page says so on each catalogue rather than in a
        footnote, because &ldquo;translated&rdquo; and &ldquo;read by a person who speaks
        it&rdquo; are two different claims and only the first one is true.
      </p>
      <p>
        If a word looks wrong to you in your own language,{' '}
        <Link href="/contribute">the correction sheet</Link> is where to say so. It asks for
        no account, it shows you the English sentence and the current translation side by
        side, and you change only the lines that are wrong. Your name is printed beside the
        language if what you sent is accepted; your email address is never published and
        never becomes a login.
      </p>

      <h2 style={{ marginTop: '2.5rem' }}>Who teaches here</h2>
      <p className="muted">
        Teaching is by appointment. Nobody becomes a teacher by signing up: the
        owner or the governance staff grant it, with a written reason, and the
        same is true of removing it. Every course still passes review, whoever
        wrote it.
      </p>
      <p className="muted">
        You may ask. <Link href="/teach/apply">Applying to teach</Link> sends your
        qualifications and a link to a lesson you have taught, and the owner reads
        both. Applying grants nothing — it is a request for an appointment, and
        the answer is a written decision you can read.
      </p>
      <p className="muted">
        A teacher may publish a page about themselves. When they have, the course
        page names them and links to it; when they have not, the course page says
        the course was written by an appointed teacher and approved by a
        reviewer, and leaves the name out. A missing name is a privacy choice, not
        a lesser course — and it is never a blank line where a name should be.
      </p>

      <h2 style={{ marginTop: '2.5rem' }}>What is kept, and what is never rewritten</h2>
      <p className="muted">
        Your progress belongs to you, and a course you have paid for stays in your
        account. A certificate carries a number that anyone can look up —{' '}
        <Link href="/verify">check one here</Link>, no account needed — and it stays
        verifiable even if the course is later retired.
      </p>
      <p className="muted">
        A payment record is never rewritten: a correction is a new entry beside
        the old one, not an edit to it. A learner&rsquo;s review of a course is
        either published as they wrote it or withdrawn with a reason they can see;
        staff cannot rewrite it into something else.
      </p>

      <p className="muted" style={{ marginTop: '1.75rem' }}>
        Looking costs nothing. You pay when you enrol, for one named learner —
        one purchase covers one learner, never a household.
      </p>

      <p style={{ marginTop: '1.5rem' }}>
        <Link className="btn" href="/catalogue">
          Browse the catalogue
        </Link>{' '}
        <Link className="btn secondary" href="/verify">
          Check a certificate
        </Link>{' '}
        <Link className="btn secondary" href="/sign-up">
          Create a free account
        </Link>
      </p>
    </div>
  );
}
