import Link from 'next/link';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { LOCALES, translator, type LocaleCode } from '@/lib/i18n';
import { isSupabaseConfigured } from '@/lib/env';
import { isFlagEnabled } from '@/lib/flags';
import { auditAll, auditProposal } from '@/lib/translation-audit';
import {
  coverageOfReviews,
  englishFor,
  parseQueue,
  stateIn,
  type PartCoverage,
  type ProposalState,
  type PublishedReview,
} from '@/lib/translations';
import { AuditPanel } from './audit-panel';
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

  // **How near each language is to being describable as read.** A section review
  // only counts for the part it covered, so the console has to add the published
  // reviews up per language and say what is still missing. Computed here rather
  // than in the browser for the same reason as the per-line verdicts: the section
  // list is the English catalogue, and a client component should not be handed it.
  const publishedByLocale: Record<string, PublishedReview[]> = {};
  for (const review of reviews) {
    if (review.status !== 'published') continue;
    const rows = (publishedByLocale[review.locale] ??= []);
    rows.push({
      locale: review.locale,
      reviewerName: review.reviewerName,
      scope: review.scope,
      section: review.section,
      publishedAt: review.decidedAt ?? review.createdAt,
    });
  }
  const coverage: Record<string, PartCoverage> = {};
  for (const review of reviews) coverage[review.locale] ??= coverageOfReviews([]);
  for (const [code, rows] of Object.entries(publishedByLocale)) {
    coverage[code] = coverageOfReviews(rows);
  }

  // **The shortlist.** Nine thousand six hundred strings is a wall, so nobody
  // looks at any of them; this narrows it to the handful where something is
  // mechanically odd, and says plainly that the rest is a question for a speaker.
  // Computed here rather than in a component so the client bundle never sees the
  // catalogues.
  const names: Record<string, string> = {};
  for (const locale of LOCALES) names[locale.code] = locale.englishName;
  const audit = auditAll(names);

  // What the machine can see in each *proposed* line, too: a correction that
  // pastes the English back is not a correction, and the owner should meet that
  // before accepting it rather than after.
  const flags: Record<string, string[]> = {};
  for (const review of reviews) {
    for (const proposal of review.proposals) {
      const findings = auditProposal({
        locale: review.locale,
        key: proposal.messageKey,
        proposed: proposal.proposedText,
        english: englishFor(proposal.messageKey) ?? '',
      });
      if (findings.length > 0) flags[proposal.id] = findings.map((f) => f.kind);
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
        A language is only described as read when <em>every part</em> of its catalogue has
        a published read — or when one person has published a whole-catalogue read — with
        every correction in each of them decided.
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

      <AuditPanel summaries={audit} />

      <TranslationConsole
        reviews={reviews}
        states={states}
        coverage={coverage}
        flags={flags}
      />
    </div>
  );
}
