'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  type AssignmentRevision,
  type AssignmentSubmission,
  revisionsRemaining,
} from '@/lib/course-assignments';
import { AssignmentFiles } from './assignment-files';
import { postLearnerAssignmentAction } from '@/lib/coursework';
import { RevisionFiles } from '@/components/revision-files';
import { LocalTime } from '@/components/local-time';
import { fill, formatNumber, pluralForm } from '@/lib/i18n/format';
import type { LocaleCode } from '@/lib/i18n/locales';

/**
 * Every sentence this component says, handed in by the page.
 *
 * They are not asked of the catalogue here: the assignment sentences are
 * server-only (`SERVER_ONLY_PREFIXES`), so a browser is never sent them and
 * the catalogue hook would answer in English.
 */
export type AssignmentWords = {
  yourWork: string;
  /** `{number}` */
  version: string;
  /** `{date}` */
  due: string;
  dueLateOk: string;
  deadlinePassed: string;
  submittedResponse: string;
  marked: string;
  /** `{earned}` */
  score: string;
  /** `{earned}`, `{possible}` */
  scoreOf: string;
  waiting: string;
  written: string;
  placeholder: string;
  draftSaved: string;
  saveDraft: string;
  saving: string;
  submit: string;
  submitRevision: string;
  submitting: string;
  revise: string;
  working: string;
  reviseExplain: string;
  /** `{count}` */
  revisionsLeftOne: string;
  /** `{count}` */
  revisionsLeftOther: string;
  blockedClosed: string;
  blockedDeadline: string;
  blockedOnce: string;
  blockedLimit: string;
  earlierOne: string;
  earlierOther: string;
  /** `{date}` */
  markedOn: string;
  late: string;
  closedDraft: string;
  msgDraftSaved: string;
  msgSubmitted: string;
  /** `{number}` */
  msgSubmittedVersion: string;
  /** `{number}` */
  msgReopened: string;
  errUnconfirmed: string;
  errUnavailable: string;
  errSignIn: string;
  errNotEnrolled: string;
  errNotAllowed: string;
  errNotFound: string;
  errDeadline: string;
  errAlreadySubmitted: string;
  errClosed: string;
  errEmpty: string;
  errFileGone: string;
  errTooLong: string;
  errRejected: string;
};

/** A sentence with a moment in it: the words either side of `{date}`. */
function WithTime({ sentence, iso, locale }: { sentence: string; iso: string; locale: string }) {
  const at = sentence.indexOf('{date}');
  if (at === -1) return <>{sentence} <LocalTime iso={iso} locale={locale} /></>;
  return (
    <>
      {sentence.slice(0, at)}
      <LocalTime iso={iso} locale={locale} />
      {sentence.slice(at + '{date}'.length)}
    </>
  );
}

export function AssignmentWork({
  assignmentId,
  learnerProfileId,
  assignmentStatus,
  pointsPossible,
  acceptLate,
  deadline,
  pastDue,
  initialSubmission,
  files,
  revisionsAllowed,
  revisionLimit,
  history,
  locale,
  words,
}: {
  assignmentId: string;
  learnerProfileId: string;
  assignmentStatus: string;
  pointsPossible: number | null;
  acceptLate: boolean;
  deadline: string | null;
  /**
   * Whether the deadline had passed when the page was drawn. Decided by the
   * server so that the HTML and the browser agree; the database decides again
   * when anything is handed in.
   */
  pastDue: boolean;
  initialSubmission: AssignmentSubmission | null;
  /** Named files as `assignment_submission_files()` returned them. */
  files: unknown;
  revisionsAllowed: boolean;
  revisionLimit: number | null;
  history: AssignmentRevision[];
  /** The language the words are in, for numbers and dates. */
  locale: LocaleCode;
  words: AssignmentWords;
}) {
  const router = useRouter();
  const [submissionId, setSubmissionId] = useState(initialSubmission?.id ?? '');
  const [status, setStatus] = useState<AssignmentSubmission['status'] | null>(initialSubmission?.status ?? null);
  const [bodyText, setBodyText] = useState(initialSubmission?.bodyText ?? '');
  const [revisionNumber, setRevisionNumber] = useState(initialSubmission?.revisionNumber ?? 1);
  // The mark on screen, cleared the moment the work is reopened. Kept in state
  // rather than read from the prop so a revision does not keep showing a score
  // that no longer exists.
  const [mark, setMark] = useState<{ scoreEarned: number | null; feedback: string | null } | null>(
    initialSubmission?.status === 'graded'
      ? { scoreEarned: initialSubmission.scoreEarned, feedback: initialSubmission.feedback }
      : null,
  );
  const [versions, setVersions] = useState<AssignmentRevision[]>(history);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // The server owns this list; take its version whenever the page refreshes.
  useEffect(() => { setVersions(history); }, [history]);

  const num = (value: number) => formatNumber(locale, value);
  const scoreLine = (earned: number) =>
    pointsPossible
      ? fill(words.scoreOf, { earned: num(earned), possible: num(pointsPossible) })
      : fill(words.score, { earned: num(earned) });
  // The reason a write was refused, in the reader's language. What the server
  // said in English is not printed.
  const sentenceFor = (code: string): string => {
    switch (code) {
      case 'unavailable': return words.errUnavailable;
      case 'not_signed_in': return words.errSignIn;
      case 'not_enrolled': return words.errNotEnrolled;
      case 'not_allowed': return words.errNotAllowed;
      case 'not_found': return words.errNotFound;
      case 'deadline_passed': return words.errDeadline;
      case 'already_submitted': return words.errAlreadySubmitted;
      case 'closed': return words.errClosed;
      case 'empty': return words.errEmpty;
      case 'file_unavailable': return words.errFileGone;
      case 'too_long': return words.errTooLong;
      case 'revision_limit': return words.blockedLimit;
      case 'no_revisions': return words.blockedOnce;
      case 'unconfirmed': return words.errUnconfirmed;
      // A refusal with a reason this page has no sentence for. It was still
      // a refusal: nothing was written.
      default: return words.errRejected;
    }
  };
  const locked = status === 'submitted' || status === 'graded' || assignmentStatus !== 'open';
  const revision = revisionsRemaining(
    { revisionsAllowed, revisionLimit },
    { revisionNumber, status: status ?? 'draft' },
  );
  // Revising gives up a mark, so the button has to be honest about why it is
  // unavailable rather than letting the database refuse after a click.
  const revisionBlocked = assignmentStatus !== 'open'
    ? words.blockedClosed
    : pastDue && !acceptLate
      ? words.blockedDeadline
      : !revisionsAllowed
        ? words.blockedOnce
        : revision.remaining === 0
          ? words.blockedLimit
          : '';

  async function post(payload: Record<string, unknown>) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await postLearnerAssignmentAction(payload);
      if (!result.ok) {
        setError(sentenceFor(result.code));
        return null;
      }
      return result;
    } finally {
      setBusy(false);
    }
  }

  async function saveDraft() {
    const result = await post({
      action: 'save_draft',
      assignmentId,
      learnerProfileId,
      bodyText,
    });
    if (!result?.id) return null;
    setSubmissionId(result.id);
    setStatus('draft');
    setMessage(words.msgDraftSaved);
    router.refresh();
    return result.id;
  }

  async function submit() {
    // Save the latest text first so a learner cannot submit an older version by
    // clicking quickly after editing.
    const id = await saveDraft();
    if (!id) return;
    const result = await post({ action: 'submit', submissionId: id });
    if (!result) return;
    setStatus('submitted');
    setMessage(
      revisionNumber > 1
        ? fill(words.msgSubmittedVersion, { number: num(revisionNumber) })
        : words.msgSubmitted,
    );
    router.refresh();
  }

  async function revise() {
    if (!submissionId) return;
    const current = mark;
    const result = await post({ action: 'reopen', submissionId });
    if (!result?.revisionNumber) return;
    // Show the version that was just recorded straight away; the refresh below
    // replaces it with the server's copy.
    if (current) {
      setVersions((previous) => [...previous, {
        id: `pending-${result.revisionNumber}`,
        submissionId,
        revisionNumber: result.revisionNumber! - 1,
        bodyText,
        assetIds: [],
        scoreEarned: current.scoreEarned,
        feedback: current.feedback,
        submittedAt: null,
        isLate: null,
        markedAt: null,
        reopenedAt: new Date().toISOString(),
      }]);
    }
    setRevisionNumber(result.revisionNumber);
    setMark(null);
    setStatus('draft');
    setMessage(fill(words.msgReopened, { number: num(result.revisionNumber) }));
    router.refresh();
  }

  return (
    <section className="card" style={{ display: 'grid', gap: '.75rem' }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h2 style={{ margin: 0 }}>{words.yourWork}</h2>
        {revisionNumber > 1 && (
          <span className="badge neutral">{fill(words.version, { number: num(revisionNumber) })}</span>
        )}
      </div>

      {deadline && (
        <p className="muted" style={{ margin: 0 }}>
          <WithTime sentence={words.due} iso={deadline} locale={locale} />
          {pastDue && acceptLate ? ` · ${words.dueLateOk}` : ''}
        </p>
      )}
      {pastDue && !acceptLate && status !== 'submitted' && status !== 'graded' && (
        <div className="notice warn">{words.deadlinePassed}</div>
      )}

      {status === 'graded' && bodyText && (
        <div className="card" style={{ background: 'var(--surface, #f8faf8)' }}>
          <h3 style={{ marginTop: 0 }}>{words.submittedResponse}</h3>
          <div style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }} dir="auto">{bodyText}</div>
        </div>
      )}

      {status === 'graded' && mark && (
        <div className="notice">
          <strong>{words.marked}</strong>
          {mark.scoreEarned !== null && (
            <p style={{ margin: '.25rem 0 0' }}>{scoreLine(mark.scoreEarned)}</p>
          )}
          {mark.feedback && (
            <p style={{ margin: '.5rem 0 0', whiteSpace: 'pre-wrap' }} dir="auto">{mark.feedback}</p>
          )}
        </div>
      )}

      {status === 'submitted' && (
        <div className="notice">{words.waiting}</div>
      )}

      {status !== 'graded' && (
        <>
          <label htmlFor="assignment-answer">
            {revisionNumber > 1
              ? `${words.written} · ${fill(words.version, { number: num(revisionNumber) })}`
              : words.written}
          </label>
          <textarea
            id="assignment-answer"
            rows={8}
            maxLength={10000}
            value={bodyText}
            onChange={(e) => setBodyText(e.target.value)}
            disabled={locked || busy}
            placeholder={words.placeholder}
            dir="auto"
          />
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="muted" dir="ltr">{num(bodyText.length)}/{num(10000)}</span>
            {status === 'draft' && <span className="badge neutral">{words.draftSaved}</span>}
          </div>

        </>
      )}

      {/* Uploads are still English for everybody, and say so to a screen
          reader when the page around them is not. */}
      <div {...(locale === 'en' ? {} : { lang: 'en', dir: 'ltr' as const })}>
        <AssignmentFiles
          submissionId={submissionId}
          files={files}
          locked={locked}
          ensureDraft={async () => saveDraft()}
        />
      </div>

      {!locked && (
        <div className="row" style={{ gap: '.5rem' }}>
          <button type="button" className="btn secondary" disabled={busy} onClick={saveDraft}>
            {busy ? words.saving : words.saveDraft}
          </button>
          <button type="button" className="btn" disabled={busy || (pastDue && !acceptLate)} onClick={submit}>
            {busy ? words.submitting : revisionNumber > 1 ? words.submitRevision : words.submit}
          </button>
        </div>
      )}

      {status === 'graded' && (
        <div style={{ display: 'grid', gap: '.35rem' }}>
          <button
            type="button"
            className="btn secondary"
            disabled={busy || !revision.allowed || Boolean(revisionBlocked)}
            onClick={revise}
          >
            {busy ? words.working : words.revise}
          </button>
          {revision.allowed && !revisionBlocked ? (
            <p className="muted" style={{ margin: 0, fontSize: '.85rem' }}>
              {words.reviseExplain}
              {revision.remaining !== null
                ? ` ${fill(
                    pluralForm(locale, revision.remaining) === 'one'
                      ? words.revisionsLeftOne
                      : words.revisionsLeftOther,
                    { count: num(revision.remaining) },
                  )}`
                : ''}
            </p>
          ) : (
            <p className="muted" style={{ margin: 0, fontSize: '.85rem' }}>{revisionBlocked}</p>
          )}
        </div>
      )}

      {versions.length > 0 && (
        <div style={{ display: 'grid', gap: '.5rem' }}>
          <h3 style={{ margin: 0 }}>
            {versions.length === 1 ? words.earlierOne : words.earlierOther}
          </h3>
          {versions.map((version) => (
            <div key={version.id} className="card" style={{ background: 'var(--surface, #f8faf8)' }}>
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
                <strong>{fill(words.version, { number: num(version.revisionNumber) })}</strong>
                <span className="muted" style={{ fontSize: '.8rem' }}>
                  {version.markedAt && <WithTime sentence={words.markedOn} iso={version.markedAt} locale={locale} />}
                  {version.isLate ? `${version.markedAt ? ' · ' : ''}${words.late}` : ''}
                </span>
              </div>
              {version.scoreEarned !== null && (
                <p className="muted" style={{ margin: '.25rem 0 0' }}>{scoreLine(version.scoreEarned)}</p>
              )}
              {version.feedback && (
                <p style={{ margin: '.35rem 0 0', whiteSpace: 'pre-wrap' }} dir="auto">{version.feedback}</p>
              )}
              <div {...(locale === 'en' ? {} : { lang: 'en', dir: 'ltr' as const })}>
                <RevisionFiles assetIds={version.assetIds} />
              </div>
            </div>
          ))}
        </div>
      )}

      {assignmentStatus !== 'open' && status !== 'graded' && status !== 'submitted' && (
        <div className="notice warn">{words.closedDraft}</div>
      )}
      {error && <div className="notice error" role="alert">{error}</div>}
      {message && <div className="notice" role="status">{message}</div>}
    </section>
  );
}
