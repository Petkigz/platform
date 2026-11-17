import Link from 'next/link';
import { cookies, headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import {
  fetchAssessmentContext,
  fetchAttemptResults,
  fetchAttemptStanding,
  fetchQuestions,
  fetchSavedResponses,
  startAttempt,
  type Attempt,
} from '@/lib/assessment';
import { isFlagEnabled } from '@/lib/flags';
import {
  LOCALE_COOKIE,
  chooseLocale,
  countLabel,
  formatNumber,
  formatPercent,
  languageShownFor,
  translator,
  type MessageKey,
} from '@/lib/i18n';
import { Quiz, type QuizWords } from './quiz';
import { startAnotherAttempt } from './actions';

export const dynamic = 'force-dynamic';

/** What kind of assessment this is, as a sentence rather than a column value. */
const TYPE_KEY: Record<string, MessageKey> = {
  practice: 'assess.typePractice',
  graded: 'assess.typeGraded',
  final: 'assess.typeFinal',
};

/**
 * Take an assessment.
 *
 * **The first attempt** is started server-side here rather than on a button
 * press, so a learner who opens the page and closes the tab has still used an
 * attempt — which is what `attempt_limit` is meant to mean.
 *
 * **Every later attempt** is started by the learner, with a button. This page
 * used to start one whenever none was in progress, and the quiz refreshes the
 * page when it is handed in — so handing in attempt 1 opened attempt 2, and
 * coming back to read a teacher's comment opened attempt 3
 * (`fetchAttemptStanding`).
 *
 * **Language.** The page's own words are in the reader's language where that
 * language has them (`assess.ts`) and in English, marked as English, where it
 * does not. The title, the instructions, the questions, the choices and the
 * teacher's comments are the teacher's and are printed as written, with
 * `dir="auto"` so an Arabic question in an English frame still reads from the
 * right.
 */
export default async function AssessmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ enrolmentId: string; assessmentId: string }>;
  searchParams: Promise<{
    start?: string | string[];
    done?: string | string[];
  }>;
}) {
  if (!isSupabaseConfigured()) redirect('/');

  const { enrolmentId, assessmentId } = await params;
  const supabase = await createClient();

  // The same choice the dashboard, the course page and the lesson page make.
  const jar = await cookies();
  const hdrs = await headers();
  const { code: locale } = chooseLocale({
    chosen: jar.get(LOCALE_COOKIE)?.value ?? null,
    acceptLanguage: hdrs.get('accept-language'),
  });
  const shown = languageShownFor(locale, 'assess');
  const t = translator(shown.code);
  const num = (value: number) => formatNumber(shown.code, value);
  const mismatch = shown.code !== locale;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/sign-in?next=/learn/${enrolmentId}`);

  const context = await fetchAssessmentContext(supabase, {
    enrolmentId,
    assessmentId,
  });
  if (!context) notFound();
  const { enrolment, assessment } = context;

  if (!(await isFlagEnabled(supabase, 'learning.assessments').catch(() => false))) {
    redirect(`/learn/${enrolmentId}`);
  }

  const query = await searchParams;
  const standing = await fetchAttemptStanding(supabase, {
    learnerProfileId: enrolment.learnerProfileId,
    enrolmentId: enrolment.id,
    assessmentId: assessment.id,
  });

  // Read before an attempt is opened: an assessment its teacher has not put
  // a question in yet is not something to open an attempt on.
  const questions = await fetchQuestions(supabase, assessment.id);

  // One of: an attempt to sit, a reason there is none, or a button.
  let attempt: Attempt | null = standing?.open ?? null;
  let refusal: 'limit' | 'failed' | null = null;
  if (!standing) {
    refusal = 'failed';
  } else if (!attempt) {
    if (assessment.attemptLimit !== null && standing.used >= assessment.attemptLimit) {
      refusal = 'limit';
    } else if (questions.length === 0) {
      // Nothing to sit. The page says so below and opens nothing.
    } else if (standing.used === 0) {
      const started = await startAttempt(supabase, {
        learnerProfileId: enrolment.learnerProfileId,
        enrolmentId: enrolment.id,
        assessmentId: assessment.id,
      });
      if (started.ok) attempt = started.attempt;
      else refusal = started.code === 'attempt_limit_reached' ? 'limit' : 'failed';
    } else if (query.start === 'failed') {
      // The button was pressed and the attempt could not be opened.
      refusal = 'failed';
    }
  }
  // Attempts behind them, none open: the next one is theirs to start.
  const mayStartAnother =
    standing !== null && attempt === null && refusal !== 'limit' && standing.used > 0 && questions.length > 0;
  const justSubmitted = query.done === '1' && attempt === null && standing !== null && standing.used > 0;

  // What this learner had already answered on the attempt that is open. The
  // quiz starts from it, so a reload shows the answers the page says it saved.
  const savedAnswers = attempt ? await fetchSavedResponses(supabase, attempt.id) : {};

  // Marked attempts and what the teacher said. Fetched whether or not a new
  // attempt could be started: running out of attempts is exactly when a learner
  // most needs to see the comment on the one they used.
  const results = await fetchAttemptResults(supabase, {
    enrolmentId: enrolment.id,
    assessmentId: assessment.id,
  });

  const score = (earned: number, possible: number) =>
    t('assess.score', { earned: num(earned), possible: num(possible) });
  const verdict = (passed: boolean | null) =>
    passed === null ? null : t(passed ? 'assess.passed' : 'assess.notPassed');

  // The quiz runs in the browser and is handed its sentences, already in one
  // language. The two with a number in them go as templates; it fills them
  // with digits written for the same language.
  const quizWords: QuizWords = {
    untitledQuestion: t('assess.untitledQuestion'),
    yourAnswer: t('assess.yourAnswer'),
    saved: t('assess.saved'),
    yes: t('assess.true'),
    no: t('assess.false'),
    answered: t('assess.answered'),
    submit: t('assess.submit'),
    submitting: t('assess.submitting'),
    submitted: t('assess.submitted'),
    submittedManual: t('assess.submittedManual'),
    score: t('assess.score'),
    passed: t('assess.passed'),
    notPassed: t('assess.notPassed'),
    saveFailed: t('assess.saveFailed'),
    submitFailed: t('assess.submitFailed'),
    alreadySubmitted: t('assess.alreadySubmitted'),
    unanswered: t('assess.unanswered'),
  };
  const pointsLabels = Object.fromEntries(
    questions.map((q) => [
      q.id,
      countLabel(shown.code, Number(q.points), {
        one: 'assess.pointsOne',
        other: 'assess.pointsOther',
      }),
    ]),
  );

  const typeKey = TYPE_KEY[assessment.type];

  return (
    <div
      className="container section"
      lang={mismatch ? shown.code : undefined}
      dir={mismatch ? shown.dir : undefined}
    >
      <p className="eyebrow">
        <Link href={`/learn/${enrolment.id}`}>
          <bdi>{enrolment.courseTitle ?? t('course.fallbackTitle')}</bdi>
        </Link>
        {' · '}
        {t('assess.label')}
      </p>
      <h1 dir="auto">{assessment.title}</h1>

      <div className="badges" style={{ marginBottom: '1rem' }}>
        {typeKey && <span className="badge">{t(typeKey)}</span>}
        {assessment.passThreshold !== null && (
          <span className="badge neutral">
            {t('assess.passAt', {
              percent: formatPercent(shown.code, assessment.passThreshold),
            })}
          </span>
        )}
        {assessment.attemptLimit !== null && (
          <span className="badge neutral">
            {countLabel(shown.code, assessment.attemptLimit, {
              one: 'assess.attemptsOne',
              other: 'assess.attemptsOther',
            })}
          </span>
        )}
      </div>

      {assessment.instructions && (
        <p className="lede" dir="auto">
          {assessment.instructions}
        </p>
      )}

      {justSubmitted && (
        <div className="notice" role="status">
          {t('assess.submitted')}
        </div>
      )}

      {refusal && (
        <div className="notice error" role="alert">
          {t(refusal === 'limit' ? 'assess.limitReached' : 'assess.cannotStart')}
        </div>
      )}

      {questions.length === 0 && refusal === null && <p className="empty">{t('assess.noQuestions')}</p>}

      {attempt && questions.length > 0 && (
        <>
          <p className="muted" style={{ fontSize: '0.9rem' }}>
            {t('assess.attemptN', { number: num(attempt.attempt_number) })}
            {' · '}
            {t('assess.savesAsYouGo')}
          </p>
          {/* Keyed by attempt: a new attempt is a new, empty quiz, never
                the last one's answers under a different id. */}
          <Quiz
            key={attempt.id}
            attemptId={attempt.id}
            questions={questions}
            initialAnswers={savedAnswers}
            locale={shown.code}
            words={quizWords}
            pointsLabels={pointsLabels}
          />
        </>
      )}

      {standing !== null && standing.awaiting.length > 0 && (
        <ul className="muted" style={{ margin: '1rem 0 0', paddingInlineStart: '1.2rem' }}>
          {standing.awaiting.map((number) => (
            <li key={number}>
              {t('assess.attemptN', { number: num(number) })}
              {' · '}
              {t('assess.awaitingMarking')}
            </li>
          ))}
        </ul>
      )}

      {mayStartAnother && (
        <form
          action={startAnotherAttempt.bind(null, enrolment.id, assessment.id)}
          style={{ marginTop: '1rem' }}
        >
          <button type="submit" className="btn">
            {t('assess.startAnother')}
          </button>
          {assessment.attemptLimit !== null && (
            <p className="muted" style={{ fontSize: '0.9rem', margin: '0.5rem 0 0' }}>
              {t('assess.startUsesAttempt')}
            </p>
          )}
        </form>
      )}

      {results.length > 0 && (
        <section aria-labelledby="marked-attempts" style={{ marginTop: '1.5rem' }}>
          <h2 id="marked-attempts">{t('assess.markedAttempts')}</h2>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {results.map((r) => {
              const heading = [
                t('assess.attemptN', { number: num(r.attemptNumber) }),
                r.scorePossible !== null && r.scoreEarned !== null
                  ? score(r.scoreEarned, r.scorePossible)
                  : null,
                verdict(r.passed),
              ].filter((part): part is string => part !== null);

              return (
                <div className="card" key={r.attemptNumber}>
                  <p className="eyebrow" style={{ marginBottom: '0.4rem' }}>
                    {heading.join(' · ')}
                  </p>

                  {r.comments.length === 0 ? (
                    <p className="muted" style={{ margin: 0 }}>
                      {t('assess.markedNoComment')}
                    </p>
                  ) : (
                    r.comments.map((c, i) => (
                      <blockquote key={`${r.attemptNumber}-${i}`} style={{ margin: '0.5rem 0 0' }}>
                        <p className="muted" style={{ margin: 0, fontSize: '.9rem' }} dir="auto">
                          {c.prompt}
                        </p>
                        <p
                          style={{
                            margin: '.25rem 0 0',
                            whiteSpace: 'pre-wrap',
                          }}
                          dir="auto"
                        >
                          {c.feedback}
                        </p>
                        {c.score !== null && c.points !== null && (
                          <p className="muted" style={{ margin: '.25rem 0 0', fontSize: '.85rem' }}>
                            {score(c.score, c.points)}
                          </p>
                        )}
                      </blockquote>
                    ))
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      <p style={{ marginTop: '1.5rem' }}>
        <Link href={`/learn/${enrolment.id}`}>{t('assess.back')}</Link>
      </p>
    </div>
  );
}
