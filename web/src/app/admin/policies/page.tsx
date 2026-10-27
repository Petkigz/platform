import Link from 'next/link';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import type { PolicyRegister } from '@/lib/policies';
import { PolicyEditor } from './policy-editor';

export const dynamic = 'force-dynamic';

/**
 * The register the owner publishes from — screen 51.
 *
 * Read by the same function the public pages read, plus the drafts they cannot.
 * A governance admin may open it and see where every document stands; only the
 * platform admin gets the controls, because only the platform admin can approve
 * — and the buttons are hidden rather than shown-and-refused, since a button
 * that always fails teaches the reader to distrust the page.
 */
export default async function AdminPoliciesPage() {
  if (!isSupabaseConfigured()) redirect('/');
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/admin/policies');

  const { data: privileged } = await supabase.rpc('is_privileged', { p_user_id: user.id });
  if (privileged !== true) redirect('/');

  const [{ data: registerData, error }, { data: isOwner }] = await Promise.all([
    supabase.rpc('policy_register'),
    supabase.rpc('has_role', { p_user_id: user.id, p_role_code: 'platform_admin' }),
  ]);
  if (error) throw new Error(error.message);

  const register = (registerData ?? null) as PolicyRegister | null;
  const counts = register?.counts;

  return (
    <div className="container section">
      <p className="eyebrow"><Link href="/admin">Administration</Link></p>
      <h1>Policies and terms</h1>
      <p className="lede">
        Every document that governs this platform, with the versions that have been in
        force and the draft waiting now. A draft is written with questions the platform
        cannot answer for you marked in the text, and it cannot be published while one is
        open — that refusal is the point, not an obstacle.
      </p>

      {counts && (
        <div className="notice" style={{ maxWidth: '48rem' }}>
          <strong>{counts.documents} documents</strong>
          {' · '}{counts.inForce} in force
          {' · '}{counts.drafts} drafts
          {' · '}
          {counts.openDecisions === 0
            ? 'no open decisions'
            : `${counts.openDecisions} open ${counts.openDecisions === 1 ? 'decision' : 'decisions'}`}
          {!isOwner && ' · you can read this register, not change it'}
        </div>
      )}

      <PolicyEditor register={register} isOwner={isOwner === true} />

      <p className="muted" style={{ marginTop: '2rem', maxWidth: '48rem' }}>
        What is published here is what a visitor reads at{' '}
        <Link href="/policies">/policies</Link>, and what an account is asked to agree to
        on its own page. A version that has been in force is never edited or deleted: it is
        retired when a new one takes over, because somebody agreed to it.
      </p>
      <p style={{ marginTop: '1rem' }}><Link href="/admin">Back to administration</Link></p>
    </div>
  );
}
