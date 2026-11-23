'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import {
  HEADLINE_MAX,
  NOTE_MAX,
  QUALIFICATIONS_MAX,
  SAMPLE_MAX,
  applicationFaultOf,
  applicationOf,
  applyOutcomeOf,
  faultFieldOf,
  type ApplyFault,
  type ApplyOutcome,
} from '@/lib/teaching-outcome';

/** What the form says, already in the reader's language. */
export type ApplyFormWords = {
  teach: string;
  teachHint: string;
  know: string;
  knowHint: string;
  sample: string;
  sampleHint: string;
  other: string;
  /** "(optional)", beside the last label. */
  optional: string;
  otherHint: string;
  send: string;
  working: string;
  /** The request could not be made at all. */
  unreachable: string;
  reasons: Record<ApplyOutcome, string>;
};

type Field = ReturnType<typeof faultFieldOf>;

const FAULTS: readonly string[] = [
  'headline_short',
  'headline_long',
  'qualifications_short',
  'qualifications_long',
  'sample_not_link',
  'note_long',
];

/**
 * The application form.
 *
 * Four boxes. Nothing here is a promise: the button says "Send to the owner",
 * not "become a teacher", and the page has said above it that applying is not
 * being appointed.
 *
 * The sample lesson is a link rather than an upload, because a platform with
 * no media pipeline for applicants cannot accept the file, and because a link
 * is something an owner can watch before deciding.
 *
 * **The button is never greyed out for what was typed.** It used to be
 * disabled until three rules were met, with nothing saying which. Now it can
 * always be pressed; the same check the route makes runs here first, says
 * what is wrong under the box in the reader's language, and puts the caret
 * in it. Nothing is sent until the check passes. The browser's own bubbles are switched off
 * (`noValidate`) because they speak the browser's language, not the page's.
 *
 * **A refusal is a name.** The route answers `{ ok: false, code }` with that
 * name's own status; `words.reasons` has the sentence. A name that arrives
 * with another status, or no name, is `unconfirmed`, and the page is read
 * again: if the application was written after all, the page shows it, and
 * the database will not take a second one.
 */
export function TeachingApplyForm({ words }: { words: ApplyFormWords }) {
  const router = useRouter();
  const asking = useRef(false);
  const boxes = useRef<Partial<Record<Field, HTMLInputElement | HTMLTextAreaElement | null>>>({});
  const [headline, setHeadline] = useState('');
  const [qualifications, setQualifications] = useState('');
  const [sampleUrl, setSampleUrl] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [tone, setTone] = useState<'warn' | 'error'>('error');
  const [message, setMessage] = useState<string | null>(null);
  const [wrong, setWrong] = useState<Field | null>(null);

  function point(fault: ApplyFault) {
    const field = faultFieldOf(fault);
    setWrong(field);
    setTone('error');
    setMessage(words.reasons[fault]);
    boxes.current[field]?.focus();
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    // Two presses in one moment are one request.
    if (asking.current) return;

    const fields = applicationOf({ headline, qualifications, sampleUrl, note });
    const fault = applicationFaultOf(fields);
    if (fault) {
      point(fault);
      return;
    }

    asking.current = true;
    // What the form last said stays where it is until the answer comes.
    // Taking it away now would move the button up under a finger that is
    // still on it, and a second tap would land on the link below.
    setBusy(true);

    let res: Response;
    try {
      res = await fetch('/api/teaching/apply', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'submit', ...fields }),
      });
    } catch {
      setWrong(null);
      setTone('warn');
      setMessage(words.unreachable);
      asking.current = false;
      setBusy(false);
      return;
    }
    const json = (await res.json().catch(() => null)) as { ok?: unknown; code?: unknown } | null;
    asking.current = false;
    setBusy(false);

    if (res.ok && json?.ok === true) {
      // The page draws the application, and where its answer will be shown.
      router.refresh();
      return;
    }
    const named = res.ok ? 'unconfirmed' : applyOutcomeOf(res.status, json?.code);
    if (FAULTS.includes(named)) {
      point(named as ApplyFault);
      return;
    }
    setWrong(null);
    setTone(named === 'refused' || named === 'unconfirmed' ? 'warn' : 'error');
    setMessage(words.reasons[named]);
    // The page may be behind what the database holds: read it again.
    if (named === 'already_applied' || named === 'already_teaching' || named === 'applications_closed' || named === 'unconfirmed') {
      router.refresh();
    }
  }

  // A mistake in a box is said under that box, and the box is described by it.
  const why = (field: Field, id: string) =>
    wrong === field && message ? (
      <p className="tapply-wrong" id={`${id}-wrong`} role="alert" data-tapply-refusal>
        {message}
      </p>
    ) : null;
  const about = (field: Field, id: string) => (wrong === field ? `${id}-hint ${id}-wrong` : `${id}-hint`);

  return (
    <form className="tapply-form" onSubmit={submit} noValidate data-tapply-form>
      <label htmlFor="teach-headline">{words.teach}</label>
      <input
        id="teach-headline"
        ref={(el) => {
          boxes.current.headline = el;
        }}
        type="text"
        dir="auto"
        maxLength={HEADLINE_MAX}
        value={headline}
        onChange={(event) => setHeadline(event.target.value)}
        readOnly={busy}
        aria-describedby={about('headline', 'teach-headline')}
        aria-invalid={wrong === 'headline'}
      />
      <p className="muted tapply-hint" id="teach-headline-hint">
        {words.teachHint}
      </p>
      {why('headline', 'teach-headline')}

      <label htmlFor="teach-qualifications">{words.know}</label>
      <textarea
        id="teach-qualifications"
        ref={(el) => {
          boxes.current.qualifications = el;
        }}
        rows={5}
        dir="auto"
        maxLength={QUALIFICATIONS_MAX}
        value={qualifications}
        onChange={(event) => setQualifications(event.target.value)}
        readOnly={busy}
        aria-describedby={about('qualifications', 'teach-qualifications')}
        aria-invalid={wrong === 'qualifications'}
      />
      <p className="muted tapply-hint" id="teach-qualifications-hint">
        {words.knowHint}
      </p>
      {why('qualifications', 'teach-qualifications')}

      <label htmlFor="teach-sample">{words.sample}</label>
      <input
        id="teach-sample"
        ref={(el) => {
          boxes.current.sample = el;
        }}
        type="url"
        inputMode="url"
        dir="ltr"
        maxLength={SAMPLE_MAX}
        value={sampleUrl}
        onChange={(event) => setSampleUrl(event.target.value)}
        readOnly={busy}
        placeholder="https://"
        aria-describedby={about('sample', 'teach-sample')}
        aria-invalid={wrong === 'sample'}
      />
      <p className="muted tapply-hint" id="teach-sample-hint">
        {words.sampleHint}
      </p>
      {why('sample', 'teach-sample')}

      <label htmlFor="teach-note">
        {words.other} <span className="muted">{words.optional}</span>
      </label>
      <textarea
        id="teach-note"
        ref={(el) => {
          boxes.current.note = el;
        }}
        rows={3}
        dir="auto"
        maxLength={NOTE_MAX}
        value={note}
        onChange={(event) => setNote(event.target.value)}
        readOnly={busy}
        aria-describedby={about('note', 'teach-note')}
        aria-invalid={wrong === 'note'}
      />
      <p className="muted tapply-hint" id="teach-note-hint">
        {words.otherHint}
      </p>
      {why('note', 'teach-note')}

      {message && !wrong ? (
        <div className={`notice ${tone}`} role={tone === 'error' ? 'alert' : 'status'} data-tapply-refusal>
          {message}
        </div>
      ) : null}

      <button type="submit" className="btn" disabled={busy} aria-busy={busy} data-tapply-button="submit">
        {busy ? words.working : words.send}
      </button>
    </form>
  );
}
