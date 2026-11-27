/**
 * The study assistant, as the browser sees it.
 *
 * The database decides everything that matters: whether the assistant is on, what
 * a ruling-shaped question is, which lessons may be cited, and whether a refusal
 * opens a support case. This module reads that answer strictly and refuses to
 * render anything that claims more than the database did.
 *
 * The one rule that justifies the strictness: **the payload says, on every
 * response, that no model wrote the text**. `boundary.generatedText` must be
 * `false` and `boundary.model` must be `null`. If a future change starts
 * generating answers, the client stops rendering the answer rather than silently
 * presenting generated text as a citation — the change has to be made in both
 * places, on purpose, and that is the point.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export type AiSupportStatus = 'answered' | 'refused_ruling' | 'no_match' | 'closed';

export type AiSupportCitation = {
  lessonId: string;
  lessonTitle: string;
  sectionTitle: string | null;
  courseId: string;
  courseSlug: string;
  courseTitle: string;
  /** `ts_headline` output: `<mark>` around the match, and only that tag. */
  snippet: string;
  matchedIn: 'title' | 'description' | 'transcript';
  href: string;
};

export type AiSupportAnswer = {
  questionId: string | null;
  status: AiSupportStatus;
  message: string;
  citations: AiSupportCitation[];
  matchedPhrases: string[];
  supportCaseNumber: string | null;
  boundary: {
    retrievalOnly: boolean;
    model: null;
    generatedText: false;
    rules: string;
  };
};

const text = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value : null;

function citation(raw: unknown): AiSupportCitation | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const lessonId = text(row.lessonId);
  const lessonTitle = text(row.lessonTitle);
  const courseSlug = text(row.courseSlug);
  const courseTitle = text(row.courseTitle);
  const snippet = typeof row.snippet === 'string' ? row.snippet : null;
  const href = text(row.href);
  if (!lessonId || !lessonTitle || !courseSlug || !courseTitle) return null;
  if (snippet === null || !href) return null;
  const matchedIn = row.matchedIn === 'title' || row.matchedIn === 'description' || row.matchedIn === 'transcript'
    ? row.matchedIn : null;
  if (!matchedIn) return null;
  return {
    lessonId,
    lessonTitle,
    sectionTitle: text(row.sectionTitle),
    courseId: text(row.courseId) ?? '',
    courseSlug,
    courseTitle,
    snippet,
    matchedIn,
    href,
  };
}

const STATUSES: AiSupportStatus[] = ['answered', 'refused_ruling', 'no_match', 'closed'];

export function normaliseAiSupportAnswer(raw: unknown): AiSupportAnswer | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;

  const status = STATUSES.find((candidate) => candidate === row.status);
  const message = text(row.message);
  if (!status || !message) return null;

  const boundaryRaw = row.boundary;
  if (!boundaryRaw || typeof boundaryRaw !== 'object') return null;
  const boundary = boundaryRaw as Record<string, unknown>;
  // The claim this feature rests on. Anything else is not an answer this screen
  // knows how to present honestly, so it presents nothing.
  if (boundary.retrievalOnly !== true) return null;
  if (boundary.model !== null) return null;
  if (boundary.generatedText !== false) return null;

  if (!Array.isArray(row.citations)) return null;
  const citations: AiSupportCitation[] = [];
  for (const entry of row.citations) {
    const parsed = citation(entry);
    if (!parsed) return null;
    citations.push(parsed);
  }

  const matchedPhrases: string[] = [];
  if (Array.isArray(row.matchedPhrases)) {
    for (const entry of row.matchedPhrases) {
      if (typeof entry === 'string' && entry.trim()) matchedPhrases.push(entry);
    }
  }

  // An "answered" payload with no citation is not an answer, and a refusal that
  // carries one is not a refusal.
  if (status === 'answered' && citations.length === 0) return null;
  if (status !== 'answered' && citations.length > 0) return null;

  return {
    questionId: text(row.questionId),
    status,
    message,
    citations,
    matchedPhrases,
    supportCaseNumber: text(row.supportCaseNumber),
    boundary: {
      retrievalOnly: true,
      model: null,
      generatedText: false,
      rules: text(boundary.rules) ?? '',
    },
  };
}

/**
 * Why a question was not answered, by name (2026-11-27). The English
 * sentence beside it is for a caller with no words of its own; the page says
 * the name in the reader's language.
 *
 * `unsure` is not a refusal. It is an answer nobody could read: a reply from
 * the database with no state, or one in a shape this module will not render.
 * In the second case the question **was** recorded, and a request for help
 * may have been opened, so the page says to look before asking again.
 */
export type AskRefusalCode = 'signed_out' | 'too_short' | 'too_long' | 'not_sent' | 'unsure';

export type AskResult =
  | { ok: true; answer: AiSupportAnswer }
  | { ok: false; message: string; code: AskRefusalCode };

/** The status the route answers each name with. Only `unsure` is not a refusal. */
export function askStatusOf(code: AskRefusalCode): number {
  if (code === 'unsure') return 502;
  if (code === 'signed_out') return 401;
  return 422;
}

/** What a form says for a reply from the route: only a four hundred that names itself is a refusal. */
export type AskRefusal = 'signedOut' | 'tooShort' | 'tooLong' | 'notSent' | 'unsure';
export function askRefusalOf(status: number, code: unknown): AskRefusal {
  if (status < 400 || status >= 500) return 'unsure';
  if (status === 401 || code === 'signed_out') return 'signedOut';
  if (code === 'too_short') return 'tooShort';
  if (code === 'too_long') return 'tooLong';
  return 'notSent';
}

/** The longest question the database takes. */
export const ASK_MAX = 1000;

/** Every sentence the question box says, handed over by the page. */
export type AskWords = {
  label: string;
  example: string;
  look: string;
  looking: string;
  status: Record<AiSupportStatus, string>;
  /** What each status means; a question for a teacher has two, with a request opened and without. */
  says: { answered: string; teacherCase: string; teacherNoCase: string; noMatch: string; closed: string };
  /** `{number}` is still in it. */
  openCase: string;
  rules: string;
  refusals: Record<AskRefusal, string>;
};

/** Which sentence an answer gets. */
export function askSaysKey(answer: Pick<AiSupportAnswer, 'status' | 'supportCaseNumber'>): keyof AskWords['says'] {
  if (answer.status === 'answered') return 'answered';
  if (answer.status === 'no_match') return 'noMatch';
  if (answer.status === 'closed') return 'closed';
  return answer.supportCaseNumber ? 'teacherCase' : 'teacherNoCase';
}

function askCodeOf(error: { message: string; code?: string | null }): AskRefusalCode {
  if (/ai_support:not_signed_in/.test(error.message)) return 'signed_out';
  if (/ai_support:too_short/.test(error.message)) return 'too_short';
  if (/ai_support:too_long/.test(error.message)) return 'too_long';
  // No state at all, or a connection that went: not the database refusing.
  const state = error.code ?? '';
  if (state === '' || state.startsWith('08')) return 'unsure';
  return 'not_sent';
}

/** `ai_support:<key>` and the two length refusals, as sentences. */
export function mapAskRefusal(message: string): string {
  if (/ai_support:not_signed_in/.test(message)) return 'Sign in to ask a question.';
  if (/ai_support:too_short/.test(message)) return 'Write a little more so the question means something.';
  if (/ai_support:too_long/.test(message)) return 'That is longer than 1000 characters. Shorten it and try again.';
  return 'The question could not be sent. Nothing was recorded.';
}

export async function askAiSupport(
  supabase: SupabaseClient,
  args: { question: string; courseId?: string | null },
): Promise<AskResult> {
  const question = args.question.trim();
  if (question.length < 3) {
    return { ok: false, code: 'too_short', message: 'Write a little more so the question means something.' };
  }
  if (question.length > ASK_MAX) {
    return { ok: false, code: 'too_long', message: 'That is longer than 1000 characters. Shorten it and try again.' };
  }

  const { data, error } = await supabase.rpc('ai_support_ask', {
    p_question: question,
    p_course_id: args.courseId ?? null,
  });
  if (error) {
    const code = askCodeOf(error);
    return {
      ok: false,
      code,
      message: code === 'unsure' ? 'The answer could not be read.' : mapAskRefusal(error.message),
    };
  }

  const answer = normaliseAiSupportAnswer(data);
  if (!answer) {
    return {
      ok: false,
      code: 'unsure',
      message: 'The answer came back in a shape this page will not render, so it is not being shown.',
    };
  }
  return { ok: true, answer };
}

/** What the screen calls this status, in one line. */
export function describeAiSupportStatus(status: AiSupportStatus): string {
  switch (status) {
    case 'answered':
      return 'Found in your courses';
    case 'refused_ruling':
      return 'A question for a teacher';
    case 'no_match':
      return 'Nothing in your courses yet';
    case 'closed':
      return 'Not switched on';
  }
}
