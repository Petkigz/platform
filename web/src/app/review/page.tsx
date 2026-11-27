import Link from 'next/link';
import type { Metadata } from 'next';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { LOCALE_COOKIE, chooseLocale, formatDateTime, formatDay, formatNumber, languageShownFor, translator } from '@/lib/i18n';
import {
  fetchMyAssignments,
  fetchMyReviewerEntry,
  fetchSubjectOptions,
  type ReviewAssignment,
  type ReviewerRegisterEntry,
  type SubjectAreaOption,
} from '@/lib/review';
import {
  ASSIGNMENT_STATUS_KEY,
  CONFLICT_STATUS_KEY,
  CONFLICT_TYPE_KEY,
  DECISION_MADE_KEY,
  QUALIFICATION_STATUS_KEY,
  QUALIFICATION_TYPE_KEY,
  REGISTER_LIMITS,
  REGISTER_REFUSAL_KEY,
  REVIEWER_STATUS_KEY,
  SCOPE_KEY,
  type RegisterWords,
} from '@/lib/review-register';
import type { MessageKey } from '@/lib/i18n/messages/en';
import { MyRegister } from './my-register';

export const dynamic = 'force-dynamic';

/** The language this page is written in for this reader, and whether that is the one they chose. */
async function readerLanguage() {
  const jar = await cookies();
  const hdrs = await headers();
  const { code: locale } = chooseLocale({
    chosen: jar.get(LOCALE_COOKIE)?.value ?? null,
    acceptLanguage: hdrs.get('accept-language'),
  });
  return { locale, shown: languageShownFor(locale, 'review') };
}

export async function generateMetadata(): Promise<Metadata> {
  const { shown } = await readerLanguage();
  return { title: translator(shown.code)('review.title') };
}

/** Every value of a table of keys, said. */
function said<K extends string>(t: (key: MessageKey) => string, keys: Record<K, MessageKey>): Record<K, string> {
  return Object.fromEntries((Object.keys(keys) as K[]).map((name) => [name, t(keys[name])])) as Record<K, string>;
}

/**
 * The review queue, and above it the reviewer's own place on the register.
 *
 * Assignments are created by platform staff, never self-claimed — `cra_write`
 * is privileged only. So an empty queue means nobody has asked this person for
 * anything, not that the page is broken, and it says so.
 *
 * The register comes first because it is the reason a queue is ever empty: until a
 * person applies, is checked, and is granted the subject, no assignment to them can
 * be made and no approval from them can publish anything. An empty queue with no
 * entry on the register is not a quiet page; it is a person who cannot yet be asked.
 *
 * **In the reader's language** since 2026-11-27 (`messages/review.ts`). The
 * register runs in the browser and is handed its words, with its counts and
 * days already written. A course's title, a qualification's title, a
 * subject's name and what a person wrote about a conflict are shown as
 * written, each in its own direction. A day is the day as stored; a deadline
 * carries its zone, because a server does not know the reader's clock.
 *
 * A queue or a register that could not be read is said to be unread. Until
 * then a failed read threw, or (for the reviewer's own profile) was an empty
 * queue under "nothing has been assigned to you".
 */
export default async function ReviewPage() {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/sign-in?next=/review');

  const { locale, shown } = await readerLanguage();
  const t = translator(shown.code);
  const frame = shown.code !== locale ? { lang: shown.code, dir: shown.dir } : {};
  const n = (value: number) => formatNumber(shown.code, value);

  let read: { assignments: ReviewAssignment[]; entry: ReviewerRegisterEntry | null; subjects: SubjectAreaOption[] } | null = null;
  try {
    const [assignments, entry, subjects] = await Promise.all([
      fetchMyAssignments(supabase, user.id),
      fetchMyReviewerEntry(supabase, user.id),
      fetchSubjectOptions(supabase),
    ]);
    read = { assignments, entry, subjects };
  } catch (error) {
    console.error(`review: the queue or the register could not be read: ${error instanceof Error ? error.message : String(error)}`);
  }

  const [noteBefore, noteAfter] = t('review.panelNote').split('{link}');
  const head = (
    <>
      <p className="eyebrow">{t('review.eyebrow')}</p>
      <h1>{t('review.title')}</h1>
      <p className="lede">{t('review.lede')}</p>
      <p className="muted">
        {noteBefore}<Link href="/panel">{t('review.panelLink')}</Link>{noteAfter}
      </p>
    </>
  );
  const foot = <p className="review-foot"><Link href="/learn">{t('review.back')}</Link></p>;

  if (!read) {
    return (
      <div className="container section review-page" {...frame}>
        {head}
        <div className="notice error" role="alert" data-review-state="unread">{t('review.unread')}</div>
        {foot}
      </div>
    );
  }

  const { assignments, entry, subjects } = read;
  const pending = assignments.filter((a) => a.status === 'offered' || a.status === 'accepted' || a.status === 'in_progress');
  const day = (value: string | null | undefined) => formatDay(shown.code, value) || '—';

  const words: RegisterWords = {
    applyHead: t('review.applyHead'), notOn: t('review.notOn'), applyWhy: t('review.applyWhy'), bioLabel: t('review.bioLabel'),
    apply: t('review.apply'), working: t('review.working'),
    placeHead: t('review.placeHead'), applied: t('review.applied'), checked: t('review.checked'), checkedBy: t('review.checkedBy'),
    notChecked: t('review.notChecked'), notActive: t('review.notActive'),
    qualHead: t('review.qualHead'), qualNone: t('review.qualNone'), untitled: t('review.untitled'), qualRule: t('review.qualRule'),
    qualRecord: t('review.qualRecord'), qualKind: t('review.qualKind'), qualSubject: t('review.qualSubject'), noSubjects: t('review.noSubjects'),
    qualTitle: t('review.qualTitle'), qualTitleHint: t('review.qualTitleHint'), qualBy: t('review.qualBy'), qualByHint: t('review.qualByHint'),
    qualSave: t('review.qualSave'),
    standHead: t('review.standHead'), standNone: t('review.standNone'), assessedBy: t('review.assessedBy'), declare: t('review.declare'),
    declareWhy: t('review.declareWhy'), conflictKind: t('review.conflictKind'), describe: t('review.describe'),
    describeHint: t('review.describeHint'), declareIt: t('review.declareIt'),
    reviewerStatus: said(t, REVIEWER_STATUS_KEY),
    qualificationType: said(t, QUALIFICATION_TYPE_KEY),
    qualificationStatus: said(t, QUALIFICATION_STATUS_KEY),
    conflictType: said(t, CONFLICT_TYPE_KEY),
    conflictStatus: said(t, CONFLICT_STATUS_KEY),
    refusals: said(t, REGISTER_REFUSAL_KEY),
    limits: Object.fromEntries(REGISTER_LIMITS.map((max) => [String(max), n(max)])),
    counts: { qualifications: n(entry?.qualifications.length ?? 0), conflicts: n(entry?.conflicts.length ?? 0) },
    days: { applied: day(entry?.reviewer.createdAt), checked: entry?.reviewer.verifiedAt ? day(entry.reviewer.verifiedAt) : '' },
  };

  return (
    <div className="container section review-page" {...frame}>
      {head}

      <div className="review-register">
        <MyRegister entry={entry} subjects={subjects} words={words} />
      </div>

      {assignments.length === 0 ? (
        <div className="empty" data-review-state="none">{t('review.none')}</div>
      ) : (
        <>
          <div className="stats">
            <div>
              <div className="n">{n(pending.length)}</div>
              <div className="l">{t('review.awaiting')}</div>
            </div>
            <div>
              <div className="n">{n(assignments.length - pending.length)}</div>
              <div className="l">{t('review.closed')}</div>
            </div>
          </div>

          <div className="grid cols-2 review-queue">
            {assignments.map((a) => {
              const decision = a.decisions[0] ? DECISION_MADE_KEY[a.decisions[0].decision] : undefined;
              const due = a.dueAt ? formatDateTime(shown.code, a.dueAt, 'UTC') : '';
              return (
                <div className="card" key={a.id} data-review-assignment={a.status}>
                  <div className="badges">
                    {SCOPE_KEY[a.scope] ? <span className="badge neutral">{t(SCOPE_KEY[a.scope])}</span> : null}
                    {ASSIGNMENT_STATUS_KEY[a.status] ? (
                      <span className={`badge ${a.status === 'offered' ? '' : 'neutral'}`}>{t(ASSIGNMENT_STATUS_KEY[a.status])}</span>
                    ) : null}
                  </div>

                  {/* No slug is no course that could be read: the library's English stand-in is not printed. */}
                  {a.courseSlug === '' ? <h3>{t('review.untitled')}</h3> : <h3 dir="auto">{a.courseTitle}</h3>}

                  {a.assignedAt && formatDay(shown.code, a.assignedAt) ? (
                    <p className="meta">{t('review.assigned', { date: formatDay(shown.code, a.assignedAt) })}</p>
                  ) : null}
                  {due ? <p className="meta">{t('review.due', { date: due })}</p> : null}
                  {decision ? <p className="meta">{t('review.yourDecision', { decision: t(decision) })}</p> : null}

                  <Link href={`/review/${a.id}`} className="btn secondary">
                    {a.status === 'offered' ? t('review.viewOffer') : t('review.open')}
                  </Link>
                </div>
              );
            })}
          </div>
        </>
      )}

      {foot}
    </div>
  );
}
