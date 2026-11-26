import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { connectionSummary, readConnections, UNSEEN_CONNECTIONS, type ConnectionState } from '@/lib/connections';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Connections' };

const WORD: Record<ConnectionState, string> = {
  connected: 'Connected',
  partly: 'Partly set',
  not_connected: 'Not connected',
};

/**
 * Which outside accounts this deployment is connected to: the owner's page.
 *
 * It reads the server's environment and shows the names of the variables that
 * are still missing. It never shows a value, and the list is made on the
 * server: nothing of the environment is sent to the browser but these names.
 */
export default async function AdminConnectionsPage() {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/admin/connections');

  const { data: owner } = await supabase.rpc('has_role', { p_user_id: user.id, p_role_code: 'platform_admin' });
  if (owner !== true) redirect('/');

  const list = readConnections(process.env);
  const summary = connectionSummary(list);

  return (
    <div className="container section">
      <p className="eyebrow">
        <Link href="/admin">Administration</Link>
      </p>
      <h1>Connections</h1>
      <p className="lede">
        The outside accounts this site uses, and which of them it has been given. The site is built to run
        without them: a part with no account waits, and says so here.
      </p>
      <p>
        {summary.connected} connected, {summary.partly} partly set, {summary.notConnected} not connected.
      </p>
      <div className="notice">
        <strong>This shows what is set, not whether it is right.</strong> A key that is set can still be a wrong
        key. To connect an account, set the variables named below in the host&rsquo;s environment settings and
        deploy again. Values are never shown on this page.
      </div>

      <ul className="lessons" style={{ marginTop: '1.5rem' }}>
        {list.map((c) => (
          <li key={c.id}>
            <span className="t">
              <strong>{c.name}</strong>: {WORD[c.state]}
              <span className="muted" style={{ display: 'block' }}>
                {c.state === 'connected' ? 'While it was not connected: ' : 'Until it is connected: '}
                {c.without}
              </span>
              {c.missing.length > 0 ? (
                <span style={{ display: 'block' }}>
                  Still to set: {c.missing.map((name, i) => (
                    <span key={name}>
                      {i > 0 ? ', ' : ''}
                      <code>{name}</code>
                    </span>
                  ))}
                </span>
              ) : null}
              {c.notes.map((note) => (
                <span key={note} className="muted" style={{ display: 'block' }}>
                  {note}
                </span>
              ))}
            </span>
          </li>
        ))}
      </ul>

      <h2 style={{ marginTop: '2.5rem' }}>Set somewhere this page cannot see</h2>
      <ul className="lessons">
        {UNSEEN_CONNECTIONS.map((u) => (
          <li key={u.name}>
            <span className="t">
              <strong>{u.name}</strong>
              <span style={{ display: 'block' }}>Where: {u.where}</span>
              <span className="muted" style={{ display: 'block' }}>
                {u.why}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
