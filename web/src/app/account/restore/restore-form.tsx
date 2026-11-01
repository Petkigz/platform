'use client';

import { useRef, useState } from 'react';

import {
  RESTORE_MAX_BYTES,
  accountSentence,
  parseRestoreFile,
  restoreHeadline,
  skipLines,
  type RestoreReport,
} from '@/lib/restore';

/**
 * Choosing a file, checking it, and then meaning it.
 *
 * Three states, and the middle one is the reason this screen exists. A person
 * hands over a document that claims things about their record; before anything
 * is written they are shown exactly what would be written and exactly what
 * would not. The button that writes is only offered after a check that
 * succeeded, so nobody restores by accident — and because the check is the
 * database's own dry run rather than a guess made here, the preview cannot
 * promise something the apply then refuses.
 *
 * The file is read in the browser and posted as text. That is not a security
 * boundary — the route parses it again — it is so that choosing a video from
 * the downloads folder costs a sentence instead of an upload.
 */
export function RestoreForm() {
  const input = useRef<HTMLInputElement>(null);
  const [text, setText] = useState<string | null>(null);
  const [name, setName] = useState<string>('');
  const [report, setReport] = useState<RestoreReport | null>(null);
  const [busy, setBusy] = useState<false | 'checking' | 'applying'>(false);
  const [error, setError] = useState<string | null>(null);

  async function pick(file: File | null) {
    setReport(null);
    setError(null);
    setText(null);
    setName(file?.name ?? '');
    if (!file) return;

    // The size is checked before the file is read: `file.text()` on a large
    // download is a long silence on a slow connection.
    if (file.size > RESTORE_MAX_BYTES) {
      setError(
        `“${file.name}” is ${(file.size / (1024 * 1024)).toFixed(1)} MiB. An export is under 8 MiB.`,
      );
      return;
    }

    const body = await file.text();
    const parsed = parseRestoreFile(file.name, file.size, body);
    if (!parsed.ok) {
      setError(parsed.message);
      return;
    }
    setText(body);
  }

  async function send(apply: boolean) {
    if (!text) return;
    setBusy(apply ? 'applying' : 'checking');
    setError(null);
    try {
      const res = await fetch(
        `/api/account/restore?apply=${apply ? '1' : '0'}&name=${encodeURIComponent(name)}`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: text,
        },
      );
      const json = (await res.json().catch(() => null)) as
        | { ok: true; report: RestoreReport }
        | { ok: false; message: string }
        | null;

      if (!res.ok || !json || !json.ok) {
        setError(
          (json && 'message' in json ? json.message : null) ??
            'The file was not read. Nothing was changed.',
        );
        setBusy(false);
        return;
      }

      setReport(json.report);
    } catch {
      setError('The file was not read. Check your connection and try again. Nothing was changed.');
    }
    setBusy(false);
  }

  function reset() {
    setText(null);
    setName('');
    setReport(null);
    setError(null);
    if (input.current) input.current.value = '';
  }

  const skipped = report ? skipLines(report) : [];

  return (
    <div className="stack">
      <label htmlFor="restore-file">The JSON file your export downloaded</label>
      <input
        ref={input}
        id="restore-file"
        name="file"
        type="file"
        accept="application/json,.json"
        disabled={busy !== false}
        onChange={(event) => void pick(event.target.files?.[0] ?? null)}
      />
      <p className="muted" style={{ fontSize: '0.85rem', margin: 0 }}>
        It is the file named <code>ayahspring-data-….json</code>. The spreadsheet and the printable
        copy are for reading; this screen needs the JSON one.
      </p>

      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}

      {text && !report && (
        <div className="row" style={{ gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn"
            style={{ width: 'auto' }}
            disabled={busy !== false}
            onClick={() => void send(false)}
          >
            {busy === 'checking' ? 'Checking…' : 'Check this file'}
          </button>
          <button type="button" className="btn secondary" style={{ width: 'auto' }} onClick={reset}>
            Choose another
          </button>
        </div>
      )}

      {report && (
        <section className="card" aria-live="polite">
          <h2 style={{ marginTop: 0 }}>{restoreHeadline(report)}</h2>

          {accountSentence(report) && <p style={{ marginTop: 0 }}>{accountSentence(report)}</p>}

          {skipped.length > 0 && (
            <>
              <p className="muted" style={{ marginBottom: '0.4rem' }}>
                Left in the file, and why:
              </p>
              <ul className="lessons">
                {skipped.map((line, index) => (
                  <li key={`${line.where}-${index}`}>
                    <strong>{line.where}</strong>
                    <span className="muted" style={{ display: 'block', fontSize: '0.9rem' }}>
                      {line.reason}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}

          {report.applied ? (
            <>
              <p className="muted" style={{ marginTop: '1rem' }}>
                This is now your account. Your file has not changed, so it can be run again
                somewhere else — an entry that is already here is skipped rather than duplicated.
              </p>
              <button type="button" className="btn secondary" style={{ width: 'auto' }} onClick={reset}>
                Restore a different file
              </button>
            </>
          ) : (
            <>
              <p className="muted" style={{ marginTop: '1rem' }}>
                Nothing has been written yet. Checking a file changes nothing.
              </p>
              <div className="row" style={{ gap: '0.75rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn"
                  style={{ width: 'auto' }}
                  disabled={busy !== false}
                  onClick={() => void send(true)}
                >
                  {busy === 'applying' ? 'Restoring…' : 'Restore what can be restored'}
                </button>
                <button type="button" className="btn secondary" style={{ width: 'auto' }} onClick={reset}>
                  Choose another
                </button>
              </div>
            </>
          )}
        </section>
      )}

      {report?.applied && report.notRestored.length > 0 && (
        <>
          <div className="outline-h" style={{ marginTop: '1.5rem' }}>
            <h3>What stayed in the file</h3>
          </div>
          <div className="card">
            <ul className="lessons">
              {report.notRestored.map((item) => (
                <li key={item.what}>
                  <strong>{item.what}</strong>
                  <span className="muted" style={{ display: 'block', fontSize: '0.9rem' }}>
                    {item.why}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
