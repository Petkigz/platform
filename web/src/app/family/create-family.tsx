'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { FAMILY_NAME_MAX, familyOutcomeOf, type FamilyCode } from '@/lib/family-outcome';

/**
 * Create a family.
 *
 * **The words are handed in.** The family page is drawn on the server in the
 * reader's language and passes this form its sentences; nothing here asks the
 * catalogue for one, so the family page's sentences stay out of the script
 * every page carries. There is no English of its own in this file.
 *
 * **A refusal is said by its name.** The route answers with a code
 * (`lib/family-outcome.ts`) and the form says its own sentence for it. The
 * server's sentence is not shown.
 *
 * **Creating twice makes two families.** Nothing stops it. So an answer that
 * is not plainly a refusal is not "try again": the sentence for it sends the
 * reader to reload the page and look first.
 */
export type CreateFamilyWords = {
  heading: string;
  body: string;
  name: string;
  optional: string;
  placeholder: string;
  create: string;
  creating: string;
  unreachable: string;
  /** Already carries the limit in the reader's digits. */
  nameLong: string;
  signedOut: string;
  refused: string;
  unconfirmed: string;
};

export function CreateFamily({ words }: { words: CreateFamilyWords }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function sentenceFor(code: FamilyCode): string {
    if (code === 'name_long') return words.nameLong;
    if (code === 'signed_out') return words.signedOut;
    if (code === 'unconfirmed') return words.unconfirmed;
    return words.refused;
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (name.trim().length > FAMILY_NAME_MAX) {
      setError(words.nameLong);
      return;
    }
    setBusy(true);
    let response: Response;
    try {
      response = await fetch('/api/family/create', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name }),
      });
    } catch {
      // Nothing was sent, or nothing came back. Either way the reader is told
      // the request could not be made, which is all that is known.
      setError(words.unreachable);
      setBusy(false);
      return;
    }
    const result = (await response.json().catch(() => null)) as { ok?: unknown; code?: unknown } | null;
    setBusy(false);
    if (!response.ok || result?.ok !== true) {
      setError(sentenceFor(familyOutcomeOf(response.status, result?.code)));
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <form
      className="card"
      onSubmit={submit}
      noValidate
      style={{ display: 'grid', gap: '0.65rem', maxWidth: '36rem' }}
    >
      <h2 style={{ margin: 0 }}>{words.heading}</h2>
      <p className="muted" style={{ margin: 0 }}>{words.body}</p>
      <label htmlFor="family-name">
        {words.name} <span className="muted">{words.optional}</span>
      </label>
      <input
        id="family-name"
        dir="auto"
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder={words.placeholder}
        maxLength={FAMILY_NAME_MAX}
        autoComplete="off"
        disabled={busy}
      />
      {error && <div className="notice error" role="alert">{error}</div>}
      <button type="submit" className="btn" disabled={busy}>
        {busy ? words.creating : words.create}
      </button>
    </form>
  );
}
