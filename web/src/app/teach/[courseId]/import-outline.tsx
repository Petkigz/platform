'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import {
  IMPORT_COLUMNS,
  IMPORT_LIMITS,
  IMPORT_TEMPLATE,
  importErrorMessage,
  type ImportProblem,
} from '@/lib/csv-import';

type Preview = {
  counts: { sections: number; lessons: number; previews: number };
  problems: ImportProblem[];
  summary: Array<{ title: string; line: number; lessons: string[]; more: number }>;
  sentence: string;
};

/**
 * A teacher's outline, out of a spreadsheet.
 *
 * Two steps on purpose, and the second one is a separate click. The first reads
 * the file and shows exactly what would be created — the sections in order, how
 * many lessons under each, and every line that has a problem. The second writes.
 * A single button that did both would be one mis-picked file away from an
 * outline nobody meant to add, and an import that has to be cleaned up by hand is
 * worse than the typing it replaced.
 *
 * The parse happens on the server, so what is shown here is what will be written:
 * `import_preview` and `import_apply` are the same reader over the same text.
 */
export function ImportOutline({ versionId }: { versionId: string }) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement | null>(null);

  const [text, setText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState<{ sections: number; lessons: number } | null>(null);
  const [, startTransition] = useTransition();

  const clean = preview !== null && preview.problems.length === 0;

  /** Any edit invalidates the check: a confirm button over stale text is a lie. */
  function edit(next: string) {
    setText(next);
    setPreview(null);
    setAdded(null);
    setError(null);
  }

  async function post(action: 'import_preview' | 'import_apply') {
    setBusy(true);
    setError(null);

    const res = await fetch('/api/teach', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action, versionId, csv: text }),
    });
    const body = (await res.json().catch(() => null)) as
      | { ok: boolean; value?: Preview & { sections?: number; lessons?: number }; message?: string; problems?: ImportProblem[] }
      | null;

    setBusy(false);

    if (!body) {
      setError('That did not reach the server. Check the connection and try again.');
      return;
    }

    if (!body.ok) {
      // A refusal that names the offending lines is more useful than the
      // sentence, so the preview is rebuilt from them if they came back.
      if (body.problems && body.problems.length > 0 && preview) {
        setPreview({ ...preview, problems: body.problems });
      }
      setError(importErrorMessage(body.message ?? ''));
      return;
    }

    if (action === 'import_preview') {
      setPreview(body.value as Preview);
      return;
    }

    const value = body.value as { sections?: number; lessons?: number } | undefined;
    setAdded({ sections: value?.sections ?? 0, lessons: value?.lessons ?? 0 });
    setPreview(null);
    setText('');
    setFileName(null);
    if (fileInput.current) fileInput.current.value = '';
    startTransition(() => router.refresh());
  }

  async function chooseFile() {
    const file = fileInput.current?.files?.[0];
    if (!file) return;

    setError(null);
    if (file.size > 400_000) {
      setError('That file is too large to be an outline. A CSV of a few hundred lesson titles is a few kilobytes.');
      return;
    }

    try {
      const content = await file.text();
      setFileName(file.name);
      edit(content);
    } catch {
      setError('That file could not be read. If it is a spreadsheet, save it as CSV first.');
    }
  }

  return (
    <section className="card" style={{ marginBottom: '1.5rem' }}>
      <h2 style={{ marginTop: 0 }}>Import an outline from a spreadsheet</h2>
      <p className="muted" style={{ marginTop: 0 }}>
        If your lessons are already written down — a term plan, a syllabus, a spreadsheet — this
        adds the structure in one go: the sections, the lesson titles, an optional description of
        each lesson, and which lessons are free previews. It does not bring media or attachments;
        you still add those to each lesson afterwards.
      </p>

      <div className="grid cols-2" style={{ gap: '1rem', alignItems: 'start' }}>
        <div>
          <label htmlFor="outline-file" style={{ display: 'block', fontWeight: 600, marginBottom: '0.35rem' }}>
            Choose a CSV file
          </label>
          <input
            id="outline-file"
            ref={fileInput}
            type="file"
            accept=".csv,text/csv"
            onChange={chooseFile}
            style={{ display: 'block', width: '100%', marginBottom: '0.5rem' }}
          />
          <p className="muted" style={{ fontSize: '0.85rem', margin: 0 }}>
            {fileName ? `Reading ${fileName}.` : 'A file saved from Excel, Numbers or Google Sheets as CSV.'}
          </p>
        </div>

        <div>
          <p style={{ margin: '0 0 0.35rem', fontWeight: 600 }}>The columns it understands</p>
          <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.9rem' }}>
            {IMPORT_COLUMNS.map((column) => (
              <li key={column.name}>
                <code>{column.name}</code>
                {column.required ? ' (required)' : ' (optional)'} — {column.note}
              </li>
            ))}
          </ul>
          <p style={{ margin: '0.5rem 0 0' }}>
            <button type="button" className="btn secondary" onClick={() => edit(IMPORT_TEMPLATE)}>
              Put the template in the box
            </button>
          </p>
        </div>
      </div>

      <div style={{ marginTop: '1rem' }}>
        <label htmlFor="outline-text" style={{ display: 'block', fontWeight: 600, marginBottom: '0.35rem' }}>
          Or paste the rows
        </label>
        <textarea
          id="outline-text"
          value={text}
          onChange={(event) => edit(event.target.value)}
          rows={8}
          spellCheck={false}
          placeholder={'section,lesson,description,preview\nFoundations,What tajweed means,An introduction,no'}
          style={{
            width: '100%',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontSize: '0.85rem',
          }}
        />
        <p className="muted" style={{ fontSize: '0.85rem', marginTop: '0.35rem' }}>
          A section title repeated on the next row continues that section. One file can carry up to{' '}
          {IMPORT_LIMITS.sections} sections and {IMPORT_LIMITS.lessons} lessons; a larger course is
          imported in two files into the same draft.
        </p>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
        <button
          type="button"
          className="btn"
          disabled={busy || text.trim() === ''}
          onClick={() => post('import_preview')}
        >
          {busy ? 'Reading…' : 'Check the file'}
        </button>
        {clean && (
          <button
            type="button"
            className="btn"
            disabled={busy}
            onClick={() => post('import_apply')}
          >
            Add {preview.counts.sections === 1 ? 'this section' : `these ${preview.counts.sections} sections`}{' '}
            to the draft
          </button>
        )}
      </div>

      {error && (
        <p className="notice error" role="alert" style={{ marginTop: '0.75rem' }}>
          {error}
        </p>
      )}

      {added && (
        <p className="notice" role="status" style={{ marginTop: '0.75rem' }}>
          Added {added.sections === 1 ? '1 section' : `${added.sections} sections`} and{' '}
          {added.lessons === 1 ? '1 lesson' : `${added.lessons} lessons`}. They are at the end of the
          outline below, and nothing has been published.
        </p>
      )}

      {preview && (
        <div style={{ marginTop: '1rem' }}>
          <p style={{ fontWeight: 600, margin: '0 0 0.35rem' }}>{preview.sentence}</p>

          {preview.problems.length > 0 ? (
            <div className="notice warn" role="alert">
              <strong>
                {preview.problems.length === 1
                  ? 'One line needs fixing.'
                  : `${preview.problems.length} lines need fixing.`}
              </strong>{' '}
              Nothing has been added. Fix these and check the file again.
              <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.1rem' }}>
                {preview.problems.slice(0, 12).map((problem, index) => (
                  <li key={index}>
                    {problem.line > 0 ? `Line ${problem.line}: ` : ''}
                    {problem.message}
                  </li>
                ))}
              </ul>
              {preview.problems.length > 12 && (
                <p style={{ margin: '0.5rem 0 0' }}>
                  …and {preview.problems.length - 12} more. Fixing these will usually clear the
                  rest.
                </p>
              )}
            </div>
          ) : (
            <p className="muted" style={{ margin: '0 0 0.5rem' }}>
              Nothing has been added yet. This is what will be written, at the end of the draft, if
              you press the button above.
            </p>
          )}

          {preview.summary.length > 0 && (
            <ul className="lessons" style={{ margin: '0.5rem 0 0' }}>
              {preview.summary.map((section) => (
                <li key={`${section.title}-${section.line}`}>
                  <strong>{section.title}</strong>
                  {' — '}
                  {section.lessons.join(', ')}
                  {section.more > 0 ? `, and ${section.more} more` : ''}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
