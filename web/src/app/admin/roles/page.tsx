import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { fetchRoleRoster } from '@/lib/roles';
import { RoleForm } from './role-form';

export const dynamic = 'force-dynamic';

/**
 * Who may do what.
 *
 * This page did not exist, and neither did any way to reach the table behind it.
 * The authorisation model is capability-based — every check in the schema reads
 * these roles — so without it there was no way through the product to appoint an
 * instructor, a reviewer, or another admin. A teacher could sign up and could
 * never teach.
 *
 * Grouped by role rather than by person, because the question this page answers
 * is "who can administer this platform right now", and the privileged group is
 * the one that matters.
 */
export default async function AdminRolesPage() {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/sign-in?next=/admin/roles');

  const { data: privileged } = await supabase.rpc('is_privileged', { p_user_id: user.id });
  if (privileged !== true) redirect('/');

  const { roles, assignments } = await fetchRoleRoster(supabase);

  // Names for everyone who holds a role. RLS decides which profiles come back;
  // nothing here filters by the reader.
  const holderIds = Array.from(new Set(assignments.map((a) => a.user_id)));
  const { data: profileRows } = await supabase
    .from('user_profiles')
    .select('user_id, display_name, email')
    .in('user_id', holderIds.length > 0 ? holderIds : [user.id]);

  const profiles = new Map(
    ((profileRows ?? []) as unknown as {
      user_id: string;
      display_name: string | null;
      email: string | null;
    }[]).map((p) => [p.user_id, p]),
  );

  const privilegedRoles = roles.filter((r) => r.is_privileged);
  const otherRoles = roles.filter((r) => !r.is_privileged);

  const nameOf = (id: string) => {
    const p = profiles.get(id);
    return p?.display_name ?? p?.email ?? 'someone';
  };

  return (
    <div className="container section">
      <p className="eyebrow">
        <Link href="/admin">Admin</Link>
      </p>
      <h1>Roles</h1>
      <p className="lede">
        {assignments.length} active assignment
        {assignments.length === 1 ? '' : 's'} across {roles.length} roles.
      </p>
      <p className="muted">
        Roles decide what a person may do, and every check in the database reads
        them. Granting or revoking needs a written reason, which goes on the
        audit trail. The last privileged account cannot be removed — appoint
        someone else first.
      </p>

      {([
        ['Privileged', privilegedRoles],
        ['Everyone else', otherRoles],
      ] as const).map(([heading, group]) => (
        <section className="section" key={heading}>
          <div className="outline-h">
            <h3>{heading}</h3>
          </div>

          {group.map((role) => {
            const holders = assignments.filter((a) => a.role_code === role.code);
            return (
              <div className="card" key={role.code} style={{ marginBottom: '0.75rem' }}>
                <p style={{ margin: 0 }}>
                  <strong>{role.name}</strong>{' '}
                  <span className="meta">{role.code}</span>
                </p>
                {role.description && (
                  <p className="muted" style={{ margin: '0.25rem 0' }}>
                    {role.description}
                  </p>
                )}
                {holders.length === 0 ? (
                  <p className="muted" style={{ margin: '0.25rem 0 0' }}>
                    Nobody holds this role.
                  </p>
                ) : (
                  <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem' }}>
                    {holders.map((h) => (
                      <li key={`${h.user_id}-${h.role_code}`}>
                        {nameOf(h.user_id)}{' '}
                        <span className="muted">
                          · since {new Date(h.assigned_at).toLocaleDateString()}
                          {h.assigner?.display_name
                            ? ` · granted by ${h.assigner.display_name}`
                            : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </section>
      ))}

      <section className="section">
        <div className="outline-h">
          <h3>Change someone&apos;s role</h3>
        </div>
        <p className="muted">
          Only people who already have a profile are listed. You cannot grant
          yourself a privileged role — someone else has to do it.
        </p>

        {assignments.length === 0 ? (
          <div className="empty">
            Nobody has a role yet, so there is nobody here to change.
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {holderIds.map((id) => (
              <RoleForm
                key={id}
                userId={id}
                userName={nameOf(id)}
                roles={roles}
                held={assignments
                  .filter((a) => a.user_id === id)
                  .map((a) => a.role_code)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
