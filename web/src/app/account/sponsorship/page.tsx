import Link from 'next/link';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import {
  ZAKAT_HONESTY,
  describeApplicationStatus,
  describeSponsorshipStatus,
  parseApplicationBoard,
  parseSponsorBoard,
  pledgeNextStep,
} from '@/lib/sponsorship';

export const dynamic = 'force-dynamic';

function when(iso: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Both seats on one page.
 *
 * A person can be on either side of this at different times — asking for a
 * child's course in one month, paying for a stranger's the next — and hunting
 * for a second page to see the other half would be a strange thing to ask of
 * them. The two halves are read by separate functions and never joined: the
 * applications board has no donor field, and the sponsorship board has no
 * learner field.
 */
export default async function AccountSponsorshipPage() {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/account/sponsorship');

  const [{ data: appliedData }, { data: sponsorData }] = await Promise.all([
    supabase.rpc('my_sponsorship_applications'),
    supabase.rpc('my_sponsorships'),
  ]);

  const applied = parseApplicationBoard(appliedData);
  const sponsored = parseSponsorBoard(sponsorData);

  return (
    <div className="container section">
      <p className="eyebrow">
        <Link href="/account">Account</Link>
      </p>
      <h1>Sponsored seats</h1>
      <p className="lede">
        Courses somebody else paid for, and courses you paid for somebody else to take. Neither
        side learns who the other is.
      </p>

      <h2 style={{ marginTop: '2rem' }}>What I have asked for</h2>

      {!applied && (
        <div className="notice error">
          Your requests could not be read. Nothing has changed — this page only reads.
        </div>
      )}

      {applied && applied.applications.length === 0 && (
        <div className="notice">
          You have not asked for a sponsored seat. If a course is out of reach,{' '}
          <Link href="/sponsor/apply">you can ask</Link> — it costs nothing and obliges nobody.
        </div>
      )}

      {applied && applied.applications.length > 0 && (
        <div className="scroll-x">
          <table style={{ width: '100%' }}>
            <thead>
              <tr>
                <th scope="col">Course</th>
                <th scope="col">For</th>
                <th scope="col">Where it stands</th>
                <th scope="col">Asked</th>
              </tr>
            </thead>
            <tbody>
              {applied.applications.map((row) => (
                <tr key={row.id}>
                  <td>
                    {row.courseSlug ? (
                      <Link href={`/courses/${row.courseSlug}`}>{row.courseTitle}</Link>
                    ) : (
                      row.courseTitle ?? '—'
                    )}
                  </td>
                  <td>{row.learnerName ?? '—'}</td>
                  <td>
                    {describeApplicationStatus(row.status)}
                    {row.seatCode && <span className="muted"> · {row.seatCode}</span>}
                    {row.decisionReason && (
                      <div className="muted">
                        {row.status === 'declined' ? 'Reason: ' : 'Note: '}
                        {row.decisionReason}
                      </div>
                    )}
                  </td>
                  <td>{when(row.askedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {applied && applied.applications.some((row) => row.status === 'funded') && (
        <div className="notice" style={{ marginTop: '1rem' }}>
          <strong>Somebody covered a seat for you.</strong> The course is open now — it is in{' '}
          <Link href="/learn">your learning</Link>. They are not named here, and that is on
          purpose: who gave is between them and Allah.
        </div>
      )}

      <h2 style={{ marginTop: '2.5rem' }}>What I have sponsored</h2>

      {!sponsored && (
        <div className="notice error">
          Your sponsorships could not be read. Nothing has changed — this page only reads.
        </div>
      )}

      {sponsored && sponsored.sponsorships.length === 0 && (
        <div className="notice">
          You have not sponsored a seat. <Link href="/sponsor">See the seats waiting</Link> — each
          one is a course somebody asked for.
        </div>
      )}

      {sponsored && sponsored.sponsorships.length > 0 && (
        <div className="stack">
          {sponsored.sponsorships.map((row) => (
            <div className="card" key={row.id}>
              <div className="outline-h" style={{ marginTop: 0 }}>
                <h3 style={{ margin: 0 }}>{row.courseTitle ?? 'A course'}</h3>
                <span className="badge neutral">{row.seatCode ?? '—'}</span>
              </div>
              <p className="meta" style={{ marginTop: '0.5rem' }}>
                {describeSponsorshipStatus(row.status)}
                {row.amountMinor && row.currencyCode && (
                  <> · {row.currencyCode} {row.amountMinor}</>
                )}
                {row.reference && <> · reference {row.reference}</>}
              </p>
              <p className="muted">{pledgeNextStep(row.status)}</p>
              <p className="muted">Pledged {when(row.pledgedAt)}</p>
            </div>
          ))}
        </div>
      )}

      <p className="muted" style={{ marginTop: '1.5rem' }}>{ZAKAT_HONESTY}</p>

      <p style={{ marginTop: '1rem' }}>
        <Link href="/sponsor" className="btn secondary">
          Seats waiting for a sponsor
        </Link>
      </p>
    </div>
  );
}
