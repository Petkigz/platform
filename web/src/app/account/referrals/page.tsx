import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { isFlagEnabled } from '@/lib/flags';
import {
  LOCALE_COOKIE,
  chooseLocale,
  formatDateTime,
  formatNumber,
  formatPercent,
  languageShownFor,
  translator,
  type MessageKey,
} from '@/lib/i18n';
import { parseReferralBoard, referralLink } from '@/lib/referrals';
import {
  firstNameOf,
  invitedNameOf,
  percentOf,
  personStateOf,
  rewardStateOf,
  type RewardState,
} from '@/lib/referral-outcome';
import { ReferralsPanel, type CopyWords } from './referrals-panel';

export const dynamic = 'force-dynamic';

/** The language this page is written in for this reader, and whether that is the one they chose. */
async function readerLanguage() {
  const jar = await cookies();
  const hdrs = await headers();
  const { code: locale } = chooseLocale({
    chosen: jar.get(LOCALE_COOKIE)?.value ?? null,
    acceptLanguage: hdrs.get('accept-language'),
  });
  const shown = languageShownFor(locale, 'refer');
  return { locale, shown };
}

export async function generateMetadata(): Promise<Metadata> {
  const { shown } = await readerLanguage();
  return { title: translator(shown.code)('account.inviteHeading') };
}

/**
 * The site address a shared link is built from.
 *
 * `NEXT_PUBLIC_SITE_URL`, never the Host header — the same rule the certificate
 * printer follows, because a link built from whatever host the request arrived
 * on is a link that can point somewhere else. Unset is a supported state: the
 * browser fills the gap from its own address bar (see the panel).
 */
function siteOrigin(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? '';
}

const REWARD: Record<RewardState['status'], MessageKey> = {
  earned: 'refer.rwEarned',
  reversed: 'refer.rwReversed',
  other: 'refer.rwOther',
};

const PERSON: Record<ReturnType<typeof personStateOf>, MessageKey> = {
  pending: 'refer.pnPending',
  bought: 'refer.pnBought',
  refunded: 'refer.pnRefunded',
  other: 'refer.rwOther',
};

/**
 * Inviting a friend, in the reader's language.
 *
 * The code is minted on the first visit, because that is the only moment the
 * person is definitely present to be given one. After that the database returns
 * the same code for ever — a referral code that changed while somebody was
 * halfway through sending it would be worse than no code at all.
 *
 * The flag is checked before the mint: while it is off the RPC refuses, and the
 * page says the programme is closed in a sentence rather than showing an error.
 *
 * **Twenty-seven languages have it** (`messages/refer.ts`); a language held
 * for review reads it in English, whole, under `lang="en"`. Nobody who speaks
 * any of the twenty-seven has read them.
 *
 * **What the friend gets is read off the code, not off today's setting.** A
 * code keeps the worth it was minted with; the board reports the setting as it
 * stands now. `resolve_referral_code()` reports the code's own, so that is
 * what this page and the message it copies say. Where it cannot be read, the
 * page gives the link without a number instead of a number that may be wrong.
 *
 * **Nothing here is money.** Both sides get a discount code, and no sentence
 * says anything is paid.
 *
 * **Every time is said with its zone.** A reward that starts "on the 20th" is
 * a claim about somebody's clock, and this is drawn on a server.
 */
export default async function AccountReferralsPage() {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/sign-in?next=/account/referrals');

  const { locale, shown } = await readerLanguage();
  const t = translator(shown.code);
  const num = (value: number) => formatNumber(shown.code, value);
  const pct = (value: number) => formatPercent(shown.code, value);
  const when = (iso: string | null) => (iso ? formatDateTime(shown.code, iso, 'UTC') : '');
  const frame = shown.code !== locale ? { lang: shown.code, dir: shown.dir } : {};

  const head = (
    <>
      <p className="eyebrow">
        <Link href="/account">{t('merge.back')}</Link>
      </p>
      <h1>{t('account.inviteHeading')}</h1>
    </>
  );

  const enabled = await isFlagEnabled(supabase, 'commerce.referrals').catch(() => false);

  if (!enabled) {
    return (
      <div className="container section" {...frame}>
        {head}
        <div className="notice">{t('refer.off')}</div>
      </div>
    );
  }

  // Mint if this is the first visit, then read the board. A failed mint is not
  // fatal: the read still shows the terms, and the page says the code is
  // missing rather than pretending the person has one.
  await supabase.rpc('my_referral_code');

  const [{ data, error }, { data: profile }] = await Promise.all([
    supabase.rpc('my_referrals'),
    supabase.from('user_profiles').select('display_name').eq('user_id', user.id).maybeSingle(),
  ]);

  const board = error ? null : parseReferralBoard(data);

  if (!board) {
    return (
      <div className="container section" {...frame}>
        {head}
        <p className="lede">{t('refer.lede')}</p>
        <div className="notice error" role="alert">
          {t('refer.unread')}
        </div>
      </div>
    );
  }

  // The switch can be turned off between the two questions above.
  if (!board.enabled) {
    return (
      <div className="container section" {...frame}>
        {head}
        <div className="notice">{t('refer.off')}</div>
      </div>
    );
  }

  // What this code takes off, as the code itself says.
  let friendPercent: number | null = null;
  if (board.code) {
    const { data: own, error: ownError } = await supabase.rpc('resolve_referral_code', { p_code: board.code });
    const row = (own && typeof own === 'object' && !Array.isArray(own) ? own : {}) as {
      found?: unknown;
      percentOff?: unknown;
    };
    if (!ownError && row.found === true) friendPercent = percentOf(row.percentOff);
  }
  const rewardPercent = percentOf(board.rewardPercent);

  const path = referralLink(board.code, '');
  const myName = firstNameOf((profile as { display_name?: string | null } | null)?.display_name);
  const message =
    friendPercent === null
      ? null
      : myName
        ? t('refer.msgNamed', { name: myName, percent: pct(friendPercent) })
        : t('refer.msgPlain', { percent: pct(friendPercent) });

  const copyWords: CopyWords = {
    copyLink: t('refer.copyLink'),
    linkCopied: t('refer.linkCopied'),
    copyMessage: t('refer.copyMessage'),
    messageCopied: t('refer.messageCopied'),
    refused: t('refer.copyRefused'),
  };

  const now = new Date();

  return (
    <div className="container section" {...frame}>
      {head}
      <p className="lede">{t('refer.lede')}</p>

      <div className="stack" style={{ gap: '1rem' }}>
        <section className="card">
          <h2 style={{ marginTop: 0 }}>{t('account.inviteLink')}</h2>

          {board.code && path ? (
            <>
              <p style={{ margin: '0.25rem 0 0' }}>
                <strong dir="ltr" data-referral-code style={{ fontSize: '1.25rem', letterSpacing: '0.04em' }}>
                  {board.code}
                </strong>
              </p>
              {friendPercent !== null && rewardPercent !== null && (
                <p className="meta" style={{ marginTop: '0.5rem' }}>
                  {t('refer.terms', { friend: pct(friendPercent), you: pct(rewardPercent) })}
                </p>
              )}
              <ReferralsPanel origin={siteOrigin()} path={path} message={message} words={copyWords} />
            </>
          ) : (
            <p className="meta" style={{ marginTop: '0.5rem' }}>
              {t('refer.noCode')}
            </p>
          )}
        </section>

        <section className="card">
          <h2 style={{ marginTop: 0 }}>{t('refer.rewardsHeading')}</h2>
          <p className="meta" style={{ margin: 0 }}>
            {t('refer.rewardCount', { count: num(board.rewards.length) })}
          </p>

          {board.rewards.length === 0 ? (
            <p className="empty">{t('refer.noRewards')}</p>
          ) : (
            <ul className="lessons stacked">
              {board.rewards.map((reward, index) => {
                const state = rewardStateOf(reward, now);
                const worth = percentOf(reward.percent);
                const date = when(state.date);
                return (
                  <li key={`${reward.code ?? reward.status}-${reward.earnedAt ?? index}`}>
                    {reward.code && (
                      <strong dir="ltr" style={{ overflowWrap: 'anywhere' }}>
                        {reward.code}
                      </strong>
                    )}
                    {worth !== null && (
                      <p className="meta" style={{ margin: '0.25rem 0 0' }}>
                        {t('refer.rewardWorth', { percent: pct(worth) })}
                      </p>
                    )}
                    <p className="meta" style={{ margin: '0.25rem 0 0' }}>
                      {t(REWARD[state.status])}
                    </p>
                    {state.window !== null && date !== '' && (
                      <p className="meta" style={{ margin: '0.25rem 0 0' }}>
                        {t(state.window === 'from' ? 'refer.rwFrom' : 'refer.rwBy', { date })}
                      </p>
                    )}
                    {state.live && (
                      <p className="meta" style={{ margin: '0.25rem 0 0' }}>
                        {t('refer.rwUse')}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="card">
          <h2 style={{ marginTop: 0 }}>{t('refer.invitedHeading')}</h2>
          <p className="meta" style={{ margin: 0 }}>
            {t('refer.invitedCount', { count: num(board.joined) })}
          </p>

          {board.invited.length === 0 ? (
            <p className="empty">{t('refer.nobodyInvited')}</p>
          ) : (
            <ul className="lessons stacked">
              {board.invited.map((person, index) => {
                const name = invitedNameOf(person);
                return (
                  <li key={`${person.name}-${person.joinedAt ?? index}`}>
                    <strong style={{ overflowWrap: 'anywhere' }}>
                      {name === null ? t('refer.friend') : <bdi>{name}</bdi>}
                    </strong>
                    <p className="meta" style={{ margin: '0.25rem 0 0' }}>
                      {t(PERSON[personStateOf(person)])}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}

          <p className="muted" style={{ marginTop: '0.75rem' }}>
            {t('refer.onlyFirstName')}
          </p>
        </section>

        <section className="card">
          <h2 style={{ marginTop: 0 }}>{t('refer.howHeading')}</h2>
          <ol className="lessons stacked">
            <li>
              <p className="meta" style={{ margin: 0 }}>
                {t('refer.how1')}
              </p>
            </li>
            <li>
              <p className="meta" style={{ margin: 0 }}>
                {t('refer.how2')}
              </p>
            </li>
            <li>
              <p className="meta" style={{ margin: 0 }}>
                {t('refer.how3', { days: num(board.expiryDays) })}
              </p>
            </li>
            <li>
              <p className="meta" style={{ margin: 0 }}>
                {t('refer.how4', { max: num(board.maxPerYear) })}
              </p>
            </li>
          </ol>
          <p className="muted" style={{ marginTop: '0.75rem' }}>
            {t('refer.honesty')}
          </p>
        </section>
      </div>
    </div>
  );
}
