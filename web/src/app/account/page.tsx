import Link from 'next/link';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { isFlagEnabled } from '@/lib/flags';
import { ClaimLearner } from '@/components/claim-learner';
import { ProfileForm } from './profile-form';
import { PhoneForm } from './phone-form';
import { DownloadCopy, type CopyWords } from './export/download-copy';
import type { PolicyStanding } from '@/lib/policies';
import { ACCOUNT_NAME_MAX, ACCOUNT_ZONE_MAX } from '@/lib/account';
import {
  LOCALE_COOKIE,
  chooseLocale,
  countLabel,
  formatNumber,
  languageShownFor,
  translator,
  type MessageKey,
} from '@/lib/i18n';

export const dynamic = 'force-dynamic';

/**
 * The account page, in the reader's language.
 *
 * **Twenty-seven languages have it** (`messages/account.ts`); a language held
 * for review reads it in English, whole, under `lang="en"` — the same rule as
 * the learner dashboard. Nothing here is drawn in the browser except the two
 * forms, and the profile form is handed its words, so the page's sentences are
 * left out of the script every page carries.
 *
 * **What is still English on a translated page**, each marked as English so it
 * is laid out and read aloud as English: the phone card (behind
 * `platform.phone_format`, which is off), and the title of a document waiting
 * for agreement, which is the owner's own text.
 *
 * **How this account signs in is said from the list of methods**, not from the
 * sentence the database writes beside it: that sentence is English.
 */
const STATUS_KEYS: Record<string, MessageKey> = {
  active: 'account.statusActive',
  suspended: 'account.statusSuspended',
  closed: 'account.statusClosed',
};

const CARD = { maxWidth: '42rem', marginTop: '1rem' } as const;

export default async function AccountPage() {
  if (!isSupabaseConfigured()) redirect('/');
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/account');

  const jar = await cookies();
  const hdrs = await headers();
  const { code: locale } = chooseLocale({
    chosen: jar.get(LOCALE_COOKIE)?.value ?? null,
    acceptLanguage: hdrs.get('accept-language'),
  });
  const shown = languageShownFor(locale, 'account');
  const t = translator(shown.code);
  const num = (value: number) => formatNumber(shown.code, value);
  // What the two download buttons say. They are the export page's words: the
  // same twenty-seven languages have both parts.
  const copyWords: CopyWords = {
    preparing: t('export.preparing'),
    done: t('export.done'),
    unreachable: t('auth.offline'),
    reasons: {
      signed_out: t('export.signedOut'),
      limit: t('export.limit'),
      format: t('export.failed'),
      failed: t('export.failed'),
    },
  };
  const mismatch = shown.code !== locale;
  // What is not translated on this page, marked so a right-to-left page lays
  // it out, and a screen reader says it, as English.
  const english = shown.code === 'en' ? {} : ({ lang: 'en', dir: 'ltr' } as const);

  const [referralsOn, sponsorshipOn, { data, error }, { data: learnerRows }, { data: methodsData },
         { data: badgeData }, { data: phoneData }, { data: mergeData },
         applicationsOn, { data: teachesHere }, { data: standingData }] = await Promise.all([
    // Inviting a friend is a link, not a form, so the card is only worth showing
    // when there is something at the other end of it.
    isFlagEnabled(supabase, 'commerce.referrals').catch(() => false),
    // Sponsoring is two-sided: a person may be asking for a seat or paying for
    // one, and the card leads to whichever is theirs.
    isFlagEnabled(supabase, 'commerce.sponsorship').catch(() => false),
    supabase
      .from('user_profiles')
      .select('display_name, preferred_language, timezone, account_status')
      .eq('user_id', user.id)
      .maybeSingle(),
    // Whether this account is a learner of its own. Every learner flow needs one, and
    // until the writer behind the button below existed there was no way to get one.
    supabase
      .from('learner_profiles')
      .select('id, display_name, family_id')
      .eq('linked_user_id', user.id)
      .is('deleted_at', null),
    // How this account actually signs in. A person who arrived through Google
    // has no password, and a password-reset form would be a dead end for them.
    supabase.rpc('my_sign_in_methods'),
    // The unread count, so the centre is discoverable from the one page a person
    // already opens when they want to change something about their account self.
    // A failure here must not take the settings page down with it.
    supabase.rpc('notification_badge'),
    // Whether the platform collects phone numbers at all, and the one it has.
    // A flag that is off means no card: an empty field for a feature nobody
    // switched on is an invitation to type into a dead form.
    supabase.rpc('my_phone'),
    // A merge request waiting on this account is the one thing on this page
    // somebody has to act on, so the count comes with it.
    supabase.rpc('my_merge_requests'),
    // Applying to teach. The card is only shown while the owner has the door
    // open, and it is not shown to somebody who already teaches — an invitation
    // to apply for a role you hold is a screen that has not read its own data.
    isFlagEnabled(supabase, 'teaching.applications').catch(() => false),
    supabase.rpc('has_role', { p_user_id: user.id, p_role_code: 'instructor' }),
    // What this account still owes in agreements. A failure here must not take
    // the settings page down with it, so it is read last and read leniently.
    supabase.rpc('my_policy_standing'),
  ]);
  if (error) throw new Error(error.message);
  if (!data) redirect('/learn');
  const profile = data as unknown as {
    display_name: string;
    preferred_language: string;
    timezone: string | null;
    account_status: string;
  };
  const ownLearner =
    ((learnerRows ?? []) as { id: string; display_name: string; family_id: string | null }[])[0] ?? null;
  const unread = typeof badgeData === 'number' ? badgeData : 0;
  const standing = (standingData ?? null) as PolicyStanding | null;
  const outstanding = Number(standing?.outstanding ?? 0);
  const owed = outstanding > 0 ? (standing?.acceptanceRequired ?? []).filter((r) => !r.acceptedAt) : [];
  const merge = (mergeData ?? null) as { enabled?: boolean; incoming?: unknown[] } | null;
  const mergeWaiting = merge?.enabled === true && Array.isArray(merge.incoming)
    ? merge.incoming.length
    : 0;
  const phone = (phoneData ?? null) as {
    enabled?: boolean;
    phoneE164?: string | null;
    phoneCountry?: string | null;
  } | null;
  const methods = (methodsData ?? null) as {
    providers?: unknown;
    hasPassword?: unknown;
  } | null;
  const providers = Array.isArray(methods?.providers)
    ? methods.providers.filter((p): p is string => typeof p === 'string')
    : [];
  const hasPassword = methods?.hasPassword === true;
  const withGoogle = providers.includes('google');
  // Anything that is not a password, Google or a phone code is named as the
  // provider names it — a word such as "apple" has no translation to give.
  const otherMethods = providers.filter((p) => p !== 'email' && p !== 'google' && p !== 'phone');
  const [otherBefore = '', otherAfter = ''] = t('account.signInOther').split('{methods}');

  // Sentences split around what is put into them, so a name or an address
  // keeps its own direction inside a right-to-left sentence.
  const identity = user.email ?? user.phone ?? null;
  const [signedBefore = '', signedAfter = ''] = t('learn.signedInAs').split('{identity}');
  const [learnsBefore = '', learnsAfter = ''] = t('account.selfLearnsAs').split('{name}');
  const statusKey = STATUS_KEYS[profile.account_status];

  return (
    <div
      className="container section"
      {...(mismatch ? { lang: shown.code, dir: shown.dir } : {})}
    >
      <p className="eyebrow"><Link href="/learn">{t('nav.learn')}</Link></p>
      <h1>{t('learn.account')}</h1>
      <p className="lede">{t('account.lede')}</p>
      <div className="notice" style={{ maxWidth: '42rem', marginBottom: '1rem' }}>
        {identity ? (
          <>
            {signedBefore}
            <strong><bdi dir="ltr">{identity}</bdi></strong>
            {signedAfter}{' '}
          </>
        ) : null}
        {t('account.status', {
          status: statusKey ? t(statusKey) : profile.account_status,
        })}
      </div>
      {outstanding > 0 && (
        <section className="card" style={{ ...CARD, borderColor: 'var(--accent)' }}>
          <h2 style={{ marginTop: 0 }}>{t('account.owedHeading')}</h2>
          <p className="muted">
            {countLabel(shown.code, outstanding, { one: 'account.owedOne', other: 'account.owedOther' })}{' '}
            {t('account.owedBody')}
          </p>
          <ul className="stack" style={{ margin: '0.5rem 0' }}>
            {owed.map((row) => {
              const [before = '', after = ''] = t('account.owedVersion', {
                number: num(row.versionNumber),
              }).split('{title}');
              return (
                <li key={row.slug}>
                  <Link href={`/policies/${row.slug}`}>
                    {before}
                    <bdi {...english}>{row.title}</bdi>
                    {after}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="card" style={CARD}>
        <h2 style={{ marginTop: 0 }}>{t('account.selfHeading')}</h2>
        {ownLearner ? (
          <>
            <p className="muted">
              {learnsBefore}
              <strong><bdi>{ownLearner.display_name}</bdi></strong>
              {learnsAfter}
            </p>
            <p className="muted">
              {t(ownLearner.family_id ? 'account.selfInFamily' : 'account.selfOnOwn')}
            </p>
            <p>
              <Link href="/learn">{t('account.selfGo')}</Link>
              {' · '}
              <Link href="/family">
                {t(ownLearner.family_id ? 'nav.family' : 'account.selfJoinFamily')}
              </Link>
              {' · '}
              <Link href="/account/sharing">{t('account.selfWhoSees')}</Link>
            </p>
          </>
        ) : (
          <>
            <p className="muted">{t('account.selfNone')}</p>
            <p className="muted">
              {t('account.selfFamilyInstead')}{' '}
              <Link href="/family">{t('nav.family')}</Link>
            </p>
            <ClaimLearner
              label={t('learn.claim')}
              note={t('account.selfClaimNote')}
              words={{
                busy: t('learn.claimBusy'),
                done: t('learn.claimDone'),
                ready: t('learn.claimReady'),
                failed: t('learn.claimFailed'),
              }}
            />
          </>
        )}
      </section>

      <ProfileForm
        initial={{
          displayName: profile.display_name,
          preferredLanguage: profile.preferred_language,
          timezone: profile.timezone,
        }}
        maxima={{ name: num(ACCOUNT_NAME_MAX), zone: num(ACCOUNT_ZONE_MAX) }}
        words={{
          name: t('account.formName'),
          language: t('account.formLanguage'),
          languageNote: t('account.formLanguageNote'),
          zone: t('account.formZone'),
          save: t('account.formSave'),
          saving: t('course.saving'),
          saved: t('account.formSaved'),
          unreachable: t('auth.offline'),
          problems: {
            name_missing: t('account.formNameMissing'),
            name_long: t('account.formNameLong'),
            language_code: t('account.formLanguageBad'),
            zone_long: t('account.formZoneLong'),
            zone_invalid: t('account.formZoneBad'),
            signed_out: t('account.formSignedOut'),
            not_found: t('account.formNotFound'),
            malformed: t('account.formFailed'),
            failed: t('account.formFailed'),
          },
        }}
      />
      {phone?.enabled === true && (
        <div {...english}>
          <PhoneForm
            initialPhone={phone.phoneE164 ?? null}
            initialCountry={phone.phoneCountry ?? null}
          />
        </div>
      )}

      <section className="card" style={CARD}>
        <h2 style={{ marginTop: 0 }}>{t('account.signInHeading')}</h2>
        <p className="muted">
          {!methods ? t('account.signInUnread')
            : hasPassword && withGoogle ? t('account.signInBoth')
            : hasPassword ? t('account.signInPassword')
            : withGoogle ? t('account.signInGoogle')
            : otherMethods.length > 0 ? (
              <>
                {otherBefore}
                <bdi dir="ltr">{otherMethods.join(', ')}</bdi>
                {otherAfter}
              </>
            )
            : providers.includes('phone') ? t('account.signInPhone')
            : t('account.signInNone')}
        </p>
        {hasPassword ? (
          <p className="muted">
            {t('account.resetBody')}{' '}
            <Link href="/forgot-password">{t('account.resetLink')}</Link>
          </p>
        ) : withGoogle ? (
          <p className="muted">{t('account.noPasswordGoogle')}</p>
        ) : providers.includes('phone') ? (
          <p className="muted">{t('account.noPasswordPhone')}</p>
        ) : null}
      </section>
      {merge?.enabled === true && (
        <section className="card" style={CARD}>
          <h2 style={{ marginTop: 0 }}>{t('account.mergeHeading')}</h2>
          <p className="muted">
            {t('account.mergeBody')}{' '}
            {t(mergeWaiting > 0 ? 'account.mergeWaiting' : 'account.mergeNone')}
          </p>
          <p>
            <Link href="/account/merge">
              {mergeWaiting > 0
                ? t('account.mergeLinkWaiting', { count: num(mergeWaiting) })
                : t('account.mergeLink')}
            </Link>
          </p>
        </section>
      )}

      {sponsorshipOn && (
        <section className="card" style={CARD}>
          <h2 style={{ marginTop: 0 }}>{t('account.sponsorHeading')}</h2>
          <p className="muted">{t('account.sponsorBody')}</p>
          <p>
            <Link href="/account/sponsorship">{t('account.sponsorMine')}</Link>
            {' · '}
            <Link href="/sponsor">{t('account.sponsorWaiting')}</Link>
          </p>
        </section>
      )}

      {applicationsOn && teachesHere !== true && (
        <section className="card" style={CARD}>
          <h2 style={{ marginTop: 0 }}>{t('account.teachHeading')}</h2>
          <p className="muted">
            {t('account.teachBody')}{' '}
            <Link href="/teach/apply">{t('account.teachLink')}</Link>
          </p>
        </section>
      )}

      {referralsOn && (
        <section className="card" style={CARD}>
          <h2 style={{ marginTop: 0 }}>{t('account.inviteHeading')}</h2>
          <p className="muted">
            {t('account.inviteBody')}{' '}
            <Link href="/account/referrals">{t('account.inviteLink')}</Link>
          </p>
        </section>
      )}

      <section className="card" style={CARD}>
        <h2 style={{ marginTop: 0 }}>{t('account.shareHeading')}</h2>
        <p className="muted">
          {t('account.shareBody')}{' '}
          <Link href="/account/sharing">{t('account.shareLink')}</Link>
        </p>
      </section>

      <section className="card" style={CARD}>
        <h2 style={{ marginTop: 0 }}>{t('account.readHeading')}</h2>
        <p className="muted">{t('account.readBody')}</p>
        <p>
          <Link href="/account/accessibility">{t('account.readLink')}</Link>
          {' · '}
          <Link href="/language">{t('language.title')}</Link>
        </p>
      </section>

      {outstanding === 0 && (
        <section className="card" style={CARD}>
          <h2 style={{ marginTop: 0 }}>{t('footer.terms')}</h2>
          <p className="muted">
            {t('account.termsBody')}{' '}
            {t(standing && standing.history.length > 0 ? 'account.termsAgreed' : 'account.termsNone')}{' '}
            <Link href="/policies">{t('account.termsLink')}</Link>
          </p>
        </section>
      )}

      <section className="card" style={CARD}>
        <h2 style={{ marginTop: 0 }}>{t('account.instHeading')}</h2>
        <p className="muted">
          {t('account.instBody')}{' '}
          <Link href="/institution">{t('account.instLink')}</Link>
        </p>
      </section>

      <section className="card" style={CARD}>
        <h2 style={{ marginTop: 0 }}>{t('account.paidHeading')}</h2>
        <p className="muted">{t('account.paidBody')}</p>
        <p>
          <Link href="/billing">{t('account.paidLink')}</Link>
        </p>
      </section>

      <section className="card" style={CARD}>
        <h2 style={{ marginTop: 0 }}>{t('account.toldHeading')}</h2>
        <p className="muted">
          {t('account.toldBody')}{' '}
          {unread > 0
            ? countLabel(shown.code, unread, { one: 'account.toldUnreadOne', other: 'account.toldUnreadOther' })
            : t('account.toldNone')}{' '}
          {t('account.toldChoice')}
        </p>
        <p>
          <Link href="/notifications">
            {unread > 0
              ? t('account.toldLinkUnread', { count: num(unread) })
              : t('footer.notifications')}
          </Link>
          {' · '}
          <Link href="/notifications#preferences">{t('account.toldPrefs')}</Link>
        </p>
      </section>

      <section className="card" style={CARD}>
        <h2 style={{ marginTop: 0 }}>{t('account.dataHeading')}</h2>
        <p className="muted">{t('account.dataBody')}</p>
        <div className="page-actions" style={{ marginTop: 0 }}>
          <DownloadCopy
            href="/api/account/export"
            fallbackName="ayahspring-my-data.json"
            className="btn secondary"
            label={t('account.dataDownload')}
            words={copyWords}
          />
          <DownloadCopy
            href="/api/account/export?format=csv"
            fallbackName="ayahspring-my-data.csv"
            className="btn secondary"
            label={t('account.dataSheet')}
            words={copyWords}
          />
          {/* Opening that page makes a copy, so it is not fetched ahead of a press. */}
          <Link className="btn secondary" href="/account/export/print" prefetch={false}>
            {t('account.dataPrint')}
          </Link>
        </div>
        <p className="muted" style={{ fontSize: '0.9rem' }}>
          {t('account.dataMore')}{' '}
          <Link href="/account/export">{t('account.dataWhat')}</Link>
        </p>
        <p className="muted" style={{ fontSize: '0.9rem', marginBottom: 0 }}>
          {t('account.dataRestore')}{' '}
          <Link href="/account/restore">{t('account.dataRestoreLink')}</Link>
        </p>
      </section>

      <section className="card" style={CARD}>
        <h2 style={{ marginTop: 0 }}>{t('account.closeHeading')}</h2>
        <p className="muted">
          {t('account.closeBody')}{' '}
          <Link href="/account/delete">{t('account.closeLink')}</Link>
        </p>
      </section>

      <p style={{ marginTop: '1.5rem' }}><Link href="/learn">{t('course.back')}</Link></p>
    </div>
  );
}
