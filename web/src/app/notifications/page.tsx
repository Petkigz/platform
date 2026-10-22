import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { MarkAllRead } from './notification-actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Notifications' };

type Message = {
  id: string;
  kind: string;
  title: string;
  body: string;
  href: string | null;
  severity: string;
  createdAt: string;
  readAt: string | null;
};

type Reminder = {
  kind: string;
  title: string;
  body: string;
  href: string | null;
  severity: string;
  happensAt: string;
};

type Centre = {
  unreadCount: number;
  reminders: Reminder[];
  recent: Message[];
};

function when(value: string): string {
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

/**
 * The in-app notification centre.
 *
 * Two sections, because they are two different things. "Coming up" is computed
 * from rows that already say what is about to happen, so it is never stale and
 * is not something you read and dismiss. "Recent" is what happened, and it can
 * be marked read.
 *
 * This page exists while `delivery.notifications` is off and no provider is
 * configured: a message inside the product needs neither. What it never does is
 * claim something was emailed or texted.
 */
export default async function NotificationsPage() {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/notifications');

  const { data, error } = await supabase.rpc('my_notifications', { p_limit: 50 });
  if (error) throw new Error(error.message);
  const centre = (data ?? null) as Centre | null;

  const reminders = centre?.reminders ?? [];
  const recent = centre?.recent ?? [];
  const unreadIds = recent.filter((m) => m.readAt === null).map((m) => m.id);

  return (
    <main className="page narrow">
      <div className="page-head">
        <p className="eyebrow">Your account</p>
        <h1>Notifications</h1>
        <p className="muted">
          Messages from the platform, inside the application. Email and text delivery are not configured yet, so
          nothing here has been sent to an inbox or a phone — this is the only place they appear.
        </p>
      </div>

      {reminders.length > 0 && (
        <section style={{ marginBottom: '2rem' }}>
          <div className="outline-h" style={{ marginTop: 0 }}>
            <h3>Coming up</h3>
            <span className="badge neutral">{reminders.length}</span>
          </div>
          <div className="card">
            <ul className="lessons">
              {reminders.map((r) => (
                <li key={`${r.kind}-${r.happensAt}-${r.title}`}>
                  <strong>{r.title}</strong>
                  <span className="muted" style={{ display: 'block', fontSize: '0.9rem' }}>
                    {r.body}
                  </span>
                  {r.href && (
                    <span style={{ display: 'block', marginTop: '0.25rem', fontSize: '0.9rem' }}>
                      <Link href={r.href}>Open</Link>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section>
        <div className="outline-h" style={{ marginTop: 0 }}>
          <h3>Recent</h3>
          {centre && centre.unreadCount > 0 && <span className="badge">{centre.unreadCount} unread</span>}
        </div>

        {recent.length === 0 ? (
          <p className="empty">Nothing yet.</p>
        ) : (
          <>
            <div className="card">
              <ul className="lessons">
                {recent.map((m) => (
                  <li key={m.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start' }}>
                      <span>
                        <strong>
                          {m.readAt === null && <span aria-label="unread" style={{ color: 'var(--green-800)' }}>• </span>}
                          {m.title}
                        </strong>
                        <span className="muted" style={{ display: 'block', fontSize: '0.9rem' }}>
                          {m.body}
                        </span>
                        <span className="muted" style={{ display: 'block', fontSize: '0.8rem' }}>
                          {when(m.createdAt)}
                        </span>
                      </span>
                      <span style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {m.href && <Link href={m.href}>Open</Link>}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            {unreadIds.length > 0 && (
              <p style={{ marginTop: '1rem' }}>
                <MarkAllRead ids={unreadIds} />
              </p>
            )}
          </>
        )}
      </section>

      <p style={{ marginTop: '1.5rem' }}>
        <Link href="/dashboard">Your area</Link>
        {' · '}
        <Link href="/teach/payouts">Payouts</Link>
      </p>
    </main>
  );
}
