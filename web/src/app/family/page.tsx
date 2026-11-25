import Link from 'next/link';
import { cookies, headers } from 'next/headers';
import { ClaimLearner } from '@/components/claim-learner';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { isFlagEnabled } from '@/lib/flags';
import {
  AGE_BANDS,
  fetchChildCourses,
  fetchFamilies,
  fetchFamilyAdults,
  fetchFamilyMembers,
  fetchOwnLearner,
  type Family,
} from '@/lib/family';
import {
  LEAVE_NOTE_KEY,
  adultCardExplanationKey,
  adultCardHeadingKey,
  adultFamilyState,
  joinButtonKey,
} from '@/lib/family-adult';
import { CHILD_NAME_MAX, DECLARATION_AGE, FAMILY_NAME_MAX } from '@/lib/family-outcome';
import { ageBandLabel } from '@/lib/age-band';
import { FamilyAdultCard, type FamilyAdultWords } from './family-adult';
import { fetchEngagement } from '@/lib/engagement';
import { EngagementStrip } from '@/components/engagement-strip';
import { AddChild, type AddChildWords } from './add-child';
import { AgeDeclarationCard } from './age-declaration';
import { fetchDeclaration, type AdultDeclaration } from '@/lib/adult-declaration';
import { CreateFamily } from './create-family';
import { parseChildLoginAge } from '@/lib/child-login-age';
import { ChildLoginCard, type ChildLoginState, type ChildLoginWords } from './child-login-card';
import { PRIVACY_CONTACT } from '@/lib/erase-outcome';
import { SaidList } from './said-list';
import {
  LOCALE_COOKIE,
  chooseLocale,
  countLabel,
  formatDay,
  formatNumber,
  languageShownFor,
  translator,
  type Locale,
  type MessageKey,
  type Translate,
} from '@/lib/i18n';

export const dynamic = 'force-dynamic';

const ROLE_KEYS: Record<string, MessageKey> = {
  owner: 'family.roleOwner',
  guardian: 'family.roleGuardian',
  billing_manager: 'family.roleBilling',
};

// A membership that is not active is said, not printed as the database's word.
const MEMBER_KEYS: Record<string, MessageKey> = {
  active: 'family.member',
  invited: 'family.memberInvited',
  revoked: 'family.memberRevoked',
};

/** A name inside a sentence that is handed over as plain text: isolated, so it keeps its own direction. */
const isolate = (value: string) => `\u2068${value}\u2069`;

/**
 * The family dashboard, in the reader's language.
 *
 * A child here is a `learner_profile`, not a `user` (D2): no login, no email,
 * no password. That is why this page can show a child's progress without the
 * child ever having an account, and why adding one asks for a name and an age
 * band and nothing else.
 *
 * Nothing below filters by the signed-in user. RLS decides what comes back —
 * including the case that used to be a defect: a billing-only family member
 * sees the family and none of its children.
 *
 * **Twenty-seven languages have it** (`messages/family.ts`); a language held
 * for review reads it in English, whole, under `lang="en"` — the same rule as
 * the learner dashboard and the account page. The three forms are drawn in the
 * browser and are handed their words, so the page's sentences are left out of
 * the script every page carries.
 *
 * **A child's own login** (`child-login-card.tsx`) is the fourth form and is
 * handed its words the same way, fifty-one sentences of them, since
 * 2026-11-25. A refusal reaches it as a name and it never prints a sentence
 * the server wrote.
 *
 * **What is still English on a translated page**, each marked as English so it
 * is laid out and read aloud as English: the declaration card (it marks
 * itself; see `age-declaration.tsx` for why it is not simply translated) and
 * the streak strip. Both are behind switches that are off.
 */
export default async function FamilyPage() {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/sign-in?next=/family');

  const jar = await cookies();
  const hdrs = await headers();
  const { code: locale } = chooseLocale({
    chosen: jar.get(LOCALE_COOKIE)?.value ?? null,
    acceptLanguage: hdrs.get('accept-language'),
  });
  const shown = languageShownFor(locale, 'family');
  const t = translator(shown.code);
  const num = (value: number) => formatNumber(shown.code, value);
  const frame = shown.code !== locale ? { lang: shown.code, dir: shown.dir } : {};

  const [families, audienceSections, ownLearner, declaration] = await Promise.all([
    fetchFamilies(supabase),
    isFlagEnabled(supabase, 'learning.audience_sections').catch(() => false),
    // The signed-in adult's own profile, if they have one. Read here rather
    // than per family: it is one row, and every family on the page has to
    // explain the same thing about it.
    fetchOwnLearner(supabase, user.id).catch(() => null),
    // Read once, not once per family: the declaration belongs to the adult, and
    // two families on one account must not be able to disagree about it.
    fetchDeclaration(supabase),
  ]);

  if (families.length === 0) {
    return (
      <div className="container section" {...frame}>
        <p className="eyebrow">{t('nav.family')}</p>
        <h1>{t('family.noneTitle')}</h1>
        <p className="lede">{t('family.noneLede')}</p>
        <CreateFamily
          words={{
            heading: t('family.createHeading'),
            body: t('family.createBody'),
            name: t('family.createName'),
            optional: t('family.optional'),
            placeholder: t('family.createPlaceholder'),
            create: t('family.create'),
            creating: t('family.creating'),
            unreachable: t('auth.offline'),
            nameLong: t('family.createNameLong', { count: num(FAMILY_NAME_MAX) }),
            signedOut: t('family.signedOut'),
            refused: t('family.createRefused'),
            unconfirmed: t('family.createUnconfirmed'),
          }}
        />
        <p className="muted" style={{ marginTop: '1rem' }}>{t('family.noneAlso')}</p>
        <ClaimLearner
          label={t('learn.claim')}
          words={{
            busy: t('learn.claimBusy'),
            done: t('learn.claimDone'),
            ready: t('learn.claimReady'),
            failed: t('learn.claimFailed'),
          }}
        />
        <p style={{ marginTop: '1.5rem' }}>
          <Link href="/learn">{t('account.selfGo')}</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="container section" {...frame}>
      <p className="eyebrow">{t('nav.family')}</p>
      <h1>{t('family.title')}</h1>
      {!audienceSections && <p className="lede">{t('family.sameCatalogue')}</p>}

      {/* A record that becomes theirs: the page where a learner who has turned
          eighteen takes their learning out of this account. It is linked from
          here because the adult holding the record is the one who most often
          has to ask the question. */}
      <p className="muted" style={{ marginTop: '1.25rem' }}>
        {t('family.handoverBody')}{' '}
        <Link href="/handover">{t('family.handoverLink')}</Link>
      </p>

      {families.map((f: Family) => (
        <FamilyBlock
          key={f.id}
          family={f}
          supabase={supabase}
          ownLearner={ownLearner}
          declaration={declaration}
          shown={shown}
          t={t}
        />
      ))}

      <p style={{ marginTop: '1.5rem' }}>
        <Link href="/learn">{t('account.selfGo')}</Link>
      </p>
    </div>
  );
}

/**
 * Split out so each family's members and children load together rather than
 * in one wide query. It also keeps the per-family heading and its own
 * "add a child" form next to each other.
 */
async function FamilyBlock({
  family,
  supabase,
  ownLearner,
  declaration,
  shown,
  t,
}: {
  family: Family;
  declaration: AdultDeclaration;
  // The request-scoped client. Passing it down rather than re-creating keeps
  // every query on the same session.
  supabase: Awaited<ReturnType<typeof createClient>>;
  ownLearner: Awaited<ReturnType<typeof fetchOwnLearner>>;
  /** The language this page is written in for this reader. */
  shown: Locale;
  t: Translate;
}) {
  const num = (value: number) => formatNumber(shown.code, value);
  // What is not translated here, marked so a right-to-left page lays it out,
  // and a screen reader says it, as English.
  const english = shown.code === 'en' ? {} : ({ lang: 'en', dir: 'ltr' } as const);
  const band = (code: string) =>
    ageBandLabel(code, {
      ages: (from, to) => t('family.ages', { from: num(from), to: num(to) }),
      adult: t('family.bandAdult'),
    });

  // A streak is derived from progress that already exists, so a failure to read it is
  // silence rather than an error: the child's card is still worth showing without it.
  // Both switches are checked once, not once per child.
  //
  // The second one is `family.engagement`: streaks can exist for adults and still not be
  // shown for children, and a child's strip is exactly what that switch decides. The
  // function behind this strip refuses the same way, so the page and the record cannot
  // disagree — asking here only keeps us from making a request we know will fail.
  const [streaksOnFlag, childEngagementOn] = await Promise.all([
    isFlagEnabled(supabase, 'learning.streaks').catch(() => false),
    isFlagEnabled(supabase, 'family.engagement').catch(() => false),
  ]);
  // Both, because a child's streak is two decisions rather than one.
  const showChildEngagement = streaksOnFlag && childEngagementOn;

  const [members, childCourses, adults] = await Promise.all([
    fetchFamilyMembers(supabase, family.id).catch(() => []),
    Promise.all(
      family.children.map(async (c) => ({
        child: c,
        courses: await fetchChildCourses(supabase, c.id).catch(() => []),
        engagement: showChildEngagement
          ? await fetchEngagement(supabase, c.id).catch(() => null)
          : null,
        // `child_login_state()` returns nothing when the caller may neither
        // manage this child nor is this child. That is the whole gate: the page
        // does not need to know about the flag, because a refusal is silence.
        login: await (async () => {
          const { data } = await supabase.rpc('child_login_state', { p_learner_id: c.id });
          return (data as ChildLoginState | null) ?? null;
        })().catch(() => null),
        // What the child's age band means for a login, and whether the child
        // has chosen their own password. A failure is null, and then the card
        // draws the form and the database decides.
        loginAge: await (async () => {
          const { data } = await supabase.rpc('child_login_age', { p_learner: c.id });
          return parseChildLoginAge(data);
        })().catch(() => null),
      })),
    ),
    // Who learns here as an adult besides the children. A failure is silence:
    // the family and its children are still worth showing without this card.
    fetchFamilyAdults(supabase, family.id).catch(() => []),
  ]);

  const active = members.filter((m) => m.status === 'active');
  const state = adultFamilyState(ownLearner, family.id);
  const others = adults.filter((a) => !a.isMe);
  const myName = state === 'in-family' ? (ownLearner?.displayName ?? '') : '';

  const adultWords: FamilyAdultWords = {
    heading: t(adultCardHeadingKey(state, myName !== ''), { name: isolate(myName) }),
    why: t(adultCardExplanationKey(state)),
    join: t(joinButtonKey(state)),
    joining: t('family.joining'),
    leave: t('family.leave'),
    leaving: t('family.leaving'),
    leaveNote: t(LEAVE_NOTE_KEY),
    outcomes: {
      moved: t('family.outMoved'),
      created: t('family.outCreated'),
      already: t('family.outAlready'),
    },
    left: t('family.outLeft'),
    unreachable: t('auth.offline'),
    notMember: t('family.notMember'),
    otherFamily: t('family.adultHeadOther'),
    seatHeld: t('family.seatHeld'),
    notHere: t('family.notHere'),
    signedOut: t('family.signedOut'),
    noFamily: t('family.noFamily'),
    refused: t('family.adultRefused'),
    unconfirmed: t('family.adultUnconfirmed'),
  };

  const childWords: AddChildWords = {
    open: t('family.addOpen'),
    name: t('family.childName'),
    placeholder: t('family.childPlaceholder'),
    band: t('family.bandLabel'),
    bands: Object.fromEntries(AGE_BANDS.map((code) => [code, band(code)])),
    note: t('family.childNote'),
    add: t('family.add'),
    adding: t('family.adding'),
    cancel: t('lesson.reportCancel'),
    unreachable: t('auth.offline'),
    nameMissing: t('family.childNameMissing'),
    bandInvalid: t('family.childBandBad'),
    notOwner: t('family.childNotOwner'),
    declaration: t('family.childDeclaration', { age: num(DECLARATION_AGE) }),
    signedOut: t('family.signedOut'),
    noFamily: t('family.noFamily'),
    refused: t('family.childRefused'),
    unconfirmed: t('family.childUnconfirmed'),
  };

  // A child's own login. The address is isolated left to right, so it reads
  // the same inside an Arabic sentence; the child's name, the username and
  // the day are put in by the card, which draws them as markup.
  const email = { email: `\u2066${PRIVACY_CONTACT}\u2069` };
  const loginWords: ChildLoginWords = {
    linked: t('family.loginLinked'),
    usernameIs: t('family.loginUsernameIs'),
    recovered: t('family.loginRecovered'),
    handOver: t('family.loginHandOver'),
    notMailbox: t('family.loginNotMailbox', email),
    done: t('family.loginDone'),
    title: t('family.loginTitle'),
    signsIn: t('family.loginSignsIn'),
    signsInSince: t('family.loginSignsInSince'),
    canReset: t('family.loginCanReset'),
    noReset: t('family.loginNoReset'),
    ownYes: t('family.loginOwnYes'),
    ownNo: t('family.loginOwnNo'),
    setNew: t('family.loginSetNew'),
    newPassword: t('family.loginNewPassword'),
    resetNote: t('family.loginResetNote'),
    checking: t('family.loginChecking'),
    change: t('family.loginChange'),
    resetDone: t('family.loginResetDone'),
    detach: t('family.loginDetach'),
    detachMeans: t('family.loginDetachMeans', email),
    why: t('family.loginWhy'),
    detaching: t('family.loginDetaching'),
    detachYes: t('family.loginDetachYes'),
    keep: t('family.loginKeep'),
    underTwelve: t('family.loginUnderTwelve'),
    notOffered: t('family.loginNotOffered', email),
    give: t('family.loginGive'),
    username: t('family.loginUsername'),
    password: t('auth.password'),
    firstPassword: t('family.loginFirstPassword'),
    confirmTwelve: t('family.loginConfirmTwelve'),
    making: t('family.loginMaking'),
    make: t('family.loginMake'),
    cancel: t('action.cancel'),
    refusals: {
      signed_out: t('family.signedOut'),
      malformed: t('family.loginMalformed'),
      no_child: t('family.loginNoChild'),
      username_missing: t('family.loginUsernameMissing'),
      username_short: t('family.loginUsernameShort'),
      username_long: t('family.loginUsernameLong'),
      username_start: t('family.loginUsernameStart'),
      username_chars: t('family.loginUsernameChars'),
      password_missing: t('family.loginPasswordMissing'),
      password_short: t('family.loginPasswordShort'),
      under_twelve: t('family.loginTooYoung'),
      confirm_twelve: t('family.loginTickFirst'),
      unavailable: t('family.loginUnavailable'),
      reset_unavailable: t('family.loginNoReset'),
      guardian_required: t('family.loginGuardianRequired', email),
      not_your_child: t('family.loginNotYourChild'),
      no_login: t('family.loginNoLogin'),
    },
    unconfirmed: {
      make: t('family.loginUnconfirmedMake', email),
      reset: t('family.loginUnconfirmedReset'),
      detach: t('family.loginUnconfirmedDetach', email),
    },
  };

  const [alsoBefore = '', alsoAfter = ''] = t('family.alsoHere').split('{names}');
  const [adultsBefore = '', adultsAfter = ''] = t('family.adultsLine').split('{list}');
  const [openBefore = '', openAfter = ''] = t('family.openLearning').split('{name}');

  return (
    <div style={{ marginTop: '1.75rem' }}>
      <div className="outline-h">
        <h3><bdi>{family.name ?? t('nav.family')}</bdi></h3>
        <span className="muted" style={{ fontSize: '0.85rem' }}>
          {countLabel(shown.code, active.length, { one: 'family.adultsOne', other: 'family.adultsOther' })}
          {' · '}
          {countLabel(shown.code, family.children.length, {
            one: 'family.childrenOne',
            other: 'family.childrenOther',
          })}
        </span>
      </div>

      <FamilyAdultCard familyId={family.id} state={state} words={adultWords} />

      {others.length > 0 && (
        <p className="muted" style={{ fontSize: '0.85rem', marginTop: '-0.5rem' }}>
          {alsoBefore}
          <SaidList
            code={shown.code}
            items={others.map((a) => <bdi key={a.learnerProfileId}>{a.displayName}</bdi>)}
          />
          {alsoAfter}
        </p>
      )}

      {family.children.length === 0 ? (
        <div className="card">
          <p className="empty" style={{ margin: 0 }}>{t('family.noChildren')}</p>
        </div>
      ) : (
        <div className="grid cols-2">
          {childCourses.map(({ child, courses, engagement, login, loginAge }) => (
            <div className="card" key={child.id}>
              <h3 style={{ marginTop: 0 }}><bdi>{child.displayName}</bdi></h3>
              <div className="badges">
                {child.ageBand && <span className="badge">{band(child.ageBand)}</span>}
                {/* A profile is active or archived, and nothing else. */}
                {child.status !== 'active' && (
                  <span className="badge neutral">{t('family.archived')}</span>
                )}
              </div>

              {engagement && (
                <div style={{ marginTop: '0.6rem', marginBottom: '0.6rem' }} {...english}>
                  <EngagementStrip engagement={engagement} subject={child.displayName} />
                </div>
              )}

              {courses.length === 0 ? (
                <p className="empty" style={{ marginBottom: 0 }}>{t('family.notEnrolled')}</p>
              ) : (
                courses.map((c) => (
                  <div className="course" key={c.enrolmentId}>
                    <div className="title" dir="auto">{c.courseTitle}</div>
                    <div
                      className="progress"
                      style={{ marginTop: '0.5rem' }}
                      role="progressbar"
                      aria-valuenow={Math.round(c.percentComplete)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={t('family.progressLabel', {
                        name: isolate(child.displayName),
                        course: isolate(c.courseTitle),
                      })}
                    >
                      <span
                        style={{
                          width: `${Math.min(100, Math.max(0, c.percentComplete))}%`,
                        }}
                      />
                    </div>
                    <div className="muted" style={{ marginTop: '0.4rem' }}>
                      {t('learn.lessonsDone', {
                        done: num(c.lessonsDone),
                        total: num(c.lessonsTotal),
                        percent: num(Math.round(c.percentComplete)),
                      })}
                    </div>
                  </div>
                ))
              )}

              <p style={{ marginTop: '0.75rem', marginBottom: 0 }}>
                <Link href={`/family/${child.id}`}>
                  {openBefore}
                  <bdi>{child.displayName}</bdi>
                  {openAfter}
                </Link>
                {engagement && (
                  <>
                    {' · '}
                    <Link href={`/progress?learner=${child.id}`}>{t('family.progressBadges')}</Link>
                  </>
                )}
              </p>

              {login && (
                <ChildLoginCard
                  learnerId={child.id}
                  childName={child.displayName}
                  state={login}
                  age={loginAge}
                  words={loginWords}
                  madeOn={formatDay(shown.code, login.createdAt)}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Once per family. A family with no children used to be given these
          twice, one above the other. */}
      <div style={{ marginTop: '0.75rem' }}>
        <AgeDeclarationCard declaration={declaration} />
        <AddChild familyId={family.id} words={childWords} />
      </div>

      {members.length > 0 && (
        <p className="muted" style={{ fontSize: '0.85rem', marginTop: '0.75rem' }}>
          {adultsBefore}
          <SaidList
            code={shown.code}
            items={members.map((m) => {
              const role = ROLE_KEYS[m.membershipType];
              const [before = '', after = ''] = t(MEMBER_KEYS[m.status] ?? 'family.member', {
                role: role ? t(role) : m.membershipType,
              }).split('{name}');
              return (
                <span key={m.id}>
                  {before}
                  <bdi>{m.displayName ?? t('family.unnamed')}</bdi>
                  {after}
                </span>
              );
            })}
          />
          {adultsAfter}
        </p>
      )}
    </div>
  );
}
