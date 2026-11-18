'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AGE_BANDS } from '@/lib/family';
import { CHILD_NAME_MAX, familyOutcomeOf, type FamilyCode } from '@/lib/family-outcome';

/**
 * Add a child.
 *
 * Two fields and nothing else — a name and an age band. The age band is not
 * decoration: it drives which content is age-appropriate, and the database
 * refuses a child profile without one. There is deliberately no date of
 * birth field anywhere in this system; an age band is enough to teach a child
 * and is far less to lose.
 *
 * **The words are handed in** by the family page, in the reader's language,
 * and so are the labels of the age bands. There is no English of its own in
 * this file.
 *
 * **A refusal is said by its name** (`lib/family-outcome.ts`). The form used
 * to print whatever sentence came back, which was sometimes the database's.
 *
 * **Adding twice makes two children with the same name.** So an answer that
 * is not plainly a refusal is not "try again": the sentence for it sends the
 * reader to reload the page and look first.
 */
export type AddChildWords = {
  open: string;
  name: string;
  placeholder: string;
  band: string;
  /** The label of each age band, by its code (`8-10`). */
  bands: Record<string, string>;
  note: string;
  add: string;
  adding: string;
  cancel: string;
  unreachable: string;
  nameMissing: string;
  bandInvalid: string;
  notOwner: string;
  /** Already carries the age in the reader's digits. */
  declaration: string;
  signedOut: string;
  noFamily: string;
  refused: string;
  unconfirmed: string;
};

export function AddChild({ familyId, words }: { familyId: string; words: AddChildWords }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [ageBand, setAgeBand] = useState<string>(AGE_BANDS[1] ?? '8-10');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  if (!open) {
    return (
      <button type="button" className="btn secondary" onClick={() => setOpen(true)}>
        {words.open}
      </button>
    );
  }

  function sentenceFor(code: FamilyCode): string {
    switch (code) {
      case 'name_missing': return words.nameMissing;
      case 'band_invalid': return words.bandInvalid;
      case 'not_owner': return words.notOwner;
      case 'declaration_required': return words.declaration;
      case 'signed_out': return words.signedOut;
      case 'no_family': return words.noFamily;
      case 'unconfirmed': return words.unconfirmed;
      default: return words.refused;
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (name.trim().length === 0) {
      setError(words.nameMissing);
      return;
    }
    setBusy(true);

    let res: Response;
    try {
      res = await fetch('/api/family/children', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ familyId, displayName: name, ageBand }),
      });
    } catch {
      // The form used to stay on "Adding…" for good when the request could
      // not be made: nothing caught this.
      setError(words.unreachable);
      setBusy(false);
      return;
    }
    const json = (await res.json().catch(() => null)) as { ok?: unknown; code?: unknown } | null;

    setBusy(false);
    if (!res.ok || json?.ok !== true) {
      setError(sentenceFor(familyOutcomeOf(res.status, json?.code)));
      return;
    }
    startTransition(() => {
      setOpen(false);
      setName('');
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} noValidate className="card" style={{ marginTop: '0.75rem' }}>
      <h3 style={{ marginTop: 0 }}>{words.open}</h3>

      <label htmlFor={`child-name-${familyId}`}>{words.name}</label>
      <input
        id={`child-name-${familyId}`}
        dir="auto"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={words.placeholder}
        required
        maxLength={CHILD_NAME_MAX}
        autoFocus
        disabled={busy}
      />

      <label htmlFor={`child-age-${familyId}`}>{words.band}</label>
      <select
        id={`child-age-${familyId}`}
        value={ageBand}
        onChange={(e) => setAgeBand(e.target.value)}
        disabled={busy}
      >
        {AGE_BANDS.map((b) => (
          <option key={b} value={b}>
            {words.bands[b] ?? b}
          </option>
        ))}
      </select>

      <p className="muted" style={{ fontSize: '0.82rem' }}>{words.note}</p>

      {error && <div className="notice error" role="alert">{error}</div>}

      <div className="row" style={{ marginTop: '0.5rem' }}>
        <button type="submit" className="btn" disabled={busy}>
          {busy ? words.adding : words.add}
        </button>
        <button
          type="button"
          className="btn secondary"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          disabled={busy}
        >
          {words.cancel}
        </button>
      </div>
    </form>
  );
}
