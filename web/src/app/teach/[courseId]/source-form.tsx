'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SOURCE_TYPES, type LessonSource, type SourceType } from '@/lib/provenance';

const LABELS: Record<SourceType, string> = {
  quran: 'Qur’an', hadith: 'Hadith', tafsir: 'Tafsir', fiqh_reference: 'Fiqh reference',
  book: 'Book', article: 'Article', lecture: 'Lecture', fatwa: 'Fatwa',
  manuscript: 'Manuscript', other: 'Other',
};

export function SourceForm({
  courseVersionId,
  lessonId,
  lessonTitle,
  sources,
}: {
  courseVersionId: string;
  lessonId: string;
  lessonTitle: string;
  sources: LessonSource[];
}) {
  const router = useRouter();
  const [sourceType, setSourceType] = useState<SourceType>('quran');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const response = await fetch('/api/teach/provenance', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        courseVersionId,
        lessonId,
        sourceType,
        title: form.get('title'),
        authorOrCompiler: form.get('author'),
        editionOrVersion: form.get('edition'),
        referenceLocator: form.get('locator'),
        url: form.get('url'),
        anchor: form.get('anchor'),
        notes: form.get('notes'),
      }),
    });
    const result = await response.json().catch(() => null) as { ok?: boolean; message?: string } | null;
    setBusy(false);
    if (!result?.ok) {
      setError(result?.message ?? 'Could not add this source.');
      return;
    }
    formElement.reset();
    setSourceType('quran');
    router.refresh();
  }

  async function remove(sourceId: string) {
    if (!window.confirm('Remove this citation from the draft?')) return;
    setBusy(true);
    setError(null);
    const response = await fetch('/api/teach/provenance', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'remove', sourceId }),
    });
    const result = await response.json().catch(() => null) as { ok?: boolean; message?: string } | null;
    setBusy(false);
    if (!result?.ok) {
      setError(result?.message ?? 'Could not remove this source.');
      return;
    }
    router.refresh();
  }

  return (
    <details style={{ marginTop: '.65rem' }}>
      <summary style={{ cursor: 'pointer', color: 'var(--green-700, #176b45)' }}>
        Add a source for {lessonTitle}
      </summary>
      {sources.length > 0 && (
        <ul className="lessons" style={{ marginTop: '.5rem' }}>
          {sources.map((source) => (
            <li key={source.id}>
              <span className="t"><strong>{source.title}</strong>{source.referenceLocator ? ` · ${source.referenceLocator}` : ''}</span>
              <button type="button" className="btn ghost" disabled={busy} onClick={() => remove(source.id)}>Remove</button>
            </li>
          ))}
        </ul>
      )}
      {error && <p role="alert" className="notice error" style={{ margin: '.5rem 0 0' }}>{error}</p>}
      <form onSubmit={submit} className="card" style={{ marginTop: '.5rem', display: 'grid', gap: '.65rem' }}>
        <p className="muted" style={{ margin: 0 }}>
          Cite the edition and exact reference so learners can check the source. Published versions lock their citations; corrections go in a new draft.
        </p>
        <div className="row">
          <select aria-label={`Source type for ${lessonTitle}`} value={sourceType}
            onChange={(event) => setSourceType(event.target.value as SourceType)}>
            {SOURCE_TYPES.map((type) => <option key={type} value={type}>{LABELS[type]}</option>)}
          </select>
          <input name="title" required maxLength={300} placeholder="Source title" aria-label="Source title" style={{ flex: 1 }} />
        </div>
        <div className="row">
          <input name="author" maxLength={300} placeholder="Author or compiler" aria-label="Author or compiler" style={{ flex: 1 }} />
          <input name="edition" maxLength={300} placeholder="Edition or version" aria-label="Edition or version" style={{ flex: 1 }} />
        </div>
        <div className="row">
          <input name="locator" maxLength={500} placeholder="Exact reference (e.g. surah:ayah, hadith number, page)" aria-label="Reference locator" style={{ flex: 1 }} />
          <input name="anchor" maxLength={300} placeholder="Where used (paragraph, timestamp, etc.)" aria-label="Where this source is used" style={{ flex: 1 }} />
        </div>
        <input name="url" type="url" placeholder="https:// source link (optional)" aria-label="Source URL" />
        <textarea name="notes" maxLength={2000} placeholder="Context or translation notes (optional)" aria-label="Source notes" rows={2} />
        <button className="btn secondary" type="submit" disabled={busy}>
          {busy ? 'Saving source…' : 'Add source citation'}
        </button>
      </form>
    </details>
  );
}
