import Link from 'next/link';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { isFlagEnabled } from '@/lib/flags';
import { translator, type LocaleCode } from '@/lib/i18n';
import { parseQueue, stateIn, type ProposalState } from '@/lib/translations';
import { TranslationConsole } from './translation-console';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Translations' };

/**
 * The correction queue: what people have offered to fix, and the two decisions
 * the owner makes about each submission.
 *
 * **Gated on `platform_admin` alone.** The owner's standing position is that a
 * language is not declared read by a committee — the same position as who is a
 * scholar and who holds an ijazah — so the page that flips that sentence is the
 * owner's and nobody else's. Staff may read the queue through the same function
 * (the database lets them), but the buttons here call functions that refuse
 * everybody but the owner. The redirect is a courtesy; the functions are the
 * defence.
 *
 * **The state of each line is computed here, against the built catalogue.** This
 * is the honest half of a design in which translations live in TypeScript: an
 * acceptance is not an application, so the page reads what the code actually
 * says for that key and passes the verdict down. A correction the file has moved
 * past shows as *stale* rather than sitting there as though nobody had looked.
 */
export default async function AdminTranslationsPage() {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/admin/translations');

  const { data: owner } = await supabase.rpc('has_role', {
    p_user_id: user.id,
    p_role_code: 'platform_admin',
  });
  if (owner !== true) redirect('/');

  const [{ data, error }, open] = await Promise.all([
    supabase.rpc('translation_review_queue'),
    isFlagEnabled(supabase, 'platform.translation_reviews').catch(() => false),
  ]);
  if (error) throw new Error(error.message);

  const reviews = parseQueue(data);

  // What the code says, per correction. `translator` merges English behind the
  // catalogue, which is exactly right here: a key that falls back to English is
  // a key whose translation does not exist, and the proposed text is then the
  // only translation there is — `stale` is the honest word, not `pending`.
  const states: Record<string, ProposalState> = {};
  const live = (locale: string, key: string) =>
    translator(locale as LocaleCode)(key as never);
  for (const review of reviews) {
    for (const proposal of review.proposals) {
      states[proposal.id] = stateIn(proposal, review.locale, live);
    }
  }

  const waiting = reviews.filter((r) => r.status === 'submitted');
  const undecided = reviews.reduce(
    (total, review) => total + review.proposals.filter((p) => p.status === 'proposed').length,
    0,
  );

  return (
    <div className="container section">
      <p className="eyebrow">
        <Link href="/admin">Administration</Link>
      </p>
      <h1>Translations</h1>
      <p className="lede">
        A correction sheet anybody may fill in, and a queue only you decide. Fifty-one
        languages were written by the people who built this platform, and not one of them
        has been read by somebody who speaks it — this is the page where that changes.
      </p>

      <div className="notice" style={{ maxWidth: '56rem' }}>
        <strong>Accepting a correction does not change the site.</strong> The translations
        live in the repository, not in this database, so an accepted line has to reach the
        catalogue file before anything a reader sees is different. Every row below says
        which of those has happened, and the paste block hands you the exact TypeScript.
        A language is only described as read when you publish a <em>whole-catalogue</em>{' '}
        review with every correction decided.
      </div>

      {!open && (
        <div className="notice warn" style={{ maxWidth: '56rem' }}>
          <strong>The correction sheet is closed.</strong> Nothing new can be submitted
          while <code>platform.translation_reviews</code> is off. Anything already in the
          queue can still be decided. Turn it on in{' '}
          <Link href="/admin/settings">settings</Link> when you have time to read what
          arrives.
        </div>
      )}

      <p className="muted">
        {waiting.length} waiting · {undecided} correction{undecided === 1 ? '' : 's'} to
        decide · {reviews.length} in total
      </p>

      <TranslationConsole reviews={reviews} states={states} />
    </div>
  );
}
