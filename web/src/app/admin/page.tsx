import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { fetchFlags, groupFlags } from '@/lib/flags';
import { FlagToggle } from './flag-toggle';

export const dynamic = 'force-dynamic';

/**
 * The admin flag dashboard.
 *
 * This is the page the standing architecture decision points at: build
 * everything, ship it off, turn it on from here.
 *
 * The register is read from `platform_settings`, which is privileged-only, so
 * a non-privileged visitor is redirected rather than shown an empty page — an
 * empty dashboard and a forbidden one look identical to the person staring at
 * it, and "you are not staff" is the more useful answer.
 */
export default async function AdminPage() {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/sign-in?next=/admin');

  const { data: privileged } = await supabase.rpc('is_privileged', { p_user_id: user.id });
  if (privileged !== true) redirect('/');

  const flags = await fetchFlags(supabase);
  const groups = groupFlags(flags);

  const on = flags.filter((f) => f.enabled).length;
  const deployGated = flags.filter((f) => f.gateType === 'code').length;
  const setupGated = flags.filter((f) => f.gateType === 'admin_setup').length;

  return (
    <div className="container section">
      <p className="eyebrow">Administration</p>
      <h1>Feature flags</h1>
      <p className="lede">
        Everything is built and shipped off. Turn features on here as their
        preconditions are met.
      </p>

      <div className="stats">
        <div>
          <div className="n">{on}</div>
          <div className="l">Enabled</div>
        </div>
        <div>
          <div className="n">{flags.length - on}</div>
          <div className="l">Off</div>
        </div>
        <div>
          <div className="n">{setupGated}</div>
          <div className="l">Need external setup</div>
        </div>
        <div>
          <div className="n">{deployGated}</div>
          <div className="l">Need a deploy</div>
        </div>
      </div>

      <div className="notice" style={{ marginTop: '1.5rem' }}>
        A flag marked <strong>needs a deploy</strong> cannot be switched on
        here, and the refusal is enforced in the database rather than by hiding
        the control. Each one carries the precondition that has to be true
        first — a flag with no written precondition is a bug waiting to be
        enabled.
      </div>

      {flags.length === 0 ? (
        <p className="empty">The flag register is empty.</p>
      ) : (
        groups.map((g) => (
          <div key={g.group}>
            <div className="outline-h">
              <h3>{g.group}</h3>
              <span className="muted" style={{ fontSize: '0.85rem' }}>
                {g.flags.filter((f) => f.enabled).length} / {g.flags.length} on
              </span>
            </div>
            <div className="card">
              <ul className="lessons">
                {g.flags.map((f) => (
                  <FlagToggle
                    key={f.key}
                    flagKey={f.key}
                    enabled={f.enabled}
                    gateType={f.gateType}
                    preconditions={f.preconditions}
                  />
                ))}
              </ul>
            </div>
          </div>
        ))
      )}

      <p style={{ marginTop: '1.5rem' }}>
        <Link href="/learn">Back to my learning</Link>
      </p>
    </div>
  );
}
