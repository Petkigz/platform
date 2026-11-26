import Link from 'next/link';
import type { Metadata } from 'next';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { consentTone, myGuardianConsents } from '@/lib/guardian-consent';
import { guardianWords } from '@/lib/guardian-words';
import { LOCALE_COOKIE, chooseLocale, languageShownFor, translator } from '@/lib/i18n';
import { ConsentForm } from './consent-form';
import { ConsentActions } from './consent-actions';
import { one, type Embedded } from '@/lib/embed';

export const dynamic = 'force-dynamic';

/** The language this page is written in for this reader, and whether that is the one they chose. */
async function readerLanguage() {
  const jar = await cookies();
  const hdrs = await headers();
  const { code: locale } = chooseLocale({
    chosen: jar.get(LOCALE_COOKIE)?.value ?? null,
    acceptLanguage: hdrs.get('accept-language'),
  });
  return { locale, shown: languageShownFor(locale, 'guard') };
}

export async function generateMetadata(): Promise<Metadata> {
  const { shown } = await readerLanguage();
  return { title: translator(shown.code)('guard.title') };
}

/**
 * Verifiable parental consent, from the parent's side.
 *
 * Before this page could say anything useful: a request was a row at
 * `pending_verification` and the parent had no way to tell whether it had been
 * read. Now a consent is four facts they can see — who asked, how it was
 * established, when it was verified and when it lapses — plus a sentence that
 * tells them what it means today.
 *
 * The page is deliberately usable with the flag off. A parent may ask, and staff
 * may decide, whether or not enforcement is on; the flag only decides whether a
 * lapse bites. Saying that plainly is better than hiding the form and letting
 * people think consent is a switch somebody forgot to flip.
 *
 * **In the reader's language** since 2026-11-25 (`messages/guardians.ts`,
 * put together by `guardian-words.ts`); a language held for review reads the
 * page in English, whole, under `lang="en"`. What a person wrote is shown as
 * they wrote it and set apart with `<bdi>`: a child's name, the reviewer's
 * reason, the reason for a withdrawal. The statement a parent writes is theirs
 * too, in whatever language they write it; nothing here translates it for the
 * reviewer.
 */
export default async function FamilyGuardiansPage() {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/family/guardians');

  const mine = await myGuardianConsents(supabase);

  // Children this person could plausibly ask about: learner profiles in a family
  // they belong to. RLS narrows this to what they may see.
  const { data: memberships } = await supabase
    .from('family_memberships')
    .select('families ( id, name, learner_profiles ( id, display_name, learner_type ) )')
    .eq('user_id', user.id)
    .eq('status', 'active');

  type ChildRow = { id: string; display_name: string; learner_type: string };
  const children: ChildRow[] = ((memberships ?? []) as {
    families: Embedded<{ id: string; learner_profiles: ChildRow[] | null }>;
  }[])
    // A membership has one family (an object); a family has many learners.
    .flatMap((m) => one(m.families)?.learner_profiles ?? [])
    .filter((c) => c.learner_type === 'child');

  const { locale, shown } = await readerLanguage();
  const words = guardianWords(shown.code);
  const { t } = words;
  const frame = shown.code !== locale ? { lang: shown.code, dir: shown.dir } : {};

  const stateFor = new Map(mine.consents.map((c) => [c.learnerProfileId, words.state(c)]));

  const needsAction = mine.consents.filter(
    (c) => c.status !== 'active' && c.status !== 'pending_verification',
  );

  const enforcement = words.enforcementNote(mine.enforced);

  return (
    <div className="page" {...frame}>
      <nav className="crumbs">
        <Link href="/family">{t('nav.family')}</Link>
        <span aria-hidden>›</span>
        <span>{t('guard.title')}</span>
      </nav>

      <div className="page-head">
        <p className="eyebrow">{t('nav.family')}</p>
        <h1>{t('guard.title')}</h1>
        <p className="muted">{t('guard.lede')}</p>
      </div>

      {enforcement && <div className="notice warn">{enforcement}</div>}

      <div className="notice info">{words.policyLine(mine.policyInForce)}</div>

      {mine.consents.length === 0 ? (
        <p className="muted">{t('guard.noneYet')}</p>
      ) : (
        <section className="card">
          <h2>{t('guard.yours')}</h2>
          {/* Stacked: a plain `.lessons` row is a flex row, which set the
              name, the mark and every sentence side by side in columns and
              ran the page off the side of a phone (549 wide at 320). */}
          <ul className="lessons stacked">
            {mine.consents.map((c) => {
              const warning = words.warning(c);
              return (
                <li key={c.relationshipId}>
                  <span className="t">
                    <bdi>{c.learnerName}</bdi>
                    <span className="muted">
                      {' · '}
                      {words.relationship(c.relationshipType)}
                    </span>
                  </span>{' '}
                  <span className={`badge ${consentTone(c) === 'ok' ? 'ok' : 'neutral'}`}>
                    {words.state(c)}
                  </span>
                  {/* One line for each sentence. The method line ("How it is
                      confirmed: a video call") has no full stop of its own, so
                      run together it read "…a video call It lapses on…". */}
                  <p className="muted">
                    {words.sentences(c).map((sentence) => (
                      <span key={sentence} style={{ display: 'block' }}>{sentence}</span>
                    ))}
                  </p>
                  <p className="muted">{words.permissions(c).join(' ')}</p>
                  {warning && <p className="danger">{warning}</p>}
                  {c.policyChanged && <p className="muted">{t('guard.policyChanged')}</p>}
                  {c.lastDecision?.reason && (
                    <p className="muted">
                      {t('guard.reviewerSaid')} <bdi>{c.lastDecision.reason}</bdi>
                    </p>
                  )}
                  {c.revokedReason && (
                    <p className="muted">
                      {t('guard.withdrawalReason')} <bdi>{c.revokedReason}</bdi>
                    </p>
                  )}
                  {(c.status === 'active' || c.status === 'pending_verification') && (
                    <ConsentActions relationshipId={c.relationshipId} words={words.actionWords} />
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="card">
        <h2>{needsAction.length > 0 ? t('guard.askAgain') : t('guard.ask')}</h2>
        {children.length === 0 ? (
          <p className="muted">
            {t('guard.noChild')} <Link href="/family">{t('guard.addChild')}</Link>
          </p>
        ) : (
          <ConsentForm
            options={children.map((c) => ({
              id: c.id,
              name: c.display_name,
              state: stateFor.get(c.id),
            }))}
            words={words.formWords}
          />
        )}
      </section>

      <p className="muted">{t('guard.foot')}</p>
    </div>
  );
}
