'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { textProps, type Language } from '@/lib/language';

/**
 * Say which language the course is taught in.
 *
 * One select and one button, because that is the whole decision. It changes
 * nothing about the course's content — a course stays in one language, and this
 * is the label a learner reads before they open it.
 *
 * The list is what the platform offers, not what has been used: a teacher
 * starting an Arabic course is the first person to use Arabic, and a picker that
 * only offered languages somebody had already claimed would make that
 * impossible.
 */
export function LanguagePicker({
  courseId,
  initialCode,
  languages,
}: {
  courseId: string;
  initialCode: string;
  languages: Language[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [code, setCode] = useState(initialCode);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const chosen = languages.find((entry) => entry.code === code) ?? null;

  async function save() {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch('/api/teach', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'set_language', courseId, languageCode: code }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
        value?: { changed?: boolean };
      };
      if (!res.ok || json.ok !== true) {
        setError(json.message ?? 'Could not save the language.');
        return;
      }
      setMessage(
        json.value?.changed === false
          ? 'Nothing changed — the course already said this.'
          : 'Saved. This is what a learner reads before they open the course.',
      );
      startTransition(() => router.refresh());
    } catch {
      setError('The request could not be sent. Nothing changed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card" style={{ display: 'grid', gap: '0.5rem', maxWidth: '34rem' }}>
      <p className="eyebrow" style={{ margin: 0 }}>
        What language it is taught in
      </p>
      <p className="muted" style={{ margin: 0 }}>
        One language for the whole course. It appears on the course page and in the catalogue
        filter. It does not translate anything — the course stays in the language you teach it in.
      </p>

      <label htmlFor="course-language">Language</label>
      <select
        id="course-language"
        value={code}
        onChange={(event) => {
          setCode(event.target.value);
          setMessage(null);
          setError(null);
        }}
        disabled={busy || pending}
      >
        {languages.map((entry) => (
          <option key={entry.code} value={entry.code} {...textProps(entry.code)}>
            {entry.englishName === entry.nativeName
              ? entry.englishName
              : `${entry.englishName} — ${entry.nativeName}`}
          </option>
        ))}
      </select>

      {chosen?.direction === 'rtl' && (
        <p className="muted" style={{ margin: 0 }}>
          This script reads right to left. Titles and descriptions are laid out with{' '}
          <code>dir=&quot;auto&quot;</code>, so they display the right way round without you
          changing anything.
        </p>
      )}

      {error && (
        <div className="notice error" role="alert">
          {error}
        </div>
      )}
      {message && (
        <div className="notice" role="status">
          {message}
        </div>
      )}

      <button
        type="button"
        className="btn"
        onClick={save}
        disabled={busy || pending || code === initialCode}
      >
        {busy ? 'Saving…' : 'Save the language'}
      </button>
    </div>
  );
}
