import Link from 'next/link';
import type { Metadata } from 'next';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { Say } from '@/components/say';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { LOCALE_COOKIE, chooseLocale, countLabel, formatDay, formatNumber, languageShownFor, translator } from '@/lib/i18n';
import { parseDirectory, DirectoryError } from '@/lib/directory';
import { parseQueue } from '@/lib/teaching';
import { translateFor } from '@/lib/translate-reader';
import { TeachingQueue, type TeachingQueueWords } from './teaching-queue';

export const dynamic = 'force-dynamic';

/** The language this page is written in for this reader, and whether that is the one they chose. */
async function readerLanguage() {
  const jar = await cookies();
  const hdrs = await headers();
  const { code: locale } = chooseLocale({
    chosen: jar.get(LOCALE_COOKIE)?.value ?? null,
    acceptLanguage: hdrs.get('accept-language'),
  });
  return { locale, shown: languageShownFor(locale, 'tq') };
}

export async function generateMetadata(): Promise<Metadata> {
  const { shown } = await readerLanguage();
  return { title: translator(shown.code)('tq.title') };
}

/**
 * Teachers — screen 37, which has never had a page.
 *
 * Teaching is by appointment: `instructor` is granted by the owner or by staff,
 * never by signing up. This is the roster of those appointments, and until now
 * the only record of them was a row in `user_role_assignments` that nobody
 * outside the repository could read.
 *
 * It counts what a teacher has published and how many learners their courses
 * hold. It holds no money: earnings have their own screen, per currency, and a
 * roster with an amount column would invite two currencies into one figure.
 *
 * The learner count is a **number, never a list**. Who is enrolled is the
 * teacher's own cohort screen, behind its own flag; the owner asking "is this
 * course being taken" does not need the names.
 *
 * Owner or governance only — support finding an account is a different question
 * and lives on `/admin/users`. That is also exactly who may appoint: the queue
 * below this roster is the appointment, and `can_appoint_teacher()` is the same
 * test on the database side.
 *
 * The roster and the queue share a screen because they are one question — "who
 * may teach here?" — and an appointment changes both halves of it at once.
 *
 * **Written in the reader's language** (`tq.` in the catalogue), the first
 * staff page that is: the owner asked on 2026-11-24 for the staff pages in
 * all twenty-seven. What an applicant wrote stays as they wrote it, in no
 * known language, with a Translate button under it when translation is on.
 * The database's own sentence for a failed read is logged, not shown.
 */
export default async function AdminTeachersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/admin/teachers');

  const [{ data: platformRole }, { data: governanceRole }] = await Promise.all([
    supabase.rpc('has_role', { p_user_id: user.id, p_role_code: 'platform_admin' }),
    supabase.rpc('has_role', { p_user_id: user.id, p_role_code: 'governance_admin' }),
  ]);
  if (platformRole !== true && governanceRole !== true) redirect('/admin');

  const { locale, shown } = await readerLanguage();
  const t = translator(shown.code);
  const frame = shown.code !== locale ? { lang: shown.code, dir: shown.dir } : {};
  // Typed by a person, in a language this page does not know.
  const written = { dir: 'auto', lang: '' } as const;

  const { q } = await searchParams;
  const query = typeof q === 'string' ? q.trim() : '';

  const [{ data, error }, { data: queueData, error: queueError }] = await Promise.all([
    supabase.rpc('staff_directory', {
      p_kind: 'teachers',
      p_search: query.length > 0 ? query : null,
      p_limit: 100,
    }),
    supabase.rpc('teaching_application_queue'),
  ]);
  if (error) throw new Error(error.message);
  if (queueError) console.error('admin/teachers: the applications could not be read:', queueError.message);

  const queue = queueError ? null : parseQueue(queueData);
  // Null when translation is off: then no button is drawn.
  const translate = queue ? await translateFor(supabase) : null;

  let teachers;
  try {
    const parsed = parseDirectory(data);
    if (parsed.kind !== 'teachers') throw new DirectoryError('the console loaded the wrong list');
    teachers = parsed;
  } catch (e) {
    if (e instanceof DirectoryError) throw new Error(e.message);
    throw e;
  }

  const day = (value: string | null | undefined) => formatDay(locale, value) || '—';
  const summary =
    teachers.total === 0
      ? t('tq.none')
      : teachers.truncated
        ? t('tq.showing', { shown: formatNumber(locale, teachers.shown), total: formatNumber(locale, teachers.total) })
        : countLabel(shown.code, teachers.total, { one: 'tq.countOne', other: 'tq.countOther' });

  const queueWords: TeachingQueueWords = {
    needReason: t('tq.needReason'),
    failed: t('inst.failed'),
    unsent: t('auth.offline'),
    approved: t('tq.approved'),
    declined: t('tq.declined'),
    waiting: t('tq.waiting', { count: formatNumber(locale, queue?.counts.waiting ?? 0) }),
    nobodyWaiting: t('tq.nobodyWaiting'),
    unnamed: t('tq.unnamed'),
    noEmail: t('tq.noEmail'),
    watch: t('tq.watch'),
    noSample: t('tq.noSample'),
    reason: t('tq.reason'),
    reasonHint: t('tq.reasonHint'),
    writeYours: translate ? t('translate.writeYours') : null,
    approveMeans: t('tq.approveMeans'),
    approve: t('tq.approve'),
    decline: t('tq.decline'),
    working: t('auth.working'),
    decidedTitle: t('tq.decidedTitle'),
    noDecisions: t('tq.noDecisions'),
    colApplicant: t('tq.colApplicant'),
    colTeach: t('tq.colTeach'),
    colDecision: t('tq.colDecision'),
    colReason: t('tq.colReason'),
    colWhen: t('tq.colWhen'),
    wasApproved: t('tq.wasApproved'),
    wasDeclined: t('tq.wasDeclined'),
  };
  // Dates are written here, on the server, in the reader's language: the
  // browser would write them in its own.
  const dates: Record<string, string> = {};
  for (const row of queue?.waiting ?? []) dates[row.id] = t('tq.sentOn', { date: day(row.submittedAt) });
  for (const row of queue?.decided ?? []) dates[row.id] = day(row.decidedAt);

  return (
    <div className="page wide" {...frame} data-tq-page>
      <nav className="crumbs">
        <Link href="/admin">{t('tq.admin')}</Link>
        <span aria-hidden>›</span>
        <span>{t('tq.title')}</span>
      </nav>

      <div className="page-head">
        <p className="eyebrow">{t('tq.eyebrow')}</p>
        <h1>{t('tq.title')}</h1>
        <p className="muted">{t('tq.lede')}</p>
      </div>

      <form method="get" className="row" style={{ gap: '0.5rem', marginBottom: '1rem' }}>
        <label className="eyebrow" htmlFor="q" style={{ alignSelf: 'center' }}>
          {t('tq.find')}
        </label>
        <input
          id="q"
          name="q"
          defaultValue={query}
          placeholder={t('tq.findHint')}
          autoComplete="off"
          style={{ flex: '1 1 18rem' }}
        />
        <button type="submit" className="btn secondary">
          {t('catalogue.search')}
        </button>
        {query && (
          <Link className="btn ghost" href="/admin/teachers">
            {t('tq.clear')}
          </Link>
        )}
      </form>

      {queueError && (
        <div className="notice error" role="alert" data-tq-state="unread">
          {t('tq.queueUnread')}
        </div>
      )}

      {queue && (
        <section style={{ marginBottom: '2rem' }}>
          <div className="notice" data-tq-state={queue.open ? 'open' : 'shut'}>
            <strong>{queue.open ? t('tq.open') : t('tq.shut')}</strong>{' '}
            <Say text={t('tq.switch')} parts={{ flag: <code dir="ltr">teaching.applications</code> }} />{' '}
            <Link href="/admin">{t('tq.dashboard')}</Link>
          </div>
          <div style={{ marginTop: '1rem' }}>
            <TeachingQueue queue={queue} words={queueWords} dates={dates} translate={translate} />
          </div>
        </section>
      )}

      <h2>{t('tq.appointed')}</h2>
      <p className="muted" data-tq-summary>{summary}</p>

      <div className="notice">{t('tq.counted')}</div>

      {teachers.rows.length === 0 ? (
        <p className="empty">
          {query ? (
            <Say text={t('tq.noMatch')} parts={{ query: <bdi {...written}>{query}</bdi> }} />
          ) : (
            t('tq.nobody')
          )}
        </p>
      ) : (
        <div className="stack">
          {teachers.rows.map((teacher) => (
            <article className="card" key={teacher.userId} style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
              <div className="row" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ minWidth: 0, flex: '1 1 12rem' }}>
                  <strong>
                    <bdi {...written}>{teacher.name}</bdi>
                  </strong>
                  <p className="meta">
                    {teacher.headline ? <bdi {...written}>{teacher.headline}</bdi> : t('tq.noHeadline')}
                  </p>
                  <p className="meta">
                    {teacher.email ? <bdi dir="ltr">{teacher.email}</bdi> : t('tq.noEmail')}
                  </p>
                  <p className="meta">{t('tq.appointedOn', { date: day(teacher.joinedAt) })}</p>
                </div>
                {/* A sentence in some languages, not a word: it has to be able to break. */}
                <span className="badge neutral" style={{ whiteSpace: 'normal', alignSelf: 'flex-start' }}>
                  {teacher.profileStatus === 'published'
                    ? t('tq.pageLive')
                    : teacher.profileStatus === 'draft'
                      ? t('tq.pageDraft')
                      : t('tq.pageNone')}
                </span>
              </div>

              <dl className="facts" style={{ marginTop: '0.6rem' }}>
                <div>
                  <dt>{t('tq.published')}</dt>
                  <dd>
                    {t('tq.publishedOf', {
                      done: formatNumber(locale, teacher.publishedCourses),
                      all: formatNumber(locale, teacher.courses),
                    })}
                  </dd>
                </div>
                <div>
                  <dt>{t('inst.colLearners')}</dt>
                  <dd>{formatNumber(locale, teacher.learners)}</dd>
                </div>
              </dl>

              {teacher.slug && teacher.profileStatus === 'published' && (
                <p className="meta">
                  <Link href={`/teachers/${teacher.slug}`}>{t('tq.theirPage')}</Link>
                </p>
              )}
            </article>
          ))}
        </div>
      )}

      <p className="muted" style={{ marginTop: '1.5rem' }}>{t('tq.byHand')}</p>
      <p className="board-go">
        <Link className="btn ghost" href="/admin/roles">{t('tq.roles')}</Link>
        <Link className="btn ghost" href="/admin/payouts">{t('tq.payouts')}</Link>
      </p>
    </div>
  );
}
