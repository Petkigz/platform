'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  ASSESSMENT_TYPE_HINT,
  ASSESSMENT_TYPE_LABEL,
  type AssessmentType,
  type AuthoredAssessment,
  type PendingManualResponse,
  type QuestionType,
} from '@/lib/assessment';
import type { AuthoredVersion } from '@/lib/authoring';

const NEW_CHOICE_IDS = ['choice-a', 'choice-b', 'choice-c', 'choice-d'];

export function AssessmentManager({
  version,
  assessments,
  manualResponses,
}: {
  version: AuthoredVersion;
  assessments: AuthoredAssessment[];
  manualResponses: PendingManualResponse[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const editable = version.status === 'draft';
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [type, setType] = useState<AssessmentType>('graded');
  const [passThreshold, setPassThreshold] = useState('70');
  const [attemptLimit, setAttemptLimit] = useState('');
  const [lessonId, setLessonId] = useState('');
  const [instructions, setInstructions] = useState('');
  const [openAssessment, setOpenAssessment] = useState<string | null>(null);
  const [questionType, setQuestionType] = useState<Exclude<QuestionType, 'short_answer'>>('single_choice');
  const [prompt, setPrompt] = useState('');
  const [choices, setChoices] = useState(['', '', '', '']);
  const [answerId, setAnswerId] = useState(NEW_CHOICE_IDS[0]);
  const [answerIds, setAnswerIds] = useState<string[]>([]);
  const [manualScores, setManualScores] = useState<Record<string, string>>({});
  const [manualVerdicts, setManualVerdicts] = useState<Record<string, boolean>>({});

  const lessons = version.sections.flatMap((section) =>
    section.lessons.map((lesson) => ({
      id: lesson.id,
      label: `${section.title} · ${lesson.title}`,
    })),
  );

  async function post(payload: Record<string, unknown>, key: string) {
    setBusy(key);
    setError(null);
    try {
      const response = await fetch('/api/teach', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = (await response.json().catch(() => null)) as {
        ok?: boolean;
        message?: string;
      } | null;
      if (!response.ok || result?.ok !== true) {
        setError(result?.message ?? 'That did not work.');
        return false;
      }
      startTransition(() => router.refresh());
      return true;
    } catch {
      setError('Could not reach the server. Check your connection and try again.');
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function createAssessment(event: React.FormEvent) {
    event.preventDefault();
    const created = await post({
      action: 'create_assessment',
      versionId: version.id,
      title,
      type,
      passThreshold: type === 'practice' ? null : Number(passThreshold),
      attemptLimit: attemptLimit.trim() ? Number(attemptLimit) : null,
      lessonId: lessonId || null,
      instructions,
    }, 'create-assessment');
    if (created) {
      setTitle('');
      setInstructions('');
      setAttemptLimit('');
      setLessonId('');
    }
  }

  async function markManualResponse(response: PendingManualResponse) {
    const scoreText = manualScores[response.response_id] ?? '0';
    const score = Number(scoreText);
    if (!Number.isFinite(score) || score < 0 || score > Number(response.max_points)) {
      setError(`Enter a score from 0 to ${response.max_points}.`);
      return;
    }
    const verdict = manualVerdicts[response.response_id];
    if (verdict === undefined) {
      setError('Choose whether this answer is correct or incorrect.');
      return;
    }
    await post({
      action: 'mark_manual_response',
      responseId: response.response_id,
      score,
      isCorrect: verdict,
    }, `manual-${response.response_id}`);
  }

  async function addQuestion(event: React.FormEvent, assessmentId: string) {
    event.preventDefault();
    const choicesForRequest = questionType === 'single_choice' || questionType === 'multiple_choice'
      ? choices.map((text, index) => ({ id: NEW_CHOICE_IDS[index]!, text })).filter((choice) => choice.text.trim())
      : [];
    const added = await post({
      action: 'add_assessment_question',
      assessmentId,
      type: questionType,
      gradingMethod: 'automatic',
      prompt,
      choices: choicesForRequest,
      answerId: questionType === 'multiple_choice' ? undefined : answerId,
      answerIds: questionType === 'multiple_choice' ? answerIds : undefined,
    }, `add-question-${assessmentId}`);
    if (added) {
      setPrompt('');
      setChoices(['', '', '', '']);
      setAnswerId(NEW_CHOICE_IDS[0]);
      setAnswerIds([]);
    }
  }

  return (
    <section className="section" aria-labelledby="assessment-manager-title">
      <div className="outline-h">
        <h2 id="assessment-manager-title">Assessments</h2>
        {editable && <span className="badge neutral">Draft only</span>}
      </div>
      <p className="muted">
        Add a quiz or knowledge check to this course version. Assessments need at
        least one question and an active status before learners can use them; the
        platform’s assessment setting also controls learner access.
      </p>
      {error && <div className="notice error" role="alert">{error}</div>}

      {manualResponses.length > 0 && (
        <section aria-labelledby="manual-grading-title" style={{ marginBottom: '1.25rem' }}>
          <h3 id="manual-grading-title">Waiting for your marking ({manualResponses.length})</h3>
          <p className="muted">Learner names are hidden here. Mark the answer itself; the attempt is scored when all manual answers are graded.</p>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {manualResponses.map((response) => (
              <article className="card" key={response.response_id}>
                <p className="eyebrow">{response.assessment_title} · v{response.course_version_number} · attempt {response.attempt_number}</p>
                <h4>{response.question_prompt}</h4>
                <div className="notice" style={{ whiteSpace: 'pre-wrap' }}>
                  {typeof response.response_content === 'string'
                    ? response.response_content
                    : JSON.stringify(response.response_content)}
                </div>
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    void markManualResponse(response);
                  }}
                  className="row"
                  style={{ alignItems: 'end', gap: '0.75rem' }}
                >
                  <label style={{ display: 'grid', gap: '0.25rem' }}>
                    Score (0–{response.max_points})
                    <input
                      type="number"
                      min="0"
                      max={response.max_points}
                      step="any"
                      required
                      value={manualScores[response.response_id] ?? '0'}
                      onChange={(event) => setManualScores({
                        ...manualScores, [response.response_id]: event.target.value,
                      })}
                      aria-label={`Score for attempt ${response.attempt_number}`}
                    />
                  </label>
                  <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
                    <legend>Verdict</legend>
                    <label>
                      <input
                        type="radio"
                        name={`verdict-${response.response_id}`}
                        checked={manualVerdicts[response.response_id] === true}
                        onChange={() => setManualVerdicts({ ...manualVerdicts, [response.response_id]: true })}
                        style={{ width: 'auto' }}
                      /> Correct
                    </label>
                    <label style={{ marginLeft: '0.75rem' }}>
                      <input
                        type="radio"
                        name={`verdict-${response.response_id}`}
                        checked={manualVerdicts[response.response_id] === false}
                        onChange={() => setManualVerdicts({ ...manualVerdicts, [response.response_id]: false })}
                        style={{ width: 'auto' }}
                      /> Incorrect
                    </label>
                  </fieldset>
                  <button
                    type="submit"
                    className="btn secondary"
                    disabled={busy !== null}
                  >
                    {busy === `manual-${response.response_id}` ? 'Saving…' : 'Save mark'}
                  </button>
                </form>
              </article>
            ))}
          </div>
        </section>
      )}

      {assessments.length === 0 ? (
        <p className="empty">No assessments in this version yet.</p>
      ) : (
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {assessments.map((assessment) => (
            <article className="card" key={assessment.id}>
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0 }}>{assessment.title}</h3>
                  <p className="muted" style={{ margin: '0.25rem 0 0' }}>
                    {ASSESSMENT_TYPE_LABEL[assessment.type]} · {assessment.questionCount} question{assessment.questionCount === 1 ? '' : 's'}
                    {assessment.passThreshold !== null ? ` · Pass mark ${assessment.passThreshold}%` : ''}
                  </p>
                </div>
                <span className={`badge ${assessment.status === 'active' ? '' : 'neutral'}`}>
                  {assessment.status === 'active' ? 'Active' : assessment.status === 'draft' ? 'Draft' : 'Retired'}
                </span>
              </div>
              {editable && assessment.status !== 'retired' && (
                <div className="row" style={{ marginTop: '0.75rem' }}>
                  {assessment.status === 'draft' && (
                    <button
                      type="button"
                      className="btn secondary"
                      disabled={busy !== null || assessment.questionCount === 0}
                      title={assessment.questionCount === 0 ? 'Add at least one question first.' : undefined}
                      onClick={() => post({
                        action: 'activate_assessment', assessmentId: assessment.id,
                      }, `activate-${assessment.id}`)}
                    >
                      {busy === `activate-${assessment.id}` ? 'Activating…' : 'Make available to learners'}
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn ghost"
                    disabled={busy !== null}
                    onClick={() => {
                      setError(null);
                      setOpenAssessment(openAssessment === assessment.id ? null : assessment.id);
                    }}
                  >
                    {openAssessment === assessment.id ? 'Close question form' : 'Add a question'}
                  </button>
                </div>
              )}

              {editable && openAssessment === assessment.id && assessment.status !== 'retired' && (
                <form onSubmit={(event) => addQuestion(event, assessment.id)} style={{ display: 'grid', gap: '0.65rem', marginTop: '0.75rem' }}>
                  <label style={{ display: 'grid', gap: '0.3rem' }}>
                    Question type
                    <select
                      value={questionType}
                      disabled={busy !== null}
                      onChange={(event) => {
                        const nextType = event.target.value as Exclude<QuestionType, 'short_answer'>;
                        setQuestionType(nextType);
                        if (nextType === 'true_false') setAnswerId('true');
                        else if (nextType === 'single_choice') setAnswerId(NEW_CHOICE_IDS[0]!);
                        if (nextType !== 'multiple_choice') setAnswerIds([]);
                      }}
                    >
                      <option value="single_choice">Choose one answer</option>
                      <option value="multiple_choice">Choose all correct answers</option>
                      <option value="true_false">True or false</option>
                    </select>
                  </label>
                  <label style={{ display: 'grid', gap: '0.3rem' }}>
                    Question
                    <textarea
                      value={prompt}
                      onChange={(event) => setPrompt(event.target.value)}
                      maxLength={2000}
                      required
                      rows={3}
                      disabled={busy !== null}
                    />
                  </label>
                  {(questionType === 'single_choice' || questionType === 'multiple_choice') && (
                    <fieldset style={{ border: '1px solid var(--line)', borderRadius: '0.6rem', padding: '0.75rem' }}>
                      <legend>{questionType === 'single_choice' ? 'Answer choices — select the correct answer' : 'Answer choices — select all correct answers'}</legend>
                      <div style={{ display: 'grid', gap: '0.5rem' }}>
                        {choices.map((choice, index) => {
                          const id = NEW_CHOICE_IDS[index]!;
                          return (
                            <div className="row" key={id}>
                              <input
                                type={questionType === 'multiple_choice' ? 'checkbox' : 'radio'}
                                name={`correct-${assessment.id}`}
                                value={id}
                                checked={questionType === 'multiple_choice' ? answerIds.includes(id) : answerId === id}
                                onChange={() => {
                                  if (questionType === 'multiple_choice') {
                                    setAnswerIds(answerIds.includes(id)
                                      ? answerIds.filter((answer) => answer !== id)
                                      : [...answerIds, id]);
                                  } else {
                                    setAnswerId(id);
                                  }
                                }}
                                aria-label={`${questionType === 'multiple_choice' ? 'Toggle' : 'Mark'} choice ${index + 1} as correct`}
                                style={{ width: 'auto' }}
                                disabled={busy !== null}
                              />
                              <input
                                value={choice}
                                onChange={(event) => setChoices(choices.map((old, i) => i === index ? event.target.value : old))}
                                placeholder={`Choice ${index + 1}`}
                                aria-label={`Choice ${index + 1}`}
                                maxLength={500}
                                disabled={busy !== null}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </fieldset>
                  )}
                  {questionType === 'true_false' && (
                    <fieldset style={{ border: '1px solid var(--line)', borderRadius: '0.6rem', padding: '0.75rem' }}>
                      <legend>Correct answer</legend>
                      <label><input type="radio" name={`answer-${assessment.id}`} checked={answerId === 'true'} onChange={() => setAnswerId('true')} style={{ width: 'auto' }} /> True</label>
                      <label style={{ marginLeft: '1rem' }}><input type="radio" name={`answer-${assessment.id}`} checked={answerId === 'false'} onChange={() => setAnswerId('false')} style={{ width: 'auto' }} /> False</label>
                    </fieldset>
                  )}
                  <div className="row">
                    <button type="submit" className="btn secondary" disabled={busy !== null}>
                      {busy === `add-question-${assessment.id}` ? 'Adding…' : 'Save question'}
                    </button>
                  </div>
                </form>
              )}
            </article>
          ))}
        </div>
      )}

      {editable && (
        <form onSubmit={createAssessment} className="card" style={{ display: 'grid', gap: '0.65rem', marginTop: '1rem' }}>
          <h3 style={{ margin: 0 }}>Create an assessment</h3>
          <label style={{ display: 'grid', gap: '0.3rem' }}>
            Title
            <input value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={200} />
          </label>
          <label style={{ display: 'grid', gap: '0.3rem' }}>
            Assessment type
            <select value={type} onChange={(event) => setType(event.target.value as AssessmentType)}>
              {(Object.keys(ASSESSMENT_TYPE_LABEL) as AssessmentType[]).map((value) => (
                <option key={value} value={value}>{ASSESSMENT_TYPE_LABEL[value]}</option>
              ))}
            </select>
            <span className="muted" style={{ fontSize: '0.85rem' }}>{ASSESSMENT_TYPE_HINT[type]}</span>
          </label>
          {type !== 'practice' && (
            <label style={{ display: 'grid', gap: '0.3rem' }}>
              Pass mark (percent)
              <input type="number" min="0" max="100" step="1" value={passThreshold} onChange={(event) => setPassThreshold(event.target.value)} required />
            </label>
          )}
          <label style={{ display: 'grid', gap: '0.3rem' }}>
            Attempt limit (optional)
            <input type="number" min="1" step="1" value={attemptLimit} onChange={(event) => setAttemptLimit(event.target.value)} placeholder="No limit" />
          </label>
          <label style={{ display: 'grid', gap: '0.3rem' }}>
            Attach to a lesson (optional)
            <select value={lessonId} onChange={(event) => setLessonId(event.target.value)}>
              <option value="">Course-wide</option>
              {lessons.map((lesson) => (
                <option key={lesson.id} value={lesson.id}>{lesson.label}</option>
              ))}
            </select>
          </label>
          <label style={{ display: 'grid', gap: '0.3rem' }}>
            Instructions (optional)
            <textarea value={instructions} onChange={(event) => setInstructions(event.target.value)} maxLength={5000} rows={3} />
          </label>
          <div>
            <button type="submit" className="btn" disabled={busy !== null}>
              {busy === 'create-assessment' ? 'Creating…' : 'Create assessment'}
            </button>
          </div>
        </form>
      )}
      {!editable && (
        <p className="muted">This version is locked. To change an assessment, create a new course version.</p>
      )}
    </section>
  );
}
