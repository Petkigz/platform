import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { isFlagEnabled } from '@/lib/flags';
import { fetchMyCourses } from '@/lib/authoring';
import { myScreeningWords, type MyScreening } from '@/lib/screening';
import { teacherHeadline, type MyTakedown } from '@/lib/takedowns';
import {
  needsSignature,
  parseTeacherTerms,
  termsSentence,
  type TeacherTerms,
} from '@/lib/licence';
import { AcceptPolicy } from '@/app/policies/[slug]/accept-policy';
import { acceptWords } from '@/app/policies/reader';
import {
  LOCALE_COOKIE,
  chooseLocale,
  formatDay,
  formatNumber,
  languageShownFor,
  translator,
} from '@/lib/i18n';
import type { MessageKey } from '@/lib/i18n/messages/en';
import type { NewCourseWords } from '@/lib/course-create';
import { TakedownAnswer } from './takedown-answer';
import { ConductCard } from './conduct-card';
import { IjazahCard } from './ijazah-card';
import { parseAuthorisations } from '@/lib/ijazah';
import { NewCourse } from './new-course';

export const dynamic = 'force-dynamic';

/** The language this page is written in for this reader, and whether that is the one they chose. */
async function readerLanguage() {
  const jar = await cookies();
  const hdrs = await headers();
  const { code: locale } = chooseLocale({
    chosen: jar.get(LOCALE_COOKIE)?.value ?? null,
    acceptLanguage: hdrs.get('accept-language'),
  });
  return { locale, shown: languageShownFor(locale, 'teach') };
}

export async function generateMetadata(): Promise<Metadata> {
  const { shown } = await readerLanguage();
  return { title: translator(shown.code)('teach.eyebrow') };
}

/** What the page calls a course's state. A state it has not heard of is printed as the database wrote it. */
const COURSE_STATE: Record<string, MessageKey> = {
  draft: 'teach.stDraft',
  active: 'teach.stActive',
  retired: 'teach.stRetired',
};

/**
 * The teacher's dashboard: the courses you created.
 *
 * `courses_read` also admits courses you are enrolled in and published ones,
 * so this filters on `created_by` — otherwise "my courses" would quietly
 * include every course you had ever bought.
 *
 * In the reader's language since 2026-11-28 (`teach.`): both renders, the
 * record of the teacher's screening, the links and the form that creates a
 * course. Still English, in one block marked as English: a takedown notice
 * and its answer, the conduct card, the authorisations on record and the
 * agreement about the teacher's work. A course's title and the kind of check
 * are what somebody typed and are printed as typed.
 */
export default async function TeachPage() {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/sign-in?next=/teach');

  const { locale, shown } = await readerLanguage();
  const t = translator(shown.code);
  // The page is English for a reader of a language it is not written in, and
  // says so to a screen reader rather than being read in that language's voice.
  const frame = shown.code !== locale ? { lang: shown.code, dir: shown.dir } : {};
  const english = shown.code === 'en' ? {} : ({ lang: 'en', dir: 'ltr' } as const);

  // Teaching is an appointment (decided 2026-10-22): the database refuses a
  // course insert without the role, and this page says why rather than showing a
  // form that will fail. The owner holds every control and is a teacher besides.
  const [{ data: instructor }, { data: owner }, teacherBoardOn] = await Promise.all([
    supabase.rpc('has_role', { p_user_id: user.id, p_role_code: 'instructor' }),
    supabase.rpc('has_role', { p_user_id: user.id, p_role_code: 'platform_admin' }),
    // The teachers' board, linked from here while it is switched on.
    isFlagEnabled(supabase, 'community.teacher_board').catch(() => false),
  ]);
  if (instructor !== true && owner !== true) {
    return (
      <div className="container section teach-page" {...frame} data-teach="not-appointed">
        <p className="eyebrow">{t('teach.eyebrow')}</p>
        <h1>{t('teach.notYetTitle')}</h1>
        <p className="notice warn">
          <strong>{t('teach.byAppointment')}</strong> {t('teach.byAppointmentBody')}
        </p>
        <p>{t('teach.ask')}</p>
        <p className="teach-actions">
          <Link href="/teach/apply" className="btn">{t('teach.apply')}</Link>{' '}
          <Link href="/learn" className="btn secondary">{t('teach.goLearning')}</Link>
        </p>
      </div>
    );
  }

  const [courses, screeningResult, takedownResult, termsResult, conductVersion, ijazahResult] = await Promise.all([
    fetchMyCourses(supabase, user.id),
    supabase.rpc('my_screening_status'),
    supabase.rpc('my_takedown_notices'),
    supabase.rpc('my_teacher_terms'),
    // The version the acknowledgement would be made against, so the card can name
    // it rather than saying "the policy" and leaving the teacher to guess which.
    supabase
      .from('policy_versions')
      .select('version_number, policy_documents!inner(slug)')
      .eq('policy_documents.slug', 'safeguarding')
      .eq('status', 'in_force')
      .maybeSingle(),
    // Their own authorisations. Read regardless of `learning.ijazah`: that flag
    // gates recording, and a record that already exists does not go quiet
    // because somebody switched the writing off.
    supabase.rpc('my_ijazah_authorisations'),
  ]);
  if (screeningResult.error) throw new Error(screeningResult.error.message);
  if (takedownResult.error) throw new Error(takedownResult.error.message);
  if (termsResult.error) throw new Error(termsResult.error.message);
  const screening = (screeningResult.data ?? { recorded: false }) as unknown as MyScreening;
  const takedown = (takedownResult.data ?? { notices: [], held: 0 }) as unknown as MyTakedown;
  const terms: TeacherTerms = parseTeacherTerms(termsResult.data);
  const ijazahs = parseAuthorisations(ijazahResult.error ? [] : ijazahResult.data);
  const conductVersionNumber =
    typeof conductVersion.data?.version_number === 'number'
      ? conductVersion.data.version_number
      : null;

  const headline = teacherHeadline(takedown);
  const day = (value: string | null | undefined) => formatDay(shown.code, value);
  const record = myScreeningWords(screening, day);
  const newCourseWords: NewCourseWords = {
    title: t('teach.ncTitle'),
    field: t('teach.ncField'),
    example: t('teach.ncExample'),
    create: t('teach.ncCreate'),
    creating: t('teach.ncCreating'),
    eTitle: t('teach.ncETitle'),
    eDuplicate: t('teach.ncEDuplicate'),
    eRefused: t('teach.ncERefused'),
    eUnsure: t('teach.ncEUnsure'),
    eSignedOut: t('teach.ncESignedOut'),
    markEnglish: shown.code !== 'en',
  };
  const stateWord = (status: string) => {
    const key = COURSE_STATE[status];
    return key ? <span className="badge neutral" data-teach-state={status}>{t(key)}</span> : null;
  };
  // A link to another teaching screen and the sentence beside it. The sentence
  // follows a dash, so the catalogue starts it small and ends it without a stop.
  const link = (href: string, label: MessageKey, note: MessageKey) => (
    <p data-teach-link={href}>
      <Link href={href}>{t(label)}</Link> — {t(note)}
    </p>
  );

  return (
    <div className="container section teach-page" {...frame} data-teach="dashboard">
      <p className="eyebrow">{t('teach.eyebrow')}</p>
      <h1>{t('teach.title')}</h1>
      <p className="lede">{t('teach.lede')}</p>

      {headline && (
        <p className="notice warn" style={{ maxWidth: '48rem' }} data-teach-headline={headline.key}>
          <strong>
            {'count' in headline
              ? t(headline.key, { count: formatNumber(shown.code, headline.count) })
              : t(headline.key)}
          </strong>{' '}
          {t('teach.tdBelow')}
        </p>
      )}

      {/* Four things this page does not yet say in the reader's language: the
          notice and its answer, the conduct card, the authorisations and the
          agreement. They are English, and one mark round them says so. */}
      <div {...english} data-teach-english>
        <TakedownAnswer mine={takedown} />

        {/* Both facts the publication gate checks, side by side. It renders nothing
            while the platform is not asking. */}
        <ConductCard
          screening={screening}
          policyHref="/policies/safeguarding"
          policyVersion={conductVersionNumber}
        />

        {/* Nothing at all when nothing is recorded: see the card's own comment. */}
        <IjazahCard authorisations={ijazahs} />

        {/* The agreement itself, where the work is. `teaching.content_licence` may be
            off, and the card says so rather than hiding the terms: a teacher is
            entitled to know what the platform may do with their work whether or not
            anybody is currently refused for not agreeing. */}
        <section className="card" id="teacher-terms" style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ marginTop: 0 }}>The agreement about your work</h2>
          <p style={{ marginBottom: '0.5rem' }}>
            You keep the copyright in everything you write. The licence you give the platform is in
            the <Link href="/policies/teaching">teacher terms</Link>, version{' '}
            {terms.versionNumber ?? '—'}: store your course, show it to learners entitled to it, and
            keep offering it to them. A retired course stays available to learners already enrolled
            in it.
          </p>
          <p style={{ marginBottom: needsSignature(terms) ? '0.75rem' : 0 }}>
            {termsSentence(terms)}
          </p>
          {needsSignature(terms) && (
            // This card is in English, so the button is given English words.
            // The version named in the sentence above is the one agreed to:
            // the route refuses if a newer one has been published since.
            <AcceptPolicy
              slug={terms.slug}
              version={terms.versionNumber as number}
              agreedAt={null}
              locale="en"
              words={acceptWords(translator('en'))}
            />
          )}
        </section>
      </div>

      {link('/teach/promotions', 'teach.lPromotions', 'teach.nPromotions')}

      {/* The teacher is told what is on file about them. Reading it is not asking
          permission: it is the one place a person can check a record that is held
          about them, and a record they cannot see is one they cannot correct. */}
      <div className="card" style={{ marginBottom: '1.5rem' }} data-teach-screening={record.status}>
        <h2 style={{ marginTop: 0 }}>{t('teach.scTitle')}</h2>
        <p style={{ marginBottom: '0.35rem' }}>
          <strong>{t(record.status)}</strong>
        </p>
        <p style={{ marginBottom: 0 }} data-teach-screening-sentence={record.sentence.key}>
          {t(record.sentence.key, record.sentence.values)}
        </p>
        {record.kind && (
          // What a member of staff typed. The staff screens are English, so it
          // is marked as English; its direction is taken from what it says.
          <p style={{ marginBottom: 0 }}>
            {t('teach.scKind')}{' '}
            <span lang={shown.code === 'en' ? undefined : 'en'} dir="auto" data-teach-screening-kind>
              {record.kind}
            </span>
          </p>
        )}
        {record.note && (
          <p className="muted" style={{ marginBottom: 0, fontSize: '0.9rem' }} data-teach-screening-note={record.note}>
            {t(record.note)}
          </p>
        )}
        {record.kept && (
          <p className="muted" style={{ marginBottom: 0, fontSize: '0.9rem' }} data-teach-screening-kept>
            {t(record.kept.key, record.kept.values)}
          </p>
        )}
      </div>

      {courses.length === 0 ? (
        <div className="empty" style={{ marginBottom: '1.5rem' }}>
          {t('teach.empty')}
        </div>
      ) : (
        <div className="grid cols-2">
          {courses.map((c) => (
            <div className="card" key={c.id} data-teach-course>
              {/* A title is in whatever language its teacher wrote it. */}
              <h3 style={{ marginTop: 0 }} dir="auto">{c.title}</h3>
              <div className="badges">
                {stateWord(c.status) ?? (
                  <span className="badge neutral" {...english}>{c.status}</span>
                )}
                {c.hasPublishedVersion && <span className="badge">{t('teach.published')}</span>}
              </div>
              <p className="meta" style={{ marginTop: '0.75rem' }} dir="ltr">
                /{c.slug}
              </p>
              <Link href={`/teach/${c.id}`} className="btn secondary">
                {t('teach.open')}
              </Link>
            </div>
          ))}
        </div>
      )}

      <div className="teach-links">
        {link('/teach/paths', 'teach.lPaths', 'teach.nPaths')}
        {link('/teach/profile', 'teach.lProfile', 'teach.nProfile')}
        {link('/teach/media', 'teach.lMedia', 'teach.nMedia')}
        {teacherBoardOn && link('/discuss/teachers', 'teach.lBoard', 'teach.nBoard')}
        {link('/teach/earnings', 'teach.lEarnings', 'teach.nEarnings')}
        {link('/teach/payouts', 'teach.lPayouts', 'teach.nPayouts')}
      </div>

      <div style={{ marginTop: '1.75rem' }}>
        <div className="outline-h">
          <h3>{t('teach.create')}</h3>
        </div>
        <NewCourse words={newCourseWords} />
      </div>

      <p style={{ marginTop: '1.5rem' }}>
        <Link href="/learn">{t('teach.back')}</Link>
      </p>
    </div>
  );
}
