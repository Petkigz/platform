import Link from 'next/link';
import type { Metadata } from 'next';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { LOCALE_COOKIE, chooseLocale, formatNumber, languageShownFor, translator } from '@/lib/i18n';
import {
  panelOutcomeKey,
  panelSeatKey,
  panelStatusKey,
  panelVoteKey,
  quorumMet,
  type MyPanelWork,
  type PanelVoteWords,
} from '@/lib/panels';
import { PanelVote } from './panel-vote';

export const dynamic = 'force-dynamic';

/** The language this page is written in for this reader, and whether that is the one they chose. */
async function readerLanguage() {
  const jar = await cookies();
  const hdrs = await headers();
  const { code: locale } = chooseLocale({
    chosen: jar.get(LOCALE_COOKIE)?.value ?? null,
    acceptLanguage: hdrs.get('accept-language'),
  });
  return { locale, shown: languageShownFor(locale, 'panel') };
}

export async function generateMetadata(): Promise<Metadata> {
  const { shown } = await readerLanguage();
  return { title: translator(shown.code)('panel.title') };
}

/**
 * The board's own screen.
 *
 * A panel member is not staff: they cannot read another panel's cases, the
 * register, or the direction of anybody else's vote before they have voted
 * themselves. Everything here comes from `my_panel_work()`, which is scoped to
 * the caller's own reviewer profile — and a person who does not sit on a panel
 * gets an explanation rather than an empty page, because "you are not on a
 * panel" is information, and an empty list is not.
 *
 * **In the reader's language** since 2026-11-27 (`messages/panel.ts`): a
 * scholar asked to vote is not always a reader of English. The vote runs in
 * the browser and is handed its words. A panel's name, a course's title and
 * what a panel decided are somebody's own words and are shown as written,
 * each in its own direction. Counts follow a colon, so that no word has to
 * agree with a number.
 *
 * Work that could not be read is said to be unread. Until then a failed read
 * threw, and a member was shown the page that says the site broke.
 */
export default async function PanelPage() {
  if (!isSupabaseConfigured()) redirect('/');
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/panel');

  const { locale, shown } = await readerLanguage();
  const t = translator(shown.code);
  const frame = shown.code !== locale ? { lang: shown.code, dir: shown.dir } : {};
  const n = (value: number) => formatNumber(shown.code, value);

  const { data, error } = await supabase.rpc('my_panel_work');
  if (error) console.error(`panel: the member's work could not be read: ${error.message}`);
  const work = (data ?? null) as MyPanelWork | null;

  const head = (
    <>
      <p className="eyebrow"><Link href="/learn">{t('panel.crumb')}</Link></p>
      <h1>{t('panel.title')}</h1>
    </>
  );
  const foot = (
    <>
      <Link href="/review">{work?.panelMember ? t('panel.reviews') : t('panel.register')}</Link>
      {' · '}
      <Link href="/learn">{t('panel.back')}</Link>
    </>
  );

  if (error) {
    return (
      <div className="container section panel-page" {...frame}>
        {head}
        <div className="notice error" role="alert" data-panel-state="unread">{t('panel.unread')}</div>
        <p><Link href="/learn">{t('panel.back')}</Link></p>
      </div>
    );
  }

  if (!work?.panelMember) {
    return (
      <div className="container section panel-page" {...frame}>
        {head}
        <div className="notice" data-panel-state="not-member">
          <strong>{t('panel.notMemberHead')}</strong> {t('panel.notMember')}
        </div>
        <p className="muted">{t('panel.howIn')}</p>
        <p>{foot}</p>
      </div>
    );
  }

  const quorumLine = (cast: number, quorum: number) =>
    t(quorumMet(cast, quorum) ? 'panel.quorumMet' : 'panel.quorumWaiting', { cast: n(cast), quorum: n(quorum) });

  const words: PanelVoteWords = {
    cannotUndo: t('panel.cannotUndo'),
    yourVote: t('panel.yourVote'),
    choices: { approve: t('panel.approve'), reject: t('panel.reject'), abstain: t('panel.abstain') },
    why: t('panel.why'),
    cast: t('panel.cast'),
    recording: t('panel.recording'),
    refusals: {
      already: t('panel.already'),
      alreadyDecided: t('panel.alreadyDecided'),
      notSitting: t('panel.notSitting'),
      notMember: t('panel.notMemberVote'),
      signedOut: t('panel.signedOut'),
      refused: t('panel.refused'),
      unsure: t('panel.unsure'),
    },
  };

  return (
    <div className="container section panel-page" {...frame}>
      {head}
      <p className="lede">{t('panel.lede')}</p>

      <section>
        <h2>{t('panel.yours')}</h2>
        <ul className="stack panel-list">
          {work.panels.map((panel) => (
            <li key={panel.id} className="card" data-panel={panel.status}>
              <strong dir="auto">{panel.name}</strong>
              <span className="muted panel-facts">
                <span>{t(panelSeatKey(panel.memberRole))}</span>
                <span>{t(panelStatusKey(panel.status))}</span>
                <span>{t('panel.quorum', { count: n(panel.quorum) })}</span>
              </span>
              {panel.status !== 'active' && <p className="muted">{t('panel.notSitting')}</p>}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>{t('panel.waiting')}</h2>
        {work.cases.length === 0 ? (
          <p className="muted">{t('panel.nothing')}</p>
        ) : (
          <ul className="stack panel-list">
            {work.cases.map((row) => (
              <li key={row.id} className="card" data-panel-case={row.myVote ? 'voted' : 'open'}>
                <h3 dir="auto">{row.courseTitle}</h3>
                <p className="muted panel-facts">
                  <span>{t('panel.version', { number: n(row.versionNumber) })}</span>
                  <bdi>{row.panelName}</bdi>
                </p>
                <p className="muted">{quorumLine(row.cast, row.quorum)}</p>

                {row.myVote ? (
                  <>
                    <p><strong>{t('panel.youVoted', { vote: t(panelVoteKey(row.myVote)) })}</strong></p>
                    {row.tally && row.tally.cast > 0 ? (
                      <p className="muted">
                        {t('panel.tally', { approve: n(row.tally.approve), reject: n(row.tally.reject), abstain: n(row.tally.abstain) })}
                      </p>
                    ) : null}
                    <p className="muted">{t('panel.recorded')}</p>
                  </>
                ) : (
                  <PanelVote caseId={row.id} words={words} />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {work.decided.length > 0 && (
        <section>
          <h2>{t('panel.decided')}</h2>
          <ul className="stack panel-list">
            {work.decided.map((row) => {
              const outcome = panelOutcomeKey(row.outcome);
              return (
                <li key={row.id} className="card" data-panel-decided={row.outcome}>
                  <strong dir="auto">{row.courseTitle}</strong>
                  <span className="muted panel-facts">
                    {outcome ? <span>{t(outcome)}</span> : null}
                    <span>{t('panel.youVoted', { vote: t(panelVoteKey(row.myVote)) })}</span>
                  </span>
                  {row.outcomeSummary ? <p className="muted" dir="auto">{row.outcomeSummary}</p> : null}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <p>{foot}</p>
    </div>
  );
}
