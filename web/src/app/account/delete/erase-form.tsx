'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Say } from '@/components/say';
import { PRIVACY_CONTACT, eraseOutcomeOf, type EraseCode } from '@/lib/erase-outcome';

/**
 * The form's sentences, in the reader's language.
 *
 * Handed over by the page, which is drawn on the server: this file has no
 * English of its own, so the script a browser downloads carries only the
 * language being read.
 */
export type EraseWords = {
  /** The label of the box, with `{name}` where the name to type goes. */
  confirmLabel: string;
  confirmNote: string;
  /** Said instead of the form when the account has no name to type. */
  nameless: string;
  button: string;
  closing: string;
  keep: string;
  /** One sentence for each answer the route can give. Some name `{contact}`. */
  reasons: Record<EraseCode, string>;
};

/** The address, kept left to right inside a sentence that may run the other way. */
const contact = <bdi dir="ltr">{PRIVACY_CONTACT}</bdi>;

/**
 * The confirmation, and nothing else.
 *
 * The button stays disabled until the typed name matches, so the guard is visible
 * before it is hit rather than explained after. The database checks the same
 * string again — this is the courtesy, not the control.
 *
 * What it says afterwards is decided by `eraseOutcomeOf`: a refusal is believed
 * only when the route named it and answered with a four hundred. A reply that
 * cannot be read, a five hundred, no reply at all: `unconfirmed`, whose
 * sentence never says the account is still open, because it may not be.
 */
export function EraseAccount({ displayName, words }: { displayName: string; words: EraseWords }) {
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<EraseCode | null>(null);
  const name = displayName.trim();
  const matches = name.length > 0 && typed.trim() === name;

  async function erase() {
    if (busy) return;
    setBusy(true);
    setOutcome(null);
    try {
      const res = await fetch('/api/account/erase', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ confirm: typed }),
      });
      const json = (await res.json().catch(() => null)) as
        | { ok?: unknown; code?: unknown }
        | null;

      if (res.ok && json?.ok === true) {
        // A full navigation rather than a client push: the session has just ended,
        // and every cached page under it belongs to an account that no longer exists.
        // `busy` stays true: there is nothing left here to press.
        window.location.assign('/');
        return;
      }

      setOutcome(eraseOutcomeOf(res.status, json?.code));
      setBusy(false);
    } catch {
      setOutcome('unconfirmed');
      setBusy(false);
    }
  }

  // The database compares the typed name with the one on the profile, and a
  // profile with no name can never match. Say so, rather than show a button
  // that no typing will enable.
  if (name.length === 0) {
    return (
      <div className="stack">
        <p className="notice" style={{ margin: 0 }}>{words.nameless}</p>
        <p style={{ margin: 0 }}>
          <Link href="/account">{words.keep}</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="stack">
      <label htmlFor="confirm-name">
        <Say
          text={words.confirmLabel}
          parts={{ name: <strong><bdi>{name}</bdi></strong> }}
        />
      </label>
      <input
        id="confirm-name"
        name="confirm"
        type="text"
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        dir="auto"
        aria-describedby="confirm-note"
        value={typed}
        onChange={(event) => setTyped(event.target.value)}
        disabled={busy}
      />
      {outcome && (
        <p className="notice error" role="alert">
          <Say text={words.reasons[outcome]} parts={{ contact }} />
        </p>
      )}
      <div className="page-actions" style={{ marginTop: '0.75rem' }}>
        <button
          type="button"
          className="btn danger"
          disabled={!matches || busy}
          onClick={erase}
        >
          {busy ? words.closing : words.button}
        </button>
        <Link className="btn secondary" href="/account">{words.keep}</Link>
      </div>
      <p id="confirm-note" className="muted" style={{ margin: 0 }}>
        {words.confirmNote}
      </p>
    </div>
  );
}
