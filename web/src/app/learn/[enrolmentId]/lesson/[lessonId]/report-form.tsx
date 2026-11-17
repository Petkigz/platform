'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  REPORT_CATEGORIES,
  REPORT_DESCRIPTION_MAX,
  reportOutcomeOf,
  type ReportCategory,
} from '@/lib/governance';
import { fill, formatNumber } from '@/lib/i18n/format';
import type { LocaleCode } from '@/lib/i18n/locales';

/**
 * Flag a problem with a lesson, or with one answer in its discussion.
 *
 * Collapsed by default and deliberately small. A prominent "REPORT" button on
 * every lesson would train people to use it for disagreements, and the queue is
 * read by a person. But hiding it entirely would remove the only channel the
 * people who actually notice a doctrinal error have — and on a platform that
 * teaches faith to children, that is the safeguard most worth keeping.
 *
 * `postId` is set when reporting a specific discussion post, which is what makes
 * "this answer is wrong" actionable rather than ambiguous between the lesson and
 * something someone said about it.
 *
 * **The words can be handed in.** The lesson page passes `words` in the
 * reader's language. A place that is still English (the discussion, the note
 * about a recording) passes nothing and gets the English below. They arrive as
 * props from the server rather than being looked up here, so these sentences
 * are not in a catalogue every page carries.
 *
 * **When it does not go through.** A page with `words` reads the reply's code,
 * not its English sentence: three refusals have a sentence of their own, any
 * other refusal has one between them, and a reply that is not a refusal at all
 * (lost, a server error, no code) says the report could not be confirmed and
 * to send it again. That is safe to say: one person holds at most one open
 * report of a kind on a thing, so a second copy is answered "you already have
 * one".
 */
export type ReportFormWords = {
  /** The link that opens the form, and the form's heading. */
  open: string;
  intro: string;
  kind: string;
  /** One name for each category the database accepts. */
  categories: Record<ReportCategory, string>;
  what: string;
  placeholder: string;
  send: string;
  sending: string;
  cancel: string;
  sent: string;
  /** Carries `{max}`. */
  tooLong: string;
  notVisible: string;
  duplicate: string;
  refused: string;
  uncertain: string;
};

const ENGLISH: ReportFormWords = {
  open: 'Report a problem',
  intro: 'A person reviews every report. Please say what is wrong, not only that you disagree.',
  kind: 'What kind of problem?',
  categories: Object.fromEntries(REPORT_CATEGORIES.map((c) => [c.value, c.label])) as Record<ReportCategory, string>,
  what: 'What is wrong?',
  placeholder: 'Quote the part you mean, if you can',
  send: 'Send report',
  sending: 'Sending…',
  cancel: 'Cancel',
  sent: 'Sent. A person will look at it.',
  tooLong: 'Please keep it under {max} characters.',
  notVisible: 'You cannot report something you cannot see.',
  duplicate: 'You already have an open report of this kind here. It has not been ignored.',
  refused: 'That report could not be accepted. Reload the page and try again.',
  uncertain: 'We could not confirm that your report was sent. Please send it again.',
};

export function ReportForm({
  lessonId,
  postId,
  label,
  category: initialCategory = 'doctrinal_error',
  words,
  locale = 'en',
}: {
  lessonId: string;
  postId?: string;
  label?: string;
  /**
   * Which category the form opens on.
   *
   * A learner who clicks "tell us about this recording" is reporting a fault, and
   * a form that opened on "doctrinal error" would be asking them to correct it —
   * or, worse, to leave it and send a doctrinal complaint about a broken file.
   */
  category?: ReportCategory;
  words?: ReportFormWords;
  /** The language `words` is in, for the number in "under 2,000 characters". */
  locale?: LocaleCode;
}) {
  const say = words ?? ENGLISH;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<ReportCategory>(initialCategory);
  const [description, setDescription] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<'info' | 'error'>('info');
  const [sending, setSending] = useState(false);

  function failure(status: number, code: unknown): string {
    const outcome = reportOutcomeOf(status, code);
    if (outcome === 'too_long') return fill(say.tooLong, { max: formatNumber(locale, REPORT_DESCRIPTION_MAX) });
    if (outcome === 'not_visible') return say.notVisible;
    if (outcome === 'duplicate') return say.duplicate;
    return outcome === 'refused' ? say.refused : say.uncertain;
  }

  async function submit() {
    setMessage(null);
    setSending(true);
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          lessonId,
          category,
          description,
          discussionPostId: postId ?? undefined,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string; code?: unknown };

      if (!res.ok) {
        setTone('error');
        // The server's sentence is English. A page in another language gets
        // its own; an English one keeps the server's, which is more exact.
        setMessage(words ? failure(res.status, json.code) : (json.error ?? failure(res.status, json.code)));
        return;
      }

      setTone('info');
      setOpen(false);
      setDescription('');
      setMessage(say.sent);
      startTransition(() => router.refresh());
    } catch {
      // No reply at all.
      setTone('error');
      setMessage(say.uncertain);
    } finally {
      setSending(false);
    }
  }

  const busy = pending || sending;

  if (message && !open) {
    return (
      <p
        className="muted"
        role="status"
        style={tone === 'error' ? { color: 'var(--red-600, #b3261e)' } : undefined}
      >
        {message}
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        className="linklike"
        onClick={() => setOpen(true)}
        style={{
          background: 'none',
          border: 'none',
          padding: 0,
          font: 'inherit',
          fontSize: '0.85rem',
          color: 'var(--muted)',
          cursor: 'pointer',
          textDecoration: 'underline',
        }}
      >
        {label ?? say.open}
      </button>
    );
  }

  return (
    <div className="card" style={{ marginTop: '0.75rem' }}>
      <h3 style={{ marginTop: 0 }}>{say.open}</h3>
      <p className="muted">{say.intro}</p>

      <label className="eyebrow" htmlFor={`c-${lessonId}-${postId ?? 'lesson'}`}>
        {say.kind}
      </label>
      <select
        id={`c-${lessonId}-${postId ?? 'lesson'}`}
        value={category}
        onChange={(e) => setCategory(e.target.value as ReportCategory)}
      >
        {REPORT_CATEGORIES.map((c) => (
          <option key={c.value} value={c.value}>
            {say.categories[c.value]}
          </option>
        ))}
      </select>

      <label className="eyebrow" htmlFor={`d-${lessonId}-${postId ?? 'lesson'}`}>
        {say.what}
      </label>
      {/* What the reader types is theirs, in whichever direction they write. */}
      <textarea
        id={`d-${lessonId}-${postId ?? 'lesson'}`}
        rows={3}
        dir="auto"
        maxLength={REPORT_DESCRIPTION_MAX}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder={say.placeholder}
      />

      <div className="row" style={{ gap: '0.5rem' }}>
        <button
          type="button"
          className="btn"
          disabled={busy || description.trim().length === 0}
          onClick={submit}
        >
          {busy ? say.sending : say.send}
        </button>
        <button
          type="button"
          className="btn ghost"
          disabled={busy}
          onClick={() => {
            // A refusal left on screen would otherwise take the place of the
            // link, and the form could not be opened again.
            setMessage(null);
            setOpen(false);
          }}
        >
          {say.cancel}
        </button>
      </div>

      {message && (
        <div className={`notice ${tone === 'error' ? 'error' : 'warn'}`} role="status">
          {message}
        </div>
      )}
    </div>
  );
}
