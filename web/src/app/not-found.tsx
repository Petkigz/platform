import Link from 'next/link';

export const metadata = { title: 'Not found' };

/**
 * The 404.
 *
 * Two different people arrive here. One mistyped a link; one followed a course
 * that has been retired, or a lesson from a version that is no longer current.
 * The page says both out loud instead of "page not found", because the second
 * person has not made a mistake and telling them they have is how a platform
 * loses their trust at the exact moment they were looking for something they
 * paid for.
 *
 * The catalogue is the first way out, not the home page: somebody who was
 * reading a course wants another course, not a marketing hero.
 */
export default function NotFound() {
  return (
    <div className="container section">
      <p className="eyebrow">404</p>
      <h1>That page is not here</h1>
      <p className="lede">
        Either the address is slightly wrong, or what used to be here has been
        retired. Courses are retired when a teacher stops teaching them, and a
        retired course stays readable to the people already enrolled in it
        through <Link href="/learn">My learning</Link>.
      </p>

      <p style={{ marginTop: '1.5rem' }}>
        <Link className="btn" href="/catalogue">
          Browse the catalogue
        </Link>{' '}
        <Link className="btn secondary" href="/">
          Home
        </Link>{' '}
        <Link className="btn ghost" href="/support">
          Ask for help
        </Link>
      </p>

      <p className="muted" style={{ marginTop: '2rem' }}>
        If you followed a link from inside AyahSpring and landed here, that is a
        fault on our side — <Link href="/support">tell us where it was</Link> and
        we will fix the link.
      </p>
    </div>
  );
}
