import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { directorySummary, parseDirectory, roleLabel, DirectoryError } from '@/lib/directory';

export const metadata = { title: 'Users' };
export const dynamic = 'force-dynamic';

function when(value: string): string {
  return new Date(value).toLocaleDateString('en-GB', { timeZone: 'UTC', dateStyle: 'medium' });
}

/**
 * Users — screen 36, which has never had a page.
 *
 * Not a queue: nobody is waiting in it. It answers the question a support
 * message actually asks — "is this account here, and what has it been given?" —
 * and it is the only screen that can be searched by an email address.
 *
 * Two things it deliberately is not.
 *
 * **It is not a list of children.** A child is a `learner_profiles` row inside a
 * family and has no login while `child_login` is off, so the children of the
 * platform are not accounts and do not appear. The count beside each adult says
 * how many learner profiles hang off the account, which is the useful number and
 * not a name.
 *
 * **It holds no money.** No balance, no lifetime value, no currency. The money
 * screens exist and are gated; a directory with an amount in it is the one place
 * two currencies would get added together by eye.
 */
export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/admin/users');

  const { data: privileged } = await supabase.rpc('is_privileged', { p_user_id: user.id });
  if (privileged !== true) redirect('/');

  const { q } = await searchParams;
  const query = typeof q === 'string' ? q.trim() : '';

  const { data, error } = await supabase.rpc('staff_directory', {
    p_kind: 'accounts',
    p_search: query.length > 0 ? query : null,
    p_limit: 50,
  });
  if (error) throw new Error(error.message);

  let accounts;
  try {
    const parsed = parseDirectory(data);
    if (parsed.kind !== 'accounts') throw new DirectoryError('the console loaded the wrong list');
    accounts = parsed;
  } catch (e) {
    if (e instanceof DirectoryError) throw new Error(e.message);
    throw e;
  }

  return (
    <main className="page">
      <nav className="crumbs">
        <Link href="/admin">Admin</Link>
        <span aria-hidden>›</span>
        <span>Users</span>
      </nav>

      <div className="page-head">
        <p className="eyebrow">Directory</p>
        <h1>Users</h1>
        <p className="muted">
          Every account on the platform, newest first. Search by name or by the
          address somebody wrote in about.
        </p>
      </div>

      <form method="get" className="row" style={{ gap: '0.5rem', marginBottom: '1rem' }}>
        <label className="eyebrow" htmlFor="q" style={{ alignSelf: 'center' }}>
          Find
        </label>
        <input
          id="q"
          name="q"
          defaultValue={query}
          placeholder="A name, or an email address"
          autoComplete="off"
          style={{ flex: '1 1 18rem' }}
        />
        <button type="submit" className="btn secondary">
          Search
        </button>
        {query && (
          <Link className="btn ghost" href="/admin/users">
            Clear
          </Link>
        )}
      </form>

      <p className="muted">{directorySummary(accounts, 'account')}</p>

      <div className="notice">
        A child is a learner profile inside a family, not an account, so children
        do not appear here by name. The number beside each person is how many
        learner profiles hang off the account.
      </div>

      {accounts.rows.length === 0 ? (
        <p className="empty">
          {query
            ? `Nothing matches “${query}”. Try part of a name, or the address the person wrote from.`
            : 'There are no accounts yet.'}
        </p>
      ) : (
        <div className="stack">
          {accounts.rows.map((account) => (
            <article className="card" key={account.userId}>
              <div className="row" style={{ flexWrap: 'wrap' }}>
                <div>
                  <strong>{account.name}</strong>
                  <p className="meta">
                    {account.email ?? 'no email on file'}
                    {account.country ? ` · ${account.country}` : ''} · joined{' '}
                    {when(account.joinedAt)}
                  </p>
                </div>
                <span
                  className={`badge${account.status === 'active' ? '' : ' neutral'}`}
                >
                  {account.status}
                </span>
              </div>

              <p className="meta" style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                {account.roles.length === 0 ? (
                  <span className="badge neutral">no role</span>
                ) : (
                  account.roles.map((role) => (
                    <span className="badge neutral" key={role}>
                      {roleLabel(role)}
                    </span>
                  ))
                )}
              </p>

              <p className="meta">
                {account.learnerProfiles === 1
                  ? 'one learner profile'
                  : `${account.learnerProfiles} learner profiles`}
                {' · '}
                {account.courses === 0
                  ? 'teaches nothing'
                  : `teaches ${account.courses} course${account.courses === 1 ? '' : 's'}`}
              </p>
            </article>
          ))}
        </div>
      )}

      <p className="muted" style={{ marginTop: '1.5rem' }}>
        Appointing a teacher or a board member is done on{' '}
        <Link href="/admin/roles">Roles</Link>, with a written reason. This page
        reads; it does not change anybody.
      </p>
    </main>
  );
}
