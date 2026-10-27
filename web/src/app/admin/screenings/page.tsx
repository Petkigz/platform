import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { ScreeningConsole } from './screening-console';
import type { ScreeningRegister } from '@/lib/screening';

export const dynamic = 'force-dynamic';

/**
 * The screening register: every appointed teacher, and whether a check is on file.
 *
 * Gated on `platform_admin` or `governance_admin`, the same gate as the reviewer
 * register and for the same reason: this page decides whether an adult is safe to
 * teach a child, and a support agent handling refunds should not be able to record
 * a background check. The function refuses anybody else as well, so this redirect
 * is a courtesy rather than the defence.
 *
 * There is no flag in front of it. `platform.safeguarding` is off, which means the
 * *enforcement* — refusing a child-facing course from an unchecked adult — is not
 * built; it does not mean the register may not exist. A register that can only be
 * opened once the policy is finished is a register nobody fills in while writing
 * the policy.
 */
export default async function AdminScreeningsPage() {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/admin/screenings');

  const [{ data: platform }, { data: governance }] = await Promise.all([
    supabase.rpc('has_role', { p_user_id: user.id, p_role_code: 'platform_admin' }),
    supabase.rpc('has_role', { p_user_id: user.id, p_role_code: 'governance_admin' }),
  ]);
  if (platform !== true && governance !== true) redirect('/');

  const { data, error } = await supabase.rpc('screening_register');
  if (error) throw new Error(error.message);
  const register = (data ?? { teachers: [], counts: { teachers: 0, none: 0, checked: 0, expired: 0, failed: 0 } }) as unknown as ScreeningRegister;

  return (
    <div className="container section">
      <p className="eyebrow">
        <Link href="/admin">Administration</Link>
      </p>
      <h1>Teacher screening</h1>
      <p className="lede">
        A record that a check happened: what kind, when, who recorded it, and when it lapses.
        The document itself stays outside the platform — this page holds the reference, and the
        reference is never shown again to anybody.
      </p>

      <ScreeningConsole register={register} canRecord={platform === true || governance === true} />

      <p style={{ marginTop: '1.5rem' }}>
        <Link href="/admin">Back to administration</Link>
      </p>
    </div>
  );
}
