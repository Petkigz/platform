import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { Say } from '@/components/say';
import { TranslateButton } from '@/components/translate-button';
import { translateFor } from '@/lib/translate-reader';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { formatDateTime, translator } from '@/lib/i18n';
import { parseOwnApplication, safeSampleUrl } from '@/lib/teaching';
import { TeachingApplyForm } from './apply-form';
import { READ_FAILED, formWords, readerLanguage, withdrawWords } from './reader';
import { WithdrawApplication } from './withdraw-button';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const { shown } = await readerLanguage();
  return { title: translator(shown.code)('account.teachLink') };
}

/**
 * Applying to teach.
 *
 * Reachable by anybody signed in: this is the one page under `/teach` that a
 * person without the role may open, and that is the point of it. `/teach`
 * itself still turns a learner away, and this page says why in the same
 * breath as it offers the form: the appointment is made by a person, and
 * applying is how you ask for one.
 *
 * The form disappears once somebody holds an application or the role, and
 * what replaces it is the answer rather than a disabled button.
 *
 * **The page is in the reader's language; what people typed is not.** The
 * applicant's own words and the note the owner leaves are shown as written,
 * with `dir="auto"` and an empty `lang` (the language is not known), and the
 * page says in one sentence that the owner reads an application untranslated.
 *
 * **Unread is said, never drawn as "no application".** A reply that is an
 * error, or that does not say whether applications are open and whether this
 * account teaches, is `tapply.unread`, with no form: the database's own text
 * is logged and shown to nobody.
 *
 * **A sentence is drawn only where it is true.** "You can send another" is
 * said to somebody refused or who took theirs back only while applications
 * are open; a closed page says closed and nothing else.
 *
 * **Whether the answer is told is asked, not assumed.** Since the migration
 * `20261281151000_teaching_answer_told.sql` a decision writes the applicant
 * a message, and the reply says `answerTold` when this person has that kind
 * switched on. Only then does the waiting card say a message will come. A
 * database without the migration, or a person who switched the kind off,
 * gets the older sentence: no message, look here again.
 */
export default async function TeachApplyPage() {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  // Not knowing who is reading is treated as nobody: they are sent to sign in.
  const user = await supabase.auth.getUser().then(
    (r) => r.data.user,
    () => null,
  );
  if (!user) redirect('/sign-in?next=/teach/apply');

  const { locale, shown } = await readerLanguage();
  const t = translator(shown.code);
  const frame = shown.code !== locale ? { lang: shown.code, dir: shown.dir } : {};

  const mine = await supabase.rpc('my_teaching_application').then(
    (r) => r,
    () => READ_FAILED,
  );
  const said = mine.data as { open?: unknown; isInstructor?: unknown; answerTold?: unknown } | null;
  // True only when the database says so. Absent is "not told".
  const answerTold = !mine.error && said?.answerTold === true;
  const board =
    !mine.error && said && typeof said.open === 'boolean' && typeof said.isInstructor === 'boolean'
      ? parseOwnApplication(said)
      : null;
  if (!board) {
    console.error(
      'teach/apply: the application could not be read:',
      mine.error?.message ?? 'a reply that does not say whether applications are open',
    );
  }

  const head = (
    <>
      <nav className="crumbs">
        <Link href="/account">{t('learn.account')}</Link>
        <span aria-hidden>›</span>
        <span>{t('account.teachLink')}</span>
      </nav>
      <div className="page-head">
        <h1>{t('account.teachLink')}</h1>
        <p className="tapply-rule">{t('tapply.byAppointment')}</p>
      </div>
    </>
  );
  const ways = (
    <p className="tapply-ways">
      <Link href="/catalogue" className="btn secondary">
        {t('nav.catalogue')}
      </Link>
      <Link href="/learn" className="btn ghost">
        {t('nav.learn')}
      </Link>
    </p>
  );

  if (!board) {
    return (
      <div className="page tapply-page" {...frame}>
        {head}
        <div className="notice error" role="alert" data-tapply-state="unread">
          {t('tapply.unread')}
        </div>
        {ways}
      </div>
    );
  }

  const application = board.application;
  // Staff answer in their own language; the applicant can translate it.
  // Null when translation is off: then no button is drawn.
  const translate = await translateFor(supabase);
  // Typed by a person, in a language this page does not know.
  const written = { dir: 'auto', lang: '' } as const;
  const note = application?.decisionReason ? (
    <>
      <p className="tapply-note-head">{t('tapply.noteLeft')}</p>
      <blockquote className="tapply-written" data-tapply-note {...written}>
        {application.decisionReason}
      </blockquote>
      <TranslateButton text={application.decisionReason} words={translate} />
    </>
  ) : null;

  if (board.isInstructor) {
    const approved = application?.status === 'approved';
    return (
      <div className="page tapply-page" {...frame}>
        {head}
        <div className="notice info" data-tapply-state="teaches">
          {approved && (
            <p>
              <strong>{t('tapply.approved')}</strong>
            </p>
          )}
          {approved && note}
          <p>
            {t('tapply.teachesAlready')} <Link href="/teach">{t('tapply.toCourses')}</Link>
          </p>
        </div>
        {ways}
      </div>
    );
  }

  if (application?.status === 'submitted') {
    const link = safeSampleUrl(application.sampleUrl);
    const sentAt = application.submittedAt ? formatDateTime(locale, application.submittedAt, 'UTC') : '';
    return (
      <div className="page tapply-page" {...frame}>
        {head}
        <section className="card tapply-card" data-tapply-state="waiting">
          <h2>{t('tapply.yours')}</h2>
          <p>
            <span className="badge neutral">{t('tapply.waiting')}</span>
          </p>
          <dl className="tapply-sent">
            <dt>{t('tapply.fieldTeach')}</dt>
            <dd {...written}>{application.headline}</dd>
            <dt>{t('tapply.fieldKnow')}</dt>
            <dd className="tapply-written" {...written}>
              {application.qualifications}
            </dd>
            <dt>{t('tapply.sampleLink')}</dt>
            <dd>
              {link ? (
                <a href={link} rel="noreferrer noopener" target="_blank" dir="ltr">
                  {application.sampleUrl}
                </a>
              ) : (
                <bdi dir="ltr">{application.sampleUrl}</bdi>
              )}
            </dd>
            {application.note && (
              <>
                <dt>{t('tapply.fieldElse')}</dt>
                <dd className="tapply-written" {...written}>
                  {application.note}
                </dd>
              </>
            )}
          </dl>
          <ul className="tapply-facts">
            {sentAt && (
              <li>
                <Say text={t('tapply.sentOn')} parts={{ date: <bdi>{sentAt}</bdi> }} />
              </li>
            )}
            <li>{translate ? t('translate.writeYours') : t('tapply.asWritten')}</li>
            <li data-tapply-answer-told={answerTold ? 'yes' : 'no'}>
              {answerTold ? t('tapply.answerTold') : t('tapply.answerHere')}
            </li>
            <li>{t('tapply.withdrawNote')}</li>
          </ul>
          <WithdrawApplication words={withdrawWords(t)} />
        </section>
        {ways}
      </div>
    );
  }

  return (
    <div className="page tapply-page" {...frame}>
      {head}

      {application?.status === 'declined' && (
        <div className="notice warn" data-tapply-answer="declined">
          <p>
            <strong>{t('tapply.declined')}</strong>
            {board.open && <> {t('tapply.again')}</>}
          </p>
          {note}
        </div>
      )}

      {application?.status === 'withdrawn' && board.open && (
        <div className="notice" data-tapply-answer="withdrawn">
          {t('tapply.withdrawn')}
        </div>
      )}

      {board.open ? (
        <section className="card tapply-card" data-tapply-state="form">
          <h2>{t('tapply.formTitle')}</h2>
          <p className="muted">{translate ? t('translate.writeYours') : t('tapply.asWritten')}</p>
          <TeachingApplyForm words={formWords(t)} />
        </section>
      ) : (
        <div className="notice" data-tapply-state="closed">
          {t('tapply.closed')} <Link href="/support">{t('missing.help')}</Link>
        </div>
      )}

      {ways}
    </div>
  );
}
