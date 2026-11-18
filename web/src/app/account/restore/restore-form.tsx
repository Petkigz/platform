'use client';

import { useRef, useState, type ReactNode } from 'react';

import { Say } from '@/components/say';
import { SaidList } from '@/app/family/said-list';
import { formatNumber } from '@/lib/i18n/format';
import type { LocaleCode } from '@/lib/i18n/locales';
import {
  RESTORE_MAX_BYTES,
  parseRestoreFile,
  readRestoreReport,
  restoreSummary,
  sentenceWithParts,
  skipLines,
  type RestoreField,
  type RestoreLine,
  type RestoreReport,
  type RestoreSummary,
} from '@/lib/restore';
import { restoreOutcomeOf, type RestoreCode, type RestoreWhy } from '@/lib/restore-outcome';

/** Everything this form says, in the language of the page that draws it. */
export type RestoreWords = {
  /** The language the words are in: numbers and lists are written its way. */
  locale: LocaleCode;
  fileLabel: string;
  /** Holds `{name}`: how the name of the file begins. */
  fileHint: string;
  fileStart: string;
  check: string;
  checking: string;
  another: string;
  apply: string;
  applying: string;
  different: string;
  /** One sentence for each name a refusal can have. `failed` is a check that did not finish. */
  errors: Record<RestoreCode, string>;
  /** The button that writes was pressed and no answer came back. */
  unconfirmed: string;
  headings: Record<RestoreSummary['kind'], string>;
  /** Each holds `{count}`. */
  lineNotes: string;
  lineMarks: string;
  lineHere: string;
  /** Holds `{fields}`. */
  lineProfile: string;
  profile: string;
  fields: Record<RestoreField, string>;
  skippedHeading: string;
  whereEntry: string;
  /** One sentence for each reason an entry stays in the file. Some hold `{value}`, `{count}`, `{read}`, `{held}`. */
  why: Record<RestoreWhy, string>;
  nothingWritten: string;
  afterApplied: string;
};

/** The four refusals that are about the file itself: another one has to be chosen. */
const ABOUT_THE_FILE: readonly RestoreCode[] = ['too_large', 'not_json', 'not_export', 'newer'];

/**
 * Two buttons that do not fit side by side wrap, and a wrapped button would
 * otherwise be as wide as its own words: two ragged widths one above the other.
 */
const GROW = { flex: '1 1 auto' } as const;

/** A piece of the reader's file. It keeps its own direction whatever the sentence around it. */
const quoted = (value: string) => <bdi>{value}</bdi>;

/**
 * Choosing a file, checking it, and then meaning it.
 *
 * Three states, and the middle one is the reason this screen exists. A person
 * hands over a document that claims things about their record; before anything
 * is written they are shown exactly what would be written and exactly what
 * would not. The button that writes is only offered after a check that found
 * something to write, so nobody restores by accident, and because the check is
 * the database's own dry run and not a guess made here, the preview cannot
 * promise something the apply then refuses.
 *
 * The file is read in the browser and posted as text. That is not a security
 * boundary (the route parses it again); it is so that choosing a video from
 * the downloads folder costs a sentence instead of an upload.
 *
 * **It has no words of its own.** The page hands them over, and every refusal
 * and every reason arrives as a name (`lib/restore-outcome.ts`). What is shown
 * from outside the catalogue is only what the reader's own file said: a
 * lesson's name, a language, a time zone, a country.
 *
 * **A write that was not answered is said as that.** If the button that writes
 * is pressed and no report comes back, nothing is claimed either way: the
 * result is taken off the screen and the reader is asked to check the file
 * again, which is safe because an entry that is already here is skipped.
 */
export function RestoreForm({ words }: { words: RestoreWords }) {
  const input = useRef<HTMLInputElement>(null);
  const [text, setText] = useState<string | null>(null);
  const [report, setReport] = useState<RestoreReport | null>(null);
  const [busy, setBusy] = useState<false | 'checking' | 'applying'>(false);
  const [error, setError] = useState<string | null>(null);

  const num = (value: number) => formatNumber(words.locale, value);

  function forget() {
    setText(null);
    setReport(null);
    if (input.current) input.current.value = '';
  }

  /** Say a refusal, and let go of a file that was the reason for it. */
  function refuse(code: RestoreCode) {
    setError(words.errors[code]);
    if (ABOUT_THE_FILE.includes(code)) forget();
    else setReport(null);
  }

  async function pick(file: File | null) {
    setReport(null);
    setError(null);
    setText(null);
    if (!file) return;

    // The size is checked before the file is read: `file.text()` on a large
    // download is a long silence on a slow connection.
    if (file.size > RESTORE_MAX_BYTES) {
      refuse('too_large');
      return;
    }

    try {
      const body = await file.text();
      const parsed = parseRestoreFile(file.size, body);
      if (!parsed.ok) {
        refuse(parsed.code);
        return;
      }
      setText(body);
    } catch {
      // The device would not hand the file over.
      refuse('not_json');
    }
  }

  async function send(apply: boolean) {
    if (!text || busy !== false) return;
    setBusy(apply ? 'applying' : 'checking');
    setError(null);
    // What is said when nothing is known. For a check that is a failure and
    // nothing changed; for a write it is not known whether anything did.
    const unknown = () => {
      setReport(null);
      setError(apply ? words.unconfirmed : words.errors.failed);
    };
    try {
      const res = await fetch(`/api/account/restore?apply=${apply ? '1' : '0'}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        cache: 'no-store',
        body: text,
      });
      const json = (await res.json().catch(() => null)) as
        | { ok?: unknown; code?: unknown; report?: unknown }
        | null;

      if (res.ok && json?.ok === true) {
        // The reply is read again here: a report that does not say whether it
        // was applied, or says the other thing, is not believed.
        const answer = readRestoreReport(json.report);
        if (answer && answer.applied === apply) setReport(answer);
        else unknown();
      } else {
        const code = restoreOutcomeOf(res.status, json?.code);
        if (code === 'failed') unknown();
        else refuse(code);
      }
    } catch {
      unknown();
    }
    setBusy(false);
  }

  function reset() {
    forget();
    setError(null);
  }

  const summary = report ? restoreSummary(report) : null;
  const skipped = report ? skipLines(report) : [];
  const lists = summary && (summary.kind === 'check' || summary.kind === 'applied');

  const whereOf = (line: RestoreLine): ReactNode => {
    if ('lesson' in line.where) return quoted(line.where.lesson);
    if ('entry' in line.where) return words.whereEntry;
    return line.where.field ? words.fields[line.where.field] : words.profile;
  };

  const whyOf = (line: RestoreLine): ReactNode => {
    const parts: Record<string, ReactNode> = {
      ...(line.value === undefined ? {} : { value: quoted(line.value) }),
      ...(line.count === undefined ? {} : { count: num(line.count) }),
      ...(line.read === undefined ? {} : { read: num(line.read) }),
      ...(line.held === undefined ? {} : { held: num(line.held) }),
    };
    // A sentence with a gap and nothing to put in it says the general one.
    return (
      <Say
        text={sentenceWithParts(words.why[line.why], words.why.other, Object.keys(parts))}
        parts={parts}
      />
    );
  };

  return (
    <div className="stack">
      <label htmlFor="restore-file">{words.fileLabel}</label>
      <input
        ref={input}
        id="restore-file"
        name="file"
        type="file"
        accept="application/json,.json"
        aria-describedby="restore-file-hint"
        disabled={busy !== false}
        onChange={(event) => void pick(event.target.files?.[0] ?? null)}
      />
      <p id="restore-file-hint" className="muted" style={{ fontSize: '0.85rem', margin: 0 }}>
        <Say
          text={words.fileHint}
          parts={{
            name: (
              <code>
                <bdi dir="ltr">{words.fileStart}</bdi>
              </code>
            ),
          }}
        />
      </p>

      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}

      {text && !report && (
        <div className="page-actions" style={{ marginTop: '0.75rem' }}>
          <button
            type="button"
            className="btn"
            style={GROW}
            disabled={busy !== false}
            onClick={() => void send(false)}
          >
            {busy === 'checking' ? words.checking : words.check}
          </button>
          <button
            type="button"
            className="btn secondary"
            style={GROW}
            disabled={busy !== false}
            onClick={reset}
          >
            {words.another}
          </button>
        </div>
      )}

      {report && summary && (
        <section className="card" style={{ marginTop: '0.75rem' }}>
          <div role="status">
            <h2 style={{ marginTop: 0, fontSize: '1.15rem' }}>{words.headings[summary.kind]}</h2>
            {lists && (
              <ul className="lessons stacked">
                {summary.notes > 0 && (
                  <li>
                    <Say text={words.lineNotes} parts={{ count: num(summary.notes) }} />
                  </li>
                )}
                {summary.bookmarks > 0 && (
                  <li>
                    <Say text={words.lineMarks} parts={{ count: num(summary.bookmarks) }} />
                  </li>
                )}
                {summary.profile && (
                  <li>
                    {summary.fields.length > 0 ? (
                      <Say
                        text={words.lineProfile}
                        parts={{
                          fields: (
                            <SaidList
                              code={words.locale}
                              items={summary.fields.map((field) => words.fields[field])}
                            />
                          ),
                        }}
                      />
                    ) : (
                      words.profile
                    )}
                  </li>
                )}
                {summary.here > 0 && (
                  <li>
                    <Say text={words.lineHere} parts={{ count: num(summary.here) }} />
                  </li>
                )}
              </ul>
            )}
          </div>

          {skipped.length > 0 && (
            <>
              <h3 style={{ fontSize: '1rem', margin: '1rem 0 0.4rem' }}>{words.skippedHeading}</h3>
              <ul className="lessons stacked">
                {skipped.map((line, index) => (
                  <li key={index}>
                    <strong>{whereOf(line)}</strong>
                    <span className="muted" style={{ display: 'block', fontSize: '0.9rem' }}>
                      {whyOf(line)}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}

          <p className="muted" style={{ marginTop: '1rem' }}>
            {report.applied ? words.afterApplied : words.nothingWritten}
          </p>
          <div className="page-actions" style={{ marginTop: '0.75rem' }}>
            {/* The button that writes is offered only when there is something to write. */}
            {!report.applied && summary.kind === 'check' && (
              <button
                type="button"
                className="btn"
                style={GROW}
                disabled={busy !== false}
                onClick={() => void send(true)}
              >
                {busy === 'applying' ? words.applying : words.apply}
              </button>
            )}
            <button
              type="button"
              className="btn secondary"
              style={GROW}
              disabled={busy !== false}
              onClick={reset}
            >
              {report.applied ? words.different : words.another}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
