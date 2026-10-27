import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { TakedownDesk } from './takedown-desk';
import type { TakedownRegister } from '@/lib/takedowns';

export const dynamic = 'force-dynamic';

/**
 * The takedown register.
 *
 * Readable by support agents as well as the owner and governance staff — support is
 * the phone that rings when a publisher's agent cannot find an address, and a queue
 * they cannot see is a queue they cannot explain. Taking a notice and deciding one
 * are narrower: `open_takedown_notice()` and `decide_takedown_notice()` refuse
 * anybody but the owner and governance staff, so the buttons here follow the same
 * line rather than the page gate.
 */
export default async function AdminTakedownsPage() {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/admin/takedowns');

  const [{ data: privileged }, { data: governance }, { data: platform }] = await Promise.all([
    supabase.rpc('is_privileged', { p_user_id: user.id }),
    supabase.rpc('has_role', { p_user_id: user.id, p_role_code: 'governance_admin' }),
    supabase.rpc('has_role', { p_user_id: user.id, p_role_code: 'platform_admin' }),
  ]);
  if (privileged !== true) redirect('/');

  const { data, error } = await supabase.rpc('takedown_register');
  if (error) throw new Error(error.message);
  const register = (data ?? {
    notices: [],
    candidates: [],
    counts: { held: 0, upheld: 0, released: 0, unanswered: 0, reviewOverdue: 0 },
  }) as unknown as TakedownRegister;

  return (
    <div className="container section">
      <p className="eyebrow">
        <Link href="/admin">Administration</Link>
      </p>
      <h1>Copyright and takedowns</h1>
      <p className="lede">
        A notice stops the distribution first and decides afterwards. Nothing is deleted: the
        material is withheld, the teacher answers inside the product, and somebody other than the
        person who took the notice decides it.
      </p>

      <TakedownDesk
        register={register}
        canTake={platform === true || governance === true}
        canDecide={platform === true || governance === true}
        viewerId={user.id}
      />

      <p style={{ marginTop: '1.5rem' }}>
        <Link href="/admin">Back to administration</Link>
      </p>
    </div>
  );
}
