import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import {
  LOCALE_COOKIE,
  chooseLocale,
  formatDateTime,
  formatNumber,
  languageShownFor,
  translator,
  type MessageKey,
} from '@/lib/i18n';
import { mergeStateOf, movesOf, parseMergeBoard, type MergeMove, type MergeState } from '@/lib/merge';
import {
  mergeBlocksOf,
  mergeNoteOf,
  type MergeBlock,
  type MergeBlockReason,
  type MergeNote,
} from '@/lib/merge-outcome';
import { MergePanel, type IncomingView, type MergeWords, type OutgoingView } from './merge-panel';

export const dynamic = 'force-dynamic';

/** The language this page is written in for this reader, and whether that is the one they chose. */
async function readerLanguage() {
  const jar = await cookies();
  const hdrs = await headers();
  const { code: locale } = chooseLocale({
    chosen: jar.get(LOCALE_COOKIE)?.value ?? null,
    acceptLanguage: hdrs.get('accept-language'),
  });
  const shown = languageShownFor(locale, 'merge');
  return { locale, shown };
}

export async function generateMetadata(): Promise<Metadata> {
  const { shown } = await readerLanguage();
  return { title: translator(shown.code)('merge.title') };
}

const STATE: Record<MergeState, MessageKey> = {
  pending: 'merge.stPending',
  completed: 'merge.stCompleted',
  declined: 'merge.stDeclined',
  cancelled: 'merge.stCancelled',
  expired: 'merge.stExpired',
};

const BLOCK: Record<MergeBlock, MessageKey> = {
  same: 'merge.blockSame',
  absorbed_closed: 'merge.blockAbsorbedClosed',
  target_closed: 'merge.blockTargetClosed',
  payouts: 'merge.blockPayouts',
  billing: 'merge.blockBilling',
  reviewers: 'merge.blockReviewers',
  households: 'merge.blockHouseholds',
  same_course: 'merge.blockSameCourse',
  owner: 'merge.blockOwner',
  other: 'merge.blockOther',
};

const NOTE: Record<MergeNote, MessageKey> = {
  join: 'merge.noteJoin',
  moves: 'merge.noteMoves',
};

const MOVE: Record<MergeMove, MessageKey> = {
  learnerRelinked: 'merge.mvLearner',
  enrolments: 'merge.mvEnrolments',
  certificates: 'merge.mvCertificates',
  entitlementGrants: 'merge.mvGrants',
  reviews: 'merge.mvReviews',
  assessmentAttempts: 'merge.mvAttempts',
  assignmentSubmissions: 'merge.mvSubmissions',
  cohortMemberships: 'merge.mvCohorts',
  liveAttendances: 'merge.mvAttendance',
  supportCases: 'merge.mvCases',
  notifications: 'merge.mvNotifications',
  roles: 'merge.mvRoles',
  notes: 'merge.mvNotes',
  bookmarks: 'merge.mvBookmarks',
  guardianships: 'merge.mvGuardianships',
};

/**
 * Two accounts, one person, in the reader's language.
 *
 * The rules are the database's: `my_merge_requests()` returns the requests
 * this account has to answer and the ones it has made, each with what would
 * stop it. This page lays them out and refuses to make the decisive step look
 * ordinary: the button stays off until the person types the account's name.
 *
 * **Twenty-seven languages have it** (`messages/merge.ts`); a language held
 * for review reads it in English, whole, under `lang="en"`. Nobody who speaks
 * any of the twenty-seven has read them.
 *
 * **What stops a merge is said here, not forwarded.** `merge_blocks()` gives
 * its reasons as English sentences. Each is read as a name
 * (`lib/merge-outcome.ts`) and said from the catalogue; one nobody recognises
 * is said as "something stops it", never printed.
 *
 * **The other account's name is not shown to the account that asked.** The
 * database returns it, to anybody who typed an address. The account that has
 * to answer does see who is asking, because it has to decide.
 */
export default async function AccountMergePage() {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/account/merge');

  const { locale, shown } = await readerLanguage();
  const t = translator(shown.code);
  const num = (value: number) => formatNumber(shown.code, value);
  const frame = shown.code !== locale ? { lang: shown.code, dir: shown.dir } : {};

  const [{ data: boardData, error }, { data: profile }] = await Promise.all([
    supabase.rpc('my_merge_requests'),
    supabase.from('user_profiles').select('display_name').eq('user_id', user.id).maybeSingle(),
  ]);

  // An error and a reply nobody can read are said the same way: not read.
  const board = error ? null : parseMergeBoard(boardData);

  /** One thing that stops a merge, as a sentence. A course's name is set apart from it. */
  const blockSaid = (reason: MergeBlockReason): string => {
    if (reason.why === 'payouts' || reason.why === 'billing') {
      return reason.count === undefined ? t('merge.blockOther') : t(BLOCK[reason.why], { count: num(reason.count) });
    }
    if (reason.why === 'same_course') {
      return reason.title === undefined
        ? t('merge.blockOther')
        : t('merge.blockSameCourse', { title: `\u2068${reason.title}\u2069` });
    }
    return t(BLOCK[reason.why]);
  };

  const incoming: IncomingView[] = (board?.incoming ?? []).map((request) => {
    const state = mergeStateOf(request);
    // A waiting request with no preview at all is not known to be fine.
    const blocks =
      state !== 'pending' ? [] : request.preview ? mergeBlocksOf(request.preview) : [{ why: 'other' as const }];
    const notes = (request.preview?.notes ?? [])
      .map(mergeNoteOf)
      .filter((note): note is MergeNote => note !== null);
    return {
      id: request.id,
      state,
      stateLabel: t(STATE[state]),
      // Once merged, the other account's name is the database's placeholder
      // ("Merged account", in English, for every reader): not a name to show.
      name: state === 'completed' ? null : request.otherName,
      blocks: [...new Set(blocks.map(blockSaid))],
      notes: [...new Set(notes)].map((note) => t(NOTE[note])),
    };
  });

  const outgoing: OutgoingView[] = (board?.outgoing ?? []).map((request) => {
    const state = mergeStateOf(request);
    const until = state === 'pending' && request.expiresAt ? formatDateTime(shown.code, request.expiresAt, 'UTC') : '';
    return {
      id: request.id,
      state,
      stateLabel: t(STATE[state]),
      until: until === '' ? null : t('merge.waitingUntil', { date: until }),
      moved:
        state === 'completed'
          ? movesOf(request.summary).map((line) => t(MOVE[line.kind], { count: num(line.count) }))
          : [],
    };
  });

  const words: MergeWords = {
    locale: shown.code,
    inHeading: t('merge.inHeading'),
    inLede: t('merge.inLede'),
    noName: t('merge.noName'),
    inMerged: t('merge.inMerged'),
    inExpired: t('merge.inExpired'),
    whatMoves: t('merge.whatMoves'),
    whatGoes: t('merge.whatGoes'),
    confirmLabel: t('merge.confirmLabel'),
    needName: t('merge.needName'),
    accept: t('merge.accept'),
    accepting: t('merge.accepting'),
    decline: t('merge.decline'),
    cannotUndo: t('merge.cannotUndo'),
    outHeading: t('merge.outHeading'),
    outLede: t('merge.outLede'),
    emailLabel: t('merge.emailLabel'),
    emailHelp: t('merge.emailHelp'),
    ask: t('merge.ask'),
    asking: t('merge.asking'),
    listHeading: t('merge.listHeading'),
    listInto: t('merge.listInto'),
    nothingMoved: t('merge.nothingMoved'),
    withdraw: t('merge.withdraw'),
    movedHeading: t('merge.movedHeading'),
    moves: Object.fromEntries(
      (Object.keys(MOVE) as MergeMove[]).map((kind) => [kind, t(MOVE[kind])]),
    ) as Record<MergeMove, string>,
    stayed: t('merge.stayed'),
    done: {
      asked: t('merge.asked'),
      withdrawn: t('merge.withdrawn'),
      merged: t('merge.merged'),
      declined: t('merge.declined'),
    },
    errors: {
      signed_out: t('merge.errSignedOut'),
      email: t('merge.errEmail'),
      no_account: t('merge.errNoAccount'),
      same_account: t('merge.errSameAccount'),
      pending: t('merge.errPending'),
      no_request: t('merge.errNoRequest'),
      not_yours: t('merge.errNotYours'),
      name: t('merge.errName'),
      blocked: t('merge.errBlocked'),
      expired: t('merge.errExpired'),
      answered: t('merge.errAnswered'),
      refused: t('merge.errRefused'),
    },
    off: t('merge.off'),
    unconfirmed: t('merge.unconfirmed'),
  };

  return (
    <div className="container section" {...frame}>
      <p className="eyebrow">
        <Link href="/account">{t('merge.back')}</Link>
      </p>
      <h1>{t('merge.heading')}</h1>
      <p className="lede">{t('merge.lede')}</p>

      {!board ? (
        <div className="notice error" role="alert">
          {t('merge.unread')}
        </div>
      ) : (
        <>
          {!board.enabled && <div className="notice warn">{t('merge.off')}</div>}
          {/* Off: a request made earlier is still listed, and can still be withdrawn. */}
          {(board.enabled || outgoing.length > 0) && (
            <MergePanel
              words={words}
              enabled={board.enabled}
              incoming={incoming}
              outgoing={outgoing}
              displayName={(profile?.display_name as string | null | undefined) ?? ''}
            />
          )}
        </>
      )}

      <p className="muted" style={{ marginTop: '1.5rem' }}>
        {t('merge.foot')} {t('merge.closeInstead')}{' '}
        <Link href="/account/delete">{t('merge.closeLink')}</Link>
      </p>
    </div>
  );
}
