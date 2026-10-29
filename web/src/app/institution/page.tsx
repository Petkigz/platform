import Link from 'next/link';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { SSO_NOTICE, parseMyInstitution, parseReport, safeLogoUrl } from '@/lib/institution';
import { InstitutionConsole } from './institution-console';
import { JoinInstitution } from './join-button';

export const dynamic = 'force-dynamic';

function iso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * An institution's own page.
 *
 * One address for both halves of the relationship: somebody who is not a member
 * is told whether their address could join, and somebody who is a member sees
 * the console their role allows. A member sees the name, the branding and the
 * report; an administrator sees the fields. That difference is drawn by the
 * database — `my_institution()` returns no domains or keys to a member — rather
 * than by hiding a button.
 */
export default async function InstitutionPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/institution');

  const { data, error } = await supabase.rpc('my_institution');
  const board = parseMyInstitution(data);

  const params = await searchParams;
  const today = new Date();
  const to = /^\d{4}-\d{2}-\d{2}$/.test(params.to ?? '') ? params.to! : iso(today);
  const from = /^\d{4}-\d{2}-\d{2}$/.test(params.from ?? '')
    ? params.from!
    : iso(new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000));

  let report = null;
  if (board?.joined && board.flags.reporting) {
    const { data: reportData } = await supabase.rpc('institution_report', { p_from: from, p_to: to });
    report = parseReport(reportData);
  }

  const logo = safeLogoUrl(board?.branding?.logoUrl ?? null);
  const title = board?.branding?.displayName ?? board?.institution?.name ?? 'Institution';

  return (
    <div className="page wide">
      <nav className="crumbs">
        <Link href="/account">Account</Link>
        <span aria-hidden>›</span>
        <span>Institution</span>
      </nav>

      <div className="page-head">
        {logo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} alt="" style={{ maxHeight: '56px', marginBottom: '0.5rem' }} />
        )}
        <p className="eyebrow">{board?.joined ? 'Your institution' : 'Institutions'}</p>
        <h1>{board?.joined ? title : 'Institutions'}</h1>
        {board?.joined && board.branding?.tagline && (
          <p className="muted">{board.branding.tagline}</p>
        )}
      </div>

      {error && (
        <div className="notice error">
          The page could not be read: {error.message}
        </div>
      )}

      {!board && (
        <div className="notice error">
          Your institution could not be read. Nothing on this page changed anything.
        </div>
      )}

      {board && !board.joined && (
        <section className="card" style={{ maxWidth: '44rem' }}>
          <h2 style={{ marginTop: 0 }}>You are not in an institution</h2>
          {board.joinable ? (
            <>
              <p className="muted">
                Your email address is at a domain an institution has verified, so you may join it.
                Nothing is automatic: joining is a button, and nothing about your learning is
                shared beyond the counts that institution already sees.
              </p>
              <JoinInstitution />
            </>
          ) : (
            <>
              <p className="muted">
                An institution claims its domain and a staff member checks the DNS record before
                anybody can join by it. If your school or madrasah is not here yet, ask its
                administrator to claim the domain on this page — and if you are that
                administrator, <Link href="/admin">ask the owner</Link> to create the institution
                first, because only the platform owner can.
              </p>
              <p className="muted">{SSO_NOTICE}</p>
            </>
          )}
        </section>
      )}

      {board && board.joined && (
        <>
          <p className="muted">
            <Link href="/institution/seats">Seats</Link> — the courses this institution has bought,
            the codes to hand out, and how many have been claimed. A seat is one learner for one
            course, and the school never sees which learner took which.
          </p>
          <InstitutionConsole board={board} report={report} window={{ from, to }} />
        </>
      )}

      {!board && (
        <p className="muted">
          Have a code from a school? <Link href="/institution/claim">Claim your seat</Link>.
        </p>
      )}
    </div>
  );
}
