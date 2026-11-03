export const MAX_SOURCE_LENGTH = 8000;
export type QuizTranscript = { lessonId: string; title: string; body: string };

/** Do not truncate an author-provided transcript without telling the teacher. */
export function chooseQuizTranscript(
  transcripts: readonly QuizTranscript[], lessonId: string,
): { ok: true; source: string } | { ok: false; message: string } {
  const transcript = transcripts.find((item) => item.lessonId === lessonId);
  if (!transcript) return { ok: false, message: 'Choose a lesson with a transcript.' };
  if (transcript.body.length > MAX_SOURCE_LENGTH) {
    return { ok: false, message: 'This transcript is longer than 8,000 characters. Copy a shorter passage into the teaching material box.' };
  }
  return { ok: true, source: transcript.body };
}
