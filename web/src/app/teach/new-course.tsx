'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  newCourseAnswerOf,
  newCourseSentence,
  type NewCourseRefusal,
  type NewCourseWords,
} from '@/lib/course-create';

/**
 * Create a course.
 *
 * One field. A course and its first version are created together, because a
 * course with no version has nowhere to put content and nothing to publish.
 * The slug is derived from the title rather than asked for — it is part of
 * the public URL, and a second question here is a second thing to get wrong.
 *
 * Its sentences are the page's (`words`), in the reader's language since
 * 2026-11-28. One thing is not: the database's own sentence when it refuses,
 * which is English and is marked as English where the page is not.
 *
 * An answer that is not the route's own is not called a failure: the course
 * may be there, and the sentence says to look before creating it again.
 */
export function NewCourse({ words }: { words: NewCourseWords }) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ refusal: NewCourseRefusal; said: string | null } | null>(null);
  const [, startTransition] = useTransition();
  // From the press until its answer the form takes no second one: two
  // requests in flight are two courses, or a course and a refusal that says
  // the name is taken by the course just made.
  const inFlight = useRef(false);

  const english = words.markEnglish ? ({ lang: 'en', dir: 'ltr' } as const) : {};

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (inFlight.current) return;
    if (title.trim() === '') {
      setError({ refusal: 'title', said: null });
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setError(null);

    let status = 0;
    let body: unknown = null;
    try {
      const res = await fetch('/api/teach', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'create_course', title }),
      });
      status = res.status;
      body = await res.json().catch(() => null);
    } catch {
      body = null;
    }

    const answer = newCourseAnswerOf(status, body);
    if (answer.ok) {
      // The form stays as it is until the new course's page has replaced it.
      startTransition(() => router.push(`/teach/${answer.courseId}`));
      return;
    }
    inFlight.current = false;
    setBusy(false);
    setError({ refusal: answer.refusal, said: answer.said });
  }

  return (
    <form onSubmit={submit} className="card" data-new-course>
      <h3 style={{ marginTop: 0 }}>{words.title}</h3>

      <label htmlFor="course-title">{words.field}</label>
      {/* A title is written in whatever language its course is in, so the
          field takes its direction from what is typed. It no longer takes the
          keyboard when the page opens: it is the last thing on the page, and
          a page that opened on it opened past a takedown notice. */}
      <input
        id="course-title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={words.example}
        required
        maxLength={120}
        // Empty, it shows the example and stands as the page does.
        dir={title === '' ? undefined : 'auto'}
      />

      {error && (
        <div className="notice error" role="alert" data-new-course-refusal={error.refusal}>
          {newCourseSentence(words, error.refusal)}
          {error.said && (
            <>
              {' '}
              <span {...english} data-new-course-said>
                {error.said}
              </span>
            </>
          )}
        </div>
      )}

      <button type="submit" className="btn" disabled={busy} style={{ marginTop: '0.75rem' }}>
        {busy ? words.creating : words.create}
      </button>
    </form>
  );
}
