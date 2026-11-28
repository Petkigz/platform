/**
 * The form that creates a course, as far as it can be said without a browser:
 * the words it is handed and how it reads the answer of `/api/teach`.
 *
 * Kept apart from `authoring.ts` so that the form, which is a script, carries
 * none of the authoring library with it. It holds no sentence: the page hands
 * the form its words in the reader's language (`teach.nc…`).
 */

/** The form's words. `markEnglish` is whether the page is in another language than English. */
export type NewCourseWords = {
  title: string;
  field: string;
  example: string;
  create: string;
  creating: string;
  eTitle: string;
  eDuplicate: string;
  eRefused: string;
  eUnsure: string;
  eSignedOut: string;
  markEnglish: boolean;
};

export type NewCourseRefusal = 'title' | 'duplicate' | 'refused' | 'unsure' | 'signedOut';

export type NewCourseAnswer =
  | { ok: true; courseId: string }
  | { ok: false; refusal: NewCourseRefusal; said: string | null };

const UNSURE: NewCourseAnswer = { ok: false, refusal: 'unsure', said: null };

/**
 * What the route answered, from its status and its body.
 *
 * Only an answer of the route's own is believed. A gateway's page, a cut
 * connection (status 0, no body), a body that is not what the route writes:
 * each of those is `unsure`, because the course may have been created and the
 * answer lost, and "it failed" would invite a second course of the same name.
 * So is a success that does not say which course it made: the teacher is sent
 * to look at the list rather than to a page with no address.
 */
export function newCourseAnswerOf(status: number, body: unknown): NewCourseAnswer {
  if (status === 401) return { ok: false, refusal: 'signedOut', said: null };
  if (typeof body !== 'object' || body === null) return UNSURE;
  const b = body as { ok?: unknown; code?: unknown; said?: unknown; value?: unknown };
  if (b.ok === true) {
    const id = (b.value as { courseId?: unknown } | null | undefined)?.courseId;
    return typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id) ? { ok: true, courseId: id } : UNSURE;
  }
  if (b.ok !== false) return UNSURE;
  if (b.code === 'title' || b.code === 'duplicate') return { ok: false, refusal: b.code, said: null };
  if (b.code === 'refused' && typeof b.said === 'string' && b.said.trim() !== '') {
    // The database's sentence, cut so that a page of it cannot fill the form.
    return { ok: false, refusal: 'refused', said: b.said.trim().slice(0, 500) };
  }
  return UNSURE;
}

/** The sentence for a refusal, out of the form's words. */
export function newCourseSentence(words: NewCourseWords, refusal: NewCourseRefusal): string {
  switch (refusal) {
    case 'title':
      return words.eTitle;
    case 'duplicate':
      return words.eDuplicate;
    case 'refused':
      return words.eRefused;
    case 'signedOut':
      return words.eSignedOut;
    default:
      return words.eUnsure;
  }
}
