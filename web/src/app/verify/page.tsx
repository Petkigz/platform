import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import {
  normaliseCertificateNumber,
  numberProblem,
} from '@/lib/certificate-number';

export const metadata: Metadata = {
  title: 'Check a certificate',
  description:
    'Check an AyahSpring certificate number. No account needed — the number is the only thing required.',
};

/**
 * Where a certificate number is typed.
 *
 * Until this page existed, verification was reachable only by a link from
 * inside the product: `/verify/AS-2026-00000001` worked, and `/verify` — the
 * address a person would actually try, holding a printed certificate and a
 * piece of paper — was a 404. The platform's loudest claim, *a certificate you
 * can still check years later*, therefore had no front door.
 *
 * The person arriving here is usually not a learner. It is an employer, a
 * school, or a parent checking somebody else's document, and they have never
 * heard of this site. So: no account, no email, no session. The number is the
 * capability (see `certificates_read`: nobody can list certificates), which is
 * exactly what makes publishing a result to an anonymous caller safe.
 *
 * A GET form, so the address is shareable and the back button behaves. A number
 * that parses is redirected to its own page — the canonical link that can be
 * copied, printed, or pasted into an email.
 */
export default async function VerifyLandingPage({
  searchParams,
}: {
  searchParams: Promise<{ number?: string }>;
}) {
  const { number } = await searchParams;
  const typed = typeof number === 'string' ? number : '';

  // A number that is a number goes to its own address, so the answer has a link
  // somebody can keep. A number that is not stays here, with the reason.
  const canonical = normaliseCertificateNumber(typed);
  if (canonical) redirect(`/verify/${encodeURIComponent(canonical)}`);

  const problem = typed.trim().length > 0 ? numberProblem(typed) : null;

  return (
    <div className="container section" style={{ maxWidth: '38rem' }}>
      <p className="eyebrow">AyahSpring</p>
      <h1>Check a certificate</h1>
      <p className="lede">
        Every AyahSpring certificate carries a number. Checking one tells you whether it was
        issued here, to whom, for which course, and whether it has since been revoked.
      </p>

      <form method="get" action="/verify" className="search" style={{ marginTop: '1.5rem' }}>
        <input
          type="text"
          name="number"
          defaultValue={typed}
          placeholder="AS-2026-00000001"
          aria-label="Certificate number"
          autoComplete="off"
          spellCheck={false}
          autoCapitalize="characters"
        />
        <button type="submit" className="btn">Check</button>
      </form>

      {problem && (
        <div className="notice warn" role="alert">
          {problem}
        </div>
      )}

      <div className="card" style={{ marginTop: '1.75rem' }}>
        <h2 style={{ marginTop: 0, fontSize: '1.02rem' }}>Where to find it</h2>
        <p className="muted" style={{ marginBottom: '0.6rem' }}>
          The number is printed on the certificate itself, usually in a corner as{' '}
          <code>AS-2026-00000001</code>: the letters AS, the year, then eight digits. If you were
          sent a link, the number is at the end of it — either arrives at the same answer.
        </p>
        <p className="muted" style={{ marginBottom: 0 }}>
          Case and spacing do not matter here, and neither do the dashes: a number copied out of a
          PDF still works.
        </p>
      </div>

      <section style={{ marginTop: '1.75rem' }}>
        <h2 style={{ fontSize: '1.02rem' }}>What checking does not tell you</h2>
        <p className="muted">
          It confirms what the platform issued and whether it still stands. It does not vouch for
          the holder outside the course, and it shows nothing about a learner beyond the name on
          the certificate — there is no account here to log into, and no list of anybody&rsquo;s
          certificates to browse.
        </p>
      </section>

      <p style={{ marginTop: '1.75rem' }}>
        <Link href="/">AyahSpring home</Link>
        {' · '}
        <Link href="/catalogue">Browse the catalogue</Link>
      </p>
    </div>
  );
}
