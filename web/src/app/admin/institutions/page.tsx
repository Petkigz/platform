import Link from 'next/link';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { SSO_NOTICE, parseDirectory } from '@/lib/institution';
import { SEAT_PAYMENT_NOTICE, parseSeatDirectory } from '@/lib/seats';
import { InstitutionsDesk } from './institutions-desk';
import { RecordSeats } from './record-seats';

export const dynamic = 'force-dynamic';

/**
 * Institutions: open one, check a domain, change who administers it.
 *
 * Owner or governance, the same pair `institution_directory()` accepts — and the
 * writes are narrower than the reads on purpose: governance may check a domain
 * and read the list, and only the owner may open an institution or move the
 * administrator badge. A screen that offered a button the database would refuse
 * is the defect this file is written to avoid, so the two halves are rendered
 * from the same two booleans the functions check.
 */
export default async function AdminInstitutionsPage() {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/admin/institutions');

  const [{ data: platform }, { data: governance }] = await Promise.all([
    supabase.rpc('has_role', { p_user_id: user.id, p_role_code: 'platform_admin' }),
    supabase.rpc('has_role', { p_user_id: user.id, p_role_code: 'governance_admin' }),
  ]);
  if (platform !== true && governance !== true) redirect('/admin');

  const [{ data, error }, { data: seatsData }, { data: courseRows }] = await Promise.all([
    supabase.rpc('institution_directory'),
    supabase.rpc('institution_seat_directory'),
    // Only what the form needs to offer a choice. The database resolves the
    // published edition itself, so a course with nothing published is refused
    // with a sentence rather than silently pinned to a draft.
    supabase.from('courses').select('id,title').eq('status', 'active').is('deleted_at', null).order('title'),
  ]);
  const directory = parseDirectory(data);
  const seats = parseSeatDirectory(seatsData);
  const courses = ((courseRows ?? []) as { id: string; title: string }[]).map((row) => ({
    id: row.id,
    title: row.title,
  }));

  return (
    <div className="page wide">
      <nav className="crumbs">
        <Link href="/admin">Admin</Link>
        <span aria-hidden>›</span>
        <span>Institutions</span>
      </nav>

      <div className="page-head">
        <p className="eyebrow">Directory</p>
        <h1>Institutions</h1>
        <p className="muted">
          A madrasah, school, mosque or organisation with its own page. Its administrator brands it,
          claims its domain and reads counts of its own people — and cannot do anything a staff
          role does.
        </p>
      </div>

      <div className="notice">
        <strong>What an institution is not.</strong> It is not a way to buy seats: invoicing and
        bulk enrolment need B2B terms and a payment provider, and `commerce.institutions` is still
        off. It is not a way to see learners either — the report it reads is counts, with no name
        and no learner id. {SSO_NOTICE}
      </div>

      {error && (
        <div className="notice error" style={{ marginTop: '1rem' }}>
          The directory could not be read: {error.message}
        </div>
      )}

      {directory && (
        <div style={{ marginTop: '1.5rem' }}>
          {platform === true ? (
            <InstitutionsDesk directory={directory} />
          ) : (
            <section className="card">
              <h2 style={{ marginTop: 0 }}>Domains waiting to be checked</h2>
              <p className="muted">
                Opening an institution and changing its administrators is the owner’s work. Checking
                a domain claim is yours.
              </p>
              {directory.waitingDomains.length === 0 ? (
                <p className="empty">Nothing is waiting.</p>
              ) : (
                <ul>
                  {directory.waitingDomains.map((row) => (
                    <li key={row.id}>
                      <strong>{row.domain}</strong> — {row.institution}: look for{' '}
                      <code>{row.claimToken}</code>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
