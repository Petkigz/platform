import Link from 'next/link';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { isFlagEnabled } from '@/lib/flags';
import { IJAZAH_CAVEAT, type Register } from '@/lib/ijazah';
import { IjazahConsole } from './ijazah-console';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Ijazahs' };

/**
 * The ijazah register: what the owner has recorded, and the form for recording it.
 *
 * Gated on `platform_admin` alone. Not governance staff, not a reviewer: the
 * owner's decision of 2026-10-30 is that **the owner records who authorised whom
 * and on what evidence**, because judging a chain of transmission is not a power
 * this platform has on staff. The functions refuse everybody else as well, so
 * this redirect is a courtesy rather than the defence.
 *
 * The caveat above the list is not decoration. It is the difference between a
 * register and a claim, and it is shown before the first row rather than after the
 * last one.
 */
export default async function AdminIjazahPage() {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/admin/ijazah');

  const { data: owner } = await supabase.rpc('has_role', {
    p_user_id: user.id,
    p_role_code: 'platform_admin',
  });
  if (owner !== true) redirect('/');

  const [{ data, error }, enabled] = await Promise.all([
    supabase.rpc('ijazah_register'),
    isFlagEnabled(supabase, 'learning.ijazah').catch(() => false),
  ]);
  if (error) throw new Error(error.message);

  const register = (data ?? { authorisations: [], candidates: [] }) as unknown as Register;

  return (
    <div className="container section">
      <p className="eyebrow">
        <Link href="/admin">Administration</Link>
      </p>
      <h1>Ijazahs</h1>
      <p className="lede">
        Who authorised whom, for what, and what you were shown. You are the only person who
        can write this, and this page is the only place it is written.
      </p>

      <div className="notice" style={{ maxWidth: '52rem' }}>
        <strong>{IJAZAH_CAVEAT}</strong>
      </div>

      <IjazahConsole register={register} enabled={enabled} />
    </div>
  );
}
