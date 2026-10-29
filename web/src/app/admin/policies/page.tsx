import Link from 'next/link';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import type { PolicyRegister } from '@/lib/policies';
import { coverageSentence, outstandingNames, parseCoverage } from '@/lib/licence';
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

  const [{ data: registerData, error }, { data: isOwner }, { data: coverageData }] = await Promise.all([
    supabase.rpc('policy_register'),
    supabase.rpc('has_role', { p_user_id: user.id, p_role_code: 'platform_admin' }),
    // A support or finance admin is privileged enough to reach this page and not
    // senior enough to read the coverage; the refusal is theirs to ignore.
    supabase.rpc('teacher_licence_coverage'),
  ]);
  if (error) throw new Error(error.message);

  const register = (registerData ?? null) as PolicyRegister | null;
  const counts = register?.counts;
  const coverage = parseCoverage(coverageData);

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

      {coverage && (
        <section className="card" style={{ maxWidth: '48rem', marginBottom: '1.5rem' }}>
          <h2 style={{ marginTop: 0 }}>Agreement to the teacher terms</h2>
          <p style={{ marginBottom: '0.35rem' }}>{coverageSentence(coverage)}</p>
          {coverage.outstanding.length > 0 && (
            <p className="muted" style={{ marginBottom: '0.35rem', fontSize: '0.9rem' }}>
              Still to agree: {outstandingNames(coverage)}.
            </p>
          )}
          <p className="muted" style={{ marginBottom: 0, fontSize: '0.9rem' }}>
            A teacher agrees on their own teaching page, and the agreement is recorded against the
            version that was live when they pressed it — publishing a new version asks everybody
            again. Refusing an upload until they agree is{' '}
            <strong>{coverage.enforced ? 'on' : 'off'}</strong>
            {!coverage.enforced && (
              <>
                , which means nothing is stopped today. The switch is{' '}
                <Link href="/admin/settings">in settings</Link>; it belongs on before the first
                teacher uploads.
              </>
            )}
            .
          </p>
        </section>
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
