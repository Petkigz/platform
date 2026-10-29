import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { fetchOwnLearner } from '@/lib/family';
import { parseHifzRecord } from '@/lib/hifz';
import { HifzBoard } from './hifz-board';

export const metadata: Metadata = { title: 'Memorisation' };
export const dynamic = 'force-dynamic';

/**
 * What a learner has memorised, and when to look at it again.
 *
 * `learning.hifz` was registered with "revision schedule and decay model
 * designed" and nothing had been designed. The schedule is a seven-rung ladder
 * driven only by the learner's own solid/shaky verdict — see
 * `supabase/migrations/20261281002900_hifz_tracker.sql` for why it is a ladder
 * and not SM-2, and `DECISIONS.md` for the decision that a self-report is the
 * only input the platform can honestly accept.
 *
 * `?learner=<id>` opens a child's list, the same way `/progress` does. Who may
 * read or write it is decided by `can_access_learner()` inside the database; this
 * page decides only what to say when the answer is no.
 */
export default async function HifzPage({
  searchParams,
}: {
  searchParams: Promise<{ learner?: string }>;
}) {
  if (!isSupabaseConfigured()) redirect('/');

  const { learner: requested } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/hifz');

  const own = await fetchOwnLearner(supabase, user.id).catch(() => null);
  const learnerId = requested && /^[0-9a-f-]{36}$/i.test(requested) ? requested : own?.id ?? null;

  if (!learnerId) {
    return (
      <div className="container section">
        <p className="eyebrow">My learning</p>
        <h1>Memorisation</h1>
        <p className="lede">
          A memorisation list belongs to a learner, and this account is not one yet. Becoming a
          learner takes one button and does not create a second account.
        </p>
        <p>
          <Link className="btn" href="/account">
            Become a learner
          </Link>
        </p>
        <p className="muted" style={{ marginTop: '1rem' }}>
          <Link href="/learn">Back to my learning</Link>
        </p>
      </div>
    );
  }

  const { data, error } = await supabase.rpc('my_hifz', { p_learner: learnerId });

  if (error) {
    const refused = /hifz:not_allowed/.test(error.message);
    return (
      <div className="container section">
        <p className="eyebrow">My learning</p>
        <h1>{refused ? 'Not your list' : 'Memorisation'}</h1>
        <p className="lede">
          {refused
            ? 'That list belongs to somebody else. A memorisation record can be read by the learner themselves and by the adults in their family.'
            : 'The list could not be read just now. Nothing has been lost — this page only displays it.'}
        </p>
        <p>
          <Link href={refused ? '/hifz' : '/learn'}>
            {refused ? 'See my own memorisation' : 'Back to my learning'}
          </Link>
        </p>
      </div>
    );
  }

  const record = parseHifzRecord(data);

  if (!record.enabled) {
    return (
      <div className="container section">
        <p className="eyebrow">My learning</p>
        <h1>Memorisation</h1>
        <div className="notice">
          Memorisation tracking is not switched on for this platform yet. When it is, this page
          will hold the passages you are memorising and the date each one comes back. Nothing you
          have done on the platform changes in the meantime.
        </div>
        <p style={{ marginTop: '1rem' }}>
          <Link href="/learn">Back to my learning</Link>
        </p>
      </div>
    );
  }

  return (
    <HifzBoard
      learnerId={learnerId}
      record={record}
      isSelf={!own || own.id === learnerId}
    />
  );
}
