import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { IncidentDesk } from './incident-desk';
import type { IncidentRegister } from '@/lib/incidents';

export const dynamic = 'force-dynamic';

/**
 * The incident register.
 *
 * Gated on `platform_admin` or `governance_admin`, not `is_privileged`: this is the
 * one screen that says which children's data was exposed, and a support agent who
 * can read that has a power nobody gave them. `incident_register()` refuses anybody
 * else as well, so this redirect is a courtesy rather than the defence.
 *
 * No flag in front of it. `platform.incident` is off because detection and delivery
 * are missing — not because the register may not exist. An incident that happens
 * while the policy is still being written still has to be written down somewhere
 * that is not somebody's memory.
 */
export default async function AdminIncidentsPage() {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/admin/incidents');

  const [{ data: platform }, { data: governance }] = await Promise.all([
    supabase.rpc('has_role', { p_user_id: user.id, p_role_code: 'platform_admin' }),
    supabase.rpc('has_role', { p_user_id: user.id, p_role_code: 'governance_admin' }),
  ]);
  if (platform !== true && governance !== true) redirect('/');

  const { data, error } = await supabase.rpc('incident_register');
  if (error) throw new Error(error.message);
  const register = (data ?? {
    incidents: [],
    counts: {
      open: 0, resolved: 0, closed: 0, critical: 0,
      overdueObligations: 0, noObligations: 0, childrenAffected: 0,
    },
    canWork: true,
  }) as unknown as IncidentRegister;

  return (
    <div className="container section">
      <p className="eyebrow">
        <Link href="/admin">Administration</Link>
      </p>
      <h1>Incidents</h1>
      <p className="lede">
        What happened, who has to be told, and by when. Counts, not names: the register says
        &ldquo;412 people, 30 of them children&rdquo; and never who. The deadline on each
        notification is typed by a person — nothing here derives one, because the rule differs
        by market and a guessed deadline would look authoritative while being wrong.
      </p>

      <IncidentDesk register={register} />

      <p style={{ marginTop: '1.5rem' }}>
        <Link href="/admin">Back to administration</Link>
      </p>
    </div>
  );
}
