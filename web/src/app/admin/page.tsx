import Link from 'next/link';
import type { Metadata } from 'next';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { fetchFlags, flagGroupKey, groupFlags, type FlagToggleWords } from '@/lib/flags';
import type { RevenueShareWords } from '@/lib/revenue-share';
import { LOCALE_COOKIE, chooseLocale, formatNumber, languageShownFor, translator } from '@/lib/i18n';
import { FlagToggle } from './flag-toggle';
import { RevenueShareForm } from './revenue-share-form';
import {
  CONSOLE_LINKS,
  QUEUE_WORDS,
  consoleSections,
  switchboardNotice,
  type ConsoleLink,
  type StaffFacts,
} from '@/lib/admin-console';
import { emptyQueueLede, outstandingSteps, subjectsNote } from '@/lib/setup';
import { fetchSetupFacts } from './setup-query';
import { SetupPanel } from './setup-panel';
import { parseTranslationMonth, translationMonthLines } from '@/lib/translate';
import { translationKey } from '@/lib/translate-server';

export const dynamic = 'force-dynamic';

/** One queue, exactly as `staff_attention()` shapes it. */
type AttentionQueue = {
  code: string;
  label: string;
  count: number;
  href: string;
  detail: string;
  feature: string | null;
  dormant: boolean;
};

/** The language this page is written in for this reader, and whether that is the one they chose. */
async function readerLanguage() {
  const jar = await cookies();
  const hdrs = await headers();
  const { code: locale } = chooseLocale({
    chosen: jar.get(LOCALE_COOKIE)?.value ?? null,
    acceptLanguage: hdrs.get('accept-language'),
  });
  return {
    locale,
    shown: languageShownFor(locale, 'staff'),
    notes: languageShownFor(locale, 'console'),
    board: languageShownFor(locale, 'switch'),
  };
}

export async function generateMetadata(): Promise<Metadata> {
  const { shown } = await readerLanguage();
  return { title: translator(shown.code)('staff.eyebrow') };
}

type Attention = {
  generatedAt: string;
  waitingCount: number;
  queues: AttentionQueue[];
  canSeeFinance: boolean;
  canSeeGovernance: boolean;
  canSeeSupport: boolean;
};

/**
 * The admin flag dashboard.
 *
 * This is the page the standing architecture decision points at: build
 * everything, ship it off, turn it on from here.
 *
 * The register is read from `platform_settings`, which is privileged-only, so
 * a non-privileged visitor is redirected rather than shown an empty page — an
 * empty dashboard and a forbidden one look identical to the person staring at
 * it, and "you are not staff" is the more useful answer.
 *
 * Above the flags sits `staff_attention()`: every queue this person may work,
 * each with the count in it. This page is where `homeFor()` sends every staff
 * member on sign-in, so the first thing they read should be what is waiting
 * rather than a wall of switches. The queues are filtered in the database, not
 * here — a card this screen chose not to render would still have been sent, and
 * the count of refund requests is information a support agent does not get.
 *
 * Below the queues the page is **grouped by whose work it is**, from the same
 * three booleans `staff_attention()` already returns. The switchboard — the flag
 * register and the revenue share — is only rendered for the platform admin,
 * because only the platform admin may write either; the table refuses anybody
 * else, so a control here would be a promise the database would not keep.
 * Everyone else is told whose the switches are, in one sentence, rather than
 * shown ninety toggles that would each fail.
 *
 * Three things the block says out loud:
 *
 *   - A zero is an answer. Every queue the reader may work is listed, empty or
 *     not; an absent card would be indistinguishable from a queue that does not
 *     exist.
 *   - A queue whose feature is switched off is marked `dormant`, not hidden.
 *     Turning a feature off stops new work arriving; it does not empty what is
 *     already there.
 *   - Nothing is counted twice. The total is the sum of the cards, not a
 *     separate query that could disagree with them.
 *
 * **In the reader's language since 2026-11-28.** What is waiting, the queues,
 * what a new platform still needs, the headings and the name of every screen
 * are sentences of the catalogue (`staff.`); so is the sentence beside each
 * link (`console.`), and so is the owner's switchboard (`switch.`): the
 * revenue share and its form, the translation line, the four counts, the
 * retention clock, and the register's groups, badges and refusals.
 *
 * Four things on it are not, and each is marked as English (`lang="en"`)
 * wherever the rest is in another language, because each is something the
 * database wrote: what a flag still needs (its precondition), the name of a
 * group the page has not heard of, the label and detail of a queue the page
 * has not heard of, and the database's own sentence when it refuses a change.
 */
export default async function AdminPage() {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/sign-in?next=/admin');

  const { data: privileged } = await supabase.rpc('is_privileged', { p_user_id: user.id });
  if (privileged !== true) redirect('/');

  const { locale, shown, notes, board } = await readerLanguage();
  const t = translator(shown.code);
  const frame = shown.code !== locale ? { lang: shown.code, dir: shown.dir } : {};
  const n = (value: number) => formatNumber(shown.code, value);
  // What is still said in English, on a page otherwise in another language.
  const english = shown.code === 'en' ? {} : ({ lang: 'en', dir: 'ltr' } as const);
  // The sentence beside a link is a second part of the catalogue (`console.`).
  // It is written in the languages the top of the page is, so the mark is
  // empty; it is there for the day one part is held and the other is not.
  const tn = translator(notes.code);
  const noteMark = notes.code === shown.code ? {} : { lang: notes.code, dir: notes.dir };
  // The owner's switchboard is a third part (`switch.`), on the same rule.
  const tb = translator(board.code);
  const boardMark = board.code === shown.code ? {} : { lang: board.code, dir: board.dir };
  const nb = (value: number) => formatNumber(board.code, value);
  // What the database wrote, inside the switchboard.
  const boardEnglish = board.code === 'en' ? {} : ({ lang: 'en', dir: 'ltr' } as const);
  const linkLine = (link: ConsoleLink) => (
    <p key={link.href} data-staff-link={link.href}>
      <Link href={link.href}>{t(link.label)}</Link> — <span {...noteMark}>{tn(link.note)}</span>
    </p>
  );

  const { data: attentionData, error: attentionError } = await supabase.rpc('staff_attention');
  if (attentionError) throw new Error(attentionError.message);
  const attention = attentionData as unknown as Attention | null;

  // Four kinds of staff share this address. The queues were already filtered in
  // the database; this decides what else they are shown — and, for anyone who is
  // not the owner, whether the switchboard is on the page at all.
  const { data: platformRole } = await supabase.rpc('has_role', {
    p_user_id: user.id,
    p_role_code: 'platform_admin',
  });
  const facts: StaffFacts = {
    platformAdmin: platformRole === true,
    financeAdmin: attention?.canSeeFinance === true,
    governanceAdmin: attention?.canSeeGovernance === true,
    supportAgent: attention?.canSeeSupport === true,
  };
  const sections = consoleSections(facts);

  const queues = attention?.queues ?? [];
  const waiting = attention?.waitingCount ?? 0;
  const busy = queues.filter((q) => q.count > 0);
  const quiet = queues.filter((q) => q.count === 0);
  const dormant = queues.filter((q) => q.dormant);

  // The register is only read for the person who may change it. A support agent
  // reading ninety switches they cannot flip is ninety opportunities to believe
  // this page is broken.
  const flags = sections.switchboard ? await fetchFlags(supabase) : [];
  // What the Translate button has sent this month, for the person who can
  // switch it. A read that failed draws nothing rather than a zero.
  const translationMonth = sections.switchboard
    ? await supabase.rpc('translation_month').then(
        (r) => (r.error ? null : parseTranslationMonth(r.data)),
        () => null,
      )
    : null;
  const translation = translationMonth ? translationMonthLines(translationMonth, translationKey() !== null) : null;
  const groups = groupFlags(flags);
  let revenueSharePercent = 0;
  if (sections.switchboard) {
    const { data: shareSetting, error: shareError } = await supabase
      .from('platform_settings')
      .select('value_text')
      .eq('key', 'teaching.revenue_share_percent')
      .maybeSingle();
    if (shareError) throw new Error(shareError.message);
    revenueSharePercent = Number(shareSetting?.value_text ?? 0);
  }

  // Is there anything here yet? Only the platform admin can create the first
  // reviewer or publish the first course, so only they are shown the list.
  const setupFacts = sections.switchboard ? await fetchSetupFacts(supabase) : null;
  const setupSteps = setupFacts ? outstandingSteps(setupFacts) : [];

  const on = flags.filter((f) => f.enabled).length;
  const deployGated = flags.filter((f) => f.gateType === 'code').length;
  // Only the ones still off: one that is on needs nothing more.
  const setupGated = flags.filter((f) => f.gateType === 'admin_setup' && !f.enabled).length;

  // Every sentence the two forms say, in the language the switchboard is in.
  // They are client components and the catalogue's `switch.` part never goes
  // to the browser, so the page hands the words over.
  const flagWords: FlagToggleWords = {
    gates: {
      'switch.gateRuntime': tb('switch.gateRuntime'),
      'switch.gateSetupFirst': tb('switch.gateSetupFirst'),
      'switch.gateSetupOn': tb('switch.gateSetupOn'),
      'switch.gateDeploy': tb('switch.gateDeploy'),
    },
    on: tb('switch.on'),
    off: tb('switch.off'),
    refusals: {
      notOwner: tb('switch.eNotOwner'),
      deploy: tb('switch.eDeploy'),
      unknown: tb('switch.eUnknown'),
      refused: tb('switch.eRefused'),
      signedOut: tb('switch.eSignedOut'),
      unsure: tb('switch.eUnsure'),
    },
    markEnglish: board.code !== 'en',
  };
  const shareWords: RevenueShareWords = {
    title: tb('switch.rsTitle'),
    badge: tb('switch.rsBadge', { percent: nb(revenueSharePercent) }),
    body: tb('switch.rsBody'),
    zero: tb('switch.rsZero'),
    field: tb('switch.rsField'),
    reason: tb('switch.rsReason'),
    example: tb('switch.rsExample'),
    save: tb('switch.rsSave'),
    saving: tb('switch.rsSaving'),
    saved: tb('switch.rsSaved'),
    refusals: {
      percent: tb('switch.rsEPercent'),
      reason: tb('switch.rsEReason'),
      long: tb('switch.rsELong'),
      notAllowed: tb('switch.rsENotAllowed'),
      signedOut: tb('switch.eSignedOut'),
      refused: tb('switch.rsERefused'),
      unsure: tb('switch.rsEUnsure'),
    },
    markEnglish: board.code !== 'en',
  };

  const emptyLede = setupFacts ? emptyQueueLede(setupFacts) : null;
  const notOwner = switchboardNotice(facts);
  /** A queue's name and sentence: the catalogue's by its code, else the database's own English. */
  const queueWords = (q: AttentionQueue) => {
    const known = Object.hasOwn(QUEUE_WORDS, q.code) ? QUEUE_WORDS[q.code]! : null;
    return known
      ? { label: t(known.label), detail: t(known.detail), mark: {} }
      : { label: q.label, detail: q.detail, mark: english };
  };

  return (
    <div className="container section staff-page" {...frame}>
      <p className="eyebrow">{t('staff.eyebrow')}</p>
      <h1>{t('staff.title')}</h1>
      <p className="lede" data-staff-lede>
        {!attention
          ? t('staff.unread')
          : waiting === 0
          ? emptyLede
            ? t(emptyLede.key, { count: n(emptyLede.vars?.count ?? 0) })
            : t('staff.zero')
          : t('staff.waiting', { count: n(waiting), queues: n(busy.length) })}
      </p>

      <p className="notice warn">
        {t('staff.safeguarding')}{' '}
        <Link href="/admin/coursework">{t('staff.handedIn')}</Link>
      </p>

      {setupFacts && (
        <SetupPanel
          heading={t('staff.setupHead')}
          note={(() => {
            const note = subjectsNote(setupFacts);
            return t(note.key, note.vars ? { count: n(note.vars.count ?? 0) } : undefined);
          })()}
          steps={setupSteps.map((step, i) => ({
            key: step.key,
            number: n(i + 1),
            href: step.href,
            title: t(step.title),
            why: t(step.why),
          }))}
        />
      )}

      {busy.length > 0 ? (
        <div className="grid cols-3" style={{ marginTop: '1.5rem' }}>
          {busy.map((q) => {
            const words = queueWords(q);
            return (
              <Link
                key={q.code}
                href={q.href}
                className="card"
                data-staff-queue={q.code}
                style={{ display: 'block', padding: '1.1rem 1.25rem' }}
              >
                <div style={{ fontSize: '1.8rem', fontWeight: 700, lineHeight: 1.1, color: 'var(--green-800)' }}>
                  {n(q.count)}
                </div>
                <div style={{ fontWeight: 600, marginTop: '0.15rem' }} {...words.mark}>{words.label}</div>
                <p className="muted" style={{ fontSize: '0.85rem', margin: '0.35rem 0 0' }} {...words.mark}>
                  {words.detail}
                </p>
                {q.dormant ? (
                  <p style={{ margin: '0.5rem 0 0' }}>
                    <span className="badge neutral">{t('staff.paused')}</span>{' '}
                    <span className="muted" style={{ fontSize: '0.8rem' }}>
                      {t('staff.pausedWhy')}
                      {q.feature ? <> (<code dir="ltr">{q.feature}</code>)</> : null}
                    </span>
                  </p>
                ) : null}
              </Link>
            );
          })}
        </div>
      ) : null}

      {attention && busy.length === 0 ? <p className="empty">{t('staff.allEmpty')}</p> : null}

      {quiet.length > 0 ? (
        <p className="muted" style={{ fontSize: '0.85rem', marginTop: '1rem' }} data-staff-quiet>
          {t('staff.alsoEmpty')}{' '}
          {quiet.map((q, i) => {
            const words = queueWords(q);
            return (
              <span key={q.code}>
                {i > 0 ? ' · ' : ''}
                <Link href={q.href} {...words.mark}>{words.label}</Link>
              </span>
            );
          })}
        </p>
      ) : null}

      {dormant.length > 0 ? (
        <div className="notice" style={{ marginTop: '1.25rem' }} data-staff-dormant>
          <strong>{t('staff.dormantHead', { count: n(dormant.length) })}</strong>
          <ul style={{ margin: '0.35rem 0' }}>
            {dormant.map((q) => {
              const words = queueWords(q);
              return <li key={q.code} {...words.mark}>{words.label}</li>;
            })}
          </ul>
          {t('staff.dormantBody')}
        </div>
      ) : null}

      {sections.switchboard ? (
        <div {...boardMark} data-staff-switchboard>
          <h2 style={{ marginTop: '2.5rem' }}>{tb('switch.title')}</h2>
          <p className="lede">{tb('switch.lede')}</p>

          <RevenueShareForm currentPercent={revenueSharePercent} shownPercent={nb(revenueSharePercent)} words={shareWords} />

          {translation && translationMonth ? (
            <div className={translation.warn ? 'notice warn' : 'notice'} data-translation-month>
              <strong>{tb('switch.trHead')}</strong> {tb(translation.state)}{' '}
              {tb('switch.trUsed', {
                characters: nb(translationMonth.characters),
                monthly: nb(translationMonth.monthly),
                share: nb(translation.share),
                requests: nb(translationMonth.requests),
                people: nb(translationMonth.people),
                daily: nb(translationMonth.daily),
              })}
            </div>
          ) : null}

          <div className="stats">
            <div>
              <div className="n">{nb(on)}</div>
              <div className="l">{tb('switch.statOn')}</div>
            </div>
            <div>
              <div className="n">{nb(flags.length - on)}</div>
              <div className="l">{tb('switch.statOff')}</div>
            </div>
            <div>
              <div className="n">{nb(setupGated)}</div>
              <div className="l">{tb('switch.statSetup')}</div>
            </div>
            <div>
              <div className="n">{nb(deployGated)}</div>
              <div className="l">{tb('switch.statDeploy')}</div>
            </div>
          </div>

          <p style={{ marginTop: '1.5rem' }} data-switch-retention>
            <Link href="/admin/retention">{tb('switch.retention')}</Link> — {tb('switch.retentionNote')}
          </p>

          <div className="notice" style={{ marginTop: '1.5rem' }} data-switch-deploy-note>
            {tb('switch.deployNote')}
          </div>

          {flags.length === 0 ? (
            <p className="empty">{tb('switch.empty')}</p>
          ) : (
            groups.map((g) => {
              const groupKey = flagGroupKey(g.group);
              return (
                <div key={g.group}>
                  <div className="outline-h">
                    {groupKey ? <h3>{tb(groupKey)}</h3> : <h3 {...boardEnglish}>{g.group}</h3>}
                    <span className="muted" style={{ fontSize: '0.85rem' }}>
                      {tb('switch.groupOn', {
                        on: nb(g.flags.filter((f) => f.enabled).length),
                        total: nb(g.flags.length),
                      })}
                    </span>
                  </div>
                  <div className="card">
                    <ul className="lessons">
                      {g.flags.map((f) => (
                        <FlagToggle
                          key={f.key}
                          flagKey={f.key}
                          enabled={f.enabled}
                          gateType={f.gateType}
                          preconditions={f.preconditions}
                          words={flagWords}
                        />
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className="notice" style={{ marginTop: '2.5rem' }} data-staff-not-owner>
          {notOwner ? t(notOwner) : null}
        </div>
      )}

      {sections.money ? (
        <>
          <h2 style={{ marginTop: '2.5rem' }}>{t('export.inMoney')}</h2>
          <p className="lede">{t('staff.moneyLede')}</p>
          {[...CONSOLE_LINKS.money, ...CONSOLE_LINKS.sponsorship, ...CONSOLE_LINKS.referral].map(linkLine)}
        </>
      ) : null}

      {sections.publication ? (
        <>
          <h2 style={{ marginTop: '2.5rem' }}>{t('staff.publication')}</h2>
          {CONSOLE_LINKS.publication.map(linkLine)}
          <h3 style={{ marginTop: '1.5rem' }}>{t('inst.title')}</h3>
          {CONSOLE_LINKS.institution.map(linkLine)}
        </>
      ) : null}

      {sections.support ? (
        <>
          <h2 style={{ marginTop: '2.5rem' }}>{t('support.eyebrow')}</h2>
          {CONSOLE_LINKS.support.map(linkLine)}
        </>
      ) : null}

      {sections.moderation ? (
        <>
          <h2 style={{ marginTop: '2.5rem' }}>{t('staff.everyone')}</h2>
          <p className="lede">{t('staff.everyoneLede')}</p>
          {CONSOLE_LINKS.shared.map(linkLine)}
        </>
      ) : null}

      <p style={{ marginTop: '1.5rem' }}>
        <Link href="/learn">{t('ask.back')}</Link>
      </p>
    </div>
  );
}
