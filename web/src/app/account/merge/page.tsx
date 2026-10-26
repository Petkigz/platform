import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { parseMergeBoard } from '@/lib/merge';
import { MergePanel } from './merge-panel';

export const dynamic = 'force-dynamic';

/**
 * Two accounts, one person.
 *
 * The rules are the database's: `my_merge_requests()` returns the requests this
 * account has to answer and the ones it has made, each with the preview that
 * says what would stop it. This page lays them out and refuses to make the
 * decisive step look ordinary — the button is disabled until the person types
 * their own name.
 */
export default async function AccountMergePage() {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/account/merge');

  const [{ data: boardData, error }, { data: profile }] = await Promise.all([
    supabase.rpc('my_merge_requests'),
    supabase.from('user_profiles').select('display_name').eq('user_id', user.id).maybeSingle(),
  ]);
  if (error) throw new Error(error.message);

  const board = parseMergeBoard(boardData);

  return (
    <div className="container section">
      <p className="eyebrow">
        <Link href="/account">Account settings</Link>
      </p>
      <h1>Merging accounts</h1>
      <p className="lede">
        If you signed up twice, one account can be folded into the other so your
        courses, certificates and details are in one place. Both accounts have to
        agree, and the account that is absorbed is closed.
      </p>

      {!board ? (
        <div className="notice error" role="alert">
          The merge requests could not be read just now. Nothing has been changed.
        </div>
      ) : !board.enabled ? (
        <div className="notice warn">
          Merging accounts is not switched on for this platform yet. Nothing here
          can be done until the owner turns it on.
        </div>
      ) : (
        <MergePanel
          board={board}
          displayName={(profile?.display_name as string | undefined) ?? ''}
        />
      )}

      <p className="muted" style={{ marginTop: '1.5rem' }}>
        Every merge is recorded in the platform&rsquo;s audit trail with what moved.
        If you want a second account deleted rather than merged,{' '}
        <Link href="/account/delete">close it</Link> from inside that account.
      </p>
    </div>
  );
}
