import Link from 'next/link';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import type { PanelRegister } from '@/lib/panels';
import { PanelConsole } from './panel-console';

export const dynamic = 'force-dynamic';

/**
 * The panel console — screen 54.
 *
 * Reading is staff; the controls split the way the responsibility does. The owner
 * convenes a panel, sets its quorum, seats people and removes them. Governance
 * staff open a case against a version that has not published. The decision is
 * recorded by the chair, governance or the owner — and refused without quorum.
 *
 * The page also states the thing that is easy to get wrong: with
 * `governance.panel_required` off, no publication waits on any of this.
 */
export default async function AdminPanelsPage() {
  if (!isSupabaseConfigured()) redirect('/');
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/admin/panels');

  const { data: privileged } = await supabase.rpc('is_privileged', { p_user_id: user.id });
  if (privileged !== true) redirect('/');

  const [registerResult, isOwnerResult, subjectsResult] = await Promise.all([
    supabase.rpc('panel_register'),
    supabase.rpc('has_role', { p_user_id: user.id, p_role_code: 'platform_admin' }),
    supabase.from('subject_areas').select('id, name').eq('status', 'active').order('name'),
  ]);
  if (registerResult.error) throw new Error(registerResult.error.message);
  if (subjectsResult.error) throw new Error(subjectsResult.error.message);

  const register = (registerResult.data ?? null) as PanelRegister | null;
  const isOwner = isOwnerResult.data === true;
  const subjects = (subjectsResult.data ?? []) as { id: string; name: string }[];

  return (
    <div className="container section">
      <p className="eyebrow"><Link href="/admin">Administration</Link></p>
      <h1>Scholarly panels</h1>
      <p className="lede" style={{ maxWidth: '48rem' }}>
        A panel of scholars deciding a question a single reviewer should not settle alone. The
        owner convenes a panel and sets its quorum; staff open a case against a version that has
        not published; the panel votes; the chair, governance or the owner records the decision.
      </p>

      {register && (
        <div className="notice" style={{ maxWidth: '48rem' }}>
          <strong>{register.counts.panels} panels</strong>
          {' · '}{register.counts.convened} convened
          {' · '}{register.counts.openCases} cases waiting
          {' · '}
          {register.panelRequired
            ? 'publication requires a panel decision'
            : 'publication does not require a panel decision yet'}
          {!isOwner && ' · you can read this and open a case, not convene a panel'}
        </div>
      )}

      <PanelConsole register={register} isOwner={isOwner} subjects={subjects} />

      <p className="muted" style={{ marginTop: '2rem', maxWidth: '48rem' }}>
        A case is approved only when the panel has reached its quorum and more members voted to
        approve than to reject. With <code>governance.panel_required</code> off, none of this
        holds up a publication — peer review is enough — so a panel here is a body that can be
        used before it is required. Both settings live on{' '}
        <Link href="/admin/settings">Controls</Link>, each with a written reason.
      </p>
      <p style={{ marginTop: '1rem' }}><Link href="/admin">Back to administration</Link></p>
    </div>
  );
}
