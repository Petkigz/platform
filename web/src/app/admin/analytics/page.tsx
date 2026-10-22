import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { ANALYTICS_EVENT_LABELS } from '@/lib/analytics';

export const dynamic = 'force-dynamic';

type Total = {
  event_code: string;
  description: string;
  events: number | string;
  actors: number | string;
  learners: number | string;
};

type Daily = { day: string; events: number | string };
type Term = { term: string | null; searches: number | string };

const WINDOWS = [7, 30, 90, 365];

function n(value: number | string): number {
  return Number(value ?? 0);
}

/**
 * What people do, kept forever.
 *
 * The owner's rule (2026-10-22) is that nothing is pruned, so this page reports
 * what is there rather than what survived a retention window. It shows totals
 * per event and the days of the busiest one, because the question a report
 * answers first is "is this being used at all".
 *
 * It is aggregate on purpose: counts and distinct people, never a list of who.
 * The one exception is search terms, which are the point of recording a search —
 * and the flag's precondition says so.
 */
export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/admin/analytics');

  const { data: privileged } = await supabase.rpc('is_privileged', { p_user_id: user.id });
  if (privileged !== true) redirect('/');

  const { days: daysParam } = await searchParams;
  const days = WINDOWS.includes(Number(daysParam)) ? Number(daysParam) : 30;

  const [{ data: flag }, { data: totalsData, error: totalsError }, { data: termsData }] =
    await Promise.all([
      supabase.from('platform_settings').select('value_text').eq('key', 'delivery.analytics').maybeSingle(),
      supabase.rpc('analytics_event_totals', { p_days: days }),
      supabase.rpc('analytics_search_terms', { p_days: days, p_limit: 10 }),
    ]);

  if (totalsError) throw new Error(totalsError.message);

  const totals = (totalsData ?? []) as Total[];
  const terms = (termsData ?? []) as Term[];
  const enabled = flag?.value_text === 'true';

  // The busiest event, and its days — one query rather than a chart nobody asked
  // for. A code missing from the totals means it is not in the vocabulary.
  const busiest = totals.reduce<Total | null>(
    (best, row) => (best === null || n(row.events) > n(best.events) ? row : best),
    null,
  );
  const daily = busiest && n(busiest.events) > 0
    ? ((await supabase.rpc('analytics_daily', { p_code: busiest.event_code, p_days: days })).data ??
        []) as Daily[]
    : [];

  const recorded = totals.reduce((sum, row) => sum + n(row.events), 0);
  const peak = daily.reduce((max, row) => Math.max(max, n(row.events)), 0);

  return (
    <div className="container section">
      <p className="eyebrow">Administration</p>
      <h1>Analytics</h1>
      <p className="lede">
        Every event is kept. Nothing here expires, is sampled, or is deleted — a
        closed account keeps its rows and loses its name.
      </p>

      <div className="notice" style={{ marginBottom: '1.5rem' }}>
        {enabled ? (
          <>
            <strong>Recording.</strong> Signed-in activity is being recorded now. A signed-out
            visitor records nothing — no cookie, no identifier, no anonymous traffic.
          </>
        ) : (
          <>
            <strong>Not recording.</strong> Capture is off. Turn on{' '}
            <Link href="/admin">delivery.analytics</Link> to collect events; nothing that happened
            while it was off can be recovered, because nothing was written.
          </>
        )}
      </div>

      <div className="stats">
        <div>
          <div className="n">{recorded}</div>
          <div className="l">Events in {days} days</div>
        </div>
        <div>
          <div className="n">{totals.filter((t) => n(t.events) > 0).length}</div>
          <div className="l">Events in use</div>
        </div>
        <div>
          <div className="n">{totals.length}</div>
          <div className="l">In the vocabulary</div>
        </div>
      </div>

      <p style={{ marginTop: '1.5rem' }}>
        Window:{' '}
        {WINDOWS.map((w) => (
          <span key={w} style={{ marginRight: '0.75rem' }}>
            {w === days ? (
              <strong>{w} days</strong>
            ) : (
              <Link href={`/admin/analytics?days=${w}`}>{w} days</Link>
            )}
          </span>
        ))}
      </p>

      <div className="outline-h" style={{ marginTop: '1.5rem' }}>
        <h3>By event</h3>
      </div>
      <div className="card">
        <ul className="lessons">
          {totals.map((row) => (
            <li key={row.event_code}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                <strong>{ANALYTICS_EVENT_LABELS[row.event_code as keyof typeof ANALYTICS_EVENT_LABELS] ?? row.event_code}</strong>
                <span className="muted">
                  {n(row.events)} event(s) · {n(row.actors)} person(s) · {n(row.learners)} learner(s)
                </span>
              </div>
              <p className="muted" style={{ fontSize: '0.85rem', margin: '0.25rem 0 0' }}>
                <code>{row.event_code}</code> — {row.description}
              </p>
              {n(row.events) === 0 && (
                <span className="badge neutral">nothing recorded yet</span>
              )}
            </li>
          ))}
        </ul>
      </div>

      {busiest && daily.length > 0 && (
        <>
          <div className="outline-h" style={{ marginTop: '2rem' }}>
            <h3>
              {ANALYTICS_EVENT_LABELS[busiest.event_code as keyof typeof ANALYTICS_EVENT_LABELS] ??
                busiest.event_code}{' '}
              by day
            </h3>
          </div>
          <div className="card">
            <ul className="lessons">
              {daily.map((row) => (
                <li key={row.day}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span className="muted" style={{ width: '7rem', fontSize: '0.85rem' }}>
                      {row.day}
                    </span>
                    <span
                      aria-hidden
                      style={{
                        display: 'inline-block',
                        height: '0.6rem',
                        borderRadius: '999px',
                        background: 'var(--green-800)',
                        width: `${peak > 0 ? Math.max(2, Math.round((n(row.events) / peak) * 100)) : 0}%`,
                        minWidth: '0.4rem',
                      }}
                    />
                    <span style={{ fontSize: '0.85rem' }}>{n(row.events)}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      <div className="outline-h" style={{ marginTop: '2rem' }}>
        <h3>What people search for</h3>
      </div>
      <p className="muted">
        The one report that reads a payload, because knowing what was looked for is the reason
        search terms are recorded at all. It is why the flag&apos;s precondition asks for a privacy
        review before switching it on.
      </p>
      <div className="card">
        {terms.length === 0 ? (
          <p className="empty">No catalogue searches in this window.</p>
        ) : (
          <ul className="lessons">
            {terms.map((row) => (
              <li key={row.term ?? '(blank)'} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{row.term}</span>
                <span className="muted">{n(row.searches)} search(es)</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p style={{ marginTop: '2rem' }}>
        <Link href="/admin">Back to the flag register</Link> — turning capture on or off is there,
        not here. Reading is not the same as recording: this page shows what is already stored
        whether the switch is on or off.
      </p>
    </div>
  );
}
