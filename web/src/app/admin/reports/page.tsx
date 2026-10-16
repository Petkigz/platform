import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { fetchReportQueue } from '@/lib/governance';
import { ResolveForm } from './resolve-form';

export const dynamic = 'force-dynamic';

/**
 * Reports waiting on a person.
 *
 * This queue exists because moderation cannot be complete. A reviewer checks a
 * course before it is published; they cannot foresee every mistranslation, and
 * on a platform that teaches faith to children the people reading a lesson are
 * the ones who notice when something is wrong. They needed somewhere to say so,
 * and somewhere for it to arrive.
 *
 * Ordered oldest first: a report left sitting is the thing that makes the
 * button a lie.
 */
export default async function AdminReportsPage() {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/sign-in?next=/admin/reports');

  const { data: privileged } = await supabase.rpc('is_privileged', { p_user_id: user.id });
  if (privileged !== true) redirect('/');

  const reports = await fetchReportQueue(supabase);

  return (
    <div className="container section">
      <p className="eyebrow">
        <Link href="/admin">Admin</Link>
      </p>
      <h1>Content reports</h1>
      <p className="lede">
        {reports.length} report{reports.length === 1 ? '' : 's'} waiting.
      </p>
      <p className="muted">
        Every one of these was filed by someone reading a lesson. Closing one
        requires a written note, because a queue of silent dismissals teaches
        readers that reporting does nothing.
      </p>

      {reports.length === 0 ? (
        <div className="card">
          <p className="muted" style={{ margin: 0 }}>
            Nothing waiting. When someone flags a lesson or a discussion post it
            lands here.
          </p>
        </div>
      ) : (
        <ul className="lessons" style={{ display: 'grid', gap: '1rem' }}>
          {reports.map((r) => (
            <li key={r.id}>
              <div className="row" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
                <span className="badge neutral">{r.status}</span>
                <span className="muted">
                  {new Date(r.created_at).toLocaleString()} ·{' '}
                  {r.reporter?.display_name ?? 'someone not signed in'}
                </span>
              </div>
              {r.lesson?.title && (
                <p className="muted" style={{ margin: '0.25rem 0' }}>
                  On <span className="meta">{r.lesson.title}</span>
                </p>
              )}
              <p style={{ margin: '0.5rem 0' }}>{r.description}</p>
              <ResolveForm reportId={r.id} category={r.report_category} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
